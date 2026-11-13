import { AdoError } from "./adapter.mjs";
const id = { type: "string", pattern: "^[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$" };
const ids = maxItems => ({ type: "array", uniqueItems: true, maxItems, items: id });
const descriptor = { type: "string", pattern: "^[A-Za-z0-9._-]{1,1024}$" };
const scopeProperties = {
    organisation: { type: "string", maxLength: 256 },
    tenant: { type: "string", maxLength: 36 }, projects: ids(30),
};
const object = properties => ({ type: "object", properties, additionalProperties: false });
export const schemas = {
    get_state: object({}),
    refresh: object({}),
    discover: object(scopeProperties),
    resolve_people: { ...object({ descriptors: { type: "array", maxItems: 100, items: descriptor } }), required: ["descriptors"] },
    set_tracking: { ...object({
        revision: { type: "string", maxLength: 64 },
        config: object({ ...scopeProperties, repositories: ids(30), people: ids(100),
            threshold: { type: "integer", minimum: 1, maximum: 1000 },
            refreshSeconds: { type: "integer", minimum: 60, maximum: 86400 } }),
        descriptors: { type: "object", additionalProperties: descriptor },
    }), required: ["revision", "config"] },
};
export function validateAction(name, input) {
    const schema = schemas[name];
    if (!schema) throw new AdoError("unknown_action", "Unknown canvas action.");
    function check(s, value) {
        if (s.type === "object") {
            if (!value || typeof value !== "object" || Array.isArray(value)) throw new AdoError("invalid_input", "Expected an object.");
            for (const key of s.required || []) if (!(key in value)) throw new AdoError("invalid_input", `Missing ${key}.`);
            for (const [key, v] of Object.entries(value)) {
                if (s.properties?.[key]) check(s.properties[key], v);
                else if (s.additionalProperties && typeof s.additionalProperties === "object") check(s.additionalProperties, v);
                else throw new AdoError("invalid_input", `Unsupported field: ${key}.`);
            }
        } else if (s.type === "array") {
            if (!Array.isArray(value) || value.length > s.maxItems || (s.uniqueItems && new Set(value).size !== value.length))
                throw new AdoError("invalid_input", "Invalid selection list.");
            value.forEach(v => check(s.items, v));
        } else if (s.type === "integer") {
            if (!Number.isInteger(value) || value < s.minimum || value > s.maximum) throw new AdoError("invalid_input", "Number is outside its allowed range.");
        } else if (s.type === "string") {
            if (typeof value !== "string" || (s.maxLength && value.length > s.maxLength) || (s.pattern && !new RegExp(s.pattern).test(value)))
                throw new AdoError("invalid_input", "Invalid text or identifier.");
        }
    }
    check(schema, input);
    return input;
}
