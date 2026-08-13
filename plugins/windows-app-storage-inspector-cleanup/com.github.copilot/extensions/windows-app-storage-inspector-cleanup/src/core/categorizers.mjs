import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const FILE_VERSION = 1;
const MAX_CATEGORIZERS = 200;
const MAX_PATH_LENGTH = 4096;
const MAX_TEXT_LENGTH = 120;

export const BUILT_IN_CATEGORIZERS = [
    {
        id: "built-in-github-copilot-cache",
        name: "GitHub Copilot",
        category: "Application cache",
        description: "Regenerable GitHub Copilot application cache data.",
        match: "token",
        value: "\\appdata\\local\\github copilot\\",
        cleanupPolicy: "automatic",
        source: "built-in",
    },
    {
        id: "built-in-docker-desktop",
        name: "Docker Desktop",
        category: "Container image and build storage",
        description: "Docker-managed images, layers, build cache, containers, and WSL virtual disk data. Use Docker CLI or Docker Desktop to clean it.",
        match: "token",
        value: "\\appdata\\local\\docker\\",
        cleanupPolicy: "manual",
        analyzerId: "docker-images",
        source: "built-in",
    },
    {
        id: "built-in-docker-engine",
        name: "Docker Engine",
        category: "Container image and build storage",
        description: "Docker Engine image and layer data. Use Docker CLI to clean it; do not delete managed layer folders directly.",
        match: "token",
        value: "\\programdata\\docker\\",
        cleanupPolicy: "manual",
        analyzerId: "docker-images",
        source: "built-in",
    },
    {
        id: "built-in-foundry-local-model-cache",
        name: "Microsoft Foundry Local",
        category: "AI model cache",
        description: "Downloaded Foundry Local model data. Use `foundry cache location`, `foundry cache list`, and `foundry cache remove` to manage it.",
        match: "token",
        value: "\\.foundry\\cache",
        cleanupPolicy: "manual",
        source: "built-in",
    },
    {
        id: "built-in-foundry-local-cache",
        name: "Microsoft Foundry Local",
        category: "AI model cache",
        description: "Downloaded Foundry Local model data. Use `foundry cache location`, `foundry cache list`, and `foundry cache remove` to manage it.",
        match: "token",
        value: "\\foundry local\\cache",
        cleanupPolicy: "manual",
        source: "built-in",
    },
    {
        id: "built-in-npm-cache",
        name: "npm",
        category: "Package manager cache",
        description: "npm-managed package cache. Use `npm cache verify` before `npm cache clean --force`; do not delete _cacache contents directly.",
        match: "token",
        value: "\\appdata\\local\\npm-cache\\",
        cleanupPolicy: "manual",
        analyzerId: "npm-cache",
        source: "built-in",
    },
    {
        id: "built-in-uv-cache",
        name: "uv",
        category: "Python package manager data",
        description: "uv-managed Python data. Use the uv cache analyzer and its supported commands; do not modify files directly.",
        match: "token",
        value: "\\appdata\\local\\uv\\",
        cleanupPolicy: "manual",
        analyzerId: "uv-cache",
        source: "built-in",
    },
];

function serviceError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function normalizePath(value) {
    return path.resolve(value).replaceAll("/", "\\").toLowerCase();
}

function isWithinRoot(candidatePath, rootPath) {
    const relative = path.relative(path.resolve(rootPath), path.resolve(candidatePath));
    return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function normalizeText(value, field) {
    if (typeof value !== "string" || !value.trim()) {
        throw serviceError("categorizer_input_invalid", `${field} is required`);
    }
    const normalized = value.trim();
    if (normalized.length > MAX_TEXT_LENGTH) {
        throw serviceError("categorizer_input_invalid", `${field} must be ${MAX_TEXT_LENGTH} characters or fewer`);
    }
    return normalized;
}

function normalizeStoragePath(value) {
    if (typeof value !== "string" || !value.trim()) {
        throw serviceError("categorizer_input_invalid", "Path is required");
    }
    const normalized = value.trim();
    if (normalized.length > MAX_PATH_LENGTH) {
        throw serviceError("categorizer_input_invalid", `Path must be ${MAX_PATH_LENGTH} characters or fewer`);
    }
    return normalized;
}

function defaultStoragePath() {
    const copilotHome = process.env.COPILOT_HOME ?? path.join(os.homedir(), ".copilot");
    return path.join(copilotHome, "extensions", "windows-app-storage-inspector-cleanup", "artifacts", "categorizers.json");
}

function isStoredRule(value) {
    return value
        && typeof value === "object"
        && typeof value.id === "string"
        && typeof value.name === "string"
        && typeof value.category === "string"
        && typeof value.path === "string"
        && typeof value.createdAt === "string";
}

export function findCategorizer(filePath, categorizers = []) {
    const normalizedPath = normalizePath(filePath);
    const matches = categorizers.filter((rule) => {
        if (rule.match === "token") {
            const tokenRoot = rule.value.endsWith("\\") ? rule.value.slice(0, -1) : rule.value;
            return normalizedPath.includes(rule.value) || normalizedPath.endsWith(tokenRoot);
        }
        return normalizedPath === rule.path || normalizedPath.startsWith(`${rule.path}\\`);
    });
    return matches.sort((left, right) => right.value.length - left.value.length)[0];
}

export class CategorizerStore {
    #storagePath;
    #rules;

    constructor({ storagePath = defaultStoragePath() } = {}) {
        this.#storagePath = storagePath;
        this.#rules = undefined;
    }

    async list() {
        await this.#load();
        return {
            builtIn: BUILT_IN_CATEGORIZERS.map((rule) => ({ ...rule })),
            custom: this.#rules.map((rule) => ({ ...rule, source: "custom", match: "path", value: rule.path, cleanupPolicy: "manual" })),
        };
    }

    async all() {
        const { builtIn, custom } = await this.list();
        return [...custom, ...builtIn];
    }

    async add({ path: targetPath, name, category, description, approvedRoots }) {
        await this.#load();
        const inputPath = normalizeStoragePath(targetPath);
        if (!path.isAbsolute(inputPath)) {
            throw serviceError("categorizer_path_invalid", "Categorizer path must be absolute");
        }
        const resolvedPath = path.resolve(inputPath);
        if (!Array.isArray(approvedRoots) || !approvedRoots.some((root) => isWithinRoot(resolvedPath, root.path))) {
            throw serviceError("categorizer_path_not_allowed", "Categorizer path must be inside a scanned storage root");
        }
        let stats;
        try {
            stats = await lstat(resolvedPath);
        } catch (error) {
            throw serviceError("categorizer_path_unavailable", `Cannot access categorizer path: ${error.message}`);
        }
        if (stats.isSymbolicLink() || (!stats.isDirectory() && !stats.isFile())) {
            throw serviceError("categorizer_path_invalid", "Categorizer path must be a regular file or folder");
        }

        const normalizedPath = normalizePath(resolvedPath);
        if (this.#rules.some((rule) => rule.path === normalizedPath)) {
            throw serviceError("categorizer_duplicate", "This path already has a custom categorizer");
        }
        if (this.#rules.length >= MAX_CATEGORIZERS) {
            throw serviceError("categorizer_limit_reached", `Store no more than ${MAX_CATEGORIZERS} custom categorizers`);
        }

        const rule = {
            id: randomUUID(),
            name: normalizeText(name, "Name"),
            category: normalizeText(category, "Category"),
            description: typeof description === "string" && description.trim()
                ? normalizeText(description, "Description")
                : undefined,
            path: normalizedPath,
            createdAt: new Date().toISOString(),
        };
        this.#rules.push(rule);
        await this.#save();
        return { ...rule, source: "custom", match: "path", value: rule.path, cleanupPolicy: "manual" };
    }

    async remove(id) {
        await this.#load();
        const index = this.#rules.findIndex((rule) => rule.id === id);
        if (index < 0) {
            throw serviceError("categorizer_unknown", "Custom categorizer was not found");
        }
        const [removed] = this.#rules.splice(index, 1);
        await this.#save();
        return removed;
    }

    async #load() {
        if (this.#rules) {
            return;
        }
        try {
            const content = await readFile(this.#storagePath, "utf8");
            const parsed = JSON.parse(content);
            if (parsed?.version !== FILE_VERSION || !Array.isArray(parsed.rules) || !parsed.rules.every(isStoredRule)) {
                throw serviceError("categorizer_store_invalid", "Custom categorizer store has an unsupported format");
            }
            this.#rules = parsed.rules;
        } catch (error) {
            if (error?.code === "ENOENT") {
                this.#rules = [];
                return;
            }
            if (error?.code) {
                throw error;
            }
            throw serviceError("categorizer_store_invalid", `Could not read custom categorizers: ${error.message}`);
        }
    }

    async #save() {
        await mkdir(path.dirname(this.#storagePath), { recursive: true });
        const temporaryPath = `${this.#storagePath}.${process.pid}.${Date.now()}.tmp`;
        await writeFile(
            temporaryPath,
            `${JSON.stringify({ version: FILE_VERSION, rules: this.#rules }, null, 2)}\n`,
            "utf8",
        );
        await rename(temporaryPath, this.#storagePath);
    }
}
