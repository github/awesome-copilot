export const WORKFLOW = "foundry-agentic-loop-workflow";
export const PHASES = Object.freeze(["Specify", "Implement", "Verify", "Deploy"]);
export const MAX_FIX_LOOPS = 5;
export const LESSONS = "docs/LOOP.md";

const KEYS = Object.freeze(["brief", "subscriptionId", "location", "environmentName", "scenarioId", "autonomy", "maxFixLoops", "skipDeploy", "from", "to"]);
const optionalString = { type: ["string", "null"] };

// argsSchema stays inside the runtime's structural subset; validateArgs enforces the finer rules.
export const META = {
    name: WORKFLOW,
    description:
        "Agentic Loop spec-driven development for Microsoft Foundry, GitHub and Azure. Runs Specify, Implement, Verify and Deploy in sequence; "
        + "each phase follows its guide in the foundry-agentic-loop skill in fresh-context subagents and passes an independent evidence gate with bounded fix loops. "
        + "Pauses at approve-spec-v1 (unless autonomy is auto; before Implement when a run starts there on an unapproved or changed spec), approve-deploy-v1 (always) and blocked-<phase>-r<n>. "
        + `Writes docs/*.md, including lessons in ${LESSONS}, and .agentic-loop/runs/<runId>.json. `
        + "Adds the Agentic Loop SDD section to AGENTS.md when absent and refuses a workspace that AGENTS.md locks to rapid prototyping. "
        + "args: { brief: string (required, self-contained), subscriptionId?: GUID, location?: Azure region or 'auto', "
        + "environmentName?: azd environment (2-20 chars), scenarioId?: canvas scenario, autonomy?: 'gated' | 'auto', "
        + "maxFixLoops?: 0-5 (default 2), skipDeploy?: boolean, from?: 'Specify' | 'Implement' | 'Verify' | 'Deploy' (default Specify; a later phase "
        + "only when the latest flight record in the workspace passed every earlier phase), to?: the last phase to run (default Deploy, or Verify with skipDeploy; "
        + "from and to set to the same phase run that phase alone) }.",
    phases: [
        { title: "Specify", detail: "EARS spec, frozen contract and deployment plan; independent review; spec approval" },
        { title: "Implement", detail: "azd scaffold and provision, hosted checkpoint, parallel workstreams, integration" },
        { title: "Verify", detail: "Local E2E, hosted invocation, telemetry and evaluations; fresh-context review" },
        { title: "Deploy", detail: "Deploy approval, azd up, health checks and deployed E2E" },
    ],
    argsSchema: {
        type: "object",
        required: ["brief"],
        properties: {
            brief: { type: "string" },
            subscriptionId: optionalString,
            location: optionalString,
            environmentName: optionalString,
            scenarioId: optionalString,
            autonomy: { type: ["string", "null"], enum: ["gated", "auto", null] },
            maxFixLoops: { type: ["integer", "null"] },
            skipDeploy: { type: ["boolean", "null"] },
            from: { type: ["string", "null"], enum: [...PHASES, null] },
            to: { type: ["string", "null"], enum: [...PHASES, null] },
        },
    },
    // Default ceilings, overridable per invocation; README.md (Limits) shows the subagent-call math behind them.
    limits: {
        maxTotalSubagents: 250,
        maxConcurrentSubagents: 4,
        timeoutSeconds: 43_200,
    },
};

function optional(raw, key, pattern, message) {
    const value = raw[key];
    if (value == null || value === "") return null;
    if (typeof value !== "string" || !pattern.test(value.trim())) throw new TypeError(message);
    return value.trim();
}

export function validateArgs(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("args must be an object with a brief.");
    const unknown = Object.keys(raw).filter(key => !KEYS.includes(key));
    if (unknown.length) throw new TypeError(`Unknown args: ${unknown.join(", ")}. Allowed: ${KEYS.join(", ")}.`);
    const brief = typeof raw.brief === "string" ? raw.brief.trim() : "";
    if (brief.length < 20) throw new TypeError("args.brief is required: describe the users, agents, data, tools and UX in at least 20 characters.");
    if (brief.length > 20_000) throw new TypeError("args.brief must be at most 20,000 characters.");
    const location = optional(raw, "location", /^(?:auto|[a-z][a-z0-9]{2,30})$/, "args.location must be an Azure region name such as eastus2, or auto.");
    const autonomy = raw.autonomy ?? "gated";
    if (!["gated", "auto"].includes(autonomy)) throw new TypeError("args.autonomy must be gated or auto.");
    const maxFixLoops = raw.maxFixLoops ?? 2;
    if (!Number.isInteger(maxFixLoops) || maxFixLoops < 0 || maxFixLoops > MAX_FIX_LOOPS) throw new TypeError(`args.maxFixLoops must be an integer from 0 to ${MAX_FIX_LOOPS}.`);
    const skipDeploy = raw.skipDeploy ?? false;
    if (typeof skipDeploy !== "boolean") throw new TypeError("args.skipDeploy must be a boolean.");
    const from = raw.from ?? "Specify";
    if (!PHASES.includes(from)) throw new TypeError(`args.from must be one of ${PHASES.join(", ")}.`);
    if (from === "Deploy" && skipDeploy) throw new TypeError("args.from cannot be Deploy when skipDeploy is set.");
    const to = raw.to ?? (skipDeploy ? "Verify" : "Deploy");
    if (!PHASES.includes(to)) throw new TypeError(`args.to must be one of ${PHASES.join(", ")}.`);
    if (to === "Deploy" && skipDeploy) throw new TypeError("args.to cannot be Deploy when skipDeploy is set.");
    if (PHASES.indexOf(to) < PHASES.indexOf(from)) throw new TypeError(`args.to (${to}) cannot come before args.from (${from}).`);
    return Object.freeze({
        brief,
        subscriptionId: optional(raw, "subscriptionId", /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i, "args.subscriptionId must be an Azure subscription GUID."),
        location: location === "auto" ? null : location,
        environmentName: optional(raw, "environmentName", /^[a-zA-Z][a-zA-Z0-9-]{1,19}$/, "args.environmentName must be 2-20 letters, digits or hyphens, starting with a letter."),
        scenarioId: optional(raw, "scenarioId", /^[a-z0-9][a-z0-9-]{0,127}$/, "args.scenarioId must be a canvas scenario ID."),
        autonomy,
        maxFixLoops,
        skipDeploy,
        from,
        to,
    });
}
