import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "./App";

// Smoke test de render (SSR, sin DOM): verifica que el formulario monta sin lanzar,
// aun sin localStorage, y que respeta las reglas de markup del skill.
describe("App (render inicial)", () => {
  const html = renderToString(<App />);

  it("muestra el banner de modo demo cuando no hay VITE_POWER_AUTOMATE_URL", () => {
    expect(html).toContain("Modo demo");
  });

  it("lista los pendientes y deja el boton Enviar deshabilitado", () => {
    expect(html).toContain("Falta completar");
    expect(html).toContain("Firma");
    expect(html).toMatch(/<button type="submit"[^>]*disabled/);
  });

  it("no usa `required` nativo (la validacion es propia)", () => {
    expect(html).not.toMatch(/\srequired[\s=>]/);
  });

  it("el canvas de firma NO esta dentro de un <label>", () => {
    const canvasAt = html.indexOf("<canvas");
    expect(canvasAt).toBeGreaterThan(-1);
    const before = html.slice(0, canvasAt);
    expect(before.lastIndexOf("<label")).toBeLessThanOrEqual(before.lastIndexOf("</label>"));
  });
});
