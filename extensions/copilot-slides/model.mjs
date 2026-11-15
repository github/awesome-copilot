export class DeckError extends Error {
    constructor(code, message) { super(message); this.code = code; this.name = "DeckError"; }
}
export const isValidDeckId = (id) => typeof id === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(id);
export const DEFAULT_THEME = Object.freeze({
    background: "#ffffff", foreground: "#1a1a1c", accent: "#0017c1",
    fontFamily: '"Noto Sans JP", "Yu Gothic", Meiryo, sans-serif',
});
export const isDefaultTheme = (theme) => Object.entries(DEFAULT_THEME).every(([key, value]) => theme[key] === value);
const fail = (message) => { throw new DeckError("invalid_deck", message); };
const str = (v, max, fallback = "") => {
    v ??= fallback;
    if (typeof v !== "string" || v.length > max) fail(`Text exceeds ${max} characters or is not text.`);
    return v;
};
const color = (v, fallback) => {
    v ??= fallback;
    if (!/^#[a-fA-F0-9]{6}$/.test(v)) fail("Colors must be six-digit hex values.");
    return v;
};
const num = (v, min, max) => {
    if (!Number.isFinite(v) || v < min || v > max) fail(`Number must be between ${min} and ${max}.`);
    return v;
};
const array = (v, max) => {
    if (!Array.isArray(v) || v.length > max) fail(`Expected an array with at most ${max} items.`);
    return v;
};
function unique(items) {
    if (items.some((item) => !item || !isValidDeckId(item.id)) || new Set(items.map((item) => item.id)).size !== items.length) {
        fail("IDs must be unique lowercase identifiers starting with a letter.");
    }
}
function boolean(v, fallback = false) {
    if (v === undefined) return fallback;
    if (typeof v !== "boolean") fail("Expected a boolean.");
    return v;
}
export function validateTheme(sourceTheme = {}) {
    if (!sourceTheme || typeof sourceTheme !== "object" || Array.isArray(sourceTheme)) fail("Theme must be an object.");
    const theme = {
        background: color(sourceTheme.background, DEFAULT_THEME.background),
        foreground: color(sourceTheme.foreground, DEFAULT_THEME.foreground),
        accent: color(sourceTheme.accent, DEFAULT_THEME.accent),
        fontFamily: str(sourceTheme.fontFamily, 100, DEFAULT_THEME.fontFamily),
    };
    if (!theme.fontFamily.trim()) fail("Font family cannot be blank.");
    return theme;
}
export function validateDeck(input, id) {
    if (!input || input.id !== id || !isValidDeckId(id)) fail("Deck id must match a valid deckId.");
    if (input.schemaVersion !== undefined && input.schemaVersion !== 1) fail("Unsupported deck schema version.");
    const theme = validateTheme(input.theme);
    const slides = array(input.slides, 60);
    unique(slides);
    const normalized = slides.map((slide) => {
        if (slide.transition !== undefined && !["none", "fade"].includes(slide.transition)) fail("Unsupported slide transition.");
        const elements = array(slide.elements, 80);
        unique(elements);
        return {
            id: slide.id, title: str(slide.title, 160), notes: str(slide.notes, 20000),
            skipped: boolean(slide.skipped), background: color(slide.background, theme.background),
            ...(slide.transition === undefined ? {} : { transition: slide.transition }),
            elements: elements.map((e) => {
                if (!["text", "shape", "image", "table", "chart"].includes(e.type)) fail("Unsupported element type.");
                const out = {
                    id: e.id, type: e.type, x: num(e.x, 0, 1280), y: num(e.y, 0, 720),
                    w: num(e.w, 1, 1280), h: num(e.h, 1, 720), text: str(e.text, 8000),
                    color: color(e.color, theme.foreground), fontSize: num(e.fontSize ?? 32, 8, 96),
                    bold: boolean(e.bold), align: e.align ?? "left",
                };
                if (e.lineHeight !== undefined) out.lineHeight = num(e.lineHeight, 1, 3);
                else if (e.type === "text" && isDefaultTheme(theme)) out.lineHeight = out.fontSize >= 36 ? 1.4 : 1.5;
                if (e.animation !== undefined) {
                    if (!e.animation || !["appear", "fade"].includes(e.animation.effect) ||
                        !Number.isInteger(e.animation.step) || e.animation.step < 1 || e.animation.step > 80) {
                        fail("Animation requires appear/fade and an integer step between 1 and 80.");
                    }
                    out.animation = { effect: e.animation.effect, step: e.animation.step };
                }
                if (out.x + out.w > 1280 || out.y + out.h > 720) fail("Elements must fit within 1280 by 720.");
                if (!["left", "center", "right"].includes(out.align)) fail("Invalid text alignment.");
                if (e.type === "shape") {
                    if (!["rect", "ellipse"].includes(e.shape)) fail("Invalid shape.");
                    out.shape = e.shape;
                }
                if (e.type === "image") {
                    out.src = str(e.src, 5500000);
                    if (!/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(out.src)) fail("Images must be embedded PNG or JPEG files.");
                    out.alt = str(e.alt, 500);
                }
                if (e.type === "table") {
                    out.rows = array(e.rows, 20).map((row) => array(row, 10).map((cell) => str(cell, 1000)));
                    if (!out.rows.length || !out.rows[0].length || out.rows.some((row) => row.length !== out.rows[0].length)) fail("Table rows must have the same number of columns.");
                }
                if (e.type === "chart") {
                    out.chartType = e.chartType ?? "bar";
                    if (!["bar", "line", "pie"].includes(out.chartType)) fail("Unsupported chart type.");
                    out.labels = array(e.labels, 12).map((label) => str(label, 60));
                    out.values = array(e.values, 12).map((value) => num(value, 0, 1e12));
                    if (!out.labels.length || out.labels.length !== out.values.length) fail("Chart labels and values must match.");
                }
                return out;
            }),
        };
    });
    const comments = array(input.comments ?? [], 200);
    unique(comments);
    const normalizedComments = comments.map((comment) => {
        const slide = normalized.find((item) => item.id === comment.slideId);
        if (!slide || (comment.elementId && !slide.elements.some((e) => e.id === comment.elementId))) fail("Comment target no longer exists.");
        const status = comment.status ?? "draft";
        if (!["draft", "sending", "sent", "unknown", "resolved"].includes(status)) fail("Invalid comment status.");
        return { id: comment.id, slideId: slide.id, elementId: comment.elementId || null,
            text: str(comment.text, 4000), reply: str(comment.reply, 4000), status };
    });
    const title = str(input.title, 120);
    if (!title.trim()) fail("Deck title is required.");
    if (!Number.isSafeInteger(input.version) || input.version < 0) fail("Invalid version.");
    const result = {
        schemaVersion: 1, id, title, version: input.version, theme, slides: normalized,
        openQuestions: array(input.openQuestions ?? [], 100).map((q) => str(q, 1000)),
        comments: normalizedComments, updatedAt: input.updatedAt ?? null,
    };
    if (JSON.stringify(result).length > 20000000) fail("Deck exceeds the 20 MB limit.");
    return result;
}
export function emptyDeck(id) {
    if (!isValidDeckId(id)) throw new DeckError("invalid_deck_id", "Invalid deckId.");
    return validateDeck({ id, title: "Untitled presentation", version: 0,
        theme: {}, slides: [], openQuestions: [], comments: [] }, id);
}

const text = (maxLength) => ({ type: "string", maxLength });
export const idSchema = { type: "string", pattern: "^[a-z][a-z0-9-]{0,63}$" };
const hex = { type: "string", pattern: "^#[a-fA-F0-9]{6}$" };
export const elementSchema = {
    type: "object", additionalProperties: false, required: ["id", "type", "x", "y", "w", "h"],
    properties: {
        id: idSchema, type: { enum: ["text", "shape", "image", "table", "chart"] },
        x: { type: "number", minimum: 0, maximum: 1280 }, y: { type: "number", minimum: 0, maximum: 720 },
        w: { type: "number", minimum: 1, maximum: 1280 }, h: { type: "number", minimum: 1, maximum: 720 },
        text: text(8000), color: hex, fontSize: { type: "number", minimum: 8, maximum: 96 },
        lineHeight: { type: "number", minimum: 1, maximum: 3, description: "Line-height multiplier. Default-design headings use 1.4, body text 1.5; legacy elements retain their spacing." },
        bold: { type: "boolean" }, align: { enum: ["left", "center", "right"] },
        animation: { type: "object", additionalProperties: false, required: ["effect", "step"],
            description: "Optional click-to-reveal build. Equal step numbers reveal together; unspecified elements are visible immediately.",
            properties: { effect: { enum: ["appear", "fade"] }, step: { type: "integer", minimum: 1, maximum: 80 } } },
        shape: { enum: ["rect", "ellipse"] }, src: text(5500000), alt: text(500),
        chartType: { enum: ["bar", "line", "pie"] },
        rows: { type: "array", maxItems: 20, items: { type: "array", maxItems: 10, items: text(1000) } },
        labels: { type: "array", maxItems: 12, items: text(60) },
        values: { type: "array", maxItems: 12, items: { type: "number", minimum: 0, maximum: 1e12 } },
    },
};
export const slideSchema = { type: "object", additionalProperties: false, required: ["id", "title", "elements"],
    properties: { id: idSchema, title: text(160), notes: text(20000), skipped: { type: "boolean" }, background: hex,
        transition: { enum: ["none", "fade"] },
        elements: { type: "array", maxItems: 80, items: elementSchema } } };
export const deckSchema = {
    type: "object", additionalProperties: false, required: ["id", "title", "slides", "openQuestions"],
    properties: {
        schemaVersion: { type: "integer", enum: [1] }, id: idSchema, title: text(120),
        version: { type: "integer", minimum: 0 }, updatedAt: { type: ["string", "null"] },
        theme: { type: "object", additionalProperties: false,
            description: "Omit for the Digital Agency-inspired default on new decks, or to preserve the saved theme on existing decks. Explicit values take precedence.",
            properties: { background: hex, foreground: hex, accent: hex, fontFamily: text(100) } },
        slides: { type: "array", maxItems: 60, items: slideSchema },
        openQuestions: { type: "array", maxItems: 100, items: text(1000) },
        comments: { type: "array", maxItems: 200, items: {
            type: "object", additionalProperties: false, required: ["id", "slideId", "text"],
            properties: { id: idSchema, slideId: idSchema, elementId: { type: ["string", "null"] },
                text: text(4000), reply: text(4000), status: { enum: ["draft", "sending", "sent", "unknown", "resolved"] } },
        } },
    },
};
