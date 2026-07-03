import { randomUUID } from "node:crypto";

import {
  commandStatus,
  parseJsonLines,
  providerChildEnv,
  spawnWithInput
} from "./shared.mjs";

const REQUIRED_FLAGS = [
  "--print",
  "--output-format",
  "--resume",
  "--session-id",
  "--cwd",
  "--tools",
  "--mcp-config",
  "--strict-mcp-config"
];

const EMPTY_MCP_CONFIG = '{"mcpServers":{}}';
const SMOKE_VERIFIED = false;

export const qoderProvider = {
  name: "qoder",
  sessionKind: "sessionId",
  registryDefault: false,
  check() {
    const version = commandStatus("qodercli", ["--version"], { provider: "qoder" });
    const help = commandStatus("qodercli", ["--help"], { provider: "qoder" });
    const status = commandStatus("qodercli", ["status"], { provider: "qoder" });
    const helpText = `${help.stdout}\n${help.stderr}`;
    const missingFlags = REQUIRED_FLAGS.filter((flag) => !helpText.includes(flag));
    const auth = qoderAuthStatus(status);
    const hasMcpIsolation = helpText.includes("--mcp-config") && helpText.includes("--strict-mcp-config");
    return {
      provider: "qoder",
      available: version.available && help.available && missingFlags.length === 0 && auth === "ok" && SMOKE_VERIFIED,
      version: version.stdout || version.stderr,
      auth,
      resume: SMOKE_VERIFIED && helpText.includes("--resume") && helpText.includes("--session-id") ? "supported" : "unverified",
      output: helpText.includes("--output-format") ? "stream-json" : "unverified",
      tools: helpText.includes("--tools") ? 'configured: --tools "" will be passed' : "unverified",
      cwdIsolation: helpText.includes("--cwd") ? "configured" : "unverified",
      configIsolation: hasMcpIsolation ? "configured" : "unverified",
      sandbox: "unsupported",
      network: "unverified",
      promptTransport: "stdin",
      registryDefault: false,
      requiredFlagsOk: missingFlags.length === 0,
      smokeVerified: SMOKE_VERIFIED,
      notes: [
        ...(missingFlags.length ? [`missing required flag(s): ${missingFlags.join(", ")}`] : []),
        ...(auth === "ok" ? [] : [`auth gate not satisfied: ${auth}`]),
        "experimental: blocked until current-version smoke tests verify resume, prompt transport, tool disablement, and config isolation"
      ]
    };
  },
  async startSession(input) {
    const sessionId = input.generatedSessionId ?? randomUUID();
    return runQoder({ ...input, sessionId, starting: true });
  },
  async continueSession(input) {
    return runQoder({ ...input, starting: false });
  }
};

function qoderAuthStatus(status) {
  const text = `${status.stdout}\n${status.stderr}`;
  if (!status.available) return "failed";
  if (/not logged in|sign in|log in|unauthori[sz]ed/i.test(text)) return "missing";
  if (/account:\s*(?!not logged in).+/i.test(text)) return "ok";
  return "unknown";
}

async function runQoder(input) {
  const args = [
    "-p",
    "--output-format",
    "stream-json",
    "--cwd",
    input.cwd,
    "--tools",
    "",
    "--mcp-config",
    EMPTY_MCP_CONFIG,
    "--strict-mcp-config"
  ];
  if (input.model) args.push("--model", input.model);
  if (input.starting) {
    args.push("--session-id", input.sessionId);
  } else {
    args.push("--resume", input.sessionId);
  }

  const result = await spawnWithInput("qodercli", args, input.prompt, { cwd: input.cwd, env: providerChildEnv("qoder"), timeoutMs: input.timeoutMs });
  const events = parseJsonLines(result.stdout);
  const finalMessage = extractQoderFinalMessage(events);
  const cliError = hasQoderError(events);
  const unparsedOutput = events.some((event) => event?.type === "unparsed");
  const hasModelOutput = finalMessage.trim() !== "";
  const status = result.code === 0 && !result.timedOut && !cliError && !unparsedOutput && hasModelOutput ? "completed" : "failed";
  const stderr = [
    result.stderr,
    unparsedOutput ? "Qoder returned non-JSON output; failing closed." : "",
    hasModelOutput ? "" : "Qoder returned no parseable model output."
  ].filter(Boolean).join("\n");
  return {
    provider: "qoder",
    sessionId: extractQoderSessionId(events, input.sessionId),
    rawOutput: finalMessage,
    status,
    resumed: !input.starting,
    resumeFailed: !input.starting && status !== "completed",
    stderr,
    events
  };
}

function extractQoderSessionId(events, expectedSessionId) {
  for (const event of events) {
    const candidate = typeof event?.session_id === "string" && event.session_id
      ? event.session_id
      : typeof event?.sessionId === "string" && event.sessionId
        ? event.sessionId
        : null;
    if (candidate && candidate === expectedSessionId) return candidate;
  }
  return null;
}

function extractQoderFinalMessage(events) {
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
  }
  return text.trim();
}

function hasQoderError(events) {
  return events.some((event) => event?.is_error === true || event?.error != null);
}
