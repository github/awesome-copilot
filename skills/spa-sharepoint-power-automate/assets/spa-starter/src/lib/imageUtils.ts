/**
 * Imagenes en el cliente: compresion + presupuesto de payload. Skill §5, §8 y §9.
 *
 * Por que: una foto de celular pesa 3-5 MB y base64 la infla ~33 %. El flow
 * tiene limites duros: ~100 MB de cuerpo y 120 s de respuesta (pasado eso, el
 * cliente ve 502/504). En la practica el TIEMPO pega antes que el tamano, asi
 * que se comprime fuerte y se limita el total antes de enviar.
 *
 * Todo lo "logico" (dimensiones, umbrales, presupuesto) son funciones puras
 * y estan testeadas. Solo `compressImage`/`blobToBase64` tocan APIs del navegador.
 */

export const DEFAULT_MAX_SIDE = 1280;
export const DEFAULT_QUALITY = 0.72;

/** Limite duro de Power Automate para el cuerpo de la solicitud HTTP. */
export const FLOW_MAX_REQUEST_BYTES = 100 * 1024 * 1024;
/** Limite de tiempo de respuesta del trigger HTTP (mas alla: 502/504). */
export const FLOW_RESPONSE_TIMEOUT_MS = 120_000;
/**
 * Tope PRACTICO del JSON completo. El skill (§8) recomienda "unos pocos MB":
 * con 1280 px / q0.72 cada foto pesa ~80-150 KB, asi que 10 MB da holgura.
 * Ajustalo a tu caso; nunca lo subas cerca de FLOW_MAX_REQUEST_BYTES.
 */
export const DEFAULT_MAX_PAYLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Un JPEG con calidad ~0.7 ronda 0.1-0.4 bytes/pixel. Por encima de este umbral
 * se considera "sin comprimir" aunque sea JPEG (ej: foto original de camara).
 */
export const COMPRESSED_MAX_BYTES_PER_PIXEL = 0.5;

export interface CompressOptions {
  maxSide?: number;
  quality?: number;
}

export interface ImageMeta {
  type: string;
  width: number;
  height: number;
  size: number;
}

export interface Attachment {
  name: string;
  /** base64 SIN prefijo `data:...;base64,` (el flow usa base64ToBinary). */
  contentBase64: string;
}

// ------------------------------------------------------------------ puro ---

/** Escala para que el lado mayor sea <= maxSide. Nunca agranda. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number = DEFAULT_MAX_SIDE,
): { width: number; height: number; scaled: boolean } {
  const longest = Math.max(width, height);
  if (!(longest > 0)) return { width: 0, height: 0, scaled: false };
  const ratio = Math.min(1, maxSide / longest);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    scaled: ratio < 1,
  };
}

/** Longitud en caracteres del base64 de `bytes` bytes (con padding). */
export function base64Length(bytes: number): number {
  return Math.ceil(bytes / 3) * 4;
}

/** Bytes aproximados que representa un base64 de `chars` caracteres. */
export function bytesFromBase64Length(chars: number): number {
  return Math.floor((chars * 3) / 4);
}

/**
 * Idempotencia: true si la imagen YA esta comprimida y no vale la pena
 * recomprimirla (recomprimir JPEG sobre JPEG solo pierde calidad).
 */
export function isAlreadyCompressed(
  meta: ImageMeta,
  opts: CompressOptions = {},
): boolean {
  const maxSide = opts.maxSide ?? DEFAULT_MAX_SIDE;
  if (meta.type !== "image/jpeg") return false;
  if (Math.max(meta.width, meta.height) > maxSide) return false;
  const pixels = meta.width * meta.height;
  return pixels > 0 && meta.size <= pixels * COMPRESSED_MAX_BYTES_PER_PIXEL;
}

/** Tipos que NO se tocan: SVG (vectorial) y GIF (puede ser animado). */
export function isCompressibleType(type: string): boolean {
  return type.startsWith("image/") && type !== "image/svg+xml" && type !== "image/gif";
}

export interface PayloadBudget {
  ok: boolean;
  totalBytes: number;
  maxBytes: number;
  overByBytes: number;
}

/**
 * Suma los tamanos (en bytes) y compara contra el tope. Pensado para llamarse
 * ANTES de enviar: es mejor bloquear con un mensaje claro que recibir un 502.
 */
export function checkPayloadBudget(
  sizesInBytes: readonly number[],
  maxBytes: number = DEFAULT_MAX_PAYLOAD_BYTES,
): PayloadBudget {
  const cap = Math.min(maxBytes, FLOW_MAX_REQUEST_BYTES);
  const totalBytes = sizesInBytes.reduce((a, b) => a + b, 0);
  return {
    ok: totalBytes <= cap,
    totalBytes,
    maxBytes: cap,
    overByBytes: Math.max(0, totalBytes - cap),
  };
}

/** 'data:image/png;base64,AAAA' -> 'AAAA'. Si no hay prefijo, devuelve igual. */
export function stripDataUrlPrefix(dataUrl: string): string {
  const i = dataUrl.indexOf(",");
  return dataUrl.startsWith("data:") && i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

/** Reemplaza (o agrega) la extension. 'IMG_1.HEIC' -> 'IMG_1.jpg'. */
export function withExtension(name: string, ext: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${ext}`;
}

/** MIME -> extension para el nombre del adjunto. Desconocido -> 'bin'. */
export function extensionFor(type: string): string {
  const sub = type.toLowerCase().split("/")[1] ?? "";
  if (sub === "jpeg" || sub === "jpg") return "jpg";
  return /^[a-z0-9]{2,5}$/.test(sub) ? sub : "bin";
}

/** Formato legible: 1536 -> '1.5 KB'. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --------------------------------------------------------------- navegador --

/** Salidas de compressImage: se marcan para no recomprimir (idempotencia). */
const alreadyProcessed = new WeakSet<Blob>();

/**
 * Comprime a JPEG con canvas. Idempotente: si ya esta comprimida (la salida de
 * una llamada anterior, o un JPEG chico) devuelve el mismo archivo.
 * Ante cualquier error devuelve el original (no bloquear al usuario).
 *
 * Se llama en DOS puntos (skill §5): al elegir el archivo y de nuevo al
 * armar el payload, como red de seguridad.
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  const maxSide = opts.maxSide ?? DEFAULT_MAX_SIDE;
  const quality = opts.quality ?? DEFAULT_QUALITY;

  if (alreadyProcessed.has(file) || !isCompressibleType(file.type)) return file;

  try {
    const bmp = await createImageBitmap(file);
    try {
      const meta: ImageMeta = {
        type: file.type,
        width: bmp.width,
        height: bmp.height,
        size: file.size,
      };
      if (isAlreadyCompressed(meta, { maxSide })) {
        alreadyProcessed.add(file);
        return file;
      }

      const { width, height } = fitWithin(bmp.width, bmp.height, maxSide);
      const blob = await drawToJpeg(bmp, width, height, quality);
      if (!blob) return file;

      // Si no ayudo (raro), quedarse con el original cuando ya era JPEG.
      if (blob.size >= file.size && file.type === "image/jpeg") {
        alreadyProcessed.add(file);
        return file;
      }
      const out = new File([blob], withExtension(file.name || "foto", "jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      alreadyProcessed.add(out);
      return out;
    } finally {
      bmp.close();
    }
  } catch {
    return file;
  }
}

async function drawToJpeg(
  bmp: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff"; // PNG con transparencia -> fondo blanco (no negro)
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bmp, 0, 0, width, height);
    return canvas.convertToBlob({ type: "image/jpeg", quality });
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bmp, 0, 0, width, height);
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
}

/** Blob -> base64 sin prefijo. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo"));
    reader.onload = () => resolve(stripDataUrlPrefix(String(reader.result ?? "")));
    reader.readAsDataURL(blob);
  });
}

export class PayloadTooLargeError extends Error {
  readonly budget: PayloadBudget;
  constructor(budget: PayloadBudget) {
    super(
      `Las fotos pesan ${formatBytes(budget.totalBytes)} y el maximo es ${formatBytes(budget.maxBytes)}. ` +
        `Quita algunas fotos o usa imagenes mas chicas.`,
    );
    this.name = "PayloadTooLargeError";
    this.budget = budget;
  }
}

/**
 * Capa 2 (red de seguridad): comprime de nuevo (no-op si ya estaba), convierte
 * a base64 y verifica el presupuesto ANTES de enviar. Lanza PayloadTooLargeError.
 */
export async function prepareImageAttachments(
  files: readonly File[],
  nameFor: (index: number, file: File) => string,
  opts: CompressOptions & { maxPayloadBytes?: number; reservedBytes?: number } = {},
): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (const [i, f] of files.entries()) {
    const compressed = await compressImage(f, opts);
    out.push({ name: nameFor(i, compressed), contentBase64: await blobToBase64(compressed) });
  }
  const budget = checkPayloadBudget(
    [opts.reservedBytes ?? 0, ...out.map((a) => a.contentBase64.length)],
    opts.maxPayloadBytes,
  );
  if (!budget.ok) throw new PayloadTooLargeError(budget);
  return out;
}
