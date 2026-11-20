import { EXTERNAL_PLUGIN_ROOT_MANIFEST_PATHS, validateRelativePath } from "../../../scripts/external-plugins/external-plugin-validation.mjs";

const notFound = (error) => /\(HTTP 404\)/.test(error.message);
const encodedPath = (value) => value.split("/").map(encodeURIComponent).join("/");

export async function inspectUpstream(plugin, run) {
    const source = plugin.source;
    const errors = [];
    if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(source?.repo ?? "") ||
        [".", ".."].includes(source.repo.split("/")[1])) {
        return { status: "error", errors: ["Invalid upstream repository identity."] };
    }
    if (source.path !== undefined) validateRelativePath(source.path, "Upstream", errors);
    if (errors.length) return { status: "error", errors };
    const root = source.path && source.path !== "/" ? `${source.path}/` : "";
    const repo = source.repo;
    const api = async (suffix = "", raw = false) => JSON.parse(await run([
        "api", `repos/${repo}${suffix ? `/${suffix}` : ""}`,
        ...(raw ? ["-H", "Accept: application/vnd.github.raw"] : []),
    ]));
    const capture = async (label, work) => {
        try { return await work(); }
        catch (error) { errors.push(`${label}: ${error.message}`); return null; }
    };
    async function manifest(sha) {
        for (const candidate of EXTERNAL_PLUGIN_ROOT_MANIFEST_PATHS) {
            const file = `${root}${candidate}`;
            let value;
            try { value = await api(`contents/${encodedPath(file)}?ref=${encodeURIComponent(sha)}`, true); }
            catch (error) {
                if (notFound(error)) continue;
                throw error;
            }
            if (!value || Array.isArray(value) || typeof value !== "object" ||
                typeof value.name !== "string" || typeof value.version !== "string") {
                throw new Error(`Invalid plugin manifest at ${file}; expected string name and version.`);
            }
            return {
                path: file, name: value.name, version: value.version,
                matchesPlugin: value.name.toLowerCase() === plugin.name.toLowerCase(),
                url: `https://github.com/${repo}/blob/${encodeURIComponent(sha)}/${encodedPath(file)}`,
            };
        }
        throw new Error(`No recognized plugin manifest at ${root || "repository root"} for ${sha}.`);
    }
    async function snapshot(ref, locator = ref) {
        const commit = await api(`commits/${encodeURIComponent(locator)}`);
        if (!/^[a-f0-9]{40}$/i.test(commit.sha ?? "")) throw new Error("GitHub returned no valid commit SHA.");
        const sha = commit.sha;
        const value = await capture(`Manifest at ${ref}`, () => manifest(sha));
        return { ref, sha, manifest: value };
    }
    const repository = await capture("Repository", () => api());
    if (!repository) return { status: "error", errors };
    const release = await capture("Latest stable release", async () => {
        let value;
        try { value = await api("releases/latest"); }
        catch (error) { if (notFound(error)) return null; throw error; }
        if (value.draft || value.prerelease || typeof value.tag_name !== "string" || !value.tag_name) {
            throw new Error("GitHub returned an invalid latest stable release.");
        }
        return {
            tag: value.tag_name, name: value.name, publishedAt: value.published_at,
            url: `https://github.com/${repo}/releases/tag/${encodeURIComponent(value.tag_name)}`,
            notes: String(value.body ?? "").slice(0, 8000), notesTruncated: String(value.body ?? "").length > 8000,
        };
    });
    const stable = release ? await capture("Release source", () => snapshot(release.tag, `refs/tags/${release.tag}`)) : null;
    const head = await capture("Default branch", async () => {
        if (typeof repository.default_branch !== "string" || !repository.default_branch) throw new Error("No default branch returned.");
        return snapshot(repository.default_branch, `refs/heads/${repository.default_branch}`);
    });
    const base = source.sha || source.ref;
    const comparisons = [];
    for (const [label, target] of [["Latest stable release", stable], ["Default branch (may be unreleased)", head]]) {
        if (!target) continue;
        const result = await capture(`Comparison to ${label}`, async () => {
            if (typeof base !== "string" || !base) throw new Error("The catalog has no pinned ref or SHA.");
            const value = await api(`compare/${encodeURIComponent(base)}...${target.sha}?per_page=1`);
            if (!Array.isArray(value.files) || typeof value.status !== "string" ||
                !Number.isSafeInteger(value.ahead_by) || !Number.isSafeInteger(value.behind_by)) {
                throw new Error("GitHub returned an incomplete comparison.");
            }
            const relevant = value.files.filter((file) => !root || file.filename?.startsWith(root) ||
                file.previous_filename?.startsWith(root));
            return {
                label, base, head: target.sha, status: value.status, aheadBy: value.ahead_by, behindBy: value.behind_by,
                url: `https://github.com/${repo}/compare/${encodeURIComponent(base)}...${target.sha}`,
                files: relevant.slice(0, 40).map((file) => ({ path: file.filename, previousPath: file.previous_filename, status: file.status })),
                filesTruncated: relevant.length > 40 || value.files.length >= 300,
            };
        });
        if (result) comparisons.push(result);
    }
    return {
        status: errors.length ? "partial" : "ok", repo, defaultBranch: repository.default_branch,
        release, stable, head, comparisons, errors,
    };
}
