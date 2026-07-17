import {
  CanvasError,
  createCanvas,
  joinSession,
} from "@github/copilot-sdk/extension";
import { resolveAccounts, invalidateAccounts } from "./accounts.mjs";
import {
  clearArtifactCache,
  deleteCachedArtifact,
  getCacheSummary,
  inspectArtifact,
} from "./cache.mjs";
import {
  broadcastCache,
  closeAllPreviews,
  navigateInstance,
  startInstance,
  stopInstance,
} from "./server.mjs";
import { stopStaticPreviewsForArtifact } from "./preview.mjs";
import { loadPrefs, normalizeRepository, savePrefs } from "./state.mjs";

function positiveInteger(value, label) {
  const number = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new CanvasError("invalid_input", `${label} must be a positive integer.`);
  }
  return number;
}

const session = await joinSession({
  canvases: [
    createCanvas({
      id: "pr-artifact-explorer",
      displayName: "Artifact Explorer",
      description:
        "Browse GitHub pull requests and securely preview workflow artifacts, including static sites and asciinema recordings.",
      inputSchema: {
        type: "object",
        properties: {
          repository: {
            type: "string",
            description: "Repository in owner/name format.",
          },
          pullNumber: {
            type: "integer",
            minimum: 1,
            description: "Pull request number to open.",
          },
          url: {
            type: "string",
            description: "GitHub pull request URL to open.",
          },
        },
        additionalProperties: false,
      },
      actions: [
        {
          name: "open_pull_request",
          description: "Navigate an open explorer canvas to a pull request.",
          inputSchema: {
            type: "object",
            properties: {
              repository: { type: "string" },
              pullNumber: { type: "integer", minimum: 1 },
            },
            required: ["repository", "pullNumber"],
            additionalProperties: false,
          },
          handler: (ctx) => {
            const repository = normalizeRepository(ctx.input?.repository);
            const pullNumber = positiveInteger(ctx.input?.pullNumber, "pullNumber");
            const route = `#/pull/${encodeURIComponent(repository)}/${pullNumber}`;
            return {
              navigated: navigateInstance(ctx.instanceId, route),
              repository,
              pullNumber,
            };
          },
        },
        {
          name: "inspect_artifact",
          description: "Download, index, and smart-detect a GitHub Actions artifact.",
          inputSchema: {
            type: "object",
            properties: {
              repository: { type: "string" },
              artifactId: { type: "integer", minimum: 1 },
            },
            required: ["repository", "artifactId"],
            additionalProperties: false,
          },
          handler: async (ctx) => {
            const repository = normalizeRepository(ctx.input?.repository);
            const artifactId = positiveInteger(ctx.input?.artifactId, "artifactId");
            const prefs = await loadPrefs();
            const auth = await resolveAccounts({
              preferredId: prefs.account,
              repository,
            });
            if (!auth.activeToken) {
              throw new CanvasError("github_auth_required", "No usable GitHub account was found.");
            }
            const metadata = await inspectArtifact(auth.activeToken, repository, artifactId);
            await broadcastCache();
            navigateInstance(
              ctx.instanceId,
              `#/artifact/${encodeURIComponent(repository)}/0/${artifactId}`,
            );
            const entries = metadata.analysis.entries ?? [];
            return {
              artifact: metadata.artifact,
              analysis: {
                ...metadata.analysis,
                entries: entries.slice(0, 200),
                entriesTruncated: entries.length > 200,
              },
            };
          },
        },
        {
          name: "cache_status",
          description: "Report downloaded artifact cache usage.",
          handler: async () => getCacheSummary(),
        },
        {
          name: "clear_cache",
          description: "Delete one downloaded artifact or clear the entire artifact cache.",
          inputSchema: {
            type: "object",
            properties: {
              artifactId: { type: "integer", minimum: 1 },
            },
            additionalProperties: false,
          },
          handler: async (ctx) => {
            if (ctx.input?.artifactId != null) {
              await stopStaticPreviewsForArtifact(ctx.input.artifactId);
              const result = await deleteCachedArtifact(
                positiveInteger(ctx.input.artifactId, "artifactId"),
              );
              navigateInstance(ctx.instanceId, "#/cache");
              await broadcastCache({ refresh: true });
              return result;
            }
            await closeAllPreviews();
            const result = await clearArtifactCache();
            navigateInstance(ctx.instanceId, "#/cache");
            await broadcastCache({ refresh: true });
            return result;
          },
        },
        {
          name: "accounts",
          description: "List GitHub accounts inherited from the Copilot app and GitHub CLI.",
          handler: async () => {
            const prefs = await loadPrefs();
            const auth = await resolveAccounts({
              preferredId: prefs.account,
              repository: prefs.repository,
              force: true,
            });
            return { active: auth.active, accounts: auth.accounts };
          },
        },
        {
          name: "set_account",
          description: "Select the GitHub account used by the artifact explorer.",
          inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
            additionalProperties: false,
          },
          handler: async (ctx) => {
            if (typeof ctx.input?.id !== "string" || !ctx.input.id) {
              throw new CanvasError("invalid_account", "Account id is required.");
            }
            const prefs = await loadPrefs();
            prefs.account = ctx.input.id;
            await savePrefs(prefs);
            invalidateAccounts();
            const auth = await resolveAccounts({
              preferredId: prefs.account,
              repository: prefs.repository,
              force: true,
            });
            return { active: auth.active, accounts: auth.accounts };
          },
        },
      ],
      open: async (ctx) => {
        const entry = await startInstance(
          ctx.instanceId,
          ctx.input,
          (message) => session.log(message, { level: "debug" }),
        );
        return {
          title: "Artifact Explorer",
          status: "GitHub pull request artifacts",
          url: entry.url,
        };
      },
      onClose: async (ctx) => {
        await stopInstance(ctx.instanceId);
      },
    }),
  ],
});
