import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { canvasId, TagError } from "./schemas.mjs";

export function dataDirectory() {
    const home = process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
    return path.join(home, "extension-data", canvasId);
}

export function preferencePath(repository, directory = dataDirectory()) {
    const key = createHash("sha256").update(repository).digest("hex");
    return path.join(directory, `${key}.json`);
}

export async function readPreferences(repository, directory) {
    const file = preferencePath(repository, directory);
    let text;
    try {
        text = await readFile(file, "utf8");
    } catch (error) {
        if (error.code === "ENOENT") return null;
        throw new TagError("storage_failed", `Cannot read tag manager preferences: ${error.message}`);
    }
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new TagError("storage_corrupt", "Tag manager preferences contain invalid JSON; restore or remove the affected preference file.");
    }
    if (!data || data.format !== "git-tag-manager-preferences" || data.version !== 1 ||
        data.repository !== repository || typeof data.remote !== "string") {
        throw new TagError("storage_corrupt", "Unrecognized tag manager preference format; the file has not been overwritten.");
    }
    return data;
}

export async function savePreferences(repository, remote, directory) {
    await readPreferences(repository, directory);
    const file = preferencePath(repository, directory);
    const temp = `${file}.${randomUUID()}.tmp`;
    try {
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(temp, JSON.stringify({
            format: "git-tag-manager-preferences", version: 1, repository, remote,
        }) + "\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
        await rename(temp, file);
    } catch (error) {
        throw new TagError("storage_failed", `Cannot save tag manager preferences: ${error.message}`);
    } finally {
        await rm(temp, { force: true });
    }
}
