import { describe, expect, it } from "vitest";
import {
  COMPRESSED_MAX_BYTES_PER_PIXEL,
  DEFAULT_MAX_PAYLOAD_BYTES,
  DEFAULT_MAX_SIDE,
  FLOW_MAX_REQUEST_BYTES,
  base64Length,
  bytesFromBase64Length,
  checkPayloadBudget,
  extensionFor,
  fitWithin,
  formatBytes,
  isAlreadyCompressed,
  isCompressibleType,
  stripDataUrlPrefix,
  withExtension,
} from "./imageUtils";

describe("fitWithin (dimensiones)", () => {
  it("reduce manteniendo la proporcion cuando el lado mayor supera el maximo", () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960, scaled: true });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280, scaled: true });
  });
  it("nunca agranda", () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600, scaled: false });
    expect(fitWithin(1280, 1280, 1280).scaled).toBe(false);
  });
  it("usa 1280 por defecto", () => {
    expect(DEFAULT_MAX_SIDE).toBe(1280);
    expect(fitWithin(2560, 1280).width).toBe(1280);
  });
  it("nunca devuelve 0 en una dimension", () => {
    expect(fitWithin(10000, 1, 1280)).toEqual({ width: 1280, height: 1, scaled: true });
  });
  it("entrada invalida -> 0x0", () => {
    expect(fitWithin(0, 0)).toEqual({ width: 0, height: 0, scaled: false });
  });
});

describe("isAlreadyCompressed (idempotencia)", () => {
  const jpeg = { type: "image/jpeg", width: 1280, height: 960 };
  const budgetBytes = 1280 * 960 * COMPRESSED_MAX_BYTES_PER_PIXEL;

  it("un JPEG chico y liviano no se recomprime", () => {
    expect(isAlreadyCompressed({ ...jpeg, size: 150_000 })).toBe(true);
  });
  it("un JPEG dentro de las dimensiones pero pesado (original de camara) si se comprime", () => {
    expect(isAlreadyCompressed({ ...jpeg, size: Math.ceil(budgetBytes) + 1 })).toBe(false);
  });
  it("un JPEG mas grande que maxSide si se comprime", () => {
    expect(isAlreadyCompressed({ type: "image/jpeg", width: 4000, height: 3000, size: 100_000 })).toBe(false);
  });
  it("PNG/WebP siempre se re-codifican a JPEG", () => {
    expect(isAlreadyCompressed({ type: "image/png", width: 100, height: 100, size: 100 })).toBe(false);
    expect(isAlreadyCompressed({ type: "image/webp", width: 100, height: 100, size: 100 })).toBe(false);
  });
  it("respeta maxSide personalizado", () => {
    expect(isAlreadyCompressed({ ...jpeg, size: 100_000 }, { maxSide: 800 })).toBe(false);
  });
  it("dimensiones invalidas -> false", () => {
    expect(isAlreadyCompressed({ type: "image/jpeg", width: 0, height: 0, size: 0 })).toBe(false);
  });
});

describe("isCompressibleType", () => {
  it("excluye SVG, GIF y no-imagenes", () => {
    expect(isCompressibleType("image/jpeg")).toBe(true);
    expect(isCompressibleType("image/png")).toBe(true);
    expect(isCompressibleType("image/svg+xml")).toBe(false);
    expect(isCompressibleType("image/gif")).toBe(false);
    expect(isCompressibleType("application/pdf")).toBe(false);
    expect(isCompressibleType("")).toBe(false);
  });
});

describe("base64 y presupuesto de payload", () => {
  it("base64Length: ~33% de inflacion, con padding", () => {
    expect(base64Length(0)).toBe(0);
    expect(base64Length(1)).toBe(4);
    expect(base64Length(3)).toBe(4);
    expect(base64Length(4)).toBe(8);
    expect(base64Length(3_000_000)).toBe(4_000_000);
  });
  it("bytesFromBase64Length es la inversa aproximada", () => {
    expect(bytesFromBase64Length(4_000_000)).toBe(3_000_000);
  });
  it("checkPayloadBudget: dentro del limite", () => {
    const r = checkPayloadBudget([1_000_000, 2_000_000], 5_000_000);
    expect(r).toEqual({ ok: true, totalBytes: 3_000_000, maxBytes: 5_000_000, overByBytes: 0 });
  });
  it("checkPayloadBudget: excedido informa por cuanto", () => {
    const r = checkPayloadBudget([4_000_000, 2_000_000], 5_000_000);
    expect(r.ok).toBe(false);
    expect(r.overByBytes).toBe(1_000_000);
  });
  it("el tope por defecto es practico (pocos MB), muy por debajo de 100 MB", () => {
    expect(DEFAULT_MAX_PAYLOAD_BYTES).toBeLessThan(FLOW_MAX_REQUEST_BYTES);
    expect(checkPayloadBudget([DEFAULT_MAX_PAYLOAD_BYTES]).ok).toBe(true);
    expect(checkPayloadBudget([DEFAULT_MAX_PAYLOAD_BYTES + 1]).ok).toBe(false);
  });
  it("nunca acepta mas que el limite duro de 100 MB, aunque pidan un tope mayor", () => {
    const r = checkPayloadBudget([FLOW_MAX_REQUEST_BYTES + 1], FLOW_MAX_REQUEST_BYTES * 2);
    expect(r.ok).toBe(false);
    expect(r.maxBytes).toBe(FLOW_MAX_REQUEST_BYTES);
  });
  it("lista vacia -> ok", () => {
    expect(checkPayloadBudget([]).ok).toBe(true);
  });
});

describe("helpers de texto", () => {
  it("stripDataUrlPrefix devuelve base64 sin prefijo", () => {
    expect(stripDataUrlPrefix("data:image/png;base64,AAAA")).toBe("AAAA");
    expect(stripDataUrlPrefix("AAAA")).toBe("AAAA");
    expect(stripDataUrlPrefix("data:image/jpeg;base64,/9j/4AAQ==")).toBe("/9j/4AAQ==");
  });
  it("withExtension reemplaza o agrega", () => {
    expect(withExtension("IMG_1.HEIC", "jpg")).toBe("IMG_1.jpg");
    expect(withExtension("foto", "jpg")).toBe("foto.jpg");
    expect(withExtension("a.b.png", "jpg")).toBe("a.b.jpg");
  });
  it("extensionFor", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("")).toBe("bin");
    expect(extensionFor("application/x-raro-muy-largo")).toBe("bin");
  });
  it("formatBytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
