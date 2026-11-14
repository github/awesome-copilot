export const canvasId = "git-tag-manager";

export const openSchema = {
    type: "object", additionalProperties: false,
    properties: {
        repository: { type: "string", minLength: 1, description: "Absolute path to a local Git working tree." },
        remote: { type: "string", minLength: 1, description: "Configured remote name; defaults to the saved selection or origin." },
    },
    required: ["repository"],
};

export const operationSchema = {
    type: "object", additionalProperties: false,
    properties: {
        operation: { type: "string", enum: ["create", "push", "delete"] },
        name: { type: "string", minLength: 1, maxLength: 200 },
        target: { type: "string", minLength: 1, maxLength: 500, description: "Commit or revision for creation; defaults to HEAD." },
        message: { type: "string", maxLength: 4000, description: "Nonempty message creates an annotated tag; otherwise lightweight." },
        push: { type: "boolean", description: "Also push a newly created tag." },
        scope: { type: "string", enum: ["local", "remote", "both"], description: "Deletion scope; defaults to local." },
    },
    required: ["operation", "name"],
};

export class TagError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

export function validate(value, schema) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TagError("invalid_input", "Expected an input object.");
    }
    for (const key of Object.keys(value)) {
        const rule = schema.properties[key];
        const item = value[key];
        if (!rule || typeof item !== rule.type ||
            (rule.enum && !rule.enum.includes(item)) ||
            (rule.type === "string" && (item.length < (rule.minLength ?? 0) || item.length > (rule.maxLength ?? 8192)))) {
            throw new TagError("invalid_input", `Invalid input field: ${key}.`);
        }
    }
    for (const key of schema.required ?? []) {
        if (value[key] === undefined) throw new TagError("invalid_input", `Missing input field: ${key}.`);
    }
    return value;
}

export const remoteSchema = {
    type: "object", additionalProperties: false,
    properties: { remote: { type: "string", minLength: 1 } },
    required: ["remote"],
};

export const executeSchema = {
    type: "object", additionalProperties: false,
    properties: {
        id: { type: "string", minLength: 1 },
        confirmation: { type: "string", minLength: 1, maxLength: 200 },
    },
    required: ["id", "confirmation"],
};
