import { AdoError, guid, orgName } from "./adapter.mjs";
export const defaults = { organisation: "", tenant: "", projects: [], repositories: [], people: [], threshold: 6, refreshSeconds: 300 };
export function validateConfig(input) {
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(k => !(k in defaults)))
        throw new AdoError("invalid_config", "Unsupported configuration fields.");
    const c = { ...defaults, ...input };
    if (c.organisation) c.organisation = `https://dev.azure.com/${orgName(c.organisation)}`;
    if (c.tenant) c.tenant = guid(c.tenant);
    if (!Number.isInteger(c.threshold) || c.threshold < 1 || c.threshold > 1000 ||
        !Number.isInteger(c.refreshSeconds) || c.refreshSeconds < 60 || c.refreshSeconds > 86400)
        throw new AdoError("invalid_config", "Threshold must be 1 to 1000 and refresh interval 60 to 86400 seconds.");
    for (const k of ["projects", "repositories", "people"]) {
        if (!Array.isArray(c[k]) || c[k].length > (k === "people" ? 100 : 30) || new Set(c[k]).size !== c[k].length)
            throw new AdoError("invalid_config", `${k} must be a unique list within the documented scope limit.`);
        c[k] = c[k].map(guid);
        if (new Set(c[k]).size !== c[k].length) throw new AdoError("invalid_config", `${k} contains duplicate identity GUIDs.`);
    }
    if (!c.organisation && (c.projects.length || c.repositories.length || c.people.length))
        throw new AdoError("invalid_config", "Choose an organisation before projects, repositories or people.");
    return c;
}
export function pendingReview(r) {
    return !r.isContainer && !r.hasDeclined && !r.isDeletedInOrigin && !r.inactive && r.vote === 0;
}
export function computeLoad(workItems, prs, selected, threshold) {
    const identities = new Map();
    function addIdentity(p) {
        if (!p?.id) return;
        const id = guid(p.id);
        identities.set(id, { id, displayName: p.displayName || id, uniqueName: p.uniqueName || "", descriptor: p.descriptor || "" });
    }
    for (const w of workItems) addIdentity(w.owner);
    for (const p of prs) { addIdentity(p.author); p.reviewers.forEach(addIdentity); }
    const rows = new Map(selected.map(id => [id, { ...(identities.get(id) || { id, displayName: id, uniqueName: "" }), workItems: [], prs: [], reviews: [], total: 0 }]));
    const unassigned = [];
    for (const w of workItems) {
        if (["Completed", "Removed"].includes(w.category)) continue;
        if (!w.owner) unassigned.push(w);
        else rows.get(guid(w.owner.id))?.workItems.push(w);
    }
    for (const p of prs) {
        if (p.state !== "active") continue;
        const author = rows.get(guid(p.author.id));
        author?.prs.push(p);
        const reviewers = new Set();
        for (const r of p.reviewers) if (pendingReview(r)) reviewers.add(guid(r.id));
        for (const id of reviewers) rows.get(id)?.reviews.push(p);
    }
    for (const row of rows.values()) {
        row.total = new Set([...row.workItems, ...row.prs, ...row.reviews].map(w => w.key)).size;
        row.label = row.total > threshold ? `${row.total - threshold} over threshold` : row.total === threshold ? "At threshold" : `${threshold - row.total} below threshold`;
    }
    return { people: [...rows.values()].sort((a, b) => b.total - a.total || a.id.localeCompare(b.id)), unassigned, identities: [...identities.values()] };
}
