import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEME } from "./model.mjs";
import { contrastRatio, exportTheme, importTheme, themeFromPixels } from "./brand.mjs";

test("local theme files preserve a complete explicit style and reject incorrect or invalid files", () => {
    const theme = { background: "#111111", foreground: "#fafafa", accent: "#aaeeff", fontFamily: "Yu Gothic" };
    assert.deepEqual(importTheme(exportTheme(theme)), theme);
    for (const input of [{ theme }, { format: "copilot-slides-theme", version: 2, theme },
        { format: "copilot-slides-theme", version: 1, theme: { ...theme, accent: "red" } },
        { format: "copilot-slides-theme", version: 1, theme: { background: "#ffffff" } }]) {
        assert.throws(() => importTheme(JSON.stringify(input)));
    }
    assert.deepEqual(importTheme(exportTheme(DEFAULT_THEME)), DEFAULT_THEME);
});

test("logo sampling ignores transparent pixels and adjusts the dominant color to readable contrast", () => {
    const pixels = new Uint8ClampedArray([
        255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
        255, 0, 0, 0, 0, 220, 100, 255, 0, 220, 100, 255, 0, 0, 180, 255,
    ]);
    const theme = themeFromPixels(pixels, "Meiryo");
    assert.equal(theme.fontFamily, "Meiryo");
    assert.equal(theme.background, "#ffffff");
    assert.ok(contrastRatio(theme.background, theme.accent) >= 4.5);
    const rgb = theme.accent.slice(1).match(/../g).map((part) => parseInt(part, 16));
    assert.ok(rgb[1] > rgb[0] && rgb[1] > rgb[2]);
    assert.throws(() => themeFromPixels(new Uint8ClampedArray([255, 0, 0, 0])), /opaque/);
    assert.ok(contrastRatio("#ffffff", themeFromPixels(new Uint8ClampedArray([255, 255, 255, 255])).accent) >= 4.5);
});
