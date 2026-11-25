import { join } from "node:path";
import { homedir } from "node:os";
import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import { createDeckStore, DeckError } from "./store.mjs";
import { createOptions } from "./provider.mjs";

const directory = join(process.env.COPILOT_HOME || join(homedir(), ".copilot"),
    "extensions", "copilot-slides", "artifacts", "decks");
let session;
const options = createOptions(createDeckStore(directory), {
    sendPrompt: (prompt) => session.send({ prompt }),
    log: (message) => session.log(message, { level: "error" }),
});
const guard = (handler) => async (ctx) => {
    try { return await handler(ctx); }
    catch (error) {
        if (error instanceof DeckError) throw new CanvasError(error.code, error.message);
        throw error;
    }
};
options.open = guard(options.open);
options.actions = options.actions.map((action) => ({ ...action, handler: guard(action.handler) }));
session = await joinSession({
    hooks: {
        onSessionStart: async () => ({ additionalContext:
            "Copilot Slides is an optional presentation editor. When the user chooses this Canvas, open it with a meaningful deckId and read get_deck before editing. Always use its expectedVersion. Prefer update_slides for targeted changes; preserve other slides, comments and notes. Missing facts belong in openQuestions, not invented figures. Do not send comments or create sample content without the user's action. UI editing and exports are local; no cloud sharing is implied. Unless the user specifies another design, create new decks using the Digital Agency of Japan design-system-inspired default returned by get_deck: white background, dark text, restrained blue accents, Noto Sans JP with local Japanese sans-serif fallbacks. For 1280x720 slides use 64px outer margins, left-aligned 64px cover / 48px slide headings and 32px body text, 1.4 heading / 1.5 body lineHeight, and generous whitespace; avoid decorative effects and color-only meaning. This is a slide adaptation, not an official template or a claim of conformance. Do not restyle saved decks or override an explicitly requested theme." }),
    },
    canvases: [createCanvas(options)],
});
