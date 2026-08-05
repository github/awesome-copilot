// OS integration for the pdf-unlock canvas: process spawning, tool discovery,
// and the handful of things that must be done differently on macOS vs Windows
// (Trash vs Recycle Bin, Finder vs Explorer, the native file picker).

import { spawn } from "node:child_process";
import path from "node:path";

export const IS_WINDOWS = process.platform === "win32";
export const IS_MAC = process.platform === "darwin";

export function run(command, args, options = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
            ...options,
        });
        let stdout = "";
        let stderr = "";
        let settled = false;
        const timer = setTimeout(() => {
            settled = true;
            child.kill("SIGKILL");
            resolve({ code: -1, stdout, stderr: `${stderr}\ntimed out` });
        }, options.timeoutMs ?? 120_000);

        child.stdout.on("data", (chunk) => {
            stdout += chunk;
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk;
        });
        child.on("error", (error) => {
            clearTimeout(timer);
            if (!settled) resolve({ code: -1, stdout, stderr: String(error.message) });
        });
        child.on("close", (code) => {
            clearTimeout(timer);
            if (!settled) resolve({ code: code ?? -1, stdout, stderr });
        });
    });
}

const toolCache = new Map();

/** Resolves an executable name to an absolute path, or null when not installed. */
export async function findTool(name) {
    if (toolCache.has(name)) return toolCache.get(name);
    const { code, stdout } = IS_WINDOWS
        ? await run("where.exe", [name], { timeoutMs: 15_000 })
        : await run("/usr/bin/which", [name], { timeoutMs: 15_000 });
    const resolved =
        code === 0
            ? (stdout
                  .split(/\r?\n/)
                  .map((line) => line.trim())
                  .filter(Boolean)[0] ?? null)
            : null;
    toolCache.set(name, resolved);
    return resolved;
}

/** First installed executable from a list of candidate names. */
export async function findFirstTool(names) {
    for (const name of names) {
        const resolved = await findTool(name);
        if (resolved) return { name, path: resolved };
    }
    return null;
}

// PowerShell is quoted with single quotes; doubling them is the correct escape.
const psQuote = (value) => `'${String(value).replace(/'/g, "''")}'`;

async function powershell(script, { sta = false, timeoutMs = 120_000 } = {}) {
    const shell =
        (await findTool("powershell.exe")) ?? (await findTool("pwsh")) ?? "powershell.exe";
    const args = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass"];
    if (sta) args.splice(1, 1, "-STA"); // -STA replaces -NonInteractive for dialogs
    args.push("-Command", script);
    return run(shell, args, { timeoutMs });
}

// ---------------------------------------------------------------------------
// integrations
// ---------------------------------------------------------------------------

/** Shows the file in Finder / File Explorer. */
export async function reveal(target) {
    if (IS_WINDOWS) {
        // explorer.exe returns 1 even on success, so the exit code is ignored.
        spawn("explorer.exe", [`/select,${path.normalize(target)}`], {
            stdio: "ignore",
            detached: true,
            windowsHide: true,
        }).unref();
        return { ok: true };
    }
    spawn("/usr/bin/open", ["-R", target], { stdio: "ignore", detached: true }).unref();
    return { ok: true };
}

/** Moves a file to the Trash (macOS) or Recycle Bin (Windows). */
export async function moveToBin(target, { macHelper } = {}) {
    if (IS_WINDOWS) {
        const script = [
            "Add-Type -AssemblyName Microsoft.VisualBasic",
            `[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(${psQuote(
                target
            )}, 'OnlyErrorDialogs', 'SendToRecycleBin')`,
        ].join("; ");
        const { code, stderr } = await powershell(script, { timeoutMs: 60_000 });
        if (code !== 0) {
            throw new Error(stderr.trim() || "Could not move the original to the Recycle Bin.");
        }
        return { mode: "trash", location: "Recycle Bin" };
    }

    if (!macHelper) throw new Error("The macOS helper is unavailable.");
    const result = await macHelper(["trash", target]);
    if (!result.ok) throw new Error(result.error || "Could not move the original to the Trash.");
    return { mode: "trash", location: result.trashedTo || "Trash" };
}

/** Opens the OS file picker and returns the selected PDF paths. */
export async function pickFiles() {
    if (IS_WINDOWS) {
        const script = [
            "Add-Type -AssemblyName System.Windows.Forms",
            "$dialog = New-Object System.Windows.Forms.OpenFileDialog",
            "$dialog.Filter = 'PDF files (*.pdf)|*.pdf'",
            "$dialog.Multiselect = $true",
            "$dialog.Title = 'Select PDFs to unlock'",
            "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $dialog.FileNames -join [Environment]::NewLine }",
        ].join("; ");
        const { code, stdout, stderr } = await powershell(script, {
            sta: true,
            timeoutMs: 300_000,
        });
        if (code !== 0) return { ok: false, error: stderr.trim() || "The file picker failed." };
        const paths = stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        return { ok: true, paths, cancelled: paths.length === 0 };
    }

    const osascript = await findTool("osascript");
    if (!osascript) return { ok: false, error: "osascript is unavailable." };
    const lines = [
        'set chosen to choose file with prompt "Select PDFs to unlock" of type {"com.adobe.pdf"} with multiple selections allowed',
        'set output to ""',
        "repeat with item_ref in chosen",
        "set output to output & POSIX path of item_ref & linefeed",
        "end repeat",
        "return output",
    ];
    const args = [];
    for (const line of lines) args.push("-e", line);
    const { code, stdout, stderr } = await run(osascript, args, { timeoutMs: 300_000 });
    if (code !== 0) {
        if (/User cancell?ed/i.test(stderr)) return { ok: true, paths: [], cancelled: true };
        return { ok: false, error: stderr.trim() || "The file picker was dismissed." };
    }
    return {
        ok: true,
        paths: stdout
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
    };
}

/**
 * Locates files on disk by exact filename. Used to recover the real path of a
 * drag-and-dropped file, which webviews deliberately hide. Spotlight makes this
 * instant on macOS; Windows Search is queried through its COM provider and
 * simply returns nothing when the index is unavailable.
 */
export async function findByName(name) {
    if (IS_WINDOWS) {
        const script = [
            "$connection = New-Object -ComObject ADODB.Connection",
            "$recordset = New-Object -ComObject ADODB.Recordset",
            "try {",
            "  $connection.Open('Provider=Search.CollatorDSO;Extended Properties=\"Application=Windows\"')",
            `  $recordset.Open("SELECT System.ItemPathDisplay FROM SYSTEMINDEX WHERE System.FileName = '${String(
                name
            ).replace(/'/g, "''")}'", $connection)`,
            "  while (-not $recordset.EOF) { $recordset.Fields.Item(0).Value; $recordset.MoveNext() }",
            "} catch { } finally { if ($recordset.State -ne 0) { $recordset.Close() }; if ($connection.State -ne 0) { $connection.Close() } }",
        ].join("\n");
        const { code, stdout } = await powershell(script, { timeoutMs: 20_000 });
        if (code !== 0) return [];
        return stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
    }

    const mdfind = await findTool("mdfind");
    if (!mdfind) return [];
    const escaped = String(name).replace(/["\\]/g, "\\$&");
    const { stdout } = await run(mdfind, ["-name", escaped], { timeoutMs: 15_000 });
    return stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

/** Install hints surfaced in the panel when no engine is available. */
export function setupHints() {
    if (IS_WINDOWS) {
        return [
            { tool: "Ghostscript", command: "winget install ArtifexSoftware.GhostScript" },
            { tool: "qpdf", command: "winget install qpdf.qpdf" },
        ];
    }
    return [
        { tool: "Xcode Command Line Tools", command: "xcode-select --install" },
        { tool: "qpdf", command: "brew install qpdf" },
        { tool: "Poppler", command: "brew install poppler" },
    ];
}
