import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { readResourceFile } from "../.github/extensions/resource-staleness-board/lib/preview.mjs";

async function fixture(t) {
    const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), `.resource-staleness-preview-${randomUUID()}`);
    await mkdir(directory);
    t.after(() => rm(directory, { recursive: true, force: true }));
    const root = path.join(directory, "checkout");
    await mkdir(root);
    return { directory, root };
}

function resource(file) {
    return { id: "skills/demo", files: [file] };
}

test("preview reads a regular file within the checkout", async (t) => {
    const { root } = await fixture(t);
    const file = "skills/demo/SKILL.md";
    const contents = "Preview content.\n";
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), contents);

    const result = await readResourceFile(root, resource(file), file);
    assert.equal(result.content, contents);
    assert.equal(result.binary, false);
});

test("preview rejects a listed file reached through a linked parent outside the checkout", async (t) => {
    const { directory, root } = await fixture(t);
    const file = "skills/demo/SKILL.md";
    const outside = path.join(directory, "outside");
    await mkdir(path.join(root, "skills"), { recursive: true });
    await mkdir(outside);
    await writeFile(path.join(outside, "SKILL.md"), "Outside content.\n");
    await symlink(outside, path.join(root, "skills", "demo"), process.platform === "win32" ? "junction" : "dir");

    await assert.rejects(readResourceFile(root, resource(file), file), /File is outside the checkout/);
});

test("preview rejects a final-component symlink", async (t) => {
    const { directory, root } = await fixture(t);
    const file = "skills/demo/SKILL.md";
    const target = path.join(directory, "outside.md");
    const full = path.join(root, file);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(target, "Outside content.\n");
    try {
        await symlink(target, full, "file");
    } catch (error) {
        if (["EACCES", "EINVAL", "ENOTSUP", "EPERM"].includes(error.code)) {
            t.skip("This platform does not permit creating file symlinks.");
            return;
        }
        throw error;
    }

    await assert.rejects(readResourceFile(root, resource(file), file), /Not a regular file/);
});

test("preview accepts a checkout reached through a directory link", async (t) => {
    const { directory, root } = await fixture(t);
    const file = "skills/demo/SKILL.md";
    const contents = "Linked checkout content.\n";
    const full = path.join(root, file);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, contents);
    const linkedRoot = path.join(directory, "checkout-link");
    await symlink(root, linkedRoot, process.platform === "win32" ? "junction" : "dir");

    const result = await readResourceFile(linkedRoot, resource(file), file);
    assert.equal(result.content, contents);
});
