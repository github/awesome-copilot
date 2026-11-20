import { DEFAULT_THEME, validateDeck } from "./model.mjs";
import { t } from "./i18n.mjs";

const all = (node, name) => Array.from(node?.getElementsByTagNameNS("*", name) || []);
const first = (node, name) => all(node, name)[0];
const attr = (node, name) => node?.getAttribute(name);
const children = (node) => Array.from(node?.childNodes || []).filter((child) => child.nodeType === 1);
const direct = (node, name) => children(node).find((child) => child.localName === name);
const text = (node) => all(node, "p").map((p) => children(p).map((part) =>
    part.localName === "br" ? "\n" : all(part, "t").map((t) => t.textContent).join("")).join("")).join("\n");
const relId = (node, local) => node?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", local);

function checkZip(bytes) {
    if (bytes.byteLength > 22000000) throw new Error(t("The PPTX must be 22 MB or smaller."));
    const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = bytes.length - 22;
    for (; end >= Math.max(0, bytes.length - 65557); end--) if (data.getUint32(end, true) === 0x06054b50) break;
    if (end < 0 || data.getUint32(end, true) !== 0x06054b50) throw new Error(t("Couldn't read the PPTX ZIP structure."));
    const count = data.getUint16(end + 10, true);
    let offset = data.getUint32(end + 16, true), total = 0;
    if (count > 2000 || data.getUint16(end + 4, true) || data.getUint16(end + 6, true)) throw new Error(t("Split ZIP archives and archives with many files are not supported."));
    for (let i = 0; i < count; i++) {
        if (offset + 46 > bytes.length || data.getUint32(offset, true) !== 0x02014b50) throw new Error(t("The ZIP index is invalid."));
        if (data.getUint16(offset + 8, true) & 1) throw new Error(t("Encrypted PPTX files are not supported."));
        total += data.getUint32(offset + 24, true);
        if (total > 60000000) throw new Error(t("PPTX files larger than 60 MB when extracted are not supported."));
        offset += 46 + data.getUint16(offset + 28, true) + data.getUint16(offset + 30, true) + data.getUint16(offset + 32, true);
    }
}

export async function readPowerPoint(buffer, JSZip, Parser = globalThis.DOMParser) {
    const bytes = new Uint8Array(buffer);
    checkZip(bytes);
    const zip = await JSZip.loadAsync(bytes);
    const warnings = new Set();
    const warn = (message) => warnings.add(message);
    async function xml(path, optional = false) {
        const file = zip.file(path);
        if (!file) { if (optional) return null; throw new Error(t("A required PPTX file is missing: {path}", { path })); }
        const source = await file.async("string");
        if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error(t("XML containing a DTD can't be imported."));
        const doc = new Parser().parseFromString(source, "application/xml");
        if (first(doc, "parsererror")) throw new Error(t("Invalid XML: {path}", { path }));
        return doc;
    }
    async function relationships(path) {
        const slash = path.lastIndexOf("/");
        const rel = await xml(`${path.slice(0, slash + 1)}_rels/${path.slice(slash + 1)}.rels`, true);
        const map = new Map();
        for (const node of all(rel, "Relationship")) {
            if (attr(node, "TargetMode") === "External") {
                warn(t("External links and external images were not fetched."));
                continue;
            }
            const target = attr(node, "Target");
            if (!target || target.includes("\\") || /^[a-z]+:/i.test(target)) throw new Error(t("A PPTX internal reference is invalid."));
            const parts = target.startsWith("/") ? [] : path.slice(0, slash).split("/");
            for (const part of target.split("/")) {
                if (part === "..") { if (!parts.length) throw new Error(t("A PPTX internal reference is out of range.")); parts.pop(); }
                else if (part && part !== ".") parts.push(part);
            }
            map.set(attr(node, "Id"), { path: parts.join("/"), type: attr(node, "Type")?.split("/").pop() });
        }
        return map;
    }
    const presentation = await xml("ppt/presentation.xml");
    const rels = await relationships("ppt/presentation.xml");
    const slidePaths = all(first(presentation, "sldIdLst"), "sldId").map((s) => rels.get(relId(s, "id"))?.path);
    if (slidePaths.some((path) => !path) || slidePaths.length > 60) throw new Error(t("A slide reference is invalid, or there are more than 60 slides."));
    const size = first(presentation, "sldSz"), cx = Number(attr(size, "cx")), cy = Number(attr(size, "cy"));
    if (!(cx > 0 && cy > 0)) throw new Error(t("The slide size is invalid."));
    if (Math.abs(cx / cy - 16 / 9) > .01) warn(t("Pages that are not 16:9 were converted to 1280×720. Check the aspect ratio."));
    let themeDoc;
    if (slidePaths[0]) {
        const slideRels = await relationships(slidePaths[0]);
        const layout = [...slideRels.values()].find((r) => r.type === "slideLayout");
        const master = layout && [...(await relationships(layout.path)).values()].find((r) => r.type === "slideMaster");
        const theme = master && [...(await relationships(master.path)).values()].find((r) => r.type === "theme");
        if (theme) themeDoc = await xml(theme.path);
    }
    themeDoc ||= await xml("ppt/theme/theme1.xml", true);
    if (!themeDoc) warn(t("The default colors and fonts were used because there is no theme."));
    if (Object.keys(zip.files).filter((path) => /^ppt\/theme\/theme\d+\.xml$/.test(path)).length > 1) warn(t("Multiple master themes were unified to the first slide's theme."));
    const colors = {};
    for (const node of children(first(themeDoc, "clrScheme"))) {
        const color = first(node, "srgbClr") || first(node, "sysClr");
        const hex = attr(color, "val") === "windowText" || attr(color, "lastClr") ? attr(color, "lastClr") : attr(color, "val");
        if (/^[0-9a-f]{6}$/i.test(hex)) colors[node.localName] = `#${hex}`;
    }
    const fontNode = first(themeDoc, "minorFont");
    const japanese = all(fontNode, "font").find((f) => attr(f, "script") === "Jpan");
    const font = attr(japanese, "typeface") || attr(first(fontNode, "ea"), "typeface") || attr(first(fontNode, "latin"), "typeface");
    const theme = { ...DEFAULT_THEME, background: colors.lt1 || DEFAULT_THEME.background,
        foreground: colors.dk1 || DEFAULT_THEME.foreground, accent: colors.accent1 || DEFAULT_THEME.accent,
        fontFamily: font || DEFAULT_THEME.fontFamily };
    const colorOf = (node, fallback) => {
        const rgb = first(node, "srgbClr"), scheme = attr(first(node, "schemeClr"), "val");
        if (rgb && /^[0-9a-f]{6}$/i.test(attr(rgb, "val"))) return `#${attr(rgb, "val")}`;
        return colors[({ tx1: "dk1", bg1: "lt1", tx2: "dk2", bg2: "lt2" })[scheme] || scheme] || fallback;
    };
    const transformOf = (node) => direct(direct(node, "spPr"), "xfrm") || direct(node, "xfrm") || direct(direct(node, "grpSpPr"), "xfrm");
    const geometry = (sources, parent) => {
        const transforms = sources.map(transformOf).filter(Boolean);
        const off = transforms.map((t) => direct(t, "off")).find(Boolean), ext = transforms.map((t) => direct(t, "ext")).find(Boolean);
        const raw = [attr(off, "x"), attr(off, "y"), attr(ext, "cx"), attr(ext, "cy")];
        if (raw.some((v) => v === null || v === undefined || v === "" || !Number.isFinite(Number(v)))) return null;
        const values = raw.map(Number);
        const [x, y, w, h] = [values[0] * parent.sx + parent.tx, values[1] * parent.sy + parent.ty,
            values[2] * parent.sx, values[3] * parent.sy].map((n, i) => n * (i % 2 ? 720 / cy : 1280 / cx));
        if (x < 0 || y < 0 || w < 1 || h < 1 || x + w > 1280.1 || y + h > 720.1) return null;
        if (transforms.some((t) => Number(attr(t, "rot")))) warn(t("Rotated elements were imported without rotation."));
        if (transforms.some((t) => ["1", "true"].includes(attr(t, "flipH")) || ["1", "true"].includes(attr(t, "flipV")))) warn(t("Element flipping was not reproduced."));
        return { x, y, w: Math.min(w, 1280 - x), h: Math.min(h, 720 - y) };
    };
    const slides = [];
    for (const [index, path] of slidePaths.entries()) {
        const doc = await xml(path), relations = await relationships(path), elements = [];
        const note = (message) => warn(t("Slide {n}: {message}", { n: index + 1, message }));
        const layoutRel = [...relations.values()].find((r) => r.type === "slideLayout");
        const layout = layoutRel && await xml(layoutRel.path), layoutRelations = layoutRel ? await relationships(layoutRel.path) : new Map();
        const masterRel = [...layoutRelations.values()].find((r) => r.type === "slideMaster");
        const master = masterRel && await xml(masterRel.path), masterRelations = masterRel ? await relationships(masterRel.path) : new Map();
        const placeholder = (node) => first(direct(node, "nvSpPr"), "ph");
        const matchPlaceholder = (node, source, byIndex) => {
            const ph = placeholder(node); if (!ph) return null;
            const candidates = children(first(source, "spTree")).filter((s) => placeholder(s));
            const type = attr(ph, "type") || "obj", key = attr(ph, "idx") || "0";
            return (byIndex && candidates.find((s) => (attr(placeholder(s), "idx") || "0") === key)) ||
                candidates.find((s) => (attr(placeholder(s), "type") || "obj") === type);
        };
        const inherited = (node) => {
            const layoutShape = matchPlaceholder(node, layout, true);
            return [node, layoutShape, matchPlaceholder(layoutShape || node, master, false)].filter(Boolean);
        };
        const slideTargets = new Map(), identity = { sx: 1, sy: 1, tx: 0, ty: 0 };
        const transition = first(doc, "transition");
        if (transition && !first(transition, "fade")) note(t("Transitions other than fade were not imported."));
        const add = (e) => elements.push({ id: `element-${elements.length + 1}`, text: "", fontSize: 32, color: theme.foreground, ...e });
        async function visit(node, sourceRelations, parent = identity, fromSlide = false, depth = 0) {
            if (["nvGrpSpPr", "grpSpPr"].includes(node.localName) || (!fromSlide && placeholder(node))) return;
            const start = elements.length;
            if (node.localName === "grpSp") {
                if (depth >= 16) { note(t("Groups nested deeper than 16 levels were skipped.")); return; }
                const transform = transformOf(node), off = direct(transform, "off"), ext = direct(transform, "ext"),
                    childOff = direct(transform, "chOff"), childExt = direct(transform, "chExt");
                const raw = [attr(off, "x"), attr(off, "y"), attr(ext, "cx"), attr(ext, "cy"),
                    attr(childOff, "x"), attr(childOff, "y"), attr(childExt, "cx"), attr(childExt, "cy")];
                if (raw.some((v) => v === null || v === undefined || v === "" || !Number.isFinite(Number(v)))) {
                    note(t("Groups with unreadable coordinates were skipped.")); return;
                }
                const [x, y, w, h, ox, oy, cw, ch] = raw.map(Number);
                if (w <= 0 || h <= 0 || cw <= 0 || ch <= 0) { note(t("Groups with an invalid size were skipped.")); return; }
                const scale = { sx: parent.sx * w / cw, sy: parent.sy * h / ch,
                    tx: parent.tx + parent.sx * (x - ox * w / cw), ty: parent.ty + parent.sy * (y - oy * h / ch) };
                if (Number(attr(transform, "rot")) || ["flipH", "flipV"].some((key) => ["1", "true"].includes(attr(transform, key)))) {
                    note(t("Group rotation and flipping were not reproduced."));
                }
                for (const child of children(node)) await visit(child, sourceRelations, scale, fromSlide, depth + 1);
                note(t("Groups were expanded into individual editable elements that keep their positions."));
                if (fromSlide) slideTargets.set(attr(first(node, "cNvPr"), "id"), elements.slice(start));
                return;
            }
            const sources = fromSlide ? inherited(node) : [node], box = geometry(sources, parent);
            if (!box) { note(t("Elements without coordinates or outside the slide were skipped.")); return; }
            if (node.localName === "sp") {
                const body = first(node, "txBody"), content = body ? text(body) : "";
                const runs = all(body, "rPr");
                const textType = attr(placeholder(sources[1] || node), "type");
                const masterStyle = direct(first(master, "txStyles"), ["title", "ctrTitle"].includes(textType) ? "titleStyle" : textType === "body" ? "bodyStyle" : "otherStyle");
                const styleSources = [body, ...sources.slice(1).map((s) => first(s, "txBody")), masterStyle].filter(Boolean);
                const styles = [runs[0], ...styleSources.map((s) => first(s, "defRPr"))].filter(Boolean);
                const style = styles[0];
                if (new Set(runs.map((run) => run.toString())).size > 1) note(t("Mixed text formatting was unified to the first run's formatting."));
                const sz = Number(styles.map((s) => attr(s, "sz")).find((value) => value)) / 100 / .75 || 32;
                const shape = sources.map((s) => attr(first(direct(s, "spPr"), "prstGeom"), "prst")).find(Boolean);
                const fill = sources.map((s) => children(direct(s, "spPr")).find((n) => ["solidFill", "noFill"].includes(n.localName))).find(Boolean);
                if (fill?.localName === "solidFill" && ["rect", "ellipse"].includes(shape)) add({ ...box, type: "shape", shape, color: colorOf(fill, theme.accent) });
                else if (fill?.localName === "solidFill" || (shape && !["rect", "ellipse"].includes(shape))) note(t("Some shape fills, outlines and special shapes were not reproduced."));
                if (content) {
                    if (content.length > 8000 || sz < 8 || sz > 96) { note(t("Text exceeding the character or font-size limits was skipped.")); return; }
                    const spacing = Number(attr(first(body, "spcPct"), "val")) / 100000;
                    add({ ...box, type: "text", text: content, fontSize: sz, bold: attr(style, "b") === "1",
                        align: ({ ctr: "center", r: "right" })[attr(first(body, "pPr"), "algn")] || "left",
                        lineHeight: spacing >= 1 && spacing <= 3 ? spacing : 1.2, color: colorOf(style, theme.foreground) });
                    if (first(body, "latin") || first(body, "ea")) note(t("Individual fonts were unified to the deck's theme font."));
                }
            } else if (node.localName === "pic") {
                const relation = sourceRelations.get(relId(first(node, "blip"), "embed"));
                const file = relation && zip.file(relation.path);
                if (!file || !/\.(png|jpe?g)$/i.test(relation.path)) { note(t("Images other than embedded PNG/JPEG were skipped.")); return; }
                const image = await file.async("base64");
                if (image.length > 5500000) { note(t("Images larger than 4 MB were skipped.")); return; }
                if (first(node, "srcRect")) note(t("Image cropping was not reproduced."));
                add({ ...box, type: "image", src: `data:image/${/\.png$/i.test(relation.path) ? "png" : "jpeg"};base64,${image}`, alt: attr(first(node, "cNvPr"), "descr") || "" });
            } else if (first(node, "tbl")) {
                const rows = all(first(node, "tbl"), "tr").map((row) => children(row).filter((c) => c.localName === "tc").map((cell) => text(cell)));
                if (!rows.length || rows.length > 20 || !rows[0].length || rows[0].length > 10 || rows.some((r) => r.length !== rows[0].length || r.some((c) => c.length > 1000))) {
                    note(t("Tables with merged cells or exceeding the size limits were skipped.")); return;
                }
                add({ ...box, type: "table", rows, fontSize: 24 });
                note(t("Table cell widths, heights and formatting were converted to even default formatting."));
            } else if (first(node, "chart")) {
                const relation = sourceRelations.get(relId(first(node, "chart"), "id"));
                const chart = relation && await xml(relation.path);
                const plot = first(chart, "plotArea"), kind = children(plot).find((p) => ["barChart", "lineChart", "pieChart"].includes(p.localName));
                const series = all(kind, "ser");
                if (!kind || series.length !== 1) { note(t("Charts with multiple series or unsupported types were skipped.")); return; }
                const labels = all(first(series[0], "cat"), "pt").map((pt) => first(pt, "v")?.textContent || "");
                const values = all(first(series[0], "val"), "pt").map((pt) => Number(first(pt, "v")?.textContent));
                if (!labels.length || labels.length > 12 || labels.length !== values.length || values.some((v) => !Number.isFinite(v) || v < 0 || v > 1e12)) {
                    note(t("Charts without cached data or with out-of-range values were skipped.")); return;
                }
                add({ ...box, type: "chart", chartType: kind.localName.replace("Chart", ""), labels, values, color: colorOf(first(series[0], "spPr"), theme.accent) });
                note(t("Chart decoration and axis settings were converted to the default display."));
            } else note(t("Unsupported elements such as SmartArt, video and OLE were skipped."));
            if (fromSlide) slideTargets.set(attr(first(node, "cNvPr"), "id"), elements.slice(start));
        }
        if (![doc.documentElement, layout?.documentElement].some((root) => ["0", "false"].includes(attr(root, "showMasterSp")))) {
            for (const node of children(first(master, "spTree"))) await visit(node, masterRelations);
        }
        for (const node of children(first(layout, "spTree"))) await visit(node, layoutRelations);
        const ownStart = elements.length;
        for (const node of children(first(doc, "spTree"))) await visit(node, relations, identity, true);
        if (elements.slice(0, ownStart).length) note(t("Master and layout decoration was expanded into editable elements on this slide."));
        const timing = first(doc, "timing");
        if (timing) {
            const main = all(timing, "cTn").find((n) => attr(n, "nodeType") === "mainSeq");
            let step = 0, recognized = 0, unsupported = !main;
            for (const group of children(direct(main, "childTnLst"))) {
                const effects = all(group, "cTn").filter((n) => attr(n, "presetClass"));
                if (!effects.length) { unsupported = true; continue; }
                step++;
                for (const effect of effects) {
                    const kind = attr(effect, "presetID"), targets = [...new Set(all(effect, "spTgt").flatMap((t) => slideTargets.get(attr(t, "spid")) || []))];
                    const fade = first(effect, "animEffect"), visibility = all(effect, "attrName").some((n) => n.textContent === "style.visibility");
                    if (step > 80 || attr(effect, "presetClass") !== "entr" || !["1", "10"].includes(kind) ||
                        !["clickEffect", "withEffect"].includes(attr(effect, "nodeType")) || !targets.length ||
                        (kind === "10" && (attr(fade, "filter") !== "fade" || attr(fade, "transition") !== "in")) ||
                        (kind === "1" && !visibility)) {
                        unsupported = true; continue;
                    }
                    if (first(effect, "txEl") || all(effect, "cond").some((c) => attr(c, "delay") && attr(c, "delay") !== "0") ||
                        (fade && attr(first(fade, "cTn"), "dur") !== "300")) note(t("Per-paragraph, delay and duration settings were converted to the standard whole-element display."));
                    for (const target of targets) {
                        if (target.animation) { unsupported = true; continue; }
                        target.animation = { effect: kind === "10" ? "fade" : "appear", step };
                        recognized++;
                    }
                }
            }
            if (unsupported || !recognized) note(t("Unsupported object animations were not imported."));
        }
        if (elements.length > 80) throw new Error(t("Slide {n} has more than the limit of 80 elements.", { n: index + 1 }));
        const noteRel = [...relations.values()].find((r) => r.type === "notesSlide");
        const notesDoc = noteRel && await xml(noteRel.path);
        const notes = all(notesDoc, "sp").filter((sp) => attr(first(sp, "ph"), "type") === "body").map((sp) => text(first(sp, "txBody"))).join("\n");
        const title = elements.slice(ownStart).find((e) => e.type === "text")?.text.split("\n")[0]?.slice(0, 160) || t("Slide {n}", { n: index + 1 });
        slides.push({ id: `slide-${index + 1}`, title, notes, elements, skipped: attr(doc.documentElement, "show") === "0",
            transition: transition && first(transition, "fade") ? "fade" : "none",
            background: colorOf(first(doc, "bg") || first(layout, "bg") || first(master, "bg"), theme.background) });
    }
    const questions = [...warnings];
    if (questions.length > 100) questions.splice(99, questions.length - 99, t("Many elements are unsupported. Compare every slide with the original PowerPoint."));
    const deck = validateDeck({ id: "imported", title: t("Imported presentation"), version: 0, theme, slides, openQuestions: questions }, "imported");
    return { deck, warnings: [...warnings], brand: theme, brandAvailable: Boolean(themeDoc && Object.keys(colors).length) };
}
