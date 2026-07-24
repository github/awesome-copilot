const CAPABILITY_TOKEN_MARKER = "__PR_ARTIFACT_EXPLORER_CAPABILITY_TOKEN__";

function escapeHtmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export const HTML = `<!doctype html>
<html lang="en" data-color-mode="auto" data-light-theme="light" data-dark-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="pr-artifact-explorer-token" content="${CAPABILITY_TOKEN_MARKER}" />
    <title>PR Artifact Explorer</title>
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="/assets/primer-color-modes.css" />
    <link rel="stylesheet" href="/assets/primer-core.css" />
    <link rel="stylesheet" href="/assets/primer-product.css" />
    <link rel="stylesheet" href="/assets/asciinema-player.css" />
    <link rel="stylesheet" href="/assets/app.css" />
    <script defer src="/assets/asciinema-player.min.js"></script>
    <script defer src="/assets/trx-preview.js"></script>
    <script defer src="/assets/app.js"></script>
  </head>
  <body>
    <div class="app-shell">
      <header class="Header app-header">
        <a class="Header-item Header-link app-brand" href="#/" aria-label="Artifact Explorer home">
          <span class="octicon icon-mark-github app-brand-mark" aria-hidden="true"></span>
          <span>Artifact Explorer</span>
        </a>
        <form id="repository-form" class="Header-item Header-item--full repository-form" role="search" novalidate>
          <div id="repository-combobox" class="repository-combobox">
            <div class="repository-input-shell">
              <label class="sr-only" for="repository-input">Repository or pull request</label>
              <span class="octicon icon-search repository-search-icon" aria-hidden="true"></span>
              <input
                id="repository-input"
                class="Header-input repository-input"
                autocomplete="off"
                placeholder="Find a repository"
                spellcheck="false"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="repository-results"
                aria-expanded="false"
              />
              <button
                id="repository-menu-button"
                class="repository-menu-button"
                type="button"
                aria-label="Open repository quick switch"
                aria-controls="repository-panel"
                aria-expanded="false"
              >
                <span class="octicon icon-chevron-down" aria-hidden="true"></span>
              </button>
            </div>
            <div id="repository-panel" class="repository-panel" hidden>
              <div class="repository-panel-header">
                <strong>Repositories</strong>
                <span>Pin one and favorite up to three</span>
              </div>
              <div id="repository-results" class="repository-results" role="listbox"></div>
              <div class="repository-panel-footer">Type <code>owner/</code> to browse that account.</div>
            </div>
          </div>
        </form>
        <div class="Header-item header-cache-item">
          <a id="cache-link" class="Header-link cache-link" href="#/cache">
            <span class="octicon icon-package" aria-hidden="true"></span>
            <span id="cache-label">Cache</span>
          </a>
        </div>
        <div class="Header-item account-control">
          <a id="account-button" class="account-chip" href="#/accounts" aria-label="GitHub account" title="GitHub account">
            <span id="account-fallback" class="account-avatar-fallback">
              <span class="octicon icon-person" aria-hidden="true"></span>
            </span>
            <img id="account-avatar" class="account-avatar" alt="" hidden />
          </a>
        </div>
      </header>
      <nav id="breadcrumbs" class="breadcrumb-bar" aria-label="Breadcrumb"></nav>
      <main id="view" class="container-xl app-main" aria-live="polite"></main>
      <div id="toast-region" class="toast-region" role="status" aria-live="polite"></div>
    </div>
  </body>
</html>`;

export function renderHtml(capabilityToken) {
  return HTML.replace(
    CAPABILITY_TOKEN_MARKER,
    escapeHtmlAttribute(capabilityToken),
  );
}
