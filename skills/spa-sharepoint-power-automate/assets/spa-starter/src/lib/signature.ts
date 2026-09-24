/**
 * Validacion de firma (pura, testeable sin DOM). Skill §5 "validate non-empty".
 *
 * `canvas.toDataURL()` de un canvas sin tocar devuelve 'data:,' o un PNG
 * transparente. Un dataURL real con trazos supera holgadamente los 200 chars.
 * (Un canvas grande y vacio puede pasar de 200 chars; por eso el componente
 * ademas exige que el usuario haya dibujado de verdad.)
 */
export const SIGNATURE_MIN_LENGTH = 200;

export function isValidSignature(dataUrl: string | null | undefined): dataUrl is string {
  return (
    typeof dataUrl === "string" &&
    dataUrl !== "data:," &&
    dataUrl.startsWith("data:image/") &&
    dataUrl.length > SIGNATURE_MIN_LENGTH
  );
}
