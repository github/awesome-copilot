import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { emptyDeck } from "./model.mjs";
import { exportHtml } from "./render.mjs";
import { JA } from "./locale-ja.mjs";
import { LOCALES, getLocale, normalizeLocale, resolveLocale, setLocale, t, translate } from "./i18n.mjs";

const read = (name) => readFileSync(new URL(name, import.meta.url), "utf8");
// Brand names and symbols that read the same in every language.
const NEUTRAL = new Set(["Copilot Slides", "HTML", "PowerPoint", "X", "Y", "←", "→", "0 / 0"]);
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join();
const sources = readdirSync(new URL(".", import.meta.url)).filter((name) => /\.(mjs|js)$/.test(name) &&
    !/\.test\.mjs$|-check\.js$/.test(name) && !["i18n.mjs", "locale-ja.mjs"].includes(name));

function sourceKeys() {
    const keys = new Set(), dynamic = [];
    for (const name of sources) {
        for (const match of read(name).matchAll(/(?<![\w.$])t\(\s*("(?:[^"\\]|\\.)*")?/g)) {
            if (match[1]) keys.add(JSON.parse(match[1]));
            else dynamic.push(name);
        }
    }
    return { keys, dynamic };
}

// Mirrors applyLocale: text nodes and a few attributes are looked up by their trimmed English text.
function markupKeys() {
    const html = read("index.html").replace(/<(script|style)[\s\S]*?<\/\1>/g, "");
    const keys = new Set();
    for (const match of html.matchAll(/>([^<>]+)</g)) if (match[1].trim()) keys.add(match[1].trim());
    for (const match of html.matchAll(/\s(?:aria-label|title|placeholder|alt)="([^"]*)"/g)) if (match[1].trim()) keys.add(match[1].trim());
    return keys;
}

test("every UI string has a Japanese translation and no entry is stale", () => {
    const { keys, dynamic } = sourceKeys();
    assert.deepEqual(dynamic, [], "t() must be called with a string literal");
    const used = new Set([...keys, ...markupKeys()]);
    assert.deepEqual([...used].filter((key) => !NEUTRAL.has(key) && !Object.hasOwn(JA, key)), []);
    assert.deepEqual(Object.keys(JA).filter((key) => !used.has(key)), []);
    assert.deepEqual([...NEUTRAL].filter((key) => Object.hasOwn(JA, key)), []);
});

test("translations keep the placeholders of the English text", () => {
    for (const [english, japanese] of Object.entries(JA)) assert.equal(placeholders(japanese), placeholders(english), english);
});

test("language comes from an explicit request, then browser preference, then English", () => {
    assert.deepEqual(LOCALES, ["en", "ja"]);
    assert.equal(resolveLocale("ja", "en-US"), "ja");
    assert.equal(resolveLocale(null, "fr-FR", "ja-JP", "en"), "ja");
    assert.equal(resolveLocale("en-GB", "ja"), "en");
    assert.equal(resolveLocale("de", undefined, "fr"), "en");
    assert.equal(resolveLocale(), "en");
    assert.equal(normalizeLocale("JA_jp"), "ja");
    assert.equal(normalizeLocale("zz"), null);
});

test("translate falls back to English, substitutes placeholders once and ignores inherited keys", () => {
    assert.equal(translate("ja", "Save"), "保存");
    assert.equal(translate("ja", "A string without a translation"), "A string without a translation");
    assert.equal(translate("ja", "constructor"), "constructor");
    assert.equal(translate("fr", "Save"), "Save");
    assert.equal(translate("ja", "Slide {n}: {message}", { n: 2, message: "{n}" }), "2枚目: {n}");
    assert.equal(translate("ja", "Slide {n}"), "スライド {n}");
    assert.equal(translate("en", "Slide {n}: {message}", { n: 2, message: "x" }), "Slide 2: x");
});

test("the active locale drives t()", () => {
    try {
        assert.equal(setLocale("ja-JP"), "ja");
        assert.equal(t("Save"), "保存");
        assert.equal(setLocale("zz"), "en");
        assert.equal(t("Save"), "Save");
    } finally { setLocale("en"); }
    assert.equal(getLocale(), "en");
});

test("exported HTML follows the active locale", () => {
    const deck = emptyDeck("i18n-test");
    try {
        assert.match(exportHtml(deck), /<html lang="en">.*<button id="prev">Previous<\/button>/s);
        setLocale("ja");
        assert.match(exportHtml(deck), /<html lang="ja">.*<button id="prev">前へ<\/button>/s);
        assert.match(exportHtml(deck, { print: true }), /PDFに保存（印刷）/);
    } finally { setLocale("en"); }
});
