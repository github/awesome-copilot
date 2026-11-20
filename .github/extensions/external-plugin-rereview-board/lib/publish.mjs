import { randomUUID } from "node:crypto";
import { REREVIEW_COMMANDS } from "../../../scripts/external-plugins/external-plugin-rereview.mjs";
import { digest, issueUrl, REPO } from "./report.mjs";
import { fingerprint } from "./state.mjs";

const commands = { keep: REREVIEW_COMMANDS.keep, "needs-changes": REREVIEW_COMMANDS.needsChanges, remove: REREVIEW_COMMANDS.remove };

export class Publisher {
    constructor(store, github) {
        this.store = store;
        this.github = github;
        this.previews = new Map();
        this.busy = false;
    }
    preview(number, id) {
        const item = this.store.item(number, id);
        this.store.editable(item);
        if (item.queueId || item.evidence.reasons.length) throw new Error("Resolve the pending review or eligibility block first.");
        if (!commands[item.column]) throw new Error("Choose Keep, Needs changes, or Remove first.");
        if (item.column !== "keep" && !item.reason.trim()) throw new Error("Provide a public reason for needs-changes or removal.");
        const marker = `<!-- external-plugin-rereview-board:${id}:${randomUUID()} -->`;
        const preview = {
            token: randomUUID(), number, id, revision: item.revision, kind: item.column,
            sourceHash: this.store.report(number).sourceHash, evidenceHash: item.evidence.hash,
            target: issueUrl(id), marker, expires: Date.now() + 5 * 60_000,
            body: `${commands[item.column]}${item.reason.trim() ? `\n\n${item.reason.trim()}` : ""}\n\n${marker}`,
        };
        for (const [token, entry] of this.previews) if (entry.expires < Date.now()) this.previews.delete(token);
        this.previews.set(preview.token, preview);
        return preview;
    }
    async publish(token) {
        const preview = this.previews.get(token);
        this.previews.delete(token);
        if (!preview || preview.expires < Date.now()) throw new Error("Preview expired or already used; preview again.");
        if (this.busy) throw new Error("A command is already being published.");
        this.busy = true;
        try {
            const { number, id } = preview;
            const row = this.store.item(number, id);
            const [live, author] = await Promise.all([
                this.github.preflight(number, row), this.github.maintainer(),
            ]);
            if (live.issue.state !== "open" || digest(live.issue.body) !== preview.sourceHash ||
                live.evidence.hash !== preview.evidenceHash || live.evidence.reasons.length) {
                throw new Error("Report, submission, discussion, catalog, or upstream evidence changed on GitHub. Import again before publishing.");
            }
            await this.store.mutate((state) => {
                const item = this.store.item(number, id, state);
                this.store.editable(item, state);
                if (item.revision !== preview.revision || item.queueId ||
                    item.evidence.hash !== preview.evidenceHash ||
                    this.store.report(number, state).sourceHash !== preview.sourceHash) {
                    throw new Error("Local triage changed. Preview again.");
                }
                item.publication = {
                    kind: preview.kind, status: "unconfirmed", marker: preview.marker,
                    body: preview.body, author, at: new Date().toISOString(), cycle: item.evidence.issue.closedAt,
                };
                item.revision = randomUUID();
            });
            // Persist intent before the write; a lost response must not cause another command.
            try {
                const comment = await this.github.post(id, preview.body);
                this.validateComment(comment, id, preview.body, author);
                await this.receipt(number, id, preview.marker, comment.html_url);
            } catch (error) {
                throw new Error(`Command not confirmed: ${error.message}. Use Reconcile; do not retry posting.`);
            }
            return this.store.snapshot();
        } finally {
            this.busy = false;
        }
    }
    validateComment(comment, id, body, author) {
        const pattern = new RegExp(`^https://github\\.com/${REPO}/issues/${id}#issuecomment-\\d+$`);
        if (!pattern.test(comment.html_url) || comment.body !== body || comment.user?.login !== author) {
            throw new Error("GitHub did not return the expected command, author, and original-issue comment URL.");
        }
    }
    receipt(number, id, marker, url) {
        return this.store.mutate((state) => {
            const item = this.store.item(number, id, state);
            if (item.publication?.marker !== marker) throw new Error("Publication changed; reconcile again.");
            item.publication = { ...item.publication, status: "posted", url };
            item.revision = randomUUID();
        });
    }
    async reconcile(number, id) {
        if (this.busy) throw new Error("Wait for the current publication to finish.");
        const intent = this.store.publication(id);
        if (!intent) throw new Error("No saved command intent to reconcile.");
        const matches = (await this.github.comments(id)).filter((comment) =>
            comment.body === intent.body && comment.user?.login === intent.author);
        if (matches.length !== 1) throw new Error(`Found ${matches.length} matching comments. Inspect GitHub manually; no command was retried.`);
        if (!await this.github.hasWritePermission(intent.author)) throw new Error("Cannot verify the command author's maintainer permission.");
        this.validateComment(matches[0], id, intent.body, intent.author);
        // The source report may no longer list this item; reconciliation only reads comments.
        return this.store.mutate((state) => {
            const current = this.store.publication(id, state);
            if (current?.marker !== intent.marker) throw new Error("Publication changed; reconcile again.");
            for (const report of Object.values(state.reports)) {
                for (const item of report.items.filter((item) => item.id === id && item.publication?.marker === intent.marker)) {
                    item.publication = { ...item.publication, status: "posted", url: matches[0].html_url };
                    item.revision = randomUUID();
                }
            }
        });
    }
    async followup(number, id) {
        if (this.busy) throw new Error("Wait for the current publication to finish.");
        const item = this.store.item(number, id);
        const revision = item.revision;
        const sourceHash = this.store.report(number).sourceHash;
        const intent = this.store.publication(id, this.store.state, item.evidence.issue.closedAt);
        if (intent?.kind !== "needs-changes" || intent.status !== "posted") {
            throw new Error("Only a confirmed needs-changes command can start a follow-up decision.");
        }
        const live = await this.github.preflight(number, item);
        if (digest(live.issue.body) !== this.store.report(number).sourceHash || live.evidence.reasons.length ||
            !live.evidence.issue.labels.includes("re-review-follow-up")) {
            throw new Error("Refresh the report and wait for the needs-changes workflow to add re-review-follow-up.");
        }
        return this.store.mutate((state) => {
            if (this.store.publication(id, state, item.evidence.issue.closedAt)?.marker !== intent.marker ||
                this.store.item(number, id, state).revision !== revision || this.store.report(number, state).sourceHash !== sourceHash) {
                throw new Error("Command state changed; reopen the card.");
            }
            for (const report of Object.values(state.reports)) {
                for (const row of report.items.filter((row) => row.id === id)) {
                    if (row.publication?.marker === intent.marker) {
                        row.history = [...(row.history ?? []), row.publication];
                        row.publication = null;
                    }
                    row.evidence = live.evidence;
                    row.fingerprint = fingerprint(row);
                    row.column = "unreviewed";
                    row.review = null;
                    row.queueId = null;
                    row.reason = "";
                    row.revision = randomUUID();
                }
            }
        });
    }
}
