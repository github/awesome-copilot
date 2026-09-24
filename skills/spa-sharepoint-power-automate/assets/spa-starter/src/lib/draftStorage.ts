/**
 * Borrador del formulario en localStorage. Skill §6.
 *
 * Reglas que cumple:
 *  - Clave VERSIONADA. Al cambiar la forma del borrador se sube DRAFT_VERSION:
 *    invalidar es mas seguro que migrar formas complejas.
 *  - Purga de claves legacy en cada load/save/clear.
 *  - Todo va en try/catch: localStorage puede lanzar (modo privado, cuota,
 *    politicas del navegador) o no existir. Un fallo NUNCA rompe la app.
 *  - El borrador NO se borra hasta confirmar el exito del envio
 *    (ver `shouldClearDraft`).
 *  - El borrador CADUCA (DRAFT_MAX_AGE_MS) y la UI ofrece "borrar mis datos" (clear()).
 *
 * Las fotos NO se guardan aca (blobs grandes, cuota de ~5 MB): solo texto y firma.
 */

export const DRAFT_VERSION = 1;
export const DRAFT_KEY = `app-draft-v${DRAFT_VERSION}`;

/** Un borrador abandonado (con firma y datos personales) caduca: en un dispositivo compartido
 *  no puede quedar indefinidamente (skill §33.3). Default 7 dias. */
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Claves de versiones anteriores. Agregar aca la clave vieja al subir DRAFT_VERSION. */
export const LEGACY_KEYS: readonly string[] = ["app-draft", "app-draft-v0"];

/**
 * localStorage es por ORIGEN, no por ruta: varios proyectos de GitHub Pages bajo el mismo `*.github.io`
 * compartirian (y se pisarian o purgarian) las claves genericas. Por eso todas las claves llevan el
 * camino base de la app (p. ej. "/mi-repo/"), que en GitHub Pages es el nombre del repositorio.
 */
export function draftNamespace(): string {
  try {
    return typeof document === "undefined" ? "/" : new URL(".", document.baseURI).pathname;
  } catch {
    return "/";
  }
}

export function defaultDraftKey(namespace: string = draftNamespace()): string {
  return `${DRAFT_KEY}:${namespace}`;
}

export function defaultLegacyKeys(namespace: string = draftNamespace()): string[] {
  return LEGACY_KEYS.map((k) => `${k}:${namespace}`);
}

/** Subconjunto de la API de Storage que usamos (facilita simularlo en tests). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface Envelope<T> {
  v: number;
  ts: number;
  data: T;
}

export interface DraftStore<T> {
  /** Devuelve el borrador guardado o null (inexistente, corrupto, version vieja, storage caido). */
  load(): T | null;
  /** true si se pudo guardar. false si el storage fallo (cuota, bloqueado). */
  save(data: T): boolean;
  /** true si se pudo borrar. Llamar SOLO tras confirmar exito (ver shouldClearDraft). */
  clear(): boolean;
  /** Borra las claves de versiones anteriores. */
  purgeLegacy(): void;
}

export interface DraftStoreOptions {
  /** Storage a usar. Por defecto window.localStorage (si es accesible). */
  storage?: StorageLike | null;
  key?: string;
  legacyKeys?: readonly string[];
  now?: () => number;
  /** Vida maxima del borrador en ms. Pasado ese tiempo load() lo borra y devuelve null. */
  maxAgeMs?: number;
}

/** Acceder a `window.localStorage` puede lanzar SecurityError: se envuelve. */
export function getDefaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function createDraftStore<T>(options: DraftStoreOptions = {}): DraftStore<T> {
  const key = options.key ?? defaultDraftKey();
  const legacy = options.legacyKeys ?? defaultLegacyKeys();
  const now = options.now ?? Date.now;
  const maxAgeMs = options.maxAgeMs ?? DRAFT_MAX_AGE_MS;
  // `storage: null` explicito = sin storage (no caer al default).
  const getStorage = (): StorageLike | null =>
    options.storage === undefined ? getDefaultStorage() : options.storage;

  function purgeLegacy(): void {
    const s = getStorage();
    if (!s) return;
    for (const k of legacy) {
      try {
        s.removeItem(k);
      } catch {
        /* ignorar: purgar es best-effort */
      }
    }
  }

  return {
    purgeLegacy,

    load() {
      purgeLegacy(); // siempre antes de leer la clave nueva
      const s = getStorage();
      if (!s) return null;
      try {
        const raw = s.getItem(key);
        if (!raw) return null;
        const env = JSON.parse(raw) as Partial<Envelope<T>> | null;
        if (!env || typeof env !== "object" || env.v !== DRAFT_VERSION || !("data" in env)) {
          return null;
        }
        // Caducidad: sin `ts` valido o pasado el plazo, se borra y no se devuelve.
        if (typeof env.ts !== "number" || !Number.isFinite(env.ts) || now() - env.ts > maxAgeMs) {
          s.removeItem(key);
          return null;
        }
        return env.data as T;
      } catch {
        return null; // JSON corrupto o storage caido
      }
    },

    save(data) {
      purgeLegacy();
      const s = getStorage();
      if (!s) return false;
      try {
        const env: Envelope<T> = { v: DRAFT_VERSION, ts: now(), data };
        s.setItem(key, JSON.stringify(env));
        return true;
      } catch {
        return false; // QuotaExceededError, storage bloqueado, etc.
      }
    },

    clear() {
      purgeLegacy();
      const s = getStorage();
      if (!s) return false;
      try {
        s.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Regla de oro (skill §6): el borrador se borra SOLO tras un exito confirmado.
 * En modo demo no se envio nada, asi que tampoco se borra.
 */
export function shouldClearDraft(result: { ok: boolean; demo?: boolean }): boolean {
  return result.ok === true && result.demo !== true;
}
