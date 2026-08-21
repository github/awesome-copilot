import Ajv2020 from "ajv/dist/2020.js";
import fs from "node:fs";
import path from "node:path";

export const AGENT_PLUGIN_SCHEMA_URL = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
export const AGENT_PLUGIN_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: AGENT_PLUGIN_SCHEMA_URL,
  type: "object",
  properties: {
    $schema: { const: AGENT_PLUGIN_SCHEMA_URL },
    name: { type: "string", minLength: 1, maxLength: 64, pattern: "^(?!.*(?:--|\\.\\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$" },
    version: { type: "string" }, description: { type: "string" },
    author: { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, url: { type: "string" } }, additionalProperties: false },
    homepage: { type: "string" }, repository: { type: "string" }, license: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
    extensions: { type: "object", additionalProperties: { type: "object" } },
  },
  required: ["$schema", "name"],
  additionalProperties: false,
};

const validate = new Ajv2020({ allErrors: true }).compile(AGENT_PLUGIN_SCHEMA);
export function validateAgentPluginManifest(manifest) {
  return validate(manifest) ? [] : (validate.errors ?? []).map((error) =>
    `${error.instancePath || "manifest"} ${error.message}`);
}

export const AGENT_PLUGIN_MCP_SCHEMA_URL = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
export const AGENT_PLUGIN_MCP_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: AGENT_PLUGIN_MCP_SCHEMA_URL,
  title: "Agent Plugins MCP Configuration",
  type: "object",
  properties: {
    $schema: { const: AGENT_PLUGIN_MCP_SCHEMA_URL },
    mcpServers: { type: "object", additionalProperties: { $ref: "#/$defs/server" } },
  },
  required: ["$schema", "mcpServers"],
  additionalProperties: false,
  $defs: {
    server: {
      title: "MCP server",
      oneOf: [
        { $ref: "#/$defs/stdioServer" },
        { $ref: "#/$defs/streamableHttpServer" },
        { $ref: "#/$defs/sseServer" },
      ],
    },
    stdioServer: {
      title: "stdio MCP server",
      type: "object",
      properties: {
        type: { const: "stdio" },
        command: { type: "string", minLength: 1 },
        args: { type: "array", items: { type: "string" } },
        env: {
          type: "object",
          propertyNames: { not: { enum: ["PLUGIN_ROOT", "PLUGIN_DATA"] } },
          additionalProperties: { type: "string" },
        },
        cwd: {
          type: "string",
          pattern: "^(?:\\./|\\$\\{PLUGIN_ROOT\\}(?:/|$)|\\$\\{PLUGIN_DATA\\}(?:/|$))",
        },
      },
      required: ["type", "command"],
      additionalProperties: false,
    },
    streamableHttpServer: {
      title: "Streamable HTTP MCP server",
      type: "object",
      properties: {
        type: { const: "streamable-http" },
        url: { type: "string", minLength: 1 },
        headers: { $ref: "#/$defs/headers" },
      },
      required: ["type", "url"],
      additionalProperties: false,
    },
    sseServer: {
      title: "Legacy HTTP+SSE MCP server",
      type: "object",
      properties: {
        type: { const: "sse" },
        url: { type: "string", minLength: 1 },
        headers: { $ref: "#/$defs/headers" },
      },
      required: ["type", "url"],
      additionalProperties: false,
    },
    headers: { title: "HTTP headers", type: "object", additionalProperties: { type: "string" } },
  },
};

const mcpAjv = new Ajv2020({ allErrors: true });
const validateMcp = mcpAjv.compile(AGENT_PLUGIN_MCP_SCHEMA);

// A bare oneOf failure reports every branch at once, so errors for a server whose
// `type` is a known discriminator are re-derived from that branch alone.
const MCP_SERVER_BRANCHES = {
  stdio: "stdioServer",
  "streamable-http": "streamableHttpServer",
  sse: "sseServer",
};
const MCP_SERVER_TYPES = Object.keys(MCP_SERVER_BRANCHES);

function isBareExecutableOrRelativePath(command) {
  if (typeof command !== "string" || command.length === 0) {
    return false;
  }
  if (command.startsWith("./")) {
    return true;
  }
  return !command.includes("/") && !command.includes("\\");
}

function isPathWithinRoot(root, value) {
  const normalizedValue = value.replaceAll("\\", path.sep).replaceAll("/", path.sep).replace(/^[/\\]+/, "");
  const candidate = path.resolve(root, normalizedValue);
  const relative = path.relative(root, candidate);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return false;
  }

  let rootRealPath;
  try {
    rootRealPath = fs.realpathSync.native(root);
  } catch {
    return false;
  }
  let existingPath = candidate;
  const missingSegments = [];
  while (true) {
    let resolvedExistingPath;
    try {
      fs.lstatSync(existingPath);
      resolvedExistingPath = fs.realpathSync.native(existingPath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        return false;
      }
      try {
        fs.readlinkSync(existingPath);
        return false;
      } catch (readlinkError) {
        if (readlinkError.code !== "EINVAL" && readlinkError.code !== "ENOENT") {
          return false;
        }
      }
      const parent = path.dirname(existingPath);
      if (parent === existingPath) {
        return false;
      }
      missingSegments.unshift(path.basename(existingPath));
      existingPath = parent;
      continue;
    }
    const resolvedCandidate = path.join(resolvedExistingPath, ...missingSegments);
    const resolvedRelative = path.relative(rootRealPath, resolvedCandidate);
    return resolvedRelative !== ".." &&
      !resolvedRelative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(resolvedRelative);
  }
}

function isContainedRelativeCwd(cwd, pluginDir) {
  if (typeof cwd !== "string" || cwd.length === 0) {
    return false;
  }
  const placeholder = cwd.match(/^\$\{(PLUGIN_ROOT|PLUGIN_DATA)\}(\/.*)?$/);
  if (placeholder) {
    if (placeholder[1] === "PLUGIN_DATA") {
      return isLexicallyWithinRoot(placeholder[2] ?? "");
    }
    return !pluginDir || isPathWithinRoot(pluginDir, placeholder[2] ?? "");
  }
  if (!cwd.startsWith("./")) {
    return false;
  }
  return !pluginDir || isPathWithinRoot(pluginDir, cwd);
}

function isLexicallyWithinRoot(value) {
  let depth = 0;
  for (const segment of value.split(/[\\/]/)) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (depth === 0) return false;
      depth--;
    } else {
      depth++;
    }
  }
  return true;
}

function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "::1" || /^127(?:\.\d{1,3}){3}$/.test(normalized);
}

// Headers in mcp.json are visible package data. These names unambiguously carry
// credentials; API-key names are intentionally rejected even when their value is
// a placeholder, so users configure them in their local MCP client instead.
const CREDENTIAL_HEADER_NAMES = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "api-key",
  "x-api-key",
  "x-api-token",
  "x-auth-token",
  "x-access-token",
  "access-token",
]);

function validateRemoteServer(server, name) {
  const errors = [];
  let parsedUrl;
  try {
    parsedUrl = new URL(server.url);
  } catch {
    errors.push(`/mcpServers/${name}/url must be an absolute HTTP(S) URL`);
    return errors;
  }
  if (!/^https?:\/\//i.test(server.url) ||
      parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:" ||
      !parsedUrl.hostname || parsedUrl.username || parsedUrl.password || parsedUrl.hash) {
    errors.push(`/mcpServers/${name}/url must be an absolute HTTP(S) URL without userinfo or fragment`);
  } else if (parsedUrl.protocol === "http:" && !isLoopbackHostname(parsedUrl.hostname)) {
    errors.push(`/mcpServers/${name}/url must use HTTPS for non-loopback hosts`);
  }

  if (server.headers !== undefined) {
    const seen = new Set();
    for (const [headerName, headerValue] of Object.entries(server.headers)) {
      if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(headerName)) {
        errors.push(`/mcpServers/${name}/headers/${headerName} must be a valid HTTP header name`);
      }
      const normalizedName = headerName.toLowerCase();
      if (CREDENTIAL_HEADER_NAMES.has(normalizedName)) {
        errors.push(`/mcpServers/${name}/headers/${headerName} must not contain credentials or secrets`);
      }
      if (seen.has(normalizedName)) {
        errors.push(`/mcpServers/${name}/headers must not contain duplicate header names`);
      }
      seen.add(normalizedName);
      if (/[\u0000-\u0008\u000A-\u001F\u007F]/.test(headerValue)) {
        errors.push(`/mcpServers/${name}/headers/${headerName} must be a valid HTTP header value`);
      }
    }
  }
  return errors;
}

function formatMcpError(error) {
  const extra = error.params?.additionalProperty
    ? ` (${error.params.additionalProperty})`
    : "";
  return `${error.instancePath || "config"} ${error.message}${extra}`;
}

export function validateAgentPluginMcpConfig(config, pluginDir) {
  if (validateMcp(config)) {
    const semanticErrors = [];
    const servers = config?.mcpServers;
    if (typeof servers === "object" && servers !== null && !Array.isArray(servers)) {
      for (const [name, server] of Object.entries(servers)) {
        if (typeof server !== "object" || server === null || Array.isArray(server)) {
          continue;
        }
        if (server.type === "streamable-http" || server.type === "sse") {
          semanticErrors.push(...validateRemoteServer(server, name));
          continue;
        }
        if (server.type !== "stdio") {
          continue;
        }
        const commandIsContained = !server.command.startsWith("./") ||
          !pluginDir || isPathWithinRoot(pluginDir, server.command);
        if (!isBareExecutableOrRelativePath(server.command) || !commandIsContained) {
          semanticErrors.push(`/mcpServers/${name}/command must be a bare executable name or a plugin-relative path starting with "./"`);
        }
        if (server.cwd !== undefined && !isContainedRelativeCwd(server.cwd, pluginDir)) {
          semanticErrors.push(`/mcpServers/${name}/cwd must stay within the plugin root or plugin data directory`);
        }
      }
    }
    return semanticErrors;
  }
  const rawErrors = validateMcp.errors ?? [];
  const servers = config?.mcpServers;
  const hasServerObject = typeof servers === "object" && servers !== null && !Array.isArray(servers);

  const messages = [];
  for (const error of rawErrors) {
    if (hasServerObject && error.instancePath.startsWith("/mcpServers/")) {
      continue;
    }
    messages.push(formatMcpError(error));
  }

  if (hasServerObject) {
    for (const [name, server] of Object.entries(servers)) {
      if (typeof server !== "object" || server === null || Array.isArray(server)) {
        messages.push(`/mcpServers/${name} must be an object`);
        continue;
      }
      const branch = MCP_SERVER_BRANCHES[server.type];
      if (!branch) {
        messages.push(`/mcpServers/${name}/type must be one of ${MCP_SERVER_TYPES.join(", ")}`);
        continue;
      }
      const branchValidator = mcpAjv.getSchema(`${AGENT_PLUGIN_MCP_SCHEMA_URL}#/$defs/${branch}`);
      if (branchValidator(server)) {
        continue;
      }
      for (const error of branchValidator.errors ?? []) {
        if (error.keyword === "not") {
          continue;
        }
        const suffix = error.keyword === "propertyNames"
          ? ` "${error.params?.propertyName}" is reserved`
          : formatMcpError(error).slice(error.instancePath.length || "config".length);
        messages.push(`/mcpServers/${name}${error.instancePath}${suffix}`);
      }

    }
  }
  return messages;
}
