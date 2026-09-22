import { execFile, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const MAX_CLEANUP_ITEMS = 500;
const PREVIEW_LIFETIME_MS = 10 * 60 * 1000;
const execFileAsync = promisify(execFile);

const KNOWN_FOLDERS_SCRIPT = `
$ErrorActionPreference = 'Stop'
$folders = @(
    [Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop),
    [Environment]::GetFolderPath([Environment+SpecialFolder]::MyDocuments),
    [Environment]::GetFolderPath([Environment+SpecialFolder]::MyPictures),
    [Environment]::GetFolderPath([Environment+SpecialFolder]::MyMusic),
    [Environment]::GetFolderPath([Environment+SpecialFolder]::MyVideos)
) | Where-Object { $_ }
ConvertTo-Json -Compress -InputObject @($folders)
`;

const RECYCLE_SCRIPT = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class StorageInspectorRecycleBin
{
    [ComImport]
    [Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IShellItem
    {
    }

    [ComImport]
    [Guid("947AAB5F-0A5C-4C13-B4D6-4BF7836FC9F8")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IFileOperation
    {
        uint Advise(IntPtr progressSink);
        void Unadvise(uint cookie);
        void SetOperationFlags(uint operationFlags);
        void SetProgressMessage([MarshalAs(UnmanagedType.LPWStr)] string message);
        void SetProgressDialog(IntPtr progressDialog);
        void SetProperties(IntPtr properties);
        void SetOwnerWindow(uint ownerWindow);
        void ApplyPropertiesToItem(IShellItem item);
        void ApplyPropertiesToItems(IntPtr items);
        void RenameItem(IShellItem item, [MarshalAs(UnmanagedType.LPWStr)] string newName, IntPtr progressSink);
        void RenameItems(IntPtr items, [MarshalAs(UnmanagedType.LPWStr)] string newName);
        void MoveItem(IShellItem item, IShellItem destinationFolder, [MarshalAs(UnmanagedType.LPWStr)] string newName, IntPtr progressSink);
        void MoveItems(IntPtr items, IShellItem destinationFolder);
        void CopyItem(IShellItem item, IShellItem destinationFolder, [MarshalAs(UnmanagedType.LPWStr)] string copyName, IntPtr progressSink);
        void CopyItems(IntPtr items, IShellItem destinationFolder);
        void DeleteItem(IShellItem item, IntPtr progressSink);
        void DeleteItems(IntPtr items);
        void NewItem(IShellItem destinationFolder, uint fileAttributes, [MarshalAs(UnmanagedType.LPWStr)] string name, [MarshalAs(UnmanagedType.LPWStr)] string templateName, IntPtr progressSink);
        void PerformOperations();
        [return: MarshalAs(UnmanagedType.Bool)]
        bool GetAnyOperationsAborted();
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    private static extern void SHCreateItemFromParsingName(
        [MarshalAs(UnmanagedType.LPWStr)] string path,
        IntPtr bindContext,
        ref Guid interfaceId,
        [MarshalAs(UnmanagedType.Interface)] out IShellItem shellItem);

    public static void Send(string filePath)
    {
        const uint FOF_SILENT = 0x0004;
        const uint FOF_NOCONFIRMATION = 0x0010;
        const uint FOF_NOERRORUI = 0x0400;
        const uint FOFX_RECYCLEONDELETE = 0x00080000;
        var operationType = Type.GetTypeFromCLSID(new Guid("3AD05575-8857-4850-9277-11B85BDB8E09"), true);
        var operation = (IFileOperation)Activator.CreateInstance(operationType);
        IShellItem item = null;
        try
        {
            var shellItemId = typeof(IShellItem).GUID;
            SHCreateItemFromParsingName(filePath, IntPtr.Zero, ref shellItemId, out item);
            operation.SetOperationFlags(FOF_SILENT | FOF_NOCONFIRMATION | FOF_NOERRORUI | FOFX_RECYCLEONDELETE);
            operation.DeleteItem(item, IntPtr.Zero);
            operation.PerformOperations();
            if (operation.GetAnyOperationsAborted())
            {
                throw new InvalidOperationException("Recycle Bin operation was aborted");
            }
        }
        finally
        {
            if (item != null)
            {
                Marshal.FinalReleaseComObject(item);
            }
            if (operation != null)
            {
                Marshal.FinalReleaseComObject(operation);
            }
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

async function resolveKnownFolderPaths() {
    const { stdout } = await execFileAsync("powershell.exe", [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        Buffer.from(KNOWN_FOLDERS_SCRIPT, "utf16le").toString("base64"),
    ], { windowsHide: true, timeout: 10_000, maxBuffer: 1024 * 1024 });
    const parsed = JSON.parse(stdout.trim() || "[]");
    return Array.isArray(parsed) ? parsed : [parsed];
}

async function canonicalPath(targetPath, errorCode = "cleanup_path_unavailable") {
    try {
        return await realpath(targetPath);
    } catch (error) {
        throw serviceError(errorCode, `Cannot resolve storage path ${targetPath}: ${error.message}`);
    }
}

async function createValidationContext(approvedRoots, analyzerProtectedPaths = [], knownFolderPaths) {
    if (knownFolderPaths !== undefined && !Array.isArray(knownFolderPaths)) {
        throw serviceError("cleanup_known_folders_invalid", "Known folder paths must be an array");
    }
    const resolvedKnownFolderPaths = knownFolderPaths ?? await resolveKnownFolderPaths().catch((error) => {
        throw serviceError(
            "cleanup_known_folders_unavailable",
            `Cannot resolve protected Windows known folders: ${error.message}`,
        );
    });

    const profile = process.env.USERPROFILE ? path.resolve(process.env.USERPROFILE) : undefined;
    const programData = path.resolve(process.env.ProgramData ?? "C:\\ProgramData");
    const protectedPaths = [
        ...resolvedKnownFolderPaths,
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

    const roots = await Promise.all(approvedRoots.map(async (root) => {
        const resolvedRoot = await canonicalPath(root.path, "cleanup_root_unavailable");
        if (root.canonicalPath && path.resolve(root.canonicalPath) !== path.resolve(resolvedRoot)) {
            throw serviceError("cleanup_root_changed", `Approved cleanup root changed since preview: ${root.path}`);
        }
        return { ...root, canonicalPath: resolvedRoot };
    }));
    const protections = [];
    for (const protection of [
        ...analyzerProtectedPaths,
        ...protectedPaths.map((protectedPath) => ({ path: protectedPath })),
    ]) {
        try {
            protections.push({ ...protection, canonicalPath: await realpath(protection.path) });
        } catch (error) {
            if (error?.code !== "ENOENT") {
                throw serviceError(
                    "cleanup_protected_path_unavailable",
                    `Cannot resolve protected path ${protection.path}: ${error.message}`,
                );
            }
        }
    }
    return { roots, protections };
}

function isProtectedPath(candidatePath, protections) {
    const normalized = path.resolve(candidatePath).toLowerCase();
    const analyzerProtection = protections.find((protectedPath) => (
        normalized === path.resolve(protectedPath.canonicalPath).toLowerCase()
        || normalized.startsWith(`${path.resolve(protectedPath.canonicalPath).toLowerCase()}${path.sep}`)
    ));
    if (analyzerProtection) {
        return analyzerProtection;
    }
    return undefined;
}

async function assertNoReparsePoints(candidatePath, rootPath) {
    const relative = path.relative(path.resolve(rootPath), path.resolve(candidatePath));
    let currentPath = path.resolve(rootPath);
    for (const segment of relative.split(path.sep).filter(Boolean)) {
        currentPath = path.join(currentPath, segment);
        const stats = await lstat(currentPath);
        if (stats.isSymbolicLink()) {
            throw serviceError(
                "cleanup_reparse_point_not_allowed",
                `Cleanup paths cannot contain symbolic links or junctions: ${currentPath}`,
            );
        }
    }
}

async function fingerprintDirectory(directoryPath) {
    const hash = createHash("sha256");
    let bytes = 0;
    let files = 0;

    const visit = async (currentPath) => {
        const entries = await readdir(currentPath, { withFileTypes: true });
        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            const stats = await lstat(fullPath);
            if (stats.isSymbolicLink()) {
                throw serviceError(
                    "cleanup_reparse_point_not_allowed",
                    `Cleanup directories cannot contain symbolic links or junctions: ${fullPath}`,
                );
            }
            const relativePath = path.relative(directoryPath, fullPath).replaceAll("\\", "/");
            const entryType = stats.isDirectory() ? "directory" : stats.isFile() ? "file" : "other";
            hash.update(`${relativePath}\0${entryType}\0${stats.size}\0${stats.mtimeMs}\0`);
            if (stats.isDirectory()) {
                await visit(fullPath);
            } else if (stats.isFile()) {
                bytes += stats.size;
                files += 1;
            } else {
                throw serviceError("cleanup_entry_type_changed", `Unsupported entry in cleanup directory: ${fullPath}`);
            }
        }
    };

    await visit(directoryPath);
    return { fingerprint: hash.digest("hex"), bytes, files };
}

async function revalidateCandidate(candidate, validationContext) {
    const lexicalRoot = validationContext.roots.find((root) => (
        isWithinRoot(candidate.path, root.path)
        || isWithinRoot(candidate.path, root.canonicalPath)
    ));
    if (!lexicalRoot) {
        throw serviceError("cleanup_path_not_allowed", `Path is outside approved scan roots: ${candidate.path}`);
    }
    await assertNoReparsePoints(candidate.path, lexicalRoot.path);
    const resolvedPath = await canonicalPath(candidate.path);
    if (!validationContext.roots.some((root) => isWithinRoot(resolvedPath, root.canonicalPath))) {
        throw serviceError("cleanup_path_not_allowed", `Path resolves outside approved scan roots: ${candidate.path}`);
    }
    const protection = isProtectedPath(resolvedPath, validationContext.protections);
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
    const directoryState = entryType === "directory" ? await fingerprintDirectory(candidate.path) : undefined;
    if (entryType === "directory" && candidate.directoryFingerprint) {
        if (
            directoryState.fingerprint !== candidate.directoryFingerprint
            || directoryState.bytes !== candidate.bytes
            || directoryState.files !== candidate.files
        ) {
            throw serviceError("cleanup_candidate_changed", `Cleanup candidate changed since the preview: ${candidate.path}`);
        }
    } else if (
        (entryType === "file" && stats.size !== candidate.bytes)
        || (entryType === "directory" && directoryState.bytes !== candidate.bytes)
        || stats.mtime.toISOString() !== candidate.modifiedAt
    ) {
        throw serviceError("cleanup_candidate_changed", `Cleanup candidate changed since the scan: ${candidate.path}`);
    }

    return {
        id: candidate.id,
        path: resolvedPath,
        bytes: entryType === "directory" ? directoryState.bytes : stats.size,
        files: entryType === "directory" ? directoryState.files : undefined,
        directoryFingerprint: directoryState?.fingerprint,
        modifiedAt: stats.mtime.toISOString(),
        entryType,
        app: candidate.app,
        category: candidate.category,
        reason: candidate.reason,
        risk: candidate.risk,
    };
}

function runRecycleBin(paths, onResult) {
    return new Promise((resolve) => {
        const encodedCommand = Buffer.from(RECYCLE_SCRIPT, "utf16le").toString("base64");
        const child = spawn(
            "powershell.exe",
            ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encodedCommand],
            { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
        );
        let stdout = "";
        let stderr = "";
        const results = [];
        let settled = false;
        const finish = (interruption) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeout);
            resolve({ results, interruption });
        };
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
            finish({ code: "cleanup_timeout", message: "Recycle Bin operation timed out" });
        }, 120_000);

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => {
            stdout += chunk;
            try {
                consumeLines();
            } catch (error) {
                child.kill();
                finish({
                    code: "cleanup_response_invalid",
                    message: `Could not parse Recycle Bin response: ${error.message}`,
                });
            }
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk;
        });
        child.on("error", (error) => {
            finish({ code: "cleanup_process_failed", message: error.message });
        });
        child.on("close", (code) => {
            if (settled) {
                return;
            }
            try {
                consumeLines(true);
            } catch (error) {
                finish({
                    code: "cleanup_response_invalid",
                    message: `Could not parse Recycle Bin response: ${error.message}`,
                });
                return;
            }
            finish(code === 0 ? undefined : {
                code: "cleanup_process_failed",
                message: stderr.trim() || `PowerShell exited with code ${code}`,
            });
        });
        child.stdin.end(JSON.stringify(paths));
    });
}

export async function createCleanupPreview({
    itemIds,
    candidates,
    approvedRoots,
    analyzerProtectedPaths = [],
    source,
    onProgress,
    knownFolderPaths,
}) {
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
    const validationContext = await createValidationContext(approvedRoots, analyzerProtectedPaths, knownFolderPaths);
    for (const [index, candidate] of selected.entries()) {
        onProgress?.({
            phase: "validating",
            currentPath: candidate.path,
            completed: index,
            total: selected.length,
        });
        try {
            entries.push(await revalidateCandidate(candidate, validationContext));
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
        approvedRoots: validationContext.roots.map(({ canonicalPath, ...root }) => ({
            ...root,
            canonicalPath,
        })),
        analyzerProtectedPaths,
    };
}

export async function executeCleanupPreview({
    preview,
    confirmed,
    onProgress,
    recycleBin = runRecycleBin,
    revalidateEntry = revalidateCandidate,
    knownFolderPaths,
}) {
    if (confirmed !== true) {
        throw serviceError("cleanup_confirmation_required", "Explicit cleanup confirmation is required");
    }
    if (!preview || Date.parse(preview.expiresAt) <= Date.now()) {
        throw serviceError("cleanup_preview_expired", "Cleanup preview expired; create a new preview");
    }

    const ready = [];
    const failed = [];
    const validationContext = await createValidationContext(
        preview.approvedRoots,
        preview.analyzerProtectedPaths,
        knownFolderPaths,
    );
    for (const [index, entry] of preview.entries.entries()) {
        onProgress?.({
            phase: "validating",
            currentPath: entry.path,
            completed: index,
            total: preview.entries.length,
        });
        try {
            ready.push(await revalidateEntry(entry, validationContext));
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
    const recycleOutcome = ready.length > 0
        ? await recycleBin(ready.map((entry) => entry.path), (result, completed) => {
            onProgress?.({
                phase: "recycling",
                currentPath: result.path,
                completed,
                total: ready.length,
            });
        })
        : { results: [], interruption: undefined };
    const sizeByPath = new Map(ready.map((entry) => [entry.path, entry.bytes]));
    const succeeded = recycleOutcome.results.filter((result) => result.success);
    const processFailures = recycleOutcome.results
        .filter((result) => !result.success)
        .map((result) => ({
            ...result,
            code: "cleanup_recycle_failed",
        }));
    const reportedPaths = new Set(recycleOutcome.results.map((result) => result.path));
    const unknown = recycleOutcome.interruption
        ? ready
            .filter((entry) => !reportedPaths.has(entry.path))
            .map((entry) => ({
                path: entry.path,
                code: recycleOutcome.interruption.code,
                error: recycleOutcome.interruption.message,
            }))
        : [];

    return {
        completedAt: new Date().toISOString(),
        succeeded,
        failed: [...failed, ...processFailures],
        unknown,
        reclaimedBytes: succeeded.reduce((total, result) => total + (sizeByPath.get(result.path) ?? 0), 0),
    };
}
