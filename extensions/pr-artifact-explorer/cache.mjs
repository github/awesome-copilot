import { createWriteStream } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  statfs,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  ARTIFACT_DOWNLOAD_IDLE_TIMEOUT_MS,
  CACHE_ROOT,
  MAX_ARCHIVE_BYTES,
  MAX_INLINE_PREVIEW_BYTES,
  MIN_CACHE_FREE_BYTES,
} from "./constants.mjs";
import { analyzeArtifact, hasRootIndexHtml } from "./detector.mjs";
import { getArtifact, openArtifactDownload } from "./github.mjs";
import { findZipEntry, readEntryPrefix, readZipEntry, readZipIndex } from "./zip.mjs";

const downloads = new Map();
const indexCache = new Map();
let reservedDownloadBytes = 0;

function normalizeArtifactId(value) {
  const id = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Artifact id must be a positive integer.");
  }
  return String(id);
}

function pathsFor(value) {
  const id = normalizeArtifactId(value);
  return {
    id,
    archive: join(CACHE_ROOT, `${id}.zip`),
    metadata: join(CACHE_ROOT, `${id}.json`),
  };
}

async function writeJsonAtomic(path, value) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

async function readMetadataFile(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    if (error instanceof SyntaxError) {
      throw new Error(`Cached artifact metadata is invalid: ${path}`, { cause: error });
    }
    throw error;
  }
}

function formatBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let size = bytes;
  let unit = -1;
  do {
    size /= 1024;
    unit++;
  } while (size >= 1024 && unit < units.length - 1);
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

async function downloadCapacityBytes() {
  const filesystem = await statfs(CACHE_ROOT);
  const available = Number(filesystem.bavail) * Number(filesystem.bsize);
  return Math.max(
    0,
    Math.min(
      MAX_ARCHIVE_BYTES,
      available - MIN_CACHE_FREE_BYTES - reservedDownloadBytes,
    ),
  );
}

function assertDownloadFits(bytes, capacity) {
  if (!Number.isFinite(bytes) || bytes <= 0) return;
  if (bytes > MAX_ARCHIVE_BYTES) {
    throw new Error("Artifact exceeds the 4 GiB ZIP download limit.");
  }
  if (bytes > capacity) {
    throw new Error(
      `Not enough free disk space to cache this artifact. ${formatBytes(bytes)} is required, with ${formatBytes(capacity)} available after the safety reserve.`,
    );
  }
}

async function downloadArchive(
  token,
  repository,
  artifact,
  archivePath,
  onProgress,
  externalSignal = null,
) {
  const declaredBytes = Number(artifact.sizeInBytes);
  let reservedBytes = 0;
  const reserve = async (totalBytes) => {
    if (!Number.isFinite(totalBytes) || totalBytes <= reservedBytes) return;
    assertDownloadFits(totalBytes, MAX_ARCHIVE_BYTES);
    const additionalBytes = totalBytes - reservedBytes;
    const capacity = await downloadCapacityBytes();
    if (additionalBytes > capacity) {
      throw new Error(
        `Not enough free disk space to cache this artifact. ${formatBytes(totalBytes)} is required, with ${formatBytes(capacity + reservedBytes)} available after the safety reserve.`,
      );
    }
    reservedDownloadBytes += additionalBytes;
    reservedBytes = totalBytes;
  };
  const releaseReservation = () => {
    reservedDownloadBytes = Math.max(0, reservedDownloadBytes - reservedBytes);
    reservedBytes = 0;
  };
  await reserve(declaredBytes);

  const controller = new AbortController();
  if (externalSignal?.aborted) {
    controller.abort(externalSignal.reason);
  } else if (externalSignal) {
    externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason), { once: true });
  }
  let idleTimer;
  const resetIdleTimeout = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      controller.abort(new Error("Artifact download stalled for 60 seconds."));
    }, ARTIFACT_DOWNLOAD_IDLE_TIMEOUT_MS);
  };
  resetIdleTimeout();

  let response;
  try {
    response = await openArtifactDownload(token, repository, artifact.id, {
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(idleTimer);
    releaseReservation();
    if (controller.signal.aborted && controller.signal.reason instanceof Error) {
      throw controller.signal.reason;
    }
    throw error;
  }

  const expectedLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);
  try {
    await reserve(expectedLength);
  } catch (error) {
    clearTimeout(idleTimer);
    controller.abort(error);
    releaseReservation();
    throw error;
  }
  const totalBytes =
    Number.isFinite(expectedLength) && expectedLength > 0
      ? expectedLength
      : Number.isFinite(declaredBytes) && declaredBytes > 0
        ? declaredBytes
        : null;

  const temporary = `${archivePath}.${process.pid}.${Date.now()}.part`;
  let received = 0;
  let lastReportAt = 0;
  let bytesPerSecond = 0;
  const samples = [{ at: Date.now(), bytes: 0 }];
  const report = (force = false) => {
    if (!onProgress) return;
    const now = Date.now();
    if (!force && now - lastReportAt < 250) return;
    samples.push({ at: now, bytes: received });
    while (samples.length > 2 && samples[1].at < now - 5_000) samples.shift();
    const first = samples[0];
    const elapsedSeconds = (now - first.at) / 1_000;
    bytesPerSecond =
      elapsedSeconds >= 0.2 ? (received - first.bytes) / elapsedSeconds : 0;
    const percent = totalBytes
      ? Math.min(100, (received / totalBytes) * 100)
      : null;
    onProgress({
      artifactId: artifact.id,
      artifactName: artifact.name,
      stage: "downloading",
      receivedBytes: received,
      totalBytes,
      percent,
      bytesPerSecond,
      etaSeconds:
        totalBytes && bytesPerSecond > 0
          ? Math.max(0, (totalBytes - received) / bytesPerSecond)
          : null,
    });
    lastReportAt = now;
  };
  report(true);

  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      if (received > MAX_ARCHIVE_BYTES) {
        callback(new Error("Artifact exceeded the 4 GiB ZIP download limit."));
        return;
      }
      if (reservedBytes > 0 && received > reservedBytes) {
        callback(new Error("Artifact download exhausted the available cache space."));
        return;
      }
      resetIdleTimeout();
      report();
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(response.body),
      limiter,
      createWriteStream(temporary, { flags: "wx" }),
    );
    report(true);
    await rename(temporary, archivePath);
  } catch (error) {
    await rm(temporary, { force: true });
    if (controller.signal.aborted && controller.signal.reason instanceof Error) {
      throw controller.signal.reason;
    }
    throw error;
  } finally {
    clearTimeout(idleTimer);
    releaseReservation();
  }
  return {
    bytesPerSecond,
    receivedBytes: received,
    totalBytes: totalBytes ?? received,
  };
}

async function buildMetadata(token, repository, artifactId, onProgress, signal = null) {
  const paths = pathsFor(artifactId);
  const artifact = await getArtifact(token, repository, paths.id);
  if (artifact.expired) {
    throw new Error("This GitHub Actions artifact has expired.");
  }

  await mkdir(CACHE_ROOT, { recursive: true });
  onProgress?.({
    artifactId: artifact.id,
    artifactName: artifact.name,
    stage: "preparing",
    receivedBytes: 0,
    totalBytes: artifact.sizeInBytes,
    percent: 0,
    bytesPerSecond: 0,
    etaSeconds: null,
  });
  const transfer = await downloadArchive(
    token,
    repository,
    artifact,
    paths.archive,
    onProgress,
    signal,
  );
  const compressedBytes = transfer.receivedBytes;
  try {
    onProgress?.({
      artifactId: artifact.id,
      artifactName: artifact.name,
      stage: "indexing",
      receivedBytes: compressedBytes,
      totalBytes: transfer.totalBytes,
      percent: 100,
      bytesPerSecond: transfer.bytesPerSecond,
      etaSeconds: 0,
    });
    const index = await readZipIndex(paths.archive);
    const PREFIX_BYTES = 8 * 1024;
    const analysis = await analyzeArtifact(index, async (entry) => {
      return readEntryPrefix(paths.archive, entry, PREFIX_BYTES);
    });
    const timestamp = new Date().toISOString();
    const metadata = {
      artifact,
      repository,
      downloadedAt: timestamp,
      lastAccessedAt: timestamp,
      compressedBytes,
      analysis,
    };
    await writeJsonAtomic(paths.metadata, metadata);
    indexCache.set(paths.id, { archivePath: paths.archive, index });
    onProgress?.({
      artifactId: artifact.id,
      artifactName: artifact.name,
      stage: "ready",
      receivedBytes: compressedBytes,
      totalBytes: transfer.totalBytes,
      percent: 100,
      bytesPerSecond: transfer.bytesPerSecond,
      etaSeconds: 0,
    });
    return metadata;
  } catch (error) {
    await Promise.all([
      rm(paths.archive, { force: true }),
      rm(paths.metadata, { force: true }),
    ]);
    throw error;
  }
}

async function cachedMetadata(artifactId) {
  const paths = pathsFor(artifactId);
  const metadata = await readMetadataFile(paths.metadata);
  if (!metadata) return null;
  try {
    const archive = await stat(paths.archive);
    if (!archive.isFile()) return null;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  return metadata;
}

export async function inspectArtifact(
  token,
  repository,
  artifactId,
  { onProgress } = {},
) {
  const paths = pathsFor(artifactId);
  const key = `${repository}:${paths.id}`;
  const active = downloads.get(key);
  if (active) {
    if (onProgress) active.listeners.add(onProgress);
    try {
      return await active.operation;
    } finally {
      if (onProgress) active.listeners.delete(onProgress);
    }
  }

  const listeners = new Set(onProgress ? [onProgress] : []);
  const emit = (progress) => {
    for (const listener of listeners) listener(progress);
  };
  const externalController = new AbortController();
  const operation = (async () => {
    const existing = await cachedMetadata(paths.id);
    if (existing?.repository === repository && existing.analysis) {
      existing.lastAccessedAt = new Date().toISOString();
      await writeJsonAtomic(paths.metadata, existing);
      emit({
        artifactId: Number(paths.id),
        artifactName: existing.artifact?.name ?? `Artifact ${paths.id}`,
        stage: "ready",
        receivedBytes: existing.compressedBytes,
        totalBytes: existing.compressedBytes,
        percent: 100,
        bytesPerSecond: 0,
        etaSeconds: 0,
        cached: true,
      });
      return existing;
    }
    if (existing) await deleteCachedArtifact(paths.id);
    return buildMetadata(token, repository, paths.id, emit, externalController.signal);
  })();
  const download = { listeners, operation, abort: () => externalController.abort(new Error("Cache cleared.")) };
  downloads.set(key, download);
  try {
    return await operation;
  } catch (error) {
    emit({
      artifactId: Number(paths.id),
      stage: "error",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    if (downloads.get(key) === download) downloads.delete(key);
    listeners.clear();
  }
}

export async function getCachedArtifact(artifactId, { touch = true } = {}) {
  const paths = pathsFor(artifactId);
  const metadata = await cachedMetadata(paths.id);
  if (!metadata) return null;
  if (touch) {
    metadata.lastAccessedAt = new Date().toISOString();
    await writeJsonAtomic(paths.metadata, metadata);
  }
  return metadata;
}

async function getIndex(artifactId) {
  const paths = pathsFor(artifactId);
  const cached = indexCache.get(paths.id);
  if (cached?.archivePath === paths.archive) return cached.index;
  const index = await readZipIndex(paths.archive);
  indexCache.set(paths.id, { archivePath: paths.archive, index });
  return index;
}

export async function getCachedEntry(artifactId, entryPath) {
  const paths = pathsFor(artifactId);
  const metadata = await cachedMetadata(paths.id);
  if (!metadata) throw new Error("Artifact is not cached. Inspect it first.");
  const index = await getIndex(paths.id);
  const entry = findZipEntry(index, entryPath);
  if (!entry) throw new Error(`File was not found in the artifact: ${entryPath}`);
  return { metadata, archivePath: paths.archive, index, entry };
}

export async function readCachedEntry(artifactId, entryPath, maxBytes = MAX_INLINE_PREVIEW_BYTES) {
  const context = await getCachedEntry(artifactId, entryPath);
  return {
    ...context,
    content: await readZipEntry(context.archivePath, context.entry, maxBytes),
  };
}

export async function deleteCachedArtifact(artifactId) {
  const paths = pathsFor(artifactId);
  indexCache.delete(paths.id);
  await Promise.all([
    rm(paths.archive, { force: true }),
    rm(paths.metadata, { force: true }),
  ]);
  return { deleted: paths.id };
}

export async function clearArtifactCache() {
  const inflight = [...downloads.values()];
  for (const entry of inflight) entry.abort?.();
  await Promise.allSettled(inflight.map((entry) => entry.operation));
  indexCache.clear();
  await rm(CACHE_ROOT, { recursive: true, force: true });
  await mkdir(CACHE_ROOT, { recursive: true });
  return { cleared: true };
}

export async function getCacheSummary() {
  await mkdir(CACHE_ROOT, { recursive: true });
  const files = await readdir(CACHE_ROOT, { withFileTypes: true });
  const metadataFiles = files.filter(
    (entry) => entry.isFile() && /^\d+\.json$/.test(entry.name),
  );
  const artifacts = [];
  const errors = [];
  let totalBytes = 0;

  for (const file of metadataFiles) {
    const id = file.name.slice(0, -5);
    try {
      const metadata = await cachedMetadata(id);
      if (!metadata) continue;
      const archive = await stat(pathsFor(id).archive);
      totalBytes += archive.size;
      artifacts.push({
        id,
        name: metadata.artifact?.name ?? `Artifact ${id}`,
        repository: metadata.repository,
        bytes: archive.size,
        downloadedAt: metadata.downloadedAt,
        lastAccessedAt: metadata.lastAccessedAt,
        primary:
          ["html", "static-site"].includes(metadata.analysis?.primary?.kind) &&
          !hasRootIndexHtml(metadata.analysis?.entries ?? [])
            ? null
            : metadata.analysis?.primary ?? null,
      });
    } catch (error) {
      errors.push({
        id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  artifacts.sort((left, right) =>
    String(right.lastAccessedAt).localeCompare(String(left.lastAccessedAt)));
  return { totalBytes, count: artifacts.length, artifacts, errors };
}
