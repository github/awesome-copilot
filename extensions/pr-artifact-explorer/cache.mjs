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
  CACHE_ROOT,
  JOBS_FILE,
  MAX_INLINE_PREVIEW_BYTES,
  MIN_CACHE_FREE_BYTES,
} from "./constants.mjs";
import { CacheMaintenanceCoordinator } from "./cache-coordinator.mjs";
import { analyzeArtifact, hasRootIndexHtml } from "./detector.mjs";
import { getArtifact, openArtifactDownload } from "./github.mjs";
import { JobRegistry } from "./jobs.mjs";
import { limitPolicy } from "./limits.mjs";
import {
  findZipEntry,
  readEntryPrefix,
  readZipEntry,
  readZipIndex,
  streamZipEntry,
  streamZipEntryRange,
  verifyZipEntry,
} from "./zip.mjs";

const indexCache = new Map();
const verifiedEntries = new Map();
const verificationsInFlight = new Map();
const MAX_VERIFIED_ENTRIES = 512;
const maintenance = new CacheMaintenanceCoordinator();
export const jobRegistry = new JobRegistry(limitPolicy, { file: JOBS_FILE });
let reservedDownloadBytes = 0;
let metadataWriteSequence = 0;

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
  const temporary = `${path}.${process.pid}.${++metadataWriteSequence}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
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
  return Math.max(0, available - MIN_CACHE_FREE_BYTES - reservedDownloadBytes);
}

async function downloadArchive(
  token,
  repository,
  artifact,
  archivePath,
  onProgress,
  signal = null,
  onActivity = () => {},
) {
  const declaredBytes = Number(artifact.sizeInBytes);
  let reservedBytes = 0;
  const reserve = async (totalBytes) => {
    if (!Number.isFinite(totalBytes) || totalBytes <= reservedBytes) return;
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

  let response;
  try {
    response = await openArtifactDownload(token, repository, artifact.id, { signal });
  } catch (error) {
    releaseReservation();
    throw error;
  }

  const expectedLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);
  try {
    await reserve(expectedLength);
  } catch (error) {
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
      onActivity({ downloadBytes: received });
      const proceed = () => {
        report();
        callback(null, chunk);
      };
      if (received <= reservedBytes) {
        proceed();
        return;
      }
      // The declared size was too small; grow the reservation, still honouring the disk guard.
      reserve(received + 64 * 1024 * 1024).then(proceed, (error) => callback(error));
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(response.body),
      limiter,
      createWriteStream(temporary, { flags: "wx" }),
      ...(signal ? [{ signal }] : []),
    );
    report(true);
    await rename(temporary, archivePath);
  } catch (error) {
    await rm(temporary, { force: true });
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : error;
    }
    throw error;
  } finally {
    releaseReservation();
  }
  return {
    bytesPerSecond,
    receivedBytes: received,
    totalBytes: totalBytes ?? received,
  };
}

function downloadMarker(paths) {
  return `${paths.archive}.complete.json`;
}

async function readDownloadMarker(paths, repository) {
  try {
    const marker = JSON.parse(await readFile(downloadMarker(paths), "utf8"));
    const archive = await stat(paths.archive);
    if (
      archive.isFile() &&
      marker.repository === repository &&
      marker.receivedBytes === archive.size
    ) {
      return marker;
    }
  } catch (error) {
    if (error?.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
  }
  return null;
}

/**
 * Downloads (unless a completed ZIP is already present) and indexes an artifact.
 * A completed ZIP is never deleted because indexing failed, so retries only redo
 * the indexing step.
 */
async function buildMetadata(token, repository, artifactId, job) {
  const paths = pathsFor(artifactId);
  const signal = job.controller.signal;
  const artifact = await getArtifact(token, repository, paths.id);
  await mkdir(CACHE_ROOT, { recursive: true });
  const progressOf = (patch) => ({
    artifactId: artifact.id,
    artifactName: artifact.name,
    totalBytes: artifact.sizeInBytes,
    ...patch,
  });
  const publish = (progress, live) => {
    jobRegistry.update(job, {
      stage: progress.stage,
      progress,
      artifactName: artifact.name,
      live,
    });
  };

  let marker = await readDownloadMarker(paths, repository);
  let transfer;
  if (marker) {
    transfer = { bytesPerSecond: 0, receivedBytes: marker.receivedBytes, totalBytes: marker.receivedBytes };
  } else {
    if (artifact.expired) {
      throw new Error("This GitHub Actions artifact has expired.");
    }
    await removeArtifactFiles(paths);
    publish(progressOf({ stage: "preparing", receivedBytes: 0, percent: 0, bytesPerSecond: 0, etaSeconds: null }));
    transfer = await downloadArchive(
      token,
      repository,
      artifact,
      paths.archive,
      (progress) => publish(progress, { downloadBytes: progress.receivedBytes }),
      signal,
      (live) => jobRegistry.update(job, { live }),
    );
    await writeJsonAtomic(downloadMarker(paths), {
      repository,
      receivedBytes: transfer.receivedBytes,
      completedAt: new Date().toISOString(),
    });
  }

  const compressedBytes = transfer.receivedBytes;
  publish(
    progressOf({
      stage: "indexing",
      receivedBytes: compressedBytes,
      totalBytes: transfer.totalBytes,
      percent: 100,
      bytesPerSecond: transfer.bytesPerSecond,
      etaSeconds: 0,
    }),
    { downloadBytes: compressedBytes },
  );
  const index = await readZipIndex(paths.archive, {
    softLimits: {
      zipEntries: () => limitPolicy.get("zipEntries"),
      centralDirectoryBytes: () => limitPolicy.get("centralDirectoryBytes"),
    },
    onSoftLimit: (kind, current) => jobRegistry.update(job, { live: { [kind]: current }, activity: false }),
    onProgress: () => jobRegistry.update(job, {}),
  });
  if (signal.aborted) throw signal.reason;
  const PREFIX_BYTES = 8 * 1024;
  const analysis = await analyzeArtifact(index, async (entry) => {
    if (signal.aborted) throw signal.reason;
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
  publish(
    progressOf({
      stage: "ready",
      receivedBytes: compressedBytes,
      totalBytes: transfer.totalBytes,
      percent: 100,
      bytesPerSecond: transfer.bytesPerSecond,
      etaSeconds: 0,
    }),
  );
  return metadata;
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

/**
 * Starts (or reattaches to) the background job for an artifact. The job runs
 * independently of any HTTP request or view; call `retry` semantics by simply
 * starting again after a failure.
 */
export async function startArtifactJob(token, repository, artifactId, { account = null } = {}) {
  const paths = pathsFor(artifactId);
  while (true) {
    const barrier = maintenance.inspectionBarrier(paths.id);
    if (!barrier) break;
    await barrier;
  }
  const key = `${account ?? "anonymous"}:${repository}:${paths.id}`;
  return jobRegistry.start(
    key,
    { repository, artifactId: paths.id, account },
    async (job) => {
      const existing = await cachedMetadata(paths.id);
      if (existing?.repository === repository && existing.analysis) {
        existing.lastAccessedAt = new Date().toISOString();
        await writeJsonAtomic(paths.metadata, existing);
        jobRegistry.update(job, {
          stage: "ready",
          artifactName: existing.artifact?.name,
          progress: {
            artifactId: Number(paths.id),
            artifactName: existing.artifact?.name ?? `Artifact ${paths.id}`,
            stage: "ready",
            receivedBytes: existing.compressedBytes,
            totalBytes: existing.compressedBytes,
            percent: 100,
            bytesPerSecond: 0,
            etaSeconds: 0,
            cached: true,
          },
        });
        return existing;
      }
      indexCache.delete(paths.id);
      await rm(paths.metadata, { force: true });
      return buildMetadata(token, repository, paths.id, job);
    },
  );
}

export async function inspectArtifact(token, repository, artifactId) {
  const job = await startArtifactJob(token, repository, artifactId);
  return job.promise;
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

async function verifyEntryOnce(context, options) {
  const { entry, archivePath } = context;
  const info = await stat(archivePath);
  const key = [archivePath, info.size, info.mtimeMs, entry.name, entry.localHeaderOffset, entry.compressedSize, entry.uncompressedSize, entry.crc32].join("|");
  for (;;) {
    if (verifiedEntries.has(key)) return;
    let pending = verificationsInFlight.get(key);
    const leader = !pending;
    if (leader) {
      pending = verifyZipEntry(archivePath, entry, options).then(() => {
        if (verifiedEntries.size >= MAX_VERIFIED_ENTRIES) verifiedEntries.delete(verifiedEntries.keys().next().value);
        verifiedEntries.set(key, true);
      });
      verificationsInFlight.set(key, pending);
      pending.then(
        () => verificationsInFlight.delete(key),
        () => verificationsInFlight.delete(key),
      );
    }
    try {
      await pending;
      return;
    } catch (error) {
      // A follower retries when only the leader's request was cancelled.
      if (leader || options.signal?.aborted || error?.name !== "AbortError") throw error;
    }
  }
}

/**
 * Verifies a whole entry (size + CRC) before any ranged bytes are served, so the caller
 * can still answer with a real error status. Progress and soft-limit prompts are tracked
 * like a stream job; verification is never stopped by a soft limit.
 */
export async function verifyCachedEntry(context) {
  const outer = new AbortController();
  let tracker = null;
  const ensure = () => {
    if (tracker) return;
    tracker = jobRegistry.track({
      repository: context.metadata?.repository,
      artifactId: context.metadata?.artifact?.id,
      name: context.entry.name,
    });
    tracker.signal.addEventListener("abort", () => outer.abort(), { once: true });
  };
  const limit = () => limitPolicy.get("streamedEntryBytes");
  if (context.entry.uncompressedSize > limit()) ensure();
  try {
    await verifyEntryOnce(context, {
      signal: outer.signal,
      softLimit: limit,
      onSoftLimit: ensure,
      onProgress: (bytes) => tracker?.update(bytes),
    });
    tracker?.finish();
  } catch (error) {
    tracker?.finish(error);
    throw error;
  }
}

/**
 * Streams a cached entry to `writable`. A tracked stream job appears (with a soft-limit
 * prompt) only once the live decompressed size crosses the current limit; the stream
 * itself is never stopped by it, only by explicit cancel, a closed client or an
 * integrity failure.
 */
export async function streamCachedEntry(context, writable, transform = null, range = null) {
  const outer = new AbortController();
  let tracker = null;
  const ensure = () => {
    if (tracker) return;
    tracker = jobRegistry.track({
      repository: context.metadata?.repository,
      artifactId: context.metadata?.artifact?.id,
      name: context.entry.name,
    });
    tracker.signal.addEventListener("abort", () => outer.abort(), { once: true });
  };
  const limit = () => limitPolicy.get("streamedEntryBytes");
  const servedBytes = range ? range.end - range.start + 1 : context.entry.uncompressedSize;
  const verifyBytes = range ? context.entry.uncompressedSize : servedBytes;
  if (Math.max(servedBytes, verifyBytes) > limit()) ensure();
  try {
    const options = {
      signal: outer.signal,
      softLimit: limit,
      onSoftLimit: ensure,
      onProgress: (bytes) => tracker?.update(bytes),
    };
    if (range) {
      await verifyEntryOnce(context, options);
      await streamZipEntryRange(context.archivePath, context.entry, writable, range, options);
    } else {
      await streamZipEntry(context.archivePath, context.entry, writable, transform, options);
    }
    tracker?.finish();
  } catch (error) {
    tracker?.finish(error);
    throw error;
  }
}

export async function readCachedEntry(artifactId, entryPath, maxBytes = MAX_INLINE_PREVIEW_BYTES) {
  const context = await getCachedEntry(artifactId, entryPath);
  return {
    ...context,
    content: await readZipEntry(context.archivePath, context.entry, maxBytes),
  };
}

async function removeArtifactFiles(paths) {
  await Promise.all([
    rm(paths.archive, { force: true }),
    rm(paths.metadata, { force: true }),
    rm(downloadMarker(paths), { force: true }),
  ]);
}

export class JobsActiveError extends Error {
  constructor(jobs) {
    super("Artifact jobs are still running. Cancel them explicitly to continue.");
    this.name = "JobsActiveError";
    this.code = "jobs_active";
    this.jobs = jobs;
  }
}

async function cancelAndSettle(jobs, reason) {
  for (const job of jobs) jobRegistry.cancel(job.id, reason);
  await Promise.allSettled(jobs.map((job) => job.promise));
}

export async function deleteCachedArtifact(artifactId, { cancelJobs = false } = {}) {
  const paths = pathsFor(artifactId);
  const jobs = jobRegistry.activeJobs().filter((job) => job.artifactId === paths.id);
  if (jobs.length && !cancelJobs) {
    throw new JobsActiveError(jobs.map((job) => jobRegistry.snapshot(job)));
  }
  return maintenance.deleteArtifact(paths.id, async () => {
    indexCache.delete(paths.id);
    await cancelAndSettle(jobs, "Artifact deleted.");
    await removeArtifactFiles(paths);
    return { deleted: paths.id };
  });
}

export async function clearArtifactCache({ cancelJobs = false } = {}) {
  const jobs = jobRegistry.activeJobs();
  if (jobs.length && !cancelJobs) {
    throw new JobsActiveError(jobs.map((job) => jobRegistry.snapshot(job)));
  }
  return maintenance.clearCache(async () => {
    await cancelAndSettle(jobs, "Cache cleared.");
    indexCache.clear();
    await rm(CACHE_ROOT, { recursive: true, force: true });
    await mkdir(CACHE_ROOT, { recursive: true });
    return { cleared: true };
  });
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
