// Operator-trusted runner: run only from a copy provisioned by the operator.
// Agents must not modify this file; request a reviewed change instead.

import { execFileSync } from "node:child_process";
import {
  constants,
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const HELPER = join(HERE, "x402socks.sh");
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_TOKEN_BYTES = 4096;
const CONTROL = /[\u0000-\u001F\u007F]/;
const EXIT_ID = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TOKEN_CHARS = /^[A-Za-z0-9_-]+$/;
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "content-encoding",
]);

class Stop extends Error {}

function stop(message) {
  throw new Stop(message);
}

function usage() {
  return "usage: node scripts/x402socks-browser.mjs <exit_id> <target_url> [--output <file>]";
}

function parseArgs(argv) {
  if (argv.length < 2) stop(usage());
  const exitId = argv[0];
  const target = argv[1];
  let output = null;
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] !== "--output" || output !== null || i + 1 >= argv.length) stop(usage());
    output = argv[++i];
    if (!output) stop(usage());
  }
  if (!EXIT_ID.test(exitId)) stop("error: invalid exit id");
  if (/\s|\\/.test(target) || CONTROL.test(target)) {
    stop("error: target URL failed strict validation");
  }
  return { exitId, target, output };
}

function assertTrustedHelper() {
  let st;
  try {
    st = lstatSync(HELPER);
  } catch {
    stop("error: helper is not available");
  }
  if (!st.isFile() || st.isSymbolicLink()
      || st.uid !== process.getuid() || (st.mode & 0o022) !== 0) {
    stop("error: helper is not an operator-trusted file");
  }
}

// The helper is the only component that talks to the provider for exit and token
// checks. Its output is deliberately discarded: only the exit status is trusted.
function helperStatus(args) {
  try {
    execFileSync(HELPER, args, {
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024,
      timeout: 30_000,
    });
    return 0;
  } catch (error) {
    return Number.isInteger(error?.status) ? error.status : 1;
  }
}

// Open with O_NOFOLLOW and validate the open descriptor, so the path cannot be
// swapped between a check and the read. No diagnostic includes the token.
function readToken() {
  const path = process.env.X402SOCKS_TOKEN_FILE;
  if (!path) stop("error: X402SOCKS_TOKEN_FILE is required");
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch {
    stop("error: token file is not a private regular file");
  }
  try {
    const st = fstatSync(fd);
    if (!st.isFile() || st.uid !== process.getuid()
        || (st.mode & 0o7000) !== 0 || ((st.mode & 0o777) & ~0o600) !== 0) {
      stop("error: token file is not a private regular file");
    }
    if (st.size === 0 || st.size > MAX_TOKEN_BYTES) {
      stop("error: token file failed strict validation");
    }
    const token = readFileSync(fd).toString("utf8");
    if (token.length === 0 || token.length > MAX_TOKEN_BYTES
        || CONTROL.test(token) || !TOKEN_CHARS.test(token)) {
      stop("error: token file failed strict validation");
    }
    return token;
  } finally {
    closeSync(fd);
  }
}

// Allowlist entries are exact lowercase hosts with an optional port. A bare host
// means the HTTPS default port, and an empty port suffix means the same.
function parseAllowlist() {
  const raw = process.env.X402SOCKS_ALLOWED_HOSTS ?? "";
  const entries = new Set();
  for (const item of raw.split(",")) {
    const value = item.trim();
    if (!value) continue;
    if (value.includes("[") || value.includes("]")) {
      stop("error: X402SOCKS_ALLOWED_HOSTS is invalid");
    }
    const parts = value.split(":");
    if (parts.length > 2 || !parts[0]) stop("error: X402SOCKS_ALLOWED_HOSTS is invalid");
    const host = parts[0];
    const port = parts.length === 2 ? (parts[1] || "443") : "443";
    if (host !== host.toLowerCase() || host.length > 253
        || !/^[a-z0-9.-]+$/.test(host) || CONTROL.test(host)) {
      stop("error: X402SOCKS_ALLOWED_HOSTS is invalid");
    }
    if (!/^[0-9]{1,5}$/.test(port)) stop("error: X402SOCKS_ALLOWED_HOSTS is invalid");
    const number = Number(port);
    if (number < 1 || number > 65535) stop("error: X402SOCKS_ALLOWED_HOSTS is invalid");
    entries.add(`${host}|${number}`);
  }
  if (entries.size === 0) stop("error: X402SOCKS_ALLOWED_HOSTS is empty");
  return entries;
}

// One rule for the initial target, every intercepted request, every redirect,
// and the final URL. It checks scheme, userinfo, fragment, host, and port.
function assertAllowedUrl(input, allowlist) {
  if (typeof input !== "string" || CONTROL.test(input) || /\s|\\/.test(input)) {
    stop("error: URL failed strict validation");
  }
  let url;
  try {
    url = new URL(input);
  } catch {
    stop("error: URL failed strict validation");
  }
  if (url.protocol !== "https:") {
    stop("error: target is not in X402SOCKS_ALLOWED_HOSTS");
  }
  if (url.username !== "" || url.password !== "") {
    stop("error: URL must not embed credentials");
  }
  if (url.hash !== "") stop("error: URL must not include a fragment");
  const host = url.hostname.toLowerCase();
  const port = String(url.port || 443);
  if (!allowlist.has(`${host}|${port}`)) {
    stop("error: target is not in X402SOCKS_ALLOWED_HOSTS");
  }
  return url;
}

async function fetchTarget({ exitId, target, output, token, allowlist }) {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    stop("error: Playwright is not available");
  }

  const proxyServer = `https://${exitId}.x402socks.com:3129`;
  let browser;
  try {
    browser = await chromium.launch({
      args: ["--disable-webrtc"],
      proxy: { server: proxyServer, username: token, password: token },
    });
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.route("**/*", async (route) => {
      try {
        assertAllowedUrl(route.request().url(), allowlist);
      } catch {
        await route.abort("blockedbyclient");
        return;
      }

      let response;
      try {
        response = await route.fetch({ maxRedirects: 0 });
      } catch {
        await route.abort("failed");
        return;
      }

      const status = response.status();
      const headers = { ...response.headers() };
      if (status >= 300 && status < 400 && headers.location) {
        let redirectUrl;
        try {
          redirectUrl = new URL(headers.location, route.request().url());
          assertAllowedUrl(redirectUrl.toString(), allowlist);
        } catch {
          await route.abort("blockedbyclient");
          return;
        }
        const safeHeaders = {};
        for (const [name, value] of Object.entries(headers)) {
          if (name === "location" || HOP_BY_HOP.has(name)) continue;
          safeHeaders[name] = value;
        }
        safeHeaders.location = redirectUrl.toString();
        await route.fulfill({ status, headers: safeHeaders, body: "" });
        return;
      }
      await route.fulfill({ response });
    });

    const page = await context.newPage();
    const response = await page.goto(target, { waitUntil: "load" });
    assertAllowedUrl(page.url(), allowlist);

    const body = response
      ? await response.body()
      : Buffer.from(await page.content(), "utf8");
    const truncated = body.length > MAX_BODY_BYTES;
    const capped = body.subarray(0, MAX_BODY_BYTES);
    if (output) {
      writeFileSync(output, capped, { mode: 0o600 });
    } else {
      process.stdout.write(capped);
    }
    process.stderr.write(
      `status: ok\nbytes: ${capped.length}\ntruncated: ${truncated ? "true" : "false"}\n`
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Closing is cleanup; it must not turn a completed fetch into a failure.
      }
    }
  }
}

async function main() {
  const { exitId, target, output } = parseArgs(process.argv.slice(2));
  assertTrustedHelper();
  if (helperStatus(["check-exit", exitId]) !== 0) {
    stop("error: exit id was not validated; no target traffic was sent");
  }
  const reconcileStatus = helperStatus(["reconcile"]);
  if (reconcileStatus !== 0) {
    if (reconcileStatus === 10) {
      stop("error: x402socks reconcile found no valid token; no target traffic was sent");
    }
    stop("error: x402socks reconcile was inconclusive; no target traffic was sent");
  }
  const token = readToken();
  const allowlist = parseAllowlist();
  assertAllowedUrl(target, allowlist);
  await fetchTarget({ exitId, target, output, token, allowlist });
}

try {
  await main();
} catch (error) {
  const message = error instanceof Stop
    ? error.message
    : "error: browser fetch failed; no target body was emitted";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
