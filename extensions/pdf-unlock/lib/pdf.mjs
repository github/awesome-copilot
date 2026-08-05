// Orchestration for the pdf-unlock canvas: path handling, inspection, and the
// verify-then-replace flow. OS specifics live in platform.mjs and the actual
// conversion engines in engines.mjs.

import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    DEFAULT_CHAIN,
    convertWith,
    engineAvailability,
    helper,
    inspectDocument,
} from "./engines.mjs";
import {
    IS_MAC,
    IS_WINDOWS,
    findByName,
    findTool,
    moveToBin,
    pickFiles,
    setupHints,
} from "./platform.mjs";

export { METHODS } from "./engines.mjs";

export async function capabilities() {
    const methods = await engineAvailability();
    const available = Object.values(methods).filter((method) => method.available);
    return {
        platform: process.platform,
        methods,
        anyAvailable: available.length > 0,
        setup: available.length > 0 ? [] : setupHints(),
        pdfinfo: Boolean(await findTool("pdfinfo")),
        binLabel: IS_WINDOWS ? "Recycle Bin" : "Trash",
    };
}

// ---------------------------------------------------------------------------
// paths
// ---------------------------------------------------------------------------

export function expandPath(input) {
    let value = String(input ?? "").trim();
    if (!value) return "";

    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }
    if (/^file:\/\//i.test(value)) {
        try {
            value = fileURLToPath(value);
        } catch {
            /* keep the raw value */
        }
    }
    // Shells escape spaces with backslashes, but on Windows a backslash is the
    // path separator — unescaping there would destroy the path.
    if (!IS_WINDOWS) value = value.replace(/\\(.)/g, "$1");

    if (value === "~") value = os.homedir();
    else if (value.startsWith("~/") || (IS_WINDOWS && value.startsWith("~\\"))) {
        value = path.join(os.homedir(), value.slice(2));
    }
    return path.resolve(value);
}

export async function collectPdfs(rawPath, { recursive = true, limit = 500 } = {}) {
    const target = expandPath(rawPath);
    const stat = await fs.stat(target).catch(() => null);
    if (!stat) return [];
    if (stat.isFile()) return [target];
    if (!stat.isDirectory()) return [];

    const found = [];
    const walk = async (dir, depth) => {
        if (found.length >= limit) return;
        const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
        for (const item of entries) {
            if (found.length >= limit) return;
            if (item.name.startsWith(".")) continue;
            const child = path.join(dir, item.name);
            if (item.isDirectory()) {
                if (recursive && depth < 8) await walk(child, depth + 1);
            } else if (item.isFile() && path.extname(item.name).toLowerCase() === ".pdf") {
                found.push(child);
            }
        }
    };
    await walk(target, 0);
    return found.sort();
}

/// Browser drops never expose a real filesystem path, so resolve the dropped
/// file back to disk by name, confirming the match on exact byte size.
export async function resolveDroppedFile({ name, size }) {
    if (!name) return [];
    const candidates = (await findByName(name)).filter(
        (candidate) => path.basename(candidate) === name
    );

    const matches = [];
    for (const candidate of candidates.slice(0, 40)) {
        const stat = await fs.stat(candidate).catch(() => null);
        if (!stat || !stat.isFile()) continue;
        if (typeof size === "number" && size > 0 && stat.size !== size) continue;
        matches.push(candidate);
    }
    return matches;
}

export async function pickFilesNatively() {
    return pickFiles();
}

// ---------------------------------------------------------------------------
// inspection
// ---------------------------------------------------------------------------

export async function inspect(rawPath, password = "") {
    const file = expandPath(rawPath);
    const entry = { path: file, name: path.basename(file) };

    const stat = await fs.stat(file).catch(() => null);
    if (!stat || !stat.isFile()) {
        return { ...entry, ok: false, status: "missing", error: "File not found." };
    }
    entry.size = stat.size;
    entry.modified = stat.mtime.toISOString();

    if (path.extname(file).toLowerCase() !== ".pdf") {
        return { ...entry, ok: false, status: "not-pdf", error: "Not a .pdf file." };
    }

    let info;
    try {
        info = await inspectDocument(file, password);
    } catch (error) {
        return { ...entry, ok: false, status: "unreadable", error: error.message };
    }

    return {
        ...entry,
        ok: true,
        encrypted: Boolean(info.encrypted),
        needsPassword: Boolean(info.needsPassword),
        pages: info.pages ?? 0,
        allowsCopying: info.allowsCopying ?? true,
        allowsPrinting: info.allowsPrinting ?? true,
        version: info.version ?? null,
        algorithm: info.algorithm ?? null,
        inspectedBy: info.sources ?? [],
        status: info.needsPassword ? "needs-password" : info.encrypted ? "encrypted" : "clear",
    };
}

// ---------------------------------------------------------------------------
// unlocking
// ---------------------------------------------------------------------------

async function sha256(file) {
    const hash = createHash("sha256");
    hash.update(await fs.readFile(file));
    return hash.digest("hex");
}

const exists = (target) =>
    fs
        .stat(target)
        .then(() => true)
        .catch(() => false);

async function uniquePath(candidate) {
    const dir = path.dirname(candidate);
    const ext = path.extname(candidate);
    const stem = path.basename(candidate, ext);
    let attempt = candidate;
    let counter = 2;
    while (await exists(attempt)) {
        attempt = path.join(dir, `${stem} ${counter}${ext}`);
        counter += 1;
    }
    return attempt;
}

async function verifyOutput(destination, source) {
    const stat = await fs.stat(destination).catch(() => null);
    if (!stat || stat.size === 0) throw new Error("The converted file is empty.");

    const info = await inspectDocument(destination, "");
    if (info.encrypted || info.needsPassword) {
        throw new Error("The converted file is still encrypted.");
    }
    // A converter that cannot read its input often still writes a structurally
    // valid but empty PDF, so an unreadable or zero page count is treated as a
    // failure rather than something to shrug off.
    const pages = info.pages ?? 0;
    if (pages <= 0) throw new Error("The converted file has no readable pages.");
    if (source.pages > 0 && pages !== source.pages) {
        throw new Error(`Page count changed (${source.pages} to ${pages}); refusing to replace.`);
    }
    return { size: stat.size, pages };
}

/**
 * Moves the original out of the way and returns how to put it back.
 *
 * Even "no backup" moves rather than deletes, because Windows `rename` will not
 * overwrite an existing file — and it keeps the original recoverable if the
 * swap itself fails.
 */
async function stashOriginal(file, mode) {
    if (mode === "trash") {
        const result = await moveToBin(file, { macHelper: IS_MAC ? helper : null });
        return { backup: result, restore: null, cleanup: null };
    }

    if (mode === "none") {
        const parked = path.join(
            path.dirname(file),
            `.pdf-unlock-old-${randomBytes(6).toString("hex")}.pdf`
        );
        await fs.rename(file, parked);
        return {
            backup: null,
            restore: () => fs.rename(parked, file),
            cleanup: () => fs.rm(parked, { force: true }),
        };
    }

    const ext = path.extname(file);
    const target = await uniquePath(
        path.join(path.dirname(file), `${path.basename(file, ext)} (original)${ext}`)
    );
    await fs.rename(file, target);
    return {
        backup: { mode: "sibling", location: target },
        restore: () => fs.rename(target, file),
        cleanup: null,
    };
}

/**
 * Converts one PDF and replaces the original in place.
 *
 * The new file is written next to the original (same volume, so the final swap
 * is an atomic rename), verified, and only then does the original get moved
 * aside and replaced.
 */
export async function unlockAndReplace(rawPath, options = {}) {
    const {
        password = "",
        method = "auto",
        backup = "sibling",
        dryRun = false,
        verifyHash = true,
    } = options;

    const file = expandPath(rawPath);
    const source = await inspect(file, password);
    if (!source.ok) {
        return { path: file, name: source.name, ok: false, error: source.error };
    }
    if (source.needsPassword) {
        return {
            path: file,
            name: source.name,
            ok: false,
            needsPassword: true,
            error: "A password is required to open this PDF.",
        };
    }

    const methods = await engineAvailability();
    const requested =
        method === "auto" ? DEFAULT_CHAIN : [method, ...DEFAULT_CHAIN.filter((id) => id !== method)];
    const chain = requested.filter((id) => methods[id]?.available);
    if (chain.length === 0) {
        return {
            path: file,
            name: source.name,
            ok: false,
            error: `No conversion engine is available. Install one of: ${setupHints()
                .map((hint) => hint.command)
                .join(" · ")}`,
        };
    }

    const originalHash = verifyHash ? await sha256(file) : null;
    const staging = path.join(
        path.dirname(file),
        `.pdf-unlock-${randomBytes(6).toString("hex")}.pdf`
    );

    const attempts = [];
    let verified = null;
    let usedMethod = null;

    try {
        for (const candidate of chain) {
            try {
                await convertWith(candidate, file, staging, password);
                verified = await verifyOutput(staging, source);
                usedMethod = candidate;
                attempts.push({ method: candidate, ok: true });
                break;
            } catch (error) {
                attempts.push({ method: candidate, ok: false, error: error.message });
                await fs.rm(staging, { force: true });
                if (error.needsPassword) {
                    return {
                        path: file,
                        name: source.name,
                        ok: false,
                        needsPassword: true,
                        attempts,
                        error: "A password is required to open this PDF.",
                    };
                }
            }
        }

        if (!verified) {
            return {
                path: file,
                name: source.name,
                ok: false,
                attempts,
                error: attempts.at(-1)?.error ?? "Every conversion engine failed.",
            };
        }

        if (dryRun) {
            const preview = await uniquePath(
                path.join(
                    path.dirname(file),
                    `${path.basename(file, path.extname(file))} (unlocked preview).pdf`
                )
            );
            await fs.rename(staging, preview);
            return {
                path: file,
                name: source.name,
                ok: true,
                dryRun: true,
                method: usedMethod,
                attempts,
                preview,
                before: { size: source.size, pages: source.pages, algorithm: source.algorithm },
                after: verified,
            };
        }

        // Guard against the file changing underneath us while converting.
        if (verifyHash && (await sha256(file)) !== originalHash) {
            throw new Error(
                "The original changed on disk during conversion; nothing was replaced."
            );
        }

        const stat = await fs.stat(file);
        const { backup: backedUp, restore, cleanup } = await stashOriginal(file, backup);
        try {
            await fs.rename(staging, file);
        } catch (error) {
            await restore?.().catch(() => {});
            throw error;
        }
        await cleanup?.().catch(() => {});
        await fs.chmod(file, stat.mode).catch(() => {});
        await fs.utimes(file, new Date(), stat.mtime).catch(() => {});

        return {
            path: file,
            name: source.name,
            ok: true,
            method: usedMethod,
            attempts,
            backup: backedUp,
            before: { size: source.size, pages: source.pages, algorithm: source.algorithm },
            after: verified,
        };
    } catch (error) {
        await fs.rm(staging, { force: true });
        return { path: file, name: source.name, ok: false, attempts, error: error.message };
    }
}
