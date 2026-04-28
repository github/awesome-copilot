#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT_FOLDER } from "./constants.mjs";
import { setupGracefulShutdown } from "./utils/graceful-shutdown.mjs";

const DEFAULT_REPO = "github/awesome-copilot";
const DEFAULT_LIMIT = 500;
const DEFAULT_CMD_TIMEOUT = 30_000;

const REPORT_DEFINITIONS = [
  {
    heading: "PRs that target `main`",
    fileName: "prs-targeting-main.json",
    predicate: (pr) => pr.targetBranch === "main"
  },
  {
    heading: "PRs that target `staged` which are passing all checks and have less than 10 files",
    fileName: "prs-staged-passing-under-10-files.json",
    predicate: (pr) => pr.targetBranch === "staged" && pr.checksPass && pr.fileCount < 10
  },
  {
    heading: "PRs that target `staged` which have between 10 and 50 files",
    fileName: "prs-staged-10-to-50-files.json",
    predicate: (pr) => pr.targetBranch === "staged" && pr.fileCount >= 10 && pr.fileCount <= 50
  },
  {
    heading: "PRs that target `staged` with greater than 50 files",
    fileName: "prs-staged-over-50-files.json",
    predicate: (pr) => pr.targetBranch === "staged" && pr.fileCount > 50
  }
];

setupGracefulShutdown("generate-open-pr-report");

function printUsage() {
  console.log(`Usage: node eng/generate-open-pr-report.mjs [--repo owner/name] [--output-dir path] [--limit N]

Generate open PR reports for a GitHub repository.

Outputs:
  - open-pr-report.md
  - prs-targeting-main.json
  - prs-staged-passing-under-10-files.json
  - prs-staged-10-to-50-files.json
  - prs-staged-over-50-files.json

Options:
  --repo        GitHub repository in owner/name format (default: ${DEFAULT_REPO})
  --output-dir  Directory for generated reports (default: <repo-root>/reports)
  --limit       Max number of open PRs to fetch (default: ${DEFAULT_LIMIT})
  --help, -h    Show this help text`);
}

function parseArgs(argv) {
  const options = {
    repo: DEFAULT_REPO,
    outputDir: path.join(ROOT_FOLDER, "reports"),
    limit: DEFAULT_LIMIT
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--repo") {
      options.repo = argv[i + 1] ?? "";
      i += 1;
      continue;
    }

    if (arg === "--output-dir") {
      options.outputDir = argv[i + 1] ?? "";
      i += 1;
      continue;
    }

    if (arg === "--limit") {
      options.limit = Number.parseInt(argv[i + 1] ?? "", 10);
      i += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (!options.repo || !options.repo.includes("/")) {
    throw new Error("--repo must be in owner/name format.");
  }

  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error("--limit must be a positive integer.");
  }

  if (!options.outputDir) {
    throw new Error("--output-dir is required.");
  }

  return options;
}

function ensureCommandAvailable(command) {
  try {
    execFileSync(command, ["--version"], {
      stdio: "ignore",
      timeout: DEFAULT_CMD_TIMEOUT
    });
  } catch (error) {
    throw new Error(`Missing required command: ${command}`);
  }
}

function runGhJson(args) {
  const output = execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: DEFAULT_CMD_TIMEOUT
  });

  return JSON.parse(output);
}

function getCheckState(statusCheckRollup) {
  if (!Array.isArray(statusCheckRollup) || statusCheckRollup.length === 0) {
    return "NONE";
  }

  if (statusCheckRollup.some((check) => check.status !== "COMPLETED")) {
    return "PENDING";
  }

  const failureConclusions = new Set([
    "FAILURE",
    "TIMED_OUT",
    "ACTION_REQUIRED",
    "CANCELLED",
    "STALE",
    "STARTUP_FAILURE"
  ]);

  if (statusCheckRollup.some((check) => failureConclusions.has(check.conclusion ?? ""))) {
    return "FAILURE";
  }

  const successConclusions = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);
  const allSuccessful = statusCheckRollup.every((check) => successConclusions.has(check.conclusion ?? ""));
  return allSuccessful ? "SUCCESS" : "FAILURE";
}

function normalizePullRequest(pr) {
  const checkState = getCheckState(pr.statusCheckRollup);

  return {
    id: pr.number,
    title: pr.title,
    author: pr.author?.login ?? "ghost",
    checksPass: checkState === "SUCCESS",
    checkState,
    targetBranch: pr.baseRefName,
    fileCount: pr.changedFiles,
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    createdAgeDays: getAgeInDays(pr.createdAt),
    updatedAgeDays: getAgeInDays(pr.updatedAt),
    url: pr.url
  };
}

function getCheckLabel(pr) {
  if (pr.checkState === "SUCCESS") {
    return "Yes";
  }

  if (pr.checkState === "PENDING") {
    return "Pending";
  }

  if (pr.checkState === "NONE") {
    return "No checks";
  }

  return "No";
}

function escapeMarkdownCell(value) {
  return String(value).replaceAll("|", "\\|");
}

function getAgeInDays(timestamp) {
  const milliseconds = Date.now() - new Date(timestamp).getTime();
  return Math.max(0, Math.floor(milliseconds / (24 * 60 * 60 * 1000)));
}

function formatTimestampWithAge(timestamp) {
  return `${timestamp.slice(0, 10)} (${getAgeInDays(timestamp)}d ago)`;
}

function renderTable(prs) {
  const lines = [
    "| PR title + ID | Author | Whether checks pass | Created | Updated | Link to PR |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  if (prs.length === 0) {
    lines.push("| None | - | - | - | - | - |");
    return lines.join("\n");
  }

  for (const pr of prs) {
    lines.push(
      `| ${escapeMarkdownCell(pr.title)} (#${pr.id}) | ${escapeMarkdownCell(pr.author)} | ${getCheckLabel(pr)} | ${formatTimestampWithAge(pr.createdAt)} | ${formatTimestampWithAge(pr.updatedAt)} | [Link](${pr.url}) |`
    );
  }

  return lines.join("\n");
}

function renderMarkdownReport(repo, generatedAt, categorizedReports) {
  const sections = [
    "# Open PR report",
    "",
    `**Repository:** \`${repo}\`  `,
    `**Generated:** \`${generatedAt}\``
  ];

  for (const report of categorizedReports) {
    sections.push("", `## ${report.heading}`, "", renderTable(report.items));
  }

  return `${sections.join("\n")}\n`;
}

function writeJsonReport(filePath, items) {
  fs.writeFileSync(filePath, `${JSON.stringify(items, null, 2)}\n`);
}

function generateOpenPrReport() {
  const options = parseArgs(process.argv.slice(2));

  ensureCommandAvailable("gh");

  console.log(`Fetching open PRs from ${options.repo}...`);

  const pullRequests = runGhJson([
    "pr",
    "list",
    "--repo",
    options.repo,
    "--state",
    "open",
    "--limit",
    String(options.limit),
    "--json",
    "number,title,url,author,baseRefName,changedFiles,createdAt,updatedAt,statusCheckRollup"
  ]);

  const normalizedPullRequests = pullRequests.map(normalizePullRequest);
  const categorizedReports = REPORT_DEFINITIONS.map((report) => ({
    ...report,
    items: normalizedPullRequests.filter(report.predicate)
  }));

  fs.mkdirSync(options.outputDir, { recursive: true });

  for (const report of categorizedReports) {
    writeJsonReport(path.join(options.outputDir, report.fileName), report.items);
  }

  const markdownReport = renderMarkdownReport(
    options.repo,
    new Date().toISOString(),
    categorizedReports
  );

  const markdownFilePath = path.join(options.outputDir, "open-pr-report.md");
  fs.writeFileSync(markdownFilePath, markdownReport);

  console.log(`Generated reports in ${options.outputDir}:`);
  console.log("  open-pr-report.md");
  for (const report of categorizedReports) {
    console.log(`  ${report.fileName}`);
  }
}

generateOpenPrReport();
