import { open } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { parseEnv } from "node:util";
import { projectIdentity } from "./azure.mjs";

const fields = [
    { key: "local", variable: "LOCAL_FRONTEND", label: "Local app" },
    { key: "deployed", variable: "DEPLOYED_FRONTEND", label: "Deployed app" },
];

const README_LIMIT = 1024 * 1024;
const NONE = Object.freeze({ contract: false, checkpoint: null, appless: false });

// Rapid milestones the skill records in the root README.md: the contract, the hosted checkpoint verdict and an agent-only app.
export function parseMilestones(text) {
    const sections = new Map();
    for (const part of String(text ?? "").split(/^## +/m).slice(1)) {
        const [heading, ...body] = part.split("\n");
        const key = heading.trim().toLowerCase();
        if (!sections.has(key)) sections.set(key, body.join("\n").trim());
    }
    const checkpoint = sections.get("hosted checkpoint");
    return {
        contract: sections.has("implementation contract"),
        checkpoint: checkpoint == null ? null : /^\*\*passed\*\*/i.test(checkpoint) ? "passed" : /^\*\*blocked\*\*/i.test(checkpoint) ? "blocked" : "pending",
        appless: /^\|\s*frontend\b[^|\n]*\|\s*not applicable/im.test(sections.get("architecture") ?? ""),
    };
}

// Milestones are progress hints, so an unreadable README shows none instead of failing the .env read.
async function readMilestones(directory) {
    try {
        const file = await open(path.join(directory, "README.md"), "r");
        try {
            const { size } = await file.stat();
            const buffer = Buffer.alloc(Math.min(size, README_LIMIT));
            await file.read(buffer, 0, buffer.length, 0);
            return parseMilestones(buffer.toString("utf8"));
        } finally { await file.close(); }
    } catch { return { ...NONE }; }
}

const ENV_LIMIT = 64 * 1024;
const ENV_KEYS = /^\s*(?:export\s+)?(FOUNDRY_PROJECT|LOCAL_FRONTEND|DEPLOYED_FRONTEND)\s*=/;

// Only the three keys the canvas uses are parsed, so other lines (and their secrets or syntax) are never interpreted.
export function parseCanvasEnv(source) {
    const env = {};
    for (const line of String(source).split(/\r?\n/)) {
        const key = ENV_KEYS.exec(line)?.[1];
        if (!key) continue;
        try {
            const value = parseEnv(line)[key];
            if (value !== undefined) env[key] = value;
        } catch { /* An unparsable line for a canvas key reads as unset. */ }
    }
    return env;
}

// A .env problem is reported as envError with nothing configured; it never blocks project discovery.
export async function readFrontends(directory) {
    if (typeof directory !== "string" || !path.isAbsolute(directory)) throw new Error("The session workspace directory is unavailable.");
    let source = "";
    let revision = null;
    let envError = null;
    try {
        const file = await open(path.join(directory, ".env"), "r");
        try {
            const stat = await file.stat({ bigint: true });
            if (!stat.isFile()) throw Object.assign(new Error("not a file"), { code: "EISDIR" });
            if (stat.size > BigInt(ENV_LIMIT)) envError = `Workspace .env is larger than ${ENV_LIMIT / 1024} KB, so the canvas does not read it.`;
            else {
                source = await file.readFile("utf8");
                revision = createHash("sha256").update([directory, stat.dev, stat.ino, stat.mtimeNs, stat.ctimeNs, stat.size].join(":")).digest("hex");
            }
        } finally { await file.close(); }
    }
    catch (error) {
        if (error.code !== "ENOENT") envError = `Cannot read workspace .env (${error.code ?? "read failed"}).`;
    }
    const env = envError ? {} : parseCanvasEnv(source);
    const frontends = fields.map(field => {
        const value = env[field.variable]?.trim() ?? "";
        const result = { ...field, configured: Boolean(value), url: null, error: null };
        if (!value) return result;
        try {
            const url = new URL(value);
            if (!/^https?:\/\//i.test(value) || /[\s\\]/.test(value) || /\$\{/.test(value) || url.username || url.password) throw new Error("Invalid frontend URL.");
            result.url = url.href;
        } catch {
            result.error = `${field.variable} must be an absolute HTTP(S) URL without credentials, whitespace or variable substitutions.`;
        }
        return result;
    });
    const value = env.FOUNDRY_PROJECT?.trim() ?? "";
    const foundryProject = { id: null, error: null };
    if (value) {
        try {
            const { subscriptionId } = projectIdentity(value);
            if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(subscriptionId) ||
                /[\s\\?#]/.test(value) || value.includes("${") ||
                value.split("/").some(segment => segment === "." || segment === "..")) throw new Error("Invalid project ID.");
            foundryProject.id = value;
        } catch {
            foundryProject.error = "FOUNDRY_PROJECT must be a full Microsoft Foundry project ARM resource ID.";
        }
    }
    return { configured: frontends.some(row => row.configured), frontends, revision, foundryProject, envError, milestones: await readMilestones(directory) };
}

export async function frontendStatus(session) {
    const { workingDirectory } = await session.rpc.metadata.snapshot();
    return readFrontends(workingDirectory);
}

export async function openFrontend(session, key) {
    if (!fields.some(field => field.key === key)) throw new Error("Choose the local or deployed frontend.");
    const { frontends, envError } = await frontendStatus(session);
    const frontend = frontends.find(row => row.key === key);
    if (!frontend.url) throw new Error(frontend.error ?? envError ?? `${frontend.variable} is not configured in workspace .env.`);
    // Reopening an existing canvas focuses it without replacing its URL.
    const suffix = createHash("sha256").update(frontend.url).digest("hex").slice(0, 16);
    return session.rpc.canvas.open({
        canvasId: "browser",
        instanceId: `foundry-agentic-loop-${key}-${suffix}`,
        input: { url: frontend.url, title: `Agentic Loop · ${frontend.label}` },
    });
}
