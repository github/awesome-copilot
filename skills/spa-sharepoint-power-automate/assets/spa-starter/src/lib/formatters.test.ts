import { describe, expect, it } from "vitest";
import { formatKms, formatPatente, isValidPatente, normalizePatente, parseKms } from "./formatters";

describe("parseKms", () => {
  it("quita todo lo que no es digito", () => {
    expect(parseKms("123.456")).toBe(123456);
    expect(parseKms("123,456")).toBe(123456);
    expect(parseKms("123 456")).toBe(123456);
    expect(parseKms("  1.234.567 km")).toBe(1234567);
  });
  it("devuelve undefined sin digitos", () => {
    expect(parseKms("")).toBeUndefined();
    expect(parseKms("abc")).toBeUndefined();
    expect(parseKms(".,")).toBeUndefined();
  });
  it("cero es un valor valido, no 'vacio'", () => {
    expect(parseKms("0")).toBe(0);
  });
  it("limita la cantidad de digitos (precision)", () => {
    expect(String(parseKms("9".repeat(30))).length).toBeLessThanOrEqual(15);
  });
});

describe("formatKms", () => {
  it("usa punto como separador de miles (es-AR)", () => {
    expect(formatKms(0)).toBe("0");
    expect(formatKms(999)).toBe("999");
    expect(formatKms(1000)).toBe("1.000");
    expect(formatKms(123456)).toBe("123.456");
    expect(formatKms(1234567)).toBe("1.234.567");
  });
  it("valores no numericos -> string vacio", () => {
    expect(formatKms(undefined)).toBe("");
    expect(formatKms(null)).toBe("");
    expect(formatKms(Number.NaN)).toBe("");
    expect(formatKms(Number.POSITIVE_INFINITY)).toBe("");
  });
  it("redondea decimales", () => {
    expect(formatKms(1234.6)).toBe("1.235");
  });
  it("ida y vuelta: parse(format(n)) === n", () => {
    for (const n of [0, 7, 1000, 458789, 12345678]) expect(parseKms(formatKms(n))).toBe(n);
  });
});

describe("formatPatente (autoformato progresivo)", () => {
  it("formato viejo AAA123", () => {
    expect(formatPatente("a")).toBe("A");
    expect(formatPatente("ab")).toBe("AB");
    expect(formatPatente("abc")).toBe("ABC");
    expect(formatPatente("abc1")).toBe("ABC-1");
    expect(formatPatente("abc123")).toBe("ABC-123");
  });
  it("formato Mercosur AA123AA", () => {
    expect(formatPatente("ab1")).toBe("AB-1");
    expect(formatPatente("ab123")).toBe("AB-123");
    expect(formatPatente("ab123c")).toBe("AB-123-C");
    expect(formatPatente("ab123cd")).toBe("AB-123-CD");
  });
  it("es progresivo: nunca deja un guion colgando", () => {
    for (const raw of ["a", "ab", "abc", "ab1", "abc1", "ab123", "ab123c"]) {
      expect(formatPatente(raw).endsWith("-")).toBe(false);
    }
  });
  it("es idempotente (reformatear lo ya formateado no cambia nada)", () => {
    for (const raw of ["abc123", "ab123cd", "ab12", "abc1"]) {
      const once = formatPatente(raw);
      expect(formatPatente(once)).toBe(once);
    }
  });
  it("descarta caracteres invalidos y sobrantes", () => {
    expect(formatPatente("abc-123-xyz")).toBe("ABC-123");
    expect(formatPatente("ab123cdxx")).toBe("AB-123-CD");
    expect(formatPatente("1abc")).toBe("ABC");
    expect(formatPatente("abcd")).toBe("ABC"); // 4to caracter del formato viejo debe ser digito
    expect(formatPatente("ab1c")).toBe("AB-1"); // en Mercosur, pos. 4 debe ser digito
    expect(formatPatente("  ")).toBe("");
  });
  it("normalizePatente devuelve la forma compacta para el payload", () => {
    expect(normalizePatente("ab-123-cd")).toBe("AB123CD");
    expect(normalizePatente("abc 123")).toBe("ABC123");
  });
});

describe("isValidPatente", () => {
  it("acepta los dos formatos, con o sin guiones", () => {
    expect(isValidPatente("ABC-123")).toBe(true);
    expect(isValidPatente("ABC123")).toBe(true);
    expect(isValidPatente("AB-123-CD")).toBe(true);
    expect(isValidPatente("ab123cd")).toBe(true);
  });
  it("rechaza incompletas y mal formadas", () => {
    expect(isValidPatente("")).toBe(false);
    expect(isValidPatente("ABC-12")).toBe(false);
    expect(isValidPatente("AB-123-C")).toBe(false);
    expect(isValidPatente("A1C-123")).toBe(false);
    expect(isValidPatente("ABCD123")).toBe(false);
    expect(isValidPatente("AB123CDE")).toBe(false);
  });
});
