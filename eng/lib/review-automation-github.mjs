// Minimal GitHub REST/GraphQL client for maintainer automation scripts.
//
// In workflows it uses GITHUB_TOKEN (or GH_TOKEN) with the global fetch API.
// For local dry runs without a token it falls back to the authenticated `gh`
// CLI (`gh api`), so maintainers never need to export credentials.

import { spawn } from "node:child_process";

const DEFAULT_API_URL = "https://api.github.com";

export function createGitHubClient({
  token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
  apiUrl = process.env.GITHUB_API_URL || DEFAULT_API_URL,
  userAgent = "awesome-copilot-maintainer-automation",
  transport,
} = {}) {
  const baseUrl = apiUrl.replace(/\/$/, "");
  const send = transport ?? (token ? createFetchTransport({ token, userAgent }) : createGhTransport(baseUrl));

  async function request(method, route, { body, query, allowStatuses = [] } = {}) {
    const url = new URL(route.startsWith("http") ? route : `${baseUrl}${route}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    for (let attempt = 0; ; attempt++) {
      const response = await send(method, url, body);
      if ((response.status === 502 || response.status === 503) && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      const data = response.text ? safeJson(response.text) : null;
      if ((response.status < 200 || response.status >= 300) && !allowStatuses.includes(response.status)) {
        const message = data?.message || response.text || `HTTP ${response.status}`;
        const error = new Error(`${method} ${url.pathname} failed: ${response.status} ${message}`);
        error.status = response.status;
        throw error;
      }
      return { status: response.status, data, headers: response.headers };
    }
  }

  async function paginate(route, { query = {}, itemsKey, maxPages = 20 } = {}) {
    const items = [];
    let next = null;
    let page = 0;
    do {
      const response = next ? await request("GET", next) : await request("GET", route, { query: { per_page: 100, ...query } });
      const pageItems = itemsKey ? response.data?.[itemsKey] ?? [] : response.data ?? [];
      items.push(...pageItems);
      next = parseLink(response.headers.get("link"), "next");
      page++;
    } while (next && page < maxPages);
    return items;
  }

  async function graphql(query, variables = {}) {
    const response = await request("POST", "/graphql", { body: { query, variables } });
    if (response.data?.errors?.length) {
      const error = new Error(`GraphQL request failed: ${response.data.errors.map((item) => item.message).join("; ")}`);
      error.errors = response.data.errors;
      throw error;
    }
    return response.data?.data;
  }

  return { request, paginate, graphql };
}

function createFetchTransport({ token, userAgent }) {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": userAgent,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  return async (method, url, body) => {
    const response = await fetch(url, {
      method,
      headers: body ? { ...headers, "Content-Type": "application/json" } : headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, text: await response.text(), headers: response.headers };
  };
}

function createGhTransport(baseUrl) {
  return (method, url, body) =>
    new Promise((resolve, reject) => {
      const endpoint = url.href.startsWith(baseUrl) ? url.href.slice(baseUrl.length + 1) : url.href;
      const args = ["api", "--include", "--method", method, endpoint, "-H", "X-GitHub-Api-Version: 2022-11-28"];
      if (body) args.push("--input", "-");
      const child = spawn("gh", args, { stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
      child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
      child.on("error", (error) =>
        reject(new Error(`No GITHUB_TOKEN/GH_TOKEN set and the gh CLI could not be started: ${error.message}`)),
      );
      child.on("close", () => {
        const parsed = parseIncludedResponse(stdout);
        if (!parsed) {
          reject(new Error(`gh api ${method} ${endpoint} failed: ${stderr.trim() || "no response"}`));
          return;
        }
        resolve(parsed);
      });
      child.stdin.end(body ? JSON.stringify(body) : undefined);
    });
}

export function parseIncludedResponse(output) {
  const normalized = output.replace(/\r\n/g, "\n");
  const match = normalized.match(/^HTTP\/[\d.]+ (\d{3})[^\n]*\n([\s\S]*?)\n\n([\s\S]*)$/);
  if (!match) return null;
  const headers = new Headers();
  for (const line of match[2].split("\n")) {
    const index = line.indexOf(":");
    if (index > 0) headers.append(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }
  return { status: Number(match[1]), text: match[3], headers };
}

export function parseLink(linkHeader, rel) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/);
    if (match && match[2] === rel) return match[1];
  }
  return null;
}

export function parseRepository(value = process.env.GITHUB_REPOSITORY) {
  const [owner, repo] = String(value ?? "").split("/");
  if (!owner || !repo) {
    throw new Error("Repository must be provided as owner/repo (use --repo or GITHUB_REPOSITORY).");
  }
  return { owner, repo };
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
