#!/usr/bin/env node
"use strict";

/*
 * intent-drift launcher.
 *
 * The analyzer is a Python 3.10+ CLI that depends on the `intent-drift` engine
 * package. On first run this shim finds a suitable Python, creates a dedicated
 * virtualenv, installs the engine into it, then runs analyzer.py with the
 * user's arguments passed through unchanged.
 *
 * Env overrides:
 *   INTENT_DRIFT_PYTHON  explicit python3 binary to use (>= 3.10)
 *   INTENT_DRIFT_VENV    where to keep the venv (default ~/.intent-drift-venv)
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

/*
 * Run Python with isolated mode (-I) so that the analyzed repository's
 * working directory cannot inject a repo-local module (e.g. a stray `venv.py`
 * or a `PYTHONPATH` entry from the checkout) into the interpreter during
 * provisioning. -I ignores PYTHONPATH and user site-packages and implies -E
 * and -s, which is the safest bootstrap posture.
 */

const PKG_DIR = path.join(__dirname, "..");
const ANALYZER = path.join(PKG_DIR, "analyzer.py");
const MIN_PY = [3, 10];

function parseVersion(version) {
  const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(String(version).trim());
  return m ? [Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : 0] : null;
}

function isGood(v) {
  return (
    v && (v[0] > MIN_PY[0] || (v[0] === MIN_PY[0] && v[1] >= MIN_PY[1]))
  );
}

function pythonVersion(py) {
  // -I isolates module lookup during the probe too: a repo-local module
  // named `python` or a PYTHONPATH entry cannot shadow the interpreter.
  const r = spawnSync(py, ["-I", "--version"], { encoding: "utf8" });
  if (r.status !== 0) return null;
  return parseVersion((r.stdout || r.stderr).toString());
}

function findPython() {
  const overrides = process.env.INTENT_DRIFT_PYTHON
    ? [process.env.INTENT_DRIFT_PYTHON]
    : [];
  // `python` is a last-resort fallback for Windows installs that expose the
  // interpreter as python.exe without a working python3; the version check
  // below still rejects anything older than 3.10.
  const candidates = [
    ...overrides,
    "python3.12",
    "python3.11",
    "python3.10",
    "python3",
    "python",
  ];
  for (const py of candidates) {
    const v = pythonVersion(py);
    if (v && isGood(v)) return { py, version: v };
  }
  return null;
}

function venvPython(venvDir) {
  return process.platform === "win32"
    ? path.join(venvDir, "Scripts", "python.exe")
    : path.join(venvDir, "bin", "python");
}

function ensureVenv(basePython) {
  const venvDir =
    process.env.INTENT_DRIFT_VENV ||
    path.join(os.homedir(), ".intent-drift-venv");
  const py = venvPython(venvDir);
  const marker = path.join(venvDir, ".intent-drift-ready");

  const usable =
    fs.existsSync(py) &&
    fs.existsSync(marker) &&
    pythonVersion(py) !== null;

  if (usable) return py;

  if (fs.existsSync(venvDir)) {
    // An existing directory that fails the usability check is treated as a
    // user's own venv (or a half-created one), never as disposable: deleting
    // it would remove unrelated files. The user must point INTENT_DRIFT_VENV
    // at a fresh path so the skill can own its environment.
    process.stderr.write(
      `intent-drift: ${venvDir} exists but is not a usable intent-drift ` +
        "venv (missing readiness marker or its interpreter is unusable). " +
        "Refusing to overwrite it. Set INTENT_DRIFT_VENV to a fresh directory " +
        "to let the skill create its own venv there.\n"
    );
    process.exit(1);
  }

  process.stderr.write(
    "intent-drift: first run — creating a dedicated venv " +
      `(${venvDir}) and installing the intent-drift engine.\n`
  );
  fs.mkdirSync(venvDir, { recursive: true });
  const create = spawnSync(
    basePython,
    ["-I", "-m", "venv", venvDir],
    { stdio: "inherit" }
  );
  if (create.status !== 0) {
    process.stderr.write(
      "intent-drift: failed to create virtualenv. Install Python 3.10+ " +
        "or set INTENT_DRIFT_PYTHON to a Python 3.10+ binary.\n"
    );
    process.exit(1);
  }
  const install = spawnSync(
    py,
    ["-I", "-m", "pip", "install", "--quiet", "--disable-pip-version-check", "intent-drift", "PyYAML"],
    { stdio: "inherit" }
  );
  if (install.status !== 0) {
    process.stderr.write("intent-drift: failed to install the engine.\n");
    process.exit(1);
  }
  fs.writeFileSync(marker, "ready\n");

  return py;
}

function main() {
  const found = findPython();
  if (!found) {
    process.stderr.write(
      "intent-drift: requires Python 3.10+ (found none). " +
        "Install Python 3.10+ or set INTENT_DRIFT_PYTHON to a compatible binary.\n"
    );
    process.exit(1);
  }

  const py = ensureVenv(found.py);
  const run = spawnSync(py, [ANALYZER, ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  if (run.error) {
    process.stderr.write(`intent-drift: ${run.error.message}\n`);
    process.exit(1);
  }
  process.exit(run.status === null ? 1 : run.status);
}

main();
