#!/usr/bin/env bash
# Validates the Issue Scout skill in a meaningful way: required files exist,
# SKILL.md contains the full pipeline, every gh/git command is well-formed,
# flags used in examples are supported, and the quick reference stays in sync
# with the deeper docs.
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

# --- Command validation: gh/git subcommand paths and flags ---------------
# Valid gh top-level commands and their subcommands.
GH_TOPLEVEL="alias api auth browse cache codespace config environment extension gist gpg-key issue label org pr project release repo ruleset search secret ssh-key status variable workflow"
# Subcommands allowed for the top-level groups that take them (space-separated).
GH_ISSUE_SUBS="list view status create close reopen lock unlock pin unpin"
GH_PR_SUBS="list view diff checkout create close merge reopen lock ready comment review"
GH_REPO_SUBS="view clone create delete fork rename edit"
GH_SEARCH_SUBS="issues prs code"

# Flags supported by the gh commands used in this skill (per subcommand group).
GH_ISSUE_LIST_FLAGS="state,limit,label,assignee,author,search"
GH_ISSUE_VIEW_FLAGS="comments,json,jq"
GH_PR_LIST_FLAGS="state,search,limit,json,jq,base,author"
GH_PR_VIEW_FLAGS="json,jq"
GH_PR_DIFF_FLAGS="name-only,exclude"
GH_SEARCH_FLAGS="state,label,sort,order,limit,search,json,jq,repo"
GH_API_FLAGS="jq,paginate,method,field,raw-field,input,header,cache,silent,preview,hostname,template,verbose,include,slurp"

# git subcommands (from original script)
GIT_SUBS="add am annotate apply archive bisect blame branch bundle cat-file check-attr check-ignore check-mailmap check-ref-format checkout cherry cherry-pick clean clone column commit config count-objects credential describe diff diff-files diff-index diff-tree difftool fetch filter-branch for-each-ref format-patch fsck gc get-tar-commit-id grep help init instaweb log ls-files ls-remote ls-tree mailinfo mailsplit merge merge-base merge-file merge-index merge-one-file mergetool mktag mktree mv name-rev notes pack-objects pack-redundant pack-refs patch-id prune prune-packed pull push quilt-pop range-diff reflog remote repack replace request-pull reset restore revert rev-list rev-parse rm send-email shortlog show show-branch show-index show-ref stash status stripspace submodule subtree symbolic-ref tag unpack-file unpack-objects update-index update-ref update-server-info var verify-commit verify-pack verify-tag whatchanged worktree"

check_flags() {
  local file="$1"
  local label="$2"
  local flags_str="$3"
  local rest="$4"
  local flag flag_name

  for flag in $rest; do
    case "$flag" in
      --*) ;;
      *) continue ;;
    esac
    flag_name="${flag#--}"
    flag_name="${flag_name%%=*}"
    if ! echo ",$flags_str," | grep -q ",${flag_name},"; then
      fail "$file: unknown flag \"$flag\" for $label"
      return 1
    fi
  done
}

check_command() {
  local file="$1"
  local line="$2"
  local cmd sub rest

  case "$line" in
    gh\ *)
      read -r cmd sub rest <<<"$line"
      # Validate top-level subcommand
      if [[ " $GH_TOPLEVEL " != *" $sub "* ]]; then
        fail "$file: unknown gh subcommand \"$sub\""
        return
      fi
      # gh api and auth take no meaningful second subcommand.
      if [[ "$sub" == "api" ]]; then
        check_flags "$file" "gh api" "$GH_API_FLAGS" "$rest" || true
        return
      fi
      if [[ "$sub" == "auth" ]]; then
        return
      fi
      # Top-level groups that require a second subcommand
      local subs=""
      case "$sub" in
        issue) subs="$GH_ISSUE_SUBS" ;;
        pr) subs="$GH_PR_SUBS" ;;
        repo) subs="$GH_REPO_SUBS" ;;
        search) subs="$GH_SEARCH_SUBS" ;;
        *) subs="" ;;
      esac
      if [[ -n "$subs" ]]; then
        local second
        read -r second _ <<<"$rest"
        if [[ -z "$second" ]]; then
          fail "$file: gh $sub is missing a subcommand"
          return
        fi
        if [[ " $subs " != *" $second "* ]]; then
          fail "$file: unknown gh $sub subcommand \"$second\""
          return
        fi
        # Validate flags for this path
        local flags_str=""
        case "$sub/$second" in
          issue/list) flags_str="$GH_ISSUE_LIST_FLAGS" ;;
          issue/view) flags_str="$GH_ISSUE_VIEW_FLAGS" ;;
          pr/list) flags_str="$GH_PR_LIST_FLAGS" ;;
          pr/view) flags_str="$GH_PR_VIEW_FLAGS" ;;
          pr/diff) flags_str="$GH_PR_DIFF_FLAGS" ;;
          search/issues|search/prs) flags_str="$GH_SEARCH_FLAGS" ;;
        esac
        if [[ -n "$flags_str" ]]; then
          check_flags "$file" "gh $sub $second" "$flags_str" "$rest" || true
        fi
      fi
      ;;
    git\ *)
      read -r cmd sub rest <<<"$line"
      if [[ " $GIT_SUBS " != *" $sub "* ]]; then
        fail "$file: unknown git subcommand \"$sub\""
      fi
      ;;
    *)
      # Not a gh/git command, skip
      ;;
  esac
}

# --- Commands: every gh/git command must be well-formed -------------------
check_commands() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  local line
  # Join backslash-continued lines so flags on continuation lines are checked.
  while IFS= read -r line; do
    case "$line" in
      gh | git)
        fail "$file: bare \"$line\" command (truncated?)"
        ;;
      gh\ * | git\ *)
        check_command "$file" "$line"
        ;;
    esac
  done < <(awk '
    /\\$/ {
      sub(/\\$/, " ")
      printf "%s", $0
      next
    }
    { print }
  ' "$file")
}

for f in "$skill" references/*.md examples/*.md; do
  check_commands "$f"
done

# --- Negative fixtures: verify each invalid command is caught -------------
# Each fixture is checked independently. Expected failures are counted and then
# removed from the real error count; an accepted fixture is a real failure.
negative_fixtures=(
  "gh issue definitely-not-a-subcommand"
  "gh pr view --files"
  "gh issue list --sort updated"
  "git definitely-not-a-subcommand"
  "gh api --invalid-flag"
)
fixture_errors=0
for fixture in "${negative_fixtures[@]}"; do
  before=$errors
  check_command "negative fixture" "$fixture" >/dev/null
  if (( errors > before )); then
    fixture_errors=$((fixture_errors + errors - before))
    errors=$before
  else
    fail "validator accepted negative fixture: $fixture"
  fi
done

# --- Negative fixture: flags on a backslash-continued line are validated ---
# check_commands must join continuations; otherwise a bad flag on the second
# line of a command (like the paginated REST example in SKILL.md) slips past.
continuation_fixture=$(mktemp)
printf 'gh api "repos/o/r/issues" --paginate \\\n  --invalid-flag\n' >"$continuation_fixture"
before=$errors
check_commands "$continuation_fixture" >/dev/null
if (( errors > before )); then
  fixture_errors=$((fixture_errors + errors - before))
  errors=$before
else
  fail "validator accepted an invalid flag on a backslash-continued command"
fi
rm -f "$continuation_fixture"

# --- Sync: the quick reference must not invent commands -------------------
# Every gh/git subcommand pair in the quick reference must also be used in
# SKILL.md or the deeper references, so the cheat sheet cannot drift into
# documenting commands the corpus does not support.
check_reference_sync() {
  local quick_ref="$1"
  local known_list pair
  known_list=$({ grep -hoE "^(gh|git) [a-z-]+" "$skill" references/tool-patterns.md references/workflow.md || true; } | sort -u)
  while IFS= read -r pair; do
    if ! grep -qF "$pair" <<<"$known_list"; then
      fail "$quick_ref uses \"$pair\", which is not used in SKILL.md, tool-patterns.md, or workflow.md"
    fi
  done < <(grep -hoE "^(gh|git) [a-z-]+" "$quick_ref")
}

check_reference_sync references/quick-reference.md

# --- Regression: a reference-sync failure must exit nonzero ---------------
# Run the validator against a temporary copy whose quick reference contains a
# valid command pair that the corpus does not document. The nested run skips
# this regression to avoid recursion.
if [[ -z "${SCOUT_VALIDATOR_SELF_TEST:-}" ]]; then
  regression_dir=$(mktemp -d)
  cp -R . "$regression_dir/skill"
  printf '\ngh gist list\n' >> "$regression_dir/skill/references/quick-reference.md"
  if ( cd "$regression_dir/skill" && SCOUT_VALIDATOR_SELF_TEST=1 bash scripts/validate-skill.sh >/dev/null 2>&1 ); then
    fail "reference-sync regression: validator exited 0 for a quick reference with an undocumented command"
  fi
  rm -rf "$regression_dir"
fi

if (( errors > 0 )); then
  echo ""
  echo "Skill validation failed: $errors error(s)."
  exit 1
fi

echo ""
echo "Skill validation passed: structure, pipeline headings, commands, flags, reference sync, and $fixture_errors negative fixture(s) rejected."
