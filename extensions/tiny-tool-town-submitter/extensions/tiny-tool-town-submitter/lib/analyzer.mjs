import { execFile } from "node:child_process";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const README_NAMES = ["README.md", "readme.md", "Readme.md", "README", "readme", "README.rst", "README.txt"];
const LICENSE_NAMES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "LICENCE.md", "LICENCE.txt"];
const SOURCE_LANGUAGES = new Map([
    [".cs", "C#"],
    [".fs", "F#"],
    [".vb", "VB.NET"],
    [".py", "Python"],
    [".rs", "Rust"],
    [".go", "Go"],
    [".ts", "TypeScript"],
    [".tsx", "TypeScript"],
    [".js", "JavaScript"],
    [".jsx", "JavaScript"],
    [".mjs", "JavaScript"],
    [".java", "Java"],
    [".kt", "Kotlin"],
    [".swift", "Swift"],
    [".rb", "Ruby"],
    [".cpp", "C++"],
    [".cc", "C++"],
    [".c", "C"],
    [".zig", "Zig"],
    [".lua", "Lua"],
    [".php", "PHP"],
    [".dart", "Dart"],
    [".ex", "Elixir"],
    [".exs", "Elixir"],
    [".hs", "Haskell"],
    [".scala", "Scala"],
    [".r", "R"],
    [".jl", "Julia"],
    [".ps1", "PowerShell"],
    [".sh", "Shell"],
]);
const SKIPPED_DIRECTORIES = new Set([
    ".git",
    ".next",
    ".nuxt",
    ".output",
    ".turbo",
    "bin",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "obj",
    "out",
    "target",
    "vendor",
]);
const BAD_IMAGE_HOSTS = new Set([
    "avatars.githubusercontent.com",
    "badge.fury.io",
    "contrib.rocks",
    "img.shields.io",
    "opencollective.com",
]);
const THEMES = [
    "None (site default)",
    "terminal",
    "neon",
    "minimal",
    "pastel",
    "matrix",
    "sunset",
    "ocean",
    "forest",
    "candy",
    "synthwave",
    "newspaper",
    "retro",
];

async function run(file, args, cwd, timeout = 15000) {
    const { stdout } = await execFileAsync(file, args, {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
    });
    return stdout.trim();
}

async function runOptional(file, args, cwd, timeout) {
    try {
        return await run(file, args, cwd, timeout);
    } catch {
        return "";
    }
}

async function pathExists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

async function findFirst(root, names) {
    let rootEntries;
    for (const name of names) {
        if (name.startsWith("*.")) {
            rootEntries ??= await readdir(root, { withFileTypes: true });
            const suffix = name.slice(1).toLowerCase();
            const match = rootEntries.find((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(suffix));
            if (match) {
                return join(root, match.name);
            }
            continue;
        }
        const path = join(root, name);
        if (await pathExists(path)) {
            return path;
        }
    }
    return "";
}

function parseJson(value, fallback = null) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function normalizeGitUrl(value) {
    const url = String(value || "").trim();
    if (url.startsWith("git@github.com:")) {
        return `https://github.com/${url.slice("git@github.com:".length).replace(/\.git$/i, "")}`;
    }
    try {
        const parsed = new URL(url);
        if (parsed.hostname.toLowerCase() !== "github.com") return url;
        const segments = parsed.pathname.replace(/\.git$/i, "").split("/").filter(Boolean);
        if (segments.length < 2) return url;
        return `https://github.com/${segments[0]}/${segments[1]}`;
    } catch {
        return url.replace(/\.git$/i, "").replace(/\/$/, "");
    }
}

function githubCoordinates(githubUrl) {
    const match = String(githubUrl || "").match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+)$/i);
    return match ? { owner: match[1], repo: match[2] } : null;
}

function cleanMarkdown(text) {
    return String(text || "")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
        .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
        .replace(/`{1,3}[^`]*`{1,3}/g, " ")
        .replace(/[*_>#|~-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function firstReadmeParagraph(readme) {
    for (const block of String(readme || "").split(/\r?\n\s*\r?\n/)) {
        const trimmed = block.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("![") || trimmed.startsWith("[![")) {
            continue;
        }
        const cleaned = cleanMarkdown(trimmed);
        if (cleaned.length >= 30) {
            return cleaned.slice(0, 600);
        }
    }
    return "";
}

function sentenceDescription(name, source) {
    const cleaned = cleanMarkdown(source);
    if (!cleaned) {
        return `${name} is an open source tool built to make a focused task simpler and more delightful. Explore the repository for installation and usage details.`;
    }
    const first = /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
    return `${first} The project is free and open source, with its source and usage details available on GitHub.`;
}

function truncate(value, maxLength) {
    const text = cleanMarkdown(value);
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function detectLicenseText(content) {
    const text = String(content || "").toLowerCase();
    if (text.includes("mit license") || text.includes("licensed under the mit")) return "MIT";
    if (text.includes("apache license") || text.includes("apache-2.0")) return "Apache-2.0";
    if (text.includes("gnu general public license") || text.includes("gpl-3.0") || text.includes("gplv3")) return "GPL-3.0";
    if (text.includes("gpl-2.0") || text.includes("gplv2")) return "GPL-2.0";
    if (text.includes("bsd 2-clause")) return "BSD-2-Clause";
    if (text.includes("bsd 3-clause")) return "BSD-3-Clause";
    if (text.includes("mozilla public license") || text.includes("mpl-2.0")) return "MPL-2.0";
    if (text.includes("isc license")) return "ISC";
    if (text.includes("the unlicense")) return "Unlicense";
    return "";
}

async function scanLanguages(root) {
    const counts = new Map();
    let visited = 0;

    async function visit(directory, depth) {
        if (depth > 6 || visited > 12000) return;
        let entries;
        try {
            entries = await readdir(directory, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (visited > 12000) break;
            if (entry.isDirectory()) {
                if (!SKIPPED_DIRECTORIES.has(entry.name)) {
                    await visit(join(directory, entry.name), depth + 1);
                }
                continue;
            }
            visited += 1;
            const language = SOURCE_LANGUAGES.get(extname(entry.name).toLowerCase());
            if (language) {
                counts.set(language, (counts.get(language) || 0) + 1);
            }
        }
    }

    await visit(root, 0);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function isLikelyBadge(url) {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();
        const pathname = parsed.pathname.toLowerCase();
        return BAD_IMAGE_HOSTS.has(hostname)
            || hostname.endsWith(".githubusercontent.com") && hostname.startsWith("avatars.")
            || pathname.endsWith(".svg")
            || pathname.includes("/contributors/")
            || pathname.includes("/sponsors/");
    } catch {
        return false;
    }
}

function normalizeImageUrl(rawUrl, githubUrl, defaultBranch, readmePath, root) {
    const value = String(rawUrl || "").trim().replace(/^<|>$/g, "").split(/\s+["']/)[0];
    if (!value || value.startsWith("data:")) return "";
    if (/^https?:\/\//i.test(value)) return isLikelyBadge(value) ? "" : value;
    if (!githubUrl || value.startsWith("#")) return "";

    const relativeReadmeDirectory = value.startsWith("/")
        ? ""
        : relative(root, resolve(readmePath, "..")).replaceAll("\\", "/");
    const imagePath = [relativeReadmeDirectory, value]
        .filter(Boolean)
        .join("/")
        .replace(/^\.\//, "")
        .replace(/^\/+/, "")
        .replaceAll("\\", "/");
    return `${githubUrl.replace("github.com", "raw.githubusercontent.com")}/${defaultBranch}/${imagePath}`;
}

function detectThumbnail(readme, githubUrl, defaultBranch, readmePath, root) {
    const candidates = [];
    const imagePattern = /!\[(?<alt>[^\]]*)]\((?<url>[^)]+)\)/g;
    for (const match of readme.matchAll(imagePattern)) {
        candidates.push({
            index: match.index,
            url: match.groups?.url,
            alt: match.groups?.alt,
        });
    }
    const htmlImagePattern = /<img\b[^>]*>/gi;
    for (const match of readme.matchAll(htmlImagePattern)) {
        const tag = match[0];
        const srcMatch = tag.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
        const altMatch = tag.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
        if (srcMatch) {
            candidates.push({
                index: match.index,
                url: srcMatch[1] || srcMatch[2] || srcMatch[3],
                alt: altMatch ? altMatch[1] || altMatch[2] || altMatch[3] || "" : "",
            });
        }
    }
    candidates.sort((left, right) => left.index - right.index);
    for (const candidate of candidates) {
        const url = normalizeImageUrl(candidate.url, githubUrl, defaultBranch, readmePath, root);
        if (url) {
            return { url, alt: String(candidate.alt || "").trim() };
        }
    }
    return { url: "", alt: "" };
}

function detectWebsite(readme, githubUrl, packageJson, githubInfo) {
    const candidates = [packageJson?.homepage, githubInfo?.homepageUrl];
    const markdownLinks = [...String(readme || "").matchAll(/\[(?<label>[^\]]+)]\((?<url>https?:\/\/[^)\s]+)\)/g)];
    for (const match of markdownLinks) {
        const label = String(match.groups?.label || "").toLowerCase();
        if (/(demo|website|live|try|preview|play)/.test(label)) {
            candidates.push(match.groups?.url);
        }
    }
    for (const candidate of candidates) {
        const value = String(candidate || "").trim().replace(/\/$/, "");
        if (value && value !== githubUrl && !value.startsWith(`${githubUrl}#`)) {
            return value;
        }
    }
    return "";
}

function uniqueTags(values) {
    const tags = [];
    for (const value of values.flatMap((item) => Array.isArray(item) ? item : String(item || "").split(","))) {
        const tag = String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        if (tag && !tags.includes(tag)) tags.push(tag);
        if (tags.length === 6) break;
    }
    return tags;
}

function makeRecommendation(id, severity, title, detail, prompt, detected = false) {
    return { id, severity, title, detail, prompt, detected };
}

export function validateSubmission(metadata, facts) {
    const errors = [];
    const required = [
        ["name", "Tool name"],
        ["tagline", "One-line description"],
        ["description", "Tool description"],
        ["githubUrl", "GitHub repository URL"],
        ["author", "Author name"],
        ["authorGitHub", "GitHub username"],
        ["tags", "Tags"],
    ];
    for (const [field, label] of required) {
        if (!String(metadata?.[field] || "").trim()) errors.push(`${label} is required.`);
    }
    if (String(metadata?.tagline || "").length > 100) errors.push("One-line description must be 100 characters or fewer.");
    const coordinates = githubCoordinates(metadata?.githubUrl);
    if (!coordinates || metadata.githubUrl !== `https://github.com/${coordinates.owner}/${coordinates.repo}`) {
        errors.push("GitHub repository URL must be a canonical https://github.com/owner/repository URL.");
    } else if (facts?.repoSlug && `${coordinates.owner}/${coordinates.repo}`.toLowerCase() !== facts.repoSlug.toLowerCase()) {
        errors.push(`GitHub repository URL must match the inspected repository (${facts.repoSlug}).`);
    }
    if (metadata?.websiteUrl) {
        try {
            new URL(metadata.websiteUrl);
        } catch {
            errors.push("Website or demo URL must be valid.");
        }
    }
    if (metadata?.thumbnailUrl) {
        try {
            new URL(metadata.thumbnailUrl);
        } catch {
            errors.push("Thumbnail URL must be valid.");
        }
    }
    if (metadata?.theme && !THEMES.includes(metadata.theme)) errors.push("Choose a supported page theme.");
    if (!metadata?.confirmations?.freeOpenSource) errors.push("Confirm that the tool is free and open source.");
    if (!metadata?.confirmations?.notEnterpriseSaas) errors.push("Confirm that the tool is not enterprise software or paid SaaS.");
    if (!metadata?.confirmations?.publicAndWorks) errors.push("Confirm that the repository is public and the tool works.");
    if (facts?.isPrivate === true) errors.push("The repository is private; Tiny Tool Town requires a public repository.");
    if (facts?.isArchived === true) errors.push("The repository is archived and should be made active before submission.");
    return errors;
}

export function buildIssueBody(metadata) {
    const optional = (value) => String(value || "").trim() || "N/A";
    return [
        "### Tool Name",
        "",
        metadata.name.trim(),
        "",
        "### One-line description",
        "",
        metadata.tagline.trim(),
        "",
        "### Tell us about your tool",
        "",
        metadata.description.trim(),
        "",
        "### GitHub Repository URL",
        "",
        metadata.githubUrl.trim(),
        "",
        "### Website or Demo URL (optional)",
        "",
        optional(metadata.websiteUrl),
        "",
        "### Thumbnail image URL (optional)",
        "",
        optional(metadata.thumbnailUrl),
        "",
        "### Your Name",
        "",
        metadata.author.trim(),
        "",
        "### Your GitHub Username",
        "",
        metadata.authorGitHub.trim(),
        "",
        "### Tags (comma-separated)",
        "",
        metadata.tags.trim(),
        "",
        "### Primary Programming Language",
        "",
        optional(metadata.language),
        "",
        "### License",
        "",
        optional(metadata.license),
        "",
        "### Page Theme (optional)",
        "",
        optional(metadata.theme),
        "",
        "### Checklist",
        "",
        "- [x] This tool is free and open source",
        "- [x] This tool is not enterprise software or paid SaaS",
        "- [x] The GitHub repo is public and the tool works",
    ].join("\n");
}

export async function resolveRepoRoot(candidate) {
    const start = resolve(candidate || process.cwd());
    const root = await runOptional("git", ["-C", start, "rev-parse", "--show-toplevel"], start);
    if (!root) throw new Error(`No Git repository was found at ${start}.`);
    return resolve(root);
}

export async function inspectRepository(candidate) {
    const root = await resolveRepoRoot(candidate);
    const readmePath = await findFirst(root, README_NAMES);
    const licensePath = await findFirst(root, LICENSE_NAMES);
    const readme = readmePath ? await readFile(readmePath, "utf8") : "";
    const licenseText = licensePath ? await readFile(licensePath, "utf8") : "";
    const packagePath = join(root, "package.json");
    const packageJson = await pathExists(packagePath)
        ? parseJson(await readFile(packagePath, "utf8"), {})
        : {};
    const remote = await runOptional("git", ["remote", "get-url", "origin"], root);
    const githubUrl = normalizeGitUrl(remote);
    const coordinates = githubCoordinates(githubUrl);
    const repoSlug = coordinates ? `${coordinates.owner}/${coordinates.repo}` : "";
    const githubRaw = repoSlug
        ? await runOptional("gh", [
            "repo",
            "view",
            repoSlug,
            "--json",
            "name,description,homepageUrl,isArchived,isPrivate,primaryLanguage,repositoryTopics,owner,url,defaultBranchRef",
        ], root)
        : "";
    const githubInfo = parseJson(githubRaw, {});
    const defaultBranch = githubInfo?.defaultBranchRef?.name
        || await runOptional("git", ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], root)
            .then((value) => value.replace(/^origin\//, ""))
        || "main";
    const authorLogin = githubInfo?.owner?.login || coordinates?.owner || "";
    const authorName = authorLogin
        ? await runOptional("gh", ["api", `users/${authorLogin}`, "--jq", ".name // .login"], root)
        : await runOptional("git", ["config", "user.name"], root);
    const language = githubInfo?.primaryLanguage?.name || await scanLanguages(root);
    const detectedLicense = detectLicenseText(licenseText)
        || String(packageJson?.license || "").trim()
        || detectLicenseText(readme);
    const thumbnail = detectThumbnail(readme, githubUrl, defaultBranch, readmePath, root);
    const name = String(packageJson?.displayName || packageJson?.name || githubInfo?.name || coordinates?.repo || root.split(/[\\/]/).pop())
        .replace(/^@[^/]+\//, "");
    const sourceDescription = packageJson?.description || githubInfo?.description || firstReadmeParagraph(readme);
    const tags = uniqueTags([
        packageJson?.keywords || [],
        githubInfo?.repositoryTopics?.map((topic) => topic.name) || [],
        language,
        "open-source",
    ]);
    while (tags.length < 3) {
        for (const fallback of ["developer-tools", "productivity", "utility"]) {
            if (!tags.includes(fallback)) tags.push(fallback);
            if (tags.length >= 3) break;
        }
    }

    const facts = {
        root,
        repoSlug,
        readmePath,
        licensePath,
        hasReadme: Boolean(readmePath),
        hasInstallDocs: /(^|\n)#{1,4}\s+(install|installation|getting started|quick start)\b/i.test(readme),
        hasUsageDocs: /(^|\n)#{1,4}\s+(usage|examples?|how to use)\b/i.test(readme),
        hasThumbnail: Boolean(thumbnail.url),
        thumbnailAlt: thumbnail.alt,
        isPrivate: typeof githubInfo?.isPrivate === "boolean" ? githubInfo.isPrivate : null,
        isArchived: typeof githubInfo?.isArchived === "boolean" ? githubInfo.isArchived : null,
        githubReachable: Boolean(githubRaw),
        hasBuildSignal: Boolean(
            packageJson?.scripts?.test
            || packageJson?.scripts?.build
            || await findFirst(root, ["Makefile", "Cargo.toml", "go.mod", "pyproject.toml", "requirements.txt", "*.csproj"]),
        ),
    };

    const metadata = {
        name,
        tagline: truncate(sourceDescription || `${name}, a focused open source tool.`, 100),
        description: sentenceDescription(name, sourceDescription || firstReadmeParagraph(readme)),
        githubUrl: githubInfo?.url || githubUrl,
        websiteUrl: detectWebsite(readme, githubUrl, packageJson, githubInfo),
        thumbnailUrl: thumbnail.url,
        author: authorName || authorLogin,
        authorGitHub: authorLogin,
        tags: tags.slice(0, 6).join(", "),
        language,
        license: detectedLicense,
        theme: "None (site default)",
        confirmations: {
            freeOpenSource: false,
            notEnterpriseSaas: false,
            publicAndWorks: false,
        },
    };

    const recommendations = [];
    if (!facts.hasReadme) {
        recommendations.push(makeRecommendation(
            "add-readme",
            "blocking",
            "Add a project README",
            "Tiny Tool Town needs enough public documentation to understand, install, and showcase the tool.",
            "Create a clear README.md with a short product overview, installation steps, usage examples, and contribution guidance.",
        ));
    } else {
        if (!facts.hasInstallDocs) {
            recommendations.push(makeRecommendation(
                "document-installation",
                "recommended",
                "Document installation",
                "The README was found, but it does not have a clearly labeled installation or quick-start section.",
                "Add an Installation or Quick Start section with copy-pasteable commands and prerequisites.",
            ));
        }
        if (!facts.hasUsageDocs) {
            recommendations.push(makeRecommendation(
                "document-usage",
                "recommended",
                "Add a usage example",
                "A concise example helps reviewers verify that the tool works and helps visitors try it quickly.",
                "Add a Usage or Examples section showing the smallest successful workflow and expected output.",
            ));
        }
    }
    if (!facts.licensePath) {
        recommendations.push(makeRecommendation(
            "add-license",
            "blocking",
            "Add an open source license file",
            metadata.license
                ? `The project declares ${metadata.license}, but no root LICENSE file was found.`
                : "No recognizable open source license was found.",
            "Add a root LICENSE file using the intended SPDX-compatible open source license and ensure package metadata matches it.",
        ));
    }
    if (!facts.hasThumbnail) {
        recommendations.push(makeRecommendation(
            "add-thumbnail",
            "recommended",
            "Add a showcase image",
            "No suitable screenshot or product image was detected in the README. Tiny Tool Town recommends at least 960x540.",
            "Create a polished 16:9 screenshot or product image (at least 960x540), commit it under docs or assets, and feature it near the top of README.md with descriptive alt text.",
        ));
    } else if (!facts.thumbnailAlt) {
        recommendations.push(makeRecommendation(
            "improve-image-alt",
            "suggestion",
            "Add descriptive image alt text",
            "A showcase image was found, but its README alt text is empty.",
            "Update the README image syntax with concise alt text that describes the tool UI or output.",
        ));
    }
    if (facts.isPrivate === true) {
        recommendations.push(makeRecommendation(
            "make-public",
            "blocking",
            "Make the repository public",
            "Tiny Tool Town only accepts public repositories.",
            "Review the repository for secrets and private material, then change its GitHub visibility to public.",
        ));
    } else if (!facts.githubReachable) {
        recommendations.push(makeRecommendation(
            "verify-public-repo",
            "recommended",
            "Verify GitHub repository access",
            "The canvas could not verify repository visibility with GitHub CLI.",
            "Authenticate GitHub CLI, confirm the origin points to GitHub, and verify that the repository is public.",
        ));
    }
    if (facts.isArchived === true) {
        recommendations.push(makeRecommendation(
            "unarchive-repository",
            "blocking",
            "Unarchive the repository",
            "Archived repositories cannot demonstrate an actively working tool.",
            "Unarchive the repository and publish any pending fixes before submitting.",
        ));
    }
    recommendations.push(makeRecommendation(
        "verify-working-release",
        "suggestion",
        "Verify a clean install and run",
        "The required checklist asks you to confirm that the tool works; this remains a manual release-readiness check.",
        "From a clean environment, follow the README exactly, run the primary workflow, and fix any missing prerequisites or stale commands.",
        true,
    ));

    return {
        repoPath: root,
        scannedAt: new Date().toISOString(),
        metadata,
        facts,
        recommendations,
        themes: THEMES,
    };
}

export async function fileSummary(path) {
    try {
        const details = await stat(path);
        return { path, bytes: details.size };
    } catch {
        return null;
    }
}
