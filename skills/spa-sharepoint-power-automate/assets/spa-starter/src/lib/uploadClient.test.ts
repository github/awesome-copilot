import { describe, expect, it, vi } from "vitest";
import {
  buildPayload,
  classifyStatus,
  generateFolio,
  isDemoMode,
  parseRetryAfter,
  submit,
  type Payload,
} from "./uploadClient";

const URL_OK = "https://flow.example.test/invoke?sig=abc";
const FOLIO = "APP-20260924-153012-K7Q2XA";

function makePayload(over: Partial<Payload> = {}): Payload {
  return {
    folio: FOLIO,
    fechaEnvio: "2026-09-24T15:30:12.000Z",
    descripcion: "Prueba",
    patente: "ABC123",
    kilometraje: 1000,
    attachments: [],
    ...over,
  };
}

/** fetch simulado: devuelve las respuestas (o lanza los Error) en orden. */
function mockFetch(...steps: Array<Response | Error>) {
  const queue = [...steps];
  const fn = vi.fn(async (_url: unknown, _init?: RequestInit) => {
    const next = queue.shift();
    if (!next) throw new Error("mockFetch: sin mas respuestas configuradas");
    if (next instanceof Error) throw next;
    return next;
  });
  return fn as typeof fn & typeof fetch;
}

const res = (status: number, headers: Record<string, string> = {}, body = "") =>
  new Response(body || null, { status, headers });

const noSleep = () => vi.fn(async (_ms: number) => {});

describe("submit: exito y modo demo", () => {
  it("200 -> ok, con Content-Type application/json y x-app-key", async () => {
    const f = mockFetch(res(200, { "content-type": "application/json" }, '{"id":7,"folio":"X"}'));
    const r = await submit(makePayload(), { url: URL_OK, appKey: "k-123", fetchImpl: f });
    expect(r).toEqual({ ok: true, demo: false, folio: FOLIO, attempts: 1 });

    expect(f).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = f.mock.calls[0]!;
    expect(calledUrl).toBe(URL_OK);
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json"); // text/plain rompe triggerBody()
    expect(headers["x-app-key"]).toBe("k-123");
    expect(JSON.parse(init?.body as string)).toEqual(makePayload());
  });

  it("sin appKey no manda la cabecera x-app-key", async () => {
    const f = mockFetch(res(200));
    await submit(makePayload(), { url: URL_OK, appKey: "", fetchImpl: f });
    const headers = f.mock.calls[0]![1]?.headers as Record<string, string>;
    expect("x-app-key" in headers).toBe(false);
  });

  it("sin URL -> modo demo: ok, demo=true y NO llama a fetch", async () => {
    const f = mockFetch();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await submit(makePayload(), { url: "   ", fetchImpl: f });
    expect(r).toMatchObject({ ok: true, demo: true, folio: FOLIO });
    expect(f).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("isDemoMode", () => {
    expect(isDemoMode("")).toBe(true);
    expect(isDemoMode("  ")).toBe(true);
    expect(isDemoMode(URL_OK)).toBe(false);
  });
});

describe("submit: 401/403 (Who can trigger the flow mal configurado)", () => {
  for (const status of [401, 403]) {
    it(`${status} -> kind auth, mensaje accionable, sin reintentos`, async () => {
      const f = mockFetch(res(status));
      const sleep = noSleep();
      const r = await submit(makePayload(), { url: URL_OK, fetchImpl: f, sleep });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("auth");
      expect(r.error.status).toBe(status);
      expect(r.error.retryable).toBe(false);
      expect(r.error.message).toMatch(/Anyone/);
      expect(r.error.message).toMatch(/x-app-key|VITE_APP_KEY/);
      expect(f).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });
  }
});

describe("submit: 429 y reintentos acotados", () => {
  it("429 con Retry-After: espera exactamente eso y reintenta", async () => {
    const f = mockFetch(res(429, { "retry-after": "2" }), res(200));
    const sleep = noSleep();
    const r = await submit(makePayload(), { url: URL_OK, fetchImpl: f, sleep });
    expect(r).toMatchObject({ ok: true, attempts: 2 });
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("reintenta con el MISMO folio (idempotencia)", async () => {
    const f = mockFetch(res(429, { "retry-after": "1" }), res(200));
    await submit(makePayload(), { url: URL_OK, fetchImpl: f, sleep: noSleep() });
    const folios = f.mock.calls.map((c) => (JSON.parse(c[1]?.body as string) as Payload).folio);
    expect(folios).toEqual([FOLIO, FOLIO]);
  });

  it("se rinde tras maxRetries: 1 + 2 intentos y error throttled retryable", async () => {
    const f = mockFetch(res(429, { "retry-after": "1" }), res(429, { "retry-after": "1" }), res(429, { "retry-after": "3" }));
    const sleep = noSleep();
    const r = await submit(makePayload(), { url: URL_OK, fetchImpl: f, sleep, maxRetries: 2 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.attempts).toBe(3);
    expect(r.error.kind).toBe("throttled");
    expect(r.error.retryable).toBe(true);
    expect(r.error.retryAfterMs).toBe(3000);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("sin Retry-After usa backoff exponencial (1 s, 2 s)", async () => {
    const f = mockFetch(res(429), res(429), res(200));
    const sleep = noSleep();
    await submit(makePayload(), { url: URL_OK, fetchImpl: f, sleep, baseDelayMs: 1000 });
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([1000, 2000]);
  });

  it("si Retry-After supera maxWaitMs no espera: devuelve el error", async () => {
    const f = mockFetch(res(429, { "retry-after": "999" }));
    const sleep = noSleep();
    const r = await submit(makePayload(), { url: URL_OK, fetchImpl: f, sleep, maxWaitMs: 30_000 });
    expect(r.ok).toBe(false);
    expect(sleep).not.toHaveBeenCalled();
    expect(f).toHaveBeenCalledTimes(1);
    if (!r.ok) expect(r.error.retryAfterMs).toBe(999_000);
  });

  it("maxRetries=0 desactiva los reintentos", async () => {
    const f = mockFetch(res(429, { "retry-after": "1" }));
    const r = await submit(makePayload(), { url: URL_OK, fetchImpl: f, sleep: noSleep(), maxRetries: 0 });
    expect(r.ok).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("500 y 503 tambien se reintentan", async () => {
    const f = mockFetch(res(500), res(503), res(200));
    const r = await submit(makePayload(), { url: URL_OK, fetchImpl: f, sleep: noSleep() });
    expect(r).toMatchObject({ ok: true, attempts: 3 });
  });
});

describe("submit: 502/504 = probable limite de 120 s", () => {
  for (const status of [502, 504]) {
    it(`${status} -> gateway-timeout, mensaje sobre 120 s, sin auto-reintento`, async () => {
      const f = mockFetch(res(status));
      const sleep = noSleep();
      const r = await submit(makePayload(), { url: URL_OK, fetchImpl: f, sleep });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("gateway-timeout");
      expect(r.error.message).toMatch(/120 s/);
      expect(r.error.retryable).toBe(true); // reintento MANUAL con el mismo folio
      expect(f).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });
  }
});

describe("submit: timeout, red, tamano, cancelacion", () => {
  it("timeout con AbortController -> kind timeout", async () => {
    // fetch que nunca responde y rechaza cuando se aborta la senal
    const f = vi.fn(
      (_u: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted.", "AbortError")),
          );
        }),
    ) as unknown as typeof fetch;
    const t0 = Date.now();
    const r = await submit(makePayload(), { url: URL_OK, fetchImpl: f, timeoutMs: 30 });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("timeout");
    expect(r.error.retryable).toBe(true);
  });

  it("fallo de red (fetch lanza) -> kind network, sin auto-reintento", async () => {
    const f = mockFetch(new TypeError("Failed to fetch"));
    const r = await submit(makePayload(), { url: URL_OK, fetchImpl: f, sleep: noSleep() });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("network");
    expect(r.error.retryable).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("payload mayor que el tope: no llama a fetch", async () => {
    const f = mockFetch();
    const big = makePayload({ attachments: [{ name: "a.jpg", contentBase64: "A".repeat(5000) }] });
    const r = await submit(big, { url: URL_OK, fetchImpl: f, maxPayloadBytes: 1000 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("payload-too-large");
    expect(r.error.retryable).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("senal externa ya abortada -> aborted", async () => {
    const f = mockFetch(res(200));
    const ac = new AbortController();
    ac.abort();
    const r = await submit(makePayload(), { url: URL_OK, fetchImpl: f, signal: ac.signal });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("aborted");
    expect(f).not.toHaveBeenCalled();
  });

  it("otros 4xx -> client, sin reintento", async () => {
    const f = mockFetch(res(400, {}, "Bad request"));
    const r = await submit(makePayload(), { url: URL_OK, fetchImpl: f, sleep: noSleep() });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatchObject({ kind: "client", status: 400, retryable: false, detail: "Bad request" });
  });
});

describe("classifyStatus / parseRetryAfter", () => {
  it("2xx -> null", () => {
    expect(classifyStatus(200)).toBeNull();
    expect(classifyStatus(202)).toBeNull();
  });
  it("mapeo de estados", () => {
    expect(classifyStatus(413)?.kind).toBe("payload-too-large");
    expect(classifyStatus(404)?.kind).toBe("client");
    expect(classifyStatus(409)?.kind).toBe("client");
    expect(classifyStatus(500)?.kind).toBe("server");
    expect(classifyStatus(503)?.kind).toBe("server");
  });
  it("Retry-After en segundos y en fecha HTTP", () => {
    expect(parseRetryAfter("5")).toBe(5000);
    expect(parseRetryAfter("0")).toBe(0);
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter("")).toBeUndefined();
    expect(parseRetryAfter("basura")).toBeUndefined();
    const now = Date.UTC(2026, 8, 24, 12, 0, 0);
    expect(parseRetryAfter(new Date(now + 7000).toUTCString(), now)).toBe(7000);
    expect(parseRetryAfter(new Date(now - 7000).toUTCString(), now)).toBe(0);
  });
});

describe("buildPayload", () => {
  const sig = "data:image/png;base64," + "B".repeat(300);
  const photo = { name: "foto-1.jpg", contentBase64: "QUJD" };

  it("normaliza campos y pone la firma primero, luego las fotos (sin prefijo data:)", () => {
    const p = buildPayload({
      folio: FOLIO,
      descripcion: "  hola  ",
      patente: "ab-123-cd",
      kilometraje: 458789,
      signatureDataUrl: sig,
      photos: [photo],
      now: () => new Date("2026-09-24T15:30:12.000Z"),
    });
    expect(p.descripcion).toBe("hola");
    expect(p.patente).toBe("AB123CD");
    expect(p.kilometraje).toBe(458789);
    expect(p.fechaEnvio).toBe("2026-09-24T15:30:12.000Z");
    expect(p.attachments.map((a) => a.name)).toEqual([`firma_${FOLIO}.png`, "foto-1.jpg"]);
    expect(p.attachments[0]!.contentBase64).toBe("B".repeat(300));
    expect(p.attachments[0]!.contentBase64.startsWith("data:")).toBe(false);
  });

  it("kilometraje ausente -> null (nunca '' ni undefined)", () => {
    const base = { folio: FOLIO, descripcion: "x", patente: "" };
    expect(buildPayload({ ...base, kilometraje: undefined }).kilometraje).toBeNull();
    expect(buildPayload({ ...base, kilometraje: null }).kilometraje).toBeNull();
    expect(buildPayload({ ...base, kilometraje: Number.NaN }).kilometraje).toBeNull();
    expect(buildPayload({ ...base, kilometraje: 0 }).kilometraje).toBe(0);
    expect(JSON.parse(JSON.stringify(buildPayload({ ...base, kilometraje: undefined }))).kilometraje).toBeNull();
  });

  it("firma invalida o vacia no se adjunta", () => {
    const p = buildPayload({ folio: FOLIO, descripcion: "", patente: "", kilometraje: 1, signatureDataUrl: "data:," });
    expect(p.attachments).toEqual([]);
  });
});

describe("generateFolio", () => {
  it("formato PREFIJO-YYYYMMDD-HHMMSS-XXXXXX", () => {
    const f = generateFolio("INS", new Date(Date.UTC(2026, 8, 24, 15, 30, 12)), () => 0.5);
    expect(f).toMatch(/^INS-20260924-153012-[0-9A-Z]{6}$/);
  });
  it("distintos aleatorios -> distintos folios", () => {
    const now = new Date();
    expect(generateFolio("APP", now, () => 0.1)).not.toBe(generateFolio("APP", now, () => 0.9));
  });
  it("con el generador real tambien cumple el formato", () => {
    expect(generateFolio()).toMatch(/^APP-\d{8}-\d{6}-[0-9A-Z]{6}$/);
  });
});
