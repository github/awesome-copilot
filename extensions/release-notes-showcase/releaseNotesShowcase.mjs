import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CanvasError, createCanvas } from "@github/copilot-sdk/extension";

const servers = new Map();

const CANVAS_ID = "release-notes-showcase";
const CANVAS_TITLE = "Release Notes Showcase";

const releaseNotesInputSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        releaseName: { type: "string" },
        version: { type: "string" },
        releaseDate: { type: "string" },
        tagline: { type: "string" },
        summary: { type: "string" },
        emailSubject: { type: "string" },
        emailPreheader: { type: "string" },
        heroStats: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    label: { type: "string" },
                    value: { type: "string" },
                },
                required: ["label", "value"],
            },
        },
        sections: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    title: { type: "string" },
                    kind: {
                        type: "string",
                        enum: ["feature", "improvement", "quality"],
                    },
                    summary: { type: "string" },
                    metric: { type: "string" },
                    bullets: {
                        type: "array",
                        items: { type: "string" },
                    },
                },
                required: ["title", "summary"],
            },
        },
        contributors: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    name: { type: "string" },
                    githubHandle: { type: "string" },
                    avatarUrl: { type: "string" },
                    profileUrl: { type: "string" },
                    area: { type: "string" },
                    summary: { type: "string" },
                },
                required: ["name"],
            },
        },
        communityThanks: {
            type: "array",
            items: { type: "string" },
        },
        otherChanges: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    label: { type: "string" },
                    text: { type: "string" },
                },
                required: ["text"],
            },
        },
        callToAction: {
            type: "object",
            additionalProperties: false,
            properties: {
                label: { type: "string" },
                url: { type: "string" },
            },
            required: ["label", "url"],
        },
    },
};

const exportInputSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        format: {
            type: "string",
            enum: ["html", "text", "both"],
        },
    },
};

let repositoryContext = resolveRepositoryContext("", "");
let sampleRelease = Object.freeze(buildDefaultRelease(repositoryContext));

function buildDefaultRelease(context) {
    const releaseName = context.displayName;
    const version = "vNext";
    const releaseDate = new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
    }).format(new Date());

    return {
        releaseName,
        version,
        releaseDate,
        tagline: `No release data loaded yet for ${releaseName}.`,
        summary:
            "Use Release source to load a tag or draft unreleased changes from repository history.",
        emailSubject: `${releaseName} ${version} - release highlights`,
        emailPreheader: `Release draft for ${releaseName}.`,
        heroStats: [
            { label: "Commits", value: "00" },
            { label: "Merged PRs", value: "00" },
            { label: "Closed issues", value: "00" },
            { label: "Repository", value: context.repoSlug },
        ],
        sections: [],
        contributors: [],
        communityThanks: [],
        otherChanges: [],
        callToAction: {
            label: "View repository",
            url: context.repoUrl,
        },
    };
}

function resolveRepositoryContext(preferredWorkingDirectory, sessionId) {
    const extensionDir = dirname(fileURLToPath(import.meta.url));
    const sessionWorkingDirectory = readSessionWorkingDirectoryFromMetadata(sessionId);
    const repoRoot =
        findRepositoryRoot(preferredWorkingDirectory ?? "") ||
        findRepositoryRoot(sessionWorkingDirectory) ||
        findRepositoryRoot(process.cwd()) ||
        findRepositoryRoot(extensionDir);
    const repoName = repoRoot ? basename(repoRoot) : "current-repository";
    const remoteUrl = repoRoot ? readRemoteOrigin(repoRoot) : "";
    const parsed = parseRepositorySlug(remoteUrl);
    const repoSlug = parsed ?? repoName;
    const slugLeaf = repoSlug.split("/").at(-1) || repoName;
    const displayName = humanizeRepoName(slugLeaf);
    const repoUrl = parsed ? `https://github.com/${parsed}` : "https://github.com/";

    return {
        repoRoot,
        repoSlug,
        displayName,
        repoUrl,
    };
}

function findRepositoryRoot(startPath) {
    if (!startPath) {
        return "";
    }

    let current = startPath;

    while (true) {
        if (existsSync(join(current, ".git"))) {
            return current;
        }

        const parent = dirname(current);
        if (parent === current) {
            return "";
        }

        current = parent;
    }
}

function readRemoteOrigin(repoRoot) {
    const result = spawnSync("git", ["-C", repoRoot, "config", "--get", "remote.origin.url"], {
        encoding: "utf8",
    });

    if (result.status !== 0 || typeof result.stdout !== "string") {
        return "";
    }

    return result.stdout.trim();
}

function parseRepositorySlug(remoteUrl) {
    if (!remoteUrl) {
        return "";
    }

    const httpsMatch = remoteUrl.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/i);
    if (httpsMatch?.[1]) {
        return httpsMatch[1];
    }

    const sshMatch = remoteUrl.match(/github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i);
    if (sshMatch?.[1]) {
        return sshMatch[1];
    }

    return "";
}

function humanizeRepoName(value) {
    return value
        .replace(/[-_]+/g, " ")
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readSessionWorkingDirectoryFromMetadata(sessionId) {
    const resolvedSessionId =
        pickString(sessionId, "") ||
        pickString(process.env.SESSION_ID, "") ||
        pickString(process.env.COPILOT_AGENT_SESSION_ID, "");
    if (!resolvedSessionId) {
        return "";
    }

    const metadataPath = join(
        homedir(),
        ".copilot",
        "session-state",
        resolvedSessionId,
        "vscode.metadata.json",
    );
    const workspacePath = join(
        homedir(),
        ".copilot",
        "session-state",
        resolvedSessionId,
        "workspace.yaml",
    );

    const candidatePaths = [metadataPath, workspacePath];
    for (const path of candidatePaths) {
        if (!existsSync(path)) {
            continue;
        }

        let text = "";
        try {
            text = readFileSync(path, "utf8");
        } catch {
            continue;
        }

        const match = text.match(/^cwd:\s*(.+)$/m);
        if (match?.[1]?.trim()) {
            return match[1].trim();
        }
    }

    return "";
}

function runGit(repoRoot, args) {
    if (!repoRoot) {
        return "";
    }

    const result = spawnSync("git", ["-C", repoRoot, ...args], {
        encoding: "utf8",
    });

    if (result.status !== 0 || typeof result.stdout !== "string") {
        return "";
    }

    return result.stdout.trim();
}

function listReleaseTags(repoRoot) {
    const output = runGit(repoRoot, ["tag", "--sort=-creatordate"]);
    if (!output) {
        return [];
    }

    return output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function readTagDate(repoRoot, tag) {
    const output = runGit(repoRoot, ["log", "-1", "--date=short", "--format=%ad", tag]);
    return output || "";
}

function readCommitSummaries(repoRoot, rangeExpr) {
    const output = runGit(repoRoot, [
        "log",
        "--max-count=250",
        "--pretty=format:%s%x1f%an",
        rangeExpr,
    ]);
    if (!output) {
        return [];
    }

    return output
        .split(/\r?\n/)
        .map((line) => line.split("\x1f"))
        .filter((parts) => parts.length >= 2)
        .map(([subject, author]) => ({
            subject: cleanCommitSubject(subject),
            author: pickString(author, "Contributor"),
        }))
        .filter((entry) => entry.subject);
}

function cleanCommitSubject(value) {
    return pickString(value, "")
        .replace(/^\w+(\([^)]+\))?!?:\s*/i, "")
        .replace(/\s+\(#\d+\)\s*$/u, "")
        .trim();
}

function classifyCommit(subject) {
    const lower = subject.toLowerCase();
    if (/^(feat|feature)\b/.test(lower) || /add|introduce|support|new/.test(lower)) {
        return "feature";
    }

    if (/^(fix|perf|refactor)\b/.test(lower) || /improv|stabil|reliab|optim/.test(lower)) {
        return "improvement";
    }

    return "quality";
}

function toReleaseStateFromCommits(context, commits, options) {
    const releaseName = context.displayName;
    const version = options.version;
    const releaseDate = options.releaseDate;
    const commitCount = commits.length;
    const mergedPulls = Array.isArray(options.mergedPulls) ? options.mergedPulls : [];
    const closedIssues = Array.isArray(options.closedIssues) ? options.closedIssues : [];

    if (commitCount === 0) {
        const emptyState = buildDefaultRelease(context);
        return {
            ...emptyState,
            releaseName,
            version,
            releaseDate,
            tagline: `No commit changes were detected for ${options.rangeLabel}.`,
            summary: `There are no commits in ${options.rangeLabel}, so this draft starts from the repository template.`,
            emailSubject: `${releaseName} ${version} - release highlights`,
            emailPreheader: `No commit changes detected for ${options.rangeLabel}.`,
            callToAction: {
                label: options.callToActionLabel,
                url: options.callToActionUrl,
            },
        };
    }

    const buckets = {
        feature: [],
        improvement: [],
        quality: [],
    };

    const contributorCounts = new Map();
    for (const commit of commits) {
        const kind = classifyCommit(commit.subject);
        buckets[kind].push(commit.subject);
        contributorCounts.set(commit.author, (contributorCounts.get(commit.author) ?? 0) + 1);
    }

    const sections = [];
    if (mergedPulls.length > 0) {
        sections.push({
            title: "Merged pull requests",
            kind: "feature",
            summary: `Pull requests merged since ${options.sinceLabel}.`,
            metric: `${mergedPulls.length} merged`,
            bullets: mergedPulls.slice(0, 6).map((pull) => `#${pull.number} ${pull.title}`),
        });
    }
    for (const kind of ["feature", "improvement", "quality"]) {
        const entries = buckets[kind];
        if (entries.length === 0) {
            continue;
        }

        const kindTitle =
            kind === "feature"
                ? "Feature work shipped"
                : kind === "improvement"
                  ? "Improvements and fixes"
                  : "Quality and maintenance updates";
        const kindSummary =
            kind === "feature"
                ? "New capabilities and user-facing improvements landed in this release."
                : kind === "improvement"
                  ? "Stability, performance, and reliability updates were delivered."
                  : "Foundational cleanup and maintenance work strengthened the codebase.";

        sections.push({
            title: kindTitle,
            kind,
            summary: kindSummary,
            metric: `${entries.length} commits`,
            bullets: entries.slice(0, 6),
        });
    }

    const sortedContributors = [...contributorCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 6);

    const contributors = sortedContributors.map(([name, count]) => ({
        name,
        githubHandle: "",
        avatarUrl: "",
        profileUrl: context.repoUrl,
        area: count === 1 ? "1 commit" : `${count} commits`,
        summary: `Contributed ${count} change${count === 1 ? "" : "s"} in ${options.rangeLabel}.`,
    }));

    const otherChanges = commits.slice(0, 7).map((commit) => ({
        label: classifyCommit(commit.subject),
        text: commit.subject,
    }));
    if (closedIssues.length > 0) {
        otherChanges.unshift(
            ...closedIssues.slice(0, 6).map((issue) => ({
                label: `Issue #${issue.number}`,
                text: issue.title,
            })),
        );
    }

    const featureCount = buckets.feature.length;

    return {
        releaseName,
        version,
        releaseDate,
        tagline: `${commitCount} commits, ${mergedPulls.length} merged PRs, and ${closedIssues.length} closed issues since ${options.sinceLabel}.`,
        summary: `This draft combines git history with merged pull requests and closed issues since ${options.sinceLabel}.`,
        emailSubject: `${releaseName} ${version} - release highlights`,
        emailPreheader: `${commitCount} commits, ${mergedPulls.length} merged PRs, and ${closedIssues.length} closed issues summarized from ${options.rangeLabel}.`,
        heroStats: [
            { label: "Commits", value: padCount(commitCount) },
            { label: "Merged PRs", value: padCount(mergedPulls.length) },
            { label: "Closed issues", value: padCount(closedIssues.length) },
            { label: "Features", value: padCount(featureCount) },
        ],
        sections: sections.length > 0 ? sections : buildDefaultRelease(context).sections,
        contributors: contributors.length > 0 ? contributors : buildDefaultRelease(context).contributors,
        communityThanks: [],
        otherChanges,
        callToAction: {
            label: options.callToActionLabel,
            url: options.callToActionUrl,
        },
    };
}

function getGitHubToken() {
    const direct = pickString(process.env.GITHUB_TOKEN, "");
    if (direct) {
        return direct;
    }

    const key = Object.keys(process.env).find((name) =>
        name.startsWith("COPILOT_GH_ACCOUNT_github_2E_com_"),
    );
    return key ? pickString(process.env[key], "") : "";
}

async function fetchGithubJson(url) {
    const headers = {
        Accept: "application/vnd.github+json",
        "User-Agent": "release-notes-showcase",
    };
    const token = getGitHubToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
        return [];
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
}

function normalizeIsoDate(dateValue) {
    if (!dateValue) {
        return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return `${dateValue}T00:00:00Z`;
    }

    return dateValue;
}

async function fetchUnreleasedGithubSignals(context, sinceDate) {
    if (!context.repoSlug.includes("/")) {
        return { mergedPulls: [], closedIssues: [] };
    }

    const sinceIso = normalizeIsoDate(sinceDate);
    if (!sinceIso) {
        return { mergedPulls: [], closedIssues: [] };
    }

    const [owner, repo] = context.repoSlug.split("/");
    const pullsUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=closed&sort=updated&direction=desc&per_page=100`;
    const issuesUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=closed&since=${encodeURIComponent(sinceIso)}&sort=updated&direction=desc&per_page=100`;

    try {
        const [pulls, issues] = await Promise.all([
            fetchGithubJson(pullsUrl),
            fetchGithubJson(issuesUrl),
        ]);

        const mergedPulls = pulls
            .filter((pull) => isRecord(pull) && typeof pull.merged_at === "string")
            .filter((pull) => Date.parse(pull.merged_at) >= Date.parse(sinceIso))
            .map((pull) => ({
                number: Number(pull.number) || 0,
                title: pickString(pull.title, "Merged pull request"),
            }))
            .filter((pull) => pull.number > 0);

        const closedIssues = issues
            .filter((issue) => isRecord(issue) && !issue.pull_request)
            .filter((issue) => typeof issue.closed_at === "string")
            .filter((issue) => Date.parse(issue.closed_at) >= Date.parse(sinceIso))
            .map((issue) => ({
                number: Number(issue.number) || 0,
                title: pickString(issue.title, "Closed issue"),
            }))
            .filter((issue) => issue.number > 0);

        return { mergedPulls, closedIssues };
    } catch {
        return { mergedPulls: [], closedIssues: [] };
    }
}

async function buildReleaseFromRepository(context, mode, selectedTag) {
    const tags = listReleaseTags(context.repoRoot);
    const latestTag = tags[0] ?? "";

    if (mode === "tag" && selectedTag && tags.includes(selectedTag)) {
        const index = tags.indexOf(selectedTag);
        const previousTag = index >= 0 && index < tags.length - 1 ? tags[index + 1] : "";
        const rangeExpr = previousTag ? `${previousTag}..${selectedTag}` : selectedTag;
        const releaseDate = readTagDate(context.repoRoot, selectedTag) || sampleRelease.releaseDate;
        const commits = readCommitSummaries(context.repoRoot, rangeExpr);
        const releaseUrl =
            context.repoUrl !== "https://github.com/"
                ? `${context.repoUrl}/releases/tag/${encodeURIComponent(selectedTag)}`
                : context.repoUrl;

        return toReleaseStateFromCommits(context, commits, {
            version: selectedTag,
            releaseDate,
            rangeLabel: rangeExpr,
            sinceLabel: previousTag || selectedTag,
            callToActionLabel: `View ${selectedTag} release`,
            callToActionUrl: releaseUrl,
        });
    }

    const rangeExpr = latestTag ? `${latestTag}..HEAD` : "HEAD";
    const commits = readCommitSummaries(context.repoRoot, rangeExpr);
    const latestTagDate = latestTag ? readTagDate(context.repoRoot, latestTag) : "";
    const unreleasedSignals = latestTagDate
        ? await fetchUnreleasedGithubSignals(context, latestTagDate)
        : { mergedPulls: [], closedIssues: [] };
    const compareUrl =
        context.repoUrl !== "https://github.com/" && latestTag
            ? `${context.repoUrl}/compare/${encodeURIComponent(latestTag)}...HEAD`
            : context.repoUrl;

    return toReleaseStateFromCommits(context, commits, {
        version: "vNext",
        releaseDate: sampleRelease.releaseDate,
        rangeLabel: rangeExpr,
        sinceLabel: latestTag || "the beginning of the branch",
        mergedPulls: unreleasedSignals.mergedPulls,
        closedIssues: unreleasedSignals.closedIssues,
        callToActionLabel: latestTag ? "Review unreleased commits" : "View repository",
        callToActionUrl: compareUrl,
    });
}

export const releaseNotesShowcaseCanvas = createCanvas({
    id: CANVAS_ID,
    displayName: CANVAS_TITLE,
    description:
        "Compose and refine launch-ready release notes with contributor callouts and export-friendly output.",
    inputSchema: releaseNotesInputSchema,
    actions: [
        {
            name: "export_email",
            description:
                "Returns email-ready subject, HTML, and text for the release notes currently shown in the canvas.",
            inputSchema: exportInputSchema,
            handler: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError(
                        "canvas_state_missing",
                        "Open the release notes canvas before exporting email content.",
                    );
                }

                return buildExportPayload(entry.getState(), ctx.input);
            },
        },
        {
            name: "get_release_snapshot",
            description:
                "Returns a concise snapshot of the release story shown in the canvas.",
            handler: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    throw new CanvasError(
                        "canvas_state_missing",
                        "Open the release notes canvas before requesting a snapshot.",
                    );
                }

                const state = entry.getState();
                return {
                    title: `${state.releaseName} ${state.version}`,
                    summary: state.summary,
                    sections: state.sections.map((section) => ({
                        title: section.title,
                        kind: section.kind,
                    })),
                    contributors: state.contributors.map((contributor) => contributor.name),
                };
            },
        },
    ],
    open: async (ctx) => {
        repositoryContext = resolveRepositoryContext(ctx.session?.workingDirectory, ctx.sessionId);
        sampleRelease = Object.freeze(buildDefaultRelease(repositoryContext));
        const state = buildState(ctx.input);

        let entry = servers.get(ctx.instanceId);
        if (!entry) {
            entry = await startServer(state);
            servers.set(ctx.instanceId, entry);
        } else {
            entry.setState(state);
        }

        return {
            title: `${state.releaseName} ${state.version}`,
            status: `${state.contributors.length} contributors highlighted`,
            url: entry.url,
        };
    },
    onClose: async (ctx) => {
        const entry = servers.get(ctx.instanceId);
        if (!entry) {
            return;
        }

        servers.delete(ctx.instanceId);
        await new Promise((resolve) => entry.server.close(resolve));
    },
});

function buildState(input) {
    const candidate = isRecord(input) ? input : {};
    const releaseName = pickString(candidate.releaseName, sampleRelease.releaseName);
    const version = pickString(candidate.version, sampleRelease.version);
    const summary = pickString(candidate.summary, sampleRelease.summary);
    const sections = normalizeSections(candidate.sections);
    const contributors = normalizeContributors(candidate.contributors);
    const heroStats = normalizeHeroStats(candidate.heroStats, sections, contributors);
    const emailSubject = pickString(
        candidate.emailSubject,
        `${releaseName} ${version} - release highlights`,
    );

    return {
        releaseName,
        version,
        releaseDate: pickString(candidate.releaseDate, sampleRelease.releaseDate),
        tagline: pickString(candidate.tagline, sampleRelease.tagline),
        summary,
        emailSubject,
        emailPreheader: pickString(candidate.emailPreheader, summary),
        heroStats,
        sections,
        contributors,
        communityThanks: normalizeCommunityThanks(candidate.communityThanks),
        otherChanges: normalizeOtherChanges(candidate.otherChanges),
        callToAction: normalizeCallToAction(candidate.callToAction),
    };
}

function normalizeCommunityThanks(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    const handles = value
        .filter((handle) => typeof handle === "string")
        .map((handle) => handle.trim().replace(/^@/, ""))
        .filter((handle) => handle.length > 0);

    return handles;
}

function normalizeOtherChanges(value) {
    if (!Array.isArray(value) || value.length === 0) {
        return [];
    }

    const changes = value
        .filter(isRecord)
        .map((change) => ({
            label: pickString(change.label, ""),
            text: pickString(change.text, ""),
        }))
        .filter((change) => change.text);

    return changes;
}

function normalizeSections(value) {
    if (!Array.isArray(value) || value.length === 0) {
        return [];
    }

    return value
        .filter(isRecord)
        .map((section) => {
            const kind = isSectionKind(section.kind) ? section.kind : "feature";
            const bullets = toStringArray(section.bullets);
            const title = pickString(section.title, "");
            const summary = pickString(section.summary, "");
            if (!title || !summary) {
                return null;
            }

            return {
                title,
                kind,
                summary,
                metric: pickString(section.metric, ""),
                bullets,
            };
        })
        .filter(Boolean);
}

function normalizeContributors(value) {
    if (!Array.isArray(value) || value.length === 0) {
        return [];
    }

    return value
        .filter(isRecord)
        .map((contributor) => {
            const name = pickString(contributor.name, "");
            if (!name) {
                return null;
            }

            return {
                name,
                githubHandle: pickString(contributor.githubHandle, ""),
                avatarUrl: pickString(contributor.avatarUrl, ""),
                profileUrl: pickString(contributor.profileUrl, ""),
                area: pickString(contributor.area, ""),
                summary: pickString(contributor.summary, ""),
            };
        })
        .filter(Boolean);
}

function normalizeHeroStats(value, sections, contributors) {
    if (Array.isArray(value) && value.length > 0) {
        const stats = value
            .filter(isRecord)
            .map((stat) => ({
                label: pickString(stat.label, ""),
                value: pickString(stat.value, ""),
            }))
            .filter((stat) => stat.label && stat.value);

        if (stats.length > 0) {
            return stats;
        }
    }

    return [
        {
            label: "Top features",
            value: padCount(countByKind(sections, "feature")),
        },
        {
            label: "Core improvements",
            value: padCount(countByKind(sections, "improvement")),
        },
        {
            label: "Contributors",
            value: padCount(contributors.length),
        },
        {
            label: "Areas touched",
            value: padCount(sections.length),
        },
    ];
}

function normalizeCallToAction(value) {
    if (isRecord(value)) {
        return {
            label: pickString(value.label, sampleRelease.callToAction.label),
            url: pickString(value.url, sampleRelease.callToAction.url),
        };
    }

    return { ...sampleRelease.callToAction };
}

function buildExportPayload(state, input) {
    const format = isRecord(input) ? pickString(input.format, "both") : "both";
    const html = buildEmailHtml(state);
    const text = buildEmailText(state);
    const payload = {
        subject: state.emailSubject,
        preheader: state.emailPreheader,
        fileNameBase: slugify(`${state.releaseName}-${state.version}-release-notes-email`),
    };

    if (format === "html") {
        return { ...payload, html };
    }

    if (format === "text") {
        return { ...payload, text };
    }

    return { ...payload, html, text };
}

function buildEmailHtml(state) {
    const sectionRows = state.sections
        .map((section) => {
            const bullets = section.bullets
                .map(
                    (bullet) =>
                        `<li style="margin:0 0 8px;">${escapeHtml(bullet)}</li>`,
                )
                .join("");

            return `
                <tr>
                    <td style="padding:0 0 20px;">
                        <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:${emailAccent(section.kind).chip};color:${emailAccent(section.kind).ink};font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                            ${escapeHtml(kindLabel(section.kind))}
                        </div>
                        <h2 style="margin:12px 0 8px;font-size:22px;line-height:28px;color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
                            ${escapeHtml(section.title)}
                        </h2>
                        <p style="margin:0 0 10px;color:#334155;font-size:15px;line-height:24px;">
                            ${escapeHtml(section.summary)}
                        </p>
                        <p style="margin:0 0 10px;color:#2563eb;font-size:13px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;">
                            ${escapeHtml(section.metric)}
                        </p>
                        <ul style="margin:0;padding-left:22px;color:#475569;font-size:14px;line-height:22px;">
                            ${bullets}
                        </ul>
                    </td>
                </tr>
            `;
        })
        .join("");

    const contributorRows = state.contributors
        .map(
            (contributor) => `
                <tr>
                    <td style="padding:0 0 14px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f8fafc;border:1px solid #dbe4f0;border-radius:16px;">
                            <tr>
                                <td style="padding:16px 18px;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                        <tr>
                                            <td width="60" valign="top" style="padding-right:14px;">
                                                <img src="${escapeHtml(contributor.avatarUrl || "")}" alt="${escapeHtml(contributor.name)}" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:14px;border:0;background:#dbeafe;object-fit:cover;" />
                                            </td>
                                            <td valign="top">
                                                <p style="margin:0 0 4px;font-size:16px;line-height:22px;font-weight:700;color:#0f172a;">
                                                    <a href="${escapeHtml(contributor.profileUrl || "#")}" style="color:#0f172a;text-decoration:none;">${escapeHtml(contributor.name)}</a>
                                                </p>
                                                <p style="margin:0 0 6px;font-size:13px;line-height:18px;color:#2563eb;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">
                                                    ${escapeHtml(contributor.area)}
                                                </p>
                                                <p style="margin:0;font-size:14px;line-height:22px;color:#475569;">
                                                    ${escapeHtml(contributor.summary)}
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            `,
        )
        .join("");

    const otherChangesHtml = (state.otherChanges ?? [])
        .map(
            (change) => `
                <li style="margin:0 0 8px;">${change.label ? `<strong style="color:#312e81;">${escapeHtml(change.label)}:</strong> ` : ""}${escapeHtml(change.text)}</li>
            `,
        )
        .join("");

    const communityHtml = (state.communityThanks ?? [])
        .map(
            (handle) =>
                `<a href="https://github.com/${encodeURIComponent(handle)}" style="color:#2563eb;text-decoration:none;font-weight:700;">@${escapeHtml(handle)}</a>`,
        )
        .join(" &middot; ");

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(state.emailSubject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef2ff;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(state.emailPreheader)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#eef2ff;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:720px;background:#ffffff;border-radius:28px;overflow:hidden;">
            <tr>
              <td style="padding:36px 36px 28px;background:linear-gradient(135deg,#111827 0%,#312e81 55%,#2563eb 100%);">
                <p style="margin:0 0 10px;font-size:12px;line-height:16px;color:#c7d2fe;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
                  ${escapeHtml(state.releaseDate)}
                </p>
                <h1 style="margin:0 0 10px;font-size:34px;line-height:40px;color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;">
                  ${escapeHtml(`${state.releaseName} ${state.version}`)}
                </h1>
                <p style="margin:0 0 14px;font-size:18px;line-height:28px;color:#dbeafe;font-weight:600;">
                  ${escapeHtml(state.tagline)}
                </p>
                <p style="margin:0;font-size:15px;line-height:24px;color:#e2e8f0;">
                  ${escapeHtml(state.summary)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    ${state.heroStats
                        .map(
                            (stat) => `
                              <td width="25%" style="padding:0 12px 16px 0;vertical-align:top;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f8fafc;border:1px solid #dbe4f0;border-radius:20px;">
                                  <tr>
                                    <td style="padding:16px 18px;">
                                      <p style="margin:0 0 6px;font-size:28px;line-height:30px;font-weight:800;color:#111827;">${escapeHtml(stat.value)}</p>
                                      <p style="margin:0;font-size:12px;line-height:18px;text-transform:uppercase;letter-spacing:0.04em;color:#475569;font-weight:700;">${escapeHtml(stat.label)}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            `,
                        )
                        .join("")}
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 36px 8px;">
                ${sectionRows}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 36px 16px;">
                <h2 style="margin:0 0 14px;font-size:24px;line-height:30px;color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
                  Also in this release
                </h2>
                <ul style="margin:0;padding-left:22px;color:#475569;font-size:14px;line-height:22px;">
                  ${otherChangesHtml}
                </ul>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 36px 16px;">
                <h2 style="margin:0 0 14px;font-size:24px;line-height:30px;color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
                  Contributors in the spotlight
                </h2>
                ${contributorRows}
                <p style="margin:8px 0 0;font-size:13px;line-height:22px;color:#475569;">
                  <strong style="color:#312e81;">Community thanks:</strong> ${communityHtml}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 36px 36px;">
                <a href="${escapeHtml(state.callToAction.url)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                  ${escapeHtml(state.callToAction.label)}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildEmailText(state) {
    const sectionText = state.sections
        .map((section) => {
            const bullets = section.bullets.map((bullet) => `- ${bullet}`).join("\n");
            return `${kindLabel(section.kind).toUpperCase()}: ${section.title}\n${section.summary}\n${bullets}`;
        })
        .join("\n\n");

    const contributorText = state.contributors
        .map(
            (contributor) =>
                `- ${contributor.name} (${contributor.area}): ${contributor.summary}`,
        )
        .join("\n");

    const otherChangesText = (state.otherChanges ?? [])
        .map((change) => `- ${change.label ? `${change.label}: ` : ""}${change.text}`)
        .join("\n");

    const communityText = (state.communityThanks ?? [])
        .map((handle) => `@${handle}`)
        .join(", ");

    return `${state.releaseName} ${state.version}
${state.releaseDate}

${state.tagline}

${state.summary}

Highlights
${state.heroStats.map((stat) => `- ${stat.label}: ${stat.value}`).join("\n")}

${sectionText}

Also in this release
${otherChangesText}

Contributors in the spotlight
${contributorText}

Community thanks: ${communityText}

${state.callToAction.label}: ${state.callToAction.url}`;
}

async function startServer(initialState) {
    let state = initialState;

    const server = createServer(async (req, res) => {
        const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");

        if (req.method === "GET" && requestUrl.pathname === "/") {
            respondHtml(res, renderHtml(state));
            return;
        }

        if (req.method === "POST" && requestUrl.pathname === "/actions/export-email") {
            const body = await readJsonBody(req);
            respondJson(res, buildExportPayload(state, body));
            return;
        }

        if (req.method === "GET" && requestUrl.pathname === "/actions/release-options") {
            const tags = listReleaseTags(repositoryContext.repoRoot);
            respondJson(res, {
                repository: repositoryContext.repoSlug,
                tags: tags.map((tag) => ({ value: tag, label: tag })),
                latestTag: tags[0] ?? "",
            });
            return;
        }

        if (req.method === "POST" && requestUrl.pathname === "/actions/load-release") {
            const body = await readJsonBody(req);
            const mode = pickString(body?.mode, "unreleased");
            const selectedTag = pickString(body?.tag, "");
            if (mode !== "unreleased" && mode !== "tag") {
                respondJson(res, { error: "Invalid release mode." }, 400);
                return;
            }

            state = await buildReleaseFromRepository(repositoryContext, mode, selectedTag);
            respondJson(res, {
                title: `${state.releaseName} ${state.version}`,
                summary: state.summary,
            });
            return;
        }

        respondJson(res, { error: "Not found" }, 404);
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    return {
        server,
        url: `http://127.0.0.1:${port}/`,
        getState() {
            return state;
        },
        setState(nextState) {
            state = nextState;
        },
    };
}

function renderHtml(state) {
    const metricPalette = [
        { bg: "#f5e0dc", border: "rgba(220, 138, 120, 0.22)", value: "#dd7878" },
        { bg: "#dce7fb", border: "rgba(30, 102, 245, 0.22)", value: "#1e66f5" },
        { bg: "#e7f3e0", border: "rgba(64, 160, 43, 0.22)", value: "#40a02b" },
        { bg: "#efe3fb", border: "rgba(136, 57, 239, 0.22)", value: "#8839ef" },
    ];

    const statCards = state.heroStats
        .map((stat, index) => {
            const tone = metricPalette[index % metricPalette.length];
            return `
                <div class="metric-card" style="background:${tone.bg};border-color:${tone.border};">
                    <div class="metric-value" style="color:${tone.value};">${escapeHtml(stat.value)}</div>
                    <div class="metric-label">${escapeHtml(stat.label)}</div>
                </div>
            `;
        })
        .join("");

    const featureCards = state.sections
        .map((section) => {
            const bullets = section.bullets
                .slice(0, 2)
                .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
                .join("");

            return `
                <article class="section-card ${escapeHtml(section.kind)}">
                    <div class="section-row">
                        <div class="section-badge">${escapeHtml(kindLabel(section.kind))}</div>
                        <div class="section-metric">${escapeHtml(section.metric)}</div>
                    </div>
                    <h3>${escapeHtml(section.title)}</h3>
                    <p class="section-summary">${escapeHtml(section.summary)}</p>
                    <ul>${bullets}</ul>
                </article>
            `;
        })
        .join("");

    const contributorCards = state.contributors
        .map((contributor) => {
            const avatar = contributor.avatarUrl
                ? `<img class="avatar-image" src="${escapeHtml(contributor.avatarUrl)}" alt="${escapeHtml(contributor.name)}" />`
                : `<div class="avatar-fallback">${escapeHtml(getInitials(contributor.name))}</div>`;
            const profileHref = contributor.profileUrl || "#";
            const handle = contributor.githubHandle ? `@${contributor.githubHandle}` : "";

            return `
                <article class="contributor-card">
                    <a class="avatar-link" href="${escapeHtml(profileHref)}">${avatar}</a>
                    <div class="contributor-copy">
                        <div class="contributor-topline">
                            <a class="contributor-name" href="${escapeHtml(profileHref)}">${escapeHtml(contributor.name)}</a>
                            <span class="contributor-handle">${escapeHtml(handle)}</span>
                        </div>
                        <div class="contributor-area">${escapeHtml(contributor.area)}</div>
                        <p>${escapeHtml(contributor.summary)}</p>
                    </div>
                </article>
            `;
        })
        .join("");

    const communityChips = (state.communityThanks ?? [])
        .map((handle) => {
            const profile = `https://github.com/${encodeURIComponent(handle)}`;
            const avatar = `https://github.com/${encodeURIComponent(handle)}.png?size=64`;
            return `
                <a class="thanks-chip" href="${escapeHtml(profile)}" title="@${escapeHtml(handle)}">
                    <img class="thanks-avatar" src="${escapeHtml(avatar)}" alt="@${escapeHtml(handle)}" loading="lazy" />
                    <span>@${escapeHtml(handle)}</span>
                </a>
            `;
        })
        .join("");

    const otherChangeRows = (state.otherChanges ?? [])
        .map((change) => {
            const label = change.label
                ? `<span class="change-label">${escapeHtml(change.label)}</span>`
                : "";
            return `<li>${label}<span class="change-text">${escapeHtml(change.text)}</span></li>`;
        })
        .join("");

    const featureHeadline = state.sections[0]?.title ?? "Release highlights";

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(`${state.releaseName} ${state.version}`)}</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: auto;
        overflow-x: hidden;
        overflow-wrap: break-word;
        word-break: break-word;
        background:
          radial-gradient(circle at 6% -4%, rgba(234, 118, 203, 0.22), transparent 26%),
          radial-gradient(circle at 96% -6%, rgba(30, 102, 245, 0.2), transparent 28%),
          radial-gradient(circle at 50% 120%, rgba(64, 160, 43, 0.16), transparent 32%),
          linear-gradient(180deg, #eff1f5, #e6e9ef);
        color: #4c4f69;
        font-family: var(--font-sans, "Segoe UI", sans-serif);
      }

      .shell {
        max-width: 1320px;
        margin: 0 auto;
        padding: 10px;
      }

      .hero {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(140, 143, 161, 0.24);
        border-radius: 20px;
        padding: 16px 14px 14px;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 241, 245, 0.9)),
          #eff1f5;
        box-shadow: 0 12px 28px rgba(140, 143, 161, 0.2);
      }

      .hero::before {
        content: "";
        position: absolute;
        inset: 0 0 auto 0;
        height: 5px;
        background: linear-gradient(90deg, #d20f39, #fe640b, #df8e1d, #40a02b, #1e66f5, #8839ef);
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: -40% -10% auto auto;
        width: 220px;
        height: 220px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(234, 118, 203, 0.35), transparent 70%);
        pointer-events: none;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .brand-mark {
        display: grid;
        grid-template-columns: repeat(2, 9px);
        grid-template-rows: repeat(2, 9px);
        gap: 2px;
      }

      .brand-mark span {
        width: 9px;
        height: 9px;
        border-radius: 3px;
      }

      .brand-mark span:nth-child(1) { background: #d20f39; }
      .brand-mark span:nth-child(2) { background: #1e66f5; }
      .brand-mark span:nth-child(3) { background: #40a02b; }
      .brand-mark span:nth-child(4) { background: #df8e1d; }

      .brand-name {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        background: linear-gradient(90deg, #8839ef, #1e66f5);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      .hero-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.9fr) minmax(280px, 0.9fr);
        gap: 10px;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 999px;
        background: #ccd0da;
        color: #7287fd;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 6px 0 4px;
        font-size: clamp(24px, 3vw, 34px);
        line-height: 1;
        letter-spacing: -0.04em;
        color: #1e1e2e;
      }

      .version-chip {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 0.6em;
        font-weight: 800;
        letter-spacing: 0.02em;
        vertical-align: middle;
        color: #fff;
        background: linear-gradient(120deg, #8839ef, #1e66f5);
        box-shadow: 0 4px 12px rgba(136, 57, 239, 0.35);
      }

      .tagline {
        margin: 0 0 6px;
        color: #7287fd;
        font-size: clamp(14px, 1.4vw, 17px);
        font-weight: 650;
        line-height: 1.3;
      }

      .summary {
        max-width: 84ch;
        margin: 0;
        color: #5c5f77;
        font-size: 14px;
        line-height: 1.45;
      }

      .headline-strip {
        margin-top: 8px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        padding: 8px 10px;
        border-radius: 14px;
        background: #e6e9ef;
        border: 1px solid rgba(140, 143, 161, 0.18);
      }

      .headline-label {
        color: #8839ef;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .headline-title {
        margin-top: 2px;
        font-size: 15px;
        line-height: 1.3;
        font-weight: 650;
        color: #313244;
      }

      .orb-panel {
        padding: 10px;
        border-radius: 16px;
        border: 1px solid rgba(140, 143, 161, 0.24);
        background: #e6e9ef;
      }

      .orb-title {
        margin: 0 0 8px;
        color: #6c6f85;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .metric-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .metric-card {
        padding: 10px;
        border-radius: 12px;
        background: #f5e0dc;
        border: 1px solid rgba(220, 138, 120, 0.18);
      }

      .metric-value {
        font-size: 18px;
        font-weight: 800;
        line-height: 1;
        color: #dd7878;
      }

      .metric-label {
        margin-top: 4px;
        color: #6c6f85;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .content-grid {
        display: grid;
        grid-template-columns: minmax(0, 2.2fr) minmax(290px, 0.9fr);
        gap: 10px;
        margin-top: 10px;
      }

      .panel {
        border: 1px solid rgba(140, 143, 161, 0.18);
        border-radius: 16px;
        background: rgba(239, 241, 245, 0.94);
        box-shadow: 0 6px 18px rgba(140, 143, 161, 0.12);
      }

      .panel-header {
        padding: 12px 12px 0;
      }

      .panel h2 {
        margin: 0;
        font-size: 16px;
        line-height: 1.2;
        color: #1e1e2e;
      }

      .panel-subtitle {
        margin: 4px 0 0;
        color: #6c6f85;
        font-size: 13px;
        line-height: 1.35;
      }

      .sections-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        padding: 12px;
      }

      .section-card {
        position: relative;
        overflow: hidden;
        padding: 11px;
        border-radius: 12px;
        border: 1px solid rgba(140, 143, 161, 0.16);
        background: #ffffffcc;
        transition: transform 140ms ease, box-shadow 140ms ease;
      }

      .section-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 22px rgba(140, 143, 161, 0.22);
      }

      .section-card::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 4px;
      }

      .section-card.feature::before { background: linear-gradient(180deg, #1e66f5, #209fb5); }
      .section-card.improvement::before { background: linear-gradient(180deg, #8839ef, #ea76cb); }
      .section-card.quality::before { background: linear-gradient(180deg, #df8e1d, #fe640b); }

      .section-card.feature {
        box-shadow: inset 0 0 0 1px rgba(30, 102, 245, 0.1);
      }

      .section-card.improvement {
        box-shadow: inset 0 0 0 1px rgba(136, 57, 239, 0.1);
      }

      .section-card.quality {
        box-shadow: inset 0 0 0 1px rgba(223, 142, 29, 0.1);
      }

      .section-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
      }

      .section-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 999px;
        background: #ccd0da;
        color: #7287fd;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .section-card.feature .section-badge { background: #dce7fb; color: #1e66f5; }
      .section-card.improvement .section-badge { background: #efe3fb; color: #8839ef; }
      .section-card.quality .section-badge { background: #fbeccd; color: #df8e1d; }

      .section-card h3 {
        margin: 8px 0 5px;
        font-size: 15px;
        line-height: 1.25;
        color: #313244;
      }

      .section-summary {
        margin: 0 0 6px;
        color: #5c5f77;
        font-size: 13px;
        line-height: 1.35;
      }

      .section-metric {
        color: #8839ef;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .section-card ul {
        margin: 0;
        padding-left: 16px;
        color: #5c5f77;
        display: grid;
        gap: 3px;
        font-size: 12px;
        line-height: 1.3;
      }

      .contributors {
        display: grid;
        gap: 8px;
        padding: 12px;
      }

      .contributor-card {
        display: flex;
        gap: 9px;
        align-items: flex-start;
        padding: 10px;
        border-radius: 12px;
        background: #ffffffcc;
        border: 1px solid rgba(140, 143, 161, 0.16);
        transition: transform 140ms ease, box-shadow 140ms ease;
      }

      .contributor-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 22px rgba(136, 57, 239, 0.18);
      }

      .avatar-link {
        flex: none;
        display: block;
        padding: 2px;
        border-radius: 13px;
        background: linear-gradient(135deg, #d20f39, #fe640b, #40a02b, #1e66f5, #8839ef);
      }

      .avatar-image,
      .avatar-fallback {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: linear-gradient(135deg, #7287fd, #8839ef);
        color: white;
        font-weight: 800;
        letter-spacing: 0.06em;
        object-fit: cover;
        border: 2px solid #fff;
      }

      .contributor-copy {
        min-width: 0;
      }

      .contributor-topline {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: baseline;
      }

      .contributor-name {
        color: #1e1e2e;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
      }

      .contributor-handle {
        color: #7287fd;
        font-size: 12px;
        font-weight: 700;
      }

      .contributor-area {
        margin-top: 2px;
        color: #8839ef;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .contributor-card p {
        margin: 4px 0 0;
        color: #5c5f77;
        font-size: 12px;
        line-height: 1.35;
      }

      .email-panel {
        display: grid;
        gap: 10px;
        padding: 12px;
      }

      .release-tools {
        display: grid;
        gap: 8px;
      }

      .control-row {
        display: grid;
        gap: 8px;
      }

      select {
        width: 100%;
        min-height: 36px;
        border-radius: 10px;
        border: 1px solid rgba(140, 143, 161, 0.3);
        background: #ffffffcc;
        color: #4c4f69;
        font: inherit;
        font-size: 13px;
        padding: 7px 10px;
      }

      .email-stack {
        display: grid;
        gap: 8px;
      }

      .email-field {
        padding: 9px 10px;
        border-radius: 10px;
        background: #ffffffcc;
        border: 1px solid rgba(140, 143, 161, 0.16);
      }

      .email-label {
        color: #6c6f85;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .email-value {
        margin-top: 4px;
        font-size: 13px;
        line-height: 1.35;
        color: #4c4f69;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .button-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      button {
        appearance: none;
        border: 0;
        cursor: pointer;
        border-radius: 999px;
        padding: 8px 10px;
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        color: white;
        background: linear-gradient(135deg, #7287fd, #8839ef);
        box-shadow: 0 6px 14px rgba(114, 135, 253, 0.22);
        transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
      }

      button.secondary {
        background: #ccd0da;
        color: #4c4f69;
        box-shadow: none;
      }

      button:hover {
        transform: translateY(-1px);
      }

      button:active {
        transform: translateY(0);
      }

      .footnote {
        color: #6c6f85;
        font-size: 12px;
        line-height: 1.35;
      }

      .thanks-wall {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 0 12px 12px;
      }

      .thanks-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 9px 3px 3px;
        border-radius: 999px;
        background: #ffffffcc;
        border: 1px solid rgba(140, 143, 161, 0.2);
        color: #4c4f69;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
        transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
      }

      .thanks-chip:hover {
        transform: translateY(-1px);
        border-color: rgba(136, 57, 239, 0.45);
        box-shadow: 0 6px 14px rgba(136, 57, 239, 0.18);
      }

      .thanks-avatar {
        width: 20px;
        height: 20px;
        border-radius: 999px;
        object-fit: cover;
        border: 1.5px solid #fff;
        background: linear-gradient(135deg, #7287fd, #8839ef);
      }

      .change-list {
        margin: 0;
        padding: 12px;
        list-style: none;
        display: grid;
        gap: 6px;
      }

      .change-list li {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: baseline;
        font-size: 13px;
        line-height: 1.35;
        color: #5c5f77;
        padding-bottom: 6px;
        border-bottom: 1px dashed rgba(140, 143, 161, 0.22);
      }

      .change-list li:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }

      .change-label {
        flex: none;
        padding: 1px 7px;
        border-radius: 999px;
        background: linear-gradient(135deg, #dce7fb, #efe3fb);
        color: #8839ef;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.02em;
      }

      .change-text {
        color: #4c4f69;
      }

      .toast {
        position: fixed;
        right: 12px;
        bottom: 12px;
        max-width: 360px;
        padding: 10px 12px;
        border-radius: 12px;
        background: #eff1f5;
        color: #4c4f69;
        border: 1px solid rgba(114, 135, 253, 0.28);
        box-shadow: 0 8px 24px rgba(140, 143, 161, 0.18);
        opacity: 0;
        pointer-events: none;
        transform: translateY(8px);
        transition: opacity 160ms ease, transform 160ms ease;
      }

      .toast.visible {
        opacity: 1;
        transform: translateY(0);
      }

      @media (max-width: 1100px) {
        .shell {
          padding: 8px;
        }

        .hero-grid,
        .content-grid {
          grid-template-columns: 1fr;
        }

        .sections-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .sections-grid {
          grid-template-columns: 1fr;
        }

        .metric-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="hero-grid">
          <div>
            <div class="brand">
              <span class="brand-mark"><span></span><span></span><span></span><span></span></span>
              <span class="brand-name">${escapeHtml(state.releaseName)} repository</span>
            </div>
            <div class="eyebrow">${escapeHtml(state.releaseDate)} &middot; ✨ Fresh from the repo</div>
            <h1>${escapeHtml(state.releaseName)} <span class="version-chip">${escapeHtml(state.version)}</span></h1>
            <p class="tagline">${escapeHtml(state.tagline)}</p>
            <p class="summary">${escapeHtml(state.summary)}</p>
            <div class="headline-strip">
              <div>
                <div class="headline-label">Top hit</div>
                <div class="headline-title">${escapeHtml(featureHeadline)}</div>
              </div>
              <a href="${escapeHtml(state.callToAction.url)}" style="color:#7287fd;font-size:10px;font-weight:700;text-decoration:none;white-space:nowrap;">${escapeHtml(state.callToAction.label)}</a>
            </div>
          </div>
          <aside class="orb-panel">
            <p class="orb-title">Release dashboard</p>
            <div class="metric-grid">${statCards}</div>
          </aside>
        </div>
      </section>

      <section class="panel" style="margin-top:10px;">
        <div class="panel-header">
          <div>
            <h2>Release source</h2>
            <p class="panel-subtitle">Pick an existing tag, or draft unreleased work merged/closed since the latest tag.</p>
          </div>
        </div>
        <div class="email-panel">
          <div class="release-tools">
            <label class="email-label" for="release-tag">Release tag</label>
            <select id="release-tag" aria-label="Release tag">
              <option value="">Loading tags…</option>
            </select>
          </div>
          <div class="button-row">
            <button type="button" id="load-selected-release">Load selected release</button>
            <button type="button" id="load-unreleased" class="secondary">Draft unreleased</button>
          </div>
          <div class="footnote">Unreleased drafts include commits plus merged PRs and closed issues since the latest tag.</div>
        </div>
      </section>

      <section class="content-grid">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2>Top hits</h2>
              <p class="panel-subtitle">A denser dashboard view of the biggest feature work, improvements, and quality moves in this release.</p>
            </div>
          </div>
          <div class="sections-grid">${featureCards}</div>
          <div class="panel-header" style="border-top:1px solid rgba(140,143,161,0.18);">
            <div>
              <h2>Also in this release</h2>
              <p class="panel-subtitle">Smaller but mighty updates landing across the rest of the repository.</p>
            </div>
          </div>
          <ul class="change-list">${otherChangeRows}</ul>
        </div>

        <div style="display:grid;gap:24px;">
          <aside class="panel">
            <div class="panel-header">
              <div>
                <h2>Contributors</h2>
                <p class="panel-subtitle">Contributors detected in the current draft.</p>
              </div>
            </div>
            <div class="contributors">${contributorCards}</div>
            <div class="panel-header" style="border-top:1px solid rgba(140,143,161,0.18);padding-top:10px;">
              <div>
                <h2 style="font-size:13px;">🙌 Community thanks</h2>
                <p class="panel-subtitle">Additional contributor handles found in this draft.</p>
              </div>
            </div>
            <div class="thanks-wall">${communityChips}</div>
          </aside>

          <aside class="panel">
            <div class="panel-header">
              <div>
                <h2>Email export</h2>
                <p class="panel-subtitle">Copy or download an announcement-ready version of the same release story.</p>
              </div>
            </div>
            <div class="email-panel">
              <div class="email-stack">
                <div class="email-field">
                  <div class="email-label">Subject</div>
                  <div class="email-value">${escapeHtml(state.emailSubject)}</div>
                </div>
                <div class="email-field">
                  <div class="email-label">Preheader</div>
                  <div class="email-value">${escapeHtml(state.emailPreheader)}</div>
                </div>
                <div class="email-field">
                  <div class="email-label">CTA</div>
                  <div class="email-value">${escapeHtml(state.callToAction.label)} - ${escapeHtml(state.callToAction.url)}</div>
                </div>
              </div>
              <div class="button-row">
                <button type="button" data-copy-format="html">Copy email HTML</button>
                <button type="button" data-copy-format="text" class="secondary">Copy plain text</button>
                <button type="button" data-download-format="html">Download HTML</button>
                <button type="button" data-download-format="text" class="secondary">Download text</button>
              </div>
              <div class="footnote">The export action is also exposed to the agent as <code>export_email</code> so the same content can be routed into automated release workflows.</div>
            </div>
          </aside>
        </div>
      </section>
    </main>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <script>
      const toast = document.getElementById("toast");
      const releaseTagSelect = document.getElementById("release-tag");
      const loadSelectedReleaseButton = document.getElementById("load-selected-release");
      const loadUnreleasedButton = document.getElementById("load-unreleased");

      async function requestExport(format) {
        const response = await fetch("/actions/export-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format }),
        });

        if (!response.ok) {
          throw new Error("Export failed.");
        }

        return response.json();
      }

      async function requestReleaseOptions() {
        const response = await fetch("/actions/release-options");
        if (!response.ok) {
          throw new Error("Could not load release tags.");
        }

        return response.json();
      }

      async function requestLoadRelease(mode, tag) {
        const response = await fetch("/actions/load-release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, tag }),
        });

        if (!response.ok) {
          throw new Error("Could not load release draft.");
        }

        return response.json();
      }

      function showToast(message) {
        toast.textContent = message;
        toast.classList.add("visible");
        window.clearTimeout(showToast.timerId);
        showToast.timerId = window.setTimeout(() => {
          toast.classList.remove("visible");
        }, 2200);
      }

      function downloadContent(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      function setLoadingState(isLoading) {
        loadSelectedReleaseButton.disabled = isLoading;
        loadUnreleasedButton.disabled = isLoading;
      }

      async function loadRelease(mode) {
        setLoadingState(true);
        try {
          const selectedTag = releaseTagSelect.value;
          await requestLoadRelease(mode, selectedTag);
          showToast(mode === "tag" ? "Release loaded." : "Unreleased draft loaded.");
          window.setTimeout(() => {
            window.location.reload();
          }, 250);
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Could not load release.");
        } finally {
          setLoadingState(false);
        }
      }

      async function initReleasePicker() {
        try {
          const options = await requestReleaseOptions();
          const tags = Array.isArray(options.tags) ? options.tags : [];

          releaseTagSelect.innerHTML = "";
          if (tags.length === 0) {
            releaseTagSelect.innerHTML = '<option value="">No tags found</option>';
            loadSelectedReleaseButton.disabled = true;
            return;
          }

          for (const tag of tags) {
            const option = document.createElement("option");
            option.value = typeof tag.value === "string" ? tag.value : "";
            option.textContent = typeof tag.label === "string" ? tag.label : option.value;
            releaseTagSelect.appendChild(option);
          }

          if (typeof options.latestTag === "string" && options.latestTag) {
            releaseTagSelect.value = options.latestTag;
          }
        } catch (error) {
          releaseTagSelect.innerHTML = '<option value="">Could not load tags</option>';
          loadSelectedReleaseButton.disabled = true;
          showToast(error instanceof Error ? error.message : "Could not load release tags.");
        }
      }

      async function copyPayload(format) {
        const payload = await requestExport(format);
        const content = format === "html" ? payload.html : payload.text;
        await navigator.clipboard.writeText(content);
        showToast(format === "html" ? "Email HTML copied." : "Plain text copied.");
      }

      async function downloadPayload(format) {
        const payload = await requestExport(format);
        const fileName =
          format === "html"
            ? payload.fileNameBase + ".html"
            : payload.fileNameBase + ".txt";
        const content = format === "html" ? payload.html : payload.text;
        const mimeType = format === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8";
        downloadContent(content, fileName, mimeType);
        showToast(format === "html" ? "HTML export downloaded." : "Text export downloaded.");
      }

      document.querySelectorAll("[data-copy-format]").forEach((button) => {
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            await copyPayload(button.dataset.copyFormat);
          } catch (error) {
            showToast(error instanceof Error ? error.message : "Copy failed.");
          } finally {
            button.disabled = false;
          }
        });
      });

      document.querySelectorAll("[data-download-format]").forEach((button) => {
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            await downloadPayload(button.dataset.downloadFormat);
          } catch (error) {
            showToast(error instanceof Error ? error.message : "Download failed.");
          } finally {
            button.disabled = false;
          }
        });
      });

      loadSelectedReleaseButton.addEventListener("click", async () => {
        if (!releaseTagSelect.value) {
          showToast("Pick a release tag first.");
          return;
        }
        await loadRelease("tag");
      });

      loadUnreleasedButton.addEventListener("click", async () => {
        await loadRelease("unreleased");
      });

      initReleasePicker();
    </script>
  </body>
</html>`;
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.setEncoding("utf8");
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", () => {
            if (!body.trim()) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
        req.on("error", reject);
    });
}

function respondHtml(res, html) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
}

function respondJson(res, payload, statusCode = 200) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
}

function pickString(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toStringArray(value) {
    return Array.isArray(value)
        ? value
              .filter((item) => typeof item === "string" && item.trim())
              .map((item) => item.trim())
        : [];
}

function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSectionKind(value) {
    return value === "feature" || value === "improvement" || value === "quality";
}

function countByKind(sections, kind) {
    return sections.filter((section) => section.kind === kind).length;
}

function padCount(value) {
    return String(value).padStart(2, "0");
}

function kindLabel(kind) {
    if (kind === "feature") {
        return "🚀 Feature work";
    }

    if (kind === "improvement") {
        return "✨ Improvement";
    }

    return "🛡️ Quality";
}

function emailAccent(kind) {
    if (kind === "feature") {
        return {
            chip: "#dbeafe",
            ink: "#1d4ed8",
        };
    }

    if (kind === "improvement") {
        return {
            chip: "#f3e8ff",
            ink: "#7e22ce",
        };
    }

    return {
        chip: "#ffedd5",
        ink: "#c2410c",
    };
}

function getInitials(name) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((segment) => segment[0]?.toUpperCase() ?? "")
        .join("");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
