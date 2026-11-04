/** The raw repository root (including revision) and the originating document. */
export interface MarkdownImageSource {
  rawBase: string;
  filePath: string;
}

/**
 * Resolve only embedded images, never ordinary links. A missing source is an
 * error for relative images, not permission to use the current website route.
 */
export function resolveMarkdownImage(
  value: string,
  source: MarkdownImageSource | null,
): string {
  const url = value.trim();
  if (!url || /[\u0000-\u001f\u007f\\]/.test(url)) {
    throw new Error("Empty image URL or unsupported control characters/backslashes");
  }
  if (/^https?:\/\//i.test(url)) {
    const absolute = new URL(url);
    // Only a full commit SHA makes the blob/ref boundary unambiguous.
    if (absolute.origin === "https://github.com") {
      const blob = /^\/([^/]+\/[^/]+)\/blob\/([a-f0-9]{40})\/(.+)$/i.exec(
        absolute.pathname,
      );
      if (blob) {
        return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}${absolute.search}${absolute.hash}`;
      }
    }
    return url;
  }
  if (url.startsWith("//")) return new URL(`https:${url}`).href;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    throw new Error("Unsupported image URL scheme");
  }
  // Site-owned assets such as Learning Hub /images/... are not repo paths.
  if (url.startsWith("/")) return url;
  if (!source) throw new Error("Relative image has no document source");

  const base = new URL(`${source.rawBase.replace(/\/$/, "")}/`);
  if (
    base.origin !== "https://raw.githubusercontent.com" ||
    base.search || base.hash || base.username || base.password ||
    !/^\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\/[^/]+\/$/.test(base.pathname)
  ) {
    throw new Error("Image source must specify a raw GitHub repository and revision");
  }
  const segments = source.filePath.replace(/\\/g, "/").split("/");
  if (segments.some((part) => !part || part === "." || part === "..")) {
    throw new Error("Image source must have a repository-relative document path");
  }
  const document = new URL(segments.map(encodeURIComponent).join("/"), base);
  const resolved = new URL(url, document);
  if (!resolved.href.startsWith(base.href)) {
    throw new Error("Relative image escapes the source repository revision");
  }
  return resolved.href;
}

/** Tokenize srcset URLs before descriptors; commas inside a URL are legal. */
export function resolveMarkdownSrcset(
  value: string,
  source: MarkdownImageSource | null,
): string {
  const candidates: string[] = [];
  let rest = value;
  while (rest.trim()) {
    rest = rest.replace(/^[\s,]+/, "");
    if (!rest) break;
    const token = /^[^\s]+/.exec(rest)![0];
    rest = rest.slice(token.length);
    let url = token;
    let descriptor = "";
    if (url.endsWith(",")) {
      url = url.replace(/,+$/, "");
    } else {
      const end = rest.indexOf(",");
      descriptor = (end < 0 ? rest : rest.slice(0, end)).trim();
      rest = end < 0 ? "" : rest.slice(end + 1);
    }
    if (descriptor && !/^(?:[1-9]\d*w|(?:\d+(?:\.\d+)?|\.\d+)x)$/.test(descriptor)) {
      throw new Error("Unsupported image srcset descriptor");
    }
    candidates.push(
      `${resolveMarkdownImage(url, source)}${descriptor ? ` ${descriptor}` : ""}`,
    );
  }
  return candidates.join(", ");
}
