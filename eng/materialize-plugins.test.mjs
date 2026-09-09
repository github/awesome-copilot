import assert from "node:assert/strict";
import { test } from "node:test";
import { createServedManifest, materializePlugins } from "./materialize-plugins.mjs";
import { generateMarketplace } from "./generate-marketplace.mjs";

test("build scripts expose callable APIs without running on import", () => {
  assert.equal(typeof materializePlugins, "function");
  assert.equal(typeof generateMarketplace, "function");
});

test("served manifests strip pluginFiles composition metadata", () => {
  const served = createServedManifest({
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name: "demo",
    version: "1.0.0",
    description: "Demo plugin",
    extensions: {
      "com.github.awesome-copilot": {
        pluginFiles: ["./scripts/"],
        skills: ["./skills/demo/"],
      },
      "com.github.copilot": {
        logo: "assets/logo.png",
      },
    },
  });

  assert.deepEqual(served, {
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name: "demo",
    version: "1.0.0",
    description: "Demo plugin",
    extensions: {
      "com.github.copilot": {
        logo: "assets/logo.png",
      },
    },
  });
});
