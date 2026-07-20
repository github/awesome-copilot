// Extension: brainmax-canvas
//
// Canvas UI for the BrainMax quiz orchestrator (https://gh.io/brainmaxxing/skills).
// The canvas displays quiz state and accepts freeform answers, but it never
// scores answers itself. The agent drives it through the actions declared
// below; canvas answers are relayed into normal chat, where the domain skill
// scores them and reports back via `record_score` / `complete_domain` /
// `show_report`.
//
// See README.md in this directory for installation and usage guidance.

import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { randomUUID } from "node:crypto";
import { startInstanceServer } from "./lib/http-server.mjs";
import { getState, deleteState, tierForScore, tierForPercentage, TIER_LABELS } from "./lib/state.mjs";

/** @type {Map<string, Awaited<ReturnType<typeof startInstanceServer>>>} */
const servers = new Map();
/** @type {Map<string, NodeJS.Timeout>} */
const stateCleanupTimers = new Map();
const STATE_RETENTION_MS = 30 * 60 * 1000;
const QUESTION_TYPES = new Set(["Explain", "Predict", "Refactor", "Debug"]);

function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

function isValidQuestion(question, total, expectedIndex) {
    return Boolean(
        question
        && Number.isInteger(question.index)
        && question.index === expectedIndex
        && question.total === total
        && isNonEmptyString(question.prompt)
        && QUESTION_TYPES.has(question.type),
    );
}

async function ensureServer(instanceId, session) {
    let entry = servers.get(instanceId);
    if (entry) return entry;

    const cleanupTimer = stateCleanupTimers.get(instanceId);
    if (cleanupTimer) {
        clearTimeout(cleanupTimer);
        stateCleanupTimers.delete(instanceId);
    }

    entry = await startInstanceServer(
        instanceId,
        () => getState(instanceId),
        (event) => handleClientEvent(instanceId, session, event),
    );
    servers.set(instanceId, entry);
    return entry;
}

/** Handle an interaction posted from the browser back into chat. */
function handleClientEvent(instanceId, session, event) {
    switch (event.type) {
        case "select-domain": {
            const state = getState(instanceId);
            if (state.view !== "domains") {
                return { ok: false, error: "Return to domain selection before starting another quiz." };
            }
            const domain = state.domains.find((candidate) => candidate.id === event.domainId);
            if (!domain) return { ok: false, error: "That knowledge area is not available." };
            if (state.domainSelectionStatus === "submitting") {
                return { ok: false, error: "A quiz is already being started." };
            }

            const prompt = `Start the ${domain.name} quiz.`;
            state.domainSelectionStatus = "submitting";
            state.domainSelectionError = null;
            state.announcement = `Starting ${domain.name} quiz.`;
            servers.get(instanceId)?.broadcastState();
            // Avoid calling session.send synchronously from an event-loop tick
            // that originated outside the normal turn flow.
            setTimeout(async () => {
                try {
                    await session.send({ prompt });
                } catch (err) {
                    const currentState = getState(instanceId);
                    if (currentState.domainSelectionStatus !== "submitting") return;
                    currentState.domainSelectionStatus = "error";
                    currentState.domainSelectionError = "The quiz could not be started. Try selecting the domain again.";
                    currentState.announcement = currentState.domainSelectionError;
                    servers.get(instanceId)?.broadcastState();
                    console.error("Failed to start BrainMax quiz", err);
                }
            }, 0);
            return { ok: true };
        }
        case "submit-answer": {
            const state = getState(instanceId);
            const answer = typeof event.answer === "string" ? event.answer.trim() : "";
            if (state.view !== "quiz" || !state.question || event.questionId !== state.question.id) {
                return { ok: false, error: "This question is no longer active. Review the current question and try again." };
            }
            if (!answer) {
                return { ok: false, error: "Enter an answer before submitting." };
            }
            if (answer.length > 8000) {
                return { ok: false, error: "Keep your answer under 8,000 characters." };
            }
            if (state.answerStatus === "submitting" || state.answerStatus === "scored") {
                return { ok: false, error: "An answer has already been submitted for this question." };
            }

            const question = state.question;
            const domainName = state.quiz?.domainName || "BrainMax";
            state.answerStatus = "submitting";
            state.answerError = null;
            state.lastScore = null;
            state.announcement = `Answer submitted for question ${question.index}.`;
            servers.get(instanceId)?.broadcastState();

            setTimeout(async () => {
                try {
                    await session.send({
                        prompt: `Answer to ${domainName} question ${question.index} of ${question.total}:\n\n${answer}`,
                    });
                } catch (err) {
                    const currentState = getState(instanceId);
                    if (currentState.question?.id !== question.id || currentState.answerStatus !== "submitting") return;
                    currentState.answerStatus = "error";
                    currentState.answerError = "Your answer could not be sent to Copilot. Try again.";
                    currentState.announcement = currentState.answerError;
                    servers.get(instanceId)?.broadcastState();
                    console.error("Failed to submit BrainMax answer", err);
                }
            }, 0);
            return { ok: true };
        }
        case "choose-another-domain": {
            const state = getState(instanceId);
            if (state.view !== "summary" && state.view !== "report") {
                return { ok: false, error: "Finish the active quiz before choosing another domain." };
            }
            state.view = "domains";
            state.question = null;
            state.lastScore = null;
            state.quiz = null;
            state.domainSelectionStatus = "idle";
            state.domainSelectionError = null;
            state.reportRequestStatus = "idle";
            state.reportRequestError = null;
            state.announcement = "Back to domain selection. Choose a knowledge area to start another quiz.";
            servers.get(instanceId)?.broadcastState();
            return { ok: true };
        }
        case "compile-report": {
            const state = getState(instanceId);
            if (state.view !== "summary" || state.completed.length === 0) {
                return { ok: false, error: "Complete a domain before compiling the report." };
            }
            if (state.reportRequestStatus === "submitting") {
                return { ok: false, error: "The report is already being compiled." };
            }
            state.reportRequestStatus = "submitting";
            state.reportRequestError = null;
            state.announcement = "Compiling competency report.";
            servers.get(instanceId)?.broadcastState();
            setTimeout(async () => {
                try {
                    await session.send({ prompt: "Compile report" });
                } catch (err) {
                    const currentState = getState(instanceId);
                    if (currentState.reportRequestStatus !== "submitting") return;
                    currentState.reportRequestStatus = "error";
                    currentState.reportRequestError = "The report could not be requested. Try again.";
                    currentState.announcement = currentState.reportRequestError;
                    servers.get(instanceId)?.broadcastState();
                    console.error("Failed to compile BrainMax report", err);
                }
            }, 0);
            return { ok: true };
        }
        default:
            return { ok: false, error: "Unknown canvas event." };
    }
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "brainmax-canvas",
            displayName: "BrainMax",
            description:
                "Interactive dashboard for the BrainMax concept-mastery quiz: shows detected domains, accepts freeform answers, tracks live quiz progress and running score, and displays the final competency report. Opening this Canvas does not populate it. After opening, invoke set_domains before responding in chat; then drive it via start_quiz / set_question / record_score / complete_domain / show_report.",
            actions: [
                {
                    name: "set_domains",
                    description:
                        "MANDATORY immediately after opening BrainMax: render the detected-domain selection screen before sending the domain list in chat. Opening the Canvas alone does not populate it. Only include domains that were actually detected.",
                    inputSchema: {
                        type: "object",
                        required: ["domains"],
                        properties: {
                            domains: {
                                type: "array",
                                items: {
                                    type: "object",
                                    required: ["id", "name"],
                                    properties: {
                                        id: { type: "string", description: "Skill slug, e.g. 'api-design'" },
                                        name: { type: "string", description: "Display name, e.g. 'API Design'" },
                                    },
                                },
                            },
                        },
                    },
                    handler: async (ctx) => {
                        const state = getState(ctx.instanceId);
                        const domains = ctx.input?.domains;
                        if (!Array.isArray(domains) || domains.some((domain) => !isNonEmptyString(domain?.id) || !isNonEmptyString(domain?.name))) {
                            return { ok: false, error: "Each detected domain requires a non-empty id and name." };
                        }
                        const normalizedDomains = domains.map((domain) => ({ id: domain.id.trim(), name: domain.name.trim() }));
                        if (new Set(normalizedDomains.map((domain) => domain.id)).size !== normalizedDomains.length) {
                            return { ok: false, error: "Detected domain ids must be unique." };
                        }
                        state.domains = normalizedDomains;
                        state.view = "domains";
                        state.domainSelectionStatus = "idle";
                        state.domainSelectionError = null;
                        state.reportRequestStatus = "idle";
                        state.reportRequestError = null;
                        state.announcement = `${state.domains.length} knowledge areas detected.`;
                        servers.get(ctx.instanceId)?.broadcastState();
                        return { ok: true };
                    },
                },
                {
                    name: "show_domains",
                    description:
                        "Return to the domain selection screen using the domains already sent via set_domains (e.g. after a student finishes one domain and wants to pick another).",
                    handler: async (ctx) => {
                        const state = getState(ctx.instanceId);
                        state.view = "domains";
                        state.question = null;
                        state.lastScore = null;
                        state.quiz = null;
                        state.domainSelectionStatus = "idle";
                        state.domainSelectionError = null;
                        state.reportRequestStatus = "idle";
                        state.reportRequestError = null;
                        servers.get(ctx.instanceId)?.broadcastState();
                        return { ok: true };
                    },
                },
                {
                    name: "start_quiz",
                    description: "MANDATORY before presenting question 1 in chat: atomically start the selected quiz and display the exact first question. Wait for success before sending the same question in chat.",
                    inputSchema: {
                        type: "object",
                        required: ["domainId", "domainName", "total", "firstQuestion"],
                        properties: {
                            domainId: { type: "string" },
                            domainName: { type: "string" },
                            total: { type: "number", description: "Total questions in this quiz, typically 5." },
                            firstQuestion: {
                                type: "object",
                                required: ["index", "total", "prompt", "type"],
                                properties: {
                                    index: { type: "number", description: "Must be 1." },
                                    total: { type: "number", description: "Must match the quiz total." },
                                    prompt: { type: "string", minLength: 1 },
                                    type: { type: "string", enum: ["Explain", "Predict", "Refactor", "Debug"] },
                                },
                            },
                        },
                    },
                    handler: async (ctx) => {
                        const state = getState(ctx.instanceId);
                        const { domainId, domainName, total, firstQuestion } = ctx.input || {};
                        const domain = state.domains.find((candidate) => candidate.id === domainId);
                        if (!domain || domain.name !== domainName) {
                            return { ok: false, error: "start_quiz must target a detected domain." };
                        }
                        if (!Number.isInteger(total) || total < 1 || total > 20 || !isValidQuestion(firstQuestion, total, 1)) {
                            return { ok: false, error: "start_quiz requires a valid Question 1 and a matching total from 1 to 20." };
                        }
                        state.quiz = {
                            domainId,
                            domainName,
                            total: total ?? 5,
                            index: 1,
                            runningScore: 0,
                            runningMax: 0,
                            history: [],
                        };
                        state.question = { ...firstQuestion, id: randomUUID() };
                        state.domainSelectionStatus = "idle";
                        state.domainSelectionError = null;
                        state.answerStatus = "idle";
                        state.answerError = null;
                        state.lastScore = null;
                        state.summary = null;
                        state.view = "quiz";
                        state.announcement = `Starting ${domainName} quiz.`;
                        servers.get(ctx.instanceId)?.broadcastState();
                        return { ok: true };
                    },
                },
                {
                    name: "set_question",
                    description: "MANDATORY before presenting each question in chat: show the exact same current question in the Canvas and wait for this action to succeed.",
                    inputSchema: {
                        type: "object",
                        required: ["index", "total", "prompt", "type"],
                        properties: {
                            index: { type: "number", description: "1-based question number." },
                            total: { type: "number" },
                            prompt: { type: "string", description: "The question text, grounded in the student's code." },
                            type: { type: "string", enum: ["Explain", "Predict", "Refactor", "Debug"] },
                        },
                    },
                    handler: async (ctx) => {
                        const state = getState(ctx.instanceId);
                        const { index, total, prompt, type } = ctx.input || {};
                        const expectedIndex = (state.quiz?.history.length ?? 0) + 1;
                        const question = { index, total, prompt, type };
                        if (!state.quiz || state.answerStatus !== "scored" || index !== expectedIndex) {
                            return { ok: false, error: "Score the active question before advancing to the next one." };
                        }
                        if (index > state.quiz.total || !isValidQuestion(question, state.quiz.total, expectedIndex)) {
                            return { ok: false, error: "The next question must use the quiz total and next in-range index." };
                        }
                        state.question = { id: randomUUID(), ...question };
                        state.answerStatus = "idle";
                        state.answerError = null;
                        if (state.quiz) state.quiz.index = index;
                        state.view = "quiz";
                        state.announcement = `Question ${index} of ${total}: ${type}.`;
                        servers.get(ctx.instanceId)?.broadcastState();
                        return { ok: true };
                    },
                },
                {
                    name: "record_score",
                    description:
                        "Reveal the score for the question just answered (0-3 rubric) with a one-sentence explanation. For every non-final question, immediately follow this successful action with set_question for the next question before responding in chat. For the final question, follow with complete_domain.",
                    inputSchema: {
                        type: "object",
                        required: ["index", "score", "feedback"],
                        properties: {
                            index: { type: "number" },
                            score: { type: "number", minimum: 0, maximum: 3 },
                            feedback: { type: "string", description: "One-sentence explanation of the score." },
                        },
                    },
                    handler: async (ctx) => {
                        const state = getState(ctx.instanceId);
                        const { index, score, feedback } = ctx.input || {};
                        if (!state.quiz || !state.question || index !== state.question.index || state.answerStatus !== "submitting") {
                            return { ok: false, error: "record_score must target the active question after its answer is submitted." };
                        }
                        if (!Number.isInteger(score) || score < 0 || score > 3 || !isNonEmptyString(feedback)) {
                            return { ok: false, error: "record_score requires an integer score from 0 to 3 and non-empty feedback." };
                        }
                        const tier = tierForScore(score);
                        state.lastScore = { index, score, max: 3, feedback, tier, tierLabel: TIER_LABELS[tier] };
                        state.answerStatus = "scored";
                        state.answerError = null;
                        if (state.quiz) {
                            state.quiz.runningScore += score;
                            state.quiz.runningMax += 3;
                            state.quiz.history.push({ index, score, tier });
                        }
                        state.announcement = `Question ${index} scored ${score} of 3: ${TIER_LABELS[tier]}.`;
                        servers.get(ctx.instanceId)?.broadcastState();
                        return { ok: true };
                    },
                },
                {
                    name: "complete_domain",
                    description: "MANDATORY after the final question: show the domain summary with non-empty strongestArea and gap analysis before presenting the summary in chat.",
                    inputSchema: {
                        type: "object",
                        required: ["domainId", "domainName", "total", "max", "strongestArea", "gap"],
                        properties: {
                            domainId: { type: "string" },
                            domainName: { type: "string" },
                            total: { type: "number", description: "Total points earned." },
                            max: { type: "number", description: "Max possible points." },
                            strongestArea: { type: "string", minLength: 1 },
                            gap: { type: "string", minLength: 1 },
                        },
                    },
                    handler: async (ctx) => {
                        const state = getState(ctx.instanceId);
                        const input = ctx.input || {};
                        if (
                            !state.quiz
                            || state.answerStatus !== "scored"
                            || state.quiz.domainId !== input.domainId
                            || state.quiz.domainName !== input.domainName
                            || state.quiz.history.length !== state.quiz.total
                        ) {
                            return { ok: false, error: "Complete and score every question before completing the domain." };
                        }
                        if (input.total !== state.quiz.runningScore || input.max !== state.quiz.runningMax) {
                            return { ok: false, error: "Domain totals must match the recorded Canvas scores." };
                        }
                        if (!isNonEmptyString(input.strongestArea) || !isNonEmptyString(input.gap)) {
                            return { ok: false, error: "Domain summaries require a strongest area and a gap analysis." };
                        }
                        const percentage = input.max === 0 ? 0 : (input.total / input.max) * 100;
                        state.summary = { ...input, percentage, tier: tierForPercentage(percentage) };
                        const existingIdx = state.completed.findIndex((d) => d.id === input.domainId);
                        const entry = {
                            id: input.domainId,
                            name: input.domainName,
                            score: input.total,
                            max: input.max,
                            percentage,
                            tier: tierForPercentage(percentage),
                            strongestArea: input.strongestArea,
                            gap: input.gap,
                        };
                        if (existingIdx >= 0) state.completed[existingIdx] = entry;
                        else state.completed.push(entry);
                        state.view = "summary";
                        state.announcement = `${input.domainName} complete: ${percentage}%.`;
                        servers.get(ctx.instanceId)?.broadcastState();
                        return { ok: true };
                    },
                },
                {
                    name: "show_report",
                    description: "MANDATORY after the student says 'compile report': display the complete competency report before presenting the same report in chat. Recorded Canvas scores are authoritative.",
                    inputSchema: {
                        type: "object",
                        required: ["strongestAreas", "priorityAreas", "recommendations", "nextChallenge"],
                        properties: {
                            strongestAreas: { type: "array", items: { type: "string" } },
                            priorityAreas: {
                                type: "array",
                                items: {
                                    type: "object",
                                    required: ["name", "concepts"],
                                    properties: {
                                        name: { type: "string" },
                                        concepts: { type: "array", items: { type: "string" } },
                                    },
                                },
                            },
                            recommendations: { type: "array", items: { type: "string" } },
                            nextChallenge: { type: "string", minLength: 1 },
                        },
                    },
                    handler: async (ctx) => {
                        const state = getState(ctx.instanceId);
                        if (state.completed.length === 0) {
                            return { ok: false, error: "Complete at least one domain before compiling a report." };
                        }
                        if (!isNonEmptyString(ctx.input?.nextChallenge)) {
                            return { ok: false, error: "The report requires a concrete next challenge." };
                        }
                        const domains = state.completed.map(({ name, score, max, percentage }) => ({ name, score, max, percentage }));
                        const overallScore = domains.reduce((sum, domain) => sum + domain.score, 0);
                        const overallMax = domains.reduce((sum, domain) => sum + domain.max, 0);
                        const overallPercentage = overallMax === 0 ? 0 : (overallScore / overallMax) * 100;
                        // The agent's qualitative lists are authoritative here: the schema
                        // already requires them and they mirror the chat report. Scores and
                        // the domain table stay server-derived from recorded Canvas results.
                        const strongestAreas = Array.isArray(ctx.input?.strongestAreas)
                            ? ctx.input.strongestAreas.filter(isNonEmptyString)
                            : [];
                        const priorityAreas = Array.isArray(ctx.input?.priorityAreas)
                            ? ctx.input.priorityAreas
                                .filter((area) => area && isNonEmptyString(area.name))
                                .map((area) => ({
                                    name: area.name,
                                    concepts: Array.isArray(area.concepts) ? area.concepts.filter(isNonEmptyString) : [],
                                }))
                            : [];
                        state.report = {
                            ...ctx.input,
                            overallScore,
                            overallMax,
                            overallPercentage,
                            domains,
                            strongestAreas,
                            priorityAreas,
                        };
                        state.reportRequestStatus = "idle";
                        state.reportRequestError = null;
                        state.view = "report";
                        state.announcement = `Report ready: ${Math.round(overallPercentage)}% overall.`;
                        servers.get(ctx.instanceId)?.broadcastState();
                        return { ok: true };
                    },
                },
            ],
            open: async (ctx) => {
                const entry = await ensureServer(ctx.instanceId, session);
                return { title: "BrainMax", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await entry.close();
                }
                const existingTimer = stateCleanupTimers.get(ctx.instanceId);
                if (existingTimer) clearTimeout(existingTimer);
                const cleanupTimer = setTimeout(() => {
                    deleteState(ctx.instanceId);
                    stateCleanupTimers.delete(ctx.instanceId);
                }, STATE_RETENTION_MS);
                cleanupTimer.unref?.();
                stateCleanupTimers.set(ctx.instanceId, cleanupTimer);
            },
        }),
    ],
});
