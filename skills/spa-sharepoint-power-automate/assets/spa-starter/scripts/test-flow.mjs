#!/usr/bin/env node
// test-flow: envia un payload de ejemplo al flow (trigger HTTP) y reporta el resultado.
// Skill §8 (contrato) y §9. Sin dependencias (Node >= 18).
// La URL y la clave se leen SOLO del entorno: nunca se hardcodean ni se commitean.
import { pathToFileURL } from "node:url";

const HELP = `test-flow - envia un payload de ejemplo al flow de Power Automate

Uso:
  FLOW_URL="<url del trigger>" APP_KEY="<clave>" node scripts/test-flow.mjs [opciones]

Entorno:
  FLOW_URL   (obligatoria) URL del trigger "When a HTTP request is received"
  APP_KEY    (opcional)    valor de la cabecera x-app-key (Check_key del flow)

Opciones:
  --with-attachment   incluye un adjunto de prueba (PNG 1x1) en attachments[]
  --folio <texto>     folio a usar (default TEST-<fecha>-<aleatorio>)
  --timeout <ms>      timeout de la solicitud (default 130000)
  --max-chars <n>     largo maximo del cuerpo impreso (default 500)
  --help              esta ayuda

Salida: status, latencia y cuerpo truncado. Codigo de salida:
  0 = respuesta 2xx   1 = respuesta no-2xx / error de red / timeout   2 = uso incorrecto

Interpretacion rapida: 401/403 -> trigger en "Any user in my tenant" (debe ser Anyone)
o x-app-key incorrecta; 429 -> demasiadas solicitudes; 502/504 -> el flow supero 120 s.`;

/** PNG 1x1 transparente, base64 (sin prefijo data:). */
export const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export function buildSamplePayload({ folio, withAttachment = false, now = new Date() } = {}) {
  const f =
    folio ?? `TEST-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return {
    folio: f,
    fechaEnvio: now.toISOString(),
    descripcion: "Envio de prueba desde scripts/test-flow.mjs",
    patente: "ABC123",
    kilometraje: 12345,
    attachments: withAttachment ? [{ name: `prueba_${f}.png`, contentBase64: TINY_PNG_BASE64 }] : [],
  };
}

function parseArgs(argv) {
  const out = { withAttachment: false, folio: undefined, timeout: 130_000, maxChars: 500 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`Falta el valor de ${a}`);
      return argv[++i];
    };
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--with-attachment") out.withAttachment = true;
    else if (a === "--folio") out.folio = next();
    else if (a === "--timeout") out.timeout = Number(next());
    else if (a === "--max-chars") out.maxChars = Number(next());
    else throw new Error(`Opcion desconocida: ${a}`);
  }
  return out;
}

export async function main(argv = process.argv.slice(2), env = process.env) {
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
  const url = env.FLOW_URL;
  if (!url) {
    console.error(`Error: falta la variable de entorno FLOW_URL\n\n${HELP}`);
    return 2;
  }
  if (!Number.isFinite(args.timeout) || args.timeout <= 0) {
    console.error("Error: --timeout debe ser un numero > 0");
    return 2;
  }

  let host;
  try {
    host = new URL(url).host; // se imprime solo el host: la URL lleva la firma `sig`
  } catch {
    console.error("Error: FLOW_URL no es una URL valida");
    return 2;
  }

  const headers = { "Content-Type": "application/json" };
  if (env.APP_KEY) headers["x-app-key"] = env.APP_KEY;
  else console.error("[aviso] APP_KEY no definida: no se envia x-app-key (fallara si el flow tiene Check_key)");

  const payload = buildSamplePayload({ folio: args.folio, withAttachment: args.withAttachment });
  console.log(`POST https://${host}/... folio=${payload.folio} adjuntos=${payload.attachments.length}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeout);
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const ms = Math.round(performance.now() - t0);
    const text = await res.text();
    console.log(`status:   ${res.status}`);
    console.log(`latencia: ${ms} ms`);
    console.log(`cuerpo:   ${text.length > args.maxChars ? `${text.slice(0, args.maxChars)}... [truncado]` : text || "(vacio)"}`);
    if (res.status === 401 || res.status === 403) {
      console.error("[pista] 401/403: revisa 'Who can trigger the flow' = Anyone y el valor de APP_KEY.");
    } else if (res.status === 502 || res.status === 504) {
      console.error("[pista] 502/504: probable limite de 120 s; la accion Response debe ir antes de los bucles.");
    }
    return res.status >= 200 && res.status < 300 ? 0 : 1;
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    const timedOut = e?.name === "AbortError";
    console.error(`${timedOut ? "timeout" : "error de red"} tras ${ms} ms: ${e?.message ?? e}`);
    return 1;
  } finally {
    clearTimeout(timer);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
