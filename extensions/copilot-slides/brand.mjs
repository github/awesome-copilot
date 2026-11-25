import { DEFAULT_THEME, validateTheme } from "./model.mjs";
import { t } from "./i18n.mjs";

export function contrastRatio(a, b) {
    const luminance = (hex) => {
        const rgb = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255)
            .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    const first = luminance(a), second = luminance(b);
    return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}

export function themeFromPixels(pixels, fontFamily = DEFAULT_THEME.fontFamily) {
    const buckets = new Map();
    for (let i = 0; i + 3 < pixels.length; i += 4) {
        if (pixels[i + 3] < 128) continue;
        const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
        const key = rgb.map((value) => Math.floor(value / 24)).join("-");
        const bucket = buckets.get(key) || { count: 0, rgb: [0, 0, 0] };
        bucket.count++;
        rgb.forEach((value, index) => { bucket.rgb[index] += value; });
        buckets.set(key, bucket);
    }
    if (!buckets.size) throw new Error(t("The image has no opaque pixels, so colors can't be extracted."));
    const palette = [...buckets.values()].map(({ count, rgb }) => ({ count, rgb: rgb.map((value) => Math.round(value / count)) }));
    const colored = palette.filter(({ rgb }) => Math.max(...rgb) - Math.min(...rgb) >= 30);
    const selected = (colored.length ? colored : palette).sort((a, b) => b.count - a.count)[0];
    let rgb = selected.rgb;
    const hex = () => `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    while (contrastRatio("#ffffff", hex()) < 4.5) rgb = rgb.map((value) => Math.floor(value * .9));
    return validateTheme({ ...DEFAULT_THEME, accent: hex(), fontFamily });
}

export function exportTheme(theme) {
    return JSON.stringify({ format: "copilot-slides-theme", version: 1, theme: validateTheme(theme) }, null, 2);
}

export function importTheme(source) {
    const input = JSON.parse(source);
    if (input?.format !== "copilot-slides-theme" || input.version !== 1 || !input.theme ||
        !["background", "foreground", "accent", "fontFamily"].every((key) => typeof input.theme[key] === "string")) {
        throw new Error(t("Choose a Copilot Slides theme JSON (version 1)."));
    }
    return validateTheme(input.theme);
}
