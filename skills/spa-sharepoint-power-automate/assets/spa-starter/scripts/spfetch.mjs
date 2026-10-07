#!/usr/bin/env node
// spfetch: fetch con reintento que respeta Retry-After ante 429/503.
// Skill §23.4. Sin dependencias (Node >= 18). Exportable y ejecutable.
//
// Como modulo:
//   import { spFetch } from "./spfetch.mjs";
//   const res = await spFetch(url, { headers }, { maxAttempts: 5 });
//
// Por CLI: node scripts/spfetch.mjs --help
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const RETRY_STATUSES = new Set([429, 503]);

/** Retry-After puede ser segundos o una fecha HTTP. Devuelve segundos o undefined. */
/** true si la URL es HTTPS y el host es de SharePoint Online (incluye nubes soberanas: .us, .cn, .de y DoD `sharepoint-mil.us`). */
export function isSharePointHttps(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /(^|\.)(sharepoint\.(com|us|cn|de)|sharepoint-mil\.us)$/i.test(u.hostname);
  } catch {
    return false;
  }
}

export function parseRetryAfterSeconds(value, nowMs = Date.now()) {
  if (value == null || String(value).trim() === "") return undefined;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, secs);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, (date - nowMs) / 1000);
}

export class ThrottledError extends Error {
  constructor(url, attempts, status) {
    super(`Throttled (HTTP ${status}) tras ${attempts} intento(s): ${url}`);
    this.name = "ThrottledError";
    this.attempts = attempts;
    this.status = status;
  }
}

/**
 * fetch que reintenta SOLO ante 429/503, esperando `Retry-After` (o un backoff
 * lineal 5s, 10s... si no viene). Reintentar de inmediato EMPEORA el bloqueo:
 * las solicitudes limitadas tambien cuentan. Cualquier otro status (incluso 4xx/5xx)
 * se devuelve tal cual para que el llamador decida. Agotados los intentos, lanza.
 *
 * @param {string | URL} url
 * @param {RequestInit} [opts]
 * @param {{maxAttempts?: number, fallbackWaitSeconds?: number, maxWaitSeconds?: number,
 *          sleep?: (ms:number)=>Promise<void>, fetchImpl?: typeof fetch,
 *          onRetry?: (info:{attempt:number,status:number,waitMs:number})=>void}} [config]
 * @returns {Promise<Response>}
 */
export async function spFetch(url, opts = {}, config = {}) {
  const {
    maxAttempts = 5,
    fallbackWaitSeconds = 5,
    maxWaitSeconds = 300,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    fetchImpl = fetch,
    onRetry,
  } = config;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("maxAttempts debe ser un entero >= 1");
  }

  let lastStatus = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetchImpl(url, opts);
    if (!RETRY_STATUSES.has(res.status)) return res;
    lastStatus = res.status;
    if (attempt === maxAttempts) break; // no esperar de mas si ya no hay otro intento

    const fromHeader = parseRetryAfterSeconds(res.headers.get("retry-after"));
    const waitSeconds = Math.min(fromHeader ?? fallbackWaitSeconds * attempt, maxWaitSeconds);
    onRetry?.({ attempt, status: res.status, waitMs: waitSeconds * 1000 });
    await res.arrayBuffer().catch(() => {}); // liberar la conexion antes de dormir
    await sleep(waitSeconds * 1000);
  }
  throw new ThrottledError(String(url), maxAttempts, lastStatus);
}

// ------------------------------------------------------------------- CLI ----

const HELP = `spfetch - fetch con reintento (respeta Retry-After en 429/503)

Uso:
  node scripts/spfetch.mjs <url> [opciones]

Opciones:
  --method <M>          Metodo HTTP (default GET)
  --header "K: V"       Cabecera (repetible)
  --body <archivo|->    Cuerpo desde un archivo, o "-" para stdin
  --max-attempts <n>    Intentos maximos (default 5)
  --max-chars <n>       Largo maximo del cuerpo impreso (default 2000)
  --help                Esta ayuda

Entorno:
  SP_TOKEN              Si esta definido, agrega "Authorization: Bearer <token>"

Salida: imprime "HTTP <status>" y el cuerpo truncado. Codigo de salida 0 si 2xx,
1 si no, 2 si el uso es incorrecto.

Ejemplo:
  SP_TOKEN=... node scripts/spfetch.mjs "https://<tenant>.sharepoint.com/sites/<sitio>/_api/web/title" \\
    --header "Accept: application/json;odata=nometadata"`;

function parseArgs(argv) {
  const out = { headers: {}, method: "GET", maxAttempts: 5, maxChars: 2000, url: undefined, body: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`Falta el valor de ${a}`);
      return argv[++i];
    };
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--method") out.method = next().toUpperCase();
    else if (a === "--header") {
      const h = next();
      const idx = h.indexOf(":");
      if (idx < 1) throw new Error(`Cabecera invalida (usa "K: V"): ${h}`);
      out.headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    } else if (a === "--body") out.body = next();
    else if (a === "--max-attempts") out.maxAttempts = Number(next());
    else if (a === "--max-chars") out.maxChars = Number(next());
    else if (a.startsWith("-")) throw new Error(`Opcion desconocida: ${a}`);
    else if (!out.url) out.url = a;
    else throw new Error(`Argumento inesperado: ${a}`);
  }
  return out;
}

export async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error(`Error: ${e.message}\n\n${HELP}`);
    return 2;
  }
  if (args.help) {
    console.log(HELP);
    return 0;
  }
  if (!args.url) {
    console.error(`Error: falta <url>\n\n${HELP}`);
    return 2;
  }
  if (!Number.isInteger(args.maxAttempts) || args.maxAttempts < 1) {
    console.error("Error: --max-attempts debe ser un entero >= 1");
    return 2;
  }

  const headers = { ...args.headers };
  if (process.env.SP_TOKEN && !Object.keys(headers).some((k) => k.toLowerCase() === "authorization")) {
    // El token NUNCA se manda a un host que no sea de SharePoint (una URL copiada o mal escrita
    // filtraria el bearer). Para otro destino, pasa la cabecera Authorization a mano (--header).
    if (!isSharePointHttps(args.url)) {
      console.error("Error: SP_TOKEN solo se adjunta a URLs https de SharePoint (*.sharepoint.com/.us/.cn/.de). " +
        "Para otro destino, pasa la cabecera Authorization a mano.");
      return 2;
    }
    headers.Authorization = `Bearer ${process.env.SP_TOKEN}`;
  }
  const opts = { method: args.method, headers };
  if (args.body !== undefined) opts.body = readFileSync(args.body === "-" ? 0 : args.body);

  try {
    const res = await spFetch(args.url, opts, {
      maxAttempts: args.maxAttempts,
      onRetry: ({ attempt, status, waitMs }) =>
        console.error(`[spfetch] intento ${attempt}: HTTP ${status}, espero ${Math.round(waitMs / 1000)} s`),
    });
    const text = await res.text();
    console.log(`HTTP ${res.status}`);
    console.log(text.length > args.maxChars ? `${text.slice(0, args.maxChars)}... [truncado]` : text);
    return res.status >= 200 && res.status < 300 ? 0 : 1;
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
