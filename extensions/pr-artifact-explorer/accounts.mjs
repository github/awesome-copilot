import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GITHUB_API, USER_AGENT } from "./constants.mjs";

const execFileAsync = promisify(execFile);
const CACHE_TTL_MS = 5 * 60 * 1000;
const RESOLUTION_CACHE_LIMIT = 20;
const SOURCE_PRIORITY = Object.freeze({ copilot: 30, gh: 20, env: 10 });
const SOURCE_LABEL = Object.freeze({
  copilot: "Copilot app",
  gh: "GitHub CLI",
  env: "Environment",
});

const cachedResolutions = new Map();

function cleanGhEnvironment() {
  const env = { ...process.env };
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;
  return env;
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}

function decodeCopilotLabel(variableName) {
  let encoded = variableName.replace(/^COPILOT_GH_ACCOUNT_/, "");
  encoded = encoded.replace(/_([0-9A-Fa-f]{2})_/g, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16)));
  return encoded.replace(/^github\.com_/, "") || null;
}

async function listGhAccounts() {
  let output = "";
  try {
    const result = await execFileAsync("gh", ["auth", "status"], {
      timeout: 8_000,
      env: cleanGhEnvironment(),
      windowsHide: true,
    });
    output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    output = `${error?.stdout ?? ""}\n${error?.stderr ?? ""}`;
    if (!output.trim()) return [];
  }

  const accounts = [];
  const seen = new Set();
  const pattern = /Logged in to (\S+) account (\S+)/g;
  let match;
  while ((match = pattern.exec(output)) !== null) {
    const key = `${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      accounts.push({ host: match[1], login: match[2] });
    }
  }
  return accounts;
}

async function readGhToken(host, login) {
  try {
    const { stdout } = await execFileAsync(
      "gh",
      ["auth", "token", "--hostname", host, "--user", login],
      {
        timeout: 8_000,
        env: cleanGhEnvironment(),
        windowsHide: true,
      },
    );
    return stdout.trim() || null;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    return null;
  }
}

async function detectCandidates() {
  const candidates = [];
  const seenTokens = new Set();
  const add = (source, token, hintedLogin) => {
    if (!token) return;
    const hash = tokenHash(token);
    if (seenTokens.has(hash)) return;
    seenTokens.add(hash);
    candidates.push({ source, token, hash, hintedLogin: hintedLogin ?? null });
  };

  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith("COPILOT_GH_ACCOUNT_") && value) {
      add("copilot", value, decodeCopilotLabel(name));
    }
  }
  add("env", process.env.GH_TOKEN, null);
  add("env", process.env.GITHUB_TOKEN, null);

  for (const account of await listGhAccounts()) {
    add("gh", await readGhToken(account.host, account.login), account.login);
  }
  return candidates;
}

async function apiProbe(token, path) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function probeCandidate(candidate, repository) {
  const safe = {
    source: candidate.source,
    hash: candidate.hash,
    hintedLogin: candidate.hintedLogin,
  };

  try {
    const viewer = await apiProbe(candidate.token, "/user");
    if (!viewer.response.ok || !viewer.payload?.login) {
      return {
        ...safe,
        token: candidate.token,
        login: candidate.hintedLogin ?? "unknown",
        avatarUrl: null,
        status: "failed",
        repositoryAccess: false,
        reason: viewer.payload?.message ?? `Authentication failed (${viewer.response.status}).`,
        scopes: [],
      };
    }

    let repositoryAccess = null;
    let repositoryReason = null;
    if (repository) {
      const access = await apiProbe(
        candidate.token,
        `/repos/${repository.split("/").map(encodeURIComponent).join("/")}`,
      );
      repositoryAccess = access.response.ok;
      if (!repositoryAccess) {
        repositoryReason = access.payload?.message ?? `Repository check failed (${access.response.status}).`;
      }
    }

    const scopesHeader = viewer.response.headers.get("x-oauth-scopes") ?? "";
    return {
      ...safe,
      token: candidate.token,
      login: viewer.payload.login,
      avatarUrl: viewer.payload.avatar_url ?? null,
      name: viewer.payload.name ?? null,
      profileUrl: viewer.payload.html_url ?? null,
      type: viewer.payload.type ?? null,
      company: viewer.payload.company ?? null,
      status: repositoryAccess === false ? "limited" : "ok",
      repositoryAccess,
      reason: repositoryReason,
      scopes: scopesHeader.split(",").map((scope) => scope.trim()).filter(Boolean),
    };
  } catch (error) {
    return {
      ...safe,
      token: candidate.token,
      login: candidate.hintedLogin ?? "unknown",
      avatarUrl: null,
      name: null,
      profileUrl: null,
      type: null,
      company: null,
      status: "failed",
      repositoryAccess: false,
      reason: error instanceof Error ? error.message : String(error),
      scopes: [],
    };
  }
}

function accountId(login) {
  return `acct:${String(login).toLowerCase()}`;
}

function candidateScore(candidate) {
  let score = SOURCE_PRIORITY[candidate.source] ?? 0;
  if (candidate.status === "ok") score += 1_000;
  if (candidate.repositoryAccess === true) score += 10_000;
  if (candidate.status === "failed") score -= 100_000;
  return score;
}

function publicAccount(account) {
  const { token, ...safe } = account;
  return safe;
}

export function invalidateAccounts() {
  cachedResolutions.clear();
}

async function resolveAccountsUncached(preferredId, repository) {
  const probes = await Promise.all(
    (await detectCandidates()).map((candidate) => probeCandidate(candidate, repository)),
  );
  const groups = new Map();
  for (const probe of probes) {
    const keyForLogin = String(probe.login).toLowerCase();
    if (!groups.has(keyForLogin)) groups.set(keyForLogin, []);
    groups.get(keyForLogin).push(probe);
  }

  const accounts = [];
  for (const [loginKey, candidates] of groups) {
    candidates.sort((left, right) => candidateScore(right) - candidateScore(left));
    const best = candidates[0];
    accounts.push({
      id: accountId(loginKey),
      login: best.login,
      avatarUrl: best.avatarUrl ?? candidates.find((item) => item.avatarUrl)?.avatarUrl ?? null,
      name: best.name ?? candidates.find((item) => item.name)?.name ?? null,
      profileUrl:
        best.profileUrl ?? candidates.find((item) => item.profileUrl)?.profileUrl ?? null,
      type: best.type ?? candidates.find((item) => item.type)?.type ?? null,
      company: best.company ?? candidates.find((item) => item.company)?.company ?? null,
      status: best.status,
      repositoryAccess: best.repositoryAccess,
      reason: best.reason ?? null,
      scopes: best.scopes,
      sourceKinds: [...new Set(candidates.map((item) => item.source))],
      sources: candidates.map((item, index) => ({
        label: SOURCE_LABEL[item.source] ?? item.source,
        source: item.source,
        hash: item.hash,
        status: item.status,
        repositoryAccess: item.repositoryAccess,
        reason: item.reason ?? null,
        scopes: item.scopes,
        chosen: index === 0,
      })),
      token: best.token,
    });
  }
  accounts.sort((left, right) => {
    const leftAccess = left.repositoryAccess === true ? 1 : 0;
    const rightAccess = right.repositoryAccess === true ? 1 : 0;
    if (leftAccess !== rightAccess) return rightAccess - leftAccess;
    if (left.status !== right.status) return left.status === "ok" ? -1 : 1;
    return left.login.localeCompare(right.login);
  });

  let active = preferredId
    ? accounts.find((account) => account.id === preferredId && account.status !== "failed")
    : null;
  active ??= accounts.find((account) => account.repositoryAccess === true);
  active ??= accounts.find((account) => account.status === "ok");
  active ??= null;

  const value = {
    active: active ? publicAccount(active) : null,
    activeToken: active?.token ?? null,
    accounts: accounts.map(publicAccount),
  };
  return value;
}

export async function resolveAccounts({
  preferredId = null,
  repository = null,
  force = false,
} = {}) {
  const key = `${preferredId ?? ""}|${repository ?? ""}`;
  let entry = cachedResolutions.get(key);
  if (!force && entry?.value && Date.now() - entry.at < CACHE_TTL_MS) {
    cachedResolutions.delete(key);
    cachedResolutions.set(key, entry);
    return entry.value;
  }
  if (entry?.promise && (!force || entry.forceRefresh)) return entry.promise;

  entry ??= {
    at: 0,
    forceRefresh: false,
    promise: null,
    value: null,
  };
  const promise = resolveAccountsUncached(preferredId, repository).then(
    (value) => {
      if (cachedResolutions.get(key) === entry && entry.promise === promise) {
        entry.at = Date.now();
        entry.forceRefresh = false;
        entry.promise = null;
        entry.value = value;
        cachedResolutions.delete(key);
        cachedResolutions.set(key, entry);
      }
      return value;
    },
    (error) => {
      if (cachedResolutions.get(key) === entry && entry.promise === promise) {
        entry.forceRefresh = false;
        entry.promise = null;
        if (!entry.value || Date.now() - entry.at >= CACHE_TTL_MS) {
          cachedResolutions.delete(key);
        }
      }
      throw error;
    },
  );
  entry.forceRefresh = force;
  entry.promise = promise;
  cachedResolutions.set(key, entry);
  while (cachedResolutions.size > RESOLUTION_CACHE_LIMIT) {
    const candidate = [...cachedResolutions].find(([, value]) => !value.promise);
    if (!candidate) break;
    cachedResolutions.delete(candidate[0]);
  }
  return promise;
}
