// doctor.mjs — Environment & workflow readiness checks for the App Modernization
// Cockpit. Probes the local CLI toolchain (JDK, Maven/Gradle, git, Docker, Azure
// CLI / azd, Node) and combines those results with repo facts from scan.mjs so a
// user can confirm their machine is ready *before* they start migrating — and get
// clear, actionable remediation when something is missing.
//
// Split into a pure builder (`buildDoctorReport`) and an impure runner
// (`runDoctor`) so the decision logic is unit-testable without shelling out.

import { execFile } from "node:child_process";
import { platform } from "node:os";
import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// One probe per tool. Many CLIs print their version to stderr (notably `java`),
// so probes capture both streams.
export const TOOL_PROBES = [
    { key: "java", cmd: "java", args: ["-version"] },
    { key: "mvn", cmd: "mvn", args: ["-v"] },
    { key: "gradle", cmd: "gradle", args: ["-v"] },
    { key: "git", cmd: "git", args: ["--version"] },
    { key: "docker", cmd: "docker", args: ["--version"] },
    { key: "az", cmd: "az", args: ["--version"] },
    { key: "azd", cmd: "azd", args: ["version"] },
    { key: "node", cmd: "node", args: ["--version"] },
];

/** Friendly OS label for remediation hints. */
export function osLabel() {
    const p = platform();
    if (p === "darwin") return "macOS";
    if (p === "win32") return "Windows";
    if (p === "linux") return "Linux";
    return p;
}

/** Extract a short version string from a tool's --version output. Pure. */
export function parseToolVersion(key, text) {
    if (!text) return null;
    const t = String(text);
    if (key === "java") {
        const m = t.match(/version\s+"?([\d._]+)"?/i);
        if (m) return m[1];
    }
    if (key === "node") {
        const m = t.match(/v?(\d+\.\d+\.\d+)/);
        if (m) return m[1];
    }
    const g = t.match(/(\d+\.\d+(?:\.\d+)?)/);
    if (g) return g[1];
    const first = t.split(/\r?\n/)[0].trim();
    return first ? first.slice(0, 40) : null;
}

function defaultExec(cmd, args) {
    return makeExec(augmentedEnv(process.env, platform()))(cmd, args);
}

/**
 * Build a child-process env whose PATH also covers the usual places dev tools
 * live. A GUI-launched app (the Copilot app) inherits a minimal launchd PATH
 * (/usr/bin:/bin:/usr/sbin:/sbin), so tools installed via Homebrew, SDKMAN,
 * asdf, or a keg-only JDK aren't found even though the user's terminal sees
 * them fine. Prepending these locations makes the probes match reality without
 * touching the user's actual environment. Pure given an injected directory
 * lister (so it's unit-testable without hitting the filesystem).
 */
export function augmentedEnv(env, plat, lister) {
    const base = Object.assign({}, env);
    if (plat === "win32") return base; // Windows PATH semantics differ; leave as-is.
    const ls = lister || ((d) => { try { return readdirSync(d); } catch (e) { return []; } });
    const extra = ["/opt/homebrew/bin", "/opt/homebrew/sbin", "/usr/local/bin", "/usr/local/sbin"];
    if (base.HOME) {
        extra.push(base.HOME + "/.sdkman/candidates/java/current/bin");
        extra.push(base.HOME + "/.asdf/shims");
    }
    if (base.JAVA_HOME) extra.push(base.JAVA_HOME + "/bin");
    // Keg-only Homebrew JDKs aren't symlinked into .../bin, so enumerate them.
    for (const root of ["/opt/homebrew/opt", "/usr/local/opt"]) {
        for (const name of ls(root)) {
            if (/^openjdk(@\d+)?$/.test(name)) extra.push(root + "/" + name + "/libexec/openjdk.jdk/Contents/Home/bin");
        }
    }
    const seen = {};
    const prefix = extra.filter((p) => { if (seen[p]) return false; seen[p] = 1; return true; });
    base.PATH = prefix.join(":") + (base.PATH ? ":" + base.PATH : "");
    return base;
}

/** Build an exec function bound to a specific environment. */
export function makeExec(env) {
    return (cmd, args) =>
        new Promise((resolve) => {
            execFile(cmd, args, { timeout: 3500, windowsHide: true, env }, (error, stdout, stderr) => {
                resolve({ error: error || null, stdout: String(stdout || ""), stderr: String(stderr || "") });
            });
        });
}

/**
 * Expand a shell-style JAVA_HOME value from an rc assignment into a concrete path,
 * WITHOUT executing anything. Handles surrounding quotes, an inline comment on
 * unquoted values, and `~` / `$HOME` / `${HOME}` expansion. Returns null when the
 * value still contains something only a shell could resolve (command substitution,
 * other variables) — we'd rather report nothing than a bogus path.
 */
export function expandJavaHomeValue(raw, env) {
    if (typeof raw !== "string") return null;
    let v = raw.trim();
    if (!v) return null;
    if (v[0] !== '"' && v[0] !== "'") {
        const c = v.indexOf(" #");
        if (c >= 0) v = v.slice(0, c).trim();
    }
    if (v.length >= 2 && ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'"))) {
        v = v.slice(1, -1);
    }
    const home = (env && env.HOME) || "";
    if (v === "~") v = home;
    else if (v.startsWith("~/")) v = home + v.slice(1);
    v = v.replace(/\$\{HOME\}/g, home).replace(/\$HOME(?=\/|$)/g, home);
    if (!v || /[`]|\$\(|\$\w/.test(v)) return null; // unresolved shell expansion
    return v;
}

/**
 * Statically parse a shell rc file's text for the last `JAVA_HOME=` assignment.
 * Pure and side-effect-free. Returns the expanded path or null.
 */
export function parseJavaHomeFromRc(text, env) {
    if (typeof text !== "string" || !text) return null;
    const re = /^[ \t]*(?:export[ \t]+)?JAVA_HOME[ \t]*=[ \t]*(.+?)[ \t]*$/gm;
    let m;
    let last = null;
    while ((m = re.exec(text)) !== null) {
        const val = expandJavaHomeValue(m[1], env);
        if (val) last = val; // later assignments win, mirroring shell evaluation order
    }
    return last;
}

/**
 * Best-effort discovery of the JAVA_HOME the user's interactive shell is
 * configured with, so the readiness report reflects the JDK their terminal
 * actually uses (e.g. a pinned LTS) rather than whichever JDK happens to sort
 * first on the augmented PATH.
 *
 * IMPORTANT: this only *reads and statically parses* the shell rc files — it never
 * sources or executes them. That keeps the readiness probe honest with the UI
 * promise ("only reads version numbers; nothing is installed or changed") and
 * avoids running arbitrary user startup code. A JAVA_HOME defined via command
 * substitution (e.g. `$(/usr/libexec/java_home)`) can't be resolved statically, so
 * we simply fall back to PATH-based probing in that case. The rc reader is
 * injectable for tests.
 */
export async function discoverJavaHome(env, plat, readRc) {
    const e = env || {};
    if (e.JAVA_HOME) return e.JAVA_HOME; // already explicit in this process
    if (plat === "win32") return null; // not a $JAVA_HOME/rc world
    const home = e.HOME || "";
    if (!home) return null;
    const shell = e.SHELL || (plat === "darwin" ? "/bin/zsh" : "/bin/bash");
    const names = /zsh/.test(shell)
        ? [".zshenv", ".zprofile", ".zshrc"]
        : /bash/.test(shell)
            ? [".bash_profile", ".bashrc", ".profile"]
            : [".profile"];
    const read =
        readRc ||
        (async (p) => {
            try {
                return await readFile(p, "utf8");
            } catch {
                return null;
            }
        });
    let found = null;
    for (const name of names) {
        let text = null;
        try {
            text = await read(join(home, name));
        } catch {
            text = null;
        }
        const val = parseJavaHomeFromRc(text, e);
        if (val) found = val; // later rc files (e.g. .zshrc) win
    }
    return found || null;
}

/** Probe a single tool. Returns { key, found, version }. */
export async function probeOne(def, exec) {
    const run = exec || defaultExec;
    let r;
    try {
        r = await run(def.cmd, def.args);
    } catch (e) {
        r = { error: e, stdout: "", stderr: "" };
    }
    const text = ((r.stdout || "") + "\n" + (r.stderr || "")).trim();
    // ENOENT means the binary isn't on PATH at all.
    if (r.error && r.error.code === "ENOENT") return { key: def.key, found: false, version: null };
    if (r.error && !text) return { key: def.key, found: false, version: null };
    const version = parseToolVersion(def.key, text);
    if (r.error) {
        // Non-zero exit. Genuine `--version` calls exit 0, so only trust this if a
        // real version number came back. This rejects the macOS `java` stub, which
        // exits 1 with "Unable to locate a Java Runtime" when no JDK is installed.
        if (!(version && /\d/.test(version))) return { key: def.key, found: false, version: null };
    }
    return { key: def.key, found: true, version };
}

/** Probe every tool and build the readiness report. Impure (spawns processes). */
export async function runDoctor(scan, opts = {}) {
    let exec = opts.exec;
    if (!exec) {
        const env = augmentedEnv(process.env, platform());
        // Prefer the JDK the user's shell is configured with so the report matches
        // their terminal (and so a dependency-pulled JDK doesn't shadow their pin).
        // Static rc parse — no shell sourcing.
        const jh = await discoverJavaHome(process.env, platform());
        if (jh && !env.JAVA_HOME) {
            env.JAVA_HOME = jh;
            env.PATH = jh + "/bin:" + env.PATH;
        }
        exec = makeExec(env);
    }
    const probesArr = await Promise.all(TOOL_PROBES.map((d) => probeOne(d, exec)));
    const probes = {};
    for (const p of probesArr) probes[p.key] = p;
    return buildDoctorReport({ probes, scan: scan || {} });
}

function envAction(tool, detail, fix) {
    return { kind: "fix_env", payload: { tool, detail, fix }, label: "Help me set up " + tool };
}

/**
 * Turn probe results + scan facts into grouped readiness checks. Pure.
 * @returns {{ overall:"ready"|"caution"|"blocked", generatedAt:string, groups:Array }}
 */
export function buildDoctorReport({ probes, scan }) {
    const get = (k) => (probes && probes[k]) || { found: false, version: null };
    const a = (scan && scan.assessment) || {};
    const buildTool = a.buildTool || null;

    const buildRun = [];

    // --- JDK -----------------------------------------------------------------
    const java = get("java");
    buildRun.push(
        java.found
            ? { id: "jdk", label: "Java Development Kit", status: "ok", detail: "Java " + (java.version || "detected") }
            : {
                  id: "jdk",
                  label: "Java Development Kit",
                  status: "fail",
                  detail: "java not found on PATH",
                  fix: "Install a JDK 17 or newer (Microsoft Build of OpenJDK or Eclipse Temurin) and make sure `java` is on your PATH.",
                  action: envAction("a JDK", "java not found on PATH", "Install JDK 17+ (Microsoft OpenJDK / Temurin) and add it to PATH."),
              }
    );

    // --- Build tool ----------------------------------------------------------
    if (buildTool === "Maven") {
        const mvn = get("mvn");
        const ok = mvn.found || a.hasMavenWrapper;
        buildRun.push(
            ok
                ? {
                      id: "build",
                      label: "Maven",
                      status: "ok",
                      detail: mvn.found ? "Maven " + (mvn.version || "detected") : "Using the project Maven wrapper (./mvnw)",
                  }
                : {
                      id: "build",
                      label: "Maven",
                      status: "fail",
                      detail: "mvn not found and no ./mvnw wrapper in the repo",
                      fix: "Install Apache Maven, or add the Maven wrapper (`mvn -N wrapper:wrapper`) so the build runs anywhere.",
                      action: envAction("Maven", "mvn not found and no ./mvnw wrapper", "Install Apache Maven or add the ./mvnw wrapper."),
                  }
        );
    } else if (buildTool === "Gradle") {
        const gr = get("gradle");
        const ok = gr.found || a.hasGradleWrapper;
        buildRun.push(
            ok
                ? {
                      id: "build",
                      label: "Gradle",
                      status: "ok",
                      detail: gr.found ? "Gradle " + (gr.version || "detected") : "Using the project Gradle wrapper (./gradlew)",
                  }
                : {
                      id: "build",
                      label: "Gradle",
                      status: "fail",
                      detail: "gradle not found and no ./gradlew wrapper in the repo",
                      fix: "Install Gradle, or add the Gradle wrapper (`gradle wrapper`) so the build runs anywhere.",
                      action: envAction("Gradle", "gradle not found and no ./gradlew wrapper", "Install Gradle or add the ./gradlew wrapper."),
                  }
        );
    } else {
        buildRun.push({
            id: "build",
            label: "Build tool",
            status: "info",
            detail: "No Maven or Gradle build file detected yet.",
        });
    }

    // --- git -----------------------------------------------------------------
    const git = get("git");
    buildRun.push(
        git.found
            ? { id: "git", label: "Git", status: "ok", detail: git.version ? "git " + git.version : "installed" }
            : {
                  id: "git",
                  label: "Git",
                  status: "fail",
                  detail: "git not found on PATH",
                  fix: "Install Git — the modernization workflow uses a branch and a pull request.",
                  action: envAction("Git", "git not found on PATH", "Install Git and ensure it is on PATH."),
              }
    );

    // --- containerize / deploy (optional) ------------------------------------
    const deploy = [];
    const docker = get("docker");
    if (docker.found) {
        deploy.push({ id: "docker", label: "Docker", status: "ok", detail: docker.version ? "Docker " + docker.version : "installed" });
    } else if (a.hasDockerfile) {
        deploy.push({
            id: "docker",
            label: "Docker",
            status: "warn",
            detail: "A Dockerfile is present but Docker isn't installed.",
            fix: "Install Docker Desktop (or the Docker engine) to build and run the container image locally.",
            action: envAction("Docker", "Dockerfile present but Docker not installed", "Install Docker Desktop / engine."),
        });
    } else {
        deploy.push({ id: "docker", label: "Docker", status: "info", detail: "Not installed — only needed to build container images." });
    }
    const az = get("az");
    deploy.push(
        az.found
            ? { id: "az", label: "Azure CLI", status: "ok", detail: az.version ? "az " + az.version : "installed" }
            : { id: "az", label: "Azure CLI", status: "info", detail: "Optional — needed to provision Azure resources and set up passwordless auth." }
    );
    const azd = get("azd");
    deploy.push(
        azd.found
            ? { id: "azd", label: "Azure Developer CLI", status: "ok", detail: azd.version ? "azd " + azd.version : "installed" }
            : { id: "azd", label: "Azure Developer CLI", status: "info", detail: "Optional — `azd` deploys the app to Azure once it's modernized." }
    );

    // --- workflow readiness (from scan, no probes) ---------------------------
    const flow = [];
    const g = scan && scan.git;
    if (!g) {
        flow.push({ id: "branch", label: "Source control", status: "info", detail: "Git branch state unavailable." });
    } else if (g.isMigrationBranch) {
        flow.push({ id: "branch", label: "Working branch", status: "ok", detail: "On modernization branch '" + g.branch + "'." });
    } else {
        flow.push({
            id: "branch",
            label: "Working branch",
            status: "info",
            detail: "On '" + (g.branch || "unknown") + "' — consider a dedicated modernization branch before making changes.",
        });
    }
    const hasAssessment = !!(
        (scan && scan.report && scan.report.findings && scan.report.findings.length) ||
        (scan && scan.plan && scan.plan.exists) ||
        (scan && scan.progress && scan.progress.exists)
    );
    flow.push(
        hasAssessment
            ? { id: "assessed", label: "Assessment", status: "ok", detail: "Assessment artifacts found — you're underway." }
            : {
                  id: "assessed",
                  label: "Assessment",
                  status: "warn",
                  detail: "No assessment yet. Start here to map your modernization work.",
                  action: { kind: "start_assessment", payload: {}, label: "Run assessment" },
              }
    );
    const nSkills = (scan && scan.skills && scan.skills.length) || 0;
    flow.push({
        id: "skills",
        label: "Custom skills",
        status: "info",
        detail: nSkills ? nSkills + " custom skill" + (nSkills > 1 ? "s" : "") + " discovered." : "No custom skills yet (optional).",
    });

    const groups = [
        { id: "buildRun", name: "Build & run", checks: buildRun },
        { id: "deploy", name: "Containerize & deploy to Azure (optional)", checks: deploy },
        { id: "flow", name: "Workflow readiness", checks: flow },
    ];

    let overall = "ready";
    const all = groups.reduce((acc, grp) => acc.concat(grp.checks), []);
    if (all.some((c) => c.status === "fail")) overall = "blocked";
    else if (all.some((c) => c.status === "warn")) overall = "caution";

    return { overall, generatedAt: new Date().toISOString(), groups };
}
