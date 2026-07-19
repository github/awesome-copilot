const view = document.getElementById("view");
const breadcrumbs = document.getElementById("breadcrumbs");
const repositoryForm = document.getElementById("repository-form");
const repositoryInput = document.getElementById("repository-input");
const repositoryCombobox = document.getElementById("repository-combobox");
const repositoryMenuButton = document.getElementById("repository-menu-button");
const repositoryPanel = document.getElementById("repository-panel");
const repositoryResults = document.getElementById("repository-results");
const accountButton = document.getElementById("account-button");
const accountAvatar = document.getElementById("account-avatar");
const accountFallback = document.getElementById("account-fallback");
const cacheLabel = document.getElementById("cache-label");
const toastRegion = document.getElementById("toast-region");

let bootstrapState = null;
let currentArtifact = null;
let currentPullContext = null;
let currentPlayer = null;
let currentPlayerIsPlaying = false;
let artifactFilters = {
  context: null,
  query: "",
  status: "all",
  run: "latest",
};
const artifactDownloadProgress = new Map();
const LARGE_ARTIFACT_PROGRESS_BYTES = 2 * 1024 * 1024;
const MAX_VISIBLE_ARTIFACT_FILES = 1_000;
const EXPAND_ALL_FILE_TREE_LIMIT = 200;
const PULL_PAYLOAD_CACHE_FRESH_MS = 30 * 1_000;
const PULL_PAYLOAD_CACHE_STALE_MS = 10 * 60 * 1_000;
const PULL_PAYLOAD_CACHE_LIMIT = 30;
const PULL_QUERY_QUALIFIERS = [
  {
    name: "in",
    description: "Search within a field",
    values: [
      ["title", "Pull request titles"],
      ["body", "Pull request descriptions"],
      ["comments", "Pull request comments"],
    ],
  },
  {
    name: "is",
    description: "Filter by state or type",
    values: [
      ["open", "Open pull requests"],
      ["closed", "Closed pull requests"],
      ["merged", "Merged pull requests"],
      ["unmerged", "Pull requests that are not merged"],
      ["draft", "Draft pull requests"],
      ["pr", "Pull requests only"],
    ],
  },
  {
    name: "author",
    description: "Opened by a user",
    dynamicValues: "authors",
  },
  {
    name: "assignee",
    description: "Assigned to a user",
    dynamicValues: "authors",
  },
  {
    name: "label",
    description: "Has a label",
    dynamicValues: "labels",
  },
  {
    name: "review",
    description: "Filter by review state",
    values: [
      ["none", "No reviews"],
      ["required", "Review required"],
      ["approved", "Approved"],
      ["changes_requested", "Changes requested"],
    ],
  },
  {
    name: "reviewed-by",
    description: "Reviewed by a user",
    dynamicValues: "authors",
  },
  {
    name: "review-requested",
    description: "Review requested from a user",
    dynamicValues: "authors",
  },
  {
    name: "draft",
    description: "Filter by draft state",
    values: [
      ["true", "Draft pull requests"],
      ["false", "Ready for review"],
    ],
  },
  {
    name: "status",
    description: "Filter by commit status",
    values: [
      ["success", "Checks succeeded"],
      ["failure", "Checks failed"],
      ["pending", "Checks are pending"],
    ],
  },
  {
    name: "no",
    description: "Exclude missing metadata",
    values: [
      ["label", "No labels"],
      ["assignee", "No assignee"],
      ["milestone", "No milestone"],
      ["project", "No project"],
    ],
  },
  {
    name: "sort",
    description: "Choose result order",
    values: [
      ["updated-desc", "Recently updated first"],
      ["updated-asc", "Least recently updated first"],
      ["created-desc", "Newest first"],
      ["created-asc", "Oldest first"],
      ["comments-desc", "Most commented first"],
      ["comments-asc", "Least commented first"],
    ],
  },
  { name: "base", description: "Targets a base branch" },
  { name: "head", description: "Comes from a head branch" },
  { name: "milestone", description: "Belongs to a milestone" },
  { name: "mentions", description: "Mentions a user" },
  { name: "commenter", description: "Commented on by a user" },
  { name: "involves", description: "Involves a user" },
  { name: "created", description: "Created on a date or range" },
  { name: "updated", description: "Updated on a date or range" },
  { name: "closed", description: "Closed on a date or range" },
  { name: "merged", description: "Merged on a date or range" },
];
const MANIFEST_FILE_NAMES = new Set([
  "bun.lock",
  "bun.lockb",
  "cargo.lock",
  "cargo.toml",
  "composer.json",
  "composer.lock",
  "compose.yaml",
  "compose.yml",
  "deno.json",
  "deno.jsonc",
  "directory.build.props",
  "directory.build.targets",
  "dockerfile",
  "gemfile",
  "gemfile.lock",
  "global.json",
  "go.mod",
  "go.sum",
  "mix.exs",
  "mix.lock",
  "npm-shrinkwrap.json",
  "nuget.config",
  "package-lock.json",
  "package.json",
  "pipfile",
  "pipfile.lock",
  "pnpm-lock.yaml",
  "poetry.lock",
  "pubspec.yaml",
  "pyproject.toml",
  "yarn.lock",
]);
const VENDORED_PATH_SEGMENTS = new Set([
  ".pnpm",
  ".venv",
  "__pycache__",
  "bower_components",
  "node_modules",
  "site-packages",
  "third-party",
  "third_party",
  "vendor",
  "vendors",
]);
const FILE_PATH_COLLATOR = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});
const pullPayloadCache = new Map();
let renderSequence = 0;
let repositorySearchTimer = null;
let repositorySearchController = null;
let repositorySearchSequence = 0;
let repositoryRemoteResults = [];
let repositorySearchState = "idle";
let repositorySearchError = null;
let repositoryActiveIndex = -1;
let repositoryPickerQuery = "";
let pullAuthors = [];
let pullAuthorsRepository = null;
let pullAuthorsState = "idle";
let pullAuthorsError = null;
let pullAuthorsLoadSequence = 0;
let pullQueryLabels = [];
let pullQuerySuggestionIndex = -1;
let pullQueryPendingCommit = null;
let pullTableRefreshSequence = 0;
let pullFilterStorageWarningShown = false;
const PULL_FILTER_STORAGE_KEY = "pr-artifact-explorer:pull-filters:v1";
const MAX_LOCAL_PULL_FILTER_REPOSITORIES = 50;
const previewThemeMedia = window.matchMedia("(prefers-color-scheme: dark)");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function titleHtml(value) {
  const source = String(value ?? "");
  let result = "";
  let cursor = 0;

  while (cursor < source.length) {
    const opening = source.indexOf("`", cursor);
    if (opening === -1) {
      result += escapeHtml(source.slice(cursor));
      break;
    }

    result += escapeHtml(source.slice(cursor, opening));
    let runLength = 1;
    while (source[opening + runLength] === "`") runLength++;
    const delimiter = "`".repeat(runLength);
    let closing = source.indexOf(delimiter, opening + runLength);
    while (
      closing !== -1 &&
      (source[closing - 1] === "`" || source[closing + runLength] === "`")
    ) {
      closing = source.indexOf(delimiter, closing + runLength);
    }

    if (closing === -1) {
      result += escapeHtml(source.slice(opening));
      break;
    }

    let code = source.slice(opening + runLength, closing).replace(/\s+/g, " ");
    if (code.startsWith(" ") && code.endsWith(" ") && code.trim()) {
      code = code.slice(1, -1);
    }
    result += `<code class="title-inline-code">${escapeHtml(code)}</code>`;
    cursor = closing + runLength;
  }

  return result;
}

function highlightXmlTag(token) {
  const opening = token.startsWith("</") ? "</" : "<";
  const ending = token.endsWith("/>") ? "/>" : ">";
  const nameStart = opening.length;
  const name = token.slice(nameStart).match(/^[^\s/>]+/)?.[0];
  if (!name) {
    return `<span class="syntax-meta">${escapeHtml(token)}</span>`;
  }

  const attributesStart = nameStart + name.length;
  const attributesEnd = token.length - ending.length;
  const attributes = token.slice(attributesStart, attributesEnd);
  const matcher = /([^\s=/>]+)(\s*=\s*)("(?:[^"]*)"|'(?:[^']*)'|[^\s>]+)/g;
  let highlightedAttributes = "";
  let cursor = 0;
  for (const match of attributes.matchAll(matcher)) {
    highlightedAttributes += escapeHtml(attributes.slice(cursor, match.index));
    highlightedAttributes += `<span class="syntax-attribute">${escapeHtml(match[1])}</span>`;
    highlightedAttributes += `<span class="syntax-punctuation">${escapeHtml(match[2])}</span>`;
    highlightedAttributes += `<span class="syntax-string">${escapeHtml(match[3])}</span>`;
    cursor = match.index + match[0].length;
  }
  highlightedAttributes += escapeHtml(attributes.slice(cursor));

  return [
    `<span class="syntax-punctuation">${escapeHtml(opening)}</span>`,
    `<span class="syntax-tag">${escapeHtml(name)}</span>`,
    highlightedAttributes,
    `<span class="syntax-punctuation">${escapeHtml(ending)}</span>`,
  ].join("");
}

function highlightXml(value) {
  const source = String(value ?? "");
  let highlighted = "";
  let cursor = 0;
  while (cursor < source.length) {
    const opening = source.indexOf("<", cursor);
    if (opening === -1) {
      highlighted += escapeHtml(source.slice(cursor));
      break;
    }
    highlighted += escapeHtml(source.slice(cursor, opening));

    let closing;
    if (source.startsWith("<!--", opening)) {
      const index = source.indexOf("-->", opening + 4);
      closing = index === -1 ? source.length : index + 3;
    } else if (source.startsWith("<![CDATA[", opening)) {
      const index = source.indexOf("]]>", opening + 9);
      closing = index === -1 ? source.length : index + 3;
    } else {
      let quote = null;
      let subsetDepth = 0;
      let foundClosing = false;
      closing = source.length;
      for (let index = opening + 1; index < source.length; index++) {
        const character = source[index];
        if (quote) {
          if (character === quote) quote = null;
          continue;
        }
        if (character === '"' || character === "'") {
          quote = character;
        } else if (character === "[") {
          subsetDepth++;
        } else if (character === "]" && subsetDepth > 0) {
          subsetDepth--;
        } else if (character === ">" && subsetDepth === 0) {
          closing = index + 1;
          foundClosing = true;
          break;
        }
      }
      if (!foundClosing) {
        highlighted += escapeHtml(source.slice(opening));
        break;
      }
    }

    const token = source.slice(opening, closing);
    if (token.startsWith("<!--")) {
      highlighted += `<span class="syntax-comment">${escapeHtml(token)}</span>`;
    } else if (token.startsWith("<![CDATA[")) {
      highlighted += `<span class="syntax-cdata">${escapeHtml(token)}</span>`;
    } else if (token.startsWith("<?") || token.startsWith("<!")) {
      highlighted += `<span class="syntax-meta">${escapeHtml(token)}</span>`;
    } else {
      highlighted += highlightXmlTag(token);
    }
    cursor = closing;
  }
  return highlighted;
}

function highlightJson(value) {
  const source = String(value ?? "");
  const matcher = /(?<key>"(?:\\.|[^"\\])*")(?=\s*:)|(?<string>"(?:\\.|[^"\\])*")|(?<number>-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|(?<boolean>\b(?:true|false)\b)|(?<nil>\bnull\b)/g;
  let highlighted = "";
  let cursor = 0;
  for (const match of source.matchAll(matcher)) {
    highlighted += escapeHtml(source.slice(cursor, match.index));
    const tokenKind = match.groups.key
      ? "key"
      : match.groups.string
        ? "string"
        : match.groups.number
          ? "number"
          : match.groups.boolean
            ? "boolean"
            : "null";
    highlighted += `<span class="syntax-${tokenKind}">${escapeHtml(match[0])}</span>`;
    cursor = match.index + match[0].length;
  }
  return highlighted + escapeHtml(source.slice(cursor));
}

function icon(name, className = "") {
  return `<span class="octicon icon-${escapeHtml(name)} ${escapeHtml(className)}" aria-hidden="true"></span>`;
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let size = bytes;
  let unit = -1;
  do {
    size /= 1024;
    unit++;
  } while (size >= 1024 && unit < units.length - 1);
  const digits = size >= 10 || unit === 0 ? 0 : 1;
  return `${size.toFixed(digits)} ${units[unit]}`;
}

function formatRemainingTime(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))}s left`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes
    ? `${hours}h ${remainingMinutes}m left`
    : `${hours}h left`;
}

function resolvedCanvasTheme() {
  for (const element of [document.documentElement, document.body]) {
    const tone = element?.getAttribute("data-theme-tone");
    if (tone === "light" || tone === "dark") return tone;
    const mode = element?.getAttribute("data-color-mode");
    if (mode === "light" || mode === "dark") return mode;
  }
  return previewThemeMedia.matches ? "dark" : "light";
}

function syncPreviewTheme() {
  const theme = resolvedCanvasTheme();
  for (const frame of document.querySelectorAll("iframe[data-theme-aware-preview]")) {
    frame.style.colorScheme = theme;
    try {
      frame.contentWindow?.postMessage(
        { type: "copilot-preview-theme", theme },
        new URL(frame.src).origin,
      );
    } catch {
      // The preview may be navigating between artifact pages.
    }
  }
}

function installPreviewThemeSync() {
  const observer = new MutationObserver(syncPreviewTheme);
  const options = {
    attributes: true,
    attributeFilter: ["data-color-mode", "data-theme-tone"],
  };
  observer.observe(document.documentElement, options);
  observer.observe(document.body, options);
  previewThemeMedia.addEventListener("change", syncPreviewTheme);
}

function relativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "unknown time";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function normalizeRepository(value) {
  const repository = String(value ?? "")
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("Enter a repository as owner/name or paste a pull request URL.");
  }
  return repository;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  let body = options.body;
  if (body != null && typeof body !== "string") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  const response = await fetch(path, {
    ...options,
    headers,
    body,
  });
  const type = response.headers.get("content-type") ?? "";
  const payload = type.includes("json")
    ? await response.json().catch(() => null)
    : await response.text();
  if (!response.ok) {
    throw new Error(payload?.error ?? payload?.message ?? `Request failed (${response.status}).`);
  }
  return payload;
}

function showToast(message, kind = "info") {
  const node = document.createElement("div");
  node.className = `toast-message${kind === "error" ? " error" : ""}`;
  node.textContent = message;
  toastRegion.append(node);
  window.setTimeout(() => node.remove(), 4_500);
}

function reportPullFilterStorageError(error) {
  if (pullFilterStorageWarningShown) return;
  pullFilterStorageWarningShown = true;
  const detail = error instanceof Error ? error.message : String(error);
  showToast(`Saved pull filters are unavailable. ${detail}`, "error");
}

function pullFilterRepositoryKey(repository) {
  return normalizeRepository(repository).toLocaleLowerCase();
}

function normalizePullFilterPreference(value) {
  const updatedAt = Number(value?.updatedAt);
  return {
    state: ["open", "closed", "all"].includes(value?.state) ? value.state : "open",
    author:
      typeof value?.author === "string" && value.author.trim()
        ? value.author.trim().slice(0, 100)
        : null,
    artifacts: ["with", "without"].includes(value?.artifacts)
      ? value.artifacts
      : "all",
    ci: ["failing", "passing", "pending", "none"].includes(value?.ci)
      ? value.ci
      : "all",
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0,
  };
}

function readLocalPullFilterStore() {
  try {
    const raw = localStorage.getItem(PULL_FILTER_STORAGE_KEY);
    if (!raw) return {};
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("The local filter store has an invalid shape.");
    }
    return value;
  } catch (error) {
    reportPullFilterStorageError(error);
    return null;
  }
}

function writeLocalPullFilterPreference(repository, preference) {
  const store = readLocalPullFilterStore();
  if (!store) return;
  const key = pullFilterRepositoryKey(repository);
  const entries = Object.entries({
    ...store,
    [key]: normalizePullFilterPreference(preference),
  })
    .filter(([, value]) => value && typeof value === "object")
    .sort(
      (left, right) =>
        (Number(right[1].updatedAt) || 0) - (Number(left[1].updatedAt) || 0),
    )
    .slice(0, MAX_LOCAL_PULL_FILTER_REPOSITORIES);
  try {
    localStorage.setItem(PULL_FILTER_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (error) {
    reportPullFilterStorageError(error);
  }
}

function savedPullFilterPreference(repository) {
  const key = pullFilterRepositoryKey(repository);
  const local = readLocalPullFilterStore();
  if (local?.[key] && typeof local[key] === "object") {
    return normalizePullFilterPreference(local[key]);
  }
  const durable = bootstrapState?.prefs?.pullFilters?.[key];
  if (durable && typeof durable === "object") {
    const preference = normalizePullFilterPreference(durable);
    writeLocalPullFilterPreference(repository, preference);
    return preference;
  }
  return null;
}

function persistPullFilterPreferenceClient(repository, value) {
  const key = pullFilterRepositoryKey(repository);
  const preference = normalizePullFilterPreference({
    ...value,
    updatedAt: Date.now(),
  });
  bootstrapState.prefs.pullFilters ??= {};
  bootstrapState.prefs.pullFilters[key] = preference;
  writeLocalPullFilterPreference(repository, preference);
  return preference;
}

function pullsHash(repository, state = "open", filter = null, pullFilters = {}) {
  const query = new URLSearchParams({ state });
  if (typeof filter === "string" && filter.trim()) query.set("q", filter.trim());
  if (pullFilters.artifacts === "with" || pullFilters.artifacts === "without") {
    query.set("artifacts", pullFilters.artifacts);
  }
  if (["failing", "passing", "pending", "none"].includes(pullFilters.ci)) {
    query.set("ci", pullFilters.ci);
  }
  return `#/pulls/${encodeURIComponent(repository)}?${query}`;
}

function pullsHashForRepository(
  repository,
  fallbackState = bootstrapState?.prefs?.pullState ?? "open",
) {
  const preference = savedPullFilterPreference(repository);
  if (!preference) return pullsHash(repository, fallbackState);
  let query = pullQueryForState("", preference.state);
  query = pullQueryForAuthor(query, preference.author);
  return pullsHash(repository, preference.state, query, preference);
}

function pullHash(repository, pullNumber) {
  return `#/pull/${encodeURIComponent(repository)}/${Number(pullNumber)}`;
}

function artifactHash(repository, pullNumber, artifactId, filePath = null) {
  const query = filePath ? `?file=${encodeURIComponent(filePath)}` : "";
  return `#/artifact/${encodeURIComponent(repository)}/${Number(pullNumber)}/${Number(artifactId)}${query}`;
}

function parseRoute() {
  const raw = location.hash.startsWith("#/") ? location.hash.slice(2) : "";
  const queryIndex = raw.indexOf("?");
  const path = queryIndex >= 0 ? raw.slice(0, queryIndex) : raw;
  const query = new URLSearchParams(queryIndex >= 0 ? raw.slice(queryIndex + 1) : "");
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "pulls" && parts[1]) {
    return {
      name: "pulls",
      repository: decodeURIComponent(parts[1]),
      state: query.get("state") ?? "open",
      query: query.get("q"),
      artifacts: query.get("artifacts") ?? "all",
      ci: query.get("ci") ?? "all",
    };
  }
  if (parts[0] === "pull" && parts[1] && parts[2]) {
    return {
      name: "pull",
      repository: decodeURIComponent(parts[1]),
      pullNumber: Number(parts[2]),
    };
  }
  if (parts[0] === "artifact" && parts[1] && parts[2] && parts[3]) {
    return {
      name: "artifact",
      repository: decodeURIComponent(parts[1]),
      pullNumber: Number(parts[2]),
      artifactId: Number(parts[3]),
      filePath: query.get("file"),
    };
  }
  if (parts[0] === "cache") return { name: "cache" };
  if (parts[0] === "accounts") return { name: "accounts" };
  return {
    name: "pulls",
    repository: bootstrapState?.prefs?.repository ?? "microsoft/aspire",
    state: bootstrapState?.prefs?.pullState ?? "open",
  };
}

function breadcrumbLabelHtml(item) {
  const label = String(item.label ?? "");
  const compactLabel = String(item.compactLabel ?? "");
  const hasCompactLabel = compactLabel && compactLabel !== label;
  return `
    <span class="breadcrumb-item-label${hasCompactLabel ? " has-compact-label" : ""}" title="${escapeHtml(label)}">
      <span class="breadcrumb-label-full">${escapeHtml(label)}</span>
      ${hasCompactLabel ? `<span class="breadcrumb-label-compact">${escapeHtml(compactLabel)}</span>` : ""}
    </span>`;
}

function breadcrumbHref(item) {
  const href = typeof item?.href === "string" ? item.href.trim() : "";
  return href || null;
}

function setBreadcrumbOverflowOpen(open, focusFirst = false) {
  const trigger = breadcrumbs.querySelector("[data-toggle-breadcrumb-overflow]");
  const menu = breadcrumbs.querySelector("#breadcrumb-overflow-menu");
  if (!trigger || !menu) return;
  const isOpen = Boolean(open);
  trigger.setAttribute("aria-expanded", String(isOpen));
  menu.hidden = !isOpen;
  trigger.closest(".breadcrumb-overflow")?.classList.toggle("is-open", isOpen);
  if (isOpen && focusFirst) {
    [...menu.querySelectorAll('[role="menuitem"]')]
      .find((item) => item.getClientRects().length > 0)
      ?.focus();
  }
}

function setBreadcrumbs(items) {
  const values = items.filter((item) => item?.label);
  const hasOverflow = values.length > 3;
  const overflowItems = values.slice(0, -1);
  const overflowHtml = hasOverflow
    ? `
      <li class="breadcrumb-item breadcrumb-overflow">
        <button
          class="breadcrumb-overflow-trigger"
          type="button"
          data-toggle-breadcrumb-overflow
          aria-label="Show parent pages"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-controls="breadcrumb-overflow-menu"
          title="Show parent pages"
        >${icon("kebab-horizontal")}</button>
        <div
          id="breadcrumb-overflow-menu"
          class="breadcrumb-overflow-menu"
          role="menu"
          aria-label="Parent pages"
          hidden
        >
          <div class="breadcrumb-overflow-header">Parent pages</div>
          ${overflowItems
            .map((item, index) => {
              const href = breadcrumbHref(item);
              const classes = `breadcrumb-overflow-option${index === 0 ? " breadcrumb-overflow-option-root" : ""}`;
              return href
                ? `
                <a
                  class="${classes}"
                  href="${escapeHtml(href)}"
                  role="menuitem"
                  title="${escapeHtml(item.label)}"
                >
                  <span>${escapeHtml(item.label)}</span>
                </a>`
                : `
                <div
                  class="${classes} breadcrumb-overflow-option-static"
                  aria-disabled="true"
                  title="${escapeHtml(item.label)}"
                >
                  <span>${escapeHtml(item.label)}</span>
                </div>`;
            })
            .join("")}
        </div>
      </li>`
    : "";
  breadcrumbs.innerHTML = `
    <ol class="breadcrumbs${hasOverflow ? " has-overflow" : ""}">
      ${values
        .map((item, index) => {
          const current = index === values.length - 1;
          const href = breadcrumbHref(item);
          const classes = [
            "breadcrumb-item",
            index === 0 ? "breadcrumb-item-root" : "",
            !current && index > 0 ? "breadcrumb-item-collapsible" : "",
            current ? "breadcrumb-item-current" : "",
            !current && !href ? "breadcrumb-item-static" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const itemHtml = `<li class="${classes}"${current ? ' aria-current="page"' : ""}>${
            current || !href
              ? breadcrumbLabelHtml(item)
              : `<a href="${escapeHtml(href)}">${breadcrumbLabelHtml(item)}</a>`
          }</li>`;
          return index === 0 ? `${itemHtml}${overflowHtml}` : itemHtml;
        })
        .join("")}
    </ol>`;
}

function loadingView() {
  view.innerHTML = `
    <div class="loading-list" aria-label="Loading">
      ${Array.from({ length: 6 }, () => `
        <div class="skeleton-row">
          <span class="skeleton"></span>
          <span><span class="skeleton d-block"></span><span class="skeleton short d-block"></span></span>
          <span class="skeleton"></span>
        </div>`).join("")}
    </div>`;
}

function renderError(error, title = "Unable to load this view") {
  view.innerHTML = `
    <div class="flash flash-error">
      <strong>${escapeHtml(title)}</strong>
      <div class="mt-1">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>
    </div>`;
}

function updateCacheHeader(cache) {
  if (!cache) return;
  bootstrapState.cache = cache;
  cacheLabel.textContent = cache.count
    ? `Cache ${formatBytes(cache.totalBytes)}`
    : "Cache";
}

function renderAccounts(accounts, active) {
  const values = Array.isArray(accounts) ? accounts : [];
  bootstrapState.accounts = values;
  bootstrapState.account = active ?? null;
  if (active?.id) bootstrapState.prefs.account = active.id;

  accountButton.title = active
    ? `${active.login} - ${
        active.repositoryAccess === false ? "limited repository access" : "GitHub account"
      }`
    : "No GitHub account detected";
  accountButton.setAttribute(
    "aria-label",
    active ? `GitHub account: ${active.login}` : "No GitHub account detected",
  );
  accountButton.classList.toggle("is-active", parseRoute().name === "accounts");
  if (active?.avatarUrl) {
    accountAvatar.src = active.avatarUrl;
    accountAvatar.alt = `${active.login} avatar`;
    accountAvatar.hidden = false;
    accountFallback.hidden = true;
  } else {
    accountAvatar.removeAttribute("src");
    accountAvatar.alt = "";
    accountAvatar.hidden = true;
    accountFallback.hidden = false;
  }
}

function updateAccountFromPayload(payload) {
  if (payload?.accounts) renderAccounts(payload.accounts, payload.account);
  if (payload?.account && !payload.accounts) {
    bootstrapState.account = payload.account;
    renderAccounts(bootstrapState.accounts, payload.account);
  }
  if (payload?.prefs) bootstrapState.prefs = payload.prefs;
}

function repositoryPreferences() {
  bootstrapState.prefs.repositories ??= {
    pinned: null,
    favorites: [],
    recent: [bootstrapState.prefs.repository],
  };
  return bootstrapState.prefs.repositories;
}

function rememberRepositoryClient(repository) {
  const normalized = normalizeRepository(repository);
  const repositories = repositoryPreferences();
  bootstrapState.prefs.repository = normalized;
  repositories.recent = [
    normalized,
    ...(repositories.recent ?? []).filter((item) => item !== normalized),
  ].slice(0, 12);
  return normalized;
}

function localRepositoryGroups(query) {
  const repositories = repositoryPreferences();
  const needle = String(query ?? "").trim().toLocaleLowerCase();
  const seen = new Set();
  const groups = [];
  const add = (label, values) => {
    const items = [];
    for (const value of values) {
      if (!value || seen.has(value)) continue;
      if (needle && !value.toLocaleLowerCase().includes(needle)) continue;
      seen.add(value);
      items.push({ fullName: value, source: label });
    }
    if (items.length) groups.push({ label, items });
  };
  add("Pinned", [repositories.pinned]);
  add("Favorites", repositories.favorites ?? []);
  add("Recent", repositories.recent ?? []);
  return { groups, seen };
}

function repositoryResultHtml(repository, index) {
  const preferences = repositoryPreferences();
  const pinned = preferences.pinned === repository.fullName;
  const favorite = preferences.favorites?.includes(repository.fullName) === true;
  const favoriteLimitReached = (preferences.favorites?.length ?? 0) >= 3;
  const description = repository.description
    ? `<span class="repository-result-description">${escapeHtml(repository.description)}</span>`
    : "";
  const badges = [
    repository.private ? '<span class="Label">Private</span>' : "",
    repository.archived ? '<span class="Label">Archived</span>' : "",
  ].join("");
  return `
    <div class="repository-result" data-repository-result="${escapeHtml(repository.fullName)}">
      <button
        class="repository-result-main${index === repositoryActiveIndex ? " is-active" : ""}"
        type="button"
        role="option"
        aria-selected="${index === repositoryActiveIndex ? "true" : "false"}"
        data-select-repository="${escapeHtml(repository.fullName)}"
        data-repository-option-index="${index}"
      >
        ${icon("repo")}
        <span class="repository-result-copy">
          <span class="repository-result-name">${escapeHtml(repository.fullName)} ${badges}</span>
          ${description}
        </span>
      </button>
      <span class="repository-result-actions">
        <button
          class="repository-result-action${pinned ? " is-selected" : ""}"
          type="button"
          data-pin-repository="${escapeHtml(repository.fullName)}"
          aria-label="${pinned ? "Unpin" : "Pin"} ${escapeHtml(repository.fullName)}"
          aria-pressed="${pinned}"
          title="${pinned ? "Unpin repository" : "Pin repository"}"
        >${icon(pinned ? "pin-slash" : "pin")}</button>
        <button
          class="repository-result-action${favorite ? " is-selected" : ""}"
          type="button"
          data-favorite-repository="${escapeHtml(repository.fullName)}"
          data-favorite="${favorite ? "false" : "true"}"
          aria-label="${favorite ? "Remove" : "Add"} ${escapeHtml(repository.fullName)} ${favorite ? "from" : "to"} favorites"
          aria-pressed="${favorite}"
          title="${favorite ? "Remove from favorites" : "Add to favorites"}"
          ${pinned || (!favorite && favoriteLimitReached) ? "disabled" : ""}
        >${icon(favorite ? "star-fill" : "star")}</button>
      </span>
    </div>`;
}

function renderRepositoryPicker() {
  if (repositoryPanel.hidden) return;
  const { groups, seen } = localRepositoryGroups(repositoryPickerQuery);
  const remote = repositoryRemoteResults.filter(
    (item) => item?.fullName && !seen.has(item.fullName),
  );
  if (remote.length) groups.push({ label: "GitHub", items: remote });
  const optionCount = groups.reduce((count, group) => count + group.items.length, 0);
  repositoryActiveIndex =
    optionCount === 0 ? -1 : Math.min(repositoryActiveIndex, optionCount - 1);
  let optionIndex = 0;
  const content = groups
    .map(
      (group) => `
        <div class="repository-result-group">
          <div class="repository-result-heading">${escapeHtml(group.label)}</div>
          ${group.items
            .map((repository) => repositoryResultHtml(repository, optionIndex++))
            .join("")}
        </div>`,
    )
    .join("");
  const status =
    repositorySearchState === "loading"
      ? `<div class="repository-result-status">${icon("sync", "spin")} Searching GitHub...</div>`
      : repositorySearchError
        ? `<div class="repository-result-status error">${escapeHtml(repositorySearchError)}</div>`
        : optionCount === 0
          ? '<div class="repository-result-status">No repositories found.</div>'
          : "";
  repositoryResults.innerHTML = content + status;
}

function setRepositoryPickerOpen(open, { resetQuery = false } = {}) {
  if (resetQuery) {
    repositoryPickerQuery = "";
    repositoryRemoteResults = [];
    repositorySearchState = "idle";
    repositorySearchError = null;
    repositoryActiveIndex = -1;
  }
  repositoryPanel.hidden = !open;
  repositoryInput.setAttribute("aria-expanded", String(open));
  repositoryMenuButton.setAttribute("aria-expanded", String(open));
  repositoryCombobox.classList.toggle("is-open", open);
  if (open) renderRepositoryPicker();
}

function scheduleRepositorySearch(value) {
  repositoryPickerQuery = String(value ?? "").trim();
  repositorySearchError = null;
  repositoryRemoteResults = [];
  repositoryActiveIndex = -1;
  window.clearTimeout(repositorySearchTimer);
  repositorySearchController?.abort();
  const shouldSearch =
    repositoryPickerQuery.includes("/") || repositoryPickerQuery.length >= 2;
  repositorySearchState = shouldSearch ? "loading" : "idle";
  setRepositoryPickerOpen(true);
  renderRepositoryPicker();
  if (!shouldSearch) return;

  const sequence = ++repositorySearchSequence;
  repositorySearchTimer = window.setTimeout(async () => {
    const controller = new AbortController();
    repositorySearchController = controller;
    try {
      const payload = await api(
        `/api/repositories/suggest?q=${encodeURIComponent(repositoryPickerQuery)}`,
        { signal: controller.signal },
      );
      if (sequence !== repositorySearchSequence) return;
      repositoryRemoteResults = payload.repositories ?? [];
      repositorySearchState = "ready";
    } catch (error) {
      if (controller.signal.aborted || sequence !== repositorySearchSequence) return;
      repositorySearchState = "error";
      repositorySearchError = error instanceof Error ? error.message : String(error);
    } finally {
      if (sequence === repositorySearchSequence) renderRepositoryPicker();
    }
  }, 300);
}

function moveRepositorySelection(delta) {
  const options = [...repositoryResults.querySelectorAll("[data-repository-option-index]")];
  if (!options.length) return;
  repositoryActiveIndex =
    repositoryActiveIndex < 0
      ? delta > 0
        ? 0
        : options.length - 1
      : (repositoryActiveIndex + delta + options.length) % options.length;
  for (const option of options) {
    const active = Number(option.dataset.repositoryOptionIndex) === repositoryActiveIndex;
    option.classList.toggle("is-active", active);
    option.setAttribute("aria-selected", String(active));
    if (active) option.scrollIntoView({ block: "nearest" });
  }
}

async function setPinnedRepository(repository) {
  const current = repositoryPreferences().pinned;
  const prefs = await api("/api/repositories/pin", {
    method: "POST",
    body: { repository: current === repository ? null : repository },
  });
  bootstrapState.prefs = prefs;
  renderRepositoryPicker();
  showToast(current === repository ? "Repository unpinned." : `${repository} pinned.`);
}

async function setFavoriteRepository(repository, favorite) {
  const prefs = await api("/api/repositories/favorite", {
    method: "POST",
    body: { repository, favorite },
  });
  bootstrapState.prefs = prefs;
  renderRepositoryPicker();
  showToast(favorite ? `${repository} added to favorites.` : `${repository} removed from favorites.`);
}

function mixRgb(from, to, amount) {
  return from.map((value, index) =>
    Math.round(value + (to[index] - value) * amount),
  );
}

function relativeLuminance(rgb) {
  const channels = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first, second) {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort(
    (left, right) => right - left,
  );
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

function accessibleLabelText(base, background, target) {
  const labelBackground = mixRgb(background, base, 0.18);
  for (let step = 0; step <= 100; step++) {
    const candidate = mixRgb(base, target, step / 100);
    if (contrastRatio(candidate, labelBackground) >= 4.6) return candidate;
  }
  return target;
}

function labelHtml(label) {
  if (!/^[0-9a-f]{6}$/i.test(label.color ?? "")) {
    return `<span class="issue-label">${escapeHtml(label.name)}</span>`;
  }

  const hex = label.color;
  const base = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  const lightText = accessibleLabelText(base, [255, 255, 255], [31, 35, 40]);
  const darkText = accessibleLabelText(base, [13, 17, 23], [240, 246, 252]);
  return `<span class="issue-label" style="--label-color:#${hex};--label-text-light:rgb(${lightText.join(" ")});--label-text-dark:rgb(${darkText.join(" ")})">${escapeHtml(label.name)}</span>`;
}

function pullState(pull) {
  if (pull.mergedAt) return { label: "Merged", className: "merged" };
  if (pull.draft) return { label: "Draft", className: "draft" };
  if (pull.state === "closed") return { label: "Closed", className: "closed" };
  return { label: "Open", className: "open" };
}

function pullIconClass(pull) {
  return pullState(pull).className;
}

function pullCheckHtml(pull) {
  const states = {
    passing: ["check", "passing", "Checks passing"],
    failing: ["x", "failing", "Checks failing"],
    pending: ["clock", "pending", "Checks pending"],
  };
  const state = states[pull.ciStatus];
  if (!state) return "";
  return `<span class="pull-check ${state[1]}" role="img" aria-label="${state[2]}" title="${state[2]}">${icon(state[0])}</span>`;
}

function pullAuthorBadge(pull) {
  if (pull.authorType === "Bot" || /\[bot\]$/i.test(pull.author ?? "")) return "Bot";
  if (!["MEMBER", "OWNER", "COLLABORATOR"].includes(pull.authorAssociation)) return "";
  return (
    pull.authorAssociation[0] + pull.authorAssociation.slice(1).toLocaleLowerCase()
  );
}

function pullReviewStatus(pull) {
  if (pull.draft) return "Draft";
  if (pull.state !== "open") return "";
  return (
    {
      REVIEW_REQUIRED: "Review required",
      CHANGES_REQUESTED: "Changes requested",
      APPROVED: "Approved",
    }[pull.reviewDecision] ?? ""
  );
}

function pullQueryForState(value, state) {
  let query = String(value ?? "")
    .replace(/(^|\s)is:(?:open|closed|merged|unmerged)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!/\bis:pr\b/i.test(query)) query = `is:pr ${query}`.trim();
  if (state === "open" || state === "closed") query = `${query} is:${state}`;
  return query;
}

function normalizePullQuery(value, state) {
  let query = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!/\bis:pr\b/i.test(query)) query = `is:pr ${query}`.trim();
  if (
    (state === "open" || state === "closed") &&
    !/\bis:(?:open|closed|merged|unmerged)\b/i.test(query)
  ) {
    query = `${query} is:${state}`;
  }
  return query;
}

function stateFromPullQuery(value) {
  const query = String(value ?? "");
  if (/\bis:(?:closed|merged)\b/i.test(query)) return "closed";
  if (/\bis:open\b/i.test(query)) return "open";
  return "all";
}

function pullListMeta(pull) {
  const status = pullState(pull);
  const timestamp =
    status.className === "merged"
      ? pull.mergedAt
      : status.className === "closed"
        ? pull.closedAt
        : pull.createdAt;
  const verb =
    status.className === "merged"
      ? "merged"
      : status.className === "closed"
        ? "closed"
        : "opened";
  return `#${pull.number} ${verb} ${relativeTime(timestamp)} by ${pull.author}`;
}

function pullStatePanelHtml(state) {
  const options = [
    ["open", "Open", "Show pull requests that are open"],
    ["closed", "Closed", "Show pull requests that are closed or merged"],
    ["all", "All", "Show pull requests in any state"],
  ];
  return `
    <div class="pull-state-picker">
      <button
        class="pull-state-trigger"
        type="button"
        data-toggle-pull-state
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls="pull-state-panel"
      >
        ${escapeHtml(state[0].toUpperCase() + state.slice(1))}
        ${icon("chevron-down")}
      </button>
      <div id="pull-state-panel" class="pull-state-panel" role="menu" hidden>
        <div class="pull-state-panel-header">
          <strong>Filter by pull request state</strong>
          <button class="pull-state-close" type="button" data-close-pull-state aria-label="Close state filter">
            ${icon("x")}
          </button>
        </div>
        <div class="pull-state-options">
          ${options
            .map(
              ([value, label, description]) => `
                <button
                  class="pull-state-option"
                  type="button"
                  role="menuitemradio"
                  aria-checked="${state === value}"
                  data-select-pull-state="${value}"
                >
                  <span class="pull-state-check">${state === value ? icon("check") : ""}</span>
                  <span>
                    <strong>${label}</strong>
                    <small>${description}</small>
                  </span>
                </button>`,
            )
            .join("")}
        </div>
      </div>
    </div>`;
}

function setPullStatePanelOpen(open) {
  const panel = document.getElementById("pull-state-panel");
  const trigger = document.querySelector("[data-toggle-pull-state]");
  if (!panel || !trigger) return;
  panel.hidden = !open;
  trigger.setAttribute("aria-expanded", String(open));
  trigger.closest(".pull-state-picker")?.classList.toggle("is-open", open);
}

const PULL_SIGNAL_FILTERS = {
  artifacts: {
    label: "Artifacts",
    heading: "Filter by Actions artifacts",
    options: [
      ["all", "Any", "Any"],
      ["with", "With artifacts", "Present"],
      ["without", "Without artifacts", "None"],
    ],
  },
  ci: {
    label: "Checks",
    heading: "Filter by check status",
    options: [
      ["all", "Any status", "Any"],
      ["failing", "Failing", "Failing"],
      ["passing", "Passing", "Passing"],
      ["pending", "Pending", "Pending"],
      ["none", "No checks", "None"],
    ],
  },
};

function pullSignalPanelHtml(kind, selected) {
  const config = PULL_SIGNAL_FILTERS[kind];
  const selectedOption =
    config.options.find(([value]) => value === selected) ?? config.options[0];
  const filtered = selectedOption[0] !== "all";
  return `
    <div class="pull-signal-picker">
      <button
        class="pull-state-trigger${filtered ? " is-filtered" : ""}"
        type="button"
        data-toggle-pull-signal="${kind}"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls="pull-${kind}-panel"
        title="${filtered ? `${escapeHtml(config.label)}: ${escapeHtml(selectedOption[1])}` : escapeHtml(config.heading)}"
      >
        <span>${escapeHtml(config.label)}${filtered ? ":" : ""}</span>
        ${filtered ? `<span class="pull-filter-value">${escapeHtml(selectedOption[2])}</span>` : ""}
        ${icon("chevron-down")}
      </button>
      <div id="pull-${kind}-panel" class="pull-state-panel" role="menu" hidden>
        <div class="pull-state-panel-header">
          <strong>${escapeHtml(config.heading)}</strong>
          <button
            class="pull-state-close"
            type="button"
            data-close-pull-signal="${kind}"
            aria-label="Close ${escapeHtml(config.label.toLocaleLowerCase())} filter"
          >
            ${icon("x")}
          </button>
        </div>
        <div class="pull-state-options">
          ${config.options
            .map(
              ([value, label]) => `
                <button
                  class="pull-state-option pull-signal-option"
                  type="button"
                  role="menuitemradio"
                  aria-checked="${selectedOption[0] === value}"
                  data-select-pull-signal="${kind}"
                  data-pull-signal-value="${value}"
                >
                  <span class="pull-state-check">${selectedOption[0] === value ? icon("check") : ""}</span>
                  <span>
                    <strong>${escapeHtml(label)}</strong>
                  </span>
                </button>`,
            )
            .join("")}
        </div>
      </div>
    </div>`;
}

function setPullSignalPanelOpen(kind, open) {
  for (const candidate of Object.keys(PULL_SIGNAL_FILTERS)) {
    const panel = document.getElementById(`pull-${candidate}-panel`);
    const trigger = document.querySelector(
      `[data-toggle-pull-signal="${candidate}"]`,
    );
    const isOpen = candidate === kind && open;
    if (panel) panel.hidden = !isOpen;
    if (trigger) trigger.setAttribute("aria-expanded", String(isOpen));
    trigger?.closest(".pull-signal-picker")?.classList.toggle("is-open", isOpen);
  }
}

function authorFromPullQuery(value) {
  const match = String(value ?? "").match(
    /(?:^|\s)author:(?:"([^"]+)"|([^\s]+))/i,
  );
  return match?.[1] ?? match?.[2] ?? null;
}

function pullQueryForAuthor(value, author) {
  let query = String(value ?? "")
    .replace(/(^|\s)author:(?:"[^"]+"|[^\s]+)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (author) query = `${query} author:${author}`.trim();
  return query;
}

function pullQueryHighlightHtml(value) {
  const source = String(value ?? "");
  const matcher = /(^|\s)(-?)([a-z][\w-]*)(:)((?:"[^"]*"|[^\s]*))/gi;
  let highlighted = "";
  let cursor = 0;
  for (const match of source.matchAll(matcher)) {
    highlighted += escapeHtml(source.slice(cursor, match.index));
    highlighted += escapeHtml(match[1]);
    if (match[2]) {
      highlighted += `<span class="pull-query-syntax-negation">${escapeHtml(match[2])}</span>`;
    }
    highlighted += `<span class="pull-query-syntax-qualifier">${escapeHtml(match[3])}</span>`;
    highlighted += `<span class="pull-query-syntax-punctuation">${escapeHtml(match[4])}</span>`;
    if (match[5]) {
      highlighted += `<span class="pull-query-syntax-value">${escapeHtml(match[5])}</span>`;
    }
    cursor = match.index + match[0].length;
  }
  highlighted += escapeHtml(source.slice(cursor));
  return highlighted || " ";
}

function pullQueryTokenRange(value, caret) {
  const source = String(value ?? "");
  const position = Math.max(0, Math.min(Number(caret) || 0, source.length));
  let quoted = false;
  let start = 0;
  for (let index = 0; index < position; index++) {
    if (source[index] === '"') quoted = !quoted;
    if (!quoted && /\s/.test(source[index])) start = index + 1;
  }
  let end = source.length;
  for (let index = position; index < source.length; index++) {
    if (source[index] === '"') quoted = !quoted;
    if (!quoted && /\s/.test(source[index])) {
      end = index;
      break;
    }
  }
  return {
    start,
    end,
    prefix: source.slice(start, position),
  };
}

function pullQueryQualifierValues(qualifier) {
  if (qualifier.values) return qualifier.values;
  if (qualifier.dynamicValues === "authors") {
    return pullAuthors.slice(0, 40).map((author) => [
      author.login,
      author.name && author.name !== author.login
        ? author.name
        : "Repository contributor",
    ]);
  }
  if (qualifier.dynamicValues === "labels") {
    return pullQueryLabels.slice(0, 40).map((label) => [label, "Repository label"]);
  }
  return [];
}

function pullQueryValueLiteral(value) {
  const source = String(value ?? "");
  return /\s/.test(source) ? `"${source.replaceAll('"', '\\"')}"` : source;
}

function pullQueryCompletions(input) {
  const range = pullQueryTokenRange(input.value, input.selectionStart);
  if (!range.prefix) return { ...range, heading: "", items: [] };
  const token = range.prefix.match(/^(-?)([a-z][\w-]*)(?::(.*))?$/i);
  if (!token) return { ...range, heading: "", items: [] };
  const negation = token[1] ?? "";
  const qualifierName = token[2].toLocaleLowerCase();
  const hasValue = range.prefix.includes(":");

  if (!hasValue) {
    const items = PULL_QUERY_QUALIFIERS
      .filter((qualifier) => qualifier.name.startsWith(qualifierName))
      .slice(0, 8)
      .map((qualifier) => ({
        complete: false,
        description: qualifier.description,
        insert: `${negation}${qualifier.name}:`,
        label: `${qualifier.name}:`,
      }));
    return { ...range, heading: "Qualifiers", items };
  }

  const qualifier = PULL_QUERY_QUALIFIERS.find(
    (candidate) => candidate.name === qualifierName,
  );
  if (!qualifier) return { ...range, heading: "", items: [] };
  const valuePrefix = String(token[3] ?? "")
    .replace(/^"/, "")
    .toLocaleLowerCase();
  const items = pullQueryQualifierValues(qualifier)
    .filter(([value]) => String(value).toLocaleLowerCase().startsWith(valuePrefix))
    .slice(0, 8)
    .map(([value, description]) => ({
      complete: true,
      description,
      insert: `${negation}${qualifier.name}:${pullQueryValueLiteral(value)}`,
      label: `${qualifier.name}:${pullQueryValueLiteral(value)}`,
    }));
  return {
    ...range,
    heading: `Values for ${qualifier.name}:`,
    items,
  };
}

function setPullQuerySuggestionsOpen(input, open) {
  const suggestions = document.getElementById("pull-query-suggestions");
  if (!suggestions) return;
  suggestions.hidden = !open;
  input?.setAttribute("aria-expanded", String(open));
  if (!open) {
    pullQuerySuggestionIndex = -1;
    input?.removeAttribute("aria-activedescendant");
  }
}

function syncPullQueryEditor(input) {
  const highlight = document.getElementById("pull-query-highlight-content");
  if (!highlight || !input) return;
  highlight.innerHTML = pullQueryHighlightHtml(input.value);
  highlight.style.transform = `translateX(${-input.scrollLeft}px)`;
}

function renderPullQuerySuggestions(input, { preserveIndex = false } = {}) {
  const suggestions = document.getElementById("pull-query-suggestions");
  if (!suggestions || !input || document.activeElement !== input) {
    setPullQuerySuggestionsOpen(input, false);
    return;
  }
  const completion = pullQueryCompletions(input);
  if (!completion.items.length) {
    setPullQuerySuggestionsOpen(input, false);
    return;
  }
  pullQuerySuggestionIndex = preserveIndex
    ? Math.max(
        0,
        Math.min(pullQuerySuggestionIndex, completion.items.length - 1),
      )
    : 0;
  suggestions.innerHTML = `
    <div class="pull-query-suggestion-heading">${escapeHtml(completion.heading)}</div>
    <div class="pull-query-suggestion-options">
      ${completion.items
        .map(
          (item, index) => `
            <button
              id="pull-query-suggestion-${index}"
              class="pull-query-suggestion${index === pullQuerySuggestionIndex ? " is-active" : ""}"
              type="button"
              role="option"
              aria-selected="${index === pullQuerySuggestionIndex}"
              data-pull-query-suggestion="${index}"
            >
              <code>${pullQueryHighlightHtml(item.label)}</code>
              <span>${escapeHtml(item.description)}</span>
            </button>`,
        )
        .join("")}
    </div>
    <div class="pull-query-suggestion-footer">
      <span><kbd>Tab</kbd> insert</span>
      <span><kbd>Enter</kbd> apply</span>
    </div>`;
  setPullQuerySuggestionsOpen(input, true);
  input.setAttribute(
    "aria-activedescendant",
    `pull-query-suggestion-${pullQuerySuggestionIndex}`,
  );
}

function movePullQuerySuggestion(input, delta) {
  const options = [
    ...document.querySelectorAll("[data-pull-query-suggestion]"),
  ];
  if (!options.length) return false;
  pullQuerySuggestionIndex =
    (pullQuerySuggestionIndex + delta + options.length) % options.length;
  for (const option of options) {
    const active =
      Number(option.dataset.pullQuerySuggestion) === pullQuerySuggestionIndex;
    option.classList.toggle("is-active", active);
    option.setAttribute("aria-selected", String(active));
    if (active) option.scrollIntoView({ block: "nearest" });
  }
  input.setAttribute(
    "aria-activedescendant",
    `pull-query-suggestion-${pullQuerySuggestionIndex}`,
  );
  return true;
}

function insertPullQuerySuggestion(input, index = pullQuerySuggestionIndex) {
  const completion = pullQueryCompletions(input);
  const suggestion = completion.items[index];
  if (!suggestion) return false;
  const after = input.value.slice(completion.end);
  const separator = suggestion.complete && !/^\s/.test(after) ? " " : "";
  input.value =
    input.value.slice(0, completion.start) +
    suggestion.insert +
    separator +
    after;
  const caret = completion.start + suggestion.insert.length + separator.length;
  input.setSelectionRange(caret, caret);
  input.focus();
  syncPullQueryEditor(input);
  renderPullQuerySuggestions(input);
  return true;
}

async function commitPullQuery(input) {
  const route = parseRoute();
  if (!input || route.name !== "pulls") return;
  setPullQuerySuggestionsOpen(input, false);
  const state = stateFromPullQuery(input.value);
  const query = normalizePullQuery(input.value, state);
  const currentQuery = normalizePullQuery(route.query, route.state);
  if (state === route.state && query === currentQuery) return;
  const commitKey = JSON.stringify([
    route.repository,
    state,
    query,
    route.artifacts,
    route.ci,
  ]);
  if (pullQueryPendingCommit === commitKey) return;
  pullQueryPendingCommit = commitKey;
  try {
    await refreshPullTable({
      name: "pulls",
      repository: route.repository,
      state,
      query,
      artifacts: route.artifacts,
      ci: route.ci,
    });
  } finally {
    if (pullQueryPendingCommit === commitKey) pullQueryPendingCommit = null;
  }
}

function seedPullAuthors(repository, pulls) {
  const seeded = [];
  const seen = new Set();
  const repositoryChanged = pullAuthorsRepository !== repository;
  const labels = new Map(
    (repositoryChanged ? [] : pullQueryLabels).map((label) => [
      label.toLocaleLowerCase(),
      label,
    ]),
  );
  for (const pull of pulls) {
    for (const label of pull.labels ?? []) {
      if (!label?.name) continue;
      labels.set(label.name.toLocaleLowerCase(), label.name);
    }
    const login = pull.author;
    if (!login || seen.has(login.toLocaleLowerCase())) continue;
    seen.add(login.toLocaleLowerCase());
    seeded.push({
      login,
      name: null,
      avatarUrl: pull.authorAvatarUrl ?? null,
      profileUrl: null,
      type: "User",
      contributions: 0,
    });
  }
  pullQueryLabels = [...labels.values()].sort((left, right) =>
    left.localeCompare(right),
  );
  if (repositoryChanged) {
    pullAuthorsLoadSequence++;
    pullAuthorsRepository = repository;
    pullAuthors = seeded;
    pullAuthorsState = "idle";
    pullAuthorsError = null;
    return;
  }
  for (const author of seeded) {
    if (!pullAuthors.some((item) => item.login.toLocaleLowerCase() === author.login.toLocaleLowerCase())) {
      pullAuthors.push(author);
    }
  }
}

function pullAuthorOptionsHtml(filter = "", queryOverride = null) {
  const query =
    queryOverride ?? document.getElementById("pull-query")?.value ?? "";
  const selected = authorFromPullQuery(query);
  const needle = String(filter ?? "").trim().toLocaleLowerCase();
  const authors = pullAuthors.filter((author) =>
    `${author.login} ${author.name ?? ""}`.toLocaleLowerCase().includes(needle),
  );
  const everyoneMatches = !needle || "everyone".includes(needle);
  const options = [
    everyoneMatches
      ? `<button
          class="pull-author-option"
          type="button"
          role="menuitemradio"
          aria-checked="${selected == null}"
          data-select-pull-author=""
        >
          <span class="pull-author-check">${selected == null ? icon("check") : ""}</span>
          <span class="pull-author-avatar pull-author-avatar-fallback">${icon("person")}</span>
          <span class="pull-author-identity"><strong>Everyone</strong></span>
        </button>`
      : "",
    ...authors.map(
      (author) => `
        <button
          class="pull-author-option"
          type="button"
          role="menuitemradio"
          aria-checked="${selected?.toLocaleLowerCase() === author.login.toLocaleLowerCase()}"
          data-select-pull-author="${escapeHtml(author.login)}"
        >
          <span class="pull-author-check">${
            selected?.toLocaleLowerCase() === author.login.toLocaleLowerCase()
              ? icon("check")
              : ""
          }</span>
          ${
            author.avatarUrl
              ? `<img class="pull-author-avatar" src="${escapeHtml(author.avatarUrl)}" alt="" />`
              : `<span class="pull-author-avatar pull-author-avatar-fallback">${icon("person")}</span>`
          }
          <span class="pull-author-identity">
            <strong>${escapeHtml(author.login)}</strong>
            ${
              author.name &&
              author.name.toLocaleLowerCase() !== author.login.toLocaleLowerCase()
                ? `<span class="pull-author-name">${escapeHtml(author.name)}</span>`
                : ""
            }
          </span>
        </button>`,
    ),
  ].join("");
  const status =
    pullAuthorsState === "loading"
      ? `<div class="pull-author-status">${icon("sync", "spin")} Loading authors...</div>`
      : pullAuthorsError
        ? `<div class="pull-author-status error">${escapeHtml(pullAuthorsError)}</div>`
        : !options
          ? '<div class="pull-author-status">No authors match.</div>'
          : "";
  return options + status;
}

function renderPullAuthorOptions(filter = "") {
  const list = document.getElementById("pull-author-options");
  if (list) list.innerHTML = pullAuthorOptionsHtml(filter);
}

async function loadPullAuthors(repository) {
  if (
    pullAuthorsRepository === repository &&
    (pullAuthorsState === "loading" || pullAuthorsState === "ready")
  ) {
    return;
  }
  pullAuthorsRepository = repository;
  pullAuthorsState = "loading";
  pullAuthorsError = null;
  const sequence = ++pullAuthorsLoadSequence;
  renderPullAuthorOptions(document.getElementById("pull-author-filter")?.value);
  try {
    const payload = await api(
      `/api/repositories/authors?repo=${encodeURIComponent(repository)}`,
    );
    if (
      sequence !== pullAuthorsLoadSequence ||
      pullAuthorsRepository !== repository
    ) {
      return;
    }
    const byLogin = new Map(
      pullAuthors.map((author) => [author.login.toLocaleLowerCase(), author]),
    );
    for (const author of payload.authors ?? []) {
      byLogin.set(author.login.toLocaleLowerCase(), author);
    }
    pullAuthors = [...byLogin.values()];
    pullAuthorsState = "ready";
  } catch (error) {
    if (
      sequence !== pullAuthorsLoadSequence ||
      pullAuthorsRepository !== repository
    ) {
      return;
    }
    pullAuthorsState = "error";
    pullAuthorsError = error instanceof Error ? error.message : String(error);
  }
  if (
    sequence === pullAuthorsLoadSequence &&
    pullAuthorsRepository === repository
  ) {
    renderPullAuthorOptions(document.getElementById("pull-author-filter")?.value);
  }
}

function pullAuthorPanelHtml(query) {
  const selected = authorFromPullQuery(query);
  return `
    <div class="pull-author-picker">
      <button
        class="pull-state-trigger${selected ? " is-filtered" : ""}"
        type="button"
        data-toggle-pull-author
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls="pull-author-panel"
        title="${selected ? `Author: ${escapeHtml(selected)}` : "Filter by author"}"
      >
        <span>Author${selected ? ":" : ""}</span>
        ${selected ? `<span class="pull-filter-value">${escapeHtml(selected)}</span>` : ""}
        ${icon("chevron-down")}
      </button>
      <div id="pull-author-panel" class="pull-author-panel" role="menu" hidden>
        <div class="pull-state-panel-header">
          <strong>Filter by author</strong>
          <button class="pull-state-close" type="button" data-close-pull-author aria-label="Close author filter">
            ${icon("x")}
          </button>
        </div>
        <div class="pull-author-filter-wrap">
          ${icon("search")}
          <label class="sr-only" for="pull-author-filter">Filter authors</label>
          <input id="pull-author-filter" class="form-control" type="search" placeholder="Filter users" autocomplete="off" />
        </div>
        <div id="pull-author-options" class="pull-author-options">${pullAuthorOptionsHtml("", query)}</div>
      </div>
    </div>`;
}

function setPullAuthorPanelOpen(open) {
  const panel = document.getElementById("pull-author-panel");
  const trigger = document.querySelector("[data-toggle-pull-author]");
  if (!panel || !trigger) return;
  panel.hidden = !open;
  trigger.setAttribute("aria-expanded", String(open));
  trigger.closest(".pull-author-picker")?.classList.toggle("is-open", open);
  if (open) {
    document.getElementById("pull-author-filter")?.focus();
    void loadPullAuthors(parseRoute().repository);
  }
}

function artifactPrimaryLabel(cacheItem) {
  return cacheItem?.primary?.label ?? null;
}

function runStatusIcon(run) {
  if (run.conclusion === "success") {
    return icon("check-circle", "status-success");
  }
  if (["failure", "cancelled", "timed_out", "action_required"].includes(run.conclusion)) {
    return icon("x-circle", "status-danger");
  }
  return icon("clock", "status-attention");
}

const ARTIFACT_STATUS_OPTIONS = [
  { value: "all", label: "All statuses", icon: "workflow", className: "" },
  { value: "passing", label: "Passing", icon: "check-circle", className: "status-success" },
  { value: "failing", label: "Failing", icon: "x-circle", className: "status-danger" },
  { value: "active", label: "Active", icon: "sync", className: "status-attention" },
  { value: "cancelled", label: "Cancelled", icon: "x-circle", className: "status-muted" },
  { value: "skipped", label: "Skipped or neutral", icon: "clock", className: "status-muted" },
];

function artifactStatus(artifact) {
  const status = String(artifact.run?.status ?? "").toLocaleLowerCase();
  const conclusion = String(artifact.run?.conclusion ?? "").toLocaleLowerCase();
  if (status && status !== "completed") return "active";
  if (!conclusion && status !== "completed") return "active";
  if (conclusion === "success") return "passing";
  if (["failure", "timed_out", "action_required", "startup_failure"].includes(conclusion)) {
    return "failing";
  }
  if (conclusion === "cancelled") return "cancelled";
  if (["skipped", "neutral", "stale"].includes(conclusion)) return "skipped";
  return "skipped";
}

function artifactStatusOptions(artifacts) {
  const counts = new Map(ARTIFACT_STATUS_OPTIONS.map((option) => [option.value, 0]));
  counts.set("all", artifacts.length);
  for (const artifact of artifacts) {
    const value = artifactStatus(artifact);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return ARTIFACT_STATUS_OPTIONS.map((option) => ({
    ...option,
    count: counts.get(option.value) ?? 0,
  }));
}

function artifactNameKey(artifact) {
  return String(artifact.name ?? "").trim().toLocaleLowerCase();
}

function latestArtifactsByName(artifacts) {
  const seen = new Set();
  return [...artifacts]
    .sort((left, right) => {
      const byDate = new Date(right.createdAt) - new Date(left.createdAt);
      return byDate || Number(right.id) - Number(left.id);
    })
    .filter((artifact) => {
      const key = artifactNameKey(artifact);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function runEventLabel(value) {
  const event = String(value ?? "");
  const labels = {
    pull_request: "Pull request",
    push: "Push",
    workflow_dispatch: "Manual",
  };
  return labels[event] ?? event.replaceAll("_", " ");
}

function artifactRunLabel(run) {
  const name = String(run?.name ?? "Unknown workflow");
  const number = Number(run?.number);
  const event = runEventLabel(run?.event);
  return `${name}${Number.isFinite(number) ? ` #${number}` : ""}${event ? ` · ${event}` : ""}`;
}

function artifactRunOptions(artifacts) {
  const runs = new Map();
  for (const artifact of artifacts) {
    const id = artifact.run?.id == null ? "unknown" : String(artifact.run.id);
    const value = `run:${id}`;
    const existing = runs.get(value);
    if (existing) {
      existing.count++;
      continue;
    }
    runs.set(value, {
      value,
      label: artifactRunLabel(artifact.run),
      count: 1,
      createdAt: artifact.run?.createdAt ?? artifact.createdAt,
      icon: "workflow",
    });
  }
  return [
    {
      value: "latest",
      label: "Latest artifacts",
      count: latestArtifactsByName(artifacts).length,
      icon: "package",
    },
    {
      value: "all",
      label: "All runs",
      count: artifacts.length,
      icon: "workflow",
    },
    ...[...runs.values()].sort(
      (left, right) => new Date(right.createdAt) - new Date(left.createdAt),
    ),
  ];
}

function artifactsForRunFilter(artifacts, selectedRun) {
  if (selectedRun === "all") return artifacts;
  if (String(selectedRun).startsWith("run:")) {
    const runId = String(selectedRun).slice(4);
    return artifacts.filter((artifact) =>
      String(artifact.run?.id ?? "unknown") === runId);
  }
  return latestArtifactsByName(artifacts);
}

function artifactScopeCountLabel(allArtifacts, scopedArtifacts, selectedRun) {
  const hiddenCopies = allArtifacts.length - scopedArtifacts.length;
  if (selectedRun === "latest" && hiddenCopies > 0) {
    return {
      label: `${scopedArtifacts.length.toLocaleString()} latest`,
      title: `${hiddenCopies.toLocaleString()} older ${hiddenCopies === 1 ? "copy is" : "copies are"} hidden. Choose All runs to view them.`,
    };
  }
  if (String(selectedRun).startsWith("run:")) {
    return {
      label: `${scopedArtifacts.length.toLocaleString()} in run`,
      title: `${scopedArtifacts.length.toLocaleString()} artifacts in the selected workflow run.`,
    };
  }
  return {
    label: `${scopedArtifacts.length.toLocaleString()} total`,
    title: `${scopedArtifacts.length.toLocaleString()} retained artifacts.`,
  };
}

function artifactFilterOptionHtml(kind, option, selected) {
  return `
    <button
      class="artifact-filter-option"
      type="button"
      role="menuitemradio"
      aria-checked="${selected}"
      data-select-artifact-${kind}="${escapeHtml(option.value)}"
    >
      <span class="artifact-filter-check">${selected ? icon("check") : ""}</span>
      ${icon(option.icon ?? "workflow", option.className ?? "")}
      <span class="artifact-filter-option-copy">${escapeHtml(option.label)}</span>
      <span class="artifact-filter-option-count">${Number(option.count).toLocaleString()}</span>
    </button>`;
}

function artifactFilterPickerHtml(kind, label, options, selectedValue) {
  const selected = options.find((option) => option.value === selectedValue) ?? options[0];
  const effectiveValue = selected.value;
  const filtered =
    kind === "status"
      ? effectiveValue !== "all"
      : kind === "run"
        ? effectiveValue !== "latest"
        : Boolean(effectiveValue);
  const showSelection = kind === "run" || filtered;
  return `
    <div class="artifact-filter-picker">
      <button
        class="app-button app-button-small artifact-filter-trigger${filtered ? " is-filtered" : ""}"
        type="button"
        data-toggle-artifact-filter="${kind}"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls="artifact-${kind}-panel"
        title="${escapeHtml(showSelection ? `${label}: ${selected.label}` : `Filter by ${label.toLocaleLowerCase()}`)}"
      >
        ${icon(selected.icon ?? "workflow", selected.className ?? "")}
        <span class="artifact-filter-trigger-label">${escapeHtml(showSelection ? selected.label : label)}</span>
        ${icon("chevron-down")}
      </button>
      <div id="artifact-${kind}-panel" class="artifact-filter-panel" role="menu" hidden>
        <div class="artifact-filter-panel-header">
          <strong>Filter by ${escapeHtml(label.toLocaleLowerCase())}</strong>
          <button class="artifact-filter-close" type="button" data-close-artifact-filter aria-label="Close ${escapeHtml(label.toLocaleLowerCase())} filter">
            ${icon("x")}
          </button>
        </div>
        <div class="artifact-filter-options">
          ${options
            .map((option) =>
              artifactFilterOptionHtml(kind, option, option.value === effectiveValue),
            )
            .join("")}
        </div>
      </div>
    </div>`;
}

function artifactFilterControlsHtml(artifacts) {
  const statuses = artifactStatusOptions(
    artifactsForRunFilter(artifacts, artifactFilters.run),
  );
  const runs = artifactRunOptions(artifacts);
  return `
    <div id="artifact-filter-controls" class="artifact-filter-controls">
      ${artifactFilterPickerHtml("status", "Status", statuses, artifactFilters.status)}
      ${artifactFilterPickerHtml("run", "Run", runs, artifactFilters.run)}
    </div>`;
}

function renderArtifactFilterControls() {
  const controls = document.getElementById("artifact-filter-controls");
  if (controls && currentPullContext) {
    controls.outerHTML = artifactFilterControlsHtml(currentPullContext.artifacts);
  }
}

function setArtifactFilterPanelOpen(kind, open) {
  for (const candidate of ["status", "run"]) {
    const panel = document.getElementById(`artifact-${candidate}-panel`);
    const trigger = document.querySelector(
      `[data-toggle-artifact-filter="${candidate}"]`,
    );
    const isOpen = candidate === kind && open;
    if (panel) panel.hidden = !isOpen;
    if (trigger) trigger.setAttribute("aria-expanded", String(isOpen));
    trigger?.closest(".artifact-filter-picker")?.classList.toggle("is-open", isOpen);
  }
}

function normalizePullListRoute(route) {
  const repository = normalizeRepository(route.repository);
  const state = ["open", "closed", "all"].includes(route.state) ? route.state : "open";
  const filters = {
    artifacts: ["with", "without"].includes(route.artifacts) ? route.artifacts : "all",
    ci: ["failing", "passing", "pending", "none"].includes(route.ci) ? route.ci : "all",
  };
  const query =
    typeof route.query === "string" && route.query.trim()
      ? route.query.trim()
      : pullQueryForState("", state);
  return {
    name: "pulls",
    repository,
    state,
    query,
    ...filters,
  };
}

function pullListRequestPath(route) {
  const parameters = new URLSearchParams({
    repo: route.repository,
    state: route.state,
    q: route.query,
    artifacts: route.artifacts,
    ci: route.ci,
  });
  return `/api/pulls?${parameters}`;
}

function pullPayloadCacheKey(requestPath, accountId = bootstrapState?.account?.id) {
  return `${accountId ?? "anonymous"}|${requestPath}`;
}

function prunePullPayloadCache() {
  const now = Date.now();
  for (const [key, entry] of pullPayloadCache) {
    if (!entry.promise && now - entry.updatedAt > PULL_PAYLOAD_CACHE_STALE_MS) {
      pullPayloadCache.delete(key);
    }
  }
  while (pullPayloadCache.size > PULL_PAYLOAD_CACHE_LIMIT) {
    const candidate = [...pullPayloadCache].find(([, entry]) => !entry.promise);
    if (!candidate) return;
    pullPayloadCache.delete(candidate[0]);
  }
}

function cachedPullPayload(requestPath) {
  const key = pullPayloadCacheKey(requestPath);
  const entry = pullPayloadCache.get(key);
  if (!entry?.payload) return null;
  const age = Date.now() - entry.updatedAt;
  if (age > PULL_PAYLOAD_CACHE_STALE_MS) {
    if (!entry.promise) pullPayloadCache.delete(key);
    return null;
  }
  pullPayloadCache.delete(key);
  pullPayloadCache.set(key, entry);
  return {
    fresh: age <= PULL_PAYLOAD_CACHE_FRESH_MS,
    payload: entry.payload,
  };
}

async function requestPullPayload(requestPath, { force = false } = {}) {
  const key = pullPayloadCacheKey(requestPath);
  let entry = pullPayloadCache.get(key);
  const age = entry?.payload ? Date.now() - entry.updatedAt : Number.POSITIVE_INFINITY;
  if (!force && entry?.payload && age <= PULL_PAYLOAD_CACHE_FRESH_MS) {
    return entry.payload;
  }
  if (entry?.promise && (!force || entry.forceRefresh)) return entry.promise;

  entry ??= {
    forceRefresh: false,
    payload: null,
    promise: null,
    updatedAt: 0,
  };
  const separator = requestPath.includes("?") ? "&" : "?";
  const target = force ? `${requestPath}${separator}refresh=1` : requestPath;
  const promise = api(target).then(
    (payload) => {
      if (pullPayloadCache.get(key) === entry && entry.promise === promise) {
        entry.forceRefresh = false;
        entry.payload = payload;
        entry.promise = null;
        entry.updatedAt = Date.now();
        const resolvedAccountId = payload?.account?.id;
        const resolvedKey = resolvedAccountId
          ? pullPayloadCacheKey(requestPath, resolvedAccountId)
          : key;
        pullPayloadCache.delete(key);
        pullPayloadCache.set(resolvedKey, entry);
        prunePullPayloadCache();
      }
      return payload;
    },
    (error) => {
      if (pullPayloadCache.get(key) === entry && entry.promise === promise) {
        entry.forceRefresh = false;
        entry.promise = null;
        if (!entry.payload) pullPayloadCache.delete(key);
      }
      throw error;
    },
  );
  entry.forceRefresh = force;
  entry.promise = promise;
  pullPayloadCache.set(key, entry);
  prunePullPayloadCache();
  return promise;
}

function clearPullPayloadCache() {
  pullPayloadCache.clear();
}

function rememberPullPayload(requestPath, payload) {
  const key = pullPayloadCacheKey(
    requestPath,
    payload?.account?.id ?? bootstrapState?.account?.id,
  );
  pullPayloadCache.set(key, {
    forceRefresh: false,
    payload,
    promise: null,
    updatedAt: Date.now(),
  });
  prunePullPayloadCache();
  return payload;
}

function progressivePullRequestPath(
  requestPath,
  phase,
  { force = false, offset = null, sessionId = null } = {},
) {
  const parameters = [
    `phase=${encodeURIComponent(phase)}`,
    Number.isSafeInteger(offset) ? `offset=${offset}` : null,
    sessionId ? `session=${encodeURIComponent(sessionId)}` : null,
    force ? "refresh=1" : null,
  ].filter(Boolean);
  return `${requestPath}${requestPath.includes("?") ? "&" : "?"}${parameters.join("&")}`;
}

function requestInitialPullPayload(requestPath, { force = false } = {}) {
  return api(
    progressivePullRequestPath(requestPath, "initial", { force }),
  );
}

function pullRowHtml(pull, repository) {
  const authorBadge = pullAuthorBadge(pull);
  const reviewStatus = pullReviewStatus(pull);
  return `
    <div class="Box-row pull-row">
      ${icon("git-pull-request", `pull-icon ${pullIconClass(pull)}`)}
      <div class="Box-row-main">
        <div class="pull-row-title-line">
          <a class="Box-row-title" href="${pullHash(repository, pull.number)}">${titleHtml(pull.title)}</a>
          ${pullCheckHtml(pull)}
          <span class="labels">${pull.labels.slice(0, 4).map(labelHtml).join("")}</span>
        </div>
        <div class="Box-row-meta pull-row-meta">
          <span>${escapeHtml(pullListMeta(pull))}</span>
          ${authorBadge ? `<span class="author-association">${escapeHtml(authorBadge)}</span>` : ""}
          ${reviewStatus ? `<span class="pull-review-status">${escapeHtml(reviewStatus)}</span>` : ""}
        </div>
      </div>
      <div class="Box-row-actions color-fg-muted">
        ${
          pull.comments
            ? `<span class="pull-comments" title="${pull.comments.toLocaleString()} ${pull.comments === 1 ? "comment" : "comments"}">${icon("comment")} ${pull.comments.toLocaleString()}</span>`
            : ""
        }
      </div>
    </div>`;
}

function pullListPresentation(payload, route) {
  const pulls = payload.pulls ?? [];
  const totalCount = Number(payload.totalCount) || 0;
  const evaluatedCount = Number(payload.evaluatedCount) || 0;
  const filtered = payload.filtered === true;
  const appliedFilters = payload.filters ?? {
    artifacts: route.artifacts,
    ci: route.ci,
  };
  const toolbarCount = filtered ? pulls.length : totalCount;
  const heading = `${toolbarCount.toLocaleString()} ${filtered ? "matching " : ""}pull request${toolbarCount === 1 ? "" : "s"}`;
  const rows = pulls.length
    ? pulls.map((pull) => pullRowHtml(pull, route.repository)).join("")
    : `<div class="blankslate">
        ${icon("git-pull-request")}
        <h2>No pull requests match</h2>
        <p>Adjust the query or choose different filters.</p>
      </div>`;
  const footer = filtered
    ? `<div class="Box-footer">
        <span>${pulls.length.toLocaleString()} match${pulls.length === 1 ? "" : "es"} from ${evaluatedCount.toLocaleString()} evaluated</span>
        <span class="Box-footer-count">${totalCount.toLocaleString()} search result${totalCount === 1 ? "" : "s"}</span>
      </div>`
    : totalCount > pulls.length
      ? `<div class="Box-footer">
          <span>Showing the first ${pulls.length.toLocaleString()} pull requests</span>
          <span class="Box-footer-count">${totalCount.toLocaleString()} total</span>
        </div>`
      : "";
  return { appliedFilters, footer, heading, pulls, rows };
}

function pullListBoxHtml(payload, route) {
  const presentation = pullListPresentation(payload, route);
  return `
    <section class="Box pull-list-box" aria-label="Pull requests">
      <div class="Box-header toolbar pull-list-toolbar">
        <h2 class="Box-title">${icon("git-pull-request", "pull-list-heading-icon")}<span id="pull-list-heading-label">${presentation.heading}</span></h2>
        <span id="pull-list-partial-label" class="Label" ${payload.incomplete ? "" : "hidden"}>Partial results</span>
        <span class="toolbar-spacer"></span>
        ${pullAuthorPanelHtml(payload.query ?? route.query)}
        ${pullSignalPanelHtml("artifacts", presentation.appliedFilters.artifacts)}
        ${pullSignalPanelHtml("ci", presentation.appliedFilters.ci)}
        ${pullStatePanelHtml(route.state)}
      </div>
      <div id="pull-list-rows" class="pull-list-rows">${presentation.rows}</div>
      <div id="pull-list-footer">${presentation.footer}</div>
    </section>`;
}

function updatePullListRows(payload, route) {
  const presentation = pullListPresentation(payload, route);
  const heading = document.getElementById("pull-list-heading-label");
  const partial = document.getElementById("pull-list-partial-label");
  const rows = document.getElementById("pull-list-rows");
  const footer = document.getElementById("pull-list-footer");
  if (!heading || !partial || !rows || !footer) return false;
  heading.textContent = presentation.heading;
  partial.hidden = payload.incomplete !== true;
  rows.innerHTML = presentation.rows;
  footer.innerHTML = presentation.footer;
  return true;
}

function pullPageHtml(payload, route) {
  const query = payload.query ?? route.query;
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title repo-heading pulls-repo-heading">
          ${icon("repo")}
          <strong>${escapeHtml(route.repository)}</strong>
        </h1>
        <p class="page-subtitle">Search and filter pull requests with GitHub qualifiers.</p>
      </div>
      <div class="page-actions">
        <a class="app-button" href="https://github.com/${escapeHtml(route.repository)}/pulls" target="_blank" rel="noreferrer">
          ${icon("link-external")} View on GitHub
        </a>
      </div>
    </div>
    <form class="pull-query-form" data-pull-query-form>
      <label class="sr-only" for="pull-query">Filter pull requests</label>
      <div class="pull-query-input-wrap">
        ${icon("search")}
        <div class="pull-query-highlight" aria-hidden="true"><span id="pull-query-highlight-content">${pullQueryHighlightHtml(query)}</span></div>
        <input
          id="pull-query"
          class="form-control pull-query-input"
          type="text"
          role="combobox"
          value="${escapeHtml(query)}"
          placeholder="is:pr is:open author:octocat"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          enterkeyhint="search"
          aria-autocomplete="list"
          aria-controls="pull-query-suggestions"
          aria-expanded="false"
          aria-haspopup="listbox"
        />
        <div
          id="pull-query-suggestions"
          class="pull-query-suggestions"
          role="listbox"
          aria-label="Query suggestions"
          hidden
        ></div>
      </div>
    </form>
    ${pullListBoxHtml(payload, route)}`;
}

function pullFilterPreferenceForRoute(route, payload) {
  return {
    state: route.state,
    author: authorFromPullQuery(payload.query ?? route.query),
    artifacts: payload.filters?.artifacts ?? route.artifacts,
    ci: payload.filters?.ci ?? route.ci,
  };
}

async function persistPullListPreferences(route, payload) {
  const preference = persistPullFilterPreferenceClient(
    route.repository,
    pullFilterPreferenceForRoute(route, payload),
  );
  try {
    bootstrapState.prefs = await api("/api/preferences", {
      method: "POST",
      body: {
        repository: route.repository,
        pullState: route.state,
        pullFilter: preference,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    showToast(`Pull filters could not be saved across app restarts. ${detail}`, "error");
  }
}

function updatePullFilterControls(route) {
  const toolbar = document.querySelector(".pull-list-toolbar");
  if (!toolbar) return;

  const authorPicker = toolbar.querySelector(".pull-author-picker");
  if (authorPicker) authorPicker.outerHTML = pullAuthorPanelHtml(route.query);

  for (const kind of Object.keys(PULL_SIGNAL_FILTERS)) {
    const picker = toolbar
      .querySelector(`[data-toggle-pull-signal="${kind}"]`)
      ?.closest(".pull-signal-picker");
    if (picker) picker.outerHTML = pullSignalPanelHtml(kind, route[kind]);
  }

  const statePicker = toolbar.querySelector(".pull-state-picker");
  if (statePicker) statePicker.outerHTML = pullStatePanelHtml(route.state);

  const input = document.getElementById("pull-query");
  if (input) {
    input.value = route.query;
    syncPullQueryEditor(input);
    setPullQuerySuggestionsOpen(input, false);
  }
}

function setPullListLoading(loading) {
  const box = document.querySelector(".pull-list-box");
  if (!box) return;
  box.classList.toggle("is-loading", loading);
  if (loading) {
    box.setAttribute("aria-busy", "true");
    for (const button of box.querySelectorAll("button")) button.disabled = true;
    if (!box.querySelector(".pull-list-progress")) {
      box.querySelector(".pull-list-toolbar")?.insertAdjacentHTML(
        "afterend",
        `<div class="pull-list-progress" role="status" aria-live="polite">
          ${icon("sync", "spin")}
          <span>Updating pull requests...</span>
        </div>`,
      );
    }
    return;
  }
  box.classList.remove("is-loading");
  box.removeAttribute("aria-busy");
  box.querySelector(".pull-list-progress")?.remove();
  for (const button of box.querySelectorAll("button")) button.disabled = false;
}

function setPullListRefreshing(refreshing, message = "Refreshing") {
  const box = document.querySelector(".pull-list-box");
  if (!box) return;
  box.classList.toggle("is-refreshing", refreshing);
  const existing = box.querySelector(".pull-list-refresh-status");
  if (!refreshing) {
    existing?.remove();
    return;
  }
  if (!existing) {
    box.querySelector(".pull-list-toolbar .Box-title")?.insertAdjacentHTML(
      "afterend",
      `<span class="pull-list-refresh-status" role="status" aria-live="polite">
        ${icon("sync", "spin")}
        <span class="pull-list-refresh-copy">${escapeHtml(message)}</span>
      </span>`,
    );
    return;
  }
  const copy = existing.querySelector(".pull-list-refresh-copy");
  if (copy) copy.textContent = message;
}

function replacePullTable(payload, route, { updateHistory = true } = {}) {
  updateAccountFromPayload(payload);
  seedPullAuthors(route.repository, payload.pulls ?? []);
  const box = document.querySelector(".pull-list-box");
  if (!box) return false;
  box.outerHTML = pullListBoxHtml(payload, route);
  const input = document.getElementById("pull-query");
  if (input) input.value = payload.query ?? route.query;
  const hash = pullsHash(
    route.repository,
    route.state,
    payload.query ?? route.query,
    payload.filters ?? route,
  );
  if (updateHistory) history.pushState(null, "", hash);
  setBreadcrumbs([
    { label: route.repository, href: hash },
    { label: "Pull requests" },
  ]);
  return true;
}

async function continueProgressivePullList(
  initialPayload,
  route,
  sequence,
  requestPath,
  { refreshSequence = null } = {},
) {
  const isActive = () =>
    sequence === renderSequence &&
    (refreshSequence === null ||
      refreshSequence === pullTableRefreshSequence);
  const batchSize =
    Number(initialPayload.progressive?.batchSize) || 25;
  const sourceCount =
    Number(initialPayload.progressive?.sourceCount) ||
    initialPayload.pulls?.length ||
    0;
  const sessionId = initialPayload.progressive?.sessionId;
  const sourceOrder = (initialPayload.pulls ?? []).map((pull) =>
    Number(pull.number));
  const displayedPulls = new Map(
    (initialPayload.pulls ?? []).map((pull) => [Number(pull.number), pull]),
  );
  let workingPayload = initialPayload;
  let finalPayload = null;

  try {
    for (let offset = batchSize; offset < sourceCount; offset += batchSize) {
      if (!isActive()) return;
      setPullListRefreshing(
        true,
        `Loading more pull requests (${Math.min(offset, sourceCount)} of ${sourceCount})`,
      );
      const batch = await api(
        progressivePullRequestPath(requestPath, "batch", {
          offset,
          sessionId,
        }),
      );
      if (!isActive()) return;
      updateAccountFromPayload(batch);
      for (const pull of batch.pulls ?? []) {
        const number = Number(pull.number);
        if (!displayedPulls.has(number)) sourceOrder.push(number);
        displayedPulls.set(number, pull);
      }
      workingPayload = {
        ...workingPayload,
        pulls: sourceOrder.map((number) => displayedPulls.get(number)).filter(Boolean),
        progressive: batch.progressive,
      };
      seedPullAuthors(route.repository, workingPayload.pulls);
      updatePullListRows(workingPayload, route);
    }

    const filterActive =
      route.artifacts !== "all" || route.ci !== "all";
    setPullListRefreshing(
      true,
      filterActive
        ? "Checking CI and artifact filters"
        : "Fetching checks, reviews, and comments",
    );
    const offsets = [];
    for (let offset = 0; offset < sourceCount; offset += batchSize) {
      offsets.push(offset);
    }
    let cursor = 0;
    let workerError = null;
    const worker = async () => {
      try {
        while (cursor < offsets.length && !finalPayload && !workerError) {
          const offset = offsets[cursor++];
          const details = await api(
            progressivePullRequestPath(requestPath, "details", {
              offset,
              sessionId,
            }),
          );
          if (workerError || !isActive()) return;
          updateAccountFromPayload(details);
          if (finalPayload && !details.payload) continue;
          if (details.payload) {
            finalPayload = {
              ...details.payload,
              account: details.account,
              repository: details.repository,
            };
            workingPayload = finalPayload;
          } else {
            for (const number of details.sourceNumbers ?? []) {
              displayedPulls.delete(Number(number));
            }
            for (const pull of details.pulls ?? []) {
              displayedPulls.set(Number(pull.number), pull);
            }
            workingPayload = {
              ...workingPayload,
              pulls: sourceOrder
                .map((number) => displayedPulls.get(number))
                .filter(Boolean),
              progressive: {
                ...workingPayload.progressive,
                detailedCount: Number(details.completedCount) || 0,
              },
            };
          }
          if (workerError || !isActive()) return;
          seedPullAuthors(route.repository, workingPayload.pulls);
          updatePullListRows(workingPayload, route);
          if (!finalPayload) {
            setPullListRefreshing(
              true,
              `Fetching additional details (${Math.min(Number(details.completedCount) || 0, sourceCount)} of ${sourceCount})`,
            );
          }
        }
      } catch (error) {
        workerError ??= error;
      }
    };
    await Promise.all(
      Array.from(
        { length: Math.min(2, offsets.length) },
        () => worker(),
      ),
    );
    if (workerError) throw workerError;
    if (!isActive()) return;
    if (finalPayload) {
      rememberPullPayload(requestPath, finalPayload);
      updateAccountFromPayload(finalPayload);
      updatePullListRows(finalPayload, route);
      void persistPullListPreferences(route, finalPayload);
    }
    setPullListRefreshing(false);
  } catch (error) {
    if (isActive()) {
      setPullListRefreshing(false);
      showToast(error instanceof Error ? error.message : String(error), "error");
    }
  }
}

async function refreshPullTable(route, { force = false } = {}) {
  const nextRoute = normalizePullListRoute(route);
  const currentRoute = parseRoute();
  const box = document.querySelector(".pull-list-box");
  if (
    !box ||
    currentRoute.name !== "pulls" ||
    normalizeRepository(currentRoute.repository) !== nextRoute.repository
  ) {
    location.hash = pullsHash(
      nextRoute.repository,
      nextRoute.state,
      nextRoute.query,
      nextRoute,
    );
    return;
  }

  const previousRoute = normalizePullListRoute({
    ...currentRoute,
    query: document.getElementById("pull-query")?.value ?? currentRoute.query,
  });
  const refreshSequence = ++pullTableRefreshSequence;
  const activeRenderSequence = renderSequence;
  const requestPath = pullListRequestPath(nextRoute);
  const cached = force ? null : cachedPullPayload(requestPath);
  updatePullFilterControls(nextRoute);
  if (cached) {
    replacePullTable(cached.payload, nextRoute);
    void persistPullListPreferences(nextRoute, cached.payload);
    if (cached.fresh) return;
    setPullListRefreshing(true);
  } else if (force) {
    setPullListRefreshing(true);
  } else {
    setPullListLoading(true);
  }
  try {
    const payload = cached
      ? await requestPullPayload(requestPath, { force })
      : await requestInitialPullPayload(requestPath, { force });
    if (
      refreshSequence !== pullTableRefreshSequence ||
      activeRenderSequence !== renderSequence
    ) {
      return;
    }
    replacePullTable(payload, nextRoute, {
      updateHistory: !cached && !force,
    });
    void persistPullListPreferences(nextRoute, payload);
    if (payload.progressive?.complete === false) {
      void continueProgressivePullList(
        payload,
        nextRoute,
        activeRenderSequence,
        requestPath,
        { refreshSequence },
      );
    } else if (!cached) {
      rememberPullPayload(requestPath, payload);
    }
  } catch (error) {
    if (
      refreshSequence === pullTableRefreshSequence &&
      activeRenderSequence === renderSequence
    ) {
      if (!cached) updatePullFilterControls(previousRoute);
      setPullListLoading(false);
      setPullListRefreshing(false);
      showToast(error instanceof Error ? error.message : String(error), "error");
    }
  }
}

async function revalidateRenderedPullList(
  route,
  sequence,
  refreshSequence,
  requestPath,
) {
  setPullListRefreshing(true);
  try {
    const payload = await requestPullPayload(requestPath);
    if (
      sequence !== renderSequence ||
      refreshSequence !== pullTableRefreshSequence
    ) {
      return;
    }
    replacePullTable(payload, route, { updateHistory: false });
    void persistPullListPreferences(route, payload);
  } catch (error) {
    if (
      sequence === renderSequence &&
      refreshSequence === pullTableRefreshSequence
    ) {
      setPullListRefreshing(false);
      showToast(error instanceof Error ? error.message : String(error), "error");
    }
  }
}

async function renderPulls(route, sequence, { force = false } = {}) {
  const normalizedRoute = normalizePullListRoute(route);
  const pullFilters = {
    artifacts: normalizedRoute.artifacts,
    ci: normalizedRoute.ci,
  };
  const refreshSequence = ++pullTableRefreshSequence;
  repositoryInput.value = rememberRepositoryClient(normalizedRoute.repository);
  setBreadcrumbs([
    {
      label: normalizedRoute.repository,
      href: pullsHash(
        normalizedRoute.repository,
        normalizedRoute.state,
        normalizedRoute.query,
        pullFilters,
      ),
    },
    { label: "Pull requests" },
  ]);
  const requestPath = pullListRequestPath(normalizedRoute);
  const cached = force ? null : cachedPullPayload(requestPath);
  if (cached) {
    updateAccountFromPayload(cached.payload);
    seedPullAuthors(normalizedRoute.repository, cached.payload.pulls ?? []);
    view.innerHTML = pullPageHtml(cached.payload, normalizedRoute);
    void persistPullListPreferences(normalizedRoute, cached.payload);
    if (!cached.fresh) {
      void revalidateRenderedPullList(
        normalizedRoute,
        sequence,
        refreshSequence,
        requestPath,
      );
    }
    return;
  }

  loadingView();
  const payload = await requestInitialPullPayload(requestPath, { force });
  if (sequence !== renderSequence) return;
  updateAccountFromPayload(payload);
  seedPullAuthors(normalizedRoute.repository, payload.pulls ?? []);
  view.innerHTML = pullPageHtml(payload, normalizedRoute);
  void persistPullListPreferences(normalizedRoute, payload);
  if (payload.progressive?.complete === false) {
    void continueProgressivePullList(
      payload,
      normalizedRoute,
      sequence,
      requestPath,
      { refreshSequence },
    );
  } else {
    rememberPullPayload(requestPath, payload);
  }
}

function artifactRowHtml(artifact, repository, pullNumber, cachedById) {
  const cached = cachedById.get(String(artifact.id));
  const progress = cached ? null : artifactDownloadProgress.get(String(artifact.id));
  const downloading = Boolean(progress && progress.stage !== "error");
  const showTransferRow =
    downloading &&
    isLargeArtifactProgress(progress, artifact.sizeInBytes);
  const primary = artifactPrimaryLabel(cached);
  const href = cached
    ? artifactHash(repository, pullNumber, artifact.id)
    : null;
  const clickable = !artifact.expired;
  return `
    <div
      class="Box-row artifact-row${clickable ? " is-clickable" : " is-expired"}${downloading ? " is-downloading" : ""}${showTransferRow ? " has-transfer-row" : ""}"
      data-artifact-id="${artifact.id}"
      data-artifact-size="${Number(artifact.sizeInBytes) || 0}"
      ${downloading ? 'aria-busy="true"' : ""}
      ${showTransferRow ? `aria-describedby="artifact-transfer-${artifact.id}"` : ""}
    >
      ${
        clickable && !downloading
          ? href
            ? `<a class="artifact-row-overlay" href="${escapeHtml(href)}" aria-label="Open ${escapeHtml(artifact.name)}"></a>`
            : `<button class="artifact-row-overlay" type="button" data-inspect-artifact="${artifact.id}" data-repository="${escapeHtml(repository)}" data-pull-number="${pullNumber}" aria-label="Inspect ${escapeHtml(artifact.name)}"></button>`
          : ""
      }
      ${icon("package", "artifact-icon")}
      <div class="Box-row-main">
        <span class="Box-row-title">${escapeHtml(artifact.name)}</span>
        ${primary ? `<span class="Label ml-2">${escapeHtml(primary)}</span>` : ""}
        <div class="artifact-summary mt-1">
          <span class="artifact-summary-item">${runStatusIcon(artifact.run)} ${escapeHtml(artifact.run.name)}</span>
          <span class="artifact-summary-item">${icon("workflow")} Run ${artifact.run.number}</span>
          <span class="artifact-summary-item">${icon("archive")} ${formatBytes(artifact.sizeInBytes)}</span>
          <span class="artifact-summary-item">${icon("clock")} Expires ${escapeHtml(formatDate(artifact.expiresAt))}</span>
        </div>
      </div>
      <div class="Box-row-actions">
        ${
          downloading
            ? `<button class="app-button app-button-small" type="button" disabled aria-live="polite">${icon("sync", "spin artifact-download-spinner")}<span class="artifact-download-button-label">${progress.stage === "indexing" ? "Indexing..." : "Downloading..."}</span></button>`
            : artifact.expired
              ? '<span class="Label">Expired</span>'
              : cached
                ? `<a class="app-button app-button-small" href="${href}">${icon("eye")} Open</a>`
                : `<button class="app-button app-button-small" type="button" data-inspect-artifact="${artifact.id}" data-repository="${escapeHtml(repository)}" data-pull-number="${pullNumber}">${icon("download")} Inspect</button>`
        }
      </div>
    </div>
    ${showTransferRow ? artifactTransferRowHtml(progress, artifact.id) : ""}`;
}

function artifactDownloadPhrase(progress) {
  if (progress.stage === "preparing") return "Opening the artifact vault...";
  if (progress.stage === "indexing") return "Download complete. Mapping the archive...";
  if (progress.stage === "ready") return "Artifact ready. Opening the explorer...";
  if (progress.stage === "error") return progress.message ?? "The download did not finish.";
  const percent = Number(progress.percent);
  if (!Number.isFinite(percent) || percent < 5) return "Warming up the byte conveyor...";
  if (percent < 25) return "The bits are officially in motion.";
  if (percent < 50) return "Cruising through the first half.";
  if (percent < 75) return "More behind us than ahead.";
  if (percent < 92) return "The finish line is in sight.";
  return "Almost there - indexing is next.";
}

function artifactDownloadProgressHtml(progress) {
  const receivedBytes = Math.max(0, Number(progress.receivedBytes) || 0);
  const totalBytes = Number(progress.totalBytes);
  const percent = Number(progress.percent);
  const determinate = Number.isFinite(totalBytes) && totalBytes > 0;
  const normalizedPercent = determinate && Number.isFinite(percent)
    ? Math.max(0, Math.min(100, percent))
    : progress.stage === "indexing" || progress.stage === "ready"
      ? 100
      : 0;
  const details = [
    determinate
      ? `${formatBytes(receivedBytes)} of ${formatBytes(totalBytes)}`
      : receivedBytes
        ? `${formatBytes(receivedBytes)} downloaded`
        : null,
    Number(progress.bytesPerSecond) > 0
      ? `${formatBytes(progress.bytesPerSecond)}/s`
      : null,
    progress.stage === "downloading"
      ? formatRemainingTime(progress.etaSeconds)
      : null,
  ].filter(Boolean);
  const valueAttributes = determinate
    ? `aria-valuenow="${Math.round(normalizedPercent)}" aria-valuemin="0" aria-valuemax="100"`
    : "";
  return `
    <div
      class="artifact-download-progress${determinate ? "" : " is-indeterminate"}${progress.stage === "error" ? " is-error" : ""}"
      role="progressbar"
      aria-label="Downloading ${escapeHtml(progress.artifactName ?? "artifact")}"
      aria-valuetext="${escapeHtml(details.join(", ") || artifactDownloadPhrase(progress))}"
      ${valueAttributes}
      style="--artifact-download-percent:${normalizedPercent}%"
    >
      <div class="artifact-download-copy">
        <span class="artifact-download-phrase">${escapeHtml(artifactDownloadPhrase(progress))}</span>
        <span class="artifact-download-stats">${escapeHtml(details.join(" · "))}</span>
      </div>
      <div class="artifact-download-track" aria-hidden="true">
        <span class="artifact-download-bar"></span>
      </div>
    </div>`;
}

function isLargeArtifactProgress(progress, fallbackBytes = 0) {
  const totalBytes = Number(progress?.totalBytes);
  const artifactBytes =
    Number.isFinite(totalBytes) && totalBytes > 0
      ? totalBytes
      : Number(fallbackBytes);
  return Number.isFinite(artifactBytes) &&
    artifactBytes > LARGE_ARTIFACT_PROGRESS_BYTES;
}

function artifactTransferRowHtml(progress, artifactId) {
  return `
    <div
      id="artifact-transfer-${artifactId}"
      class="artifact-transfer-row"
      data-artifact-transfer-id="${artifactId}"
    >
      ${icon("download", "artifact-transfer-icon")}
      ${artifactDownloadProgressHtml(progress)}
    </div>`;
}

function updateArtifactDownloadButton(button, progress) {
  const label =
    progress.stage === "indexing"
      ? "Indexing..."
      : progress.stage === "ready"
        ? "Opening..."
        : progress.stage === "error"
          ? "Failed"
          : "Downloading...";
  let spinner = button.querySelector(".artifact-download-spinner");
  let copy = button.querySelector(".artifact-download-button-label");
  if (!spinner || !copy) {
    button.innerHTML =
      `${icon("sync", "spin artifact-download-spinner")}` +
      '<span class="artifact-download-button-label"></span>';
    spinner = button.querySelector(".artifact-download-spinner");
    copy = button.querySelector(".artifact-download-button-label");
  }
  spinner?.classList.toggle("spin", progress.stage !== "error");
  if (copy) copy.textContent = label;
}

function updateArtifactDownloadProgress(progress) {
  const artifactId = Number(progress?.artifactId);
  if (!Number.isSafeInteger(artifactId) || artifactId <= 0) return;
  const key = String(artifactId);
  artifactDownloadProgress.set(key, progress);
  const row = document.querySelector(`.artifact-row[data-artifact-id="${key}"]`);
  if (!row) return;

  row.classList.add("is-downloading");
  row.setAttribute("aria-busy", "true");
  row.querySelector(".artifact-download-progress")?.remove();
  const transferSelector = `.artifact-transfer-row[data-artifact-transfer-id="${key}"]`;
  const currentTransfer = document.querySelector(transferSelector);
  const showTransferRow = isLargeArtifactProgress(
    progress,
    row.dataset.artifactSize,
  );
  row.classList.toggle("has-transfer-row", showTransferRow);
  if (showTransferRow) {
    row.setAttribute("aria-describedby", `artifact-transfer-${artifactId}`);
  } else {
    row.removeAttribute("aria-describedby");
  }
  if (showTransferRow) {
    const html = artifactTransferRowHtml(progress, artifactId);
    if (currentTransfer) currentTransfer.outerHTML = html;
    else row.insertAdjacentHTML("afterend", html);
  } else {
    currentTransfer?.remove();
  }
  for (const control of row.querySelectorAll("button[data-inspect-artifact]")) {
    control.disabled = true;
  }
  const statusButton = row.querySelector(".Box-row-actions button");
  if (statusButton) {
    statusButton.disabled = true;
    statusButton.setAttribute("aria-live", "polite");
    updateArtifactDownloadButton(statusButton, progress);
  }
}

function renderPullArtifactRows(filter = artifactFilters.query) {
  if (!currentPullContext) return;
  artifactFilters.query = String(filter ?? "");
  const normalizedFilter = artifactFilters.query.trim().toLocaleLowerCase();
  const allArtifacts = currentPullContext.artifacts;
  const scopedArtifacts = artifactsForRunFilter(allArtifacts, artifactFilters.run);
  const hasContentFilters =
    Boolean(normalizedFilter) || artifactFilters.status !== "all";
  const matches = scopedArtifacts.filter((artifact) => {
    const textMatches =
      !normalizedFilter ||
      artifact.name.toLocaleLowerCase().includes(normalizedFilter) ||
      String(artifact.run.name ?? "Unknown workflow")
        .toLocaleLowerCase()
        .includes(normalizedFilter) ||
      String(artifact.run.number).includes(normalizedFilter) ||
      String(artifact.run.event ?? "").toLocaleLowerCase().includes(normalizedFilter) ||
      String(artifact.run.conclusion ?? "").toLocaleLowerCase().includes(normalizedFilter);
    const statusMatches =
      artifactFilters.status === "all" ||
      artifactStatus(artifact) === artifactFilters.status;
    return textMatches && statusMatches;
  });
  const visible = matches.slice(0, 250);
  const list = document.getElementById("artifact-list");
  if (!list) return;
  list.innerHTML = visible.length
    ? visible.map((artifact) => artifactRowHtml(
        artifact,
        currentPullContext.repository,
        currentPullContext.pullNumber,
        currentPullContext.cachedById,
      )).join("")
    : `<div class="blankslate">
        ${icon("search")}
        <h2>No matching artifacts</h2>
        <p>Try a run name, recording, report, or artifact filename.</p>
      </div>`;
  const summary = document.getElementById("artifact-list-summary");
  if (summary) {
    const total = scopedArtifacts.length;
    const artifactLabel = total === 1 ? "artifact" : "artifacts";
    const hiddenCopies = allArtifacts.length - scopedArtifacts.length;
    const shownLabel = hasContentFilters
      ? !matches.length
        ? "No matching artifacts"
        : matches.length > visible.length
          ? `Showing the first ${visible.length.toLocaleString()} matching artifacts`
          : "All matching artifacts shown"
      : artifactFilters.run === "latest" && hiddenCopies > 0
        ? "Latest copy of each artifact shown"
        : artifactFilters.run === "all"
          ? "All retained runs shown"
          : "Selected run shown";
    const totalLabel = hasContentFilters
      ? `${matches.length.toLocaleString()} of ${total.toLocaleString()} ${artifactLabel}`
      : artifactFilters.run === "latest" && hiddenCopies > 0
        ? `${total.toLocaleString()} ${artifactLabel} · ${hiddenCopies.toLocaleString()} older ${hiddenCopies === 1 ? "copy" : "copies"} hidden`
      : `${total.toLocaleString()} ${artifactLabel}`;
    summary.innerHTML = `
      <span>${escapeHtml(shownLabel)}</span>
      <span class="Box-footer-count">${escapeHtml(totalLabel)}</span>`;
  }
  const matchedCount = document.getElementById("artifact-match-count");
  if (matchedCount) {
    matchedCount.hidden = !hasContentFilters;
    matchedCount.textContent = `${matches.length.toLocaleString()} matched`;
  }
  const totalCount = document.getElementById("artifact-total-count");
  if (totalCount) {
    const scope = artifactScopeCountLabel(allArtifacts, scopedArtifacts, artifactFilters.run);
    totalCount.textContent = scope.label;
    totalCount.title = scope.title;
  }
}

function renderPullPayload(repository, pullNumber, payload, cache) {
  updateAccountFromPayload(payload);
  updateCacheHeader(cache);
  const pull = payload.pullRequest;
  const state = pullState(pull);
  const cachedById = new Map(cache.artifacts.map((item) => [String(item.id), item]));
  const artifacts = payload.artifacts ?? [];
  const filterContext = `${repository}#${pullNumber}`;
  if (artifactFilters.context !== filterContext) {
    artifactFilters = {
      context: filterContext,
      query: "",
      status: "all",
      run: "latest",
    };
  }
  bootstrapState.prefs.repository = repository;
  bootstrapState.prefs.pullNumber = pullNumber;
  currentPullContext = { artifacts, cachedById, pullNumber, repository };
  const initialArtifacts = artifactsForRunFilter(artifacts, artifactFilters.run);
  const initialScope = artifactScopeCountLabel(
    artifacts,
    initialArtifacts,
    artifactFilters.run,
  );

  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <strong>${titleHtml(pull.title)}</strong>
          <span class="page-title-number">#${pull.number}</span>
        </h1>
      </div>
      <div class="page-actions">
        <a class="app-button" href="${escapeHtml(pull.url)}" target="_blank" rel="noreferrer">
          ${icon("link-external")} View on GitHub
        </a>
      </div>
    </div>
    <div class="pr-summary">
      <span class="state-badge ${state.className}">${icon("git-pull-request")} ${escapeHtml(state.label)}</span>
      ${pull.authorAvatarUrl ? `<img class="avatar" src="${escapeHtml(pull.authorAvatarUrl)}" alt="" />` : ""}
      <span><strong>${escapeHtml(pull.author)}</strong> wants to merge into <span class="branch-name">${escapeHtml(pull.baseRef)}</span></span>
      <span>Updated ${escapeHtml(relativeTime(pull.updatedAt))}</span>
    </div>
    <section class="Box artifact-list-box" aria-label="Workflow artifacts">
      <div class="Box-header toolbar artifact-toolbar">
        <h2 class="Box-title">${icon("package")} Artifacts</h2>
        <span id="artifact-total-count" class="Counter ml-2" title="${escapeHtml(initialScope.title)}">${escapeHtml(initialScope.label)}</span>
        <span id="artifact-match-count" class="Counter Counter--secondary ml-1" hidden></span>
        <span class="toolbar-spacer"></span>
        <label class="sr-only" for="artifact-filter">Filter workflow artifacts</label>
        <input id="artifact-filter" class="form-control input-sm artifact-filter" type="search" placeholder="Filter artifacts" autocomplete="off" value="${escapeHtml(artifactFilters.query)}" />
        ${artifactFilterControlsHtml(artifacts)}
        <button class="app-button app-button-small artifact-refresh" type="button" data-refresh-view>${icon("sync")} Refresh</button>
      </div>
      ${
        artifacts.length
          ? `<div id="artifact-list"></div>
             <div id="artifact-list-summary" class="Box-footer" aria-live="polite"></div>`
          : `<div class="blankslate">
              ${icon("package")}
              <h2>No workflow artifacts found</h2>
              <p>No retained GitHub Actions artifacts are associated with this pull request head commit.</p>
            </div>`
      }
    </section>`;
  if (artifacts.length) renderPullArtifactRows();
}

async function revalidateRenderedPull(
  repository,
  pullNumber,
  sequence,
  requestPath,
) {
  try {
    const payload = await requestPullPayload(requestPath);
    if (sequence !== renderSequence) return;
    renderPullPayload(
      repository,
      pullNumber,
      payload,
      bootstrapState.cache,
    );
  } catch (error) {
    if (sequence === renderSequence) {
      showToast(error instanceof Error ? error.message : String(error), "error");
    }
  }
}

async function renderPull(route, sequence, { force = false } = {}) {
  const repository = normalizeRepository(route.repository);
  const pullNumber = Number(route.pullNumber);
  const requestPath =
    `/api/pulls/${pullNumber}?repo=${encodeURIComponent(repository)}`;
  repositoryInput.value = rememberRepositoryClient(repository);
  setBreadcrumbs([
    { label: repository, href: pullsHashForRepository(repository) },
    { label: "Pull requests", href: pullsHashForRepository(repository) },
    { label: `#${pullNumber}` },
  ]);

  const cached = force ? null : cachedPullPayload(requestPath);
  if (cached && bootstrapState.cache) {
    renderPullPayload(
      repository,
      pullNumber,
      cached.payload,
      bootstrapState.cache,
    );
    if (!cached.fresh) {
      void revalidateRenderedPull(
        repository,
        pullNumber,
        sequence,
        requestPath,
      );
    }
    return;
  }

  loadingView();
  const [payload, cache] = await Promise.all([
    requestPullPayload(requestPath, { force }),
    api("/api/cache"),
  ]);
  if (sequence !== renderSequence) return;
  renderPullPayload(repository, pullNumber, payload, cache);
}

function fileIconName(kind) {
  if (kind === "asciinema") return "terminal";
  if (kind === "html") return "browser";
  if (kind === "image") return "file-media";
  if (kind === "markdown") return "markdown";
  if (kind === "trx") return "check-circle";
  if (kind === "json" || kind === "text" || kind === "xml") return "file-code";
  if (kind === "archive") return "file-zip";
  if (kind === "pdf") return "file";
  return "file-binary";
}

function artifactEntryKind(entry) {
  if (/\.trx$/i.test(String(entry.path ?? entry.name ?? ""))) {
    return "trx";
  }
  if (
    entry.kind === "text" &&
    String(entry.mime ?? "").toLocaleLowerCase().includes("xml")
  ) {
    return "xml";
  }
  return entry.kind;
}

function rootIndexHtmlEntry(entries) {
  return entries.find((entry) => {
    const path = String(entry.path ?? "")
      .replaceAll("\\", "/")
      .replace(/^\.\/+/, "");
    return (
      !path.includes("/") &&
      path.toLocaleLowerCase() === "index.html" &&
      artifactEntryKind(entry) === "html"
    );
  });
}

function shouldUseStaticSitePreview(entry, entries) {
  return rootIndexHtmlEntry(entries) === entry;
}

function directoryPathsForFile(path) {
  const parts = String(path ?? "").split("/").filter(Boolean);
  const directories = [];
  for (let index = 1; index < parts.length; index++) {
    directories.push(parts.slice(0, index).join("/"));
  }
  return directories;
}

function createArtifactFileTreeState(entries, selectedPath) {
  const expandedDirectories = new Set();
  if (entries.length <= EXPAND_ALL_FILE_TREE_LIMIT) {
    for (const entry of entries) {
      for (const path of directoryPathsForFile(entry.path)) {
        expandedDirectories.add(path);
      }
    }
  }
  for (const path of directoryPathsForFile(selectedPath)) {
    expandedDirectories.add(path);
  }
  return {
    expandedDirectories,
    excludedExtensions: new Set(),
    filterMenuOpen: false,
    includeVendoredFiles: true,
    includeViewedFiles: true,
    onlyManifestFiles: false,
    viewedPaths: new Set(selectedPath ? [selectedPath] : []),
  };
}

function artifactFileExtension(entry) {
  const name = String(entry.name ?? entry.path?.split("/").at(-1) ?? "");
  const separator = name.lastIndexOf(".");
  return separator > 0 && separator < name.length - 1
    ? name.slice(separator).toLocaleLowerCase()
    : "";
}

function isManifestArtifactEntry(entry) {
  const name = String(entry.name ?? entry.path?.split("/").at(-1) ?? "")
    .toLocaleLowerCase();
  return (
    MANIFEST_FILE_NAMES.has(name) ||
    /^requirements(?:[._-].*)?\.txt$/.test(name) ||
    /\.(?:csproj|fsproj|nuspec|proj|props|sln|slnx|targets|vbproj)$/.test(name)
  );
}

function isVendoredArtifactEntry(entry) {
  return String(entry.path ?? "")
    .replaceAll("\\", "/")
    .toLocaleLowerCase()
    .split("/")
    .some((segment) => VENDORED_PATH_SEGMENTS.has(segment));
}

function fileTreeFiltersActive(state = currentArtifact?.fileTree) {
  return Boolean(
    state &&
    (
      state.excludedExtensions.size ||
      state.onlyManifestFiles ||
      !state.includeVendoredFiles ||
      !state.includeViewedFiles
    )
  );
}

function fileTreeExtensionOptions(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const extension = artifactFileExtension(entry);
    counts.set(extension, (counts.get(extension) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([extension, count]) => ({
      count,
      extension,
      label: extension || "No extension",
    }))
    .sort((left, right) => {
      if (!left.extension) return 1;
      if (!right.extension) return -1;
      return FILE_PATH_COLLATOR.compare(left.extension, right.extension);
    });
}

function fileTreeFilterCheckHtml(checked) {
  return checked ? icon("check") : "";
}

function fileTreeFilterControlHtml(entries) {
  const state = currentArtifact.fileTree;
  const active = fileTreeFiltersActive(state);
  return `
    <div
      id="file-tree-filter-root"
      class="file-tree-filter-root${state.filterMenuOpen ? " is-open" : ""}"
      data-file-tree-filter-root
    >
      <button
        class="app-button app-button-icon-only file-tree-filter-trigger${active ? " is-filtered" : ""}"
        type="button"
        data-toggle-file-tree-filter
        aria-label="Filter artifact files"
        aria-haspopup="menu"
        aria-expanded="${state.filterMenuOpen}"
        aria-controls="file-tree-filter-menu"
        title="Filter files"
      >${icon("filter")}</button>
      <div
        id="file-tree-filter-menu"
        class="file-tree-filter-menu"
        role="menu"
        ${state.filterMenuOpen ? "" : "hidden"}
      >
        <div class="file-tree-filter-heading">File extensions</div>
        <div class="file-tree-filter-options" role="group" aria-label="File extensions">
          ${fileTreeExtensionOptions(entries).map((option) => {
            const checked = !state.excludedExtensions.has(option.extension);
            return `
              <button
                class="file-tree-filter-option"
                type="button"
                role="menuitemcheckbox"
                aria-checked="${checked}"
                data-file-tree-extension="${escapeHtml(option.extension)}"
                title="${escapeHtml(option.label)}"
              >
                <span class="file-tree-filter-check">${fileTreeFilterCheckHtml(checked)}</span>
                <span class="file-tree-filter-copy">${escapeHtml(option.label)}</span>
                <span class="Counter Counter--secondary">${option.count.toLocaleString()}</span>
              </button>`;
          }).join("")}
        </div>
        <div class="file-tree-filter-categories" role="group" aria-label="File visibility">
          <button
            class="file-tree-filter-option"
            type="button"
            role="menuitemcheckbox"
            aria-checked="${state.onlyManifestFiles}"
            data-file-tree-category="manifest"
          >
            <span class="file-tree-filter-check">${fileTreeFilterCheckHtml(state.onlyManifestFiles)}</span>
            <span class="file-tree-filter-copy">Only manifest files</span>
          </button>
          <button
            class="file-tree-filter-option"
            type="button"
            role="menuitemcheckbox"
            aria-checked="${state.includeVendoredFiles}"
            data-file-tree-category="vendored"
          >
            <span class="file-tree-filter-check">${fileTreeFilterCheckHtml(state.includeVendoredFiles)}</span>
            <span class="file-tree-filter-copy">Vendored files</span>
          </button>
          <button
            class="file-tree-filter-option"
            type="button"
            role="menuitemcheckbox"
            aria-checked="${state.includeViewedFiles}"
            data-file-tree-category="viewed"
          >
            <span class="file-tree-filter-check">${fileTreeFilterCheckHtml(state.includeViewedFiles)}</span>
            <span class="file-tree-filter-copy">Viewed files</span>
          </button>
        </div>
      </div>
    </div>`;
}

function syncFileTreeFilterUi() {
  const state = currentArtifact?.fileTree;
  if (!state) return;
  const root = document.getElementById("file-tree-filter-root");
  const trigger = root?.querySelector("[data-toggle-file-tree-filter]");
  const menu = document.getElementById("file-tree-filter-menu");
  root?.classList.toggle("is-open", state.filterMenuOpen);
  trigger?.classList.toggle("is-filtered", fileTreeFiltersActive(state));
  trigger?.setAttribute("aria-expanded", String(state.filterMenuOpen));
  if (menu) menu.hidden = !state.filterMenuOpen;
  for (const option of root?.querySelectorAll("[data-file-tree-extension]") ?? []) {
    const checked = !state.excludedExtensions.has(option.dataset.fileTreeExtension);
    option.setAttribute("aria-checked", String(checked));
    option.querySelector(".file-tree-filter-check").innerHTML =
      fileTreeFilterCheckHtml(checked);
  }
  for (const option of root?.querySelectorAll("[data-file-tree-category]") ?? []) {
    const checked =
      option.dataset.fileTreeCategory === "manifest"
        ? state.onlyManifestFiles
        : option.dataset.fileTreeCategory === "vendored"
          ? state.includeVendoredFiles
          : state.includeViewedFiles;
    option.setAttribute("aria-checked", String(checked));
    option.querySelector(".file-tree-filter-check").innerHTML =
      fileTreeFilterCheckHtml(checked);
  }
}

function entryMatchesFileTreeFilters(entry, filter) {
  const state = currentArtifact.fileTree;
  if (filter && !entry.path.toLocaleLowerCase().includes(filter)) return false;
  if (state.excludedExtensions.has(artifactFileExtension(entry))) return false;
  if (state.onlyManifestFiles && !isManifestArtifactEntry(entry)) return false;
  if (!state.includeVendoredFiles && isVendoredArtifactEntry(entry)) return false;
  if (!state.includeViewedFiles && state.viewedPaths.has(entry.path)) return false;
  return true;
}

function buildArtifactFileTree(entries) {
  const root = { directories: new Map(), files: [], name: "", path: "" };
  for (const entry of entries) {
    const parts = String(entry.path ?? "").split("/").filter(Boolean);
    if (!parts.length) continue;
    let directory = root;
    for (let index = 0; index < parts.length - 1; index++) {
      const name = parts[index];
      const path = parts.slice(0, index + 1).join("/");
      if (!directory.directories.has(name)) {
        directory.directories.set(name, {
          directories: new Map(),
          files: [],
          name,
          path,
        });
      }
      directory = directory.directories.get(name);
    }
    directory.files.push(entry);
  }
  return root;
}

function compactArtifactFileTreeDirectory(directory) {
  let current = directory;
  let name = directory.name;
  while (current.files.length === 0 && current.directories.size === 1) {
    const child = current.directories.values().next().value;
    name = `${name}/${child.name}`;
    current = child;
  }
  return {
    directory: current,
    name,
    path: current.path,
  };
}

function renderArtifactFileTree(directory, selectedPath, state, expandMatches, depth = 0) {
  const directories = [...directory.directories.values()].sort((left, right) =>
    FILE_PATH_COLLATOR.compare(left.name, right.name));
  const files = [...directory.files].sort((left, right) =>
    FILE_PATH_COLLATOR.compare(left.name, right.name) ||
    FILE_PATH_COLLATOR.compare(left.path, right.path));
  return [
    ...directories.map((child) => {
      const compacted = compactArtifactFileTreeDirectory(child);
      const expanded =
        expandMatches || state.expandedDirectories.has(compacted.path);
      return `
        <li class="file-tree-item">
          <button
            class="file-tree-row file-tree-directory"
            type="button"
            data-file-directory="${escapeHtml(compacted.path)}"
            aria-expanded="${expanded}"
            title="${escapeHtml(compacted.path)}"
            style="--file-tree-depth:${depth}"
          >
            ${icon(expanded ? "chevron-down" : "chevron-right", "file-tree-chevron")}
            ${icon("file-directory", "file-tree-folder")}
            <span class="file-tree-name">${escapeHtml(compacted.name)}</span>
          </button>
          ${expanded
            ? `<ul class="file-tree-group" aria-label="${escapeHtml(compacted.name)}">${renderArtifactFileTree(compacted.directory, selectedPath, state, expandMatches, depth + 1)}</ul>`
            : ""}
        </li>`;
    }),
    ...files.map((entry) => `
      <li class="file-tree-item">
        <button
          type="button"
          class="file-tree-row file-tree-file"
          data-artifact-file="${escapeHtml(entry.path)}"
          aria-current="${entry.path === selectedPath ? "true" : "false"}"
          title="${escapeHtml(entry.path)}"
          style="--file-tree-depth:${depth}"
        >
          <span class="file-tree-spacer" aria-hidden="true"></span>
          ${icon(fileIconName(artifactEntryKind(entry)), "file-tree-file-icon")}
          <span class="file-tree-name">${escapeHtml(entry.name)}</span>
          <span class="file-tree-size">${formatBytes(entry.size)}</span>
        </button>
      </li>`),
  ].join("");
}

function renderFileRows(entries, selectedPath, filter = "") {
  const normalizedFilter = filter.trim().toLocaleLowerCase();
  const matches = entries
    .filter((entry) => entryMatchesFileTreeFilters(entry, normalizedFilter))
    .sort((left, right) => FILE_PATH_COLLATOR.compare(left.path, right.path));
  let visible = matches.slice(0, MAX_VISIBLE_ARTIFACT_FILES);
  const selectedIndex = matches.findIndex((entry) => entry.path === selectedPath);
  if (selectedIndex >= MAX_VISIBLE_ARTIFACT_FILES) {
    visible = [
      ...visible.slice(0, MAX_VISIBLE_ARTIFACT_FILES - 1),
      matches[selectedIndex],
    ].sort((left, right) => FILE_PATH_COLLATOR.compare(left.path, right.path));
  }
  const list = document.getElementById("file-list");
  if (!list) return;
  const state = currentArtifact.fileTree;
  const expandMatches = Boolean(normalizedFilter) || fileTreeFiltersActive(state);
  list.innerHTML = visible.length
    ? renderArtifactFileTree(
        buildArtifactFileTree(visible),
        selectedPath,
        state,
        expandMatches,
      )
    : `<li class="p-3 color-fg-muted">No files match these filters.</li>`;
  const summary = document.getElementById("file-list-summary");
  if (summary) {
    summary.textContent =
      matches.length > visible.length
        ? `Showing ${visible.length.toLocaleString()} of ${matches.length.toLocaleString()} files`
        : `${matches.length.toLocaleString()} file${matches.length === 1 ? "" : "s"}`;
  }
}

function encodedEntryUrl(artifactId, entryPath, download = false) {
  const encodedPath = String(entryPath)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `/content/${artifactId}/${encodedPath}${download ? "?download=1" : ""}`;
}

function disposePlayer() {
  if (currentPlayer?.dispose) {
    try {
      currentPlayer.dispose();
    } catch {
      // The player may already have disposed itself during navigation.
    }
  }
  currentPlayer = null;
  currentPlayerIsPlaying = false;
}

const PLAYER_FONT_FAMILIES = {
  system: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  cascadia: '"Cascadia Mono", "Cascadia Code", Consolas, monospace',
  consolas: 'Consolas, "Liberation Mono", monospace',
};

const PLAYER_SETTING_OPTIONS = {
  fontSize: ["12px", "14px", "16px", "18px", "20px", "22px"],
  fontFamily: [
    { value: "system", label: "System" },
    { value: "cascadia", label: "Cascadia" },
    { value: "consolas", label: "Consolas" },
  ],
  lineHeight: [
    { value: 1, label: "Tight" },
    { value: 1.2, label: "Normal" },
    { value: 1.4, label: "Relaxed" },
    { value: 1.6, label: "Spacious" },
  ],
  speed: [
    { value: 0.5, label: "0.5x" },
    { value: 1, label: "1x" },
    { value: 1.5, label: "1.5x" },
    { value: 2, label: "2x" },
  ],
};

function playerPreferences() {
  bootstrapState.prefs.player ??= {
    fontSize: "16px",
    fontFamily: "system",
    lineHeight: 1.2,
    speed: 1,
  };
  return bootstrapState.prefs.player;
}

function playerSegmentedControl(name, label, values, current) {
  return `
    <div class="player-control-group" role="group" aria-label="${escapeHtml(label)}">
      <span class="player-control-label">${escapeHtml(label)}</span>
      <span class="player-segmented">
        ${values
          .map(
            ({ value, label: optionLabel }) => `
              <button
                class="player-segment"
                type="button"
                data-player-setting="${escapeHtml(name)}"
                data-player-value="${escapeHtml(value)}"
                aria-pressed="${String(current) === String(value)}"
              >${escapeHtml(optionLabel)}</button>`,
          )
          .join("")}
      </span>
    </div>`;
}

function playerTextSizeControl(current) {
  const values = PLAYER_SETTING_OPTIONS.fontSize;
  const index = Math.max(0, values.indexOf(current));
  return `
    <div class="player-control-group player-text-size" role="group" aria-label="Text size">
      <span class="player-control-label">Text size</span>
      <span class="player-stepper">
        <button class="player-step" type="button" data-player-step="-1" aria-label="Decrease text size"${index === 0 ? " disabled" : ""}>A-</button>
        <output id="player-font-size-value" class="player-step-value">${escapeHtml(current.replace("px", " px"))}</output>
        <button class="player-step" type="button" data-player-step="1" aria-label="Increase text size"${index === values.length - 1 ? " disabled" : ""}>A+</button>
      </span>
    </div>`;
}

function syncPlayerPreferenceControls() {
  const preferences = playerPreferences();
  for (const control of document.querySelectorAll("[data-player-setting][data-player-value]")) {
    control.setAttribute(
      "aria-pressed",
      String(String(preferences[control.dataset.playerSetting]) === control.dataset.playerValue),
    );
  }
  const fontSizeValue = document.getElementById("player-font-size-value");
  if (fontSizeValue) {
    fontSizeValue.textContent = preferences.fontSize.replace("px", " px");
  }
  const fontSizeIndex = PLAYER_SETTING_OPTIONS.fontSize.indexOf(preferences.fontSize);
  for (const step of document.querySelectorAll("[data-player-step]")) {
    const direction = Number(step.dataset.playerStep);
    step.disabled =
      (direction < 0 && fontSizeIndex <= 0) ||
      (direction > 0 && fontSizeIndex >= PLAYER_SETTING_OPTIONS.fontSize.length - 1);
  }
}

function mountAsciinemaPlayer(entry, preservePlayback = false) {
  const artifact = currentArtifact;
  const host = document.getElementById("asciinema-host");
  if (!artifact || !host || !window.AsciinemaPlayer?.create) {
    throw new Error("The asciinema player did not load.");
  }
  const playbackTime =
    preservePlayback && currentPlayer?.getCurrentTime
      ? Number(currentPlayer.getCurrentTime()) || 0
      : 0;
  const resumePlayback = preservePlayback && currentPlayerIsPlaying;
  disposePlayer();
  host.replaceChildren();
  const preferences = playerPreferences();
  const player = window.AsciinemaPlayer.create(
    encodedEntryUrl(artifact.id, entry.path),
    host,
    {
      autoplay: false,
      controls: true,
      fit: false,
      idleTimeLimit: 2,
      preload: true,
      speed: Number(preferences.speed),
      terminalFontFamily:
        PLAYER_FONT_FAMILIES[preferences.fontFamily] ?? PLAYER_FONT_FAMILIES.system,
      terminalFontSize: preferences.fontSize,
      terminalLineHeight: Number(preferences.lineHeight),
    },
  );
  currentPlayer = player;
  player.addEventListener?.("play", () => {
    if (currentPlayer === player) currentPlayerIsPlaying = true;
  });
  player.addEventListener?.("playing", () => {
    if (currentPlayer === player) currentPlayerIsPlaying = true;
  });
  player.addEventListener?.("pause", () => {
    if (currentPlayer === player) currentPlayerIsPlaying = false;
  });
  player.addEventListener?.("ended", () => {
    if (currentPlayer === player) currentPlayerIsPlaying = false;
  });

  if (preservePlayback) {
    const restorePosition =
      playbackTime > 0 && player.seek ? player.seek(playbackTime) : Promise.resolve();
    void Promise.resolve(restorePosition)
      .then(() => {
        if (resumePlayback && currentPlayer === player) return player.play();
        return null;
      })
      .catch((error) => {
        if (currentPlayer === player) {
          showToast(
            `Playback position could not be restored: ${error instanceof Error ? error.message : String(error)}`,
            "error",
          );
        }
      });
  }
}

function renderAsciinemaPreview(entry, preview) {
  const preferences = playerPreferences();
  preview.innerHTML = `
    <div class="asciinema-preview">
      <div id="asciinema-host" class="asciinema-host"></div>
      <div class="player-control-bar" aria-label="Recording playback and display settings">
        ${playerTextSizeControl(preferences.fontSize)}
        ${playerSegmentedControl(
          "fontFamily",
          "Font",
          PLAYER_SETTING_OPTIONS.fontFamily,
          preferences.fontFamily,
        )}
        ${playerSegmentedControl(
          "lineHeight",
          "Line height",
          PLAYER_SETTING_OPTIONS.lineHeight,
          preferences.lineHeight,
        )}
        ${playerSegmentedControl(
          "speed",
          "Speed",
          PLAYER_SETTING_OPTIONS.speed,
          preferences.speed,
        )}
      </div>
    </div>`;
  mountAsciinemaPlayer(entry);
}

async function updatePlayerPreference(key, value) {
  if (!["fontSize", "fontFamily", "lineHeight", "speed"].includes(key)) return;
  const numeric = key === "lineHeight" || key === "speed";
  const nextValue = numeric ? Number(value) : String(value);
  const allowed = PLAYER_SETTING_OPTIONS[key].some((option) =>
    String(typeof option === "object" ? option.value : option) === String(nextValue));
  if (!allowed) return;
  const previous = { ...playerPreferences() };
  bootstrapState.prefs.player = {
    ...previous,
    [key]: nextValue,
  };
  syncPlayerPreferenceControls();
  const entry = currentArtifact?.analysis.entries.find(
    (item) => item.path === currentArtifact.selectedPath,
  );
  try {
    if (entry?.kind === "asciinema") mountAsciinemaPlayer(entry, true);
    bootstrapState.prefs = await api("/api/preferences", {
      method: "POST",
      body: { player: bootstrapState.prefs.player },
    });
    syncPlayerPreferenceControls();
  } catch (error) {
    bootstrapState.prefs.player = previous;
    syncPlayerPreferenceControls();
    let restoreError = null;
    if (entry?.kind === "asciinema") {
      try {
        mountAsciinemaPlayer(entry, true);
      } catch (playerError) {
        restoreError = playerError;
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    showToast(
      restoreError
        ? `${message}. Restoring the player also failed: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`
        : message,
      "error",
    );
  }
}

function stepPlayerTextSize(direction) {
  const values = PLAYER_SETTING_OPTIONS.fontSize;
  const currentIndex = values.indexOf(playerPreferences().fontSize);
  const nextIndex = Math.min(
    values.length - 1,
    Math.max(0, currentIndex + Number(direction)),
  );
  if (nextIndex !== currentIndex) {
    void updatePlayerPreference("fontSize", values[nextIndex]);
  }
}

async function previewArtifactFile(entry, sequence) {
  disposePlayer();
  const artifact = currentArtifact;
  if (!artifact || sequence !== renderSequence) return;
  const preview = document.getElementById("preview-content");
  const previewPath = document.getElementById("preview-path");
  const downloadLink = document.getElementById("preview-download");
  if (!preview || !previewPath || !downloadLink) return;

  previewPath.textContent = entry.path;
  downloadLink.href = encodedEntryUrl(artifact.id, entry.path, true);
  downloadLink.hidden = false;
  preview.innerHTML = `
    <div class="loading-list w-100">
      <div class="skeleton-row"><span class="skeleton"></span><span class="skeleton"></span><span class="skeleton"></span></div>
    </div>`;

  try {
    const entryKind = artifactEntryKind(entry);
    if (
      entryKind === "html" &&
      shouldUseStaticSitePreview(entry, artifact.analysis.entries)
    ) {
      const theme = resolvedCanvasTheme();
      const result = await api(
        `/api/artifacts/${artifact.id}/preview-url?path=${encodeURIComponent(entry.path)}&theme=${theme}`,
      );
      if (sequence !== renderSequence || currentArtifact?.selectedPath !== entry.path) return;
      // The preview uses a dedicated loopback origin, so storage access remains isolated from the canvas.
      preview.innerHTML = `
        <iframe
          class="preview-frame"
          data-theme-aware-preview
          src="${escapeHtml(result.url)}"
          title="${escapeHtml(entry.path)}"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads"
          referrerpolicy="no-referrer"
        ></iframe>`;
      const frame = preview.querySelector("iframe[data-theme-aware-preview]");
      if (frame) {
        frame.style.colorScheme = theme;
        frame.addEventListener("load", syncPreviewTheme);
      }
      return;
    }

    if (entryKind === "asciinema") {
      renderAsciinemaPreview(entry, preview);
      return;
    }

    if (entryKind === "image") {
      preview.innerHTML = `<img class="preview-image" src="${encodedEntryUrl(artifact.id, entry.path)}" alt="${escapeHtml(entry.path)}" />`;
      return;
    }

    if (entryKind === "pdf") {
      preview.innerHTML = `
        <iframe
          class="preview-frame"
          src="${encodedEntryUrl(artifact.id, entry.path)}"
          title="${escapeHtml(entry.path)}"
          sandbox
          referrerpolicy="no-referrer"
        ></iframe>`;
      return;
    }

    if (["json", "markdown", "text", "trx", "xml"].includes(entryKind)) {
      const result = await api(
        `/api/artifacts/${artifact.id}/text?path=${encodeURIComponent(entry.path)}`,
      );
      if (sequence !== renderSequence || currentArtifact?.selectedPath !== entry.path) return;
      if (entryKind === "trx") {
        TrxPreview.render(result.content, preview, { highlightXml });
        return;
      }
      let content = result.content;
      if (entryKind === "json") {
        try {
          content = JSON.stringify(JSON.parse(content), null, 2);
        } catch {
          // Preserve malformed JSON as source text.
        }
      }
      preview.innerHTML = entryKind === "xml"
        ? `<pre class="text-preview syntax-code syntax-xml"><code>${highlightXml(content)}</code></pre>`
        : entryKind === "json"
          ? `<pre class="text-preview syntax-code syntax-json"><code>${highlightJson(content)}</code></pre>`
          : `<pre class="text-preview">${escapeHtml(content)}</pre>`;
      return;
    }

    preview.innerHTML = `
      <div class="preview-empty">
        <div class="preview-empty-inner">
          ${icon(fileIconName(entryKind))}
          <h2 class="h4 mb-2">No inline preview</h2>
          <p class="mb-3">Download this ${escapeHtml(entryKind)} file to inspect it locally.</p>
          <a class="app-button" href="${encodedEntryUrl(artifact.id, entry.path, true)}">${icon("download")} Download</a>
        </div>
      </div>`;
  } catch (error) {
    preview.innerHTML = `
      <div class="flash flash-error w-100">
        <strong>Preview failed</strong>
        <div class="mt-1">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>
      </div>`;
  }
}

function artifactBreadcrumbItems(artifact, selectedPath) {
  const items = [
    {
      label: artifact.repository,
      href: pullsHashForRepository(artifact.repository),
    },
    {
      label: "Pull requests",
      href: pullsHashForRepository(artifact.repository),
    },
  ];
  if (artifact.pullNumber > 0) {
    items.push({
      label: `#${artifact.pullNumber}`,
      href: pullHash(artifact.repository, artifact.pullNumber),
    });
  }
  items.push({
    label: artifact.metadata.artifact.name,
  });
  if (selectedPath) {
    items.push({
      label: selectedPath,
      compactLabel: selectedPath.split("/").filter(Boolean).at(-1) ?? selectedPath,
    });
  }
  return items;
}

function preferRootIndexSite(analysis) {
  const rootIndex = rootIndexHtmlEntry(analysis.entries);
  if (!rootIndex) {
    return ["html", "static-site"].includes(analysis.primary?.kind)
      ? { ...analysis, primary: null }
      : analysis;
  }
  return {
    ...analysis,
    primary: {
      kind: "static-site",
      path: rootIndex.path,
      root: "",
      label: "Static HTML site",
    },
  };
}

async function selectArtifactFile(path, updateHash = true) {
  if (!currentArtifact) return;
  const entry = currentArtifact.analysis.entries.find((item) => item.path === path);
  if (!entry) {
    showToast("The selected file is no longer present.", "error");
    return;
  }
  currentArtifact.selectedPath = path;
  currentArtifact.fileTree.viewedPaths.add(path);
  for (const directory of directoryPathsForFile(path)) {
    currentArtifact.fileTree.expandedDirectories.add(directory);
  }
  renderFileRows(
    currentArtifact.analysis.entries,
    path,
    document.getElementById("file-filter")?.value ?? "",
  );
  setBreadcrumbs(artifactBreadcrumbItems(currentArtifact, path));
  if (updateHash) {
    history.replaceState(
      null,
      "",
      artifactHash(
        currentArtifact.repository,
        currentArtifact.pullNumber,
        currentArtifact.id,
        path,
      ),
    );
  }
  await previewArtifactFile(entry, renderSequence);
}

function updateSidebarUi(collapsed) {
  const explorer = document.getElementById("artifact-explorer");
  const button = document.querySelector("[data-toggle-sidebar]");
  if (!explorer || !button) return;
  explorer.classList.toggle("is-sidebar-collapsed", collapsed);
  button.innerHTML = icon(collapsed ? "sidebar-expand" : "sidebar-collapse");
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute(
    "aria-label",
    collapsed ? "Show artifact file sidebar" : "Hide artifact file sidebar",
  );
  button.title = collapsed ? "Show file sidebar" : "Hide file sidebar";
}

async function toggleSidebar() {
  bootstrapState.prefs.explorer ??= { sidebarCollapsed: false };
  const previous = bootstrapState.prefs.explorer.sidebarCollapsed === true;
  const collapsed = !previous;
  bootstrapState.prefs.explorer.sidebarCollapsed = collapsed;
  updateSidebarUi(collapsed);
  try {
    bootstrapState.prefs = await api("/api/preferences", {
      method: "POST",
      body: { explorer: { sidebarCollapsed: collapsed } },
    });
  } catch (error) {
    bootstrapState.prefs.explorer.sidebarCollapsed = previous;
    updateSidebarUi(previous);
    showToast(error instanceof Error ? error.message : String(error), "error");
  }
}

async function renderArtifact(route, sequence) {
  const requestedRepository = normalizeRepository(route.repository);
  const metadata = await api(`/api/artifacts/${route.artifactId}`);
  if (sequence !== renderSequence) return;
  const repository = normalizeRepository(metadata.repository ?? requestedRepository);
  repositoryInput.value = rememberRepositoryClient(repository);
  const analysis = preferRootIndexSite(metadata.analysis);
  const preferredPath =
    route.filePath &&
    analysis.entries.some((entry) => entry.path === route.filePath)
      ? route.filePath
      : analysis.primary?.path ??
        analysis.entries.find((entry) => artifactEntryKind(entry) !== "html")?.path ??
        analysis.entries[0]?.path ??
        null;

  currentArtifact = {
    id: Number(route.artifactId),
    repository,
    pullNumber: Number(route.pullNumber) || 0,
    metadata,
    analysis,
    fileTree: createArtifactFileTreeState(analysis.entries, preferredPath),
    selectedPath: preferredPath,
  };
  setBreadcrumbs(artifactBreadcrumbItems(currentArtifact, preferredPath));
  const primary = analysis.primary;

  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title repo-heading">
          ${icon("package")}
          <strong>${escapeHtml(metadata.artifact.name)}</strong>
        </h1>
        <p class="page-subtitle">
          ${primary ? escapeHtml(primary.label) : "Artifact files"}
          <span class="Label ml-2">ZIP-backed</span>
        </p>
      </div>
      <div class="page-actions">
        <button class="app-button app-button-danger" type="button" data-delete-artifact="${route.artifactId}">
          ${icon("trash")} Delete download
        </button>
      </div>
    </div>
    <div class="artifact-summary mb-3">
      <span class="artifact-summary-item">${icon("archive")} ${formatBytes(metadata.compressedBytes)} downloaded</span>
      <span class="artifact-summary-item">${icon("file")} ${analysis.fileCount.toLocaleString()} files</span>
      <span class="artifact-summary-item">${icon("package")} ${formatBytes(analysis.totalUncompressedBytes)} expanded size</span>
      <span class="artifact-summary-item">${icon("clock")} Cached ${escapeHtml(relativeTime(metadata.downloadedAt))}</span>
    </div>
    <section id="artifact-explorer" class="explorer${bootstrapState.prefs.explorer?.sidebarCollapsed ? " is-sidebar-collapsed" : ""}" aria-label="Artifact explorer">
      <aside class="file-panel">
        <div class="file-panel-header">
          <div class="file-filter-toolbar">
            <div class="file-filter-wrap">
              ${icon("search", "file-filter-icon")}
              <label class="sr-only" for="file-filter">Filter artifact files</label>
              <input id="file-filter" class="form-control file-filter" type="search" placeholder="Filter files..." autocomplete="off" />
            </div>
            ${fileTreeFilterControlHtml(analysis.entries)}
          </div>
          <div id="file-list-summary" class="color-fg-muted f6 mt-2"></div>
        </div>
        <ul id="file-list" class="file-list" aria-label="Artifact files"></ul>
      </aside>
      <div class="preview-panel">
        <div class="preview-toolbar">
          <button
            class="app-button app-button-invisible app-button-small app-button-icon-only"
            type="button"
            data-toggle-sidebar
            aria-label="${bootstrapState.prefs.explorer?.sidebarCollapsed ? "Show" : "Hide"} artifact file sidebar"
            aria-expanded="${bootstrapState.prefs.explorer?.sidebarCollapsed ? "false" : "true"}"
            title="${bootstrapState.prefs.explorer?.sidebarCollapsed ? "Show" : "Hide"} file sidebar"
          >${icon(bootstrapState.prefs.explorer?.sidebarCollapsed ? "sidebar-expand" : "sidebar-collapse")}</button>
          ${icon("eye")}
          <span id="preview-path" class="preview-path">${preferredPath ? escapeHtml(preferredPath) : "Select a file"}</span>
          <a id="preview-download" class="app-button app-button-small" href="#" hidden>${icon("download")} Download</a>
        </div>
        <div id="preview-content" class="preview-content">
          <div class="preview-empty">
            <div class="preview-empty-inner">
              ${icon("file")}
              <h2 class="h4 mb-2">Select a file</h2>
              <p>Choose an artifact file to preview it.</p>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  renderFileRows(analysis.entries, preferredPath);
  if (preferredPath) await selectArtifactFile(preferredPath, false);
}

async function renderCache(sequence) {
  const repository = String(bootstrapState?.prefs?.repository ?? "");
  const pullNumber = Number(bootstrapState?.prefs?.pullNumber);
  const pullsHref = pullsHashForRepository(repository);
  const hasPull = Number.isSafeInteger(pullNumber) && pullNumber > 0;
  const returnHref = hasPull
    ? pullHash(repository, pullNumber)
    : pullsHref;
  const returnLabel = hasPull
    ? `Back to #${pullNumber}`
    : "Back to pull requests";
  setBreadcrumbs([
    { label: repository, href: pullsHref },
    { label: "Pull requests", href: pullsHref },
    ...(hasPull ? [{ label: `#${pullNumber}`, href: returnHref }] : []),
    { label: "Artifact cache" },
  ]);
  loadingView();
  const cache = await api("/api/cache");
  if (sequence !== renderSequence) return;
  updateCacheHeader(cache);

  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title repo-heading">${icon("package")} <strong>Artifact cache</strong></h1>
        <p class="page-subtitle">Downloaded ZIP files are stored without extraction.</p>
      </div>
      <div class="page-actions">
        <a class="app-button" href="${escapeHtml(returnHref)}">
          ${icon("chevron-left")} ${escapeHtml(returnLabel)}
        </a>
        <button class="app-button app-button-danger" type="button" data-clear-cache${cache.count ? "" : " disabled"}>
          ${icon("trash")} Clear all
        </button>
      </div>
    </div>
    <section class="Box" aria-label="Cached artifacts">
      <div class="Box-header toolbar">
        <h2 class="Box-title">${cache.count} cached artifact${cache.count === 1 ? "" : "s"}</h2>
        <span class="toolbar-spacer"></span>
        <span class="cache-stats">${formatBytes(cache.totalBytes)}</span>
      </div>
      ${
        cache.artifacts.length
          ? cache.artifacts.map((item) => `
              <div class="Box-row cached-artifact-row is-clickable">
                <a class="artifact-row-overlay" href="${artifactHash(item.repository, 0, item.id)}" aria-label="Open ${escapeHtml(item.name)}"></a>
                ${icon("package", "artifact-icon")}
                <div class="Box-row-main">
                  <span class="Box-row-title">${escapeHtml(item.name)}</span>
                  ${item.primary?.label ? `<span class="Label ml-2">${escapeHtml(item.primary.label)}</span>` : ""}
                  <div class="Box-row-meta">
                    ${escapeHtml(item.repository)}. ${formatBytes(item.bytes)}. Last opened ${escapeHtml(relativeTime(item.lastAccessedAt))}.
                  </div>
                </div>
                <div class="Box-row-actions">
                  <button class="app-button app-button-small app-button-danger" type="button" data-delete-artifact="${item.id}">${icon("trash")} Delete</button>
                </div>
              </div>`).join("")
          : `<div class="blankslate">
              ${icon("archive")}
              <h2>No downloaded artifacts</h2>
              <p>Inspect an artifact from a pull request to add it here.</p>
              <div class="blankslate-actions">
                <a class="app-button" href="${escapeHtml(returnHref)}">
                  ${icon("chevron-left")} ${escapeHtml(returnLabel)}
                </a>
              </div>
            </div>`
      }
    </section>
    ${
      cache.errors?.length
        ? `<div class="flash flash-warn mt-3">${escapeHtml(cache.errors.map((item) => item.message).join(" "))}</div>`
        : ""
    }`;
}

function accountAccess(account) {
  if (account.status === "failed") {
    return { label: "Credential failed", className: "failed", icon: "x-circle" };
  }
  if (account.repositoryAccess === false) {
    return { label: "Limited access", className: "limited", icon: "x-circle" };
  }
  return { label: "Repository access", className: "available", icon: "check-circle" };
}

function accountAvatarHtml(account) {
  return account.avatarUrl
    ? `<img class="account-card-avatar" src="${escapeHtml(account.avatarUrl)}" alt="" />`
    : `<span class="account-card-avatar account-card-avatar-fallback">${icon("person")}</span>`;
}

function accountCardHtml(account, activeId, repository) {
  const active = account.id === activeId;
  const access = accountAccess(account);
  const scopes = account.scopes?.length
    ? account.scopes.map((scope) => `<code>${escapeHtml(scope)}</code>`).join(" ")
    : '<span class="color-fg-muted">No OAuth scopes reported</span>';
  const sources = (account.sources ?? [])
    .map(
      (source) => `
        <div class="credential-source">
          <span class="credential-source-icon">${icon(
            source.status === "failed" ? "x-circle" : "check-circle",
          )}</span>
          <span class="credential-source-copy">
            <span class="credential-source-name">
              ${escapeHtml(source.label)}
              ${source.chosen ? '<span class="Label">In use</span>' : ""}
            </span>
            <span class="credential-source-meta">
              ${source.repositoryAccess === false ? "No access to this repository" : "Available"}
              ${source.scopes?.length ? ` - ${escapeHtml(source.scopes.join(", "))}` : ""}
            </span>
            ${source.reason ? `<span class="credential-source-error">${escapeHtml(source.reason)}</span>` : ""}
          </span>
        </div>`,
    )
    .join("");
  return `
    <article class="account-card${active ? " is-active" : ""}">
      <button
        class="account-card-main"
        type="button"
        data-select-account="${escapeHtml(account.id)}"
        aria-pressed="${active}"
        ${active || account.status === "failed" ? "disabled" : ""}
      >
        ${accountAvatarHtml(account)}
        <span class="account-card-identity">
          <span class="account-card-title">
            <strong>${escapeHtml(account.name || account.login)}</strong>
            ${active ? '<span class="Label Label--success">Active</span>' : ""}
          </span>
          <span class="account-card-login">@${escapeHtml(account.login)}</span>
          ${account.company ? `<span class="account-card-company">${escapeHtml(account.company)}</span>` : ""}
        </span>
        <span class="account-access ${access.className}">
          ${icon(access.icon)}
          ${escapeHtml(access.label)}
        </span>
      </button>
      <div class="account-card-footer">
        <span class="account-scope-list">${scopes}</span>
        ${
          account.profileUrl
            ? `<a class="app-button app-button-small" href="${escapeHtml(account.profileUrl)}" target="_blank" rel="noreferrer">${icon("link-external")} View profile</a>`
            : ""
        }
      </div>
      <details class="account-sources">
        <summary>
          <span>${(account.sources?.length ?? 0).toLocaleString()} credential source${account.sources?.length === 1 ? "" : "s"} for ${escapeHtml(repository)}</span>
          ${icon("chevron-down", "account-sources-chevron")}
        </summary>
        <div class="credential-source-list">${sources}</div>
      </details>
    </article>`;
}

async function renderAccountsPage(sequence) {
  const repository = bootstrapState.prefs.repository;
  setBreadcrumbs([{ label: "GitHub accounts" }]);
  accountButton.classList.add("is-active");
  loadingView();
  const payload = await api(`/api/accounts?repo=${encodeURIComponent(repository)}`);
  if (sequence !== renderSequence) return;
  updateAccountFromPayload(payload);
  const accounts = bootstrapState.accounts ?? [];
  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title repo-heading">${icon("person")} <strong>GitHub accounts</strong></h1>
        <p class="page-subtitle">Credentials inherited from the Copilot app and GitHub CLI.</p>
      </div>
      <div class="page-actions">
        <button class="app-button" type="button" data-refresh-accounts>${icon("sync")} Rescan accounts</button>
      </div>
    </div>
    <div class="flash account-repository-context">
      Account access is checked against <strong>${escapeHtml(repository)}</strong>.
    </div>
    <section class="account-list" aria-label="Available GitHub accounts">
      ${
        accounts.length
          ? accounts
              .map((account) =>
                accountCardHtml(account, bootstrapState.account?.id, repository),
              )
              .join("")
          : `<div class="blankslate">
              ${icon("person")}
              <h2>No GitHub accounts detected</h2>
              <p>Sign in through the Copilot app or GitHub CLI, then rescan.</p>
            </div>`
      }
    </section>`;
}

async function refreshAccounts(button) {
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `${icon("sync", "spin")} Rescanning...`;
  try {
    const payload = await api(
      `/api/accounts?repo=${encodeURIComponent(bootstrapState.prefs.repository)}`,
    );
    clearPullPayloadCache();
    updateAccountFromPayload(payload);
    await renderRoute();
    showToast("GitHub accounts rescanned.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), "error");
    button.disabled = false;
    button.innerHTML = original;
  }
}

async function selectAccount(accountId, button) {
  button.disabled = true;
  try {
    const payload = await api("/api/account", {
      method: "POST",
      body: {
        id: accountId,
        repository: bootstrapState.prefs.repository,
      },
    });
    clearPullPayloadCache();
    updateAccountFromPayload(payload);
    await renderRoute();
    showToast(`Using @${payload.account?.login ?? "selected account"}.`);
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), "error");
    button.disabled = false;
  }
}

async function renderRoute({ force = false } = {}) {
  disposePlayer();
  currentArtifact = null;
  currentPullContext = null;
  const sequence = ++renderSequence;
  const route = parseRoute();
  accountButton.classList.toggle("is-active", route.name === "accounts");
  try {
    if (route.name === "pulls") await renderPulls(route, sequence, { force });
    else if (route.name === "pull") await renderPull(route, sequence, { force });
    else if (route.name === "artifact") {
      setBreadcrumbs([
        { label: route.repository, href: pullsHashForRepository(route.repository) },
        { label: "Pull requests", href: pullsHashForRepository(route.repository) },
        { label: "Artifact" },
      ]);
      loadingView();
      await renderArtifact(route, sequence);
    } else if (route.name === "cache") await renderCache(sequence);
    else if (route.name === "accounts") await renderAccountsPage(sequence);
  } catch (error) {
    if (sequence === renderSequence) renderError(error);
  }
}

function repositoryTargetFromInput(value) {
  const input = String(value ?? "").trim();
  let match = input.match(
    /^https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)(?:[/?#].*)?$/i,
  );
  if (match) {
    return {
      repository: `${match[1]}/${match[2]}`,
      pullNumber: Number(match[3]),
    };
  }
  match = input.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)#(\d+)$/);
  if (match) {
    return {
      repository: match[1],
      pullNumber: Number(match[2]),
    };
  }
  return { repository: normalizeRepository(input), pullNumber: null };
}

function routeFromInput(value) {
  const target = repositoryTargetFromInput(value);
  return target.pullNumber
    ? pullHash(target.repository, target.pullNumber)
    : pullsHashForRepository(target.repository);
}

async function navigateToRepository(value) {
  const target = repositoryTargetFromInput(value);
  const searchIcon = repositoryCombobox.querySelector(".repository-search-icon");
  repositoryInput.readOnly = true;
  repositoryMenuButton.disabled = true;
  searchIcon?.classList.replace("icon-search", "icon-sync");
  searchIcon?.classList.add("spin");
  repositoryInput.setAttribute("aria-busy", "true");
  repositoryInput.removeAttribute("aria-invalid");
  try {
    const payload = await api("/api/repositories/validate", {
      method: "POST",
      body: { repository: target.repository },
    });
    const repository = rememberRepositoryClient(payload.repository.fullName);
    repositoryInput.value = repository;
    setRepositoryPickerOpen(false);
    location.hash = target.pullNumber
      ? pullHash(repository, target.pullNumber)
      : pullsHashForRepository(repository);
  } catch (error) {
    repositoryInput.setAttribute("aria-invalid", "true");
    repositorySearchError = error instanceof Error ? error.message : String(error);
    setRepositoryPickerOpen(true);
    renderRepositoryPicker();
    throw error;
  } finally {
    repositoryInput.readOnly = false;
    repositoryMenuButton.disabled = false;
    searchIcon?.classList.replace("icon-sync", "icon-search");
    searchIcon?.classList.remove("spin");
    repositoryInput.removeAttribute("aria-busy");
  }
}

async function inspectArtifactButton(button) {
  const artifactId = Number(button.dataset.inspectArtifact);
  const repository = button.dataset.repository;
  const pullNumber = Number(button.dataset.pullNumber);
  const row = button.closest(".artifact-row");
  const controls = row
    ? [...row.querySelectorAll("button[data-inspect-artifact]")]
    : [button];
  const statusButton =
    row?.querySelector(".Box-row-actions button[data-inspect-artifact]") ?? button;
  const original = statusButton.innerHTML;
  const originalLabel = statusButton.getAttribute("aria-label");
  const artifact = currentPullContext?.artifacts.find(
    (item) => Number(item.id) === artifactId,
  );
  updateArtifactDownloadProgress({
    artifactId,
    artifactName: artifact?.name,
    stage: "preparing",
    receivedBytes: 0,
    totalBytes: artifact?.sizeInBytes ?? null,
    percent: 0,
    bytesPerSecond: 0,
    etaSeconds: null,
  });
  for (const control of controls) control.disabled = true;
  statusButton.setAttribute("aria-label", "Downloading artifact");
  try {
    await api("/api/artifacts/inspect", {
      method: "POST",
      body: { artifactId, repository },
    });
    updateCacheHeader(await api("/api/cache"));
    artifactDownloadProgress.delete(String(artifactId));
    location.hash = artifactHash(repository, pullNumber, artifactId);
  } catch (error) {
    artifactDownloadProgress.delete(String(artifactId));
    showToast(error instanceof Error ? error.message : String(error), "error");
    row?.classList.remove("is-downloading");
    row?.classList.remove("has-transfer-row");
    row?.removeAttribute("aria-busy");
    row?.removeAttribute("aria-describedby");
    row?.querySelector(".artifact-download-progress")?.remove();
    document
      .querySelector(`.artifact-transfer-row[data-artifact-transfer-id="${artifactId}"]`)
      ?.remove();
    for (const control of controls) control.disabled = false;
    statusButton.removeAttribute("aria-live");
    if (originalLabel === null) statusButton.removeAttribute("aria-label");
    else statusButton.setAttribute("aria-label", originalLabel);
    statusButton.innerHTML = original;
  }
}

async function deleteArtifact(artifactId) {
  if (!window.confirm("Delete this downloaded artifact from the local cache?")) return;
  try {
    await api(`/api/cache/${artifactId}`, { method: "DELETE" });
    updateCacheHeader(await api("/api/cache"));
    if (currentArtifact?.id === Number(artifactId)) {
      location.hash = "#/cache";
    } else {
      await renderRoute();
    }
    showToast("Downloaded artifact deleted.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), "error");
  }
}

async function clearCache() {
  if (!window.confirm("Delete every downloaded artifact from the local cache?")) return;
  try {
    await api("/api/cache", { method: "DELETE" });
    updateCacheHeader(await api("/api/cache"));
    await renderRoute();
    showToast("Artifact cache cleared.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), "error");
  }
}

repositoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void navigateToRepository(repositoryInput.value).catch((error) => {
    showToast(error instanceof Error ? error.message : String(error), "error");
  });
});

repositoryInput.addEventListener("focus", () => {
  if (repositoryPanel.hidden) setRepositoryPickerOpen(true, { resetQuery: true });
});

repositoryInput.addEventListener("input", () => {
  repositoryInput.removeAttribute("aria-invalid");
  scheduleRepositorySearch(repositoryInput.value);
});

repositoryInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (repositoryPanel.hidden) setRepositoryPickerOpen(true, { resetQuery: true });
    moveRepositorySelection(event.key === "ArrowDown" ? 1 : -1);
    return;
  }
  if (event.key === "Enter" && !repositoryPanel.hidden && repositoryActiveIndex >= 0) {
    const option = repositoryResults.querySelector(
      `[data-repository-option-index="${repositoryActiveIndex}"]`,
    );
    if (option) {
      event.preventDefault();
      void navigateToRepository(option.dataset.selectRepository).catch((error) => {
        showToast(error instanceof Error ? error.message : String(error), "error");
      });
    }
    return;
  }
  if (event.key === "Escape" && !repositoryPanel.hidden) {
    event.preventDefault();
    setRepositoryPickerOpen(false);
  }
});

repositoryMenuButton.addEventListener("click", () => {
  const open = repositoryPanel.hidden;
  setRepositoryPickerOpen(open, { resetQuery: open });
  if (open) repositoryInput.focus();
});

repositoryResults.addEventListener("click", (event) => {
  const pinButton = event.target.closest("[data-pin-repository]");
  if (pinButton) {
    event.preventDefault();
    void setPinnedRepository(pinButton.dataset.pinRepository).catch((error) => {
      showToast(error instanceof Error ? error.message : String(error), "error");
    });
    return;
  }
  const favoriteButton = event.target.closest("[data-favorite-repository]");
  if (favoriteButton) {
    event.preventDefault();
    void setFavoriteRepository(
      favoriteButton.dataset.favoriteRepository,
      favoriteButton.dataset.favorite === "true",
    ).catch((error) => {
      showToast(error instanceof Error ? error.message : String(error), "error");
    });
    return;
  }
  const option = event.target.closest("[data-select-repository]");
  if (option) {
    event.preventDefault();
    void navigateToRepository(option.dataset.selectRepository).catch((error) => {
      showToast(error instanceof Error ? error.message : String(error), "error");
    });
  }
});

repositoryResults.addEventListener("pointermove", (event) => {
  const option = event.target.closest("[data-repository-option-index]");
  if (!option) return;
  const index = Number(option.dataset.repositoryOptionIndex);
  if (index !== repositoryActiveIndex) {
    repositoryActiveIndex = index;
    for (const item of repositoryResults.querySelectorAll("[data-repository-option-index]")) {
      const active = Number(item.dataset.repositoryOptionIndex) === repositoryActiveIndex;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    }
  }
});

view.addEventListener(
  "pointerdown",
  (event) => {
    if (event.target.closest("[data-pull-query-suggestion]")) {
      event.preventDefault();
    }
  },
  true,
);

view.addEventListener("pointermove", (event) => {
  const option = event.target.closest("[data-pull-query-suggestion]");
  if (!option) return;
  const index = Number(option.dataset.pullQuerySuggestion);
  if (index === pullQuerySuggestionIndex) return;
  pullQuerySuggestionIndex = index;
  const input = document.getElementById("pull-query");
  for (const candidate of document.querySelectorAll("[data-pull-query-suggestion]")) {
    const active =
      Number(candidate.dataset.pullQuerySuggestion) === pullQuerySuggestionIndex;
    candidate.classList.toggle("is-active", active);
    candidate.setAttribute("aria-selected", String(active));
  }
  input?.setAttribute(
    "aria-activedescendant",
    `pull-query-suggestion-${pullQuerySuggestionIndex}`,
  );
});

document.addEventListener("pointerdown", (event) => {
  if (!repositoryCombobox.contains(event.target)) setRepositoryPickerOpen(false);
  if (!event.target.closest?.(".pull-query-input-wrap")) {
    setPullQuerySuggestionsOpen(document.getElementById("pull-query"), false);
  }
  if (!event.target.closest?.(".pull-state-picker")) setPullStatePanelOpen(false);
  if (!event.target.closest?.(".pull-author-picker")) setPullAuthorPanelOpen(false);
  if (!event.target.closest?.(".pull-signal-picker")) {
    setPullSignalPanelOpen(null, false);
  }
  if (!event.target.closest?.(".breadcrumb-overflow")) {
    setBreadcrumbOverflowOpen(false);
  }
  if (!event.target.closest?.(".artifact-filter-picker")) {
    setArtifactFilterPanelOpen(null, false);
  }
  if (
    currentArtifact?.fileTree?.filterMenuOpen &&
    !event.target.closest?.("[data-file-tree-filter-root]")
  ) {
    currentArtifact.fileTree.filterMenuOpen = false;
    syncFileTreeFilterUi();
  }
});

breadcrumbs.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-toggle-breadcrumb-overflow]");
  if (trigger) {
    event.preventDefault();
    setBreadcrumbOverflowOpen(trigger.getAttribute("aria-expanded") !== "true");
    return;
  }
  if (event.target.closest(".breadcrumb-overflow-option")) {
    setBreadcrumbOverflowOpen(false);
  }
});

breadcrumbs.addEventListener("keydown", (event) => {
  const trigger = event.target.closest("[data-toggle-breadcrumb-overflow]");
  const menu = breadcrumbs.querySelector("#breadcrumb-overflow-menu");
  const options = [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])].filter(
    (item) => item.getClientRects().length > 0,
  );
  if (trigger && event.key === "ArrowDown") {
    event.preventDefault();
    setBreadcrumbOverflowOpen(true, true);
    return;
  }
  if (event.key === "Escape" && menu && !menu.hidden) {
    event.preventDefault();
    setBreadcrumbOverflowOpen(false);
    breadcrumbs.querySelector("[data-toggle-breadcrumb-overflow]")?.focus();
    return;
  }
  const currentIndex = options.indexOf(document.activeElement);
  if (currentIndex < 0) return;
  let nextIndex = null;
  if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % options.length;
  if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + options.length) % options.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = options.length - 1;
  if (nextIndex != null) {
    event.preventDefault();
    options[nextIndex]?.focus();
  }
});

accountAvatar.addEventListener("error", () => {
  accountAvatar.hidden = true;
  accountFallback.hidden = false;
});

view.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-pull-query-form]");
  if (!form) return;
  event.preventDefault();
  void commitPullQuery(form.querySelector("#pull-query"));
});

view.addEventListener("input", (event) => {
  if (event.target.matches("[data-trx-search-input]")) {
    TrxPreview.applyFilters(event.target.closest(".trx-preview"));
    return;
  }
  if (event.target.id === "pull-query") {
    syncPullQueryEditor(event.target);
    renderPullQuerySuggestions(event.target);
    return;
  }
  if (event.target.id === "pull-author-filter") {
    renderPullAuthorOptions(event.target.value);
    return;
  }
  if (event.target.id === "artifact-filter") {
    artifactFilters.query = event.target.value;
    renderPullArtifactRows(event.target.value);
    return;
  }
  if (event.target.id === "file-filter" && currentArtifact) {
    renderFileRows(
      currentArtifact.analysis.entries,
      currentArtifact.selectedPath,
      event.target.value,
    );
  }
});

view.addEventListener("click", (event) => {
  const trxView = event.target.closest("[data-trx-view]");
  if (trxView) {
    event.preventDefault();
    const preview = trxView.closest(".trx-preview");
    const viewName = trxView.dataset.trxView;
    TrxPreview.showView(preview, viewName);
    if (viewName === "structured") {
      preview.querySelector("[data-trx-search-input]")?.focus();
    }
    return;
  }
  const trxFilter = event.target.closest("[data-trx-filter]");
  if (trxFilter) {
    event.preventDefault();
    const preview = trxFilter.closest(".trx-preview");
    for (const button of preview.querySelectorAll("[data-trx-filter]")) {
      button.setAttribute("aria-pressed", String(button === trxFilter));
    }
    TrxPreview.applyFilters(preview);
    return;
  }
  const pullQuerySuggestion = event.target.closest("[data-pull-query-suggestion]");
  if (pullQuerySuggestion) {
    event.preventDefault();
    insertPullQuerySuggestion(
      document.getElementById("pull-query"),
      Number(pullQuerySuggestion.dataset.pullQuerySuggestion),
    );
    return;
  }
  if (event.target.id === "pull-query") {
    renderPullQuerySuggestions(event.target);
    return;
  }
  const artifactFilterTrigger = event.target.closest("[data-toggle-artifact-filter]");
  if (artifactFilterTrigger) {
    event.preventDefault();
    const kind = artifactFilterTrigger.dataset.toggleArtifactFilter;
    setArtifactFilterPanelOpen(
      kind,
      artifactFilterTrigger.getAttribute("aria-expanded") !== "true",
    );
    return;
  }
  const artifactFilterClose = event.target.closest("[data-close-artifact-filter]");
  if (artifactFilterClose) {
    event.preventDefault();
    setArtifactFilterPanelOpen(null, false);
    return;
  }
  const artifactStatusOption = event.target.closest("[data-select-artifact-status]");
  if (artifactStatusOption) {
    event.preventDefault();
    artifactFilters.status = artifactStatusOption.dataset.selectArtifactStatus;
    setArtifactFilterPanelOpen(null, false);
    renderArtifactFilterControls();
    renderPullArtifactRows();
    return;
  }
  const artifactRunOption = event.target.closest("[data-select-artifact-run]");
  if (artifactRunOption) {
    event.preventDefault();
    artifactFilters.run = artifactRunOption.dataset.selectArtifactRun;
    setArtifactFilterPanelOpen(null, false);
    renderArtifactFilterControls();
    renderPullArtifactRows();
    return;
  }
  const playerSetting = event.target.closest("[data-player-setting][data-player-value]");
  if (playerSetting) {
    event.preventDefault();
    void updatePlayerPreference(
      playerSetting.dataset.playerSetting,
      playerSetting.dataset.playerValue,
    );
    return;
  }
  const playerStep = event.target.closest("[data-player-step]");
  if (playerStep) {
    event.preventDefault();
    stepPlayerTextSize(playerStep.dataset.playerStep);
    return;
  }
  const signalTrigger = event.target.closest("[data-toggle-pull-signal]");
  if (signalTrigger) {
    event.preventDefault();
    const kind = signalTrigger.dataset.togglePullSignal;
    setPullAuthorPanelOpen(false);
    setPullStatePanelOpen(false);
    setPullSignalPanelOpen(
      kind,
      signalTrigger.getAttribute("aria-expanded") !== "true",
    );
    return;
  }
  const signalClose = event.target.closest("[data-close-pull-signal]");
  if (signalClose) {
    event.preventDefault();
    setPullSignalPanelOpen(null, false);
    return;
  }
  const signalOption = event.target.closest("[data-select-pull-signal]");
  if (signalOption) {
    event.preventDefault();
    const route = parseRoute();
    const pullFilters = {
      artifacts: route.artifacts,
      ci: route.ci,
      [signalOption.dataset.selectPullSignal]: signalOption.dataset.pullSignalValue,
    };
    setPullSignalPanelOpen(null, false);
    void refreshPullTable({
      name: "pulls",
      repository: route.repository,
      state: route.state,
      query: document.getElementById("pull-query")?.value ?? route.query,
      ...pullFilters,
    });
    return;
  }
  const authorTrigger = event.target.closest("[data-toggle-pull-author]");
  if (authorTrigger) {
    event.preventDefault();
    setPullStatePanelOpen(false);
    setPullSignalPanelOpen(null, false);
    setPullAuthorPanelOpen(authorTrigger.getAttribute("aria-expanded") !== "true");
    return;
  }
  const authorClose = event.target.closest("[data-close-pull-author]");
  if (authorClose) {
    event.preventDefault();
    setPullAuthorPanelOpen(false);
    return;
  }
  const authorOption = event.target.closest("[data-select-pull-author]");
  if (authorOption) {
    event.preventDefault();
    const route = parseRoute();
    const query = pullQueryForAuthor(
      document.getElementById("pull-query")?.value ?? route.query,
      authorOption.dataset.selectPullAuthor || null,
    );
    setPullAuthorPanelOpen(false);
    void refreshPullTable({
      name: "pulls",
      repository: route.repository,
      state: stateFromPullQuery(query),
      query,
      artifacts: route.artifacts,
      ci: route.ci,
    });
    return;
  }
  const stateTrigger = event.target.closest("[data-toggle-pull-state]");
  if (stateTrigger) {
    event.preventDefault();
    setPullAuthorPanelOpen(false);
    setPullSignalPanelOpen(null, false);
    setPullStatePanelOpen(stateTrigger.getAttribute("aria-expanded") !== "true");
    return;
  }
  const stateClose = event.target.closest("[data-close-pull-state]");
  if (stateClose) {
    event.preventDefault();
    setPullStatePanelOpen(false);
    return;
  }
  const stateOption = event.target.closest("[data-select-pull-state]");
  if (stateOption) {
    event.preventDefault();
    const route = parseRoute();
    const state = stateOption.dataset.selectPullState;
    const query = pullQueryForState(
      document.getElementById("pull-query")?.value ?? route.query,
      state,
    );
    setPullStatePanelOpen(false);
    void refreshPullTable({
      name: "pulls",
      repository: route.repository,
      state,
      query,
      artifacts: route.artifacts,
      ci: route.ci,
    });
    return;
  }
  const accountChoice = event.target.closest("[data-select-account]");
  if (accountChoice) {
    event.preventDefault();
    void selectAccount(accountChoice.dataset.selectAccount, accountChoice);
    return;
  }
  const refreshAccountsButton = event.target.closest("[data-refresh-accounts]");
  if (refreshAccountsButton) {
    event.preventDefault();
    void refreshAccounts(refreshAccountsButton);
    return;
  }
  const fileTreeFilterTrigger = event.target.closest("[data-toggle-file-tree-filter]");
  if (fileTreeFilterTrigger && currentArtifact) {
    event.preventDefault();
    currentArtifact.fileTree.filterMenuOpen =
      !currentArtifact.fileTree.filterMenuOpen;
    syncFileTreeFilterUi();
    return;
  }
  const fileExtensionFilter = event.target.closest("[data-file-tree-extension]");
  if (fileExtensionFilter && currentArtifact) {
    event.preventDefault();
    const extension = fileExtensionFilter.dataset.fileTreeExtension;
    if (currentArtifact.fileTree.excludedExtensions.has(extension)) {
      currentArtifact.fileTree.excludedExtensions.delete(extension);
    } else {
      currentArtifact.fileTree.excludedExtensions.add(extension);
    }
    syncFileTreeFilterUi();
    renderFileRows(
      currentArtifact.analysis.entries,
      currentArtifact.selectedPath,
      document.getElementById("file-filter")?.value ?? "",
    );
    return;
  }
  const fileCategoryFilter = event.target.closest("[data-file-tree-category]");
  if (fileCategoryFilter && currentArtifact) {
    event.preventDefault();
    const category = fileCategoryFilter.dataset.fileTreeCategory;
    if (category === "manifest") {
      currentArtifact.fileTree.onlyManifestFiles =
        !currentArtifact.fileTree.onlyManifestFiles;
    } else if (category === "vendored") {
      currentArtifact.fileTree.includeVendoredFiles =
        !currentArtifact.fileTree.includeVendoredFiles;
    } else if (category === "viewed") {
      currentArtifact.fileTree.includeViewedFiles =
        !currentArtifact.fileTree.includeViewedFiles;
    }
    syncFileTreeFilterUi();
    renderFileRows(
      currentArtifact.analysis.entries,
      currentArtifact.selectedPath,
      document.getElementById("file-filter")?.value ?? "",
    );
    return;
  }
  const directoryButton = event.target.closest("[data-file-directory]");
  if (directoryButton && currentArtifact) {
    event.preventDefault();
    const path = directoryButton.dataset.fileDirectory;
    if (currentArtifact.fileTree.expandedDirectories.has(path)) {
      currentArtifact.fileTree.expandedDirectories.delete(path);
    } else {
      currentArtifact.fileTree.expandedDirectories.add(path);
    }
    renderFileRows(
      currentArtifact.analysis.entries,
      currentArtifact.selectedPath,
      document.getElementById("file-filter")?.value ?? "",
    );
    requestAnimationFrame(() => {
      [...document.querySelectorAll("[data-file-directory]")]
        .find((button) => button.dataset.fileDirectory === path)
        ?.focus();
    });
    return;
  }
  const sidebarButton = event.target.closest("[data-toggle-sidebar]");
  if (sidebarButton) {
    event.preventDefault();
    void toggleSidebar();
    return;
  }
  const inspectButton = event.target.closest("[data-inspect-artifact]");
  if (inspectButton) {
    event.preventDefault();
    void inspectArtifactButton(inspectButton);
    return;
  }
  const fileButton = event.target.closest("[data-artifact-file]");
  if (fileButton) {
    event.preventDefault();
    void selectArtifactFile(fileButton.dataset.artifactFile);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-artifact]");
  if (deleteButton) {
    event.preventDefault();
    void deleteArtifact(deleteButton.dataset.deleteArtifact);
    return;
  }
  const clearButton = event.target.closest("[data-clear-cache]");
  if (clearButton) {
    event.preventDefault();
    void clearCache();
    return;
  }
  const refreshButton = event.target.closest("[data-refresh-view]");
  if (refreshButton) {
    event.preventDefault();
    const route = parseRoute();
    if (route.name === "pulls") {
      void refreshPullTable(route, { force: true });
    } else {
      void renderRoute({ force: true });
    }
    return;
  }
});

view.addEventListener("focusin", (event) => {
  if (event.target.id !== "pull-query") return;
  syncPullQueryEditor(event.target);
  renderPullQuerySuggestions(event.target);
});

view.addEventListener("focusout", (event) => {
  if (event.target.id !== "pull-query") return;
  const input = event.target;
  queueMicrotask(() => {
    if (document.activeElement === input) return;
    setPullQuerySuggestionsOpen(input, false);
    void commitPullQuery(input);
  });
});

view.addEventListener(
  "scroll",
  (event) => {
    if (event.target.id === "pull-query") syncPullQueryEditor(event.target);
  },
  true,
);

view.addEventListener("keyup", (event) => {
  if (
    event.target.id === "pull-query" &&
    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
  ) {
    syncPullQueryEditor(event.target);
    renderPullQuerySuggestions(event.target);
  }
});

view.addEventListener("keydown", (event) => {
  if (event.target.id === "pull-query") {
    const input = event.target;
    const suggestions = document.getElementById("pull-query-suggestions");
    if (event.key === "Escape" && suggestions && !suggestions.hidden) {
      event.preventDefault();
      setPullQuerySuggestionsOpen(input, false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const wasHidden = suggestions?.hidden !== false;
      if (wasHidden) renderPullQuerySuggestions(input);
      if (wasHidden && !document.getElementById("pull-query-suggestions")?.hidden) {
        event.preventDefault();
        return;
      }
      if (
        !document.getElementById("pull-query-suggestions")?.hidden &&
        movePullQuerySuggestion(input, event.key === "ArrowDown" ? 1 : -1)
      ) {
        event.preventDefault();
        return;
      }
    }
    if (event.key === "Tab" && suggestions && !suggestions.hidden) {
      if (insertPullQuerySuggestion(input)) {
        event.preventDefault();
        return;
      }
    }
    if (event.key === "Enter") {
      setPullQuerySuggestionsOpen(input, false);
    }
  }
  const openFileTreeFilter = document.querySelector(
    '[data-toggle-file-tree-filter][aria-expanded="true"]',
  );
  if (event.key === "Escape" && openFileTreeFilter && currentArtifact) {
    event.preventDefault();
    currentArtifact.fileTree.filterMenuOpen = false;
    syncFileTreeFilterUi();
    openFileTreeFilter.focus();
    return;
  }
  const directoryButton = event.target.closest("[data-file-directory]");
  if (
    directoryButton &&
    currentArtifact &&
    !fileTreeFiltersActive(currentArtifact.fileTree) &&
    !document.getElementById("file-filter")?.value
  ) {
    const expanded = directoryButton.getAttribute("aria-expanded") === "true";
    if (
      (event.key === "ArrowRight" && !expanded) ||
      (event.key === "ArrowLeft" && expanded)
    ) {
      event.preventDefault();
      directoryButton.click();
      return;
    }
  }
  const openArtifactFilter = document.querySelector(
    '[data-toggle-artifact-filter][aria-expanded="true"]',
  );
  if (event.key === "Escape" && openArtifactFilter) {
    event.preventDefault();
    setArtifactFilterPanelOpen(null, false);
    openArtifactFilter.focus();
    return;
  }
  const openPullSignal = document.querySelector(
    '[data-toggle-pull-signal][aria-expanded="true"]',
  );
  if (event.key === "Escape" && openPullSignal) {
    event.preventDefault();
    setPullSignalPanelOpen(null, false);
    openPullSignal.focus();
    return;
  }
  if (event.key === "Escape" && !document.getElementById("pull-author-panel")?.hidden) {
    event.preventDefault();
    setPullAuthorPanelOpen(false);
    document.querySelector("[data-toggle-pull-author]")?.focus();
    return;
  }
  if (event.key === "Escape" && !document.getElementById("pull-state-panel")?.hidden) {
    event.preventDefault();
    setPullStatePanelOpen(false);
    document.querySelector("[data-toggle-pull-state]")?.focus();
    return;
  }
});

window.addEventListener("hashchange", () => {
  void renderRoute();
});

async function initialize() {
  try {
    installPreviewThemeSync();
    bootstrapState = await api("/api/bootstrap");
    repositoryInput.value = bootstrapState.prefs.repository;
    renderAccounts(bootstrapState.accounts, bootstrapState.account);
    updateCacheHeader(bootstrapState.cache);

    const events = new EventSource("/events");
    events.addEventListener("navigate", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.route) location.hash = payload.route;
    });
    events.addEventListener("cache", (event) => {
      updateCacheHeader(JSON.parse(event.data));
    });
    events.addEventListener("artifact-progress", (event) => {
      updateArtifactDownloadProgress(JSON.parse(event.data));
    });
    events.addEventListener("refresh", () => {
      void renderRoute();
    });

    if (!location.hash || location.hash === "#/") {
      const input = bootstrapState.initialInput ?? {};
      if (typeof input.url === "string" && input.url) {
        location.hash = routeFromInput(input.url);
        return;
      }
      if (typeof input.repository === "string" && input.pullNumber) {
        location.hash = pullHash(input.repository, input.pullNumber);
        return;
      }
      if (typeof input.repository === "string") {
        location.hash = pullsHashForRepository(input.repository);
        return;
      }
      location.hash = pullsHashForRepository(bootstrapState.prefs.repository);
      return;
    }
    await renderRoute();
  } catch (error) {
    setBreadcrumbs([{ label: "PR Artifact Explorer" }]);
    renderError(error, "PR Artifact Explorer could not start");
  }
}

void initialize();
