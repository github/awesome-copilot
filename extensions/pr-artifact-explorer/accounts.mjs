import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify, stripVTControlCharacters } from "node:util";
import { homedir, userInfo } from "node:os";
import { isAbsolute, join, normalize } from "node:path";
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

function windowsEnvironmentValue(env, key) {
  return Object.entries(env).find(([name, value]) => name.toUpperCase() === key && value)?.[1];
}

function setWindowsEnvironmentValue(env, key, value) {
  for (const name of Object.keys(env)) {
    if (name.toUpperCase() === key) delete env[name];
  }
  env[key] = value;
}

function normalizeWindowsEnvironmentValue(env, key) {
  const names = Object.keys(env).filter((name) => name.toUpperCase() === key);
  const values = [...new Set(names.map((name) => env[name]).filter(Boolean))];
  if (values.length > 1) return false;
  if (names.length > 1) {
    for (const name of names) delete env[name];
    if (values.length) env[key] = values[0];
  }
  return true;
}

function safeHome() {
  for (const lookup of [homedir, () => userInfo().homedir]) {
    try {
      const home = lookup();
      if (home && isAbsolute(home)) return home;
    } catch {
      // The OS account lookup can still work when the environment-based lookup fails.
    }
  }
  return null;
}

async function cleanGhEnvironment() {
  const env = { ...process.env };
  const windows = process.platform === "win32";
  for (const name of Object.keys(env)) {
    const key = windows ? name.toUpperCase() : name;
    if (key === "GH_TOKEN" || key === "GITHUB_TOKEN" || key.startsWith("COPILOT_GH_ACCOUNT_")) {
      delete env[name];
    }
  }

  if (!windows) {
    if (!env.HOME) {
      const home = safeHome();
      if (home) env.HOME = home;
      else if (!env.GH_CONFIG_DIR && !env.XDG_CONFIG_HOME) {
        return {
          env: null,
          diagnostic: "GitHub CLI was not run because no absolute home directory was available. Set HOME or GH_CONFIG_DIR.",
        };
      }
    }
    return { env, diagnostic: null };
  }

  const configKey = ["GH_CONFIG_DIR", "XDG_CONFIG_HOME", "APPDATA"].find((key) =>
    windowsEnvironmentValue(env, key));
  if (configKey) {
    if (!normalizeWindowsEnvironmentValue(env, configKey)) {
      return {
        env: null,
        diagnostic: `GitHub CLI was not run because conflicting ${configKey} settings were provided.`,
      };
    }
    return { env, diagnostic: null };
  }

  if (!normalizeWindowsEnvironmentValue(env, "USERPROFILE")) {
    return {
      env: null,
      diagnostic: "GitHub CLI was not run because conflicting USERPROFILE settings were provided.",
    };
  }
  const configuredHome = windowsEnvironmentValue(env, "USERPROFILE");
  const home = configuredHome || safeHome();
  if (!home || !isAbsolute(home)) {
    return {
      env: null,
      diagnostic: "GitHub CLI was not run because the Windows user profile could not be determined. Set APPDATA or GH_CONFIG_DIR.",
    };
  }
  if (!configuredHome) setWindowsEnvironmentValue(env, "USERPROFILE", home);

  // Prefer gh's native home configuration; the roaming store is consulted only
  // if the home store yields no usable github.com account.
  try {
    await stat(join(home, ".config", "gh"));
    return { env, diagnostic: null, fallback: () => windowsRoamingEnvironment({ ...env }, home) };
  } catch (error) {
    if (error?.code !== "ENOENT") return { env, diagnostic: null };
  }
  return windowsRoamingEnvironment(env, home);
}

async function windowsRoamingEnvironment(env, home) {
  try {
    const systemRoot = windowsEnvironmentValue(env, "SYSTEMROOT");
    const powershell = systemRoot && isAbsolute(systemRoot)
      ? join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
      : "powershell.exe";
    const { stdout } = await execFileAsync(
      powershell,
      [
        "-NoLogo", "-NoProfile", "-NonInteractive", "-Command",
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; " +
          "@{appData=[Environment]::GetFolderPath([Environment+SpecialFolder]::ApplicationData); " +
          "profile=[Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)} | ConvertTo-Json -Compress",
      ],
      { timeout: 5_000, env, windowsHide: true },
    );
    const folders = JSON.parse(String(stdout ?? "").replace(/^\uFEFF/, "").trim());
    const appData = folders?.appData;
    const profile = folders?.profile;
    if (typeof appData === "string" && isAbsolute(appData) &&
      typeof profile === "string" && isAbsolute(profile)) {
      const pathKey = (path) => normalize(path).replace(/[\\/]+$/, "").toLowerCase();
      if (pathKey(home) !== pathKey(profile)) return { env, diagnostic: null };
      setWindowsEnvironmentValue(env, "APPDATA", appData);
      return { env, diagnostic: null };
    }
  } catch {
    // An unavailable known-folder lookup must not silently select a different account store.
  }
  return {
    env: null,
    diagnostic: "The Windows roaming folder could not be determined. Set APPDATA or GH_CONFIG_DIR to the GitHub CLI configuration location.",
  };
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}

function decodeCopilotLabel(variableName) {
  let encoded = variableName.replace(/^COPILOT_GH_ACCOUNT_/, "");
  encoded = encoded.replace(/_([0-9A-Fa-f]{2})_/g, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16)));
  return /^github\.com_(.+)$/i.exec(encoded)?.[1] ?? null;
}

function ghFailure(error, action) {
  if (error?.code === "ENOENT") return "GitHub CLI was not found on PATH.";
  if (error?.killed || error?.signal === "SIGTERM") {
    return "GitHub CLI timed out while checking saved accounts.";
  }
  if (action === "token") {
    return "GitHub CLI could not retrieve a saved credential. Check gh auth status --hostname github.com and your credential store.";
  }
  return "GitHub CLI could not find or read saved GitHub.com accounts. Check gh auth status --hostname github.com and its configuration.";
}

async function listGhAccounts(env) {
  let output = "";
  let diagnostic = null;
  try {
    const result = await execFileAsync("gh", ["auth", "status", "--hostname", "github.com"], {
      timeout: 8_000,
      env,
      windowsHide: true,
    });
    output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  } catch (error) {
    diagnostic = ghFailure(error, "status");
    output = `${error?.stdout ?? ""}\n${error?.stderr ?? ""}`;
  }

  const accounts = [];
  const seen = new Set();
  const pattern = /Logged in to (\S+) account (\S+)/g;
  let match;
  output = stripVTControlCharacters(output);
  while ((match = pattern.exec(output)) !== null) {
    const key = `${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      accounts.push({ host: match[1], login: match[2] });
    }
  }
  return { accounts, diagnostic };
}

async function readGhToken(host, login, env) {
  try {
    const { stdout } = await execFileAsync(
      "gh",
      ["auth", "token", "--hostname", host, "--user", login],
      {
        timeout: 8_000,
        env,
        windowsHide: true,
      },
    );
    const token = stdout.trim();
    return {
      token: token || null,
      diagnostic: token ? null : ghFailure(null, "token"),
    };
  } catch (error) {
    return { token: null, diagnostic: ghFailure(error, "token") };
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
      const login = decodeCopilotLabel(name);
      if (login) add("copilot", value, login);
    }
  }
  // gh also applies these tokens to *.ghe.com; an explicit non-github.com GH_HOST
  // signals they may belong to another host, so never send them to api.github.com.
  const ghHost = String(process.env.GH_HOST ?? "").trim().replace(/\.$/, "").toLowerCase();
  const ambientTokensAllowed = !ghHost || ghHost === "github.com";
  let hostDiagnostic = null;
  if (ambientTokensAllowed) {
    add("env", process.env.GH_TOKEN, null);
    add("env", process.env.GITHUB_TOKEN, null);
  } else if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) {
    hostDiagnostic = "GH_TOKEN and GITHUB_TOKEN were not used because GH_HOST targets a host other than github.com.";
  }

  const withHostDiagnostic = (message) =>
    [message, hostDiagnostic].filter(Boolean).join(" ") || null;
  const readStore = async (env) => {
    const cli = await listGhAccounts(env);
    let diagnostic = cli.diagnostic;
    for (const account of cli.accounts) {
      if (account.host.toLowerCase() !== "github.com") continue;
      const result = await readGhToken(account.host, account.login, env);
      add("gh", result.token, account.login);
      if (result.diagnostic) diagnostic = result.diagnostic;
    }
    return diagnostic;
  };

  const store = await cleanGhEnvironment();
  if (!store.env) return { candidates, diagnostic: withHostDiagnostic(store.diagnostic) };
  const diagnostic = await readStore(store.env);
  const cliUnavailable = [ghFailure({ code: "ENOENT" }), ghFailure({ killed: true })].includes(diagnostic);
  // The caller decides after probing, because a revoked token is still retrievable.
  const readFallbackStore = store.fallback && !cliUnavailable
    ? async () => {
      const roaming = await store.fallback();
      // Only retry when the known folder matched this profile and set a distinct store.
      if (!roaming.env || !windowsEnvironmentValue(roaming.env, "APPDATA")) return null;
      const before = candidates.length;
      const secondaryDiagnostic = await readStore(roaming.env);
      return {
        candidates: candidates.slice(before),
        diagnostic: withHostDiagnostic(secondaryDiagnostic),
      };
    }
    : null;
  return { candidates, diagnostic: withHostDiagnostic(diagnostic), readFallbackStore };
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
        reason: typeof viewer.payload?.message === "string"
          ? viewer.payload.message.replaceAll(candidate.token, "[redacted]")
          : `Authentication failed (${viewer.response.status}).`,
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
        repositoryReason = typeof access.payload?.message === "string"
          ? access.payload.message.replaceAll(candidate.token, "[redacted]")
          : `Repository check failed (${access.response.status}).`;
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
      reason: error?.name === "TimeoutError" || error?.name === "AbortError"
        ? "GitHub account validation timed out."
        : "GitHub account validation failed. Check your connection.",
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
  const detection = await detectCandidates();
  const probes = await Promise.all(
    detection.candidates.map((candidate) => probeCandidate(candidate, repository)),
  );
  let detectionDiagnostic = detection.diagnostic;
  const storeAuthenticated = probes.some((probe) =>
    probe.source === "gh" && probe.status !== "failed");
  if (detection.readFallbackStore && !storeAuthenticated) {
    const fallback = await detection.readFallbackStore();
    if (fallback) {
      const fallbackProbes = await Promise.all(
        fallback.candidates.map((candidate) => probeCandidate(candidate, repository)),
      );
      probes.push(...fallbackProbes);
      if (fallbackProbes.some((probe) => probe.status !== "failed")) {
        detectionDiagnostic = fallback.diagnostic;
      }
    }
  }
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
    diagnostic: active ? null : [
      "No usable GitHub.com account was detected.",
      detectionDiagnostic,
      "For standalone use, sign in with gh auth login --hostname github.com or open the canvas from a session.",
    ].filter(Boolean).join(" "),
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
