import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { getAnalyzerCommands } from "../core/analyzer-commands.mjs";

const execFileAsync = promisify(execFile);
const DOCKER_CLI_TIMEOUT_MS = 10_000;

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

async function describeDirectory(result, id, name, directoryPath, kind) {
    let stats;
    try {
        stats = await stat(directoryPath);
    } catch (error) {
        if (error?.code === "ENOENT") {
            return undefined;
        }
        throw error;
    }
    if (!stats.isDirectory()) {
        return undefined;
    }
    const aggregate = getDirectoryAggregate(result, directoryPath);
    return {
        id,
        name,
        path: directoryPath,
        kind,
        bytes: aggregate?.bytes ?? 0,
        files: aggregate?.files ?? 0,
        modifiedAt: stats.mtime.toISOString(),
    };
}

function parseDockerSize(value) {
    const match = String(value ?? "").trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
    if (!match) {
        return 0;
    }
    const units = { b: 0, kb: 1, mb: 2, gb: 3, tb: 4 };
    return Number(match[1]) * Math.pow(1024, units[String(match[2] ?? "B").toLowerCase()] ?? 0);
}

function parseImageRows(stdout) {
    return stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .map((image) => {
            const repository = String(image.Repository ?? "<none>");
            const tag = String(image.Tag ?? "<none>");
            const size = String(image.Size ?? "0 B");
            const imageId = String(image.ID ?? "");
            return {
                id: `docker-image-${imageId || `${repository}-${tag}`}`.replace(/[^a-zA-Z0-9._-]/g, "-"),
                imageId,
                repository,
                tag,
                size,
                bytes: parseDockerSize(size),
                createdAt: String(image.CreatedAt ?? ""),
                containers: Number.isFinite(Number(image.Containers)) ? Number(image.Containers) : undefined,
                dangling: repository === "<none>" && tag === "<none>",
            };
        });
}

async function inspectDockerImages() {
    try {
        const { stdout } = await execFileAsync("docker.exe", [
            "image",
            "ls",
            "--no-trunc",
            "--format",
            "{{json .}}",
        ], {
            windowsHide: true,
            timeout: DOCKER_CLI_TIMEOUT_MS,
            maxBuffer: 8 * 1024 * 1024,
        });
        const images = parseImageRows(stdout);
        return {
            status: "available",
            images,
            error: undefined,
        };
    } catch (error) {
        return {
            status: "unavailable",
            images: [],
            error: error.code === "ENOENT"
                ? "Docker CLI was not found. Install or enable Docker Desktop to inspect images."
                : `Docker image inspection failed: ${error.message}`,
        };
    }
}

function getDockerRoots() {
    const localAppData = process.env.LOCALAPPDATA ?? path.join(process.env.USERPROFILE ?? "", "AppData", "Local");
    const programData = process.env.PROGRAMDATA ?? "C:\\ProgramData";
    return [
        {
            id: "docker-desktop-data",
            name: "Docker Desktop data",
            path: path.resolve(localAppData, "Docker"),
            kind: "desktop-data",
        },
        {
            id: "docker-engine-data",
            name: "Docker Engine data",
            path: path.resolve(programData, "Docker"),
            kind: "engine-data",
        },
    ];
}

export async function analyzeDockerImages(result) {
    const roots = getDockerRoots();
    const locations = (await Promise.all(
        roots.map((root) => describeDirectory(result, root.id, root.name, root.path, root.kind)),
    )).filter(Boolean);
    const docker = await inspectDockerImages();
    const rootPaths = locations.map((location) => location.path);
    const topFiles = result.largestFiles
        .filter((file) => rootPaths.some((root) => isWithin(file.path, root)))
        .sort((left, right) => right.bytes - left.bytes)
        .slice(0, 20);
    const imageBytes = docker.images.reduce((total, image) => total + image.bytes, 0);
    const danglingImages = docker.images.filter((image) => image.dangling);

    return {
        id: "docker-images",
        status: locations.length || docker.status === "available" ? docker.status : "not-found",
        processCount: docker.status === "available" ? 1 : 0,
        locations,
        images: docker.images,
        topFiles,
        totalBytes: locations.reduce((total, location) => total + location.bytes, 0),
        imageBytes,
        danglingImages: danglingImages.length,
        cleanupItems: [],
        cleanupCommands: getAnalyzerCommands("docker-images"),
        message: docker.status === "available"
            ? "Docker images were inspected through the Docker CLI. Use Docker commands or Docker Desktop to remove managed image data."
            : docker.error,
        inspectionError: docker.error,
        warning: "Do not delete Docker layer folders or VHDX files directly. Docker manages these files as a database; use Docker CLI or Docker Desktop so references and layers remain consistent.",
    };
}
