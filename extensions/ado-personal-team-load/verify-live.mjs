import assert from "node:assert/strict";
import { runAz, guid, orgName } from "./adapter.mjs";
const origin = new URL(process.argv[2] || "");
assert.equal(origin.hostname, "127.0.0.1");
assert.equal(origin.protocol, "http:");
const html = await (await fetch(origin)).text();
const key = html.match(/name="canvas-key" content="([a-f0-9]{64})"/)?.[1];
assert.ok(key, "Canvas must serve its same-origin action key.");
const response = await fetch(new URL("/api/action", origin), {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin.origin, "X-Canvas-Key": key },
    body: JSON.stringify({ name: "get_state", input: {} }),
});
const { result: state, error } = await response.json();
assert.ok(!error && state?.complete, "Refresh the live panel to complete API-visible coverage first.");
const c = state.config, name = orgName(c.organisation);
const args = ["account", "get-access-token", "--resource", "499b84ac-1321-427f-aa17-267ca6975798", "-o", "json"];
if (c.tenant) args.push("--tenant", guid(c.tenant));
const { accessToken } = JSON.parse(await runAz(args));
async function api(project, route, params = {}, body) {
    const u = new URL(`https://dev.azure.com/${name}/${guid(project)}/_apis/${route}`);
    u.searchParams.set("api-version", "7.1");
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
    const r = await fetch(u, { method: body ? "POST" : "GET", redirect: "error", signal: AbortSignal.timeout(45000),
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!r.ok) {
        const failure = await r.json();
        if (failure.typeKey === "WorkItemTrackingQueryResultSizeLimitExceededException") throw new Error("query-limit");
        assert.fail(`Independent source HTTP ${r.status}`);
    }
    return r.json();
}
const owned = new Map(c.people.map(id => [id, new Set()]));
let openWorkItems = 0, unassigned = 0, activePRs = 0;
for (const project of c.projects) {
    const categories = new Map();
    const types = await api(project, "wit/workitemtypes");
    for (const type of types.value) {
        const states = await api(project, `wit/workitemtypes/${encodeURIComponent(type.name)}/states`);
        states.value.forEach(s => categories.set(`${type.name}\0${s.name}`, s.category));
    }
    let snapshot;
    const allIds = [];
    async function range(low, high) {
        // Independent query deliberately reads every state, including terminal states.
        let q;
        try { q = await api(project, "wit/wiql", {}, { query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.Id] >= ${low} AND [System.Id] <= ${high} ORDER BY [System.Id]${snapshot ? ` ASOF '${snapshot}'` : ""}` }); }
        catch (e) {
            if (e.message !== "query-limit") throw e;
            assert.ok(high - low >= 20000);
            const midpoint = Math.floor((low + high) / 2);
            await range(low, midpoint); await range(midpoint + 1, high); return;
        }
        snapshot ||= q.asOf;
        assert.match(snapshot, /^[0-9T:Z.+-]+$/);
        const ids = q.workItems.map(w => w.id);
        assert.ok(ids.every(id => Number.isSafeInteger(id) && id >= low && id <= high));
        assert.equal(new Set(ids).size, ids.length);
        allIds.push(...ids); assert.ok(allIds.length <= 100000, "Independent verifier supports 100,000 readable work items.");
    }
    await range(1, 2147483647);
    for (let offset = 0; offset < allIds.length; offset += 200) {
        const ids = allIds.slice(offset, offset + 200);
        const b = await api(project, "wit/workitemsbatch", {}, { ids, asOf: snapshot, fields: ["System.Id", "System.State", "System.WorkItemType", "System.AssignedTo"], errorPolicy: "Fail" });
        assert.equal(b.value.length, ids.length);
        for (const w of b.value) {
            const f = w.fields, category = categories.get(`${f["System.WorkItemType"]}\0${f["System.State"]}`);
            assert.ok(["Proposed", "InProgress", "Resolved", "Completed", "Removed"].includes(category));
            if (["Completed", "Removed"].includes(category)) continue;
            openWorkItems++;
            if (!f["System.AssignedTo"]) unassigned++;
            else owned.get(f["System.AssignedTo"].id)?.add(`${name}:${project}:wi:${w.id}`);
        }
    }
    const repositories = await api(project, "git/repositories");
    for (const repo of repositories.value.filter(r => !c.repositories.length || c.repositories.includes(r.id))) {
        let skip = 0;
        while (true) {
            const p = await api(project, `git/repositories/${repo.id}/pullrequests`, { "searchCriteria.status": "active", "$top": 100, "$skip": skip });
            for (const pr of p.value) {
                if (pr.status !== "active") continue;
                activePRs++;
                const record = `${name}:${project}:${repo.id}:pr:${pr.pullRequestId}`;
                owned.get(pr.createdBy.id)?.add(record);
                const reviewers = await api(project, `git/repositories/${repo.id}/pullRequests/${pr.pullRequestId}/reviewers`);
                for (const r of reviewers.value) if (r.vote === 0 && !r.isContainer && !r.hasDeclined && !r.isDeletedInOrigin && !r.inactive) owned.get(r.id)?.add(record);
            }
            skip += p.value.length;
            if (p.value.length < 100) break;
        }
    }
}
assert.equal(state.sourceCounts.openWorkItems, openWorkItems);
assert.equal(state.sourceCounts.activePRs, activePRs);
assert.equal(state.unassigned.length, unassigned);
for (const person of state.people) assert.equal(person.total, owned.get(person.id).size, `Open work mismatch for identity ${person.id}`);
console.log(JSON.stringify({ verifiedAt: new Date().toISOString(), organisation: c.organisation, projects: c.projects, repositories: c.repositories,
    lastSuccessfulRefresh: state.lastSuccessfulRefresh, openWorkItems, activePRs, unassigned,
    people: state.people.map(p => ({ id: p.id, displayedOpenWork: p.total, sourceOpenWork: owned.get(p.id).size })) }, null, 2));
