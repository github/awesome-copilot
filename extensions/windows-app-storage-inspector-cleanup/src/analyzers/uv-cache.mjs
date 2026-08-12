import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { getAnalyzerCommands } from "../core/analyzer-commands.mjs";

const execFileAsync = promisify(execFile);
const UV_CLI_TIMEOUT_MS = 10_000;

function normalize(filePath) {
    return path.resolve(filePath).replaceAll("/", "\\").toLowerCase();
}

function isWithin(candidatePath, parentPath) {
    const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
    return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function getDirectoryAggregate(result, directoryPath) {
    const normalizedPath = normalize(directoryPath);
    return result.directories.find((directory) => normalize(directory.path) === normalizedPath);
}

function getDefaultUvRoot() {
    const localAppData = process.env.LOCALAPPDATA ?? path.join(process.env.USERPROFILE ?? "", "AppData", "Local");
    return path.resolve(localAppData, "uv");
}

async function getConfiguredCachePath(defaultCachePath) {
    try {
        const { stdout } = await execFileAsync("uv.exe", ["cache", "dir"], {
            windowsHide: true,
            timeout: UV_CLI_TIMEOUT_MS,
            maxBuffer: 1024 * 1024,
        });
        const configuredPath = stdout.trim();
        if (!configuredPath) {
            throw new Error("uv did not return a cache path");
        }
        return { path: path.resolve(configuredPath), source: "uv cache dir" };
    } catch (error) {
        return {
            path: defaultCachePath,
            source: "Windows default",
            error: error.code === "ENOENT"
                ? "uv was not found, so the standard Windows cache location was checked instead."
                : `uv cache configuration could not be read: ${error.message}`,
        };
    }
}

export async function discoverUvCachePaths() {
    const rootPath = getDefaultUvRoot();
    const configuredCache = await getConfiguredCachePath(path.join(rootPath, "cache"));
    return [...new Set([rootPath, configuredCache.path])];
}

async function describeDirectory(result, id, name, directoryPath) {
    try {
        const directoryStats = await stat(directoryPath);
        if (!directoryStats.isDirectory()) {
            return undefined;
        }
        const aggregate = getDirectoryAggregate(result, directoryPath);
        return {
            id,
            name,
            path: directoryPath,
            bytes: aggregate?.bytes ?? 0,
            files: aggregate?.files ?? 0,
            modifiedAt: directoryStats.mtime.toISOString(),
        };
    } catch (error) {
        if (error?.code === "ENOENT") {
            return undefined;
        }
        throw error;
    }
}

export async function analyzeUvCache(result) {
    const rootPath = getDefaultUvRoot();
    const configuredCache = await getConfiguredCachePath(path.join(rootPath, "cache"));
    const [root, cache] = await Promise.all([
        describeDirectory(result, "uv-root", "uv data", rootPath),
        describeDirectory(result, "uv-cache", "uv cache", configuredCache.path),
    ]);
    const locations = [root, cache].filter((location, index, all) => (
        location && all.findIndex((candidate) => candidate?.path === location.path) === index
    ));
    const analysisRoots = locations.map((location) => location.path);
    const topFiles = result.largestFiles
        .filter((file) => analysisRoots.some((rootPath) => isWithin(file.path, rootPath)))
        .sort((left, right) => right.bytes - left.bytes)
        .slice(0, 20);
    const totalBytes = root
        ? root.bytes + (cache && !isWithin(cache.path, root.path) ? cache.bytes : 0)
        : (cache?.bytes ?? 0);

    return {
        id: "uv-cache",
        status: locations.length ? "available" : "not-found",
        root,
        cache,
        locations,
        configuredCachePath: configuredCache.path,
        configurationSource: configuredCache.source,
        configurationError: configuredCache.error,
        topFiles,
        totalBytes,
        cacheBytes: cache?.bytes ?? 0,
        cleanupItems: [],
        cleanupCommands: getAnalyzerCommands("uv-cache"),
        message: locations.length
            ? "uv manages this cache as append-only storage. Use uv cache commands instead of modifying its files directly."
            : "uv storage was not found in its standard Windows location. uv creates cache storage as packages and Python versions are used.",
        warning: "Do not delete files or directories inside uv's cache directly. uv coordinates concurrent access and locks cache-modifying operations.",
    };
}
