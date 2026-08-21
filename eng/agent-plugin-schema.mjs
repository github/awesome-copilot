import Ajv2020 from "ajv/dist/2020.js";

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
