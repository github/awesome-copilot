// BrainMax canvas frontend — vanilla JS
// Renders whatever state the extension pushes over SSE; posts interactions
// back to the extension, which relays them into chat via session.send().

const DOMAIN_CODES = {
  "api-design": "API",
  "database-design": "DB",
  "system-architecture": "SYS",
  "implementation-patterns": "IMPL",
  "testing-strategy": "TEST",
  "security-fundamentals": "SEC",
  "devops-and-ci-cd": "CI/CD",
  "error-handling-and-resilience": "ERR",
  "requirements-and-scope": "REQ",
  "domain-modeling": "DDD",
  "ui-and-frontend": "UI",
  observability: "OBS",
};

function domainCode(id, name) {
  if (DOMAIN_CODES[id]) return DOMAIN_CODES[id];
  return (name || id || "??").slice(0, 4).toUpperCase();
}

function tierClass(tier) {
  return `tier-${Math.max(0, Math.min(3, tier ?? 0))}`;
}

// Mirrors lib/state.mjs#tierForPercentage. Kept in sync deliberately: the
// frontend recomputes from `percentage` instead of trusting a passed-through
// `tier` field, so a payload that omits it still renders the correct color.
function tierForPercentage(percentage) {
  if (percentage >= 90) return 3;
  if (percentage >= 70) return 2;
  if (percentage >= 50) return 1;
  return 0;
}

const TIER_LABELS = ["No understanding", "Recognition", "Application", "Mastery"];
const capabilityToken = new URL(window.location.href).searchParams.get("token");

function apiUrl(pathname) {
  const url = new URL(pathname, window.location.href);
  if (capabilityToken) url.searchParams.set("token", capabilityToken);
  return `${url.pathname}${url.search}`;
}

async function postEvent(event) {
  const response = await fetch(apiUrl("/event"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  const result = await response.json();
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || "The canvas event could not be sent.");
  }
  return result;
}

function sendEvent(event) {
  postEvent(event).catch((err) => console.error("Failed to post event", err));
}

const views = {
  domains: document.getElementById("view-domains"),
  quiz: document.getElementById("view-quiz"),
  summary: document.getElementById("view-summary"),
  report: document.getElementById("view-report"),
};

let lastAnnouncement = "";
const liveRegion = document.getElementById("live-region");
const answerForm = document.getElementById("answer-form");
const answerInput = document.getElementById("answer-input");
const answerStatus = document.getElementById("answer-status");
const submitAnswerButton = document.getElementById("btn-submit-answer");
let latestState = null;
let activeQuestionId = null;
let locallySubmitting = false;
let localAnswerError = "";

function announce(text) {
  if (!text || text === lastAnnouncement) return;
  lastAnnouncement = text;
  liveRegion.textContent = text;
}

function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== name;
  }
}

function updateAnswerControls() {
  const question = latestState?.question;
  const serverStatus = localAnswerError ? "error" : latestState?.answerStatus || "idle";
  if (serverStatus === "submitting" || serverStatus === "scored" || serverStatus === "error") {
    locallySubmitting = false;
  }
  const isSubmitting = locallySubmitting || serverStatus === "submitting";
  const isScored = serverStatus === "scored";
  const canEdit = Boolean(question?.id) && !isSubmitting && !isScored;

  answerForm.hidden = !question;
  answerInput.disabled = !canEdit;
  submitAnswerButton.disabled = !canEdit || !answerInput.value.trim();
  answerStatus.dataset.state = serverStatus;

  if (isSubmitting) {
    answerStatus.textContent = "Evaluating your answer…";
  } else if (serverStatus === "error") {
    answerStatus.textContent = localAnswerError || latestState?.answerError || "Your answer could not be submitted. Try again.";
  } else if (isScored) {
    answerStatus.textContent = "Answer scored.";
  } else {
    answerStatus.textContent = "";
  }
}

function updateScoreReveal() {
  const revealEl = document.getElementById("score-reveal");
  const isSubmitting = locallySubmitting || latestState?.answerStatus === "submitting";
  const score = latestState?.lastScore;
  if (!score || isSubmitting) {
    revealEl.hidden = true;
    return;
  }

  revealEl.hidden = false;
  const chip = document.getElementById("score-reveal-chip");
  chip.textContent = `${score.score} / 3`;
  chip.className = `score-chip mono ${tierClass(score.tier)}`;
  document.getElementById("score-reveal-feedback").textContent =
    `Question ${score.index}: ${score.tierLabel} — ${score.feedback}`;
}

function renderDomains(state) {
  const grid = document.getElementById("domain-grid");
  const selectionStatus = document.getElementById("domain-selection-status");
  const isStarting = state.domainSelectionStatus === "submitting";
  grid.innerHTML = "";
  selectionStatus.dataset.state = state.domainSelectionStatus;
  selectionStatus.textContent = isStarting
    ? "Starting quiz…"
    : state.domainSelectionStatus === "error"
      ? state.domainSelectionError || "The quiz could not be started. Try again."
      : "";
  for (const domain of state.domains) {
    const completed = state.completed.find((d) => d.id === domain.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "domain-tile";
    btn.disabled = isStarting;
    btn.setAttribute("aria-label", `Start the ${domain.name} quiz`);

    const code = document.createElement("span");
    code.className = "domain-code";
    code.textContent = domainCode(domain.id, domain.name);

    const name = document.createElement("span");
    name.className = "domain-name";
    name.textContent = domain.name;

    btn.append(code, name);

    if (completed) {
      const pill = document.createElement("span");
      pill.className = `domain-status-pill ${tierClass(tierForPercentage(completed.percentage))}`;
      pill.textContent = `${Math.round(completed.percentage)}%`;
      btn.appendChild(pill);
    } else {
      const status = document.createElement("span");
      status.className = "domain-status";
      status.textContent = "Not started";
      btn.appendChild(status);
    }

    btn.addEventListener("click", async () => {
      for (const tile of grid.querySelectorAll("button")) tile.disabled = true;
      selectionStatus.dataset.state = "submitting";
      selectionStatus.textContent = `Starting ${domain.name} quiz…`;
      try {
        await postEvent({ type: "select-domain", domainId: domain.id });
      } catch (err) {
        for (const tile of grid.querySelectorAll("button")) tile.disabled = false;
        selectionStatus.dataset.state = "error";
        selectionStatus.textContent = err instanceof Error ? err.message : "The quiz could not be started. Try again.";
      }
    });

    grid.appendChild(btn);
  }
}

function renderQuiz(state) {
  const quiz = state.quiz;
  if (!quiz) return;

  document.getElementById("quiz-domain-code").textContent = domainCode(quiz.domainId, quiz.domainName);
  document.getElementById("quiz-domain-name").textContent = quiz.domainName;

  const question = state.question;
  const total = question?.total ?? quiz.total;
  const index = question?.index ?? quiz.index;
  document.getElementById("quiz-counter").textContent = `Question ${index} of ${total}`;

  // Progress rail
  const rail = document.getElementById("progress-rail");
  rail.innerHTML = "";
  const scoredByIndex = new Map(quiz.history.map((h) => [h.index, h.tier]));
  for (let i = 1; i <= total; i++) {
    const li = document.createElement("li");
    if (scoredByIndex.has(i)) {
      li.dataset.state = "scored";
      li.classList.add(tierClass(scoredByIndex.get(i)));
    } else if (i === index) {
      li.dataset.state = "current";
    } else {
      li.dataset.state = "upcoming";
    }
    li.setAttribute("aria-label", `Question ${i}${scoredByIndex.has(i) ? " scored" : i === index ? " current" : ""}`);
    rail.appendChild(li);
  }

  // Question card
  const questionCard = document.getElementById("question-card");
  if (question) {
    questionCard.dataset.state = "ready";
    document.getElementById("question-type").textContent = question.type;
    document.getElementById("question-prompt").textContent = question.prompt;
    if (question.id !== activeQuestionId) {
      activeQuestionId = question.id;
      answerInput.value = "";
      locallySubmitting = false;
      localAnswerError = "";
    }
  } else {
    questionCard.dataset.state = "preparing";
    document.getElementById("question-type").textContent = "Preparing";
    document.getElementById("question-prompt").textContent = "Preparing question…";
    activeQuestionId = null;
    answerInput.value = "";
  }
  updateAnswerControls();
  updateScoreReveal();

  document.getElementById("quiz-running-score").textContent = `${quiz.runningScore} / ${quiz.runningMax}`;
}

function renderSummary(state) {
  const summary = state.summary;
  if (!summary) return;

  document.getElementById("summary-domain-code").textContent = domainCode(summary.domainId, summary.domainName);
  document.getElementById("summary-domain-name").textContent = summary.domainName;
  document.getElementById("summary-percentage").textContent = `${Math.round(summary.percentage)}%`;
  document.getElementById("summary-fraction").textContent = `${summary.total} / ${summary.max} pts`;

  const tierLabelEl = document.getElementById("summary-tier-label");
  tierLabelEl.textContent = TIER_LABELS[summary.tier] ?? "";
  tierLabelEl.className = `tier-label ${tierClass(summary.tier)}`;

  document.getElementById("summary-strongest").textContent = summary.strongestArea || "—";
  document.getElementById("summary-gap").textContent = summary.gap || "—";

  const reportButton = document.getElementById("btn-compile-report");
  const reportStatus = document.getElementById("report-request-status");
  const isCompiling = state.reportRequestStatus === "submitting";
  reportButton.disabled = isCompiling;
  reportButton.textContent = isCompiling ? "Compiling report…" : "Compile report";
  reportStatus.dataset.state = state.reportRequestStatus || "idle";
  reportStatus.textContent = isCompiling
    ? "Building your competency report…"
    : state.reportRequestStatus === "error"
      ? state.reportRequestError || "The report could not be requested. Try again."
      : "";
}

function renderReport(state) {
  const report = state.report;
  if (!report) return;

  const domainCount = report.domains?.length ?? 0;
  const verdictEl = document.getElementById("report-verdict");
  const percentageEl = document.createElement("span");
  percentageEl.className = "mono";
  percentageEl.textContent = `${Math.round(report.overallPercentage)}%`;
  verdictEl.replaceChildren(
    "You scored ",
    percentageEl,
    ` (${report.overallScore} / ${report.overallMax} pts) across ${domainCount} domain${domainCount === 1 ? "" : "s"}.`,
  );

  const tbody = document.getElementById("report-table-body");
  tbody.innerHTML = "";
  for (const d of report.domains || []) {
    const tr = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = d.name;
    const scoreCell = document.createElement("td");
    scoreCell.className = "mono";
    scoreCell.textContent = `${d.score} / ${d.max}`;
    const percentageCell = document.createElement("td");
    percentageCell.className = "mono";
    percentageCell.textContent = `${Math.round(d.percentage)}%`;
    tr.append(nameCell, scoreCell, percentageCell);
    tbody.appendChild(tr);
  }

  const strongestEl = document.getElementById("report-strongest");
  strongestEl.innerHTML = "";
  for (const area of report.strongestAreas || []) {
    const li = document.createElement("li");
    li.textContent = area;
    strongestEl.appendChild(li);
  }

  const priorityEl = document.getElementById("report-priority");
  priorityEl.innerHTML = "";
  for (const item of report.priorityAreas || []) {
    const div = document.createElement("div");
    div.className = "report-priority-item";
    const h3 = document.createElement("h3");
    h3.textContent = item.name;
    div.appendChild(h3);
    if (item.concepts?.length) {
      const ul = document.createElement("ul");
      for (const concept of item.concepts) {
        const li = document.createElement("li");
        li.textContent = concept;
        ul.appendChild(li);
      }
      div.appendChild(ul);
    }
    priorityEl.appendChild(div);
  }

  const recEl = document.getElementById("report-recommendations");
  recEl.innerHTML = "";
  for (const rec of report.recommendations || []) {
    const li = document.createElement("li");
    li.textContent = rec;
    recEl.appendChild(li);
  }

  document.getElementById("report-next-challenge").textContent = report.nextChallenge || "";
}

function render(state) {
  latestState = state;
  showView(state.view);
  if (state.view === "domains") renderDomains(state);
  if (state.view === "quiz") renderQuiz(state);
  if (state.view === "summary") renderSummary(state);
  if (state.view === "report") renderReport(state);
  announce(state.announcement);
}

answerInput.addEventListener("input", updateAnswerControls);
answerInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey) || submitAnswerButton.disabled) return;
  event.preventDefault();
  answerForm.requestSubmit();
});
answerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const answer = answerInput.value.trim();
  const question = latestState?.question;
  if (!answer || !question?.id || locallySubmitting) return;

  locallySubmitting = true;
  localAnswerError = "";
  updateAnswerControls();
  updateScoreReveal();
  try {
    await postEvent({ type: "submit-answer", questionId: question.id, answer });
  } catch (err) {
    locallySubmitting = false;
    localAnswerError = err instanceof Error ? err.message : "Your answer could not be submitted. Try again.";
    updateAnswerControls();
    updateScoreReveal();
  }
});

document.getElementById("btn-choose-another").addEventListener("click", () => {
  sendEvent({ type: "choose-another-domain" });
});
document.getElementById("btn-report-choose-another").addEventListener("click", () => {
  sendEvent({ type: "choose-another-domain" });
});
document.getElementById("btn-compile-report").addEventListener("click", () => {
  sendEvent({ type: "compile-report" });
});

// ---------- Theme toggle ----------
// Local UI preference only — never sent to the extension/chat. Persisted per
// browser via localStorage so it survives canvas reopens.
const THEME_STORAGE_KEY = "brainmax-canvas-theme";
const themeToggleBtn = document.getElementById("theme-toggle");
const themeToggleLabel = document.getElementById("theme-toggle-label");

function applyTheme(theme) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
  const resolved =
    theme === "light" || theme === "dark"
      ? theme
      : window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
  themeToggleLabel.textContent = resolved.toUpperCase();
}

const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
applyTheme(storedTheme);

themeToggleBtn.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  const next = current === "light" ? "dark" : "light";
  localStorage.setItem(THEME_STORAGE_KEY, next);
  applyTheme(next);
});

const source = new EventSource(apiUrl("/events"));
source.onmessage = (e) => {
  const state = JSON.parse(e.data);
  render(state);
};
source.onerror = () => {
  // EventSource auto-reconnects; nothing to do here besides letting it retry.
};
