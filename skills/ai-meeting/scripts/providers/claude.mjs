import {
  commandStatus,
  parseJsonLines,
  providerChildEnv,
  spawnWithInput
} from "./shared.mjs";

export const claudeProvider = {
  name: "claude",
  sessionKind: "sessionId",
  check() {
      const version = commandStatus("claude", ["--version"], { provider: "claude" });
      const help = commandStatus("claude", ["-p", "--help"], { provider: "claude" });
    const helpText = `${help.stdout}\n${help.stderr}`;
    return {
      provider: "claude",
      available: version.available && help.available && helpText.includes("--resume"),
      version: version.stdout || version.stderr,
      auth: "unknown",
      resume: helpText.includes("--resume") ? "supported" : "unsupported",
      output: "stream-json",
      tools: "disabled",
      cwdIsolation: "configured",
      configIsolation: "unverified",
      sandbox: "unsupported",
      network: "configured: no WebSearch/WebFetch tools",
      promptTransport: "stdin",
      registryDefault: true,
      requiredFlagsOk: helpText.includes("--resume"),
      smokeVerified: true
    };
  },
  async startSession(input) {
    return runClaude(input);
  },
  async continueSession(input) {
    return runClaude(input);
  }
};

async function runClaude(input) {
  const args = [
    "-p",
    "--safe-mode",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--permission-mode",
    "dontAsk",
    "--tools",
    ""
  ];
  if (input.model) args.push("--model", input.model);
  if (input.sessionId) args.push("--resume", input.sessionId);
  const result = await spawnWithInput("claude", args, input.prompt, { cwd: input.cwd, env: providerChildEnv("claude"), timeoutMs: input.timeoutMs });
  const events = parseJsonLines(result.stdout);
  const finalMessage = extractClaudeFinalMessage(events);
  return {
    provider: "claude",
    sessionId: extractClaudeSessionId(events) ?? input.sessionId ?? null,
    rawOutput: finalMessage || result.stdout,
    status: result.code === 0 && !result.timedOut ? "completed" : "failed",
    resumed: Boolean(input.sessionId),
    resumeFailed: Boolean(input.sessionId) && (result.code !== 0 || result.timedOut),
    stderr: result.stderr,
    events
  };
}

function extractClaudeSessionId(events) {
  for (const event of events) {
    if (typeof event?.session_id === "string" && event.session_id) return event.session_id;
    if (typeof event?.sessionId === "string" && event.sessionId) return event.sessionId;
  }
  return null;
}

function extractClaudeFinalMessage(events) {
  let text = "";
  for (const event of events) {
    if (event.type === "result" && typeof event.result === "string") {
      text = event.result;
      continue;
    }
    const blockDelta = event.event?.delta;
    if (event.event?.type === "content_block_delta" && blockDelta?.type === "text_delta") {
      text += blockDelta.text ?? "";
      continue;
    }
    const delta = event.event?.delta;
    if (delta?.type === "text_delta" && typeof delta.text === "string") {
      text += delta.text;
    }
  }
  return text.trim();
}
