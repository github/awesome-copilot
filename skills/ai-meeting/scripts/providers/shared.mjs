import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const AI_MEETING_ACTIVE_ENV = "AI_MEETING_ACTIVE";

export function commandStatus(command, args = ["--version"], options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? createChildWorkspace(`status-${safeName(command)}`),
    encoding: "utf8",
    timeout: 10_000,
    env: options.env ?? providerChildEnv(options.provider)
  });
  return {
    available: result.status === 0,
    status: result.status,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim()
  };
}

export function createTempOutputFile(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `ai-meeting-${prefix}-`));
  return path.join(dir, "last-message.md");
}

export function createChildWorkspace(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `ai-meeting-${prefix}-cwd-`));
}

function safeName(value) {
  return String(value ?? "provider").replace(/[^A-Za-z0-9_.-]/g, "-");
}

export function isGitWorktree(cwd) {
  const result = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd,
    encoding: "utf8",
    timeout: 5_000
  });
  return result.status === 0 && result.stdout.trim() === "true";
}

export function parseJsonLines(stdout) {
  const events = [];
  for (const line of String(stdout ?? "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      events.push({ type: "unparsed", line });
    }
  }
  return events;
}

export function spawnWithInput(command, args, input, options = {}) {
  if (!options.env) {
    throw new Error(`spawnWithInput requires an explicit provider-scoped env for ${command}.`);
  }
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      detached: true,
      env: options.env,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      terminateProcessGroup(proc.pid, "SIGTERM");
      setTimeout(() => terminateProcessGroup(proc.pid, "SIGKILL"), 5_000).unref?.();
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    proc.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: String(error), timedOut });
    });

    proc.stdin.on("error", (error) => {
      if (error?.code !== "EPIPE") {
        stderr += `\nstdin error: ${error.message ?? String(error)}`;
      }
    });
    proc.stdin.end(input);
  });
}

function terminateProcessGroup(pid, signal) {
  if (!pid) return;
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // Best effort.
    }
  }
}

export function providerChildEnv(provider, extra = {}) {
  const env = {
    [AI_MEETING_ACTIVE_ENV]: "1"
  };
  for (const key of [
    "PATH",
    "USER",
    "LOGNAME",
    "LANG",
    "LC_ALL",
    "TERM"
  ]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  for (const key of providerAuthEnvKeys(provider)) {
    if (process.env[key]) env[key] = process.env[key];
  }
  if (usesRealHome(provider)) {
    if (process.env.HOME) env.HOME = process.env.HOME;
  } else {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), `ai-meeting-${provider || "provider"}-home-`));
    env.HOME = home;
    env.XDG_CONFIG_HOME = path.join(home, ".config");
    env.XDG_DATA_HOME = path.join(home, ".local", "share");
    env.XDG_CACHE_HOME = path.join(home, ".cache");
  }
  return { ...env, ...extra };
}

function usesRealHome(provider) {
  return provider === "codex" || provider === "claude";
}

function providerAuthEnvKeys(provider) {
  switch (provider) {
    case "codex":
      return ["OPENAI_API_KEY"];
    case "claude":
      return ["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"];
    case "qoder":
      return ["QODER_TOKEN", "QODER_API_KEY"];
    case "cursor":
      return ["CURSOR_API_KEY"];
    case "gemini":
      return [
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
        "GOOGLE_APPLICATION_CREDENTIALS",
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_CLOUD_LOCATION",
        "GOOGLE_GENAI_USE_VERTEXAI"
      ];
    case "hermes":
      return [
        "HERMES_INFERENCE_MODEL",
        "HERMES_PROVIDER",
        "OPENROUTER_API_KEY",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
        "DEEPSEEK_API_KEY",
        "XAI_API_KEY",
        "NVIDIA_API_KEY",
        "ZAI_API_KEY",
        "MOONSHOT_API_KEY",
        "STEPFUN_API_KEY",
        "MINIMAX_API_KEY"
      ];
    case "opencode":
      return [];
    default:
      return [];
  }
}

export function collectLastMessage(file, fallback) {
  if (file && fs.existsSync(file)) {
    return fs.readFileSync(file, "utf8");
  }
  return fallback ?? "";
}
