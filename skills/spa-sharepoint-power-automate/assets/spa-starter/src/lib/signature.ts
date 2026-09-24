/**
 * Validacion de firma (pura, testeable sin DOM). Skill §5 "validate non-empty".
 *
 * `canvas.toDataURL()` de un canvas sin tocar devuelve 'data:,' o un PNG
 * transparente. Un dataURL real con trazos supera holgadamente los 200 chars.
 * (Un canvas grande y vacio puede pasar de 200 chars; por eso el componente
 * ademas exige que el usuario haya dibujado de verdad.)
 */
export const SIGNATURE_MIN_LENGTH = 200;

/**
 * Alternativa accesible al trazo: renderiza el nombre escrito como imagen PNG (dataURL).
 * Devuelve null si el nombre esta vacio o si no hay canvas (p. ej. entorno de pruebas).
 * Quien la use debe explicar al usuario que el nombre escrito cumple el mismo rol que la firma.
 */
export function signatureFromText(name: string): string | null {
  const text = name.trim();
  if (text.length < 2 || typeof document === "undefined") return null;
  try {
    const c = document.createElement("canvas");
    c.width = 600;
    c.height = 160;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#111";
    ctx.font = "italic 48px 'Segoe Script', 'Brush Script MT', cursive";
    ctx.textBaseline = "middle";
    ctx.fillText(text.slice(0, 40), 24, c.height / 2, c.width - 48);
    const url = c.toDataURL("image/png");
    return isValidSignature(url) ? url : null;
  } catch {
    return null;
  }
}

export function isValidSignature(dataUrl: string | null | undefined): dataUrl is string {
  return (
    typeof dataUrl === "string" &&
    dataUrl !== "data:," &&
    dataUrl.startsWith("data:image/") &&
    dataUrl.length > SIGNATURE_MIN_LENGTH
  );
}
