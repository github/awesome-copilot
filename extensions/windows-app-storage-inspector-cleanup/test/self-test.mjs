import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, utimes, access, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CategorizerStore } from "../src/core/categorizers.mjs";
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
import { scanStorage } from "../src/core/scanner.mjs";
import { analyzeVsCodeInsiders } from "../src/analyzers/vscode-insiders.mjs";
import { analyzeNpmCache } from "../src/analyzers/npm-cache.mjs";
import { analyzeUvCache } from "../src/analyzers/uv-cache.mjs";
import { StorageService } from "../src/core/storage-service.mjs";
import { WINDOWS_ONLY_MESSAGE, assertWindowsPlatform, isWindowsPlatform } from "../src/core/platform.mjs";

const root = await mkdtemp(path.join(os.tmpdir(), "storage-inspector-test-"));
const stateRoot = await mkdtemp(path.join(os.tmpdir(), "storage-inspector-state-"));
try {
    assert.equal(isWindowsPlatform("win32"), true);
    assert.equal(isWindowsPlatform("linux"), false);
    assert.throws(() => assertWindowsPlatform("linux"), (error) => (
        error.code === "windows_only" && error.message === WINDOWS_ONLY_MESSAGE
    ));
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
    });
    assert.equal(result.summary.files, 3);
    assert.equal(result.summary.bytes, 6148);
    assert.equal(result.summary.cloudOnlyBytes, 0);
    assert.equal(result.summary.cloudOnlyFiles, 0);
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].app, "GitHub Copilot");

    const preview = await createCleanupPreview({
        itemIds: [result.candidates[0].id],
        candidates: result.candidates,
        source: { type: "scan" },
        approvedRoots: [{ id: "test", label: "Test root", path: root }],
    });
    assert.equal(preview.entries.length, 1);
    const cleanupProgress = [];
    const cleanup = await executeCleanupPreview({
        preview,
        confirmed: true,
        onProgress: (progress) => cleanupProgress.push(progress),
    });
    assert.equal(cleanup.succeeded.length, 1);
    assert.ok(cleanupProgress.some((progress) => progress.phase === "validating"));
    assert.ok(cleanupProgress.some((progress) => progress.phase === "recycling" && progress.completed === 1));
    await assert.rejects(access(cacheFile));
    await access(regularFile);

    const originalUserProfile = process.env.USERPROFILE;
    try {
        process.env.USERPROFILE = root;
        const protectedFileStats = await stat(regularFile);
        const allowedCleanupFile = path.join(root, "Temporary", "cleanup.bin");
        await mkdir(path.dirname(allowedCleanupFile), { recursive: true });
        await writeFile(allowedCleanupFile, Buffer.alloc(64, 1));
        const allowedCleanupFileStats = await stat(allowedCleanupFile);
        const protectedLocationPreview = await createCleanupPreview({
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
    const analyzerPreview = await createCleanupPreview({
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
    const protectedPreview = await createCleanupPreview({
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
    await rm(stateRoot, { recursive: true, force: true });
}
