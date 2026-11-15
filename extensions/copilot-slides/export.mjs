import { chartPalette, escapeXml } from "./render.mjs";
import { buildSteps } from "./presentation.mjs";

export function createPowerPoint(deck, PptxGenJS, basicFonts = false) {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.title = deck.title;
    pptx.subject = "Created with Copilot Slides";
    pptx.author = "Copilot Slides";
    pptx.lang = "ja-JP";
    const fontFace = basicFonts ? "Arial" : deck.theme.fontFamily.split(",")[0].replace(/['"]/g, "").trim();
    pptx.theme = { headFontFace: fontFace, bodyFontFace: fontFace, lang: "ja-JP" };
    const hex = (color) => color.slice(1);
    for (const source of deck.slides.filter((s) => !s.skipped)) {
        const slide = pptx.addSlide();
        slide.background = { color: hex(source.background || deck.theme.background) };
        if (source.notes) slide.addNotes(source.notes);
        for (const e of source.elements) {
            const box = { x: e.x / 96, y: e.y / 96, w: e.w / 96, h: e.h / 96, objectName: `copilot-${e.id}` };
            const text = { ...box, fontFace, fontSize: e.fontSize * .75, bold: e.bold, align: e.align,
                color: hex(e.color), margin: 4.5, breakLine: false, valign: "top" };
            if (e.lineHeight !== undefined) text.lineSpacingMultiple = e.lineHeight;
            if (e.type === "text") slide.addText(e.text, text);
            if (e.type === "shape") {
                slide.addShape(e.shape === "ellipse" ? pptx.ShapeType.ellipse : pptx.ShapeType.rect, {
                    ...box, fill: { color: hex(e.color) }, line: { color: hex(e.color), transparency: 100 },
                });
                if (e.text) slide.addText(e.text, { ...text, color: hex(deck.theme.foreground) });
            }
            if (e.type === "image") slide.addImage({ data: e.src, altText: e.alt, ...box,
                sizing: { type: "contain", w: box.w, h: box.h } });
            if (e.type === "table") slide.addTable(e.rows, {
                ...box, rowH: box.h / e.rows.length, colW: box.w / e.rows[0].length,
                fontFace, fontSize: e.fontSize * .75, color: hex(e.color), margin: 4.5,
                border: { type: "solid", pt: .75, color: hex(deck.theme.foreground) },
                fill: { color: hex(deck.theme.background) }, autoPage: false, valign: "top",
            });
            if (e.type === "chart") slide.addChart(pptx.ChartType[e.chartType || "bar"],
                [{ name: e.text || "Data", labels: e.labels, values: e.values }],
                { ...box, barDir: "col", showLegend: e.chartType === "pie", showValue: true, showTitle: false,
                    chartColors: (e.chartType === "pie" ? chartPalette(e.color) : [e.color]).map(hex), showCatName: false, valAxisMinVal: 0,
                    catAxisLabelFontFace: fontFace, catAxisLabelFontSize: 13.5, catAxisLabelColor: hex(deck.theme.foreground),
                    valAxisLabelFontFace: fontFace, valAxisLabelColor: hex(deck.theme.foreground),
                    showBorder: false });
        }
    }
    return pptx;
}

function slideTiming(slide, xml) {
    const steps = buildSteps(slide);
    if (!steps.length) return "";
    const targets = new Map();
    for (const match of xml.matchAll(/<p:cNvPr\b[^>]*>/g)) {
        const id = /\bid="(\d+)"/.exec(match[0])?.[1], name = /\bname="([^"]*)"/.exec(match[0])?.[1];
        if (id && name) targets.set(name, [...(targets.get(name) || []), id]);
    }
    let id = 3;
    const condition = (delay) => `<p:stCondLst><p:cond delay="${delay}"/></p:stCondLst>`;
    const group = (content, delay) => `<p:par><p:cTn id="${id++}" fill="hold">${condition(delay)}<p:childTnLst>${content}</p:childTnLst></p:cTn></p:par>`;
    const groups = steps.map((step) => {
        let first = true;
        const effects = slide.elements.filter((e) => e.animation?.step === step).flatMap((element) => {
            const shapeIds = targets.get(`copilot-${element.id}`);
            if (!shapeIds?.length) throw new Error(`PowerPoint animation target was not exported: ${element.id}`);
            return shapeIds.map((shapeId) => {
                const nodeType = first ? "clickEffect" : "withEffect"; first = false;
                const target = `<p:tgtEl><p:spTgt spid="${shapeId}"/></p:tgtEl>`;
                const visible = `<p:set><p:cBhvr><p:cTn id="${id++}" dur="1" fill="hold">${condition(0)}</p:cTn>${target}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>`;
                const fade = element.animation.effect === "fade" ? `<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${id++}" dur="300"/>${target}</p:cBhvr></p:animEffect>` : "";
                return `<p:par><p:cTn id="${id++}" presetID="${fade ? 10 : 1}" presetClass="entr" presetSubtype="0" fill="hold" nodeType="${nodeType}">${condition(0)}<p:childTnLst>${visible}${fade}</p:childTnLst></p:cTn></p:par>`;
            });
        }).join("");
        return group(group(effects, 0), "indefinite");
    }).join("");
    const navigation = (direction) => `<p:${direction.toLowerCase()}CondLst><p:cond evt="on${direction}" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:${direction.toLowerCase()}CondLst>`;
    return `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${groups}</p:childTnLst></p:cTn>${navigation("Prev")}${navigation("Next")}</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`;
}

function insertSlideChild(xml, content, before) {
    let depth = 0;
    // PptxGenJS output also contains nested p:extLst nodes inside tables and images.
    for (const match of xml.matchAll(/<[^>]+>/g)) {
        const tag = match[0];
        if (tag.startsWith("<?") || tag.startsWith("<!")) continue;
        if (depth === 1 && (tag === "</p:sld>" || before.some((name) => new RegExp(`^<p:${name}(?:\\s|/?>)`).test(tag)))) {
            return xml.slice(0, match.index) + content + xml.slice(match.index);
        }
        if (tag.startsWith("</")) depth--;
        else if (!tag.endsWith("/>")) depth++;
    }
    throw new Error("Cannot locate the generated PowerPoint slide root.");
}

export async function writePowerPoint(deck, pptx, JSZip) {
    const bytes = await pptx.write({ outputType: "arraybuffer", compression: true });
    const slides = deck.slides.filter((slide) => !slide.skipped);
    if (!JSZip) throw new Error("ZIP library is required to export PowerPoint themes and transitions.");
    const zip = await JSZip.loadAsync(bytes);
    // Normalize known schema issues in PptxGenJS 4.0.1 without modifying the vendor bundle.
    let presentation = await zip.file("ppt/presentation.xml").async("string");
    const notesMaster = /<p:notesMasterIdLst>[\s\S]*?<\/p:notesMasterIdLst>/.exec(presentation)?.[0];
    if (notesMaster) {
        presentation = presentation.replace(notesMaster, "").replace(/(<p:sldIdLst\b|<p:sldSz\b)/, `${notesMaster}$1`);
        zip.file("ppt/presentation.xml", presentation);
    }
    for (const name of Object.keys(zip.files).filter((path) => /^ppt\/charts\/chart\d+\.xml$/.test(path))) {
        const xml = await zip.file(name).async("string");
        zip.file(name, xml.replace(/<c:(bar|line)Chart\b[^>]*>[\s\S]*?<\/c:\1Chart>/g, (chart, kind) => {
            if (kind === "line") {
                if (!/<c:grouping\b/.test(chart)) chart = chart.replace(/(<c:lineChart\b[^>]*>)/, '$1<c:grouping val="standard"/>');
                chart = chart.replace(/<c:invertIfNegative\b[^>]*\/>/g, "");
                chart = chart.replace(/<c:ser\b[^>]*>[\s\S]*?<\/c:ser>/g, (series) => {
                    const marker = /<c:marker\b[^>]*>[\s\S]*?<\/c:marker>/.exec(series)?.[0];
                    return marker ? series.replace(marker, "").replace(/(<c:(?:dPt|dLbls|trendline|errBars|cat|val|smooth|extLst)\b|<\/c:ser>)/, `${marker}$1`) : series;
                });
            }
            let axes = 0;
            return chart.replace(/<c:axId\b[^>]*\/>/g, (axis) => ++axes <= 2 ? axis : "");
        }));
    }
    for (const name of Object.keys(zip.files).filter((path) => /^ppt\/theme\/theme\d+\.xml$/.test(path))) {
        let xml = await zip.file(name).async("string");
        for (const [slot, value] of Object.entries({ dk1: deck.theme.foreground, lt1: deck.theme.background, accent1: deck.theme.accent })) {
            xml = xml.replace(new RegExp(`<a:${slot}>[\\s\\S]*?</a:${slot}>`), `<a:${slot}><a:srgbClr val="${value.slice(1)}"/></a:${slot}>`);
        }
        xml = xml.replace(/<a:font script="Jpan" typeface="[^"]*"\s*\/>/g, `<a:font script="Jpan" typeface="${escapeXml(pptx.theme.bodyFontFace)}"/>`);
        zip.file(name, xml);
    }
    for (const [index, slide] of slides.entries()) {
        const name = `ppt/slides/slide${index + 1}.xml`;
        let xml = await zip.file(name).async("string");
        const timing = slideTiming(slide, xml);
        if (timing) {
            xml = xml.replace(/<p:timing\b[^>]*>[\s\S]*?<\/p:timing>|<p:timing\s*\/>/g, "");
            xml = insertSlideChild(xml, timing, ["extLst"]);
        }
        if (slide.transition === "fade") xml = insertSlideChild(xml, '<p:transition spd="med"><p:fade/></p:transition>', ["timing", "extLst"]);
        zip.file(name, xml);
    }
    return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}
