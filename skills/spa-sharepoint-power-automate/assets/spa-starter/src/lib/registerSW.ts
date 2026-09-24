/**
 * Registro del service worker con auto-update. Skill §7.
 *
 * Subir la version del cache en sw.js NO alcanza si la pagina ya esta abierta:
 * el SW viejo sigue controlando la pestana hasta que el usuario recarga a mano.
 * Este registro empuja al SW nuevo a activarse (SKIP_WAITING) y recarga UNA vez
 * cuando toma el control (controllerchange).
 */
export function registerSW(): void {
  if (!("serviceWorker" in navigator)) return;

  // Recargar exactamente una vez cuando un SW nuevo toma el control.
  let reloading = false;
  // En la primera instalacion no hay controller previo: no recargar en ese caso.
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !hadController) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL || "./";
    navigator.serviceWorker
      .register(`${base}sw.js`)
      .then((reg) => {
        if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
        reg.addEventListener("updatefound", () => {
          const incoming = reg.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", () => {
            if (incoming.state === "installed" && navigator.serviceWorker.controller) {
              incoming.postMessage("SKIP_WAITING");
            }
          });
        });
        reg.update().catch(() => {}); // fuerza chequeo (el navegador lo hace cada ~24 h)
      })
      .catch(() => {
        /* sin SW la app funciona igual, solo sin cache offline */
      });
  });
}
