import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import os, { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const sharedHome = mkdtempSync(join(tmpdir(), "pae-accounts-test-"));
const originalCopilotHome = process.env.COPILOT_HOME;
process.env.COPILOT_HOME = sharedHome;

let scenario;
const originalExecFile = childProcess.execFile;
childProcess.execFile = (command, args, options, callback) => {
  assert.equal(options.windowsHide, true);
  if (command === "powershell.exe") {
    scenario.folderCalls.push({ args, env: options.env });
    if (scenario.folderError) return callback(scenario.folderError);
    return callback(null, {
      stdout: JSON.stringify({ appData: scenario.knownFolder, profile: scenario.knownProfile }),
      stderr: "",
    });
  }

  assert.equal(command, "gh");
  for (const name of Object.keys(options.env)) {
    const key = process.platform === "win32" ? name.toUpperCase() : name;
    assert.ok(!["GH_TOKEN", "GITHUB_TOKEN"].includes(key));
    assert.ok(!key.startsWith("COPILOT_GH_ACCOUNT_"));
  }
  scenario.calls.push({ args, env: options.env });
  const storeAppData = Object.entries(options.env).find(([name]) =>
    name.toUpperCase() === "APPDATA")?.[1];
  const storeToken = scenario.stores?.[storeAppData ?? "home"];
  if (args[1] === "status") {
    assert.deepEqual(args, ["auth", "status", "--hostname", "github.com"]);
    if (scenario.statusError) return callback(scenario.statusError);
    const config = Object.entries(options.env).find(([name]) =>
      name.toUpperCase() === scenario.configVariable)?.[1];
    if (scenario.stores ? !storeToken : config !== scenario.configPath) {
      return callback(Object.assign(new Error("No saved accounts"), {
        stderr: "You are not logged into any GitHub hosts.",
      }));
    }
    return callback(null, { stdout: scenario.statusOutput, stderr: "" });
  }
  assert.deepEqual(args, ["auth", "token", "--hostname", "github.com", "--user", "octocat"]);
  if (scenario.tokenError) return callback(scenario.tokenError);
  return callback(null, { stdout: `${storeToken ?? "cli-token"}\n`, stderr: "" });
};
syncBuiltinESMExports();
const { resolveAccounts, invalidateAccounts } = await import("./accounts.mjs");
childProcess.execFile = originalExecFile;
syncBuiltinESMExports();
if (originalCopilotHome === undefined) delete process.env.COPILOT_HOME;
else process.env.COPILOT_HOME = originalCopilotHome;
after(() => rmSync(sharedHome, { recursive: true, force: true }));

function setup(t, {
  platform = "win32",
  env = {},
  configVariable = "APPDATA",
  configPath,
  knownFolder,
} = {}) {
  const originalEnv = process.env;
  const platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");
  const originalFetch = globalThis.fetch;
  const home = mkdtempSync(join(tmpdir(), "pae-account-profile-"));
  process.env = { ...(platform === "win32" ? { USERPROFILE: home } : {}), ...env };
  Object.defineProperty(process, "platform", { value: platform });
  scenario = {
    calls: [],
    folderCalls: [],
    fetchCalls: [],
    home,
    configVariable,
    configPath: configPath ?? join(home, "AppData", "Roaming"),
    knownFolder: knownFolder ?? join(home, "AppData", "Roaming"),
    knownProfile: home,
    statusOutput: "Logged in to github.com account octocat (keyring)\n" +
      "Logged in to enterprise.example account enterprise-user (keyring)",
  };
  globalThis.fetch = async (url, options) => {
    const requestUrl = new URL(url);
    const token = options.headers.Authorization;
    scenario.fetchCalls.push({ url: requestUrl, token });
    assert.equal(requestUrl.origin, "https://api.github.com");
    if (scenario.fetchError) throw scenario.fetchError;
    if (requestUrl.pathname === "/user") {
      if (token === "Bearer revoked-token") {
        return Response.json({ message: "Bad credentials" }, { status: 401 });
      }
      const logins = {
        "Bearer cli-token": "octocat",
        "Bearer session-token": "session-user",
        "Bearer ambient-token": "ambient-user",
        "Bearer enterprise-token": "enterprise-user",
        "Bearer lookalike-token": "lookalike-user",
      };
      return Response.json({ login: logins[token] });
    }
    assert.equal(requestUrl.pathname, "/repos/example/repository");
    return Response.json({ full_name: "example/repository" });
  };
  invalidateAccounts();
  t.after(() => {
    process.env = originalEnv;
    Object.defineProperty(process, "platform", platformDescriptor);
    globalThis.fetch = originalFetch;
    invalidateAccounts();
    rmSync(home, { recursive: true, force: true });
  });
  return scenario;
}

test("standalone Windows discovery finds saved CLI accounts without inherited tokens or AppData", async (t) => {
  const state = setup(t);
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.active.login, "octocat");
  assert.equal(auth.activeToken, "cli-token");
  assert.deepEqual(auth.active.sourceKinds, ["gh"]);
  assert.equal(state.calls.length, 2, "enumeration and token reads use the same configuration");
  assert.equal(state.calls[0].env, state.calls[1].env);
  assert.equal(process.env.APPDATA, undefined, "the parent environment is not modified");
  assert.equal(auth.accounts.length, 1, "enterprise CLI accounts are not sent to github.com");
  assert.ok(!JSON.stringify({ active: auth.active, accounts: auth.accounts }).includes("cli-token"));
});

test("session discovery retains its preferred account and AppData while excluding ambient CLI overrides", async (t) => {
  const appData = join(homedir(), "redirected-roaming");
  const state = setup(t, {
    env: {
      AppData: appData,
      COPILOT_GH_ACCOUNT_github_2E_com_session_2D_user: "session-token",
      GH_TOKEN: "ambient-token",
      GitHub_Token: "ambient-token",
    },
    configPath: appData,
  });
  const auth = await resolveAccounts({
    preferredId: "acct:session-user",
    repository: "example/repository",
  });
  assert.equal(auth.active.login, "session-user");
  assert.equal(auth.activeToken, "session-token");
  assert.deepEqual(auth.active.sourceKinds, ["copilot"]);
  assert.equal(state.calls.length, 2);
  assert.equal(state.calls[0].env.AppData, appData);
  assert.equal(state.calls[0].env.APPDATA, undefined);
  assert.equal(state.folderCalls.length, 0);
});

test("standalone Windows discovery replaces an empty AppData without duplicate keys", async (t) => {
  const state = setup(t, { env: { AppData: "" } });
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.active.login, "octocat");
  assert.ok(state.calls.every(({ env }) =>
    Object.keys(env).filter((name) => name.toUpperCase() === "APPDATA").length === 1));
});

test("Windows discovery preserves a nonempty AppData when mixed-case duplicates exist", async (t) => {
  const appData = join(tmpdir(), "explicit-roaming");
  const state = setup(t, {
    env: { AppData: "", APPDATA: appData },
    configPath: appData,
  });
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.active.login, "octocat");
  assert.equal(state.folderCalls.length, 0);
  assert.ok(state.calls.every(({ env }) =>
    Object.keys(env).filter((name) => name.toUpperCase() === "APPDATA").length === 1));
});

test("Windows discovery does not choose between conflicting explicit configuration values", async (t) => {
  const state = setup(t, {
    env: { APPDATA: join(tmpdir(), "first-roaming"), AppData: join(tmpdir(), "second-roaming") },
  });
  const auth = await resolveAccounts();
  assert.equal(auth.active, null);
  assert.match(auth.diagnostic, /conflicting.*APPDATA/i);
  assert.equal(state.calls.length, 0);
  assert.equal(state.folderCalls.length, 0);
});

test("Windows discovery honors a higher-priority config override despite conflicting AppData values", async (t) => {
  const configPath = join(tmpdir(), "explicit-gh");
  const state = setup(t, {
    env: {
      GH_CONFIG_DIR: configPath,
      APPDATA: join(tmpdir(), "first-roaming"),
      AppData: join(tmpdir(), "second-roaming"),
    },
    configVariable: "GH_CONFIG_DIR",
    configPath,
  });
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.active.login, "octocat");
  assert.ok(state.calls.every(({ env }) => env.GH_CONFIG_DIR === configPath));
  assert.equal(state.folderCalls.length, 0);
});

test("Windows discovery uses the known roaming folder when AppData is redirected", async (t) => {
  const redirected = join(tmpdir(), "redirected-roaming");
  const state = setup(t, { knownFolder: redirected, configPath: redirected });
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.active.login, "octocat");
  assert.equal(state.folderCalls.length, 1);
  assert.ok(state.calls.every(({ env }) => env.APPDATA === redirected));
});

test("Windows discovery does not switch away from an explicitly different user profile", async (t) => {
  const state = setup(t);
  state.knownProfile = join(state.home, "different-windows-profile");
  state.configVariable = "USERPROFILE";
  state.configPath = state.home;
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.ok(auth.active, auth.diagnostic);
  assert.equal(auth.active.login, "octocat");
  assert.ok(state.calls.every(({ env }) => env.USERPROFILE === state.home && env.APPDATA === undefined));
});

test("Windows discovery does not choose between conflicting user profiles", async (t) => {
  const state = setup(t, { env: { UserProfile: join(tmpdir(), "another-profile") } });
  const auth = await resolveAccounts();
  assert.equal(auth.active, null);
  assert.match(auth.diagnostic, /conflicting.*USERPROFILE/i);
  assert.equal(state.calls.length, 0);
  assert.equal(state.folderCalls.length, 0);
});

test("Windows discovery does not guess the roaming path if the known-folder lookup fails", async (t) => {
  const state = setup(t);
  state.folderError = Object.assign(new Error("PowerShell unavailable"), { code: "ENOENT" });
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.active, null);
  assert.match(auth.diagnostic, /APPDATA|GH_CONFIG_DIR/);
  assert.equal(state.calls.length, 0);
});

test("Windows discovery preserves an existing native home configuration", async (t) => {
  const state = setup(t);
  mkdirSync(join(state.home, ".config", "gh"), { recursive: true });
  state.configVariable = "USERPROFILE";
  state.configPath = state.home;
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.active.login, "octocat");
  assert.equal(state.folderCalls.length, 0, "a working home store never consults the roaming store");
  assert.ok(state.calls.every(({ env }) => env.APPDATA === undefined));
});

test("Windows discovery falls back to the roaming store when the home store has no accounts", async (t) => {
  const state = setup(t);
  mkdirSync(join(state.home, ".config", "gh"), { recursive: true });
  const roaming = join(state.home, "AppData", "Roaming");
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.ok(auth.active, auth.diagnostic);
  assert.equal(auth.active.login, "octocat");
  assert.equal(auth.diagnostic, null, "the empty home store's failure is not reported after recovery");
  assert.equal(state.folderCalls.length, 1);
  assert.equal(state.calls[0].env.APPDATA, undefined, "the native home store is tried first");
  assert.ok(state.calls.slice(1).every(({ env }) => env.APPDATA === roaming));
  assert.equal(process.env.APPDATA, undefined);
});

test("Windows roaming fallback recovers when the home store token is revoked", async (t) => {
  const state = setup(t);
  mkdirSync(join(state.home, ".config", "gh"), { recursive: true });
  const roaming = join(state.home, "AppData", "Roaming");
  state.stores = { home: "revoked-token", [roaming]: "cli-token" };
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.ok(auth.active, auth.diagnostic);
  assert.equal(auth.active.login, "octocat");
  assert.equal(auth.activeToken, "cli-token");
  assert.equal(auth.diagnostic, null);
  assert.equal(state.folderCalls.length, 1);
  assert.deepEqual(auth.accounts.map(({ login }) => login), ["octocat"]);
});

test("Windows roaming fallback is not used when the home store account authenticates", async (t) => {
  const state = setup(t);
  mkdirSync(join(state.home, ".config", "gh"), { recursive: true });
  const roaming = join(state.home, "AppData", "Roaming");
  state.stores = { home: "cli-token", [roaming]: "revoked-token" };
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.activeToken, "cli-token");
  assert.equal(state.folderCalls.length, 0);
  assert.ok(state.fetchCalls.every(({ token }) => token !== "Bearer revoked-token"));
});

test("Windows roaming fallback never switches to a different user profile", async (t) => {
  const state = setup(t);
  mkdirSync(join(state.home, ".config", "gh"), { recursive: true });
  state.knownProfile = join(state.home, "different-windows-profile");
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.active, null);
  assert.equal(state.folderCalls.length, 1);
  assert.equal(state.calls.length, 1, "the home store is not re-read and no other store is used");
  assert.ok(auth.diagnostic);
});

test("Windows roaming fallback is skipped when the CLI is unavailable", async (t) => {
  const state = setup(t);
  mkdirSync(join(state.home, ".config", "gh"), { recursive: true });
  state.statusError = Object.assign(new Error("missing"), { code: "ENOENT" });
  const auth = await resolveAccounts();
  assert.equal(auth.active, null);
  assert.match(auth.diagnostic, /not found/);
  assert.equal(state.folderCalls.length, 0);
});

test("explicit APPDATA disables the roaming fallback", async (t) => {
  const appData = join(tmpdir(), "explicit-empty-roaming");
  const state = setup(t, { env: { APPDATA: appData }, configPath: join(tmpdir(), "elsewhere") });
  mkdirSync(join(state.home, ".config", "gh"), { recursive: true });
  const auth = await resolveAccounts();
  assert.equal(auth.active, null);
  assert.equal(state.folderCalls.length, 0);
  assert.ok(state.calls.every(({ env }) => env.APPDATA === appData));
});

for (const variable of ["GH_CONFIG_DIR", "XDG_CONFIG_HOME"]) {
  test(`standalone discovery preserves explicit ${variable}`, async (t) => {
    const configPath = join(homedir(), "custom-gh");
    const state = setup(t, {
      env: { [variable]: configPath },
      configVariable: variable,
      configPath,
    });
    const auth = await resolveAccounts({ repository: "example/repository" });
    assert.equal(auth.active.login, "octocat");
    assert.ok(state.calls.every(({ env }) => env.APPDATA === undefined));
    assert.equal(state.folderCalls.length, 0);
  });
}

for (const platform of ["linux", "darwin"]) {
  test(`${platform} discovery restores missing HOME for the CLI only`, async (t) => {
    const home = homedir();
    const state = setup(t, { platform, env: { HOME: "" }, configVariable: "HOME", configPath: home });
    const auth = await resolveAccounts({ repository: "example/repository" });
    assert.equal(auth.active.login, "octocat");
    assert.equal(process.env.HOME, "");
    assert.ok(state.calls.every(({ env }) => env.HOME === home && env.APPDATA === undefined));
  });

  test(`${platform} discovery keeps explicit HOME and configuration overrides`, async (t) => {
    const home = join(homedir(), "explicit-home");
    const configPath = join(homedir(), "explicit-gh");
    const state = setup(t, {
      platform,
      env: { HOME: home, GH_CONFIG_DIR: configPath },
      configVariable: "GH_CONFIG_DIR",
      configPath,
    });
    const auth = await resolveAccounts({ repository: "example/repository" });
    assert.equal(auth.active.login, "octocat");
    assert.ok(state.calls.every(({ env }) => env.HOME === home && env.GH_CONFIG_DIR === configPath));
  });
}

test("missing Unix HOME never falls back to a relative CLI configuration", async (t) => {
  const state = setup(t, { platform: "linux", env: {} });
  const originalHomedir = os.homedir;
  os.homedir = () => { throw new Error("home unavailable"); };
  syncBuiltinESMExports();
  t.after(() => {
    os.homedir = originalHomedir;
    syncBuiltinESMExports();
  });
  const auth = await resolveAccounts();
  assert.equal(auth.active, null);
  assert.match(auth.diagnostic, /HOME|GH_CONFIG_DIR/);
  assert.equal(state.calls.length, 0);
});

test("explicit Unix CLI configuration works even when HOME cannot be recovered", async (t) => {
  const configPath = join(tmpdir(), "explicit-gh");
  const state = setup(t, {
    platform: "linux",
    env: { GH_CONFIG_DIR: configPath },
    configVariable: "GH_CONFIG_DIR",
    configPath,
  });
  const originalHomedir = os.homedir;
  os.homedir = () => { throw new Error("home unavailable"); };
  syncBuiltinESMExports();
  t.after(() => {
    os.homedir = originalHomedir;
    syncBuiltinESMExports();
  });
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.active.login, "octocat");
  assert.ok(state.calls.every(({ env }) => env.GH_CONFIG_DIR === configPath));
});

test("Copilot credentials are never probed against a different host", async (t) => {
  const state = setup(t, {
    env: {
      AppData: join(homedir(), "existing-roaming"),
      COPILOT_GH_ACCOUNT_GitHub_2E_COM_session_2D_user: "session-token",
      COPILOT_GH_ACCOUNT_msft_2E_ghe_2E_com_enterprise: "enterprise-token",
      COPILOT_GH_ACCOUNT_github_2E_com_2E_evil_lookalike: "lookalike-token",
    },
    configPath: join(homedir(), "existing-roaming"),
  });
  const auth = await resolveAccounts({
    preferredId: "acct:session-user",
    repository: "example/repository",
  });
  assert.equal(auth.active.login, "session-user");
  assert.equal(auth.activeToken, "session-token");
  assert.deepEqual(auth.accounts.map((account) => account.login).sort(), ["octocat", "session-user"]);
  assert.ok(state.fetchCalls.some(({ token }) => token === "Bearer session-token"));
  assert.ok(state.fetchCalls.every(({ token }) =>
    token !== "Bearer enterprise-token" && token !== "Bearer lookalike-token"));
  assert.ok(!JSON.stringify({ active: auth.active, accounts: auth.accounts }).includes("session-token"));
});

test("ambient tokens are probed only when GH_HOST is unset or github.com", async (t) => {
  for (const ghHost of [undefined, "", "github.com", " GitHub.COM ", "github.com."]) {
    await t.test(`GH_HOST=${JSON.stringify(ghHost)}`, async (st) => {
      const state = setup(st, {
        platform: "linux",
        env: { HOME: homedir(), GH_TOKEN: "ambient-token", ...(ghHost === undefined ? {} : { GH_HOST: ghHost }) },
      });
      state.statusError = Object.assign(new Error("not found"), { code: "ENOENT" });
      const auth = await resolveAccounts({ repository: "example/repository" });
      assert.equal(auth.active.login, "ambient-user");
      assert.deepEqual(auth.active.sourceKinds, ["env"]);
    });
  }
});

test("ambient tokens for another GH_HOST are never sent to github.com", async (t) => {
  for (const ghHost of ["tenant.ghe.com", "ghes.example.com", "github.com.evil.example", "github.com:8443"]) {
    await t.test(`GH_HOST=${ghHost}`, async (st) => {
      const state = setup(st, {
        platform: "linux",
        env: { HOME: homedir(), GH_HOST: ghHost, GH_TOKEN: "ambient-token", GITHUB_TOKEN: "enterprise-token" },
        configVariable: "HOME",
        configPath: homedir(),
      });
      const auth = await resolveAccounts({ repository: "example/repository" });
      assert.equal(auth.active.login, "octocat", "saved github.com CLI accounts still work");
      assert.deepEqual(auth.accounts.map((account) => account.login), ["octocat"]);
      assert.ok(state.fetchCalls.every(({ token }) =>
        token !== "Bearer ambient-token" && token !== "Bearer enterprise-token"));
    });
  }
});

test("a skipped GH_HOST token explains why no account was found", async (t) => {
  const state = setup(t, {
    platform: "linux",
    env: { HOME: homedir(), GH_HOST: "tenant.ghe.com", GH_TOKEN: "ambient-token" },
  });
  state.statusError = Object.assign(new Error("No saved accounts"), {
    stderr: "You are not logged into any GitHub hosts.",
  });
  const auth = await resolveAccounts();
  assert.equal(auth.active, null);
  assert.match(auth.diagnostic, /GH_HOST/);
  assert.ok(!auth.diagnostic.includes("ambient-token"));
  assert.equal(state.fetchCalls.length, 0);
});

test("colored partial CLI status output still discovers valid accounts", async (t) => {
  const state = setup(t, { platform: "linux", env: { HOME: homedir() }, configVariable: "HOME", configPath: homedir() });
  state.statusError = Object.assign(new Error("one account failed"), {
    stdout: "\u001b[32mLogged in to \u001b[0mgithub.com account \u001b[1moctocat\u001b[0m (keyring)\n",
    stderr: "Another account failed.",
  });
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.active.login, "octocat");
  assert.equal(state.calls.length, 2);
});

test("a missing CLI does not prevent a session-backed account from working", async (t) => {
  const state = setup(t, {
    platform: "linux",
    env: { HOME: homedir(), COPILOT_GH_ACCOUNT_github_2E_com_session_2D_user: "session-token" },
  });
  state.statusError = Object.assign(new Error("not found"), { code: "ENOENT" });
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.active.login, "session-user");
  assert.equal(auth.activeToken, "session-token");
  assert.equal(auth.diagnostic, null);
});

test("CLI failures produce sanitized, actionable diagnostics", async (t) => {
  const state = setup(t, { platform: "linux", env: { HOME: homedir() }, configVariable: "HOME", configPath: homedir() });
  state.statusError = Object.assign(new Error("sensitive-secret"), {
    killed: true,
    stderr: "sensitive-secret",
  });
  let auth = await resolveAccounts();
  assert.equal(auth.active, null);
  assert.match(auth.diagnostic, /timed out/i);
  assert.ok(!JSON.stringify(auth).includes("sensitive-secret"));

  state.statusError = null;
  state.tokenError = Object.assign(new Error("sensitive-secret"), { stderr: "sensitive-secret" });
  auth = await resolveAccounts({ force: true });
  assert.equal(auth.active, null);
  assert.match(auth.diagnostic, /credential/i);
  assert.ok(!JSON.stringify(auth).includes("sensitive-secret"));
});

test("errors validating an account do not disclose the credential", async (t) => {
  const state = setup(t, {
    platform: "linux",
    env: { HOME: homedir(), COPILOT_GH_ACCOUNT_github_2E_com_session_2D_user: "session-token" },
  });
  state.statusError = Object.assign(new Error("not found"), { code: "ENOENT" });
  state.fetchError = new Error("Invalid authorization value: session-token");
  const auth = await resolveAccounts();
  assert.equal(auth.active, null);
  assert.equal(auth.accounts[0].status, "failed");
  assert.ok(!JSON.stringify(auth.accounts).includes("session-token"));
});

test("GitHub API failure messages redact the credential", async (t) => {
  const state = setup(t, {
    platform: "linux",
    env: { HOME: homedir(), COPILOT_GH_ACCOUNT_github_2E_com_session_2D_user: "session-token" },
  });
  state.statusError = Object.assign(new Error("not found"), { code: "ENOENT" });
  globalThis.fetch = async () => Response.json(
    { message: "Invalid credential: session-token" },
    { status: 401 },
  );
  let auth = await resolveAccounts({ repository: "example/repository" });
  assert.match(auth.accounts[0].reason, /\[redacted\]/);
  assert.ok(!JSON.stringify(auth.accounts).includes("session-token"));

  globalThis.fetch = async (url) => new URL(url).pathname === "/user"
    ? Response.json({ login: "session-user" })
    : Response.json({ message: "Denied credential: session-token" }, { status: 403 });
  auth = await resolveAccounts({ repository: "example/repository", force: true });
  assert.equal(auth.accounts[0].status, "limited");
  assert.match(auth.accounts[0].reason, /\[redacted\]/);
  assert.ok(!JSON.stringify(auth.accounts).includes("session-token"));
});

test("account rescan is available without credentials and recovers after sign-in", async (t) => {
  const nativeFetch = globalThis.fetch;
  const state = setup(t, { platform: "linux", env: { HOME: homedir() }, configVariable: "HOME", configPath: homedir() });
  state.statusError = Object.assign(new Error("not found"), { code: "ENOENT" });
  const { startInstance, stopInstance } = await import("./server.mjs");
  const instance = await startInstance("account-rescan", null, () => {});
  t.after(() => stopInstance("account-rescan"));
  const call = (path) => nativeFetch(`${instance.origin}${path}`, {
    headers: { "x-pr-artifact-explorer-token": instance.token },
  });

  let response = await nativeFetch(`${instance.origin}/api/accounts?repo=example%2Frepository`);
  assert.equal(response.status, 403, "account discovery still requires the canvas capability");

  response = await call("/api/bootstrap");
  assert.equal(response.status, 200);
  let payload = await response.json();
  assert.equal(payload.account, null);
  assert.match(payload.diagnostic, /GitHub CLI.*not found/i);

  response = await call("/api/accounts?repo=example%2Frepository");
  assert.equal(response.status, 200);
  payload = await response.json();
  assert.equal(payload.account, null);
  assert.deepEqual(payload.accounts, []);
  assert.match(payload.diagnostic, /GitHub CLI.*not found/i);

  response = await call("/api/pulls?repo=example%2Frepository");
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /GitHub CLI.*not found/i);

  process.env.COPILOT_GH_ACCOUNT_github_2E_com_session_2D_user = "session-token";
  state.fetchError = new Error("Invalid authorization value: session-token");
  response = await call("/api/accounts?repo=example%2Frepository");
  payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.accounts[0].status, "failed");
  assert.ok(!JSON.stringify(payload).includes("session-token"));

  delete process.env.COPILOT_GH_ACCOUNT_github_2E_com_session_2D_user;
  state.fetchError = null;
  state.statusError = null;
  response = await call("/api/accounts?repo=example%2Frepository");
  assert.equal(response.status, 200);
  payload = await response.json();
  assert.equal(payload.account.login, "octocat");
  assert.equal(payload.diagnostic, null);
  assert.ok(!JSON.stringify(payload).includes("cli-token"));
});
