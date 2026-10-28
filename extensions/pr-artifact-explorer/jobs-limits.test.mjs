import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { JobRegistry } from "./jobs.mjs";
import { LimitError, LimitPolicy } from "./limits.mjs";

async function policy() {
  const dir = await mkdtemp(join(tmpdir(), "limits-"));
  return { dir, policy: new LimitPolicy(join(dir, "limits.json")) };
}

async function cleanup(dir, p) {
  try {
    await p.flush();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("crossing a soft limit prompts but never stops the job", async () => {
  const { dir, policy: p } = await policy();
  try {
    const registry = new JobRegistry(p);
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    const job = registry.start("k", { repository: "o/r", artifactId: 1 }, async (j) => {
      registry.update(j, { live: { downloadBytes: p.get("downloadBytes") + 1 } });
      await gate;
      return "done";
    });
    await tick();
    const snap = registry.snapshot(job);
    assert.equal(snap.status, "running");
    assert.equal(snap.prompts.length, 1);
    assert.equal(snap.prompts[0].kind, "downloadBytes");
    release();
    assert.equal(await job.promise, "done");
  } finally {
    await cleanup(dir, p);
  }
});

test("submitted limits are checked against live progress atomically", async () => {
  const { dir, policy: p } = await policy();
  try {
    const registry = new JobRegistry(p);
    let live = 100;
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    const job = registry.start("k", { repository: "o/r", artifactId: 2 }, async (j) => {
      registry.update(j, { live: { zipEntries: live } });
      await gate;
    });
    await tick();
    assert.throws(
      () => p.submit("zipEntries", 50),
      (error) => error instanceof LimitError && error.code === "below_current" && error.minimum === 100,
    );
    // Progress advances after the prompt: the new minimum is the live value at submit time.
    live = 5000;
    registry.update(job, { live: { zipEntries: live } });
    assert.throws(() => p.submit("zipEntries", 4999), /at least the current value/);
    assert.equal(p.submit("zipEntries", 5000).limit, 5000);
    assert.equal(registry.snapshot(job).prompts.length, 0);
    assert.throws(() => p.submit("zipEntries", 0), (e) => e.code === "invalid_limit");
    assert.throws(() => p.submit("nope", 5), (e) => e.code === "unknown_limit");
    release();
    await job.promise;
  } finally {
    await cleanup(dir, p);
  }
});

test("jobs are idempotent per key, cancellable, and retry increments the attempt", async () => {
  const { dir, policy: p } = await policy();
  try {
    const registry = new JobRegistry(p);
    const first = registry.start("k", { repository: "o/r", artifactId: 3 }, (j) =>
      new Promise((_, reject) => j.controller.signal.addEventListener("abort", () => reject(j.controller.signal.reason))),
    );
    const again = registry.start("k", { repository: "o/r", artifactId: 3 }, async () => "x");
    assert.equal(first, again);
    assert.equal(registry.cancel(first.id), true);
    await assert.rejects(first.promise);
    assert.equal(registry.snapshot(first).status, "cancelled");
    const retry = registry.start("k", { repository: "o/r", artifactId: 3 }, async () => "ok");
    assert.equal(retry.attempt, 2);
    assert.equal(await retry.promise, "ok");
  } finally {
    await cleanup(dir, p);
  }
});

test("a failed job reports the error without being treated as cancelled", async () => {
  const { dir, policy: p } = await policy();
  try {
    const registry = new JobRegistry(p);
    const job = registry.start("k", { repository: "o/r", artifactId: 4 }, async () => {
      throw new Error("boom");
    });
    await assert.rejects(job.promise, /boom/);
    const snap = registry.snapshot(job);
    assert.equal(snap.status, "failed");
    assert.equal(snap.error, "boom");
  } finally {
    await cleanup(dir, p);
  }
});

test("finished jobs are capped at completion and active jobs are never trimmed", async () => {
  const { dir, policy: p } = await policy();
  try {
    const registry = new JobRegistry(p);
    let release;
    const active = registry.start("active", { repository: "o/r", artifactId: 1 }, () => new Promise((r) => (release = r)));
    for (let i = 0; i < 40; i++) {
      const job = registry.start(`k${i}`, { repository: "o/r", artifactId: 100 + i }, async () => {
        if (i % 2) throw new Error("fail");
        return "ok";
      });
      await job.promise.catch(() => {});
    }
    const jobs = registry.list();
    assert.ok(jobs.filter((j) => j.status !== "running").length <= 25);
    assert.ok(jobs.some((j) => j.id === active.id));
    release("done");
    await active.promise;
  } finally {
    await cleanup(dir, p);
  }
});

test("limits persist across policy instances", async () => {
  const { dir, policy: p } = await policy();
  try {
    p.submit("downloadBytes", 123456789);
    await p.flush();
    const next = new LimitPolicy(join(dir, "limits.json"));
    await next.load();
    assert.equal(next.get("downloadBytes"), 123456789);
  } finally {
    await cleanup(dir, p);
  }
});
