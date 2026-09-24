/**
 * Cliente del flow de Power Automate (trigger HTTP). Skill §2 (modo demo),
 * §8 (contrato), §9 (Content-Type, 401/403), §22.4 (idempotencia y reintentos).
 *
 * submit() NUNCA lanza por errores esperados: devuelve una union discriminada
 * `{ ok: true, ... } | { ok: false, error }` para que la UI decida (y para que
 * "borrar el borrador solo si ok" sea imposible de olvidar).
 */
import {
  DEFAULT_MAX_PAYLOAD_BYTES,
  FLOW_MAX_REQUEST_BYTES,
  checkPayloadBudget,
  formatBytes,
  stripDataUrlPrefix,
  type Attachment,
} from "./imageUtils";
import { isValidSignature } from "./signature";

export type { Attachment } from "./imageUtils";

// ------------------------------------------------------------------ tipos ---

/** Contrato SPA -> flow. Ajustalo a tu formulario (skill §8). */
export interface Payload {
  /** Generado en el CLIENTE: clave de idempotencia (skill §22.4). Va a Title. */
  folio: string;
  /** Informativo. Para hechos con consecuencia economica la hora la pone el flow (utcNow()). */
  fechaEnvio: string;
  descripcion: string;
  patente: string;
  /** number o null; nunca "" (la columna Number de SharePoint lo rechaza). */
  kilometraje: number | null;
  /** Orden por convencion: firma primero, luego fotos. */
  attachments: Attachment[];
}

export interface BuildPayloadInput {
  folio: string;
  descripcion: string;
  patente: string;
  kilometraje: number | undefined | null;
  /** dataURL PNG del canvas de firma (con prefijo). */
  signatureDataUrl?: string | null;
  /** Fotos YA comprimidas y en base64 sin prefijo (ver prepareImageAttachments). */
  photos?: readonly Attachment[];
  now?: () => Date;
}

export type SubmitErrorKind =
  | "network" //          fetch lanzo: sin conexion, CORS, flow apagado, DNS
  | "timeout" //          el cliente abandono la espera (AbortController)
  | "auth" //             401/403: trigger mal configurado o x-app-key incorrecta
  | "throttled" //        429
  | "server" //           5xx (salvo 502/504)
  | "gateway-timeout" //  502/504: probable limite de 120 s del flow
  | "payload-too-large" // 413 o presupuesto local excedido
  | "client" //           otros 4xx (400, 404, 409...)
  | "aborted"; //         cancelado por el llamador

export interface SubmitError {
  kind: SubmitErrorKind;
  status?: number;
  /** Mensaje accionable para mostrar al usuario. */
  message: string;
  /** true = tiene sentido ofrecer "Reintentar" (con el MISMO folio). */
  retryable: boolean;
  /** ms sugeridos por Retry-After (si vino). */
  retryAfterMs?: number;
  /** Fragmento de la respuesta, para depurar (no mostrar tal cual). */
  detail?: string;
}

export interface SubmitSuccess {
  ok: true;
  /** true = modo demo: NO se envio nada. */
  demo: boolean;
  folio: string;
  /** Intentos usados (1 = sin reintentos). */
  attempts: number;
}

export interface SubmitFailure {
  ok: false;
  folio: string;
  attempts: number;
  error: SubmitError;
}

export type SubmitResult = SubmitSuccess | SubmitFailure;

export interface SubmitOptions {
  /** Por defecto import.meta.env.VITE_POWER_AUTOMATE_URL. */
  url?: string;
  /** Por defecto import.meta.env.VITE_APP_KEY. */
  appKey?: string;
  /** Inyectable para tests. Por defecto globalThis.fetch. */
  fetchImpl?: typeof fetch;
  /**
   * Timeout por intento. Default 130 s: apenas mas que el limite de 120 s del
   * flow, para que un 502/504 del gateway llegue antes que nuestro abort.
   */
  timeoutMs?: number;
  /** Reintentos ADEMAS del primer intento, solo para 429/500/503. Default 2. */
  maxRetries?: number;
  /** Base del backoff exponencial cuando no hay Retry-After. Default 1000 ms. */
  baseDelayMs?: number;
  /** Si Retry-After supera esto, no se espera: se devuelve el error. Default 30 s. */
  maxWaitMs?: number;
  /** Tope del JSON en bytes. Default DEFAULT_MAX_PAYLOAD_BYTES. */
  maxPayloadBytes?: number;
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
}

// ---------------------------------------------------------------- config ----

export const DEFAULT_TIMEOUT_MS = 130_000;
export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_BASE_DELAY_MS = 1_000;
export const DEFAULT_MAX_WAIT_MS = 30_000;

/**
 * Se lee en cada llamada (no en el top-level del modulo): skill §19.1.
 * Recordar: TODO VITE_* es publico en el bundle.
 */
export function getFlowConfig(): { url: string; appKey: string } {
  return {
    url: String(import.meta.env.VITE_POWER_AUTOMATE_URL ?? ""),
    appKey: String(import.meta.env.VITE_APP_KEY ?? ""),
  };
}

export function isDemoMode(url: string = getFlowConfig().url): boolean {
  return url.trim() === "";
}

// ----------------------------------------------------------------- folio ----

const pad = (n: number, w = 2): string => String(n).padStart(w, "0");

function defaultRandom(): number {
  const c = globalThis.crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
  return Math.random();
}

/**
 * Folio generado en el cliente: `APP-20260924-153012-K7Q2XA`.
 * Se guarda en el borrador y se REUSA al reintentar (skill §22.4).
 */
export function generateFolio(
  prefix = "APP",
  now: Date = new Date(),
  random: () => number = defaultRandom,
): string {
  const date = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
  const time = `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  let rand = "";
  while (rand.length < 6) rand += Math.floor(random() * 36 ** 6).toString(36).toUpperCase();
  return `${prefix}-${date}-${time}-${rand.slice(0, 6).padStart(6, "0")}`;
}

// --------------------------------------------------------------- payload ----

/** Normaliza y arma el payload tipado. Pura (salvo `now`). */
export function buildPayload(input: BuildPayloadInput): Payload {
  const now = input.now ?? (() => new Date());
  const attachments: Attachment[] = [];
  if (isValidSignature(input.signatureDataUrl)) {
    attachments.push({
      name: `firma_${input.folio}.png`,
      contentBase64: stripDataUrlPrefix(input.signatureDataUrl),
    });
  }
  attachments.push(...(input.photos ?? []));

  return {
    folio: input.folio,
    fechaEnvio: now().toISOString(),
    descripcion: input.descripcion.trim(),
    patente: input.patente.toUpperCase().replace(/[\s-]/g, ""),
    kilometraje:
      typeof input.kilometraje === "number" && Number.isFinite(input.kilometraje)
        ? input.kilometraje
        : null,
    attachments,
  };
}

// ---------------------------------------------------------------- errores ---

/** Mensajes en un solo lugar (faciles de traducir/ajustar). */
export const ERROR_MESSAGES = {
  network:
    "No se pudo conectar con el servidor. Revisa tu conexion e intenta de nuevo. " +
    "Tus datos siguen guardados en este dispositivo.",
  timeout:
    "El servidor tardo demasiado en responder. Puede que el envio se haya procesado: " +
    "reintenta (se usa el mismo folio, asi se detecta un duplicado).",
  auth:
    "El flow rechazo la solicitud (401/403). Revisa en Power Automate que el trigger " +
    "tenga 'Who can trigger the flow' = Anyone (los flows nuevos vienen con 'Any user in my tenant') " +
    "y que VITE_APP_KEY coincida con el valor de la condicion Check_key.",
  throttled: "El servidor esta recibiendo demasiadas solicitudes (429). Espera unos segundos y reintenta.",
  server: "El servidor fallo (5xx). Reintenta en unos minutos; si persiste, avisa al administrador del flow.",
  gatewayTimeout:
    "Error 502/504: probablemente el flow supero el limite de 120 s. Envia menos o mas livianas las fotos, " +
    "y verifica que la accion Response este ANTES de los bucles del flow.",
  tooLarge: "El envio es demasiado grande. Quita algunas fotos o usa imagenes mas chicas.",
  client: "El flow rechazo el envio. Revisa los datos e intenta de nuevo.",
  aborted: "Envio cancelado.",
} as const;

/** Retry-After: segundos (entero) o fecha HTTP. Devuelve ms o undefined. */
export function parseRetryAfter(value: string | null, nowMs: number = Date.now()): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, Math.round(secs * 1000));
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - nowMs);
}

/** Traduce un status HTTP a un SubmitError (o null si es 2xx). */
export function classifyStatus(
  status: number,
  retryAfterMs?: number,
  detail?: string,
): SubmitError | null {
  if (status >= 200 && status < 300) return null;
  const base = { status, ...(retryAfterMs !== undefined ? { retryAfterMs } : {}), ...(detail ? { detail } : {}) };
  if (status === 401 || status === 403) return { kind: "auth", message: ERROR_MESSAGES.auth, retryable: false, ...base };
  if (status === 413) return { kind: "payload-too-large", message: ERROR_MESSAGES.tooLarge, retryable: false, ...base };
  if (status === 429) return { kind: "throttled", message: ERROR_MESSAGES.throttled, retryable: true, ...base };
  if (status === 502 || status === 504) {
    return { kind: "gateway-timeout", message: ERROR_MESSAGES.gatewayTimeout, retryable: true, ...base };
  }
  if (status >= 500) return { kind: "server", message: ERROR_MESSAGES.server, retryable: true, ...base };
  return { kind: "client", message: ERROR_MESSAGES.client, retryable: false, ...base };
}

/** Solo 429 / 500 / 503 se reintentan solos. 502/504 NO: repetir un envio que ya
 *  paso los 120 s vuelve a fallar y puede duplicar trabajo (queda a criterio del usuario). */
const AUTO_RETRY_STATUSES = new Set([429, 500, 503]);

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ----------------------------------------------------------------- submit ---

export async function submit(payload: Payload, options: SubmitOptions = {}): Promise<SubmitResult> {
  const cfg = getFlowConfig();
  const url = options.url ?? cfg.url;
  const appKey = options.appKey ?? cfg.appKey;
  const folio = payload.folio;

  // Modo demo (skill §2): no hay URL -> no hay POST.
  if (isDemoMode(url)) {
    console.warn("[demo] VITE_POWER_AUTOMATE_URL no esta definida: no se envia nada.");
    return { ok: true, demo: true, folio, attempts: 0 };
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const sleep = options.sleep ?? defaultSleep;

  const body = JSON.stringify(payload);

  // Guarda local ANTES de enviar: mejor un mensaje claro que un 502 opaco (skill §8).
  const budget = checkPayloadBudget(
    [new TextEncoder().encode(body).length],
    Math.min(options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES, FLOW_MAX_REQUEST_BYTES),
  );
  if (!budget.ok) {
    return fail(folio, 0, {
      kind: "payload-too-large",
      message: `${ERROR_MESSAGES.tooLarge} (${formatBytes(budget.totalBytes)} de ${formatBytes(budget.maxBytes)} permitidos)`,
      retryable: false,
    });
  }

  // application/json es OBLIGATORIO: con text/plain el flow ve un String y
  // triggerBody()?['folio'] falla (skill §9). El flow maneja el preflight CORS.
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (appKey) headers["x-app-key"] = appKey;

  let attempts = 0;
  for (;;) {
    attempts++;
    if (options.signal?.aborted) {
      return fail(folio, attempts, { kind: "aborted", message: ERROR_MESSAGES.aborted, retryable: true });
    }

    const attempt = await postOnce(fetchImpl, url, headers, body, timeoutMs, options.signal);
    if (attempt.type === "error") return fail(folio, attempts, attempt.error);

    const { response } = attempt;
    if (response.status >= 200 && response.status < 300) {
      // Si el flow NO tiene Response en alguna rama, Power Automate contesta 202 vacio:
      // para el cliente igual es "aceptado". El cuerpo no se usa: nada interno llega a la UI.
      return { ok: true, demo: false, folio, attempts };
    }

    const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
    const error = classifyStatus(response.status, retryAfterMs, await safeText(response))!;

    const canRetry = AUTO_RETRY_STATUSES.has(response.status) && attempts <= maxRetries;
    if (!canRetry) return fail(folio, attempts, error);

    // Respetar Retry-After; si no vino, backoff exponencial. Nunca reintentar de inmediato.
    const waitMs = retryAfterMs ?? baseDelayMs * 2 ** (attempts - 1);
    if (waitMs > maxWaitMs) return fail(folio, attempts, error);
    await sleep(waitMs);
  }
}

function fail(folio: string, attempts: number, error: SubmitError): SubmitFailure {
  return { ok: false, folio, attempts, error };
}

type Attempt = { type: "response"; response: Response } | { type: "error"; error: SubmitError };

async function postOnce(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number,
  external?: AbortSignal,
): Promise<Attempt> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onExternalAbort = (): void => controller.abort();
  external?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const response = await fetchImpl(url, { method: "POST", headers, body, signal: controller.signal });
    return { type: "response", response };
  } catch (err) {
    if (timedOut) {
      return { type: "error", error: { kind: "timeout", message: ERROR_MESSAGES.timeout, retryable: true } };
    }
    if (external?.aborted || (err instanceof DOMException && err.name === "AbortError")) {
      return { type: "error", error: { kind: "aborted", message: ERROR_MESSAGES.aborted, retryable: true } };
    }
    return {
      type: "error",
      error: {
        kind: "network",
        message: ERROR_MESSAGES.network,
        retryable: true,
        detail: err instanceof Error ? err.message : String(err),
      },
    };
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onExternalAbort);
  }
}

async function safeText(response: Response): Promise<string | undefined> {
  try {
    return (await response.text()).slice(0, 300) || undefined;
  } catch {
    return undefined;
  }
}
