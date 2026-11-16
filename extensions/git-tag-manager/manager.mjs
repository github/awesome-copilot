import { randomUUID } from "node:crypto";
import { checkPushDestination, checkTag, git, pushTag, resolveRepository, snapshot } from "./git.mjs";
import { readPreferences, savePreferences } from "./storage.mjs";
import { operationSchema, TagError, validate } from "./schemas.mjs";

const queues = new Map();

function serialize(repository, task) {
    const previous = queues.get(repository) ?? Promise.resolve();
    const result = previous.then(task, task);
    const settled = result.then(() => {}, () => {});
    queues.set(repository, settled);
    void settled.then(() => {
        if (queues.get(repository) === settled) queues.delete(repository);
    });
    return result;
}

export class TagManager {
    static async open(input, directory) {
        const repository = await resolveRepository(input.repository);
        const prefs = await readPreferences(repository, directory);
        const remotes = (await git(repository, ["remote"])).split("\n").filter(Boolean);
        const remote = input.remote ?? prefs?.remote ?? (remotes.includes("origin") ? "origin" : remotes[0] ?? "");
        const manager = new TagManager(repository, remote, directory);
        await manager.refresh();
        await savePreferences(repository, remote, directory);
        return manager;
    }

    constructor(repository, remote, directory) {
        this.repository = repository;
        this.remote = remote;
        this.directory = directory;
        this.pending = null;
        this.result = null;
    }

    state() {
        return { snapshot: this.snapshot, pending: this.pending, result: this.result };
    }

    refresh() {
        return serialize(this.repository, async () => {
            this.snapshot = await snapshot(this.repository, this.remote);
            return this.snapshot;
        });
    }

    selectRemote(remote) {
        return serialize(this.repository, async () => {
            const next = await snapshot(this.repository, remote);
            await savePreferences(this.repository, remote, this.directory);
            this.remote = remote;
            this.snapshot = next;
            this.pending = null;
            return next;
        });
    }

    prepare(input) {
        validate(input, operationSchema);
        return serialize(this.repository, async () => {
            await checkTag(this.repository, input.name);
            if ((input.operation !== "create" && ["target", "message", "push"].some(key => key in input)) ||
                (input.operation !== "delete" && "scope" in input)) {
                throw new TagError("invalid_input", "Creation and deletion options must match the selected operation.");
            }
            const current = await snapshot(this.repository, this.remote);
            this.snapshot = current;
            const tag = current.tags.find(item => item.name === input.name);
            const scope = input.scope ?? "local";
            const remoteChange = input.operation === "push" || input.push === true ||
                (input.operation === "delete" && scope !== "local");
            if (remoteChange && !this.remote) throw new TagError("remote_required", "Configure and select a remote before changing remote tags.");
            if (remoteChange) await checkPushDestination(this.repository, this.remote);
            if (input.operation === "create" && (tag?.localOid || (input.push && tag?.remoteOid))) {
                throw new TagError("tag_exists", "The tag already exists in the selected location. Existing tags are never overwritten.");
            }
            if (input.operation === "push" && (!tag?.localOid || tag.remoteOid)) {
                throw new TagError("cannot_push", "Push requires a local-only tag. Existing remote tags are never overwritten.");
            }
            if (input.operation === "delete" &&
                ((scope !== "remote" && !tag?.localOid) || (scope !== "local" && !tag?.remoteOid))) {
                throw new TagError("tag_not_found", "The tag does not exist in every selected deletion location.");
            }
            const targetOid = input.operation === "create"
                ? await git(this.repository, ["rev-parse", "--verify", "--end-of-options", `${input.target ?? "HEAD"}^{commit}`])
                : null;
            this.pending = {
                ...input, scope, id: randomUUID(), repository: this.repository, remote: this.remote,
                targetOid, localOid: tag?.localOid ?? null, remoteOid: tag?.remoteOid ?? null,
                remoteChange, expiresAt: Date.now() + 5 * 60 * 1000,
            };
            return this.pending;
        });
    }

    execute(id, confirmation) {
        return serialize(this.repository, async () => {
            const plan = this.pending;
            if (!plan || plan.id !== id || plan.expiresAt < Date.now()) {
                if (plan?.expiresAt < Date.now()) this.pending = null;
                throw new TagError("plan_expired", "This preview has expired. Prepare the operation again.");
            }
            if (confirmation !== plan.name) throw new TagError("confirmation_required", "Type the exact tag name to confirm this operation.");
            this.pending = null;
            this.result = null;
            let localChanged = false;
            let remoteChanged = false;
            try {
                const current = await snapshot(this.repository, this.remote);
                const tag = current.tags.find(item => item.name === plan.name);
                if ((tag?.localOid ?? null) !== plan.localOid || (tag?.remoteOid ?? null) !== plan.remoteOid) {
                    throw new TagError("tag_changed", "The tag changed since preview. Refresh and prepare again.");
                }
                if (plan.remoteChange) await checkPushDestination(this.repository, plan.remote);
                if (plan.operation === "create") {
                    const args = ["tag"];
                    if (plan.message?.trim()) args.push("-a", "-m", plan.message);
                    args.push("--", plan.name, plan.targetOid);
                    await git(this.repository, args);
                    localChanged = true;
                    if (plan.push) {
                        const createdOid = await git(this.repository, ["rev-parse", "--verify", `refs/tags/${plan.name}`]);
                        const commit = await git(this.repository, ["rev-parse", "--verify", `refs/tags/${plan.name}^{commit}`]);
                        if (commit !== plan.targetOid) throw new TagError("tag_changed", "The newly created tag changed before push. It was not pushed.");
                        await pushTag(this.repository, plan.remote, plan.name, undefined, createdOid);
                        remoteChanged = true;
                    }
                } else if (plan.operation === "push") {
                    await pushTag(this.repository, plan.remote, plan.name, undefined, plan.localOid);
                    remoteChanged = true;
                } else {
                    if (plan.scope !== "local") {
                        await pushTag(this.repository, plan.remote, plan.name, plan.remoteOid);
                        remoteChanged = true;
                    }
                    if (plan.scope !== "remote") {
                        await git(this.repository, ["update-ref", "-d", `refs/tags/${plan.name}`, plan.localOid]);
                        localChanged = true;
                    }
                }
                this.result = { ok: true, message: `${plan.operation === "delete" ? "Deleted" : plan.operation === "push" ? "Pushed" : "Created"} ${plan.name}.`, localChanged, remoteChanged };
                this.snapshot = await snapshot(this.repository, this.remote);
                return this.result;
            } catch (error) {
                this.result = {
                    ok: false, localChanged, remoteChanged,
                    message: `${error.message}${localChanged || remoteChanged ? ` Completed changes: local=${localChanged}, remote=${remoteChanged}. Refresh before retrying; no rollback was attempted.` : ""}`,
                };
                throw new TagError(error.code ?? "operation_failed", this.result.message);
            }
        });
    }

    cancel(id) {
        if (!this.pending || this.pending.id !== id) throw new TagError("plan_expired", "This preview is no longer active.");
        this.pending = null;
        return { cancelled: true };
    }
}
