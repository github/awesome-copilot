import { createHash } from "node:crypto";

export const digest = (text) => createHash("sha256").update(text).digest("hex");

export function resourcePath(value) {
    return /^(?:agents\/[A-Za-z0-9._-]+\.agent\.md|instructions\/[a-z0-9.-]+\.instructions\.md|skills\/[a-z0-9-]+(?:\/SKILL\.md)?)$/.test(value);
}

function splitTableRow(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const startsWithPipe = trimmed.startsWith("|");
    const lastIndex = trimmed.length - 1;
    let trailingSlashes = 0;
    for (let previous = lastIndex - 1; previous >= 0 && trimmed[previous] === "\\"; previous--) trailingSlashes++;
    const endsWithPipe = trimmed.endsWith("|") && trailingSlashes % 2 === 0;
    const start = startsWithPipe ? 1 : 0;
    const end = trimmed.length - (endsWithPipe ? 1 : 0);
    const cells = [];
    let cell = "";
    for (let index = start; index < end; index++) {
        const character = trimmed[index];
        if (character === "|") {
            let slashes = 0;
            for (let previous = index - 1; previous >= 0 && trimmed[previous] === "\\"; previous--) slashes++;
            if (slashes % 2 === 0) {
                cells.push(cell.trim());
                cell = "";
                continue;
            }
        }
        cell += character;
    }
    cells.push(cell.trim());
    return cells;
}

function isTableEnd(line) {
    return /^\*\*Why flagged:\*\*(?:[ \t]|$)/.test(line.trim()) ||
        /^---[ \t]*$/.test(line.trim()) ||
        /^<\/details>[ \t]*$/.test(line.trim());
}

function resourceTable(section, groupNumber) {
    const lines = section.split(/\r?\n/);
    const headers = lines.flatMap((line, index) => {
        const cells = splitTableRow(line);
        return cells?.length === 3 && cells[0].toLowerCase() === "resource" &&
            cells[1].toLowerCase() === "type" && cells[2].toLowerCase() === "description" ? [index] : [];
    });
    if (headers.length !== 1) {
        throw new Error(`Group ${groupNumber} must have exactly one resource table. Nothing was imported.`);
    }
    const headerIndex = headers[0];
    const separator = splitTableRow(lines[headerIndex + 1] ?? "");
    if (!separator || separator.length !== 3 || separator.some((cell) => !/^:?-{3,}:?$/.test(cell))) {
        throw new Error(`Group ${groupNumber} has a malformed resource table. Nothing was imported.`);
    }

    const resources = [];
    for (let index = headerIndex + 2; index < lines.length; index++) {
        const line = lines[index];
        if (isTableEnd(line)) break;
        if (!line.trim()) {
            const nextContent = lines.slice(index + 1).find((nextLine) => nextLine.trim());
            if (!nextContent || isTableEnd(nextContent)) break;
        }
        const cells = splitTableRow(line);
        if (!cells || cells.length !== 3) {
            throw new Error(`Group ${groupNumber} has an unsupported resource table. Nothing was imported.`);
        }
        const path = /^`([^`]+)`$/.exec(cells[0])?.[1];
        if (!path || !cells[1]) {
            throw new Error(`Group ${groupNumber} has an unsupported resource table. Nothing was imported.`);
        }
        resources.push({ path, type: cells[1], description: cells[2] });
    }
    return resources;
}

/** Parse only the detector's group sections; never infer groups from prose. */
export function parseReport(body) {
    if (typeof body !== "string") throw new Error("The report has no Markdown body.");
    const headings = [...body.matchAll(/^#### Group (\d+):[ \t]*(.+)\r?$/gm)];
    if (!headings.length) throw new Error("No duplicate groups found. Expected '#### Group N: ...' sections.");
    const ids = new Set();
    return headings.map((heading, index) => {
        const start = heading.index;
        const end = headings[index + 1]?.index ?? body.length;
        const section = body.slice(start, end);
        const resources = resourceTable(section, heading[1]);
        if (resources.length < 2 || resources.some((resource) => !resourcePath(resource.path))) {
            throw new Error(`Group ${heading[1]} has an unsupported resource table. Nothing was imported.`);
        }
        for (const resource of resources) {
            if (resource.path.startsWith("skills/") && !resource.path.endsWith("/SKILL.md")) resource.path += "/SKILL.md";
        }
        const paths = resources.map((resource) => resource.path).sort();
        if (new Set(paths).size !== paths.length) throw new Error(`Group ${heading[1]} repeats a resource.`);
        const id = digest(paths.join("\n")).slice(0, 24);
        if (ids.has(id)) throw new Error("The report repeats the same resource group.");
        ids.add(id);
        const checkbox = /^- \[([ xX])\][ \t]+Reviewed[^\r\n]*$/m.exec(section);
        if (!checkbox) throw new Error(`Group ${heading[1]} has no Reviewed checkbox.`);
        const reason = /\*\*Why flagged:\*\*[ \t]*([\s\S]*?)(?=\r?\n---|\r?\n<\/details>|$)/.exec(section)?.[1].trim() ?? "";
        const title = heading[2].trim();
        return {
            id, number: Number(heading[1]), title, resources, reason,
            accepted: checkbox[1].toLowerCase() === "x",
            checkboxOffset: start + checkbox.index + 3,
            fingerprint: digest(JSON.stringify({ title, resources, reason })),
        };
    });
}

export function acceptGroup(body, id) {
    const group = parseReport(body).find((entry) => entry.id === id);
    if (!group) throw new Error("The group is no longer in the source report.");
    return body.slice(0, group.checkboxOffset) + "x" + body.slice(group.checkboxOffset + 1);
}
