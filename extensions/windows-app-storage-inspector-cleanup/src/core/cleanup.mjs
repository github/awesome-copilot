import { randomUUID } from "node:crypto";
import { lstat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const MAX_CLEANUP_ITEMS = 500;
const PREVIEW_LIFETIME_MS = 10 * 60 * 1000;

const RECYCLE_SCRIPT = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class StorageInspectorRecycleBin
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct SHFILEOPSTRUCT
    {
        public IntPtr hwnd;
        public uint wFunc;
        [MarshalAs(UnmanagedType.LPWStr)] public string pFrom;
        [MarshalAs(UnmanagedType.LPWStr)] public string pTo;
        public ushort fFlags;
        [MarshalAs(UnmanagedType.Bool)] public bool fAnyOperationsAborted;
        public IntPtr hNameMappings;
        [MarshalAs(UnmanagedType.LPWStr)] public string lpszProgressTitle;
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern int SHFileOperation(ref SHFILEOPSTRUCT operation);

    public static void Send(string filePath)
    {
        var operation = new SHFILEOPSTRUCT
        {
            wFunc = 3,
            pFrom = filePath + "\\0\\0",
            fFlags = 0x0004 | 0x0010 | 0x0040 | 0x0400
        };
        var result = SHFileOperation(ref operation);
        if (result != 0 || operation.fAnyOperationsAborted)
        {
            throw new InvalidOperationException("Recycle Bin operation failed with code " + result);
        }
    }
}
'@

$paths = [Console]::In.ReadToEnd() | ConvertFrom-Json
foreach ($target in $paths) {
    try {
        [StorageInspectorRecycleBin]::Send([string]$target)
        $result = [pscustomobject]@{ path = [string]$target; success = $true }
    }
    catch {
        $result = [pscustomobject]@{ path = [string]$target; success = $false; error = $_.Exception.Message }
    }
    Write-Output ($result | ConvertTo-Json -Compress -Depth 4)
}
`;

function serviceError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function isWithinRoot(candidatePath, rootPath) {
    const relative = path.relative(path.resolve(rootPath), path.resolve(candidatePath));
    return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function isProtectedPath(candidatePath, analyzerProtectedPaths = []) {
    const normalized = path.resolve(candidatePath).toLowerCase();
    const analyzerProtection = analyzerProtectedPaths.find((protectedPath) => (
        normalized === path.resolve(protectedPath.path).toLowerCase()
        || normalized.startsWith(`${path.resolve(protectedPath.path).toLowerCase()}${path.sep}`)
    ));
    if (analyzerProtection) {
        return analyzerProtection;
    }
    const profile = path.resolve(process.env.USERPROFILE ?? "").toLowerCase();
    const programData = path.resolve(process.env.ProgramData ?? "C:\\ProgramData").toLowerCase();
    const protectedRoots = [
        profile && path.join(profile, "desktop"),
        profile && path.join(profile, "documents"),
        profile && path.join(profile, "pictures"),
        profile && path.join(profile, "music"),
        profile && path.join(profile, "videos"),
        path.join(programData, "microsoft", "crypto"),
        path.join(programData, "microsoft", "protect"),
        path.join(programData, "microsoft", "windows"),
        path.join(programData, "package cache"),
        profile && path.join(profile, ".copilot", "extensions", "windows-app-storage-inspector-cleanup"),
    ].filter(Boolean);

    return protectedRoots.some(
        (protectedPath) =>
            normalized === protectedPath ||
            normalized.startsWith(`${protectedPath}${path.sep}`),
    ) ? {} : undefined;
}

async function revalidateCandidate(candidate, approvedRoots, analyzerProtectedPaths) {
    if (!approvedRoots.some((root) => isWithinRoot(candidate.path, root.path))) {
        throw serviceError("cleanup_path_not_allowed", `Path is outside approved scan roots: ${candidate.path}`);
    }
    const protection = isProtectedPath(candidate.path, analyzerProtectedPaths);
    if (protection) {
        if (!protection.analyzerId) {
            throw serviceError(
                "cleanup_path_protected",
                `Path is protected from cleanup because it is in a protected location: ${candidate.path}.`,
            );
        }
        const manager = protection.name ?? "This analyzer";
        throw serviceError(
            "cleanup_path_analyzer_managed",
            `Path is protected from cleanup by ${manager}: ${candidate.path}. Use the ${protection.analyzerId} custom analyzer instead.`,
        );
    }

    let stats;
    try {
        stats = await lstat(candidate.path);
    } catch (error) {
        throw serviceError(
            "cleanup_path_unavailable",
            `Cannot access cleanup candidate ${candidate.path}: ${error.message}`,
        );
    }

    const entryType = candidate.entryType ?? "file";
    const validType = entryType === "directory" ? stats.isDirectory() : stats.isFile();
    if (!validType || stats.isSymbolicLink()) {
        throw serviceError(
            "cleanup_entry_type_changed",
            `Cleanup candidate is not the expected ${entryType}: ${candidate.path}`,
        );
    }
    if (
        (entryType === "file" && stats.size !== candidate.bytes)
        || stats.mtime.toISOString() !== candidate.modifiedAt
    ) {
        throw serviceError("cleanup_candidate_changed", `Cleanup candidate changed since the scan: ${candidate.path}`);
    }

    return {
        id: candidate.id,
        path: candidate.path,
        bytes: entryType === "directory" ? candidate.bytes : stats.size,
        modifiedAt: stats.mtime.toISOString(),
        entryType,
        app: candidate.app,
        category: candidate.category,
        reason: candidate.reason,
        risk: candidate.risk,
    };
}

function runRecycleBin(paths, onResult) {
    return new Promise((resolve, reject) => {
        const encodedCommand = Buffer.from(RECYCLE_SCRIPT, "utf16le").toString("base64");
        const child = spawn(
            "powershell.exe",
            ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encodedCommand],
            { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
        );
        let stdout = "";
        let stderr = "";
        const results = [];
        const consumeLines = (flush = false) => {
            const lines = stdout.split(/\r?\n/);
            const remainder = lines.pop() ?? "";
            stdout = flush ? "" : remainder;
            const completeLines = flush && remainder ? lines.concat(remainder) : lines;
            for (const line of completeLines) {
                if (!line.trim()) {
                    continue;
                }
                const result = JSON.parse(line);
                results.push(result);
                onResult?.(result, results.length);
            }
        };
        const timeout = setTimeout(() => {
            child.kill();
            reject(serviceError("cleanup_timeout", "Recycle Bin operation timed out"));
        }, 120_000);

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => {
            stdout += chunk;
            try {
                consumeLines();
            } catch (error) {
                child.kill();
                reject(serviceError("cleanup_response_invalid", `Could not parse Recycle Bin response: ${error.message}`));
            }
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk;
        });
        child.on("error", (error) => {
            clearTimeout(timeout);
            reject(serviceError("cleanup_process_failed", error.message));
        });
        child.on("close", (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                reject(serviceError("cleanup_process_failed", stderr.trim() || `PowerShell exited with code ${code}`));
                return;
            }
            try {
                consumeLines(true);
                resolve(results);
            } catch (error) {
                reject(serviceError("cleanup_response_invalid", `Could not parse Recycle Bin response: ${error.message}`));
            }
        });
        child.stdin.end(JSON.stringify(paths));
    });
}

export async function createCleanupPreview({ itemIds, candidates, approvedRoots, analyzerProtectedPaths = [], source, onProgress }) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw serviceError("cleanup_selection_required", "Select at least one cleanup candidate");
    }

    const uniqueIds = [...new Set(itemIds)];
    if (uniqueIds.length > MAX_CLEANUP_ITEMS) {
        throw serviceError("cleanup_selection_too_large", `Select no more than ${MAX_CLEANUP_ITEMS} files at once`);
    }

    const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const selected = uniqueIds.map((id) => {
        const candidate = candidateMap.get(id);
        if (!candidate) {
            throw serviceError("cleanup_candidate_unknown", `Unknown cleanup candidate: ${id}`);
        }
        return candidate;
    });

    const entries = [];
    const rejected = [];
    for (const [index, candidate] of selected.entries()) {
        onProgress?.({
            phase: "validating",
            currentPath: candidate.path,
            completed: index,
            total: selected.length,
        });
        try {
            entries.push(await revalidateCandidate(candidate, approvedRoots, analyzerProtectedPaths));
        } catch (error) {
            rejected.push({
                id: candidate.id,
                path: candidate.path,
                code: error.code ?? "cleanup_validation_failed",
                message: error.message,
            });
        }
        onProgress?.({
            phase: "validating",
            currentPath: candidate.path,
            completed: index + 1,
            total: selected.length,
        });
    }

    if (entries.length === 0) {
        throw serviceError("cleanup_no_valid_candidates", "None of the selected files passed cleanup validation");
    }

    return {
        id: randomUUID(),
        source,
        selectedIds: entries.map((entry) => entry.id),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + PREVIEW_LIFETIME_MS).toISOString(),
        entries,
        rejected,
        totalBytes: entries.reduce((total, entry) => total + entry.bytes, 0),
        approvedRoots,
        analyzerProtectedPaths,
    };
}

export async function executeCleanupPreview({ preview, confirmed, onProgress }) {
    if (confirmed !== true) {
        throw serviceError("cleanup_confirmation_required", "Explicit cleanup confirmation is required");
    }
    if (!preview || Date.parse(preview.expiresAt) <= Date.now()) {
        throw serviceError("cleanup_preview_expired", "Cleanup preview expired; create a new preview");
    }

    const ready = [];
    const failed = [];
    for (const [index, entry] of preview.entries.entries()) {
        onProgress?.({
            phase: "validating",
            currentPath: entry.path,
            completed: index,
            total: preview.entries.length,
        });
        try {
            ready.push(await revalidateCandidate(entry, preview.approvedRoots, preview.analyzerProtectedPaths));
        } catch (error) {
            failed.push({
                path: entry.path,
                success: false,
                code: error.code ?? "cleanup_validation_failed",
                error: error.message,
            });
        }
        onProgress?.({
            phase: "validating",
            currentPath: entry.path,
            completed: index + 1,
            total: preview.entries.length,
        });
    }

    onProgress?.({
        phase: "recycling",
        currentPath: ready[0]?.path,
        completed: 0,
        total: ready.length,
    });
    const recycled = ready.length > 0
        ? await runRecycleBin(ready.map((entry) => entry.path), (result, completed) => {
            onProgress?.({
                phase: "recycling",
                currentPath: result.path,
                completed,
                total: ready.length,
            });
        })
        : [];
    const sizeByPath = new Map(ready.map((entry) => [entry.path, entry.bytes]));
    const succeeded = recycled.filter((result) => result.success);
    const processFailures = recycled
        .filter((result) => !result.success)
        .map((result) => ({
            ...result,
            code: "cleanup_recycle_failed",
        }));

    return {
        completedAt: new Date().toISOString(),
        succeeded,
        failed: [...failed, ...processFailures],
        reclaimedBytes: succeeded.reduce((total, result) => total + (sizeByPath.get(result.path) ?? 0), 0),
    };
}
