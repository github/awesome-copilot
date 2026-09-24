import { describe, expect, it } from "vitest";
import { SIGNATURE_MIN_LENGTH, isValidSignature } from "./signature";

describe("isValidSignature", () => {
  const real = "data:image/png;base64," + "A".repeat(SIGNATURE_MIN_LENGTH);

  it("acepta un dataURL de imagen de mas de 200 chars", () => {
    expect(isValidSignature(real)).toBe(true);
  });
  it("rechaza canvas vacio ('data:,') y valores nulos", () => {
    expect(isValidSignature("data:,")).toBe(false);
    expect(isValidSignature("")).toBe(false);
    expect(isValidSignature(null)).toBe(false);
    expect(isValidSignature(undefined)).toBe(false);
  });
  it("rechaza dataURL demasiado cortos", () => {
    expect(isValidSignature("data:image/png;base64," + "A".repeat(50))).toBe(false);
  });
  it("rechaza cadenas largas que no son imagen", () => {
    expect(isValidSignature("x".repeat(500))).toBe(false);
  });
});
