import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ThrottledError, parseRetryAfterSeconds, spFetch } from "./spfetch.mjs";

/** Servidor local: cada ruta responde segun un guion (lista de {status, headers}). */
let server;
let base;
const scripts = new Map();
const hits = new Map();

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = req.url ?? "/";
    hits.set(path, (hits.get(path) ?? 0) + 1);
    const steps = scripts.get(path) ?? [{ status: 404 }];
    const step = steps[Math.min(hits.get(path) - 1, steps.length - 1)];
    res.writeHead(step.status, step.headers ?? {});
    res.end(step.body ?? "");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((r) => server.close(r)));

const script = (path, ...steps) => {
  scripts.set(path, steps);
  hits.set(path, 0);
};
const recorder = () => {
  const waits = [];
  return { waits, sleep: async (ms) => void waits.push(ms) };
};

describe("spFetch (servidor http local)", () => {
  it("dos 429 con Retry-After y luego 200: devuelve 200 al 3er intento", async () => {
    script("/a", { status: 429, headers: { "Retry-After": "1" } }, { status: 429, headers: { "Retry-After": "1" } }, { status: 200, body: "ok" });
    const { waits, sleep } = recorder();
    const res = await spFetch(`${base}/a`, {}, { sleep });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect(hits.get("/a")).toBe(3);
    expect(waits).toEqual([1000, 1000]); // respeta Retry-After
  });

  it("503 tambien se reintenta", async () => {
    script("/b", { status: 503, headers: { "Retry-After": "0" } }, { status: 200 });
    const { sleep } = recorder();
    const res = await spFetch(`${base}/b`, {}, { sleep });
    expect(res.status).toBe(200);
    expect(hits.get("/b")).toBe(2);
  });

  it("throttling permanente: lanza ThrottledError tras maxAttempts", async () => {
    script("/c", { status: 429, headers: { "Retry-After": "0" } });
    const { waits, sleep } = recorder();
    const err = await spFetch(`${base}/c`, {}, { maxAttempts: 3, sleep }).catch((e) => e);
    expect(err).toBeInstanceOf(ThrottledError);
    expect(err.attempts).toBe(3);
    expect(err.status).toBe(429);
    expect(hits.get("/c")).toBe(3);
    expect(waits).toHaveLength(2); // no duerme despues del ultimo intento
  });

  it("sin Retry-After usa espera lineal de respaldo", async () => {
    script("/d", { status: 429 }, { status: 429 }, { status: 200 });
    const { waits, sleep } = recorder();
    await spFetch(`${base}/d`, {}, { sleep, fallbackWaitSeconds: 5 });
    expect(waits).toEqual([5000, 10000]);
  });

  it("otros status (404, 500) se devuelven sin reintentar", async () => {
    script("/e", { status: 404 });
    script("/f", { status: 500 });
    const { waits, sleep } = recorder();
    expect((await spFetch(`${base}/e`, {}, { sleep })).status).toBe(404);
    expect((await spFetch(`${base}/f`, {}, { sleep })).status).toBe(500);
    expect(hits.get("/e")).toBe(1);
    expect(hits.get("/f")).toBe(1);
    expect(waits).toEqual([]);
  });

  it("maxWaitSeconds acota una espera enorme", async () => {
    script("/g", { status: 429, headers: { "Retry-After": "9999" } }, { status: 200 });
    const { waits, sleep } = recorder();
    await spFetch(`${base}/g`, {}, { sleep, maxWaitSeconds: 10 });
    expect(waits).toEqual([10_000]);
  });

  it("maxAttempts invalido -> RangeError", async () => {
    await expect(spFetch(`${base}/a`, {}, { maxAttempts: 0 })).rejects.toBeInstanceOf(RangeError);
  });

  it("con espera real de 1 s respeta el Retry-After (integracion, sin sleep inyectado)", async () => {
    script("/h", { status: 429, headers: { "Retry-After": "1" } }, { status: 200 });
    const t0 = Date.now();
    const res = await spFetch(`${base}/h`);
    expect(res.status).toBe(200);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(900);
  });
});

describe("parseRetryAfterSeconds", () => {
  it("segundos, fecha HTTP e invalidos", () => {
    expect(parseRetryAfterSeconds("3")).toBe(3);
    expect(parseRetryAfterSeconds("0")).toBe(0);
    expect(parseRetryAfterSeconds(null)).toBeUndefined();
    expect(parseRetryAfterSeconds("nope")).toBeUndefined();
    const now = Date.UTC(2026, 8, 24, 12, 0, 0);
    expect(parseRetryAfterSeconds(new Date(now + 4000).toUTCString(), now)).toBe(4);
  });
});
