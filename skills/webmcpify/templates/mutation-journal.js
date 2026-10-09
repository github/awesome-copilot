/*!
 * webmcpify durable mutation journal helper
 *
 * MIT License
 * Copyright (c) 2026 Jonas Tüchler
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readFile, realpath, rename, rm, stat } from "node:fs/promises";
import { hostname } from "node:os";
import { basename, dirname, join } from "node:path";
const LOCK_CANDIDATES = [
  {
    command: "flock",
    // fd 3 is inherited from the already verified parent handle. This prevents
    // a pathname swap between validation and advisory-lock acquisition. flock's
    // descriptor lock belongs to the shared open-file description, so it stays
    // held by this runner after the short acquisition subprocess exits.
    args: () => ["--exclusive", "3"],
    probeArgs: () => ["--exclusive", "--nonblock", "3"],
    busyExitCode: 1
  },
  {
    command: "lockf",
    // macOS/FreeBSD lockf's descriptor form uses BSD flock(2) locking and
    // implies -k, so it neither opens by pathname nor removes the sidecar.
    args: () => ["-s", "3"],
    probeArgs: () => ["-s", "-t", "0", "3"],
    busyExitCode: 75
  }
];
function requireText(value, label) {
  if (!value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value;
}
function canonicalJson(value) {
  const json = JSON.stringify(value);
  if (json === void 0) throw new Error("mutation arguments must be JSON-serializable");
  const parsed = JSON.parse(json);
  const serialize = (item) => {
    if (Array.isArray(item)) return `[${item.map(serialize).join(",")}]`;
    if (item && typeof item === "object") {
      return `{${Object.keys(item).sort((left, right) => left < right ? -1 : left > right ? 1 : 0).map((key) => `${JSON.stringify(key)}:${serialize(item[key])}`).join(",")}}`;
    }
    return JSON.stringify(item);
  };
  return serialize(parsed);
}
function fingerprintArguments(value) {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}
async function syncDirectory(path, step) {
  const handle = await step(() => open(path, "r"));
  try {
    await step(() => handle.sync());
  } finally {
    await handle.close();
  }
}
async function durableReplace(manifestPath, manifest, step) {
  const directory = dirname(manifestPath);
  const temporary = join(directory, `.${basename(manifestPath)}.${process.pid}.${randomUUID()}.tmp`);
  const mode = (await step(() => stat(manifestPath))).mode & 511;
  let handle;
  try {
    handle = await step(() => open(temporary, "wx", mode));
    await step(() => handle.writeFile(`${JSON.stringify(manifest, null, 2)}
`, "utf8"));
    await step(() => handle.sync());
    await step(() => handle.close());
    handle = void 0;
    await step(() => rename(temporary, manifestPath));
    await syncDirectory(directory, step);
  } catch (error) {
    await handle?.close().catch(() => void 0);
    await rm(temporary, { force: true }).catch(() => void 0);
    throw error;
  }
}
async function readManifest(manifestPath) {
  const value = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(value.tools)) throw new Error(`manifest has no tools array: ${manifestPath}`);
  return value;
}
function unresolvedEntries(manifest) {
  validateJournals(manifest);
  return manifest.tools.flatMap((tool) => tool.mutationExecutions.filter((entry) => entry.state === "started"));
}
function validateJournals(manifest) {
  const toolIds = /* @__PURE__ */ new Set();
  const executions = /* @__PURE__ */ new Map();
  for (const [toolIndex, tool] of manifest.tools.entries()) {
    if (!tool || typeof tool !== "object" || Array.isArray(tool)) {
      throw new Error(`manifest tool ${toolIndex} must be an object`);
    }
    const toolId = requireText(typeof tool.id === "string" ? tool.id : "", `manifest tool ${toolIndex} id`);
    if (toolIds.has(toolId)) throw new Error(`duplicate manifest tool id: ${toolId}`);
    toolIds.add(toolId);
    if (!Array.isArray(tool.mutationExecutions)) {
      throw new Error(`mutationExecutions must be an array for manifest tool: ${toolId}`);
    }
    for (const [entryIndex, candidate] of tool.mutationExecutions.entries()) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        throw new Error(`mutation execution ${toolId}[${entryIndex}] must be an object`);
      }
      const entry = candidate;
      const label = `mutation execution ${toolId}[${entryIndex}]`;
      requireText(typeof entry.executionId === "string" ? entry.executionId : "", `${label} executionId`);
      requireText(typeof entry.tool === "string" ? entry.tool : "", `${label} tool`);
      if (!Number.isInteger(entry.contractRevision) || entry.contractRevision < 1) {
        throw new Error(`${label} contractRevision must be a positive integer`);
      }
      for (const field of ["origin", "role", "fixtureRevision", "argumentsFingerprint", "startedAt", "evidence"]) {
        requireText(typeof entry[field] === "string" ? entry[field] : "", `${label} ${field}`);
      }
      if (entry.state !== "started" && entry.state !== "reconciled") {
        throw new Error(`${label} has unknown state: ${String(entry.state)}`);
      }
      if (entry.parentExecutionId !== void 0) {
        requireText(typeof entry.parentExecutionId === "string" ? entry.parentExecutionId : "", `${label} parentExecutionId`);
      }
      if (entry.state === "reconciled") {
        requireText(typeof entry.outcome === "string" ? entry.outcome : "", `${label} outcome`);
        requireText(typeof entry.reconciledAt === "string" ? entry.reconciledAt : "", `${label} reconciledAt`);
      }
      if (executions.has(entry.executionId)) {
        throw new Error(`duplicate mutation executionId: ${entry.executionId}`);
      }
      executions.set(entry.executionId, { entry, owner: tool });
    }
  }
  for (const { entry, owner } of executions.values()) {
    if (!entry.parentExecutionId) continue;
    const parent = executions.get(entry.parentExecutionId);
    if (!parent || parent.owner !== owner || parent.entry.parentExecutionId) {
      throw new Error(`invalid parentExecutionId for mutation execution: ${entry.executionId}`);
    }
  }
}
async function migrateManifest(manifestPath, manifest, lockIdentity, step) {
  let changed = false;
  if (!Object.hasOwn(manifest, "mutationLockIdentity")) {
    manifest.mutationLockIdentity = lockIdentity;
    changed = true;
  } else if (manifest.mutationLockIdentity !== lockIdentity) {
    throw new Error("manifest mutationLockIdentity does not match the locked sidecar");
  }
  for (const [toolIndex, tool] of manifest.tools.entries()) {
    if (!tool || typeof tool !== "object" || Array.isArray(tool)) {
      throw new Error(`manifest tool ${toolIndex} must be an object`);
    }
    if (!Object.hasOwn(tool, "mutationExecutions")) {
      tool.mutationExecutions = [];
      tool.verifiedAgainst = null;
      if (tool.status === "verified") tool.status = "integrated";
      changed = true;
    }
  }
  validateJournals(manifest);
  if (changed) await durableReplace(manifestPath, manifest, step);
  return manifest;
}
async function writeOwnerMetadata(handle, metadata, step) {
  const serialized = `${JSON.stringify(metadata)}
`;
  await step(() => handle.truncate(0));
  await step(() => handle.write(serialized, 0, "utf8").then(() => void 0));
  await step(() => handle.sync());
}
async function readOwnerMetadata(handle, step) {
  const size = (await step(() => handle.stat())).size;
  if (size === 0) return {};
  const buffer = Buffer.alloc(size);
  const { bytesRead } = await step(() => handle.read(buffer, 0, size, 0));
  let value;
  try {
    value = JSON.parse(buffer.subarray(0, bytesRead).toString("utf8"));
  } catch {
    throw new Error("manifest.lock contains malformed owner metadata");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("manifest.lock owner metadata must be an object");
  }
  return value;
}
async function openLockFile(lockPath) {
  const handle = await open(lockPath, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 384);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.nlink !== 1) {
      throw new Error("manifest.lock must be a regular file with exactly one link");
    }
    const pathInfo = await lstat(lockPath);
    if (!pathInfo.isFile() || pathInfo.isSymbolicLink() || pathInfo.nlink !== 1 || pathInfo.dev !== info.dev || pathInfo.ino !== info.ino) {
      throw new Error("manifest.lock identity changed while opening");
    }
    return { handle, identity: { dev: info.dev, ino: info.ino } };
  } catch (error) {
    await handle.close().catch(() => void 0);
    throw error;
  }
}
async function runLockCommand(candidate, args, lockHandle, lockPath, timeoutMs) {
  const child = spawn(candidate.command, args, {
    detached: true,
    stdio: ["ignore", "ignore", "pipe", lockHandle.fd]
  });
  let stderr = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk) => {
    stderr += chunk;
  });
  const exit = waitForChildExit(child);
  let timer;
  const timedOut = Symbol("timed-out");
  const result = await (timeoutMs === void 0 ? exit : Promise.race([
    exit,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(timedOut), timeoutMs);
    })
  ]));
  if (timer) clearTimeout(timer);
  if (result === timedOut) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    await exit.catch(() => void 0);
    throw new Error(`timed out after ${timeoutMs}ms waiting for ${lockPath}`);
  }
  return { ...result, stderr };
}
async function verifyLockHeld(candidate, lockPath, identity) {
  const probe = await openLockFile(lockPath);
  try {
    if (probe.identity.dev !== identity.dev || probe.identity.ino !== identity.ino) {
      throw new Error("manifest.lock identity changed after lock acquisition");
    }
    const result = await runLockCommand(candidate, candidate.probeArgs(), probe.handle, lockPath);
    if (result.code !== candidate.busyExitCode) {
      throw new Error(
        `${candidate.command} descriptor lock did not remain held by the runner (${result.code ?? result.signal ?? "unknown"}): ${result.stderr.trim()}`
      );
    }
  } finally {
    await probe.handle.close().catch(() => void 0);
  }
}
async function acquireLock(lockHandle, lockPath, lockIdentity, timeoutMs) {
  const unavailable = [];
  for (const candidate of LOCK_CANDIDATES) {
    try {
      const result = await runLockCommand(candidate, candidate.args(), lockHandle, lockPath, timeoutMs);
      if (result.code !== 0) {
        throw new Error(
          `${candidate.command} exited before lock acquisition (${result.code ?? result.signal ?? "unknown"}): ${result.stderr.trim()}`
        );
      }
      await verifyLockHeld(candidate, lockPath, lockIdentity);
      return candidate;
    } catch (error) {
      if (error.code === "ENOENT") {
        unavailable.push(candidate.command);
        continue;
      }
      throw error;
    }
  }
  throw new Error(
    `mutation verification is not available: no supported advisory-lock command (${unavailable.join(", ")})`
  );
}
function waitForChildExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      child.off("error", onError);
      child.off("exit", onExit);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onExit = (code, signal) => {
      cleanup();
      resolve({ code, signal });
    };
    child.once("error", onError);
    child.once("exit", onExit);
    if (child.exitCode !== null || child.signalCode !== null) {
      onExit(child.exitCode, child.signalCode);
    }
  });
}
class MutationJournal {
  manifestPath;
  lockPath;
  ownerToken;
  lockBackend;
  #lockHandle;
  #lockIdentity;
  #stableLockIdentity = "";
  #closed = false;
  #unresolved;
  constructor(manifestPath, lockPath, ownerToken, lockHandle, lockIdentity, lockBackend, unresolved) {
    this.manifestPath = manifestPath;
    this.lockPath = lockPath;
    this.ownerToken = ownerToken;
    this.lockBackend = lockBackend;
    this.#lockHandle = lockHandle;
    this.#lockIdentity = lockIdentity;
    this.#unresolved = unresolved;
  }
  static async open(options) {
    const manifestPath = await realpath(options.manifestPath);
    const manifestDirectory = dirname(manifestPath);
    const lockPath = join(manifestDirectory, "manifest.lock");
    const { handle: lockHandle, identity: lockIdentity } = await openLockFile(lockPath);
    let journal;
    const ownerToken = randomUUID();
    try {
      const candidate = await acquireLock(lockHandle, lockPath, lockIdentity, options.timeoutMs);
      journal = new MutationJournal(
        manifestPath,
        lockPath,
        ownerToken,
        lockHandle,
        lockIdentity,
        candidate.command,
        []
      );
      const manifest = await journal.#ownedStep(() => readManifest(manifestPath));
      const ownerMetadata = await readOwnerMetadata(lockHandle, journal.#ownedStep);
      const manifestIdentity = manifest.mutationLockIdentity;
      const sidecarIdentity = ownerMetadata.lockIdentity;
      if (manifestIdentity !== void 0 && (typeof manifestIdentity !== "string" || !manifestIdentity.trim())) {
        throw new Error("manifest mutationLockIdentity must be a non-empty string");
      }
      if (sidecarIdentity !== void 0 && (typeof sidecarIdentity !== "string" || !sidecarIdentity.trim())) {
        throw new Error("manifest.lock lockIdentity must be a non-empty string");
      }
      if (manifestIdentity && !sidecarIdentity) {
        throw new Error("manifest.lock lost its stable identity; refusing a replacement sidecar");
      }
      if (manifestIdentity && sidecarIdentity && manifestIdentity !== sidecarIdentity) {
        throw new Error("manifest.lock stable identity does not match the manifest");
      }
      journal.#stableLockIdentity = manifestIdentity ?? sidecarIdentity ?? randomUUID();
      await writeOwnerMetadata(lockHandle, {
        lockIdentity: journal.#stableLockIdentity,
        ownerToken,
        host: hostname(),
        pid: process.pid,
        lockBackend: candidate.command,
        processStartedAt: new Date(Date.now() - process.uptime() * 1e3).toISOString(),
        acquiredAt: (/* @__PURE__ */ new Date()).toISOString()
      }, journal.#ownedStep);
      const migrated = await migrateManifest(
        manifestPath,
        manifest,
        journal.#stableLockIdentity,
        journal.#ownedStep
      );
      journal.#unresolved = unresolvedEntries(migrated);
      await journal.#checkOwnership();
      return journal;
    } catch (error) {
      if (journal) await journal.#releaseLock().catch(() => void 0);
      else await lockHandle.close().catch(() => void 0);
      throw error;
    }
  }
  get unresolved() {
    return structuredClone(this.#unresolved);
  }
  async beforeDispatch(input) {
    await this.#checkOwnership();
    requireText(input.tool, "tool");
    requireText(input.origin, "origin");
    requireText(input.role, "role");
    requireText(input.fixtureRevision, "fixtureRevision");
    requireText(input.evidence, "evidence");
    if (!Number.isInteger(input.contractRevision) || input.contractRevision < 1) {
      throw new Error("contractRevision must be a positive integer");
    }
    const manifest = await this.#ownedStep(() => readManifest(this.manifestPath));
    validateJournals(manifest);
    const unresolved = unresolvedEntries(manifest);
    const manifestTool = input.manifestTool ?? input.tool;
    const owner = manifest.tools.find((tool) => tool.id === manifestTool);
    if (!owner || !Array.isArray(owner.mutationExecutions)) {
      throw new Error(`manifest tool has no mutation journal: ${manifestTool}`);
    }
    if (input.parentExecutionId) {
      const parent = unresolved.find((entry) => entry.executionId === input.parentExecutionId);
      const parentOwner = manifest.tools.find(
        (tool) => tool.mutationExecutions?.some((entry) => entry.executionId === input.parentExecutionId)
      );
      const unrelated = unresolved.filter((entry) => entry.executionId !== input.parentExecutionId);
      if (!parent || parentOwner !== owner || unrelated.length > 0) {
        throw new Error("cleanup dispatch is allowed only for its sole unresolved parent execution");
      }
    } else if (unresolved.length > 0) {
      throw new Error(`mutation dispatch blocked by ${unresolved.length} unresolved execution(s)`);
    }
    const execution = {
      executionId: randomUUID(),
      tool: input.tool,
      contractRevision: input.contractRevision,
      origin: input.origin,
      role: input.role,
      fixtureRevision: input.fixtureRevision,
      argumentsFingerprint: fingerprintArguments(input.arguments),
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      state: "started",
      evidence: input.evidence,
      ...input.parentExecutionId ? { parentExecutionId: input.parentExecutionId } : {}
    };
    owner.mutationExecutions.push(execution);
    await durableReplace(this.manifestPath, manifest, this.#ownedStep);
    const stored = await this.#ownedStep(() => readManifest(this.manifestPath));
    validateJournals(stored);
    const persisted = stored.tools.find((tool) => tool.id === manifestTool)?.mutationExecutions?.find((entry) => entry.executionId === execution.executionId);
    if (!persisted || JSON.stringify(persisted) !== JSON.stringify(execution)) {
      throw new Error(`pre-dispatch journal entry was not durably persisted: ${execution.executionId}`);
    }
    this.#unresolved = unresolvedEntries(stored);
    await this.#checkOwnership();
    return structuredClone(execution);
  }
  async settle(executionId, input) {
    await this.#checkOwnership();
    requireText(executionId, "executionId");
    requireText(input.outcome, "outcome");
    requireText(input.evidence, "evidence");
    const manifest = await this.#ownedStep(() => readManifest(this.manifestPath));
    validateJournals(manifest);
    const owner = manifest.tools.find(
      (tool) => tool.mutationExecutions?.some((entry) => entry.executionId === executionId)
    );
    const execution = owner?.mutationExecutions?.find((entry) => entry.executionId === executionId);
    if (!execution) throw new Error(`mutation execution not found: ${executionId}`);
    if (execution.state !== "started") throw new Error(`mutation execution is already ${execution.state}: ${executionId}`);
    if (!execution.parentExecutionId) {
      const unresolvedCleanup = owner?.mutationExecutions?.find(
        (entry) => entry.parentExecutionId === executionId && entry.state === "started"
      );
      if (unresolvedCleanup) {
        throw new Error(`mutation execution has unresolved cleanup: ${unresolvedCleanup.executionId}`);
      }
    }
    execution.state = "reconciled";
    execution.outcome = input.outcome;
    execution.reconciledAt = input.reconciledAt ?? (/* @__PURE__ */ new Date()).toISOString();
    execution.evidence = input.evidence;
    await durableReplace(this.manifestPath, manifest, this.#ownedStep);
    const stored = await this.#ownedStep(() => readManifest(this.manifestPath));
    validateJournals(stored);
    this.#unresolved = unresolvedEntries(stored);
    await this.#checkOwnership();
    return structuredClone(execution);
  }
  async close() {
    if (this.#closed) return;
    let failure;
    try {
      if (!failure) {
        await syncDirectory(dirname(this.manifestPath), this.#ownedStep);
        await writeOwnerMetadata(this.#lockHandle, {
          lockIdentity: this.#stableLockIdentity,
          ownerToken: this.ownerToken,
          host: hostname(),
          pid: process.pid,
          releasedAt: (/* @__PURE__ */ new Date()).toISOString()
        }, this.#ownedStep);
      }
    } catch (error) {
      failure = error;
    }
    try {
      await this.#releaseLock();
    } catch (error) {
      failure ??= error;
    }
    if (failure) throw failure;
  }
  #ownedStep = async (operation) => {
    await this.#checkOwnership();
    const result = await operation();
    await this.#checkOwnership();
    return result;
  };
  async #checkOwnership() {
    if (this.#closed || !this.#lockHandle) {
      throw new Error("mutation journal is closed");
    }
    const [handleInfo, pathInfo] = await Promise.all([
      this.#lockHandle.stat(),
      lstat(this.lockPath)
    ]);
    if (!handleInfo.isFile() || handleInfo.nlink !== 1 || !pathInfo.isFile() || pathInfo.isSymbolicLink() || pathInfo.nlink !== 1 || handleInfo.dev !== this.#lockIdentity.dev || handleInfo.ino !== this.#lockIdentity.ino || pathInfo.dev !== this.#lockIdentity.dev || pathInfo.ino !== this.#lockIdentity.ino) {
      throw new Error("mutation journal lock identity changed");
    }
  }
  async #releaseLock() {
    if (this.#closed) return;
    const lockHandle = this.#lockHandle;
    this.#lockHandle = void 0;
    let failure;
    await lockHandle?.close().catch((error) => {
      failure ??= error;
    });
    this.#closed = true;
    if (failure) throw failure;
  }
}
async function openMutationJournal(options) {
  return MutationJournal.open(options);
}
async function withMutationJournal(options, callback) {
  const journal = await openMutationJournal(options);
  try {
    return await callback(journal);
  } finally {
    await journal.close();
  }
}
export {
  MutationJournal,
  fingerprintArguments,
  openMutationJournal,
  withMutationJournal
};
