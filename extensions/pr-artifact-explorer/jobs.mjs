import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { LIMIT_KINDS } from "./limits.mjs";

const MAX_FINISHED_JOBS = 25;
const ACTIVE = new Set(["running"]);
const ALL_KINDS = Object.keys(LIMIT_KINDS);
const STREAM_KINDS = ["streamedEntryBytes"];

export class JobCancelled extends Error {
  constructor(message = "The job was cancelled.") {
    super(message);
    this.name = "JobCancelled";
  }
}

/**
 * Tracks long-running artifact jobs independently of any HTTP request or UI
 * view. Jobs only stop on explicit cancellation or a genuine fatal error;
 * soft-limit crossings surface as `prompts` in the snapshot and never pause work.
 */
export class JobRegistry {
  #jobs = new Map();
  #listeners = new Set();
  #policy;
  #idleTimer = null;
  #file;
  #loaded = null;
  #writing = null;
  #dirty = false;
  #sequence = 0;
  persistError = null;
  loadWarning = null;

  constructor(policy, { file = null } = {}) {
    this.#policy = policy;
    this.#file = file;
    policy.onChange(() => {
      for (const job of this.#jobs.values()) if (ACTIVE.has(job.status)) this.#emit(job);
    });
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  get(id) {
    return this.#jobs.get(id) ?? null;
  }

  findActive(key) {
    for (const job of this.#jobs.values()) {
      if (job.key === key && ACTIVE.has(job.status)) return job;
    }
    return null;
  }

  latestFor(key) {
    let found = null;
    for (const job of this.#jobs.values()) if (job.key === key) found = job;
    return found;
  }

  activeJobs() {
    return [...this.#jobs.values()].filter((job) => ACTIVE.has(job.status));
  }

  list() {
    return [...this.#jobs.values()].map((job) => this.snapshot(job));
  }

  /** Starts the runner, or returns the already-running job for the same key. */
  start(key, meta, runner) {
    const existing = this.findActive(key);
    if (existing) return existing;
    const previous = this.latestFor(key);
    const controller = new AbortController();
    const job = {
      id: randomUUID(),
      key,
      repository: meta.repository,
      artifactId: String(meta.artifactId),
      artifactName: meta.artifactName ?? `Artifact ${meta.artifactId}`,
      account: meta.account ?? null,
      attempt: (previous?.attempt ?? 0) + 1,
      status: "running",
      stage: "preparing",
      progress: null,
      live: {},
      lastActivityAt: Date.now(),
      error: null,
      result: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      controller,
      unregister: [],
      promise: null,
    };
    for (const kind of ALL_KINDS) {
      job.unregister.push(
        this.#policy.trackLive(job.id, kind, () => {
          if (kind === "idleSeconds") return this.#idleSeconds(job);
          return job.live[kind] ?? 0;
        }),
      );
    }
    this.#jobs.set(job.id, job);
    this.#trim();
    this.#schedulePersist();
    job.promise = (async () => {
      try {
        job.result = await runner(job);
        job.status = "succeeded";
        job.stage = "ready";
      } catch (error) {
        if (controller.signal.aborted) {
          job.status = "cancelled";
          job.error = "Cancelled.";
        } else {
          job.status = "failed";
          job.error = error instanceof Error ? error.message : String(error);
          job.stage = "error";
        }
        job.cause = error;
      } finally {
        job.finishedAt = new Date().toISOString();
        job.unregister.forEach((fn) => fn());
        job.unregister = [];
        this.#emit(job);
        this.#syncIdleTimer();
        this.#trim();
        this.#schedulePersist();
      }
      if (job.status !== "succeeded") throw job.cause;
      return job.result;
    })();
    job.promise.catch(() => {});
    this.#syncIdleTimer();
    this.#emit(job);
    return job;
  }

  /**
   * Tracks an in-flight decompression stream (content or static preview) so its
   * live size can cross a soft limit and prompt without ever stopping the stream.
   * Call `update(bytes)` per chunk and `finish(error?)` when the stream ends.
   */
  track(meta) {
    const controller = new AbortController();
    const job = {
      id: randomUUID(),
      kind: "stream",
      key: `stream:${randomUUID()}`,
      repository: meta.repository ?? null,
      artifactId: String(meta.artifactId ?? ""),
      artifactName: meta.name ?? "Streamed entry",
      attempt: 1,
      status: "running",
      stage: "decompressing",
      progress: null,
      live: {},
      lastActivityAt: Date.now(),
      error: null,
      result: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      controller,
      unregister: [],
      promise: null,
    };
    job.unregister.push(
      this.#policy.trackLive(job.id, "streamedEntryBytes", () => job.live.streamedEntryBytes ?? 0),
    );
    this.#jobs.set(job.id, job);
    this.#syncIdleTimer();
    this.#emit(job);
    let lastEmit = 0;
    return {
      job,
      signal: controller.signal,
      update: (bytes) => {
        job.live.streamedEntryBytes = bytes;
        job.lastActivityAt = Date.now();
        const now = Date.now();
        if (now - lastEmit >= 250) {
          lastEmit = now;
          this.#emit(job);
        }
      },
      finish: (error = null) => {
        if (!ACTIVE.has(job.status)) return;
        if (controller.signal.aborted) {
          job.status = "cancelled";
          job.error = "Cancelled.";
        } else if (error) {
          job.status = "failed";
          job.error = error instanceof Error ? error.message : String(error);
        } else {
          job.status = "succeeded";
        }
        job.finishedAt = new Date().toISOString();
        job.unregister.forEach((fn) => fn());
        job.unregister = [];
        this.#emit(job);
        this.#syncIdleTimer();
        // Finished streams are transient; only failures remain visible.
        if (job.status === "succeeded" || job.status === "cancelled") this.#jobs.delete(job.id);
        this.#trim();
      },
    };
  }

  /** Loads persisted, non-secret job history. Jobs that were running are honestly reported as interrupted. */
  load() {
    if (!this.#file) return Promise.resolve();
    this.#loaded ??= (async () => {
      let saved;
      try {
        saved = JSON.parse(await readFile(this.#file, "utf8"));
      } catch (error) {
        if (error?.code === "ENOENT") return;
        if (error instanceof SyntaxError) {
          this.loadWarning = `Saved job history at ${this.#file} is corrupt and was ignored (${error.message}).`;
          return;
        }
        throw error;
      }
      let changed = false;
      for (const entry of Array.isArray(saved?.jobs) ? saved.jobs : []) {
        if (!entry?.id || !entry.key || this.#jobs.has(entry.id)) continue;
        const wasRunning = entry.status === "running";
        this.#jobs.set(entry.id, {
          id: String(entry.id),
          key: String(entry.key),
          repository: entry.repository ?? null,
          artifactId: String(entry.artifactId ?? ""),
          artifactName: entry.artifactName ?? `Artifact ${entry.artifactId}`,
          account: entry.account ?? null,
          attempt: Number(entry.attempt) || 1,
          status: wasRunning ? "interrupted" : String(entry.status),
          stage: wasRunning ? "interrupted" : String(entry.stage ?? "error"),
          progress: entry.progress ?? null,
          live: {},
          lastActivityAt: Date.now(),
          error: wasRunning
            ? "Interrupted: the provider stopped before this job finished. Retry to download it again."
            : entry.error ?? null,
          startedAt: entry.startedAt ?? null,
          finishedAt: wasRunning ? new Date().toISOString() : entry.finishedAt ?? null,
          unregister: [],
          controller: null,
        });
        changed ||= wasRunning;
      }
      this.#trim();
      if (changed) this.#schedulePersist();
    })();
    return this.#loaded;
  }

  async flush() {
    while (this.#writing) await this.#writing;
  }

  #schedulePersist() {
    if (!this.#file) return;
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
    const jobs = [...this.#jobs.values()]
      .filter((job) => job.kind !== "stream")
      .map((job) => ({
        id: job.id,
        key: job.key,
        repository: job.repository,
        artifactId: job.artifactId,
        artifactName: job.artifactName,
        account: job.account ?? null,
        attempt: job.attempt,
        status: job.status,
        stage: job.stage,
        error: job.error,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        progress: job.progress,
      }));
    const temporary = `${this.#file}.${process.pid}.${++this.#sequence}.tmp`;
    await mkdir(dirname(this.#file), { recursive: true });
    try {
      await writeFile(temporary, `${JSON.stringify({ version: 1, jobs }, null, 2)}\n`, "utf8");
      await rename(temporary, this.#file);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
  }

  update(job, patch) {
    if (patch.live) Object.assign(job.live, patch.live);
    if (patch.stage) job.stage = patch.stage;
    if (patch.progress) job.progress = patch.progress;
    if (patch.artifactName) job.artifactName = patch.artifactName;
    if (patch.activity !== false) job.lastActivityAt = Date.now();
    this.#emit(job);
  }

  cancel(id, reason = "Cancelled by user.") {
    const job = this.#jobs.get(id);
    if (!job || !ACTIVE.has(job.status)) return false;
    job.controller.abort(new JobCancelled(reason));
    return true;
  }

  cancelAll(reason) {
    const active = this.activeJobs();
    for (const job of active) job.controller.abort(new JobCancelled(reason));
    return active;
  }

  #idleSeconds(job) {
    if (!ACTIVE.has(job.status)) return 0;
    return Math.floor((Date.now() - job.lastActivityAt) / 1000);
  }

  snapshot(job) {
    const prompts = [];
    if (ACTIVE.has(job.status)) {
      for (const kind of job.kind === "stream" ? STREAM_KINDS : ALL_KINDS) {
        const current = kind === "idleSeconds" ? this.#idleSeconds(job) : job.live[kind] ?? 0;
        const limit = this.#policy.get(kind);
        if (current > limit) {
          prompts.push({
            kind,
            label: LIMIT_KINDS[kind].label,
            unit: LIMIT_KINDS[kind].unit,
            current,
            limit,
            minimum: this.#policy.minimum(kind),
          });
        }
      }
    }
    return {
      id: job.id,
      kind: job.kind ?? "artifact",
      key: job.key,
      repository: job.repository,
      artifactId: job.artifactId,
      artifactName: job.artifactName,
      account: job.account ?? null,
      attempt: job.attempt,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      error: job.error,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      limits: this.#policy.snapshot(),
      prompts,
    };
  }

  #emit(job) {
    const snapshot = this.snapshot(job);
    for (const listener of this.#listeners) {
      try {
        listener(snapshot);
      } catch {
        // A faulty subscriber must not disturb job execution.
      }
    }
  }

  #trim() {
    const finished = [...this.#jobs.values()].filter((job) => !ACTIVE.has(job.status));
    for (const job of finished.slice(0, Math.max(0, finished.length - MAX_FINISHED_JOBS))) {
      this.#jobs.delete(job.id);
    }
  }

  // Idle time changes without any event, so active jobs are re-broadcast once a second.
  #syncIdleTimer() {
    const active = this.activeJobs().length > 0;
    if (active && !this.#idleTimer) {
      this.#idleTimer = setInterval(() => {
        for (const job of this.activeJobs()) this.#emit(job);
      }, 1_000);
      this.#idleTimer.unref?.();
    } else if (!active && this.#idleTimer) {
      clearInterval(this.#idleTimer);
      this.#idleTimer = null;
    }
  }
}
