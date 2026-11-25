import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createDeckStore, emptyDeck } from "./store.mjs";
import { DEFAULT_THEME, validateDeck } from "./model.mjs";

const sampleDeck = () => ({
    ...emptyDeck("main"),
    title: "Quarterly review",
    slides: [{
        id: "opening",
        title: "Highlights",
        elements: [{
            id: "headline", type: "text", x: 80, y: 80, w: 900, h: 120,
            text: "Revenue grew", color: "#1f2328", fontSize: 44, bold: true, align: "left",
        }],
    }],
    openQuestions: ["Confirm final figures"],
});

async function withStore(run) {
    const directory = await mkdtemp(join(tmpdir(), "copilot-slides-"));
    try { await run(createDeckStore(directory)); }
    finally { await rm(directory, { recursive: true, force: true }); }
}

test("returns a blank deck and persists a revisioned replacement", async () => {
    await withStore(async (store) => {
        assert.deepEqual(await store.get("main"), emptyDeck("main"));
        const saved = await store.replace("main", 0, sampleDeck());
        assert.equal(saved.version, 1);
        assert.equal(saved.title, "Quarterly review");
        assert.deepEqual((await store.get("main")).slides, saved.slides);
    });
});

test("rejects stale updates without overwriting the current deck", async () => {
    await withStore(async (store) => {
        await store.replace("main", 0, sampleDeck());
        await assert.rejects(store.replace("main", 0, sampleDeck()), { code: "conflict" });
        assert.equal((await store.get("main")).version, 1);
    });
});

test("rejects elements that exceed the slide bounds", async () => {
    await withStore(async (store) => {
        const invalid = sampleDeck();
        invalid.slides[0].elements[0].x = 500;
        invalid.slides[0].elements[0].w = 900;
        await assert.rejects(store.replace("main", 0, invalid), { code: "invalid_deck" });
    });
});

test("unspecified new-deck design persists the default and readable text spacing", async () => {
    await withStore(async (store) => {
        const input = sampleDeck();
        delete input.theme;
        delete input.slides[0].elements[0].color;
        const saved = await store.replace("main", 0, input);
        assert.deepEqual(saved.theme, DEFAULT_THEME);
        assert.equal(saved.slides[0].elements[0].color, "#1a1a1c");
        assert.equal(saved.slides[0].elements[0].lineHeight, 1.4);
        const updated = await store.updateSlides("main", saved.version, [{
            ...saved.slides[0], elements: [...saved.slides[0].elements,
                { id: "body", type: "text", x: 64, y: 272, w: 1152, h: 384, text: "Body\nSecond line" }],
        }]);
        assert.equal(updated.slides[0].elements[1].lineHeight, 1.5);
        assert.deepEqual(await store.get("main"), updated);
    });
});

test("legacy and explicit themes survive reads and replacements with theme omitted", async () => {
    await withStore(async (store) => {
        const input = sampleDeck();
        input.theme = { background: "#ffffff", foreground: "#1f2328", accent: "#0969da", fontFamily: "Arial" };
        input.slides[0].notes = "Keep speaker notes";
        input.comments = [{ id: "request", slideId: "opening", text: "Keep comment" }];
        const saved = await store.replace("main", 0, input);
        assert.deepEqual(saved.theme, input.theme);
        assert.equal(saved.slides[0].elements[0].lineHeight, undefined);
        const { theme, ...replacement } = saved;
        const updated = await store.replace("main", saved.version, { ...replacement, title: "Title only" });
        assert.deepEqual(updated.theme, theme);
        assert.deepEqual(updated.slides, saved.slides);
        assert.deepEqual(updated.comments, saved.comments);
        assert.deepEqual(await store.get("main"), updated);
        const custom = { background: "#101010", foreground: "#fafafa", accent: "#ffaa00", fontFamily: "Georgia" };
        assert.deepEqual((await store.replace("main", updated.version, { ...updated, theme: custom })).theme, custom);
    });
});

test("text spacing accepts explicit overrides and rejects invalid values", () => {
    const input = sampleDeck();
    input.slides[0].elements[0].lineHeight = 1.8;
    assert.equal(validateDeck(input, "main").slides[0].elements[0].lineHeight, 1.8);
    for (const value of [0, 4, "1.5", null]) {
        input.slides[0].elements[0].lineHeight = value;
        assert.throws(() => validateDeck(input, "main"), { code: "invalid_deck" });
    }
});

test("default text and accent meet the referenced 4.5:1 contrast threshold on white", () => {
    const luminance = (hex) => {
        const rgb = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255)
            .map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    for (const color of [DEFAULT_THEME.foreground, DEFAULT_THEME.accent]) {
        assert.ok((luminance(DEFAULT_THEME.background) + .05) / (luminance(color) + .05) >= 4.5);
    }
});
