import test from "node:test";
import assert from "node:assert/strict";
import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { buildSteps, navigateBuild } from "./presentation.mjs";
import { emptyDeck, validateDeck } from "./model.mjs";
import { createPowerPoint, writePowerPoint } from "./export.mjs";
import { readPowerPoint } from "./import.mjs";
import { exportHtml, slideSvg } from "./render.mjs";

const fixture = () => validateDeck({ ...emptyDeck("build-test"), slides: [
    { id: "opening", title: "Builds", elements: [
        { id: "heading", type: "text", x: 64, y: 64, w: 800, h: 120, text: "Always visible" },
        { id: "one", type: "text", x: 64, y: 200, w: 800, h: 120, text: "First build", animation: { effect: "fade", step: 4 } },
        { id: "two", type: "shape", shape: "rect", x: 64, y: 340, w: 800, h: 120, text: "Same build", animation: { effect: "appear", step: 4 } },
        { id: "three", type: "chart", x: 900, y: 200, w: 300, h: 400, labels: ["A"], values: [2], animation: { effect: "fade", step: 9 } },
    ] },
    { id: "hidden", title: "Skip", skipped: true, elements: [] },
    { id: "end", title: "End", elements: [] },
] }, "build-test");

test("click builds group equal orders and navigate both ways without resetting at the ends", () => {
    const deck = fixture();
    assert.deepEqual(buildSteps(deck.slides[0]), [4, 9]);
    let state = { slideId: "opening", build: 0 };
    for (const expected of [
        { slideId: "opening", build: 1 }, { slideId: "opening", build: 2 },
        { slideId: "end", build: 0 }, { slideId: "end", build: 0 },
    ]) {
        state = navigateBuild(deck.slides, state, 1);
        assert.deepEqual(state, expected);
    }
    for (const expected of [
        { slideId: "opening", build: 2 }, { slideId: "opening", build: 1 },
        { slideId: "opening", build: 0 }, { slideId: "opening", build: 0 },
    ]) {
        state = navigateBuild(deck.slides, state, -1);
        assert.deepEqual(state, expected);
    }
    assert.deepEqual(navigateBuild([], state, 1), { slideId: undefined, build: 0 });
});

test("animation data is validated and static exports retain all content", () => {
    const deck = fixture();
    for (const animation of [null, { effect: "fly", step: 1 }, { effect: "fade", step: 0 }, { effect: "fade", step: 1.5 }, { effect: "appear", step: 81 }]) {
        const invalid = structuredClone(deck);
        invalid.slides[0].elements[0].animation = animation;
        assert.throws(() => validateDeck(invalid, deck.id), { code: "invalid_deck" });
    }
    const svg = slideSvg(deck, deck.slides[0]);
    assert.match(svg, /data-build="1" data-animation="fade"/);
    assert.doesNotMatch(svg, /visibility="hidden"|visibility:hidden/);
    const html = exportHtml(deck);
    assert.match(html, /navigateBuild/);
    assert.match(html, /visibility:visible!important/);
    const print = exportHtml(deck, { print: true });
    assert.match(print, /class="print-preview"/);
    assert.doesNotMatch(print, /<script/);
    assert.match(print, /id="print"/);
});

test("native PowerPoint builds target editable objects and round-trip their grouping", async () => {
    const deck = fixture();
    deck.slides[2].transition = "fade";
    deck.slides[2].elements.push({ id: "data", type: "table", x: 64, y: 64, w: 600, h: 240,
        rows: [["A", "B"], ["1", "2"]], fontSize: 24, color: "#1a1a1c", animation: { effect: "fade", step: 1 } });
    const bytes = await writePowerPoint(deck, createPowerPoint(deck, PptxGenJS), JSZip);
    const zip = await JSZip.loadAsync(bytes);
    const doc = new DOMParser().parseFromString(await zip.file("ppt/slides/slide1.xml").async("string"), "application/xml");
    const nodes = (name) => [...doc.getElementsByTagNameNS("*", name)];
    assert.equal(nodes("timing").length, 1);
    assert.equal(nodes("timing")[0].parentNode.localName, "sld");
    const ids = nodes("cTn").map((n) => n.getAttribute("id"));
    assert.equal(new Set(ids).size, ids.length);
    const shapeIds = new Set(nodes("cNvPr").map((n) => n.getAttribute("id")));
    assert.ok(nodes("spTgt").every((n) => shapeIds.has(n.getAttribute("spid"))));
    assert.equal(nodes("cTn").filter((n) => n.getAttribute("nodeType") === "clickEffect").length, 2);
    const imported = await readPowerPoint(bytes, JSZip, DOMParser);
    const elements = imported.deck.slides[0].elements;
    assert.equal(elements.find((e) => e.text === "Always visible").animation, undefined);
    assert.deepEqual(elements.find((e) => e.text === "First build").animation, { effect: "fade", step: 1 });
    assert.deepEqual(elements.find((e) => e.text === "Same build").animation, { effect: "appear", step: 1 });
    assert.deepEqual(elements.find((e) => e.type === "chart").animation, { effect: "fade", step: 2 });
    assert.ok(!imported.warnings.some((w) => w.includes("Unsupported object animations")));
    const tableSlide = new DOMParser().parseFromString(await zip.file("ppt/slides/slide2.xml").async("string"), "application/xml");
    for (const name of ["transition", "timing"]) {
        const nodes = [...tableSlide.getElementsByTagNameNS("*", name)];
        assert.equal(nodes.length, 1);
        assert.equal(nodes[0].parentNode.localName, "sld", `${name} must not be inserted into a table's extension list`);
    }
});
