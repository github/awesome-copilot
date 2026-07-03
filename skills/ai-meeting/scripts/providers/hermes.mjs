import {
  commandStatus,
  providerChildEnv,
  spawnWithInput
} from "./shared.mjs";

const REQUIRED_FLAGS = [
  "--query",
  "--quiet",
  "--resume",
  "--ignore-user-config",
  "--ignore-rules",
  "--source",
  "--max-turns",
  "--toolsets"
];
const SMOKE_VERIFIED = false;

export const hermesProvider = {
  name: "hermes",
  sessionKind: "none",
  registryDefault: false,
  check() {
    const version = commandStatus("hermes", ["--version"], { provider: "hermes" });
    const help = commandStatus("hermes", ["chat", "--help"], { provider: "hermes" });
    const status = commandStatus("hermes", ["status"], { provider: "hermes" });
    const helpText = `${help.stdout}\n${help.stderr}`;
    const missingFlags = REQUIRED_FLAGS.filter((flag) => !helpText.includes(flag));
    const auth = hermesAuthStatus(status);
    return {
      provider: "hermes",
      available: version.available && help.available && missingFlags.length === 0 && auth === "ok" && SMOKE_VERIFIED,
      version: version.stdout || version.stderr,
      auth,
      resume: "unverified",
      output: "text",
      tools: helpText.includes("--toolsets") ? "unverified" : "unverified",
      cwdIsolation: "configured",
      configIsolation: helpText.includes("--ignore-user-config") && helpText.includes("--ignore-rules") ? "configured" : "unverified",
      sandbox: "unsupported",
      network: "unverified",
      promptTransport: "stdin",
      registryDefault: false,
      requiredFlagsOk: missingFlags.length === 0,
      smokeVerified: SMOKE_VERIFIED,
      notes: [
        ...(missingFlags.length ? [`missing required flag(s): ${missingFlags.join(", ")}`] : []),
        ...(auth === "ok" ? [] : [`auth/provider config gate not satisfied: ${auth}`]),
        "experimental: blocked until current-version smoke tests verify stdin prompt, auth/provider config, quiet output format, toolset isolation, and whether session metadata is machine-parseable"
      ]
    };
  },
  async startSession(input) {
    return runHermes({ ...input, starting: true });
  },
  async continueSession(input) {
    return runHermes({ ...input, starting: false });
  }
};

function hermesAuthStatus(status) {
  const text = `${status.stdout}\n${status.stderr}`;
  if (!status.available) return "failed";
  if (/model:\s*\(not set\)|not configured|not logged in|no .*credentials|not set/i.test(text)) return "missing";
  if (/api keys[\s\S]*[✓✔]|auth providers[\s\S]*[✓✔]|model:\s*(?!\(not set\)).+/i.test(text)) return "ok";
  return "unknown";
}

async function runHermes(input) {
  const args = [
    "chat",
    "--query",
    "-",
    "--quiet",
    "--toolsets",
    "",
    "--ignore-user-config",
    "--ignore-rules",
    "--source",
    "ai-meeting",
    "--max-turns",
    "1"
  ];
  if (input.model) args.push("--model", input.model);
  if (!input.starting && input.sessionId) args.push("--resume", input.sessionId);

  const result = await spawnWithInput("hermes", args, input.prompt, { cwd: input.cwd, env: providerChildEnv("hermes"), timeoutMs: input.timeoutMs });
  const rawOutput = sanitizeHermesOutput(result.stdout);
  const cliError = hasHermesError(`${result.stdout}\n${result.stderr}`);
  const hasModelOutput = rawOutput.trim() !== "";
  const status = result.code === 0 && !result.timedOut && !cliError && hasModelOutput ? "completed" : "failed";
  const stderr = [
    result.stderr,
    result.timedOut ? "Hermes timed out." : "",
    hasModelOutput ? "" : "Hermes returned no parseable model output."
  ].filter(Boolean).join("\n");
  return {
    provider: "hermes",
    sessionId: null,
    rawOutput,
    status,
    resumed: !input.starting,
    resumeFailed: !input.starting && status !== "completed",
    stderr,
    events: []
  };
}

function sanitizeHermesOutput(stdout) {
  return String(stdout ?? "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*(session[_ -]?id|session)\s*[:=]\s*[A-Za-z0-9_.:-]+\s*$/i.test(line))
    .join("\n")
    .trim();
}

function hasHermesError(stderr) {
  return /no inference provider configured|authentication required|not logged in|login|unauthori[sz]ed|api key|error/i.test(String(stderr ?? ""));
}
