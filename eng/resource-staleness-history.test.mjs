import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { body, git, lastMeaningfulChange } from "../.github/extensions/resource-staleness-board/lib/inventory.mjs";

const exec = promisify(execFile);

async function fixture(t) {
    const root = await mkdtemp(path.join(process.cwd(), `.resource-staleness-history-${process.pid}-${randomUUID()}-`));
    t.after(() => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
    await git(root, ["init", "--quiet", "--initial-branch=main"]);
    await git(root, ["config", "user.name", "Fixture"]);
    await git(root, ["config", "user.email", "fixture@example.invalid"]);
    await git(root, ["config", "commit.gpgsign", "false"]);
    await git(root, ["config", "core.autocrlf", "false"]);

    async function write(file, contents) {
        const absolute = path.join(root, ...file.split("/"));
        await mkdir(path.dirname(absolute), { recursive: true });
        await writeFile(absolute, contents);
    }

    async function commit(date, message) {
        await git(root, ["add", "--all"]);
        await exec("git", ["-c", "core.hooksPath=", "commit", "--quiet", "-m", message], {
            cwd: root,
            windowsHide: true,
            env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
        });
    }

    return { root, write, commit };
}

test("history preserves behavioral whitespace in bundled code assets", async (t) => {
    const javascript = 'export const greeting = ["a", "b"].join(" ");\r\n';
    const javascriptChanged = javascript.replace('join(" ")', 'join("")');
    const python = 'def value(flag):\n    if flag:\n        return "x"\n    return "y"\n';
    const pythonChanged = 'def value(flag):\n    if flag:\n        return "x"\n        return "y"\n';

    assert.equal(body(javascript, "example.js"), javascript);
    assert.equal(body(python, "example.py"), python);
    assert.notEqual(body(javascript, "example.js"), body(javascriptChanged, "example.js"));
    assert.notEqual(body(python, "example.py"), body(pythonChanged, "example.py"));
    assert.equal(body("---\r\ndescription: old\r\n---\r\nKeep  this.\r\n", "example.md"), "Keepthis.");

    const f = await fixture(t);
    const javascriptPath = "skills/example/scripts/greeting.js";
    const pythonPath = "skills/example/scripts/value.py";
    await f.write(javascriptPath, javascript);
    await f.write(pythonPath, python);
    await f.commit("2025-01-01T00:00:00Z", "Add bundled scripts");
    await f.write(javascriptPath, javascriptChanged);
    await f.write(pythonPath, pythonChanged);
    await f.commit("2025-02-01T00:00:00Z", "Change bundled script behavior");

    assert.equal((await lastMeaningfulChange(f.root, javascriptPath)).date.slice(0, 10), "2025-02-01");
    assert.equal((await lastMeaningfulChange(f.root, pythonPath)).date.slice(0, 10), "2025-02-01");
});
