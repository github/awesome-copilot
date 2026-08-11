import { createHash } from "node:crypto";
import { lstat, opendir } from "node:fs/promises";
import path from "node:path";
import { CloudFileAttributeReader } from "./cloud-files.mjs";
import { findCategorizer } from "./categorizers.mjs";

const DIRECTORY_CONCURRENCY = 8;
const ENTRY_BATCH_SIZE = 64;
const MAX_WARNINGS = 200;
const MAX_LARGEST_FILES = 500;
const MAX_CLOUD_ONLY_FILES = 100;
const MAX_CANDIDATES = 5000;
const MAX_DIRECTORY_ROWS = 1000;
const MAX_TREE_CHILDREN = 80;
const MAX_TREE_DEPTH = 12;

const APP_RULES = [
    ["GitHub Copilot", ["\\.copilot\\", "\\github copilot\\", "\\github-copilot\\"]],
    ["Microsoft 365 Copilot", ["\\microsoft\\copilot\\", "\\m365 copilot\\", "\\microsoft 365 copilot\\"]],
    ["Microsoft Scout", ["\\.scout\\", "\\microsoft scout\\", "\\m365scout\\"]],
    ["Visual Studio Code", ["\\appdata\\roaming\\code\\", "\\code - insiders\\", "\\microsoft vs code insiders\\", "\\visual studio code\\"]],
    ["Microsoft Office", ["\\microsoft\\office\\", "\\microsoft\\outlook\\"]],
    ["Microsoft Teams", ["\\microsoft\\teams\\", "\\msteams\\"]],
    ["OneDrive", ["\\microsoft\\onedrive\\", "\\onedrive\\"]],
    ["GitHub Desktop", ["\\github desktop\\"]],
];

const CATEGORY_EXTENSIONS = new Map([
    [".zip", "Archives"],
    [".7z", "Archives"],
    [".rar", "Archives"],
    [".tar", "Archives"],
    [".gz", "Archives"],
    [".jpg", "Images"],
    [".jpeg", "Images"],
    [".png", "Images"],
    [".gif", "Images"],
    [".webp", "Images"],
    [".svg", "Images"],
    [".mp4", "Videos"],
    [".mov", "Videos"],
    [".mkv", "Videos"],
    [".avi", "Videos"],
    [".mp3", "Audio"],
    [".wav", "Audio"],
    [".flac", "Audio"],
    [".pdf", "Documents"],
    [".docx", "Documents"],
    [".xlsx", "Documents"],
    [".pptx", "Documents"],
    [".log", "Logs"],
    [".tmp", "Temporary files"],
    [".temp", "Temporary files"],
    [".db", "Databases"],
    [".sqlite", "Databases"],
    [".exe", "Applications"],
    [".dll", "Applications"],
    [".msi", "Installers"],
    [".nupkg", "Package artifacts"],
    [".vsix", "Package artifacts"],
    [".tgz", "Package artifacts"],
]);

const CLEANUP_PATH_RULES = [
    { token: "\\cache\\", category: "Cache", minAgeDays: 7 },
    { token: "\\caches\\", category: "Cache", minAgeDays: 7 },
    { token: "\\code cache\\", category: "Code cache", minAgeDays: 7 },
    { token: "\\gpucache\\", category: "GPU cache", minAgeDays: 7 },
    { token: "\\logs\\", category: "Logs", minAgeDays: 3 },
    { token: "\\temp\\", category: "Temporary files", minAgeDays: 7 },
    { token: "\\tmp\\", category: "Temporary files", minAgeDays: 7 },
    { token: "\\crashpad\\", category: "Crash reports", minAgeDays: 7 },
    { token: "\\crashes\\", category: "Crash reports", minAgeDays: 7 },
];

function abortError() {
    const error = new Error("Storage scan cancelled");
    error.code = "ABORT_ERR";
    return error;
}

function assertNotAborted(signal) {
    if (signal?.aborted) {
        throw abortError();
    }
}

function normalizeWindowsPath(value) {
    return path.resolve(value).replaceAll("/", "\\").toLowerCase();
}

function isWithinPath(candidatePath, parentPath) {
    const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
    return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function protectionForPath(directoryPath, categorizers, analyzerManagedPaths = []) {
    const managedPath = analyzerManagedPaths
        .filter((item) => isWithinPath(directoryPath, item.path))
        .sort((left, right) => right.path.length - left.path.length)[0];
    if (managedPath) {
        return {
            analyzerId: managedPath.analyzerId,
            name: managedPath.name,
            description: managedPath.description,
        };
    }
    const categorizer = findCategorizer(directoryPath, categorizers);
    if (!categorizer?.analyzerId) {
        return undefined;
    }
    return {
        analyzerId: categorizer.analyzerId,
        name: categorizer.name,
        description: categorizer.description,
    };
}

function incrementAggregate(map, key, size) {
    const current = map.get(key) ?? { name: key, bytes: 0, files: 0 };
    current.bytes += size;
    current.files += 1;
    map.set(key, current);
}

function classifyApp(filePath, categorizer) {
    if (categorizer) {
        return categorizer.name;
    }
    const normalized = normalizeWindowsPath(filePath);
    for (const [name, tokens] of APP_RULES) {
        if (tokens.some((token) => normalized.includes(token))) {
            return name;
        }
    }
    return "Other";
}

function classifyCategory(filePath, categorizer) {
    if (categorizer) {
        return categorizer.category;
    }
    const normalized = normalizeWindowsPath(filePath);
    const cleanupRule = CLEANUP_PATH_RULES.find((rule) => normalized.includes(rule.token));
    if (cleanupRule) {
        return cleanupRule.category;
    }

    const extension = path.extname(filePath).toLowerCase();
    return CATEGORY_EXTENSIONS.get(extension) ?? (extension ? "Other files" : "Files without extension");
}

function cleanupCandidate(filePath, stats, app, categorizer, analyzerProtection, protectAnalyzerManagedPaths) {
    const normalized = normalizeWindowsPath(filePath);
    const analyzerCleanupAllowed = (categorizer?.analyzerId || analyzerProtection)
        && !protectAnalyzerManagedPaths;
    const policyCleanupAllowed = categorizer?.cleanupPolicy === "automatic";
    if (!analyzerCleanupAllowed && !policyCleanupAllowed) {
        return undefined;
    }
    if (normalized.includes("\\.git\\") || normalized.includes("\\windows\\installer\\")) {
        return undefined;
    }

    const rule = CLEANUP_PATH_RULES.find((entry) => normalized.includes(entry.token));
    if (!rule || stats.size === 0) {
        return undefined;
    }

    const ageDays = Math.floor((Date.now() - stats.mtimeMs) / 86_400_000);
    if (ageDays < rule.minAgeDays) {
        return undefined;
    }

    return {
        id: createHash("sha256").update(filePath).digest("hex").slice(0, 24),
        path: filePath,
        bytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        ageDays,
        app,
        category: rule.category,
        reason: `${rule.category} file not modified for ${ageDays} days`,
        risk: "low",
    };
}

function pruneLargest(items, maximum) {
    if (items.length <= maximum * 2) {
        return;
    }
    items.sort((left, right) => right.bytes - left.bytes);
    items.length = maximum;
}

function createDirectoryNode(directoryPath, name, parentPath, rootId) {
    return {
        path: directoryPath,
        name,
        parentPath,
        rootId,
        ownBytes: 0,
        ownFiles: 0,
        bytes: 0,
        files: 0,
        children: [],
    };
}

function summarizeMap(map) {
    return [...map.values()].sort((left, right) => right.bytes - left.bytes);
}

function buildTree(nodes, nodePath, categorizers, analyzerManagedPaths, protectAnalyzerManagedPaths, depth = 0) {
    const node = nodes.get(normalizeWindowsPath(nodePath));
    if (!node) {
        return undefined;
    }

    const result = {
        name: node.name,
        path: node.path,
        bytes: node.bytes,
        files: node.files,
        children: [],
        protection: protectAnalyzerManagedPaths
            ? protectionForPath(node.path, categorizers, analyzerManagedPaths)
            : undefined,
    };

    if (depth >= MAX_TREE_DEPTH) {
        return result;
    }

    const children = node.children
        .map((childPath) => nodes.get(normalizeWindowsPath(childPath)))
        .filter(Boolean)
        .sort((left, right) => right.bytes - left.bytes);

    for (const child of children.slice(0, MAX_TREE_CHILDREN)) {
        const childTree = buildTree(
            nodes,
            child.path,
            categorizers,
            analyzerManagedPaths,
            protectAnalyzerManagedPaths,
            depth + 1,
        );
        if (childTree) {
            result.children.push(childTree);
        }
    }

    if (children.length > MAX_TREE_CHILDREN) {
        const omitted = children.slice(MAX_TREE_CHILDREN);
        result.children.push({
            name: `Other (${omitted.length} folders)`,
            path: `${node.path}\\*`,
            bytes: omitted.reduce((total, child) => total + child.bytes, 0),
            files: omitted.reduce((total, child) => total + child.files, 0),
            children: [],
            aggregate: true,
        });
    }

    return result;
}

function aggregateDirectories(nodes, rootPaths, categorizers, analyzerManagedPaths, protectAnalyzerManagedPaths) {
    const byDepth = [...nodes.values()].sort(
        (left, right) => right.path.split(path.sep).length - left.path.split(path.sep).length,
    );

    for (const node of byDepth) {
        node.bytes += node.ownBytes;
        node.files += node.ownFiles;
        if (!node.parentPath) {
            continue;
        }
        const parent = nodes.get(normalizeWindowsPath(node.parentPath));
        if (parent) {
            parent.bytes += node.bytes;
            parent.files += node.files;
        }
    }

    return rootPaths
        .map((rootPath) => buildTree(nodes, rootPath, categorizers, analyzerManagedPaths, protectAnalyzerManagedPaths))
        .filter(Boolean);
}

export function getDefaultRoots(scopes = ["profile", "programData"]) {
    const roots = [];
    const requested = new Set(scopes);
    const profile = process.env.USERPROFILE;
    const programData = process.env.ProgramData ?? "C:\\ProgramData";

    if (requested.has("profile") && profile) {
        roots.push({ id: "profile", label: "User profile", path: path.resolve(profile) });
    }
    if (requested.has("programData")) {
        roots.push({ id: "programData", label: "ProgramData", path: path.resolve(programData) });
    }
    return roots;
}

export async function scanStorage({
    roots,
    categorizers = [],
    analyzerManagedPaths: configuredAnalyzerManagedPaths = [],
    protectAnalyzerManagedPaths = true,
    signal,
    onProgress = () => {},
}) {
    if (!Array.isArray(roots) || roots.length === 0) {
        const error = new Error("At least one scan root is required");
        error.code = "scan_roots_required";
        throw error;
    }

    const startedAt = new Date();
    const nodes = new Map();
    const rootPaths = [];
    const appTotals = new Map();
    const categoryTotals = new Map();
    const extensionTotals = new Map();
    const largestFiles = [];
    const cloudOnlyFiles = [];
    const candidates = [];
    const warnings = [];
    const cloudFileReader = new CloudFileAttributeReader();
    let directoriesScanned = 0;
    let filesScanned = 0;
    let bytesScanned = 0;
    let cloudOnlyFilesScanned = 0;
    let cloudOnlyBytesScanned = 0;
    let skippedReparsePoints = 0;
    let lastProgressAt = 0;

    const addWarning = (warningPath, error) => {
        if (warnings.length >= MAX_WARNINGS) {
            return;
        }
        warnings.push({
            path: warningPath,
            message: error instanceof Error ? error.message : String(error),
            code: error?.code,
        });
    };

    const reportProgress = (currentDirectory, currentPath) => {
        const now = Date.now();
        if (now - lastProgressAt < 1000) {
            return;
        }
        lastProgressAt = now;
        onProgress({
            phase: "scanning",
            currentDirectory,
            currentPath,
            directoriesScanned,
            filesScanned,
            bytesScanned,
            cloudOnlyFilesScanned,
            cloudOnlyBytesScanned,
            warnings: warnings.length,
            skippedReparsePoints,
        });
    };

    const queue = [];
    for (const root of roots) {
        const rootPath = path.resolve(root.path);
        rootPaths.push(rootPath);
        nodes.set(
            normalizeWindowsPath(rootPath),
            createDirectoryNode(rootPath, root.label ?? path.basename(rootPath), undefined, root.id),
        );
        queue.push({ ...root, path: rootPath });
    }

    const processEntry = async (directory, entry) => {
        assertNotAborted(signal);
        const fullPath = path.join(directory.path, entry.name);
        let stats;
        try {
            stats = await lstat(fullPath);
        } catch (error) {
            addWarning(fullPath, error);
            return;
        }

        if (stats.isSymbolicLink()) {
            skippedReparsePoints += 1;
            return;
        }

        if (stats.isDirectory()) {
            const key = normalizeWindowsPath(fullPath);
            if (!nodes.has(key)) {
                nodes.set(
                    key,
                    createDirectoryNode(fullPath, entry.name, directory.path, directory.id),
                );
                nodes.get(normalizeWindowsPath(directory.path))?.children.push(fullPath);
                queue.push({ id: directory.id, label: entry.name, path: fullPath });
            }
            return;
        }

        if (!stats.isFile()) {
            return;
        }

        try {
            const cloudState = await cloudFileReader.read(fullPath);
            if (cloudState.cloudOnly) {
                const categorizer = findCategorizer(fullPath, categorizers);
                cloudOnlyFilesScanned += 1;
                cloudOnlyBytesScanned += stats.size;
                cloudOnlyFiles.push({
                    path: fullPath,
                    name: entry.name,
                    bytes: stats.size,
                    modifiedAt: stats.mtime.toISOString(),
                    app: classifyApp(fullPath, categorizer),
                    category: classifyCategory(fullPath, categorizer),
                });
                pruneLargest(cloudOnlyFiles, MAX_CLOUD_ONLY_FILES);
                reportProgress(directory.path, fullPath);
                return;
            }
        } catch (error) {
            addWarning(fullPath, `Could not determine OneDrive local availability: ${error.message}`);
        }

        const directoryNode = nodes.get(normalizeWindowsPath(directory.path));
        if (directoryNode) {
            directoryNode.ownBytes += stats.size;
            directoryNode.ownFiles += 1;
        }

        filesScanned += 1;
        bytesScanned += stats.size;
        const categorizer = findCategorizer(fullPath, categorizers);
        const analyzerProtection = protectionForPath(fullPath, categorizers, configuredAnalyzerManagedPaths);
        const app = classifyApp(fullPath, categorizer);
        const category = classifyCategory(fullPath, categorizer);
        const extension = path.extname(fullPath).toLowerCase() || "(none)";
        incrementAggregate(appTotals, app, stats.size);
        incrementAggregate(categoryTotals, category, stats.size);
        incrementAggregate(extensionTotals, extension, stats.size);

        largestFiles.push({
            path: fullPath,
            name: entry.name,
            bytes: stats.size,
            modifiedAt: stats.mtime.toISOString(),
            app,
            category,
        });
        pruneLargest(largestFiles, MAX_LARGEST_FILES);

        const candidate = cleanupCandidate(
            fullPath,
            stats,
            app,
            categorizer,
            analyzerProtection,
            protectAnalyzerManagedPaths,
        );
        if (candidate) {
            candidates.push(candidate);
            pruneLargest(candidates, MAX_CANDIDATES);
        }
        reportProgress(directory.path, fullPath);
    };

    const scanDirectory = async (directory) => {
        assertNotAborted(signal);
        let handle;
        try {
            handle = await opendir(directory.path);
            directoriesScanned += 1;
            reportProgress(directory.path, undefined);
            let batch = [];
            for await (const entry of handle) {
                batch.push(entry);
                if (batch.length >= ENTRY_BATCH_SIZE) {
                    await Promise.all(batch.map((item) => processEntry(directory, item)));
                    batch = [];
                }
            }
            if (batch.length > 0) {
                await Promise.all(batch.map((item) => processEntry(directory, item)));
            }
        } catch (error) {
            if (error?.code === "ABORT_ERR") {
                throw error;
            }
            addWarning(directory.path, error);
        } finally {
            await handle?.close().catch(() => {});
        }
    };

    try {
        while (queue.length > 0) {
            assertNotAborted(signal);
            const batch = queue.splice(0, DIRECTORY_CONCURRENCY);
            await Promise.all(batch.map(scanDirectory));
        }
    } finally {
        await cloudFileReader.close();
    }

    onProgress({
        phase: "aggregating",
        directoriesScanned,
        filesScanned,
        bytesScanned,
        warnings: warnings.length,
        skippedReparsePoints,
    });

    const trees = aggregateDirectories(
        nodes,
        rootPaths,
        categorizers,
        configuredAnalyzerManagedPaths,
        protectAnalyzerManagedPaths,
    );
    largestFiles.sort((left, right) => right.bytes - left.bytes);
    largestFiles.length = Math.min(largestFiles.length, MAX_LARGEST_FILES);
    cloudOnlyFiles.sort((left, right) => right.bytes - left.bytes);
    cloudOnlyFiles.length = Math.min(cloudOnlyFiles.length, MAX_CLOUD_ONLY_FILES);
    candidates.sort((left, right) => right.bytes - left.bytes);
    candidates.length = Math.min(candidates.length, MAX_CANDIDATES);

    const directoryDetails = [...nodes.values()]
        .map((node) => {
            const categorizer = findCategorizer(node.path, categorizers);
            const analyzerManagement = protectionForPath(node.path, categorizers, configuredAnalyzerManagedPaths);
            return {
                name: node.name,
                path: node.path,
                rootId: node.rootId,
                bytes: node.bytes,
                files: node.files,
                categorizer: categorizer?.name,
                protection: protectAnalyzerManagedPaths ? analyzerManagement : undefined,
                analyzerManagement,
            };
        });
    const analyzerManagedPaths = directoryDetails
        .filter((directory) => directory.analyzerManagement)
        .sort((left, right) => left.path.length - right.path.length)
        .filter((directory, index, items) => !items.slice(0, index).some((parent) => (
            parent.analyzerManagement.analyzerId === directory.analyzerManagement.analyzerId
            && isWithinPath(directory.path, parent.path)
        )))
        .map(({ path: directoryPath, analyzerManagement }) => ({ path: directoryPath, ...analyzerManagement }));
    const protectedPaths = protectAnalyzerManagedPaths ? analyzerManagedPaths : [];
    const directories = directoryDetails.sort((left, right) => right.bytes - left.bytes);

    const completedAt = new Date();
    return {
        generatedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        roots: roots.map((root) => ({
            ...root,
            bytes: nodes.get(normalizeWindowsPath(root.path))?.bytes ?? 0,
            files: nodes.get(normalizeWindowsPath(root.path))?.files ?? 0,
        })),
        summary: {
            bytes: bytesScanned,
            files: filesScanned,
            cloudOnlyBytes: cloudOnlyBytesScanned,
            cloudOnlyFiles: cloudOnlyFilesScanned,
            directories: directoriesScanned,
            warnings: warnings.length,
            skippedReparsePoints,
            reclaimableBytes: candidates.reduce((total, item) => total + item.bytes, 0),
            cleanupCandidates: candidates.length,
        },
        tree: {
            name: "Scanned storage",
            path: "",
            bytes: trees.reduce((total, tree) => total + tree.bytes, 0),
            files: trees.reduce((total, tree) => total + tree.files, 0),
            children: trees,
        },
        apps: summarizeMap(appTotals),
        categories: summarizeMap(categoryTotals),
        extensions: summarizeMap(extensionTotals).slice(0, 100),
        directories,
        largestFiles,
        cloudOnlyFiles,
        candidates,
        analyzerManagedPaths,
        protectedPaths,
        warnings,
    };
}

export function toPublicScanResult(result) {
    return {
        ...result,
        directories: result.directories.slice(0, MAX_DIRECTORY_ROWS),
    };
}
