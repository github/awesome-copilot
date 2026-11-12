import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import test from "node:test";

let scenario;
const originalExecFile = childProcess.execFile;
childProcess.execFile = (command, args, options, callback) => {
  assert.equal(command, "gh");
  assert.equal(options.windowsHide, true);
  assert.equal(options.env.GH_TOKEN, undefined);
  assert.equal(options.env.GITHUB_TOKEN, undefined);
  scenario.calls.push({ args, env: options.env });
  if (args[1] === "status") {
    const config = Object.entries(options.env).find(([name]) =>
      name.toUpperCase() === scenario.configVariable)?.[1];
    if (config !== scenario.configPath) {
      callback(Object.assign(new Error("No saved accounts"), {
        stderr: "You are not logged into any GitHub hosts.",
      }));
      return;
    }
    callback(null, {
      stdout: "Logged in to github.com account octocat (keyring)\n" +
        "Logged in to enterprise.example account enterprise-user (keyring)",
      stderr: "",
    });
    return;
  }
  assert.deepEqual(args, ["auth", "token", "--hostname", "github.com", "--user", "octocat"]);
  callback(null, { stdout: "cli-token\n", stderr: "" });
};
syncBuiltinESMExports();
const { resolveAccounts, invalidateAccounts } = await import("./accounts.mjs");
childProcess.execFile = originalExecFile;
syncBuiltinESMExports();

function setup(t, { platform = "win32", env = {}, configVariable = "APPDATA",
  configPath = join(homedir(), "AppData", "Roaming") } = {}) {
  const originalEnv = process.env;
  const platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");
  const originalFetch = globalThis.fetch;
  process.env = { ...env };
  Object.defineProperty(process, "platform", { value: platform });
  scenario = { calls: [], configVariable, configPath };
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).origin, "https://api.github.com");
    const token = options.headers.Authorization;
    assert.ok(["Bearer cli-token", "Bearer session-token"].includes(token));
    if (new URL(url).pathname === "/user") {
      return Response.json({ login: token === "Bearer cli-token" ? "octocat" : "session-user" });
    }
    assert.equal(new URL(url).pathname, "/repos/example/repository");
    return Response.json({ full_name: "example/repository" });
  };
  invalidateAccounts();
  t.after(() => {
    process.env = originalEnv;
    Object.defineProperty(process, "platform", platformDescriptor);
    globalThis.fetch = originalFetch;
    invalidateAccounts();
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
  assert.equal(process.env.APPDATA, undefined, "the parent environment is not modified");
  assert.equal(auth.accounts.length, 1, "enterprise tokens are not sent to github.com");
  assert.ok(!JSON.stringify({ active: auth.active, accounts: auth.accounts }).includes("cli-token"));
});

test("session discovery retains its preferred account and AppData while excluding ambient CLI overrides", async (t) => {
  const appData = join(homedir(), "redirected-roaming");
  const state = setup(t, {
    env: {
      AppData: appData,
      COPILOT_GH_ACCOUNT_github_2E_com_session_2D_user: "session-token",
      GH_TOKEN: "ambient-token",
      GITHUB_TOKEN: "ambient-token",
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
  });
}

test("non-Windows discovery does not synthesize a Windows configuration directory", async (t) => {
  const home = homedir();
  const state = setup(t, {
    platform: "linux", env: { HOME: home }, configVariable: "HOME", configPath: home,
  });
  const auth = await resolveAccounts({ repository: "example/repository" });
  assert.equal(auth.active.login, "octocat");
  assert.equal(state.calls.length, 2);
  assert.ok(state.calls.every(({ env }) => env.APPDATA === undefined));
});
