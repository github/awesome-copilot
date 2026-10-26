// Keep Sentry's Scraps palette and logo, with the crisp app-shell spacing and
// restrained controls used by Site Generator. Host theme variables keep the
// neutral surfaces legible in both light and dark themes.
export function styles() {
  return `
    :root {
      --st-font: "Rubik", var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif);
      --st-mono: "Roboto Mono", var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);

      --st-bg: var(--background-color-default, #18181b);
      --st-fg: var(--text-color-default, #e7e7ea);
      --st-muted: var(--text-color-muted, #9d9da6);
      --st-border-host: var(--border-color-default, #303036);

      --st-accent: #6c5fc7;
      --st-accent-hover: #6052b8;
      --st-accent-fg: color-mix(in srgb, var(--st-accent) 55%, var(--st-fg));
      --st-accent-tint: color-mix(in srgb, var(--st-accent) 12%, transparent);
      --st-accent-tint-strong: color-mix(in srgb, var(--st-accent) 20%, transparent);

      --st-danger: #f55459;
      --st-warning: #f5b000;
      --st-success: #2ba185;
      --st-pink: #ff45a8;
      --st-info: #3c74dd;

      --st-surface-0: var(--st-bg);
      --st-surface-1: color-mix(in srgb, var(--st-bg) 97%, var(--st-fg));
      --st-surface-2: color-mix(in srgb, var(--st-bg) 94%, var(--st-fg));
      --st-surface-3: color-mix(in srgb, var(--st-bg) 89%, var(--st-fg));
      --st-border: var(--st-border-host);
      --st-border-muted: color-mix(in srgb, var(--st-border) 65%, transparent);

      --st-radius-lg: 12px;
      --st-radius: 8px;
      --st-radius-sm: 6px;
      --st-radius-pill: 999px;
      --st-ease: cubic-bezier(0.23, 1, 0.32, 1);
      --st-shadow-float: 0 12px 32px -8px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* The embedded webview flickers between arrow and pointer on hover for
       interactive controls, which is more confusing than helpful. Keep a stable
       arrow; hover color and elevation still signal what is clickable. */
    a, button, select, summary, label,
    input[type="checkbox"], input[type="radio"] {
      cursor: default;
    }

    body {
      font-family: var(--st-font);
      font-size: 13px;
      line-height: 1.45;
      background: var(--st-surface-0);
      color: var(--st-fg);
      --st-gutter: 24px;
      padding: 0 var(--st-gutter) 32px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
    }

    ::selection { background: var(--st-accent-tint-strong); }

    :focus-visible {
      outline: 2px solid var(--st-accent);
      outline-offset: 2px;
    }

    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--st-muted) 35%, transparent);
      border-radius: 999px;
      border: 2px solid transparent;
      background-clip: padding-box;
    }
    ::-webkit-scrollbar-thumb:hover { background-color: color-mix(in srgb, var(--st-muted) 55%, transparent); }
    ::-webkit-scrollbar-track { background: transparent; }

    code {
      font-family: var(--st-mono);
      font-size: 0.92em;
      background: var(--st-surface-2);
      border: 1px solid var(--st-border-muted);
      padding: 1px 5px;
      border-radius: 5px;
    }

    /* ---------- Shared controls ---------- */

    .refresh-btn,
    .project-fetch-btn,
    .settings-toggle,
    .work-selected-btn,
    .fix-copilot-btn,
    .save-settings-btn,
    .gate-action-btn,
    .set-default-btn,
    .org-submit {
      font-family: inherit;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 32px;
      padding: 0 14px;
      border-radius: var(--st-radius-sm);
      border: 1px solid var(--st-border);
      background: var(--st-surface-1);
      color: var(--st-fg);
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      box-shadow: none;
      transition: background-color 0.15s ease, border-color 0.15s ease,
        color 0.15s ease, opacity 0.15s ease;
    }
    .refresh-btn:hover:not(:disabled),
    .settings-toggle:hover:not(:disabled),
    .work-selected-btn:hover:not(:disabled),
    .save-settings-btn:hover:not(:disabled),
    .gate-action-btn:hover:not(:disabled),
    .set-default-btn:hover:not(:disabled) {
      background: var(--st-surface-2);
    }
    .refresh-btn:active:not(:disabled),
    .project-fetch-btn:active:not(:disabled),
    .settings-toggle:active:not(:disabled),
    .work-selected-btn:active:not(:disabled),
    .fix-copilot-btn:active:not(:disabled),
    .save-settings-btn:active:not(:disabled),
    .gate-action-btn:active:not(:disabled),
    .set-default-btn:active:not(:disabled),
    .org-submit:active:not(:disabled) {
      transform: none;
      box-shadow: none;
    }

    /* Primary: Sentry's existing purple accent */
    .fix-copilot-btn,
    .org-submit,
    .gate-action-btn {
      background: var(--st-accent);
      border-color: var(--st-accent);
      color: #fff;
      box-shadow: none;
    }
    .fix-copilot-btn:hover:not(:disabled),
    .org-submit:hover:not(:disabled),
    .gate-action-btn:hover:not(:disabled) {
      background: var(--st-accent-hover);
    }
    .fix-copilot-btn:active:not(:disabled),
    .org-submit:active:not(:disabled),
    .gate-action-btn:active:not(:disabled) {
      box-shadow: none;
    }
    .project-fetch-btn:hover:not(:disabled) { background: var(--st-surface-2); }
    .fix-copilot-btn:disabled,
    .org-submit:disabled,
    .gate-action-btn:disabled {
      opacity: 1;
      color: var(--st-muted);
      background: var(--st-surface-1);
      border-color: var(--st-border-muted);
    }

    .settings-toggle[aria-expanded="true"] { background: var(--st-surface-3); }
    .header-controls .refresh-btn,
    .header-controls .settings-toggle {
      width: 30px;
      height: 30px;
      padding: 0;
      justify-content: center;
    }

    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* Inputs & selects */
    .project-select,
    .period-select,
    .org-input,
    .settings-input,
    .settings-select,
    .card-model {
      font-family: inherit;
      height: 32px;
      padding: 0 10px;
      border-radius: var(--st-radius-sm);
      border: 1px solid var(--st-border);
      background: var(--st-surface-0);
      color: var(--st-fg);
      font-size: 13px;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .project-select:hover,
    .period-select:hover,
    .org-input:hover,
    .settings-input:hover,
    .settings-select:hover:not(:disabled),
    .card-model:hover {
      border-color: color-mix(in srgb, var(--st-muted) 45%, var(--st-border));
    }
    .project-select:focus,
    .period-select:focus,
    .org-input:focus,
    .settings-input:focus,
    .settings-select:focus,
    .card-model:focus {
      outline: none;
      border-color: var(--st-accent);
      box-shadow: 0 0 0 3px var(--st-accent-tint-strong);
    }
    ::placeholder { color: color-mix(in srgb, var(--st-muted) 75%, transparent); }

    .org-select,
    .period-select,
    .org-switcher-select,
    .settings-select,
    .card-model {
      -webkit-appearance: none;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='%239a8aab' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4.5 6.5 8 10l3.5-3.5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 14px 14px;
      background-color: var(--st-surface-1);
      box-shadow: none;
      padding-right: 28px;
    }

    /* ---------- Header ---------- */

    .page-header {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: 12px 20px;
      margin: 0 calc(-1 * var(--st-gutter)) 16px;
      padding: 14px var(--st-gutter) 10px;
      background: var(--st-surface-0);
      border-bottom: 1px solid var(--st-border);
    }

    .page-header h1 {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 30px;
      min-width: 0;
      line-height: 1;
    }
    .brand-mark {
      display: inline-grid;
      place-items: center;
      width: 28px;
      height: 28px;
      flex: none;
      border-radius: 7px;
      color: var(--st-fg);
      background: var(--st-surface-3);
    }
    .brand-mark .sentry-logo { width: 16px; height: auto; display: block; }
    .brand-mark .sentry-logo path { fill: currentColor; }
    .brand-title {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.005em;
    }

    .header-controls {
      grid-column: 2;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 8px;
    }
    .header-controls > .control-divider {
      width: 1px;
      height: 18px;
      margin: 0 4px;
      background: var(--st-border-muted);
    }
    .header-controls > .control-divider:last-of-type { display: none; }
    .header-controls > #refresh { position: static; margin-left: auto; }
    .header-controls > #refresh + #toggle-pr-settings { margin-left: -4px; }
    .scope-switchers { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .project-switcher,
    .period-switcher { display: flex; align-items: center; gap: 6px; }
    .project-switcher-label,
    .period-switcher-label {
      font-size: 12px;
      color: var(--st-muted);
    }
    .header-controls .project-switcher-label,
    .header-controls .period-switcher-label {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .header-controls .project-select,
    .header-controls .period-select { height: 30px; }
    .header-controls .project-select { width: 150px; }
    .header-controls #org-switcher { width: 120px; }
    .header-controls .project-fetch-btn { height: 30px; padding: 0 10px; }
    .refresh-icon { flex: none; }

    #triage-desc { display: none; }
    .page-description {
      font-size: 13px;
      color: var(--st-muted);
      margin: 0 0 2px;
    }
    .page-description strong { color: var(--st-fg); font-weight: 500; }

    /* ---------- Project autocomplete ---------- */

    .project-ac { position: relative; display: inline-block; }
    .org-field .project-ac { display: block; flex: 1; }
    .project-ac-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      min-width: 100%;
      max-width: 340px;
      max-height: 280px;
      overflow-y: auto;
      background: var(--st-surface-1);
      border: 1px solid var(--st-border);
      border-radius: var(--st-radius);
      z-index: 40;
      box-shadow: var(--st-shadow-float);
      padding: 4px;
    }
    .project-ac-menu[hidden] { display: none; }
    .project-ac-item {
      padding: 7px 10px;
      border-radius: 6px;
      font-size: 13px;
      color: var(--st-fg);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .project-ac-item:hover,
    .project-ac-item.active { background: var(--st-surface-3); }
    .project-ac-item .project-ac-all { color: var(--st-muted); font-style: italic; }
    .project-ac-item .project-ac-verified { margin-left: 6px; color: var(--st-success); font-weight: 600; }
    .project-ac-empty,
    .project-ac-more { padding: 7px 10px; font-size: 12px; color: var(--st-muted); }
    .project-ac-loading { animation: project-ac-pulse 1.1s ease-in-out infinite; }
    @keyframes project-ac-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.95; } }

    /* ---------- Overview dashboard ---------- */

    .overview { position: relative; padding-bottom: 24px; display: flex; flex-direction: column; gap: 12px; }
    .overview::after {
      content: "";
      position: absolute;
      left: calc(-1 * var(--st-gutter));
      right: calc(-1 * var(--st-gutter));
      bottom: 0;
      border-bottom: 1px solid var(--st-border);
    }
    .overview[hidden] { display: none; }
    .ov-title {
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 600;
      line-height: 1.25;
      letter-spacing: -0.02em;
      color: var(--st-fg);
    }
    .ov-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) repeat(2, minmax(0, 1fr));
      border: var(--st-border);
      border-radius: var(--st-radius-lg);
      background: var(--st-surface-1);
      overflow: hidden;
    }
    .ov-tile {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 14px 16px;
      min-width: 0;
    }
    .ov-tile + .ov-tile { border-left: 1px solid var(--st-border-muted); }
    .ov-label { font-size: 13px; font-weight: 500; color: var(--st-muted); }
    .ov-value {
      font-size: 24px;
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: -0.01em;
      font-variant-numeric: tabular-nums;
    }
    .ov-sub { font-size: 12px; color: var(--st-muted); }
    .ov-of { color: var(--st-muted); font-weight: 500; }

    .ov-chart {
      display: flex;
      flex-direction: column;
      border: var(--st-border);
      border-radius: var(--st-radius-lg);
      background: var(--st-surface-1);
      overflow: hidden;
    }
    .ov-chart[hidden] { display: none; }
    .ov-chart-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      padding: 12px 16px;
      background: var(--st-surface-2);
      border-bottom: 1px solid var(--st-border-muted);
    }
    .ov-chart-svg { width: 100%; height: 96px; display: block; margin-top: 12px; }
    .ov-chart-fill { fill: var(--st-accent); opacity: 0.14; }
    .ov-chart-line { fill: none; stroke: var(--st-accent); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
    .ov-chart-axis { display: flex; justify-content: space-between; padding: 6px 16px 12px; font-size: 12px; color: var(--st-muted); font-variant-numeric: tabular-nums; }

    .card-spark { flex: none; align-self: center; }
    .card-spark-fill { fill: var(--st-accent); opacity: 0.15; }
    .card-spark-line { fill: none; stroke: var(--st-accent); stroke-width: 1.25; vector-effect: non-scaling-stroke; }
    .ov-cat[data-jump="regressions"] { --cat: var(--st-warning); }
    .ov-cat[data-jump="escalating"] { --cat: var(--st-danger); }
    .ov-cat[data-jump="new-critical"] { --cat: var(--st-pink); }
    .ov-cats { display: flex; flex-wrap: wrap; gap: 2px 12px; }
    .ov-cat {
      font: inherit;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 0;
      border: none;
      background: none;
      color: var(--st-muted);
      transition: color 0.15s ease;
    }
    .ov-cat[hidden] { display: none; }
    .ov-cat:hover { color: var(--st-fg); }
    .ov-cat:focus-visible { outline: 2px solid var(--st-accent); outline-offset: 2px; border-radius: 3px; }
    .ov-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--cat); flex: none; }
    .ov-cat-count { color: var(--st-fg); font-weight: 600; font-variant-numeric: tabular-nums; }

    .agent-strip {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 12px;
      padding: 8px 12px;
      border: 1px solid var(--st-border-muted);
      border-radius: var(--st-radius);
      background: var(--st-surface-1);
    }
    .agent-strip[hidden] { display: none; }
    .agent-strip-title {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--st-fg);
    }
    .agent-pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--st-muted); opacity: 0.6; }
    .overview.has-active-work .agent-pulse {
      background: var(--st-accent);
      opacity: 1;
      animation: agent-pulse 1.6s ease-out infinite;
    }
    @keyframes agent-pulse {
      0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--st-accent) 60%, transparent); }
      100% { box-shadow: 0 0 0 8px transparent; }
    }
    .agent-chips { display: inline-flex; flex-wrap: wrap; gap: 6px; }
    .agent-chip {
      --tone: var(--st-muted);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 8px;
      border-radius: var(--st-radius-pill);
      font-size: 12px;
      color: color-mix(in srgb, var(--tone) 80%, var(--st-fg));
      background: color-mix(in srgb, var(--tone) 14%, transparent);
    }
    .agent-chip b { font-weight: 600; }
    .agent-chip.working { --tone: var(--st-warning); }
    .agent-chip.handed-off { --tone: var(--st-accent); }
    .agent-chip.done { --tone: var(--st-success); }
    .agent-chip.tracked { --tone: #2fb3c4; }
    .agent-chip.skipped { --tone: var(--st-info); }
    .agent-chip.error { --tone: var(--st-danger); }

    /* ---------- Action toolbar ---------- */

    .work-toolbar {
      position: sticky;
      top: 0;
      z-index: 30;
      padding: 28px 0 12px;
      margin: 0;
      background: var(--st-surface-0);
    }
    .work-toolbar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .work-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .fix-copilot-btn { font-weight: 600; }
    .toolbar-model { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--st-muted); }
    .settings-select:has(option[data-placeholder]:checked) { color: var(--st-muted); }
    .toolbar-model .settings-select { width: auto; min-width: 150px; }
    .toolbar-model .settings-select:disabled { opacity: 0.45; cursor: not-allowed; }


    /* ---------- Settings drawer ---------- */

    .work-settings {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .settings-bar { display: none; grid-column: 1 / -1; }
    body.settings-open .settings-bar { display: flex; }
    body.settings-open .settings-actions { display: flex; }
    .settings-bar { flex-direction: column; align-items: stretch; gap: 12px; }
    .settings-bar .detail-back { align-self: flex-start; }
    .settings-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 0 0 6px; }
    .settings-title { margin: 0; }
    .settings-actions { display: none; flex-wrap: wrap; gap: 8px; margin-left: auto; }
    .save-settings-btn.is-primary { background: var(--st-accent); border-color: var(--st-accent); color: #fff; }
    .save-settings-btn.is-primary:hover:not(:disabled) { background: var(--st-accent-hover); }
    .save-settings-btn.is-primary:disabled { color: var(--st-muted); background: var(--st-surface-1); border-color: var(--st-border-muted); }
    body.settings-open #triage-desc,
    body.settings-open #overview,
    body.settings-open #work-toolbar,
    body.settings-open #categories,
    body.settings-open #empty-state { display: none !important; }
    .settings-section {
      padding: 12px 14px;
      border: 1px solid var(--st-border);
      border-radius: var(--st-radius);
      background: var(--st-surface-1);
    }
    .settings-section h3 {
      font-size: 12px;
      font-weight: 600;
      color: var(--st-fg);
      margin: 0 0 10px;
    }
    .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
    .settings-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 10px; }
    .settings-row + .settings-group-title { margin-top: 10px; }
    .settings-subgroup { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--st-border-muted); }
    .settings-subgroup.dimmed { display: none; }
    .settings-group-title {
      display: block;
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: 500;
      color: var(--st-muted);
    }
    .settings-hint { margin: 6px 0 0; font-size: 11.5px; line-height: 1.45; color: var(--st-muted); }
    .settings-hint strong { color: var(--st-fg); font-weight: 500; }
    .settings-label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; font-weight: 600; color: var(--st-fg); }
    .settings-input, .settings-select { width: 100%; }
    .settings-section .save-settings-btn { margin-top: 12px; }


    /* ---------- Issue table ---------- */

    #categories { display: flex; flex-direction: column; }

    .issue-table {
      border: 1px solid var(--st-border);
      border-radius: var(--st-radius);
      overflow: hidden;
      scroll-margin-top: 80px;
    }
    .issue-tabs {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 16px;
      background: var(--st-surface-1);
      border-bottom: 1px solid var(--st-border);
    }
    .issue-tablist { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-left: -10px; }
    .issue-tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 32px;
      padding: 0 10px;
      border: none;
      border-radius: var(--st-radius-sm);
      background: none;
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      color: var(--st-muted);
      cursor: pointer;
      transition: color 0.15s ease, background-color 0.15s ease;
    }
    .issue-tab:hover:not(:disabled) { color: var(--st-fg); background: var(--st-surface-2); }
    .issue-tab[aria-selected="true"] { color: var(--st-fg); font-weight: 600; }
    .issue-tab:disabled { opacity: 0.45; cursor: default; }
    .issue-tab:focus-visible { outline: 2px solid var(--st-accent); outline-offset: 2px; }
    .issue-tab .badge { background: var(--st-surface-3); color: var(--st-fg); }
    .issue-tab[data-tab="regressions"] { --cat: var(--st-warning); }
    .issue-tab[data-tab="escalating"] { --cat: var(--st-danger); }
    .issue-tab[data-tab="new-critical"] { --cat: var(--st-pink); }
    .issue-tab[data-tab]:not([data-tab="all"]) .badge {
      color: var(--cat);
      background: color-mix(in srgb, var(--cat) 16%, transparent);
    }
    .category-select-all { display: flex; cursor: pointer; }
    .issue-table .card { padding: 12px 16px; }
    .issue-table .card-list { margin-bottom: -1px; }

    .issue-table[data-tab="regressions"] .card:not([data-category="regressions"]),
    .issue-table[data-tab="escalating"] .card:not([data-category="escalating"]),
    .issue-table[data-tab="new-critical"] .card:not([data-category="new-critical"]) { display: none; }

    [data-category="regressions"] { --cat: var(--st-warning); }
    [data-category="escalating"] { --cat: var(--st-danger); }
    [data-category="new-critical"] { --cat: var(--st-pink); }
    .card-cat {
      flex: none;
      align-self: center;
      padding: 1px 8px;
      border-radius: var(--st-radius-pill);
      font-size: 11.5px;
      font-weight: 600;
      line-height: 1.5;
      color: var(--cat, var(--st-muted));
      background: color-mix(in srgb, var(--cat, var(--st-muted)) 16%, transparent);
    }
    .card-cat + .card-key { margin-left: 2px; }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      padding: 0 7px;
      border-radius: var(--st-radius-pill);
      font-size: 11.5px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--st-muted);
      background: var(--st-surface-3);
    }

    input[type="checkbox"] {
      appearance: none;
      -webkit-appearance: none;
      flex: none;
      display: inline-grid;
      place-content: center;
      width: 16px;
      height: 16px;
      margin: 0;
      border: 1px solid var(--st-border);
      border-radius: 4px;
      background: var(--st-surface-3);
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }
    input[type="checkbox"]:hover:not(:disabled) { border-color: color-mix(in srgb, var(--st-border) 60%, var(--st-fg)); }
    input[type="checkbox"]::after {
      content: "";
      width: 9px;
      height: 5px;
      margin-top: -2px;
      border: solid #fff;
      border-width: 0 0 2px 2px;
      transform: rotate(-45deg) scale(0);
      transition: transform 0.12s ease;
    }
    input[type="checkbox"]:checked,
    input[type="checkbox"]:indeterminate {
      background: var(--st-accent);
      border-color: var(--st-accent);
    }
    input[type="checkbox"]:checked::after { transform: rotate(-45deg) scale(1); }
    input[type="checkbox"]:indeterminate::after {
      width: 8px;
      height: 0;
      margin-top: 0;
      border-width: 0 0 2px;
      transform: none;
    }
    input[type="checkbox"]:focus-visible { outline: 2px solid var(--st-accent); outline-offset: 2px; }
    input[type="checkbox"]:disabled { opacity: 0.45; }

    /* ---------- Issue rows ---------- */

    .card {
      position: relative;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      column-gap: 16px;
      align-items: center;
      padding: 14px 12px;
      border-bottom: 1px solid var(--st-border-muted);
      cursor: pointer;
      transition: background-color 0.15s ease, opacity 0.3s var(--st-ease), transform 0.3s var(--st-ease);
    }
    .card:hover { background: var(--st-surface-1); }
    .card:has(.issue-check:checked) {
      background: var(--st-surface-2);
      box-shadow: inset 2px 0 0 var(--st-accent);
    }
    .card.removing { opacity: 0; transform: translateX(20px); }

    .card-checkbox { display: flex; align-self: start; padding-top: 2px; }
    .card-link { min-width: 0; display: flex; flex-direction: column; gap: 6px; }

    .card-summary {
      font: inherit;
      display: block;
      width: 100%;
      padding: 0;
      border: none;
      background: none;
      text-align: left;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      color: var(--st-fg);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 0.15s ease;
    }
    .card-summary:focus-visible { outline: 2px solid var(--st-accent); outline-offset: 2px; border-radius: 3px; }

    .card-sub {
      display: flex;
      align-items: baseline;
      gap: 6px;
      min-width: 0;
      font-size: 12px;
      color: var(--st-muted);
    }
    .card-key {
      flex: none;
      font-family: var(--st-mono);
      font-size: 11.5px;
      color: var(--st-muted);
      text-decoration: none;
      border-radius: 3px;
    }
    .card-key:hover { color: var(--st-fg); text-decoration: underline; text-underline-offset: 2px; }
    .card-key:focus-visible { outline: 2px solid var(--st-accent); outline-offset: 2px; }
    .card-reason { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-reason::before { content: "·"; margin-right: 6px; }

    .card-meta { display: flex; gap: 24px; }
    .metric {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      min-width: 40px;
      line-height: 1.2;
      font-size: 11px;
      color: var(--st-muted);
    }
    .metric b { font-size: 13.5px; font-weight: 600; color: var(--st-fg); font-variant-numeric: tabular-nums; }

    .card-model-wrap {
      grid-column: 2 / -1;
      justify-self: start;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
      font-size: 12px;
      color: var(--st-muted);
      cursor: default;
    }
    .card-model-label { font-weight: 500; white-space: nowrap; }
    .card-model { max-width: 180px; height: 26px; font-size: 12px; }

    .card-work-status {
      --tone: var(--st-muted);
      position: relative;
      z-index: 1;
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
      padding: 1px 8px;
      border-radius: var(--st-radius-pill);
      font-size: 11.5px;
      font-weight: 500;
      color: color-mix(in srgb, var(--tone) 80%, var(--st-fg));
      background: color-mix(in srgb, var(--tone) 14%, transparent);
    }
    .card-work-status.working { --tone: var(--st-warning); }
    .card-work-status.working::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--tone) 35%, transparent);
      border-top-color: var(--tone);
      animation: scan-spin 0.8s linear infinite;
    }
    .card-work-status.done { --tone: var(--st-success); }
    .card-work-status.handed-off { --tone: var(--st-accent); }
    .card-work-status.skipped { --tone: var(--st-info); }
    .card-work-status.tracked { --tone: #2fb3c4; }
    .card-work-status.error { --tone: var(--st-danger); }
    .card-work-links { display: inline-flex; gap: 6px; margin-left: 4px; font-weight: 500; position: relative; z-index: 1; }
    .card-work-links a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }

    .card-related {
      display: block;
      margin-top: 2px;
      font-size: 11.5px;
      font-weight: 500;
      color: color-mix(in srgb, var(--st-warning) 80%, var(--st-fg));
      position: relative;
      z-index: 1;
    }
    .card-related a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }

    .bulk-action {
      font-family: inherit;
      display: block;
      width: 100%;
      padding: 10px 16px;
      background: none;
      border: none;
      border-top: 1px solid var(--st-border-muted);
      color: var(--st-fg);
      font-size: 13px;
      font-weight: 500;
      text-align: left;
    }
    .bulk-action:hover { background: var(--st-surface-2); }
    .category-done { padding: 14px 12px; font-size: 13px; color: var(--st-success); }

    /* ---------- Empty state ---------- */

    .empty-state {
      flex: 1 1 auto;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 56px 24px;
      margin-top: 4px;
      font-size: 17px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--st-fg);
      border: 1px dashed var(--st-border);
      border-radius: var(--st-radius-lg);
      background: var(--st-surface-1);
    }
    .empty-state::before {
      content: "\\2713";
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      margin-bottom: 14px;
      border-radius: 14px;
      font-size: 22px;
      font-weight: 400;
      color: var(--st-success);
      background: color-mix(in srgb, var(--st-success) 15%, transparent);
      border: 1px solid color-mix(in srgb, var(--st-success) 35%, transparent);
    }
    .empty-state.empty-state-error::before {
      content: "!";
      color: var(--st-danger);
      background: color-mix(in srgb, var(--st-danger) 15%, transparent);
      border-color: color-mix(in srgb, var(--st-danger) 35%, transparent);
    }
    #empty-msg { display: block; margin-bottom: 8px; max-width: 52ch; line-height: 1.35; }
    .empty-tips { font-size: 13px; font-weight: 400; letter-spacing: 0; color: var(--st-muted); max-width: 44ch; margin: 0 auto 14px; line-height: 1.55; text-wrap: pretty; }
    .empty-state-error .empty-tips { display: none; }
    .empty-state-error #empty-msg { color: var(--st-danger); }

    .link-btn {
      font-family: inherit;
      background: none;
      border: none;
      color: var(--st-fg);
      font-size: 13px;
      font-weight: 500;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    /* ---------- Setup (no org yet) ---------- */

    .org-picker {
      padding: 14px 16px;
      margin-bottom: 12px;
      border: 1px solid var(--st-border);
      border-radius: var(--st-radius-lg);
      background: var(--st-surface-1);
    }
    .org-form { display: flex; gap: 10px; flex-wrap: wrap; }
    .org-field { display: flex; flex-direction: column; gap: 5px; flex: 1 1 200px; }
    .org-field-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--st-fg);
    }
    .org-field-optional { font-weight: 400; color: var(--st-muted); }
    .org-field .org-input, .org-input { width: 100%; }

    .org-default { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; margin-top: 12px; }
    .set-default-btn { height: 28px; padding: 0 10px; font-size: 12px; }
    .set-default-btn[aria-pressed="true"] .set-default-star { color: var(--st-warning); }
    .set-default-star { font-size: 14px; line-height: 1; }
    .set-default-hint { font-size: 12px; color: var(--st-muted); }
    .set-default-hint code { font-size: 11px; }

    .setup-scan { margin: 4px 0 14px; }
    .setup-scan .org-submit { width: 100%; height: 40px; font-size: 14px; font-weight: 600; }

    /* ---------- Connection gate ---------- */

    .sentry-gate { display: none; margin: 4px 0; }
    body.sentry-gated .sentry-gate { display: flex; justify-content: center; padding: 28px 0; }
    body.sentry-gated .header-controls,
    body.sentry-gated .org-picker,
    body.sentry-gated .setup-scan,
    body.sentry-gated #work-settings,
    body.sentry-gated .page-description,
    body.sentry-gated #overview,
    body.sentry-gated #work-toolbar,
    body.sentry-gated #categories,
    body.sentry-gated #empty-state { display: none !important; }

    .gate-card {
      width: 100%;
      max-width: 520px;
      padding: 24px 26px;
      text-align: center;
      border: 1px solid var(--st-border);
      border-radius: var(--st-radius-lg);
      background: var(--st-surface-1);
    }
    .gate-icon {
      display: inline-grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      font-size: 22px;
      line-height: 1;
      background: color-mix(in srgb, var(--st-warning) 15%, transparent);
      border: 1px solid color-mix(in srgb, var(--st-warning) 35%, transparent);
    }
    .gate-card h2 { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; margin: 14px 0 8px; }
    .gate-lead { font-size: 13px; line-height: 1.55; color: var(--st-muted); max-width: 44ch; margin: 0 auto 6px; text-wrap: pretty; }
    .gate-steps { max-width: 44ch; margin: 0 auto 14px; font-size: 13px; line-height: 1.55; color: var(--st-muted); text-wrap: pretty; }
    .gate-action-btn { height: 36px; padding: 0 18px; font-weight: 600; }
    .gate-error {
      margin: 14px 0 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--st-danger);
      background: color-mix(in srgb, var(--st-danger) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--st-danger) 35%, transparent);
      border-radius: var(--st-radius-sm);
      padding: 8px 10px;
      text-align: left;
    }
    .gate-install-status { margin: 10px 0 0; font-size: 12px; line-height: 1.5; color: var(--st-muted); }

    /* ---------- Scan overlay & toast ---------- */

    .scan-overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--st-bg) 70%, transparent);
      backdrop-filter: blur(6px);
      z-index: 1000;
      cursor: progress;
    }
    .scan-overlay-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      padding: 24px 32px;
      border: 1px solid var(--st-border);
      border-radius: var(--st-radius-lg);
      background: var(--st-surface-1);
      box-shadow: var(--st-shadow-float);
    }
    .scan-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--st-surface-3);
      border-top-color: var(--st-muted);
      border-radius: 50%;
      animation: scan-spin 0.8s linear infinite;
    }
    .scan-overlay-text { color: var(--st-fg); font-size: 13px; font-weight: 500; }
    @keyframes scan-spin { to { transform: rotate(360deg); } }

    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      max-width: min(560px, calc(100vw - 32px));
      padding: 10px 16px;
      border: 1px solid var(--st-border);
      border-radius: var(--st-radius);
      background: var(--st-surface-2);
      color: var(--st-fg);
      font-size: 13px;
      box-shadow: var(--st-shadow-float);
      z-index: 1000;
      animation: toast-in 0.25s var(--st-ease);
    }
    @keyframes toast-in { from { opacity: 0; transform: translate(-50%, 8px); } }

    /* ---------- Issue detail view ---------- */

    body.detail-open { overflow: hidden; }
    .detail { position: fixed; inset: 0; z-index: 200; }
    .detail[hidden] { display: none; }
    .detail-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .detail.is-open .detail-backdrop { opacity: 1; }
    .detail-panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(960px, 100%);
      display: flex;
      flex-direction: column;
      background: var(--st-bg);
      border-left: 1px solid var(--st-border-muted);
      box-shadow: var(--st-shadow-float);
      outline: none;
      opacity: 0;
      transform: translateX(24px);
      transition: transform 0.25s var(--st-ease), opacity 0.2s ease;
    }
    .detail.is-open .detail-panel { opacity: 1; transform: none; }
    .detail-bar {
      flex: none;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 24px;
      border-bottom: 1px solid var(--st-border);
      background: var(--st-surface-0);
    }
    .detail-crumb {
      flex: 1;
      min-width: 0;
      font-family: var(--st-mono);
      font-size: 12px;
      color: var(--st-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .detail-bar-actions { display: flex; gap: 8px; margin-left: auto; }
    .detail-back, .detail-btn {
      font: inherit;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 12px;
      border-radius: var(--st-radius-sm);
      border: 1px solid var(--st-border);
      background: var(--st-surface-2);
      color: var(--st-fg);
      font-size: 12.5px;
      font-weight: 500;
      text-decoration: none;
      white-space: nowrap;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }
    .detail-back { background: none; border-color: transparent; padding: 0 8px; margin-left: -8px; }
    .detail-back:hover, .detail-btn:hover:not(:disabled) { background: var(--st-surface-3); }
    .detail-btn.primary { background: var(--st-accent); border-color: var(--st-accent); color: #fff; }
    .detail-btn.primary:hover:not(:disabled) { background: var(--st-accent-hover); }
    .detail-btn[hidden] { display: none; }
    .detail-panel :focus-visible { outline: 2px solid var(--st-accent); outline-offset: 2px; }

    .detail-body {
      flex: 1;
      overflow-y: auto;
      padding: 28px 24px 48px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      user-select: text;
    }
    .dv-head { display: flex; flex-direction: column; gap: 4px; }
    .dv-head { padding-bottom: 20px; border-bottom: 1px solid var(--st-border); }
    .dv-badges { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 6px; }
    .dv-badge {
      padding: 1px 8px;
      border-radius: var(--st-radius-pill);
      font-size: 11.5px;
      font-weight: 500;
      color: var(--st-muted);
      background: var(--st-surface-3);
    }
    .dv-badge.lvl-error, .dv-badge.lvl-fatal {
      color: color-mix(in srgb, var(--st-danger) 80%, var(--st-fg));
      background: color-mix(in srgb, var(--st-danger) 15%, transparent);
    }
    .dv-badge.lvl-warning {
      color: color-mix(in srgb, var(--st-warning) 80%, var(--st-fg));
      background: color-mix(in srgb, var(--st-warning) 15%, transparent);
    }
    .dv-title { font-size: 18px; font-weight: 600; line-height: 1.3; letter-spacing: -0.01em; overflow-wrap: anywhere; }
    .dv-value { max-width: 72ch; font-size: 13px; color: var(--st-muted); overflow-wrap: anywhere; text-wrap: pretty; }
    .dv-culprit { font-family: var(--st-mono); font-size: 12px; color: var(--st-muted); overflow-wrap: anywhere; }
    .dv-sub { margin-top: 9px; font-size: 12px; color: var(--st-muted); }
    .dv-muted { font-size: 12px; color: var(--st-muted); }

    .dv-stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      border: 1px solid var(--st-border-muted);
      border-radius: var(--st-radius);
      background: var(--st-surface-1);
      overflow: hidden;
    }
    .dv-stat {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: baseline;
      gap: 2px 6px;
      min-width: 0;
      padding: 10px 14px;
      border-left: 1px solid var(--st-border-muted);
    }
    .dv-stat:first-child { border-left: none; }
    .dv-stat span { grid-column: 1 / -1; font-size: 12px; color: var(--st-muted); }
    .dv-stat b { font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .dv-stat small {
      min-width: 0;
      font-size: 14px;
      font-weight: 400;
      color: var(--st-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dv-card { min-width: 0; padding-top: 18px; border-top: 1px solid var(--st-border-muted); }
    .dv-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 26px; margin-bottom: 10px; }
    .dv-card-head h3 { font-size: 16px; font-weight: 600; }
    .dv-head + .dv-card { padding-top: 0; border-top: none; }
    .dv-card > .dv-value { margin-bottom: 12px; }
    .dv-details > summary { list-style: none; margin-bottom: 0; }
    .dv-details > summary::-webkit-details-marker { display: none; }
    .dv-details > summary h3 { display: inline-flex; align-items: center; gap: 10px; }
    .dv-details > summary h3::before {
      content: "";
      width: 6px;
      height: 6px;
      border-right: 1.5px solid currentColor;
      border-bottom: 1.5px solid currentColor;
      transform: rotate(-45deg);
      transition: transform 0.15s var(--st-ease);
    }
    .dv-details[open] > summary h3::before { transform: translateY(-2px) rotate(45deg); }
    .dv-details[open] > summary { margin-bottom: 10px; }
    .dv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px 32px; }
    .dv-grid:empty { display: none; }
    .dv-empty { font-size: 12.5px; color: var(--st-muted); }
    .dv-link { font-size: 12px; color: var(--st-accent-fg); text-decoration: none; }
    .dv-link:hover { text-decoration: underline; text-underline-offset: 2px; }
    .dv-pill {
      flex: none;
      padding: 0 7px;
      border-radius: var(--st-radius-pill);
      font-family: var(--st-font);
      font-size: 11px;
      color: var(--st-muted);
      background: var(--st-surface-3);
    }

    .dv-seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 7px; background: var(--st-surface-3); }
    .dv-seg button {
      font: inherit;
      height: 22px;
      padding: 0 10px;
      border: none;
      border-radius: 5px;
      background: none;
      color: var(--st-muted);
      font-size: 11.5px;
      font-weight: 500;
    }
    .dv-seg button[aria-pressed="true"] { background: var(--st-bg); color: var(--st-fg); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); }
    .dv-chart-total { margin-bottom: 8px; font-size: 12px; color: var(--st-muted); }
    .dv-chart-total b { color: var(--st-fg); font-weight: 600; }
    .dv-chart { display: block; width: 100%; height: 96px; }
    .dv-chart-fill { fill: var(--st-accent); opacity: 0.14; }
    .dv-chart-line { fill: none; stroke: var(--st-accent); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
    .dv-chart-hit { fill: var(--st-accent); opacity: 0; transition: opacity 0.1s ease; }
    .dv-chart-hit:hover { opacity: 0.08; }
    .dv-axis { display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: var(--st-muted); }

    .dv-tags { display: flex; flex-direction: column; gap: 14px; }
    .dv-tag-name { margin-bottom: 2px; font-size: 12px; color: var(--st-muted); }
    .dv-tag-vals { list-style: none; }
    .dv-tag-row {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(48px, 3fr) 4ch;
      align-items: center;
      gap: 12px;
      padding: 3px 0;
      font-size: 12px;
    }
    .dv-tag-val { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dv-tag-track { height: 4px; border-radius: 2px; background: var(--st-surface-3); overflow: hidden; }
    .dv-tag-bar { display: block; height: 100%; border-radius: inherit; background: var(--st-fg); opacity: 0.4; }
    .dv-tag-pct { text-align: right; color: var(--st-muted); font-variant-numeric: tabular-nums; }

    .dv-ex + .dv-ex { margin-top: 14px; }
    .dv-ex-head { margin-bottom: 8px; font-family: var(--st-mono); font-size: 12.5px; overflow-wrap: anywhere; }
    .dv-frames { list-style: none; border: 1px solid var(--st-border-muted); border-radius: var(--st-radius-sm); overflow: hidden; }
    .dv-frame {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 6px 10px;
      font-family: var(--st-mono);
      font-size: 12px;
      border-bottom: 1px solid var(--st-border-muted);
    }
    .dv-frame:last-child { border-bottom: none; }
    .dv-frame.in-app { background: var(--st-surface-1); }
    .dv-fn { font-weight: 500; }
    .dv-file { flex: 1; min-width: 0; color: var(--st-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .dv-trace-id { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 12px; color: var(--st-muted); }
    .dv-trace-id code {
      padding: 1px 6px;
      border-radius: 4px;
      font-family: var(--st-mono);
      font-size: 12px;
      color: var(--st-fg);
      background: var(--st-surface-3);
      overflow-wrap: anywhere;
    }
    .dv-spans { list-style: none; margin-left: 4px; border-left: 2px solid var(--st-border-muted); }
    .dv-span { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 8px; padding: 6px 10px; }
    .dv-span.current { background: var(--st-surface-2); border-radius: 0 6px 6px 0; }
    .dv-span-dot { grid-row: span 2; width: 8px; height: 8px; margin-top: 5px; border-radius: 50%; background: var(--st-muted); }
    .dv-span-dot.error { background: var(--st-danger); }
    .dv-span-dot.transaction { background: var(--st-info); }
    .dv-span-desc { font-size: 12.5px; overflow-wrap: anywhere; }
    .dv-span-meta { grid-column: 2; font-size: 11.5px; color: var(--st-muted); }

    .dv-crumbs { list-style: none; }
    .dv-crumbs li {
      display: grid;
      grid-template-columns: 110px minmax(0, 1fr) auto;
      gap: 10px;
      padding: 5px 0;
      font-size: 12px;
      border-bottom: 1px solid var(--st-border-muted);
    }
    .dv-crumbs li:last-child { border-bottom: none; }
    .dv-crumb-cat { font-family: var(--st-mono); color: var(--st-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dv-crumb-msg { font-family: var(--st-mono); overflow-wrap: anywhere; }
    .dv-crumb-time { color: var(--st-muted); font-variant-numeric: tabular-nums; }

    .dv-activity { list-style: none; }
    .dv-activity li { position: relative; display: flex; align-items: baseline; gap: 10px; padding: 5px 0 5px 20px; font-size: 12.5px; }
    .dv-activity li::before {
      content: "";
      position: absolute;
      z-index: 1;
      left: 1px;
      top: 11px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--st-border);
      box-shadow: 0 0 0 3px var(--st-bg);
    }
    .dv-activity li:first-child::before { background: var(--st-fg); }
    .dv-activity li:not(:last-child)::after {
      content: "";
      position: absolute;
      left: 4px;
      top: 14px;
      bottom: -14px;
      width: 1px;
      background: var(--st-border-muted);
    }
    .dv-act-what { flex: 1; }
    .dv-act-when { font-size: 12px; color: var(--st-muted); }

    .dv-kv { display: grid; grid-template-columns: minmax(120px, max-content) minmax(0, 1fr); gap: 4px 16px; font-size: 12px; }
    .dv-kv dt { font-family: var(--st-mono); color: var(--st-muted); }
    .dv-kv dd { font-family: var(--st-mono); overflow-wrap: anywhere; }

    .dv-error { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 12px; text-align: center; }
    .dv-error h2 { font-size: 16px; font-weight: 600; }
    .dv-error .detail-btn { margin-top: 6px; }

    .sk { display: block; border-radius: 6px; background: var(--st-surface-3); animation: sk-pulse 1.2s ease-in-out infinite; }
    .sk-line { height: 12px; }
    .sk-badge { width: 64px; height: 18px; border-radius: var(--st-radius-pill); }
    .sk-num { width: 56px; height: 16px; margin: 3px 0 2px; }
    .sk-culprit { width: 45%; margin-top: 4px; }
    .sk-total { width: 38%; margin-bottom: 10px; }
    .sk-chart { height: 118px; }
    .sk-frames { height: 168px; }
    .dv-sk-lines { display: flex; flex-direction: column; gap: 12px; padding-top: 4px; }
    @keyframes sk-pulse { 50% { opacity: 0.5; } }
    @media (prefers-reduced-motion: reduce) { .sk { animation: none; } }

    /* ---------- Responsive ---------- */

    @media (max-width: 900px) {
      .page-header { grid-template-columns: minmax(0, 1fr); }
      .header-controls {
        grid-column: 1;
        justify-content: flex-start;
      }
      .dv-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .dv-stat:nth-child(3) { border-left: none; }
      .dv-stat:nth-child(n + 3) { border-top: 1px solid var(--st-border-muted); }
    }
    @media (max-width: 640px) {
      body { --st-gutter: 16px; padding: 0 var(--st-gutter) 16px; }
      .toolbar-model { margin-left: 0; }
      .toolbar-model .settings-select { min-width: 0; max-width: 104px; }
      .card-meta { gap: 12px; }
      .detail-body { padding: 16px; }
      .dv-head { padding-bottom: 16px; }
      .detail-crumb { display: none; }
      .dv-crumbs li { grid-template-columns: minmax(0, 1fr) auto; }
      .dv-crumb-cat { display: none; }
      .settings-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 520px) {
      .ov-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .ov-grid .ov-tile:first-child { grid-column: 1 / -1; }
      .ov-grid .ov-tile:nth-child(2) { border-left: none; }
      .ov-grid .ov-tile:nth-child(n + 2) { border-top: 1px solid var(--st-border-muted); }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  `
}
