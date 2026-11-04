import { spawn } from "node:child_process";
import { REPO } from "./state.mjs";

export function runGh(args, input) {
    return new Promise((resolve, reject) => {
        const child = spawn("gh", args, { windowsHide: true });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
        child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
        child.on("error", reject);
        child.stdin.on("error", (error) => { if (error.code !== "EPIPE") reject(error); });
        child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || `gh exited with ${code}`)));
        child.stdin.end(input);
    });
}

export function createGitHub(run = runGh) {
    const api = async (suffix, method, payload) => JSON.parse(await run([
        "api", `repos/${REPO}/${suffix}`,
        ...(method ? ["--method", method, "--input", "-"] : []),
    ], payload ? JSON.stringify(payload) : undefined));
    const hasWritePermission = async (login) => {
        try {
            const { permission } = await api(`collaborators/${encodeURIComponent(login)}/permission`);
            return ["write", "maintain", "admin"].includes(permission);
        } catch (error) {
            if (/\b404\b/.test(error.message)) return false;
            throw error;
        }
    };
    return {
        async list() {
            return JSON.parse(await run([
                "issue", "list", "-R", REPO, "--label", "duplicate-review", "--state", "all",
                "--limit", "100", "--json", "number,title,state,url",
            ]));
        },
        async get(number) {
            if (!Number.isSafeInteger(number) || number < 1) throw new Error("Invalid report issue number.");
            const issue = await api(`issues/${number}`);
            if (issue.pull_request || !issue.labels?.some((label) => label.name === "duplicate-review")) {
                throw new Error("Only issues labelled duplicate-review can be imported.");
            }
            return issue;
        },
        content: (file) => run([
            "api", `repos/${REPO}/contents/${file.split("/").map(encodeURIComponent).join("/")}?ref=main`,
            "-H", "Accept: application/vnd.github.raw",
        ]),
        patch: (number, body) => api(`issues/${number}`, "PATCH", { body }),
        create: (title, body) => api("issues", "POST", { title, body }),
        async find(marker) {
            const pages = JSON.parse(await run([
                "api", `repos/${REPO}/issues?state=all&per_page=100`, "--paginate", "--slurp",
            ]));
            const matches = pages.flat().filter((issue) => !issue.pull_request && issue.body?.includes(marker));
            const permissionByAuthor = new Map();
            const trusted = [];
            for (const issue of matches) {
                const login = issue.user?.login;
                if (!login) continue;
                if (!permissionByAuthor.has(login)) permissionByAuthor.set(login, hasWritePermission(login));
                if (await permissionByAuthor.get(login)) trusted.push(issue);
            }
            return trusted;
        },
    };
}
