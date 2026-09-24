/**
 * Registro del service worker con auto-update. Skill §7.
 *
 * Subir la version del cache en sw.js NO alcanza si la pagina ya esta abierta:
 * el SW viejo sigue controlando la pestana hasta que el usuario recarga a mano.
 * Este registro empuja al SW nuevo a activarse (SKIP_WAITING). NO recarga solo: las fotos
 * elegidas no se guardan, y una recarga a mitad del formulario las perderia. En su lugar avisa
 * (evento UPDATE_READY_EVENT) para que la UI ofrezca "Actualizar" cuando el usuario quiera.
 */

/** Se dispara en `window` cuando hay una version nueva lista para usar. */
export const UPDATE_READY_EVENT = "app:update-ready";

/** Recarga para usar la version nueva (llamar solo cuando el usuario lo pida). */
export function applyUpdate(): void {
  window.location.reload();
}
export function registerSW(): void {
  if (!("serviceWorker" in navigator)) return;

  // Avisar exactamente una vez cuando un SW nuevo toma el control (sin recargar).
  let notified = false;
  // En la primera instalacion no hay controller previo: no avisar en ese caso.
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (notified || !hadController) return;
    notified = true;
    window.dispatchEvent(new Event(UPDATE_READY_EVENT));
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
