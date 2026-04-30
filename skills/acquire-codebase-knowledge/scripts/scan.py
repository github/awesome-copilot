#!/usr/bin/env python3
"""
scan.py — Collect project discovery information for the acquire-codebase-knowledge skill.
Run from the project root directory.

Usage: python3 scan.py [OPTIONS]

Options:
  --output FILE   Write output to FILE instead of stdout
  --help          Show this message and exit

Exit codes:
  0  Success
  1  Usage error
"""

import os
import sys
import argparse
import subprocess
import json
from pathlib import Path
from typing import List, Set
import re

TREE_LIMIT = 200
TREE_MAX_DEPTH = 3
TODO_LIMIT = 60
MANIFEST_PREVIEW_LINES = 80
RECENT_COMMITS_LIMIT = 20
CHURN_LIMIT = 20

EXCLUDE_DIRS = {
    "node_modules", ".git", "dist", "build", "out", ".next", ".nuxt",
    "__pycache__", ".venv", "venv", ".tox", "target", "vendor",
    "coverage", ".nyc_output", "generated", ".cache", ".turbo",
    ".yarn", ".pnp", "bin", "obj"
}

MANIFESTS = [
    # JavaScript/Node.js
    "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
    "deno.json", "deno.jsonc",
    # Python
    "requirements.txt", "Pipfile", "Pipfile.lock", "pyproject.toml", "setup.py", "setup.cfg",
    "poetry.lock", "pdm.lock", "uv.lock",
    # Go
    "go.mod", "go.sum",
    # Rust
    "Cargo.toml", "Cargo.lock",
    # Java/Kotlin
    "pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts",
    "gradle.properties",
    # PHP/Composer
    "composer.json", "composer.lock",
    # Ruby
    "Gemfile", "Gemfile.lock", "*.gemspec",
    # Elixir
    "mix.exs", "mix.lock",
    # Dart/Flutter
    "pubspec.yaml", "pubspec.lock",
    # .NET/C#
    "*.csproj", "*.sln", "*.slnx", "global.json", "packages.config",
    # Swift
    "Package.swift", "Package.resolved",
    # Scala
    "build.sbt", "scala-cli.yml",
    # Haskell
    "*.cabal", "stack.yaml", "cabal.project", "cabal.project.local",
    # OCaml
    "dune-project", "opam", "opam.lock",
    # Nim
    "*.nimble", "nim.cfg",
    # Crystal
    "shard.yml", "shard.lock",
    # R
    "DESCRIPTION", "renv.lock",
    # Julia
    "Project.toml", "Manifest.toml",
    # Build systems
    "CMakeLists.txt", "Makefile", "GNUmakefile",
    "SConstruct", "build.xml",
    "BUILD", "BUILD.bazel", "WORKSPACE", "bazel.lock",
    "justfile", ".justfile", "Taskfile.yml",
    "tox.ini", "Vagrantfile"
]

ENTRY_CANDIDATES = [
    # JavaScript/Node.js/TypeScript
    "src/index.ts", "src/index.js", "src/index.mjs",
    "src/main.ts", "src/main.js", "src/main.py",
    "src/app.ts", "src/app.js",
    "src/server.ts", "src/server.js",
    "index.ts", "index.js", "app.ts", "app.js",
    "lib/index.ts", "lib/index.js",
    # Go
    "main.go", "cmd/main.go", "cmd/*/main.go",
    # Python
    "main.py", "app.py", "server.py", "run.py", "cli.py",
    "src/main.py", "src/__main__.py",
    # .NET/C#
    "Program.cs", "src/Program.cs", "Main.cs",
    # Java
    "Main.java", "Application.java", "App.java",
    "src/main/java/Main.java",
    # Kotlin
    "Main.kt", "Application.kt", "App.kt",
    # Rust
    "src/main.rs", "src/lib.rs",
    # Swift
    "main.swift", "Package.swift", "Sources/main.swift",
    # Ruby
    "app.rb", "main.rb", "lib/app.rb",
    # PHP
    "index.php", "app.php", "public/index.php",
    # Go
    "cmd/*/main.go",
    # Scala
    "src/main/scala/Main.scala",
    # Haskell
    "Main.hs", "app/Main.hs",
    # Clojure
    "src/core.clj", "-main.clj",
    # Elixir
    "lib/application.ex", "mix.exs",
]

LINT_FILES = [
    ".eslintrc", ".eslintrc.json", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.yml", ".eslintrc.yaml",
    "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs",
    ".prettierrc", ".prettierrc.json", ".prettierrc.js", ".prettierrc.yml",
    "prettier.config.js", "prettier.config.mjs",
    ".editorconfig",
    "tsconfig.json", "tsconfig.base.json", "tsconfig.build.json",
    ".golangci.yml", ".golangci.yaml",
    "setup.cfg", ".flake8", ".pylintrc", "mypy.ini",
    ".rubocop.yml", "phpcs.xml", "phpstan.neon",
    "biome.json", "biome.jsonc"
]

ENV_TEMPLATES = [".env.example", ".env.template", ".env.sample", ".env.defaults", ".env.local.example"]

SOURCE_EXTS = [
    "ts", "tsx", "js", "jsx", "mjs", "cjs",
    "py", "go", "java", "kt", "rb", "php",
    "rs", "cs", "cpp", "c", "h", "ex", "exs",
    "swift", "scala", "clj", "cljs", "lua",
    "vim", "vim", "hs", "ml", "ml", "nim", "cr",
    "r", "jl", "groovy", "gradle", "xml", "json"
]

MONOREPO_FILES = ["pnpm-workspace.yaml", "lerna.json", "nx.json", "rush.json", "turbo.json", "moon.yml"]
MONOREPO_DIRS = ["packages", "apps", "libs", "services", "modules"]

CI_CD_CONFIGS = {
    ".github/workflows": "GitHub Actions",
    ".gitlab-ci.yml": "GitLab CI",
    "Jenkinsfile": "Jenkins",
    ".circleci/config.yml": "CircleCI",
    ".travis.yml": "Travis CI",
    "azure-pipelines.yml": "Azure Pipelines",
    "appveyor.yml": "AppVeyor",
    ".drone.yml": "Drone CI",
    ".woodpecker.yml": "Woodpecker CI",
    "bitbucket-pipelines.yml": "Bitbucket Pipelines"
}

CONTAINER_FILES = [
    "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
    ".dockerignore", "Dockerfile.*",
    "k8s", "kustomization.yaml", "Chart.yaml",
    "Vagrantfile", "podman-compose.yml"
]

SECURITY_CONFIGS = [
    ".snyk", "security.txt", "SECURITY.md",
    ".dependabot.yml", ".whitesource",
    "sbom.json", "sbom.spdx", ".bandit.yaml"
]

PERFORMANCE_MARKERS = [
    "benchmark", "bench", "perf.data", ".prof",
    "k6.js", "locustfile.py", "jmeter.jmx"
]


def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Scan the current directory (project root) and output discovery information "
                    "for the acquire-codebase-knowledge skill.",
        add_help=True
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Write output to FILE instead of stdout"
    )
    return parser.parse_args()


def should_exclude(path: Path) -> bool:
    """Check if a path should be excluded from scanning."""
    return any(part in EXCLUDE_DIRS for part in path.parts)


def get_directory_tree(max_depth: int = TREE_MAX_DEPTH) -> List[str]:
    """Get directory tree up to max_depth."""
    files = []

    def walk(path: Path, depth: int):
        if depth > max_depth or should_exclude(path):
            return
        try:
            for item in sorted(path.iterdir()):
                if should_exclude(item):
                    continue
                rel_path = item.relative_to(Path.cwd())
                files.append(str(rel_path))
                if item.is_dir():
                    walk(item, depth + 1)
        except (PermissionError, OSError):
            pass

    walk(Path.cwd(), 0)
    return files[:TREE_LIMIT]


def find_manifest_files() -> List[str]:
    """Find manifest files matching patterns."""
    found = []
    for pattern in MANIFESTS:
        if "*" in pattern:
            # Handle glob patterns
            for path in Path.cwd().glob(pattern):
                if path.is_file() and not should_exclude(path):
                    found.append(path.name)
        else:
            path = Path.cwd() / pattern
            if path.is_file():
                found.append(pattern)
    return sorted(set(found))


def read_file_preview(filepath: Path, max_lines: int = MANIFEST_PREVIEW_LINES) -> str:
    """Read file with line limit."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()

        if not lines:
            return "None found."

        preview = ''.join(lines[:max_lines])
        if len(lines) > max_lines:
            preview += f"\n[TRUNCATED] Showing first {max_lines} of {len(lines)} lines."
        return preview
    except Exception as e:
        return f"[Error reading file: {e}]"


def find_entry_points() -> List[str]:
    """Find entry point candidates."""
    found = []
    for candidate in ENTRY_CANDIDATES:
        if Path(candidate).exists():
            found.append(candidate)
    return found


def find_lint_config() -> List[str]:
    """Find linting and formatting config files."""
    found = []
    for filename in LINT_FILES:
        if Path(filename).exists():
            found.append(filename)
    return found


def find_env_templates() -> List[tuple]:
    """Find environment variable templates."""
    found = []
    for filename in ENV_TEMPLATES:
        path = Path(filename)
        if path.exists():
            found.append((filename, path))
    return found


def search_todos() -> List[str]:
    """Search for TODO/FIXME/HACK comments."""
    todos = []
    patterns = ["TODO", "FIXME", "HACK"]
    exclude_dirs_str = "|".join(EXCLUDE_DIRS | {"test", "tests", "__tests__", "spec", "__mocks__", "fixtures"})

    try:
        for root, dirs, files in os.walk(Path.cwd()):
            # Remove excluded directories from dirs to prevent os.walk from descending
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and d not in {"test", "tests", "__tests__", "spec", "__mocks__", "fixtures"}]

            for file in files:
                # Check file extension
                ext = Path(file).suffix.lstrip('.')
                if ext not in SOURCE_EXTS:
                    continue

                filepath = Path(root) / file
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                        for line_num, line in enumerate(f, 1):
                            for pattern in patterns:
                                if pattern in line:
                                    rel_path = filepath.relative_to(Path.cwd())
                                    todos.append(f"{rel_path}:{line_num}: {line.strip()}")
                except Exception:
                    pass
    except Exception:
        pass

    return todos[:TODO_LIMIT]


def get_git_commits() -> List[str]:
    """Get recent git commits."""
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "-n", str(RECENT_COMMITS_LIMIT)],
            capture_output=True,
            text=True,
            cwd=Path.cwd()
        )
        if result.returncode == 0:
            return result.stdout.strip().split('\n') if result.stdout.strip() else []
        return []
    except Exception:
        return []


def get_git_churn() -> List[str]:
    """Get high-churn files from last 90 days."""
    try:
        result = subprocess.run(
            ["git", "log", "--since=90 days ago", "--name-only", "--pretty=format:"],
            capture_output=True,
            text=True,
            cwd=Path.cwd()
        )
        if result.returncode == 0:
            files = [f.strip() for f in result.stdout.split('\n') if f.strip()]
            # Count occurrences
            from collections import Counter
            counts = Counter(files)
            churn = sorted(counts.items(), key=lambda x: x[1], reverse=True)
            return [f"{count:4d} {filename}" for filename, count in churn[:CHURN_LIMIT]]
        return []
    except Exception:
        return []


def is_git_repo() -> bool:
    """Check if current directory is a git repository."""
    try:
        subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            capture_output=True,
            cwd=Path.cwd(),
            timeout=2
        )
        return True
    except Exception:
        return False


def detect_monorepo() -> List[str]:
    """Detect monorepo signals."""
    signals = []

    for filename in MONOREPO_FILES:
        if Path(filename).exists():
            signals.append(f"Monorepo tool detected: {filename}")

    for dirname in MONOREPO_DIRS:
        if Path(dirname).is_dir():
            signals.append(f"Sub-package directory found: {dirname}/")

    # Check package.json workspaces
    if Path("package.json").exists():
        try:
            with open("package.json", 'r') as f:
                content = f.read()
                if '"workspaces"' in content:
                    signals.append("package.json has 'workspaces' field (npm/yarn workspaces monorepo)")
        except Exception:
            pass

    return signals


def detect_ci_cd_pipelines() -> List[str]:
    """Detect CI/CD pipeline configurations."""
    pipelines = []

    for config_path, pipeline_name in CI_CD_CONFIGS.items():
        path = Path(config_path)
        if path.is_file():
            pipelines.append(f"CI/CD: {pipeline_name}")
        elif path.is_dir():
            # Check for workflow files in directory
            try:
                if list(path.glob("*.yml")) or list(path.glob("*.yaml")):
                    pipelines.append(f"CI/CD: {pipeline_name}")
            except Exception:
                pass

    return pipelines


def detect_containers() -> List[str]:
    """Detect containerization and orchestration configs."""
    containers = []

    for config in CONTAINER_FILES:
        path = Path(config)
        if path.is_file():
            if "Dockerfile" in config:
                containers.append("Container: Docker found")
            elif "docker-compose" in config:
                containers.append("Orchestration: Docker Compose found")
            elif config.endswith(".yaml") or config.endswith(".yml"):
                containers.append(f"Container/Orchestration: {config}")
        elif path.is_dir():
            if config in ["k8s", "kubernetes"]:
                containers.append("Orchestration: Kubernetes configs found")
            try:
                if list(path.glob("*.yml")) or list(path.glob("*.yaml")):
                    containers.append(f"Container/Orchestration: {config}/ directory found")
            except Exception:
                pass

    return containers


def detect_security_configs() -> List[str]:
    """Detect security and compliance configurations."""
    security = []

    for config in SECURITY_CONFIGS:
        if Path(config).exists():
            config_name = config.replace(".yml", "").replace(".yaml", "").lstrip(".")
            security.append(f"Security: {config_name}")

    return security


def detect_performance_markers() -> List[str]:
    """Detect performance testing and profiling markers."""
    performance = []

    for marker in PERFORMANCE_MARKERS:
        if Path(marker).exists():
            performance.append(f"Performance: {marker} found")
        else:
            # Check for directories
            try:
                if Path(marker).is_dir():
                    performance.append(f"Performance: {marker}/ directory found")
            except Exception:
                pass

    return performance


def collect_code_metrics() -> dict:
    """Collect code metrics: file counts by extension, total LOC."""
    metrics = {
        "total_files": 0,
        "by_extension": {},
        "by_language": {},
        "total_lines": 0,
        "largest_files": []
    }

    # Language mapping
    lang_map = {
        "ts": "TypeScript", "tsx": "TypeScript/React", "js": "JavaScript",
        "jsx": "JavaScript/React", "py": "Python", "go": "Go",
        "java": "Java", "kt": "Kotlin", "rs": "Rust",
        "cs": "C#", "rb": "Ruby", "php": "PHP",
        "swift": "Swift", "scala": "Scala", "ex": "Elixir",
        "cpp": "C++", "c": "C", "h": "C Header",
        "clj": "Clojure", "lua": "Lua", "hs": "Haskell"
    }

    file_sizes = []

    try:
        for root, dirs, files in os.walk(Path.cwd()):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file in files:
                filepath = Path(root) / file
                ext = filepath.suffix.lstrip('.')

                if not ext or ext in {"pyc", "o", "a", "so"}:
                    continue

                try:
                    size = filepath.stat().st_size
                    file_sizes.append((filepath.relative_to(Path.cwd()), size))

                    metrics["total_files"] += 1
                    metrics["by_extension"][ext] = metrics["by_extension"].get(ext, 0) + 1

                    lang = lang_map.get(ext, "Other")
                    metrics["by_language"][lang] = metrics["by_language"].get(lang, 0) + 1

                    # Count lines for text files
                    if ext in SOURCE_EXTS and size < 1_000_000:  # Skip huge files
                        try:
                            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                                metrics["total_lines"] += len(f.readlines())
                        except Exception:
                            pass
                except Exception:
                    pass

        # Top 10 largest files
        file_sizes.sort(key=lambda x: x[1], reverse=True)
        metrics["largest_files"] = [
            f"{str(f)}: {s/1024:.1f}KB" for f, s in file_sizes[:10]
        ]

    except Exception:
        pass

    return metrics


def print_section(title: str, content: List[str], output_file=None) -> None:
    """Print a section with title and content."""
    lines = [f"\n=== {title} ==="]

    if isinstance(content, list):
        lines.extend(content if content else ["None found."])
    elif isinstance(content, str):
        lines.append(content)

    text = '\n'.join(lines) + '\n'

    if output_file:
        output_file.write(text)
    else:
        print(text, end='')


def main():
    """Main entry point."""
    args = parse_args()

    output_file = None
    if args.output:
        output_dir = Path(args.output).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        output_file = open(args.output, 'w', encoding='utf-8')
        print(f"Writing output to: {args.output}", file=sys.stderr)

    try:
        # Directory tree
        print_section(
            f"DIRECTORY TREE (max depth {TREE_MAX_DEPTH}, source files only)",
            get_directory_tree(),
            output_file
        )

        # Stack detection
        manifests = find_manifest_files()
        if manifests:
            manifest_content = [""]
            for manifest in manifests:
                manifest_path = Path(manifest)
                manifest_content.append(f"--- {manifest} ---")
                if manifest == "bun.lockb":
                    manifest_content.append("[Binary lockfile — see package.json for dependency details.]")
                else:
                    manifest_content.append(read_file_preview(manifest_path))
            print_section("STACK DETECTION (manifest files)", manifest_content, output_file)
        else:
            print_section("STACK DETECTION (manifest files)", ["No recognized manifest files found in project root."], output_file)

        # Entry points
        entries = find_entry_points()
        if entries:
            entry_content = [f"Found: {e}" for e in entries]
            print_section("ENTRY POINTS", entry_content, output_file)
        else:
            print_section("ENTRY POINTS", ["No common entry points found. Check 'main' or 'scripts.start' in manifest files above."], output_file)

        # Linting config
        lint = find_lint_config()
        if lint:
            lint_content = [f"Found: {l}" for l in lint]
            print_section("LINTING AND FORMATTING CONFIG", lint_content, output_file)
        else:
            print_section("LINTING AND FORMATTING CONFIG", ["No linting or formatting config files found in project root."], output_file)

        # Environment templates
        envs = find_env_templates()
        if envs:
            env_content = []
            for filename, filepath in envs:
                env_content.append(f"--- {filename} ---")
                env_content.append(read_file_preview(filepath))
            print_section("ENVIRONMENT VARIABLE TEMPLATES", env_content, output_file)
        else:
            print_section("ENVIRONMENT VARIABLE TEMPLATES", ["No .env.example or .env.template found. Identify required environment variables by searching the code and config for environment variable reads."], output_file)

        # TODOs
        todos = search_todos()
        if todos:
            print_section("TODO / FIXME / HACK (production code only, test dirs excluded)", todos, output_file)
        else:
            print_section("TODO / FIXME / HACK (production code only, test dirs excluded)", ["None found."], output_file)

        # Git info
        if is_git_repo():
            commits = get_git_commits()
            if commits:
                print_section("GIT RECENT COMMITS (last 20)", commits, output_file)
            else:
                print_section("GIT RECENT COMMITS (last 20)", ["No commits found."], output_file)

            churn = get_git_churn()
            if churn:
                print_section("HIGH-CHURN FILES (last 90 days, top 20)", churn, output_file)
            else:
                print_section("HIGH-CHURN FILES (last 90 days, top 20)", ["None found."], output_file)
        else:
            print_section("GIT RECENT COMMITS (last 20)", ["Not a git repository or no commits yet."], output_file)
            print_section("HIGH-CHURN FILES (last 90 days, top 20)", ["Not a git repository."], output_file)

        # Monorepo detection
        monorepo = detect_monorepo()
        if monorepo:
            print_section("MONOREPO SIGNALS", monorepo, output_file)
        else:
            print_section("MONOREPO SIGNALS", ["No monorepo signals detected."], output_file)

        # Code metrics
        metrics = collect_code_metrics()
        metrics_output = [
            f"Total files scanned: {metrics['total_files']}",
            f"Total lines of code: {metrics['total_lines']}",
            ""
        ]
        if metrics["by_language"]:
            metrics_output.append("Files by language:")
            for lang, count in sorted(metrics["by_language"].items(), key=lambda x: x[1], reverse=True):
                metrics_output.append(f"  {lang}: {count}")
        if metrics["largest_files"]:
            metrics_output.append("")
            metrics_output.append("Top 10 largest files:")
            metrics_output.extend(metrics["largest_files"])
        print_section("CODE METRICS", metrics_output, output_file)

        # CI/CD Detection
        ci_cd = detect_ci_cd_pipelines()
        if ci_cd:
            print_section("CI/CD PIPELINES", ci_cd, output_file)
        else:
            print_section("CI/CD PIPELINES", ["No CI/CD pipelines detected."], output_file)

        # Container Detection
        containers = detect_containers()
        if containers:
            print_section("CONTAINERS & ORCHESTRATION", containers, output_file)
        else:
            print_section("CONTAINERS & ORCHESTRATION", ["No containerization configs detected."], output_file)

        # Security Configs
        security = detect_security_configs()
        if security:
            print_section("SECURITY & COMPLIANCE", security, output_file)
        else:
            print_section("SECURITY & COMPLIANCE", ["No security configs detected."], output_file)

        # Performance Markers
        performance = detect_performance_markers()
        if performance:
            print_section("PERFORMANCE & TESTING", performance, output_file)
        else:
            print_section("PERFORMANCE & TESTING", ["No performance testing configs detected."], output_file)

        # Final message
        final_msg = "\n=== SCAN COMPLETE ===\n"
        if output_file:
            output_file.write(final_msg)
        else:
            print(final_msg, end='')

        return 0

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    finally:
        if output_file:
            output_file.close()


if __name__ == "__main__":
    sys.exit(main())
