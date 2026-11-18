// The only place this extension starts processes. Commands are a fixed allowlist, run without a shell,
// with arguments passed as an array, a timeout and an output cap. Nothing else can be executed.
import { execFile } from "node:child_process";

// gh reads GitHub through the user's own login; the rest are optional local-resource checks.
const ALLOWED = new Set(["gh", "ps", "sysctl", "memory_pressure"]);
const MAX_OUTPUT = 64 * 1024 * 1024;

export class ExecError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

/**
 * Run an allowlisted command and resolve with its stdout.
 * `keepOutputOnError` resolves with stdout when a failing command still printed JSON (gh does this for partial
 * GraphQL results). Rejects with ExecError code "not_allowed", "not_installed" or "failed".
 */
export function run(cmd, args, timeoutMs = 45000, { keepOutputOnError = false } = {}) {
    if (!ALLOWED.has(cmd)) return Promise.reject(new ExecError("not_allowed", `${cmd} is not an allowed command`));
    if (!Array.isArray(args) || args.some((a) => typeof a !== "string")) {
        return Promise.reject(new ExecError("not_allowed", "arguments must be an array of strings"));
    }
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { timeout: timeoutMs, maxBuffer: MAX_OUTPUT, windowsHide: true, shell: false }, (error, stdout, stderr) => {
            if (error && keepOutputOnError && stdout && stdout.trim().startsWith("{")) {
                resolve(stdout);
                return;
            }
            if (error) {
                if (error.code === "ENOENT") {
                    reject(new ExecError("not_installed", `${cmd} is not installed or not on PATH`));
                    return;
                }
                reject(new ExecError("failed", (stderr || error.message).trim().split("\n")[0].slice(0, 240)));
                return;
            }
            resolve(stdout);
        });
    });
}
