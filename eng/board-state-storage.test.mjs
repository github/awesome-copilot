import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import { test } from "node:test";

const extensionsDir = fileURLToPath(new URL("../.github/extensions/", import.meta.url));
const repo = "github/awesome-copilot";
const item = {
  number: 1, title: "Example", author: "contributor", labels: [],
  url: "https://github.com/github/awesome-copilot/issues/1",
};

async function fixture(t, id) {
  const root = await mkdtemp(path.join(os.tmpdir(), "board-state-storage-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const extensionDir = path.join(root, id);
  await cp(path.join(extensionsDir, id), extensionDir, { recursive: true });
  const workspacePath = path.join(root, "session");
  const filename = id === "open-pr-board" ? "github__awesome-copilot.json" : "board.json";
  return {
    id, root, extensionDir, workspacePath,
    legacyFile: path.join(extensionDir, "state", filename),
    stateFile: path.join(workspacePath, "extensions", id, "state", filename),
  };
}

async function fingerprint(dir) {
  const files = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, entry.name);
    files.push([entry.name, entry.isDirectory()
      ? await fingerprint(file)
      : createHash("sha256").update(await readFile(file)).digest("hex")]);
  }
  return files;
}

async function loadCanvas({ id, extensionDir, workspacePath, triggerDuringJoin = false }) {
  let canvas;
  let startupResults;
  const context = vm.createContext({ setTimeout });
  const sdk = {
    createCanvas: (definition) => definition,
    joinSession: async (options) => {
      [canvas] = options.canvases;
      if (triggerDuringJoin) {
        const ctx = { instanceId: "startup-test", input: {} };
        const requests = [
          canvas.actions.find((entry) => entry.name === "get_board").handler(ctx),
          canvas.open(ctx),
        ];
        startupResults = Promise.all(requests.map(async (request) => {
          try {
            await request;
            return { ok: true };
          } catch (error) {
            return { ok: false, code: error.code, message: error.message };
          }
        }));
      }
      return { workspacePath, log() {}, send: async () => {} };
    },
    CanvasError: class CanvasError extends Error {
      constructor(code, message) { super(message); this.code = code; }
    },
  };
  const filename = path.join(extensionDir, "extension.mjs");
  const module = new vm.SourceTextModule(await readFile(filename, "utf8"), {
    context,
    initializeImportMeta(meta) { meta.url = pathToFileURL(filename).href; },
  });
  await module.link(async (specifier) => {
    let exports;
    if (specifier === "@github/copilot-sdk/extension") {
      exports = sdk;
    } else if (specifier === "./lib/github.mjs") {
      exports = {
        listOpenPullRequests: async () => [item],
        listReadyIssues: async () => [item],
      };
    } else {
      exports = await import(specifier.startsWith(".")
        ? pathToFileURL(path.join(extensionsDir, id, specifier)).href
        : specifier);
    }
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  const act = (name, input = {}) => {
    const action = canvas.actions.find((entry) => entry.name === name);
    assert.ok(action, `Missing canvas action ${name}`);
    return action.handler({ instanceId: "test-board", input });
  };
  act.startupResults = startupResults;
  return act;
}

async function writeJSON(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value), "utf8");
}

for (const id of ["open-pr-board", "external-plugin-review-board"]) {
  const column = id === "open-pr-board" ? "needs-insight" : "needs-review";

  test(`${id} writes only in its session namespace and survives reloads`, async (t) => {
    const f = await fixture(t, id);
    const before = await fingerprint(f.extensionDir);
    const act = await loadCanvas(f);
    await act("refresh");
    await act("move_item", { number: 1, column });
    assert.equal(JSON.parse(await readFile(f.stateFile, "utf8")).items["1"].manualColumn, column);
    assert.deepEqual(await fingerprint(f.extensionDir), before);

    const reloaded = await loadCanvas(f);
    assert.equal((await reloaded("get_board")).items[0].manualOverride, column);
    const otherSession = await loadCanvas({ ...f, workspacePath: path.join(f.root, "other-session") });
    assert.equal((await otherSession("get_board")).items.length, 0);

    if (id === "open-pr-board") {
      await act("refresh", { repo: "example/other" });
      const otherFile = path.join(path.dirname(f.stateFile), "example__other.json");
      assert.equal(JSON.parse(await readFile(otherFile, "utf8")).repo, "example/other");
      await act("reset_board");
      const afterReset = await loadCanvas(f);
      assert.equal((await afterReset("get_board")).items[0].manualOverride, null);
    }
    assert.deepEqual(await fingerprint(f.extensionDir), before);
  });

  test(`${id} starts fresh and ignores state stored in the extension folder`, async (t) => {
    const f = await fixture(t, id);
    await writeJSON(f.legacyFile, {
      version: 1, repo, items: { "1": { ...item, manualColumn: column, reviewStatus: "reviewed" } },
      history: [{ number: 1, comment: "Old history" }],
    });
    const before = await fingerprint(f.extensionDir);
    const act = await loadCanvas(f);
    assert.equal((await act("get_board")).items.length, 0);
    await act("refresh");
    assert.equal((await act("get_board")).items[0].manualOverride, null);
    assert.deepEqual(await fingerprint(f.extensionDir), before);
  });

  test(`${id} rejects a missing session workspace instead of writing to the extension`, async (t) => {
    const f = await fixture(t, id);
    const before = await fingerprint(f.extensionDir);
    await assert.rejects(loadCanvas({ ...f, workspacePath: undefined }), /requires a session workspace/);
    assert.deepEqual(await fingerprint(f.extensionDir), before);
  });

  test(`${id} surfaces corrupt session state`, async (t) => {
    const f = await fixture(t, id);
    await mkdir(path.dirname(f.stateFile), { recursive: true });
    await writeFile(f.stateFile, "not json", "utf8");
    await assert.rejects(async () => {
      const act = await loadCanvas(f);
      await act("get_board");
    }, /JSON|Unexpected token/);
  });
}

test("external-plugin-review-board returns retryable not_ready errors during startup", async (t) => {
  const f = await fixture(t, "external-plugin-review-board");
  const act = await loadCanvas({ ...f, triggerDuringJoin: true });
  const results = await act.startupResults;
  assert.equal(results.length, 2);
  for (const result of results) {
    assert.equal(result.ok, false);
    assert.equal(result.code, "not_ready");
    assert.match(result.message, /still starting/i);
  }
  assert.equal((await act("get_board")).items.length, 0);
});

test("both canvases keep independent boards in the same session workspace", async (t) => {
  const pr = await fixture(t, "open-pr-board");
  const plugin = { ...await fixture(t, "external-plugin-review-board"), workspacePath: pr.workspacePath };
  const prBoard = await loadCanvas(pr);
  const pluginBoard = await loadCanvas(plugin);
  await prBoard("refresh");
  await pluginBoard("refresh");
  await prBoard("move_item", { number: 1, column: "needs-insight" });
  await pluginBoard("move_item", { number: 1, column: "accept" });
  const reloadedPR = await loadCanvas(pr);
  const reloadedPlugin = await loadCanvas(plugin);
  assert.equal((await reloadedPR("get_board")).items[0].manualOverride, "needs-insight");
  assert.equal((await reloadedPlugin("get_board")).items[0].manualOverride, "accept");
});
