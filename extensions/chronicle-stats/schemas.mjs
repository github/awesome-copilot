const text = { type: "string", minLength: 1, maxLength: 400 };
const date = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
const id = { type: "string", pattern: "^[a-z0-9][a-z0-9-]{0,63}$" };
const signal = {
    type: "object", required: ["title", "evidence"], additionalProperties: false,
    properties: { title: { ...text, maxLength: 120 }, evidence: text },
};
export const rangeSchema = {
    type: "object", additionalProperties: false,
    properties: { range: { type: "string", enum: ["30", "90", "all"] } },
};
export const briefSchema = {
    type: "object", additionalProperties: false,
    required: ["date", "headline", "summary", "wins", "watchouts", "recommendations"],
    properties: {
        date, analysisSource: { type: "string", enum: ["local-aggregates", "native-chronicle"] },
        headline: { ...text, maxLength: 100 }, summary: text,
        wins: { type: "array", minItems: 1, maxItems: 3, items: signal },
        watchouts: { type: "array", maxItems: 3, items: signal },
        recommendations: {
            type: "array", minItems: 1, maxItems: 4,
            items: {
                type: "object", additionalProperties: false,
                required: ["id", "title", "why", "evidence", "action"],
                properties: { id, title: { ...text, maxLength: 120 },
                    why: text, evidence: text, action: text },
            },
        },
    },
};
export const statusSchema = {
    type: "object", required: ["date", "recommendationId", "status"],
    additionalProperties: false,
    properties: { date, recommendationId: id,
        status: { type: "string", enum: ["new", "trying", "done"] } },
};
export const experimentSchema = {
    type: "object", required: ["id"], additionalProperties: false, properties: { id },
};
export const experimentUpdateSchema = {
    type: "object", required: ["id", "update"], additionalProperties: false,
    properties: {
        id, update: {
            type: "object", minProperties: 1, additionalProperties: false,
            properties: {
                notes: { type: "string", maxLength: 2000 },
                outcome: { type: "string", enum: ["unassessed", "helped", "no-change", "worse", "inconclusive"] },
            },
        },
    },
};
export const modelUsageSchema = {
    type: "object", additionalProperties: false, required: ["snapshotId", "model"],
    properties: {
        snapshotId: { type: "string", minLength: 1, maxLength: 256 },
        model: { type: "string", minLength: 1, maxLength: 256 },
        offset: { type: "integer", minimum: 0, maximum: 200000 },
        sort: { type: "string", enum: ["aiu", "tokens", "requests"] },
    },
};
export const sessionUsageSchema = {
    type: "object", additionalProperties: false, required: ["snapshotId", "sessionId"],
    properties: {
        snapshotId: modelUsageSchema.properties.snapshotId,
        sessionId: modelUsageSchema.properties.model,
        model: modelUsageSchema.properties.model,
    },
};
export const usageSeriesSchema = {
    type: "object", additionalProperties: false, required: ["snapshotId", "start"],
    properties: {
        snapshotId: modelUsageSchema.properties.snapshotId,
        start: date, model: modelUsageSchema.properties.model,
    },
};
