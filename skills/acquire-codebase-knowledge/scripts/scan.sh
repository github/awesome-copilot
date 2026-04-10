#!/usr/bin/env bash
# scan.sh — Collect project discovery information for the acquire-codebase-knowledge skill.
# Run from the project root directory.
#
# Usage: bash scripts/scan.sh [OPTIONS]
#
# Options:
#   --output FILE   Write output to FILE instead of stdout
#   --help          Show this message and exit
#
# Exit codes:
#   0  Success
#   1  Usage error

set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
OUTPUT_FILE=""
TREE_LIMIT=200
TREE_MAX_DEPTH=3
TODO_LIMIT=60
MANIFEST_PREVIEW_LINES=80
RECENT_COMMITS_LIMIT=20
CHURN_LIMIT=20

# --- Argument parsing ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help)
      cat <<EOF
Usage: bash $SCRIPT_NAME [OPTIONS]

Scan the current directory (project root) and output discovery information
for the acquire-codebase-knowledge skill.

Options:
  --output FILE   Write output to FILE instead of stdout
  --help          Show this message and exit

Exit codes:
  0  Success
  1  Usage error

Run from the project root. Output is safe to redirect or pipe.
EOF
      exit 0
      ;;
    --output)
      shift
      if [[ $# -eq 0 ]]; then
        echo "Error: --output requires a FILE argument." >&2
        echo "Usage: bash $SCRIPT_NAME --output FILE" >&2
        exit 1
      fi
      OUTPUT_FILE="$1"
      ;;
    *)
      echo "Error: Unknown option: $1" >&2
      echo "Usage: bash $SCRIPT_NAME [--output FILE] [--help]" >&2
      exit 1
      ;;
  esac
  shift
done

# --- Redirect stdout to file if requested ---
OUTPUT_FILE_ABS=""
if [[ -n "$OUTPUT_FILE" ]]; then
  output_dir="$(dirname "$OUTPUT_FILE")"
  if [[ "$output_dir" != "." ]]; then
    mkdir -p "$output_dir"
  fi
  # Resolve to absolute path before exec replaces stdout, so downstream
  # find/grep calls can explicitly exclude the output file from results.
  OUTPUT_FILE_ABS="$(cd "$(dirname "$OUTPUT_FILE")" && pwd)/$(basename "$OUTPUT_FILE")"
  exec > "$OUTPUT_FILE"
  echo "Writing output to: $OUTPUT_FILE" >&2
fi

# --- Directories to exclude from all searches ---
EXCLUDE_DIRS=(
  "node_modules" ".git" "dist" "build" "out" ".next" ".nuxt"
  "__pycache__" ".venv" "venv" ".tox" "target" "vendor"
  "coverage" ".nyc_output" "generated" ".cache" ".turbo"
  ".yarn" ".pnp" "bin" "obj"
)

build_find_command() {
  local depth="$1"
  local out_var="$2"
  local dir quoted assignment
  local -a cmd

  # Validate the output variable name to prevent code injection via eval.
  if [[ ! "$out_var" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
    echo "Error: invalid output variable name: $out_var" >&2
    exit 1
  fi

  cmd=(find . -maxdepth "$depth" "(")
  for dir in "${EXCLUDE_DIRS[@]}"; do
    cmd+=(-name "$dir" -o)
  done
  unset 'cmd[${#cmd[@]}-1]'
  cmd+=(" )" -prune -o -type f -print)

  # Exclude the output file from results if one was requested.
  if [[ -n "$OUTPUT_FILE_ABS" ]]; then
    cmd+=(-not -path "$OUTPUT_FILE_ABS")
  fi

  assignment="$out_var=("
  for quoted in "${cmd[@]}"; do
    printf -v quoted '%q' "$quoted"
    assignment+=" $quoted"
  done
  assignment+=" )"
  eval "$assignment"
}

print_limited_file() {
  local file_path="$1"
  local limit="$2"
  local total
  total=$(wc -l < "$file_path" | tr -d ' ')

  if [[ "$total" -eq 0 ]]; then
    echo "None found."
    return
  fi

  head -n "$limit" "$file_path"
  if [[ "$total" -gt "$limit" ]]; then
    echo "[TRUNCATED] Showing first $limit of $total lines."
  fi
}

tmp_files=()
cleanup() {
  if [[ ${#tmp_files[@]} -gt 0 ]]; then
    rm -f "${tmp_files[@]}"
  fi
}
trap cleanup EXIT

# ============================================================
echo "=== DIRECTORY TREE (max depth $TREE_MAX_DEPTH, source files only) ==="
tree_tmp="$(mktemp)"
tmp_files+=("$tree_tmp")
find_cmd=()
build_find_command "$TREE_MAX_DEPTH" find_cmd
"${find_cmd[@]}" 2>/dev/null | sed 's|^\./||' | sort > "$tree_tmp" || true
print_limited_file "$tree_tmp" "$TREE_LIMIT"

echo ""
echo "=== STACK DETECTION (manifest files) ==="
MANIFESTS=(
  "package.json" "package-lock.json" "yarn.lock" "pnpm-lock.yaml"
  "go.mod" "go.sum"
  "requirements.txt" "Pipfile" "Pipfile.lock" "pyproject.toml" "setup.py" "setup.cfg"
  "Cargo.toml" "Cargo.lock"
  "pom.xml" "build.gradle" "build.gradle.kts" "settings.gradle" "settings.gradle.kts"
  "composer.json" "composer.lock"
  "Gemfile" "Gemfile.lock"
  "mix.exs" "mix.lock"
  "pubspec.yaml"
  "*.csproj" "*.sln" "global.json"
  "deno.json" "deno.jsonc"
  "bun.lockb"
)
found_any_manifest=0
shopt -s nullglob
for pattern in "${MANIFESTS[@]}"; do
  for f in $pattern; do
    if [[ -f "$f" ]]; then
      echo ""
      echo "--- $f ---"
      # bun.lockb is a binary lockfile — printing it produces garbage characters.
      if [[ "$f" == "bun.lockb" ]]; then
        echo "[Binary lockfile — see package.json for dependency details.]"
      else
        head -n "$MANIFEST_PREVIEW_LINES" "$f"
        line_count=$(wc -l < "$f" | tr -d ' ')
        if [[ "$line_count" -gt "$MANIFEST_PREVIEW_LINES" ]]; then
          echo "[TRUNCATED] Showing first $MANIFEST_PREVIEW_LINES of $line_count lines."
        fi
      fi
      found_any_manifest=1
    fi
  done
done
shopt -u nullglob
if [[ $found_any_manifest -eq 0 ]]; then
  echo "No recognized manifest files found in project root."
fi

echo ""
echo "=== ENTRY POINTS ==="
ENTRY_CANDIDATES=(
  "src/index.ts" "src/index.js" "src/index.mjs"
  "src/main.ts" "src/main.js" "src/main.py"
  "src/app.ts" "src/app.js"
  "src/server.ts" "src/server.js"
  "main.go" "cmd/main.go"
  "main.py" "app.py" "server.py" "run.py"
  "index.ts" "index.js" "app.ts" "app.js"
  "lib/index.ts" "lib/index.js"
)
found_any_entry=0
for f in "${ENTRY_CANDIDATES[@]}"; do
  if [[ -f "$f" ]]; then
    echo "Found: $f"
    found_any_entry=1
  fi
done
if [[ $found_any_entry -eq 0 ]]; then
  echo "No common entry points found. Check 'main' or 'scripts.start' in manifest files above."
fi

echo ""
echo "=== LINTING AND FORMATTING CONFIG ==="
LINT_FILES=(
  ".eslintrc" ".eslintrc.json" ".eslintrc.js" ".eslintrc.cjs" ".eslintrc.yml" ".eslintrc.yaml"
  "eslint.config.js" "eslint.config.mjs" "eslint.config.cjs"
  ".prettierrc" ".prettierrc.json" ".prettierrc.js" ".prettierrc.yml"
  "prettier.config.js" "prettier.config.mjs"
  ".editorconfig"
  "tsconfig.json" "tsconfig.base.json" "tsconfig.build.json"
  ".golangci.yml" ".golangci.yaml"
  "setup.cfg" ".flake8" ".pylintrc" "mypy.ini"
  ".rubocop.yml" "phpcs.xml" "phpstan.neon"
  "biome.json" "biome.jsonc"
)
found_any_lint=0
for f in "${LINT_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    echo "Found: $f"
    found_any_lint=1
  fi
done
if [[ $found_any_lint -eq 0 ]]; then
  echo "No linting or formatting config files found in project root."
fi

echo ""
echo "=== ENVIRONMENT VARIABLE TEMPLATES ==="
ENV_TEMPLATES=(".env.example" ".env.template" ".env.sample" ".env.defaults" ".env.local.example")
found_any_env=0
for f in "${ENV_TEMPLATES[@]}"; do
  if [[ -f "$f" ]]; then
    echo "--- $f ---"
    cat "$f"
    found_any_env=1
  fi
done
if [[ $found_any_env -eq 0 ]]; then
  echo "No .env.example or .env.template found. Identify required environment variables by searching the code and config for environment variable reads."
fi

echo ""
echo "=== TODO / FIXME / HACK (production code only, test dirs excluded) ==="
SOURCE_EXTS=(
  "*.ts" "*.tsx" "*.js" "*.jsx" "*.mjs" "*.cjs"
  "*.py" "*.go" "*.java" "*.kt" "*.rb" "*.php"
  "*.rs" "*.cs" "*.cpp" "*.c" "*.h" "*.ex" "*.exs"
)
ext_args=()
for ext in "${SOURCE_EXTS[@]}"; do ext_args+=("--include=$ext"); done
grep_excludes=()
for dir in "${EXCLUDE_DIRS[@]}" "test" "tests" "__tests__" "spec" "__mocks__" "fixtures"; do
  grep_excludes+=("--exclude-dir=$dir")
done

todo_tmp="$(mktemp)"
tmp_files+=("$todo_tmp")
grep -rn "${grep_excludes[@]}" "${ext_args[@]}" \
  -e 'TODO' -e 'FIXME' -e 'HACK' \
  . 2>/dev/null > "$todo_tmp" || true
print_limited_file "$todo_tmp" "$TODO_LIMIT"

echo ""
echo "=== GIT RECENT COMMITS (last 20) ==="
if git rev-parse --git-dir > /dev/null 2>&1; then
  git log --oneline -n "$RECENT_COMMITS_LIMIT"
else
  echo "Not a git repository or no commits yet."
fi

echo ""
echo "=== HIGH-CHURN FILES (last 90 days, top 20) ==="
if git rev-parse --git-dir > /dev/null 2>&1; then
  churn_tmp="$(mktemp)"
  tmp_files+=("$churn_tmp")
  git log --since="90 days ago" --name-only --pretty=format: 2>/dev/null \
    | grep -v "^$" | sort | uniq -c | sort -rn > "$churn_tmp" || true
  print_limited_file "$churn_tmp" "$CHURN_LIMIT"
else
  echo "Not a git repository."
fi

echo ""
echo "=== MONOREPO SIGNALS ==="
MONOREPO_FILES=("pnpm-workspace.yaml" "lerna.json" "nx.json" "rush.json" "turbo.json" "moon.yml")
found_monorepo=0
for f in "${MONOREPO_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    echo "Monorepo tool detected: $f"
    found_monorepo=1
  fi
done
for d in "packages" "apps" "libs" "services" "modules"; do
  if [[ -d "$d" ]]; then
    echo "Sub-package directory found: $d/"
    found_monorepo=1
  fi
done
# Also check package.json workspaces field
if [[ -f "package.json" ]] && grep -q '"workspaces"' package.json 2>/dev/null; then
  echo "package.json has 'workspaces' field (npm/yarn workspaces monorepo)"
  found_monorepo=1
fi
if [[ $found_monorepo -eq 0 ]]; then
  echo "No monorepo signals detected."
fi

echo ""
echo "=== SCAN COMPLETE ==="
