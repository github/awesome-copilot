import {
  collectLastMessage,
  commandStatus,
  createTempOutputFile,
  isGitWorktree,
  parseJsonLines,
  providerChildEnv,
  spawnWithInput
} from "./shared.mjs";

export const codexProvider = {
  name: "codex",
  sessionKind: "threadId",
  check() {
      const version = commandStatus("codex", ["--version"], { provider: "codex" });
      const execHelp = commandStatus("codex", ["exec", "resume", "--help"], { provider: "codex" });
    return {
      provider: "codex",
      available: version.available && execHelp.available,
      version: version.stdout || version.stderr,
      auth: "unknown",
      resume: execHelp.available ? "supported" : "unsupported",
      output: "json",
      tools: "read-only",
      cwdIsolation: "configured",
      configIsolation: "unverified",
      sandbox: "configured",
      network: "unverified",
      promptTransport: "stdin",
      registryDefault: true,
      requiredFlagsOk: execHelp.available,
      smokeVerified: true
    };
  },
  async startSession(input) {
    const outFile = input.outputFile ?? createTempOutputFile("codex");
    const args = ["exec", "--json", "--sandbox", "read-only", "-C", input.cwd, "-o", outFile, "-"];
    if (!isGitWorktree(input.cwd)) args.splice(2, 0, "--skip-git-repo-check");
    if (input.model) args.splice(2, 0, "--model", input.model);
    const result = await spawnWithInput("codex", args, input.prompt, { cwd: input.cwd, env: providerChildEnv("codex"), timeoutMs: input.timeoutMs });
    const events = parseJsonLines(result.stdout);
    const status = result.code === 0 && !result.timedOut ? "completed" : "failed";
    return {
      provider: "codex",
      sessionId: extractCodexSessionId(events),
      rawOutput: status === "completed" ? collectLastMessage(outFile, result.stdout) : result.stdout,
      status,
      stderr: result.stderr,
      events
    };
  },
  async continueSession(input) {
    const outFile = input.outputFile ?? createTempOutputFile("codex");
    const args = ["exec", "resume", "--json", "-c", 'sandbox_mode="read-only"', "-o", outFile, input.sessionId, "-"];
    if (!isGitWorktree(input.cwd)) args.splice(3, 0, "--skip-git-repo-check");
    if (input.model) args.splice(3, 0, "--model", input.model);
    const result = await spawnWithInput("codex", args, input.prompt, { cwd: input.cwd, env: providerChildEnv("codex"), timeoutMs: input.timeoutMs });
    const events = parseJsonLines(result.stdout);
    const status = result.code === 0 && !result.timedOut ? "completed" : "failed";
    return {
      provider: "codex",
      sessionId: extractCodexSessionId(events) ?? input.sessionId,
      rawOutput: status === "completed" ? collectLastMessage(outFile, result.stdout) : result.stdout,
      resumed: true,
      resumeFailed: status !== "completed",
      status,
      stderr: result.stderr,
      events
    };
  }
};

function extractCodexSessionId(events) {
  for (const event of events) {
    if (typeof event?.thread_id === "string" && event.thread_id) return event.thread_id;
    if (typeof event?.threadId === "string" && event.threadId) return event.threadId;
    if (typeof event?.thread?.id === "string" && event.thread.id) return event.thread.id;
    if (typeof event?.data?.thread?.id === "string" && event.data.thread.id) return event.data.thread.id;
  }
  return null;
}
