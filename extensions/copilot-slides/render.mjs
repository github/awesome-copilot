export const escapeXml = (value) => String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
let measureContext;
export const chartPalette = (accent) => [accent, "#8c0000", "#087f8c", "#804000", "#7638a3", "#286428", "#ad0066", "#545454", "#005b96", "#855f00", "#542437", "#4c6b50"];
export function textLines(text, width, size, font, bold = false) {
    if (typeof document !== "undefined") measureContext ||= document.createElement("canvas").getContext("2d");
    if (measureContext) measureContext.font = `${bold ? "bold " : ""}${size}px ${font}`;
    const measure = (value) => measureContext ? measureContext.measureText(value).width : [...value].length * size * .65;
    return text.split("\n").flatMap((paragraph) => {
        const lines = [];
        let line = "";
        for (const char of paragraph) {
            if (line && measure(line + char) > width) { lines.push(line); line = ""; }
            line += char;
        }
        lines.push(line);
        return lines;
    });
}
function textSvg(e, theme, text = e.text, width = e.w, height = e.h) {
    const lines = textLines(text, Math.max(1, width - 12), e.fontSize, theme.fontFamily, e.bold);
    const x = e.align === "center" ? width / 2 : e.align === "right" ? width - 6 : 6;
    return `<svg width="${width}" height="${height}" overflow="hidden"><text font-family="${escapeXml(theme.fontFamily)}" font-size="${e.fontSize}" font-weight="${e.bold ? 700 : 400}" fill="${e.color}" text-anchor="${e.align === "center" ? "middle" : e.align === "right" ? "end" : "start"}">${lines.map((line, i) => `<tspan x="${x}" y="${6 + e.fontSize + i * e.fontSize * (e.lineHeight ?? 1.2)}">${escapeXml(line)}</tspan>`).join("")}</text></svg>`;
}
function elementSvg(e, theme) {
    if (e.type === "text") return textSvg(e, theme);
    if (e.type === "shape") {
        const shape = e.shape === "ellipse" ? `<ellipse cx="${e.w / 2}" cy="${e.h / 2}" rx="${e.w / 2}" ry="${e.h / 2}" fill="${e.color}"/>` :
            `<rect width="${e.w}" height="${e.h}" fill="${e.color}"/>`;
        return shape + textSvg({ ...e, color: theme.foreground }, theme);
    }
    if (e.type === "image") return `<image width="${e.w}" height="${e.h}" href="${escapeXml(e.src)}" preserveAspectRatio="xMidYMid meet"><title>${escapeXml(e.alt)}</title></image>`;
    if (e.type === "table") {
        const rh = e.h / e.rows.length, cw = e.w / e.rows[0].length;
        return e.rows.map((row, r) => row.map((cell, c) =>
            `<g transform="translate(${cw * c} ${rh * r})"><rect width="${cw}" height="${rh}" fill="${theme.background}" stroke="${theme.foreground}" stroke-width="1"/>${textSvg({ ...e, bold: r === 0 || e.bold }, theme, cell, cw, rh)}</g>`).join("")).join("");
    }
    const max = Math.max(1, ...e.values), gap = e.w / e.values.length, chartHeight = Math.max(1, e.h - 70);
    const label = (x, y, text, anchor = "middle") => `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${theme.foreground}" font-family="${escapeXml(theme.fontFamily)}" font-size="18">${escapeXml(text)}</text>`;
    if (e.chartType === "pie") {
        const total = e.values.reduce((sum, value) => sum + value, 0);
        if (!total) return label(e.w / 2, e.h / 2, t("The pie chart can't be shown because the total is 0"));
        const radius = Math.max(1, Math.min(e.w * .24, e.h * .42)), cx = radius + 8, cy = e.h / 2;
        const palette = chartPalette(e.color);
        let angle = -Math.PI / 2;
        return e.values.map((value, i) => {
            const end = angle + value / total * Math.PI * 2;
            const path = value === total ? `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${palette[i]}"/>` : value ?
                `<path d="M ${cx} ${cy} L ${cx + radius * Math.cos(angle)} ${cy + radius * Math.sin(angle)} A ${radius} ${radius} 0 ${end - angle > Math.PI ? 1 : 0} 1 ${cx + radius * Math.cos(end)} ${cy + radius * Math.sin(end)} Z" fill="${palette[i]}" stroke="${theme.background}" stroke-width="2"/>` : "";
            angle = end;
            const y = 24 + i * Math.min(28, (e.h - 24) / e.values.length);
            return `${path}<rect x="${e.w * .54}" y="${y - 14}" width="12" height="12" fill="${palette[i]}"/>${label(e.w * .54 + 20, y, `${e.labels[i]}: ${value} (${(value / total * 100).toFixed(1)}%)`, "start")}`;
        }).join("");
    }
    if (e.chartType === "line") {
        const points = e.values.map((value, i) => [(i + .5) * gap, chartHeight - chartHeight * value / max + 25]);
        return `<polyline points="${points.map((point) => point.join(",")).join(" ")}" fill="none" stroke="${e.color}" stroke-width="3"/>` +
            points.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="5" fill="${e.color}"/>${label(x, Math.max(20, y - 10), e.values[i])}${label(x, chartHeight + 50, e.labels[i])}`).join("");
    }
    return e.values.map((value, i) => {
        const h = chartHeight * value / max;
        return `<g><rect x="${i * gap + gap * .15}" y="${chartHeight - h + 25}" width="${gap * .7}" height="${h}" fill="${e.color}"/><text x="${(i + .5) * gap}" y="${Math.max(20, chartHeight - h + 18)}" text-anchor="middle" fill="${theme.foreground}" font-family="${escapeXml(theme.fontFamily)}" font-size="18">${value}</text><text x="${(i + .5) * gap}" y="${chartHeight + 50}" text-anchor="middle" fill="${theme.foreground}" font-family="${escapeXml(theme.fontFamily)}" font-size="18">${escapeXml(e.labels[i])}</text></g>`;
    }).join("");
}
export function slideSvg(deck, slide, { interactive = false, selected = null } = {}) {
    const steps = buildSteps(slide);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720" role="${interactive ? "group" : "img"}" aria-label="${escapeXml(slide.title || t("Slide"))}"><rect width="1280" height="720" fill="${slide.background || deck.theme.background}"/>${slide.elements.map((e) =>
        `<g transform="translate(${e.x} ${e.y})"${e.animation ? ` data-build="${steps.indexOf(e.animation.step) + 1}" data-animation="${e.animation.effect}"` : ""}${interactive ? ` data-element="${e.id}" role="button" tabindex="0" aria-label="${escapeXml(`${e.type}: ${e.text || e.alt || e.id}`)}"` : ""}>${interactive ? `<rect width="${e.w}" height="${e.h}" fill="transparent"/>` : ""}${elementSvg(e, deck.theme)}</g>`
    ).join("")}${interactive && selected ? slide.elements.filter((e) => e.id === selected).map((e) =>
        `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="none" stroke="#0969da" stroke-width="3" pointer-events="none"/><rect data-resize="${e.id}" x="${e.x + e.w - 8}" y="${e.y + e.h - 8}" width="16" height="16" fill="#0969da"/>`).join("") : ""}</svg>`;
}
export function exportHtml(deck, { print = false } = {}) {
    const slides = deck.slides.filter((slide) => !slide.skipped);
    const navigation = slides.map((slide) => ({ id: slide.id,
        elements: slide.elements.filter((e) => e.animation).map((e) => ({ animation: e.animation })) }));
    const controls = print
        ? `<nav><button id="print">${escapeXml(t("Save as PDF (print)"))}</button><span>${escapeXml(t("You can also print with Ctrl+P / Cmd+P."))}</span></nav>`
        : `<nav><span id="position" role="status"></span><button id="prev">${escapeXml(t("Previous"))}</button><button id="next">${escapeXml(t("Next"))}</button></nav>`;
    const script = print ? "" : `<script>
${buildSteps.toString()}
${navigateBuild.toString()}
${showBuild.toString()}
const metadata=${JSON.stringify(navigation).replace(/</g, "\\u003c")};
const stepLabel=${JSON.stringify(t("Step {current}/{total}")).replace(/</g, "\\u003c")};
const slides=[...document.querySelectorAll("section")], motion=matchMedia("(prefers-reduced-motion: reduce)");
let index=0,state={slideId:metadata[0]?.id,build:0};
function display(animate=false){if(!slides.length)return;showBuild(slides[index],state.build,animate,motion.matches);document.querySelector("#position").textContent=(index+1)+" / "+slides.length+(buildSteps(metadata[index]).length?" · "+stepLabel.replace("{current}",state.build).replace("{total}",buildSteps(metadata[index]).length):"")}
function go(delta){if(!slides.length)return;state=navigateBuild(metadata,state,delta);const next=metadata.findIndex(s=>s.id===state.slideId),same=next===index;if(!same){slides[index].classList.remove("active");index=next;slides[index].classList.add("active")}display(same)}
document.querySelector("#prev").onclick=()=>go(-1);document.querySelector("#next").onclick=()=>go(1);
document.addEventListener("keydown",e=>{if(e.target.closest("input,textarea,select")||(e.target.closest("button")&&!["ArrowRight","ArrowLeft"].includes(e.key)))return;if(["ArrowRight","ArrowLeft"," "].includes(e.key)){e.preventDefault();go(e.key==="ArrowLeft"?-1:1)}});
motion.addEventListener("change",()=>display());display();
</script>`;
    return `<!doctype html><html lang="${getLocale()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeXml(deck.title)}</title><style>
body{margin:0;background:#111;color:#fff;font:16px sans-serif}section{display:none;align-items:center;justify-content:center;min-height:100vh}section.active{display:flex}section.active[data-transition=fade]{animation:slide-fade .3s ease-out}@keyframes slide-fade{from{opacity:0}to{opacity:1}}@media(prefers-reduced-motion:reduce){section.active[data-transition=fade]{animation:none}}svg{width:100%;height:auto;max-height:100vh}nav{position:fixed;bottom:10px;right:10px;display:flex;align-items:center;gap:8px;background:#111;padding:6px;border-radius:4px}button{padding:10px}.print-preview section{display:flex;min-height:0;margin:12px auto;max-width:1280px}.print-preview{padding-bottom:64px}@page{size:13.333333in 7.5in;margin:0}@media print{body,.print-preview{background:white;padding:0}section,section.active,.print-preview section{display:block;animation:none!important;width:13.333333in;height:7.5in;max-width:none;min-height:0;margin:0;break-after:page;overflow:hidden}section:last-of-type{break-after:auto}svg{width:100%;height:100%;max-height:none}[data-build]{visibility:visible!important;opacity:1!important;animation:none!important}nav{display:none}}
</style></head><body${print ? ' class="print-preview"' : ""}>${slides.map((slide, i) => `<section class="${i === 0 ? "active" : ""}" data-transition="${slide.transition === "fade" && !print ? "fade" : "none"}">${slideSvg(deck, slide)}</section>`).join("")}${controls}${script}</body></html>`;
}
import { buildSteps, navigateBuild, showBuild } from "./presentation.mjs";
import { getLocale, t } from "./i18n.mjs";

