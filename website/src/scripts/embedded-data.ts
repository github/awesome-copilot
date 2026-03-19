const embeddedDataCache = new Map<string, unknown>();

export function getEmbeddedDataElementId(filename: string): string {
  return `page-data-${filename.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

export function serializeEmbeddedData(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function getEmbeddedData<T>(filename: string): T | null {
  if (typeof document === "undefined") return null;

  if (embeddedDataCache.has(filename)) {
    return embeddedDataCache.get(filename) as T;
  }

  const element = document.getElementById(getEmbeddedDataElementId(filename));
  if (!(element instanceof HTMLScriptElement)) return null;

  try {
    const data = JSON.parse(element.textContent || "null") as T;
    embeddedDataCache.set(filename, data);
    return data;
  } catch (error) {
    console.error(`Error parsing embedded data for ${filename}:`, error);
    return null;
  }
}
