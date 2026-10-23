import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, rename, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFrontends, frontendStatus, openFrontend, parseCanvasEnv, parseMilestones } from "../lib/frontends.mjs";

async function fixture(t) {
    const directory = await mkdtemp(path.join(tmpdir(), "foundry-agentic-loop-frontends-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    return directory;
}

test("Build is unchecked for missing, empty or whitespace-only frontend values", async t => {
    const directory = await fixture(t);
    assert.equal((await readFrontends(directory)).configured, false);
    await writeFile(path.join(directory, ".env"), 'LOCAL_FRONTEND=""\nDEPLOYED_FRONTEND="   "\nOTHER_SECRET=private');
    const result = await readFrontends(directory);
    assert.equal(result.configured, false);
    assert(result.frontends.every(row => !row.configured && row.url === null));
    assert(!JSON.stringify(result).includes("private"));
});

test("each frontend independently checks Build and only the two allowed URLs are returned", async t => {
    const directory = await fixture(t);
    for (const variable of ["LOCAL_FRONTEND", "DEPLOYED_FRONTEND"]) {
        await writeFile(path.join(directory, ".env"), `export ${variable} = 'https://example.com/app#route' # frontend\nSECRET=never-expose\n`);
        const result = await readFrontends(directory);
        assert.equal(result.configured, true);
        assert.equal(result.frontends.filter(row => row.url).length, 1);
        assert.equal(result.frontends.find(row => row.variable === variable).url, "https://example.com/app#route");
        assert(!JSON.stringify(result).includes("never-expose"));
    }
    await writeFile(path.join(directory, ".env"), 'LOCAL_FRONTEND="http://localhost:5173"\nDEPLOYED_FRONTEND=https://app.example.com\n');
    assert.deepEqual((await readFrontends(directory)).frontends.map(row => row.url), [
        "http://localhost:5173/", "https://app.example.com/",
    ]);
});

test("unsafe URLs remain configured but cannot be opened or leak credential text", async t => {
    const directory = await fixture(t);
    for (const value of ["javascript:alert(1)", "file:///etc/passwd", "/relative", "//example.com",
        "https://user:private@example.com", "https://${HOST}/", "http://localhost:bad", "https://exa mple.com", "https:\\\\example.com"]) {
        await writeFile(path.join(directory, ".env"), `LOCAL_FRONTEND='${value}'\n`);
        const result = await readFrontends(directory);
        assert.equal(result.configured, true);
        assert.equal(result.frontends[0].url, null);
        assert.match(result.frontends[0].error, /absolute HTTP\(S\) URL/);
        assert(!JSON.stringify(result).includes("private"));
    }
});

test("file read failures are explicit warnings rather than absent configuration or a failed read", async t => {
    const directory = await fixture(t);
    await mkdir(path.join(directory, ".env"));
    const result = await readFrontends(directory);
    assert.match(result.envError, /Cannot read workspace .env \(EISDIR\)/);
    assert.deepEqual([result.configured, result.foundryProject], [false, { id: null, error: null }]);
    await assert.rejects(readFrontends(undefined), /workspace directory is unavailable/);
});

test(".env reads are capped at 64 KB and parse only the canvas keys", async t => {
    const directory = await fixture(t);
    const file = path.join(directory, ".env");
    const id = "/subscriptions/11111111-1111-1111-1111-111111111111/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/acct/projects/proj";
    await writeFile(file, `BROKEN="unterminated\nexport LOCAL_FRONTEND="http://localhost:5173"\n  ${"=".repeat(5)} nonsense\nFOUNDRY_PROJECT=${id}\nSECRET=private\nDEPLOYED_FRONTEND = https://app.example.com # comment\n`);
    const result = await readFrontends(directory);
    assert.equal(result.envError, null);
    assert.deepEqual(result.frontends.map(row => row.url), ["http://localhost:5173/", "https://app.example.com/"]);
    assert.equal(result.foundryProject.id, id);
    assert(!JSON.stringify(result).includes("private"));
    assert.deepEqual(parseCanvasEnv("SECRET=a\nLOCAL_FRONTEND=http://a\nLOCAL_FRONTEND=http://b\nNOT_LOCAL_FRONTEND=http://c\n"), { LOCAL_FRONTEND: "http://b" }, "the last assignment wins; other keys are never parsed");
    await writeFile(file, `LOCAL_FRONTEND=http://localhost:5173\n#${"x".repeat(64 * 1024)}\n`);
    const large = await readFrontends(directory);
    assert.match(large.envError, /larger than 64 KB/);
    assert.deepEqual([large.configured, large.revision, large.foundryProject.id], [false, null, null]);
});

test("env revisions detect creation, edits, atomic replacement and deletion without exposing other values", async t => {
    const directory = await fixture(t);
    const file = path.join(directory, ".env");
    assert.equal((await readFrontends(directory)).revision, null);
    const source = "LOCAL_FRONTEND=http://localhost:5173\nSECRET=never-expose\n";
    await writeFile(file, source);
    const created = await readFrontends(directory);
    assert.match(created.revision, /^[a-f0-9]{64}$/);
    assert.equal((await readFrontends(directory)).revision, created.revision);
    await writeFile(file, source + "OTHER_SETTING=changed\n");
    const edited = await readFrontends(directory);
    assert.notEqual(edited.revision, created.revision);
    assert.deepEqual(edited.frontends, created.frontends);
    assert(!JSON.stringify(edited).includes("never-expose"));
    assert(!JSON.stringify(edited).includes("OTHER_SETTING"));
    await utimes(file, new Date("2026-01-01"), new Date("2026-01-01"));
    const touched = await readFrontends(directory);
    assert.notEqual(touched.revision, edited.revision);
    await writeFile(path.join(directory, ".env.next"), source);
    await rename(path.join(directory, ".env.next"), file);
    assert.notEqual((await readFrontends(directory)).revision, touched.revision);
    await rm(file);
    assert.equal((await readFrontends(directory)).revision, null);
});

test("integrated browser rereads the current session workspace and uses URL-specific panel IDs", async t => {
    const first = await fixture(t);
    const second = await fixture(t);
    await writeFile(path.join(first, ".env"), "LOCAL_FRONTEND=http://localhost:5173\nDEPLOYED_FRONTEND=https://app.example.com\n");
    await writeFile(path.join(second, ".env"), "LOCAL_FRONTEND=http://localhost:5174\n");
    let workingDirectory = first;
    const opened = [];
    const session = { rpc: {
        metadata: { snapshot: async () => ({ workingDirectory }) },
        canvas: { open: async input => { opened.push(input); return { instanceId: input.instanceId }; } },
    } };
    assert.equal((await frontendStatus(session)).configured, true);
    await openFrontend(session, "local");
    await openFrontend(session, "local");
    assert.equal(opened[0].canvasId, "browser");
    assert.equal(opened[0].input.url, "http://localhost:5173/");
    assert.equal(opened[0].instanceId, opened[1].instanceId);
    await openFrontend(session, "deployed");
    assert.equal(opened[2].input.url, "https://app.example.com/");
    workingDirectory = second;
    await openFrontend(session, "local");
    assert.equal(opened[3].input.url, "http://localhost:5174/");
    assert.notEqual(opened[0].instanceId, opened[3].instanceId);
    await writeFile(path.join(second, ".env"), "LOCAL_FRONTEND=\n");
    await assert.rejects(openFrontend(session, "local"), /not configured/);
    await assert.rejects(openFrontend(session, "unexpected"), /Choose the local or deployed/);
    assert.equal(opened.length, 4);
});

test("integrated browser rejects invalid URLs and propagates host failures", async t => {
    const directory = await fixture(t);
    const session = { rpc: {
        metadata: { snapshot: async () => ({ workingDirectory: directory }) },
        canvas: { open: async () => { throw new Error("Browser canvas is unavailable"); } },
    } };
    await writeFile(path.join(directory, ".env"), "LOCAL_FRONTEND=javascript:alert(1)\n");
    await assert.rejects(openFrontend(session, "local"), /absolute HTTP\(S\) URL/);
    await writeFile(path.join(directory, ".env"), "LOCAL_FRONTEND=http://localhost:5173\n");
    await assert.rejects(openFrontend(session, "local"), /Browser canvas is unavailable/);
});

test("README milestones track the rapid contract, hosted checkpoint verdict and an agent-only app", async t => {
    assert.deepEqual(parseMilestones(""), { contract: false, checkpoint: null, appless: false });
    const readme = "# Claims\n\n## Architecture\n\n| Layer | Choice |\n| --- | --- |\n| Frontend / backend | Not applicable (agent-only) |\n\n## Implementation contract\n\n- one agent\n\n## Hosted checkpoint\n\n**Passed** (claims-agent v1, active):\n";
    assert.deepEqual(parseMilestones(readme), { contract: true, checkpoint: "passed", appless: true });
    assert.equal(parseMilestones("## Hosted checkpoint\n\n**Blocked**: quota").checkpoint, "blocked");
    assert.equal(parseMilestones("## Hosted checkpoint\n\nPending deploy.").checkpoint, "pending");
    assert.equal(parseMilestones("## Architecture\n| Frontend | React + FastAPI |\n## Notes\n| Frontend | Not applicable |").appless, false, "only the Architecture section counts");
    assert.equal(parseMilestones("Mentions ## Implementation contract inline").contract, false);

    const directory = await fixture(t);
    assert.deepEqual((await readFrontends(directory)).milestones, { contract: false, checkpoint: null, appless: false }, "a missing README shows no milestones");
    await writeFile(path.join(directory, "README.md"), readme);
    assert.deepEqual((await readFrontends(directory)).milestones, { contract: true, checkpoint: "passed", appless: true });
    await rm(path.join(directory, "README.md"));
    await mkdir(path.join(directory, "README.md"));
    assert.deepEqual((await readFrontends(directory)).milestones.contract, false, "an unreadable README never fails the .env read");
});
