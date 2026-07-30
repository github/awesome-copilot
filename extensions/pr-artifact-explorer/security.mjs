export const CAPABILITY_TOKEN_HEADER = "x-pr-artifact-explorer-token";

export function isCanonicalHost(req, canonicalHost) {
  return (
    String(req.headers.host ?? "").toLowerCase() ===
    String(canonicalHost ?? "").toLowerCase()
  );
}

export function isCrossSiteRequest(req, canonicalOrigin) {
  const origin = req.headers.origin;
  if (origin) {
    if (origin === canonicalOrigin) return false;
    if (origin === "null") return true;
    if (/^https?:\/\//i.test(origin)) return true;
    return false;
  }
  const site = req.headers["sec-fetch-site"];
  return site === "cross-site" || site === "same-site";
}

export function requiresCapabilityToken(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/content/") ||
    pathname === "/events"
  );
}

export function hasCapabilityToken(req, url, expectedToken) {
  if (!expectedToken) return false;
  const header = req.headers[CAPABILITY_TOKEN_HEADER];
  const headerToken = Array.isArray(header) ? header[0] : header;
  if (headerToken === expectedToken) return true;
  const allowsQueryToken =
    url.pathname.startsWith("/content/") || url.pathname === "/events";
  return allowsQueryToken && url.searchParams.get("token") === expectedToken;
}
