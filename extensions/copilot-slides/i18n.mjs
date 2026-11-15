import { JA } from "./locale-ja.mjs";

export const LOCALES = ["en", "ja"];
const catalogs = new Map([["ja", JA]]);
let active = "en";

// Accepts BCP 47 tags such as "ja-JP"; anything unsupported yields null.
export function normalizeLocale(value) {
    const code = String(value ?? "").toLowerCase().split(/[-_]/)[0];
    return LOCALES.includes(code) ? code : null;
}

// The first supported candidate wins, so a browser's language list keeps the user's preference order.
export function resolveLocale(...candidates) {
    for (const candidate of candidates) {
        const locale = normalizeLocale(candidate);
        if (locale) return locale;
    }
    return "en";
}

export const getLocale = () => active;
export function setLocale(value) {
    active = normalizeLocale(value) ?? "en";
    return active;
}

// English source strings double as catalog keys. A missing entry falls back to the English text.
export function translate(locale, text, params) {
    const catalog = catalogs.get(locale);
    const template = catalog && Object.hasOwn(catalog, text) ? catalog[text] : text;
    return params
        ? template.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(params, name) ? String(params[name]) : match)
        : template;
}
export const t = (text, params) => translate(active, text, params);

const attributes = ["aria-label", "title", "placeholder", "alt"];

// Browser only: sets the locale and translates the static markup in place.
export function applyLocale(value, root = document) {
    const locale = setLocale(value);
    root.documentElement.lang = locale;
    if (locale === "en") return locale;
    const walker = root.createTreeWalker(root.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const source = node.nodeValue.trim(), text = source && translate(locale, source);
        if (text && text !== source) node.nodeValue = node.nodeValue.replace(source, () => text);
    }
    for (const element of root.body.querySelectorAll(attributes.map((name) => `[${name}]`).join(","))) {
        for (const name of attributes) {
            const source = element.getAttribute(name);
            if (source !== null) element.setAttribute(name, translate(locale, source));
        }
    }
    return locale;
}
