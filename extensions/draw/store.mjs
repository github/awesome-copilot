// Drawings live as JSON files in the session workspace: <dir>/<id>.json
import { promises as fs } from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import { normalizeElements, applyOps } from "./lib/model.mjs";

const VERSION = 1;
const STATE_FILE = ".state.json";
const MAX_INSTANCES = 50;

export function slugifyName(name) {
    return String(name || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48)
        .replace(/-+$/g, "");
}

function cleanName(name) {
    return typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, 80) : "";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function atomicWrite(file, data) {
    const tmp = `${file}.${process.pid}.${Date.now().toString(36)}.tmp`;
    await fs.writeFile(tmp, data, "utf8");
    for (let attempt = 0; ; attempt++) {
        try {
            await fs.rename(tmp, file);
            return;
        } catch (err) {
            // Windows can briefly lock a file that an antivirus or indexer is reading.
            if (attempt >= 5 || !["EPERM", "EBUSY", "EACCES"].includes(err.code)) {
                await fs.rm(tmp, { force: true }).catch(() => {});
                throw err;
            }
            await sleep(40 * (attempt + 1));
        }
    }
}

function serialize(doc) {
    const { elements, ...meta } = doc;
    const head = JSON.stringify(meta, null, 2).replace(/\n}$/, "");
    const body = elements.length
        ? `[\n${elements.map((e) => "    " + JSON.stringify(e)).join(",\n")}\n  ]`
        : "[]";
    return `${head},\n  "elements": ${body}\n}\n`;
}

export class DrawingStore extends EventEmitter {
    constructor(dir, { log = () => {} } = {}) {
        super();
        this.dir = dir;
        this.exportsDir = path.join(dir, "exports");
        this.log = log;
        this.docs = new Map();
        this.timers = new Map();
        this.saving = new Map();
        this.stateTimer = null;
        this.state = { lastOpened: null, instances: {} };
        this.ready = this.#load();
    }

    async #load() {
        await fs.mkdir(this.dir, { recursive: true });
        const names = await fs.readdir(this.dir).catch(() => []);
        for (const name of names) {
            if (!name.endsWith(".json") || name.startsWith(".")) continue;
            const id = name.slice(0, -5);
            if (id !== slugifyName(id)) continue;
            try {
                const raw = JSON.parse(await fs.readFile(path.join(this.dir, name), "utf8"));
                this.docs.set(id, this.#clean(raw, id));
            } catch (err) {
                this.log(`Draw: skipping unreadable drawing ${name}: ${err.message}`);
            }
        }
        try {
            const raw = JSON.parse(await fs.readFile(path.join(this.dir, STATE_FILE), "utf8"));
            if (raw && typeof raw === "object") {
                this.state.lastOpened = typeof raw.lastOpened === "string" ? raw.lastOpened : null;
                if (raw.instances && typeof raw.instances === "object") this.state.instances = { ...raw.instances };
            }
        } catch {
            // No state yet.
        }
    }

    #clean(raw, id) {
        const now = new Date().toISOString();
        return {
            version: VERSION,
            id,
            name: cleanName(raw?.name) || id,
            rev: Number.isInteger(raw?.rev) && raw.rev >= 0 ? raw.rev : 0,
            createdAt: typeof raw?.createdAt === "string" ? raw.createdAt : now,
            updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : now,
            elements: normalizeElements(raw?.elements),
        };
    }

    filePath(id) {
        return path.join(this.dir, `${id}.json`);
    }

    list() {
        return [...this.docs.values()]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((d) => ({ id: d.id, name: d.name, updatedAt: d.updatedAt, count: d.elements.length }));
    }

    get(id) {
        return (typeof id === "string" && this.docs.get(id)) || null;
    }

    find(nameOrId) {
        const wanted = cleanName(nameOrId).toLowerCase();
        if (!wanted) return null;
        return (
            this.docs.get(wanted) ||
            [...this.docs.values()].find((d) => d.name.toLowerCase() === wanted) ||
            this.docs.get(slugifyName(wanted)) ||
            null
        );
    }

    #nextName() {
        const taken = new Set([...this.docs.values()].map((d) => d.name.toLowerCase()));
        let n = this.docs.size + 1;
        while (taken.has(`drawing ${n}`)) n++;
        return `Drawing ${n}`;
    }

    create(name) {
        const finalName = cleanName(name) || this.#nextName();
        const root = slugifyName(finalName) || "drawing";
        let id = root;
        for (let i = 2; this.docs.has(id); i++) id = `${root}-${i}`;
        const now = new Date().toISOString();
        const doc = { version: VERSION, id, name: finalName, rev: 0, createdAt: now, updatedAt: now, elements: [] };
        this.docs.set(id, doc);
        this.#scheduleSave(id, 0);
        this.emit("list");
        return doc;
    }

    #require(id) {
        const doc = this.get(id);
        if (!doc) throw new Error(`No drawing with id "${id}".`);
        return doc;
    }

    #touch(doc, origin) {
        doc.rev += 1;
        doc.updatedAt = new Date().toISOString();
        this.#scheduleSave(doc.id);
        this.emit("change", doc, origin);
    }

    rename(id, name) {
        const doc = this.#require(id);
        const finalName = cleanName(name);
        if (!finalName) throw new Error("A drawing name cannot be empty.");
        if (finalName === doc.name) return doc;
        doc.name = finalName;
        this.#touch(doc, "rename");
        this.emit("list");
        return doc;
    }

    mutate(id, fn, origin = "agent") {
        const doc = this.#require(id);
        doc.elements = normalizeElements(fn(doc.elements));
        this.#touch(doc, origin);
        return doc;
    }

    applyOps(id, ops, origin) {
        return this.mutate(id, (elements) => applyOps(elements, ops), origin);
    }

    replace(id, elements, origin) {
        return this.mutate(id, () => elements, origin);
    }

    async remove(id) {
        this.#require(id);
        clearTimeout(this.timers.get(id));
        this.timers.delete(id);
        this.docs.delete(id);
        await (this.saving.get(id) || Promise.resolve());
        this.saving.delete(id);
        await fs.rm(this.filePath(id), { force: true }).catch((err) => this.log(`Draw: could not delete ${id}: ${err.message}`));
        if (this.state.lastOpened === id) this.state.lastOpened = null;
        for (const [inst, drawing] of Object.entries(this.state.instances)) {
            if (drawing === id) delete this.state.instances[inst];
        }
        this.#scheduleState();
        this.emit("list");
    }

    drawingForInstance(instanceId) {
        return this.get(this.state.instances[instanceId]);
    }

    bindInstance(instanceId, drawingId) {
        const instances = this.state.instances;
        delete instances[instanceId];
        instances[instanceId] = drawingId;
        const keys = Object.keys(instances);
        for (const key of keys.slice(0, Math.max(0, keys.length - MAX_INSTANCES))) delete instances[key];
        this.state.lastOpened = drawingId;
        this.#scheduleState();
    }

    get lastOpened() {
        return this.get(this.state.lastOpened);
    }

    async writeExport(drawingId, ext, data) {
        await fs.mkdir(this.exportsDir, { recursive: true });
        const file = path.join(this.exportsDir, `${drawingId}.${ext}`);
        await atomicWrite(file, data);
        return file;
    }

    #scheduleSave(id, delay = 200) {
        clearTimeout(this.timers.get(id));
        this.timers.set(id, setTimeout(() => this.#save(id), delay));
    }

    #save(id) {
        this.timers.delete(id);
        const run = (this.saving.get(id) || Promise.resolve())
            .then(async () => {
                const doc = this.docs.get(id);
                if (doc) await atomicWrite(this.filePath(id), serialize(doc));
            })
            .catch((err) => this.log(`Draw: failed to save ${id}: ${err.message}`));
        this.saving.set(id, run);
        return run;
    }

    #scheduleState() {
        clearTimeout(this.stateTimer);
        this.stateTimer = setTimeout(() => this.#saveState(), 300);
    }

    #saveState() {
        this.stateTimer = null;
        const data = JSON.stringify(this.state, null, 2) + "\n";
        return atomicWrite(path.join(this.dir, STATE_FILE), data).catch((err) =>
            this.log(`Draw: failed to save state: ${err.message}`),
        );
    }

    async flush() {
        const pending = [...this.timers.keys()];
        for (const id of pending) {
            clearTimeout(this.timers.get(id));
            this.#save(id);
        }
        await Promise.all([...this.saving.values()]);
        if (this.stateTimer) {
            clearTimeout(this.stateTimer);
            await this.#saveState();
        }
    }
}
