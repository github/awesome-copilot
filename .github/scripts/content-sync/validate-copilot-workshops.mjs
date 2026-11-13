import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { workshopRedirects } from "../../../website/src/lib/copilot-workshops-redirects.mjs";
import { mapMarkdownProse } from "../lib/markdown.mjs";

const docsRoot = "website/src/content/docs/";
const workshopPath = /^(?:(es-es|ja-jp|ko-kr|pt-br|zh-cn)\/)?learning-hub\/copilot-workshops\/(.+)\.md$/;
const locales = ["es-es", "ja-jp", "ko-kr", "pt-br", "zh-cn"];
const body = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
const route = (file) => `/${file.replace(/\.md$/, "").replace(/\/index$/, "")}/`;

export function requirePublishedSources(receipt) {
  if (receipt.pendingUpstream.some((entry) => entry.sha === null)) {
    throw new Error("Unpublished workshop source corrections: publish the corrected source snapshot, pin its SHA in pendingUpstream and overrides, then rerun. Use --source only to validate a verified local source handoff; do not remove the hold or use the old base SHA as the corrected revision.");
  }
}

export function sourcePath(file) {
  const match = file.match(workshopPath);
  if (!match) throw new Error(`Not a workshop page: ${file}`);
  const [, locale, page] = match;
  const source = page.replace(/(^|\/)index$/, "$1README");
  return `docs/${locale ? `${locale}/` : ""}${/^(app|cli|vscode|cloud)\//.test(source) ? "real-world-development/" : ""}${source}.md`;
}

// These are the destination forms used by the workshops. Leave fenced examples untouched.
export function mapDestinations(markdown, transform) {
  return mapMarkdownProse(markdown, (part) => part
        .replace(/(^[ \t]*\[[^\]\n]+\]:[ \t]*)(<?)([^\s>]+)(>?)/gm,
          (_, prefix, open, target, close) => `${prefix}${open}${transform(target)}${close}`)
        .replace(/((?<!\])!?\[[^\]\n]*\]\([ \t]*)(<?)([^\s<>()]*(?:\([^\s<>()]*\)[^\s<>()]*)*)(>?)(?=[ \t]*(?:["'][^\n]*["'][ \t]*)?\))/g,
          (_, prefix, open, target, close) => `${prefix}${open}${transform(target)}${close}`)
        .replace(/(\b(?:href|src)=["'])([^"']+)(["'])/g,
          (_, prefix, target, close) => `${prefix}${transform(target)}${close}`));
}

export function adaptSourceBody(text, file) {
  const source = sourcePath(file);
  const locale = file.match(workshopPath)[1];
  const rendered = source.replace(/README\.md$/, "").replace(/\.md$/, "/");
  return mapDestinations(body(text), (target) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) return target;
    if (/^(?:\.\.\/)+_images\//.test(target)) {
      return target.replace(/^(?:\.\.\/)+_images\//, "/images/learning-hub/copilot-workshops/");
    }
    if (target.startsWith("/")) return target;
    const url = new URL(target, `https://source.invalid/${rendered}`);
    if (!url.pathname.startsWith("/docs/") || /\/\.github\//.test(url.pathname)) {
      const repoPath = url.pathname.replace(/^\/(?:docs\/)?/, "");
      const kind = path.posix.extname(repoPath) ? "blob" : "tree";
      return `https://github.com/github-samples/copilot-workshops/${kind}/main/${repoPath}${url.search}${url.hash}`;
    }
    let page = url.pathname.replace(/^\/docs\//, "").replace(/^(es-es|ja-jp|ko-kr|pt-br|zh-cn)\//, "");
    page = page.replace(/^real-world-development\/(?=(app|cli|vscode|cloud)\/)/, "");
    page = page.replace(/README\.md$/, "").replace(/\.md$/, "/");
    if (!page.endsWith("/")) page += "/";
    return `/${locale ? `${locale}/` : ""}learning-hub/copilot-workshops/${page}${url.search}${url.hash}`;
  });
}

export function validateWorkshops({ pages, changed, previous = [], previousAssets = [], redirects = workshopRedirects, assets = new Set(), sources }) {
  const errors = [];
  const routes = new Set([...pages.keys()].map(route));
  const previousRoutes = new Set(previous.map(route));
  const oldAssets = new Set(previousAssets);
  const changedPages = new Set(changed);
  const resolveRoute = (target) => {
    const visited = new Set();
    while (redirects[target]) {
      if (visited.has(target)) return false;
      visited.add(target);
      if (routes.has(target)) return false;
      target = redirects[target];
    }
    return routes.has(target);
  };
  for (const [from, to] of Object.entries(redirects)) {
    if (!resolveRoute(from)) errors.push(`Invalid or shadowed redirect: ${from} -> ${to}`);
  }
  for (const file of previous.filter((file) => workshopPath.test(file))) {
    if (!resolveRoute(route(file))) errors.push(`Removed published route needs a redirect: ${route(file)}`);
  }
  for (const [file, text] of pages) {
    if (!workshopPath.test(file)) continue;
    if (text.includes("\uFFFD")) errors.push(`${file}: contains a Unicode replacement character (U+FFFD)`);
    mapDestinations(body(text), (target) => {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) return target;
      const destination = decodeURI(new URL(target, `https://mirror.invalid${route(file)}`).pathname);
      if (destination.startsWith("/images/learning-hub/copilot-workshops/")) {
        if (!assets.has(destination) && (changedPages.has(file) || oldAssets.has(destination))) errors.push(`${file}: missing image ${target}`);
      } else if (destination.includes("/learning-hub/copilot-workshops/") && !resolveRoute(destination) && (changedPages.has(file) || previousRoutes.has(destination))) {
        errors.push(`${file}: missing lesson destination ${target}`);
      }
      return target;
    });
    const english = file.replace(/^(es-es|ja-jp|ko-kr|pt-br|zh-cn)\//, "");
    // Match the language selector's path rewrite for translated workshop families.
    if (changedPages.has(file) && /^learning-hub\/copilot-workshops\/(?:index\.md|app\/|first-steps\/)/.test(english)) {
      for (const locale of ["", ...locales]) {
        const target = route(`${locale ? `${locale}/` : ""}${english}`);
        if (!resolveRoute(target)) errors.push(`${file}: language selector has no destination ${target}`);
      }
    }
  }
  if (sources) {
    for (const file of changed.filter((file) => workshopPath.test(file) && pages.has(file))) {
      const source = sources.get(file);
      if (source === undefined) {
        errors.push(`${file}: missing pinned upstream source ${sourcePath(file)}`);
      } else if (body(pages.get(file)) !== adaptSourceBody(source, file)) {
        errors.push(`${file}: body differs from pinned upstream after allowed link/image/frontmatter adaptations`);
      }
    }
  }
  return [...new Set(errors)];
}

function readUtf8(file) {
  return new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file));
}

function filesUnder(directory) {
  return fs.readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

export async function validateCheckout({ base, source, root = process.cwd(), routesOnly = false }) {
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  const absoluteDocs = path.join(root, docsRoot);
  const pages = new Map(filesUnder(absoluteDocs).filter((file) => file.endsWith(".md"))
    .map((file) => [path.relative(absoluteDocs, file), readUtf8(file)]));
  const previous = git("ls-tree", "-r", "--name-only", base, "--", docsRoot).map((file) => file.slice(docsRoot.length));
  const previousAssets = git("ls-tree", "-r", "--name-only", base, "--", "website/public/images/learning-hub/copilot-workshops")
    .map((file) => file.replace(/^website\/public/, ""));
  const changed = [...git("diff", "--no-renames", "--name-only", base, "--", docsRoot),
    ...git("ls-files", "--others", "--exclude-standard", "--", docsRoot)].map((file) => file.slice(docsRoot.length));
  const assets = new Set(filesUnder(path.join(root, "website/public/images/learning-hub/copilot-workshops"))
    .map((file) => `/${path.relative(path.join(root, "website/public"), file)}`));
  let sources;
  if (!routesOnly) {
    const receipt = source ? undefined : JSON.parse(readUtf8(path.join(root, docsRoot, "learning-hub/copilot-workshops/source.json")));
    if (receipt) requirePublishedSources(receipt);
    sources = new Map();
    const selected = [...new Set(changed)].filter((file) => workshopPath.test(file) && pages.has(file));
    for (let start = 0; start < selected.length; start += 6) {
      await Promise.all(selected.slice(start, start + 6).map(async (file) => {
        if (source) {
          const sourceFile = path.join(source, sourcePath(file));
          sources.set(file, fs.existsSync(sourceFile) ? readUtf8(sourceFile) : undefined);
        } else {
          const sha = receipt.overrides[file] ?? receipt.sourceSha;
          if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error(`Expected immutable source SHA for ${file}`);
          const url = `https://raw.githubusercontent.com/github-samples/copilot-workshops/${sha}/${sourcePath(file)}`;
          const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
          if (!response.ok) throw new Error(`Source download failed (${response.status}): ${url}`);
          sources.set(file, new TextDecoder("utf-8", { fatal: true }).decode(await response.arrayBuffer()));
        }
      }));
    }
  }
  return { errors: validateWorkshops({ pages, changed, previous, previousAssets, assets, sources }), compared: sources?.size ?? 0 };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { values } = parseArgs({ options: {
    base: { type: "string" },
    source: { type: "string" },
    "routes-only": { type: "boolean", default: false },
  } });
  if (!values.base) throw new Error("Usage: node .github/scripts/content-sync/validate-copilot-workshops.mjs --base <git-ref> [--source <pinned-upstream-checkout> | --routes-only]");
  const result = await validateCheckout({ base: values.base, source: values.source, routesOnly: values["routes-only"] });
  if (result.errors.length) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
  } else {
    const fidelity = values.source ? "the supplied source snapshot" : "the pinned upstream revisions";
    console.log(`Workshop routes, images, locales and text encoding passed; ${values["routes-only"] ? "source fidelity not requested (--routes-only)" : `${result.compared} changed pages match ${fidelity}`}.`);
  }
}
