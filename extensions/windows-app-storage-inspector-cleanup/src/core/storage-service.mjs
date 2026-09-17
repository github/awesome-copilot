import { EventEmitter } from "node:events";
import { CategorizerStore } from "./categorizers.mjs";
import {
    createCleanupPreview,
    executeCleanupPreview,
} from "./cleanup.mjs";
import {
    discoverAnalyzerManagedPaths,
    listCustomAnalyzers,
    runCustomAnalyzer,
} from "../analyzers/custom-analyzers.mjs";
import { cancelAnalyzerCommand, executeAnalyzerCommand } from "./analyzer-commands.mjs";
import { inspectStorageItem } from "./item-inspector.mjs";
import { getDefaultRoots, scanStorage, toPublicScanResult } from "./scanner.mjs";
import { assertWindowsPlatform } from "./platform.mjs";

function serviceError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function analyzerCleanupItems(analysis) {
    if (analysis.id === "vscode-insiders") {
        return analysis.folders ?? [];
    }
    return analysis.cleanupItems ?? [];
}

export class StorageService {
    #events = new EventEmitter();
    #controller;
    #categorizerStore;
    #createCleanupPreview;
    #discoverAnalyzerManagedPaths;
    #executeCleanupPreview;
    #activeCleanupOperation;
    #previews = new Map();
    #runPromise;
    #scanStorage;

    constructor({
        categorizerStore = new CategorizerStore(),
        createCleanupPreview: createCleanupPreviewImplementation = createCleanupPreview,
        discoverAnalyzerManagedPaths: discoverAnalyzerManagedPathsImplementation = discoverAnalyzerManagedPaths,
        executeCleanupPreview: executeCleanupPreviewImplementation = executeCleanupPreview,
        scanStorage: scanStorageImplementation = scanStorage,
    } = {}) {
        assertWindowsPlatform();
        this.#categorizerStore = categorizerStore;
        this.#createCleanupPreview = createCleanupPreviewImplementation;
        this.#discoverAnalyzerManagedPaths = discoverAnalyzerManagedPathsImplementation;
        this.#executeCleanupPreview = executeCleanupPreviewImplementation;
        this.#scanStorage = scanStorageImplementation;
        this.scan = {
            status: "idle",
            scopes: ["profile", "programData"],
            progress: undefined,
            startedAt: undefined,
            completedAt: undefined,
            error: undefined,
        };
        this.result = undefined;
        this.customAnalyses = {};
        this.lastCleanup = undefined;
        this.cleanup = { status: "idle" };
        this.categorizers = undefined;
        this.safety = {
            directCleanupEnabled: false,
            analyzerProtectionEnabled: true,
        };
    }

    subscribe(listener) {
        this.#events.on("change", listener);
        return () => this.#events.off("change", listener);
    }

    #emit() {
        this.#events.emit("change", this.getState());
    }

    getState() {
        return {
            scan: this.scan,
            hasResults: Boolean(this.result),
            resultSummary: this.result?.summary,
            generatedAt: this.result?.generatedAt,
            lastCleanup: this.lastCleanup,
            cleanup: this.cleanup,
            safety: this.safety,
            customAnalyses: this.customAnalyses,
            categorizers: this.categorizers,
        };
    }

    getResults() {
        if (!this.result) {
            throw serviceError("scan_results_unavailable", "Run a scan before requesting results");
        }
        return toPublicScanResult(this.result);
    }

    listCustomAnalyzers() {
        return listCustomAnalyzers();
    }

    async analyzeCustomAnalyzer(id) {
        if (!this.result) {
            throw serviceError("scan_results_unavailable", "Run a scan before using a custom analyzer");
        }
        const analysis = await runCustomAnalyzer(id, this.result);
        this.customAnalyses = { ...this.customAnalyses, [id]: analysis };
        this.#emit();
        return analysis;
    }

    async executeAnalyzerCommand(analyzerId, commandId, confirmed) {
        if (!this.result) {
            throw serviceError("scan_results_unavailable", "Run a scan before running an analyzer command");
        }
        return executeAnalyzerCommand(analyzerId, commandId, confirmed);
    }

    cancelAnalyzerCommand() {
        return cancelAnalyzerCommand();
    }

    async setCleanupSafety(input = {}) {
        const hasDirectCleanupSetting = typeof input.directCleanupEnabled === "boolean";
        const hasAnalyzerProtectionSetting = typeof input.analyzerProtectionEnabled === "boolean";
        if (!hasDirectCleanupSetting && !hasAnalyzerProtectionSetting) {
            throw serviceError("cleanup_safety_input_invalid", "Select a cleanup safety setting to update");
        }
        if (this.scan.status === "running") {
            throw serviceError("cleanup_safety_scan_running", "Wait for the current scan to finish before changing cleanup safety");
        }
        if (input.directCleanupEnabled === true && input.acknowledged !== true) {
            throw serviceError(
                "cleanup_safety_acknowledgement_required",
                "Acknowledge the direct cleanup risk before enabling file removal",
            );
        }

        const nextSafety = {
            directCleanupEnabled: hasDirectCleanupSetting
                ? input.directCleanupEnabled
                : this.safety.directCleanupEnabled,
            analyzerProtectionEnabled: hasAnalyzerProtectionSetting
                ? input.analyzerProtectionEnabled
                : this.safety.analyzerProtectionEnabled,
        };
        const analyzerProtectionChanged = nextSafety.analyzerProtectionEnabled !== this.safety.analyzerProtectionEnabled;
        this.safety = nextSafety;
        if (!nextSafety.directCleanupEnabled || analyzerProtectionChanged) {
            this.#previews.clear();
            this.cleanup = { status: "idle" };
        }

        if (analyzerProtectionChanged && this.result) {
            await this.startScan({ scopes: this.scan.scopes });
            return { safety: this.safety, rescanStarted: true };
        }

        this.#emit();
        return { safety: this.safety, rescanStarted: false };
    }

    async listCategorizers() {
        this.categorizers = await this.#categorizerStore.list();
        this.#emit();
        return this.categorizers;
    }

    async addCategorizer(input) {
        if (this.scan.status === "running") {
            throw serviceError("scan_already_running", "Wait for the current scan to finish before changing categorizers");
        }
        const roots = getDefaultRoots(this.scan.scopes);
        const categorizer = await this.#categorizerStore.add({ ...input, approvedRoots: roots });
        await this.listCategorizers();
        await this.startScan({ scopes: this.scan.scopes });
        return { categorizer, rescanStarted: true };
    }

    async removeCategorizer(id) {
        if (this.scan.status === "running") {
            throw serviceError("scan_already_running", "Wait for the current scan to finish before changing categorizers");
        }
        const categorizer = await this.#categorizerStore.remove(id);
        await this.listCategorizers();
        await this.startScan({ scopes: this.scan.scopes });
        return { categorizer, rescanStarted: true };
    }

    async inspectStorageItem(targetPath) {
        if (!this.result) {
            throw serviceError("scan_results_unavailable", "Run a scan before investigating a storage item");
        }
        const categorizers = await this.#categorizerStore.all();
        return inspectStorageItem({
            targetPath,
            roots: this.result.roots,
            result: this.result,
            categorizers,
        });
    }

    async startScan(options = {}) {
        return this.#startScan(options);
    }

    async #startScan({ scopes = ["profile", "programData"] } = {}, cleanupOperation, preserveCleanup = false) {
        if (this.scan.status === "running") {
            throw serviceError("scan_already_running", "A storage scan is already running");
        }
        if (this.#activeCleanupOperation && this.#activeCleanupOperation !== cleanupOperation) {
            throw serviceError("cleanup_in_progress", "Wait for the active cleanup operation to finish before scanning");
        }

        const uniqueScopes = [...new Set(scopes)];
        const invalidScope = uniqueScopes.find((scope) => !["profile", "programData"].includes(scope));
        if (invalidScope) {
            throw serviceError("scan_scope_invalid", `Unsupported scan scope: ${invalidScope}`);
        }
        const roots = getDefaultRoots(uniqueScopes);
        if (roots.length === 0) {
            throw serviceError("scan_roots_unavailable", "No requested scan roots are available");
        }

        const controller = new AbortController();
        this.#controller = controller;
        this.result = undefined;
        this.customAnalyses = {};
        this.#previews.clear();
        if (!preserveCleanup) {
            this.cleanup = { status: "idle" };
        }
        this.scan = {
            status: "running",
            scopes: uniqueScopes,
            roots,
            progress: {
                phase: "starting",
                currentDirectory: roots[0]?.path,
                currentPath: undefined,
                directoriesScanned: 0,
                filesScanned: 0,
                bytesScanned: 0,
                warnings: 0,
                skippedReparsePoints: 0,
            },
            startedAt: new Date().toISOString(),
            completedAt: undefined,
            error: undefined,
        };
        this.#emit();

        this.#runPromise = (async () => {
            const [categorizers, categorizerList, analyzerManagedPaths] = await Promise.all([
                this.#categorizerStore.all(),
                this.#categorizerStore.list(),
                this.#discoverAnalyzerManagedPaths(),
            ]);
            this.categorizers = categorizerList;
            return this.#scanStorage({
                roots,
                categorizers,
                analyzerManagedPaths,
                protectAnalyzerManagedPaths: this.safety.analyzerProtectionEnabled,
                signal: controller.signal,
                onProgress: (progress) => {
                    if (this.#controller !== controller) {
                        return;
                    }
                    this.scan = { ...this.scan, progress };
                    this.#emit();
                },
            });
        })()
            .then((result) => {
                if (this.#controller !== controller) {
                    return;
                }
                this.result = result;
                this.scan = {
                    ...this.scan,
                    status: "completed",
                    progress: undefined,
                    completedAt: new Date().toISOString(),
                };
                this.#emit();
            })
            .catch((error) => {
                if (this.#controller !== controller) {
                    return;
                }
                const cancelled = error?.code === "ABORT_ERR";
                this.scan = {
                    ...this.scan,
                    status: cancelled ? "cancelled" : "failed",
                    progress: undefined,
                    completedAt: new Date().toISOString(),
                    error: cancelled ? undefined : { code: error.code, message: error.message },
                };
                this.#emit();
            })
            .finally(() => {
                if (this.#controller === controller) {
                    this.#controller = undefined;
                    this.#runPromise = undefined;
                }
            });

        return this.getState();
    }

    cancelScan() {
        if (this.scan.status !== "running" || !this.#controller) {
            throw serviceError("scan_not_running", "There is no running scan to cancel");
        }
        this.#controller.abort();
        return { cancelling: true };
    }

    async waitForScan() {
        await this.#runPromise;
        return this.getState();
    }

    async previewCleanup({ source, itemIds, analyzerId }) {
        if (!this.safety.directCleanupEnabled) {
            throw serviceError(
                "cleanup_safety_disabled",
                "Direct cleanup is disabled. Enable it in the Cleanup safety panel and acknowledge the risk before removing files.",
            );
        }
        if (!this.result) {
            throw serviceError("scan_results_unavailable", "Run a scan before previewing cleanup");
        }
        if (!["scan", "analyzer"].includes(source)) {
            throw serviceError("cleanup_source_invalid", "Cleanup source must be scan or analyzer");
        }
        if (this.#activeCleanupOperation) {
            throw serviceError("cleanup_already_running", "Wait for the active cleanup operation to finish");
        }
        const cleanupOperation = { phase: "previewing" };
        this.#activeCleanupOperation = cleanupOperation;

        try {
            let candidates = this.result.candidates;
            let previewSource = { type: "scan" };
            if (source === "analyzer") {
                const analysis = await this.analyzeCustomAnalyzer(analyzerId);
                candidates = analyzerCleanupItems(analysis).filter((item) => item.cleanupEligible);
                previewSource = { type: "analyzer", analyzerId };
            }

            this.cleanup = {
                status: "previewing",
                phase: "validating",
                completed: 0,
                total: itemIds.length,
                currentPath: undefined,
                error: undefined,
            };
            this.#emit();
            const preview = await this.#createCleanupPreview({
                itemIds,
                candidates,
                source: previewSource,
                approvedRoots: this.result.roots.map(({ id, label, path: rootPath }) => ({
                    id,
                    label,
                    path: rootPath,
                })),
                analyzerProtectedPaths: this.safety.analyzerProtectionEnabled
                    ? this.result.analyzerManagedPaths
                    : [],
                onProgress: (progress) => {
                    this.cleanup = { ...this.cleanup, ...progress };
                    this.#emit();
                },
            });
            this.#previews.set(preview.id, preview);
            this.cleanup = {
                status: "awaiting-confirmation",
                previewId: preview.id,
                completed: preview.entries.length,
                total: preview.entries.length,
                totalBytes: preview.totalBytes,
                currentPath: undefined,
                error: undefined,
            };
            this.#emit();
            return preview;
        } catch (error) {
            this.cleanup = {
                status: "failed",
                phase: "validating",
                completed: 0,
                total: itemIds.length,
                currentPath: undefined,
                error: { code: error.code, message: error.message },
            };
            this.#emit();
            throw error;
        } finally {
            if (this.#activeCleanupOperation === cleanupOperation) {
                this.#activeCleanupOperation = undefined;
            }
        }
    }

    async executeCleanup(previewId, confirmed) {
        if (!this.safety.directCleanupEnabled) {
            throw serviceError(
                "cleanup_safety_disabled",
                "Direct cleanup is disabled. Enable it in the Cleanup safety panel and acknowledge the risk before removing files.",
            );
        }
        if (confirmed !== true) {
            throw serviceError("cleanup_confirmation_required", "Explicit cleanup confirmation is required");
        }
        if (this.#activeCleanupOperation) {
            throw serviceError("cleanup_already_running", "Wait for the active cleanup operation to finish");
        }
        const preview = this.#previews.get(previewId);
        if (!preview) {
            throw serviceError("cleanup_preview_unknown", "Cleanup preview was not found; create a new preview");
        }
        this.#previews.delete(previewId);
        const cleanupOperation = { phase: "executing", previewId };
        this.#activeCleanupOperation = cleanupOperation;
        let result;
        try {
            if (preview.source?.type === "analyzer") {
                const current = await this.analyzeCustomAnalyzer(preview.source.analyzerId);
                const eligibleIds = new Set(
                    analyzerCleanupItems(current)
                        .filter((item) => item.cleanupEligible)
                        .map((item) => item.id),
                );
                if (preview.selectedIds.some((id) => !eligibleIds.has(id))) {
                    throw serviceError(
                        "cleanup_candidate_changed",
                        "An analyzer item is no longer safe to clean. Close the application and create a new preview.",
                    );
                }
            }

            this.cleanup = {
                status: "running",
                phase: "validating",
                previewId,
                completed: 0,
                total: preview.entries.length,
                currentPath: undefined,
                error: undefined,
            };
            this.#emit();
            result = await this.#executeCleanupPreview({
                preview: {
                    ...preview,
                    analyzerProtectedPaths: this.safety.analyzerProtectionEnabled
                        ? this.result?.analyzerManagedPaths ?? preview.analyzerProtectedPaths
                        : [],
                },
                confirmed,
                onProgress: (progress) => {
                    this.cleanup = { ...this.cleanup, ...progress };
                    this.#emit();
                },
            });
            this.lastCleanup = result;
            this.cleanup = {
                status: "completed",
                phase: "completed",
                previewId,
                completed: result.succeeded.length + result.failed.length + (result.unknown?.length ?? 0),
                total: preview.entries.length,
                currentPath: undefined,
                reclaimedBytes: result.reclaimedBytes,
                succeeded: result.succeeded.length,
                failed: result.failed.length,
                unknown: result.unknown?.length ?? 0,
                error: undefined,
            };
            this.#emit();
        } catch (error) {
            this.cleanup = {
                ...this.cleanup,
                status: "failed",
                currentPath: undefined,
                error: { code: error.code, message: error.message },
            };
            this.#emit();
            throw error;
        } finally {
            if (this.#activeCleanupOperation === cleanupOperation) {
                this.#activeCleanupOperation = undefined;
            }
        }

        try {
            await this.#startScan({ scopes: this.scan.scopes }, undefined, true);
            this.cleanup = { ...this.cleanup, rescanStarted: true, rescanError: undefined };
            this.#emit();
            return { ...result, rescanStarted: true };
        } catch (error) {
            const rescanError = { code: error.code, message: error.message };
            this.cleanup = { ...this.cleanup, rescanStarted: false, rescanError };
            this.#emit();
            return {
                ...result,
                rescanStarted: false,
                rescanError,
            };
        }
    }
}
