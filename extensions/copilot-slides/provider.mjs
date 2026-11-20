import { deckSchema, idSchema, slideSchema, DeckError } from "./model.mjs";
import { LOCALES } from "./i18n.mjs";
import { startServer } from "./server.mjs";

export function createOptions(store, dependencies = {}) {
    const servers = new Map();
    const deckId = (ctx) => ctx.input?.deckId || servers.get(ctx.instanceId)?.deckId || "main";
    const schema = (properties, required = []) => ({ type: "object", additionalProperties: false,
        properties: { deckId: idSchema, ...properties }, required });
    const version = { type: "integer", minimum: 0 };
    return {
        id: "copilot-slides", displayName: "Copilot Slides",
        description: "Create, directly edit, present and export local slide decks with notes and revision-safe Chat collaboration.",
        inputSchema: schema({ locale: { enum: ["auto", ...LOCALES],
            description: "UI language. auto follows the browser or app language and falls back to English." } }),
        actions: [
            { name: "get_deck", description: "Read this panel's deck and version before editing. Optional deckId targets another deck.",
                inputSchema: schema({}), handler: (ctx) => store.get(deckId(ctx)) },
            { name: "replace_deck", description: "Save a complete deck using the current expectedVersion. Preserve comments and notes. Record unknown facts in openQuestions. Coordinates are 1280x720. New decks start at version 0. If design is unspecified, use the Digital Agency-inspired default: 64px margins, left-aligned 64px cover / 48px headings, 32px body, restrained blue accents. Omit theme to use the default on a new deck or preserve an existing deck's theme.",
                inputSchema: schema({ expectedVersion: version, deck: deckSchema }, ["expectedVersion", "deck"]),
                handler: (ctx) => store.replace(deckId(ctx), ctx.input.expectedVersion, ctx.input.deck) },
            { name: "update_slides", description: "Replace only the named existing slides, preserving all other deck content. Supply complete slide objects and the current expectedVersion.",
                inputSchema: schema({ expectedVersion: version, slides: { type: "array", items: slideSchema, maxItems: 60 } }, ["expectedVersion", "slides"]),
                handler: (ctx) => store.updateSlides(deckId(ctx), ctx.input.expectedVersion, ctx.input.slides) },
            { name: "reorder_slides", description: "Reorder the deck. Include every existing slide ID exactly once.",
                inputSchema: schema({ expectedVersion: version, slideIds: { type: "array", items: idSchema, maxItems: 60 } }, ["expectedVersion", "slideIds"]),
                handler: (ctx) => store.reorder(deckId(ctx), ctx.input.expectedVersion, ctx.input.slideIds) },
            { name: "reply_comment", description: "Reply to a saved user comment after carrying out or explaining its request. Only mark resolved if the requested change was actually made.",
                inputSchema: schema({ expectedVersion: version, commentId: idSchema, reply: { type: "string", maxLength: 4000 }, resolved: { type: "boolean" } },
                    ["expectedVersion", "commentId", "reply", "resolved"]),
                handler: (ctx) => store.change(deckId(ctx), ctx.input.expectedVersion, (deck) => {
                    const comment = deck.comments.find((c) => c.id === ctx.input.commentId);
                    if (!comment) throw new DeckError("not_found", "Comment not found.");
                    comment.reply = ctx.input.reply;
                    if (ctx.input.resolved) comment.status = "resolved";
                    return deck;
                }) },
        ],
        open: async (ctx) => {
            const id = ctx.input?.deckId || "main";
            await store.get(id);
            let entry = servers.get(ctx.instanceId);
            if (!entry || entry.deckId !== id) {
                if (entry) await entry.close();
                entry = { ...await startServer({ store, deckId: id, ...dependencies }), deckId: id };
                servers.set(ctx.instanceId, entry);
            }
            const locale = ctx.input?.locale;
            const url = locale && locale !== "auto" ? `${entry.origin}/?lang=${locale}#${entry.token}` : entry.url;
            return { title: `Copilot Slides · ${id}`, url };
        },
        onClose: async (ctx) => {
            const entry = servers.get(ctx.instanceId);
            if (entry) { servers.delete(ctx.instanceId); await entry.close(); }
        },
    };
}
