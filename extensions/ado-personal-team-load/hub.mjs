import { mkdir, readFile, writeFile, rename, unlink, open } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { AdoError, createAdapter } from "./adapter.mjs";
import { validateConfig, computeLoad, defaults } from "./model.mjs";
export const canvasId = "ado-personal-team-load";
export const copilotHome = process.env.COPILOT_HOME || join(homedir(), ".copilot");
export const dataDirectory = join(copilotHome, "extension-data", canvasId);
const digest = text => createHash("sha256").update(text).digest("hex");
export function profileId(value = "personal") {
    if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(value))
        throw new AdoError("invalid_profile", "Profile must contain 1 to 64 letters, numbers, underscores or hyphens.");
    return value.toLowerCase();
}
export function createStore(profile, directory = dataDirectory) {
    const file = join(directory, `${profileId(profile)}.json`);
    async function read() {
        let text;
        try { text = await readFile(file, "utf8"); }
        catch (e) { if (e.code === "ENOENT") return { config: validateConfig(defaults), revision: "new" }; throw new AdoError("storage", "Cannot read private canvas configuration."); }
        let data;
        try { data = JSON.parse(text); } catch { throw new AdoError("storage", "Private configuration is corrupt. Back it up and repair it; it has not been overwritten."); }
        if (data.format !== canvasId || data.version !== 1 || !data.config)
            throw new AdoError("storage", "Unrecognised private configuration format or version.");
        return { config: validateConfig(data.config), revision: digest(text) };
    }
    async function save(config, expectedRevision) {
        const temp = `${file}.${randomUUID()}.tmp`, lock = `${file}.lock`;
        let handle, tempWritten = false;
        try {
            await mkdir(directory, { recursive: true });
            try { handle = await open(lock, "wx"); }
            catch (e) { if (e.code === "EEXIST") throw new AdoError("conflict", "Another host is saving this profile. Reload before retrying."); throw e; }
            if ((await read()).revision !== expectedRevision) throw new AdoError("conflict", "This profile changed in another panel or host. Reload before saving.");
            const text = JSON.stringify({ format: canvasId, version: 1, config: validateConfig(config) }, null, 2);
            await writeFile(temp, text, { mode: 0o600, flag: "wx" }); tempWritten = true;
            await rename(temp, file); tempWritten = false;
            return { config: validateConfig(config), revision: digest(text) };
        } catch (e) { if (e instanceof AdoError) throw e; throw new AdoError("storage", "Cannot save private canvas configuration."); }
        finally {
            if (handle) { await handle.close(); await unlink(lock); }
            if (tempWritten) await unlink(temp);
        }
    }
    return { read, save };
}
export function createHub(profile, { adapter = createAdapter(), store = createStore(profile) } = {}) {
    let record, snapshot = null, inFlight = null, catalog = { organisations: [], projects: [], repositories: [], people: [], errors: [] };
    let lastAttempt = null, lastComplete = null, refreshErrors = [];
    async function load() {
        const next = await store.read();
        if (record && record.revision !== next.revision) { snapshot = null; lastComplete = null; catalog = { organisations: [], projects: [], repositories: [], people: [], errors: [] }; refreshErrors = []; }
        record = next;
    }
    function state() {
        const c = record.config;
        const result = snapshot?.result || { people: [], unassigned: [], identities: [] };
        const people = result.people.map(row => {
            const known = catalog.people.find(p => p.id === row.id);
            return known ? { ...row, displayName: known.displayName, uniqueName: known.uniqueName } : row;
        });
        const stale = Boolean(snapshot && (Date.now() - Date.parse(snapshot.at) > c.refreshSeconds * 1000 || snapshot.retained));
        return { profile, config: c, revision: record.revision, catalog, ...result, people,
            lastAttempt, lastSuccessfulRefresh: lastComplete,
            lastDataRefresh: snapshot?.at || null, stale, refreshing: Boolean(inFlight),
            coverage: snapshot?.coverage || [], errors: refreshErrors, complete: Boolean(snapshot?.complete),
            sourceCounts: snapshot?.counts || null };
    }
    async function discover(input) {
        const c = record.config;
        const org = input.organisation ?? c.organisation, tenant = input.tenant ?? c.tenant;
        const discovery = await adapter.discover(tenant);
        catalog = { ...catalog, organisations: discovery.organisations, errors: discovery.errors };
        if (org) {
            const projects = await adapter.projects(org, tenant);
            if (!catalog.organisations.some(o => o.url.toLowerCase() === org.toLowerCase()))
                catalog.organisations.push({ url: org, name: new URL(org).pathname.slice(1) });
            const requestedProjects = input.projects ?? (org === c.organisation ? c.projects : []);
            if (requestedProjects.some(id => !projects.some(p => p.id === id))) throw new AdoError("access", "A selected project is no longer accessible.");
            const repositories = [];
            for (const id of requestedProjects) {
                for (const r of await adapter.repositories(org, id, tenant)) repositories.push({ ...r, project: id });
            }
            const observed = org === c.organisation ? (snapshot?.result.identities || []) : [];
            let people = observed;
            try {
                people = await adapter.people(org, tenant);
                for (const p of observed) {
                    const existing = people.find(x => x.descriptor && x.descriptor === p.descriptor);
                    if (existing) existing.id = p.id;
                    else people.push(p);
                }
            }
            catch (e) { catalog.errors.push({ code: e.code || "directory", message: `People directory unavailable. The picker includes observed work identities only. ${e.message}` }); }
            catalog = { ...catalog, organisation: org, tenant, projects, repositories, people };
        }
        return state();
    }
    async function refresh() {
        if (inFlight) { await inFlight; return state(); }
        const c = structuredClone(record.config), revision = record.revision;
        if (!c.organisation || !c.projects.length) throw new AdoError("scope_required", "Choose an organisation and at least one project before refreshing.");
        lastAttempt = new Date().toISOString();
        inFlight = (async () => {
            const workItems = [], prs = [], coverage = [], errors = [], times = [];
            let knownRepos = [];
            for (const project of c.projects) {
                try {
                    const w = await adapter.workItems(c.organisation, project, c.tenant);
                    workItems.push(...w.items); times.push(w.asOf);
                    coverage.push({ project, kind: "workItems", status: "complete", count: w.items.length, asOf: w.asOf });
                } catch (e) { errors.push({ code: e.code || "api", message: e.message }); coverage.push({ project, kind: "workItems", status: "failed" }); }
                try {
                    const repos = await adapter.repositories(c.organisation, project, c.tenant);
                    knownRepos.push(...repos.map(r => ({ ...r, project })));
                    for (const repo of repos.filter(r => !c.repositories.length || c.repositories.includes(r.id))) {
                        try {
                            if (repo.disabled) throw new AdoError("access", `Repository ${repo.name} is disabled.`);
                            const p = await adapter.pullRequests(c.organisation, project, repo.id, c.tenant);
                            prs.push(...p); coverage.push({ project, repository: repo.id, kind: "prs", status: "complete", count: p.length });
                        } catch (e) { errors.push({ code: e.code || "api", message: e.message }); coverage.push({ project, repository: repo.id, kind: "prs", status: "failed" }); }
                    }
                } catch (e) { errors.push({ code: e.code || "api", message: e.message }); coverage.push({ project, kind: "repositories", status: "failed" }); }
            }
            for (const id of c.repositories) if (!knownRepos.some(r => r.id === id)) {
                errors.push({ code: "access", message: `Selected repository ${id} was not returned by the accessible project catalog.` });
                coverage.push({ repository: id, kind: "prs", status: "failed" });
            }
            const result = computeLoad(workItems, prs, c.people, c.threshold);
            const groups = prs.reduce((n, p) => n + p.reviewers.filter(r => r.isContainer).length, 0);
            if (groups) coverage.push({ kind: "groupReviews", status: "excluded", count: groups, note: "Group reviews are not expanded into individual reviewers." });
            await load();
            if (record.revision !== revision) throw new AdoError("conflict", "Scope changed during refresh. Refresh the new scope.");
            refreshErrors = errors;
            // Keep an earlier complete snapshot on failure, with an explicit stale marker.
            if (!errors.length || !snapshot) {
                snapshot = { at: new Date().toISOString(), complete: !errors.length, coverage, result,
                    counts: { openWorkItems: workItems.length, activePRs: prs.length, unassigned: result.unassigned.length, workItemSnapshots: times } };
            } else snapshot = { ...snapshot, coverage, complete: false, retained: true };
            if (!errors.length) lastComplete = snapshot.at;
            catalog.repositories = knownRepos;
            for (const p of result.identities) if (!catalog.people.some(x => x.id === p.id || (x.descriptor && x.descriptor === p.descriptor))) catalog.people.push(p);
        })();
        try { await inFlight; } finally { inFlight = null; }
        return state();
    }
    async function perform(name, input = {}) {
        await load();
        if (!input || typeof input !== "object" || Array.isArray(input)) throw new AdoError("invalid_input", "Action input must be an object.");
        if (name === "get_state") return state();
        if (name === "discover") return discover(input);
        if (name === "refresh") return refresh();
        if (name === "set_tracking") {
            if (typeof input.revision !== "string") throw new AdoError("conflict", "Read state first and supply its revision.");
            const c = validateConfig(input.config);
            if (c.organisation) {
                await discover({ organisation: c.organisation, tenant: c.tenant, projects: c.projects });
                if (c.repositories.some(id => !catalog.repositories.some(r => r.id === id))) throw new AdoError("access", "Select repositories from the accessible project catalog.");
                for (const id of c.people) {
                    let person = catalog.people.find(p => p.id === id);
                    if (!person) {
                        let descriptor = input.descriptors?.[id];
                        if (!descriptor && c.organisation === record.config.organisation && c.tenant === record.config.tenant && record.config.people.includes(id))
                            descriptor = await adapter.personDescriptor(c.organisation, id, c.tenant);
                        person = descriptor ? catalog.people.find(p => p.descriptor === descriptor) : null;
                        if (person && await adapter.resolvePerson(c.organisation, descriptor, c.tenant) === id) person.id = id;
                        else person = null;
                    }
                    if (!person) throw new AdoError("identity", "Select actual identities from the people picker or refresh to discover owners and reviewers.");
                }
            }
            record = await store.save(c, input.revision); snapshot = null; lastComplete = null; refreshErrors = [];
            return state();
        }
        if (name === "resolve_people") {
            if (!Array.isArray(input.descriptors) || input.descriptors.length > 100 || input.descriptors.some(d => !catalog.people.some(p => p.descriptor === d)))
                throw new AdoError("identity", "Choose up to 100 identities from the current people catalog.");
            const org = catalog.organisation, tenant = catalog.tenant;
            for (const descriptor of input.descriptors) {
                const p = catalog.people.find(p => p.descriptor === descriptor);
                p.id = await adapter.resolvePerson(org, descriptor, tenant);
            }
            return state();
        }
        throw new AdoError("unknown_action", "Unknown canvas action.");
    }
    let queue = Promise.resolve();
    return { perform(name, input) {
        const result = queue.then(() => perform(name, input));
        // The caller receives the rejection; the queue must still accept the next action.
        queue = result.then(() => undefined, () => undefined);
        return result;
    } };
}
