import { readdir, readFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const VERSION_FOLDER_PATTERN = /^[a-f0-9]{10}$/i;
const PROCESS_SCRIPT = `
$ErrorActionPreference = 'Stop'
$rows = @(Get-CimInstance Win32_Process -Filter "Name = 'Code - Insiders.exe'" | Select-Object ExecutablePath, CommandLine)
ConvertTo-Json -Compress -Depth 3 -InputObject $rows
`;

function normalize(filePath) {
    return path.resolve(filePath).replaceAll("/", "\\").toLowerCase();
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isWithin(candidatePath, parentPath) {
    const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
    return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function getInstallRoot() {
    const localAppData = process.env.LOCALAPPDATA ?? path.join(process.env.USERPROFILE ?? "", "AppData", "Local");
    return path.resolve(localAppData, "Programs", "Microsoft VS Code Insiders");
}

async function getRunningVersionFolders(root) {
    if (process.platform !== "win32") {
        return {
            status: "unsupported",
            processCount: 0,
            versionFolders: [],
            error: "VS Code process inspection is only supported on Windows",
        };
    }

    const { stdout } = await execFileAsync("powershell.exe", [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        Buffer.from(PROCESS_SCRIPT, "utf16le").toString("base64"),
    ], { windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    const parsed = JSON.parse(stdout.trim() || "[]");
    const processes = Array.isArray(parsed) ? parsed : [parsed];
    const rootPattern = new RegExp(`${escapeRegExp(normalize(root))}\\\\([a-f0-9]{10})\\\\`, "ig");
    const versionFolders = new Set();
    for (const process of processes) {
        const commandLine = String(process.CommandLine ?? "");
        let match;
        while ((match = rootPattern.exec(commandLine)) !== null) {
            versionFolders.add(match[1]);
        }
    }

    return {
        status: processes.length > 0 ? "running" : "not-running",
        processCount: processes.length,
        versionFolders: [...versionFolders],
    };
}

function getDirectoryAggregate(result, directoryPath) {
    const normalizedPath = normalize(directoryPath);
    return result.directories.find((directory) => normalize(directory.path) === normalizedPath);
}

function getVersionGroupSummary(folders) {
    const groups = new Map();
    for (const folder of folders) {
        const current = groups.get(folder.version) ?? {
            version: folder.version,
            folders: 0,
            bytes: 0,
            oldest: folder.modifiedAt,
            newest: folder.modifiedAt,
        };
        current.folders += 1;
        current.bytes += folder.bytes;
        current.oldest = current.oldest < folder.modifiedAt ? current.oldest : folder.modifiedAt;
        current.newest = current.newest > folder.modifiedAt ? current.newest : folder.modifiedAt;
        groups.set(folder.version, current);
    }
    return [...groups.values()].sort((left, right) => right.newest.localeCompare(left.newest));
}

export async function analyzeVsCodeInsiders(result) {
    const root = getInstallRoot();
    let rootStats;
    try {
        rootStats = await stat(root);
    } catch (error) {
        if (error?.code === "ENOENT") {
            return {
                status: "not-found",
                root,
                message: "The standard VS Code Insiders installation folder was not found.",
                folders: [],
                versions: [],
                topFiles: [],
                recommendations: [],
            };
        }
        throw error;
    }
    if (!rootStats.isDirectory()) {
        return {
            status: "not-found",
            root,
            message: "The standard VS Code Insiders installation path is not a folder.",
            folders: [],
            versions: [],
            topFiles: [],
            recommendations: [],
        };
    }

    const entries = await readdir(root, { withFileTypes: true });
    const folders = [];
    for (const entry of entries) {
        if (!entry.isDirectory() || !VERSION_FOLDER_PATTERN.test(entry.name)) {
            continue;
        }
        const folderPath = path.join(root, entry.name);
        const packagePath = path.join(folderPath, "resources", "app", "package.json");
        let packageInfo;
        try {
            packageInfo = JSON.parse(await readFile(packagePath, "utf8"));
        } catch (error) {
            if (error?.code === "ENOENT") {
                continue;
            }
            throw error;
        }
        const folderStats = await stat(folderPath);
        const aggregate = getDirectoryAggregate(result, folderPath);
        folders.push({
            name: entry.name,
            path: folderPath,
            version: typeof packageInfo.version === "string" ? packageInfo.version : "Unknown",
            bytes: aggregate?.bytes ?? 0,
            files: aggregate?.files ?? 0,
            modifiedAt: folderStats.mtime.toISOString(),
        });
    }

    let processInspection;
    try {
        processInspection = await getRunningVersionFolders(root);
    } catch (error) {
        processInspection = {
            status: "unknown",
            processCount: 0,
            versionFolders: [],
            error: error.message,
        };
    }
    const activeFolders = new Set(processInspection.versionFolders.map((name) => name.toLowerCase()));
    const orderedFolders = folders
        .map((folder) => ({
            ...folder,
            id: `vscode-version-${folder.name.toLowerCase()}`,
            entryType: "directory",
            active: activeFolders.has(folder.name.toLowerCase()),
            reviewable: !activeFolders.has(folder.name.toLowerCase()) && processInspection.status === "running",
            cleanupEligible: !activeFolders.has(folder.name.toLowerCase())
                && processInspection.status === "running"
                && activeFolders.size > 0,
            risk: "medium",
            reason: "Inactive VS Code Insiders application version",
        }))
        .sort((left, right) => right.bytes - left.bytes);
    const rootAggregate = getDirectoryAggregate(result, root);
    const versionBytes = folders.reduce((total, folder) => total + folder.bytes, 0);
    const inactiveFolders = orderedFolders.filter((folder) => !folder.active);
    const topFiles = result.largestFiles
        .filter((file) => isWithin(file.path, root))
        .sort((left, right) => right.bytes - left.bytes)
        .slice(0, 20);
    const recommendations = [];
    if (processInspection.status === "running" && activeFolders.size > 0) {
        recommendations.push({
            kind: "old-installations",
            risk: "medium",
            folders: inactiveFolders.length,
            bytes: inactiveFolders.reduce((total, folder) => total + folder.bytes, 0),
            message: "The active installation is marked. Inactive version folders can be selected and moved to the Recycle Bin.",
        });
    } else if (processInspection.status === "not-running" && folders.length > 0) {
        recommendations.push({
            kind: "old-installations",
            risk: "high",
            folders: Math.max(0, folders.length - 1),
            bytes: [...inactiveFolders]
                .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))
                .slice(1)
                .reduce((total, folder) => total + folder.bytes, 0),
            message: "No VS Code Insiders process is running, so the active version could not be confirmed. Keep the newest installation until VS Code is opened once, then review older folders.",
        });
    } else if (processInspection.status === "unknown") {
        recommendations.push({
            kind: "process-check",
            risk: "high",
            folders: 0,
            bytes: 0,
            message: "The active version could not be verified; do not remove installation folders.",
        });
    }

    return {
        status: processInspection.status,
        root,
        rootBytes: rootAggregate?.bytes ?? rootStats.size,
        versionBytes,
        nonVersionBytes: Math.max(0, (rootAggregate?.bytes ?? 0) - versionBytes),
        folderCount: folders.length,
        activeFolders: orderedFolders.filter((folder) => folder.active).map((folder) => folder.name),
        processCount: processInspection.processCount,
        processInspectionError: processInspection.error,
        folders: orderedFolders,
        versions: getVersionGroupSummary(folders),
        topFiles,
        recommendations,
        message: processInspection.status === "running"
            ? "VS Code Insiders is running. Installation folders marked active are in use."
            : processInspection.status === "not-running"
                ? "VS Code Insiders is not running; the current installation could not be confirmed."
                : "The VS Code Insiders process state could not be verified.",
    };
}
