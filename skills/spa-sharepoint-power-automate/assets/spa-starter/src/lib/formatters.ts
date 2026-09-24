/**
 * Formateadores puros (sin DOM, sin estado). Skill §4.
 *
 * Invariante para numeros: el estado es SIEMPRE `number | undefined`, lo que se
 * muestra es SIEMPRE el formateado, y el parseo SIEMPRE quita lo que no es
 * digito. El payload lleva el numero, nunca el string formateado.
 */

/** Tope de digitos: evita perder precision (Number.MAX_SAFE_INTEGER tiene 16). */
const MAX_DIGITS = 15;

/** '123.456', '123,456', '123 456' -> 123456. Sin digitos -> undefined. */
export function parseKms(raw: string): number | undefined {
  const digits = raw.replace(/\D/g, "").slice(0, MAX_DIGITS);
  if (!digits) return undefined;
  return Number(digits);
}

/**
 * 123456 -> '123.456' (separador de miles es-AR).
 * Implementado a mano a proposito: `toLocaleString('es-AR')` depende del ICU del
 * runtime y da resultados distintos entre navegadores/Node.
 */
export function formatKms(n: number | undefined | null): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  const rounded = Math.round(Math.abs(n));
  const sign = n < 0 && rounded !== 0 ? "-" : "";
  return sign + String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ---------------------------------------------------------------------------
// Patente argentina: dos formatos. El 3er caracter define cual es.
//   Vieja    AAA123   (3 letras + 3 digitos)   -> 'ABC-123'
//   Mercosur AA123AA  (2 letras + 3 digitos + 2 letras) -> 'AB-123-CD'
// ---------------------------------------------------------------------------

const isLetter = (c: string): boolean => c >= "A" && c <= "Z";
const isDigit = (c: string): boolean => c >= "0" && c <= "9";

/**
 * Deja solo lo que es valido en cada posicion, en mayusculas y sin separadores.
 * Es progresiva: 'ab1' -> 'AB1', 'abcd' -> 'ABC' (la 4ta debe ser digito).
 */
export function normalizePatente(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let out = "";
  let format: "old" | "mercosur" | null = null;
  for (const ch of clean) {
    const i = out.length;
    if (i < 2) {
      if (!isLetter(ch)) continue;
    } else if (i === 2) {
      format = isLetter(ch) ? "old" : "mercosur";
    } else if (format === "old") {
      if (!isDigit(ch) || i > 5) continue;
    } else {
      // mercosur: posiciones 2-4 digitos, 5-6 letras
      if (i <= 4 ? !isDigit(ch) : !isLetter(ch) || i > 6) continue;
    }
    out += ch;
  }
  return out;
}

/** Autoformato progresivo para el input: 'abc123' -> 'ABC-123'. Sin guion final. */
export function formatPatente(raw: string): string {
  const p = normalizePatente(raw);
  if (p.length <= 2) return p;
  if (isLetter(p.charAt(2))) {
    return p.length <= 3 ? p : `${p.slice(0, 3)}-${p.slice(3, 6)}`;
  }
  if (p.length <= 5) return `${p.slice(0, 2)}-${p.slice(2)}`;
  return `${p.slice(0, 2)}-${p.slice(2, 5)}-${p.slice(5, 7)}`;
}

/** Valida cualquiera de los dos formatos, con o sin guiones. */
export function isValidPatente(raw: string): boolean {
  const compact = raw.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z]{3}\d{3}$/.test(compact) || /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(compact);
}
