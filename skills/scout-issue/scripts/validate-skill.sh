#!/usr/bin/env bash
# Validates the Issue Scout skill in a meaningful way: required files exist,
# SKILL.md contains the full pipeline, every gh/git command is well-formed,
# and the quick reference stays in sync with the deeper docs.
#
# Run from the skill folder root, e.g. `cd skills/scout-issue && bash scripts/validate-skill.sh`.
set -euo pipefail

errors=0
fail() {
  echo "  FAIL  $*"
  errors=$((errors + 1))
}

# --- Structure: required files and directories ---------------------------
required_files=(SKILL.md LICENSE)
required_dirs=(examples references)

for file in "${required_files[@]}"; do
  [[ -f "$file" ]] || fail "missing file: $file"
done
for dir in "${required_dirs[@]}"; do
  [[ -d "$dir" ]] || fail "missing directory: $dir/"
done

# --- Content: SKILL.md must contain the full pipeline ---------------------
skill=SKILL.md
[[ -f "$skill" ]] || exit 1
for heading in "Phase 1: User Interrogation" "Phase 2: Issue Detection" \
  "Phase 3: Issue Analysis & Ranking" "Phase 4: Output Formatting" \
  "Investigation Mode" "Implementation Planning"; do
  if ! grep -qF "## $heading" "$skill"; then
    fail "SKILL.md is missing heading \"## $heading\""
  fi
done

# --- Commands: every gh/git command must be well-formed -------------------
# A truncated command (a bare `gh` or `git`) or a misspelled subcommand is
# the kind of breakage that used to pass CI as long as the file existed.
GH_SUBS="alias api auth browse cache codespace config environment extension gist gpg-key issue label org pr project release repo ruleset search secret ssh-key status variable workflow"
GIT_SUBS="add am annotate apply archive bisect blame branch bundle cat-file check-attr check-ignore check-mailmap check-ref-format checkout cherry cherry-pick clean clone column commit config count-objects credential describe diff diff-files diff-index diff-tree difftool fetch filter-branch for-each-ref format-patch fsck gc get-tar-commit-id grep help init instaweb log ls-files ls-remote ls-tree mailinfo mailsplit merge merge-base merge-file merge-index merge-one-file mergetool mktag mktree mv name-rev notes pack-objects pack-redundant pack-refs patch-id prune prune-packed pull push quilt-pop range-diff reflog remote repack replace request-pull reset restore revert rev-list rev-parse rm send-email shortlog show show-branch show-index show-ref stash status stripspace submodule subtree symbolic-ref tag unpack-file unpack-objects update-index update-ref update-server-info var verify-commit verify-pack verify-tag whatchanged worktree"

check_commands() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  local line cmd sub
  while IFS= read -r line; do
    case "$line" in
      gh | git)
        fail "$file: bare \"$line\" command (truncated?)"
        ;;
      gh\ * | git\ *)
        read -r cmd sub _ <<<"$line"
        if [[ -z "$sub" ]]; then
          fail "$file: bare \"$cmd\" command (truncated?)"
        elif [[ "$cmd" == "gh" ]] && [[ " $GH_SUBS " != *" $sub "* ]]; then
          fail "$file: unknown gh subcommand \"$sub\""
        elif [[ "$cmd" == "git" ]] && [[ " $GIT_SUBS " != *" $sub "* ]]; then
          fail "$file: unknown git subcommand \"$sub\""
        fi
        ;;
    esac
  done <"$file"
}

for f in "$skill" references/*.md examples/*.md; do
  check_commands "$f"
done

# --- Sync: the quick reference must not invent commands -------------------
# Every gh/git subcommand pair in the quick reference must also be used in
# SKILL.md or the deeper references, so the cheat sheet cannot drift into
# documenting commands the corpus does not support.
# Written without associative arrays so it also runs on older bash (3.2).
known_list=$({ grep -hoE "^(gh|git) [a-z-]+" "$skill" references/tool-patterns.md references/workflow.md || true; } | sort -u)
while IFS= read -r pair; do
  if ! grep -qF "$pair" <<<"$known_list"; then
    fail "references/quick-reference.md uses \"$pair\", which is not used in SKILL.md, tool-patterns.md, or workflow.md"
  fi
done < <(grep -hoE "^(gh|git) [a-z-]+" references/quick-reference.md)

if ((errors > 0)); then
  echo ""
  echo "Skill validation failed: $errors error(s)."
  exit 1
fi

echo "Skill validation passed: structure, pipeline headings, commands, and reference sync are all consistent."
