import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildExtensionPluginOwners,
  resolveExtensionPluginName,
} from "./extension-plugin-ownership.mjs";

const namespace = "com.github.awesome-copilot";

test("resolves an extension bundled only by its parent plugin", () => {
  const owners = buildExtensionPluginOwners([
    {
      directoryName: "ember",
      manifest: {
        name: "ember",
        extensions: {
          [namespace]: {
            extensions: ["./extensions/daily-focus-board"],
          },
        },
      },
    },
  ]);

  assert.equal(
    resolveExtensionPluginName("daily-focus-board", owners),
    "ember"
  );
});

test("prefers a same-named standalone plugin over another owner", () => {
  const owners = buildExtensionPluginOwners([
    {
      directoryName: "parent-plugin",
      manifest: {
        name: "parent-plugin",
        extensions: {
          [namespace]: {
            extensions: ["./extensions/daily-focus-board/"],
          },
        },
      },
    },
    {
      directoryName: "daily-focus-board",
      manifest: { name: "daily-focus-board" },
    },
  ]);

  assert.equal(
    resolveExtensionPluginName("daily-focus-board", owners),
    "daily-focus-board"
  );
});

test("preserves the extension name when no plugin owns it", () => {
  assert.equal(
    resolveExtensionPluginName("daily-focus-board", new Map()),
    "daily-focus-board"
  );
});
