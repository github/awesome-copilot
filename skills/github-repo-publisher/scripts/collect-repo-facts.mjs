#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  let repoPath = ".";
  for (let i = 0; i < argv.length; i += 1) {
    if ((argv[i] === "--repo" || argv[i] === "-r" || argv[i] === "--repo-path") && argv[i + 1]) {
      repoPath = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log("Usage: node scripts/collect-repo-facts.mjs --repo <path>");
      process.exit(0);
    }
  }
  return { repoPath };
}

function gitLines(root, args) {
  try {
    const output = execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.split(/\r?\n/).filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

function pathExists(target) {
  try {
    fs.accessSync(target);
    return true;
  } catch {
    return false;
  }
}

function rel(root, target) {
  return path.relative(root, target).split(path.sep).join("/");
}

function normalizeGitPath(file) {
  return file.split("\\").join("/").replace(/^\.\//, "");
}

function uniqueSorted(files) {
  return [...new Set(files.map(normalizeGitPath).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function isInstructionFile(file) {
  const normalized = normalizeGitPath(file);
  const lower = normalized.toLowerCase();
  const basename = path.posix.basename(lower);
  const instructionNames = new Set(["agents.md", "claude.md", "gemini.md", "codex.md"]);

  return instructionNames.has(basename) ||
    lower === ".cursorrules" ||
    lower === ".windsurfrules" ||
    lower === ".clinerules" ||
    lower === ".cursor/rules" ||
    lower.startsWith(".cursor/rules/") ||
    lower === ".claude" ||
    lower.startsWith(".claude/") ||
    lower === ".codex" ||
    lower.startsWith(".codex/");
}

function looksPublicFacing(file) {
  const normalized = normalizeGitPath(file);
  const lower = normalized.toLowerCase();
  const basename = path.posix.basename(lower);

  if (isInstructionFile(normalized)) {
    return false;
  }

  if (/^readme(\.|$)/i.test(basename) ||
      /^(license|copying|notice|changelog|contributing|security)(\.|$)/i.test(basename)) {
    return true;
  }

  const publicDirs = [
    "docs/",
    "doc/",
    "examples/",
    "example/",
    "samples/",
    "sample/",
    "assets/",
    "images/",
    "screenshots/",
    "public/",
    "media/",
    ".github/workflows/",
  ];
  if (publicDirs.some((dir) => lower.startsWith(dir))) {
    return true;
  }

  const manifestNames = new Set([
    "package.json",
    "pyproject.toml",
    "cargo.toml",
    "go.mod",
    "composer.json",
    "gemfile",
    "dockerfile",
    "manifest.json",
    "extension.json",
  ]);
  if (manifestNames.has(basename)) {
    return true;
  }

  const ext = path.posix.extname(lower);
  const publicAssetExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);
  const publicAssetPattern = /(readme|screenshot|preview|social|demo|hero|cover|banner|logo)/i;
  return publicAssetExtensions.has(ext) && publicAssetPattern.test(normalized);
}

function shouldIgnore(root, target, ignoredDirs) {
  const parts = rel(root, target).split("/").filter(Boolean);
  return parts.some((part) => ignoredDirs.has(part));
}

function readLinesUtf8(file) {
  const content = fs.readFileSync(file, "utf8");
  if (content.length === 0) {
    return [];
  }
  const lines = content.split(/\r\n|\n|\r/);
  if (/\r\n|\n|\r/.test(content.slice(-2))) {
    lines.pop();
  }
  return lines;
}

function walkDirs(root, maxDepth, ignoredDirs) {
  const results = [];

  function visit(dir, depth) {
    if (depth > maxDepth) {
      return;
    }

    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (shouldIgnore(root, fullPath, ignoredDirs)) {
        continue;
      }
      results.push(fullPath);
      visit(fullPath, depth + 1);
    }
  }

  visit(root, 1);
  return results;
}

function walkFiles(root, maxDepth, ignoredDirs) {
  const results = [];

  function visit(dir, depth) {
    if (depth > maxDepth) {
      return;
    }

    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (shouldIgnore(root, fullPath, ignoredDirs)) {
        continue;
      }
      if (entry.isDirectory()) {
        visit(fullPath, depth + 1);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }

  visit(root, 1);
  return results;
}

const { repoPath } = parseArgs(process.argv.slice(2));
const root = path.resolve(repoPath);

const facts = {
  root,
  git: {},
  files: {},
  manifests: [],
  scripts: {},
  localeSignals: [],
  imageAssets: [],
};

if (pathExists(path.join(root, ".git"))) {
  facts.git.branch = gitLines(root, ["branch", "--show-current"])[0] ?? null;
  facts.git.status = gitLines(root, ["status", "--short", "--branch"]);
  facts.git.remotes = gitLines(root, ["remote", "-v"]);
  facts.git.defaultBranchGuess = gitLines(root, ["symbolic-ref", "refs/remotes/origin/HEAD"])[0] ?? null;
  facts.git.trackedFiles = uniqueSorted(gitLines(root, ["ls-files"]));
  facts.git.untrackedFiles = uniqueSorted(gitLines(root, ["ls-files", "--others", "--exclude-standard"]));
  facts.git.ignoredFiles = uniqueSorted(gitLines(root, ["ls-files", "--others", "--ignored", "--exclude-standard"]));

  const trackedInstructions = facts.git.trackedFiles.filter(isInstructionFile);
  const untrackedInstructions = facts.git.untrackedFiles.filter(isInstructionFile);
  const ignoredInstructions = facts.git.ignoredFiles.filter(isInstructionFile);
  facts.git.instructionFiles = {
    tracked: trackedInstructions,
    untracked: untrackedInstructions,
    ignored: ignoredInstructions,
    localOnly: uniqueSorted([...untrackedInstructions, ...ignoredInstructions]),
  };
  facts.git.trackingReview = {
    localOnlyInstructionFiles: facts.git.instructionFiles.localOnly,
    possiblyMistakenlyTrackedInstructionFiles: trackedInstructions,
    possiblyForgottenPublicFiles: facts.git.untrackedFiles.filter(looksPublicFacing),
  };
}

const interesting = [
  "README.md",
  "README.mdx",
  "README.txt",
  "LICENSE",
  "LICENSE.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CHANGELOG.md",
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "composer.json",
  "Gemfile",
  "Dockerfile",
  "manifest.json",
  "extension.json",
];

const manifestNames = new Set([
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "composer.json",
  "Gemfile",
  "manifest.json",
  "extension.json",
]);

for (const file of interesting) {
  const fullPath = path.join(root, file);
  if (!pathExists(fullPath)) {
    continue;
  }
  const stat = fs.statSync(fullPath);
  facts.files[file] = {
    size: stat.size,
    modified: stat.mtime.toISOString(),
  };
  if (manifestNames.has(file)) {
    facts.manifests.push(file);
  }
}

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.startsWith("README")) {
    continue;
  }

  const fullPath = path.join(root, entry.name);
  const stat = fs.statSync(fullPath);
  if (!facts.files[entry.name]) {
    facts.files[entry.name] = {
      size: stat.size,
      modified: stat.mtime.toISOString(),
    };
  }

  try {
    const lines = readLinesUtf8(fullPath);
    facts.files[entry.name].lineCount = lines.length;
    facts.files[entry.name].maxLineLength = lines.length
      ? Math.max(...lines.map((line) => line.length))
      : 0;
  } catch (error) {
    facts.files[entry.name].lineStatsError = error.message;
  }
}

const packageJsonPath = path.join(root, "package.json");
if (pathExists(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    facts.package = {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      scripts: pkg.scripts,
    };
  } catch (error) {
    facts.packageParseError = error.message;
  }
}

const ignoredDirs = new Set([".git", "node_modules", "dist", "build", "out", "target", ".next", ".cache", "vendor"]);
const localeDirNames = new Set(["_locales", "locales", "locale", "i18n", "translations", "translation", "lang", "langs"]);
facts.localeSignals = walkDirs(root, 4, ignoredDirs)
  .filter((dir) => localeDirNames.has(path.basename(dir).toLowerCase()))
  .slice(0, 40)
  .map((dir) => rel(root, dir));

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);
const imageNamePattern = /(screenshot|preview|social|demo|hero|readme|cover|banner|logo)/i;
const imageDirPattern = /(docs|assets|images|screenshots|public|media)/i;
facts.imageAssets = walkFiles(root, 5, ignoredDirs)
  .filter((file) => {
    const ext = path.extname(file).toLowerCase();
    const dirname = path.dirname(file);
    return imageExtensions.has(ext) && (
      imageNamePattern.test(path.basename(file)) ||
      imageNamePattern.test(dirname) ||
      imageDirPattern.test(dirname)
    );
  })
  .slice(0, 80)
  .map((file) => rel(root, file));

const workflowsDir = path.join(root, ".github", "workflows");
facts.ci = pathExists(workflowsDir)
  ? walkFiles(workflowsDir, 3, ignoredDirs).map((file) => rel(root, file))
  : [];

facts.topLevel = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.name !== ".git")
  .slice(0, 80)
  .map((entry) => entry.name);

console.log(JSON.stringify(facts, null, 2));
