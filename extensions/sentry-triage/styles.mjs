export function styles() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* The embedded webview flickers between arrow and pointer on hover for
       interactive controls (links, buttons, selects, checkboxes), which is
       more confusing than helpful. Force a stable arrow so nothing flashes;
       hover color/underline still signal what is clickable. */
    a, button, select, summary, label,
    input[type="checkbox"], input[type="radio"] {
      cursor: default;
    }

    body {
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif);
      background: var(--background-color-default, #0d1117);
      color: var(--text-color-default, #e6edf3);
      padding: 20px;
      box-sizing: border-box;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px 12px;
      margin-bottom: 12px;
    }

    .page-header h1 {
      font-size: var(--text-title-large, 22px);
      font-weight: var(--font-weight-semibold, 600);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      line-height: 1;
    }

    .page-header h1 .sentry-logo {
      height: 0.92em;
      width: auto;
      flex: 0 0 auto;
      display: block;
    }

    /* Sentry brand mark: matches the wordmark text color so it inverts with the
       host theme (the app themes via CSS variables, not prefers-color-scheme). */
    .page-header h1 .sentry-logo path {
      fill: currentColor;
    }

    .refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: none;
      border: 1px solid var(--border-color-default, #30363d);
      color: var(--text-color-default, #e6edf3);
      border-radius: 6px;
      padding: 4px 12px;
      font-size: var(--text-small, 13px);
      font-weight: var(--font-weight-semibold, 600);
    }
    .refresh-icon { font-size: 15px; line-height: 1; }
    .refresh-btn:hover { border-color: var(--color-focus-outline, #58a6ff); }

    .title-mode-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 4px 0 14px;
      padding: 8px 12px;
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 8px;
      background: var(--color-canvas-subtle, rgba(110, 118, 129, 0.08));
    }
    .switch-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: var(--text-small, 13px);
      font-weight: var(--font-weight-semibold, 600);
      color: var(--text-color-default, #e6edf3);
    }
    .switch { position: relative; display: inline-flex; }
    .switch-input {
      position: absolute;
      opacity: 0;
      width: 36px;
      height: 20px;
      margin: 0;
      cursor: pointer;
    }
    .switch-slider {
      width: 36px;
      height: 20px;
      border-radius: 999px;
      background: var(--border-color-default, #30363d);
      transition: background 0.15s ease;
      position: relative;
      flex: none;
    }
    .switch-slider::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.15s ease;
    }
    .switch-input:checked + .switch-slider { background: var(--color-focus-outline, #58a6ff); }
    .switch-input:checked + .switch-slider::after { transform: translateX(16px); }
    .switch-input:focus-visible + .switch-slider { outline: 2px solid var(--color-focus-outline, #58a6ff); outline-offset: 2px; }
    .title-mode-hint {
      font-size: var(--text-small, 12px);
      color: var(--text-color-muted, #8b949e);
    }

    .header-controls {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 12px;
    }
    .control-divider {
      width: 1px;
      align-self: stretch;
      min-height: 20px;
      background: var(--border-color-default, #30363d);
    }
    .scope-switchers {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .project-switcher {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .project-switcher-label {
      font-size: var(--text-small, 12px);
      color: var(--text-color-muted, #8b949e);
    }
    .project-select {
      background: var(--background-color-default, #0d1117);
      border: 1px solid var(--border-color-default, #30363d);
      color: var(--text-color-default, #e6edf3);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: var(--text-small, 13px);
      min-width: 0;
      max-width: 220px;
      flex: 0 1 auto;
    }
    .project-select:hover { border-color: var(--color-focus-outline, #58a6ff); }
    .org-switcher-select { cursor: pointer; }
    .period-switcher {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .period-switcher-label {
      font-size: var(--text-small, 12px);
      color: var(--text-color-muted, #8b949e);
    }
    .period-select {
      background: var(--background-color-default, #0d1117);
      border: 1px solid var(--border-color-default, #30363d);
      color: var(--text-color-default, #e6edf3);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: var(--text-small, 13px);
      cursor: pointer;
    }
    .period-select:hover { border-color: var(--color-focus-outline, #58a6ff); }
    .project-fetch-btn {
      background: var(--color-accent-emphasis, #1f6feb);
      border: 1px solid var(--color-accent-emphasis, #1f6feb);
      color: var(--color-fg-on-emphasis, #ffffff);
      border-radius: 6px;
      padding: 4px 12px;
      font-size: var(--text-small, 13px);
      font-weight: var(--font-weight-semibold, 600);
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .project-fetch-btn:hover { opacity: 0.85; }

    /* Project autocomplete (a text input + a filtered suggestion menu). A native
       <datalist> does not repaint in this webview, and a <select> is unwieldy for
       orgs with many projects, so we draw our own combobox menu. */
    .project-ac { position: relative; display: inline-block; }
    .org-field .project-ac { display: block; flex: 1; }
    .project-ac-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      min-width: 100%;
      max-width: 340px;
      max-height: 260px;
      overflow-y: auto;
      background: var(--background-color-default, #161b22);
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 6px;
      z-index: 40;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      padding: 4px;
      box-sizing: border-box;
    }
    .project-ac-menu[hidden] { display: none; }
    .project-ac-item {
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      color: var(--text-color-default, #e6edf3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .project-ac-item:hover,
    .project-ac-item.active {
      background: var(--color-accent-emphasis, #1f6feb);
      color: var(--color-fg-on-emphasis, #ffffff);
    }
    .project-ac-item .project-ac-all { color: var(--text-color-muted, #8b949e); font-style: italic; }
    .project-ac-item.active .project-ac-all,
    .project-ac-item:hover .project-ac-all { color: var(--color-fg-on-emphasis, #ffffff); }
    /* Checkmark on a slug confirmed to exist via a live project.view lookup
       (a project the paged autocomplete list never reached). */
    .project-ac-item .project-ac-verified {
      margin-left: 6px;
      color: var(--color-success-fg, #3fb950);
      font-weight: 600;
    }
    .project-ac-item.active .project-ac-verified,
    .project-ac-item:hover .project-ac-verified { color: var(--color-fg-on-emphasis, #ffffff); }
    .project-ac-empty,
    .project-ac-more {
      padding: 6px 8px;
      font-size: 12px;
      color: var(--text-color-muted, #8b949e);
    }
    /* While a newly-selected org's projects are being fetched, dim the field and
       show a subtle pulse so the "loading projects…" placeholder reads as busy. */
    .project-ac-loading {
      opacity: 0.75;
      animation: project-ac-pulse 1.1s ease-in-out infinite;
    }
    @keyframes project-ac-pulse {
      0%, 100% { opacity: 0.55; }
      50% { opacity: 0.9; }
    }

    @media (max-width: 640px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }
      .header-controls {
        width: 100%;
      }
      .control-divider {
        display: none;
      }
      .project-select {
        max-width: none;
        flex: 1 1 140px;
      }
      .scope-switchers,
      .project-switcher,
      .period-switcher {
        flex: 1 1 auto;
      }
    }

    .scan-overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(1, 4, 9, 0.72);
      backdrop-filter: blur(2px);
      z-index: 1000;
      cursor: progress;
    }
    .scan-overlay-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      padding: 24px 32px;
    }
    .scan-spinner {
      width: 34px;
      height: 34px;
      border: 3px solid var(--border-color-default, #30363d);
      border-top-color: var(--color-focus-outline, #58a6ff);
      border-radius: 50%;
      animation: scan-spin 0.8s linear infinite;
    }
    .scan-overlay-text {
      color: var(--text-color-default, #e6edf3);
      font-size: var(--text-body, 14px);
    }
    @keyframes scan-spin { to { transform: rotate(360deg); } }

    .page-subtitle {
      font-size: var(--text-body-medium, 14px);
      color: var(--text-color-default, #8b949e);
      margin-bottom: 20px;
    }

    .page-description {
      font-size: var(--text-body-medium, 14px);
      color: var(--text-color-default, #8b949e);
      margin-bottom: 4px;
      line-height: 1.5;
    }

    .setup-instructions {
      border: 1px solid var(--border-color-default, #30363d);
      background: var(--color-canvas-subtle, rgba(110, 118, 129, 0.08));
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 10px;
    }
    .setup-instructions h2 {
      font-size: 15px;
      font-weight: var(--font-weight-semibold, 600);
      margin-bottom: 4px;
    }
    .setup-instructions p {
      font-size: 13px;
      color: var(--text-color-muted, #8b949e);
      line-height: 1.4;
      margin-bottom: 6px;
    }
    .setup-instructions ol {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .setup-instructions li {
      font-size: 12.5px;
      color: var(--text-color-default, #e6edf3);
      line-height: 1.35;
    }

    .setup-scan {
      margin: 8px 0 12px;
    }
    .setup-scan .org-submit {
      width: 100%;
    }

    /* Category */
    .category {
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }

    .category-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color-default, #30363d);
    }

    .category-header h2 {
      font-size: 15px;
      font-weight: var(--font-weight-semibold, 600);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .category-description {
      font-size: 12px;
      color: var(--text-color-default, #8b949e);
      margin-top: 4px;
      line-height: 1.4;
    }

    .category-select-all {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-color-default, #8b949e);
      user-select: none;
    }

    .badge {
      background: var(--border-color-default, #30363d);
      color: var(--text-color-default, #e6edf3);
      font-size: 12px;
      font-weight: 500;
      padding: 1px 8px;
      border-radius: 12px;
    }

    .card-list {
      max-height: 320px;
      overflow-y: auto;
    }

    /* Card */
    .card {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-color-default, #21262d);
      transition: opacity 0.3s, transform 0.3s;
    }
    .card:last-child { border-bottom: none; }
    .card.removing {
      opacity: 0;
      transform: translateX(20px);
    }

    .card-checkbox {
      position: relative;
      z-index: 1;
      padding-top: 2px;
      flex-shrink: 0;
    }
    .card-checkbox input {
      width: 15px;
      height: 15px;
      accent-color: var(--color-focus-outline, #58a6ff);
    }

    .card-link {
      flex: 1;
      min-width: 0;
      color: inherit;
      display: block;
    }

    .card-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .card-key {
      font-size: 13px;
      font-weight: var(--font-weight-semibold, 600);
      color: var(--color-focus-outline, #58a6ff);
      white-space: nowrap;
      text-decoration: none;
    }
    .card-key:hover { text-decoration: underline; }

    .card-summary {
      font-size: 13px;
      color: var(--text-color-default, #e6edf3);
    }

    .card-reason {
      display: block;
      font-size: 12px;
      color: var(--text-color-default, #8b949e);
      margin-top: 2px;
    }

    /* Per-card model override select (only shown when the card is selected) */
    .card-model-wrap {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-shrink: 0;
      align-self: center;
      font-size: 11px;
      color: var(--text-color-muted, #8b949e);
    }
    .card-model-label {
      font-weight: var(--font-weight-semibold, 600);
      white-space: nowrap;
    }
    .card-model {
      max-width: 150px;
      padding: 4px 6px;
      border-radius: 6px;
      border: 1px solid var(--border-color-default, #30363d);
      background: var(--background-color-default, #161b22);
      color: var(--text-color-default, #e6edf3);
      font-size: 11px;
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif);
    }

    /* Bulk action */
    .bulk-action {
      display: block;
      width: 100%;
      padding: 10px 16px;
      background: none;
      border: none;
      border-top: 1px solid var(--border-color-default, #30363d);
      color: var(--color-focus-outline, #58a6ff);
      font-size: 13px;
      font-weight: var(--font-weight-semibold, 600);
      text-align: left;
    }
    .bulk-action:hover {
      background: var(--border-color-default, #161b22);
    }

    /* Done state */
    .category-done {
      padding: 14px 16px;
      font-size: 13px;
      color: #3fb950;
    }

    /* Empty state */
    .empty-state {
      flex: 1 1 auto;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 20px;
      font-size: 15px;
      color: var(--text-color-default, #8b949e);
    }

    #empty-msg { display: block; margin-bottom: 10px; }

    .empty-tips {
      font-size: 13px;
      color: var(--text-color-muted, #8b949e);
      max-width: 46ch;
      margin: 0 auto 14px;
      line-height: 1.5;
    }
    .empty-state-error .empty-tips { display: none; }

    .empty-state-error #empty-msg {
      color: var(--color-danger-fg, #f85149);
      max-width: 44ch;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.45;
    }

    .link-btn {
      background: none;
      border: none;
      color: var(--color-focus-outline, #58a6ff);
      font-size: inherit;
      text-decoration: underline;
    }

    .org-picker {
      padding: 8px 0;
    }

    .org-form {
      display: flex;
      gap: 8px;
      margin-top: 0;
    }

    .org-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }
    .org-field-label {
      font-size: var(--text-small, 12px);
      font-weight: var(--font-weight-semibold, 600);
      color: var(--text-color-muted, #8b949e);
    }
    .org-field-optional {
      font-weight: var(--font-weight-normal, 400);
      opacity: 0.8;
    }
    .org-field .org-input {
      width: 100%;
      box-sizing: border-box;
    }

    .org-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 6px;
      background: var(--background-color-default, #161b22);
      color: var(--text-color-default, #e6edf3);
      font-size: 14px;
      line-height: 1.5;
      box-sizing: border-box;
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif);
    }
    .org-input:focus {
      outline: 2px solid var(--color-focus-outline, #58a6ff);
      outline-offset: -1px;
    }

    .org-submit {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: var(--color-focus-outline, #58a6ff);
      color: #fff;
      font-size: 14px;
      font-weight: var(--font-weight-semibold, 600);
    }
    .org-submit:hover:not(:disabled) { opacity: 0.9; }
    .org-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .org-default {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px 10px;
      margin-top: 8px;
    }
    .set-default-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 6px;
      background: var(--background-color-default, #161b22);
      color: var(--text-color-default, #e6edf3);
      font-size: var(--text-small, 12px);
      font-weight: var(--font-weight-semibold, 600);
      cursor: pointer;
    }
    .set-default-btn:hover:not(:disabled) { border-color: var(--color-focus-outline, #58a6ff); }
    .set-default-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .set-default-btn[aria-pressed="true"] .set-default-star {
      color: var(--color-attention-fg, #d29922);
    }
    .set-default-star { font-size: 14px; line-height: 1; }
    .set-default-hint {
      font-size: var(--text-small, 12px);
      color: var(--text-color-muted, #8b949e);
    }
    .set-default-hint code {
      font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
      font-size: 11px;
    }

    .card-meta {
      display: block;
      font-size: 11px;
      color: var(--text-color-default, #6e7681);
      margin-top: 2px;
    }

    .card-work-status {
      position: relative;
      z-index: 1;
      display: inline-block;
      margin-top: 6px;
      font-size: 11px;
      border-radius: 12px;
      padding: 2px 8px;
      border: 1px solid var(--border-color-default, #30363d);
      color: var(--text-color-default, #8b949e);
      background: rgba(110, 118, 129, 0.15);
    }
    .card-work-status.working {
      color: #d29922;
      border-color: rgba(210, 153, 34, 0.5);
      background: rgba(210, 153, 34, 0.12);
    }
    .card-work-status.done {
      color: #3fb950;
      border-color: rgba(63, 185, 80, 0.55);
      background: rgba(63, 185, 80, 0.14);
    }
    .card-work-status.handed-off {
      color: #a371f7;
      border-color: rgba(163, 113, 247, 0.55);
      background: rgba(163, 113, 247, 0.14);
    }
    .card-work-status.skipped {
      color: #58a6ff;
      border-color: rgba(88, 166, 255, 0.55);
      background: rgba(88, 166, 255, 0.12);
    }
    .card-work-status.tracked {
      color: #39c5bb;
      border-color: rgba(57, 197, 187, 0.55);
      background: rgba(57, 197, 187, 0.12);
    }
    .card-work-status.error {
      color: #f85149;
      border-color: rgba(248, 81, 73, 0.6);
      background: rgba(248, 81, 73, 0.14);
    }
    .card-work-links {
      display: inline-block;
      margin-left: 6px;
      font-weight: 500;
      position: relative;
      z-index: 1;
      pointer-events: auto;
    }
    .card-work-links a {
      color: inherit;
      text-decoration: underline;
    }

    .card-related {
      display: block;
      margin-top: 6px;
      font-size: 11px;
      font-weight: 500;
      color: #d29922;
      position: relative;
      z-index: 1;
      pointer-events: auto;
    }
    .card-related a {
      color: inherit;
      text-decoration: underline;
    }

    .work-toolbar {
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      background: var(--background-color-default, #0d1117);
    }
    .work-toolbar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .work-selected-btn {
      border: 1px solid var(--color-focus-outline, #58a6ff);
      background: none;
      color: var(--color-focus-outline, #58a6ff);
      border-radius: 6px;
      padding: 7px 10px;
      font-size: 13px;
      font-weight: var(--font-weight-semibold, 600);
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .work-selected-btn:hover:not(:disabled) {
      background: rgba(88, 166, 255, 0.12);
    }
    .work-selected-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      border-color: var(--border-color-default, #30363d);
      color: var(--text-color-default, #8b949e);
    }
    .settings-toggle {
      border: 1px solid var(--border-color-default, #30363d);
      background: none;
      color: var(--text-color-default, #e6edf3);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 13px;
    }
    .settings-toggle:hover {
      border-color: var(--color-focus-outline, #58a6ff);
    }
    .toolbar-model {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-color-muted, #8b949e);
    }
    .work-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .action-or {
      font-size: 12px;
      font-weight: var(--font-weight-semibold, 600);
      color: var(--text-color-muted, #8b949e);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .work-toolbar-row .settings-toggle {
      margin-left: auto;
    }
    .fix-copilot-btn {
      border: 1px solid var(--color-focus-outline, #58a6ff);
      background: var(--color-focus-outline, #58a6ff);
      color: #ffffff;
      border-radius: 6px;
      padding: 7px 12px;
      font-size: 13px;
      font-weight: var(--font-weight-semibold, 600);
      transition: filter 0.15s, opacity 0.15s;
    }
    .fix-copilot-btn:hover:not(:disabled) {
      filter: brightness(1.08);
    }
    .fix-copilot-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .toolbar-model-label {
      font-weight: var(--font-weight-semibold, 600);
      white-space: nowrap;
    }
    .toolbar-model .settings-select {
      width: auto;
      min-width: 150px;
    }
    .toolbar-model .settings-select:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .work-summary-callout {
      margin-top: 12px;
      padding: 8px 10px;
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 6px;
      background: var(--color-canvas-subtle, rgba(110, 118, 129, 0.1));
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .work-summary-title {
      font-size: 11px;
      font-weight: var(--font-weight-semibold, 600);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-color-muted, #8b949e);
    }
    .work-target-summary {
      font-size: 12px;
      color: var(--text-color-default, #8b949e);
      line-height: 1.4;
    }
    .summary-line {
      display: block;
    }
    .summary-line + .summary-line {
      margin-top: 3px;
    }
    .work-settings {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border-color-default, #30363d);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .settings-section {
      padding: 10px 12px;
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 8px;
      background: var(--background-color-inset, rgba(110, 118, 129, 0.08));
    }
    .settings-section h3 {
      font-size: 13px;
      font-weight: var(--font-weight-semibold, 600);
      margin: 0 0 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-color-muted, rgba(110, 118, 129, 0.25));
    }
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
    }
    .settings-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    .settings-subgroup {
      margin-top: 10px;
      transition: opacity 0.15s;
    }
    .settings-subgroup.dimmed {
      display: none;
    }
    .settings-group-title {
      display: block;
      margin-bottom: 4px;
      font-size: 11px;
      font-weight: var(--font-weight-semibold, 600);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-color-muted, #8b949e);
    }
    .settings-hint {
      margin: 6px 0 0;
      font-size: 11px;
      line-height: 1.4;
      color: var(--text-color-muted, #8b949e);
    }
    .settings-label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: var(--text-color-default, #8b949e);
    }
    .settings-input,
    .settings-select {
      width: 100%;
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid var(--border-color-default, #30363d);
      background: var(--background-color-default, #161b22);
      color: var(--text-color-default, #e6edf3);
      font-size: 12px;
      line-height: 1.5;
      box-sizing: border-box;
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif);
    }

    /* Normalize native <select> chrome so dropdowns match the height and
       padding of sibling text inputs, then draw our own caret. */
    .org-select,
    select.settings-input,
    .settings-select {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='%238b949e' stroke-width='1.5'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 12px 12px;
    }
    .org-select { padding-right: 30px; }
    select.settings-input,
    .settings-select { padding-right: 26px; }
    .save-settings-btn {
      margin-top: 8px;
      border: 1px solid var(--color-focus-outline, #58a6ff);
      background: none;
      color: var(--color-focus-outline, #58a6ff);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: var(--font-weight-semibold, 600);
      transition: background 0.15s;
    }
    .save-settings-btn:hover:not(:disabled) {
      background: rgba(88, 166, 255, 0.12);
    }

    /* ---- Connection preflight: Sentry setup gate + GitHub warning banner ---- */
    .sentry-gate { display: none; }
    body.sentry-gated .sentry-gate { display: block; }
    /* When Sentry isn't connected, hide the normal chrome and show only the gate. */
    body.sentry-gated .header-controls,
    body.sentry-gated .org-picker,
    body.sentry-gated .setup-instructions,
    body.sentry-gated .setup-scan,
    body.sentry-gated #work-settings,
    body.sentry-gated .page-description,
    body.sentry-gated .page-subtitle,
    body.sentry-gated #work-toolbar,
    body.sentry-gated #categories,
    body.sentry-gated #empty-state { display: none !important; }

    .sentry-gate {
      margin: 8px 0 4px;
    }
    .gate-card {
      border: 1px solid var(--border-color-attention, rgba(210, 153, 34, 0.4));
      border-left: 3px solid var(--text-color-attention, #d29922);
      border-radius: 8px;
      background: var(--background-color-attention, rgba(210, 153, 34, 0.1));
      padding: 16px 18px;
      max-width: 560px;
    }
    .gate-icon { font-size: 22px; line-height: 1; }
    .gate-card h2 {
      font-size: 16px;
      font-weight: var(--font-weight-semibold, 600);
      margin: 8px 0 6px;
    }
    .gate-lead {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-color-default, #e6edf3);
      margin: 0 0 8px;
    }
    .gate-steps {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.6;
      color: var(--text-color-muted, #8b949e);
    }
    .gate-steps code {
      font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
      font-size: 11.5px;
      background: rgba(110, 118, 129, 0.15);
      padding: 1px 5px;
      border-radius: 4px;
    }
    .gate-error {
      margin: 10px 0 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--danger-color, #f85149);
      background: rgba(248, 81, 73, 0.1);
      border: 1px solid rgba(248, 81, 73, 0.35);
      border-radius: 6px;
      padding: 8px 10px;
      text-align: left;
    }
    .gate-action-btn {
      margin-top: 4px;
      padding: 6px 14px;
      font-size: 12.5px;
      font-weight: var(--font-weight-semibold, 600);
      color: var(--text-color-default, #e6edf3);
      background: var(--background-color-default, #21262d);
      border: 1px solid var(--border-color-default, #30363d);
      border-radius: 6px;
      cursor: pointer;
    }
    .gate-action-btn:hover:not(:disabled) { border-color: var(--color-focus-outline, #58a6ff); }
    .gate-action-btn:disabled { opacity: 0.6; cursor: default; }
    .gate-install-status {
      margin: 8px 0 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-color-muted, #8b949e);
    }

    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--border-color-default, #1f2937);
      border: 1px solid var(--border-color-default, #30363d);
      color: var(--text-color-default, #e6edf3);
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 1000;
    }
  `
}
