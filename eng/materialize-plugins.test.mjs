import assert from "node:assert/strict";
import { test } from "node:test";
import { materializePlugins } from "./materialize-plugins.mjs";
import { generateMarketplace } from "./generate-marketplace.mjs";

test("build scripts expose callable APIs without running on import", () => {
  assert.equal(typeof materializePlugins, "function");
  assert.equal(typeof generateMarketplace, "function");
});
