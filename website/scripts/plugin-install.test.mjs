import assert from "node:assert/strict";
import { test } from "node:test";
import { buildVSCodePluginInstallUrl } from "../src/lib/plugin-install.ts";

test("uses the awesome-copilot marketplace repository", () => {
  assert.equal(
    buildVSCodePluginInstallUrl("ai-ready"),
    "vscode://chat-plugin/install?source=github%2Fawesome-copilot&plugin=ai-ready",
  );
});

test("encodes query values once without introducing extra parameters", () => {
  const pluginName = "name&plugin=other +/%?#";
  const url = new URL(buildVSCodePluginInstallUrl(pluginName));
  assert.deepEqual([...url.searchParams], [
    ["source", "github/awesome-copilot"],
    ["plugin", pluginName],
  ]);
  assert.equal(url.hash, "");
  assert.match(url.search, /source=github%2Fawesome-copilot/);
});

test("rejects missing, qualified, or control-character plugin names", () => {
  for (const name of ["", " ", "name@marketplace", "name\n", "name\u0000", "name\u007f"]) {
    assert.throws(() => buildVSCodePluginInstallUrl(name), /Invalid marketplace plugin name/);
  }
});
