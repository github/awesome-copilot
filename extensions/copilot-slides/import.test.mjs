import test from "node:test";
import assert from "node:assert/strict";
import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { readPowerPoint } from "./import.mjs";
import { setLocale } from "./i18n.mjs";
import { createPowerPoint, writePowerPoint } from "./export.mjs";
import { emptyDeck, validateDeck } from "./model.mjs";
import { slideSvg, exportHtml } from "./render.mjs";

const source = () => validateDeck({ ...emptyDeck("import-test"), slides: [{
    id: "opening", title: "日本語の資料", notes: "ノートを保持", transition: "fade",
    elements: [
        { id: "heading", type: "text", x: 64, y: 64, w: 1152, h: 150, text: "日本語の資料", fontSize: 48, bold: true },
        { id: "picture", type: "image", x: 64, y: 240, w: 100, h: 100, alt: "テスト画像", src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1sAAAAASUVORK5CYII=" },
        { id: "table", type: "table", x: 240, y: 240, w: 500, h: 200, rows: [["名前", "値"], ["資料", "12"]], fontSize: 24 },
        { id: "chart", type: "chart", x: 760, y: 240, w: 450, h: 380, chartType: "line", labels: ["A", "B"], values: [10, 20], color: "#0017c1" },
    ],
}] }, "import-test");
const output = async (deck) => writePowerPoint(deck, createPowerPoint(deck, PptxGenJS), JSZip);

test("PPTX imports editable text, pictures, table, chart, notes and fade; reports simplifications", async () => {
    const result = await readPowerPoint(await output(source()), JSZip, DOMParser);
    assert.equal(result.deck.slides.length, 1);
    const slide = result.deck.slides[0];
    assert.equal(slide.notes, "ノートを保持");
    assert.equal(slide.transition, "fade");
    assert.equal(slide.elements.find((e) => e.type === "text").text, "日本語の資料");
    assert.equal(slide.elements.find((e) => e.type === "text").fontSize, 48);
    assert.equal(slide.elements.find((e) => e.type === "text").x, 64);
    assert.ok(slide.elements.some((e) => e.type === "image" && e.src.startsWith("data:image/png;base64,")));
    assert.deepEqual(slide.elements.find((e) => e.type === "table").rows, [["名前", "値"], ["資料", "12"]]);
    assert.deepEqual(slide.elements.find((e) => e.type === "chart").values, [10, 20]);
    assert.equal(slide.elements.find((e) => e.type === "chart").chartType, "line");
    assert.equal(result.brandAvailable, true);
    assert.equal(result.brand.foreground, "#1a1a1c");
    assert.equal(result.brand.accent, "#0017c1");
    assert.equal(result.brand.fontFamily, "Noto Sans JP");
    assert.ok(result.warnings.some((w) => w.includes("Table cell widths")));
    assert.deepEqual(result.deck.openQuestions, result.warnings);
});

test("all chart types produce native editable PPTX and reload their data", async () => {
    for (const chartType of ["bar", "line", "pie"]) {
        const deck = source(), chart = deck.slides[0].elements.find((e) => e.type === "chart");
        chart.chartType = chartType;
        const bytes = await output(deck), zip = await JSZip.loadAsync(bytes);
        const chartPath = Object.keys(zip.files).find((path) => /^ppt\/charts\/chart\d+\.xml$/.test(path));
        const xml = await zip.file(chartPath).async("string");
        assert.ok(xml.includes(`<c:${chartType}Chart>`));
        if (chartType !== "pie") {
            const chartNode = new DOMParser().parseFromString(xml, "application/xml").getElementsByTagNameNS("*", `${chartType}Chart`)[0];
            assert.equal(chartNode.getElementsByTagNameNS("*", "axId").length, 2);
            if (chartType === "line") {
                assert.equal(chartNode.firstChild.localName, "grouping");
                assert.equal(chartNode.firstChild.getAttribute("val"), "standard");
                assert.equal(chartNode.getElementsByTagNameNS("*", "invertIfNegative").length, 0);
                const series = chartNode.getElementsByTagNameNS("*", "ser")[0];
                const childNames = [...series.childNodes].filter((node) => node.nodeType === 1).map((node) => node.localName);
                assert.ok(childNames.indexOf("marker") < childNames.indexOf("dLbls"));
            }
        }
        const presentation = await zip.file("ppt/presentation.xml").async("string");
        assert.ok(presentation.indexOf("<p:notesMasterIdLst>") < presentation.indexOf("<p:sldIdLst>"));
        assert.equal((await readPowerPoint(bytes, JSZip, DOMParser)).deck.slides[0].elements.find((e) => e.type === "chart").chartType, chartType);
        const svg = slideSvg(deck, deck.slides[0]);
        if (chartType === "pie") assert.match(svg, /33.3%/);
        if (chartType === "line") assert.match(svg, /<polyline/);
    }
});

test("zero and single-slice pies remain valid and labeled", () => {
    const deck = source(), chart = deck.slides[0].elements.find((e) => e.type === "chart");
    chart.chartType = "pie"; chart.values = [0, 0];
    assert.match(slideSvg(deck, deck.slides[0]), /total is 0/);
    chart.values = [20, 0];
    assert.match(slideSvg(deck, deck.slides[0]), /<circle/);
    assert.match(slideSvg(deck, deck.slides[0]), /100.0%/);
});

test("PPTX and HTML retain opt-in transitions with reduced-motion and print support", async () => {
    const deck = source();
    const zip = await JSZip.loadAsync(await output(deck));
    const xml = await zip.file("ppt/slides/slide1.xml").async("string");
    assert.match(xml, /<p:transition spd="med"><p:fade\/><\/p:transition>/);
    const html = exportHtml(deck);
    assert.match(html, /data-transition="fade"/);
    assert.match(html, /prefers-reduced-motion/);
    assert.match(html, /animation:none!important/);
});

test("invalid ZIP and excessive expanded size are rejected before parsing", async () => {
    await assert.rejects(readPowerPoint(new Uint8Array([0, 1, 2]), JSZip, DOMParser));
    const bytes = new Uint8Array(await output(source())), view = new DataView(bytes.buffer);
    let offset = 0;
    for (; offset < bytes.length - 46; offset++) if (view.getUint32(offset, true) === 0x02014b50) break;
    view.setUint32(offset + 24, 60000001, true);
    await assert.rejects(readPowerPoint(bytes, JSZip, DOMParser), /60 MB/);
});

test("external links are not fetched and XML with a DTD is rejected", async () => {
    const zip = await JSZip.loadAsync(await output(source()));
    let rels = await zip.file("ppt/slides/_rels/slide1.xml.rels").async("string");
    rels = rels.replace("</Relationships>", '<Relationship Id="external-test" Type="hyperlink" Target="https://invalid.example/" TargetMode="External"/></Relationships>');
    zip.file("ppt/slides/_rels/slide1.xml.rels", rels);
    assert.ok((await readPowerPoint(await zip.generateAsync({ type: "arraybuffer" }), JSZip, DOMParser)).warnings.some((w) => w.includes("External")));
    zip.file("ppt/presentation.xml", '<!DOCTYPE test [<!ENTITY test "x">]><test/>');
    await assert.rejects(readPowerPoint(await zip.generateAsync({ type: "arraybuffer" }), JSZip, DOMParser), /DTD/);
});

test("PPTX resolves placeholder geometry, expands nested groups and imports master/layout decorations", async () => {
    const zip = await JSZip.loadAsync(await output(source()));
    const namespaces = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
    const point = (tag, x, y) => `<a:${tag} x="${x * 9525}" y="${y * 9525}"/>`;
    const size = (tag, w, h) => `<a:${tag} cx="${w * 9525}" cy="${h * 9525}"/>`;
    const transform = (x, y, w, h) => `<a:xfrm>${point("off", x, y)}${size("ext", w, h)}</a:xfrm>`;
    const text = (value) => `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${value}</a:t></a:r></a:p></p:txBody>`;
    const shape = (id, x, y, w, h, content, fill = "") =>
        `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${transform(x, y, w, h)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : ""}</p:spPr>${text(content)}</p:sp>`;
    const group = (id, x, y, w, h, ox, oy, cw, ch, content) =>
        `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="${id}" name="Group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm>${point("off", x, y)}${size("ext", w, h)}${point("chOff", ox, oy)}${size("chExt", cw, ch)}</a:xfrm></p:grpSpPr>${content}</p:grpSp>`;
    const placeholder = `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/>${text("Inherited title")}</p:sp>`;
    const grouped = group(3, 200, 300, 400, 200, 50, 25, 200, 100,
        shape(4, 75, 50, 100, 40, "Grouped text") +
        group(5, 100, 50, 50, 50, 0, 0, 50, 50, shape(6, 10, 10, 20, 10, "Nested")));
    const slideXml = `<p:sld ${namespaces}><p:cSld><p:spTree>${placeholder}${grouped}</p:spTree></p:cSld></p:sld>`;
    zip.file("ppt/slides/slide1.xml", slideXml);
    zip.file("ppt/slideLayouts/slideLayout1.xml", `<p:sldLayout ${namespaces}><p:cSld><p:spTree>
        <p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title" idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr>${transform(64, 64, 800, 120)}</p:spPr><p:txBody><a:bodyPr/><a:lstStyle><a:lvl1pPr><a:defRPr sz="3600"/></a:lvl1pPr></a:lstStyle><a:p><a:r><a:t>Layout prompt must not be copied</a:t></a:r></a:p></p:txBody></p:sp>
        ${shape(7, 1000, 64, 120, 40, "", "0017c1")}</p:spTree></p:cSld></p:sldLayout>`);
    zip.file("ppt/slideMasters/slideMaster1.xml", `<p:sldMaster ${namespaces}><p:cSld><p:spTree>${shape(8, 20, 620, 96, 48, "", "123456")}</p:spTree></p:cSld></p:sldMaster>`);
    const result = await readPowerPoint(await zip.generateAsync({ type: "arraybuffer" }), JSZip, DOMParser);
    const slide = result.deck.slides[0], title = slide.elements.find((e) => e.text === "Inherited title");
    assert.equal(slide.title, "Inherited title");
    assert.deepEqual([title.x, title.y, title.w, title.h, title.fontSize], [64, 64, 800, 120, 48]);
    assert.ok(!slide.elements.some((e) => e.text.includes("Layout prompt")));
    const groupedText = slide.elements.find((e) => e.text === "Grouped text");
    assert.deepEqual([groupedText.x, groupedText.y, groupedText.w, groupedText.h], [250, 350, 200, 80]);
    const nested = slide.elements.find((e) => e.text === "Nested");
    assert.deepEqual([nested.x, nested.y, nested.w, nested.h], [320, 370, 40, 20]);
    assert.equal(slide.elements.filter((e) => e.type === "shape").length, 2);
    assert.ok(result.warnings.some((w) => w.includes("Groups were expanded")));
    assert.ok(result.warnings.some((w) => w.includes("Master and layout decoration")));
    zip.file("ppt/slides/slide1.xml", slideXml.replace("<p:sld ", '<p:sld showMasterSp="0" '));
    const noMaster = await readPowerPoint(await zip.generateAsync({ type: "arraybuffer" }), JSZip, DOMParser);
    assert.ok(!noMaster.deck.slides[0].elements.some((e) => e.color === "#123456"));
    assert.ok(noMaster.deck.slides[0].elements.some((e) => e.color === "#0017c1"));
});

test("import warnings and errors follow the active locale", async () => {
    const zip = await JSZip.loadAsync(await output(source()));
    let rels = await zip.file("ppt/slides/_rels/slide1.xml.rels").async("string");
    rels = rels.replace("</Relationships>", '<Relationship Id="external-test" Type="hyperlink" Target="https://invalid.example/" TargetMode="External"/></Relationships>');
    zip.file("ppt/slides/_rels/slide1.xml.rels", rels);
    try {
        setLocale("ja");
        const warnings = (await readPowerPoint(await zip.generateAsync({ type: "arraybuffer" }), JSZip, DOMParser)).warnings;
        assert.ok(warnings.includes("外部リンク・外部画像は取得していません。"));
        assert.ok(!warnings.some((w) => w.includes("External links")));
        zip.file("ppt/presentation.xml", '<!DOCTYPE test [<!ENTITY test "x">]><test/>');
        await assert.rejects(readPowerPoint(await zip.generateAsync({ type: "arraybuffer" }), JSZip, DOMParser), /DTDを含むXML/);
    } finally { setLocale("en"); }
    assert.ok((await readPowerPoint(await zip.generateAsync({ type: "arraybuffer" }), JSZip, DOMParser).catch((e) => e)).message.includes("XML containing a DTD"));
});
