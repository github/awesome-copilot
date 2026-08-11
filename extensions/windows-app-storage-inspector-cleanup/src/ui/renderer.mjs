import { containsPath, findTreeStackForPath, getParentPath, normalizePath } from "./tree-navigation.mjs";

const treeNavigationClientSource = [normalizePath, containsPath, getParentPath, findTreeStackForPath]
    .map((helper) => helper.toString())
    .join("\n");

export function renderHtml(token) {
    return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Windows App Storage Inspector &amp; Cleanup</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--background-color-default, #fff);
      color: var(--text-color-default, #1f2328);
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      font-size: var(--text-body-medium, 14px);
      line-height: var(--leading-body-medium, 20px);
    }
    button, input, select { font: inherit; }
    button {
      border: 1px solid var(--border-color-default, #d0d7de);
      border-radius: 6px;
      background:
        linear-gradient(180deg, rgba(255,255,255,.12), rgba(0,0,0,.04)),
        var(--background-color-default, #fff);
      color: inherit;
      padding: 6px 12px;
      cursor: pointer;
      box-shadow: 0 0 0 1px rgba(9,105,218,.08), inset 0 1px 0 rgba(255,255,255,.18);
    }
    button:hover:not(:disabled) {
      background:
        linear-gradient(180deg, rgba(255,255,255,.18), rgba(0,0,0,.06)),
        var(--background-color-muted, #f6f8fa);
    }
    button:focus-visible, input:focus-visible, select:focus-visible {
      outline: 2px solid var(--color-focus-outline, #0969da);
      outline-offset: 2px;
    }
    button:disabled { cursor: not-allowed; opacity: .55; }
    .primary {
      color: var(--color-white, #fff);
      background:
        linear-gradient(180deg, rgba(255,255,255,.16), rgba(0,0,0,.08)),
        var(--true-color-blue, #0969da);
      border-color: rgba(9,105,218,.5);
      box-shadow: 0 0 0 1px rgba(9,105,218,.2), inset 0 1px 0 rgba(255,255,255,.2);
    }
    .primary:hover:not(:disabled) {
      background:
        linear-gradient(180deg, rgba(255,255,255,.2), rgba(0,0,0,.12)),
        var(--true-color-blue, #0969da);
      filter: brightness(.96);
    }
    .github-menu { position: relative; }
    .github-menu summary {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--border-color-default, #d0d7de);
      border-radius: 6px;
      padding: 6px 8px;
      color: inherit;
      text-decoration: none;
      background: var(--background-color-default, #fff);
      cursor: pointer;
      list-style: none;
    }
    .github-menu summary::-webkit-details-marker { display: none; }
    .github-menu summary:focus-visible { outline: 2px solid var(--color-focus-outline, #0969da); outline-offset: 2px; }
    .github-menu summary:hover, .github-menu summary:focus-visible, .github-menu[open] summary {
      background: var(--background-color-muted, #f6f8fa);
    }
    .github-icon {
      display: block;
      width: 18px;
      height: 18px;
      background: currentColor;
      -webkit-mask: url("/assets/github-mark-16.svg") center / contain no-repeat;
      mask: url("/assets/github-mark-16.svg") center / contain no-repeat;
    }
    .github-menu-items {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 5;
      min-width: 180px;
      padding: 4px;
      border: 1px solid var(--border-color-default, #d0d7de);
      border-radius: 6px;
      background: var(--background-color-default, #fff);
      box-shadow: 0 8px 24px rgba(31,35,40,.15);
    }
    .github-menu-items a {
      display: block;
      padding: 6px 8px;
      border-radius: 4px;
      color: inherit;
      text-decoration: none;
      white-space: nowrap;
    }
    .github-menu-items a:hover, .github-menu-items a:focus-visible {
      background: var(--background-color-muted, #f6f8fa);
    }
    .danger {
      color: var(--color-white, #fff);
      background:
        linear-gradient(180deg, rgba(255,255,255,.16), rgba(0,0,0,.08)),
        var(--true-color-red, #cf222e);
      border-color: rgba(207,34,46,.5);
      box-shadow: 0 0 0 1px rgba(207,34,46,.2), inset 0 1px 0 rgba(255,255,255,.2);
    }
    header {
      position: sticky;
      top: 0;
      z-index: 4;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-color-default, #d0d7de);
      background: var(--background-color-default, #fff);
    }
    h1 { margin: 0; font-size: var(--text-title-medium, 20px); line-height: 28px; }
    h2 { margin: 0 0 12px; font-size: var(--text-title-small, 16px); }
    .subtitle, .muted { color: var(--text-color-muted, #656d76); }
    .header-actions, .scope-options, .toolbar, .tabs, .modal-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .safety-options { display: grid; gap: 8px; }
    .safety-switch { display: inline-flex; align-items: center; gap: 8px; width: 100%; margin: 0; padding: 6px 9px; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 6px; cursor: pointer; }
    .safety-switch.direct-cleanup { border-color: var(--true-color-red, #cf222e); background: rgba(207,34,46,.08); }
    .safety-switch.direct-cleanup.enabled { border-color: #1a7f37; background: rgba(26,127,55,.1); }
    .safety-switch input { appearance: none; position: relative; flex: 0 0 auto; width: 34px; height: 18px; margin: 0; border-radius: 999px; background: var(--border-color-default, #d0d7de); cursor: pointer; }
    .safety-switch input::after { content: ""; position: absolute; top: 3px; left: 3px; width: 12px; height: 12px; border-radius: 50%; background: #fff; transition: transform .15s ease; }
    .safety-switch input:checked { background: #1a7f37; }
    .safety-switch input:checked::after { transform: translateX(16px); }
    .safety-switch input:disabled { cursor: not-allowed; opacity: .6; }
    .safety-switch strong { display: block; line-height: 16px; }
    .layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); min-height: calc(100vh - 65px); }
    aside { padding: 16px; border-right: 1px solid var(--border-color-default, #d0d7de); }
    main { min-width: 0; padding: 16px; }
    .panel {
      border: 1px solid var(--border-color-default, #d0d7de);
      border-radius: 8px;
      background:
        linear-gradient(135deg, rgba(9,105,218,.07), rgba(130,80,223,.035) 58%, transparent 100%),
        var(--background-color-default, #fff);
      overflow: hidden;
      margin-bottom: 16px;
    }
    .panel-header {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color-default, #d0d7de);
      background: linear-gradient(90deg, rgba(9,105,218,.055), transparent 82%);
    }
    .scan-analysis-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .panel-body { padding: 14px; }
    .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .stat { padding: 10px; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 6px; }
    .stat strong { display: block; font-size: 16px; }
    .status { display: inline-flex; align-items: center; gap: 6px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-color-muted, #656d76); }
    .dot.running { background: var(--true-color-blue, #0969da); animation: pulse 1.2s infinite; }
    .dot.completed { background: #1a7f37; }
    .dot.cancelled { background: #bf8700; }
    .dot.failed { background: var(--true-color-red, #cf222e); }
    @keyframes pulse { 50% { opacity: .35; } }
    .progress { height: 6px; margin: 10px 0; border-radius: 999px; overflow: hidden; background: var(--background-color-muted, #f6f8fa); }
    .progress > div { width: 35%; height: 100%; background: var(--true-color-blue, #0969da); animation: travel 1.4s infinite linear; }
    .command-progress { margin: 12px 0; }
    @keyframes travel { from { transform: translateX(-100%); } to { transform: translateX(290%); } }
    .scan-analysis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
    .scan-analysis .stat { text-align: left; }
    .scan-location { overflow-wrap: anywhere; font-family: var(--font-mono, Consolas, monospace); font-size: var(--text-code-inline, 12px); }
    label { display: block; margin: 8px 0 4px; font-weight: var(--font-weight-semibold, 600); }
    input[type="search"], select {
      width: 100%;
      min-width: 0;
      padding: 7px 9px;
      border: 1px solid var(--border-color-default, #d0d7de);
      border-radius: 6px;
      color: inherit;
      background: var(--background-color-default, #fff);
    }
    .scope-options label { margin: 0; font-weight: 400; }
    #treemap { width: 100%; height: 430px; display: block; background: var(--background-color-muted, #f6f8fa); }
    .graph-navigation { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .folder-up-button { flex: 0 0 auto; padding: 4px 8px; white-space: nowrap; }
    .crumbs { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; min-width: 0; }
    .crumbs button { padding: 4px 8px; color: var(--true-color-blue, #0969da); }
    .treemap-label { pointer-events: none; fill: white; font-family: var(--font-sans, sans-serif); font-weight: 600; }
    .treemap-size { pointer-events: none; fill: rgba(255,255,255,.85); font-family: var(--font-sans, sans-serif); }
    .treemap-cell { cursor: pointer; }
    .protected-folder-guidance { width: 100%; margin: 0; }
    .protected-folder-guidance .analyzer-link {
      color: var(--true-color-blue, #0969da);
      cursor: pointer;
      text-decoration: underline;
      font: inherit;
    }
    .selected-folder-details .folder-path { display: block; overflow-wrap: anywhere; }
    .tab { border-bottom: 2px solid transparent; border-radius: 6px 6px 0 0; }
    .tab.active { border-bottom-color: var(--true-color-blue, #0969da); font-weight: 600; }
    .table-wrap { overflow: auto; max-height: 500px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--border-color-default, #d0d7de); vertical-align: top; }
    th { position: sticky; top: 0; z-index: 1; background: var(--background-color-muted, #f6f8fa); white-space: nowrap; }
    td.path { max-width: 580px; overflow-wrap: anywhere; font-family: var(--font-mono, Consolas, monospace); font-size: var(--text-code-inline, 12px); }
    .path-navigation { color: inherit; text-decoration: none; overflow-wrap: anywhere; }
    .path-navigation:hover { color: var(--true-color-blue, #0969da); text-decoration: underline; }
    .empty { padding: 32px; text-align: center; color: var(--text-color-muted, #656d76); }
    .warning { border-left: 3px solid #bf8700; padding: 8px 10px; background: rgba(191,135,0,.09); margin: 6px 0; overflow-wrap: anywhere; }
    .error { border-left: 3px solid var(--true-color-red, #cf222e); padding: 8px 10px; background: var(--true-color-red-muted, rgba(207,34,46,.1)); margin: 8px 0; }
    .breakdown-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .analysis-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
    .analysis-stat { padding: 10px; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 6px; }
    .analysis-stat strong { display: block; font-size: 16px; }
    .analysis-section { margin-top: 14px; }
    .analysis-section h3 { margin: 0 0 8px; font-size: 14px; }
    details.expander > summary {
      cursor: pointer;
      padding: 12px 14px;
      font-weight: var(--font-weight-semibold, 600);
      border-bottom: 1px solid transparent;
    }
    details.expander[open] > summary { border-bottom-color: var(--border-color-default, #d0d7de); }
    .analyzer-toolbar { display: grid; grid-template-columns: minmax(180px, 320px) auto; gap: 8px; align-items: end; margin-bottom: 12px; }
    .analyzer-toolbar label { margin-top: 0; }
    .analyzer-cleanup { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color-default, #d0d7de); }
    .bar-list { display: grid; gap: 8px; }
    .bar-row { display: grid; grid-template-columns: minmax(90px, 1fr) minmax(100px, 2fr) auto; gap: 8px; align-items: center; }
    .bar-row button { text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-track { height: 8px; border-radius: 999px; overflow: hidden; background: var(--background-color-muted, #f6f8fa); }
    .bar-fill { height: 100%; min-width: 2px; border-radius: inherit; background: var(--true-color-blue, #0969da); }
    .cleanup-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; border-top: 1px solid var(--border-color-default, #d0d7de); }
    .categorizer-list { display: grid; gap: 8px; }
    .categorizer { padding: 8px; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 6px; }
    .categorizer strong, .categorizer span { display: block; }
    .item-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .item-actions button { width: 120px; min-width: 120px; text-align: center; }
    .selected-folder-actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px 12px; padding: 12px 14px; border-top: 1px solid var(--border-color-default, #d0d7de); background: rgba(9,105,218,.055); }
    .selected-folder-details { overflow-wrap: anywhere; }
    .selected-folder-actions .protected-folder-guidance { grid-column: 1 / -1; }
    .folder-explanation { padding: 14px; border-top: 1px solid var(--border-color-default, #d0d7de); }
    .folder-explanation h2, .folder-explanation h3 { margin: 0 0 8px; }
    .folder-explanation h3 { margin-top: 16px; font-size: 14px; }
    .folder-explanation ul { margin: 6px 0 0; padding-left: 22px; }
    .recommendation { display: inline-block; margin-bottom: 8px; padding: 3px 8px; border-radius: 999px; font-weight: var(--font-weight-semibold, 600); background: var(--background-color-muted, #f6f8fa); }
    .recommendation.safe { color: #1a7f37; background: rgba(26,127,55,.12); }
    .recommendation.conditional, .recommendation.unknown { color: #9a6700; background: rgba(191,135,0,.12); }
    .recommendation.not-recommended { color: var(--true-color-red, #cf222e); background: var(--true-color-red-muted, rgba(207,34,46,.1)); }
    .command-list { display: grid; gap: 10px; margin-top: 8px; }
    .command-card { padding: 10px; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 6px; background: var(--background-color-default, #fff); }
    .command-header { margin-bottom: 6px; }
    .command-line { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; }
    .icon-button { display: inline-grid; width: 32px; height: 32px; padding: 0; place-items: center; }
    .icon-button svg { width: 16px; height: 16px; fill: currentColor; }
    .command-card code { display: block; min-width: 0; padding: 8px; overflow-x: auto; white-space: pre-wrap; overflow-wrap: anywhere; border-radius: 4px; font-family: var(--font-mono, Consolas, monospace); background: var(--background-color-muted, #f6f8fa); }
    .command-output { margin: 8px 0 0; padding: 8px; max-height: 180px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; border-radius: 4px; font-family: var(--font-mono, Consolas, monospace); background: var(--background-color-muted, #f6f8fa); }
    .source-list a { overflow-wrap: anywhere; }
    dialog { width: min(760px, calc(100vw - 32px)); max-height: 80vh; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 10px; color: inherit; background: var(--background-color-default, #fff); }
    dialog::backdrop { background: rgba(0,0,0,.45); }
    .modal-list { max-height: 320px; overflow: auto; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 6px; padding: 8px; }
    .modal-entry { padding: 6px; border-bottom: 1px solid var(--border-color-default, #d0d7de); overflow-wrap: anywhere; }
    .modal-actions { justify-content: flex-end; margin-top: 14px; }
    .investigation-path { margin: 8px 0; }
    .investigation-response { max-height: 52vh; overflow: auto; margin-top: 14px; padding: 14px; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 6px; }
    #cleanupProgress > div { width: 0; animation: none; transform: none; transition: width .2s ease; }
    #cleanupCurrentPath { min-height: 20px; overflow-wrap: anywhere; font-family: var(--font-mono, Consolas, monospace); font-size: var(--text-code-inline, 12px); }
    @media (max-width: 850px) {
      .layout { grid-template-columns: 1fr; }
      aside { border-right: 0; border-bottom: 1px solid var(--border-color-default, #d0d7de); }
      .breakdown-grid { grid-template-columns: 1fr; }
      .analysis-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      #treemap { height: 340px; }
    }
  </style>
</head>
<body>
  <header>
    <div><h1>Windows App Storage Inspector &amp; Cleanup</h1><div class="subtitle">Windows-only · app storage in the local user profile and ProgramData</div></div>
  <div class="header-actions"><button id="cancelScan" hidden>Cancel scan</button><button id="startScan" class="primary">Scan storage</button><details class="github-menu"><summary aria-label="GitHub feedback and issues" title="Raise an issue or request a feature on GitHub"><span class="github-icon" aria-hidden="true"></span></summary><div class="github-menu-items"><a href="https://github.com/PlagueHO/plagueho.copilot/issues/new?template=bug_report.yml" target="_blank" rel="noopener noreferrer">Submit issue</a><a href="https://github.com/PlagueHO/plagueho.copilot/issues/new?template=feature_request.yml" target="_blank" rel="noopener noreferrer">Request feature</a></div></details></div>
  </header>
  <div class="layout">
    <aside>
      <section class="panel">
        <div class="panel-header"><strong>🗂️ Scan roots</strong></div>
        <div class="panel-body scope-options">
          <label><input id="scopeProfile" type="checkbox" checked /> User profile</label>
          <label><input id="scopeProgramData" type="checkbox" checked /> ProgramData</label>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><strong>🛡️ Cleanup safety</strong></div>
        <div class="panel-body safety-options">
          <label id="directCleanupSafety" class="safety-switch direct-cleanup" title="Direct file cleanup is disabled by default. Enable only after acknowledging the risk."><input id="directCleanupEnabled" type="checkbox" role="switch" /><span><strong>Allow Delete</strong></span></label>
          <label id="analyzerProtectionSafety" class="safety-switch" title="Prevent direct cleanup of folders managed by a custom analyzer."><input id="analyzerProtectionEnabled" type="checkbox" role="switch" checked /><span><strong>Protect analyzer folders</strong></span></label>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><strong>📊 Summary</strong></div>
        <div class="panel-body stats">
          <div class="stat"><strong id="totalSize">—</strong><span class="muted">Scanned</span></div>
          <div class="stat"><strong id="fileCount">—</strong><span class="muted">Files</span></div>
          <div class="stat"><strong id="reclaimable">—</strong><span class="muted">Candidates</span></div>
          <div class="stat"><strong id="warningCount">—</strong><span class="muted">Warnings</span></div>
          <div class="stat"><strong id="cloudOnly">—</strong><span class="muted">Cloud-only excluded</span></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><strong>🔎 Filters</strong></div>
        <div class="panel-body">
          <label for="search">Path or name</label><input id="search" type="search" placeholder="Filter results" />
          <label for="appFilter">Application</label><select id="appFilter"><option value="">All applications</option></select>
          <label for="categoryFilter">Category</label><select id="categoryFilter"><option value="">All categories</option></select>
        </div>
      </section>
      <section class="panel">
        <details class="expander">
          <summary>🏷️ Custom categorizers</summary>
          <div id="categorizerList" class="panel-body categorizer-list"><span class="muted">Loading...</span></div>
        </details>
      </section>
    </aside>
    <main>
      <section id="welcome" class="panel"><div class="empty"><h2>Windows-only storage analysis</h2><p>This canvas runs only on Windows. Scan the selected local roots to explore folders, file types, applications, and conservative cleanup candidates.</p><button id="welcomeStartScan" class="primary" type="button">Scan storage</button></div></section>
      <section id="scanAnalysis" class="panel" hidden>
        <div class="panel-header scan-analysis-header"><strong>🔄 Live scan analysis</strong><div class="status"><span id="statusDot" class="dot"></span><span id="statusText">Idle</span></div></div>
        <div class="panel-body">
          <p class="muted">Follow the active folder and live totals here. The storage treemap is built after the scan finishes so folders can be sized consistently.</p>
          <div id="progress" class="progress" hidden><div></div></div>
          <div id="scanLocation" class="scan-location muted"></div>
          <div id="progressText" class="muted"></div>
          <div id="scanError" class="error" hidden></div>
          <div class="scan-analysis">
            <div class="stat"><strong id="scanObservedBytes">—</strong><span class="muted">Local data observed</span></div>
            <div class="stat"><strong id="scanObservedFiles">—</strong><span class="muted">Files observed</span></div>
            <div class="stat"><strong id="scanObservedFolders">—</strong><span class="muted">Folders observed</span></div>
          </div>
        </div>
      </section>
      <section id="results" hidden>
        <section class="panel">
          <div class="panel-header">
            <div class="graph-navigation">
              <button id="goUpFolder" class="folder-up-button" type="button" title="Go to the parent folder" aria-label="Go to the parent folder">⬆️</button>
              <div class="crumbs" id="crumbs"></div>
            </div>
          </div>
          <svg id="treemap" role="img" aria-label="Storage usage treemap"></svg>
          <div id="selectedFolderActions" class="selected-folder-actions" hidden>
            <div class="selected-folder-details"><strong id="selectedFolderName"></strong><div id="selectedFolderDetails" class="muted"></div></div>
            <button id="explainFolder" class="primary" type="button" title="Ask Copilot to explain this folder and recommend safe cleanup options">Analyze folder &amp; cleanup options</button>
            <div id="protectedFolderGuidance" class="warning protected-folder-guidance" hidden></div>
          </div>
          <div id="folderExplanation" class="folder-explanation" aria-live="polite" hidden></div>
        </section>
        <section class="breakdown-grid">
          <div class="panel">
            <details class="expander" open>
              <summary>🧩 Application ownership</summary>
              <div id="appBreakdown" class="panel-body bar-list"></div>
            </details>
          </div>
          <div class="panel">
            <details class="expander" open>
              <summary>📄 File categories</summary>
              <div id="categoryBreakdown" class="panel-body bar-list"></div>
            </details>
          </div>
        </section>
        <section class="panel">
          <details id="custom-storage-analyzers" class="expander analyzers">
            <summary>🧰 Custom storage analyzers</summary>
            <div class="panel-body">
              <div class="analyzer-toolbar">
                <div><label for="customAnalyzer">Analyzer</label><select id="customAnalyzer"></select></div>
                <button id="runCustomAnalyzer" type="button">Analyze storage</button>
              </div>
              <div id="customAnalyzerDescription" class="muted"></div>
              <div id="customAnalyzerContent"><div class="empty">Loading analyzers...</div></div>
            </div>
          </details>
        </section>
        <section class="panel">
          <div class="panel-header toolbar">
            <div class="tabs">
              <button class="tab active" data-tab="directories">Folders</button>
              <button class="tab" data-tab="files">Largest files</button>
              <button class="tab" data-tab="cloudOnly">Cloud-only excluded</button>
              <button class="tab" data-tab="candidates">Cleanup candidates</button>
              <button class="tab" data-tab="warnings">Warnings</button>
            </div>
          </div>
          <div id="tableContent" class="table-wrap"></div>
          <div id="cleanupBar" class="cleanup-bar" hidden>
            <span id="selectionSummary">No files selected</span>
            <button id="previewCleanup" class="danger" disabled>Review cleanup</button>
          </div>
        </section>
      </section>
    </main>
  </div>
  <dialog id="cleanupDialog">
    <h2>Recycle Bin cleanup</h2>
    <p id="cleanupStatus" class="muted"></p>
    <div id="cleanupProgress" class="progress" hidden><div></div></div>
    <div id="cleanupProgressText" class="muted"></div>
    <div id="cleanupCurrentPath"></div>
    <div id="cleanupError" class="error" hidden></div>
    <div id="cleanupPreviewContent" hidden>
      <p id="previewSummary"></p>
      <div id="previewRejected" class="warning" hidden></div>
      <div id="previewEntries" class="modal-list"></div>
      <label><input id="confirmCleanup" type="checkbox" /> I reviewed these exact paths and want to move them to the Windows Recycle Bin.</label>
    </div>
    <div id="cleanupResult" hidden>
      <p id="cleanupResultSummary"></p>
      <div id="cleanupFailures" class="warning" hidden></div>
    </div>
    <div class="modal-actions"><button id="closeDialog">Close</button><button id="executeCleanup" class="danger" hidden disabled>Move to Recycle Bin</button></div>
  </dialog>
  <dialog id="analyzerCommandDialog">
    <h2 id="analyzerCommandTitle">Analyzer command</h2>
    <p id="analyzerCommandStatus" class="muted"></p>
    <code id="analyzerCommandText"></code>
    <div id="analyzerCommandProgress" class="progress command-progress" role="progressbar" aria-label="Analyzer command in progress" hidden><div></div></div>
    <div id="analyzerCommandError" class="error" hidden></div>
    <pre id="analyzerCommandOutput" class="command-output" hidden></pre>
    <div class="modal-actions">
      <button id="cancelAnalyzerCommand">Cancel</button>
      <button id="confirmAnalyzerCommand" class="danger" hidden>Run cleanup command</button>
      <button id="closeAnalyzerCommand" hidden>Close</button>
    </div>
  </dialog>
  <dialog id="copilotInvestigationDialog">
    <h2 id="copilotInvestigationTitle">Ask Copilot</h2>
    <p id="copilotInvestigationStatus" class="muted"></p>
    <div id="copilotInvestigationPath" class="investigation-path scan-location"></div>
    <div id="copilotInvestigationProgress" class="progress command-progress" role="progressbar" aria-label="Copilot investigation in progress" hidden><div></div></div>
    <div id="copilotInvestigationError" class="error" hidden></div>
    <div id="copilotInvestigationResponse" class="investigation-response" hidden></div>
    <div class="modal-actions">
      <button id="cancelCopilotInvestigation">Cancel</button>
      <button id="closeCopilotInvestigation" hidden>Close</button>
    </div>
  </dialog>
  <script>
    ${treeNavigationClientSource}
    const token = __TOKEN__;
    const state = {
      scan: null,
      result: null,
      tab: "directories",
      treeStack: [],
      selected: new Set(),
      preview: null,
      cleanup: { status: "idle" },
      safety: { directCleanupEnabled: false, analyzerProtectionEnabled: true },
      customAnalyzers: [],
      analyzerId: "vscode-insiders",
      customAnalyses: {},
      analyzerCommand: { status: "idle" },
      analyzerSelected: new Set(),
      categorizers: null,
      selectedFolder: null,
      folderExplanations: new Map(),
      folderExplanationErrors: new Map(),
      explainingPath: null,
      investigation: { status: "idle" },
    };
    const $ = (id) => document.getElementById(id);

    function formatBytes(value) {
      if (!Number.isFinite(value)) return "—";
      if (value === 0) return "0 B";
      const units = ["B", "KB", "MB", "GB", "TB"];
      const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
      return (value / Math.pow(1024, index)).toLocaleString(undefined, { maximumFractionDigits: index ? 1 : 0 }) + " " + units[index];
    }

    function formatCloudOnlySummary(summary) {
      return formatBytes(summary.cloudOnlyBytes) + " · " + (summary.cloudOnlyFiles || 0).toLocaleString() + " files";
    }

    async function api(url, options) {
      const response = await fetch(url, {
        ...options,
        headers: { "content-type": "application/json", "x-storage-inspector-token": token, ...(options && options.headers) },
      });
      const body = await response.json();
      if (!response.ok) {
        const error = new Error(body.message || "Request failed");
        error.code = body.code;
        throw error;
      }
      return body;
    }

    function renderSafety(safety) {
      state.safety = safety || state.safety;
      const directCleanupEnabled = state.safety.directCleanupEnabled === true;
      if (!directCleanupEnabled) {
        state.selected.clear();
        state.analyzerSelected.clear();
        state.preview = null;
      }
      $("directCleanupEnabled").checked = directCleanupEnabled;
      $("analyzerProtectionEnabled").checked = state.safety.analyzerProtectionEnabled !== false;
      $("directCleanupSafety").classList.toggle("enabled", directCleanupEnabled);
      $("directCleanupSafety").title = directCleanupEnabled
        ? "Direct cleanup is enabled. Validated files can be moved to the Windows Recycle Bin."
        : "Direct file cleanup is disabled by default. Enable only after acknowledging the risk.";
      $("analyzerProtectionSafety").title = state.safety.analyzerProtectionEnabled !== false
        ? "Analyzer-managed folders are protected from direct cleanup. Use the analyzer's supported commands instead."
        : "Analyzer-managed folders can be offered as direct cleanup candidates after a rescan.";
      const disabled = state.scan?.status === "running";
      $("directCleanupEnabled").disabled = disabled;
      $("analyzerProtectionEnabled").disabled = disabled;
      if (state.result) {
        renderSelection();
        renderCustomAnalyzer();
      }
    }

    async function updateSafety(input, restoreControl) {
      try {
        const result = await api("/api/safety", { method: "POST", body: JSON.stringify(input) });
        renderSafety(result.safety);
      } catch (error) {
        restoreControl();
        alert(error.message);
      }
    }

    function textCell(row, value, className) {
      const cell = document.createElement("td");
      if (className) cell.className = className;
      cell.textContent = value;
      row.appendChild(cell);
      return cell;
    }

    function appendPathNavigation(row, item, isFile) {
      const cell = document.createElement("td");
      cell.className = "path";
      const link = document.createElement("a");
      link.className = "path-navigation";
      link.href = "#treemap";
      link.textContent = item.path;
      link.title = "Navigate the treemap to this path";
      link.setAttribute("aria-label", "Navigate the treemap to " + item.path);
      link.addEventListener("click", (event) => {
        event.preventDefault();
        navigateTreemapToPath(isFile ? getParentPath(item.path) : item.path);
      });
      cell.appendChild(link);
      row.appendChild(cell);
    }

    function renderScanState(next) {
      const scan = next.scan;
      state.scan = scan;
      if (next.safety) renderSafety(next.safety);
      $("statusText").textContent = scan.status.charAt(0).toUpperCase() + scan.status.slice(1);
      $("statusDot").className = "dot " + scan.status;
      const running = scan.status === "running";
      $("progress").hidden = !running;
      $("startScan").disabled = running;
      $("cancelScan").hidden = !running;
      $("scopeProfile").disabled = running;
      $("scopeProgramData").disabled = running;
      $("scanError").hidden = !scan.error;
      $("scanError").textContent = scan.error ? scan.error.message : "";
      const progress = scan.progress;
      $("scanLocation").textContent = running && progress && progress.currentDirectory
        ? "Scanning folder: " + progress.currentDirectory
        : "";
      $("progressText").textContent = progress
        ? progress.directoriesScanned.toLocaleString() + " folders · " + progress.filesScanned.toLocaleString() + " files · " + formatBytes(progress.bytesScanned) + " · updates at most once per second"
        : "";
      $("scanAnalysis").hidden = scan.status === "idle";
      if (running && progress) {
        $("welcome").hidden = true;
        $("scanObservedBytes").textContent = formatBytes(progress.bytesScanned);
        $("scanObservedFiles").textContent = progress.filesScanned.toLocaleString();
        $("scanObservedFolders").textContent = progress.directoriesScanned.toLocaleString();
      }
      if (next.resultSummary) {
        $("totalSize").textContent = formatBytes(next.resultSummary.bytes);
        $("fileCount").textContent = next.resultSummary.files.toLocaleString();
        $("reclaimable").textContent = formatBytes(next.resultSummary.reclaimableBytes);
        $("warningCount").textContent = next.resultSummary.warnings.toLocaleString();
        $("cloudOnly").textContent = formatCloudOnlySummary(next.resultSummary);
        if (!running) {
          $("scanObservedBytes").textContent = formatBytes(next.resultSummary.bytes);
          $("scanObservedFiles").textContent = next.resultSummary.files.toLocaleString();
          $("scanObservedFolders").textContent = next.resultSummary.directories.toLocaleString();
        }
      }
      if (next.categorizers) {
        state.categorizers = next.categorizers;
        renderCategorizers();
      }
      if (next.customAnalyses) {
        state.customAnalyses = next.customAnalyses;
        renderCustomAnalyzer();
      }
      if (next.cleanup) {
        renderCleanupState(next.cleanup);
      }
      if (scan.status === "completed" && (!state.result || state.result.generatedAt !== next.generatedAt)) {
        loadResults();
      }
    }

    async function loadResults() {
      try {
        state.result = await api("/api/results");
        state.treeStack = [state.result.tree];
        state.selected.clear();
        populateFilters();
        renderResults();
      } catch (error) {
        $("scanError").hidden = false;
        $("scanError").textContent = error.message;
      }
    }

    async function loadCategorizers() {
      try {
        state.categorizers = await api("/api/categorizers");
        renderCategorizers();
      } catch (error) {
        $("categorizerList").replaceChildren(emptyMessage(error.message));
      }
    }

    function renderCategorizers() {
      const container = $("categorizerList");
      container.replaceChildren();
      if (!state.categorizers) {
        container.appendChild(emptyMessage("Loading categorizers..."));
        return;
      }
      const builtInGroups = new Map();
      state.categorizers.builtIn.forEach((rule) => {
        const key = [rule.name, rule.category, rule.description].join("\u0000");
        const group = builtInGroups.get(key) ?? { ...rule, patternCount: 0 };
        group.patternCount += 1;
        builtInGroups.set(key, group);
      });
      const allRules = [...state.categorizers.custom, ...builtInGroups.values()];
      if (!allRules.length) {
        container.appendChild(emptyMessage("Categorize a folder from the results table."));
        return;
      }
      allRules.forEach((rule) => {
        const item = document.createElement("div");
        item.className = "categorizer";
        const name = document.createElement("strong");
        name.textContent = rule.name + " - " + rule.category;
        const detail = document.createElement("span");
        detail.className = "muted";
        detail.textContent = rule.source === "custom"
          ? rule.path
          : rule.description + (rule.patternCount > 1 ? " (" + rule.patternCount + " built-in path patterns)" : "");
        item.append(name, detail);
        if (rule.source === "custom") {
          const remove = document.createElement("button");
          remove.type = "button";
          remove.textContent = "Remove";
          remove.addEventListener("click", async () => {
            try {
              await api("/api/categorizers/remove", { method: "POST", body: JSON.stringify({ id: rule.id }) });
              state.categorizers = await api("/api/categorizers");
              renderCategorizers();
              alert("Categorizer removed. A rescan has started.");
            } catch (error) {
              alert(error.message);
            }
          });
          item.appendChild(remove);
        }
        container.appendChild(item);
      });
    }

    function populateFilters() {
      const app = $("appFilter");
      const category = $("categoryFilter");
      app.replaceChildren(new Option("All applications", ""));
      category.replaceChildren(new Option("All categories", ""));
      state.result.apps.forEach((item) => app.add(new Option(item.name + " (" + formatBytes(item.bytes) + ")", item.name)));
      state.result.categories.forEach((item) => category.add(new Option(item.name + " (" + formatBytes(item.bytes) + ")", item.name)));
    }

    function renderResults() {
      $("welcome").hidden = true;
      $("results").hidden = false;
      $("totalSize").textContent = formatBytes(state.result.summary.bytes);
      $("fileCount").textContent = state.result.summary.files.toLocaleString();
      $("reclaimable").textContent = formatBytes(state.result.summary.reclaimableBytes);
      $("warningCount").textContent = state.result.summary.warnings.toLocaleString();
      $("cloudOnly").textContent = formatCloudOnlySummary(state.result.summary);
      renderTreemap();
      renderBreakdowns();
      renderCustomAnalyzer();
      renderTable();
    }

    async function loadCustomAnalyzers() {
      try {
        state.customAnalyzers = await api("/api/analyzers");
        const select = $("customAnalyzer");
        select.replaceChildren();
        state.customAnalyzers.forEach((analyzer) => select.add(new Option(analyzer.name, analyzer.id)));
        select.value = state.analyzerId;
        updateAnalyzerDescription();
        if (state.selectedFolder) renderSelectedFolderAction();
        const analyzersPanel = document.querySelector("details.analyzers");
        if (state.result && analyzersPanel.open) runSelectedAnalyzer();
      } catch (error) {
        $("customAnalyzerContent").replaceChildren(emptyMessage(error.message));
      }
    }

    function updateAnalyzerDescription() {
      const analyzer = state.customAnalyzers.find((item) => item.id === state.analyzerId);
      $("customAnalyzerDescription").textContent = analyzer ? analyzer.description : "";
    }

    async function runSelectedAnalyzer() {
      if (!state.result) {
        $("customAnalyzerContent").replaceChildren(emptyMessage("Run a storage scan before using custom analyzers."));
        return;
      }
      state.analyzerSelected.clear();
      $("customAnalyzerContent").replaceChildren(emptyMessage("Analyzing storage and active processes..."));
      const analyzerId = state.analyzerId;
      try {
        const analysis = await api("/api/analyzers/run", {
          method: "POST",
          body: JSON.stringify({ analyzerId }),
        });
        state.customAnalyses[analyzerId] = analysis;
        if (state.analyzerId === analyzerId) renderCustomAnalyzer();
      } catch (error) {
        if (state.analyzerId === analyzerId) {
          $("customAnalyzerContent").replaceChildren(emptyMessage(error.message));
        }
      }
    }

    function appendAnalysisStat(container, label, value) {
      const item = document.createElement("div");
      item.className = "analysis-stat";
      const strong = document.createElement("strong");
      strong.textContent = value;
      const labelNode = document.createElement("span");
      labelNode.className = "muted";
      labelNode.textContent = label;
      item.append(strong, labelNode);
      container.appendChild(item);
    }

    function appendAnalysisTable(container, title, headings, rows) {
      const section = document.createElement("div");
      section.className = "analysis-section";
      const heading = document.createElement("h3");
      heading.textContent = title;
      section.appendChild(heading);
      const { table, body } = createTable(headings);
      rows.forEach((values) => {
        const row = document.createElement("tr");
        values.forEach((value, index) => textCell(row, String(value), index === 0 ? "path" : undefined));
        body.appendChild(row);
      });
      section.appendChild(rows.length ? table : emptyMessage("No matching data."));
      container.appendChild(section);
    }

    function ensureAnalyzerCommandDialog() {
      if (!$("analyzerCommandDialog").open) $("analyzerCommandDialog").showModal();
    }

    function renderAnalyzerCommandDialog() {
      const active = state.analyzerCommand;
      const command = active.command;
      const isRunning = active.status === "running";
      const isFinished = ["completed", "cancelled", "failed"].includes(active.status);
      $("analyzerCommandTitle").textContent = command?.label || "Analyzer command";
      $("analyzerCommandText").textContent = command?.command || "";
      $("analyzerCommandProgress").hidden = !isRunning;
      $("analyzerCommandError").hidden = true;
      $("analyzerCommandOutput").hidden = true;
      $("confirmAnalyzerCommand").hidden = true;
      $("cancelAnalyzerCommand").hidden = isFinished;
      $("cancelAnalyzerCommand").disabled = active.cancellationRequested === true;
      $("cancelAnalyzerCommand").textContent = active.cancellationRequested ? "Cancelling..." : "Cancel";
      $("closeAnalyzerCommand").hidden = active.status === "awaiting-confirmation" || isRunning;

      if (active.status === "awaiting-confirmation") {
        $("analyzerCommandStatus").textContent = "This cleanup command can remove managed data. Review the command, then explicitly confirm execution.";
        $("confirmAnalyzerCommand").hidden = false;
        return;
      }
      if (isRunning) {
        $("analyzerCommandStatus").textContent = active.cancellationRequested
          ? "Cancelling the analyzer command..."
          : "Running through the extension's centralized command runner. Other canvas actions are blocked until it completes.";
        return;
      }
      if (active.status === "completed") {
        $("analyzerCommandStatus").textContent = "Command completed.";
        $("analyzerCommandOutput").hidden = false;
        $("analyzerCommandOutput").textContent = active.result.output || "Command completed without output.";
        return;
      }
      if (active.status === "failed") {
        $("analyzerCommandStatus").textContent = "Command did not complete.";
        $("analyzerCommandError").hidden = false;
        $("analyzerCommandError").textContent = active.error.message;
        return;
      }
      if (active.status === "cancelled") {
        $("analyzerCommandStatus").textContent = "Command cancelled.";
        $("analyzerCommandError").hidden = false;
        $("analyzerCommandError").textContent = active.error.message;
      }
    }

    async function executeAnalyzerCommand() {
      const active = state.analyzerCommand;
      if (!active.command || !["awaiting-confirmation", "running"].includes(active.status)) return;
      state.analyzerCommand = { ...active, status: "running" };
      renderAnalyzerCommandDialog();
      try {
        const result = await api("/api/analyzers/command", {
          method: "POST",
          body: JSON.stringify({
            analyzerId: active.analyzerId,
            commandId: active.command.id,
            confirmed: active.command.requiresConfirmation === true,
          }),
        });
        state.analyzerCommand = { ...active, status: "completed", result };
      } catch (error) {
        state.analyzerCommand = {
          ...active,
          status: error.code === "analyzer_command_cancelled" ? "cancelled" : "failed",
          error,
        };
      }
      renderAnalyzerCommandDialog();
    }

    async function cancelAnalyzerCommand() {
      const active = state.analyzerCommand;
      if (active.status === "awaiting-confirmation") {
        $("analyzerCommandDialog").close();
        return;
      }
      if (active.status !== "running" || active.cancellationRequested) return;
      state.analyzerCommand = { ...active, cancellationRequested: true };
      renderAnalyzerCommandDialog();
      try {
        await api("/api/analyzers/command/cancel", {
          method: "POST",
          body: JSON.stringify({}),
        });
      } catch (error) {
        state.analyzerCommand = { ...active, cancellationRequested: false, error };
        renderAnalyzerCommandDialog();
        alert(error.message);
      }
    }

    function runAnalyzerCommand(analyzerId, command) {
      if (["awaiting-confirmation", "running"].includes(state.analyzerCommand.status)) return;
      state.analyzerCommand = {
        analyzerId,
        command,
        status: command.requiresConfirmation ? "awaiting-confirmation" : "running",
      };
      ensureAnalyzerCommandDialog();
      renderAnalyzerCommandDialog();
      if (!command.requiresConfirmation) executeAnalyzerCommand();
    }

    function appendAnalyzerCommands(container, analyzerId, title, noteText, commands) {
      const section = document.createElement("div");
      section.className = "analysis-section";
      const heading = document.createElement("h3");
      heading.textContent = title;
      section.appendChild(heading);
      const note = document.createElement("p");
      note.className = "muted";
      note.textContent = noteText;
      section.appendChild(note);
      const list = document.createElement("div");
      list.className = "command-list";
      commands.forEach((item) => {
        const card = document.createElement("div");
        card.className = "command-card";
        const header = document.createElement("div");
        header.className = "command-header";
        const label = document.createElement("strong");
        label.textContent = item.label;
        const run = document.createElement("button");
        run.type = "button";
        run.textContent = "Run";
        run.title = item.requiresConfirmation
          ? "Run this cleanup command after confirmation"
          : "Run this read-only command";
        run.addEventListener("click", () => runAnalyzerCommand(analyzerId, item));
        header.append(label);
        const command = document.createElement("code");
        command.textContent = item.command;
        const commandLine = document.createElement("div");
        commandLine.className = "command-line";
        commandLine.append(command, run);
        const description = document.createElement("div");
        description.className = "muted";
        description.textContent = item.description;
        card.append(header, commandLine, description);
        list.appendChild(card);
      });
      section.appendChild(list);
      container.appendChild(section);
    }

    function appendAnalyzerCleanup(container, items) {
      const eligible = items.filter((item) => item.cleanupEligible);
      const directCleanupEnabled = state.safety.directCleanupEnabled === true;
      const selectedBytes = eligible
        .filter((item) => state.analyzerSelected.has(item.id))
        .reduce((total, item) => total + item.bytes, 0);
      const bar = document.createElement("div");
      bar.className = "analyzer-cleanup";
      const summary = document.createElement("span");
      summary.textContent = !directCleanupEnabled
        ? "🛡️ Allow delete is disabled. Enable it in Cleanup safety to move selected items to the Recycle Bin."
        : state.analyzerSelected.size
        ? state.analyzerSelected.size.toLocaleString() + " selected · " + formatBytes(selectedBytes)
        : eligible.length
          ? "Select storage to move to the Recycle Bin"
          : "No storage is currently eligible for cleanup";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "danger";
      button.textContent = "Review cleanup";
      button.disabled = !directCleanupEnabled || state.analyzerSelected.size === 0;
      button.addEventListener("click", () => previewCleanup({
        source: "analyzer",
        analyzerId: state.analyzerId,
        itemIds: [...state.analyzerSelected],
      }));
      bar.append(summary, button);
      container.appendChild(bar);
    }

    function appendCleanupCheckbox(row, item) {
      const cell = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.disabled = !item.cleanupEligible || state.safety.directCleanupEnabled !== true;
      checkbox.checked = state.analyzerSelected.has(item.id);
      checkbox.setAttribute("aria-label", "Select " + item.path);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.analyzerSelected.add(item.id); else state.analyzerSelected.delete(item.id);
        renderCustomAnalyzer();
      });
      cell.appendChild(checkbox);
      row.appendChild(cell);
    }

    function renderVsCodeAnalyzer(container, analysis) {
      container.replaceChildren();
      if (analysis.status === "not-found") {
        container.appendChild(emptyMessage(analysis.message));
        return;
      }
      const stats = document.createElement("div");
      stats.className = "analysis-stats";
      appendAnalysisStat(stats, "Installation folder", formatBytes(analysis.rootBytes));
      appendAnalysisStat(stats, "Version copies", analysis.folderCount.toLocaleString());
      appendAnalysisStat(stats, "Version-folder bytes", formatBytes(analysis.versionBytes));
      appendAnalysisStat(stats, "Outside version folders", formatBytes(analysis.nonVersionBytes));
      container.appendChild(stats);

      const status = document.createElement("div");
      status.className = analysis.status === "running" ? "warning" : "error";
      status.textContent = analysis.message + " Active process count: " + analysis.processCount.toLocaleString() + ".";
      container.appendChild(status);
      if (analysis.processInspectionError) {
        const inspectionError = document.createElement("div");
        inspectionError.className = "error";
        inspectionError.textContent = "Process inspection error: " + analysis.processInspectionError;
        container.appendChild(inspectionError);
      }
      analysis.recommendations.forEach((recommendation) => {
        const note = document.createElement("div");
        note.className = recommendation.risk === "high" ? "error" : "warning";
        note.textContent = recommendation.message + " Reviewable size: " + formatBytes(recommendation.bytes) + ".";
        container.appendChild(note);
      });

      appendAnalysisTable(
        container,
        "Versions retained on disk",
        ["Version", "Folders", "Size", "Newest copy"],
        analysis.versions.map((item) => [
          item.version,
          item.folders.toLocaleString(),
          formatBytes(item.bytes),
          new Date(item.newest).toLocaleString(),
        ]),
      );
      const section = document.createElement("div");
      section.className = "analysis-section";
      const heading = document.createElement("h3");
      heading.textContent = "Installation folders";
      section.appendChild(heading);
      const { table, body } = createTable(["", "Folder", "Version", "Size", "Status", "Modified"]);
      analysis.folders.slice(0, 80).forEach((item) => {
        const row = document.createElement("tr");
        appendCleanupCheckbox(row, item);
        textCell(row, item.path, "path");
        textCell(row, item.version);
        textCell(row, formatBytes(item.bytes));
        textCell(row, item.active ? "ACTIVE" : (item.cleanupEligible ? "Cleanup available" : "Inactive"));
        textCell(row, new Date(item.modifiedAt).toLocaleString());
        body.appendChild(row);
      });
      section.appendChild(table);
      container.appendChild(section);
      appendAnalysisTable(
        container,
        "Largest files inside the installation",
        ["File", "Size", "Category", "Modified"],
        analysis.topFiles.slice(0, 10).map((item) => [
          item.path,
          formatBytes(item.bytes),
          item.category,
          new Date(item.modifiedAt).toLocaleString(),
        ]),
      );
      appendAnalyzerCleanup(container, analysis.folders);
    }

    function renderScoutAnalyzer(container, analysis) {
      container.replaceChildren();
      if (analysis.status === "not-found") {
        container.appendChild(emptyMessage(analysis.message));
        return;
      }
      const stats = document.createElement("div");
      stats.className = "analysis-stats";
      appendAnalysisStat(stats, "Total Scout storage", formatBytes(analysis.totalBytes));
      appendAnalysisStat(stats, "Regenerable storage", formatBytes(analysis.cleanupBytes));
      appendAnalysisStat(stats, "Storage locations", analysis.locations.length.toLocaleString());
      appendAnalysisStat(stats, "Active processes", analysis.processCount.toLocaleString());
      container.appendChild(stats);

      const status = document.createElement("div");
      status.className = analysis.status === "not-running" ? "warning" : "error";
      status.textContent = analysis.message;
      container.appendChild(status);
      if (analysis.processInspectionError) {
        const error = document.createElement("div");
        error.className = "error";
        error.textContent = "Process inspection error: " + analysis.processInspectionError;
        container.appendChild(error);
      }

      appendAnalysisTable(
        container,
        "Scout storage locations",
        ["Location", "Purpose", "Size", "Files", "Modified"],
        analysis.locations.map((item) => [
          item.path,
          item.name,
          formatBytes(item.bytes),
          item.files.toLocaleString(),
          new Date(item.modifiedAt).toLocaleString(),
        ]),
      );

      const section = document.createElement("div");
      section.className = "analysis-section";
      const heading = document.createElement("h3");
      heading.textContent = "Regenerable Scout storage";
      section.appendChild(heading);
      const { table, body } = createTable(["", "Location", "Purpose", "Size", "Files", "Status"]);
      analysis.cleanupItems.forEach((item) => {
        const row = document.createElement("tr");
        appendCleanupCheckbox(row, item);
        textCell(row, item.path, "path");
        textCell(row, item.name);
        textCell(row, formatBytes(item.bytes));
        textCell(row, item.files.toLocaleString());
        textCell(row, item.cleanupEligible ? "Cleanup available" : "Close Scout first");
        body.appendChild(row);
      });
      section.appendChild(analysis.cleanupItems.length ? table : emptyMessage("No known regenerable Scout storage was found."));
      container.appendChild(section);
      appendAnalysisTable(
        container,
        "Largest Scout files",
        ["File", "Size", "Category", "Modified"],
        analysis.topFiles.slice(0, 10).map((item) => [
          item.path,
          formatBytes(item.bytes),
          item.category,
          new Date(item.modifiedAt).toLocaleString(),
        ]),
      );
      appendAnalyzerCleanup(container, analysis.cleanupItems);
    }

    function renderDockerAnalyzer(container, analysis) {
      container.replaceChildren();
      if (analysis.status === "not-found") {
        container.appendChild(emptyMessage(analysis.message));
        return;
      }

      const stats = document.createElement("div");
      stats.className = "analysis-stats";
      appendAnalysisStat(stats, "Docker-managed storage", formatBytes(analysis.totalBytes));
      appendAnalysisStat(stats, "Image data reported", formatBytes(analysis.imageBytes));
      appendAnalysisStat(stats, "Images", analysis.images.length.toLocaleString());
      appendAnalysisStat(stats, "Dangling images", analysis.danglingImages.toLocaleString());
      container.appendChild(stats);

      const status = document.createElement("div");
      status.className = analysis.status === "available" ? "warning" : "error";
      status.textContent = analysis.message;
      container.appendChild(status);
      if (analysis.warning) {
        const warning = document.createElement("div");
        warning.className = "error";
        warning.textContent = analysis.warning;
        container.appendChild(warning);
      }

      appendAnalysisTable(
        container,
        "Docker storage locations",
        ["Location", "Purpose", "Size", "Files", "Modified"],
        analysis.locations.map((item) => [
          item.path,
          item.name,
          formatBytes(item.bytes),
          item.files.toLocaleString(),
          new Date(item.modifiedAt).toLocaleString(),
        ]),
      );

      appendAnalysisTable(
        container,
        "Docker images",
        ["Repository", "Tag", "Size", "Created", "Image ID"],
        [...analysis.images]
          .sort((left, right) => right.bytes - left.bytes)
          .map((image) => [
            image.repository,
            image.tag,
            image.size,
            image.createdAt || "—",
            image.imageId || "—",
          ]),
      );

      appendAnalysisTable(
        container,
        "Largest Docker-managed files",
        ["File", "Size", "Category", "Modified"],
        analysis.topFiles.slice(0, 10).map((item) => [
          item.path,
          formatBytes(item.bytes),
          item.category,
          new Date(item.modifiedAt).toLocaleString(),
        ]),
      );

      appendAnalyzerCommands(
        container,
        "docker-images",
        "Supported Docker cleanup commands",
        "Read-only commands run immediately. Cleanup commands require confirmation. Use Docker CLI or Docker Desktop instead of deleting Docker storage files directly.",
        analysis.cleanupCommands,
      );
    }

    function renderNpmCacheAnalyzer(container, analysis) {
      container.replaceChildren();
      const stats = document.createElement("div");
      stats.className = "analysis-stats";
      appendAnalysisStat(stats, "npm cache storage", formatBytes(analysis.totalBytes));
      appendAnalysisStat(stats, "Cached files", (analysis.location?.files || 0).toLocaleString());
      appendAnalysisStat(stats, "Location", analysis.configurationSource);
      container.appendChild(stats);

      const status = document.createElement("div");
      status.className = analysis.status === "available" ? "warning" : "error";
      status.textContent = analysis.message;
      container.appendChild(status);
      if (analysis.configurationError) {
        const error = document.createElement("div");
        error.className = "warning";
        error.textContent = analysis.configurationError;
        container.appendChild(error);
      }
      if (analysis.warning) {
        const warning = document.createElement("div");
        warning.className = "warning";
        warning.textContent = analysis.warning;
        container.appendChild(warning);
      }

      appendAnalysisTable(
        container,
        "Configured npm cache location",
        ["Location", "Size", "Files", "Modified"],
        analysis.location ? [[
          analysis.location.path,
          formatBytes(analysis.location.bytes),
          analysis.location.files.toLocaleString(),
          new Date(analysis.location.modifiedAt).toLocaleString(),
        ]] : [[analysis.configuredPath, "Not found", "—", "—"]],
      );

      if (analysis.location) {
        appendAnalysisTable(
          container,
          "Largest npm cache files",
          ["File", "Size", "Category", "Modified"],
          analysis.topFiles.slice(0, 10).map((item) => [
            item.path,
            formatBytes(item.bytes),
            item.category,
            new Date(item.modifiedAt).toLocaleString(),
          ]),
        );
      }

      appendAnalyzerCommands(
        container,
        "npm-cache",
        "Supported npm cache commands",
        "Verify the cache first. Clear it only to reclaim disk space; npm recreates needed cache entries on later package installs.",
        analysis.cleanupCommands,
      );
    }

    function renderUvCacheAnalyzer(container, analysis) {
      container.replaceChildren();
      const stats = document.createElement("div");
      stats.className = "analysis-stats";
      appendAnalysisStat(stats, "uv-managed storage", formatBytes(analysis.totalBytes));
      appendAnalysisStat(stats, "uv cache storage", formatBytes(analysis.cacheBytes));
      appendAnalysisStat(stats, "Storage locations", analysis.locations.length.toLocaleString());
      container.appendChild(stats);

      const status = document.createElement("div");
      status.className = analysis.status === "available" ? "warning" : "error";
      status.textContent = analysis.message;
      container.appendChild(status);
      if (analysis.configurationError) {
        const error = document.createElement("div");
        error.className = "warning";
        error.textContent = analysis.configurationError;
        container.appendChild(error);
      }
      if (analysis.warning) {
        const warning = document.createElement("div");
        warning.className = "warning";
        warning.textContent = analysis.warning;
        container.appendChild(warning);
      }

      appendAnalysisTable(
        container,
        "uv storage locations",
        ["Location", "Purpose", "Size", "Files", "Modified"],
        analysis.locations.map((item) => [
          item.path,
          item.name,
          formatBytes(item.bytes),
          item.files.toLocaleString(),
          new Date(item.modifiedAt).toLocaleString(),
        ]),
      );
      if (!analysis.locations.length) {
        appendAnalysisTable(
          container,
          "Configured uv cache location",
          ["Location", "Status"],
          [[analysis.configuredCachePath, "Not found"]],
        );
      }
      appendAnalysisTable(
        container,
        "Largest uv files",
        ["File", "Size", "Category", "Modified"],
        analysis.topFiles.slice(0, 10).map((item) => [
          item.path,
          formatBytes(item.bytes),
          item.category,
          new Date(item.modifiedAt).toLocaleString(),
        ]),
      );
      appendAnalyzerCommands(
        container,
        "uv-cache",
        "Supported uv cache commands",
        "Use uv's cache commands instead of modifying cache files. Pruning is the preferred periodic cleanup; clear the cache only when you need to reclaim all cache space.",
        analysis.cleanupCommands,
      );
    }

    function renderCustomAnalyzer() {
      const container = $("customAnalyzerContent");
      const analysis = state.customAnalyses[state.analyzerId];
      if (!analysis) {
        container.replaceChildren(emptyMessage(
          state.result ? "Select Analyze storage to inspect this application." : "Run a storage scan before using custom analyzers.",
        ));
        return;
      }
      if (state.analyzerId === "vscode-insiders") {
        renderVsCodeAnalyzer(container, analysis);
      } else if (state.analyzerId === "microsoft-scout") {
        renderScoutAnalyzer(container, analysis);
      } else if (state.analyzerId === "docker-images") {
        renderDockerAnalyzer(container, analysis);
      } else if (state.analyzerId === "npm-cache") {
        renderNpmCacheAnalyzer(container, analysis);
      } else if (state.analyzerId === "uv-cache") {
        renderUvCacheAnalyzer(container, analysis);
      }
    }

    function analyzerForPath(targetPath) {
      const normalized = String(targetPath || "").replaceAll("/", "\\").toLowerCase();
      const segments = normalized.split("\\").filter(Boolean);
      if (segments.includes("microsoft vs code insiders")) return "vscode-insiders";
      if (segments.includes(".scout") || segments.includes("microsoft scout")) return "microsoft-scout";
      if (segments.includes("docker") || segments.includes("dockerdesktop") || segments.includes("windowsfilter")) return "docker-images";
      if (segments.includes("npm-cache")) return "npm-cache";
      if (normalized.includes("\\appdata\\local\\uv\\")) return "uv-cache";
      return undefined;
    }

    function activateAnalyzerForPath(targetPath) {
      const analyzerId = analyzerForPath(targetPath);
      if (!analyzerId) return;
      const analyzersPanel = document.querySelector("details.analyzers");
      const wasOpen = analyzersPanel.open;
      state.analyzerId = analyzerId;
      state.analyzerSelected.clear();
      $("customAnalyzer").value = analyzerId;
      analyzersPanel.open = true;
      updateAnalyzerDescription();
      renderCustomAnalyzer();
      if (wasOpen && !state.customAnalyses[state.analyzerId]) runSelectedAnalyzer();
    }

    function renderBreakdown(containerId, items, filterId) {
      const container = $(containerId);
      container.replaceChildren();
      const visible = items.slice(0, 8);
      const maximum = Math.max(...visible.map((item) => item.bytes), 1);
      visible.forEach((item) => {
        const row = document.createElement("div");
        row.className = "bar-row";
        const button = document.createElement("button");
        button.textContent = item.name;
        button.title = "Filter details by " + item.name;
        button.addEventListener("click", () => {
          $(filterId).value = item.name;
          state.tab = filterId === "appFilter" ? "files" : state.tab;
          renderTable();
        });
        const track = document.createElement("div");
        track.className = "bar-track";
        const fill = document.createElement("div");
        fill.className = "bar-fill";
        fill.style.width = (item.bytes / maximum * 100).toFixed(1) + "%";
        track.appendChild(fill);
        const value = document.createElement("span");
        value.textContent = formatBytes(item.bytes);
        row.append(button, track, value);
        container.appendChild(row);
      });
    }

    function renderBreakdowns() {
      renderBreakdown("appBreakdown", state.result.apps, "appFilter");
      renderBreakdown("categoryBreakdown", state.result.categories, "categoryFilter");
    }

    function colorFor(index, total) {
      const hue = (210 + index * (260 / Math.max(total, 1))) % 360;
      return "hsl(" + hue + " 58% 43%)";
    }

    function rowLayout(children, width, height) {
      const count = children.length;
      if (!count) return [];
      const columns = Math.max(1, Math.ceil(Math.sqrt(count * width / Math.max(height, 1))));
      const rows = [];
      for (let index = 0; index < count; index += columns) rows.push(children.slice(index, index + columns));
      const grandTotal = children.reduce((sum, child) => sum + Math.max(child.bytes, 1), 0);
      let y = 0;
      const rectangles = [];
      rows.forEach((row, rowIndex) => {
        const rowTotal = row.reduce((sum, child) => sum + Math.max(child.bytes, 1), 0);
        const rowHeight = rowIndex === rows.length - 1 ? height - y : height * rowTotal / grandTotal;
        let x = 0;
        row.forEach((child, childIndex) => {
          const childWidth = childIndex === row.length - 1 ? width - x : width * Math.max(child.bytes, 1) / rowTotal;
          rectangles.push({ child, x, y, width: childWidth, height: rowHeight });
          x += childWidth;
        });
        y += rowHeight;
      });
      return rectangles;
    }

    function renderTreemap() {
      const svg = $("treemap");
      const width = Math.max(svg.clientWidth, 400);
      const height = svg.clientHeight;
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      svg.replaceChildren();
      const node = state.treeStack[state.treeStack.length - 1];
      const children = (node.children || []).filter((child) => child.bytes > 0);
      rowLayout(children, width, height).forEach((item, index) => {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("class", "treemap-cell");
        group.setAttribute("tabindex", "0");
        group.setAttribute("role", "button");
        const protectedPrefix = item.child.protection ? "Protected folder, " : "";
        const displayName = (item.child.protection ? "🔒 " : "") + item.child.name;
        group.setAttribute("aria-label", protectedPrefix + item.child.name + ", " + formatBytes(item.child.bytes));
        const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "title");
        tooltip.textContent = "Folder: " + item.child.name
          + "\nSpace used: " + formatBytes(item.child.bytes)
          + "\nFiles: " + item.child.files.toLocaleString()
          + "\nPath: " + (item.child.path || "Scanned storage");
        if (item.child.protection) {
          tooltip.textContent += "\nProtected: use the " + item.child.protection.analyzerId + " custom analyzer for cleanup.";
        }
        group.appendChild(tooltip);
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", item.x + 1);
        rect.setAttribute("y", item.y + 1);
        rect.setAttribute("width", Math.max(item.width - 2, 0));
        rect.setAttribute("height", Math.max(item.height - 2, 0));
        rect.setAttribute("rx", "3");
        rect.setAttribute("fill", colorFor(index, children.length));
        group.appendChild(rect);
        if (item.width > 90 && item.height > 40) {
          const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          label.setAttribute("x", item.x + 8);
          label.setAttribute("y", item.y + 20);
          label.setAttribute("class", "treemap-label");
          label.textContent = displayName.length > 30 ? displayName.slice(0, 27) + "…" : displayName;
          group.appendChild(label);
          const size = document.createElementNS("http://www.w3.org/2000/svg", "text");
          size.setAttribute("x", item.x + 8);
          size.setAttribute("y", item.y + 38);
          size.setAttribute("class", "treemap-size");
          size.textContent = formatBytes(item.child.bytes);
          group.appendChild(size);
        }
        const openChild = () => {
          state.selectedFolder = item.child;
          renderSelectedFolderAction();
          if (item.child.children && item.child.children.length) {
            state.treeStack.push(item.child);
            renderTreemap();
          }
          activateAnalyzerForPath(item.child.path);
        };
        group.addEventListener("click", openChild);
        group.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") openChild(); });
        svg.appendChild(group);
      });
      renderBreadcrumbs();
    }

    function navigateTreemapToPath(targetPath) {
      const treeStack = findTreeStackForPath(state.result?.tree, targetPath);
      if (!treeStack.length) return;
      state.treeStack = treeStack;
      state.selectedFolder = treeStack[treeStack.length - 1];
      renderTreemap();
      renderSelectedFolderAction();
      activateAnalyzerForPath(state.selectedFolder.path);
      $("treemap").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderBreadcrumbs() {
      const crumbs = $("crumbs");
      crumbs.replaceChildren();
      $("goUpFolder").disabled = state.treeStack.length <= 1;
      state.treeStack.forEach((node, index) => {
        if (index) crumbs.appendChild(document.createTextNode("›"));
        const button = document.createElement("button");
        button.textContent = (node.protection ? "🔒 " : "") + node.name + " (" + formatBytes(node.bytes) + ")";
        button.addEventListener("click", () => {
          state.selectedFolder = node;
          renderSelectedFolderAction();
          state.treeStack.length = index + 1;
          renderTreemap();
          activateAnalyzerForPath(node.path);
        });
      crumbs.appendChild(button);
      });
     }

     function goUpFolder() {
      if (state.treeStack.length <= 1) return;
      state.treeStack.pop();
      const parent = state.treeStack[state.treeStack.length - 1];
      state.selectedFolder = parent;
      renderSelectedFolderAction();
      renderTreemap();
      activateAnalyzerForPath(parent.path);
     }

     function renderSelectedFolderAction() {
      const panel = $("selectedFolderActions");
      const folder = state.selectedFolder;
      panel.hidden = !folder;
      if (!folder) return;
      $("selectedFolderName").textContent = (folder.protection ? "🔒 " : "") + (folder.name || "Selected folder");
      const details = $("selectedFolderDetails");
      details.replaceChildren();
      const folderPath = document.createElement("span");
      folderPath.className = "folder-path";
      folderPath.textContent = folder.path || "Scanned storage";
      const summary = document.createElement("span");
      summary.textContent = formatBytes(folder.bytes) + " · " + folder.files.toLocaleString() + " files";
      details.append(folderPath, summary);
      renderProtectedFolderGuidance(folder);
      renderFolderExplanation();
    }

    function renderProtectedFolderGuidance(folder) {
      const guidance = $("protectedFolderGuidance");
      guidance.replaceChildren();
      guidance.hidden = !folder.protection;
      if (!folder.protection) return;
      const analyzer = state.customAnalyzers.find((item) => item.id === folder.protection.analyzerId);
      const label = analyzer?.name || folder.protection.name || "custom";
      guidance.append(document.createTextNode("This folder is protected from direct cleanup. Use the "));
      const link = document.createElement("a");
      link.className = "analyzer-link";
      link.href = "#custom-storage-analyzers";
      link.textContent = label + " analyzer";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openProtectedAnalyzer(folder.protection.analyzerId);
      });
      guidance.append(link, document.createTextNode(" for supported cleanup operations."));
    }

    function openProtectedAnalyzer(analyzerId) {
      const analyzer = state.customAnalyzers.find((item) => item.id === analyzerId);
      if (!analyzer) return;
      const analyzersPanel = document.querySelector("details.analyzers");
      state.analyzerId = analyzer.id;
      state.analyzerSelected.clear();
      $("customAnalyzer").value = analyzer.id;
      analyzersPanel.open = true;
      updateAnalyzerDescription();
      if (state.customAnalyses[analyzer.id]) renderCustomAnalyzer(); else runSelectedAnalyzer();
      analyzersPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function appendExplanationList(container, title, items) {
      if (!items.length) return;
      const heading = document.createElement("h3");
      heading.textContent = title;
      const list = document.createElement("ul");
      items.forEach((value) => {
        const item = document.createElement("li");
        item.textContent = value;
        list.appendChild(item);
      });
      container.append(heading, list);
    }

    function appendExplanationText(container, title, value) {
      const heading = document.createElement("h3");
      heading.textContent = title;
      const paragraph = document.createElement("p");
      paragraph.textContent = value;
      container.append(heading, paragraph);
    }

    function createCopyIcon() {
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 16 16");
      icon.setAttribute("aria-hidden", "true");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M0 6.75C0 5.784.784 5 1.75 5h6.5C9.216 5 10 5.784 10 6.75v6.5A1.75 1.75 0 0 1 8.25 15h-6.5A1.75 1.75 0 0 1 0 13.25ZM1.75 6.5a.25.25 0 0 0-.25.25v6.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25v-6.5a.25.25 0 0 0-.25-.25Zm9.5-5a.25.25 0 0 0-.25.25V3h1.25A1.75 1.75 0 0 1 14 4.75v6.5h.25c.138 0 .25-.112.25-.25v-9.25a.25.25 0 0 0-.25-.25Z");
      icon.appendChild(path);
      return icon;
    }

    function renderExplanationContent(container, explanation) {
      container.replaceChildren();
      const title = document.createElement("h2");
      title.textContent = explanation.title;
      const application = document.createElement("p");
      application.className = "muted";
      application.textContent = "Likely created by: " + explanation.application;
      const summary = document.createElement("p");
      summary.textContent = explanation.summary;
      const recommendation = document.createElement("span");
      recommendation.className = "recommendation " + explanation.cleanup.recommendation;
      recommendation.textContent = "Cleanup: " + explanation.cleanup.recommendation.replace("-", " ");
      container.append(title, application, summary, recommendation);

      if (explanation.contents.length) {
        const heading = document.createElement("h3");
        heading.textContent = "What it contains";
        const list = document.createElement("ul");
        explanation.contents.forEach((content) => {
          const item = document.createElement("li");
          const name = document.createElement("strong");
          name.textContent = content.name;
          item.append(name, document.createTextNode(content.description ? " — " + content.description : ""));
          list.appendChild(item);
        });
        container.append(heading, list);
      }
      appendExplanationList(container, "Typical uses", explanation.typicalUses);
      appendExplanationList(container, "Best practices", explanation.bestPractices);
      appendExplanationText(container, "Cleanup guidance", explanation.cleanup.summary);
      appendExplanationText(container, "Risk", explanation.cleanup.risk);
      appendExplanationText(container, "Impact", explanation.cleanup.impact);

      if (explanation.cleanup.commands.length) {
        const heading = document.createElement("h3");
        heading.textContent = "Supported cleanup commands";
        const note = document.createElement("p");
        note.className = "muted";
        note.textContent = "Review before running. Commands are copied only and are never executed by this canvas.";
        const list = document.createElement("div");
        list.className = "command-list";
        explanation.cleanup.commands.forEach((command) => {
          const card = document.createElement("div");
          card.className = "command-card";
          const header = document.createElement("div");
          header.className = "command-header";
          const label = document.createElement("strong");
          label.textContent = command.label + " · " + command.shell + (command.requiresElevation ? " · Administrator" : "");
          const copy = document.createElement("button");
          copy.type = "button";
          copy.className = "icon-button";
          copy.title = "Copy command";
          copy.setAttribute("aria-label", "Copy command");
          copy.appendChild(createCopyIcon());
          copy.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(command.command);
              copy.title = "Copied";
              copy.setAttribute("aria-label", "Copied");
              setTimeout(() => {
                copy.title = "Copy command";
                copy.setAttribute("aria-label", "Copy command");
              }, 1500);
            } catch {
              alert("The command could not be copied. Select it manually instead.");
            }
          });
          header.appendChild(label);
          const code = document.createElement("code");
          code.textContent = command.command;
          const commandLine = document.createElement("div");
          commandLine.className = "command-line";
          commandLine.append(code, copy);
          card.append(header, commandLine);
          if (command.description) {
            const description = document.createElement("p");
            description.className = "muted";
            description.textContent = command.description;
            card.appendChild(description);
          }
          list.appendChild(card);
        });
        container.append(heading, note, list);
      }
      appendExplanationList(container, "Manual cleanup steps", explanation.cleanup.steps);
      if (explanation.cleanup.warnings.length) {
        const heading = document.createElement("h3");
        heading.textContent = "Warnings";
        container.appendChild(heading);
        explanation.cleanup.warnings.forEach((warning) => {
          const item = document.createElement("div");
          item.className = "warning";
          item.textContent = warning;
          container.appendChild(item);
        });
      }
      if (explanation.sources.length) {
        const heading = document.createElement("h3");
        heading.textContent = "Sources";
        const list = document.createElement("ul");
        list.className = "source-list";
        explanation.sources.forEach((source) => {
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.href = source.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = source.title;
          item.appendChild(link);
          list.appendChild(item);
        });
        container.append(heading, list);
      }
    }

    function renderFolderExplanation() {
      const container = $("folderExplanation");
      const folder = state.selectedFolder;
      container.replaceChildren();
      if (!folder) {
        container.hidden = true;
        return;
      }
      if (state.explainingPath === folder.path) {
        container.hidden = false;
        container.appendChild(emptyMessage("Copilot is inspecting the folder and researching supported cleanup guidance..."));
        return;
      }
      const error = state.folderExplanationErrors.get(folder.path);
      if (error) {
        container.hidden = false;
        const message = document.createElement("div");
        message.className = "warning";
        message.textContent = "The analysis could not be displayed: " + error;
        container.appendChild(message);
        return;
      }
      const explanation = state.folderExplanations.get(folder.path);
      container.hidden = !explanation;
      if (explanation) renderExplanationContent(container, explanation);
    }

    function matchesFilters(item) {
      const search = $("search").value.trim().toLowerCase();
      const app = $("appFilter").value;
      const category = $("categoryFilter").value;
      const haystack = ((item.path || "") + " " + (item.name || "")).toLowerCase();
      return (!search || haystack.includes(search))
        && (!app || !item.app || item.app === app)
        && (!category || !item.category || item.category === category);
    }

    function createTable(headers) {
      const table = document.createElement("table");
      const head = document.createElement("thead");
      const row = document.createElement("tr");
      headers.forEach((header) => {
        const cell = document.createElement("th");
        cell.textContent = header;
        row.appendChild(cell);
      });
      head.appendChild(row);
      table.appendChild(head);
      const body = document.createElement("tbody");
      table.appendChild(body);
      return { table, body };
    }

    async function addCategorizerFromItem(item) {
      const name = window.prompt("Application or owner name for this path:", item.app || "");
      if (name === null || !name.trim()) return;
      const category = window.prompt("Storage category for this path:", item.category || "");
      if (category === null || !category.trim()) return;
      const description = window.prompt("Optional description (for example, how this data is managed):", "") || "";
      try {
        await api("/api/categorizers", {
          method: "POST",
          body: JSON.stringify({ path: item.path, name, category, description }),
        });
        state.categorizers = await api("/api/categorizers");
        renderCategorizers();
        alert("Categorizer saved. A rescan has started so it can be applied to all matching files.");
      } catch (error) {
        alert(error.message);
      }
    }

    function ensureCopilotInvestigationDialog() {
      if (!$("copilotInvestigationDialog").open) $("copilotInvestigationDialog").showModal();
    }

    function renderCopilotInvestigation() {
      const investigation = state.investigation;
      const running = investigation.status === "running";
      const finished = ["completed", "cancelled", "failed"].includes(investigation.status);
      $("copilotInvestigationTitle").textContent = investigation.itemType === "directory"
        ? "Ask Copilot about this folder"
        : "Ask Copilot about this item";
      $("copilotInvestigationStatus").textContent = running
        ? investigation.cancellationRequested
          ? "Cancelling the Copilot investigation..."
          : "Copilot is inspecting the item and researching safe cleanup guidance. This may take a moment."
        : investigation.status === "completed"
          ? "Copilot investigation completed."
          : investigation.status === "cancelled"
            ? "Copilot investigation cancelled."
            : investigation.status === "failed"
              ? "Copilot investigation could not be completed."
              : "";
      $("copilotInvestigationPath").textContent = investigation.path || "";
      $("copilotInvestigationProgress").hidden = !running;
      $("copilotInvestigationError").hidden = investigation.status !== "cancelled" && investigation.status !== "failed";
      $("copilotInvestigationError").textContent = investigation.error?.message || "";
      const response = $("copilotInvestigationResponse");
      response.hidden = investigation.status !== "completed";
      if (investigation.status === "completed") renderExplanationContent(response, investigation.result.explanation);
      $("cancelCopilotInvestigation").hidden = !running;
      $("cancelCopilotInvestigation").disabled = investigation.cancellationRequested === true;
      $("cancelCopilotInvestigation").textContent = investigation.cancellationRequested ? "Cancelling..." : "Cancel";
      $("closeCopilotInvestigation").hidden = !finished;
    }

    async function investigateItem(item, { storeInline = false } = {}) {
      if (state.investigation.status === "running") return;
      state.folderExplanationErrors.delete(item.path);
      state.explainingPath = storeInline ? item.path : null;
      state.investigation = {
        status: "running",
        path: item.path,
        itemType: item.entryType,
        cancellationRequested: false,
      };
      ensureCopilotInvestigationDialog();
      renderCopilotInvestigation();
      if (storeInline) renderFolderExplanation();
      try {
        const result = await api("/api/investigate/request", {
          method: "POST",
          body: JSON.stringify({ path: item.path }),
        });
        state.investigation = { ...state.investigation, status: "completed", result };
        if (storeInline) {
          state.folderExplanations.set(result.path, result.explanation);
          state.folderExplanationErrors.delete(result.path);
        }
      } catch (error) {
        state.investigation = {
          ...state.investigation,
          status: error.code === "investigation_cancelled" ? "cancelled" : "failed",
          error,
        };
        if (storeInline && error.code !== "investigation_cancelled") {
          state.folderExplanationErrors.set(item.path, error.message);
        }
      } finally {
        state.explainingPath = null;
        renderCopilotInvestigation();
        if (storeInline) renderFolderExplanation();
      }
    }

    async function cancelCopilotInvestigation() {
      const investigation = state.investigation;
      if (investigation.status !== "running" || investigation.cancellationRequested) return;
      state.investigation = { ...investigation, cancellationRequested: true };
      renderCopilotInvestigation();
      try {
        await api("/api/investigate/cancel", {
          method: "POST",
          body: JSON.stringify({}),
        });
      } catch (error) {
        if (state.investigation.status === "running") {
          state.investigation = { ...state.investigation, cancellationRequested: false, error };
          renderCopilotInvestigation();
        }
      }
    }

    function askCopilotToInvestigate(item) {
      investigateItem(item);
    }

    function explainSelectedFolder() {
      const folder = state.selectedFolder;
      if (!folder) return;
      const button = $("explainFolder");
      button.disabled = true;
      button.textContent = "Analyzing folder...";
      investigateItem(folder, { storeInline: true }).finally(() => {
        button.disabled = false;
        button.textContent = "Analyze folder & cleanup options";
      });
    }

    function appendItemActions(row, item) {
      const cell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "item-actions";
      const investigate = document.createElement("button");
      investigate.type = "button";
      investigate.textContent = "Ask Copilot";
      investigate.title = "Inspect local metadata and ask Copilot to research safe cleanup guidance";
      investigate.addEventListener("click", () => askCopilotToInvestigate(item));
      const categorize = document.createElement("button");
      categorize.type = "button";
      categorize.textContent = "Categorize";
      categorize.title = "Persist a custom application and storage category for this path";
      categorize.addEventListener("click", () => addCategorizerFromItem(item));
      actions.append(investigate, categorize);
      cell.appendChild(actions);
      row.appendChild(cell);
    }

    function renderTable() {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === state.tab));
      const content = $("tableContent");
      content.replaceChildren();
      $("cleanupBar").hidden = state.tab !== "candidates";
      if (state.tab === "directories") renderDirectories(content);
      if (state.tab === "files") renderFiles(content);
      if (state.tab === "cloudOnly") renderCloudOnly(content);
      if (state.tab === "candidates") renderCandidates(content);
      if (state.tab === "warnings") renderWarnings(content);
    }

    function renderDirectories(content) {
      const items = state.result.directories.filter(matchesFilters);
      const { table, body } = createTable(["Folder", "Categorizer", "Size", "Files", "Actions"]);
      items.forEach((item) => {
        const row = document.createElement("tr");
        appendPathNavigation(row, item, false);
        textCell(row, item.categorizer || "—");
        textCell(row, formatBytes(item.bytes));
        textCell(row, item.files.toLocaleString());
        appendItemActions(row, item);
        body.appendChild(row);
      });
      content.appendChild(items.length ? table : emptyMessage("No folders match the filters."));
    }

    function renderFiles(content) {
      const items = state.result.largestFiles.filter(matchesFilters);
      const { table, body } = createTable(["File", "Application", "Category", "Size", "Modified", "Actions"]);
      items.forEach((item) => {
        const row = document.createElement("tr");
        appendPathNavigation(row, item, true);
        textCell(row, item.app);
        textCell(row, item.category);
        textCell(row, formatBytes(item.bytes));
        textCell(row, new Date(item.modifiedAt).toLocaleString());
        appendItemActions(row, item);
        body.appendChild(row);
      });
      content.appendChild(items.length ? table : emptyMessage("No files match the filters."));
    }

    function renderCandidates(content) {
      const items = state.result.candidates.filter(matchesFilters);
      const { table, body } = createTable(["", "Candidate", "Reason", "Application", "Size", "Actions"]);
      items.forEach((item) => {
        const row = document.createElement("tr");
        const selectionCell = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.disabled = state.safety.directCleanupEnabled !== true;
        checkbox.checked = state.selected.has(item.id);
        checkbox.setAttribute("aria-label", "Select " + item.path);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) state.selected.add(item.id); else state.selected.delete(item.id);
          renderSelection();
        });
        selectionCell.appendChild(checkbox);
        row.appendChild(selectionCell);
        appendPathNavigation(row, item, true);
        textCell(row, item.reason);
        textCell(row, item.app);
        textCell(row, formatBytes(item.bytes));
        appendItemActions(row, item);
        body.appendChild(row);
      });
      content.appendChild(items.length ? table : emptyMessage("No conservative cleanup candidates match the filters."));
      renderSelection();
    }

    function renderCloudOnly(content) {
      const items = state.result.cloudOnlyFiles.filter(matchesFilters);
      const { table, body } = createTable(["Online-only file", "Application", "Category", "Logical size", "Modified", "Actions"]);
      items.forEach((item) => {
        const row = document.createElement("tr");
        appendPathNavigation(row, item, true);
        textCell(row, item.app);
        textCell(row, item.category);
        textCell(row, formatBytes(item.bytes));
        textCell(row, new Date(item.modifiedAt).toLocaleString());
        appendItemActions(row, item);
        body.appendChild(row);
      });
      content.appendChild(items.length ? table : emptyMessage("No cloud-only files matched the filters."));
    }

    function renderWarnings(content) {
      if (!state.result.warnings.length) {
        content.appendChild(emptyMessage("The scan completed without access warnings."));
        return;
      }
      const container = document.createElement("div");
      container.className = "panel-body";
      state.result.warnings.forEach((warning) => {
        const item = document.createElement("div");
        item.className = "warning";
        item.textContent = warning.path + " — " + warning.message;
        container.appendChild(item);
      });
      content.appendChild(container);
    }

    function emptyMessage(message) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = message;
      return empty;
    }

    function renderSelection() {
      const candidates = new Map(state.result.candidates.map((item) => [item.id, item]));
      const bytes = [...state.selected].reduce((total, id) => total + (candidates.get(id)?.bytes || 0), 0);
      const directCleanupEnabled = state.safety.directCleanupEnabled === true;
      $("selectionSummary").textContent = !directCleanupEnabled
        ? "🛡️ Allow delete is disabled. Enable it in Cleanup safety to move selected items to the Recycle Bin."
        : state.selected.size
        ? state.selected.size.toLocaleString() + " selected · " + formatBytes(bytes)
        : "No files selected";
      $("previewCleanup").disabled = !directCleanupEnabled || state.selected.size === 0;
    }

    function ensureCleanupDialog() {
      if (!$("cleanupDialog").open) $("cleanupDialog").showModal();
    }

    function renderCleanupState(cleanup) {
      // The preview response and SSE progress events can arrive out of order.
      // Never let a stale validation update hide the confirmation action.
      if (state.preview
        && state.cleanup.status === "awaiting-confirmation"
        && cleanup.status === "previewing") {
        return;
      }
      state.cleanup = cleanup;
      const active = cleanup.status === "previewing" || cleanup.status === "running";
      if (!active && !$("cleanupDialog").open) return;
      ensureCleanupDialog();

      const progress = $("cleanupProgress");
      const progressBar = progress.firstElementChild;
      const total = cleanup.total || 0;
      const completed = Math.min(cleanup.completed || 0, total);
      const percent = total ? Math.round(completed / total * 100) : 0;
      $("closeDialog").disabled = active;
      $("confirmCleanup").disabled = active;
      $("cleanupError").hidden = true;

      if (active) {
        const previewing = cleanup.status === "previewing";
        $("cleanupStatus").textContent = previewing
          ? "Validating the selected items through the centralized cleanup guard..."
          : cleanup.phase === "recycling"
            ? "Moving validated items to the Windows Recycle Bin..."
            : "Revalidating every selected path immediately before cleanup...";
        progress.hidden = false;
        progressBar.style.width = percent + "%";
        $("cleanupProgressText").textContent = completed.toLocaleString() + " of " + total.toLocaleString() + " items · " + percent + "%";
        $("cleanupCurrentPath").textContent = cleanup.currentPath || "";
        $("executeCleanup").hidden = true;
        $("cleanupResult").hidden = true;
        return;
      }

      if (cleanup.status === "completed") {
        progress.hidden = false;
        progressBar.style.width = "100%";
        $("cleanupProgressText").textContent = cleanup.total.toLocaleString() + " of " + cleanup.total.toLocaleString() + " items · 100%";
        $("cleanupCurrentPath").textContent = "";
        $("cleanupStatus").textContent = cleanup.rescanStarted === false
          ? "Cleanup completed, but the refresh scan could not start. Run a new scan to verify current storage."
          : "Cleanup completed. A refresh scan has started.";
        $("cleanupPreviewContent").hidden = true;
        $("cleanupResult").hidden = false;
        $("cleanupResultSummary").textContent = cleanup.succeeded.toLocaleString() + " items moved to the Recycle Bin · " + formatBytes(cleanup.reclaimedBytes) + " reclaimed.";
        const outcomeMessages = [];
        if (cleanup.failed) {
          outcomeMessages.push(cleanup.failed.toLocaleString() + " items were reported as not moved.");
        }
        if (cleanup.unknown) {
          outcomeMessages.push(cleanup.unknown.toLocaleString() + " items have an unknown outcome because the Recycle Bin operation ended early. Verify them with the refresh scan.");
        }
        $("cleanupFailures").hidden = outcomeMessages.length === 0;
        $("cleanupFailures").textContent = outcomeMessages.join(" ");
        $("executeCleanup").hidden = true;
        $("confirmCleanup").disabled = true;
        state.selected.clear();
        state.analyzerSelected.clear();
        if (state.result) {
          renderSelection();
          renderCustomAnalyzer();
        }
        return;
      }

      if (cleanup.status === "failed") {
        progress.hidden = true;
        $("cleanupProgressText").textContent = "";
        $("cleanupCurrentPath").textContent = "";
        $("cleanupStatus").textContent = "Cleanup did not complete.";
        $("cleanupError").hidden = false;
        $("cleanupError").textContent = cleanup.error?.message || "Cleanup failed.";
        $("executeCleanup").hidden = true;
        $("confirmCleanup").disabled = true;
      }
    }

    function showCleanupPreview(preview) {
      state.preview = preview;
      state.cleanup = { status: "awaiting-confirmation", previewId: preview.id };
      ensureCleanupDialog();
      $("cleanupStatus").textContent = "Review the exact validated paths before confirming cleanup.";
      $("cleanupProgress").hidden = true;
      $("cleanupProgressText").textContent = "";
      $("cleanupCurrentPath").textContent = "";
      $("cleanupError").hidden = true;
      $("cleanupResult").hidden = true;
      $("cleanupPreviewContent").hidden = false;
      const noun = preview.entries.some((entry) => entry.entryType === "directory") ? "items" : "files";
      $("previewSummary").textContent = preview.entries.length.toLocaleString() + " " + noun + " · " + formatBytes(preview.totalBytes) + " will be moved to the Recycle Bin.";
      $("previewRejected").hidden = preview.rejected.length === 0;
      $("previewRejected").textContent = preview.rejected.length
        ? preview.rejected.length + " selected items were rejected because they changed or failed safety validation."
        : "";
      const entries = $("previewEntries");
      entries.replaceChildren();
      preview.entries.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "modal-entry";
        item.textContent = entry.path + " — " + formatBytes(entry.bytes);
        entries.appendChild(item);
      });
      $("confirmCleanup").checked = false;
      $("confirmCleanup").disabled = false;
      $("executeCleanup").disabled = true;
      $("executeCleanup").hidden = false;
      $("closeDialog").disabled = false;
    }

    async function previewCleanup(selection) {
      state.preview = null;
      state.cleanup = {
        status: "previewing",
        phase: "validating",
        completed: 0,
        total: selection.itemIds.length,
      };
      $("cleanupPreviewContent").hidden = true;
      $("cleanupResult").hidden = true;
      ensureCleanupDialog();
      renderCleanupState(state.cleanup);
      try {
        const preview = await api("/api/cleanup/preview", {
          method: "POST",
          body: JSON.stringify(selection),
        });
        showCleanupPreview(preview);
      } catch (error) {
        renderCleanupState({
          status: "failed",
          phase: "validating",
          completed: 0,
          total: selection.itemIds.length,
          error: { message: error.message },
        });
      }
    }

    async function executeCleanup() {
      if (!state.preview || !$("confirmCleanup").checked) return;
      $("executeCleanup").disabled = true;
      renderCleanupState({
        status: "running",
        phase: "validating",
        completed: 0,
        total: state.preview.entries.length,
      });
      try {
        await api("/api/cleanup/execute", {
          method: "POST",
          body: JSON.stringify({ previewId: state.preview.id, confirmed: true }),
        });
        renderScanState(await api("/api/state"));
      } catch (error) {
        renderCleanupState({
          ...state.cleanup,
          status: "failed",
          error: { message: error.message },
        });
      }
    }

    async function startScan() {
      const scopes = [];
      if ($("scopeProfile").checked) scopes.push("profile");
      if ($("scopeProgramData").checked) scopes.push("programData");
      if (!scopes.length) { alert("Select at least one scan root."); return; }
      try { await api("/api/scan", { method: "POST", body: JSON.stringify({ scopes }) }); }
      catch (error) { alert(error.message); }
    }
    $("startScan").addEventListener("click", startScan);
    $("welcomeStartScan").addEventListener("click", startScan);
    $("cancelScan").addEventListener("click", async () => {
      try { await api("/api/cancel", { method: "POST", body: "{}" }); }
      catch (error) { alert(error.message); }
    });
    $("directCleanupEnabled").addEventListener("change", () => {
      const enabled = $("directCleanupEnabled").checked;
      if (enabled && !window.confirm(
        "Enable direct cleanup?\n\nThis permits the extension to move selected files and folders to the Windows Recycle Bin. Incorrect selections can damage applications or your system. Analyzer commands are not affected.",
      )) {
        renderSafety(state.safety);
        return;
      }
      updateSafety(
        { directCleanupEnabled: enabled, acknowledged: enabled },
        () => renderSafety(state.safety),
      );
    });
    $("analyzerProtectionEnabled").addEventListener("change", () => {
      const enabled = $("analyzerProtectionEnabled").checked;
      if (!enabled && !window.confirm(
        "Disable analyzer-folder protection?\n\nThis allows direct cleanup candidates inside folders managed by a custom analyzer after a rescan. Use the analyzer's supported commands whenever possible.",
      )) {
        renderSafety(state.safety);
        return;
      }
      updateSafety(
        { analyzerProtectionEnabled: enabled },
        () => renderSafety(state.safety),
      );
    });
    document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => { state.tab = tab.dataset.tab; renderTable(); }));
    ["search", "appFilter", "categoryFilter"].forEach((id) => $(id).addEventListener("input", renderTable));
    $("previewCleanup").addEventListener("click", () => previewCleanup({
      source: "scan",
      itemIds: [...state.selected],
    }));
    $("goUpFolder").addEventListener("click", goUpFolder);
    $("closeDialog").addEventListener("click", () => {
      if (!["previewing", "running"].includes(state.cleanup.status)) $("cleanupDialog").close();
    });
    $("cleanupDialog").addEventListener("cancel", (event) => {
      if (["previewing", "running"].includes(state.cleanup.status)) event.preventDefault();
    });
    $("confirmCleanup").addEventListener("change", () => { $("executeCleanup").disabled = !$("confirmCleanup").checked; });
    $("executeCleanup").addEventListener("click", executeCleanup);
    $("cancelAnalyzerCommand").addEventListener("click", cancelAnalyzerCommand);
    $("confirmAnalyzerCommand").addEventListener("click", executeAnalyzerCommand);
    $("closeAnalyzerCommand").addEventListener("click", () => {
      if (!["awaiting-confirmation", "running"].includes(state.analyzerCommand.status)) $("analyzerCommandDialog").close();
    });
    $("analyzerCommandDialog").addEventListener("cancel", (event) => {
      if (["awaiting-confirmation", "running"].includes(state.analyzerCommand.status)) event.preventDefault();
    });
    $("cancelCopilotInvestigation").addEventListener("click", cancelCopilotInvestigation);
    $("closeCopilotInvestigation").addEventListener("click", () => {
      if (["running"].includes(state.investigation.status)) return;
      $("copilotInvestigationDialog").close();
    });
    $("copilotInvestigationDialog").addEventListener("cancel", (event) => {
      if (state.investigation.status === "running") event.preventDefault();
    });
    $("explainFolder").addEventListener("click", explainSelectedFolder);
    $("runCustomAnalyzer").addEventListener("click", runSelectedAnalyzer);
    document.querySelector("details.analyzers").addEventListener("toggle", () => {
      if (document.querySelector("details.analyzers").open
        && state.result
        && state.customAnalyzers.length
        && !state.customAnalyses[state.analyzerId]) {
        runSelectedAnalyzer();
      }
    });
    $("customAnalyzer").addEventListener("change", () => {
      state.analyzerId = $("customAnalyzer").value;
      state.analyzerSelected.clear();
      updateAnalyzerDescription();
      if (state.customAnalyses[state.analyzerId]) renderCustomAnalyzer(); else runSelectedAnalyzer();
    });
    window.addEventListener("resize", () => { if (state.result) renderTreemap(); });

    const events = new EventSource("/events?token=" + encodeURIComponent(token));
    events.onmessage = (event) => renderScanState(JSON.parse(event.data));
    events.onerror = () => {
      $("scanError").hidden = false;
      $("scanError").textContent = "The storage provider connection was interrupted. Reload the canvas if it does not reconnect.";
    };
    api("/api/state").then(renderScanState).catch((error) => {
      $("scanError").hidden = false;
      $("scanError").textContent = error.message;
    });
    loadCategorizers();
    loadCustomAnalyzers();
    history.replaceState(null, "", location.pathname);
  </script>
</body>
</html>`.replace("__TOKEN__", JSON.stringify(token));
}
