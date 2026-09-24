#!/usr/bin/env node
// sp-upload-test-file: sube un PDF de prueba a una biblioteca de SharePoint por REST.
// Sirve para disparar un flow "cuando se crea un archivo" con un archivo NUEVO y controlado
// (skill §28.7). Sin dependencias (Node >= 18).
//
// NO se ejecuto contra un tenant real al escribirlo: probalo primero en una biblioteca de prueba.
import { pathToFileURL } from "node:url";
import { spFetch } from "./spfetch.mjs";

const HELP = `sp-upload-test-file - sube un PDF minimo de prueba a SharePoint (REST, Files/add)

Uso:
  SP_TOKEN="<bearer>" SITE_URL="https://<tenant>.sharepoint.com/sites/<sitio>" \\
  FOLDER="/sites/<sitio>/Shared Documents/<carpeta>" node scripts/sp-upload-test-file.mjs [opciones]

Entorno (obligatorio):
  SP_TOKEN   token de acceso (Bearer) con permiso de escritura en la biblioteca
  SITE_URL   URL del sitio, sin barra final
  FOLDER     ruta relativa al servidor de la carpeta destino

Opciones:
  --name <archivo.pdf>   nombre del archivo (default prueba-<timestamp>.pdf: siempre NUEVO)
  --dry-run              muestra que haria (URL, tamano) sin llamar a SharePoint
  --help                 esta ayuda

Codigo de salida: 0 = subido (2xx), 1 = error, 2 = uso incorrecto.
Nota (Git Bash en Windows): usa MSYS_NO_PATHCONV=1 delante del comando, o Git Bash convierte FOLDER ("/sites/...") en una ruta de disco.
Nota: mover o sincronizar un archivo NO dispara el flow; por eso cada corrida sube uno nuevo.`;

/** PDF valido y minimo (una pagina en blanco), con tabla xref correcta, generado en memoria. */
export function buildMinimalPdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

/** Arma la URL de Files/add. Las comillas simples OData se duplican; luego se codifica. */
export function buildUploadUrl(siteUrl, folder, fileName) {
  // Se conservan las '/' de la ruta; el resto (espacios, #, &, %, acentos) se codifica.
  const odata = (s) => encodeURIComponent(s.replace(/'/g, "''")).replaceAll("%2F", "/");
  return (
    `${siteUrl.replace(/\/+$/, "")}/_api/web/GetFolderByServerRelativeUrl('${odata(folder)}')` +
    `/Files/add(url='${odata(fileName)}',overwrite=true)`
  );
}

function parseArgs(argv) {
  const out = { name: undefined, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--name") {
      if (i + 1 >= argv.length) throw new Error("Falta el valor de --name");
      out.name = argv[++i];
    } else throw new Error(`Opcion desconocida: ${a}`);
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
  const { SP_TOKEN, SITE_URL, FOLDER } = env;
  const required = args.dryRun ? ["SITE_URL", "FOLDER"] : ["SP_TOKEN", "SITE_URL", "FOLDER"];
  const missing = required.filter((k) => !env[k]);
  if (missing.length) {
    console.error(`Error: faltan variables de entorno: ${missing.join(", ")}\n\n${HELP}`);
    return 2;
  }

  const name = args.name ?? `prueba-${Date.now()}.pdf`;
  const pdf = buildMinimalPdf();
  const url = buildUploadUrl(SITE_URL, FOLDER, name);

  console.log(`archivo: ${name} (${pdf.length} bytes)`);
  console.log(`destino: ${url}`);
  if (args.dryRun) {
    console.log("--dry-run: no se llamo a SharePoint.");
    return 0;
  }

  try {
    // Con token Bearer no hace falta digest (X-RequestDigest). spFetch respeta Retry-After ante 429/503.
    const res = await spFetch(
      url,
      {
        method: "POST",
        body: pdf,
        headers: {
          Authorization: `Bearer ${SP_TOKEN}`,
          Accept: "application/json;odata=nometadata",
          "Content-Type": "application/pdf",
        },
      },
      {
        maxAttempts: 5,
        onRetry: ({ attempt, status, waitMs }) =>
          console.error(`[reintento ${attempt}] HTTP ${status}, espero ${Math.round(waitMs / 1000)} s`),
      },
    );
    const text = await res.text();
    console.log(`status: ${res.status}`);
    console.log(text.slice(0, 300));
    if (res.ok) console.log("Listo. Espera el sondeo del disparador (unos minutos) o reenvia una corrida (skill §28.6-28.7).");
    return res.ok ? 0 : 1;
  } catch (e) {
    console.error(`Error: ${e.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
