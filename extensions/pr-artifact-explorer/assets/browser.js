"use strict";
/* Browser preview, jobs, docs, copy helpers and shortcuts. Loaded before app.js; app.js globals are used only at call time. */

const BROWSER_PRESETS = {
  native: { label: "Native (fit window)", width: null, height: null, dpr: 1 },
  mobile: { label: "Mobile 390×844", width: 390, height: 844, dpr: 3 },
  tablet: { label: "Tablet 768×1024", width: 768, height: 1024, dpr: 2 },
  desktop: { label: "Desktop 1440×900", width: 1440, height: 900, dpr: 1 },
  custom: { label: "Custom size", width: 1024, height: 768, dpr: 1 },
};
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

let browserState = null;
let browserCleanup = null;
const jobsById = new Map();
let jobWarnings = [];
let jobPanel = null;
const jobWaiters = new Map();

/* ---------- base64url + view encoding (matches targets.mjs) ---------- */

function encodeViewClient(view) {
  const body = { v: 1 };
  if (view.url) body.url = view.url;
  if (view.preset) body.preset = view.preset;
  if (view.width) body.w = view.width;
  if (view.height) body.h = view.height;
  if (view.zoom) body.z = view.zoom;
  if (view.orientation) body.o = view.orientation;
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function safeHttpUrl(value) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

function decodeViewClient(text) {
  if (!text) return {};
  try {
    const padded = text.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const body = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
    if (!body || typeof body !== "object" || body.v !== 1) return {};
    return { url: body.url === undefined ? undefined : safeHttpUrl(body.url), preset: body.preset, width: body.w, height: body.h, zoom: body.z, orientation: body.o };
  } catch {
    return {};
  }
}

function browserHash(view) {
  return `#/browser?v=${encodeViewClient(view)}`;
}

/* ---------- copy helpers ---------- */

async function copyText(text, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} to clipboard.`);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    if (!ok) {
      const previousFocus = document.activeElement;
      const dialog = document.createElement("dialog");
      dialog.className = "manual-copy-dialog";
      dialog.setAttribute("aria-labelledby", "manual-copy-title");
      dialog.innerHTML = `<h2 id="manual-copy-title">Copy manually</h2><p>Your browser blocked clipboard access. Select this text and copy it.</p><textarea readonly aria-label="Text to copy"></textarea><form method="dialog"><button class="app-button">Close</button></form>`;
      dialog.querySelector("textarea").value = text;
      dialog.addEventListener("close", () => {
        dialog.remove();
        if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      }, { once: true });
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape") event.stopPropagation();
      });
      document.body.append(dialog);
      dialog.showModal();
      dialog.querySelector("textarea").select();
    }
    showToast(ok ? `${label} to clipboard.` : "Copy failed. Select the text and copy manually.", ok ? "info" : "error");
    return ok;
  }
}

function copyButtonHtml(text, label, iconName = "copy") {
  return `<button type="button" class="icon-button title-copy" data-copy="${escapeHtml(text)}" data-copy-label="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon(iconName)}</button>`;
}

function pageTitleHtml(title, number, url) {
  const text = String(title ?? "");
  const numberHtml =
    Number.isInteger(number) && url
      ? `<a class="page-title-number page-title-number-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="Open #${number} on GitHub">#${number}</a>${copyButtonHtml(url, `Copy link to #${number}`, "copy")}`
      : Number.isInteger(number)
        ? `<span class="page-title-number">#${number}</span>`
        : "";
  return `<h1 class="page-title"><strong>${titleHtml(text)}</strong>${copyButtonHtml(text, "Copy title")}${numberHtml}</h1>`;
}

document.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-copy]") : null;
  if (!button) return;
  event.preventDefault();
  const label = button.dataset.copyLabel ?? "Copied";
  void copyText(button.dataset.copy ?? "", label.replace(/^Copy /, "Copied "));
});

/* ---------- natural-language navigation ---------- */

function isPlainRepositoryInput(value) {
  return /^[\w.-]+\/[\w.-]+$/.test(String(value ?? "").trim());
}

async function navigateNaturalLanguage(value) {
  const input = String(value ?? "").trim();
  if (!input) return false;
  try {
    const parsed = await api("/api/targets/parse", {
      method: "POST",
      body: { input, repository: bootstrapState?.prefs?.repository },
    });
    if (parsed.target?.kind === "command") {
      handleBrowserCommand(parsed.target);
      return true;
    }
    if (!parsed.route) throw new Error("That request cannot be opened.");
    location.hash = parsed.route;
    if (location.hash === parsed.route) void renderRoute();
    return true;
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), "error");
    return true;
  }
}

async function initialRouteFromInput(input) {
  if (input.route) return String(input.route).startsWith("#") ? input.route : `#${input.route}`;
  const repository = input.repository ?? bootstrapState.prefs.repository;
  if (input.artifactId && input.repository) {
    return artifactHash(repository, Number(input.pullNumber ?? 0), Number(input.artifactId), null, false, Number(input.runId) || 0);
  }
  if (input.runId && input.repository) return runHash(repository, input.runId);
  if (input.view === "runs" && input.repository) {
    return runsHash(repository, { event: input.event, status: input.status, branch: input.branch, workflow: input.workflow, excludePullRequests: input.excludePullRequests, hasArtifacts: input.hasArtifacts });
  }
  if (input.url) {
    const parsed = await api("/api/targets/parse", { method: "POST", body: { input: input.url, repository } });
    if (parsed.target?.kind === "url") {
      return browserHash({ url: parsed.target.url, preset: input.preset, width: input.width, height: input.height, zoom: input.zoom });
    }
    return parsed.route;
  }
  if (input.pullNumber && input.repository) return pullHash(repository, input.pullNumber);
  if (input.repository) return pullsHashForRepository(repository);
  return null;
}

/* ---------- connection and restart ---------- */

function setConnectionState(connected) {
  const el = document.getElementById("connection-state");
  if (!el) return;
  el.dataset.state = connected ? "connected" : "reconnecting";
  el.textContent = connected ? "Connected" : "Reconnecting…";
  el.hidden = connected;
}

function handleRestartEvent() {
  setConnectionState(false);
  showToast("Restarting the canvas. Running downloads continue in the background.");
}

document.addEventListener("DOMContentLoaded", () => {
  installDisclosurePopover("app-options", "app-options-button");
  document.getElementById("app-options")?.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a, button")) {
      document.getElementById("app-options").hidePopover();
    }
  });
  const updateNavigation = () => {
    for (const [id, route] of [["docs-link", "#/docs"]]) {
      const link = document.getElementById(id);
      if (location.hash.startsWith(route)) link?.setAttribute("aria-current", "page");
      else link?.removeAttribute("aria-current");
    }
  };
  window.addEventListener("hashchange", updateNavigation);
  updateNavigation();
  document.getElementById("restart-button")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const result = await api("/api/restart", { method: "POST", body: {} });
      showToast(`Restarting. ${result.jobsPreserved ?? 0} running job(s) will continue.`);
      let attempts = 0;
      const poll = async () => {
        attempts += 1;
        try {
          await api("/api/jobs");
          setConnectionState(true);
          button.disabled = false;
          void renderRoute({ force: true });
        } catch {
          if (attempts < 40) setTimeout(poll, 500);
          else {
            button.disabled = false;
            showToast("The canvas did not come back. Use the Restart canvas action or reopen it.", "error");
          }
        }
      };
      setTimeout(poll, 600);
    } catch (error) {
      button.disabled = false;
      showToast(error instanceof Error ? error.message : String(error), "error");
    }
  });
});

/* ---------- jobs and soft limits ---------- */

function handleSnapshotEvent(snapshot) {
  jobsById.clear();
  for (const job of snapshot.jobs ?? []) jobsById.set(job.id, job);
  jobWarnings = snapshot.warnings ?? [];
  if (snapshot.persistError) jobWarnings = [...jobWarnings, `Settings could not be saved: ${snapshot.persistError}`];
  renderJobPanel();
}

function handleJobEvent(job) {
  const wasActive = jobsById.get(job.id)?.status === "running";
  jobsById.set(job.id, job);
  if (job.kind !== "stream" && job.progress) updateArtifactDownloadProgress({ artifactId: job.artifactId, artifactName: job.artifactName, stage: job.stage, ...job.progress });
  if (job.status !== "running") {
    jobWaiters.get(job.id)?.forEach((resolve) => resolve(job));
    jobWaiters.delete(job.id);
    if (wasActive && job.kind === "stream" && job.status === "succeeded") jobsById.delete(job.id);
  }
  renderJobPanel();
}

function waitForJob(id) {
  return new Promise((resolve) => {
    const current = jobsById.get(id);
    if (current && current.status !== "running") return resolve(current);
    const list = jobWaiters.get(id) ?? [];
    list.push(resolve);
    jobWaiters.set(id, list);
    const poll = async () => {
      if (!jobWaiters.get(id)?.includes(resolve)) return;
      try {
        const { job } = await api(`/api/jobs/${encodeURIComponent(id)}`);
        if (job && job.status !== "running") {
          jobsById.set(id, job);
          jobWaiters.get(id)?.forEach((fn) => fn(job));
          jobWaiters.delete(id);
          renderJobPanel();
          return;
        }
      } catch {
        /* the SSE stream will deliver the result after reconnect */
      }
      setTimeout(poll, 3000);
    };
    setTimeout(poll, 3000);
  });
}

function formatLimitValue(value, unit) {
  if (unit === "bytes") return formatBytes(value);
  if (unit === "seconds") return `${value}s`;
  return Number(value).toLocaleString();
}

function installJobPanel() {
  if (jobPanel) return;
  jobPanel = document.createElement("aside");
  jobPanel.className = "job-panel";
  jobPanel.setAttribute("aria-label", "Background jobs");
  jobPanel.setAttribute("aria-live", "polite");
  jobPanel.hidden = true;
  document.body.append(jobPanel);
  // Keep toasts above the panel rather than overlapping it in the same corner.
  new ResizeObserver(() => {
    const height = jobPanel.hidden ? 0 : jobPanel.offsetHeight;
    document.documentElement.style.setProperty("--job-panel-offset", height ? `${height + 8}px` : "0px");
  }).observe(jobPanel);
  jobPanel.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-job-action]") : null;
    if (!button) return;
    const id = button.dataset.jobId;
    const action = button.dataset.jobAction;
    if (action === "cancel") void jobCommand(id, "cancel");
    else if (action === "retry") void retryJob(id);
    else if (action === "dismiss") {
      jobsById.delete(id);
      renderJobPanel();
    }
  });
  jobPanel.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.dataset.limitKind) return;
    event.preventDefault();
    void submitLimit(form);
  });
}

async function jobCommand(id, command) {
  try {
    await api(`/api/jobs/${encodeURIComponent(id)}/${command}`, { method: "POST", body: {} });
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), "error");
  }
}

async function retryJob(id) {
  const job = jobsById.get(id);
  if (!job || job.kind === "stream") return;
  try {
    const started = await api("/api/artifacts/inspect", {
      method: "POST",
      body: { artifactId: job.artifactId, repository: job.repository },
    });
    jobsById.set(started.job.id, started.job);
    if (started.job.id !== id) jobsById.delete(id);
    renderJobPanel();
    showToast("Retrying. A completed download is reused instead of fetched again.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), "error");
  }
}

async function submitLimit(form) {
  const kind = form.dataset.limitKind;
  const unit = form.dataset.limitUnit;
  const raw = Number(new FormData(form).get("value"));
  const value = unit === "bytes" ? Math.round(raw * 1024 * 1024) : Math.round(raw);
  const response = await fetch("/api/limits", {
    method: "PUT",
    headers: { "content-type": "application/json", "x-pr-artifact-explorer-token": capabilityToken },
    body: JSON.stringify({ kind, value }),
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 409) {
    showToast(`That is below the current live value. The new minimum is ${formatLimitValue(payload.minimum, unit)}.`, "error");
    const input = form.querySelector("input");
    if (input) input.min = String(unit === "bytes" ? Math.ceil(payload.minimum / 1048576) : payload.minimum);
    return;
  }
  if (!response.ok) {
    showToast(payload.error ?? "The limit could not be saved.", "error");
    return;
  }
  showToast(`${LIMIT_LABELS[kind] ?? kind} limit raised. Work was not interrupted.`);
  if (payload.limits) handleSnapshotLimits(payload.limits);
}

const LIMIT_LABELS = {
  downloadBytes: "Download size",
  zipEntries: "ZIP entries",
  centralDirectoryBytes: "ZIP directory size",
  streamedEntryBytes: "Decompressed file size",
  idleSeconds: "Idle warning",
};

function handleSnapshotLimits() {
  renderJobPanel();
}

function jobCardHtml(job) {
  const active = job.status === "running";
  const pct = Number.isFinite(job.progress?.percent) ? Math.max(0, Math.min(100, job.progress.percent)) : null;
  const title = job.kind === "stream" ? `Decompressing ${job.artifactName}` : job.artifactName;
  const prompts = (job.prompts ?? [])
    .map((prompt) => {
      const min = prompt.unit === "bytes" ? Math.ceil(prompt.minimum / 1048576) : prompt.minimum;
      const unitLabel = prompt.unit === "bytes" ? "MiB" : prompt.unit === "seconds" ? "seconds" : "";
      return `<form class="job-prompt" data-limit-kind="${escapeHtml(prompt.kind)}" data-limit-unit="${escapeHtml(prompt.unit)}">
        <div><strong>${escapeHtml(prompt.label)}</strong> is ${escapeHtml(formatLimitValue(prompt.current, prompt.unit))}, above your ${escapeHtml(formatLimitValue(prompt.limit, prompt.unit))} warning. ${active ? "Work is continuing." : ""} Allow a larger value (at least ${escapeHtml(formatLimitValue(prompt.minimum, prompt.unit))}).</div>
        <label>New limit ${unitLabel ? `(${unitLabel})` : ""} <input type="number" name="value" min="${min}" value="${min}" required class="form-control input-sm"></label>
        <button type="submit" class="app-button app-button-small">Allow larger</button>
      </form>`;
    })
    .join("");
  const status = { running: "Running", succeeded: "Done", failed: "Failed", cancelled: "Cancelled", interrupted: "Interrupted" }[job.status] ?? job.status;
  const progress = job.progress ?? {};
  const received = Number(progress.receivedBytes) || 0;
  const total = Number(progress.totalBytes) || 0;
  const rate = Number(progress.bytesPerSecond) || 0;
  const eta = formatRemainingTime(progress.etaSeconds);
  const leftDetail = pct == null ? "Working…" : `${Math.round(pct)}%${total ? ` · ${formatBytes(received)} of ${formatBytes(total)}` : received ? ` · ${formatBytes(received)}` : ""}`;
  const rightDetail = [rate > 0 ? `${formatBytes(rate)}/s` : "", eta ?? ""].filter(Boolean).join(" · ");
  const stage = job.stage && active ? String(job.stage).replace(/^./, (c) => c.toLocaleUpperCase()) : "";
  const meta = [stage, job.attempt > 1 ? `Attempt ${job.attempt}` : "", job.repository ?? ""].filter(Boolean).join(" · ");
  return `<section class="job-card" data-job-id="${escapeHtml(job.id)}" data-status="${escapeHtml(job.status)}">
    <div class="job-card-head">
      ${icon(job.kind === "stream" ? "file-zip" : "download", "job-card-icon")}
      <div class="job-card-title">
        <strong title="${escapeHtml(title)}">${escapeHtml(title)}</strong>
        ${meta ? `<span class="job-meta">${escapeHtml(meta)}</span>` : ""}
      </div>
      <span class="job-status" data-status="${escapeHtml(job.status)}">${escapeHtml(status)}</span>
    </div>
    ${active ? `<progress ${pct == null ? "" : `value="${pct}" max="100"`} aria-label="Progress for ${escapeHtml(title)}"></progress>
    <div class="job-progress-meta"><span>${escapeHtml(leftDetail)}</span><span>${escapeHtml(rightDetail)}</span></div>` : ""}
    ${job.error ? `<div class="job-error">${escapeHtml(job.error)}</div>` : ""}
    ${prompts}
    <div class="job-actions">
      ${active ? `<button type="button" class="app-button app-button-small" data-job-action="cancel" data-job-id="${escapeHtml(job.id)}">Cancel</button>` : ""}
      ${!active && job.kind !== "stream" && job.status !== "succeeded" ? `<button type="button" class="app-button app-button-small app-button-primary" data-job-action="retry" data-job-id="${escapeHtml(job.id)}">Retry</button>` : ""}
      ${!active ? `<button type="button" class="app-button app-button-small" data-job-action="dismiss" data-job-id="${escapeHtml(job.id)}">Dismiss</button>` : ""}
    </div>
  </section>`;
}

function renderJobPanel() {
  if (!jobPanel) return;
  const visible = [...jobsById.values()].filter((job) => job.status === "running" || job.status === "failed" || job.status === "interrupted" || (job.prompts?.length ?? 0) > 0);
  const warnings = jobWarnings.map((text) => `<div class="flash flash-warn">${escapeHtml(text)}</div>`).join("");
  jobPanel.hidden = visible.length === 0 && !warnings;
  if (jobPanel.contains(document.activeElement) && document.activeElement.tagName === "INPUT") return;
  const running = visible.filter((job) => job.status === "running").length;
  const heading = running ? `${running} running` : `${visible.length} need${visible.length === 1 ? "s" : ""} attention`;
  jobPanel.innerHTML = `<header class="job-panel-head"><strong>Background jobs</strong>${visible.length ? `<span class="Counter">${escapeHtml(heading)}</span>` : ""}</header>
    <div class="job-panel-body">${warnings}${visible.map(jobCardHtml).join("")}</div>`;
}

/* ---------- docs ---------- */

const SHORTCUT_REFERENCE = `<dl class="kbd-list">
  <dt><kbd>?</kbd></dt><dd>Show or hide shortcuts</dd>
  <dt><kbd>g</kbd> then <kbd>d</kbd></dt><dd>Open Docs</dd>
  <dt><kbd>g</kbd> then <kbd>b</kbd></dt><dd>Open Browser</dd>
  <dt><kbd>/</kbd></dt><dd>Focus the address box</dd>
  <dt><kbd>Alt</kbd> + <kbd>←</kbd> / <kbd>→</kbd></dt><dd>Go back / forward</dd>
  <dt><kbd>Ctrl</kbd> + <kbd>R</kbd></dt><dd>Refresh the preview</dd>
  <dt><kbd>+</kbd> / <kbd>−</kbd> / <kbd>0</kbd></dt><dd>Zoom in / out / reset</dd>
  <dt><kbd>Shift</kbd> + <kbd>S</kbd></dt><dd>Take a screenshot</dd>
  <dt><kbd>Shift</kbd> + <kbd>C</kbd></dt><dd>Toggle controlled browser</dd>
</dl>`;

function docsFigure(filename, alt, caption, width, height) {
  const altText = String(alt).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<figure class="docs-figure"><img src="/assets/docs/${filename}.png" alt="${altText}" width="${width}" height="${height}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;
}

const DOCS_SECTIONS = [
  ["overview", "Getting started", `
    <p class="docs-lead">Start with the change you want to understand. Open a pull request, inspect its build artifacts, or bring a local website into the browser—without leaving the canvas.</p>
    <h2>Your first look</h2>
    <ol class="docs-steps">
      <li><strong>Find your repository.</strong> Use the field in the header to enter <code>owner/repository</code>, or paste a GitHub pull request URL. You can also press <kbd>g</kbd> then <kbd>b</kbd> and enter a request such as <code>open PR 123 in github/awesome-copilot</code>.</li>
      <li><strong>Open the pull request.</strong> Choose a change from the list to see its workflow artifacts. An issue URL opens issue details instead; issues do not have PR artifacts.</li>
      <li><strong>No pull request?</strong> Choose the <strong>Workflow runs</strong> tab to browse scheduled (cron), manual, push and release runs, then open a run to see its artifacts.</li>
      <li><strong>Choose what to inspect.</strong> Open an artifact to browse its files or preview a supported file. A website artifact with an HTML page shows a <strong>Browser view</strong> button in the preview toolbar for a closer look at different screen sizes. Videos (.webm, .mp4, .mov) play with native controls, and JUnit XML test reports open as a summarized report.</li>
    </ol>
    <p>Artifact Explorer reads build outputs. It does <strong>not</strong> run artifact programs, install their dependencies, or execute their build scripts.</p>
    <h2>Already have a page running?</h2>
    <p>Press <kbd>g</kbd> then <kbd>b</kbd> (or open a localhost link, an agent request, or a shared route), enter an HTTP(S) or localhost URL, and press Enter. Keep your development server running on the same machine as the preview service.</p>
    ${docsFigure("preview-controls", "Artifact Explorer previewing a sample localhost website, with Mobile selected and compact navigation, zoom, Screenshot and Options controls.", "The redesigned browser, showing a sample localhost page and illustrative account/repository metadata.", 882, 480)}
    <div class="docs-next"><strong>Where next?</strong><a href="#/docs/artifacts">Open a PR or artifact</a><a href="#/docs/browser">Preview a local website</a></div>`],
  ["artifacts", "PRs and artifacts", `
    <p class="docs-lead">Move from a proposed change to the files it produced. A repository, PR URL, artifact link, or plain-language request can be your starting point.</p>
    <h2>Open a pull request</h2>
    <ol class="docs-steps">
      <li><strong>Choose a repository.</strong> Enter <code>github/awesome-copilot</code> in the header, or use the repository quick switch. Pins and favorites make frequently used repositories easier to return to.</li>
      <li><strong>Find the change.</strong> Select a pull request from the list. To go straight to one, paste its GitHub URL or enter <code>open PR 123</code> in the address bar (<kbd>g</kbd> then <kbd>b</kbd>) using the current repository context.</li>
      <li><strong>Inspect an artifact.</strong> Choose an available workflow artifact, then browse the file list. Select a supported file to read, watch, or preview it. Use <strong>Raw</strong> beside Download to see the original source or a bounded hex view; Preview returns to the rendered view.</li>
    </ol>
    <h2>Jump straight to an artifact</h2>
    <p>Paste a GitHub artifact URL or an Explorer share route into the address field. Explorer resolves the target; you do not need to reconstruct its local preview address.</p>
    <h2>When an artifact is missing</h2>
    <p>Check that the workflow completed and uploaded an artifact. Availability also depends on your account’s repository access and the artifact’s retention period. Keep the original workflow or PR open when you need to confirm those details.</p>
    <div class="docs-next"><strong>Keep exploring</strong><a href="#/docs/runs">Browse runs without a PR</a><a href="#/docs/sharing">Share a specific view</a><a href="#/docs/jobs">Understand background downloads</a></div>`],
  ["runs", "Runs without a PR", `
    <p class="docs-lead">Not every workflow run belongs to a pull request. Scheduled (cron), manually dispatched, push and release runs often produce the artifacts you want, and Explorer can open them directly.</p>
    <h2>Browse a repository's runs</h2>
    <ol class="docs-steps">
      <li><strong>Open the tab.</strong> Choose a repository, then select <strong>Workflow runs</strong> beside Pull requests. You can also press <kbd>g</kbd> then <kbd>b</kbd> and enter a request such as <code>show scheduled runs in github/awesome-copilot</code>, or paste a GitHub <code>/actions</code> or <code>/actions/runs/123</code> link.</li>
      <li><strong>Narrow the list.</strong> Use the Event (Scheduled, Manual, Push, Release and more), Status, Workflow and Branch filters. In Branch, start typing to find a branch; suggestions come from the repository, and the default branch is listed first. <strong>Hide PR runs</strong> and <strong>Has artifacts</strong> start on, so you see runs that have no pull request and produced something to inspect. Select either button to turn it off, or <strong>Clear filters</strong> to reset the pickers.</li>
      <li><strong>Open a run.</strong> The run page lists its artifacts. Inspect one to browse its files, preview it, use Browser view, copy a share link, or re-run the workflow, exactly as you would from a pull request.</li>
    </ol>
    <h2>Find runs that have artifacts</h2>
    <p>Each row shows how many artifacts its run produced once that count loads. Because <strong>Has artifacts</strong> is on by default, runs with none are hidden on the current page; if that hides every run, Explorer says so and offers to show them or check older runs. A run that was triggered by a pull request shows a link to that PR.</p>
    <h2>Limits worth knowing</h2>
    <p>Each page shows 30 runs, and GitHub exposes only the newest 1,000 runs for a filtered search. Artifacts expire after the repository's retention period, so an old scheduled run may list its artifacts as expired.</p>
    <div class="docs-next"><strong>Next</strong><a href="#/docs/sharing">Share a run or artifact</a><a href="#/docs/recovery">Re-run a workflow</a></div>`],
  ["browser", "Pages and device sizes", `
    <p class="docs-lead">See the page, not a wall of controls. The address bar handles navigation; the second row gives you device size, visual zoom, and a screenshot.</p>
    <h2>Preview a local or published page</h2>
    <ol class="docs-steps">
      <li><strong>Start your site.</strong> Keep your local development server running, or use an existing HTTP(S) address.</li>
      <li><strong>Open the address bar.</strong> Press <kbd>g</kbd> then <kbd>b</kbd>, or use <strong>Browser view</strong> on an HTML artifact. Enter a URL such as <code>http://localhost:3000</code> and press Enter. A short localhost address such as <code>localhost:3000</code> works too.</li>
      <li><strong>Navigate.</strong> Use Back, Forward, and Refresh for addresses opened through the toolbar. Use the page’s own controls for navigation inside an embedded page; cross-origin history is not observable by Explorer.</li>
    </ol>
    <h2>Size and zoom do different jobs</h2>
    <p><strong>Device size changes the layout.</strong> Mobile uses 390 × 844 CSS pixels, Tablet 768 × 1024, and Desktop 1440 × 900. Native follows the panel. Choose Custom to reveal width and height in Options; Rotate switches orientation.</p>
    <p><strong>Zoom changes only what you see.</strong> The − and + buttons scale the preview without changing its CSS viewport. In Options, Fit makes it fit the available width, and 100% resets the visual scale.</p>
    ${docsFigure("preview-controls", "Mobile preview controls with visual zoom separate from the device preset.", "Sample mobile preview: the device sets the page layout; zoom adjusts its display size.", 882, 480)}
    <h2>Open it in your default browser</h2>
    <p>Choose <strong>Options → Open in default browser</strong> to open the current page in your operating system’s browser. For a website artifact, Explorer restarts its local preview with your current light or dark theme and keeps the same route, query and hash. That local server runs only while Artifact Explorer is open; it is not a published site.</p>
    <h2>Theme</h2>
    <p>Explorer’s own controls follow the canvas theme. Website artifacts it serves, and its fresh screenshots and controlled Chromium, follow the current light or dark setting and update when it changes. External websites keep their own theme rules.</p>
    <h2>If the page will not embed</h2>
    <p>Some sites deliberately refuse to appear in an iframe. Explorer reports the restriction rather than bypassing it. Open <strong>Options → Controlled browser</strong> to use an isolated Chromium view with its own real history.</p>
    <div class="docs-next"><strong>Next</strong><a href="#/docs/screenshots">Capture the right page state</a><a href="#/docs/recovery">Fix a blank or unavailable preview</a></div>`],
  ["sharing", "Sharing a view", `
    <p class="docs-lead">Give a teammate the change and the view you meant—not a temporary local address they cannot open.</p>
    <h2>Share the preview</h2>
    <ol class="docs-steps">
      <li><strong>Set up the view.</strong> Open the page or website artifact and choose its device preset, custom size, and zoom.</li>
      <li><strong>Copy its route.</strong> Open <strong>Options → Copy share link</strong>. Explorer includes the view settings. For a website artifact, it uses the stable artifact route instead of the local preview port.</li>
      <li><strong>Open it in Explorer.</strong> Your teammate can paste the copied route into the address field. They still need access to the repository and an available artifact. A shared localhost URL needs a running server on their own machine.</li>
    </ol>
    <h2>Share the GitHub context</h2>
    <p>The copy button beside a title copies the title alone. The linked <strong>#number</strong> opens the canonical GitHub issue or PR; its adjacent copy button copies that GitHub link. Use those when the conversation is about the change rather than a particular preview.</p>
    <h2>If clipboard access is blocked</h2>
    <p>Explorer offers a manual-copy dialog with selectable text. Copy that text using your browser’s standard shortcut, then close the dialog. The route is the same one the copy action would have written.</p>
    <div class="docs-next"><strong>Next</strong><a href="#/docs/screenshots">Attach visual evidence</a></div>`],
  ["screenshots", "Taking screenshots", `
    <p class="docs-lead">A useful screenshot tells the reviewer what they are seeing. Choose the viewport first, and be clear about whether you captured a fresh render or the controlled browser’s current state.</p>
    <h2>Capture a page</h2>
    <ol class="docs-steps">
      <li><strong>Open the address.</strong> Choose the device preset or custom dimensions you want to document. Visual zoom does not change the capture’s viewport.</li>
      <li><strong>Choose the capture mode.</strong> Normal Browser loads the URL fresh in headless Chromium. <strong>Options → Controlled browser</strong> captures the isolated browser’s current page state instead.</li>
      <li><strong>Select Screenshot.</strong> The saved result appears below the preview. Its caption identifies the capture mode, viewport, and saved file path; use the thumbnail link to download it.</li>
    </ol>
    ${docsFigure("preview-options", "Preview Options showing viewport dimensions, Rotate, Fit, 100%, Controlled browser, Copy share link and Keyboard shortcuts, with Screenshot visible in the toolbar.", "Options keeps secondary controls together. This capture uses a sample localhost page and illustrative account metadata.", 882, 480)}
    <h2>Fresh render or current state?</h2>
    <p><strong>Fresh render</strong> starts from the address again. It does not include an unsaved form, scroll position, or other live iframe state. Explorer cannot read that state across origins.</p>
    <p><strong>Controlled current state</strong> captures the isolated Chromium session, not the embedded iframe. A form edited only in the iframe is not transferred when you switch modes.</p>
    <details class="docs-details"><summary>Set up Chromium if capture is unavailable</summary><p>Setup is explicit; Explorer does not install anything silently. Run <code>npm install</code> in the extension folder (installs optional <code>playwright-core</code>) and <code>npx playwright-core install chromium</code>.</p><p>You can set <code>PR_ARTIFACT_EXPLORER_CHROMIUM</code> to a Chromium or Chrome executable. The old <code>PR_ARTIFACT_EXPLORER_PLAYWRIGHT</code> variable is no longer supported and must be unset. Installed Chrome and Edge are tried as a fallback.</p><p>Files are saved in the session’s <code>artifact-explorer-screenshots</code> folder.</p></details>`],
  ["jobs", "Work that keeps going", `
    <p class="docs-lead">You can keep reviewing while an artifact downloads. Downloads, extraction, and indexing run as background jobs; leaving the page or restarting the canvas does not cancel them. Their progress appears in a panel at the bottom right showing percent, bytes, speed and time left.</p>
    <h2>A warning is not a stop sign</h2>
    <p>Soft limits flag work larger or slower than your current warning settings: download size, ZIP entry count, directory size, decompressed file size, and idle time. When a limit is crossed, the job panel shows the live value and <strong>work continues</strong>.</p>
    <ol class="docs-steps">
      <li><strong>Read the live minimum.</strong> The prompt shows what the job has already reached. That number can rise while you decide.</li>
      <li><strong>Allow a larger value.</strong> Enter a new limit at least as large as the current minimum, then select <strong>Allow larger</strong>. If the live value has overtaken your entry, Explorer shows the new minimum.</li>
      <li><strong>Continue reviewing—or cancel deliberately.</strong> Navigate elsewhere while the job progresses. Use <strong>Cancel</strong> only when you want to stop that job.</li>
    </ol>
    ${docsFigure("continuing-job", "A running sample site-preview download at 65%, with a Download size warning, a live minimum of 272 MiB, an Allow larger action and a separate Cancel button.", "Illustrative job data: the sample download has exceeded a 256 MiB warning. Its live minimum is 272 MiB; work is still continuing.", 420, 257)}
    <h2>What can actually stop a job?</h2>
    <p>Cancel is explicit. Corrupt archives, CRC mismatches, unsafe paths, integrity failures, and a real lack of disk space are true errors—not warnings that can be dismissed by raising a limit.</p>
    <h2>After an interruption</h2>
    <p>An unexpected exit can leave a job marked <strong>Interrupted</strong>. Choose <strong>Retry</strong> to resume the workflow; a completed download can be reused. Failed jobs keep their error visible so you can fix the cause before retrying.</p>
    <div class="docs-next"><strong>Need to reconnect?</strong><a href="#/docs/recovery">Restart and recover safely</a></div>`],
  ["recovery", "Troubleshooting", `
    <p class="docs-lead">Start with the message beside the preview or job. It usually tells you whether to check the server, change browser mode, or retry the work.</p>
    <h2>The preview is blank or unreachable</h2>
    <ol class="docs-steps">
      <li><strong>Check the address.</strong> Use HTTP(S), confirm the port, and keep the local server running on the preview service’s machine.</li>
      <li><strong>Refresh the page.</strong> Use the browser row’s Refresh action after the server is ready.</li>
      <li><strong>Read an embedding warning.</strong> If the site refuses iframes, choose <strong>Options → Controlled browser</strong>. Raising a download limit cannot fix an embedding restriction.</li>
    </ol>
    <h2>The canvas is reconnecting</h2>
    <p>Wait for the connection to return. If you need a clean canvas restart, open <strong>More → Restart canvas</strong>. Running downloads continue independently; restart is not a substitute for Cancel.</p>
    <h2>A job failed or an artifact is unavailable</h2>
    <p>Check the error, repository access, workflow result, and artifact retention. For a recoverable failed or interrupted job, use Retry. Integrity and disk-space errors need their underlying cause resolved first.</p>
    <h2>Re-run a workflow</h2>
    <p>Each artifact row, and each run page, has a <strong>Re-run</strong> button. It opens a confirmation naming the repository, workflow, run number, attempt and commit. Choose all jobs or, for failed runs, failed jobs only. A re-run reuses the original commit, ref and triggering actor, not the pull request's latest head, and GitHub allows it up to 30 days after the original run and at most 50 re-runs. Nothing is sent until you confirm, and existing artifacts are kept until the new run produces replacements. The button only requests the re-run; it does not mean new artifacts are ready. Your token may lack Actions write permission, in which case GitHub's refusal is shown.</p>
    <h2>A screenshot failed</h2>
    <p>Open a reachable address before capturing, and check Chromium availability. See <a href="#/docs/screenshots">Taking screenshots</a> for explicit setup and the difference between fresh and current-state captures.</p>`],
  ["shortcuts", "Keyboard shortcuts", `
    <p class="docs-lead">Keep common actions close at hand. These shortcuts work when focus is in the Explorer, outside a text field—not inside the previewed website.</p>
    ${SHORTCUT_REFERENCE}
    <h2>Explorer history</h2>
    <p>The right-aligned <strong>Back</strong> and <strong>Forward</strong> buttons in the breadcrumb row move through Explorer's own views only, never the app or a previewed site. Opening a Browser view is one step; changing its URL, zoom, or size replaces that step. Browser view keeps a compact breadcrumb row with the same buttons (named "Back in Artifact Explorer"), separate from the address-bar "Back in site" and "Forward in site" buttons that move through the previewed website.</p>
    <h2>Navigate without a mouse</h2>
    <p>Use Tab to move through the header, address bar, and preview controls. Open <strong>Options</strong> or <strong>More</strong> with Enter, then Tab through their actions. Escape closes the menu and returns focus to its trigger.</p>
    <p>The <strong>g</strong> shortcuts are a sequence: press g, then the second key. Browser navigation, zoom, and capture shortcuts apply while Browser is open.</p>
    <div class="docs-next"><strong>New here?</strong><a href="#/docs/overview">Start with a guided first look</a><a href="#/docs/browser">Learn the preview controls</a></div>`],
];

function renderDocs(route) {
  const active = DOCS_SECTIONS.some(([id]) => id === route.section) ? route.section : DOCS_SECTIONS[0][0];
  setBreadcrumbs([{ label: "Artifact Explorer", href: pullsHashForRepository(bootstrapState.prefs.repository) }, { label: "Docs" }]);
  const [, , html] = DOCS_SECTIONS.find(([id]) => id === active);
  view.innerHTML = `<div class="docs-view">
    <nav class="docs-nav" aria-label="Documentation">
      <label class="sr-only" for="docs-search">Search this guide</label>
      <input class="form-control docs-search" id="docs-search" type="search" placeholder="Search this guide" autocomplete="off" aria-controls="docs-link-list">
      <label class="sr-only" for="docs-topic">Guide topic</label>
      <select class="form-select docs-topic-select" id="docs-topic">${DOCS_SECTIONS.map(([id, label]) => `<option value="${id}"${id === active ? " selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select>
      <div id="docs-link-list" class="docs-link-list">${DOCS_SECTIONS.map(([id, label]) => `<a href="#/docs/${id}" data-doc-topic="${id}"${id === active ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`).join("")}</div>
      <p id="docs-search-status" class="docs-search-status" role="status" hidden></p>
    </nav>
    <article class="docs-body"><h1>${escapeHtml(DOCS_SECTIONS.find(([id]) => id === active)[1])}</h1>${html}</article>
  </div>`;
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  document.getElementById("docs-topic").addEventListener("change", (event) => {
    location.hash = `#/docs/${event.target.value}`;
  });
  const searchText = new Map(DOCS_SECTIONS.map(([id, label, body]) => {
    const plain = new DOMParser().parseFromString(body, "text/html").body.textContent;
    return [id, `${label} ${plain}`.toLocaleLowerCase()];
  }));
  document.getElementById("docs-search").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLocaleLowerCase();
    const words = query.split(/\s+/).filter(Boolean);
    let count = 0;
    for (const link of view.querySelectorAll("[data-doc-topic]")) {
      const matches = words.every(word => searchText.get(link.dataset.docTopic).includes(word));
      link.hidden = !matches;
      if (matches) count += 1;
    }
    view.querySelector(".docs-nav").dataset.searching = String(Boolean(query));
    const status = document.getElementById("docs-search-status");
    status.hidden = !query;
    status.textContent = count ? `${count} matching topic${count === 1 ? "" : "s"}` : "No matching topics. Try “preview”, “share”, or “limits”.";
  });
}

/* ---------- issue ---------- */

async function renderIssue(route, sequence) {
  setBreadcrumbs([{ label: route.repository, href: pullsHashForRepository(route.repository) }, { label: `Issue #${route.issueNumber}` }]);
  loadingView();
  const payload = await api(`/api/issues/${route.issueNumber}?repo=${encodeURIComponent(route.repository)}`);
  if (sequence !== renderSequence) return;
  const issue = payload.issue;
  const pullLink = issue.isPullRequest ? `<p><a href="${pullHash(route.repository, issue.number)}">This is a pull request. Open its artifacts.</a></p>` : "";
  view.innerHTML = `<div class="issue-view">
    ${pageTitleHtml(issue.title, issue.number, issue.url)}
    <p class="page-subtitle">${escapeHtml(issue.state)} · opened by ${escapeHtml(issue.author ?? "unknown")} · ${issue.comments} comment(s)</p>
    ${issue.labels.length ? `<p>${issue.labels.map((l) => `<span class="Label">${escapeHtml(l)}</span>`).join(" ")}</p>` : ""}
    ${pullLink}
    <pre class="issue-body" style="white-space:pre-wrap">${escapeHtml(issue.body)}</pre>
  </div>`;
}

/* ---------- browser preview ---------- */

function disposeBrowser() {
  browserCleanup?.();
  browserCleanup = null;
  browserState = null;
}

function clampZoom(value) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}

function installDisclosurePopover(panelId, triggerId) {
  const panel = document.getElementById(panelId);
  const trigger = document.getElementById(triggerId);
  if (!panel || !trigger) return () => {};
  const position = (opening = false) => {
    if (opening !== true && !panel.matches(":popover-open")) return;
    const rect = trigger.getBoundingClientRect();
    const width = panel.offsetWidth || Number.parseFloat(getComputedStyle(panel).width) || 320;
    panel.style.maxHeight = `${Math.max(120, window.innerHeight - rect.bottom - 16)}px`;
    panel.style.top = `${rect.bottom + 6}px`;
    panel.style.left = `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`;
  };
  const toggle = (event) => {
    trigger.setAttribute("aria-expanded", String(event.newState === "open"));
    position();
  };
  const restoreFocus = (event) => {
    if (event.newState === "open") position(true);
    if (event.newState === "closed" && panel.contains(document.activeElement)) trigger.focus();
  };
  const dismiss = (event) => {
    if (event.key !== "Escape" || !panel.matches(":popover-open") || document.querySelector("dialog[open]")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    panel.hidePopover();
    trigger.focus();
  };
  panel.addEventListener("beforetoggle", restoreFocus);
  panel.addEventListener("toggle", toggle);
  window.addEventListener("resize", position);
  document.addEventListener("keydown", dismiss, true);
  return () => {
    panel.removeEventListener("toggle", toggle);
    panel.removeEventListener("beforetoggle", restoreFocus);
    window.removeEventListener("resize", position);
    document.removeEventListener("keydown", dismiss, true);
  };
}

function renderBrowser(route) {
  disposeBrowser();
  const initial = decodeViewClient(route.query.get("v"));
  const preset = BROWSER_PRESETS[initial.preset] ? initial.preset : localStorage.getItem("pae.preset") || "native";
  browserState = {
    url: initial.url ?? "",
    preset: BROWSER_PRESETS[preset] ? preset : "native",
    width: initial.width ?? BROWSER_PRESETS.custom.width,
    height: initial.height ?? BROWSER_PRESETS.custom.height,
    zoom: Number.isFinite(initial.zoom) ? clampZoom(initial.zoom) : 1,
    fit: !Number.isFinite(initial.zoom),
    orientation: initial.orientation === "landscape" ? "landscape" : "portrait",
    history: [],
    index: -1,
    shots: [],
    probe: null,
    controlled: false,
  };
  setBreadcrumbs([{ label: "Artifact Explorer", href: pullsHashForRepository(bootstrapState.prefs.repository) }, { label: "Browser" }]);
  const state = browserState;
  view.innerHTML = `<div class="browser-view">
    <h1 class="sr-only">Browser preview</h1>
    <div class="browser-toolbar" aria-label="Browser controls">
      <div class="browser-navigation" role="group" aria-label="Page navigation">
      <button type="button" class="icon-button" id="br-back" aria-label="Back in site (Alt+Left)" title="Back in site (Alt+←)">${icon("arrow-left")}</button>
      <button type="button" class="icon-button" id="br-forward" aria-label="Forward in site (Alt+Right)" title="Forward in site (Alt+→)">${icon("arrow-right")}</button>
      <button type="button" class="icon-button" id="br-refresh" aria-label="Refresh" title="Refresh">${icon("sync")}</button>
      <form id="br-form"><input class="form-control browser-address" id="br-address" aria-label="Address or request" title="Enter a URL or a request like “open PR 12”" placeholder="Enter a URL or request" value="${escapeHtml(state.url)}" autocomplete="off"></form>
      </div>
      <div class="browser-view-controls" role="group" aria-label="Preview controls">
      <select class="form-select" id="br-preset" aria-label="Device preset">${Object.entries(BROWSER_PRESETS).map(([id, p]) => `<option value="${id}"${id === state.preset ? " selected" : ""}>${escapeHtml(id === "native" ? "Native" : p.label.split(" ")[0])}</option>`).join("")}</select>
      <div class="browser-zoom-controls" role="group" aria-label="Visual zoom">
      <button type="button" class="icon-button" id="br-zoom-out" aria-label="Zoom out (-)" title="Zoom out (-)">−</button>
      <span class="browser-zoom-label" id="br-zoom-label" aria-live="polite"></span>
      <button type="button" class="icon-button" id="br-zoom-in" aria-label="Zoom in (+)" title="Zoom in (+)">+</button>
      </div>
      <span class="browser-controls-spacer"></span>
      <button type="button" class="app-button" id="br-shot" aria-label="Screenshot" title="Screenshot (Shift+S)">${icon("device-camera")}<span class="browser-shot-label">Screenshot</span></button>
      <button type="button" class="app-button app-button-invisible" id="br-options-button" popovertarget="br-options" aria-expanded="false" aria-controls="br-options" title="Preview options">Options ${icon("chevron-down")}</button>
      </div>
    </div>
    <div id="br-options" class="explorer-popover browser-options" popover aria-label="Preview options">
      <section class="popover-section" aria-label="Viewport">
        <h2>Viewport</h2>
        <div class="browser-status" id="br-status" role="status"></div>
        <div class="browser-dimensions" id="br-dimensions" hidden>
          <label for="br-width">Width <input type="number" class="form-control" id="br-width" min="200" max="4000" aria-label="Width" value="${state.width}"></label>
          <span aria-hidden="true">×</span>
          <label for="br-height">Height <input type="number" class="form-control" id="br-height" min="200" max="4000" aria-label="Height" value="${state.height}"></label>
        </div>
        <div class="popover-button-row">
          <button type="button" class="app-button" id="br-rotate" aria-label="Rotate" title="Rotate viewport">${icon("device-mobile")}Rotate</button>
          <button type="button" class="app-button" id="br-fit" title="Fit to window">Fit</button>
          <button type="button" class="app-button" id="br-100" title="Reset zoom (0)">100%</button>
        </div>
      </section>
      <section class="popover-section" aria-label="Browser mode">
        <button type="button" class="popover-action" id="br-controlled" aria-pressed="false" title="Use an isolated controlled Chromium with real history; works for sites that refuse embedding (Shift+C)">${icon("browser")}Controlled browser<span class="toggle-state" aria-hidden="true"></span></button>
        <p class="popover-description">Use for sites that refuse embedding. Screenshots capture the current page state.</p>
      </section>
      <section class="popover-section" aria-label="Sharing and help">
        <button type="button" class="popover-action" id="br-copy" aria-label="Copy share link" title="Copy share route">${icon("copy")}Copy share link</button>
        <button type="button" class="popover-action" id="br-open-external" title="Open the current page in your operating system's default browser">${icon("link-external")}Open in default browser</button>
        <button type="button" class="popover-action" id="br-kbd" aria-label="Keyboard hints" aria-pressed="false" aria-expanded="false" aria-controls="br-hints" title="Keyboard hints (?)">${icon("keyboard")}Keyboard shortcuts</button>
        <div class="kbd-hints" id="br-hints" hidden>${SHORTCUT_REFERENCE}</div>
      </section>
    </div>
    <div class="browser-notice" id="br-notice" hidden></div>
    <div class="browser-stage" id="br-stage">
      <div class="browser-empty" id="br-empty"><strong>Open a page</strong><p>Enter an HTTP(S) or localhost URL in the address bar, or open a website artifact.</p></div>
      <div class="browser-scale-box" id="br-box"><iframe class="browser-frame" id="br-frame" title="Previewed page" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"></iframe><img class="browser-frame" id="br-cframe" alt="Controlled Chromium view" hidden></div>
    </div>
    <div class="browser-shots" id="br-shots" aria-label="Screenshots"></div>
  </div>`;

  const $ = (id) => document.getElementById(id);
  const frame = $("br-frame");
  const stage = $("br-stage");
  const cframe = $("br-cframe");
  const disposeOptions = installDisclosurePopover("br-options", "br-options-button");
  let controlledKey = "";

  function viewport() {
    const p = BROWSER_PRESETS[state.preset];
    let w = state.preset === "custom" ? state.width : p.width;
    let h = state.preset === "custom" ? state.height : p.height;
    if (state.preset === "native") {
      // Native follows the panel size only; zoom never changes the emulated viewport.
      w = Math.max(320, Math.floor(stage.clientWidth - 34));
      h = Math.max(480, Math.floor(window.innerHeight * 0.7));
    } else if (state.orientation === "landscape") {
      [w, h] = [h, w];
    }
    return { w, h };
  }

  function applyLayout() {
    const { w, h } = viewport();
    if (state.fit && state.preset !== "native") state.zoom = clampZoom(Math.min(1, (stage.clientWidth - 34) / w));
    if (state.preset === "native" && state.fit) state.zoom = 1;
    for (const el of [frame, cframe]) {
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.transform = `scale(${state.zoom})`;
      el.classList.toggle("is-mobile", state.preset === "mobile");
    }
    frame.hidden = state.controlled;
    cframe.hidden = !state.controlled;
    const box = $("br-box");
    box.style.width = `${w * state.zoom}px`;
    box.style.height = `${h * state.zoom}px`;
    $("br-zoom-label").textContent = `${Math.round(state.zoom * 100)}%`;
    $("br-width").disabled = $("br-height").disabled = state.preset !== "custom";
    $("br-dimensions").hidden = state.preset !== "custom";
    $("br-rotate").disabled = state.preset === "native";
    $("br-rotate").setAttribute("aria-pressed", String(state.orientation === "landscape"));
    $("br-fit").setAttribute("aria-pressed", String(state.fit));
    $("br-zoom-out").disabled = state.zoom <= ZOOM_MIN;
    $("br-zoom-in").disabled = state.zoom >= ZOOM_MAX;
    $("br-empty").hidden = Boolean(state.url);
    box.hidden = !state.url;
    $("br-back").disabled = !state.controlled && state.index <= 0;
    $("br-forward").disabled = !state.controlled && state.index >= state.history.length - 1;
    $("br-controlled").setAttribute("aria-pressed", String(state.controlled));
    const key = `${state.preset}:${w}x${h}`;
    if (state.controlled && controlledKey && key !== controlledKey) void syncControlled();
    controlledKey = key;
    const dpr = BROWSER_PRESETS[state.preset].dpr;
    $("br-status").textContent = `${w} × ${h} CSS px${dpr > 1 ? ` · ${dpr}× screenshot pixels` : ""}`;
    localStorage.setItem("pae.preset", state.preset);
    void api("/api/browser/state", { method: "POST", body: { url: state.url, preset: state.preset, width: w, height: h, zoom: state.zoom } }).catch(() => {});
    if (location.hash.startsWith("#/browser")) {
      const next = browserHash({ url: state.url || undefined, preset: state.preset, width: state.preset === "custom" ? state.width : undefined, height: state.preset === "custom" ? state.height : undefined, zoom: state.fit ? undefined : state.zoom });
      history.replaceState(null, "", next);
      if (typeof navHistory !== "undefined") navHistory.replaceBrowser(next);
    }
  }

  const controlledBody = () => {
    const { w, h } = viewport();
    return { preset: state.preset === "native" ? "custom" : state.preset, width: w, height: h, theme: resolvedCanvasTheme() };
  };

  async function showControlledFrame() {
    const res = await fetch("/api/controlled/frame", {
      method: "POST",
      headers: { "x-pr-artifact-explorer-token": capabilityToken, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(`Controlled view failed (${res.status}).`);
    const previous = cframe.src;
    cframe.src = URL.createObjectURL(await res.blob());
    if (previous.startsWith("blob:")) URL.revokeObjectURL(previous);
  }

  async function controlledCall(action, body = {}) {
    try {
      const { controlled } = await api(`/api/controlled/${action}`, { method: "POST", body });
      if (browserState !== state) return;
      if (controlled?.url) {
        state.url = controlled.url;
        $("br-address").value = controlled.url;
      }
      await showControlledFrame();
      applyLayout();
    } catch (error) {
      $("br-notice").hidden = false;
      $("br-notice").textContent = error instanceof Error ? error.message : String(error);
    }
  }

  const syncControlled = () => controlledCall("viewport", controlledBody());

  async function setControlled(on) {
    state.controlled = on;
    $("br-notice").hidden = true;
    applyLayout();
    if (on && state.url) await controlledCall("navigate", { url: state.url, ...controlledBody() });
    else if (!on && state.url) frame.src = state.url;
    else if (on) showToast("Controlled browser is ready. Enter an address.");
  }

  async function load(url, { push = true } = {}) {
    state.url = url;
    $("br-address").value = url;
    const notice = $("br-notice");
    notice.hidden = true;
    if (state.controlled) {
      if (push) {
        state.history = state.history.slice(0, state.index + 1);
        state.history.push(url);
        state.index = state.history.length - 1;
      }
      applyLayout();
      if (url) await controlledCall("navigate", { url, ...controlledBody() });
      return;
    }
    if (push) {
      state.history = state.history.slice(0, state.index + 1);
      state.history.push(url);
      state.index = state.history.length - 1;
    }
    applyLayout();
    if (!url) {
      frame.removeAttribute("src");
      return;
    }
    try {
      const probe = await api("/api/probe", { method: "POST", body: { url } });
      if (browserState !== state) return;
      if (!probe.reachable) {
        notice.hidden = false;
        notice.textContent = `${probe.reason} Check that the server is running, then press Refresh.`;
      } else if (!probe.embeddable) {
        notice.hidden = false;
        notice.textContent = `${probe.reason} This site refuses to be embedded, so it will appear blank here. The restriction is not bypassed. `;
        const open = document.createElement("button");
        open.type = "button";
        open.className = "btn btn-sm";
        open.textContent = "Open in controlled browser";
        open.addEventListener("click", () => void setControlled(true));
        notice.append(open);
      }
    } catch (error) {
      notice.hidden = false;
      notice.textContent = error instanceof Error ? error.message : String(error);
    }
    let owned = false;
    try {
      owned = (await api("/api/browser/owned", { method: "POST", body: { url } })).owned === true;
    } catch {
      owned = false;
    }
    if (browserState !== state) return;
    state.owned = owned;
    if (owned) frame.setAttribute("data-theme-aware-preview", "");
    else frame.removeAttribute("data-theme-aware-preview");
    frame.src = url;
  }

  async function submitAddress(text) {
    const value = text.trim();
    if (!value) return;
    if (/^https?:\/\//i.test(value)) return load(value);
    if (/^localhost(:\d+)?(\/|$)/i.test(value) || /^127\.0\.0\.1/.test(value)) return load(`http://${value}`);
    await navigateNaturalLanguage(value);
  }

  const go = (delta) => {
    if (state.controlled) return void controlledCall("history", { direction: delta < 0 ? "back" : "forward" });
    const next = state.index + delta;
    if (next < 0 || next >= state.history.length) return;
    state.index = next;
    void load(state.history[next], { push: false });
  };
  const refresh = () => {
    if (state.controlled) return void controlledCall("history", { direction: "refresh" });
    if (!state.url) return;
    try {
      frame.contentWindow.location.reload();
    } catch {
      frame.src = state.url;
    }
  };
  const setZoom = (value) => {
    state.fit = false;
    state.zoom = clampZoom(value);
    applyLayout();
  };
  const screenshot = async () => {
    if (!state.url) return showToast("Open an address first.", "error");
    const button = $("br-shot");
    button.disabled = true;
    const { w, h } = viewport();
    try {
      const { capture } = state.controlled
        ? await api("/api/controlled/screenshot", { method: "POST", body: { fullPage: false } })
        : await api("/api/capture", {
            method: "POST",
            body: { url: state.url, preset: state.preset === "native" ? "custom" : state.preset, width: w, height: h, fullPage: false, theme: resolvedCanvasTheme() },
          });
      const file = capture.path.split(/[\\/]/).pop();
      const src = `/api/screenshots/${file}?token=${encodeURIComponent(capabilityToken)}`;
      const res = await fetch(`/api/screenshots/${file}`, { headers: { "x-pr-artifact-explorer-token": capabilityToken } });
      const blobUrl = URL.createObjectURL(await res.blob());
      const figure = document.createElement("figure");
      figure.innerHTML = `<a href="${blobUrl}" download="${escapeHtml(file)}"><img alt="Screenshot of ${escapeHtml(capture.finalUrl ?? state.url)}" src="${blobUrl}"></a><figcaption>${capture.source === "controlled-current" ? "Current page state of the controlled Chromium" : "Fresh render (not the live frame's current state)"}, ${capture.viewport?.width ?? w}×${capture.viewport?.height ?? h}. Saved to ${escapeHtml(capture.path)}.</figcaption>`;
      $("br-shots").prepend(figure);
      void src;
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      button.disabled = false;
    }
  };

  $("br-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void submitAddress($("br-address").value);
  });
  $("br-back").addEventListener("click", () => go(-1));
  $("br-forward").addEventListener("click", () => go(1));
  $("br-refresh").addEventListener("click", refresh);
  $("br-preset").addEventListener("change", (event) => {
    state.preset = event.target.value;
    state.fit = true;
    applyLayout();
    if (state.preset === "custom") {
      $("br-options").showPopover();
      $("br-width").focus();
    }
  });
  $("br-width").addEventListener("change", (event) => {
    state.width = Number(event.target.value);
    applyLayout();
  });
  $("br-height").addEventListener("change", (event) => {
    state.height = Number(event.target.value);
    applyLayout();
  });
  $("br-rotate").addEventListener("click", () => {
    state.orientation = state.orientation === "portrait" ? "landscape" : "portrait";
    applyLayout();
  });
  $("br-zoom-out").addEventListener("click", () => setZoom(state.zoom - ZOOM_STEP));
  $("br-zoom-in").addEventListener("click", () => setZoom(state.zoom + ZOOM_STEP));
  $("br-100").addEventListener("click", () => setZoom(1));
  $("br-fit").addEventListener("click", () => {
    state.fit = true;
    applyLayout();
  });
  $("br-shot").addEventListener("click", () => void screenshot());
  $("br-controlled").addEventListener("click", () => void setControlled(!state.controlled));
  $("br-copy").addEventListener("click", () => {
    const { w, h } = viewport();
    const view = { preset: state.preset, width: state.preset === "custom" ? w : undefined, height: state.preset === "custom" ? h : undefined, zoom: state.fit ? undefined : state.zoom, orientation: state.orientation === "landscape" ? "landscape" : undefined };
    let sourceRoute = null;
    try {
      sourceRoute = state.url && state.owned ? sessionStorage.getItem("pae.shareRoute") : null;
    } catch {
      sourceRoute = null;
    }
    // Artifact previews live on an ephemeral local port, so share the stable artifact route instead.
    const route = sourceRoute ? `${sourceRoute}${sourceRoute.includes("?") ? "&" : "?"}v=${encodeViewClient(view)}` : browserHash({ ...view, url: state.url || undefined });
    void copyText(route, sourceRoute ? "Copied artifact share route" : "Copied share route");
  });
  $("br-open-external").addEventListener("click", async (event) => {
    if (!state.url) return showToast("Open an address first.", "error");
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await api("/api/browser/open-external", { method: "POST", body: { url: state.url, theme: resolvedCanvasTheme() } });
      showToast("Opened in your default browser");
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      button.disabled = false;
    }
  });
  frame.addEventListener("load", () => {
    if (frame.hasAttribute("data-theme-aware-preview")) syncPreviewTheme();
  });
  const stopThemeObserver = observeCanvasTheme((theme) => {
    if (state.controlled && browserState === state) {
      void api("/api/controlled/theme", { method: "POST", body: { theme } })
        .then(showControlledFrame)
        .catch((error) => showToast(`Theme sync failed: ${error instanceof Error ? error.message : error}`, "error"));
    }
  });
  $("br-kbd").addEventListener("click", (event) => {
    const hints = $("br-hints");
    hints.hidden = !hints.hidden;
    event.currentTarget.setAttribute("aria-pressed", String(!hints.hidden));
    event.currentTarget.setAttribute("aria-expanded", String(!hints.hidden));
    if (!hints.hidden && !$("br-options").matches(":popover-open")) $("br-options").showPopover();
  });

  const onResize = () => applyLayout();
  window.addEventListener("resize", onResize);
  state.api = { go, refresh, setZoom, screenshot, load, applyLayout, viewport, setControlled };
  browserCleanup = () => {
    window.removeEventListener("resize", onResize);
    stopThemeObserver();
    disposeOptions();
  };

  applyLayout();
  if (state.url) void load(state.url);
}

function handleBrowserCommand(command) {
  const state = browserState;
  if (!state?.api) {
    showToast("Open the browser with g then b first.", "error");
    return;
  }
  switch (command.command) {
    case "back":
      return state.api.go(-1);
    case "forward":
      return state.api.go(1);
    case "refresh":
      return state.api.refresh();
    case "zoom":
      if (Number.isFinite(command.zoom)) return state.api.setZoom(command.zoom);
      if (command.step) return state.api.setZoom(state.zoom + command.step * 0.25);
      if (command.fit) {
        state.fit = true;
        return state.api.applyLayout();
      }
      return undefined;
    case "viewport":
      if (BROWSER_PRESETS[command.preset]) {
        state.preset = command.preset;
        state.fit = true;
      }
      if (Number.isInteger(command.width)) state.width = command.width;
      if (Number.isInteger(command.height)) state.height = command.height;
      if (Number.isInteger(command.width) || Number.isInteger(command.height)) state.preset = "custom";
      document.getElementById("br-preset").value = state.preset;
      document.getElementById("br-width").value = state.width;
      document.getElementById("br-height").value = state.height;
      return state.api.applyLayout();
    case "screenshot":
      return state.api.screenshot();
    case "rotate":
      return document.getElementById("br-rotate")?.click();
    default:
      return undefined;
  }
}

/* ---------- global shortcuts ---------- */

function installGlobalShortcuts() {
  let chord = null;
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    if (event.key === "Escape" && typing) {
      target.blur();
      return;
    }
    if (typing || event.ctrlKey || event.metaKey) {
      if (event.ctrlKey && event.key.toLowerCase() === "r" && browserState?.api && !typing) {
        event.preventDefault();
        browserState.api.refresh();
      }
      return;
    }
    if (event.altKey && browserState?.api) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        browserState.api.go(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        browserState.api.go(1);
      }
      return;
    }
    if (chord) {
      const next = chord;
      chord = null;
      if (next === "g" && event.key === "d") location.hash = "#/docs";
      else if (next === "g" && event.key === "b") location.hash = "#/browser";
      return;
    }
    if (event.key === "g") {
      chord = "g";
      setTimeout(() => (chord = null), 1200);
    } else if (event.key === "/") {
      event.preventDefault();
      (document.getElementById("br-address") ?? repositoryInput)?.focus();
    } else if (event.key === "?") {
      const hints = document.getElementById("br-hints");
      if (hints) document.getElementById("br-kbd").click();
      else location.hash = "#/docs/shortcuts";
    } else if (browserState?.api) {
      if (event.key === "+" || event.key === "=") browserState.api.setZoom(browserState.zoom + ZOOM_STEP);
      else if (event.key === "-") browserState.api.setZoom(browserState.zoom - ZOOM_STEP);
      else if (event.key === "0") browserState.api.setZoom(1);
      else if (event.key === "S") void browserState.api.screenshot();
    else if (event.key === "C") void browserState.api.setControlled(!browserState.controlled);
    }
  });
}
