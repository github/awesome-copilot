import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, posix } from "node:path";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { resolveAccounts, invalidateAccounts } from "./accounts.mjs";
import {
  clearArtifactCache,
  deleteCachedArtifact,
  getCacheSummary,
  getCachedArtifact,
  getCachedEntry,
  inspectArtifact,
  readCachedEntry,
} from "./cache.mjs";
import {
  ASSET_ROOT,
  MAX_INLINE_PREVIEW_BYTES,
  MAX_STREAMED_ENTRY_BYTES,
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
  getRepository,
  GitHubApiError,
  listRepositoryContributors,
  listPullRequestArtifacts,
  searchPullRequestBase,
  searchPullRequests,
  suggestRepositories,
} from "./github.mjs";
import {
  startStaticPreview,
  stopAllStaticPreviews,
  stopStaticPreviewsForArtifact,
  stopStaticPreviewsForOrigin,
} from "./preview.mjs";
import { ExpiringPromiseCache } from "./memory-cache.mjs";
import { HTML } from "./render.mjs";
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
import { streamZipEntry } from "./zip.mjs";

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
  "frame-src http://127.0.0.1:*",
  "img-src 'self' data: https://avatars.githubusercontent.com https://github.com",
  "object-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
].join("; ");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
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

async function handleContentRequest(req, res, pathname, searchParams) {
  const match = pathname.match(/^\/content\/(\d+)\/(.+)$/);
  if (!match) return false;
  if (!["GET", "HEAD"].includes(req.method)) {
    throw new HttpError(405, "Only GET and HEAD are supported.");
  }
  const artifactId = match[1];
  const entryPath = decodeEntryPath(match[2]);
  const context = await getCachedEntry(artifactId, entryPath);
  if (!context.entry.supported) throw new HttpError(415, "This ZIP entry cannot be served.");
  if (context.entry.uncompressedSize > MAX_STREAMED_ENTRY_BYTES) {
    throw new HttpError(
      413,
      "This file exceeds the 512 MiB streaming safety limit.",
    );
  }

  const download = searchParams.get("download") === "1";
  const headers = {
    "Cache-Control": "no-store",
    "Content-Length": String(context.entry.uncompressedSize),
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
  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
  } else {
    await streamZipEntry(context.archivePath, context.entry, res);
  }
  return true;
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

  if (req.method === "POST" && path === "/api/artifacts/inspect") {
    const body = await readJsonBody(req);
    const repository = normalizeRepository(body.repository);
    const { auth } = await resolveAuth(repository);
    const metadata = await inspectArtifact(
      auth.activeToken,
      repository,
      body.artifactId,
      {
        onProgress: (progress) =>
          broadcast(entry, "artifact-progress", { repository, ...progress }),
      },
    );
    broadcast(entry, "cache", await getCacheSummary());
    return sendJson(res, 200, metadata);
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
    await stopStaticPreviewsForArtifact(cacheMatch[1]);
    const result = await deleteCachedArtifact(cacheMatch[1]);
    broadcast(entry, "cache", await getCacheSummary());
    return sendJson(res, 200, result);
  }

  if (req.method === "DELETE" && path === "/api/cache") {
    await stopAllStaticPreviews();
    const result = await clearArtifactCache();
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
    entry.sseClients.add(res);
    req.on("close", () => entry.sseClients.delete(res));
    return;
  }

  throw new HttpError(404, "API route not found.");
}

async function handleRequest(req, res, entry) {
  const url = new URL(req.url, "http://127.0.0.1");
  try {
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return sendText(res, 200, HTML, "text/html; charset=utf-8", {
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
      ["/assets/app.js", ["app.js", "text/javascript; charset=utf-8"]],
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
      error: error instanceof Error ? error.message : String(error),
      status,
    });
  }
}

export async function startInstance(instanceId, initialInput, log) {
  let entry = servers.get(instanceId);
  if (entry) {
    entry.initialInput = initialInput ?? entry.initialInput;
    return entry;
  }

  entry = {
    initialInput: initialInput ?? null,
    log,
    server: null,
    sseClients: new Set(),
    url: null,
  };
  const server = createServer((req, res) => {
    void handleRequest(req, res, entry);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise((resolve) => server.close(resolve));
    throw new Error("Canvas server did not receive a TCP port.");
  }
  entry.server = server;
  entry.url = `http://127.0.0.1:${address.port}/`;
  servers.set(instanceId, entry);
  return entry;
}

export async function stopInstance(instanceId) {
  const entry = servers.get(instanceId);
  if (!entry) return;
  servers.delete(instanceId);
  for (const response of entry.sseClients) response.end();
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
