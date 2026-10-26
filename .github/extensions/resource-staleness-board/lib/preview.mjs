import path from "node:path";
import { lstat, open, realpath } from "node:fs/promises";

export const MAX_PREVIEW_BYTES = 512 * 1024;

export async function readResourceFile(root, item, file) {
    if (typeof file !== "string" || !item.files.includes(file)) throw new Error("File is not part of this resource.");
    const checkout = path.resolve(root);
    const full = path.resolve(checkout, file);
    const relative = path.relative(checkout, full);
    if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error("File is outside the checkout.");
    }
    const stats = await lstat(full);
    if (!stats.isFile()) throw new Error("Not a regular file in the working tree.");
    const [realCheckout, realFile] = await Promise.all([realpath(checkout), realpath(full)]);
    const realRelative = path.relative(realCheckout, realFile);
    if (!realRelative || realRelative === ".." || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
        throw new Error("File is outside the checkout.");
    }
    const handle = await open(realFile, "r");
    try {
        const length = Math.min(stats.size, MAX_PREVIEW_BYTES);
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await handle.read(buffer, 0, length, 0);
        const bytes = buffer.subarray(0, bytesRead);
        const binary = bytes.subarray(0, 8000).includes(0);
        return {
            id: item.id, file, size: stats.size, binary,
            truncated: stats.size > bytesRead,
            content: binary ? "" : bytes.toString("utf8"),
        };
    } finally {
        await handle.close();
    }
}
