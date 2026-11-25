import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DeckError, emptyDeck, isValidDeckId, validateDeck } from "./model.mjs";
export { DeckError, emptyDeck, isValidDeckId } from "./model.mjs";

export function createDeckStore(directory) {
    async function deckPath(id) {
        if (!isValidDeckId(id)) throw new DeckError("invalid_deck_id", "deckId must use lowercase letters, numbers, and hyphens.");
        return join(directory, `${id}.json`);
    }

    async function get(id) {
        const file = await deckPath(id);
        try {
            return validateDeck(JSON.parse(await readFile(file, "utf8")), id);
        } catch (error) {
            if (error.code === "ENOENT") return emptyDeck(id);
            if (error instanceof SyntaxError) throw new DeckError("corrupt_deck", `Saved deck ${id} is not valid JSON.`);
            throw error;
        }
    }

    async function change(id, expectedVersion, transform) {
        if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
            throw new DeckError("invalid_version", "expectedVersion must be a non-negative integer.");
        }
        const file = await deckPath(id);
        await mkdir(directory, { recursive: true });
        const lock = `${file}.lock`;
        try {
            await mkdir(lock);
        } catch (error) {
            if (error.code === "EEXIST") throw new DeckError("busy", "This deck is being saved by another operation. Retry shortly.");
            throw error;
        }
        try {
            const current = await get(id);
            if (current.version !== expectedVersion) {
                throw new DeckError("conflict", `Deck version changed from ${expectedVersion} to ${current.version}. Read the latest version before updating.`);
            }
            const input = transform(structuredClone(current));
            const next = validateDeck({ ...input, version: expectedVersion + 1, updatedAt: new Date().toISOString() }, id);
            const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
            try {
                await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { flag: "wx" });
                await rename(temporary, file);
            } finally {
                await rm(temporary, { force: true });
            }
            return next;
        } finally {
            await rm(lock, { recursive: true, force: true });
        }
    }

    const replace = (id, version, input) => change(id, version, (current) => ({
        ...input, theme: input.theme === undefined ? current.theme : input.theme,
    }));
    async function updateSlides(id, version, slides) {
        return change(id, version, (deck) => {
            if (!Array.isArray(slides) || new Set(slides.map((s) => s.id)).size !== slides.length) throw new DeckError("invalid_deck", "Invalid slide updates.");
            for (const slide of slides) {
                const index = deck.slides.findIndex((s) => s.id === slide.id);
                if (index < 0) throw new DeckError("not_found", `Unknown slide: ${slide.id}`);
                deck.slides[index] = slide;
            }
            return deck;
        });
    }
    async function reorder(id, version, slideIds) {
        return change(id, version, (deck) => {
            if (!Array.isArray(slideIds) || slideIds.length !== deck.slides.length ||
                new Set(slideIds).size !== slideIds.length || slideIds.some((key) => !deck.slides.some((s) => s.id === key))) {
                throw new DeckError("invalid_deck", "Order must include every slide exactly once.");
            }
            deck.slides = slideIds.map((key) => deck.slides.find((s) => s.id === key));
            return deck;
        });
    }
    return { get, replace, change, updateSlides, reorder };
}
