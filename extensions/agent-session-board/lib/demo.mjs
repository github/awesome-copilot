// Fictional data for demos and the preview image. Nothing here refers to a real repository or account.
const HOUR = 3600 * 1000;
const MIN = 60 * 1000;

export const DEMO_REPO = "example-org/demo-app";

export function demoBoard() {
    return {
        sessions: [
            { id: "api", name: "API worker", note: "Pagination and rate-limit handling", branchPatterns: ["^api/"], titlePatterns: [], prs: [] },
            { id: "web", name: "Web UI worker", note: "Settings page redesign", branchPatterns: ["^web/"], titlePatterns: [], prs: [] },
            { id: "docs", name: "Docs worker", note: "", branchPatterns: ["^docs/"], titlePatterns: ["^docs:"], prs: [] },
            { id: "infra", name: "Infra worker", note: "CI cache migration", branchPatterns: ["^infra/"], titlePatterns: [], prs: [] },
        ],
        tracks: [
            { label: "milestone: alpha", name: "Alpha", note: "Core API and login", group: "Milestones" },
            { label: "milestone: beta", name: "Beta", note: "Settings and billing", group: "Milestones" },
            { label: "area: docs", name: "Docs", note: "", group: "Areas", titlePattern: "^docs:" },
        ],
        epics: [
            { number: 10, name: "Alpha release", group: "" },
            { number: 11, name: "Beta release", group: "" },
        ],
        decisionLabel: "needs-decision",
        coordinationIssue: 1,
        localResources: { enabled: true, heavyPattern: "test-runner", maxHeavy: 3 },
        decisions: [
            {
                id: "cache-strategy",
                title: "Which cache should the API worker use for session tokens?",
                detail: "Both pass the load test; in-memory is simpler, the shared cache survives restarts.",
                url: "",
                options: ["In-memory", "Shared cache"],
            },
            {
                id: "beta-scope",
                title: "Ship billing in Beta or move it to the next milestone?",
                detail: "Billing has 3 open issues and one failing integration test.",
                url: "",
                options: ["Keep in Beta", "Move to next milestone"],
            },
        ],
    };
}

// Demo items carry no links so nothing points at a real page.
function url() {
    return "";
}

function iso(ms) {
    return new Date(ms).toISOString();
}

export function demoRaw(now = Date.now()) {
    const at = (minutesAgo) => iso(now - minutesAgo * MIN);
    const open = (number, title, headRefName, minutesAgo, extra) => ({
        number, title, url: url("pull", number), headRefName, updatedAt: at(minutesAgo),
        isDraft: false, mergeable: "MERGEABLE", mergeStateStatus: "CLEAN", reviewDecision: null, ci: "passed", checks: 6,
        unresolvedThreads: 0, headReviewed: true, ...extra,
    });
    const openPrs = [
        open(141, "Add cursor pagination to list endpoints", "api/pagination", 12, { reviewDecision: "APPROVED" }),
        open(143, "Retry on secondary rate limits", "api/rate-limit", 25, { ci: "running", checks: 6 }),
        open(138, "Settings page layout", "web/settings-layout", 40, { unresolvedThreads: 2 }),
        open(144, "Billing form validation", "web/billing-form", 18, { headReviewed: false }),
        open(139, "Theme tokens for dark mode", "web/theme-tokens", 200, { mergeable: "CONFLICTING" }),
        open(145, "docs: getting started rewrite", "docs/getting-started", 130, { isDraft: true, ci: "none", checks: 0, headReviewed: false }),
        open(142, "Move CI cache to new storage", "infra/ci-cache", 15, { ci: "failed" }),
        open(146, "Fix flaky login test", "fix/login-flake", 1600, { reviewDecision: "REVIEW_REQUIRED", headReviewed: false }),
    ];

    const alpha = { labels: ["milestone: alpha"] };
    const beta = { labels: ["milestone: beta"] };
    const plan = [
        // [number, title, branch, minutesAgo, own labels, refs]
        [120, "Login endpoint", "api/login", 6 * 24 * 60 + 200, ["milestone: alpha"], []],
        [121, "Session tokens", "api/tokens", 5 * 24 * 60 + 400, [], [{ number: 30, title: "Token storage", ...alpha, parent: null }]],
        [122, "Password reset email", "api/reset", 5 * 24 * 60 + 90, [], [{ number: 31, title: "Reset flow", labels: [], parent: { title: "Alpha release", ...alpha } }]],
        [123, "docs: API reference", "docs/api-ref", 4 * 24 * 60 + 300, [], []],
        [124, "Settings skeleton", "web/settings", 4 * 24 * 60 + 100, ["milestone: beta"], []],
        [125, "Health check endpoint", "api/health", 3 * 24 * 60 + 500, [], [{ number: 32, title: "Health checks", ...alpha, parent: null }]],
        [126, "Profile form", "web/profile", 3 * 24 * 60 + 200, [], [{ number: 40, title: "Profile settings", ...beta, parent: null }]],
        [127, "Bump runner image", "infra/runner", 3 * 24 * 60 + 60, [], []],
        [128, "Billing plan picker", "web/plans", 2 * 24 * 60 + 400, [], [{ number: 41, title: "Plans", labels: [], parent: { title: "Beta release", ...beta } }]],
        [129, "docs: auth guide", "docs/auth", 2 * 24 * 60 + 100, ["area: docs"], []],
        [130, "Audit log endpoint", "api/audit", 30 * 60, ["milestone: alpha"], []],
        [131, "Invoice download", "web/invoice", 28 * 60, ["milestone: beta"], []],
        [132, "Error envelope", "api/errors", 22 * 60, ["milestone: alpha"], []],
        [133, "Notification settings", "web/notify", 19 * 60, [], [{ number: 42, title: "Notifications", ...beta, parent: null }]],
        [134, "docs: rate limits", "docs/rate-limits", 15 * 60, [], []],
        [135, "Request IDs in logs", "api/request-id", 11 * 60, [], [{ number: 33, title: "Observability", labels: [], parent: { title: "Alpha release", ...alpha } }]],
        [136, "Cache Docker layers", "infra/docker-cache", 8 * 60, [], []],
        [137, "Billing address form", "web/address", 5 * 60, ["milestone: beta"], []],
        [140, "Token refresh", "api/refresh", 3 * 60, ["milestone: alpha"], []],
        [147, "Dark mode toggle", "web/dark-toggle", 70, ["milestone: beta"], []],
        [148, "docs: changelog", "docs/changelog", 150, [], []],
    ];
    const merged = plan.map(([number, title, headRefName, minutesAgo, labels, refs]) => ({
        number, title, url: url("pull", number), headRefName, mergedAt: at(minutesAgo), body: "", labels, refs,
    }));

    const issue = (number, title, state, body = "") => ({ number, title, url: url("issues", number), state, body });
    const trackIssues = {
        "milestone: alpha": [
            issue(30, "Token storage", "CLOSED"),
            issue(31, "Reset flow", "CLOSED"),
            issue(32, "Health checks", "CLOSED"),
            issue(33, "Observability", "OPEN", "- [x] request ids\n- [x] structured logs\n- [ ] trace export"),
            issue(34, "Pagination", "OPEN", "- [x] cursor\n- [ ] page size limits"),
        ],
        "milestone: beta": [
            issue(40, "Profile settings", "CLOSED"),
            issue(41, "Plans", "OPEN", "- [x] picker\n- [ ] proration\n- [ ] downgrade"),
            issue(42, "Notifications", "CLOSED"),
            issue(43, "Billing form", "OPEN", "- [ ] validation\n- [ ] address"),
            issue(44, "Dark mode", "OPEN"),
        ],
        "area: docs": [
            issue(50, "API reference", "CLOSED"),
            issue(51, "Auth guide", "CLOSED"),
            issue(52, "Changelog", "CLOSED"),
        ],
    };

    return {
        repo: DEMO_REPO,
        demo: true,
        openPrs,
        openPrTotal: openPrs.length,
        merged,
        lockComments: [
            { createdAt: at(90), url: url(), author: "web-worker", writeAccess: true, line: "merge reserve: #138" },
            { createdAt: at(50), url: url(), author: "web-worker", writeAccess: true, line: "merge lock release: #137" },
            { createdAt: at(20), url: url(), author: "api-worker", writeAccess: true, line: `merge lock: #141 until ${iso(now + 25 * MIN)}` },
            { createdAt: at(10), url: url(), author: "web-worker", writeAccess: true, line: "merge reserve: #144" },
        ],
        trackIssues,
        epics: [
            { number: 10, name: "Alpha release", group: "", url: url("issues", 10), state: "OPEN", total: 9, completed: 7 },
            { number: 11, name: "Beta release", group: "", url: url("issues", 11), state: "OPEN", total: 12, completed: 5 },
        ],
        decisionIssues: [{ number: 150, title: "Pick the default page size for list endpoints", url: url("issues", 150) }],
        rate: { remaining: 4210, limit: 5000, resetAt: iso(now + 40 * MIN) },
        local: { freePct: 41, swapUsedMb: 2150, swapTotalMb: 4096, heavy: 2 },
        errors: [],
    };
}
