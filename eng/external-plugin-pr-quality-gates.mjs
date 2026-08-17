#!/usr/bin/env node

import { runExternalPluginQualityGates } from "./external-plugin-quality-gates.mjs";
import { validateExternalPlugin } from "./external-plugin-validation.mjs";

function normalizePluginPath(pluginPath) {
  if (!pluginPath || pluginPath === "/") {
    return "";
  }

  return String(pluginPath).trim().replace(/^\/+|\/+$/g, "");
}

function encodePathLikeValue(value) {
  return String(value)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildSourceTreeUrl(plugin) {
  const sourceRepo = plugin?.source?.repo;
  if (!sourceRepo) {
    return "";
  }

  const sourceLocator = plugin?.source?.sha || plugin?.source?.ref;
  if (!sourceLocator) {
    return `https://github.com/${sourceRepo}`;
  }

  const encodedLocator = encodeURIComponent(sourceLocator);
  const normalizedPath = normalizePluginPath(plugin?.source?.path);
  if (!normalizedPath) {
    return `https://github.com/${sourceRepo}/tree/${encodedLocator}`;
  }

  const encodedPath = encodePathLikeValue(normalizedPath);
  return `https://github.com/${sourceRepo}/tree/${encodedLocator}/${encodedPath}`;
}

function aggregateResultStatus(pluginResults) {
  if (pluginResults.some((entry) => entry.quality?.overall_status === "fail")) {
    return {
      overallStatus: "fail",
      failureClass: "submitter_fixes",
    };
  }

  if (pluginResults.some((entry) => entry.quality?.overall_status === "infra_error")) {
    return {
      overallStatus: "infra_error",
      failureClass: "infra",
    };
  }

  if (pluginResults.length === 0) {
    return {
      overallStatus: "not_run",
      failureClass: "none",
    };
  }

  return {
    overallStatus: "pass",
    failureClass: "none",
  };
}

function createValidationFailureQuality(errors) {
  const output = errors.map((error) => `- ${error}`).join("\n");
  return {
    overall_status: "fail",
    vally_lint_status: "fail",
    smoke_status: "not_run",
    version_match_status: "not_run",
    ref_sha_consistency_status: "not_run",
    canvas_structure_status: "not_run",
    failure_class: "submitter_fixes",
    summary: "Plugin entry failed external.json validation. Fix the listed errors and re-run quality checks.",
    vally_lint_output: output,
    smoke_output: "Install smoke test skipped due to external.json validation errors.",
    version_match_output: "Version match skipped due to external.json validation errors.",
    ref_sha_consistency_output: "Ref/SHA consistency check skipped due to external.json validation errors.",
    canvas_structure_output: "Canvas structure check skipped due to external.json validation errors.",
  };
}

export async function runExternalPluginPrQualityGates(plugins) {
  if (!Array.isArray(plugins)) {
    throw new Error("plugins must be an array");
  }

  const checkedPlugins = await Promise.all(plugins.map(async (plugin) => {
    const validation = validateExternalPlugin(plugin, "changed-plugin", { policy: "marketplace" });
    const quality = validation.errors.length > 0
      ? createValidationFailureQuality(validation.errors)
      : await runExternalPluginQualityGates(plugin);
    return {
      name: plugin?.name ?? "unknown",
      source: plugin?.source ?? {},
      source_tree_url: buildSourceTreeUrl(plugin),
      quality,
    };
  }));

  const aggregate = aggregateResultStatus(checkedPlugins);
  const summary = checkedPlugins.length === 0
    ? "No changed external plugin entries were detected in plugins/external.json."
    : checkedPlugins
      .map((entry) =>
        `- ${entry.name}: spec=${entry.quality.spec_compliance_status}, vally-lint=${entry.quality.vally_lint_status}, install-smoke=${entry.quality.smoke_status}, version-match=${entry.quality.version_match_status}, ref-sha-consistency=${entry.quality.ref_sha_consistency_status}, canvas-structure=${entry.quality.canvas_structure_status}, overall=${entry.quality.overall_status}`
      )
      .join("\n");

  return {
    overall_status: aggregate.overallStatus,
    failure_class: aggregate.failureClass,
    summary,
    checked_plugins: checkedPlugins,
  };
}

function parseCliArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) {
      continue;
    }

    args[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseCliArgs(process.argv.slice(2));
  if (!args["plugins-json"]) {
    console.error("Usage: node ./eng/external-plugin-pr-quality-gates.mjs --plugins-json '<json-array>'");
    process.exit(1);
  }

  const plugins = JSON.parse(args["plugins-json"]);
  const result = await runExternalPluginPrQualityGates(plugins);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
