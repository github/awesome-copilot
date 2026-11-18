// The board page. Values are inserted with textContent / DOM APIs only, never as HTML.
export const PAGE_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agent Session Board</title>
<style>
  :root { color-scheme: light dark; --bg:#0f1115; --panel:#171a20; --line:#2a2f37; --text:#e6e8eb; --muted:#9aa3ad;
    --ok:#3fb950; --run:#d29922; --bad:#f85149; --info:#58a6ff; --draft:#8b949e; --lock:#bc8cff; --none:#6e7681; }
  /* Light theme status colors reach at least 4.5:1 on white for the 11-13px text that uses them. */
  @media (prefers-color-scheme: light) { :root { --bg:#f6f8fa; --panel:#fff; --line:#d0d7de; --text:#1f2328; --muted:#59636e; --none:#6e7781;
    --ok:#1a7f37; --run:#9a6700; --bad:#cf222e; --info:#0969da; --draft:#59636e; --lock:#8250df; } }
  * { box-sizing:border-box; }
  body { margin:0; font:13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; background:var(--bg); color:var(--text); }
  header { display:flex; flex-wrap:wrap; gap:6px 14px; align-items:center; padding:10px 16px; border-bottom:1px solid var(--line); position:sticky; top:0; background:var(--bg); z-index:2; }
  header h1 { font-size:15px; margin:0; }
  .meta { color:var(--muted); display:flex; flex-wrap:wrap; gap:4px 12px; }
  .meta b { color:var(--text); font-weight:600; }
  .spacer { flex:1; }
  .demo { font-size:11px; border:1px solid var(--lock); color:var(--lock); border-radius:10px; padding:0 8px; }
  button { font:inherit; color:var(--text); background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:4px 10px; cursor:pointer; }
  button:hover { border-color:var(--info); }
  button:disabled { opacity:.6; cursor:default; }
  :focus-visible { outline:2px solid var(--info); outline-offset:2px; }
  a, .ref { color:var(--info); text-decoration:none; } a:hover { text-decoration:underline; }
  main { display:grid; grid-template-columns:minmax(0, 2fr) minmax(0, 1fr); gap:12px; padding:12px 16px 20px; align-items:start; }
  @media (max-width: 1000px) { main { grid-template-columns:minmax(0, 1fr); } }
  .col { display:flex; flex-direction:column; gap:12px; min-width:0; }
  .full { grid-column:1 / -1; }
  section { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:10px 12px; min-width:0; }
  h2 { font-size:13px; margin:0 0 8px; color:var(--muted); font-weight:600; display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; }
  h2 .sub { font-weight:400; font-size:12px; }
  ul { list-style:none; margin:0; padding:0; }
  li { padding:4px 0; border-top:1px solid var(--line); } li:first-child { border-top:0; }
  .muted { color:var(--muted); }
  .badge { display:inline-block; font-size:11px; padding:0 6px; border-radius:10px; border:1px solid currentColor; margin-right:5px; white-space:nowrap; }
  .g-mergeable{color:var(--ok)} .g-review-required,.g-no-head-review,.g-unresolved-threads{color:var(--info)} .g-ci-running,.g-threads-unknown,.g-mergeability-unknown,.g-behind,.g-blocked{color:var(--run)}
  .g-ci-failed,.g-conflict,.g-changes-requested{color:var(--bad)} .g-draft{color:var(--draft)}
  .t-lock,.t-reserved{color:var(--lock)} .t-lock-expired{color:var(--bad)}
  .w-error{color:var(--bad)} .w-warn{color:var(--run)} .w-info{color:var(--info)}
  .w-item { display:flex; gap:6px; } .w-item .lvl { flex:none; font-size:11px; }
  section.setup { border:2px solid var(--bad); }
  section.setup h2 { color:var(--text); font-size:14px; }
  section.setup ol { margin:0; padding-left:20px; } section.setup li { border:0; }
  section.setup code { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; }
  section.decide { border:2px solid var(--run); }
  section.decide.clear { border-color:var(--line); }
  section.decide h2 { color:var(--text); font-size:14px; }
  .count { display:inline-block; min-width:22px; text-align:center; border-radius:11px; background:var(--run); color:var(--bg); font-size:12px; padding:0 7px; }
  .count.zero { background:var(--ok); }
  .dec { padding:8px 0; }
  .dec .title { font-weight:600; font-size:13.5px; }
  .opts { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; align-items:center; }
  .opts .opt { border-color:var(--info); }
  .opts input { flex:1; min-width:180px; font:inherit; color:var(--text); background:var(--bg); border:1px solid var(--line); border-radius:6px; padding:4px 8px; }
  .answered { color:var(--ok); margin-top:4px; }
  .grp { margin:8px 0 2px; font-size:11px; letter-spacing:.04em; text-transform:uppercase; color:var(--muted); }
  .trow { display:grid; grid-template-columns:minmax(120px, 190px) minmax(160px, 1fr) minmax(0, 1.3fr); gap:10px; align-items:start; padding:6px 0; border-top:1px solid var(--line); }
  .trow:first-of-type { border-top:0; }
  .tname { font-weight:600; display:flex; gap:6px; align-items:center; }
  .tname .sw { width:10px; height:10px; border-radius:2px; background:var(--c); flex:none; }
  .tnote { color:var(--muted); font-size:12px; font-weight:400; }
  .bar { height:10px; background:var(--line); border-radius:5px; overflow:hidden; margin-top:3px; }
  .bar > span { display:block; height:100%; background:var(--c, var(--info)); }
  .bar.done > span { background:var(--ok); }
  .stat { color:var(--muted); font-size:12px; margin-top:3px; font-variant-numeric:tabular-nums; }
  .chips { display:flex; flex-wrap:wrap; gap:4px; }
  .chip { font-size:12px; border:1px solid var(--line); border-radius:6px; padding:1px 6px; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ready { color:var(--ok); font-weight:600; }
  .erow { display:grid; grid-template-columns:minmax(120px, 190px) 1fr 110px; gap:10px; align-items:center; padding:3px 0; }
  .cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(290px, 1fr)); gap:10px; }
  .card { border:1px solid var(--line); border-left:4px solid var(--c, var(--line)); border-radius:6px; padding:8px 10px; min-width:0; }
  .card h3 { font-size:13px; margin:0; display:flex; justify-content:space-between; gap:8px; }
  .card .sub { color:var(--muted); font-size:12px; margin:2px 0 6px; }
  .card li { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .idle { color:var(--run); font-weight:600; }
  .legend { display:flex; flex-wrap:wrap; gap:10px; margin-top:6px; color:var(--muted); font-size:12px; }
  .legend span::before { content:""; display:inline-block; width:10px; height:10px; border-radius:2px; background:var(--c); margin-right:4px; vertical-align:-1px; }
  svg { display:block; }
  svg text { fill:var(--muted); font-size:10px; }
  details summary { cursor:pointer; color:var(--muted); }
  details.data { margin-top:6px; } details.more summary { padding:4px 0; }
  table.dt { border-collapse:collapse; margin-top:6px; font-size:12px; font-variant-numeric:tabular-nums; }
  table.dt th, table.dt td { border:1px solid var(--line); padding:2px 8px; text-align:right; }
  table.dt th[scope=row], table.dt thead th:first-child { text-align:left; }
  pre { white-space:pre-wrap; margin:4px 0 0; color:var(--muted); font-size:11px; }
  .lockbox { font-size:14px; margin:0 0 6px; }
  .sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
  .skip { position:absolute; left:-9999px; } .skip:focus { left:16px; top:8px; z-index:3; background:var(--panel); padding:4px 8px; }
  table.sr td, table.sr th { padding:0; }
</style>
</head>
<body>
<a class="skip" href="#h-decisions" data-i18n="skip">Skip to decisions</a>
<header>
  <h1 data-i18n="title">Agent Session Board</h1>
  <span id="demo" class="demo" hidden data-i18n="demo">demo data</span>
  <div class="meta" id="meta" aria-describedby="status"></div>
  <span class="spacer"></span>
  <button type="button" id="refresh" data-i18n="refresh">Refresh</button>
</header>
<p id="status" class="sr" role="status" aria-live="polite"></p>
<main>
  <section class="full setup" id="setup" hidden role="alert" aria-labelledby="h-setup">
    <h2 id="h-setup"></h2>
    <ol id="setup-steps"></ol>
  </section>
  <div class="col">
    <section class="decide" id="decide" aria-labelledby="h-decisions">
      <h2 id="h-decisions" tabindex="-1"><span data-i18n="decisions">Waiting on you</span> <span id="qcount" class="count"></span></h2>
      <ul id="queue"></ul>
    </section>
    <section aria-labelledby="h-tracks"><h2 id="h-tracks"><span data-i18n="tracks">Progress by track</span> <span class="sub muted" id="overall"></span></h2><div id="tracks"></div><div id="epics"></div></section>
  </div>
  <div class="col">
    <section aria-labelledby="h-warnings"><h2 id="h-warnings" data-i18n="warnings">Warnings</h2><ul id="warnings"></ul></section>
    <section aria-labelledby="h-lock"><h2 id="h-lock" data-i18n="lock">Merge lock</h2><div id="lock"></div></section>
    <section aria-labelledby="h-days"><h2 id="h-days" data-i18n="days">Merges, last 7 days (daily)</h2><div id="days"></div><div class="legend" id="days-legend"></div><details class="data"><summary data-i18n="dataTable">Data table</summary><div id="days-table"></div></details></section>
  </div>
  <section class="full" aria-labelledby="h-sessions"><h2 id="h-sessions" data-i18n="sessions">Sessions</h2><div class="cards" id="sessions"></div></section>
  <section class="full" aria-labelledby="h-hours"><h2 id="h-hours" data-i18n="hours">Merges, last 24 hours (hourly)</h2><div id="hours"></div><div class="legend" id="hours-legend"></div><details class="data"><summary data-i18n="dataTable">Data table</summary><div id="hours-table"></div></details></section>
  <section class="full" aria-labelledby="h-merged"><h2 id="h-merged" data-i18n="recent">Recent merges (7 days)</h2><ul id="merged"></ul></section>
</main>
<script>
"use strict";
const STR = {
  en: {
    title: "Agent Session Board", demo: "demo data", refresh: "Refresh", skip: "Skip to decisions",
    decisions: "Waiting on you", warnings: "Warnings", tracks: "Progress by track", lock: "Merge lock", sessions: "Sessions",
    hours: "Merges, last 24 hours (hourly)", days: "Merges, last 7 days (daily)", recent: "Recent merges (7 days)",
    openPrs: "open PRs", merged24: "merged 24h", merged7: "7d", api: "API left", updated: "updated",
    memFree: "free memory", swap: "swap", heavy: "heavy jobs", partial: "partial",
    setup: {
      gh_missing: "Install the GitHub CLI to load this repository",
      gh_signed_out: "Sign in to the GitHub CLI to load this repository",
      install: "Install the GitHub CLI from https://cli.github.com",
      login: "Run gh auth login in a terminal and sign in to github.com",
      refresh: "Press Refresh. To look around first, open the board with { \"demo\": true }.",
    },
    dataTable: "Data table", hourCol: "Hour", dayCol: "Day", total: "Total", stale: "This question changed. The board was reloaded; please answer again.",
    loading: "Loading…", loaded: "Board updated", loadFailed: "Could not load the board: ",
    nothingPending: "Nothing waiting on you.", send: "Send", typeAnswer: "Type an answer", changeAnswer: "Change answer",
    answerFor: "Answer for: ", saving: "Saving answer…", saved: "Answer saved", saveFailed: "Could not save the answer: ",
    answered: "Answered", awaitingPickup: "waiting for the agent to pick it up", fromLabel: "Raised by the GitHub label; options are in the issue.",
    noWarnings: "No warnings.", details: "Details",
    noTracks: "No tracks configured. Use configure_board with tracks to group issues by label.",
    overall: "overall", ready: "Ready: all issues closed", noOpen: "No open issues", noIssues: "No issues with this label",
    tasks: "tasks", issuesClosed: "issues closed",
    epics: "Epics", epicDone: "done", untracked: "Untracked", unassigned: "Unassigned",
    lockOff: "No coordination issue configured. Set coordinationIssue to read merge-lock comments.",
    lockFree: "Nobody holds the merge lock.", held: "held", expired: "expired", until: (t) => "until " + t,
    queue: "Reserved, in order", lockLog: "Recent lock comments",
    noSessions: "No open PRs.", noOpenPrs: "No open PRs", lastActivity: "last activity", idleFor: "idle", more: "more",
    checks: "checks", none: "None.",
    chartHours: "Merges per hour over the last 24 hours, stacked by track. Peak: ",
    chartDays: "Merges per day over the last 7 days, stacked by track. Peak: ",
    min: "min", h: "h", ago: " ago", justNow: "just now",
    gate: { draft: "Draft", conflict: "Conflict", "ci-failed": "CI failed", "ci-running": "CI running", "changes-requested": "Changes requested",
      "unresolved-threads": "{n} unresolved", "review-required": "Awaiting review", "no-head-review": "No review on latest commit", mergeable: "Mergeable",
      "threads-unknown": "Threads not fully loaded", "mergeability-unknown": "Checking mergeability",
      behind: "Behind base branch", blocked: "Blocked by branch rules" },
    tag: { lock: "holds lock", "lock-expired": "lock expired", reserved: "reserved" },
    level: { error: "Error", warn: "Warning", info: "Note" },
    w: {
      collect_error: (p) => "Could not load " + p.source + ": " + p.message,
      api_low: (p) => "GitHub API budget low: " + p.remaining + "/" + p.limit + " left",
      lock_expired: (p) => "The merge lock on #" + p.pr + " passed its expiry without a release",
      lock_conflict: (p) => "Locked or reserved PR #" + p.pr + " has merge conflicts",
      conflict: (p) => "#" + p.pr + " has merge conflicts",
      ci_failed: (p) => "#" + p.pr + " CI failed",
      stale_pr: (p) => "#" + p.pr + " has had no activity for " + p.hours + "h",
      session_idle: (p) => p.session + ": no PR activity for " + dur(p.minutes),
      memory_low: (p) => "Free memory " + p.freePct + "%",
      swap_high: (p) => "Swap " + (p.usedMb / 1024).toFixed(1) + " of " + (p.totalMb / 1024).toFixed(1) + " GB in use",
      heavy_jobs: (p) => p.count + " heavy local jobs running (limit " + p.max + ")",
      more_warnings: (p) => p.count + " more warnings",
      open_prs_incomplete: (p) => "Showing " + p.shown + " of " + p.total + " open PRs; the rest were not loaded",
      merges_incomplete: (p) => "Merge history is partial (" + p.shown + " loaded); totals are lower bounds",
      track_incomplete: (p) => p.track + ": too many issues to load; progress is partial",
      decisions_incomplete: (p) => "More labeled decision issues exist than the " + p.shown + " loaded",
      lock_ignored: (p) => "Ignored " + p.count + " lock comments from authors without verified write access",
      lock_unverified: (p) => "Could not verify the authors of " + p.count + " lock comments; the lock lane may be incomplete",
      gh_missing: () => "The GitHub CLI (gh) is not installed",
      gh_signed_out: () => "The GitHub CLI is not signed in to github.com",
      pattern_skipped: (p) => "Pattern " + p.pattern + " took too long and was skipped; simplify it",
      attribution_incomplete: (p) => "Track attribution is partial: " + p.labels + " items had more labels than loaded, " + p.refs + " referenced issues were not resolved",
    },
  },
  ko: {
    title: "에이전트 세션 관제판", demo: "데모 데이터", refresh: "새로고침", skip: "결정 대기열로 건너뛰기",
    decisions: "내가 정할 것", warnings: "경고", tracks: "트랙별 진척", lock: "머지 잠금", sessions: "세션",
    hours: "지난 24시간 머지(시간별)", days: "지난 7일 머지(일별)", recent: "최근 머지(7일)",
    openPrs: "열린 PR", merged24: "머지 24시간", merged7: "7일", api: "API 남음", updated: "갱신",
    memFree: "메모리 여유", swap: "스왑", heavy: "무거운 작업", partial: "부분 값",
    setup: {
      gh_missing: "이 저장소를 불러오려면 GitHub CLI를 설치하세요",
      gh_signed_out: "이 저장소를 불러오려면 GitHub CLI에 로그인하세요",
      install: "https://cli.github.com 에서 GitHub CLI를 설치합니다",
      login: "터미널에서 gh auth login을 실행해 github.com에 로그인합니다",
      refresh: "새로고침을 누릅니다. 먼저 둘러보려면 { \"demo\": true }로 보드를 엽니다.",
    },
    dataTable: "데이터 표", hourCol: "시각", dayCol: "날짜", total: "합계", stale: "질문이 바뀌어 다시 불러왔습니다. 다시 답해 주세요.",
    loading: "불러오는 중…", loaded: "갱신됨", loadFailed: "불러오지 못함: ",
    nothingPending: "지금 정할 것 없음.", send: "보내기", typeAnswer: "직접 적기", changeAnswer: "답 바꾸기",
    answerFor: "답: ", saving: "답 저장 중…", saved: "답을 저장했습니다", saveFailed: "답 저장 실패: ",
    answered: "답함", awaitingPickup: "에이전트 확인 대기", fromLabel: "GitHub 라벨로 올라온 결정. 선택지는 이슈에 있다.",
    noWarnings: "경고 없음.", details: "자세히",
    noTracks: "트랙이 설정되지 않음. configure_board의 tracks로 라벨별 묶음을 정한다.",
    overall: "전체", ready: "준비됨: 이슈 모두 닫힘", noOpen: "열린 이슈 없음", noIssues: "이 라벨의 이슈 없음",
    tasks: "할 일", issuesClosed: "이슈 닫힘",
    epics: "에픽", epicDone: "완료", untracked: "트랙 없음", unassigned: "미배정",
    lockOff: "조율 이슈가 설정되지 않음. coordinationIssue를 정하면 잠금 코멘트를 읽는다.",
    lockFree: "지금 머지 잠금 없음.", held: "보유", expired: "만료", until: (t) => t + "까지",
    queue: "예약 순서", lockLog: "최근 잠금 기록",
    noSessions: "열린 PR 없음.", noOpenPrs: "열린 PR 없음", lastActivity: "마지막 활동", idleFor: "멈춤", more: "개 더",
    checks: "검사", none: "없음.",
    chartHours: "지난 24시간 시간별 머지 수, 트랙별 누적. 최대: ",
    chartDays: "지난 7일 일별 머지 수, 트랙별 누적. 최대: ",
    min: "분", h: "시간", ago: " 전", justNow: "방금",
    gate: { draft: "초안", conflict: "충돌", "ci-failed": "CI 실패", "ci-running": "CI 진행 중", "changes-requested": "변경 요청",
      "unresolved-threads": "미해결 스레드 {n}", "review-required": "리뷰 대기", "no-head-review": "최신 커밋 리뷰 없음", mergeable: "머지 가능",
      "threads-unknown": "스레드 일부만 확인", "mergeability-unknown": "머지 가능 여부 계산 중",
      behind: "기준 브랜치보다 뒤처짐", blocked: "브랜치 규칙에 막힘" },
    tag: { lock: "잠금 보유", "lock-expired": "잠금 만료", reserved: "예약" },
    level: { error: "오류", warn: "경고", info: "알림" },
    w: {
      collect_error: (p) => p.source + " 수집 실패: " + p.message,
      api_low: (p) => "GitHub API 남은 호출 " + p.remaining + "/" + p.limit,
      lock_expired: (p) => "#" + p.pr + "의 머지 잠금이 만료됐는데 해제되지 않음",
      lock_conflict: (p) => "잠금·예약 PR #" + p.pr + "에 충돌",
      conflict: (p) => "#" + p.pr + " 충돌",
      ci_failed: (p) => "#" + p.pr + " CI 실패",
      stale_pr: (p) => "#" + p.pr + " " + p.hours + "시간째 활동 없음",
      session_idle: (p) => p.session + ": PR 활동이 " + dur(p.minutes) + "째 없음",
      memory_low: (p) => "메모리 여유 " + p.freePct + "%",
      swap_high: (p) => "스왑 " + (p.usedMb / 1024).toFixed(1) + " / " + (p.totalMb / 1024).toFixed(1) + " GB 사용",
      heavy_jobs: (p) => "무거운 로컬 작업 " + p.count + "개(상한 " + p.max + ")",
      more_warnings: (p) => "경고 " + p.count + "개 더",
      open_prs_incomplete: (p) => "열린 PR " + p.total + "개 중 " + p.shown + "개만 불러옴",
      merges_incomplete: (p) => "머지 기록 일부만 불러옴(" + p.shown + "개). 합계는 최소값",
      track_incomplete: (p) => p.track + ": 이슈가 너무 많아 진척이 부분 값",
      decisions_incomplete: (p) => "결정 라벨 이슈가 불러온 " + p.shown + "개보다 많음",
      lock_ignored: (p) => "쓰기 권한이 확인되지 않은 작성자의 잠금 코멘트 " + p.count + "개 무시",
      lock_unverified: (p) => "잠금 코멘트 " + p.count + "개의 작성자를 확인하지 못함. 잠금 줄이 불완전할 수 있음",
      gh_missing: () => "GitHub CLI(gh)가 설치되지 않음",
      gh_signed_out: () => "GitHub CLI가 github.com에 로그인되지 않음",
      pattern_skipped: (p) => "패턴 " + p.pattern + "이 너무 오래 걸려 건너뜀. 패턴을 단순하게 바꿀 것",
      attribution_incomplete: (p) => "트랙 귀속이 부분 값: 라벨이 잘린 항목 " + p.labels + "개, 확인하지 못한 참조 이슈 " + p.refs + "개",
    },
  },
};
// English unless the board is configured otherwise (configure_board language); the browser locale is not used.
let LANG = "en";
let T = STR.en;
function applyLanguage(lang) {
  LANG = STR[lang] ? lang : "en";
  T = STR[LANG];
  document.documentElement.lang = LANG;
  for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = T[node.dataset.i18n];
  document.title = T.title;
}
applyLanguage("en");

// Track colors also color text (badges), so the light theme uses darker shades with enough contrast on white.
const LIGHT = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
const COLORS = LIGHT
  ? ["#0969da", "#1a7f37", "#9a6700", "#8250df", "#bf3989", "#1b7c83", "#cf222e", "#0550ae", "#116329"]
  : ["#58a6ff", "#3fb950", "#d29922", "#bc8cff", "#f778ba", "#39c5cf", "#ff7b72", "#a5d6ff", "#7ee787"];
const UNTRACKED_COLOR = LIGHT ? "#6e7781" : "#6e7681";
// Track labels are user text, so per-label counts are read only from own properties.
const countOf = (counts, label) => (Object.hasOwn(counts, label) ? counts[label] : 0);
const NS = "http://www.w3.org/2000/svg";
const $ = (id) => document.getElementById(id);
let lastState = null;
// Typed answers survive the periodic re-render: drafts are kept by decision id and focus is restored.
const drafts = new Map();

function el(tag, props, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style") node.setAttribute("style", v);
    else if (k.startsWith("aria-") || k === "role" || k === "title" || k === "hidden") node.setAttribute(k, v === true ? "" : String(v));
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node[k] = v;
  }
  for (const kid of kids) if (kid !== null && kid !== undefined && kid !== false) node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return node;
}
function link(url, text) {
  return /^https:\/\/github\.com\//.test(url || "") ? el("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, text) : el("span", { class: "ref" }, text);
}
function dur(m) {
  return m < 120 ? m + T.min : Math.round(m / 60) + T.h;
}
function ago(iso) {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 1) return T.justNow;
  return (m < 60 ? m + T.min : Math.round(m / 60) + T.h) + T.ago;
}
function clock(iso) {
  return iso ? new Date(iso).toLocaleTimeString(LANG, { hour: "2-digit", minute: "2-digit" }) : "";
}
function dayTime(iso) {
  return iso ? new Date(iso).toLocaleString(LANG, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
}
function badge(cls, text) { return el("span", { class: "badge " + cls }, text); }
function gateText(pr) { return (T.gate[pr.gate] || pr.gate).replace("{n}", String(pr.unresolvedThreads || 0)); }
function trackColors(s) {
  const out = new Map();
  s.trackOrder.forEach((t, i) => out.set(t.label, t.label === "" ? UNTRACKED_COLOR : COLORS[i % COLORS.length]));
  return out;
}
function trackName(s, label) {
  if (label === "") return T.untracked;
  return (s.trackOrder.find((t) => t.label === label) || { name: label }).name;
}

function renderHeader(s) {
  $("demo").hidden = !s.demo;
  const meta = $("meta");
  // Optional parts are null when absent; replaceChildren would print them as text, so they are filtered out.
  meta.replaceChildren(...[
    el("span", {}, el("b", {}, s.repo)),
    el("span", {}, T.openPrs + " ", el("b", {}, String(s.openPrTotal))),
    el("span", {}, T.merged24 + " ", el("b", {}, String(s.merged24.length)), " / " + T.merged7 + " ", el("b", {}, String(s.mergedWeek.length))),
    s.rate ? el("span", {}, T.api + " ", el("b", {}, s.rate.remaining + "/" + s.rate.limit)) : null,
    s.local && s.local.freePct != null ? el("span", {}, T.memFree + " ", el("b", {}, s.local.freePct + "%")) : null,
    s.local && s.local.swapTotalMb ? el("span", {}, T.swap + " ", el("b", {}, (s.local.swapUsedMb / 1024).toFixed(1) + "/" + (s.local.swapTotalMb / 1024).toFixed(1) + " GB")) : null,
    s.local ? el("span", {}, T.heavy + " ", el("b", {}, String(s.local.heavy || 0))) : null,
    el("span", {}, T.updated + " " + clock(s.generatedAt)),
  ].filter(Boolean));
}

function decisionItem(item) {
  const li = el("li", { class: "dec" });
  li.append(el("div", { class: "title" }, item.url ? link(item.url, item.title) : item.title));
  const detail = item.source === "label" ? T.fromLabel : item.detail;
  if (detail) li.append(el("div", { class: "muted" }, detail));
  if (item.answer) li.append(el("div", { class: "answered" }, T.answered + " (" + clock(item.answer.at) + "): " + item.answer.answer + " · " + T.awaitingPickup));
  const opts = el("div", { class: "opts" });
  for (const opt of item.options || []) opts.append(el("button", { type: "button", class: "opt", onclick: () => answer(item, opt) }, opt));
  const input = el("input", { type: "text", maxLength: 1000, placeholder: item.answer ? T.changeAnswer : T.typeAnswer, "aria-label": T.answerFor + item.title });
  input.dataset.decision = item.id;
  input.value = drafts.get(item.id) || "";
  input.addEventListener("input", () => { if (input.value) drafts.set(item.id, input.value); else drafts.delete(item.id); });
  const submit = () => { const v = input.value.trim(); if (v) answer(item, v); };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  opts.append(input, el("button", { type: "button", onclick: submit }, T.send));
  li.append(opts);
  return li;
}

function renderDecisions(s) {
  const q = $("queue");
  const active = document.activeElement;
  const focusId = active && active.dataset && active.dataset.decision ? active.dataset.decision : null;
  const selection = focusId ? [active.selectionStart, active.selectionEnd] : null;
  q.replaceChildren();
  const pending = s.decisions.filter((d) => !d.answer);
  const count = $("qcount");
  count.textContent = String(pending.length);
  count.className = "count" + (pending.length ? "" : " zero");
  $("decide").classList.toggle("clear", pending.length === 0);
  document.title = (pending.length ? "(" + pending.length + ") " : "") + T.title;
  if (!s.decisions.length) q.append(el("li", { class: "muted" }, T.nothingPending));
  for (const item of [...pending, ...s.decisions.filter((d) => d.answer)]) q.append(decisionItem(item));
  for (const id of [...drafts.keys()]) if (!s.decisions.some((d) => d.id === id)) drafts.delete(id);
  if (focusId) {
    const again = [...q.querySelectorAll("input")].find((i) => i.dataset.decision === focusId);
    if (again) { again.focus(); again.setSelectionRange(selection[0], selection[1]); }
  }
}

function renderWarnings(s) {
  const w = $("warnings");
  w.replaceChildren();
  if (!s.warnings.length) w.append(el("li", { class: "muted" }, T.noWarnings));
  for (const item of s.warnings) {
    const fn = T.w[item.code];
    const li = el("li", { class: "w-item w-" + item.level }, el("span", { class: "badge lvl" }, T.level[item.level] || item.level), el("span", {}, fn ? fn(item.params || {}) : item.code));
    w.append(li);
  }
}

function bar(pct, color, done, label) {
  return el("div", { class: "bar" + (done ? " done" : ""), style: "--c:" + color, role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct), "aria-label": label }, el("span", { style: "width:" + pct + "%" }));
}

function renderTracks(s) {
  const colors = trackColors(s);
  const box = $("tracks");
  box.replaceChildren();
  $("overall").textContent = s.overall == null ? "" : T.overall + " " + s.overall + "%";
  let group = null;
  for (const t of s.tracks) {
    if (t.group && t.group !== group) { box.append(el("div", { class: "grp" }, t.group)); group = t.group; }
    const name = el("div", {}, el("div", { class: "tname" }, el("span", { class: "sw", style: "--c:" + colors.get(t.label) }), t.name), t.note ? el("div", { class: "tnote" }, t.note) : null);
    const stat = el("div", {}, bar(t.pct, colors.get(t.label), t.ready, t.name),
      el("div", { class: "stat" }, t.total
        ? (t.complete === false ? T.partial + " · " : "") + t.pct + "% · " + T.tasks + " " + t.tasksDone + "/" + t.tasks + " · " + T.issuesClosed + " " + t.closed + "/" + t.total + " · " + T.merged24 + " " + t.merged24 + " / " + T.merged7 + " " + t.merged7
        : T.noIssues));
    const chips = el("div", { class: "chips" });
    if (t.ready) chips.append(el("span", { class: "ready" }, T.ready));
    for (const i of t.openIssues.slice(0, 8)) chips.append(el("span", { class: "chip", title: i.title }, link(i.url, "#" + i.number), " " + i.title));
    if (t.openIssues.length > 8) chips.append(el("span", { class: "muted" }, "+" + (t.openIssues.length - 8) + " " + T.more));
    if (!t.ready && t.total && !t.openIssues.length) chips.append(el("span", { class: "muted" }, T.noOpen));
    box.append(el("div", { class: "trow" }, name, stat, chips));
  }
  if (!s.tracks.length) box.append(el("p", { class: "muted" }, T.noTracks));
  const epics = $("epics");
  epics.replaceChildren();
  if (s.epics.length) epics.append(el("div", { class: "grp" }, T.epics));
  for (const e of s.epics) {
    const done = e.state === "CLOSED";
    epics.append(el("div", { class: "erow" }, el("div", {}, e.url ? link(e.url, "#" + e.number) : el("span", { class: "ref" }, "#" + e.number), " " + e.name),
      bar(e.pct, "var(--info)", done, e.name), el("div", { class: "stat" }, (done ? T.epicDone : e.pct + "%") + (e.total ? " · " + e.completed + "/" + e.total : ""))));
  }
}

function renderLock(s) {
  const box = $("lock");
  box.replaceChildren();
  if (!s.lock.enabled) { box.append(el("p", { class: "muted" }, T.lockOff)); return; }
  const h = s.lock.holder;
  const prUrl = (n) => (s.prs.find((p) => p.number === n) || {}).url;
  box.append(el("p", { class: "lockbox" }, h
    ? el("span", {}, badge(h.expired ? "t-lock-expired" : "t-lock", h.expired ? T.expired : T.held), link(prUrl(h.pr), "#" + h.pr), h.until ? "  " + T.until(clock(h.until)) : "", el("span", { class: "muted" }, "  (" + ago(h.since) + ")"))
    : el("span", { class: "muted" }, T.lockFree)));
  if (s.lock.reservations.length) {
    box.append(el("div", { class: "muted" }, T.queue));
    const ul = el("ul");
    s.lock.reservations.forEach((r, i) => ul.append(el("li", {}, (i + 1) + ". ", badge("t-reserved", T.tag.reserved), link(prUrl(r.pr), "#" + r.pr), el("span", { class: "muted" }, "  " + ago(r.at)))));
    box.append(ul);
  }
  if (s.lock.events.length) {
    const ul = el("ul");
    for (const e of s.lock.events.slice().reverse()) ul.append(el("li", {}, el("span", { class: "muted" }, clock(e.at) + "  "), link(e.url, e.line)));
    box.append(el("details", {}, el("summary", {}, T.lockLog), ul));
  }
}

function prLine(pr) {
  const li = el("li", { title: pr.title }, badge("g-" + pr.gate, gateText(pr)));
  for (const t of pr.tags) li.append(badge("t-" + t, T.tag[t] || t));
  li.append(link(pr.url, "#" + pr.number), " " + pr.title);
  return li;
}

function renderSessions(s) {
  const box = $("sessions");
  box.replaceChildren();
  s.sessions.forEach((c, i) => {
    const color = c.id === null ? UNTRACKED_COLOR : COLORS[i % COLORS.length];
    const name = c.id === null ? T.unassigned : c.name;
    const head = el("h3", {}, el("span", {}, name), el("span", { class: "muted" }, T.merged24 + " " + c.merged24));
    const card = el("article", { class: "card", style: "--c:" + color, "aria-label": name }, head);
    const sub = [c.note, c.lastActivity ? T.lastActivity + " " + ago(c.lastActivity) : ""].filter(Boolean).join(" · ");
    if (sub || c.idle) card.append(el("div", { class: "sub" }, c.idle ? el("span", { class: "idle" }, T.idleFor + " " + dur(c.idleMinutes) + " · ") : null, sub));
    const ul = el("ul");
    if (!c.prs.length) ul.append(el("li", { class: "muted" }, T.noOpenPrs));
    for (const pr of c.prs.slice(0, 8)) ul.append(prLine(pr));
    card.append(ul);
    if (c.prs.length > 8) {
      const rest = el("ul");
      for (const pr of c.prs.slice(8)) rest.append(prLine(pr));
      card.append(el("details", { class: "more" }, el("summary", {}, "+" + (c.prs.length - 8) + " " + T.more), rest));
    }
    box.append(card);
  });
  if (!s.sessions.length) box.append(el("p", { class: "muted" }, T.noSessions));
}

function stackedChart(buckets, s, opts) {
  const colors = trackColors(s);
  const totals = buckets.map((b) => Object.values(b.counts).reduce((a, x) => a + x, 0));
  const max = Math.max(1, ...totals);
  const W = buckets.length * opts.step, H = 110;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + (H + 16));
  svg.setAttribute("width", "100%");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", opts.label + Math.max(0, ...totals));
  buckets.forEach((b, i) => {
    let y = H;
    for (const t of s.trackOrder) {
      const n = countOf(b.counts, t.label);
      if (!n) continue;
      const h = (n / max) * (H - 6);
      y -= h;
      const r = document.createElementNS(NS, "rect");
      r.setAttribute("x", i * opts.step + opts.pad);
      r.setAttribute("y", y);
      r.setAttribute("width", opts.step - opts.pad * 2);
      r.setAttribute("height", h);
      r.setAttribute("rx", 2);
      r.setAttribute("fill", colors.get(t.label));
      const title = document.createElementNS(NS, "title");
      title.textContent = opts.name(b) + " · " + trackName(s, t.label) + " " + n;
      r.append(title);
      svg.append(r);
    }
    if (opts.tick(i)) {
      const tx = document.createElementNS(NS, "text");
      tx.setAttribute("x", i * opts.step + opts.pad);
      tx.setAttribute("y", H + 12);
      tx.textContent = opts.name(b) + (opts.showTotal ? " (" + totals[i] + ")" : "");
      svg.append(tx);
    }
  });
  return svg;
}

// The same numbers as a chart, as a table that screen readers and keyboard users can step through.
function dataTable(buckets, s, firstColumn, name) {
  const tracks = s.trackOrder.filter((t) => buckets.some((b) => countOf(b.counts, t.label)));
  const head = el("tr", {}, el("th", { scope: "col" }, firstColumn), ...tracks.map((t) => el("th", { scope: "col" }, trackName(s, t.label))), el("th", { scope: "col" }, T.total));
  const rows = buckets.map((b) => el("tr", {}, el("th", { scope: "row" }, name(b)),
    ...tracks.map((t) => el("td", {}, String(countOf(b.counts, t.label)))),
    el("td", {}, String(Object.values(b.counts).reduce((a, x) => a + x, 0)))));
  return el("table", { class: "dt" }, el("thead", {}, head), el("tbody", {}, ...rows));
}

function legend(target, list, s) {
  const colors = trackColors(s);
  target.replaceChildren();
  for (const t of s.trackOrder) {
    const n = list.filter((pr) => pr.track === t.label).length;
    if (n) target.append(el("span", { style: "--c:" + colors.get(t.label) }, trackName(s, t.label) + " " + n));
  }
}

function renderFlow(s) {
  const hourName = (b) => b.key.slice(6) + ":00";
  $("hours").replaceChildren(stackedChart(s.hours, s, { step: 50, pad: 8, label: T.chartHours, name: hourName, tick: (i) => i % 3 === 0 }));
  $("days").replaceChildren(stackedChart(s.days, s, { step: 60, pad: 8, label: T.chartDays, name: (b) => b.key, tick: () => true, showTotal: true }));
  $("hours-table").replaceChildren(dataTable(s.hours, s, T.hourCol, (b) => b.key.slice(0, 5) + " " + hourName(b)));
  $("days-table").replaceChildren(dataTable(s.days, s, T.dayCol, (b) => b.key));
  legend($("hours-legend"), s.merged24, s);
  legend($("days-legend"), s.mergedWeek, s);
  const colors = trackColors(s);
  const ul = $("merged");
  ul.replaceChildren();
  if (!s.mergedWeek.length) ul.append(el("li", { class: "muted" }, T.none));
  for (const pr of s.mergedWeek.slice().reverse().slice(0, 40)) {
    ul.append(el("li", {}, el("span", { class: "muted" }, dayTime(pr.mergedAt) + "  "), el("span", { class: "badge", style: "color:" + colors.get(pr.track) }, trackName(s, pr.track)), link(pr.url, "#" + pr.number), " " + pr.title));
  }
}

function renderSetup(s) {
  const box = $("setup");
  box.hidden = !s.setup;
  if (!s.setup) return;
  $("h-setup").textContent = T.setup[s.setup] || s.setup;
  const steps = s.setup === "gh_missing" ? [T.setup.install, T.setup.login, T.setup.refresh] : [T.setup.login, T.setup.refresh];
  $("setup-steps").replaceChildren(...steps.map((step) => el("li", {}, step)));
}

function render(s) {
  if ((s.language || "en") !== LANG) applyLanguage(s.language || "en");
  lastState = s;
  renderHeader(s);
  renderSetup(s);
  renderDecisions(s);
  renderWarnings(s);
  renderTracks(s);
  renderLock(s);
  renderSessions(s);
  renderFlow(s);
}

async function answer(item, text) {
  const id = item.id;
  $("status").textContent = T.saving;
  try {
    const res = await fetch("api/answer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, rev: item.rev, answer: text }) });
    if (res.status === 409) {
      // Keep the typed draft; the question changed, so show the new version before answering again.
      $("status").textContent = T.stale;
      await load(true);
      return;
    }
    if (!res.ok) throw new Error(await res.text());
    drafts.delete(id);
    $("status").textContent = T.saved;
    await load(false);
  } catch (e) {
    $("status").textContent = T.saveFailed + e.message;
  }
}

async function load(force) {
  $("status").textContent = T.loading;
  $("refresh").disabled = true;
  try {
    const res = await fetch("api/state" + (force ? "?force=1" : ""), { cache: "no-store" });
    if (!res.ok) throw new Error(await res.text());
    render(await res.json());
    $("status").textContent = T.loaded;
  } catch (e) {
    $("status").textContent = T.loadFailed + e.message;
    if (!lastState) $("meta").textContent = T.loadFailed + e.message;
  } finally {
    $("refresh").disabled = false;
  }
}

$("refresh").addEventListener("click", () => load(true));
load(false);
setInterval(() => load(false), 180000);
</script>
</body>
</html>`;
