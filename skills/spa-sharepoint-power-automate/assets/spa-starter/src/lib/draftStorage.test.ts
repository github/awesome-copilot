import { describe, expect, it } from "vitest";
import {
  defaultDraftKey,
  DRAFT_VERSION,
  defaultLegacyKeys,
  createDraftStore,
  shouldClearDraft,
  type StorageLike,
} from "./draftStorage";

/** localStorage simulado en memoria; `failOn` hace que ciertas operaciones lancen. */
function fakeStorage(failOn: Array<"get" | "set" | "remove"> = []) {
  const data = new Map<string, string>();
  const boom = (op: string): never => {
    throw new Error(`storage ${op} failed`);
  };
  const storage: StorageLike = {
    getItem: (k) => (failOn.includes("get") ? boom("get") : (data.get(k) ?? null)),
    setItem: (k, v) => (failOn.includes("set") ? boom("set") : void data.set(k, v)),
    removeItem: (k) => (failOn.includes("remove") ? boom("remove") : void data.delete(k)),
  };
  return { storage, data };
}

interface Form {
  a: string;
  n: number;
}

describe("createDraftStore", () => {
  it("guarda y carga con la clave versionada", () => {
    const { storage, data } = fakeStorage();
    const store = createDraftStore<Form>({ storage, now: () => 42 });
    expect(store.save({ a: "x", n: 1 })).toBe(true);
    expect(data.has(defaultDraftKey())).toBe(true);
    expect(defaultDraftKey()).toContain(`v${DRAFT_VERSION}`);
    expect(JSON.parse(data.get(defaultDraftKey())!)).toEqual({ v: DRAFT_VERSION, ts: 42, data: { a: "x", n: 1 } });
    expect(store.load()).toEqual({ a: "x", n: 1 });
  });

  it("load devuelve null si no hay nada", () => {
    expect(createDraftStore<Form>({ storage: fakeStorage().storage }).load()).toBeNull();
  });

  it("purga las claves legacy en load, save y clear", () => {
    for (const op of ["load", "save", "clear"] as const) {
      const { storage, data } = fakeStorage();
      for (const k of defaultLegacyKeys()) data.set(k, "viejo");
      const store = createDraftStore<Form>({ storage });
      if (op === "load") store.load();
      if (op === "save") store.save({ a: "", n: 0 });
      if (op === "clear") store.clear();
      for (const k of defaultLegacyKeys()) expect(data.has(k), `${op} debe purgar ${k}`).toBe(false);
    }
  });

  it("ignora un borrador de otra version (invalidar > migrar)", () => {
    const { storage, data } = fakeStorage();
    data.set(defaultDraftKey(), JSON.stringify({ v: DRAFT_VERSION + 1, ts: 1, data: { a: "x", n: 1 } }));
    expect(createDraftStore<Form>({ storage }).load()).toBeNull();
  });

  it("JSON corrupto o con forma rara -> null, sin lanzar", () => {
    const { storage, data } = fakeStorage();
    const store = createDraftStore<Form>({ storage });
    for (const raw of ["{no es json", "null", '"texto"', "[]", "{}", '{"v":1}']) {
      data.set(defaultDraftKey(), raw);
      expect(store.load()).toBeNull();
    }
  });

  it("clear borra el borrador", () => {
    const { storage, data } = fakeStorage();
    const store = createDraftStore<Form>({ storage });
    store.save({ a: "x", n: 1 });
    expect(store.clear()).toBe(true);
    expect(data.has(defaultDraftKey())).toBe(false);
    expect(store.load()).toBeNull();
  });

  it("si localStorage lanza (cuota, modo privado) nada explota", () => {
    const store = createDraftStore<Form>({ storage: fakeStorage(["get", "set", "remove"]).storage });
    expect(store.save({ a: "x", n: 1 })).toBe(false);
    expect(store.load()).toBeNull();
    expect(store.clear()).toBe(false);
    expect(() => store.purgeLegacy()).not.toThrow();
  });

  it("si solo falla setItem (QuotaExceeded), save devuelve false", () => {
    const store = createDraftStore<Form>({ storage: fakeStorage(["set"]).storage });
    expect(store.save({ a: "x", n: 1 })).toBe(false);
  });

  it("sin storage (null) devuelve false/null en vez de lanzar", () => {
    const store = createDraftStore<Form>({ storage: null });
    expect(store.save({ a: "x", n: 1 })).toBe(false);
    expect(store.load()).toBeNull();
    expect(store.clear()).toBe(false);
  });
});

describe("shouldClearDraft: no borrar hasta confirmar exito", () => {
  it("solo con ok=true y sin demo", () => {
    expect(shouldClearDraft({ ok: true })).toBe(true);
    expect(shouldClearDraft({ ok: true, demo: false })).toBe(true);
  });
  it("NO en fallos", () => {
    expect(shouldClearDraft({ ok: false })).toBe(false);
  });
  it("NO en modo demo (no se envio nada)", () => {
    expect(shouldClearDraft({ ok: true, demo: true })).toBe(false);
  });
  it("flujo completo: un envio fallido conserva el borrador, uno exitoso lo borra", () => {
    const { storage } = fakeStorage();
    const store = createDraftStore<Form>({ storage });
    store.save({ a: "x", n: 1 });
    const failed = { ok: false as const };
    if (shouldClearDraft(failed)) store.clear();
    expect(store.load()).toEqual({ a: "x", n: 1 });
    const okResult = { ok: true as const, demo: false };
    if (shouldClearDraft(okResult)) store.clear();
    expect(store.load()).toBeNull();
  });
});

describe("createDraftStore: caducidad", () => {
  it("un borrador dentro del plazo se devuelve", () => {
    const { storage } = fakeStorage();
    let t = 1_000;
    const s = createDraftStore<Form>({ storage, now: () => t, maxAgeMs: 500 });
    s.save({ a: "x", n: 1 });
    t = 1_400;
    expect(s.load()).toEqual({ a: "x", n: 1 });
  });

  it("pasado el plazo load() devuelve null y BORRA el borrador", () => {
    const { storage, data } = fakeStorage();
    let t = 1_000;
    const s = createDraftStore<Form>({ storage, now: () => t, maxAgeMs: 500 });
    s.save({ a: "x", n: 1 });
    t = 1_501;
    expect(s.load()).toBeNull();
    expect(data.has(defaultDraftKey())).toBe(false);
  });

  it("un borrador sin marca de tiempo valida se descarta", () => {
    const { storage, data } = fakeStorage();
    data.set(defaultDraftKey(), JSON.stringify({ v: DRAFT_VERSION, data: { a: "x", n: 1 } }));
    const s = createDraftStore<Form>({ storage });
    expect(s.load()).toBeNull();
    expect(data.has(defaultDraftKey())).toBe(false);
  });

  it("clear() (\"borrar mis datos\") elimina el borrador aunque no haya vencido", () => {
    const { storage, data } = fakeStorage();
    const s = createDraftStore<Form>({ storage });
    s.save({ a: "x", n: 1 });
    expect(s.clear()).toBe(true);
    expect(data.has(defaultDraftKey())).toBe(false);
  });
});

describe("createDraftStore: claves por aplicacion (mismo origen, distinta ruta)", () => {
  it("dos apps con distinto namespace no se pisan ni se purgan", () => {
    const { storage, data } = fakeStorage();
    const a = createDraftStore<Form>({ storage, key: defaultDraftKey("/repo-a/"), legacyKeys: defaultLegacyKeys("/repo-a/") });
    const b = createDraftStore<Form>({ storage, key: defaultDraftKey("/repo-b/"), legacyKeys: defaultLegacyKeys("/repo-b/") });
    a.save({ a: "A", n: 1 });
    b.save({ a: "B", n: 2 });
    expect(a.load()).toEqual({ a: "A", n: 1 });
    expect(b.load()).toEqual({ a: "B", n: 2 });
    a.clear();
    expect(b.load()).toEqual({ a: "B", n: 2 });
    expect(data.has(defaultDraftKey("/repo-b/"))).toBe(true);
  });
});
