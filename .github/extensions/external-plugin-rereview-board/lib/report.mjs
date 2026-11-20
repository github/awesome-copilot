import { createHash } from "node:crypto";
import { REREVIEW_REPORT_MARKER } from "../../../scripts/external-plugins/external-plugin-rereview.mjs";

export const REPO = "github/awesome-copilot";
export const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const issueUrl = (number) => `https://github.com/${REPO}/issues/${number}`;

export function issueNumber(number) {
    if (!Number.isSafeInteger(number) || number < 1) throw new Error("Provide a positive issue number.");
    return number;
}

export function parseReport(body) {
    if (typeof body !== "string" || !body.startsWith(REREVIEW_REPORT_MARKER)) {
        throw new Error("Not an external-plugin six-month review report.");
    }
    const lines = body.split(/\r?\n/);
    const header = "| Plugin | Version | Source repo | Submission issue | Closed at | Days past threshold | Status |";
    const indices = lines.flatMap((line, index) => line.trim() === header ? [index] : []);
    if (indices.length !== 1) throw new Error("Expected exactly one six-month review table; nothing was imported.");
    const start = indices[0];
    if (!/^\|(?:\s*:?-{3,}:?\s*\|){7}$/.test(lines[start + 1]?.trim() ?? "")) {
        throw new Error("Malformed review table separator.");
    }
    const items = [];
    const seen = new Set();
    for (const line of lines.slice(start + 2)) {
        if (!line.trim()) break;
        const cells = /^\|(.+)\|$/.exec(line.trim())?.[1].split("|").map((cell) => cell.trim());
        if (!cells || cells.length !== 7) throw new Error("Unsupported review table row; nothing was imported.");
        const [name, version, rawRepo, submission, closedDate, days, status] = cells;
        const repo = /^`([A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+)`$/.exec(rawRepo)?.[1];
        const number = /^#([1-9]\d*)$/.exec(submission)?.[1];
        if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(name) || !version || !repo || !number ||
            !/^\d{4}-\d{2}-\d{2}$/.test(closedDate) ||
            !Number.isFinite(Date.parse(closedDate)) || new Date(closedDate).toISOString().slice(0, 10) !== closedDate ||
            !/^\d+$/.test(days) || !status || [".", ".."].includes(repo?.split("/")[1])) {
            throw new Error("Unsupported plugin identity or date in review table.");
        }
        const id = issueNumber(Number(number));
        if (seen.has(id)) throw new Error("The report repeats an original submission issue.");
        seen.add(id);
        items.push({ id, name, version, repo, closedDate, days: Number(days), status, url: issueUrl(id) });
    }
    if (!items.length) throw new Error("The report contains no plugin rows.");
    return items;
}
