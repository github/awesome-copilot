import { randomUUID } from "node:crypto";

import {
  commandStatus,
  parseJsonLines,
  providerChildEnv,
  spawnWithInput
} from "./shared.mjs";

const REQUIRED_FLAGS = [
  "--prompt",
  "--output-format",
  "--approval-mode",
  "--sandbox",
  "--session-id",
  "--resume"
];
const SMOKE_VERIFIED = false;

export const geminiProvider = {
  name: "gemini",
  sessionKind: "sessionId",
  registryDefault: false,
  check() {
    const version = commandStatus("gemini", ["--version"], { provider: "gemini" });
    const help = commandStatus("gemini", ["--help"], { provider: "gemini" });
    const auth = commandStatus("gemini", ["--list-sessions", "--output-format", "json"], { provider: "gemini" });
    const helpText = `${help.stdout}\n${help.stderr}`;
    const missingFlags = REQUIRED_FLAGS.filter((flag) => !helpText.includes(flag));
    const authStatus = geminiAuthStatus(auth);
    return {
      provider: "gemini",
      available: version.available && help.available && missingFlags.length === 0 && authStatus === "ok" && SMOKE_VERIFIED,
      version: version.stdout || version.stderr,
      auth: authStatus,
      resume: helpText.includes("--resume") && helpText.includes("--session-id") ? "unverified" : "unsupported",
      output: helpText.includes("stream-json") ? "stream-json" : "unverified",
      tools: "unverified",
      cwdIsolation: "configured",
      configIsolation: "unverified",
      sandbox: helpText.includes("--sandbox") ? "configured" : "unsupported",
      network: "unverified",
      promptTransport: "stdin",
      registryDefault: false,
      requiredFlagsOk: missingFlags.length === 0,
      smokeVerified: SMOKE_VERIFIED,
      notes: [
        ...(missingFlags.length ? [`missing required flag(s): ${missingFlags.join(", ")}`] : []),
        ...(authStatus === "ok" ? [] : [`auth/tier gate not satisfied: ${authStatus}`]),
        "experimental: blocked until current-version smoke tests verify auth/tier, UUID resume, stream-json schema, sandbox, policy/config isolation, and tool restrictions"
      ]
    };
  },
  async startSession(input) {
    const sessionId = input.generatedSessionId ?? randomUUID();
    return runGemini({ ...input, sessionId, starting: true });
  },
  async continueSession(input) {
    return runGemini({ ...input, starting: false });
  }
};

function geminiAuthStatus(status) {
  const text = `${status.stdout}\n${status.stderr}`;
  if (/ineligibletiererror|unsupported_client|no longer supported/i.test(text)) return "failed";
  if (/authentication required|not logged in|login|unauthori[sz]ed/i.test(text)) return "missing";
  if (!status.available) return "failed";
  if (/error authenticating/i.test(text)) return "failed";
  return "ok";
}

async function runGemini(input) {
  const args = [
    "--prompt",
    "",
    "--output-format",
    "stream-json",
    "--approval-mode",
    "plan",
    "--sandbox"
  ];
  if (input.model) args.push("--model", input.model);
  if (input.starting) {
    args.push("--session-id", input.sessionId);
  } else {
    args.push("--resume", input.sessionId);
  }

  const result = await spawnWithInput("gemini", args, input.prompt, { cwd: input.cwd, env: providerChildEnv("gemini"), timeoutMs: input.timeoutMs });
  const events = parseJsonLines(result.stdout);
  const finalMessage = extractGeminiFinalMessage(events);
  const cliError = hasGeminiError(events, result.stderr);
  const unparsedOutput = events.some((event) => event?.type === "unparsed");
  const hasModelOutput = finalMessage.trim() !== "";
  const status = result.code === 0 && !result.timedOut && !cliError && !unparsedOutput && hasModelOutput ? "completed" : "failed";
  const stderr = [
    result.stderr,
    unparsedOutput ? "Gemini returned non-JSON output; failing closed." : "",
    hasModelOutput ? "" : "Gemini returned no parseable model output."
  ].filter(Boolean).join("\n");
  return {
    provider: "gemini",
    sessionId: extractGeminiSessionId(events) ?? input.sessionId ?? null,
    rawOutput: finalMessage,
    status,
    resumed: !input.starting,
    resumeFailed: !input.starting && status !== "completed",
    stderr,
    events
  };
}

function extractGeminiSessionId(events) {
  for (const event of events) {
    if (!isGeminiSessionControlEvent(event)) continue;
    for (const key of ["session_id", "sessionId", "sessionID"]) {
      if (typeof event?.[key] === "string" && isValidUuid(event[key])) return event[key];
    }
  }
  return null;
}

function isGeminiSessionControlEvent(event) {
  return ["system", "init", "session", "metadata", "result"].includes(event?.type);
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function extractGeminiFinalMessage(events) {
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

function hasGeminiError(events, stderr) {
  const errorText = String(stderr ?? "");
  if (/error authenticating|ineligibletiererror|unsupported_client|authentication required|not logged in|login|unauthori[sz]ed/i.test(errorText)) return true;
  return events.some((event) => event?.error != null || event?.is_error === true || event?.type === "error");
}
