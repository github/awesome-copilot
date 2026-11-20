import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
const resource = "499b84ac-1321-427f-aa17-267ca6975798";
export class AdoError extends Error {
    constructor(code, message) { super(message); this.code = code; }
}
export function orgName(value) {
    if (typeof value !== "string" || !/^https:\/\/dev\.azure\.com\/[A-Za-z0-9][A-Za-z0-9-]*\/?$/.test(value))
        throw new AdoError("invalid_scope", "Use an Azure DevOps Services organisation URL: https://dev.azure.com/your-organisation.");
    return new URL(value).pathname.split("/")[1];
}
export function guid(value) {
    if (typeof value !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value))
        throw new AdoError("invalid_id", "An Azure DevOps identity, project or repository GUID is required.");
    return value.toLowerCase();
}
export async function runAz(args) {
    try {
        if (process.platform !== "win32") return (await exec("az", args, { timeout: 45000, maxBuffer: 8e6 })).stdout;
        // Resolve the installed CLI, without relying on a host or workspace path.
        const { stdout } = await exec("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
            "(Get-Command az -ErrorAction Stop).Source"], { timeout: 10000 });
        const cli = stdout.trim();
        const { dirname, join } = await import("node:path");
        const python = join(dirname(dirname(cli)), "python.exe");
        return (await exec(python, ["-m", "azure.cli", ...args], { timeout: 45000, maxBuffer: 8e6 })).stdout;
    } catch {
        // CLI stderr can contain personal claims and must not enter browser responses or logs.
        throw new AdoError("authentication", "Azure CLI could not obtain access. Run az login with the organisation's tenant and Azure DevOps resource scope, then retry. See README.md.");
    }
}
export function createAdapter({ cli = runAz, fetcher = fetch } = {}) {
    let cached;
    async function token(tenant) {
        if (cached && cached.tenant === tenant && cached.until > Date.now()) return cached.value;
        const args = ["account", "get-access-token", "--resource", resource, "-o", "json"];
        if (tenant) args.push("--tenant", guid(tenant));
        const result = JSON.parse(await cli(args));
        if (!result.accessToken) throw new AdoError("authentication", "Azure CLI returned no Azure DevOps access token.");
        cached = { tenant, value: result.accessToken, until: Math.min(Date.now() + 240000, Number(result.expires_on) * 1000 - 60000) };
        return cached.value;
    }
    async function request(url, { tenant, method = "GET", body } = {}) {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:" || !["dev.azure.com", "vssps.dev.azure.com", "app.vssps.visualstudio.com"].includes(parsed.hostname))
            throw new AdoError("invalid_url", "Only official Azure DevOps API hosts are allowed.");
        let response;
        try {
            response = await fetcher(url, {
                method, redirect: "error", signal: AbortSignal.timeout(45000),
                headers: { Authorization: `Bearer ${await token(tenant)}`, Accept: "application/json", "Content-Type": "application/json" },
                ...(body ? { body: JSON.stringify(body) } : {}),
            });
        } catch (error) {
            if (error instanceof AdoError) throw error;
            throw new AdoError("network", "Azure DevOps request failed or timed out. Check connectivity and authentication.");
        }
        if (!response.ok) {
            if (response.status === 400 && parsed.pathname.endsWith("/wit/wiql")) {
                let failure;
                try { failure = await response.json(); } catch { failure = null; }
                if (failure?.typeKey === "WorkItemTrackingQueryResultSizeLimitExceededException" || failure?.typeKey === "QuerySizeLimitExceededException")
                    throw new AdoError("query_limit", "Azure DevOps WIQL exceeded its 20,000-result limit.");
            }
            throw new AdoError(response.status === 401 ? "authentication" : response.status === 403 ? "access" : "api",
                `Azure DevOps returned HTTP ${response.status} for ${parsed.pathname}. No data from this request is counted.`);
        }
        let data;
        try { data = await response.json(); } catch { throw new AdoError("authentication", "Azure DevOps did not return JSON. Sign in with the correct organisation identity."); }
        return { data, continuation: response.headers.get("x-ms-continuationtoken") };
    }
    const apiUrl = (org, project, route, params = {}, graph = false) => {
        const name = orgName(org);
        const u = new URL(`https://${graph ? "vssps.dev.azure.com" : "dev.azure.com"}/${name}/${project ? `${guid(project)}/` : ""}_apis/${route}`);
        u.searchParams.set("api-version", graph ? "7.1-preview.1" : "7.1");
        for (const [key, value] of Object.entries(params)) u.searchParams.set(key, String(value));
        return u.href;
    };
    async function list(url, tenant) {
        const values = [], seen = new Set();
        let next = url;
        while (next) {
            const { data, continuation } = await request(next, { tenant });
            if (!Array.isArray(data.value)) throw new AdoError("coverage", "An Azure DevOps list response has an unsupported shape.");
            values.push(...data.value);
            if (values.length > 100000) throw new AdoError("coverage", "List coverage exceeds 100,000 records. Narrow the scope.");
            if (continuation) {
                if (seen.has(continuation)) throw new AdoError("coverage", "Azure DevOps repeated a continuation token.");
                seen.add(continuation);
                const u = new URL(url); u.searchParams.set("continuationToken", continuation); next = u.href;
            } else next = null;
        }
        return values;
    }
    async function discover(tenant) {
        const organisations = [], errors = [];
        try {
            const { data: profile } = await request("https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1-preview.3", { tenant });
            const accounts = await list(`https://app.vssps.visualstudio.com/_apis/accounts?memberId=${guid(profile.id)}&api-version=7.1-preview.1`, tenant);
            for (const a of accounts) if (a.accountName) organisations.push({ url: `https://dev.azure.com/${a.accountName}`, name: a.accountName });
        } catch (e) { errors.push({ code: e.code || "discovery", message: e.message }); }
        try {
            const text = await cli(["devops", "configure", "--list"]);
            const configured = text.match(/organization\s*=\s*(https:\/\/dev\.azure\.com\/[A-Za-z0-9-]+)/)?.[1];
            if (configured && !organisations.length) {
                await request(apiUrl(configured, null, "connectionData"), { tenant });
                organisations.push({ url: configured, name: orgName(configured) });
            }
        } catch (e) { errors.push({ code: e.code || "discovery", message: "The configured Azure DevOps organisation could not be verified. Choose an accessible organisation or sign in with its tenant." }); }
        return { organisations, errors };
    }
    async function projects(org, tenant) {
        return (await list(apiUrl(org, null, "projects", { "$top": 100, stateFilter: "wellFormed" }), tenant)).map(p => ({ id: guid(p.id), name: p.name }));
    }
    async function repositories(org, project, tenant) {
        return (await list(apiUrl(org, project, "git/repositories"), tenant)).map(r => ({ id: guid(r.id), name: r.name, disabled: Boolean(r.isDisabled) }));
    }
    async function people(org, tenant) {
        const users = await list(apiUrl(org, null, "graph/users", {}, true), tenant);
        return users.filter(u => u.subjectKind === "user" && !u.isDeletedInOrigin).map(u => ({
            descriptor: u.descriptor, displayName: u.displayName, uniqueName: u.principalName || "", id: null,
        }));
    }
    async function resolvePerson(org, descriptor, tenant) {
        if (typeof descriptor !== "string" || !/^[A-Za-z0-9._-]{1,1024}$/.test(descriptor))
            throw new AdoError("invalid_identity", "Select an identity returned by the people picker.");
        const { data } = await request(apiUrl(org, null, `graph/storagekeys/${encodeURIComponent(descriptor)}`, {}, true), { tenant });
        return guid(data.value);
    }
    async function personDescriptor(org, id, tenant) {
        const url = apiUrl(org, null, `graph/descriptors/${guid(id)}`, {}, true);
        const parsed = new URL(url); parsed.searchParams.set("api-version", "7.1");
        const { data } = await request(parsed.href, { tenant });
        if (typeof data.value !== "string" || !/^[A-Za-z0-9._-]{1,1024}$/.test(data.value))
            throw new AdoError("identity", "Azure DevOps could not resolve the saved identity descriptor.");
        return data.value;
    }
    async function workItems(org, project, tenant) {
        const types = await list(apiUrl(org, project, "wit/workitemtypes"), tenant);
        const mappings = new Map(), clauses = [];
        const quote = text => `'${text.replaceAll("'", "''")}'`;
        for (const type of types) {
            const states = await list(apiUrl(org, project, `wit/workitemtypes/${encodeURIComponent(type.name)}/states`), tenant);
            for (const state of states) {
                if (!["Proposed", "InProgress", "Resolved", "Completed", "Removed"].includes(state.category))
                    throw new AdoError("state_mapping", `Unknown state category for ${type.name}. Work item coverage is unavailable.`);
                mappings.set(`${type.name}\0${state.name}`, state.category);
                if (!["Completed", "Removed"].includes(state.category))
                    clauses.push(`([System.WorkItemType] = ${quote(type.name)} AND [System.State] = ${quote(state.name)})`);
            }
        }
        const items = [], allIds = [];
        let asOf;
        async function queryRange(low, high) {
            const query = `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND (${clauses.length ? clauses.join(" OR ") : "[System.Id] = 0"}) AND [System.Id] >= ${low} AND [System.Id] <= ${high} ORDER BY [System.Id]${asOf ? ` ASOF '${asOf}'` : ""}`;
            let data;
            try { ({ data } = await request(apiUrl(org, project, "wit/wiql"), { tenant, method: "POST", body: { query } })); }
            catch (e) {
                if (e.code !== "query_limit") throw e;
                if (high - low < 20000) throw new AdoError("coverage", "WIQL exceeded its limit inside a bounded ID range.");
                const middle = Math.floor((low + high) / 2);
                await queryRange(low, middle); await queryRange(middle + 1, high); return;
            }
            if (!Array.isArray(data.workItems) || !data.asOf) throw new AdoError("coverage", "WIQL response is missing IDs or its snapshot time.");
            asOf ||= data.asOf;
            if (!/^[0-9T:Z.+-]+$/.test(asOf)) throw new AdoError("coverage", "WIQL returned an invalid snapshot time.");
            const ids = data.workItems.map(w => w.id);
            if (ids.some(id => !Number.isSafeInteger(id) || id < low || id > high) || new Set(ids).size !== ids.length)
                throw new AdoError("coverage", "WIQL returned duplicate IDs or records outside the requested range.");
            if (ids.length >= 20000 && high - low >= 20000) {
                const middle = Math.floor((low + high) / 2);
                await queryRange(low, middle); await queryRange(middle + 1, high); return;
            }
            allIds.push(...ids);
            if (allIds.length > 100000) throw new AdoError("coverage", "Work item coverage exceeds 100,000 readable records. Narrow the project scope.");
        }
        // $top is applied before some permission filtering. Untruncated, disjoint ID ranges avoid hidden gaps.
        await queryRange(1, 2147483647);
        for (let offset = 0; offset < allIds.length; offset += 200) {
            const ids = allIds.slice(offset, offset + 200);
            const { data: batch } = await request(apiUrl(org, project, "wit/workitemsbatch"), {
                tenant, method: "POST", body: { ids, asOf, fields: ["System.Id", "System.Title", "System.State", "System.WorkItemType", "System.AssignedTo"], errorPolicy: "Fail" },
            });
            if (!Array.isArray(batch.value) || batch.value.length !== ids.length || new Set(batch.value.map(w => w.id)).size !== ids.length || batch.value.some(w => !ids.includes(w.id)))
                throw new AdoError("coverage", "A work item batch was incomplete. No work items from this project are counted.");
            for (const w of batch.value) {
                const f = w.fields, category = mappings.get(`${f["System.WorkItemType"]}\0${f["System.State"]}`);
                if (!category) throw new AdoError("state_mapping", `No process mapping for work item ${w.id}. Refresh after checking the project's process.`);
                if (["Completed", "Removed"].includes(category)) continue;
                const assigned = f["System.AssignedTo"];
                if (assigned && (typeof assigned !== "object" || !assigned.id))
                    throw new AdoError("identity", `Work item ${w.id} has an unsupported AssignedTo identity. Names are not used as identity keys.`);
                items.push({ kind: "workItem", key: `${orgName(org)}:${project}:wi:${w.id}`, id: w.id,
                    title: f["System.Title"], state: f["System.State"], category, type: f["System.WorkItemType"],
                    owner: assigned || null, project, url: `${org}/${project}/_workitems/edit/${w.id}` });
            }
        }
        return { items, asOf };
    }
    async function pullRequests(org, project, repository, tenant) {
        const result = [], seen = new Set();
        let skip = 0;
        while (true) {
            const { data } = await request(apiUrl(org, project, `git/repositories/${guid(repository)}/pullrequests`,
                { "searchCriteria.status": "active", "$top": 100, "$skip": skip }), { tenant });
            if (!Array.isArray(data.value)) throw new AdoError("coverage", "Pull request response has an unsupported shape.");
            for (const p of data.value) {
                if (seen.has(p.pullRequestId)) throw new AdoError("coverage", "Pull request paging changed during refresh. Retry for complete coverage.");
                seen.add(p.pullRequestId);
                if (p.status !== "active") continue;
                if (!p.createdBy?.id) throw new AdoError("identity", "An active PR has no author identity.");
                const reviewers = await list(apiUrl(org, project, `git/repositories/${repository}/pullRequests/${p.pullRequestId}/reviewers`), tenant);
                if (reviewers.some(r => !r.id || ![0, 5, 10, -5, -10].includes(r.vote)))
                    throw new AdoError("review_state", "A reviewer has an unsupported identity or vote. PR coverage is unavailable.");
                result.push({ kind: "pr", key: `${orgName(org)}:${project}:${repository}:pr:${p.pullRequestId}`,
                    id: p.pullRequestId, title: p.title, author: p.createdBy, reviewers, draft: Boolean(p.isDraft),
                    project, repository, state: p.status, url: `${org}/${project}/_git/${repository}/pullrequest/${p.pullRequestId}` });
            }
            skip += data.value.length;
            if (skip > 100000) throw new AdoError("coverage", "PR coverage exceeds 100,000 records. Narrow the repository scope.");
            if (data.value.length < 100) break;
        }
        return result;
    }
    return { discover, projects, repositories, people, resolvePerson, personDescriptor, workItems, pullRequests };
}
