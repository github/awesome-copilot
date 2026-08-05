// Inspection backends and conversion engines.
//
// Nothing here assumes a particular OS: every engine reports whether it is
// installed, and the orchestrator in pdf.mjs picks from whatever is available.
// On macOS the preferred engine is a Swift/CoreGraphics helper compiled on
// first use; elsewhere Ghostscript plays the same "re-print the page" role.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { IS_MAC, IS_WINDOWS, findFirstTool, findTool, run } from "./platform.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_DIR = path.resolve(HERE, "..");
const HELPER_SOURCE = path.join(EXTENSION_DIR, "helper", "PrintToPDF.swift");

// The compiled helper is a build artifact, so it lives in the Copilot home
// cache rather than inside the (potentially read-only) installed extension.
const COPILOT_HOME = process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
const BUILD_DIR = path.join(COPILOT_HOME, "extensions", "pdf-unlock", "bin");
const HELPER_BIN = path.join(BUILD_DIR, "printtopdf");

const GHOSTSCRIPT_NAMES = IS_WINDOWS ? ["gswin64c.exe", "gswin32c.exe", "gs"] : ["gs"];

export const METHODS = {
    quartz: {
        id: "quartz",
        label: "Print to PDF (macOS Quartz)",
        detail: "Redraws every page through the same CoreGraphics pipeline as the print dialog's Save as PDF. Always removes encryption.",
        platforms: ["darwin"],
    },
    ghostscript: {
        id: "ghostscript",
        label: "Print to PDF (Ghostscript)",
        detail: "Re-prints each page through Ghostscript's pdfwrite device. Keeps text vector; images are re-encoded at their original resolution.",
        platforms: ["darwin", "win32", "linux"],
    },
    poppler: {
        id: "poppler",
        label: "Render via Poppler",
        detail: "Uses pdftocairo -pdf. Handy fallback when the primary engine refuses a malformed file.",
        platforms: ["darwin", "win32", "linux"],
    },
    qpdf: {
        id: "qpdf",
        label: "Lossless decrypt (qpdf)",
        detail: "Strips the encryption dictionary without re-drawing, so links, bookmarks, forms and annotations survive.",
        platforms: ["darwin", "win32", "linux"],
    },
};

/** Re-printing engines come first so "auto" matches the print-to-PDF intent. */
export const DEFAULT_CHAIN = IS_MAC
    ? ["quartz", "ghostscript", "poppler", "qpdf"]
    : ["ghostscript", "poppler", "qpdf"];

// ---------------------------------------------------------------------------
// macOS Quartz helper
// ---------------------------------------------------------------------------

let helperPromise = null;

async function buildHelper() {
    if (!IS_MAC) throw new Error("The Quartz engine is only available on macOS.");

    const source = await fs.stat(HELPER_SOURCE);
    const existing = await fs.stat(HELPER_BIN).catch(() => null);
    if (existing && existing.mtimeMs >= source.mtimeMs) return HELPER_BIN;

    const swiftc = (await findTool("swiftc")) ?? "/usr/bin/swiftc";
    await fs.mkdir(BUILD_DIR, { recursive: true });
    const staging = path.join(BUILD_DIR, `printtopdf.${process.pid}.tmp`);
    const { code, stderr } = await run(swiftc, ["-O", "-o", staging, HELPER_SOURCE], {
        timeoutMs: 180_000,
    });
    if (code !== 0) {
        await fs.rm(staging, { force: true });
        throw new Error(
            `Could not compile the print-to-PDF helper. Xcode Command Line Tools are required (xcode-select --install).\n${stderr.trim()}`
        );
    }
    await fs.rename(staging, HELPER_BIN);
    await fs.chmod(HELPER_BIN, 0o755);
    return HELPER_BIN;
}

export function ensureHelper() {
    if (!helperPromise) {
        helperPromise = buildHelper().catch((error) => {
            helperPromise = null;
            throw error;
        });
    }
    return helperPromise;
}

/** Runs the Swift helper and parses its single line of JSON. */
export async function helper(args) {
    const bin = await ensureHelper();
    const { code, stdout, stderr } = await run(bin, args);
    const line = stdout.trim().split("\n").filter(Boolean).pop();
    let payload = null;
    if (line) {
        try {
            payload = JSON.parse(line);
        } catch {
            payload = null;
        }
    }
    if (!payload) {
        return { ok: false, code, error: stderr.trim() || `helper exited with ${code}` };
    }
    return { ...payload, code };
}

// ---------------------------------------------------------------------------
// availability
// ---------------------------------------------------------------------------

export async function engineAvailability() {
    const [ghostscript, pdftocairo, qpdf] = await Promise.all([
        findFirstTool(GHOSTSCRIPT_NAMES),
        findTool("pdftocairo"),
        findTool("qpdf"),
    ]);

    let quartz = IS_MAC;
    let quartzError = IS_MAC ? null : "Requires macOS.";
    if (IS_MAC) {
        try {
            await ensureHelper();
        } catch (error) {
            quartz = false;
            quartzError = error.message;
        }
    }

    return {
        quartz: { ...METHODS.quartz, available: quartz, error: quartzError },
        ghostscript: {
            ...METHODS.ghostscript,
            available: Boolean(ghostscript),
            error: ghostscript ? null : "Ghostscript is not installed.",
        },
        poppler: {
            ...METHODS.poppler,
            available: Boolean(pdftocairo),
            error: pdftocairo ? null : "Poppler is not installed.",
        },
        qpdf: {
            ...METHODS.qpdf,
            available: Boolean(qpdf),
            error: qpdf ? null : "qpdf is not installed.",
        },
    };
}

// ---------------------------------------------------------------------------
// inspection backends
// ---------------------------------------------------------------------------

const MAX_SCAN_BYTES = 256 * 1024 * 1024;

/**
 * Dependency-free structural scan. Deliberately conservative: it answers "is
 * there an /Encrypt entry" reliably enough to gate a replacement, and treats
 * anything it cannot see (page counts hidden inside object streams) as unknown.
 */
async function scanRaw(file) {
    const stat = await fs.stat(file);
    if (stat.size > MAX_SCAN_BYTES) return { source: "scan" };
    const text = (await fs.readFile(file)).toString("latin1");

    const encrypted = /\/Encrypt[\s\r\n]+\d+[\s\r\n]+\d+[\s\r\n]+R/.test(text);
    const version = text.match(/^%PDF-(\d+\.\d+)/)?.[1] ?? null;

    let pages = 0;
    const counts = [...text.matchAll(/\/Type\s*\/Pages\b[\s\S]{0,400}?\/Count\s+(\d+)/g)].map(
        (match) => Number(match[1])
    );
    if (counts.length > 0) pages = Math.max(...counts);
    else pages = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;

    return { source: "scan", encrypted, version, pages: pages || undefined };
}

async function inspectWithQuartz(file, password) {
    const result = await helper(["info", file, password]);
    if (!result.ok) return null;
    return {
        source: "quartz",
        encrypted: result.encrypted,
        needsPassword: result.needsPassword,
        pages: result.needsPassword ? undefined : result.pages,
        allowsCopying: result.allowsCopying,
        allowsPrinting: result.allowsPrinting,
        version: result.version,
    };
}

async function inspectWithPdfinfo(file, password) {
    const bin = await findTool("pdfinfo");
    if (!bin) return null;
    const args = password ? ["-upw", password, "-opw", password, file] : [file];
    const { code, stdout, stderr } = await run(bin, args, { timeoutMs: 30_000 });

    if (/Incorrect password/i.test(stderr)) return { source: "pdfinfo", needsPassword: true };
    if (code !== 0 && !stdout.trim()) return null;

    const encryptedLine = stdout.match(/^Encrypted:\s+(.*)$/m)?.[1] ?? "";
    const encrypted = /^yes/i.test(encryptedLine);
    return {
        source: "pdfinfo",
        needsPassword: false,
        encrypted,
        algorithm: encrypted ? (encryptedLine.match(/algorithm:([^)\s]+)/)?.[1] ?? null) : null,
        allowsCopying: encrypted ? !/copy:no/.test(encryptedLine) : true,
        allowsPrinting: encrypted ? !/print:no/.test(encryptedLine) : true,
        pages: Number(stdout.match(/^Pages:\s+(\d+)/m)?.[1]) || undefined,
        version: stdout.match(/^PDF version:\s+(\S+)/m)?.[1] ?? null,
    };
}

async function inspectWithQpdf(file, password) {
    const bin = await findTool("qpdf");
    if (!bin) return null;
    const auth = password ? [`--password=${password}`] : [];

    const encryption = await run(bin, [...auth, "--show-encryption", file], { timeoutMs: 30_000 });
    const combined = `${encryption.stdout}\n${encryption.stderr}`;
    if (/invalid password/i.test(combined)) return { source: "qpdf", needsPassword: true };
    if (encryption.code !== 0 && !encryption.stdout.trim()) return null;

    const encrypted = !/File is not encrypted/i.test(encryption.stdout);
    const npages = await run(bin, [...auth, "--show-npages", file], { timeoutMs: 30_000 });

    return {
        source: "qpdf",
        needsPassword: false,
        encrypted,
        algorithm: encrypted ? (encryption.stdout.match(/^R\s*=\s*(\d+)/m)
            ? `R${encryption.stdout.match(/^R\s*=\s*(\d+)/m)[1]}`
            : null) : null,
        allowsCopying: encrypted
            ? !/extract for any purpose:\s*not allowed/i.test(encryption.stdout)
            : true,
        allowsPrinting: encrypted
            ? !/print (?:high|low) resolution:\s*not allowed/i.test(encryption.stdout)
            : true,
        pages: Number(npages.stdout.trim()) || undefined,
    };
}

/**
 * Merges every inspection backend that is installed. Later sources win, so the
 * ordering below is lowest to highest confidence.
 */
export async function inspectDocument(file, password = "") {
    const layers = [await scanRaw(file).catch(() => ({ source: "scan" }))];

    for (const backend of [inspectWithQpdf, inspectWithPdfinfo, inspectWithQuartz]) {
        if (backend === inspectWithQuartz && !IS_MAC) continue;
        try {
            const layer = await backend(file, password);
            if (layer) layers.push(layer);
        } catch {
            /* backend unavailable or unhappy — the next one may still answer */
        }
    }

    const merged = { encrypted: false, needsPassword: false, sources: [] };
    for (const layer of layers) {
        merged.sources.push(layer.source);
        for (const [key, value] of Object.entries(layer)) {
            if (key !== "source" && value !== undefined) merged[key] = value;
        }
    }
    if (merged.needsPassword) merged.encrypted = true;
    return merged;
}

// ---------------------------------------------------------------------------
// conversion engines
// ---------------------------------------------------------------------------

function passwordError(message) {
    const error = new Error(message);
    error.needsPassword = true;
    return error;
}

const PASSWORD_PATTERN = /password|encrypted file|not authorized/i;

export async function convertWith(method, source, destination, password) {
    if (method === "quartz") {
        const result = await helper(["convert", source, destination, password]);
        if (!result.ok) {
            if (result.code === 4) throw passwordError("A password is required to open this PDF.");
            throw new Error(result.error || "Print to PDF failed.");
        }
        return result;
    }

    if (method === "ghostscript") {
        const found = await findFirstTool(GHOSTSCRIPT_NAMES);
        if (!found) throw new Error("Ghostscript is not installed.");
        const args = [
            "-q",
            "-dNOPAUSE",
            "-dBATCH",
            "-dSAFER",
            "-sDEVICE=pdfwrite",
            "-dPDFSETTINGS=/prepress",
            // Re-print the page without quietly degrading its images.
            "-dDownsampleColorImages=false",
            "-dDownsampleGrayImages=false",
            "-dDownsampleMonoImages=false",
            "-dPassThroughJPEGImages=true",
            `-sOutputFile=${destination}`,
        ];
        if (password) args.push(`-sPDFPassword=${password}`);
        args.push(source);

        const { code, stdout, stderr } = await run(found.path, args, { timeoutMs: 600_000 });
        const output = `${stderr}\n${stdout}`.trim();
        // Ghostscript exits 0 even when it could not read the input — it happily
        // writes a valid but empty PDF instead. Its diagnostics are the only
        // reliable signal, so they are checked regardless of the exit code.
        const failed =
            code !== 0 ||
            /\*{2,}\s*Error|No pages will be processed|requires a password/i.test(output);
        if (failed) {
            if (/requires a password|invalid password|incorrect password/i.test(output)) {
                throw passwordError("A password is required to open this PDF.");
            }
            throw new Error(output || "Ghostscript failed.");
        }
        return { ok: true };
    }

    if (method === "poppler") {
        const bin = await findTool("pdftocairo");
        if (!bin) throw new Error("pdftocairo is not installed.");
        const args = ["-pdf"];
        if (password) args.push("-upw", password, "-opw", password);
        args.push(source, destination);
        const { code, stderr } = await run(bin, args, { timeoutMs: 600_000 });
        if (code !== 0) {
            if (PASSWORD_PATTERN.test(stderr)) {
                throw passwordError("A password is required to open this PDF.");
            }
            throw new Error(stderr.trim() || "pdftocairo failed.");
        }
        return { ok: true };
    }

    if (method === "qpdf") {
        const bin = await findTool("qpdf");
        if (!bin) throw new Error("qpdf is not installed.");
        const args = ["--decrypt"];
        if (password) args.push(`--password=${password}`);
        args.push(source, destination);
        const { code, stderr } = await run(bin, args, { timeoutMs: 600_000 });
        // Exit code 3 means "succeeded with warnings" — the output is valid.
        if (code !== 0 && code !== 3) {
            if (/invalid password/i.test(stderr)) {
                throw passwordError("A password is required to open this PDF.");
            }
            throw new Error(stderr.trim() || "qpdf failed.");
        }
        return { ok: true };
    }

    throw new Error(`Unknown method "${method}".`);
}
