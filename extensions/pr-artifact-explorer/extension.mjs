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
  jobRegistry,
  startArtifactJob,
} from "./cache.mjs";
import {
  broadcastCache,
  closeAllPreviews,
  getBrowserState,
  getControlledBrowser,
  navigateInstance,
  restartInstance,
  sendBrowserCommand,
  startInstance,
  stopInstance,
} from "./server.mjs";
import { stopStaticPreviewsForArtifact } from "./preview.mjs";
import { LimitError, limitPolicy } from "./limits.mjs";
import { join } from "node:path";
import { CaptureError, captureScreenshot, setScreenshotRoot } from "./capture.mjs";
import { TargetError, describeShare, encodeView, parseTarget, routeFor } from "./targets.mjs";
import { loadPrefs, normalizeRepository, savePrefs } from "./state.mjs";

function positiveInteger(value, label) {
  const number = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new CanvasError("invalid_input", `${label} must be a positive integer.`);
  }
  return number;
}

function wrap(fn) {
  return async (ctx) => {
    try {
      return await fn(ctx);
    } catch (error) {
      if (error instanceof CanvasError) throw error;
      if (error instanceof TargetError || error instanceof CaptureError || error instanceof LimitError) {
        throw new CanvasError(error.code ?? "invalid_input", error.message);
      }
      throw error;
    }
  };
}

async function resolveToken(repository) {
  const prefs = await loadPrefs();
  const auth = await resolveAccounts({ preferredId: prefs.account, repository });
  if (!auth.activeToken) {
    throw new CanvasError("github_auth_required", "No usable GitHub account was found.");
  }
  return { token: auth.activeToken, account: auth.active?.id ?? null };
}

async function startJob(ctx, repository, artifactId) {
  const { token, account } = await resolveToken(repository);
  const job = await startArtifactJob(token, repository, artifactId, { account });
  navigateInstance(ctx.instanceId, `#/artifact/${encodeURIComponent(repository)}/0/${artifactId}`);
  return job;
}

// Waits briefly so quick jobs return a result, but never cancels the job.
async function settleWithin(job, ms) {
  let timer;
  const outcome = await Promise.race([
    job.promise.then(() => "done", () => "failed"),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve("running"), ms);
    }),
  ]);
  clearTimeout(timer);
  return outcome;
}

const VIEW_PROPERTIES = {
  preset: { type: "string", enum: ["native", "mobile", "tablet", "desktop", "custom"] },
  zoom: { type: "number", minimum: 0.25, maximum: 3 },
  width: { type: "integer", minimum: 200, maximum: 4000, description: "Custom viewport width in CSS pixels." },
  height: { type: "integer", minimum: 200, maximum: 4000, description: "Custom viewport height in CSS pixels." },
  orientation: { type: "string", enum: ["portrait", "landscape"] },
};

const RUN_FILTER_PROPERTIES = {
  event: { type: "string", description: "Workflow run event filter, e.g. schedule, workflow_dispatch, push or release." },
  status: { type: "string", description: "Run status or conclusion filter, e.g. success, failure or in_progress." },
  branch: { type: "string", description: "Branch name filter." },
  workflow: { type: "string", description: "Workflow file name (e.g. ci.yml) or numeric workflow id." },
  excludePullRequests: { type: "boolean", description: "Hide runs triggered by pull requests. Defaults to true in the canvas; pass false to include them." },
  hasArtifacts: { type: "boolean", description: "Show only runs that produced artifacts. Defaults to true in the canvas; pass false to include runs without artifacts." },
};

function viewFragment(url, input = {}) {
  let { width, height } = input;
  if (width && height && ((input.orientation === "landscape" && height > width) || (input.orientation === "portrait" && width > height))) {
    [width, height] = [height, width];
  }
  return encodeView({ url, preset: input.preset ?? (width || height ? "custom" : undefined), width, height, zoom: input.zoom });
}

const session = await joinSession({
  canvases: [
    createCanvas({
      id: "pr-artifact-explorer",
      displayName: "Artifact Explorer",
      description:
        "Browse GitHub pull requests, issues and workflow runs (including scheduled and manual runs without a pull request), securely preview workflow artifacts, and open local or web URLs in a responsive browser preview with device presets, zoom, history, and screenshots.",
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
          artifactId: {
            type: "integer",
            minimum: 1,
            description: "Workflow artifact id to inspect (requires repository).",
          },
          runId: {
            type: "integer",
            minimum: 1,
            description: "Workflow run id to open, with or without a pull request (requires repository).",
          },
          view: {
            type: "string",
            enum: ["runs"],
            description: "Set to \"runs\" to open the repository's workflow runs list (requires repository).",
          },
          ...RUN_FILTER_PROPERTIES,
          url: {
            type: "string",
            description:
              "A GitHub PR/issue/artifact/run/Actions URL, a shared artifact-explorer link, or an http(s) URL to preview in the browser view.",
          },
          route: {
            type: "string",
            description: "In-app route such as #/pull/owner%2Frepo/1, #/cache or #/docs.",
          },
          ...VIEW_PROPERTIES,
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
          handler: wrap((ctx) => {
            const repository = normalizeRepository(ctx.input?.repository);
            const pullNumber = positiveInteger(ctx.input?.pullNumber, "pullNumber");
            const route = `#/pull/${encodeURIComponent(repository)}/${pullNumber}`;
            return {
              navigated: navigateInstance(ctx.instanceId, route),
              repository,
              pullNumber,
            };
          }),
        },
        {
          name: "open_runs",
          description:
            "Navigate to a repository's workflow runs from any trigger, including scheduled (cron), manual, push and release runs that have no pull request. Optionally filter by event, status, branch or workflow.",
          inputSchema: {
            type: "object",
            properties: {
              repository: { type: "string" },
              ...RUN_FILTER_PROPERTIES,
            },
            required: ["repository"],
            additionalProperties: false,
          },
          handler: wrap((ctx) => {
            const repository = normalizeRepository(ctx.input?.repository);
            const target = {
              kind: "runs",
              repository,
              ...Object.fromEntries(
                Object.entries(ctx.input ?? {}).filter(([key, value]) => key in RUN_FILTER_PROPERTIES && value !== undefined && value !== null && value !== ""),
              ),
            };
            const route = routeFor(target);
            return { navigated: navigateInstance(ctx.instanceId, route), repository, route };
          }),
        },
        {
          name: "open_run",
          description:
            "Navigate to a workflow run and its artifacts. Works for any run, including those not tied to a pull request.",
          inputSchema: {
            type: "object",
            properties: {
              repository: { type: "string" },
              runId: { type: "integer", minimum: 1 },
            },
            required: ["repository", "runId"],
            additionalProperties: false,
          },
          handler: wrap((ctx) => {
            const repository = normalizeRepository(ctx.input?.repository);
            const runId = positiveInteger(ctx.input?.runId, "runId");
            const route = routeFor({ kind: "run", repository, runId });
            return { navigated: navigateInstance(ctx.instanceId, route), repository, runId, route };
          }),
        },
        {
          name: "open_target",
          description:
            "Navigate the canvas to any supported target: a PR/issue/artifact/workflow-run/Actions URL, a shared link, natural language (e.g. 'open PR 123 in owner/repo'), a docs request, or an http(s) URL in the browser preview. Never runs artifact code.",
          inputSchema: {
            type: "object",
            properties: {
              input: { type: "string", description: "URL, route, or natural-language request." },
              repository: { type: "string", description: "Default repository for bare numbers." },
              ...VIEW_PROPERTIES,
            },
            required: ["input"],
            additionalProperties: false,
          },
          handler: wrap(async (ctx) => {
            const prefs = await loadPrefs();
            const target = parseTarget(ctx.input?.input, {
              defaultRepository: ctx.input?.repository ?? prefs.repository,
            });
            if (target.kind === "command") {
              const controlled = getControlledBrowser(ctx.instanceId);
              if (controlled?.active && ["back", "forward", "refresh"].includes(target.command)) {
                return { target, controlled: await controlled.history(target.command) };
              }
              throw new CanvasError("invalid_input", `"${target.command}" needs an open browser view; use open_target with a URL first, or the controlled_* actions.`);
            }
            const view = { ...target.view, ...Object.fromEntries(Object.entries(ctx.input ?? {}).filter(([k, v]) => v !== undefined && k in VIEW_PROPERTIES)) };
            const route =
              target.kind === "url"
                ? `#/browser?v=${viewFragment(target.url, view)}`
                : routeFor(target);
            return { navigated: navigateInstance(ctx.instanceId, route), target, route };
          }),
        },
        {
          name: "inspect_artifact",
          description:
            "Start (or reattach to) a download/index job for a GitHub Actions artifact. The job runs independently of this call; completed ZIPs are reused. Inspection only: artifact programs and build scripts are never executed.",
          inputSchema: {
            type: "object",
            properties: {
              repository: { type: "string" },
              artifactId: { type: "integer", minimum: 1 },
              waitSeconds: { type: "number", minimum: 0, maximum: 120 },
            },
            required: ["repository", "artifactId"],
            additionalProperties: false,
          },
          handler: wrap(async (ctx) => {
            const repository = normalizeRepository(ctx.input?.repository);
            const artifactId = positiveInteger(ctx.input?.artifactId, "artifactId");
            const job = await startJob(ctx, repository, artifactId);
            const outcome = await settleWithin(job, (ctx.input?.waitSeconds ?? 20) * 1000);
            await broadcastCache();
            const snapshot = jobRegistry.snapshot(job);
            if (outcome !== "done") return { status: outcome, job: snapshot };
            const metadata = await job.promise;
            const entries = metadata.analysis.entries ?? [];
            return {
              status: "done",
              job: snapshot,
              artifact: metadata.artifact,
              analysis: {
                ...metadata.analysis,
                entries: entries.slice(0, 200),
                entriesTruncated: entries.length > 200,
              },
            };
          }),
        },
        {
          name: "job_status",
          description: "List download/index jobs with progress, attempt, and outstanding soft-limit prompts.",
          handler: async () => ({ jobs: jobRegistry.list(), limits: limitPolicy.snapshot() }),
        },
        {
          name: "retry_job",
          description: "Retry an artifact job. A completed ZIP is reused and only indexing re-runs.",
          inputSchema: {
            type: "object",
            properties: { repository: { type: "string" }, artifactId: { type: "integer", minimum: 1 } },
            required: ["repository", "artifactId"],
            additionalProperties: false,
          },
          handler: wrap(async (ctx) => {
            const repository = normalizeRepository(ctx.input?.repository);
            const job = await startJob(ctx, repository, positiveInteger(ctx.input?.artifactId, "artifactId"));
            return { job: jobRegistry.snapshot(job) };
          }),
        },
        {
          name: "cancel_job",
          description: "Explicitly cancel a running artifact job.",
          inputSchema: {
            type: "object",
            properties: { jobId: { type: "string" } },
            required: ["jobId"],
            additionalProperties: false,
          },
          handler: wrap((ctx) => {
            const job = jobRegistry.get(String(ctx.input?.jobId ?? ""));
            if (!job) throw new CanvasError("job_not_found", "Job was not found.");
            jobRegistry.cancel(job.id);
            return { job: jobRegistry.snapshot(job) };
          }),
        },
        {
          name: "set_limit",
          description:
            "Raise a soft limit (downloadBytes, zipEntries, centralDirectoryBytes, streamedEntryBytes, idleSeconds). The value must be at least the live value of any running job.",
          inputSchema: {
            type: "object",
            properties: { kind: { type: "string" }, value: { type: "number", minimum: 1 } },
            required: ["kind", "value"],
            additionalProperties: false,
          },
          handler: wrap((ctx) => {
            const result = limitPolicy.submit(ctx.input?.kind, ctx.input?.value);
            return { ...result, limits: limitPolicy.snapshot() };
          }),
        },
        {
          name: "restart_canvas",
          description:
            "Completely restart the canvas server and reload the view. Running download/index jobs are preserved.",
          handler: wrap(async (ctx) => {
            const active = jobRegistry.activeJobs().length;
            const result = await restartInstance(ctx.instanceId, (message) =>
              session.log(message, { level: "info", ephemeral: true }).catch(() => {}),
            );
            if (!result) throw new CanvasError("not_open", "The canvas is not open.");
            return { restarted: true, samePort: result.samePort, jobsPreserved: active, url: result.entry.url };
          }),
        },
        {
          name: "navigate_browser",
          description: "Open an http(s) URL (including localhost) in the browser preview, optionally at a device preset and zoom.",
          inputSchema: {
            type: "object",
            properties: { url: { type: "string" }, ...VIEW_PROPERTIES },
            required: ["url"],
            additionalProperties: false,
          },
          handler: wrap((ctx) => {
            const target = parseTarget(ctx.input?.url);
            if (target.kind !== "url") throw new CanvasError("invalid_input", "Provide an http(s) URL.");
            const route = `#/browser?v=${viewFragment(target.url, ctx.input)}`;
            return { navigated: navigateInstance(ctx.instanceId, route), url: target.url };
          }),
        },
        ...["back", "forward", "refresh"].map((command) => ({
          name: `browser_${command}`,
          description: `Browser preview: ${command}.`,
          handler: wrap((ctx) => ({ sent: sendBrowserCommand(ctx.instanceId, { command }) })),
        })),
        {
          name: "set_viewport",
          description: "Set the browser preview device preset (native, mobile, tablet, desktop, custom) and optional size/orientation.",
          inputSchema: {
            type: "object",
            properties: {
              ...VIEW_PROPERTIES,
            },
            additionalProperties: false,
          },
          handler: wrap((ctx) => ({
            sent: sendBrowserCommand(ctx.instanceId, { command: "viewport", ...ctx.input }),
          })),
        },
        {
          name: "set_zoom",
          description: "Set browser preview visual zoom (0.25-3). Zoom scales the frame without changing the emulated viewport.",
          inputSchema: {
            type: "object",
            properties: { zoom: { type: "number", minimum: 0.25, maximum: 3 }, fit: { type: "boolean" } },
            additionalProperties: false,
          },
          handler: wrap((ctx) => ({
            sent: sendBrowserCommand(ctx.instanceId, { command: "zoom", ...ctx.input }),
          })),
        },
        {
          name: "screenshot",
          description:
            "Capture a real Chromium screenshot saved to the session files area. mode=fresh (default) renders the URL anew at the emulated viewport (not the live in-panel page state); mode=controlled captures the CURRENT page of the isolated controlled Chromium (see controlled_navigate). Requires Playwright; setup instructions are returned if missing.",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string", description: "Defaults to the URL currently shown in the browser preview." },
              mode: { type: "string", enum: ["fresh", "controlled"] },
              fullPage: { type: "boolean" },
              ...VIEW_PROPERTIES,
            },
            additionalProperties: false,
          },
          handler: wrap(async (ctx) => {
            if (ctx.input?.mode === "controlled") {
              return getControlledBrowser(ctx.instanceId).screenshot({ fullPage: ctx.input?.fullPage === true });
            }
            const state = getBrowserState(ctx.instanceId);
            const url = ctx.input?.url ?? state?.url;
            if (!url) throw new CanvasError("invalid_input", "No URL is open; pass url.");
            return captureScreenshot({
              url,
              fullPage: ctx.input?.fullPage === true,
              preset: ctx.input?.preset ?? state?.preset ?? undefined,
              width: ctx.input?.width,
              height: ctx.input?.height,
              orientation: ctx.input?.orientation,
            });
          }),
        },
        {
          name: "controlled_navigate",
          description:
            "Open a URL in the explicit, isolated controlled Chromium (fresh in-memory profile, no logins) with real history and device emulation. Use for sites that refuse iframe embedding. Requires Playwright.",
          inputSchema: {
            type: "object",
            properties: { url: { type: "string" }, ...VIEW_PROPERTIES },
            required: ["url"],
            additionalProperties: false,
          },
          handler: wrap(async (ctx) => {
            const { url, preset, width, height, orientation } = ctx.input ?? {};
            return { controlled: await getControlledBrowser(ctx.instanceId).navigate(url, { preset, width, height, orientation }) };
          }),
        },
        ...["back", "forward", "refresh"].map((direction) => ({
          name: `controlled_${direction}`,
          description: `Controlled Chromium history: ${direction}.`,
          handler: wrap(async (ctx) => ({ controlled: await getControlledBrowser(ctx.instanceId).history(direction) })),
        })),
        {
          name: "controlled_close",
          description: "Close the controlled Chromium and discard its in-memory profile.",
          handler: wrap(async (ctx) => {
            await getControlledBrowser(ctx.instanceId)?.close();
            return { closed: true };
          }),
        },
        {
          name: "share",
          description: "Build a canonical GitHub URL and shareable link for a PR, issue, or artifact target.",
          inputSchema: {
            type: "object",
            properties: { input: { type: "string" }, repository: { type: "string" }, ...VIEW_PROPERTIES },
            required: ["input"],
            additionalProperties: false,
          },
          handler: wrap((ctx) => {
            const target = parseTarget(ctx.input?.input, { defaultRepository: ctx.input?.repository });
            if (target.kind === "command") throw new CanvasError("invalid_input", "Commands cannot be shared; share a URL or artifact target.");
            const picked = Object.fromEntries(Object.entries(ctx.input ?? {}).filter(([k, v]) => v !== undefined && k in VIEW_PROPERTIES));
            const view = { ...target.view, ...picked };
            return { share: describeShare(target, Object.keys(view).length ? view : null) };
          }),
        },
        {
          name: "docs",
          description: "Open the built-in Artifact Explorer documentation tab.",
          handler: wrap((ctx) => ({ navigated: navigateInstance(ctx.instanceId, "#/docs") })),
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
            try {
              if (ctx.input?.artifactId != null) {
                const id = positiveInteger(ctx.input.artifactId, "artifactId");
                await stopStaticPreviewsForArtifact(id);
                const result = await deleteCachedArtifact(id);
                navigateInstance(ctx.instanceId, "#/cache");
                await broadcastCache({ refresh: true });
                return result;
              }
              await closeAllPreviews();
              const result = await clearArtifactCache();
              navigateInstance(ctx.instanceId, "#/cache");
              await broadcastCache({ refresh: true });
              return result;
            } catch (error) {
              if (error?.code === "jobs_active") {
                throw new CanvasError("jobs_active", error.message);
              }
              throw error;
            }
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
            invalidateAccounts();
            const auth = await resolveAccounts({
              preferredId: ctx.input.id,
              repository: prefs.repository,
              force: true,
            });
            if (!auth.active || auth.active.id !== ctx.input.id) {
              throw new CanvasError(
                "invalid_account",
                `Account "${ctx.input.id}" was not found or is unavailable.`,
              );
            }
            prefs.account = ctx.input.id;
            await savePrefs(prefs);
            return { active: auth.active, accounts: auth.accounts };
          },
        },
      ],
      open: async (ctx) => {
        if (session.workspacePath) setScreenshotRoot(join(session.workspacePath, "files", "artifact-explorer-screenshots"));
        const entry = await startInstance(
          ctx.instanceId,
          ctx.input,
          (message) => session.log(message, { level: "info", ephemeral: true }).catch(() => {}),
        );
        return {
          title: "Artifact Explorer",
          status: "GitHub workflow artifacts",
          url: entry.url,
        };
      },
      onClose: async (ctx) => {
        await stopInstance(ctx.instanceId);
      },
    }),
  ],
});
