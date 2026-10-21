import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, posix } from "node:path";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { resolveAccounts, invalidateAccounts } from "./accounts.mjs";
import {
  clearArtifactCache,
  deleteCachedArtifact,
  getCacheSummary,
  getCachedArtifact,
  getCachedEntry,
  streamCachedEntry,
  verifyCachedEntry,
  JobsActiveError,
  jobRegistry,
  readCachedEntry,
  startArtifactJob,
} from "./cache.mjs";
import { LimitError, limitPolicy } from "./limits.mjs";
import {
  ASSET_ROOT,
  MAX_INLINE_PREVIEW_BYTES,
  MAX_TRX_PREVIEW_BYTES,
} from "./constants.mjs";
import {
  hasRootIndexHtml,
  isInlineTextKind,
  kindForPath,
  mimeForPath,
} from "./detector.mjs";
import {
  enrichPullRequests,
  filterPullRequests,
  getIssue,
  getRepository,
  getWorkflowRun,
  GitHubApiError,
  listBranches,
  listRepositoryContributors,
  listPullRequestArtifacts,
  listRunArtifactCounts,
  listWorkflowRuns,
  listWorkflows,
  MAX_ARTIFACT_COUNT_RUNS,
  normalizeRunFilters,
  searchPullRequestBase,
  searchPullRequests,
  suggestRepositories,
} from "./github.mjs";
import {
  describeOwnedPreview,
  startStaticPreview,
  stopAllStaticPreviews,
  stopStaticPreviewsForArtifact,
  stopStaticPreviewsForOrigin,
} from "./preview.mjs";
import { ExpiringPromiseCache } from "./memory-cache.mjs";
import { buildRawView } from "./raw.mjs";
import { ExternalOpenError, openInDefaultBrowser, validateExternalUrl } from "./external-open.mjs";
import { renderHtml } from "./render.mjs";
import { RerunError, prepareRerun, requestRerun } from "./rerun.mjs";
import {
  hasCapabilityToken,
  isCanonicalHost,
  isCrossSiteRequest,
  requiresCapabilityToken,
} from "./security.mjs";
import {
  loadPrefs,
  normalizeRepository,
  rememberRepository,
  savePrefs,
  setExplorerPreferences,
  setFavoriteRepository,
  setPinnedRepository,
  setPlayerPreferences,
  setPullFilterPreferences,
} from "./state.mjs";
import { CaptureError, ControlledBrowser, SCREENSHOT_ROOT, captureScreenshot, getScreenshotRoot } from "./capture.mjs";
import { TargetError, describeShare, parseTarget, routeFor } from "./targets.mjs";

const servers = new Map();
const MAX_BODY_BYTES = 1024 * 1024;
const PULL_REQUEST_CACHE_TTL_MS = 2 * 60 * 1_000;
const PROGRESSIVE_PULL_BATCH_SIZE = 25;
const pullRequestCache = new ExpiringPromiseCache({
  maxEntries: 100,
  ttlMs: PULL_REQUEST_CACHE_TTL_MS,
});
const progressivePullRequestCache = new ExpiringPromiseCache({
  maxEntries: 100,
  ttlMs: PULL_REQUEST_CACHE_TTL_MS,
});

const MAIN_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-src http: https:",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com https://github.com",
  "object-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
].join("; ");

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message, extra.cause ? { cause: extra.cause } : undefined);
    this.name = "HttpError";
    this.status = status;
    const { cause, ...rest } = extra;
    this.extra = rest;
  }
}

/** Owned artifact sites bake their theme at start; re-resolve to the requested theme, keeping path/query/hash. Foreign URLs return null. */
async function themedOwnedUrl(value, theme) {
  if (theme !== "light" && theme !== "dark") return null;
  let parsed;
  try {
    parsed = new URL(String(value ?? ""));
  } catch {
    return null;
  }
  const owned = describeOwnedPreview(parsed.origin);
  if (!owned || owned.theme === theme) return null;
  const fresh = new URL(
    await startStaticPreview(owned.artifactId, owned.entryPath, { theme, parentOrigin: owned.canvasOrigin }),
  );
  return `${fresh.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function createCapabilityToken() {
  return randomBytes(32).toString("base64url");
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

function sendText(res, status, value, type = "text/plain; charset=utf-8", headers = {}) {
  const body = String(value);
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  res.end(body);
}

function pullRequestCacheKey(account, kind, values) {
  return [
    account?.id ?? account?.login ?? "unknown",
    kind,
    ...values.map((value) => String(value ?? "").toLocaleLowerCase()),
  ].join("|");
}

function progressivePullPayload(session, pulls, {
  complete = false,
  offset = 0,
} = {}) {
  const filterActive =
    session.base.filters.artifacts !== "all" ||
    session.base.filters.ci !== "all";
  return {
    ...session.base,
    filtered: complete && filterActive,
    pulls,
    progressive: {
      batchSize: PROGRESSIVE_PULL_BATCH_SIZE,
      complete,
      detailedCount: session.completedNumbers.size,
      loadedCount: Math.min(
        session.base.pulls.length,
        offset + pulls.length,
      ),
      offset,
      sessionId: session.id,
      sourceCount: session.base.pulls.length,
    },
  };
}

function completeProgressivePullPayload(session) {
  const enriched = session.base.pulls
    .map((pull) => session.enrichedPulls.get(Number(pull.number)))
    .filter(Boolean);
  return progressivePullPayload(
    session,
    filterPullRequests(enriched, session.base.filters),
    { complete: true },
  );
}

async function loadProgressivePullDetails(
  session,
  cacheKey,
  token,
  repository,
  offset,
) {
  const completed = session.detailResults.get(offset);
  if (completed) return completed;
  const existing = session.detailPromises.get(offset);
  if (existing) return existing;
  const source = session.base.pulls.slice(
    offset,
    offset + PROGRESSIVE_PULL_BATCH_SIZE,
  );
  const promise = (async () => {
    const enriched = await enrichPullRequests(
      token,
      repository,
      source,
      session.base.filters,
    );
    for (const pull of enriched) {
      session.enrichedPulls.set(Number(pull.number), pull);
      session.completedNumbers.add(Number(pull.number));
    }
    const sourceNumbers = source.map((pull) => Number(pull.number));
    const complete =
      session.completedNumbers.size >= session.base.pulls.length;
    const payload = complete ? completeProgressivePullPayload(session) : null;
    if (
      payload &&
      progressivePullRequestCache.peek(cacheKey) === session
    ) {
      pullRequestCache.set(cacheKey, payload);
    }
    const result = {
      complete,
      completedCount: session.completedNumbers.size,
      payload,
      pulls: filterPullRequests(enriched, session.base.filters),
      sourceNumbers,
    };
    session.detailResults.set(offset, result);
    return result;
  })();
  session.detailPromises.set(offset, promise);
  try {
    return await promise;
  } finally {
    if (session.detailPromises.get(offset) === promise) {
      session.detailPromises.delete(offset);
    }
  }
}

async function sendFile(res, filePath, type) {
  const info = await stat(filePath);
  if (!info.isFile()) throw new HttpError(404, "Asset not found.");
  res.writeHead(200, {
    "Cache-Control": "public, max-age=3600",
    "Content-Length": String(info.size),
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
  });
  await pipeline(createReadStream(filePath), res);
}

async function readJsonBody(req) {
  const type = req.headers["content-type"] ?? "";
  if (!String(type).toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Request body must be JSON.");
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_BODY_BYTES) throw new HttpError(413, "Request body is too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    throw new HttpError(400, "Request body is not valid JSON.", { cause: error });
  }
}

function broadcast(entry, event, payload) {
  const encoded = JSON.stringify(payload);
  for (const response of entry.sseClients) {
    try {
      response.write(`event: ${event}\ndata: ${encoded}\n\n`);
    } catch {
      entry.sseClients.delete(response);
    }
  }
}

function assertNoActiveJobs(artifactId = null) {
  const active = jobRegistry
    .activeJobs()
    .filter((job) => artifactId === null || job.artifactId === String(artifactId));
  if (active.length) {
    throw new HttpError(409, new JobsActiveError(active).message, {
      code: "jobs_active",
      jobs: active.map((job) => jobRegistry.snapshot(job)),
    });
  }
}

let jobSubscription = null;
function ensureJobBroadcast() {
  if (jobSubscription) return;
  let lastStatus = new Map();
  jobSubscription = jobRegistry.subscribe((snapshot) => {
    for (const entry of servers.values()) broadcast(entry, "job", snapshot);
    const previous = lastStatus.get(snapshot.id);
    lastStatus.set(snapshot.id, snapshot.status);
    if (previous !== snapshot.status && snapshot.status !== "running") {
      void broadcastCache();
      if (lastStatus.size > 100) lastStatus = new Map([...lastStatus].slice(-50));
    }
  });
}

async function resolveAuth(repository, force = false) {
  const prefs = await loadPrefs();
  const previousRepository = prefs.repository;
  const previousRecent = JSON.stringify(prefs.repositories.recent);
  const normalizedRepository = rememberRepository(prefs, repository);
  const auth = await resolveAccounts({
    preferredId: prefs.account,
    repository: normalizedRepository,
    force,
  });
  let changed =
    prefs.repository !== previousRepository ||
    JSON.stringify(prefs.repositories.recent) !== previousRecent;
  if (auth.active && prefs.account !== auth.active.id) {
    prefs.account = auth.active.id;
    changed = true;
  }
  if (changed) await savePrefs(prefs);
  if (!auth.activeToken) {
    throw new HttpError(
      401,
      "No usable GitHub account was detected. Sign in through the Copilot app or GitHub CLI.",
    );
  }
  return { prefs, auth };
}

function parseArtifactRoute(pathname) {
  return pathname.match(/^\/api\/artifacts\/(\d+)$/);
}

function decodeEntryPath(encoded) {
  try {
    return encoded.split("/").map((part) => decodeURIComponent(part)).join("/");
  } catch (error) {
    throw new HttpError(400, "File path contains invalid URL encoding.", { cause: error });
  }
}

export function contentDeliveryMode(entry, download) {
  if (entry?.supported) return "entry";
  return download ? "archive" : "unsupported";
}

function archiveDownloadName(context, artifactId) {
  const rawName = String(
    context.metadata?.artifact?.name || `artifact-${artifactId}`,
  ).replaceAll("\\", "/");
  const baseName = posix.basename(rawName) || `artifact-${artifactId}`;
  return baseName.toLowerCase().endsWith(".zip")
    ? baseName
    : `${baseName}.zip`;
}

async function sendArchiveDownload(req, res, context, artifactId) {
  const info = await stat(context.archivePath);
  const filename = archiveDownloadName(context, artifactId);
  res.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Disposition":
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Content-Length": String(info.size),
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Content-Type": "application/zip",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  await pipeline(createReadStream(context.archivePath), res);
}

async function handleContentRequest(req, res, pathname, searchParams) {
  const match = pathname.match(/^\/content\/(\d+)\/(.+)$/);
  if (!match) return false;
  if (!["GET", "HEAD"].includes(req.method)) {
    throw new HttpError(405, "Only GET and HEAD are supported.");
  }
  const artifactId = match[1];
  const entryPath = decodeEntryPath(match[2]);
  const context = await getCachedEntry(artifactId, entryPath);
  const download = searchParams.get("download") === "1";
  const deliveryMode = contentDeliveryMode(context.entry, download);
  if (deliveryMode === "unsupported") {
    throw new HttpError(415, "This ZIP entry cannot be served.");
  }
  if (deliveryMode === "archive") {
    await sendArchiveDownload(req, res, context, artifactId);
    return true;
  }

  const size = context.entry.uncompressedSize;
  const range = download ? { kind: "none" } : parseByteRange(req.headers.range, size);
  const headers = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Length": String(size),
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "Content-Type": mimeForPath(context.entry.name),
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
  if (download) {
    headers["Content-Disposition"] =
      `attachment; filename*=UTF-8''${encodeURIComponent(posix.basename(context.entry.name))}`;
  }
  let status = 200;
  let partial = null;
  if (range.kind === "unsatisfiable") {
    headers["Content-Range"] = `bytes */${size}`;
    headers["Content-Length"] = "0";
    res.writeHead(416, headers);
    res.end();
    return true;
  }
  if (range.kind === "range") {
    if (req.method !== "HEAD") {
      try {
        await verifyCachedEntry(context);
      } catch (error) {
        throw new HttpError(502, `Entry failed integrity verification: ${error.message}`);
      }
    }
    status = 206;
    partial = { start: range.start, end: range.end };
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
    headers["Content-Length"] = String(range.end - range.start + 1);
  }
  res.writeHead(status, headers);
  if (req.method === "HEAD") {
    res.end();
  } else {
    await streamCachedEntry(context, res, null, partial);
  }
  return true;
}

/** Parses a single-range `Range` header; multi-range or malformed values fall back to a full 200. */
export function parseByteRange(header, size) {
  if (typeof header !== "string") return { kind: "none" };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return { kind: "none" };
  let start;
  let end;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix === 0) return { kind: "unsatisfiable" };
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return { kind: "none" };
    if (start >= size || end < start) return { kind: "unsatisfiable" };
  }
  if (size === 0) return { kind: "unsatisfiable" };
  return { kind: "range", start, end };
}

async function handleApi(req, res, entry, url) {
  const path = url.pathname;
  if (req.method === "GET" && path === "/api/bootstrap") {
    const prefs = await loadPrefs();
    const repository =
      typeof entry.initialInput?.repository === "string"
        ? normalizeRepository(entry.initialInput.repository)
        : prefs.repository;
    const auth = await resolveAccounts({
      preferredId: prefs.account,
      repository,
    });
    if (auth.active && prefs.account !== auth.active.id) {
      prefs.account = auth.active.id;
      await savePrefs(prefs);
    }
    return sendJson(res, 200, {
      prefs,
      account: auth.active,
      accounts: auth.accounts,
      cache: await getCacheSummary(),
      initialInput: entry.initialInput ?? null,
    });
  }

  if (req.method === "GET" && path === "/api/accounts") {
    const prefs = await loadPrefs();
    const repository = normalizeRepository(
      url.searchParams.get("repo") || prefs.repository,
    );
    const { auth } = await resolveAuth(repository, true);
    pullRequestCache.clear();
    progressivePullRequestCache.clear();
    return sendJson(res, 200, {
      account: auth.active,
      accounts: auth.accounts,
      prefs: await loadPrefs(),
    });
  }

  if (req.method === "POST" && path === "/api/account") {
    const body = await readJsonBody(req);
    if (typeof body.id !== "string" || !body.id) {
      throw new HttpError(400, "Account id is required.");
    }
    const repository = normalizeRepository(body.repository);
    const prefs = await loadPrefs();
    prefs.account = body.id;
    await savePrefs(prefs);
    invalidateAccounts();
    pullRequestCache.clear();
    progressivePullRequestCache.clear();
    const { auth } = await resolveAuth(repository, true);
    broadcast(entry, "refresh", { reason: "account" });
    return sendJson(res, 200, {
      account: auth.active,
      accounts: auth.accounts,
      prefs: await loadPrefs(),
    });
  }

  if (req.method === "GET" && path === "/api/repositories/suggest") {
    const query = String(url.searchParams.get("q") ?? "").trim();
    const prefs = await loadPrefs();
    const auth = await resolveAccounts({
      preferredId: prefs.account,
      repository: prefs.repository,
    });
    if (!auth.activeToken) {
      throw new HttpError(401, "No usable GitHub account was found.");
    }
    return sendJson(res, 200, {
      repositories: await suggestRepositories(auth.activeToken, query),
    });
  }

  if (req.method === "POST" && path === "/api/repositories/validate") {
    const body = await readJsonBody(req);
    const repository = normalizeRepository(body.repository);
    const prefs = await loadPrefs();
    const auth = await resolveAccounts({
      preferredId: prefs.account,
      repository,
    });
    if (!auth.activeToken) {
      throw new HttpError(401, "No usable GitHub account was found.");
    }
    return sendJson(res, 200, {
      repository: await getRepository(auth.activeToken, repository),
    });
  }

  if (req.method === "GET" && path === "/api/repositories/authors") {
    const repository = normalizeRepository(url.searchParams.get("repo"));
    const { auth } = await resolveAuth(repository);
    return sendJson(res, 200, {
      authors: await listRepositoryContributors(auth.activeToken, repository),
    });
  }

  if (req.method === "POST" && path === "/api/repositories/pin") {
    const body = await readJsonBody(req);
    const prefs = await loadPrefs();
    setPinnedRepository(prefs, body.repository);
    return sendJson(res, 200, await savePrefs(prefs));
  }

  if (req.method === "POST" && path === "/api/repositories/favorite") {
    const body = await readJsonBody(req);
    if (typeof body.favorite !== "boolean") {
      throw new HttpError(400, "favorite must be a boolean.");
    }
    const prefs = await loadPrefs();
    try {
      setFavoriteRepository(prefs, body.repository, body.favorite);
    } catch (error) {
      throw new HttpError(
        400,
        error instanceof Error ? error.message : "Repository could not be favorited.",
      );
    }
    return sendJson(res, 200, await savePrefs(prefs));
  }

  if (req.method === "POST" && path === "/api/preferences") {
    const body = await readJsonBody(req);
    const prefs = await loadPrefs();
    if (typeof body.repository === "string") {
      rememberRepository(prefs, body.repository);
    }
    if (["open", "closed", "all"].includes(body.pullState)) {
      prefs.pullState = body.pullState;
    }
    if (
      typeof body.repository === "string" &&
      body.pullFilter &&
      typeof body.pullFilter === "object"
    ) {
      setPullFilterPreferences(prefs, body.repository, body.pullFilter);
    }
    if (body.explorer && typeof body.explorer === "object") {
      setExplorerPreferences(prefs, body.explorer);
    }
    if (body.player && typeof body.player === "object") {
      setPlayerPreferences(prefs, body.player);
    }
    return sendJson(res, 200, await savePrefs(prefs));
  }

  if (req.method === "GET" && path === "/api/pulls") {
    const repository = normalizeRepository(url.searchParams.get("repo"));
    const state = url.searchParams.get("state") ?? "open";
    const query = url.searchParams.get("q") ?? "";
    const artifacts = url.searchParams.get("artifacts") ?? "all";
    const ci = url.searchParams.get("ci") ?? "all";
    const { auth } = await resolveAuth(repository);
    const cacheKey = pullRequestCacheKey(auth.active, "list", [
      repository,
      state,
      query,
      artifacts,
      ci,
    ]);
    const phase = url.searchParams.get("phase");
    const force = url.searchParams.get("refresh") === "1";
    if (phase) {
      if (!["initial", "batch", "details"].includes(phase)) {
        throw new HttpError(400, "Unknown progressive pull request phase.");
      }
      if (phase === "initial") {
        const cached = force ? undefined : pullRequestCache.peek(cacheKey);
        if (cached) {
          return sendJson(res, 200, {
            repository,
            ...cached,
            account: auth.active,
            progressive: {
              batchSize: PROGRESSIVE_PULL_BATCH_SIZE,
              complete: true,
              detailedCount: cached.evaluatedCount,
              loadedCount: cached.pulls.length,
              offset: 0,
              sourceCount: cached.evaluatedCount,
            },
          });
        }
        if (force) pullRequestCache.delete(cacheKey);
        const session = await progressivePullRequestCache.get(
          cacheKey,
          async () => ({
            id: randomUUID(),
            base: await searchPullRequestBase(
              auth.activeToken,
              repository,
              query,
              state,
              { artifacts, ci },
              { perPage: 100 },
            ),
            completedNumbers: new Set(),
            detailPromises: new Map(),
            detailResults: new Map(),
            enrichedPulls: new Map(),
          }),
          { force },
        );
        if (!session.base.pulls.length) {
          if (progressivePullRequestCache.peek(cacheKey) !== session) {
            throw new HttpError(
              409,
              "The progressive pull request load expired. Refresh the list.",
            );
          }
          const payload = completeProgressivePullPayload(session);
          pullRequestCache.set(cacheKey, payload);
          return sendJson(res, 200, {
            repository,
            ...payload,
            account: auth.active,
          });
        }
        return sendJson(res, 200, {
          repository,
          ...progressivePullPayload(
            session,
            session.base.pulls.slice(0, PROGRESSIVE_PULL_BATCH_SIZE),
          ),
          account: auth.active,
        });
      }

      const session = progressivePullRequestCache.peek(cacheKey);
      const requestedSessionId = url.searchParams.get("session");
      if (!session || !requestedSessionId || session.id !== requestedSessionId) {
        throw new HttpError(
          409,
          "The progressive pull request load expired. Refresh the list.",
        );
      }
      const offset = Number.parseInt(url.searchParams.get("offset"), 10);
      if (
        !Number.isSafeInteger(offset) ||
        offset < 0 ||
        offset >= session.base.pulls.length ||
        offset % PROGRESSIVE_PULL_BATCH_SIZE !== 0
      ) {
        throw new HttpError(400, "A valid progressive batch offset is required.");
      }
      if (phase === "batch") {
        return sendJson(res, 200, {
          repository,
          ...progressivePullPayload(
            session,
            session.base.pulls.slice(
              offset,
              offset + PROGRESSIVE_PULL_BATCH_SIZE,
            ),
            { offset },
          ),
          account: auth.active,
        });
      }
      const details = await loadProgressivePullDetails(
        session,
        cacheKey,
        auth.activeToken,
        repository,
        offset,
      );
      if (progressivePullRequestCache.peek(cacheKey) !== session) {
        throw new HttpError(
          409,
          "The progressive pull request load expired. Refresh the list.",
        );
      }
      return sendJson(res, 200, {
        repository,
        ...details,
        account: auth.active,
      });
    }

    const result = await pullRequestCache.get(
      cacheKey,
      () =>
        searchPullRequests(
          auth.activeToken,
          repository,
          query,
          state,
          { artifacts, ci },
        ),
      { force },
    );
    return sendJson(res, 200, {
      repository,
      ...result,
      account: auth.active,
    });
  }

  const pullMatch = path.match(/^\/api\/pulls\/(\d+)$/);
  if (req.method === "GET" && pullMatch) {
    const repository = normalizeRepository(url.searchParams.get("repo"));
    const { auth } = await resolveAuth(repository);
    const payload = await pullRequestCache.get(
      pullRequestCacheKey(auth.active, "detail", [repository, pullMatch[1]]),
      () =>
        listPullRequestArtifacts(
          auth.activeToken,
          repository,
          pullMatch[1],
        ),
      { force: url.searchParams.get("refresh") === "1" },
    );
    return sendJson(res, 200, {
      repository,
      ...payload,
      account: auth.active,
    });
  }

  const issueMatch = path.match(/^\/api\/issues\/(\d+)$/);
  if (req.method === "GET" && issueMatch) {
    const repository = normalizeRepository(url.searchParams.get("repo"));
    const { auth } = await resolveAuth(repository);
    const issue = await getIssue(auth.activeToken, repository, issueMatch[1]);
    return sendJson(res, 200, { repository, issue, account: auth.active });
  }

  if (req.method === "GET" && path === "/api/workflows") {
    const repository = normalizeRepository(url.searchParams.get("repo"));
    const { auth } = await resolveAuth(repository);
    const workflows = await pullRequestCache.get(
      pullRequestCacheKey(auth.active, "workflows", [repository]),
      () => listWorkflows(auth.activeToken, repository),
      { force: url.searchParams.get("refresh") === "1" },
    );
    return sendJson(res, 200, { repository, workflows, account: auth.active });
  }

  if (req.method === "GET" && path === "/api/branches") {
    const repository = normalizeRepository(url.searchParams.get("repo"));
    const query = url.searchParams.get("q") ?? "";
    const { auth } = await resolveAuth(repository);
    const load = () => listBranches(auth.activeToken, repository, query);
    // Branch names are case-sensitive, but cache keys are case-folded, so only the unfiltered list is cached.
    const payload = query.trim()
      ? await load()
      : await pullRequestCache.get(
          pullRequestCacheKey(auth.active, "branches", [repository]),
          load,
          { force: url.searchParams.get("refresh") === "1" },
        );
    return sendJson(res, 200, { repository, ...payload, account: auth.active });
  }

  if (req.method === "GET" && path === "/api/runs") {
    const repository = normalizeRepository(url.searchParams.get("repo"));
    const filters = normalizeRunFilters({
      event: url.searchParams.get("event"),
      status: url.searchParams.get("status"),
      branch: url.searchParams.get("branch"),
      workflow: url.searchParams.get("workflow"),
      excludePullRequests: url.searchParams.get("nopr"),
      page: url.searchParams.get("page"),
    });
    const { auth } = await resolveAuth(repository);
    const load = () => listWorkflowRuns(auth.activeToken, repository, filters);
    const force = url.searchParams.get("refresh") === "1";
    // Branch names are case-sensitive but cache keys are case-folded, so those lists bypass the cache.
    const payload = filters.branch
      ? await load()
      : await pullRequestCache.get(
          pullRequestCacheKey(auth.active, "runs", [
            repository,
            filters.event,
            filters.status,
            filters.workflow,
            filters.excludePullRequests,
            filters.page,
          ]),
          load,
          { force },
        );
    return sendJson(res, 200, { repository, ...payload, account: auth.active });
  }

  if (req.method === "GET" && path === "/api/runs/artifact-counts") {
    const repository = normalizeRepository(url.searchParams.get("repo"));
    const ids = String(url.searchParams.get("ids") ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number);
    if (ids.length > MAX_ARTIFACT_COUNT_RUNS || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
      throw new HttpError(400, `Provide up to ${MAX_ARTIFACT_COUNT_RUNS} positive run ids.`);
    }
    const { auth } = await resolveAuth(repository);
    const counts = await listRunArtifactCounts(auth.activeToken, repository, ids);
    return sendJson(res, 200, { repository, counts, account: auth.active });
  }

  const runMatch = path.match(/^\/api\/runs\/(\d+)$/);
  if (req.method === "GET" && runMatch) {
    const repository = normalizeRepository(url.searchParams.get("repo"));
    const { auth } = await resolveAuth(repository);
    const payload = await pullRequestCache.get(
      pullRequestCacheKey(auth.active, "run", [repository, runMatch[1]]),
      () => getWorkflowRun(auth.activeToken, repository, runMatch[1]),
      { force: url.searchParams.get("refresh") === "1" },
    );
    return sendJson(res, 200, { repository, ...payload, account: auth.active });
  }

  if (req.method === "POST" && path === "/api/runs/rerun-context") {
    const body = await readJsonBody(req);
    const repository = normalizeRepository(body.repository);
    const { auth } = await resolveAuth(repository);
    try {
      const context = await prepareRerun(auth.activeToken, {
        repository,
        runId: body.runId,
        artifactId: body.artifactId ?? null,
        pullNumber: body.pullNumber ?? null,
      });
      return sendJson(res, 200, { context, account: auth.active });
    } catch (error) {
      if (error instanceof RerunError) throw new HttpError(error.status, error.message, error.extra);
      throw error;
    }
  }

  if (req.method === "POST" && path === "/api/runs/rerun") {
    const body = await readJsonBody(req);
    if (body.confirmed !== true) throw new HttpError(400, "A re-run requires explicit confirmation.");
    const repository = normalizeRepository(body.repository);
    const { auth } = await resolveAuth(repository);
    if (!body.accountId || body.accountId !== auth.active?.id) {
      throw new HttpError(409, "The selected GitHub account changed. Review the re-run and confirm again.", { code: "account_changed" });
    }
    try {
      const result = await requestRerun(auth.activeToken, { ...body, repository });
      pullRequestCache.clear();
      progressivePullRequestCache.clear();
      return sendJson(res, 201, { rerun: result, account: auth.active });
    } catch (error) {
      if (error instanceof RerunError) {
        const { context, ...extra } = error.extra ?? {};
        throw new HttpError(error.status, error.message, { ...extra, ...(context ? { context } : {}) });
      }
      throw error;
    }
  }

  if (req.method === "POST" && path === "/api/targets/parse") {
    const body = await readJsonBody(req);
    const prefs = await loadPrefs();
    try {
      const target = parseTarget(body.input, { defaultRepository: body.repository || prefs.repository });
      return sendJson(res, 200, { target, route: routeFor(target) });
    } catch (error) {
      if (error instanceof TargetError) throw new HttpError(400, error.message, { code: error.code });
      throw error;
    }
  }

  if (req.method === "POST" && path === "/api/share") {
    const body = await readJsonBody(req);
    try {
      const target = parseTarget(body.input, { defaultRepository: body.repository });
      return sendJson(res, 200, { share: describeShare(target) });
    } catch (error) {
      if (error instanceof TargetError) throw new HttpError(400, error.message, { code: error.code });
      throw error;
    }
  }

  if (req.method === "POST" && path === "/api/capture") {
    const body = await readJsonBody(req);
    try {
      const result = await captureScreenshot({
        url: (await themedOwnedUrl(body.url, body.theme)) ?? body.url,
        preset: body.preset,
        width: body.width,
        height: body.height,
        deviceScaleFactor: body.deviceScaleFactor,
        orientation: body.orientation,
        colorScheme: body.theme,
        fullPage: body.fullPage === true,
      });
      return sendJson(res, 200, { capture: result });
    } catch (error) {
      if (error instanceof CaptureError) {
        throw new HttpError(error.code === "invalid_viewport" || error.code === "invalid_url" ? 400 : 424, error.message, { code: error.code });
      }
      throw error;
    }
  }

  const controlledMatch = path.match(/^\/api\/controlled\/(navigate|history|viewport|screenshot|frame|close|theme)$/);
  if (req.method === "POST" && controlledMatch) {
    const body = await readJsonBody(req);
    const action = controlledMatch[1];
    const viewport = { preset: body.preset, width: body.width, height: body.height, deviceScaleFactor: body.deviceScaleFactor, orientation: body.orientation };
    try {
      entry.controlled ??= new ControlledBrowser();
      if (action === "theme") {
        const result = await entry.controlled.setColorScheme(body.theme);
        const current = entry.controlled.currentUrl;
        const rebuilt = current ? await themedOwnedUrl(current, body.theme) : null;
        if (rebuilt && rebuilt !== current) {
          return sendJson(res, 200, { controlled: { ...result, ...(await entry.controlled.navigate(rebuilt, viewport)) } });
        }
        return sendJson(res, 200, { controlled: result });
      }
      if (action === "navigate") {
        await entry.controlled.setColorScheme(body.theme);
        const target = (await themedOwnedUrl(body.url, body.theme)) ?? body.url;
        return sendJson(res, 200, { controlled: await entry.controlled.navigate(target, viewport) });
      }
      if (action === "history") {
        if (!["back", "forward", "refresh"].includes(body.direction)) throw new HttpError(400, "direction must be back, forward or refresh.");
        return sendJson(res, 200, { controlled: await entry.controlled.history(body.direction) });
      }
      if (action === "viewport") return sendJson(res, 200, { controlled: await entry.controlled.setViewport(viewport) });
      if (action === "frame") {
        const png = await entry.controlled.frame();
        res.writeHead(200, { "content-type": "image/png", "content-length": png.length, "cache-control": "no-store", "x-content-type-options": "nosniff" });
        res.end(png);
        return;
      }
      if (action === "screenshot") return sendJson(res, 200, { capture: await entry.controlled.screenshot({ fullPage: body.fullPage === true }) });
      const closed = await entry.controlled.close();
      return sendJson(res, 200, { closed: true, clean: closed.clean });
    } catch (error) {
      if (error instanceof CaptureError) {
        throw new HttpError(["invalid_viewport", "invalid_url", "not_started"].includes(error.code) ? 400 : 424, error.message, { code: error.code });
      }
      throw error;
    }
  }

  const shotMatch = path.match(/^\/api\/screenshots\/(screenshot-[0-9]+-[0-9a-f]{8}\.png)$/);
  if (req.method === "GET" && shotMatch) {
    let file = join(getScreenshotRoot(), shotMatch[1]);
    let info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      file = join(SCREENSHOT_ROOT, shotMatch[1]);
      info = await stat(file).catch(() => null);
    }
    if (!info?.isFile()) throw new HttpError(404, "Screenshot not found.");
    res.writeHead(200, {
      "content-type": "image/png",
      "content-length": info.size,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    await pipeline(createReadStream(file), res);
    return;
  }

  if (req.method === "POST" && path === "/api/probe") {
    const body = await readJsonBody(req);
    let target;
    try {
      target = new URL(String(body.url ?? ""));
      if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("scheme");
    } catch {
      throw new HttpError(400, "Enter an http(s) URL.", { code: "invalid_url" });
    }
    try {
      const response = await fetch(target, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(6_000),
      });
      await response.body?.cancel();
      const xfo = response.headers.get("x-frame-options");
      const csp = response.headers.get("content-security-policy") ?? "";
      const frameAncestors = /frame-ancestors\s+([^;]+)/i.exec(csp)?.[1]?.trim() ?? null;
      const blockedByXfo = Boolean(xfo && /deny|sameorigin/i.test(xfo));
      const blockedByCsp = Boolean(frameAncestors && !/\*/.test(frameAncestors));
      return sendJson(res, 200, {
        reachable: true,
        status: response.status,
        finalUrl: response.url,
        embeddable: !blockedByXfo && !blockedByCsp,
        reason: blockedByXfo
          ? `The site sends X-Frame-Options: ${xfo}.`
          : blockedByCsp
            ? `The site sends CSP frame-ancestors ${frameAncestors}.`
            : null,
      });
    } catch (error) {
      return sendJson(res, 200, {
        reachable: false,
        embeddable: false,
        reason: `Could not reach the URL (${error?.cause?.code ?? error?.name ?? "error"}).`,
      });
    }
  }

  if (req.method === "POST" && path === "/api/browser/state") {
    const body = await readJsonBody(req);
    entry.browserState = {
      url: typeof body.url === "string" ? body.url.slice(0, 2048) : null,
      preset: typeof body.preset === "string" ? body.preset : null,
      width: Number.isFinite(body.width) ? body.width : null,
      height: Number.isFinite(body.height) ? body.height : null,
      zoom: Number.isFinite(body.zoom) ? body.zoom : null,
    };
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && path === "/api/restart") {
    broadcast(entry, "restart", { reason: "user" });
    const instanceId = [...servers.entries()].find(([, value]) => value === entry)?.[0];
    const jobsPreserved = jobRegistry.activeJobs().length;
    sendJson(res, 200, { restarted: true, jobsPreserved });
    if (instanceId) {
      setTimeout(() => {
        restartInstance(instanceId, entry.log).catch((error) =>
          entry.log?.(`Restart failed: ${error.message}`),
        );
      }, 100);
    }
    return;
  }

  if (req.method === "POST" && path === "/api/artifacts/inspect") {
    const body = await readJsonBody(req);
    const repository = normalizeRepository(body.repository);
    const { auth } = await resolveAuth(repository);
    const job = await startArtifactJob(auth.activeToken, repository, body.artifactId, {
      account: auth.active?.id ?? null,
    });
    return sendJson(res, 202, { job: jobRegistry.snapshot(job) });
  }

  if (req.method === "GET" && path === "/api/jobs") {
    return sendJson(res, 200, {
      jobs: jobRegistry.list(),
      limits: limitPolicy.snapshot(),
      persistError: limitPolicy.persistError ?? jobRegistry.persistError,
      warnings: [limitPolicy.loadWarning, jobRegistry.loadWarning].filter(Boolean),
    });
  }

  const jobMatch = path.match(/^\/api\/jobs\/([0-9a-f-]{36})(?:\/(cancel))?$/);
  if (jobMatch) {
    const job = jobRegistry.get(jobMatch[1]);
    if (!job) throw new HttpError(404, "Job was not found.");
    if (req.method === "GET" && !jobMatch[2]) {
      return sendJson(res, 200, { job: jobRegistry.snapshot(job) });
    }
    if (req.method === "POST" && jobMatch[2] === "cancel") {
      jobRegistry.cancel(job.id);
      return sendJson(res, 200, { job: jobRegistry.snapshot(job) });
    }
  }

  if (req.method === "PUT" && path === "/api/limits") {
    const body = await readJsonBody(req);
    try {
      const result = limitPolicy.submit(body.kind, body.value);
      return sendJson(res, 200, { ...result, limits: limitPolicy.snapshot() });
    } catch (error) {
      if (error instanceof LimitError) {
        return sendJson(res, error.code === "below_current" ? 409 : 400, {
          error: error.message,
          code: error.code,
          kind: error.kind,
          minimum: error.minimum,
          requested: error.requested,
          status: error.code === "below_current" ? 409 : 400,
        });
      }
      throw error;
    }
  }

  const artifactMatch = parseArtifactRoute(path);
  if (req.method === "GET" && artifactMatch) {
    const metadata = await getCachedArtifact(artifactMatch[1]);
    if (!metadata) throw new HttpError(404, "Artifact is not cached.");
    return sendJson(res, 200, metadata);
  }

  const textMatch = path.match(/^\/api\/artifacts\/(\d+)\/text$/);
  if (req.method === "GET" && textMatch) {
    const entryPath = url.searchParams.get("path");
    if (!entryPath) throw new HttpError(400, "File path is required.");
    const kind = kindForPath(entryPath);
    if (!isInlineTextKind(kind)) {
      throw new HttpError(415, "This file is not an inline text preview.");
    }
    const context = await readCachedEntry(
      textMatch[1],
      entryPath,
      kind === "trx" ? MAX_TRX_PREVIEW_BYTES : MAX_INLINE_PREVIEW_BYTES,
    );
    return sendJson(res, 200, {
      path: context.entry.name,
      kind,
      content: context.content.toString("utf8"),
    });
  }

  const rawMatch = path.match(/^\/api\/artifacts\/(\d+)\/raw$/);
  if (req.method === "GET" && rawMatch) {
    const entryPath = url.searchParams.get("path");
    if (!entryPath) throw new HttpError(400, "File path is required.");
    try {
      return sendJson(res, 200, await buildRawView(rawMatch[1], entryPath));
    } catch (error) {
      if (error instanceof HttpError || error instanceof LimitError) throw error;
      const status = /not found|not cached/i.test(error?.message ?? "") ? 404 : 502;
      throw new HttpError(status, error?.message || "Could not read the original bytes.", {
        code: "raw_unavailable",
        cause: error,
      });
    }
  }

  if (req.method === "POST" && path === "/api/browser/owned") {
    const body = await readJsonBody(req);
    let origin = null;
    try {
      origin = new URL(String(body.url ?? "")).origin;
    } catch {
      origin = null;
    }
    const owned = origin ? describeOwnedPreview(origin) : null;
    return sendJson(res, 200, { owned: Boolean(owned), artifactId: owned?.artifactId ?? null });
  }

  if (req.method === "POST" && path === "/api/browser/open-external") {
    const body = await readJsonBody(req);
    try {
      let target = validateExternalUrl(body.url);
      target = (await themedOwnedUrl(target, body.theme)) ?? target;
      await openInDefaultBrowser(target);
      return sendJson(res, 200, { opened: true, url: target });
    } catch (error) {
      if (error instanceof ExternalOpenError) {
        throw new HttpError(error.code === "launch_failed" ? 502 : 400, error.message, { code: error.code });
      }
      throw error;
    }
  }

  const previewMatch = path.match(/^\/api\/artifacts\/(\d+)\/preview-url$/);
  if (req.method === "GET" && previewMatch) {
    const entryPath = url.searchParams.get("path");
    if (!entryPath) throw new HttpError(400, "File path is required.");
    if (kindForPath(entryPath) !== "html") {
      throw new HttpError(415, "Only HTML files can use the site preview.");
    }
    const metadata = await getCachedArtifact(previewMatch[1], { touch: false });
    if (!metadata) throw new HttpError(404, "Artifact is not cached. Inspect it first.");
    if (!hasRootIndexHtml(metadata.analysis?.entries ?? [])) {
      throw new HttpError(
        415,
        "HTML previews require index.html at the artifact root.",
      );
    }
    const theme = url.searchParams.get("theme");
    if (theme !== "light" && theme !== "dark") {
      throw new HttpError(400, "Preview theme must be light or dark.");
    }
    return sendJson(res, 200, {
      url: await startStaticPreview(previewMatch[1], entryPath, {
        theme,
        parentOrigin: new URL(entry.url).origin,
      }),
    });
  }

  if (req.method === "GET" && path === "/api/cache") {
    return sendJson(res, 200, await getCacheSummary());
  }

  const cacheMatch = path.match(/^\/api\/cache\/(\d+)$/);
  if (req.method === "DELETE" && cacheMatch) {
    const cancelJobs = url.searchParams.get("cancelJobs") === "1";
    if (!cancelJobs) assertNoActiveJobs(cacheMatch[1]);
    await stopStaticPreviewsForArtifact(cacheMatch[1]);
    const result = await deleteCachedArtifact(cacheMatch[1], { cancelJobs });
    broadcast(entry, "cache", await getCacheSummary());
    return sendJson(res, 200, result);
  }

  if (req.method === "DELETE" && path === "/api/cache") {
    const cancelJobs = url.searchParams.get("cancelJobs") === "1";
    if (!cancelJobs) assertNoActiveJobs();
    await stopAllStaticPreviews();
    const result = await clearArtifactCache({ cancelJobs });
    broadcast(entry, "cache", await getCacheSummary());
    return sendJson(res, 200, result);
  }

  if (req.method === "GET" && path === "/events") {
    res.writeHead(200, {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    });
    res.write(": connected\n\n");
    res.write(
      `event: snapshot\ndata: ${JSON.stringify({
        jobs: jobRegistry.list(),
        limits: limitPolicy.snapshot(),
        warnings: [limitPolicy.loadWarning, jobRegistry.loadWarning].filter(Boolean),
        persistError: limitPolicy.persistError ?? jobRegistry.persistError,
      })}\n\n`,
    );
    entry.sseClients.add(res);
    req.on("close", () => entry.sseClients.delete(res));
    return;
  }

  throw new HttpError(404, "API route not found.");
}

async function handleRequest(req, res, entry) {
  const url = new URL(req.url, "http://127.0.0.1");
  try {
    if (!isCanonicalHost(req, entry.host)) {
      throw new HttpError(403, "Request host is not allowed.");
    }
    const protectedRoute = requiresCapabilityToken(url.pathname);
    if (protectedRoute && isCrossSiteRequest(req, entry.origin)) {
      throw new HttpError(403, "Cross-site requests are not allowed.");
    }
    if (protectedRoute && !hasCapabilityToken(req, url, entry.token)) {
      throw new HttpError(403, "Missing or invalid capability token.");
    }

    const documentRoute =
      req.method === "GET" &&
      (url.pathname === "/" || url.pathname === "/index.html");
    if (documentRoute && url.searchParams.get("token") !== entry.token) {
      throw new HttpError(403, "Missing or invalid capability token.");
    }
    if (documentRoute) {
      return sendText(res, 200, renderHtml(entry.token), "text/html; charset=utf-8", {
        "Content-Security-Policy": MAIN_CSP,
        "Referrer-Policy": "no-referrer",
      });
    }

    const assetTypes = new Map([
      ["/assets/primer-color-modes.css", ["primer-color-modes.css", "text/css; charset=utf-8"]],
      ["/assets/primer-core.css", ["primer-core.css", "text/css; charset=utf-8"]],
      ["/assets/primer-product.css", ["primer-product.css", "text/css; charset=utf-8"]],
      ["/assets/asciinema-player.css", ["asciinema-player.css", "text/css; charset=utf-8"]],
      ["/assets/asciinema-player.min.js", ["asciinema-player.min.js", "text/javascript; charset=utf-8"]],
      ["/assets/asciinema-player-worker.min.js", ["asciinema-player-worker.min.js", "text/javascript; charset=utf-8"]],
      ["/assets/app.css", ["app.css", "text/css; charset=utf-8"]],
      ["/assets/trx-preview.js", ["trx-preview.js", "text/javascript; charset=utf-8"]],
      ["/assets/junit-preview.js", ["junit-preview.js", "text/javascript; charset=utf-8"]],
      ["/assets/markdown-preview.js", ["markdown-preview.js", "text/javascript; charset=utf-8"]],
      ["/assets/app.js", ["app.js", "text/javascript; charset=utf-8"]],
      ["/assets/browser.js", ["browser.js", "text/javascript; charset=utf-8"]],
    ]);
    if (req.method === "GET" && assetTypes.has(url.pathname)) {
      const [name, type] = assetTypes.get(url.pathname);
      return await sendFile(res, join(ASSET_ROOT, name), type);
    }
    const iconMatch = url.pathname.match(/^\/assets\/octicons\/([a-z-]+)\.svg$/);
    if (req.method === "GET" && iconMatch) {
      return await sendFile(
        res,
        join(ASSET_ROOT, "octicons", `${iconMatch[1]}.svg`),
        "image/svg+xml",
      );
    }

    const docsMatch = url.pathname.match(/^\/assets\/docs\/([a-z0-9][a-z0-9-]{0,63})\.(png|webp|jpg|svg)$/);
    if (req.method === "GET" && docsMatch) {
      const types = { png: "image/png", webp: "image/webp", jpg: "image/jpeg", svg: "image/svg+xml" };
      try {
        return await sendFile(res, join(ASSET_ROOT, "docs", `${docsMatch[1]}.${docsMatch[2]}`), types[docsMatch[2]]);
      } catch (error) {
        if (error?.code === "ENOENT") throw new HttpError(404, "Asset not found.");
        throw error;
      }
    }

    if (await handleContentRequest(req, res, url.pathname, url.searchParams)) return;
    if (url.pathname.startsWith("/api/") || url.pathname === "/events") {
      return await handleApi(req, res, entry, url);
    }
    throw new HttpError(404, "Route not found.");
  } catch (error) {
    entry.log?.(`${req.method} ${url.pathname}: ${error instanceof Error ? error.message : String(error)}`);
    if (res.headersSent) {
      res.end();
      return;
    }
    const status =
      error instanceof HttpError
        ? error.status
        : error instanceof GitHubApiError
          ? error.status
          : 500;
    sendJson(res, status, {
      ...(error instanceof HttpError ? error.extra : {}),
      error: error instanceof Error ? error.message : String(error),
      status,
    });
  }
}

export async function startInstance(instanceId, initialInput, log, reuse = null) {
  await Promise.all([limitPolicy.load(), jobRegistry.load()]).catch((error) => log?.(`Limits or job history could not be loaded: ${error.message}`));
  ensureJobBroadcast();
  let entry = servers.get(instanceId);
  if (entry) {
    entry.initialInput = initialInput ?? entry.initialInput;
    return entry;
  }

  entry = {
    browserState: reuse?.browserState ?? null,
    controlled: reuse?.controlled ?? null,
    host: null,
    initialInput: initialInput ?? null,
    log,
    origin: null,
    server: null,
    sseClients: new Set(),
    token: reuse?.token ?? createCapabilityToken(),
    url: null,
  };
  const server = createServer((req, res) => {
    void handleRequest(req, res, entry);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(reuse?.port ?? 0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise((resolve) => server.close(resolve));
    throw new Error("Canvas server did not receive a TCP port.");
  }
  entry.server = server;
  entry.host = `127.0.0.1:${address.port}`;
  entry.origin = `http://${entry.host}`;
  entry.url = `${entry.origin}/?token=${encodeURIComponent(entry.token)}`;
  servers.set(instanceId, entry);
  return entry;
}

export async function stopInstance(instanceId, { keepControlled = false } = {}) {
  const entry = servers.get(instanceId);
  if (!entry) return;
  servers.delete(instanceId);
  for (const response of entry.sseClients) response.end();
  if (!keepControlled) await entry.controlled?.close();
  if (entry.url) {
    await stopStaticPreviewsForOrigin(new URL(entry.url).origin);
  }
  await new Promise((resolve) => entry.server.close(resolve));
}

export function navigateInstance(instanceId, route) {
  const entry = servers.get(instanceId);
  if (!entry) return false;
  broadcast(entry, "navigate", { route });
  return true;
}

export function sendBrowserCommand(instanceId, command) {
  const entry = servers.get(instanceId);
  if (!entry) return false;
  broadcast(entry, "browser-command", command);
  return true;
}

export function getControlledBrowser(instanceId) {
  const entry = servers.get(instanceId);
  if (!entry) return null;
  entry.controlled ??= new ControlledBrowser();
  return entry.controlled;
}

export function getBrowserState(instanceId) {
  return servers.get(instanceId)?.browserState ?? null;
}

// Full server restart that keeps the same port and capability token so the open
// panel reconnects in place. Jobs live at module level and are never touched.
export async function restartInstance(instanceId, log) {
  const entry = servers.get(instanceId);
  if (!entry) return null;
  const reuse = {
    port: Number(entry.host.split(":").pop()),
    token: entry.token,
    browserState: entry.browserState,
    controlled: entry.controlled,
  };
  const initialInput = entry.initialInput;
  await stopInstance(instanceId, { keepControlled: true });
  let lastError;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const next = await startInstance(instanceId, initialInput, log, reuse);
      return { entry: next, samePort: true };
    } catch (error) {
      lastError = error;
      if (error?.code !== "EADDRINUSE") throw error;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  log?.(`Could not rebind the previous port (${lastError?.code}); using a new port.`);
  const next = await startInstance(instanceId, initialInput, log, {
    token: reuse.token,
    browserState: reuse.browserState,
    controlled: reuse.controlled,
  });
  return { entry: next, samePort: false };
}

export async function broadcastCache({ refresh = false } = {}) {
  const summary = await getCacheSummary();
  for (const entry of servers.values()) {
    broadcast(entry, "cache", summary);
    if (refresh) broadcast(entry, "refresh", { reason: "cache" });
  }
}

export async function closeAllPreviews() {
  await stopAllStaticPreviews();
}
