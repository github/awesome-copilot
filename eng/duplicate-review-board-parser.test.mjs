import assert from "node:assert/strict";
import { test } from "node:test";
import { parseReport, resourcePath } from "../.github/extensions/duplicate-review-board/lib/report.mjs";

function report(rows) {
    return `#### Group 1: Parser coverage

- [ ] Reviewed — these are intentionally separate

| Resource | Type | Description |
|----------|------|-------------|
${rows}

**Why flagged:** Test input.

---
`;
}

const row = (path, description = "Resource description") => `| \`${path}\` | Agent | ${description} |`;

test("accepts legacy agent filenames without relaxing the resource directory or suffix", () => {
    const paths = [
        "agents/CSharpExpert.agent.md",
        "agents/Thinking-Beast-Mode.agent.md",
        "agents/microsoft_learn_contributor.agent.md",
    ];
    for (const path of paths) assert.equal(resourcePath(path), true);
    const parsed = parseReport(report(paths.map((path) => row(path)).join("\n")));
    assert.deepEqual(parsed[0].resources.map((resource) => resource.path), paths);
});

test("accepts rows with omitted outer pipes and includes them in the group fingerprint", () => {
    const rows = [
        row("agents/first.agent.md"),
        row("agents/second.agent.md"),
        "`agents/third.agent.md` | Agent | No outer pipes",
        "| `agents/fourth.agent.md` | Agent | No trailing pipe",
        "`agents/fifth.agent.md` | Agent | No leading pipe |",
    ];
    const parsed = parseReport(report(rows.join("\n")))[0];
    assert.deepEqual(parsed.resources.map((resource) => resource.path), [
        "agents/first.agent.md",
        "agents/second.agent.md",
        "agents/third.agent.md",
        "agents/fourth.agent.md",
        "agents/fifth.agent.md",
    ]);
    assert.notEqual(parsed.fingerprint, parseReport(report(rows.slice(0, 2).join("\n")))[0].fingerprint);
});

test("rejects traversal and unsupported resource locations", () => {
    for (const path of [
        "agents/../../secret.agent.md",
        "agents/subdir/CSharpExpert.agent.md",
        "agents/CSharpExpert.instructions.md",
        "Instructions/example.agent.md",
    ]) {
        assert.equal(resourcePath(path), false, path);
        assert.throws(() => parseReport(report([
            row(path),
            row("agents/valid.agent.md"),
        ].join("\n"))));
    }
});

test("rejects every malformed or unsupported data row instead of importing a partial group", () => {
    const validRows = [
        row("agents/first.agent.md"),
        row("agents/second.agent.md"),
    ];
    const unsupportedRows = [
        "| agents/plain.agent.md | Agent | Plain path |",
        "| [`agents/linked.agent.md`](https://example.test) | Agent | Linked path |",
        "| `agents/third.agent.md` | Agent | Extra | unescaped pipe |",
        "This nonempty line is not a resource row",
        "agents/unquoted.agent.md | Agent | Unquoted path",
    ];
    for (const unsupported of unsupportedRows) {
        assert.throws(() => parseReport(report([...validRows, unsupported].join("\n"))), /unsupported resource table/);
    }
});

test("preserves escaped pipes inside table descriptions", () => {
    const parsed = parseReport(report([
        row("agents/first.agent.md"),
        row("agents/second.agent.md", "Keeps escaped \\| evidence"),
    ].join("\n")));
    assert.equal(parsed[0].resources[1].description, "Keeps escaped \\| evidence");
});

test("rejects malformed table separators and tables without enough resources", () => {
    const template = report([
        row("agents/first.agent.md"),
        row("agents/second.agent.md"),
    ]);
    assert.throws(() => parseReport(template.replace("|----------|------|-------------|", "|--|---|---|")), /malformed resource table/);
    assert.throws(() => parseReport(report(row("agents/only.agent.md"))), /unsupported resource table/);
});

test("stops resource parsing at Why flagged and details boundaries", () => {
    const rows = [
        row("agents/first.agent.md"),
        row("agents/second.agent.md"),
    ].join("\n");
    const whyFlagged = parseReport(report(rows))[0];
    assert.equal(whyFlagged.resources.length, 2);
    assert.equal(whyFlagged.reason, "Test input.");

    const detailsReport = report(rows).replace("**Why flagged:** Test input.\n\n---", "</details>");
    assert.equal(parseReport(detailsReport)[0].resources.length, 2);
});
