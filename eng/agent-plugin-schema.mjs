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
          pattern: "^(?:\\.[/\\\\]|\\$\\{PLUGIN_ROOT\\}(?:[/\\\\]|$)|\\$\\{PLUGIN_DATA\\}(?:[/\\\\]|$))",
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
  if (/^\.[/\\]/.test(command)) {
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

  const rootRealPath = fs.realpathSync.native(root);
  let existingPath = candidate;
  const missingSegments = [];
  while (!fs.existsSync(existingPath)) {
    const parent = path.dirname(existingPath);
    if (parent === existingPath) {
      break;
    }
    missingSegments.unshift(path.basename(existingPath));
    existingPath = parent;
  }
  const resolvedExistingPath = fs.realpathSync.native(existingPath);
  const resolvedCandidate = path.join(resolvedExistingPath, ...missingSegments);
  const resolvedRelative = path.relative(rootRealPath, resolvedCandidate);
  return resolvedRelative !== ".." &&
    !resolvedRelative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(resolvedRelative);
}

function isContainedRelativeCwd(cwd, pluginDir) {
  if (typeof cwd !== "string" || cwd.length === 0) {
    return false;
  }
  const placeholder = cwd.match(/^\$\{(PLUGIN_ROOT|PLUGIN_DATA)\}(.*)$/);
  if (placeholder) {
    const remainder = placeholder[2];
    if (!remainder || /^[\/\\]/.test(remainder)) {
      return !pluginDir || isPathWithinRoot(pluginDir, remainder);
    }
    return false;
  }
  if (!/^\.[/\\]/.test(cwd)) {
    return false;
  }
  return !pluginDir || isPathWithinRoot(pluginDir, cwd);
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
        if (server.type !== "stdio") {
          continue;
        }
        const commandIsContained = !/^\.[/\\]/.test(server.command) ||
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
