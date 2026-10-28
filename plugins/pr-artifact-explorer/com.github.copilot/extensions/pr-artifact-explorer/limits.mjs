import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DATA_ROOT, DEFAULT_SOFT_LIMITS } from "./constants.mjs";

export const LIMIT_KINDS = Object.freeze({
  downloadBytes: { label: "Download size", unit: "bytes" },
  zipEntries: { label: "ZIP entries", unit: "count" },
  centralDirectoryBytes: { label: "ZIP directory size", unit: "bytes" },
  streamedEntryBytes: { label: "Decompressed file size", unit: "bytes" },
  idleSeconds: { label: "Idle warning", unit: "seconds" },
});

export const LIMITS_FILE = join(DATA_ROOT, "limits.json");

export class LimitError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "LimitError";
    this.code = details.code ?? "limit_rejected";
    Object.assign(this, details);
  }
}

function normalizeValue(kind, value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new LimitError(`${LIMIT_KINDS[kind].label} must be a positive number.`, {
      code: "invalid_limit",
      kind,
    });
  }
  return Math.ceil(number);
}

/**
 * Soft limits are warnings with a user-tunable threshold. They never stop work:
 * crossing one raises a prompt while the job keeps running, and a submitted
 * value is only accepted when it is at least the live value at that instant.
 */
export class LimitPolicy {
  #values = { ...DEFAULT_SOFT_LIMITS };
  #live = new Map();
  #file;
  #loaded = null;
  #listeners = new Set();
  #writing = null;
  #dirty = false;
  #sequence = 0;
  persistError = null;
  loadWarning = null;

  constructor(file = LIMITS_FILE) {
    this.#file = file;
  }

  load() {
    this.#loaded ??= (async () => {
      try {
        const saved = JSON.parse(await readFile(this.#file, "utf8"));
        for (const kind of Object.keys(LIMIT_KINDS)) {
          const value = Number(saved?.[kind]);
          if (Number.isFinite(value) && value > 0) this.#values[kind] = Math.ceil(value);
        }
      } catch (error) {
        if (error?.code === "ENOENT") return;
        if (error instanceof SyntaxError) {
          this.loadWarning = `Saved limits at ${this.#file} are corrupt and were ignored; defaults are in use (${error.message}).`;
          return;
        }
        throw error;
      }
    })();
    return this.#loaded;
  }

  get(kind) {
    return this.#values[kind];
  }

  snapshot() {
    return { ...this.#values };
  }

  onChange(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Registers a function that returns the live value for a kind; returns an unregister callback. */
  trackLive(owner, kind, read) {
    const key = `${owner}:${kind}`;
    this.#live.set(key, { kind, read });
    return () => this.#live.delete(key);
  }

  liveCurrent(kind) {
    let current = 0;
    for (const entry of this.#live.values()) {
      if (entry.kind === kind) current = Math.max(current, Number(entry.read()) || 0);
    }
    return current;
  }

  minimum(kind) {
    return Math.max(this.liveCurrent(kind), 1);
  }

  /** Synchronous so the live check and the write cannot interleave. */
  submit(kind, value) {
    if (!LIMIT_KINDS[kind]) {
      throw new LimitError(`Unknown limit: ${kind}.`, { code: "unknown_limit", kind });
    }
    const requested = normalizeValue(kind, value);
    const minimum = this.minimum(kind);
    if (requested < minimum) {
      throw new LimitError(
        `${LIMIT_KINDS[kind].label} must be at least the current value (${minimum.toLocaleString()}).`,
        { code: "below_current", kind, minimum, requested },
      );
    }
    this.#values[kind] = requested;
    for (const listener of this.#listeners) listener(kind, requested);
    this.#schedulePersist();
    return { kind, limit: requested, minimum };
  }

  /** Resolves once every submitted value has been written (or failed; see persistError). */
  async flush() {
    while (this.#writing) await this.#writing;
  }

  // Writes are serialized; each write snapshots the latest values, so the last submit wins.
  #schedulePersist() {
    this.#dirty = true;
    if (this.#writing) return;
    this.#writing = (async () => {
      try {
        while (this.#dirty) {
          this.#dirty = false;
          try {
            await this.#persist();
            this.persistError = null;
          } catch (error) {
            this.persistError = error instanceof Error ? error.message : String(error);
          }
        }
      } finally {
        this.#writing = null;
      }
    })();
  }

  async #persist() {
    const temporary = `${this.#file}.${process.pid}.${++this.#sequence}.tmp`;
    await mkdir(dirname(this.#file), { recursive: true });
    try {
      await writeFile(temporary, `${JSON.stringify(this.#values, null, 2)}\n`, "utf8");
      await rename(temporary, this.#file);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
  }
}

export const limitPolicy = new LimitPolicy();
