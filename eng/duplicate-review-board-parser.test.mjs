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
        "| `agents/third.agent.md` | Agent | Missing final delimiter",
        "| `agents/third.agent.md` | Agent | Extra | unescaped pipe |",
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
