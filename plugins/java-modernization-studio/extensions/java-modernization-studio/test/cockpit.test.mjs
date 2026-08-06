// cockpit.test.mjs — Test suite for the Java Modernization Studio canvas.
// Run with:  node --test test/cockpit.test.mjs
//
// Covers the testable modules (scan, catalog, prompts, renderer, server). It does
// NOT import extension.mjs, which calls joinSession() at module load and needs a
// live CLI session.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { EventEmitter } from "node:events";

import { scanRepo } from "../scan.mjs";
import { PREDEFINED_TASKS, catalogWithRelevance, VALIDATION_GATES } from "../catalog.mjs";
import { buildPrompt, ACTION_LABELS } from "../prompts.mjs";
import { renderHtml } from "../renderer.mjs";
import {
    buildDoctorReport,
    parseToolVersion,
    probeOne,
    runDoctor,
    augmentedEnv,
    discoverJavaHome,
    parseJavaHomeFromRc,
    TOOL_PROBES,
} from "../doctor.mjs";
import {
    resolveRepoPath,
    broadcast,
    pushState,
    dispatchAction,
    makeHandler,
    createInstanceServer,
} from "../server.mjs";
import {
    selectNextStep,
    stepKey,
    isStepDone,
    makeRun,
    runAutopilot,
} from "../autopilot.mjs";

// ---- helpers ----------------------------------------------------------------

// Minimal provenance: a .appmod/ artifact tells the scanner this repo is actively
// running the modernization workflow, so root plan/progress/summary are trusted as
// workflow state (vs. unrelated files that merely share those names).
const PROV = { ".appmod/assessment.json": "{}" };

async function makeRepo(files = {}) {
    const dir = await mkdtemp(join(tmpdir(), "appmod-test-"));
    for (const [rel, content] of Object.entries(files)) {
        const full = join(dir, rel);
        await mkdir(dirname(full), { recursive: true });
        await writeFile(full, content);
    }
    return dir;
}

async function withRepo(files, fn) {
    const dir = await makeRepo(files);
    try {
        return await fn(dir);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

function git(dir, ...args) {
    execFileSync("git", args, { cwd: dir, stdio: "pipe" });
}

function fakeRes() {
    return {
        statusCode: 200,
        headers: {},
        body: "",
        ended: false,
        setHeader(k, v) {
            this.headers[String(k).toLowerCase()] = v;
        },
        writeHead(code, hdrs) {
            this.statusCode = code;
            if (hdrs) for (const k of Object.keys(hdrs)) this.headers[k.toLowerCase()] = hdrs[k];
        },
        write(s) {
            this.body += s;
        },
        end(s) {
            if (s !== undefined) this.body += s;
            this.ended = true;
        },
    };
}

// Drive makeHandler with a fake POST request stream.
async function invokePost(handler, path, payloadObj) {
    const req = new EventEmitter();
    req.method = "POST";
    req.url = path;
    const res = fakeRes();
    const pending = handler(req, res);
    req.emit("data", JSON.stringify(payloadObj));
    req.emit("end");
    await pending;
    return res;
}

async function invokeGet(handler, path) {
    const req = new EventEmitter();
    req.method = "GET";
    req.url = path;
    const res = fakeRes();
    await handler(req, res);
    return { req, res };
}

// ===========================================================================
// scan.mjs
// ===========================================================================

test("scan: nonexistent path returns ok:false", async () => {
    const s = await scanRepo("/no/such/path/at/all/xyz");
    assert.equal(s.ok, false);
});

test("scan: empty repo is not_started with all gates not_run", async () => {
    await withRepo({}, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.ok, true);
        assert.equal(s.status, "not_started");
        assert.equal(s.percent, 0);
        assert.equal(s.plan.exists, false);
        assert.equal(s.progress.exists, false);
        assert.equal(s.summary.exists, false);
        for (const g of VALIDATION_GATES) assert.equal(s.gates[g.key], "not_run");
    });
});

test("scan: Maven Java version from properties", async () => {
    await withRepo(
        { "pom.xml": "<project><properties><java.version>8</java.version></properties></project>" },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.equal(s.assessment.buildTool, "Maven");
            assert.equal(s.assessment.javaVersion, "8");
        }
    );
});

test("scan: Maven compiler release strips 1.x and detects", async () => {
    await withRepo(
        { "pom.xml": "<project><properties><maven.compiler.release>17</maven.compiler.release></properties></project>" },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.equal(s.assessment.javaVersion, "17");
        }
    );
});

test("scan: Gradle build tool + sourceCompatibility", async () => {
    await withRepo(
        { "build.gradle": "sourceCompatibility = '11'\napply plugin: 'java'" },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.equal(s.assessment.buildTool, "Gradle");
            assert.equal(s.assessment.javaVersion, "11");
        }
    );
});

test("scan: nested module pom is discovered", async () => {
    await withRepo(
        { "service/pom.xml": "<project><properties><java.version>8</java.version></properties></project>" },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.equal(s.assessment.buildTool, "Maven");
            assert.equal(s.assessment.javaVersion, "8");
        }
    );
});

test("scan: Spring Boot detection", async () => {
    await withRepo(
        { "pom.xml": "<project><dependencies><dependency><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>" },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.equal(s.assessment.springBoot, true);
        }
    );
});

test("scan: Dockerfile detected at root and one level down", async () => {
    await withRepo({ Dockerfile: "FROM tomcat:9" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.assessment.hasDockerfile, true);
    });
    await withRepo({ "svc/Dockerfile": "FROM tomcat:9" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.assessment.hasDockerfile, true);
    });
});

test("scan: dependency relevance flags the right catalog tasks", async () => {
    const cases = [
        ["spring-boot-starter-amqp", "rabbitmq-to-servicebus"],
        ["activemq-client", "activemq-to-servicebus"],
        ["aws-java-sdk-s3", "aws-s3-to-blob"],
        ["ojdbc8", "databases-to-azure"],
        ["spring-ldap-core", "entra-id-auth"],
    ];
    for (const [dep, taskId] of cases) {
        await withRepo(
            { "pom.xml": `<project><dependencies><dependency><artifactId>${dep}</artifactId></dependency></dependencies></project>` },
            async (dir) => {
                const s = await scanRepo(dir, { includeGit: false });
                const task = s.tasks.find((t) => t.id === taskId);
                assert.ok(task, `task ${taskId} exists`);
                assert.equal(task.relevant, true, `${dep} -> ${taskId} relevant`);
            }
        );
    }
});

test("scan: checklist statuses (done / in_progress / pending)", async () => {
    await withRepo(
        { ...PROV, "progress.md": "- [x] Done step\n- [/] Working step\n- [ ] Todo step\n" },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            const byTitle = Object.fromEntries(s.progress.steps.map((x) => [x.title, x.status]));
            assert.equal(byTitle["Done step"], "done");
            assert.equal(byTitle["Working step"], "in_progress");
            assert.equal(byTitle["Todo step"], "pending");
        }
    );
});

test("scan: emoji status markers override", async () => {
    await withRepo(
        { ...PROV, "progress.md": "- [ ] Build ✅\n- [ ] Tests ❌\n" },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            const byTitle = Object.fromEntries(
                s.progress.steps.map((x) => [x.title.replace(/[^A-Za-z ].*/, "").trim(), x.status])
            );
            assert.equal(byTitle["Build"], "done");
            assert.equal(byTitle["Tests"], "failed");
        }
    );
});

test("scan: numbered-list fallback when no checkboxes", async () => {
    await withRepo({ ...PROV, "plan.md": "# Plan\n1. First thing\n2. Second thing\n" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.plan.steps.length, 2);
        assert.equal(s.plan.steps[0].title, "First thing");
    });
});

test("scan: heading fallback when no checkboxes or numbers", async () => {
    await withRepo({ ...PROV, "plan.md": "# Title\n## Phase one\n## Phase two\n" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        const titles = s.plan.steps.map((x) => x.title);
        assert.deepEqual(titles, ["Phase one", "Phase two"]);
    });
});

test("scan: percent counts in_progress as half", async () => {
    await withRepo(
        { ...PROV, "progress.md": "- [x] a\n- [/] b\n- [ ] c\n- [ ] d\n" },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            // (1 + 0.5) / 4 = 37.5 -> 38
            assert.equal(s.percent, 38);
        }
    );
});

test("scan: gates derived from matching step titles", async () => {
    await withRepo(
        { ...PROV, "progress.md": "- [x] Unit Tests pass\n- [/] Build app\n- [ ] CVE scan\n" },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.equal(s.gates.tests, "done");
            assert.equal(s.gates.build, "in_progress");
            assert.equal(s.gates.cve, "pending"); // matched but not run
            assert.equal(s.gates.consistency, "not_run"); // unmatched
        }
    );
});

test("scan: gates scope to an explicit Validation section, not assessment text", async () => {
    // Assessment rows mention "build" and "vulnerable" (done); they must NOT
    // satisfy the Build/CVE gates, which live in the Validation section (pending).
    const md = [
        "## Assessment",
        "- [x] Inventory runtime, build tool, dependencies",
        "- [x] Identify vulnerable dependencies",
        "",
        "## Validation gates",
        "- [ ] Build — mvn clean package succeeds",
        "- [ ] CVE Check — no critical CVEs",
        "",
        "## Next",
        "- [x] something else with the word build in it",
    ].join("\n");
    await withRepo({ ...PROV, "progress.md": md }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.gates.build, "pending");
        assert.equal(s.gates.cve, "pending");
    });
});

test("scan: status is completed when summary.md present", async () => {
    await withRepo({ ...PROV, "summary.md": "# done" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.status, "completed");
    });
});

test("scan: status is in_progress when only plan present", async () => {
    await withRepo({ ...PROV, "plan.md": "- [ ] a" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.status, "in_progress");
    });
});

test("scan: reads .appmod/assessment.json into report", async () => {
    const report = {
        generatedAt: "2026-01-01T00:00:00Z",
        headline: "h",
        findings: [{ id: "x", severity: "P0", title: "t", detail: "d", files: ["a"], action: { kind: "fix_finding" } }],
    };
    await withRepo({ ".appmod/assessment.json": JSON.stringify(report) }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.ok(s.report, "report should be present");
        assert.equal(s.report.findings.length, 1);
        assert.equal(s.report.findings[0].severity, "P0");
    });
});

test("scan: report is null when assessment.json absent or malformed", async () => {
    await withRepo({ "pom.xml": "<project/>" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.report, null);
    });
    await withRepo({ ".appmod/assessment.json": "{ not valid json" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.report, null, "malformed JSON should not throw, just yield null");
    });
});

// ---- provenance gate (cross-repo safety) ------------------------------------

test("scan: an unrelated summary.md without provenance does NOT mark completed", async () => {
    await withRepo({ "summary.md": "# My library\nUsage and changelog notes." }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.notEqual(s.status, "completed", "a stray summary.md must not flip status to completed");
        assert.equal(s.status, "not_started");
        assert.equal(s.summary.exists, false, "untrusted summary is treated as absent");
    });
});

test("scan: an unrelated plan.md without provenance is not treated as workflow steps", async () => {
    await withRepo({ "plan.md": "# Roadmap\n- [ ] ship feature x\n- [ ] write docs\n" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.plan.steps.length, 0, "stray checkboxes must not become modernization steps");
        assert.equal(s.status, "not_started");
    });
});

test("scan: assessment.json provenance makes a root progress.md trusted", async () => {
    await withRepo(
        { ".appmod/assessment.json": "{}", "progress.md": "## P0\n- [x] a\n- [ ] b\n" },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.equal(s.progress.steps.length, 2);
            assert.equal(s.status, "in_progress");
        }
    );
});

test("scan: an explicit appmod marker makes a root plan trusted without .appmod/", async () => {
    await withRepo(
        { "plan.md": "<!-- appmod-cockpit -->\n## P0 Build\n- [ ] Fix build\n" },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.equal(s.plan.steps.length, 1, "marked file is trusted");
            assert.equal(s.status, "in_progress");
        }
    );
});

test("scan: .appmod/ namespaced docs are trusted and take precedence over root", async () => {
    await withRepo(
        {
            ".appmod/plan.md": "## P0\n- [ ] from appmod\n",
            "plan.md": "## P0\n- [ ] from root\n- [ ] root two\n",
        },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.equal(s.plan.steps.length, 1, "uses .appmod/plan.md, not the root copy");
            assert.equal(s.plan.steps[0].title, "from appmod");
        }
    );
});

test("scan: a non-directory path is reported unavailable (not scanned)", async () => {
    await withRepo({ "pom.xml": "<project/>" }, async (dir) => {
        const s = await scanRepo(join(dir, "pom.xml"), { includeGit: false });
        assert.equal(s.ok, false, "a file path is not a repo");
    });
});

test("scan: steps carry their section heading", async () => {
    const md = "# Plan\n## P0 — Build\n- [x] a\n- [ ] b\n## P1 — Secrets\n- [ ] c\n";
    await withRepo({ ...PROV, "progress.md": md }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        const byTitle = Object.fromEntries(s.progress.steps.map((x) => [x.title, x.section]));
        assert.equal(byTitle["a"], "P0 — Build");
        assert.equal(byTitle["b"], "P0 — Build");
        assert.equal(byTitle["c"], "P1 — Secrets");
    });
});

test("scan: ordering computes the active phase, ranks, and per-phase counts", async () => {
    const md =
        "# Plan\n## Assessment\n- [x] a1\n- [x] a2\n" +
        "## P0 — Build consistency\n- [x] b1\n- [ ] b2\n" +
        "## P1 — Secrets & identity\n- [ ] c1\n- [ ] c2\n" +
        "## Validation gates\n- [ ] v1\n";
    await withRepo({ ...PROV, "progress.md": md }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.ordering.activeRank, 1, "P0 is the active rank");
        assert.match(s.ordering.activePhase, /P0/);
        // Per-phase roll-up.
        const byName = Object.fromEntries(s.ordering.phases.map((p) => [p.name, p]));
        assert.equal(byName["Assessment"].done, 2);
        assert.equal(byName["Assessment"].total, 2);
        assert.equal(byName["P0 — Build consistency"].done, 1);
        assert.equal(byName["P0 — Build consistency"].total, 2);
        assert.equal(byName["P1 — Secrets & identity"].done, 0);
        // Each step carries a phase rank; P1 steps sit ahead of the active P0.
        const byTitle = Object.fromEntries(s.progress.steps.map((x) => [x.title, x.rank]));
        assert.equal(byTitle["a1"], 0);
        assert.equal(byTitle["b2"], 1);
        assert.equal(byTitle["c1"], 2);
        assert.ok(byTitle["c1"] > s.ordering.activeRank, "P1 step is ahead of sequence (locked)");
    });
});

test("scan: ordering activeRank is null once every ranked step is done", async () => {
    const md = "# Plan\n## Assessment\n- [x] a\n## P0 — Build\n- [x] b\n";
    await withRepo({ ...PROV, "progress.md": md }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.ordering.activeRank, null);
        assert.equal(s.ordering.activePhase, null);
    });
});


test("scan: discovers custom skills from .github/skills", async () => {
    await withRepo(
        {
            ".github/skills/my-skill/SKILL.md": "name: My Skill\ndescription: Does a thing\n",
            ".github/skills/other/SKILL.md": "# Other Skill\n",
        },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.equal(s.skills.length, 2);
            const mine = s.skills.find((x) => x.folder === "my-skill");
            assert.equal(mine.name, "My Skill");
            assert.equal(mine.description, "Does a thing");
        }
    );
});

test("scan: git branch + migration detection + dirty flag", async () => {
    await withRepo({ "pom.xml": "<project/>", "README.md": "x" }, async (dir) => {
        git(dir, "init", "-b", "modernize-java21");
        git(dir, "config", "user.email", "t@example.com");
        git(dir, "config", "user.name", "Test");
        git(dir, "add", ".");
        git(dir, "commit", "-m", "init", "--no-gpg-sign");

        let s = await scanRepo(dir);
        assert.equal(s.git.branch, "modernize-java21");
        assert.equal(s.git.isMigrationBranch, true);
        assert.equal(s.git.dirty, false);

        await writeFile(join(dir, "new.txt"), "hi");
        s = await scanRepo(dir);
        assert.equal(s.git.dirty, true);
        assert.equal(s.git.changedFiles, 1);
    });
});

// ===========================================================================
// doctor.mjs (environment readiness)
// ===========================================================================

function fakeExec(map) {
    // map: cmd -> { stdout?, stderr?, error? }   (missing cmd => ENOENT)
    return async (cmd) => {
        const r = map[cmd];
        if (!r) return { error: Object.assign(new Error("not found"), { code: "ENOENT" }), stdout: "", stderr: "" };
        return { error: r.error || null, stdout: r.stdout || "", stderr: r.stderr || "" };
    };
}

test("doctor: parseToolVersion handles java (stderr), node, and generic output", () => {
    assert.equal(parseToolVersion("java", 'openjdk version "17.0.2" 2022-01-18'), "17.0.2");
    assert.equal(parseToolVersion("node", "v22.3.0"), "22.3.0");
    assert.equal(parseToolVersion("git", "git version 2.39.5"), "2.39.5");
    assert.equal(parseToolVersion("x", ""), null);
});

test("doctor: probeOne reports not-found on ENOENT and found otherwise", async () => {
    const exec = fakeExec({ java: { stderr: 'openjdk version "21.0.1"' } });
    const found = await probeOne({ key: "java", cmd: "java", args: ["-version"] }, exec);
    assert.deepEqual(found, { key: "java", found: true, version: "21.0.1" });
    const missing = await probeOne({ key: "mvn", cmd: "mvn", args: ["-v"] }, exec);
    assert.equal(missing.found, false);
});

test("doctor: probeOne rejects the macOS java stub (non-zero exit, no version)", async () => {
    const stub = async () => ({
        error: Object.assign(new Error("exit 1"), { code: 1 }),
        stdout: "",
        stderr: "The operation couldn't be completed. Unable to locate a Java Runtime.",
    });
    const r = await probeOne({ key: "java", cmd: "java", args: ["-version"] }, stub);
    assert.equal(r.found, false, "stub with no real version is treated as not installed");
});

test("doctor: missing JDK + missing Maven (no wrapper) blocks readiness", () => {
    const rep = buildDoctorReport({
        probes: { git: { found: true, version: "2.39" } },
        scan: { ok: true, assessment: { buildTool: "Maven", hasMavenWrapper: false }, git: { branch: "main" }, plan: {}, progress: {} },
    });
    assert.equal(rep.overall, "blocked");
    const checks = rep.groups.flatMap((g) => g.checks);
    const jdk = checks.find((c) => c.id === "jdk");
    assert.equal(jdk.status, "fail");
    assert.ok(jdk.action && jdk.action.kind === "fix_env", "JDK failure offers a fix_env action");
    const build = checks.find((c) => c.id === "build");
    assert.equal(build.status, "fail");
});

test("doctor: a Maven wrapper satisfies the build-tool check without mvn installed", () => {
    const rep = buildDoctorReport({
        probes: { java: { found: true, version: "17" }, git: { found: true } },
        scan: { ok: true, assessment: { buildTool: "Maven", hasMavenWrapper: true }, git: { branch: "x" }, progress: { exists: true } },
    });
    const build = rep.groups.flatMap((g) => g.checks).find((c) => c.id === "build");
    assert.equal(build.status, "ok");
    assert.match(build.detail, /wrapper/i);
});

test("doctor: a Dockerfile without Docker is a caution (warn), not a blocker", () => {
    const rep = buildDoctorReport({
        probes: { java: { found: true }, mvn: { found: true }, git: { found: true } },
        scan: { ok: true, assessment: { buildTool: "Maven", hasDockerfile: true }, git: { branch: "x" }, progress: { exists: true } },
    });
    const docker = rep.groups.flatMap((g) => g.checks).find((c) => c.id === "docker");
    assert.equal(docker.status, "warn");
    assert.equal(rep.overall, "caution");
});

test("doctor: no assessment yet surfaces a start_assessment action", () => {
    const rep = buildDoctorReport({
        probes: { java: { found: true }, mvn: { found: true }, git: { found: true } },
        scan: { ok: true, assessment: { buildTool: "Maven" }, git: { branch: "x" }, plan: { exists: false }, progress: { exists: false } },
    });
    const assessed = rep.groups.flatMap((g) => g.checks).find((c) => c.id === "assessed");
    assert.equal(assessed.status, "warn");
    assert.equal(assessed.action.kind, "start_assessment");
});

test("doctor: everything present is ready", () => {
    const rep = buildDoctorReport({
        probes: {
            java: { found: true, version: "21" }, mvn: { found: true }, git: { found: true },
            docker: { found: true }, az: { found: true }, azd: { found: true }, node: { found: true },
        },
        scan: { ok: true, assessment: { buildTool: "Maven" }, git: { branch: "modernize", isMigrationBranch: true }, progress: { exists: true }, skills: [{ folder: "a" }] },
    });
    assert.equal(rep.overall, "ready");
});

test("doctor: runDoctor probes every tool via the injected exec", async () => {
    const exec = fakeExec({
        java: { stderr: 'openjdk version "17.0.9"' },
        git: { stdout: "git version 2.40.0" },
    });
    const rep = await runDoctor(
        { ok: true, assessment: { buildTool: "Maven" }, git: { branch: "x" }, progress: { exists: true } },
        { exec }
    );
    assert.ok(rep.groups.length >= 3);
    assert.equal(TOOL_PROBES.length, 8);
});

test("doctor: augmentedEnv covers Homebrew, keg JDKs, SDKMAN, and JAVA_HOME (macOS)", () => {
    // GUI apps inherit a minimal PATH; the doctor must still find tools the user's
    // terminal sees. Inject a directory lister so the test doesn't hit the filesystem.
    const lister = (d) => (d === "/opt/homebrew/opt" ? ["openjdk@21", "openjdk", "maven", "node@20"] : []);
    const env = augmentedEnv({ PATH: "/usr/bin:/bin", HOME: "/Users/x", JAVA_HOME: "/jh" }, "darwin", lister);
    const parts = env.PATH.split(":");
    assert.ok(parts.includes("/opt/homebrew/bin"), "Homebrew bin");
    assert.ok(parts.includes("/jh/bin"), "JAVA_HOME/bin");
    assert.ok(parts.includes("/Users/x/.sdkman/candidates/java/current/bin"), "SDKMAN");
    assert.ok(parts.includes("/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home/bin"), "versioned keg");
    assert.ok(parts.includes("/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home/bin"), "unversioned keg");
    assert.ok(!parts.some((p) => /\/maven\/libexec\/openjdk/.test(p)), "non-JDK kegs are skipped");
    assert.ok(env.PATH.endsWith("/usr/bin:/bin"), "original PATH preserved at the tail");
});

test("doctor: augmentedEnv is a no-op on Windows and tolerates a bare env", () => {
    assert.equal(augmentedEnv({ PATH: "C:\\Windows" }, "win32", () => []).PATH, "C:\\Windows");
    // No HOME/JAVA_HOME/PATH provided — must not throw and still prepend brew bins.
    const env = augmentedEnv({}, "darwin", () => []);
    assert.ok(env.PATH.split(":").includes("/opt/homebrew/bin"));
});

test("doctor: discoverJavaHome respects an explicit JAVA_HOME and skips rc files", async () => {
    let read = false;
    const readRc = async () => { read = true; return ""; };
    const jh = await discoverJavaHome({ JAVA_HOME: "/explicit/jdk" }, "darwin", readRc);
    assert.equal(jh, "/explicit/jdk");
    assert.equal(read, false, "must not read rc files when JAVA_HOME is already set");
});

test("doctor: discoverJavaHome statically parses a literal JAVA_HOME from the rc (no shell)", async () => {
    const reads = [];
    const readRc = async (p) => {
        reads.push(p);
        if (/\.zshrc$/.test(p)) {
            return 'export PATH="$HOME/bin:$PATH"\nexport JAVA_HOME="$HOME/.sdkman/candidates/java/current"\n';
        }
        return null;
    };
    const jh = await discoverJavaHome({ HOME: "/Users/x", SHELL: "/bin/zsh" }, "darwin", readRc);
    assert.equal(jh, "/Users/x/.sdkman/candidates/java/current", "expands $HOME, no execution");
    assert.ok(reads.some((p) => /\.zshrc$/.test(p)), "reads the zsh rc files");
});

test("doctor: discoverJavaHome returns null on Windows, no match, unresolved subst, or read error", async () => {
    assert.equal(await discoverJavaHome({ HOME: "/h" }, "win32", async () => "export JAVA_HOME=/x"), null);
    assert.equal(
        await discoverJavaHome({ HOME: "/h", SHELL: "/bin/zsh" }, "darwin", async () => "# nothing here"),
        null
    );
    // Command substitution can't be resolved statically -> null (falls back to PATH probing).
    assert.equal(
        await discoverJavaHome({ HOME: "/h", SHELL: "/bin/zsh" }, "darwin", async () =>
            "export JAVA_HOME=$(/usr/libexec/java_home -v 21)"
        ),
        null
    );
    assert.equal(
        await discoverJavaHome({ HOME: "/h", SHELL: "/bin/zsh" }, "darwin", async () => { throw new Error("boom"); }),
        null
    );
});

test("doctor: parseJavaHomeFromRc handles quotes, comments, ~ and last-wins", () => {
    assert.equal(parseJavaHomeFromRc("export JAVA_HOME=/opt/jdk17 # pinned", {}), "/opt/jdk17");
    assert.equal(parseJavaHomeFromRc("JAVA_HOME='/opt/jdk21'", {}), "/opt/jdk21");
    assert.equal(parseJavaHomeFromRc("export JAVA_HOME=~/jdks/21", { HOME: "/Users/x" }), "/Users/x/jdks/21");
    assert.equal(
        parseJavaHomeFromRc("export JAVA_HOME=/a\nexport JAVA_HOME=/b", {}),
        "/b",
        "later assignment wins"
    );
    assert.equal(parseJavaHomeFromRc("export NOTJAVA=/x", {}), null);
});

test("prompts: fix_env requires a tool and embeds the readiness detail", () => {
    const p = buildPrompt("fix_env", { tool: "a JDK", detail: "java not found", fix: "Install Temurin" }, "/r");
    assert.match(p, /a JDK/);
    assert.match(p, /java not found/);
    assert.match(p, /do not modify my application code/i);
    assert.equal(buildPrompt("fix_env", {}, "/r"), null);
});

test("scan: detects Maven/Gradle wrappers for the doctor", async () => {
    await withRepo({ "pom.xml": "<project/>", "mvnw": "#!/bin/sh\n" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.assessment.hasMavenWrapper, true);
        assert.equal(s.assessment.hasGradleWrapper, false);
    });
});

test("scan: detects Windows wrapper scripts (mvnw.cmd / gradlew.bat)", async () => {
    await withRepo({ "pom.xml": "<project/>", "mvnw.cmd": "@echo off\n" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.assessment.hasMavenWrapper, true, "mvnw.cmd counts as a wrapper");
    });
    await withRepo({ "build.gradle": "plugins {}", "gradlew.bat": "@echo off\n" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.assessment.hasGradleWrapper, true, "gradlew.bat counts as a wrapper");
    });
});

test("scan: Dockerfile detection is case-insensitive and accepts Containerfile", async () => {
    await withRepo({ "dockerfile": "FROM tomcat:9" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.assessment.hasDockerfile, true, "lowercase dockerfile");
    });
    await withRepo({ "Containerfile": "FROM tomcat:9" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.assessment.hasDockerfile, true, "Podman Containerfile");
    });
});

test("scan: multi-module repo unions Java version + deps across modules (not just the first)", async () => {
    await withRepo(
        {
            "pom.xml": "<project><packaging>pom</packaging><modules><module>api</module><module>worker</module></modules></project>",
            "api/pom.xml": "<project><properties><java.version>17</java.version></properties></project>",
            "worker/pom.xml":
                "<project><dependencies><dependency><groupId>com.rabbitmq</groupId><artifactId>amqp-client</artifactId></dependency></dependencies></project>",
        },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.equal(s.assessment.buildTool, "Maven");
            assert.equal(s.assessment.javaVersion, "17", "Java version comes from a module, not the aggregator");
            assert.ok(
                s.assessment.detectedKeys.includes("rabbitmq"),
                "a dependency declared only in a second module is still detected"
            );
        }
    );
});

test("scan: dependency matching no longer fires on English words containing a token", async () => {
    // "important"/"constant" contain "ant"; a plain substring match used to flag Ant.
    await withRepo(
        {
            "pom.xml":
                "<project><description>An important and constant service</description></project>",
        },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.ok(!s.assessment.detectedKeys.includes("ant"), "no false Ant detection");
        }
    );
    // A real Ant build is still flagged, via the build tool.
    await withRepo({ "build.xml": "<project default=\"build\"></project>" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.assessment.buildTool, "Ant");
        assert.ok(s.assessment.detectedKeys.includes("ant"), "genuine Ant build is detected");
    });
});

test("scan: a real coordinate token is still matched with boundary-aware logic", async () => {
    await withRepo(
        {
            "pom.xml":
                "<project><dependencies><dependency><artifactId>aws-java-sdk-s3</artifactId></dependency></dependencies></project>",
        },
        async (dir) => {
            const s = await scanRepo(dir, { includeGit: false });
            assert.ok(s.assessment.detectedKeys.includes("awsS3"));
        }
    );
});

test("scan: assessment.json is normalized (severity aliases, files string, bad shapes)", async () => {
    const raw = {
        findings: [
            { id: "a", severity: "critical", title: "x", files: "only/one.txt" },
            { id: "b", severity: "high", title: "y" },
            { id: "c", severity: "weird", title: "z", files: ["k.txt", 5] },
            "not-an-object",
            { severity: "low" },
        ],
        strengths: "single strength",
    };
    await withRepo({ ".appmod/assessment.json": JSON.stringify(raw) }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        const f = s.report.findings;
        assert.equal(f.length, 4, "non-object findings are dropped, valid ones kept");
        assert.equal(f[0].severity, "P0", "critical -> P0");
        assert.deepEqual(f[0].files, ["only/one.txt"], "string files -> array");
        assert.equal(f[1].severity, "P1", "high -> P1");
        assert.equal(f[2].severity, "P3", "unknown severity -> P3 (kept, not dropped)");
        assert.deepEqual(f[2].files, ["k.txt"], "non-string file entries filtered out");
        assert.equal(f[3].title, "Untitled finding", "missing title gets a fallback");
        assert.deepEqual(s.report.strengths, ["single strength"], "string strengths -> array");
    });
});

test("scan: a non-object assessment.json yields a null report (no crash)", async () => {
    await withRepo({ ".appmod/assessment.json": "42" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.report, null);
    });
    await withRepo({ ".appmod/assessment.json": "[1,2,3]" }, async (dir) => {
        const s = await scanRepo(dir, { includeGit: false });
        assert.equal(s.report, null, "a top-level array is not a valid report");
    });
});



test("catalog: has 16 well-formed tasks", () => {
    assert.equal(PREDEFINED_TASKS.length, 16);
    for (const t of PREDEFINED_TASKS) {
        assert.ok(t.id && t.name && t.category && t.summary, "task fields present: " + t.id);
        assert.ok(Array.isArray(t.detect));
    }
    const ids = new Set(PREDEFINED_TASKS.map((t) => t.id));
    assert.equal(ids.size, PREDEFINED_TASKS.length, "ids are unique");
});

test("catalog: catalogWithRelevance flags only matching detect keys", () => {
    const withRel = catalogWithRelevance(["rabbitmq"]);
    assert.equal(withRel.find((t) => t.id === "rabbitmq-to-servicebus").relevant, true);
    assert.equal(withRel.find((t) => t.id === "aws-s3-to-blob").relevant, false);
});

// ===========================================================================
// prompts.mjs
// ===========================================================================

test("prompts: every labelled action builds a non-empty prompt", () => {
    for (const kind of Object.keys(ACTION_LABELS)) {
        const payload =
            kind === "run_task"
                ? { taskId: PREDEFINED_TASKS[0].id }
                : kind === "run_skill"
                ? { folder: "x" }
                : kind === "fix_finding"
                ? { title: "Some finding" }
                : kind === "work_step"
                ? { title: "Some step" }
                : kind === "fix_env"
                ? { tool: "a JDK" }
                : {};
        const p = buildPrompt(kind, payload, "/repo");
        assert.ok(typeof p === "string" && p.length > 0, "prompt for " + kind);
    }
});

test("prompts: run_task unknown id returns null", () => {
    assert.equal(buildPrompt("run_task", { taskId: "nope" }, "/repo"), null);
});

test("prompts: run_task known id embeds the task name", () => {
    const p = buildPrompt("run_task", { taskId: "aws-s3-to-blob" }, "/repo");
    assert.match(p, /AWS S3 to Azure Storage Blob/);
});

test("prompts: assessment embeds repo path; generate_plan embeds target", () => {
    assert.match(buildPrompt("start_assessment", {}, "/my/repo"), /\/my\/repo/);
    assert.match(buildPrompt("generate_plan", { targetJava: 21 }, "/r"), /Java 21/);
});

test("prompts: appmod tools referenced by hash command", () => {
    assert.match(buildPrompt("run_cve", {}, "/r"), /#appmod-validate-cves-for-java/);
    assert.match(buildPrompt("generate_tests", {}, "/r"), /#appmod-generate-tests-for-java/);
});

test("prompts: unknown kind returns null", () => {
    assert.equal(buildPrompt("bogus", {}, "/r"), null);
});

test("prompts: fix_finding embeds the finding title/detail and needs a title", () => {
    const p = buildPrompt("fix_finding", { title: "TLS off", detail: "encrypt=false", files: ["db.properties"], severity: "P1" }, "/r");
    assert.match(p, /TLS off/);
    assert.match(p, /encrypt=false/);
    assert.match(p, /db\.properties/);
    assert.equal(buildPrompt("fix_finding", {}, "/r"), null, "no title -> null");
});

test("prompts: start_assessment instructs writing structured assessment.json", () => {
    const p = buildPrompt("start_assessment", {}, "/my/repo");
    assert.match(p, /\.appmod\/assessment\.json/);
    assert.match(p, /findings/);
    assert.match(p, /P0\|P1\|P2\|P3/);
});

test("prompts: fix_finding has a label in ACTION_LABELS", () => {
    assert.ok(ACTION_LABELS.fix_finding, "fix_finding should be labelled");
});

test("prompts: work_step embeds the step title + phase and requires a title", () => {
    const p = buildPrompt("work_step", { title: "Add ingress TLS", section: "P1 — Secrets & identity" }, "/r");
    assert.match(p, /Add ingress TLS/);
    assert.match(p, /P1 — Secrets & identity/);
    assert.match(p, /progress\.md/);
    assert.equal(buildPrompt("work_step", {}, "/r"), null, "no title -> null");
});

// ===========================================================================
// renderer.mjs
// ===========================================================================

test("renderer: returns full HTML doc with app root and boot blob", () => {
    const html = renderHtml({ instanceId: "abc", initialTab: "plan" });
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /id="app"/);
    assert.match(html, /Java Modernization Studio/);
    assert.match(html, /"initialTab":"plan"/);
    assert.match(html, /"instanceId":"abc"/);
});

test("renderer: defaults initialTab to overview", () => {
    const html = renderHtml({ instanceId: "x" });
    assert.match(html, /"initialTab":"overview"/);
});

test("renderer: button hover is contrast-safe (no inverted emphasis background)", () => {
    const html = renderHtml({ instanceId: "css" });
    const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
    // Regression: a `:hover` must never swap a dark-text button onto the dark
    // `--background-color-emphasis` surface (that made hovered text unreadable).
    assert.ok(!/:hover[^}]*background-color-emphasis/.test(css), "no emphasis background on hover");
    // The default (non-primary) button keeps a readable surface on hover.
    assert.match(css, /button\.btn:not\(\.primary\):not\(:disabled\):hover/);
    // Keyboard users get a visible focus ring.
    assert.match(css, /button\.btn:focus-visible/);
});

test("renderer: boot blob escapes < so it cannot break out of <script>", () => {
    const html = renderHtml({ instanceId: "</script><script>bad", initialTab: "overview" });
    // The dangerous literal must not appear as a real closing tag + injected script.
    assert.ok(!html.includes("</script><script>bad"));
    assert.match(html, /\\u003c\/script>/);
});

test("renderer: includes an Assessment tab and the guided journey/findings UI", () => {
    const html = renderHtml({ instanceId: "z", initialTab: "assessment" });
    assert.match(html, /data-tab="assessment"/);
    assert.match(html, /assessmentTab/);
    assert.match(html, /journeyHtml/);
    assert.match(html, /function heroNext/);
    assert.match(html, /findingCard/);
    assert.match(html, /goto:assessment/);
    assert.match(html, /"initialTab":"assessment"/);
});

test("renderer: ships CSS for stepper, hero, and severity finding cards", () => {
    const html = renderHtml({ instanceId: "z" });
    assert.match(html, /\.stepper/);
    assert.match(html, /\.hero/);
    assert.match(html, /\.finding\.sev-P0/);
});

test("renderer: Plan tab is actionable (work_step buttons, grouping, continue-here)", () => {
    const html = renderHtml({ instanceId: "z", initialTab: "plan" });
    assert.match(html, /function planTab/);
    assert.match(html, /work_step/);
    assert.match(html, /stepRowAction/);
    assert.match(html, /Continue here/);
    assert.match(html, /Work on this/);
});

test("renderer: Plan tab ships the ordering guardrails (approach guide + locks + override)", () => {
    const html = renderHtml({ instanceId: "z", initialTab: "plan" });
    assert.match(html, /Recommended approach/);
    assert.match(html, /function approachGuide/);
    // Lock-with-override: locked rows show a reason and a de-emphasized "Do anyway".
    assert.match(html, /Do anyway/);
    assert.match(html, /function shortPhase/);
    assert.match(html, /s\.ordering|ordering/);
});

test("renderer: Assessment-tab findings honor the same phase locks", () => {
    const html = renderHtml({ instanceId: "z", initialTab: "assessment" });
    assert.match(html, /function isFindingLocked/);
    assert.match(html, /function sevRank/);
    assert.match(html, /issues first/);
});

test("renderer: Readiness tab + nav are wired (doctor checks, re-check, fix actions)", () => {
    const html = renderHtml({ instanceId: "z", initialTab: "readiness" });
    assert.match(html, /function doctorTab/);
    assert.match(html, /data-tab="readiness"/);
    assert.match(html, /Environment readiness/);
    assert.match(html, /recheck_env/);
    assert.match(html, /function checkIcon/);
    assert.match(html, /Open Readiness/); // overview nudge when blocked
});

// Execute the serialized client against a realistic state and return the #app
// HTML for a given tab. Runs the script with `new Function` (global scope, NOT
// this module's lexical scope) so a stray reference to an undeclared variable
// surfaces as a real ReferenceError instead of silently resolving to a leaked
// local — that scope leak is exactly what hid a "dead Plan tab" regression.
async function renderClientTab(state, initialTab) {
    const html = renderHtml({ instanceId: "exec", initialTab });
    const script = html.split("<script>")[1].split("</script>")[0];
    const slots = {};
    const make = (id) => ({
        _html: "", id,
        set innerHTML(v) { this._html = v; },
        get innerHTML() { return this._html; },
        addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; },
        classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, style: {}, dataset: {}, textContent: "",
    });
    const win = { __APPMOD__: { instanceId: "exec", initialTab }, addEventListener() {}, location: {}, scrollTo() {} };
    const ES = class { constructor() {} addEventListener() {} close() {} };
    const doc = {
        getElementById: (id) => { if (!slots[id]) slots[id] = make(id); return slots[id]; },
        querySelectorAll: () => [],
        querySelector: (s) => { if (typeof s === "string" && s[0] === "#") { const id = s.slice(1); if (!slots[id]) slots[id] = make(id); return slots[id]; } return null; },
        addEventListener() {}, createElement: () => make("x"), body: make("body"),
    };
    const fetchShim = async () => ({ ok: true, json: async () => state });
    // Inject our shims as the only free identifiers the client uses, so the body
    // runs against them rather than this module's lexical scope.
    const fn = new Function("window", "document", "EventSource", "fetch", "setTimeout", "clearTimeout", "console", script);
    fn(win, doc, ES, fetchShim, setTimeout, clearTimeout, console);
    // The client renders once synchronously (Loading), then loadState() fetches
    // and re-renders async — let those microtasks settle before reading #app.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    return { app: () => (slots.app ? slots.app._html : "") };
}

// A realistic snapshot with a multi-phase plan, an assessment report, gates, an
// environment report, and no autopilot run — exercises the common render paths.
function sampleState(extra = {}) {
    const steps = [
        { title: "Fix the build", section: "P0 Build", status: "in_progress", rank: 1 },
        { title: "Patch CVEs", section: "P1 Security", status: "pending", rank: 2 },
        { title: "Upgrade Java", section: "P2 Runtime", status: "pending", rank: 3 },
    ];
    return {
        ok: true, repoPath: "/demo/app", scannedAt: new Date().toISOString(),
        status: "in_progress", percent: 10,
        assessment: { buildTool: "Maven", javaVersion: "8", springBoot: true, hasDockerfile: true, detectedKeys: [] },
        tasks: [], skills: [],
        git: { branch: "modernize/java21", isMigrationBranch: true, dirty: true, changedFiles: 3 },
        plan: { exists: true, steps }, progress: { exists: true, steps },
        summary: { exists: false, markdown: "" },
        report: {
            generatedAt: new Date().toISOString(), headline: "Java 8 Spring app", summary: "Outdated runtime and deps.",
            stack: { buildTool: "Maven", java: "8", framework: "Spring Boot", database: "MSSQL", container: "Docker" },
            findings: [
                { id: "java8", severity: "P0", title: "Java 8 is EOL", detail: "Upgrade the runtime.", files: ["pom.xml"], action: { kind: "generate_plan", payload: { targetJava: 21 }, label: "Plan upgrade" } },
                { id: "cve", severity: "P1", title: "Vulnerable dependency", detail: "Bump it.", files: [], action: { kind: "fix_finding", payload: {}, label: "Fix" } },
            ],
            strengths: ["Has a Dockerfile"],
        },
        ordering: { activeRank: 1, activePhase: "P0 Build", phases: [{ name: "P0 Build", rank: 1, done: 0, total: 1 }] },
        gates: { build: "not_run", tests: "not_run", cve: "not_run", consistency: "not_run", completeness: "not_run" },
        doctor: { overall: "ready", generatedAt: new Date().toISOString(), groups: [
            { id: "build", name: "Build & run", checks: [{ id: "jdk", label: "JDK", status: "ok", detail: "Java 21" }] },
        ] },
        autopilot: null,
        ...extra,
    };
}

test("renderer: every tab renders without throwing against a realistic state", async () => {
    const tabs = ["overview", "readiness", "assessment", "plan", "validation", "tasks", "summary"];
    for (const tab of tabs) {
        const r = await renderClientTab(sampleState(), tab);
        const out = r.app();
        assert.ok(out && out.length > 40, "tab '" + tab + "' produced no body");
        assert.ok(!/hit an error/.test(out), "tab '" + tab + "' fell back to the error banner");
    }
});

test("renderer: Plan tab actually renders its checklist when executed (regression)", async () => {
    const r = await renderClientTab(sampleState(), "plan");
    const out = r.app();
    assert.match(out, /Plan &amp; Progress/);
    assert.match(out, /Fix the build/);
    assert.match(out, /data-kind="work_step"/);
    assert.match(out, /Autopilot/);
    assert.ok(!/hit an error/.test(out));
});

test("renderer: a running autopilot shows the live strip and freezes manual actions", async () => {
    const state = sampleState({
        autopilot: { running: true, scope: "phase", status: "running", current: { title: "Fix the build", section: "P0 Build" }, completed: [{ title: "Earlier", section: "P0 Build", done: true }], maxSteps: 25 },
    });
    const r = await renderClientTab(state, "plan");
    const out = r.app();
    assert.match(out, /Autopilot running/);
    assert.match(out, /autopilot_stop/);
    assert.match(out, /Earlier/); // step log
    assert.match(out, /data-kind="work_step"[^>]*disabled/); // manual buttons frozen
});

// Drive the live client: capture its click handler + EventSource so a test can
// fire a real button click and simulate an SSE (re)connect, then read #app.
// fetch routes GET /state -> current snapshot, POST /action -> a scripted result.
function driveClient(initialState, opts = {}) {
    const initialTab = opts.initialTab || "readiness";
    const html = renderHtml({ instanceId: "drive", initialTab });
    const script = html.split("<script>")[1].split("</script>")[0];
    const slots = {};
    const make = (id) => ({
        _html: "", id,
        set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
        addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; },
        classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, style: {}, dataset: {}, textContent: "",
    });
    let clickHandler = null;
    const es = { onopen: null, onmessage: null, onerror: null, addEventListener() {}, close() {} };
    const win = { __APPMOD__: { instanceId: "drive", initialTab }, addEventListener() {}, location: {}, scrollTo() {} };
    const ES = function () { return es; }; // `new ES()` yields our singleton
    const doc = {
        getElementById: (id) => { if (!slots[id]) slots[id] = make(id); return slots[id]; },
        querySelectorAll: () => [],
        querySelector: (s) => { if (typeof s === "string" && s[0] === "#") { const id = s.slice(1); if (!slots[id]) slots[id] = make(id); return slots[id]; } return null; },
        addEventListener: (type, fn) => { if (type === "click") clickHandler = fn; },
        createElement: () => make("x"), body: make("body"),
    };
    let getState = initialState;
    let getStateCalls = 0;
    const fetchShim = async (url, init) => {
        if (init && init.method === "POST") return { ok: true, json: async () => (opts.actionResponse || { ok: true, message: "ok" }) };
        getStateCalls++;
        return { ok: true, json: async () => getState };
    };
    new Function("window", "document", "EventSource", "fetch", "setTimeout", "clearTimeout", "console", script)(win, doc, ES, fetchShim, setTimeout, clearTimeout, console);
    const settle = async () => { await new Promise((r) => setTimeout(r, 0)); await new Promise((r) => setTimeout(r, 0)); };
    return {
        async ready() { await settle(); return this; },
        app: () => (slots.app ? slots.app._html : ""),
        getStateCalls: () => getStateCalls,
        setGetState(s) { getState = s; },
        async clickKind(kind, payload) {
            const btnEl = { disabled: false, dataset: { kind, payload: JSON.stringify(payload || {}) } };
            const ev = { target: { closest: (sel) => (sel.indexOf("nav.tabs") === 0 ? null : btnEl) } };
            clickHandler(ev);
            await settle();
        },
        async reconnect() { if (es.onopen) es.onopen(); await settle(); },
    };
}

test("renderer: recheck_env applies the inline result and never strands the spinner", async () => {
    // Backend returns a fresh, now-ready snapshot inline (res.state) — the client
    // must apply it directly, not fall back to the agent-style 'pending' banner
    // that only clears on an SSE broadcast (which can be lost on a provider restart).
    const blocked = sampleState({ doctor: { overall: "blocked", generatedAt: "t", groups: [{ id: "build", name: "Build", checks: [{ id: "jdk", label: "JDK", status: "fail", detail: "java not found" }] }] } });
    const ready = sampleState({ doctor: { overall: "ready", generatedAt: "t2", groups: [{ id: "build", name: "Build", checks: [{ id: "jdk", label: "JDK", status: "ok", detail: "Java 21" }] }] } });
    const c = await driveClient(blocked, { initialTab: "readiness", actionResponse: { ok: true, message: "Re-checked environment", state: ready } }).ready();
    assert.match(c.app(), /Not ready yet/); // starts blocked
    await c.clickKind("recheck_env", {});
    assert.match(c.app(), /Your environment is ready/); // inline state applied
    assert.ok(!/Watch the chat/.test(c.app()), "must not show the agent 'pending' spinner banner");
    assert.equal(c.getStateCalls(), 1, "recheck must not need an extra /state fetch (uses inline state)");
});

test("renderer: an SSE reconnect resyncs state (recovers a missed broadcast)", async () => {
    const blocked = sampleState({ doctor: { overall: "blocked", generatedAt: "t", groups: [{ id: "build", name: "Build", checks: [{ id: "jdk", label: "JDK", status: "fail", detail: "x" }] }] } });
    const ready = sampleState({ doctor: { overall: "ready", generatedAt: "t2", groups: [{ id: "build", name: "Build", checks: [{ id: "jdk", label: "JDK", status: "ok", detail: "Java 21" }] }] } });
    const c = await driveClient(blocked, { initialTab: "readiness" }).ready();
    const before = c.getStateCalls();
    assert.match(c.app(), /Not ready yet/);
    // Provider finished the recheck after a restart that dropped the broadcast;
    // backend state is now ready. The stream reconnects -> client must re-fetch.
    c.setGetState(ready);
    await c.reconnect();
    assert.equal(c.getStateCalls(), before + 1, "onopen must re-fetch /state");
    assert.match(c.app(), /Your environment is ready/);
});

// ===========================================================================
// server.mjs
// ===========================================================================

test("server: resolveRepoPath precedence input > session > last, else null", () => {
    assert.equal(
        resolveRepoPath({ input: { repoPath: "/in" }, session: { workingDirectory: "/s" } }, "/last"),
        "/in"
    );
    assert.equal(resolveRepoPath({ session: { workingDirectory: "/s" } }, "/last"), "/s");
    assert.equal(resolveRepoPath({}, "/last"), "/last");
    // No process.cwd() fallback — unresolved means null (UI shows "repo not available").
    assert.equal(resolveRepoPath({}, null), null);
    assert.equal(resolveRepoPath({}, undefined), null);
});

test("server: broadcast writes SSE frame to every client", () => {
    const chunks = [];
    const rec = { sseClients: new Set([{ write: (s) => chunks.push(s) }]) };
    broadcast(rec, { type: "state", state: { ok: true } });
    assert.equal(chunks.length, 1);
    assert.match(chunks[0], /^data: /);
    assert.match(chunks[0], /"type":"state"/);
});

test("server: pushState scans repo and broadcasts snapshot", async () => {
    await withRepo({ "pom.xml": "<project/>" }, async (dir) => {
        const chunks = [];
        const rec = { repoPath: dir, sseClients: new Set([{ write: (s) => chunks.push(s) }]) };
        const state = await pushState(rec);
        assert.equal(state.ok, true);
        assert.equal(chunks.length, 1);
        assert.match(chunks[0], /"buildTool":"Maven"/);
    });
});

test("server: dispatch refresh re-scans without sending a prompt", async () => {
    await withRepo({ "pom.xml": "<project/>" }, async (dir) => {
        let sent = 0;
        const rec = { repoPath: dir, sseClients: new Set() };
        const res = await dispatchAction(rec, "refresh", {}, { sendPrompt: async () => sent++ });
        assert.equal(res.ok, true);
        assert.equal(sent, 0);
    });
});

test("server: dispatch agent action forwards crafted prompt to sendPrompt", async () => {
    const rec = { repoPath: "/repo", sseClients: new Set() };
    const sentPrompts = [];
    const res = await dispatchAction(rec, "run_cve", {}, { sendPrompt: async (p) => sentPrompts.push(p) });
    assert.equal(res.ok, true);
    assert.equal(res.label, "CVE scan");
    assert.equal(sentPrompts.length, 1);
    assert.match(sentPrompts[0], /#appmod-validate-cves-for-java/);
});

test("server: dispatch unknown action returns error, no send", async () => {
    const rec = { repoPath: "/repo", sseClients: new Set() };
    let sent = 0;
    const res = await dispatchAction(rec, "bogus", {}, { sendPrompt: async () => sent++ });
    assert.equal(res.ok, false);
    assert.match(res.error, /Unknown action/);
    assert.equal(sent, 0);
});

test("server: dispatch without sendPrompt reports session not ready", async () => {
    const rec = { repoPath: "/repo", sseClients: new Set() };
    const res = await dispatchAction(rec, "run_cve", {}, {});
    assert.equal(res.ok, false);
    assert.match(res.error, /not ready/);
});

test("server: handler GET / serves HTML", async () => {
    const rec = { repoPath: "/repo", sseClients: new Set() };
    const handler = makeHandler(rec, { instanceId: "i", initialTab: "overview", sendPrompt: async () => {} });
    const { res } = await invokeGet(handler, "/");
    assert.match(res.headers["content-type"], /text\/html/);
    assert.match(res.body, /Java Modernization Studio/);
});

test("server: handler GET /state serves scanned JSON", async () => {
    await withRepo({ "pom.xml": "<project/>" }, async (dir) => {
        const rec = { repoPath: dir, sseClients: new Set() };
        const handler = makeHandler(rec, { instanceId: "i", sendPrompt: async () => {} });
        const { res } = await invokeGet(handler, "/state");
        const json = JSON.parse(res.body);
        assert.equal(json.ok, true);
        assert.equal(json.repoPath, dir);
    });
});

test("server: handler GET /events registers and cleans up SSE client", async () => {
    const rec = { repoPath: "/repo", sseClients: new Set() };
    const handler = makeHandler(rec, { instanceId: "i", sendPrompt: async () => {} });
    const { req } = await invokeGet(handler, "/events");
    assert.equal(rec.sseClients.size, 1);
    req.emit("close");
    assert.equal(rec.sseClients.size, 0);
});

test("server: handler POST /action runs dispatch", async () => {
    const rec = { repoPath: "/repo", sseClients: new Set() };
    const sent = [];
    const handler = makeHandler(rec, { instanceId: "i", sendPrompt: async (p) => sent.push(p) });
    const res = await invokePost(handler, "/action", { kind: "run_cve" });
    const json = JSON.parse(res.body);
    assert.equal(json.ok, true);
    assert.equal(sent.length, 1);
});

test("server: token guard forbids requests without the per-instance token", async () => {
    const rec = { repoPath: "/repo", sseClients: new Set(), token: "s3cret" };
    const sent = [];
    const handler = makeHandler(rec, { instanceId: "i", sendPrompt: async (p) => sent.push(p) });
    for (const path of ["/", "/state", "/events"]) {
        const { res } = await invokeGet(handler, path);
        assert.equal(res.statusCode, 403, path + " without a token must be forbidden");
    }
    const post = await invokePost(handler, "/action", { kind: "run_cve" });
    assert.equal(post.statusCode, 403, "/action without a token must be forbidden");
    assert.equal(sent.length, 0, "no action is dispatched for an unauthenticated request");
    assert.equal(rec.sseClients.size, 0, "no SSE client is registered for an unauthenticated request");
});

test("server: token guard allows requests carrying the correct token", async () => {
    const rec = { repoPath: "/repo", sseClients: new Set(), token: "s3cret" };
    const sent = [];
    const handler = makeHandler(rec, { instanceId: "i", sendPrompt: async (p) => sent.push(p) });
    const { req } = await invokeGet(handler, "/events?token=s3cret");
    assert.equal(rec.sseClients.size, 1, "a valid token registers the SSE client");
    req.emit("close");
    const post = await invokePost(handler, "/action?token=s3cret", { kind: "run_cve" });
    const json = JSON.parse(post.body);
    assert.equal(json.ok, true);
    assert.equal(sent.length, 1);
});

test("server: POST /action rejects an oversized request body (413)", async () => {
    const rec = { repoPath: "/repo", sseClients: new Set() };
    const sent = [];
    const handler = makeHandler(rec, { instanceId: "i", sendPrompt: async (p) => sent.push(p) });
    const req = new EventEmitter();
    req.method = "POST";
    req.url = "/action";
    const res = fakeRes();
    const pending = handler(req, res);
    req.emit("data", "x".repeat(300 * 1024)); // > 256 KB cap
    req.emit("end");
    await pending;
    assert.equal(res.statusCode, 413);
    const json = JSON.parse(res.body);
    assert.equal(json.ok, false);
    assert.match(json.error, /too large/i);
    assert.equal(sent.length, 0, "no action is dispatched for a rejected body");
});

test("server: handler unknown route 404s", async () => {
    const rec = { repoPath: "/repo", sseClients: new Set() };
    const handler = makeHandler(rec, { instanceId: "i", sendPrompt: async () => {} });
    const { res } = await invokeGet(handler, "/nope");
    assert.equal(res.statusCode, 404);
});

test("server: broadcast drops a client whose write fails (no leak, no repeat throw)", () => {
    const live = [];
    const dead = {
        write() {
            throw new Error("EPIPE: client gone");
        },
    };
    const rec = { sseClients: new Set([dead, { write: (s) => live.push(s) }]) };
    broadcast(rec, { type: "state", state: { ok: true } });
    assert.ok(!rec.sseClients.has(dead), "a client whose write throws is removed from the Set");
    assert.equal(rec.sseClients.size, 1, "the healthy client is retained");
    assert.equal(live.length, 1, "the healthy client still receives the frame");
    // A later broadcast must not keep throwing now that the dead client is gone.
    assert.doesNotThrow(() => broadcast(rec, { type: "state", state: { ok: true } }));
    assert.equal(live.length, 2);
});

test("server: POST /action rejects malformed JSON with 400 and dispatches nothing", async () => {
    const rec = { repoPath: "/repo", sseClients: new Set() };
    let sent = 0;
    const handler = makeHandler(rec, { instanceId: "i", sendPrompt: async () => sent++ });
    const req = new EventEmitter();
    req.method = "POST";
    req.url = "/action";
    const res = fakeRes();
    const pending = handler(req, res);
    req.emit("data", "{ not valid json ");
    req.emit("end");
    await pending;
    assert.equal(res.statusCode, 400);
    assert.match(res.headers["content-type"], /application\/json/);
    const json = JSON.parse(res.body);
    assert.equal(json.ok, false);
    assert.match(json.error, /invalid JSON/i);
    assert.equal(sent, 0, "a malformed body dispatches no action");
});

test("server: POST /action rejects a missing/invalid kind with 400", async () => {
    const rec = { repoPath: "/repo", sseClients: new Set() };
    let sent = 0;
    const handler = makeHandler(rec, { instanceId: "i", sendPrompt: async () => sent++ });
    const res = await invokePost(handler, "/action", { payload: {} }); // no kind
    assert.equal(res.statusCode, 400);
    assert.match(res.headers["content-type"], /application\/json/);
    const json = JSON.parse(res.body);
    assert.equal(json.ok, false);
    assert.match(json.error, /kind/i);
    assert.equal(sent, 0, "a kindless request dispatches no action");
});

test("server: a handler exception returns 500 with a JSON content-type", async () => {
    // A throwing repoPath getter makes buildState (GET /state) reject, exercising
    // the handler's outer catch — which must still label the error body as JSON.
    const rec = {
        sseClients: new Set(),
        get repoPath() {
            throw new Error("boom");
        },
    };
    const handler = makeHandler(rec, { instanceId: "i", sendPrompt: async () => {} });
    const { res } = await invokeGet(handler, "/state");
    assert.equal(res.statusCode, 500);
    assert.match(res.headers["content-type"], /application\/json/);
    const json = JSON.parse(res.body);
    assert.equal(json.ok, false);
});

test("server: recheck_env runs the doctor, caches it, and broadcasts (no agent prompt)", async () => {
    await withRepo({ "pom.xml": "<project/>" }, async (dir) => {
        let runs = 0;
        const chunks = [];
        const rec = {
            repoPath: dir,
            sseClients: new Set([{ write: (s) => chunks.push(s) }]),
            doctor: null,
            runDoctor: async () => ({ overall: "blocked", groups: [], runs: ++runs }),
        };
        let sent = 0;
        const res = await dispatchAction(rec, "recheck_env", {}, { sendPrompt: async () => sent++ });
        assert.equal(res.ok, true);
        assert.equal(sent, 0, "recheck_env does not message the agent");
        assert.equal(rec.doctor.overall, "blocked");
        assert.equal(runs, 1);
        assert.match(chunks[0], /"overall":"blocked"/);
    });
});

test("server: createInstanceServer binds a loopback socket end-to-end", async () => {
    await withRepo({ "pom.xml": "<project/>" }, async (dir) => {
        const sent = [];
        const rec = await createInstanceServer({
            instanceId: "live",
            repoPath: dir,
            initialTab: "overview",
            sendPrompt: async (p) => sent.push(p),
            runDoctor: async () => ({ overall: "ready", groups: [] }),
        });
        try {
            assert.match(rec.url, /^http:\/\/127\.0\.0\.1:\d+\/\?token=[a-f0-9]+$/);
            const u = new URL(rec.url);
            const base = u.origin;
            const q = "?token=" + u.searchParams.get("token");

            const home = await fetch(rec.url);
            assert.equal(home.status, 200);
            assert.match(await home.text(), /Java Modernization Studio/);

            const state = await (await fetch(base + "/state" + q)).json();
            assert.equal(state.ok, true);
            assert.equal(state.assessment.buildTool, "Maven");
            assert.equal(state.doctor.overall, "ready", "doctor report is attached to state");

            const action = await fetch(base + "/action" + q, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind: "generate_tests" }),
            });
            const aj = await action.json();
            assert.equal(aj.ok, true);
            assert.equal(sent.length, 1);

            // A request that omits the per-instance token must be refused, even though
            // it reached the right loopback port.
            const unauth = await fetch(base + "/state");
            assert.equal(unauth.status, 403, "missing token is rejected at the socket");
        } finally {
            await new Promise((r) => rec.server.close(() => r()));
        }
    });
});

// ---- autopilot --------------------------------------------------------------

// Build an evolving plan model: snapshot() reflects current statuses and a fresh
// activeRank; markNextDone() simulates the agent checking a step off.
function planSim(steps) {
    const model = steps.map((s) => ({ section: null, rank: null, status: "pending", ...s }));
    const activeRank = () => {
        const notDone = model.filter((s) => s.status !== "done" && s.rank != null);
        return notDone.length ? Math.min(...notDone.map((s) => s.rank)) : null;
    };
    return {
        model,
        snapshot: async () => ({
            ok: true,
            progress: { steps: model.map((s) => ({ ...s })) },
            plan: { steps: model.map((s) => ({ ...s })) },
            ordering: { activeRank: activeRank() },
        }),
        markNextDone() {
            const notDone = model.find((s) => s.status !== "done");
            if (notDone) notDone.status = "done";
        },
    };
}

test("autopilot: selectNextStep follows phase order then falls back", () => {
    const s = {
        progress: { steps: [
            { title: "A", status: "done", rank: 1 },
            { title: "B", status: "pending", rank: 1 },
            { title: "C", status: "pending", rank: 2 },
        ] },
        ordering: { activeRank: 1 },
    };
    assert.equal(selectNextStep(s).title, "B", "picks the active-phase pending step");
    const s2 = { progress: { steps: [{ title: "X", status: "done", rank: 1 }] }, ordering: { activeRank: null } };
    assert.equal(selectNextStep(s2), null, "null when nothing is pending");
    assert.equal(selectNextStep({}), null, "null when there are no steps");
});

test("autopilot: stepKey is stable and isStepDone reads status", () => {
    const step = { title: "Upgrade", section: "P0 Build" };
    assert.equal(stepKey(step), "P0 Build::Upgrade");
    const state = { progress: { steps: [{ title: "Upgrade", section: "P0 Build", status: "done" }] } };
    assert.equal(isStepDone(state, step), true);
    assert.equal(isStepDone({ progress: { steps: [] } }, step), false);
});

test("autopilot: auto_step prompt is autonomous and never commits", () => {
    assert.equal(buildPrompt("auto_step", {}, "/repo"), null, "no title -> no prompt");
    const p = buildPrompt("auto_step", { title: "Bump Spring", section: "P1 Security" }, "/repo");
    assert.match(p, /AUTOPILOT/);
    assert.match(p, /Bump Spring/);
    assert.match(p, /Do NOT commit/);
    assert.match(p, /one step/i);
});

test("autopilot: runs every step to completion (happy path)", async () => {
    const sim = planSim([
        { title: "A", section: "P0 Build", rank: 1 },
        { title: "B", section: "P0 Build", rank: 1 },
    ]);
    const run = makeRun({ scope: "all", maxSteps: 10, startRank: 1 });
    const prompts = [];
    await runAutopilot(run, {
        snapshot: sim.snapshot,
        runTurn: async (p) => { prompts.push(p); sim.markNextDone(); },
        buildStepPrompt: (step) => step.title,
        onProgress: () => {},
    });
    assert.equal(run.status, "completed");
    assert.equal(run.completed.length, 2);
    assert.ok(run.completed.every((c) => c.done), "each step ended up checked off");
    assert.deepEqual(prompts, ["A", "B"]);
    assert.equal(run.running, false);
});

test("autopilot: phase scope stops at the phase boundary", async () => {
    const sim = planSim([
        { title: "A", section: "P0 Build", rank: 1 },
        { title: "B", section: "P1 Security", rank: 2 },
    ]);
    const run = makeRun({ scope: "phase", maxSteps: 10, startRank: 1 });
    await runAutopilot(run, {
        snapshot: sim.snapshot,
        runTurn: async () => sim.markNextDone(),
        buildStepPrompt: (step) => step.title,
        onProgress: () => {},
    });
    assert.equal(run.status, "phase_done");
    assert.equal(run.completed.length, 1, "only the P0 step ran; it paused before P1");
    assert.equal(run.completed[0].title, "A");
});

test("autopilot: stops (stuck) when a step does not get checked off", async () => {
    const sim = planSim([{ title: "Tricky", section: "P0 Build", rank: 1 }]);
    const run = makeRun({ scope: "all", maxSteps: 10, startRank: 1 });
    await runAutopilot(run, {
        snapshot: sim.snapshot,
        runTurn: async () => { /* agent fails to complete the step */ },
        buildStepPrompt: (step) => step.title,
        onProgress: () => {},
    });
    assert.equal(run.status, "stuck");
    assert.equal(run.stuck, "Tricky");
    assert.equal(run.completed.length, 1);
    assert.equal(run.completed[0].done, false);
});

test("autopilot: honors cancellation between steps", async () => {
    const sim = planSim([
        { title: "A", section: "P0 Build", rank: 1 },
        { title: "B", section: "P0 Build", rank: 1 },
    ]);
    const run = makeRun({ scope: "all", maxSteps: 10, startRank: 1 });
    await runAutopilot(run, {
        snapshot: sim.snapshot,
        runTurn: async () => sim.markNextDone(),
        buildStepPrompt: (step) => step.title,
        onProgress: (r) => { if (r.current) r.cancelled = true; },
    });
    assert.equal(run.status, "cancelled");
    assert.equal(run.completed.length, 1, "the in-flight step finished, then it stopped");
});

test("server: autopilot_start refuses without a runTurn driver", async () => {
    const rec = { repoPath: "/nope", sseClients: new Set(), doctor: null, autopilot: null };
    const res = await dispatchAction(rec, "autopilot_start", {}, { sendPrompt: async () => {}, log: () => {} });
    assert.equal(res.ok, false);
    assert.match(res.error, /drive/i);
    assert.equal(rec.autopilot, null);
});

test("server: autopilot_start is blocked when the environment is not ready", async () => {
    await withRepo({ ...PROV, "pom.xml": "<project/>", "progress.md": "## P0 Build\n- [ ] Fix build\n" }, async (dir) => {
        const rec = {
            repoPath: dir,
            sseClients: new Set(),
            doctor: null,
            autopilot: null,
            runDoctor: async () => ({ overall: "blocked", groups: [] }),
        };
        const res = await dispatchAction(rec, "autopilot_start", {}, { runTurn: async () => {}, log: () => {} });
        assert.equal(res.ok, false);
        assert.match(res.error, /environment/i);
        assert.equal(rec.autopilot, null, "no run starts while blocked");
    });
});

test("server: autopilot_start drives the loop and broadcasts progress", async () => {
    await withRepo({ ...PROV, "pom.xml": "<project/>", "progress.md": "## P0 Build\n- [ ] Fix the build\n" }, async (dir) => {
        const chunks = [];
        const rec = {
            repoPath: dir,
            sseClients: new Set([{ write: (s) => chunks.push(s) }]),
            doctor: null,
            autopilot: null,
            runDoctor: async () => ({ overall: "ready", groups: [] }),
        };
        let turns = 0;
        const res = await dispatchAction(rec, "autopilot_start", { scope: "phase" }, { runTurn: async () => { turns++; }, log: () => {} });
        assert.equal(res.ok, true);
        assert.ok(rec.autopilot, "a run record is attached");
        await rec.autopilotPromise; // let the loop settle
        assert.equal(rec.autopilot.running, false);
        assert.ok(turns >= 1, "the agent was driven at least once");
        // The step never gets checked off (runTurn is a stub), so it pauses as stuck.
        assert.equal(rec.autopilot.status, "stuck");
        assert.ok(chunks.some((c) => /autopilot|"type":"state"/.test(c)), "progress was broadcast");
    });
});

test("server: autopilot_stop and autopilot_dismiss behave by run state", async () => {
    const rec = { repoPath: "/x", sseClients: new Set(), doctor: null, autopilot: null };
    const stopIdle = await dispatchAction(rec, "autopilot_stop", {}, {});
    assert.equal(stopIdle.ok, false, "nothing to stop when idle");

    rec.autopilot = { running: true, cancelled: false, completed: [] };
    const stopRunning = await dispatchAction(rec, "autopilot_stop", {}, {});
    assert.equal(stopRunning.ok, true);
    assert.equal(rec.autopilot.cancelled, true, "stop flips the cancel flag");

    rec.autopilot = { running: false, status: "completed", completed: [] };
    await withRepo({ "pom.xml": "<project/>" }, async (dir) => {
        rec.repoPath = dir;
        const res = await dispatchAction(rec, "autopilot_dismiss", {}, {});
        assert.equal(res.ok, true);
        assert.equal(rec.autopilot, null, "dismiss clears a finished run");
    });
});

test("renderer: ships the Autopilot controls (start/stop, card, live strip)", () => {
    const html = renderHtml({ instanceId: "x" });
    assert.match(html, /autopilot_start/);
    assert.match(html, /autopilot_stop/);
    assert.match(html, /Autopilot/);
    assert.match(html, /autopilotStrip/);
});
