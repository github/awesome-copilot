// In-memory per-instance state for the BrainMax canvas.
//
// Each open canvas instance (identified by instanceId) gets its own state
// object. Action handlers in extension.mjs mutate this state; the HTTP
// server (lib/http-server.mjs) serializes it to connected SSE clients so the
// browser re-renders without polling.

/** @type {Map<string, InstanceState>} */
const instances = new Map();

/**
 * @typedef {Object} InstanceState
 * @property {"domains"|"quiz"|"summary"|"report"} view
 * @property {Array<{id: string, name: string}>} domains
 * @property {Array<{id: string, name: string, score: number, max: number, percentage: number, tier: number, strongestArea: string, gap: string}>} completed
 * @property {null|Object} quiz - { domainId, domainName, total, index, runningScore, runningMax, history: [] }
 * @property {null|Object} question - { id, index, total, prompt, type }
 * @property {"idle"|"submitting"|"error"} domainSelectionStatus
 * @property {null|string} domainSelectionError
 * @property {"idle"|"submitting"|"scored"|"error"} answerStatus
 * @property {null|string} answerError
 * @property {null|Object} lastScore - { index, score, max, feedback, tier } (transient reveal)
 * @property {null|Object} summary - payload from complete_domain
 * @property {null|Object} report - payload from show_report
 * @property {"idle"|"submitting"|"error"} reportRequestStatus
 * @property {null|string} reportRequestError
 * @property {string} announcement - latest aria-live text
 */

function freshState() {
    return {
        view: "domains",
        domains: [],
        completed: [],
        quiz: null,
        question: null,
        domainSelectionStatus: "idle",
        domainSelectionError: null,
        answerStatus: "idle",
        answerError: null,
        lastScore: null,
        summary: null,
        report: null,
        reportRequestStatus: "idle",
        reportRequestError: null,
        announcement: "",
    };
}

export function getState(instanceId) {
    let state = instances.get(instanceId);
    if (!state) {
        state = freshState();
        instances.set(instanceId, state);
    }
    return state;
}

export function deleteState(instanceId) {
    instances.delete(instanceId);
}

/** Map a 0-100 percentage to a score tier index 0-3. */
export function tierForPercentage(percentage) {
    if (percentage >= 90) return 3;
    if (percentage >= 70) return 2;
    if (percentage >= 50) return 1;
    return 0;
}

/** Map a raw 0-3 question score directly to its tier (same scale, no banding needed). */
export function tierForScore(score) {
    return Math.max(0, Math.min(3, Math.round(score)));
}

export const TIER_LABELS = ["No understanding", "Recognition", "Application", "Mastery"];
