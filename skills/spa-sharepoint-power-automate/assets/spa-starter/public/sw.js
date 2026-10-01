/* Service worker. Skill §2 (rutas relativas), §7 (cache, esquemas, auto-update) y §19.3.
 *
 * - Rutas RELATIVAS: el SW toma su scope de la URL con la que se registra, asi
 *   que funciona bajo /<repo>/ en GitHub Pages.
 * - `__BUILD_ID__` lo reemplaza vite.config.ts (plugin sw-build-id) en cada build:
 *   el nombre del cache cambia solo, sin "acordarse de bumpearlo".
 * - Estrategias: NETWORK-FIRST para index/navegaciones (siempre la ultima
 *   version si hay red) y CACHE-FIRST para /assets/ (nombres con hash: inmutables).
 * - NUNCA se cachea nada que no sea GET same-origin: en particular las llamadas
 *   al flow (POST y otro origen). Un estado cacheado es peor que un error de red.
 */
const BUILD_ID = "__BUILD_ID__";
// CacheStorage es del ORIGEN: varios proyectos de GitHub Pages bajo el mismo `*.github.io` lo comparten.
// El prefijo incluye el alcance de este SW (p. ej. /repo-a/) para que `activate` solo borre SUS caches.
const CACHE_PREFIX = "app-static:" + new URL(self.registration.scope).pathname + ":";
const CACHE = CACHE_PREFIX + BUILD_ID;
const PRECACHE_BASE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
// `__BUILD_ASSETS__` lo reemplaza vite.config.ts por la lista de JS/CSS con hash del build. Sin esto,
// una primera visita seguida de un arranque SIN red serviria el HTML cacheado sin sus assets y la app no arrancaria.
let BUILD_ASSETS = [];
try {
  BUILD_ASSETS = JSON.parse('__BUILD_ASSETS__');
} catch {
  /* dev: el placeholder no se reemplaza; no hay assets que precachear */
}
const PRECACHE = [...PRECACHE_BASE, ...BUILD_ASSETS];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll es ATOMICO: si falta cualquier recurso del precache la instalacion FALLA y el SW/cache anterior,
      // que funcionaba, sigue activo. Un cache incompleto no debe reemplazar a uno completo.
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// La pagina empuja al SW nuevo a activarse (ver registerSW.ts).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // La Cache API solo acepta http(s): chrome-extension:, blob:, data:, ws: tirarian TypeError.
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  // Solo GET del mismo origen. Excluye el POST al flow y cualquier otro origen.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  const isNavigation = req.mode === "navigate";
  if (isNavigation || url.pathname.endsWith("/index.html")) {
    event.respondWith(networkFirst(req));
  } else if (url.pathname.includes("/assets/")) {
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(networkFirst(req));
  }
});

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok && res.type === "basic") {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    }
    return res;
  } catch (err) {
    const cached =
      (await caches.match(req)) ||
      (req.mode === "navigate" ? (await caches.match("./index.html")) || (await caches.match("./")) : undefined);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok && res.type === "basic") {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}
