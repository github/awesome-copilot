import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, utimes, access, rm, stat, symlink } from "node:fs/promises";
import { request } from "node:http";
import os from "node:os";
import path from "node:path";
import { BUILT_IN_CATEGORIZERS, CategorizerStore } from "../src/core/categorizers.mjs";
import {
    createAnalyzerCommandRunner,
    executeAnalyzerCommand,
    getAnalyzerCommands,
} from "../src/core/analyzer-commands.mjs";
import { createCleanupPreview, executeCleanupPreview } from "../src/core/cleanup.mjs";
import { listCustomAnalyzers } from "../src/analyzers/custom-analyzers.mjs";
import { inspectStorageItem } from "../src/core/item-inspector.mjs";
import {
    buildFolderExplanationPrompt,
    parseFolderExplanation,
    parseFolderExplanationCandidates,
} from "../src/core/folder-explanation.mjs";
import { scanStorage, toPublicScanResult } from "../src/core/scanner.mjs";
import { startCanvasServer } from "../src/api/server.mjs";
import { analyzeVsCodeInsiders } from "../src/analyzers/vscode-insiders.mjs";
import { analyzeNpmCache } from "../src/analyzers/npm-cache.mjs";
import { analyzeUvCache } from "../src/analyzers/uv-cache.mjs";
import { StorageService } from "../src/core/storage-service.mjs";
import { WINDOWS_ONLY_MESSAGE, assertWindowsPlatform, isWindowsPlatform } from "../src/core/platform.mjs";
import { renderHtml } from "../src/ui/renderer.mjs";
import { findTreeStackForPath, getParentPath } from "../src/ui/tree-navigation.mjs";

const root = await mkdtemp(path.join(os.tmpdir(), "storage-inspector-test-"));
const outsideRoot = await mkdtemp(path.join(os.tmpdir(), "storage-inspector-outside-"));
const stateRoot = await mkdtemp(path.join(os.tmpdir(), "storage-inspector-state-"));
const testKnownFolderPaths = [];

function createTestCleanupPreview(options) {
    return createCleanupPreview({ ...options, knownFolderPaths: testKnownFolderPaths });
}

function executeTestCleanupPreview(options) {
    return executeCleanupPreview({ ...options, knownFolderPaths: testKnownFolderPaths });
}

async function recycleTestFiles(paths, onResult) {
    const results = [];
    for (const [index, filePath] of paths.entries()) {
        await rm(filePath);
        const result = { path: filePath, success: true };
        results.push(result);
        onResult?.(result, index + 1);
    }
    return { results, interruption: undefined };
}

try {
    const navigationTree = {
        name: "Scanned storage",
        path: "",
        children: [
            {
                name: "Profile",
                path: "C:\\Users\\Example",
                children: [
                    {
                        name: "Cache",
                        path: "C:\\Users\\Example\\Cache",
                        children: [],
                    },
                ],
            },
            {
                name: "Other",
                path: "C:\\Users\\Example\\*",
                aggregate: true,
                children: [],
            },
        ],
    };
    assert.deepEqual(
        findTreeStackForPath(navigationTree, "c:/users/example/cache/large-file.bin").map((item) => item.path),
        ["", "C:\\Users\\Example", "C:\\Users\\Example\\Cache"],
    );
    assert.deepEqual(
        findTreeStackForPath(navigationTree, "C:\\Users\\ExampleOther\\file.bin").map((item) => item.path),
        [""],
    );
    assert.equal(getParentPath("C:\\Users\\Example\\Cache\\large-file.bin"), "C:\\Users\\Example\\Cache");
    assert.equal(getParentPath("C:\\large-file.bin"), "C:\\");
    assert.match(renderHtml("test-token"), /navigateTreemapToPath/);
    assert.match(renderHtml("test-token"), /path-navigation/);
    assert.equal(isWindowsPlatform("win32"), true);
    assert.equal(isWindowsPlatform("linux"), false);
    assert.throws(() => assertWindowsPlatform("linux"), (error) => (
        error.code === "windows_only" && error.message === WINDOWS_ONLY_MESSAGE
    ));
    const canvasServer = await startCanvasServer({
        subscribe: () => () => {},
        getState: () => ({ scan: { status: "idle" } }),
    }, async () => ({}), async () => ({}));
    try {
        assert.equal((await fetch(canvasServer.url)).status, 200);
        const canvasUrl = new URL(canvasServer.url);
        const spoofedHostStatus = await new Promise((resolve, reject) => {
            const spoofedRequest = request({
                hostname: "127.0.0.1",
                port: canvasUrl.port,
                path: `${canvasUrl.pathname}${canvasUrl.search}`,
                headers: { host: "attacker.example" },
            }, (response) => {
                response.resume();
                response.on("end", () => resolve(response.statusCode));
            });
            spoofedRequest.on("error", reject);
            spoofedRequest.end();
        });
        assert.equal(spoofedHostStatus, 403);
    } finally {
        await canvasServer.close();
    }
    const safetyService = new StorageService();
    assert.deepEqual(safetyService.getState().safety, {
        directCleanupEnabled: false,
        analyzerProtectionEnabled: true,
    });
    await assert.rejects(
        safetyService.previewCleanup({ source: "scan", itemIds: ["test"] }),
        { code: "cleanup_safety_disabled" },
    );
    await assert.rejects(
        safetyService.setCleanupSafety({ directCleanupEnabled: true }),
        { code: "cleanup_safety_acknowledgement_required" },
    );
    await safetyService.setCleanupSafety({ directCleanupEnabled: true, acknowledged: true });
    assert.equal(safetyService.getState().safety.directCleanupEnabled, true);
    await safetyService.setCleanupSafety({ directCleanupEnabled: false });
    const testCategorizerStore = {
        all: async () => [],
        list: async () => ({ builtIn: [], custom: [] }),
    };
    const scanConcurrencyService = new StorageService({
        categorizerStore: testCategorizerStore,
        discoverAnalyzerManagedPaths: async () => [],
        scanStorage: async ({ signal }) => new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => {
                const error = new Error("Storage scan cancelled");
                error.code = "ABORT_ERR";
                reject(error);
            }, { once: true });
        }),
    });
    assert.equal((await scanConcurrencyService.startScan({ scopes: ["profile"] })).scan.status, "running");
    await assert.rejects(
        scanConcurrencyService.startScan({ scopes: ["profile"] }),
        { code: "scan_already_running" },
    );
    scanConcurrencyService.cancelScan();
    assert.equal((await scanConcurrencyService.waitForScan()).scan.status, "cancelled");
    assert.deepEqual(
        listCustomAnalyzers().map((analyzer) => analyzer.id),
        ["vscode-insiders", "microsoft-scout", "docker-images", "npm-cache", "uv-cache"],
    );
    const dockerCommands = getAnalyzerCommands("docker-images");
    assert.deepEqual(
        dockerCommands.map((command) => command.id),
        ["docker-image-prune", "docker-image-prune-all", "docker-system-df"],
    );
    assert.equal(dockerCommands[0].requiresConfirmation, true);
    assert.equal(dockerCommands[2].requiresConfirmation, false);
    assert.equal("executable" in dockerCommands[0], false);
    const npmCommands = getAnalyzerCommands("npm-cache");
    assert.deepEqual(
        npmCommands.map((command) => command.id),
        ["npm-cache-verify", "npm-cache-clean"],
    );
    assert.equal(npmCommands[0].requiresConfirmation, false);
    assert.equal(npmCommands[1].requiresConfirmation, true);
    await assert.rejects(
        executeAnalyzerCommand("npm-cache", "npm-cache-clean", false),
        { code: "analyzer_command_confirmation_required" },
    );
    const uvCommands = getAnalyzerCommands("uv-cache");
    assert.deepEqual(
        uvCommands.map((command) => command.id),
        ["uv-cache-dir", "uv-cache-prune", "uv-cache-clean"],
    );
    assert.equal(uvCommands[0].requiresConfirmation, false);
    assert.equal(uvCommands[1].requiresConfirmation, true);
    await assert.rejects(
        executeAnalyzerCommand("uv-cache", "uv-cache-prune", false),
        { code: "analyzer_command_confirmation_required" },
    );
    await assert.rejects(
        executeAnalyzerCommand("docker-images", "docker-image-prune", false),
        { code: "analyzer_command_confirmation_required" },
    );
    let completeCommand;
    let executedCommand;
    const commandRunner = createAnalyzerCommandRunner({
        executeProcess: async (command) => new Promise((resolve) => {
            executedCommand = command;
            completeCommand = resolve;
        }),
    });
    const firstCommand = commandRunner.execute("npm-cache", "npm-cache-verify");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(commandRunner.getActiveCommand().commandId, "npm-cache-verify");
    assert.equal(executedCommand.executable, "cmd.exe");
    assert.deepEqual(executedCommand.arguments, ["/d", "/s", "/c", "npm.cmd cache verify"]);
    await assert.rejects(
        commandRunner.execute("uv-cache", "uv-cache-dir"),
        { code: "analyzer_command_running" },
    );
    completeCommand({ stdout: "Cache verified.", stderr: "" });
    assert.equal((await firstCommand).output, "Cache verified.");
    assert.equal(commandRunner.getActiveCommand(), undefined);

    let rejectCancellableCommand;
    let cancellationRequested = false;
    const cancellableRunner = createAnalyzerCommandRunner({
        executeProcess: () => ({
            promise: new Promise((resolve, reject) => {
                rejectCancellableCommand = reject;
            }),
            cancel: () => {
                cancellationRequested = true;
                rejectCancellableCommand(new Error("terminated"));
            },
        }),
    });
    const cancellableCommand = cancellableRunner.execute("npm-cache", "npm-cache-verify");
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(cancellableRunner.cancel(), {
        status: "cancelling",
        commandId: "npm-cache-verify",
    });
    assert.equal(cancellationRequested, true);
    await assert.rejects(cancellableCommand, { code: "analyzer_command_cancelled" });
    assert.equal(cancellableRunner.getActiveCommand(), undefined);

    const cacheDirectory = path.join(root, "AppData", "Local", "GitHub Copilot", "Cache");
    const regularDirectory = path.join(root, "Documents");
    await mkdir(cacheDirectory, { recursive: true });
    await mkdir(regularDirectory, { recursive: true });
    const cacheFile = path.join(cacheDirectory, "stale-cache.bin");
    const regularFile = path.join(regularDirectory, "keep.txt");
    const foundryCache = path.join(root, "AppData", "Local", "Foundry", "models");
    const foundryModel = path.join(foundryCache, "model.onnx");
    await writeFile(cacheFile, Buffer.alloc(4096, 1));
    await writeFile(regularFile, "keep");
    await mkdir(foundryCache, { recursive: true });
    await writeFile(foundryModel, Buffer.alloc(2048, 1));
    const oldDate = new Date(Date.now() - 30 * 86_400_000);
    await utimes(cacheFile, oldDate, oldDate);

    const result = await scanStorage({
        roots: [{ id: "test", label: "Test root", path: root }],
        categorizers: BUILT_IN_CATEGORIZERS,
    });
    assert.equal(result.summary.files, 3);
    assert.equal(result.summary.bytes, 6148);
    assert.equal(result.summary.cloudOnlyBytes, 0);
    assert.equal(result.summary.cloudOnlyFiles, 0);
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].app, "GitHub Copilot");
    assert.equal(toPublicScanResult({ ...result, directories: Array.from({ length: 1001 }, (_, index) => ({ index })) }).directories.length, 1000);

    const serviceCleanupFile = path.join(root, "Temporary", "service-cleanup.bin");
    await mkdir(path.dirname(serviceCleanupFile), { recursive: true });
    await writeFile(serviceCleanupFile, Buffer.alloc(80, 1));
    const serviceCleanupStats = await stat(serviceCleanupFile);
    const serviceCleanupCandidate = {
        id: "service-cleanup",
        path: serviceCleanupFile,
        bytes: serviceCleanupStats.size,
        modifiedAt: serviceCleanupStats.mtime.toISOString(),
        entryType: "file",
        reason: "Test service cleanup",
        risk: "low",
    };
    const serviceScanResult = {
        ...result,
        generatedAt: new Date().toISOString(),
        roots: [{ id: "test", label: "Test root", path: root }],
        candidates: [serviceCleanupCandidate],
        analyzerManagedPaths: [],
    };
    let completeServicePreview;
    const previewConcurrencyService = new StorageService({
        categorizerStore: testCategorizerStore,
        discoverAnalyzerManagedPaths: async () => [],
        scanStorage: async () => serviceScanResult,
        createCleanupPreview: async (options) => new Promise((resolve) => {
            completeServicePreview = () => resolve({
                id: "preview-concurrency",
                source: options.source,
                selectedIds: [serviceCleanupCandidate.id],
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
                entries: [serviceCleanupCandidate],
                rejected: [],
                totalBytes: serviceCleanupCandidate.bytes,
                approvedRoots: options.approvedRoots,
                analyzerProtectedPaths: options.analyzerProtectedPaths,
            });
        }),
    });
    await previewConcurrencyService.startScan({ scopes: ["profile"] });
    await previewConcurrencyService.waitForScan();
    await previewConcurrencyService.setCleanupSafety({ directCleanupEnabled: true, acknowledged: true });
    const pendingServicePreview = previewConcurrencyService.previewCleanup({
        source: "scan",
        itemIds: [serviceCleanupCandidate.id],
    });
    await new Promise((resolve) => setImmediate(resolve));
    await assert.rejects(
        previewConcurrencyService.startScan({ scopes: ["profile"] }),
        { code: "cleanup_in_progress" },
    );
    completeServicePreview();
    await pendingServicePreview;

    let completeServiceCleanup;
    const cleanupConcurrencyService = new StorageService({
        categorizerStore: testCategorizerStore,
        createCleanupPreview: createTestCleanupPreview,
        discoverAnalyzerManagedPaths: async () => [],
        scanStorage: async () => serviceScanResult,
        executeCleanupPreview: async () => new Promise((resolve) => {
            completeServiceCleanup = resolve;
        }),
    });
    await cleanupConcurrencyService.startScan({ scopes: ["profile"] });
    await cleanupConcurrencyService.waitForScan();
    await cleanupConcurrencyService.setCleanupSafety({ directCleanupEnabled: true, acknowledged: true });
    const servicePreview = await cleanupConcurrencyService.previewCleanup({
        source: "scan",
        itemIds: [serviceCleanupCandidate.id],
    });
    const firstCleanupExecution = cleanupConcurrencyService.executeCleanup(servicePreview.id, true);
    await new Promise((resolve) => setImmediate(resolve));
    await assert.rejects(
        cleanupConcurrencyService.executeCleanup(servicePreview.id, true),
        { code: "cleanup_already_running" },
    );
    await assert.rejects(
        cleanupConcurrencyService.startScan({ scopes: ["profile"] }),
        { code: "cleanup_in_progress" },
    );
    completeServiceCleanup({ succeeded: [], failed: [], reclaimedBytes: 0 });
    await firstCleanupExecution;
    await cleanupConcurrencyService.waitForScan();

    const staleServicePreview = await cleanupConcurrencyService.previewCleanup({
        source: "scan",
        itemIds: [serviceCleanupCandidate.id],
    });
    await cleanupConcurrencyService.setCleanupSafety({ analyzerProtectionEnabled: false });
    await assert.rejects(
        cleanupConcurrencyService.executeCleanup(staleServicePreview.id, true),
        { code: "cleanup_preview_unknown" },
    );

    let refreshScanCount = 0;
    const refreshFailureService = new StorageService({
        categorizerStore: testCategorizerStore,
        createCleanupPreview: createTestCleanupPreview,
        discoverAnalyzerManagedPaths: async () => [],
        scanStorage: async () => {
            refreshScanCount += 1;
            if (refreshScanCount > 1) {
                throw new Error("Test refresh failure");
            }
            return serviceScanResult;
        },
        executeCleanupPreview: async () => ({ succeeded: [], failed: [], unknown: [], reclaimedBytes: 0 }),
    });
    await refreshFailureService.startScan({ scopes: ["profile"] });
    await refreshFailureService.waitForScan();
    await refreshFailureService.setCleanupSafety({ directCleanupEnabled: true, acknowledged: true });
    const refreshFailurePreview = await refreshFailureService.previewCleanup({
        source: "scan",
        itemIds: [serviceCleanupCandidate.id],
    });
    const refreshFailureCleanup = await refreshFailureService.executeCleanup(refreshFailurePreview.id, true);
    assert.equal(refreshFailureCleanup.rescanStarted, true);
    await refreshFailureService.waitForScan();
    assert.equal(refreshFailureService.getState().scan.status, "failed");
    assert.equal(refreshFailureService.getState().cleanup.status, "completed");

    const cleanupFileStats = await stat(serviceCleanupFile);
    const cleanupCandidate = {
        ...serviceCleanupCandidate,
        bytes: cleanupFileStats.size,
        modifiedAt: cleanupFileStats.mtime.toISOString(),
    };
    const preview = await createTestCleanupPreview({
        itemIds: [cleanupCandidate.id],
        candidates: [cleanupCandidate],
        source: { type: "scan" },
        approvedRoots: [{ id: "test", label: "Test root", path: root }],
    });
    assert.equal(preview.entries.length, 1);
    const cleanupProgress = [];
    const cleanup = await executeTestCleanupPreview({
        preview,
        confirmed: true,
        onProgress: (progress) => cleanupProgress.push(progress),
        recycleBin: recycleTestFiles,
        revalidateEntry: async (entry) => entry,
    });
    assert.equal(cleanup.succeeded.length, 1);
    assert.ok(cleanupProgress.some((progress) => progress.phase === "validating"));
    assert.ok(cleanupProgress.some((progress) => progress.phase === "recycling" && progress.completed === 1));
    await assert.rejects(access(serviceCleanupFile));
    await access(regularFile);

    const partialFirstFile = path.join(cacheDirectory, "partial-first.bin");
    const partialSecondFile = path.join(cacheDirectory, "partial-second.bin");
    await writeFile(partialFirstFile, Buffer.alloc(32, 1));
    await writeFile(partialSecondFile, Buffer.alloc(48, 1));
    const partialCandidates = await Promise.all([
        ["partial-first", partialFirstFile],
        ["partial-second", partialSecondFile],
    ].map(async ([id, filePath]) => {
        const fileStats = await stat(filePath);
        return {
            id,
            path: filePath,
            bytes: fileStats.size,
            modifiedAt: fileStats.mtime.toISOString(),
            entryType: "file",
            cleanupEligible: true,
            reason: "Test partial cleanup",
            risk: "low",
        };
    }));
    const partialPreview = await createTestCleanupPreview({
        itemIds: partialCandidates.map((candidate) => candidate.id),
        candidates: partialCandidates,
        source: { type: "scan" },
        approvedRoots: [{ id: "test", label: "Test root", path: root }],
    });
    const partialCleanup = await executeTestCleanupPreview({
        preview: partialPreview,
        confirmed: true,
        recycleBin: async (paths, onResult) => {
            const succeeded = { path: paths[0], success: true };
            onResult(succeeded, 1);
            return {
                results: [succeeded],
                interruption: { code: "cleanup_timeout", message: "Recycle Bin operation timed out" },
            };
        },
        revalidateEntry: async (entry) => entry,
    });
    assert.deepEqual(partialCleanup.succeeded.map((item) => item.path), [partialPreview.entries[0].path]);
    assert.equal(partialCleanup.failed.length, 0);
    assert.deepEqual(partialCleanup.unknown.map((item) => item.path), [partialPreview.entries[1].path]);
    assert.equal(partialCleanup.reclaimedBytes, 32);

    const originalUserProfile = process.env.USERPROFILE;
    try {
        process.env.USERPROFILE = root;
        const protectedFileStats = await stat(regularFile);
        const allowedCleanupFile = path.join(root, "Temporary", "cleanup.bin");
        await mkdir(path.dirname(allowedCleanupFile), { recursive: true });
        await writeFile(allowedCleanupFile, Buffer.alloc(64, 1));
        const allowedCleanupFileStats = await stat(allowedCleanupFile);
        const protectedLocationPreview = await createTestCleanupPreview({
            itemIds: ["protected-documents-file", "allowed-cleanup-file"],
            candidates: [{
                id: "protected-documents-file",
                path: regularFile,
                bytes: protectedFileStats.size,
                modifiedAt: protectedFileStats.mtime.toISOString(),
                entryType: "file",
                cleanupEligible: true,
                reason: "Test protected file",
                risk: "low",
            }, {
                id: "allowed-cleanup-file",
                path: allowedCleanupFile,
                bytes: allowedCleanupFileStats.size,
                modifiedAt: allowedCleanupFileStats.mtime.toISOString(),
                entryType: "file",
                cleanupEligible: true,
                reason: "Test allowed file",
                risk: "low",
            }],
            source: { type: "scan" },
            approvedRoots: [{ id: "test", label: "Test root", path: root }],
        });
        assert.equal(protectedLocationPreview.entries.length, 1);
        assert.equal(protectedLocationPreview.rejected[0].code, "cleanup_path_protected");
        assert.match(protectedLocationPreview.rejected[0].message, /protected location/);
    } finally {
        if (originalUserProfile === undefined) {
            delete process.env.USERPROFILE;
        } else {
            process.env.USERPROFILE = originalUserProfile;
        }
    }

    const dockerRoot = path.join(root, "AppData", "Local", "Docker", "wsl");
    const dockerData = path.join(dockerRoot, "docker-data.bin");
    await mkdir(dockerRoot, { recursive: true });
    await writeFile(dockerData, Buffer.alloc(1024, 1));
    const npmCacheRoot = path.join(root, "AppData", "Local", "npm-cache", "_cacache");
    const npmCacheData = path.join(npmCacheRoot, "content.bin");
    await mkdir(npmCacheRoot, { recursive: true });
    await writeFile(npmCacheData, Buffer.alloc(512, 1));
    const uvCacheRoot = path.join(root, "AppData", "Local", "uv", "cache");
    const uvCacheData = path.join(uvCacheRoot, "wheels.bin");
    await mkdir(uvCacheRoot, { recursive: true });
    await writeFile(uvCacheData, Buffer.alloc(256, 1));
    await utimes(uvCacheData, oldDate, oldDate);

    const analyzerDirectory = path.join(root, "AnalyzerCache");
    await mkdir(analyzerDirectory);
    await writeFile(path.join(analyzerDirectory, "cache.bin"), Buffer.alloc(128, 1));
    const analyzerStats = await stat(analyzerDirectory);
    const analyzerPreview = await createTestCleanupPreview({
        itemIds: ["analyzer-cache"],
        candidates: [{
            id: "analyzer-cache",
            path: analyzerDirectory,
            bytes: 128,
            modifiedAt: analyzerStats.mtime.toISOString(),
            entryType: "directory",
            cleanupEligible: true,
            reason: "Test cache",
            risk: "low",
        }],
        source: { type: "analyzer", analyzerId: "test-analyzer" },
        approvedRoots: [{ id: "test", label: "Test root", path: root }],
    });
    assert.equal(analyzerPreview.source.type, "analyzer");
    assert.equal(analyzerPreview.entries[0].entryType, "directory");
    assert.equal(analyzerPreview.totalBytes, 128);

    const mutableDirectory = path.join(root, "MutableAnalyzerCache");
    const mutableFile = path.join(mutableDirectory, "nested", "cache.bin");
    await mkdir(path.dirname(mutableFile), { recursive: true });
    await writeFile(mutableFile, Buffer.alloc(32, 1));
    const mutableDirectoryStats = await stat(mutableDirectory);
    const mutablePreview = await createTestCleanupPreview({
        itemIds: ["mutable-directory"],
        candidates: [{
            id: "mutable-directory",
            path: mutableDirectory,
            bytes: 32,
            modifiedAt: mutableDirectoryStats.mtime.toISOString(),
            entryType: "directory",
            cleanupEligible: true,
            reason: "Test mutable directory",
            risk: "low",
        }],
        source: { type: "analyzer", analyzerId: "test-analyzer" },
        approvedRoots: [{ id: "test", label: "Test root", path: root }],
    });
    await writeFile(mutableFile, Buffer.alloc(32, 2));
    await utimes(mutableDirectory, mutableDirectoryStats.atime, mutableDirectoryStats.mtime);
    const mutableCleanup = await executeTestCleanupPreview({ preview: mutablePreview, confirmed: true });
    assert.equal(mutableCleanup.succeeded.length, 0);
    assert.equal(mutableCleanup.failed[0].code, "cleanup_candidate_changed");
    await access(mutableDirectory);

    const outsideFile = path.join(outsideRoot, "outside-cache.bin");
    await writeFile(outsideFile, Buffer.alloc(16, 1));
    const junctionPath = path.join(root, "junction");
    await symlink(outsideRoot, junctionPath, "junction");
    const escapedPath = path.join(junctionPath, path.basename(outsideFile));
    const outsideStats = await stat(outsideFile);
    await assert.rejects(
        createTestCleanupPreview({
            itemIds: ["junction-escape"],
            candidates: [{
                id: "junction-escape",
                path: escapedPath,
                bytes: outsideStats.size,
                modifiedAt: outsideStats.mtime.toISOString(),
                entryType: "file",
                cleanupEligible: true,
                reason: "Test junction escape",
                risk: "low",
            }],
            source: { type: "scan" },
            approvedRoots: [{ id: "test", label: "Test root", path: root }],
        }),
        { code: "cleanup_no_valid_candidates" },
    );
    await assert.rejects(
        inspectStorageItem({
            targetPath: escapedPath,
            roots: [{ id: "test", label: "Test root", path: root }],
            result,
            categorizers: [],
        }),
        { code: "inspection_path_not_allowed" },
    );

    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
        scanStorage({
            roots: [{ id: "test", label: "Test root", path: root }],
            signal: controller.signal,
        }),
        { code: "ABORT_ERR" },
    );

    const vscodeAnalysis = await analyzeVsCodeInsiders(result);
    assert.ok(["not-found", "not-running", "running", "unsupported"].includes(vscodeAnalysis.status));
    const npmAnalysis = await analyzeNpmCache(result);
    assert.ok(["available", "not-found"].includes(npmAnalysis.status));
    assert.equal(npmAnalysis.cleanupItems.length, 0);
    const uvAnalysis = await analyzeUvCache(result);
    assert.ok(["available", "not-found"].includes(uvAnalysis.status));
    assert.equal(uvAnalysis.cleanupItems.length, 0);

    const categorizerStore = new CategorizerStore({
        storagePath: path.join(stateRoot, "categorizers.json"),
    });
    const categorizer = await categorizerStore.add({
        path: foundryCache,
        name: "Microsoft Foundry Local",
        category: "AI model cache",
        description: "Downloaded local models",
        approvedRoots: [{ path: root }],
    });
    assert.equal(categorizer.name, "Microsoft Foundry Local");
    const longCategorizerPath = path.join(root, "x".repeat(130));
    await mkdir(longCategorizerPath);
    const longPathCategorizer = await categorizerStore.add({
        path: longCategorizerPath,
        name: "Long path application",
        category: "Application data",
        approvedRoots: [{ path: root }],
    });
    assert.equal(longPathCategorizer.path, longCategorizerPath.toLowerCase());
    await categorizerStore.remove(longPathCategorizer.id);
    const persistedStore = new CategorizerStore({
        storagePath: path.join(stateRoot, "categorizers.json"),
    });
    assert.equal((await persistedStore.list()).custom.length, 1);
    assert.ok((await persistedStore.list()).builtIn.some((rule) => rule.name === "Docker Desktop"));
    assert.ok((await persistedStore.list()).builtIn.some((rule) => rule.name === "npm"));
    assert.ok((await persistedStore.list()).builtIn.some((rule) => rule.name === "uv"));

    const categorizedResult = await scanStorage({
        roots: [{ id: "test", label: "Test root", path: root }],
        categorizers: await persistedStore.all(),
    });
    assert.ok(categorizedResult.apps.some((item) => item.name === "Microsoft Foundry Local" && item.bytes === 2048));
    assert.ok(categorizedResult.apps.some((item) => item.name === "Docker Desktop" && item.bytes === 1024));
    assert.ok(categorizedResult.apps.some((item) => item.name === "npm" && item.bytes === 512));
    assert.ok(categorizedResult.apps.some((item) => item.name === "uv" && item.bytes === 256));
    assert.ok(!categorizedResult.candidates.some((item) => item.path.startsWith(path.join(root, "AppData", "Local", "uv"))));
    assert.ok(categorizedResult.categories.some((item) => item.name === "AI model cache" && item.bytes === 2048));
    assert.ok(categorizedResult.categories.some((item) => item.name === "Package manager cache" && item.bytes === 512));
    assert.ok(categorizedResult.categories.some((item) => item.name === "Python package manager data" && item.bytes === 256));
    const uvProtection = categorizedResult.protectedPaths.find((item) => item.analyzerId === "uv-cache");
    assert.ok(uvProtection);
    assert.ok(categorizedResult.analyzerManagedPaths.some((item) => item.analyzerId === "uv-cache"));
    const protectedCacheStats = await stat(uvCacheData);
    const unprotectedCache = path.join(root, "Temporary", "cache.bin");
    await mkdir(path.dirname(unprotectedCache), { recursive: true });
    await writeFile(unprotectedCache, Buffer.alloc(64, 1));
    const unprotectedCacheStats = await stat(unprotectedCache);
    const protectedPreview = await createTestCleanupPreview({
        itemIds: ["uv-managed-cache", "unprotected-cache"],
        candidates: [
            {
                id: "uv-managed-cache",
                path: uvCacheData,
                bytes: protectedCacheStats.size,
                modifiedAt: protectedCacheStats.mtime.toISOString(),
                entryType: "file",
                cleanupEligible: true,
                reason: "Test managed cache",
                risk: "low",
            },
            {
                id: "unprotected-cache",
                path: unprotectedCache,
                bytes: unprotectedCacheStats.size,
                modifiedAt: unprotectedCacheStats.mtime.toISOString(),
                entryType: "file",
                cleanupEligible: true,
                reason: "Test unprotected cache",
                risk: "low",
            },
        ],
        source: { type: "scan" },
        approvedRoots: [{ id: "test", label: "Test root", path: root }],
        analyzerProtectedPaths: categorizedResult.protectedPaths,
    });
    assert.equal(protectedPreview.entries.length, 1);
    assert.equal(protectedPreview.rejected[0].code, "cleanup_path_analyzer_managed");
    const analyzerProtectionDisabledResult = await scanStorage({
        roots: [{ id: "test", label: "Test root", path: root }],
        categorizers: await persistedStore.all(),
        protectAnalyzerManagedPaths: false,
    });
    assert.equal(analyzerProtectionDisabledResult.protectedPaths.length, 0);
    assert.ok(analyzerProtectionDisabledResult.candidates.some((item) => item.path === uvCacheData));
    const configuredCacheRoot = path.join(root, "Configured", "cache");
    const configuredCacheFile = path.join(configuredCacheRoot, "managed.bin");
    await mkdir(configuredCacheRoot, { recursive: true });
    await writeFile(configuredCacheFile, Buffer.alloc(96, 1));
    await utimes(configuredCacheFile, oldDate, oldDate);
    const dynamicallyProtectedResult = await scanStorage({
        roots: [{ id: "test", label: "Test root", path: root }],
        analyzerManagedPaths: [{
            path: configuredCacheRoot,
            analyzerId: "npm-cache",
            name: "npm cache",
            description: "Test configured cache",
        }],
    });
    assert.ok(!dynamicallyProtectedResult.candidates.some((item) => item.path === configuredCacheFile));
    assert.ok(dynamicallyProtectedResult.analyzerManagedPaths.some((item) => item.path === configuredCacheRoot));

    const ordinaryCodeCache = path.join(root, "code", "project", "cache");
    const ordinaryCodeFile = path.join(ordinaryCodeCache, "build.bin");
    await mkdir(ordinaryCodeCache, { recursive: true });
    await writeFile(ordinaryCodeFile, Buffer.alloc(48, 1));
    await utimes(ordinaryCodeFile, oldDate, oldDate);
    const ordinaryCodeResult = await scanStorage({
        roots: [{ id: "test", label: "Test root", path: root }],
    });
    assert.ok(ordinaryCodeResult.apps.some((item) => item.name === "Other" && item.bytes >= 48));
    assert.ok(!ordinaryCodeResult.candidates.some((item) => item.path === ordinaryCodeFile));
    const inspection = await inspectStorageItem({
        targetPath: foundryCache,
        roots: categorizedResult.roots,
        result: categorizedResult,
        categorizers: await persistedStore.all(),
    });
    assert.equal(inspection.categorizer.name, "Microsoft Foundry Local");
    assert.equal(inspection.directContents.samples[0].name, "model.onnx");
    const explanationPrompt = buildFolderExplanationPrompt(inspection);
    assert.match(explanationPrompt, /Return ONLY one JSON object/);
    assert.match(explanationPrompt, /application, service, package manager/);
    assert.match(explanationPrompt, /bestPractices/);
    assert.match(explanationPrompt, /"recommendation": "safe \| conditional \| not-recommended \| unknown"/);
    const explanation = parseFolderExplanation(`\`\`\`json
{
  "version": 1,
  "title": "Model cache",
  "application": "Microsoft Foundry Local",
  "summary": "Downloaded model files.",
  "contents": [{ "name": "Models", "description": "Reusable model artifacts." }],
  "typicalUses": ["Offline inference"],
  "bestPractices": ["Use the product's model management commands."],
  "cleanup": {
    "recommendation": "conditional",
    "summary": "Remove only models that are no longer needed.",
    "risk": "Models must be downloaded again.",
    "impact": "Offline inference is unavailable until restoration.",
    "commands": [{
      "label": "List cache",
      "command": "example cache list",
      "shell": "PowerShell",
      "description": "Lists cached items.",
      "requiresElevation": false
    }],
    "steps": ["Review cached models."],
    "warnings": ["Do not remove active models."]
  },
  "sources": [{ "title": "Example docs", "url": "https://example.com/docs" }]
}
\`\`\``);
    assert.equal(explanation.cleanup.recommendation, "conditional");
    assert.equal(explanation.application, "Microsoft Foundry Local");
    assert.deepEqual(explanation.bestPractices, ["Use the product's model management commands."]);
    assert.equal(explanation.cleanup.commands[0].command, "example cache list");
    assert.equal(explanation.sources[0].url, "https://example.com/docs");
    assert.equal(
        parseFolderExplanationCandidates([
            "Copilot is still researching.",
            JSON.stringify(explanation),
        ]).title,
        "Model cache",
    );
    assert.throws(
        () => parseFolderExplanation('{"version":1,"title":"Bad"}'),
        { code: "folder_explanation_invalid" },
    );

    await persistedStore.remove(categorizer.id);
    assert.equal((await persistedStore.list()).custom.length, 0);
} finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
    await rm(stateRoot, { recursive: true, force: true });
}
