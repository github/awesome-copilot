#!/usr/bin/env node

import fs from "fs";
import path from "path";

const SCRIPT_EXTENSIONS = new Set([
  ".sh",
  ".bash",
  ".ps1",
  ".py",
  ".js",
  ".mjs",
  ".ts",
]);

function isLikelyAbsolutePath(value) {
  if (!value) {
    return false;
  }

  // POSIX absolute (/foo), UNC (//server/share), Windows drive paths (C:/foo).
  return (
    value.startsWith("/") ||
    value.startsWith("//") ||
    /^[A-Za-z]:\//.test(value)
  );
}

function isPathWithinRoot(rootPath, targetPath) {
  const relative = path.relative(rootPath, targetPath);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function hasUnpinnedVersionIndicator(line) {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  // Command contexts where floating versions are risky.
  if (
    /\b(npm|pnpm|yarn|bun|npx|uvx|pip|pipx)\b[^\n]*(?:@latest\b|\blatest\b)/i.test(
      trimmed
    )
  ) {
    return true;
  }

  // package.json/yaml style dependency entries with floating ranges.
  if (
    /["'][^"']+["']\s*:\s*["'](\^|~|\*|latest\b)[^"']*["']/i.test(trimmed)
  ) {
    return true;
  }

  // pyproject/requirements style entries with broad lower-bound only specs.
  if (
    /\b[A-Za-z0-9_.-]+\s*(>=|>|~=)\s*\d+(?:\.\d+){0,2}\b(?!\s*,\s*<)/.test(
      trimmed
    )
  ) {
    return true;
  }

  return false;
}

const severityLevels = {
  high: "high",
  medium: "medium",
  info: "info",
};

const LINE_RULES = [
  {
    rule_id: "guardrail-bypass-language",
    severity: severityLevels.high,
    regex:
      /\b(ignore (all|any|previous) (guardrails?|rules?|instructions?)|bypass (the )?(guardrails?|safety|policy)|disable (safety|guardrails?)|do not ask (for )?(confirmation|consent)|without prompting (the )?user)\b/i,
    reason: "Language suggests bypassing policy or confirmation controls.",
    suggested_fix:
      "Require explicit policy adherence and user-confirmation steps for risky actions.",
  },
  {
    rule_id: "remote-shell-execution",
    severity: severityLevels.high,
    regex: /\b(curl|wget)\b[^\n|]*\|\s*(sh|bash|zsh|pwsh|powershell)\b/i,
    reason: "Piping remote content directly to a shell is high-risk.",
    suggested_fix:
      "Download, verify integrity/signature, and run from a reviewed local file.",
  },
  {
    rule_id: "autoyes-package-exec",
    severity: severityLevels.high,
    regex:
      /\b(npx|npm\s+exec|pnpm\s+dlx|uvx|pipx\s+run)\b[^\n]*\s(-y|--yes)\b/i,
    reason:
      "Auto-yes execution can bypass human review of package/runtime prompts.",
    suggested_fix:
      "Remove automatic consent flags and require explicit reviewer-approved invocation.",
  },
  {
    rule_id: "package-exec-command",
    severity: severityLevels.medium,
    regex: /\b(npx|npm\s+exec|pnpm\s+dlx|uvx|pipx\s+run|uv\s+tool\s+run)\b/i,
    reason: "Dynamic package/runtime execution introduces supply-chain risk.",
    suggested_fix:
      "Pin exact versions and document manual confirmation controls.",
  },
  {
    rule_id: "unpinned-version-indicator",
    severity: severityLevels.medium,
    reason: "Unpinned dependencies can change behavior between runs.",
    suggested_fix: "Use exact immutable versions or commit hashes.",
    matcher: (line) => hasUnpinnedVersionIndicator(line),
  },
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) {
      continue;
    }

    args[key.slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

function ensureParentDir(filePath) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
}

function normalizeRelativePath(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "");
  if (!cleaned) {
    return "";
  }

  if (/(^|\/)\.\.(\/|$)/.test(cleaned)) {
    throw new Error(`Unsafe relative path in changed files list: ${value}`);
  }

  if (isLikelyAbsolutePath(cleaned)) {
    throw new Error(`Absolute paths are not allowed in changed files list: ${value}`);
  }

  return cleaned;
}

function isPotentialText(contentBuffer) {
  const nullByte = contentBuffer.includes(0x00);
  return !nullByte;
}

function addFinding(findings, finding) {
  findings.push({
    rule_id: finding.rule_id,
    severity: finding.severity,
    file: finding.file,
    line: finding.line,
    match: finding.match.slice(0, 180),
    reason: finding.reason,
    suggested_fix: finding.suggested_fix,
  });
}

function scanLineRules(filePath, content, findings) {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const rule of LINE_RULES) {
      if (typeof rule.shouldApply === "function" && !rule.shouldApply(line)) {
        continue;
      }

      const matchedByRegex = rule.regex ? rule.regex.test(line) : false;
      const matchedByFunction =
        typeof rule.matcher === "function" ? rule.matcher(line) : false;
      if (!matchedByRegex && !matchedByFunction) {
        continue;
      }

      addFinding(findings, {
        rule_id: rule.rule_id,
        severity: rule.severity,
        file: filePath,
        line: index + 1,
        match: line.trim(),
        reason: rule.reason,
        suggested_fix: rule.suggested_fix,
      });
    }
  }
}

function scanSkillScriptPath(filePath, findings) {
  const normalized = filePath.replace(/\\/g, "/");
  const isSkillScript =
    normalized.startsWith("skills/") ||
    /^plugins\/[^/]+\/skills\//.test(normalized);
  if (!isSkillScript) {
    return;
  }

  const extension = path.extname(normalized).toLowerCase();
  if (!SCRIPT_EXTENSIONS.has(extension)) {
    return;
  }

  addFinding(findings, {
    rule_id: "skill-script-touched",
    severity: severityLevels.info,
    file: normalized,
    line: 1,
    match: normalized,
    reason:
      "Script asset under a skill may require external runtime/dependencies.",
    suggested_fix:
      "Document dependencies, pin versions, and avoid implicit network installs.",
  });
}

function severityCounts(findings) {
  return findings.reduce(
    (acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    },
    { high: 0, medium: 0, info: 0 }
  );
}

function toMarkdownReport(findings, scannedFiles, skippedFiles) {
  const marker = "<!-- pr-risk-scan-results -->";
  const counts = severityCounts(findings);
  const summary = [
    marker,
    "## 🔒 PR Risk Scan Results",
    "",
    `Scanned **${scannedFiles.length}** changed file(s).`,
    "",
    "| Severity | Count |",
    "|---|---:|",
    `| 🔴 High | ${counts.high} |`,
    `| 🟠 Medium | ${counts.medium} |`,
    `| ℹ️ Info | ${counts.info} |`,
    "",
  ];

  if (findings.length === 0) {
    summary.push(
      "✅ No matching risk patterns were detected in changed files."
    );
  } else {
    summary.push("| Severity | Rule | File | Line | Match |");
    summary.push("|---|---|---|---:|---|");
    for (const finding of findings.slice(0, 100)) {
      const severity =
        finding.severity === severityLevels.high
          ? "🔴"
          : finding.severity === severityLevels.medium
          ? "🟠"
          : "ℹ️";
      const matchText = finding.match
        .replace(/\\/g, "\\\\")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\|/g, "\\|")
        .replace(/@/g, "@\u200b");
      const backtickRuns = matchText.match(/`+/g);
      const fenceLength = backtickRuns
        ? Math.max(...backtickRuns.map((run) => run.length)) + 1
        : 1;
      const fence = "`".repeat(fenceLength);
      const match = `${fence}${matchText}${fence}`;
      summary.push(
        `| ${severity} | \`${finding.rule_id}\` | \`${finding.file}\` | ${finding.line} | ${match} |`
      );
    }

    if (findings.length > 100) {
      summary.push(
        "",
        `_${findings.length - 100} additional finding(s) omitted from table._`
      );
    }
  }

  if (skippedFiles.length > 0) {
    summary.push(
      "",
      "<details>",
      "<summary>Skipped non-text or missing files</summary>",
      ""
    );
    summary.push(skippedFiles.map((filePath) => `- ${filePath}`).join("\n"));
    summary.push("", "</details>");
  }

  summary.push(
    "",
    "> This is an automated soft-gate report. Findings indicate review targets and do not block merge by themselves."
  );

  return `${summary.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.files || !args["output-json"] || !args["output-md"]) {
    throw new Error(
      "Usage: node ./eng/pr-risk-scan.mjs --files <changed-files.txt> --output-json <results.json> --output-md <report.md>"
    );
  }

  const changedFilesPath = path.resolve(args.files);
  const outputJsonPath = path.resolve(args["output-json"]);
  const outputMarkdownPath = path.resolve(args["output-md"]);
  const repoRootPath = process.cwd();

  const changedFiles = fs
    .readFileSync(changedFilesPath, "utf8")
    .split(/\r?\n/)
    .map(normalizeRelativePath)
    .filter(Boolean);

  const findings = [];
  const scannedFiles = [];
  const skippedFiles = [];

  for (const relativePath of changedFiles) {
    const absolutePath = path.resolve(repoRootPath, relativePath);
    if (!isPathWithinRoot(repoRootPath, absolutePath)) {
      throw new Error(`Path escapes repository root: ${relativePath}`);
    }

    scanSkillScriptPath(relativePath, findings);

    if (!fs.existsSync(absolutePath)) {
      skippedFiles.push(relativePath);
      continue;
    }

    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      skippedFiles.push(`${relativePath} (skipped: symbolic link)`);
      continue;
    }
    if (!stat.isFile()) {
      skippedFiles.push(relativePath);
      continue;
    }

    if (stat.size > 1024 * 1024) {
      skippedFiles.push(`${relativePath} (skipped: file too large)`);
      continue;
    }

    const contentBuffer = fs.readFileSync(absolutePath);
    if (!isPotentialText(contentBuffer)) {
      skippedFiles.push(relativePath);
      continue;
    }

    const content = contentBuffer.toString("utf8");
    scanLineRules(relativePath, content, findings);
    scannedFiles.push(relativePath);
  }

  const results = {
    generated_at: new Date().toISOString(),
    scanned_files: scannedFiles,
    skipped_files: skippedFiles,
    finding_count: findings.length,
    severity_counts: severityCounts(findings),
    findings,
  };

  ensureParentDir(outputJsonPath);
  ensureParentDir(outputMarkdownPath);
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(results, null, 2)}\n`);
  fs.writeFileSync(
    outputMarkdownPath,
    toMarkdownReport(findings, scannedFiles, skippedFiles)
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
