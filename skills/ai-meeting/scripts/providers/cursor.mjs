import {
  commandStatus,
  parseJsonLines,
  providerChildEnv,
  spawnWithInput
} from "./shared.mjs";

const REQUIRED_FLAGS = [
  "--print",
  "--output-format",
  "--mode",
  "--sandbox",
  "--workspace",
  "--resume"
];
const SMOKE_VERIFIED = false;

export const cursorProvider = {
  name: "cursor",
  sessionKind: "chatId",
  registryDefault: false,
  check() {
    const version = commandStatus("agent", ["--version"], { provider: "cursor" });
    const help = commandStatus("agent", ["--help"], { provider: "cursor" });
    const auth = commandStatus("agent", ["status"], { provider: "cursor" });
    const helpText = `${help.stdout}\n${help.stderr}`;
    const missingFlags = REQUIRED_FLAGS.filter((flag) => !helpText.includes(flag));
    const authStatus = cursorAuthStatus(auth);
    return {
      provider: "cursor",
      available: version.available && help.available && missingFlags.length === 0 && authStatus === "ok" && SMOKE_VERIFIED,
      version: version.stdout || version.stderr,
      auth: authStatus,
      resume: helpText.includes("--resume") ? "unverified" : "unsupported",
      output: helpText.includes("stream-json") ? "stream-json" : "unverified",
      tools: "unverified",
      cwdIsolation: helpText.includes("--workspace") ? "configured" : "unverified",
      configIsolation: "unverified",
      sandbox: helpText.includes("--sandbox") ? "configured" : "unsupported",
      network: "unverified",
      promptTransport: "stdin",
      registryDefault: false,
      requiredFlagsOk: missingFlags.length === 0,
      smokeVerified: SMOKE_VERIFIED,
      notes: [
        ...(missingFlags.length ? [`missing required flag(s): ${missingFlags.join(", ")}`] : []),
        ...(authStatus === "ok" ? [] : [`auth gate not satisfied: ${authStatus}`]),
        "experimental: blocked until current-version smoke tests verify stdin prompt, session resume, ask-mode tool restrictions, sandbox behavior, workspace isolation, and no force/yolo flags"
      ]
    };
  },
  async startSession(input) {
    return runCursor({ ...input, starting: true });
  },
  async continueSession(input) {
    return runCursor({ ...input, starting: false });
  }
};

function cursorAuthStatus(status) {
  const text = `${status.stdout}\n${status.stderr}`;
  if (!status.available) return /not logged in|authentication required|login/i.test(text) ? "missing" : "failed";
  if (/not logged in|authentication required|login/i.test(text)) return "missing";
  if (/logged in|email|user|account|api key/i.test(text)) return "ok";
  return "unknown";
}

async function runCursor(input) {
  const args = [
    "--print",
    "--output-format",
    "stream-json",
    "--mode",
    "ask",
    "--sandbox",
    "enabled",
    "--workspace",
    input.cwd
  ];
  if (input.model) args.push("--model", input.model);
  if (!input.starting) args.push("--resume", input.sessionId);

  const result = await spawnWithInput("agent", args, input.prompt, { cwd: input.cwd, env: providerChildEnv("cursor"), timeoutMs: input.timeoutMs });
  const events = parseJsonLines(result.stdout);
  const finalMessage = extractCursorFinalMessage(events);
  const cliError = hasCursorError(events, result.stderr);
  const unparsedOutput = events.some((event) => event?.type === "unparsed");
  const hasModelOutput = finalMessage.trim() !== "";
  const status = result.code === 0 && !result.timedOut && !cliError && !unparsedOutput && hasModelOutput ? "completed" : "failed";
  const stderr = [
    result.stderr,
    unparsedOutput ? "Cursor returned non-JSON output; failing closed." : "",
    hasModelOutput ? "" : "Cursor returned no parseable model output."
  ].filter(Boolean).join("\n");
  return {
    provider: "cursor",
    sessionId: extractCursorSessionId(events) ?? null,
    rawOutput: finalMessage,
    status,
    resumed: !input.starting,
    resumeFailed: !input.starting && status !== "completed",
    stderr,
    events
  };
}

function extractCursorSessionId(events) {
  for (const event of events) {
    if (!isCursorSessionControlEvent(event)) continue;
    for (const key of ["chatId", "chat_id", "session_id", "sessionId"]) {
      if (typeof event?.[key] === "string" && isValidCursorSessionId(event[key])) return event[key];
    }
  }
  return null;
}

function isCursorSessionControlEvent(event) {
  return ["system", "init", "session", "metadata", "result"].includes(event?.type);
}

function isValidCursorSessionId(value) {
  return /^(chat|ses|session|c)_[A-Za-z0-9_-]{6,}$/.test(value);
}

function extractCursorFinalMessage(events) {
  let text = "";
  for (const event of events) {
    if (event.type === "result" && typeof event.result === "string") {
      text = event.result;
      continue;
    }
    if (event.type === "assistant" && Array.isArray(event.message?.content)) {
      for (const block of event.message.content) {
        if (block?.type === "text" && typeof block.text === "string") text += block.text;
      }
    }
    if (event.type === "text" && typeof event.text === "string") {
      text += event.text;
    }
  }
  return text.trim();
}

function hasCursorError(events, stderr) {
  const errorText = String(stderr ?? "");
  if (/authentication required|not logged in|login|unauthori[sz]ed/i.test(errorText)) return true;
  return events.some((event) => event?.error != null || event?.is_error === true || event?.type === "error");
}
