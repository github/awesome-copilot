import {
  commandStatus,
  parseJsonLines,
  providerChildEnv,
  spawnWithInput
} from "./shared.mjs";

const AGENT_NAME = "ai-meeting-readonly";
const REQUIRED_FLAGS = [
  "--format",
  "--session",
  "--agent",
  "--title"
];
const SMOKE_VERIFIED = false;

export const opencodeProvider = {
  name: "opencode",
  sessionKind: "sessionId",
  registryDefault: false,
  check() {
    const version = commandStatus("opencode", ["--version"], { provider: "opencode" });
    const help = commandStatus("opencode", ["run", "--help"], { provider: "opencode" });
    const agent = commandStatus("opencode", ["debug", "agent", AGENT_NAME], { provider: "opencode" });
    const auth = commandStatus("opencode", ["auth", "list"], { provider: "opencode" });
    const helpText = `${help.stdout}\n${help.stderr}`;
    const missingFlags = REQUIRED_FLAGS.filter((flag) => !helpText.includes(flag));
    const agentStatus = analyzeReadonlyAgent(agent);
    const authStatus = opencodeAuthStatus(auth);
    return {
      provider: "opencode",
      available: version.available && help.available && missingFlags.length === 0 && authStatus === "ok" && agentStatus.ready && SMOKE_VERIFIED,
      version: version.stdout || version.stderr,
      auth: authStatus,
      resume: helpText.includes("--session") ? "unverified" : "unsupported",
      output: helpText.includes("--format") ? "json" : "unverified",
      tools: agentStatus.ready ? "read-only" : "unverified",
      cwdIsolation: "configured",
      configIsolation: "unverified",
      sandbox: "unsupported",
      network: "unverified",
      promptTransport: "stdin",
      registryDefault: false,
      requiredFlagsOk: missingFlags.length === 0,
      smokeVerified: SMOKE_VERIFIED,
      agent: AGENT_NAME,
      notes: [
        ...(missingFlags.length ? [`missing required flag(s): ${missingFlags.join(", ")}`] : []),
        ...(authStatus === "ok" ? [] : [`auth gate not satisfied: ${authStatus}`]),
        ...(agentStatus.notes.length ? agentStatus.notes : []),
        "experimental: blocked until current-version smoke tests verify stdin prompt, session resume, read-only agent permissions, cwd isolation, and no fallback agent"
      ]
    };
  },
  async startSession(input) {
    return runOpenCode({ ...input, starting: true });
  },
  async continueSession(input) {
    return runOpenCode({ ...input, starting: false });
  }
};

function opencodeAuthStatus(status) {
  const text = `${status.stdout}\n${status.stderr}`;
  if (!status.available) return "failed";
  if (/0 credentials/i.test(text)) return "missing";
  if (/credentials/i.test(text)) return "ok";
  return "unknown";
}

function analyzeReadonlyAgent(status) {
  if (!status.available) {
    return { ready: false, notes: [`missing ${AGENT_NAME} agent`] };
  }
  let data;
  try {
    data = JSON.parse(status.stdout);
  } catch {
    return { ready: false, notes: [`${AGENT_NAME} agent output is not JSON`] };
  }
  const permissions = Array.isArray(data.permission) ? data.permission : [];
  const notes = [];
  if (data.name !== AGENT_NAME) notes.push(`${AGENT_NAME} agent name mismatch`);
  if (data.mode !== "primary") notes.push(`${AGENT_NAME} agent must be primary`);
  const allowed = new Set(["read", "glob", "grep", "list"]);
  let wildcardDenyIndex = -1;
  let firstReadOnlyAllowIndex = -1;
  permissions.forEach((item, index) => {
    if (item?.permission === "*" && item?.action === "deny" && item?.pattern === "*") wildcardDenyIndex = index;
    if (item?.action === "allow" && allowed.has(String(item.permission ?? "")) && firstReadOnlyAllowIndex === -1) firstReadOnlyAllowIndex = index;
  });
  for (const [index, item] of permissions.entries()) {
    const permission = String(item.permission ?? "");
    if (item?.action === "allow" && (permission === "*" || !allowed.has(permission))) {
      notes.push(`${AGENT_NAME} allows unsafe permission: ${permission || "unknown"}`);
    }
    if (item?.action === "allow" && allowed.has(permission) && item?.pattern === "*") {
      notes.push(`${AGENT_NAME} allows broad ${permission} scope: *`);
    }
    if (item?.action === "ask" && (permission === "*" || !allowed.has(permission))) {
      notes.push(`${AGENT_NAME} asks for unsafe permission: ${permission || "unknown"}`);
    }
    if (item?.action === "allow" && allowed.has(permission) && wildcardDenyIndex !== -1 && wildcardDenyIndex > index) {
      notes.push(`${AGENT_NAME} wildcard deny must precede read-only allow rules`);
    }
  }
  if (wildcardDenyIndex === -1) {
    notes.push(`${AGENT_NAME} should deny wildcard permissions before allowing read-only tools`);
  } else if (firstReadOnlyAllowIndex !== -1 && wildcardDenyIndex > firstReadOnlyAllowIndex) {
    notes.push(`${AGENT_NAME} wildcard deny must precede read-only allow rules`);
  }
  return { ready: notes.length === 0, notes };
}

async function runOpenCode(input) {
  const args = [
    "run",
    "--format",
    "json",
    "--agent",
    AGENT_NAME
  ];
  if (input.model) args.push("--model", input.model);
  if (input.starting) {
    args.push("--title", input.title ?? "ai-meeting");
  } else {
    args.push("--session", input.sessionId);
  }

  const result = await spawnWithInput("opencode", args, input.prompt, { cwd: input.cwd, env: providerChildEnv("opencode"), timeoutMs: input.timeoutMs });
  const events = parseJsonLines(result.stdout);
  const finalMessage = extractOpenCodeFinalMessage(events);
  const cliError = hasOpenCodeError(events, result.stderr);
  const unparsedOutput = events.some((event) => event?.type === "unparsed");
  const hasModelOutput = finalMessage.trim() !== "";
  const status = result.code === 0 && !result.timedOut && !cliError && !unparsedOutput && hasModelOutput ? "completed" : "failed";
  const stderr = [
    result.stderr,
    unparsedOutput ? "OpenCode returned non-JSON output; failing closed." : "",
    hasModelOutput ? "" : "OpenCode returned no parseable model output."
  ].filter(Boolean).join("\n");
  return {
    provider: "opencode",
    sessionId: extractOpenCodeSessionId(events),
    rawOutput: finalMessage,
    status,
    resumed: !input.starting,
    resumeFailed: !input.starting && status !== "completed",
    stderr,
    events
  };
}

function extractOpenCodeSessionId(events) {
  for (const event of events) {
    if (typeof event?.sessionID === "string" && /^ses_[A-Za-z0-9]+$/.test(event.sessionID)) return event.sessionID;
  }
  return null;
}

function extractOpenCodeFinalMessage(events) {
  let text = "";
  for (const event of events) {
    if (event?.type === "text" && event.part?.type === "text" && typeof event.part.text === "string") {
      text += event.part.text;
    }
  }
  return text.trim();
}

function hasOpenCodeError(events, stderr) {
  const errorText = String(stderr ?? "");
  if (/agent ".+" not found|falling back to default agent|unauthori[sz]ed|sign in|log in/i.test(errorText)) return true;
  return events.some((event) => {
    if (event?.error != null) return true;
    if (event?.type === "error") return true;
    if (event?.type === "step_finish" && event.part?.reason === "error") return true;
    if (event?.type === "step_finish" && event.reason === "error") return true;
    return false;
  });
}
