import test from "node:test";
import assert from "node:assert/strict";
import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";
import { emptyDeck, validateDeck } from "./model.mjs";
import { createPowerPoint } from "./export.mjs";
import { exportHtml, slideSvg } from "./render.mjs";

function fixture() {
    return validateDeck({ ...emptyDeck("export-test"), slides: [
        { id: "visible", title: "日本語 & <slide>", notes: "Speaker notes 日本語", elements: [
            { id: "title", type: "text", x: 40, y: 30, w: 600, h: 100, text: '<script>alert("bad")</script>日本語', color: "#123456" },
            { id: "shape", type: "shape", shape: "ellipse", x: 900, y: 40, w: 200, h: 120, color: "#123456" },
            { id: "image", type: "image", x: 1100, y: 40, w: 100, h: 100, alt: "Test image",
                src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1sAAAAASUVORK5CYII=" },
            { id: "table", type: "table", x: 40, y: 200, w: 500, h: 150, rows: [["A", "B"], ["1", "2"]], fontSize: 24 },
            { id: "chart", type: "chart", x: 650, y: 200, w: 500, h: 360, labels: ["A", "B"], values: [10, 20], color: "#123456" },
        ] },
        { id: "skipped", title: "Excluded", skipped: true, elements: [] },
    ] }, "export-test");
}
test("SVG and standalone HTML escape user content and omit skipped slides", () => {
    const deck = fixture();
    const svg = slideSvg(deck, deck.slides[0]);
    assert.ok(svg.includes("&lt;script&gt;"));
    assert.ok(!svg.includes('<script>alert("bad")'));
    const html = exportHtml(deck);
    assert.equal((html.match(/<section /g) || []).length, 1);
    assert.ok(!html.includes("Excluded"));
});
test("PPTX contains editable text, shapes, table, chart, notes and one unskipped slide", async () => {
    const pptx = createPowerPoint(fixture(), PptxGenJS);
    const bytes = await pptx.write({ outputType: "arraybuffer", compression: true });
    const zip = await JSZip.loadAsync(bytes);
    const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    assert.equal(slideFiles.length, 1);
    const xml = await zip.file(slideFiles[0]).async("string");
    assert.match(xml, /日本語/);
    assert.match(xml, /<a:tbl>/);
    assert.match(xml, /prst="ellipse"/);
    assert.match(xml, /<c:chart/);
    assert.match(xml, /<p:pic>/);
    assert.ok(Object.keys(zip.files).some((name) => /^ppt\/media\/.+\.png$/.test(name)));
    const notes = await zip.file("ppt/notesSlides/notesSlide1.xml").async("string");
    assert.match(notes, /Speaker notes 日本語/);
    assert.ok(Object.keys(zip.files).some((name) => name.startsWith("ppt/embeddings/")));
});

test("default typography survives SVG, HTML and editable PowerPoint export", async () => {
    const deck = validateDeck({ ...emptyDeck("design-export"), slides: [{
        id: "body", title: "Typography", elements: [
            { id: "text", type: "text", x: 64, y: 272, w: 1152, h: 384, text: "First\nSecond", fontSize: 32 },
        ],
    }] }, "design-export");
    const svg = slideSvg(deck, deck.slides[0]);
    assert.match(svg, /fill="#1a1a1c"/);
    assert.match(svg, /Noto Sans JP/);
    assert.match(svg, /y="86">Second/); // 6px padding + 32px baseline + 48px line step.
    assert.ok(exportHtml(deck).includes(svg));
    const zip = await JSZip.loadAsync(await createPowerPoint(deck, PptxGenJS).write({ outputType: "arraybuffer" }));
    const xml = await zip.file("ppt/slides/slide1.xml").async("string");
    assert.match(xml, /typeface="Noto Sans JP"/);
    assert.match(xml, /<a:spcPct val="150000"\s*\/>/);
    assert.match(xml, /<a:srgbClr val="1a1a1c"/i);
    deck.theme = { background: "#ffffff", foreground: "#1f2328", accent: "#0969da", fontFamily: "Arial" };
    delete deck.slides[0].elements[0].lineHeight;
    assert.match(slideSvg(deck, deck.slides[0]), /y="76.4">Second/);
});
