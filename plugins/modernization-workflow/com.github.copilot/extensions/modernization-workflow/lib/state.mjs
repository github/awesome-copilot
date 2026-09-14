import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DEFAULT_STATE = {
    version: 1,
    language: "auto",
    source: ".",
    goal: "modernize this application for Azure",
    upgradeTarget: "",
    planName: "modernization-plan",
    delegate: "local",
    steps: {
        assess: { status: "pending", updatedAt: null },
        plan: { status: "pending", updatedAt: null },
        execute: { status: "pending", updatedAt: null },
    },
};

function statePath(workspace, stateId) {
    return join(workspace, ".github", "modernize", `canvas-${stateId}.json`);
}

function cleanStateId(value) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value)) {
        throw new Error("Invalid workflow state identifier.");
    }
    return value;
}

export function resolveWorkspace(input, fallback) {
    const candidate = input || fallback || process.cwd();
    return resolve(candidate);
}

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

async function loadState(workspace, stateId) {
    const path = statePath(workspace, cleanStateId(stateId));
    try {
        const saved = JSON.parse(await readFile(path, "utf8"));
        return {
            ...DEFAULT_STATE,
            ...saved,
            steps: {
                ...DEFAULT_STATE.steps,
                ...(saved.steps ?? {}),
            },
        };
    } catch (error) {
        if (error.code === "ENOENT") return structuredClone(DEFAULT_STATE);
        throw error;
    }
}

async function saveState(workspace, stateId, state) {
    const path = statePath(workspace, cleanStateId(stateId));
    await mkdir(join(workspace, ".github", "modernize"), { recursive: true });
    const next = { ...state, updatedAt: new Date().toISOString() };
    await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return next;
}

async function walkNames(root, maxDepth = 3, depth = 0) {
    if (depth > maxDepth || !(await exists(root))) return [];
    const output = [];
    for (const entry of await readdir(root, { withFileTypes: true })) {
        if ([".git", "node_modules", "bin", "obj", "target", "build"].includes(entry.name)) continue;
        const path = join(root, entry.name);
        output.push(path);
        if (entry.isDirectory()) output.push(...await walkNames(path, maxDepth, depth + 1));
    }
    return output;
}

function detectLanguage(paths) {
    const names = paths.map((path) => path.toLowerCase());
    if (names.some((path) => /\.(sln|csproj|fsproj|vbproj)$/.test(path))) return "dotnet";
    if (names.some((path) => /\/(pom\.xml|build\.gradle|build\.gradle\.kts)$/.test(path.replaceAll("\\", "/")))) return "java";
    if (names.some((path) => /\/(cmakelists\.txt|makefile)$/.test(path.replaceAll("\\", "/")) || /\.(cpp|cc|cxx|vcxproj)$/.test(path))) return "cpp";
    return "unknown";
}

async function scanArtifacts(workspace, planName) {
    const modernizeRoot = join(workspace, ".github", "modernize");
    const assessmentRoot = join(modernizeRoot, "assessment");
    const planRoot = join(modernizeRoot, planName);
    const assessmentFiles = (await walkNames(assessmentRoot, 3))
        .filter((path) => /\.(json|md|html|ya?ml)$/i.test(path));
    const planFiles = (await walkNames(planRoot, 2))
        .filter((path) => /\.(json|md|html)$/i.test(path));
    const assessmentOutputs = assessmentFiles.filter((path) =>
        !/config|canvas-/i.test(path) && /\.(json|md|html)$/i.test(path));
    const summaryFiles = planFiles.filter((path) => /summary|progress|result/i.test(path));

    return {
        assessment: assessmentFiles.map((path) => path.slice(workspace.length + 1)),
        plan: planFiles.map((path) => path.slice(workspace.length + 1)),
        execution: summaryFiles.map((path) => path.slice(workspace.length + 1)),
        hasAssessment: assessmentOutputs.length > 0,
        hasPlan: planFiles.some((path) => /plan\.md$/i.test(path))
            && planFiles.some((path) => /tasks\.json$/i.test(path)),
        hasExecution: summaryFiles.length > 0,
    };
}

function quote(value) {
    const text = String(value).trim();
    if (/^[A-Za-z0-9_./:\\-]+$/.test(text)) return text;
    return `"${text.replaceAll('"', '\\"')}"`;
}

function languageFlag(language) {
    if (language === "java" || language === "dotnet") return ` --language ${language}`;
    return "";
}

function delegateFlag(delegate) {
    return delegate === "cloud" ? " --delegate cloud" : "";
}

function commands(state, artifacts) {
    const source = quote(state.source);
    const name = quote(state.planName);
    const goal = quote(state.goal);
    const upgradeTarget = state.upgradeTarget ? ` ${quote(state.upgradeTarget)}` : "";
    const language = state.language === "auto" ? state.detectedLanguage : state.language;
    const assessment = artifacts.assessment.find((path) => /assessment.*\.json$/i.test(path))
        ?? artifacts.assessment.find((path) => /\.json$/i.test(path));
    const assessmentFlag = assessment ? ` --assess-file-path ${quote(assessment)}` : "";

    return {
        assess: `modernize assess --source ${source}${delegateFlag(state.delegate)}${state.delegate === "cloud" ? " --wait" : ""}`,
        plan: `modernize plan create ${goal} --source ${source} --plan-name ${name}${languageFlag(language)}${assessmentFlag}`,
        execute: `modernize plan execute --source ${source} --plan-name ${name}${languageFlag(language)}${delegateFlag(state.delegate)}`,
        upgrade: `modernize upgrade${upgradeTarget} --source ${source}${delegateFlag(state.delegate)}`,
    };
}

function deriveSteps(state, artifacts) {
    const steps = structuredClone(state.steps);
    if (artifacts.hasAssessment) steps.assess.status = "complete";
    if (artifacts.hasPlan) {
        steps.assess.status = "complete";
        steps.plan.status = "complete";
    }
    if (artifacts.hasExecution) {
        steps.assess.status = "complete";
        steps.plan.status = "complete";
        steps.execute.status = "complete";
    }
    return steps;
}

export async function getWorkflowState(workspace, stateId = "default") {
    const saved = await loadState(workspace, stateId);
    const paths = await walkNames(workspace, 3);
    const detectedLanguage = detectLanguage(paths);
    const artifacts = await scanArtifacts(workspace, saved.planName);
    const state = {
        ...saved,
        stateId,
        workspace,
        detectedLanguage,
        effectiveLanguage: saved.language === "auto" ? detectedLanguage : saved.language,
        artifacts,
        steps: deriveSteps(saved, artifacts),
    };
    const notices = [];
    if (state.effectiveLanguage === "cpp") {
        notices.push("The current CLI reference documents explicit --language values for Java and .NET only. C++ commands use CLI auto-detection; verify support with your installed Modernize CLI version.");
    }
    if (state.delegate === "cloud" && !/^https:\/\/github\.com\//i.test(state.source)) {
        notices.push("Cloud delegation requires a github.com repository URL as the source. Local paths and other Git providers are not supported.");
    }
    return {
        ...state,
        commands: commands(state, artifacts),
        compatibilityNotice: notices.length ? notices.join(" ") : null,
    };
}

export async function configureWorkflow(workspace, stateId, input) {
    const current = await loadState(workspace, stateId);
    const allowed = ["language", "source", "goal", "upgradeTarget", "planName", "delegate"];
    const next = { ...current };
    for (const key of allowed) {
        if (input[key] !== undefined) next[key] = String(input[key]).trim();
    }
    if (!["auto", "dotnet", "java", "cpp"].includes(next.language)) {
        throw new Error("Language must be auto, dotnet, java, or cpp.");
    }
    if (!["local", "cloud"].includes(next.delegate)) {
        throw new Error("Execution must be local or cloud.");
    }
    if (!next.source || !next.goal) {
        throw new Error("Source and modernization goal are required.");
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(next.planName)) {
        throw new Error("Plan name must contain only letters, numbers, dots, underscores, and hyphens.");
    }
    await saveState(workspace, stateId, next);
    return getWorkflowState(workspace, stateId);
}

export async function setStepStatus(workspace, stateId, step, status) {
    if (!["assess", "plan", "execute"].includes(step)) throw new Error("Unknown workflow step.");
    if (!["pending", "active", "complete", "blocked"].includes(status)) throw new Error("Unknown step status.");
    const current = await loadState(workspace, stateId);
    current.steps[step] = { status, updatedAt: new Date().toISOString() };
    await saveState(workspace, stateId, current);
    return getWorkflowState(workspace, stateId);
}

export async function refreshWorkflow(workspace, stateId = "default") {
    const current = await loadState(workspace, stateId);
    const refreshed = await getWorkflowState(workspace, stateId);
    current.steps = refreshed.steps;
    await saveState(workspace, stateId, current);
    return getWorkflowState(workspace, stateId);
}
