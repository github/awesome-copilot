import { layoutCommitGraph } from "./graph-layout.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const token = new URLSearchParams(location.search).get("token");

const elements = {
  breadcrumbs: document.querySelector("#breadcrumbs"),
  empty: document.querySelector("#empty-state"),
  githubStatus: document.querySelector("#github-status"),
  graph: document.querySelector("#graph"),
  graphScroll: document.querySelector("#graph-scroll"),
  inspector: document.querySelector("#inspector"),
  loading: document.querySelector("#loading"),
  refresh: document.querySelector("#refresh-button"),
  repoPath: document.querySelector("#repo-path"),
  toast: document.querySelector("#toast"),
  viewBranches: document.querySelector("#view-branches"),
  viewWorktrees: document.querySelector("#view-worktrees"),
  zoomIn: document.querySelector("#zoom-in"),
  zoomOut: document.querySelector("#zoom-out"),
  zoomReset: document.querySelector("#zoom-reset"),
};

const state = {
  snapshot: null,
  current: { type: "repository", id: "repository", label: "Repository" },
  breadcrumbs: [],
  selected: null,
  commits: new Map(),
  branchReloadTimer: null,
  branchRequestId: 0,
  branchGraph: null,
  branchGraphRequestId: 0,
  historyGeneration: 0,
  eventsStopped: false,
  repositoryView: "worktrees",
  zoom: 1,
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-git-worktree-token": token,
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function post(path, data) {
  return api(path, { method: "POST", body: JSON.stringify(data) });
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("visible"), 2200);
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shortPath(value) {
  if (!value) return "Unassigned";
  const parts = value.replace(/\\/g, "/").split("/");
  return parts.length > 3 ? `…/${parts.slice(-3).join("/")}` : value;
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function nodeForId(id) {
  if (id === "repository") return { type: "repository", value: state.snapshot.repository };
  const worktree = state.snapshot.worktrees.find((item) => item.id === id);
  if (worktree) return { type: "worktree", value: worktree };
  const branch = state.snapshot.branches.find((item) => item.id === id);
  if (branch) return { type: "branch", value: branch };
  for (const page of state.commits.values()) {
    const commit = page.commits.find((item) => `commit:${item.sha}` === id);
    if (commit) return { type: "commit", value: commit };
  }
  return null;
}

function labelFor(node) {
  if (node.type === "repository") return node.value.name;
  if (node.type === "worktree") return node.value.name;
  if (node.type === "branch") return node.value.name;
  return node.value.shortSha;
}

function metaFor(node) {
  if (node.type === "repository") {
    return `${state.snapshot.worktrees.length} worktrees · ${state.snapshot.branches.length} branches`;
  }
  if (node.type === "worktree") {
    if (node.value.virtual) return `${node.value.branchIds.length} branches`;
    return node.value.current ? "Current worktree" : shortPath(node.value.path);
  }
  if (node.type === "branch") {
    if (node.value.detached) return node.value.sha?.slice(0, 8);
    if (state.repositoryView === "branches" && node.value.defaultTracking) {
      const { ahead, behind } = node.value.defaultTracking;
      const badges = [
        node.value.worktrees.length ? `${node.value.worktrees.length} WT` : null,
        node.value.pullRequests.length ? `${node.value.pullRequests.length} PR` : null,
      ].filter(Boolean);
      return `+${ahead} / -${behind} vs default${badges.length ? ` · ${badges.join(" · ")}` : ""}`;
    }
    const { ahead, behind } = node.value.tracking;
    return `${ahead} ahead · ${behind} behind`;
  }
  return `${node.value.author.name} · ${formatDate(node.value.committedAt)}`;
}

function graphChildren() {
  if (state.current.type === "repository") {
    return state.repositoryView === "branches"
      ? state.snapshot.branches.filter((branch) => !branch.detached).map((value) => ({ type: "branch", value }))
      : state.snapshot.worktrees.map((value) => ({ type: "worktree", value }));
  }
  if (state.current.type === "worktree") {
    const worktree = state.snapshot.worktrees.find((item) => item.id === state.current.id);
    return (worktree?.branchIds || []).map((id) => {
      const value = state.snapshot.branches.find((branch) => branch.id === id);
      return value ? { type: "branch", value } : null;
    }).filter(Boolean);
  }
  if (state.current.type === "branch") {
    return (state.commits.get(state.current.id)?.commits || []).map((value) => ({ type: "commit", value }));
  }
  return [];
}

function currentNode() {
  return nodeForId(state.current.id);
}

function nodeId(node) {
  return node.type === "commit" ? `commit:${node.value.sha}` : node.value.id;
}

function repositoryCrumb() {
  return { type: "repository", id: "repository", label: state.snapshot.repository.name };
}

function pathForNode(node) {
  const root = repositoryCrumb();
  if (node.type === "repository") return [root];
  if (node.type === "worktree") {
    return [root, { type: "worktree", id: node.value.id, label: labelFor(node) }];
  }
  if (node.type === "branch") {
    if (state.repositoryView === "branches") {
      return [root, { type: "branch", id: node.value.id, label: labelFor(node) }];
    }
    const worktree = state.snapshot.worktrees.find((item) => item.branchIds.includes(node.value.id));
    const branch = { type: "branch", id: node.value.id, label: labelFor(node) };
    return worktree
      ? [root, { type: "worktree", id: worktree.id, label: worktree.name }, branch]
      : [root, branch];
  }
  return state.breadcrumbs;
}

function addText(group, className, x, y, text, maxLength = 34) {
  const label = String(text || "");
  const clipped = label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
  const element = svgElement("text", { class: className, x, y });
  element.textContent = clipped;
  group.append(element);
}

function renderNode(node, x, y, width, isParent = false) {
  const id = nodeId(node);
  const group = svgElement("g", {
    class: `node ${node.type}${node.value.dirty ? " dirty" : ""}${state.selected?.id === id ? " selected" : ""}`,
    role: "treeitem",
    tabindex: "0",
    "aria-label": `${node.type}: ${labelFor(node)}. ${metaFor(node)}`,
    transform: `translate(${x} ${y})`,
  });
  const height = isParent ? 98 : 88;
  group.append(svgElement("rect", { class: "node-card", width, height, rx: 11 }));
  group.append(svgElement("rect", { class: "node-accent", width: 5, height, rx: 3 }));
  addText(group, "node-type", 18, 23, node.type.toUpperCase());
  addText(group, "node-label", 18, 48, labelFor(node), isParent ? 42 : 30);
  addText(group, "node-meta", 18, 69, metaFor(node), isParent ? 52 : 34);
  if (node.type === "commit") addText(group, "node-meta", 18, 80, node.value.subject, 34);

  const activate = () => selectAndDrill(node);
  group.addEventListener("click", activate);
  group.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  });
  return { group, height };
}

function renderGraph() {
  if (state.current.type === "repository" && state.repositoryView === "branches") {
    renderCombinedBranchGraph();
    return;
  }
  if (state.current.type === "branch") {
    renderBranchCommitGraph();
    return;
  }
  const parent = currentNode();
  const children = graphChildren();
  elements.graph.replaceChildren();
  elements.empty.hidden = true;
  if (!parent) return;

  const childWidth = 250;
  const gapX = 28;
  const columns = Math.min(Math.max(children.length, 1), 4);
  const contentWidth = Math.max(900, columns * childWidth + (columns - 1) * gapX + 120);
  const rows = Math.max(1, Math.ceil(children.length / columns));
  const contentHeight = Math.max(560, 230 + rows * 130);
  elements.graph.setAttribute("viewBox", `0 0 ${contentWidth} ${contentHeight}`);
  elements.graph.style.width = `${contentWidth * state.zoom}px`;
  elements.graph.style.height = `${contentHeight * state.zoom}px`;

  const parentWidth = 300;
  const parentX = (contentWidth - parentWidth) / 2;
  const parentY = 55;
  const edgeLayer = svgElement("g", { class: "edge-layer", "aria-hidden": "true" });
  const nodeLayer = svgElement("g", { class: "node-layer" });
  elements.graph.append(edgeLayer, nodeLayer);
  const renderedParent = renderNode(parent, parentX, parentY, parentWidth, true);
  nodeLayer.append(renderedParent.group);

  if (!children.length) {
    elements.empty.textContent = state.snapshot.repository.empty
      ? "This repository has no commits yet."
      : "No child nodes are available at this level.";
    elements.empty.hidden = false;
    return;
  }

  function graphPath(from, to, top, middle, bottom, kind) {
    const startX = 28 + from * 22;
    const endX = 28 + to * 22;
    if (kind === "merge-parent") {
      return `M ${startX} ${middle} C ${startX} ${middle + 10}, ${endX} ${bottom - 10}, ${endX} ${bottom}`;
    }
    if (startX === endX) return `M ${startX} ${top} L ${endX} ${bottom}`;
    return `M ${startX} ${top} C ${startX} ${middle}, ${endX} ${middle}, ${endX} ${bottom}`;
  }

  function relativeTime(value) {
    const elapsed = Date.now() - new Date(value).getTime();
    const minutes = Math.max(0, Math.floor(elapsed / 60000));
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    return formatDate(value);
  }

  function renderCombinedBranchGraph() {
    renderCommitLaneGraph(state.branchGraph, {
      loadingMessage: "Loading combined branch history…",
      emptyMessage: "No commits are reachable from local branches.",
      loadLabel: "Load 100 more",
      onLoadMore: loadMoreBranchGraph,
      onRetry: () => loadBranchGraph(true),
    });
  }

  function renderBranchCommitGraph() {
    const branch = state.snapshot.branches.find((candidate) => candidate.id === state.current.id);
    const page = state.commits.get(state.current.id);
    const decoratedPage = page && branch
      ? {
          ...page,
          commits: page.commits.map((commit) => commit.sha === branch.sha
            ? {
                ...commit,
                refs: [{
                  id: branch.id,
                  name: branch.name,
                  worktreeCount: branch.worktrees.length,
                  pullRequestCount: branch.pullRequests.length,
                  default: state.snapshot.repository.defaultBranch?.endsWith(`/${branch.name}`) || false,
                }],
              }
            : commit),
        }
      : page;
    renderCommitLaneGraph(decoratedPage, {
      loadingMessage: `Loading commits unique to ${branch?.name || "branch"}…`,
      emptyMessage: page?.comparisonUnavailable
        ? "Unique commits are unavailable because no remote default branch could be resolved."
        : "No commits are unique to this branch.",
      loadLabel: "Load 50 more",
      onLoadMore: loadMoreCommits,
      onRetry: () => loadBranchCommits(state.current.id),
    });
  }

  function renderCommitLaneGraph(page, options) {
    elements.graph.replaceChildren();
    elements.empty.replaceChildren();
    elements.empty.classList.remove("has-action");
    elements.empty.hidden = true;
    if (!page) {
      elements.empty.textContent = options.loadingMessage;
      elements.empty.hidden = false;
      return;
    }
    if (page.error) {
      const message = document.createElement("span");
      message.textContent = `Could not load commit history: ${page.error}`;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "action-button";
      retry.textContent = "Retry";
      retry.addEventListener("click", options.onRetry);
      elements.empty.append(message, retry);
      elements.empty.classList.add("has-action");
      elements.empty.hidden = false;
      return;
    }
    if (!page.commits.length) {
      elements.empty.textContent = options.emptyMessage;
      elements.empty.hidden = false;
      return;
    }

    const { rows, maxLanes } = layoutCommitGraph(page.commits);
    const rowHeight = 44;
    const topPadding = 18;
    const laneAreaWidth = Math.max(92, 36 + maxLanes * 22);
    const contentWidth = Math.max(980, elements.graphScroll.clientWidth || 980);
    const contentHeight = topPadding * 2 + rows.length * rowHeight + (page.nextOffset !== null ? 58 : 0);
    elements.graph.setAttribute("viewBox", `0 0 ${contentWidth} ${contentHeight}`);
    elements.graph.style.width = `${contentWidth * state.zoom}px`;
    elements.graph.style.height = `${contentHeight * state.zoom}px`;

    const lineLayer = svgElement("g", { class: "commit-line-layer", "aria-hidden": "true" });
    const rowLayer = svgElement("g", { class: "commit-row-layer" });
    elements.graph.append(lineLayer, rowLayer);

    rows.forEach((row, index) => {
      const top = topPadding + index * rowHeight;
      const middle = top + rowHeight / 2;
      const bottom = top + rowHeight;
      row.transitions.forEach((transition) => {
        const path = svgElement("path", {
          class: `commit-lane ${transition.kind}`,
          d: graphPath(transition.from, transition.to, top, middle, bottom, transition.kind),
          stroke: transition.color,
        });
        lineLayer.append(path);
      });

      const group = svgElement("g", {
        class: `commit-row${state.selected?.id === `commit:${row.commit.sha}` ? " selected" : ""}`,
        role: "treeitem",
        tabindex: "0",
        "aria-label": `${row.commit.subject}, ${row.commit.author.name}, ${formatDate(row.commit.committedAt)}`,
      });
      group.append(svgElement("rect", {
        class: "commit-row-hit",
        x: 0,
        y: top,
        width: contentWidth,
        height: rowHeight,
      }));
      group.append(svgElement("circle", {
        class: "commit-dot",
        cx: 28 + row.laneIndex * 22,
        cy: middle,
        r: row.commit.parents.length > 1 ? 6 : 5,
        fill: row.color,
      }));

      let textX = laneAreaWidth;
      for (const ref of row.commit.refs || []) {
        const badgeWidth = Math.min(190, 22 + ref.name.length * 7);
        const badge = svgElement("g", {
          class: `ref-badge${ref.default ? " default" : ""}`,
          role: "button",
          tabindex: "0",
          "aria-label": `Open branch ${ref.name}`,
        });
        badge.append(svgElement("rect", {
          x: textX,
          y: middle - 11,
          width: badgeWidth,
          height: 22,
          rx: 11,
        }));
        addText(badge, "ref-badge-text", textX + 10, middle + 4, ref.name, 24);
        const openBranch = (event) => {
          event.stopPropagation();
          const branch = state.snapshot.branches.find((candidate) => candidate.id === ref.id);
          if (branch) selectAndDrill({ type: "branch", value: branch });
        };
        badge.addEventListener("click", openBranch);
        badge.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") openBranch(event);
        });
        group.append(badge);
        textX += badgeWidth + 8;
      }

      addText(group, "commit-subject", textX, middle - 2, row.commit.subject, 72);
      addText(group, "commit-author", textX, middle + 15, row.commit.author.name, 32);
      addText(group, "commit-time", contentWidth - 72, middle + 4, relativeTime(row.commit.committedAt), 18);

      const activate = () => selectAndDrill({ type: "commit", value: row.commit });
      group.addEventListener("click", activate);
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
      rowLayer.append(group);
    });

    if (page.nextOffset !== null) {
      const foreignObject = svgElement("foreignObject", {
        x: contentWidth / 2 - 70,
        y: contentHeight - 50,
        width: 140,
        height: 44,
      });
      const button = document.createElement("button");
      button.className = "load-more";
      button.type = "button";
      button.textContent = options.loadLabel;
      button.addEventListener("click", options.onLoadMore);
      foreignObject.append(button);
      rowLayer.append(foreignObject);
    }
  }

  const firstRowCount = Math.min(children.length, columns);
  const firstRowWidth = firstRowCount * childWidth + (firstRowCount - 1) * gapX;
  const firstRowStart = (contentWidth - firstRowWidth) / 2;
  children.forEach((node, index) => {
    const row = Math.floor(index / columns);
    const itemsInRow = Math.min(columns, children.length - row * columns);
    const rowWidth = itemsInRow * childWidth + (itemsInRow - 1) * gapX;
    const rowStart = row === 0 ? firstRowStart : (contentWidth - rowWidth) / 2;
    const column = index % columns;
    const x = rowStart + column * (childWidth + gapX);
    const y = 225 + row * 130;
    const parentCenterX = contentWidth / 2;
    const childCenterX = x + childWidth / 2;
    const edge = svgElement("path", {
      class: "edge",
      d: `M ${parentCenterX} ${parentY + renderedParent.height} C ${parentCenterX} ${y - 50}, ${childCenterX} ${y - 50}, ${childCenterX} ${y}`,
    });
    edgeLayer.append(edge);
    nodeLayer.append(renderNode(node, x, y, childWidth).group);
  });

}

function renderBreadcrumbs() {
  elements.breadcrumbs.replaceChildren();
  state.breadcrumbs.forEach((crumb, index) => {
    if (index) {
      const separator = document.createElement("span");
      separator.className = "crumb-separator";
      separator.textContent = "›";
      elements.breadcrumbs.append(separator);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "crumb";
    button.textContent = crumb.label;
    button.title = crumb.label;
    button.addEventListener("click", () => navigateTo(index));
    elements.breadcrumbs.append(button);
  });
}

function detailRow(term, value, mono = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "detail-row";
  const dt = document.createElement("dt");
  dt.textContent = term;
  const dd = document.createElement("dd");
  if (mono) dd.className = "mono";
  dd.textContent = value ?? "—";
  wrapper.append(dt, dd);
  return wrapper;
}

function actionButton(label, handler, primary = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `action-button${primary ? " primary" : ""}`;
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}

function safeGitHubUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" ? url.href : null;
  } catch {
    return null;
  }
}

async function copyText(value) {
  await navigator.clipboard.writeText(value);
  showToast("Copied to clipboard");
}

function renderInspector(node, details = null) {
  if (!node) return;
  const content = document.createElement("div");
  content.className = "inspector-content";
  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = node.type;
  const title = document.createElement("h2");
  title.textContent = node.type === "commit" && details ? details.subject : labelFor(node);
  const summary = document.createElement("p");
  summary.className = "summary";
  summary.textContent = metaFor(node);
  const list = document.createElement("dl");
  list.className = "detail-list";
  const actions = document.createElement("div");
  actions.className = "actions";
  const askStatus = document.createElement("p");
  askStatus.className = "action-status";
  askStatus.dataset.role = "ask-status";

  if (node.type === "repository") {
    list.append(
      detailRow("Root", node.value.root, true),
      detailRow("HEAD", node.value.head?.slice(0, 12) || "No commits", true),
      detailRow("Working tree", node.value.dirty ? `${node.value.changedFiles.length} changed files` : "Clean"),
      detailRow("Remote", node.value.remote?.raw || "No origin remote", true),
      detailRow("GitHub", state.snapshot.github.message),
    );
    actions.append(
      actionButton("Copy path", () => copyText(node.value.root)),
      actionButton("Copy status command", () => copyText(`git -C "${node.value.root}" status`)),
      actionButton("Ask Copilot", (event) => askCopilot({ id: "repository" }, event.currentTarget), true),
    );
    if (node.value.changedFiles.length) appendFiles(content, node.value.changedFiles, "Changed files");
  } else if (node.type === "worktree") {
    list.append(
      detailRow("Path", node.value.path || "Virtual branch group", true),
      detailRow("Branch", node.value.branch || (node.value.detached ? "Detached HEAD" : "Multiple")),
      detailRow("HEAD", node.value.head?.slice(0, 12) || "—", true),
      detailRow("State", [
        node.value.current ? "current" : null,
        node.value.locked ? "locked" : null,
        node.value.prunable ? "prunable" : null,
      ].filter(Boolean).join(", ") || "available"),
    );
    if (node.value.path) {
      actions.append(
        actionButton("Copy path", () => copyText(node.value.path)),
        actionButton("Copy status command", () => copyText(`git -C "${node.value.path}" status`)),
      );
    }
    actions.append(actionButton(
      "Ask Copilot",
      (event) => askCopilot({ id: node.value.id }, event.currentTarget),
      true,
    ));
  } else if (node.type === "branch") {
    list.append(
      detailRow("Reference", node.value.ref, true),
      detailRow("HEAD", node.value.sha?.slice(0, 12), true),
      detailRow("Upstream", node.value.upstream || "Not configured", true),
      detailRow("Tracking", `${node.value.tracking.ahead} ahead · ${node.value.tracking.behind} behind`),
      detailRow(
        "vs default branch",
        node.value.defaultTracking
          ? `${node.value.defaultTracking.ahead} unique · ${node.value.defaultTracking.behind} behind`
          : "Unavailable",
      ),
      detailRow("Updated", formatDate(node.value.updatedAt)),
      detailRow("Worktrees", node.value.worktrees.join(", ") || "Not checked out", true),
    );
    actions.append(
      actionButton("Copy branch", () => copyText(node.value.name)),
      actionButton("Copy log command", () => copyText(`git log "${node.value.name}" --oneline -50`)),
      actionButton("Ask Copilot", (event) => askCopilot({ id: node.value.id }, event.currentTarget), true),
    );
    appendPullRequests(content, node.value.pullRequests);
  } else {
    const commit = details || node.value;
    list.append(
      detailRow("Commit", commit.sha, true),
      detailRow("Author", `${commit.author.name} <${commit.author.email}>`),
      detailRow("Authored", formatDate(commit.authoredAt)),
      detailRow("Committed", formatDate(commit.committedAt)),
      detailRow("Parents", commit.parents.join(", ") || "Root commit", true),
    );
    actions.append(
      actionButton("Copy SHA", () => copyText(commit.sha)),
      actionButton("Copy show command", () => copyText(`git show ${commit.sha}`)),
      actionButton("Ask Copilot", (event) => askCopilot({ sha: commit.sha }, event.currentTarget), true),
    );
    const githubUrl = safeGitHubUrl(commit.githubUrl);
    if (githubUrl) actions.append(actionButton("Open on GitHub", () => window.open(githubUrl, "_blank", "noopener")));
    if (commit.body) {
      const heading = document.createElement("h3");
      heading.className = "section-title";
      heading.textContent = "Message";
      const body = document.createElement("p");
      body.className = "summary";
      body.textContent = commit.body;
      content.append(heading, body);
    }
    if (commit.files) appendFiles(content, commit.files, "Changed files");
  }

  content.prepend(eyebrow, title, summary, list, actions, askStatus);
  elements.inspector.replaceChildren(content);
  elements.inspector.classList.add("has-selection");
}

function appendFiles(content, files, title) {
  const heading = document.createElement("h3");
  heading.className = "section-title";
  heading.textContent = title;
  const list = document.createElement("ul");
  list.className = "file-list";
  files.forEach((file) => {
    const item = document.createElement("li");
    const status = document.createElement("span");
    status.className = "file-status";
    status.textContent = file.status.trim() || "?";
    const path = document.createElement("span");
    path.className = "mono";
    path.textContent = file.path;
    item.append(status, path);
    list.append(item);
  });
  content.append(heading, list);
}

function appendPullRequests(content, pullRequests) {
  if (!pullRequests?.length) return;
  const heading = document.createElement("h3");
  heading.className = "section-title";
  heading.textContent = "Pull requests";
  const list = document.createElement("ul");
  list.className = "pr-list";
  pullRequests.forEach((pullRequest) => {
    const item = document.createElement("li");
    const url = safeGitHubUrl(pullRequest.url);
    if (url) {
      const link = document.createElement("a");
      link.className = "pr-link";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = `#${pullRequest.number} ${pullRequest.title}`;
      item.append(link);
    } else {
      item.textContent = `#${pullRequest.number} ${pullRequest.title}`;
    }
    const stateLabel = document.createElement("span");
    stateLabel.className = "badge";
    stateLabel.textContent = pullRequest.isDraft ? "Draft" : pullRequest.state;
    item.append(" ", stateLabel);
    list.append(item);
  });
  content.append(heading, list);
}

async function selectAndDrill(node) {
  const id = nodeId(node);
  state.selected = { type: node.type, id };
  renderGraph();
  if (node.type === "commit") {
    renderInspector(node);
    try {
      const details = await post("/api/commit", { sha: node.value.sha });
      if (state.selected?.id === id) renderInspector(node, details);
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  renderInspector(node);
  const path = pathForNode(node);
  state.breadcrumbs = path;
  state.current = path.at(-1);
  renderBreadcrumbs();
  renderGraph();

  if (node.type === "branch" && !state.commits.has(id)) await loadBranchCommits(id);
}

function navigateTo(index) {
  state.breadcrumbs = state.breadcrumbs.slice(0, index + 1);
  state.current = state.breadcrumbs.at(-1);
  const node = currentNode();
  state.selected = node ? { type: node.type, id: nodeId(node) } : null;
  renderBreadcrumbs();
  renderGraph();
  renderInspector(node);
}

async function loadMoreCommits() {
  const branchId = state.current.id;
  const page = state.commits.get(branchId);
  if (!page || page.nextOffset === null) return;
  const requestId = ++state.branchRequestId;
  const generation = state.historyGeneration;
  try {
    const next = await post("/api/commits", { branchId, offset: page.nextOffset });
    if (
      state.current.id !== branchId
      || state.branchRequestId !== requestId
      || state.historyGeneration !== generation
    ) return;
    state.commits.set(branchId, {
      ...next,
      commits: [...page.commits, ...next.commits],
      offset: 0,
    });
    renderGraph();
  } catch (error) {
    if (state.branchRequestId === requestId && state.historyGeneration === generation) {
      state.commits.set(branchId, { ...page, error: error.message });
      renderGraph();
      showToast(error.message);
    }
  }
}

async function loadBranchGraph(reset = false) {
  const requestId = ++state.branchGraphRequestId;
  const generation = state.historyGeneration;
  const offset = reset ? 0 : state.branchGraph?.nextOffset;
  if (offset === null) return;
  elements.loading.hidden = false;
  try {
    const page = await post("/api/graph", { offset: offset || 0 });
    if (
      state.branchGraphRequestId !== requestId
      || state.historyGeneration !== generation
      || state.repositoryView !== "branches"
    ) return;
    state.branchGraph = reset || !state.branchGraph
      ? page
      : { ...page, commits: [...state.branchGraph.commits, ...page.commits] };
    renderGraph();
  } catch (error) {
    if (state.branchGraphRequestId === requestId && state.historyGeneration === generation) {
      state.branchGraph = { commits: [], nextOffset: null, error: error.message };
      renderGraph();
      showToast(error.message);
    }
  } finally {
    if (state.branchGraphRequestId === requestId) elements.loading.hidden = true;
  }
}

function loadMoreBranchGraph() {
  return loadBranchGraph(false);
}

async function askCopilot(payload, button) {
  const status = elements.inspector.querySelector('[data-role="ask-status"]');
  const originalLabel = button?.textContent || "Ask Copilot";
  if (button) {
    button.disabled = true;
    button.textContent = "Sending…";
  }
  if (status) {
    status.className = "action-status pending";
    status.textContent = "Sending this selection to the current Copilot chat…";
  }
  try {
    await post("/api/ask", payload);
    if (button) button.textContent = "Sent ✓";
    if (status) {
      status.className = "action-status success";
      status.textContent = "Sent to chat. Copilot will respond in the conversation.";
    }
    showToast("Sent to the current Copilot chat");
  } catch (error) {
    if (button) button.textContent = "Try again";
    if (status) {
      status.className = "action-status error";
      status.textContent = `Could not send: ${error.message}`;
    }
    showToast(error.message);
  } finally {
    if (button) button.disabled = false;
    if (button?.textContent === "Sending…") button.textContent = originalLabel;
  }
}

function updateHeader() {
  elements.repoPath.textContent = state.snapshot.repository.root;
  elements.repoPath.title = state.snapshot.repository.root;
  elements.githubStatus.textContent = state.snapshot.github.status === "ready"
    ? `${state.snapshot.github.pullRequestCount} GitHub PRs`
    : "Local Git only";
  elements.githubStatus.classList.toggle("ready", state.snapshot.github.status === "ready");
  elements.githubStatus.title = state.snapshot.github.message;
}

function applySnapshot(snapshot, preserveNavigation = false) {
  state.historyGeneration++;
  state.branchRequestId++;
  state.branchGraphRequestId++;
  clearTimeout(state.branchReloadTimer);
  state.snapshot = snapshot;
  state.commits.clear();
  state.branchGraph = null;
  if (!preserveNavigation || !nodeForId(state.current.id)) {
    state.current = repositoryCrumb();
    state.breadcrumbs = [state.current];
  } else {
    state.breadcrumbs = pathForNode(nodeForId(state.current.id));
    state.current = state.breadcrumbs.at(-1);
  }
  state.selected = { type: state.current.type, id: state.current.id };
  updateHeader();
  renderBreadcrumbs();
  renderGraph();
  renderInspector(currentNode());
  elements.loading.hidden = true;
  if (state.current.type === "branch") scheduleVisibleBranchReload();
  if (state.current.type === "repository" && state.repositoryView === "branches") loadBranchGraph(true);
}

function scheduleVisibleBranchReload() {
  clearTimeout(state.branchReloadTimer);
  const branchId = state.current.id;
  state.branchReloadTimer = setTimeout(() => loadBranchCommits(branchId), 75);
}

async function loadBranchCommits(branchId) {
  const requestId = ++state.branchRequestId;
  const generation = state.historyGeneration;
  elements.loading.hidden = false;
  try {
    const page = await post("/api/commits", { branchId, offset: 0 });
    if (
      state.current.id !== branchId
      || state.branchRequestId !== requestId
      || state.historyGeneration !== generation
    ) return;
    state.commits.set(branchId, page);
    renderGraph();
  } catch (error) {
    if (
      state.current.id === branchId
      && state.branchRequestId === requestId
      && state.historyGeneration === generation
    ) {
      state.commits.set(branchId, { commits: [], nextOffset: null, error: error.message });
      renderGraph();
      showToast(error.message);
    }
  } finally {
    if (state.branchRequestId === requestId) elements.loading.hidden = true;
  }
}

async function refresh() {
  elements.refresh.classList.add("busy");
  elements.refresh.disabled = true;
  try {
    applySnapshot(await post("/api/refresh", {}), true);
    showToast("Repository refreshed");
  } catch (error) {
    showToast(error.message);
  } finally {
    elements.refresh.classList.remove("busy");
    elements.refresh.disabled = false;
  }
}

async function connectEvents() {
  let retryDelay = 500;
  while (!state.eventsStopped) {
    try {
      const response = await fetch("/api/events", {
        headers: { "x-git-worktree-token": token },
      });
      if (!response.ok || !response.body) throw new Error("Event stream unavailable.");
      retryDelay = 500;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!state.eventsStopped) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const event = block.match(/^event: (.+)$/m)?.[1];
          const data = block.match(/^data: (.+)$/m)?.[1];
          if (!event || !data) continue;
          const payload = JSON.parse(data);
          if (event === "snapshot") applySnapshot(payload, true);
          if (event === "focus") {
            const node = nodeForId(payload.nodeId);
            if (node) selectAndDrill(node);
          }
        }
      }
    } catch {
      // Retry because agent-triggered refresh and focus actions depend on SSE.
    }
    if (!state.eventsStopped) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      retryDelay = Math.min(retryDelay * 2, 5000);
    }
  }
}

function setZoom(value) {
  state.zoom = Math.min(1.5, Math.max(0.6, value));
  elements.zoomReset.textContent = `${Math.round(state.zoom * 100)}%`;
  renderGraph();
}

function setRepositoryView(view) {
  state.repositoryView = view;
  state.current = repositoryCrumb();
  state.breadcrumbs = [state.current];
  state.selected = { type: "repository", id: "repository" };
  elements.viewWorktrees.classList.toggle("active", view === "worktrees");
  elements.viewBranches.classList.toggle("active", view === "branches");
  renderBreadcrumbs();
  renderGraph();
  renderInspector(currentNode());
  if (view === "branches") loadBranchGraph(true);
}

elements.refresh.addEventListener("click", refresh);
elements.viewWorktrees.addEventListener("click", () => setRepositoryView("worktrees"));
elements.viewBranches.addEventListener("click", () => setRepositoryView("branches"));
elements.zoomIn.addEventListener("click", () => setZoom(state.zoom + 0.1));
elements.zoomOut.addEventListener("click", () => setZoom(state.zoom - 0.1));
elements.zoomReset.addEventListener("click", () => setZoom(1));
window.addEventListener("pagehide", () => {
  state.eventsStopped = true;
  clearTimeout(state.branchReloadTimer);
});

try {
  if (!token) throw new Error("Canvas capability token is missing.");
  applySnapshot(await api("/api/snapshot"));
  connectEvents();
} catch (error) {
  elements.loading.hidden = true;
  elements.empty.hidden = false;
  elements.empty.textContent = error.message;
}
