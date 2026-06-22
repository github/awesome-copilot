#!/bin/bash
# fix-broken-links - link-fix.sh
#
# After the agent edits files (postToolUse): take the files it just changed,
# extract every http(s) URL, and check each with curl.
#   • With file paths passed (the edited files, injected from the hook payload, or
#     given on the command line) any URL that is not 200 gets spelling variations
#     (http/https, www, trailing slash) then a Copilot CLI agent hand-off for more
#     alternatives, followed by an interactive menu to replace / remove / skip.
#   • With NO file arguments it only lists the broken links - no alternative
#     lookups and no prompts.
# Generic anchor text is flagged as an SEO note either way.
#
# Pure bash + grep/sed/curl, plus an optional Copilot CLI hand-off for suggestions.
# Covers: HTML · Markdown · JS/TS · JSON · CSS · SQL · templates (all via URL scan)
# Requires: curl, grep, sed  |  Optional: copilot  |  Trigger: postToolUse
set -uo pipefail

# The agent hand-off below invokes `copilot`, which may itself re-fire this hook.
# The child run is marked with this env var; exit immediately if it is present so
# we never recurse.
[ -n "${FIX_BROKEN_LINKS_AGENT:-}" ] && exit 0

LIMIT=50
TIMEOUT=10
UA='Mozilla/5.0 (compatible; fix-broken-links/1.0)'
AGENT_MODEL='gpt-5-mini'   # small, low-token model for the suggestion hand-off
AGENT_TIMEOUT=60           # seconds before giving up on the agent
# Cap the agent call with `timeout` when it is available (coreutils; absent on
# some minimal / Git-Bash setups), otherwise run copilot unbounded.
if command -v timeout >/dev/null 2>&1; then AGENT_RUN="timeout ${AGENT_TIMEOUT}"; else AGENT_RUN=""; fi
WEB_RE='\.(html?|xhtml|md|markdown|mdx|js|jsx|ts|tsx|vue|svelte|json|jsonl|css|sql|erb|jinja|j2|twig|ejs|pug|hbs)$'

command -v curl >/dev/null 2>&1 || { printf 'fix-broken-links: curl not found\n' >&2; exit 0; }

# ── Hook stdin ────────────────────────────────────────────────────────────────
# When called as a postToolUse hook, extract edited files from the JSON payload
# and inject them as positional args so collect_input picks them up.
_HOOK=""
if [ "$#" -eq 0 ] && [ ! -t 0 ]; then
  _HOOK=1                      # invoked as a hook: stdin carries the tool payload
  _INPUT=$(cat)
  if command -v jq >/dev/null 2>&1; then
    _TOOL=$(printf '%s' "$_INPUT" | jq -r '.toolName // .tool_name // empty' 2>/dev/null)
    case "$_TOOL" in
      editFiles|edit|write|str_replace_editor|create_file|multiEdit|applyPatch)
        # Only the files this edit tool just changed - never a wider repo scan.
        mapfile -t _FILES < <(
          printf '%s' "$_INPUT" \
            | jq -r '.tool_input.files[]? // .toolInput.files[]? // .tool_input.path // .toolInput.path // empty' 2>/dev/null
        )
        [ "${#_FILES[@]}" -gt 0 ] && set -- "${_FILES[@]}"
        ;;
      "")
        # No tool context - called manually with piped input, fall through
        ;;
      *)
        # Different tool (bash, read, etc.) - nothing to check
        exit 0
        ;;
    esac
  fi
fi

# A non-empty positional list means the caller passed files: the edited files from
# the hook payload above, or paths given on the command line. Only then do we run
# the full repair flow (look up alternatives, then prompt to fix). With no
# parameters we simply list the broken links - no lookups, no prompts.
[ "$#" -gt 0 ] && HAVE_PARAMS=1 || HAVE_PARAMS=0

# Interactive input comes from the terminal, since stdin may carry hook JSON.
# Probe by actually opening /dev/tty - a mere -r/-w test can pass where open fails.
TTY=/dev/tty
if { true >/dev/tty; } 2>/dev/null && { true </dev/tty; } 2>/dev/null; then
  TTY=/dev/tty
else
  TTY=""
fi
ask() {
  local p="$1" ans=""
  [ -z "$TTY" ] && { printf '%s' ""; return; }
  printf '%s' "$p" > "$TTY"
  IFS= read -r ans < "$TTY" || ans=""
  printf '%s' "$ans"
}

# ── Helpers ───────────────────────────────────────────────────────────────────

http_status() {
  curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" --location -A "$UA" "$1" 2>/dev/null
}

# Escape ERE metacharacters so a literal string can be used safely inside a bash
# [[ =~ ]] pattern. Only true metacharacters are escaped - backslash-escaping an
# ordinary character (e.g. '\:') is undefined in ERE and would fail to match.
re_escape() {
  local s="$1" out="" c i bs='\' meta='.^$*+?()[]{}|\'
  for ((i = 0; i < ${#s}; i++)); do
    c="${s:i:1}"
    if [[ "$meta" == *"$c"* ]]; then out+="$bs$c"; else out+="$c"; fi
  done
  printf '%s' "$out"
}

# Read an entire file into a variable, preserving newlines.
read_file() { IFS= read -rd '' "$1" < "$2" || true; }

# Escape glob metacharacters (\ * ? [) so a string is matched literally inside
# ${var//pattern/repl}, which otherwise interprets the pattern as a glob. URLs
# and Markdown link spans routinely contain ? and [ ], so this is required for a
# correct fixed-string replacement.
glob_escape() {
  local s="$1" out="" c i
  for ((i = 0; i < ${#s}; i++)); do
    c="${s:i:1}"
    case "$c" in
      '\'|'*'|'?'|'[') out+="\\$c" ;;
      *) out+="$c" ;;
    esac
  done
  printf '%s' "$out"
}

# Print every http(s) URL in a file, trailing punctuation trimmed, de-duplicated.
extract_urls() {
  grep -oiE 'https?://[^"'\''<> )]+' "$1" 2>/dev/null \
    | sed -E 's/[.,;:]+$//' \
    | sort -u
}

# Generic anchor text that weakens SEO.
seo_scan() {
  grep -oiE '<a[^>]*>[[:space:]]*(click here|click|here|read more|more|this page|this|learn more|see more|view|visit|details|info)[[:space:]]*</a>' "$1" 2>/dev/null
  grep -oiE '\[(click here|click|here|read more|more|this page|learn more|see more|details|info)\]\(' "$1" 2>/dev/null
}

# Try common URL variations; echo the first that returns 200, else nothing.
find_variation() {
  local url="$1" scheme rest host path cand
  scheme="${url%%://*}"
  rest="${url#*://}"
  host="${rest%%/*}"
  if [ "$rest" = "$host" ]; then path=""; else path="/${rest#*/}"; fi

  local cands=()
  case "$scheme" in
    http)  cands+=("https://${host}${path}") ;;
    https) cands+=("http://${host}${path}") ;;
  esac
  if [[ "$host" == www.* ]]; then
    cands+=("${scheme}://${host#www.}${path}")
  else
    cands+=("${scheme}://www.${host}${path}")
  fi
  if [ -n "$path" ] && [[ "$path" != */ ]] && [[ "${path##*/}" != *.* ]]; then
    cands+=("${url%/}/")
  fi

  for cand in "${cands[@]}"; do
    [ "$cand" = "$url" ] && continue
    [ "$(http_status "$cand")" = "200" ] && { printf '%s' "$cand"; return 0; }
  done
  return 1
}

# Hand the broken link to the Copilot CLI agent and let it propose alternatives.
# This is a deliberately lightweight, low-token hand-off: a single non-interactive
# prompt to a small model, with no tools enabled - the agent answers from its own
# knowledge, so there are no web fetches, no permission prompts, and no archive
# lookups on our side. The model may prefix a prose line, so we pull http(s) tokens
# from anywhere in the output, trim trailing punctuation, drop the broken URL
# itself, and de-duplicate (case-insensitively). Up to MAX lines, one URL each.
agent_alts() {
  local url="$1" max="$2" prompt out prompt_url
  command -v copilot >/dev/null 2>&1 || return 0
  prompt_url="$(sanitize_prompt_url "$url")"
  prompt="In under $((AGENT_TIMEOUT - 5)) seconds, find up to ${max} working alternative URLs for the broken link ${prompt_url}. Hierarchically consider 1. Path and/or page spelling; 2. web.archive.org/wayback; 3. Redirects using redirect destination; 4. The context of the link's text; in order to resolve. Output only the URLs. One per line, and no: prose, numbering, markdown, backticks, special characters, post formatting."
  # FIX_BROKEN_LINKS_AGENT marks the child run so a re-entrant hook exits early.
  out="$(FIX_BROKEN_LINKS_AGENT=1 $AGENT_RUN copilot -p "$prompt" \
          -s --no-color --model "$AGENT_MODEL" --available-tools 2>/dev/null)"
  # If copilot errored, timed out, or produced nothing, offer no alternatives.
  [ $? -eq 0 ] && [ -n "$out" ] || return 0
  printf '%s\n' "$out" \
    | grep -oiE 'https?://[^][:space:]"'\''<>)]+' \
    | sed -E 's/[.,;:]+$//' \
    | awk -v bad="$url" 'tolower($0) != tolower(bad) && !seen[tolower($0)]++' \
    | head -n "$max"
}

# Emit up to MAX viable replacement URLs for a broken link, best first:
#   1. a working scheme/www/slash variation (verified live 200)
#   2. alternatives proposed by the Copilot CLI agent (see agent_alts)
# Output is newline-delimited and de-duplicated (case-insensitively). The first
# line is what `r` uses; the remainder become the numbered alternatives.
suggest_alts() {
  local url="$1" max="${2:-6}" cand key
  local -A seen=()
  local out=()

  cand="$(find_variation "$url")" && [ -n "$cand" ] && { out+=("$cand"); seen["${cand,,}"]=1; }

  while IFS= read -r cand; do
    [ "${#out[@]}" -ge "$max" ] && break
    [ -z "$cand" ] && continue
    key="${cand,,}"; [ -n "${seen[$key]:-}" ] && continue
    out+=("$cand"); seen[$key]=1
  done < <(agent_alts "$url" "$max")

  [ "${#out[@]}" -eq 0 ] && return 0
  printf '%s\n' "${out[@]}"
}

# Prepare a URL for safe embedding inside a shell-built prompt string.
# This is defense-in-depth for values that originate from document content.
sanitize_prompt_url() {
  local s="$1"
  s="${s//$'\r'/ }"
  s="${s//$'\n'/ }"
  s="${s//\`/\\\`}"
  s="${s//\$/\\\$}"
  printf '%s' "$s"
}

# Replace a literal URL everywhere in a file (pure bash, no regex).
replace_url() {
  local file="$1" old="$2" new="$3" content pat
  read_file content "$file"
  pat="$(glob_escape "$old")"
  printf '%s' "${content//$pat/$new}" > "$file"
}

# Remove the link wrapper but keep the visible text:
#   <a href="URL">text</a>  ->  text
#   [text](URL)             ->  text
# Each matched wrapper is swapped for its inner text via literal replacement.
remove_link() {
  local file="$1" url="$2" content esc re pat
  read_file content "$file"
  esc="$(re_escape "$url")"
  for re in \
    '<a[^>]*href="'"$esc"'"[^>]*>([^<]*)</a>' \
    "<a[^>]*href='${esc}'[^>]*>([^<]*)</a>" \
    '\[([^]]*)\]\('"$esc"'[^)]*\)'; do
    while [[ $content =~ $re ]]; do
      # The matched span often contains [ and ] (Markdown), which are glob
      # metacharacters, so escape it before the literal substitution.
      pat="$(glob_escape "${BASH_REMATCH[0]}")"
      content="${content//$pat/${BASH_REMATCH[1]}}"
    done
  done
  printf '%s' "$content" > "$file"
}

# ── File discovery ────────────────────────────────────────────────────────────

collect_input() {
  if [ "$#" -gt 0 ]; then printf '%s\n' "$@"; return; fi
  # Fired as a hook but the payload carried no (web) files: do nothing rather than
  # fall back to scanning unrelated files - the hook only ever checks edited files.
  [ -n "$_HOOK" ] && return
  local out=""
  if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
    out="$({ git diff --name-only HEAD; git diff --name-only --cached; } 2>/dev/null)"
  fi
  if [ -n "$out" ]; then printf '%s\n' "$out"; return; fi
  find . -type d \( -name .git -o -name node_modules -o -name dist -o -name build \
    -o -name .next -o -name .venv -o -name __pycache__ \) -prune \
    -o -type f -print 2>/dev/null
}

declare -A SEEN
FILES=()
while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue
  case "$f" in */node_modules/*|*/.git/*|*/dist/*|*/build/*) continue ;; esac
  printf '%s\n' "$f" | grep -qiE "$WEB_RE" || continue
  [ -n "${SEEN[$f]:-}" ] && continue
  SEEN[$f]=1
  FILES+=("$f")
done < <(collect_input "$@")

[ "${#FILES[@]}" -eq 0 ] && exit 0

# ── Scan ──────────────────────────────────────────────────────────────────────

B_FILE=(); B_URL=(); B_STATUS=(); B_ALT=()
SEO_LINES=()

for file in "${FILES[@]}"; do
  while IFS= read -r line; do
    [ -n "$line" ] && SEO_LINES+=("$file: $line")
  done < <(seo_scan "$file")

  mapfile -t urls < <(extract_urls "$file")
  [ "${#urls[@]}" -eq 0 ] && continue

  if [ "$HAVE_PARAMS" = "1" ] && [ "${#urls[@]}" -gt "$LIMIT" ]; then
    ans="$(ask "  ${file} has ${#urls[@]} links (limit ${LIMIT}). Continue? [Y/n] ")"
    case "$ans" in n|N|no|NO) continue ;; esac
  fi

  printf '\n  Checking %d link(s) in %s ...\n' "${#urls[@]}" "$file"
  for url in "${urls[@]}"; do
    status="$(http_status "$url")"
    [ "$status" = "200" ] && continue
    printf '    BROKEN (%s) %s\n' "$status" "$url"
    # Only look up replacements when files were passed; otherwise just list.
    alts=""
    [ "$HAVE_PARAMS" = "1" ] && alts="$(suggest_alts "$url" 6)"
    B_FILE+=("$file"); B_URL+=("$url"); B_STATUS+=("$status"); B_ALT+=("$alts")
  done
done

# ── SEO report ────────────────────────────────────────────────────────────────

if [ "${#SEO_LINES[@]}" -gt 0 ]; then
  printf '\n%s\n  SEO anchor issues (consider descriptive link text)\n' "------------------------------------------------------------"
  for s in "${SEO_LINES[@]}"; do printf '    %s\n' "$s"; done
fi

if [ "${#B_URL[@]}" -eq 0 ]; then
  printf '\n  No broken links found.\n\n'
  exit 0
fi

# ── Interactive fix ───────────────────────────────────────────────────────────

printf '\n%s\n  fix-broken-links report\n%s\n' "============================================================" "============================================================"

declare -A CHANGED
n="${#B_URL[@]}"
for ((i=0; i<n; i++)); do
  file="${B_FILE[$i]}"; url="${B_URL[$i]}"; status="${B_STATUS[$i]}"
  printf '\n  [%d] %s\n' "$((i+1))" "$file"
  printf '    URL : %s\n' "$url"
  note=""; case "$status" in ERR|000|TIMEOUT) note="  (unreachable)" ;; esac
  printf '    HTTP: %s%s\n' "$status" "$note"

  # No file parameters → report-only: list the broken link and move on.
  [ "$HAVE_PARAMS" = "1" ] || continue

  alts=(); [ -n "${B_ALT[$i]}" ] && mapfile -t alts <<< "${B_ALT[$i]}"
  printf '\n'
  if [ "${#alts[@]}" -gt 0 ]; then
    printf '    r  Replace -> %s\n' "${alts[0]}"
    for ((k=1; k<${#alts[@]}; k++)); do
      printf '    %d  Replace -> %s\n' "$k" "${alts[$k]}"
    done
  fi
  printf '    d  Remove link, keep text\n'
  printf '    c  Custom replacement URL\n'
  printf '    s  Skip\n'

  if [ -z "$TTY" ]; then
    printf '    (no terminal - reporting only)\n'
    continue
  fi

  while true; do
    ch="$(ask '  > ')"
    case "$ch" in
      s|"") break ;;
      d) remove_link "$file" "$url"; CHANGED[$file]=1; printf '    removed\n'; break ;;
      r) if [ "${#alts[@]}" -gt 0 ]; then
           replace_url "$file" "$url" "${alts[0]}"; CHANGED[$file]=1; printf '    replaced -> %s\n' "${alts[0]}"; break
         fi
         printf '    no suggestion available\n' ;;
      [1-9]) if [ "$ch" -lt "${#alts[@]}" ]; then
               replace_url "$file" "$url" "${alts[$ch]}"; CHANGED[$file]=1; printf '    replaced -> %s\n' "${alts[$ch]}"; break
             else printf '    invalid choice\n'; fi ;;
      c) u="$(ask '  URL: ')"
         if [ -n "$u" ]; then replace_url "$file" "$url" "$u"; CHANGED[$file]=1; printf '    replaced\n'; break; fi ;;
      *) printf '    invalid choice\n' ;;
    esac
  done
done

if [ "${CHANGED[*]+x}" = x ] && [ "${#CHANGED[@]}" -gt 0 ]; then
  printf '\n  %d file(s) updated:\n' "${#CHANGED[@]}"
  for f in "${!CHANGED[@]}"; do printf '    %s\n' "$f"; done
  printf '\n'
fi
exit 0
