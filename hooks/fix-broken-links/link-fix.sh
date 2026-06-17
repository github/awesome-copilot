#!/bin/bash
# fix-broken-links — link-fix.sh
#
# Before each Copilot prompt: find changed web files, extract every http(s) URL,
# and check each with curl. For any URL that does not return 200, try spelling
# variations (http/https, www, trailing slash) then a Wayback Machine lookup, and
# present an interactive menu to replace, remove (keep anchor text), or skip.
# Generic anchor text is flagged as an SEO note.
#
# Pure bash + grep/sed/curl. No other languages.
# Covers: HTML · Markdown · JS/TS · JSON · CSS · SQL · templates (all via URL scan)
# Requires: curl, grep, sed  |  Trigger: userPromptSubmitted
set -uo pipefail

LIMIT=50
TIMEOUT=10
UA='Mozilla/5.0 (compatible; fix-broken-links/1.0)'
WEB_RE='\.(html?|xhtml|md|markdown|mdx|js|jsx|ts|tsx|vue|svelte|json|jsonl|css|sql|erb|jinja|j2|twig|ejs|pug|hbs)$'

command -v curl >/dev/null 2>&1 || { printf 'fix-broken-links: curl not found\n' >&2; exit 0; }

# ── Hook stdin ────────────────────────────────────────────────────────────────
# When called as a postToolUse hook, extract edited files from the JSON payload
# and inject them as positional args so collect_input picks them up.
if [ "$#" -eq 0 ] && [ ! -t 0 ]; then
  _INPUT=$(cat)
  _TOOL=$(printf '%s' "$_INPUT" | jq -r '.toolName // .tool_name // empty' 2>/dev/null)
  case "$_TOOL" in
    editFiles|write|str_replace_editor|create_file)
      mapfile -t _FILES < <(
        printf '%s' "$_INPUT" \
          | jq -r '.tool_input.files[]? // .toolInput.files[]? // empty' 2>/dev/null
      )
      [ "${#_FILES[@]}" -gt 0 ] && set -- "${_FILES[@]}"
      ;;
    "")
      # No tool context — called as userPromptSubmitted or manually, fall through
      ;;
    *)
      # Different tool (bash, read, etc.) — nothing to check
      exit 0
      ;;
  esac
fi

# Interactive input comes from the terminal, since stdin may carry hook JSON.
# Probe by actually opening /dev/tty — a mere -r/-w test can pass where open fails.
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
# [[ =~ ]] pattern. Only true metacharacters are escaped — backslash-escaping an
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

# Look up a working replacement in the Wayback Machine, using the broken URL as
# the lookup key; echo the closest archived snapshot URL or nothing.
# DuckDuckGo no longer serves web results to curl (its endpoints return a 202
# anti-bot challenge, and the Instant Answer API has no general results), so the
# Wayback Machine is the reliable, key-free source for a live copy of a dead link.
# --data-urlencode keeps the URL's own ?query&params from corrupting our request.
wayback_lookup() {
  local url="$1"
  curl -s -G --max-time 8 "http://archive.org/wayback/available" \
       --data-urlencode "url=${url}" 2>/dev/null \
    | grep -oE '"url": ?"https?://web\.archive\.org/[^"]+"' \
    | head -1 \
    | sed -E 's/.*"(https?:[^"]+)"/\1/'
}

# Longest common prefix length (in characters) of two strings.
lcp_len() {
  local a="$1" b="$2" n="${#1}" i=0
  [ "${#2}" -lt "$n" ] && n="${#2}"
  while [ "$i" -lt "$n" ] && [ "${a:i:1}" = "${b:i:1}" ]; do i=$((i+1)); done
  printf '%d' "$i"
}

# Archived sibling pages living in the same directory as the broken URL. Queries
# the Wayback CDX API with a path wildcard, keeps only captures the archive
# served at status 200, strips query strings and trailing slashes, dedupes.
# One URL per line. This is how a misspelled link finds its correct neighbour.
cdx_siblings() {
  local url="$1" rest host path dir prefix out try
  rest="${url#*://}"; host="${rest%%/*}"
  path="/${rest#*/}"; [ "/$rest" = "$path" ] && return 1   # host only, no siblings
  dir="${path%/*}"; [ -z "$dir" ] && return 1              # top-level page, skip
  prefix="${host}${dir}/*"
  # The CDX API rate-limits bursts and returns an empty body when throttled;
  # retry a couple of times before giving up so a transient blip isn't fatal.
  for try in 1 2 3; do
    out="$(curl -s --max-time 12 \
      "http://web.archive.org/cdx/search/cdx?url=${prefix}&output=text&fl=original&filter=statuscode:200&collapse=urlkey&limit=200" 2>/dev/null)"
    [ -n "$out" ] && break
    sleep 1
  done
  [ -z "$out" ] && return 1
  printf '%s\n' "$out" | sed -E 's/\?.*$//; s#/$##' | sort -u
}

# Emit up to MAX viable replacement URLs for a broken link, best first:
#   1. a working scheme/www/slash variation (verified live 200)
#   2. archived sibling pages whose final path segment most resembles the broken
#      one — ranked by shared-prefix length, then re-checked live (200 only)
#   3. the closest archived snapshot, only if nothing live was found
# Output is newline-delimited and de-duplicated (case-insensitively). The first
# line is what `r` uses; the remainder become the numbered alternatives.
suggest_alts() {
  local url="$1" max="${2:-6}" seg cand sib score key checks=0
  seg="${url##*/}"; seg="${seg%%\?*}"
  local -A seen=()
  local out=()

  cand="$(find_variation "$url")" && [ -n "$cand" ] && { out+=("$cand"); seen["${cand,,}"]=1; }

  while IFS=$'\t' read -r score sib; do
    [ "${#out[@]}" -ge "$max" ] && break
    [ "$checks" -ge 10 ] && break
    [ -z "$sib" ] && continue
    key="${sib,,}"; [ -n "${seen[$key]:-}" ] && continue
    checks=$((checks+1))
    [ "$(http_status "$sib")" = "200" ] || continue
    out+=("$sib"); seen[$key]=1
  done < <(
    while IFS= read -r sib; do
      [ -z "$sib" ] && continue
      [ "$sib" = "$url" ] && continue
      printf '%s\t%s\n' "$(lcp_len "$seg" "${sib##*/}")" "$sib"
    done < <(cdx_siblings "$url") | sort -rn -k1,1
  )

  if [ "${#out[@]}" -eq 0 ]; then
    cand="$(wayback_lookup "$url")" && [ -n "$cand" ] && out+=("$cand")
  fi

  [ "${#out[@]}" -eq 0 ] && return 0
  printf '%s\n' "${out[@]}"
}

# Replace a literal URL everywhere in a file (pure bash, no regex).
replace_url() {
  local file="$1" old="$2" new="$3" content
  read_file content "$file"
  printf '%s' "${content//"$old"/"$new"}" > "$file"
}

# Remove the link wrapper but keep the visible text:
#   <a href="URL">text</a>  ->  text
#   [text](URL)             ->  text
# Each matched wrapper is swapped for its inner text via literal replacement.
remove_link() {
  local file="$1" url="$2" content esc re
  read_file content "$file"
  esc="$(re_escape "$url")"
  for re in \
    '<a[^>]*href="'"$esc"'"[^>]*>([^<]*)</a>' \
    "<a[^>]*href='${esc}'[^>]*>([^<]*)</a>" \
    '\[([^]]*)\]\('"$esc"'[^)]*\)'; do
    while [[ $content =~ $re ]]; do
      content="${content//"${BASH_REMATCH[0]}"/"${BASH_REMATCH[1]}"}"
    done
  done
  printf '%s' "$content" > "$file"
}

# ── File discovery ────────────────────────────────────────────────────────────

collect_input() {
  if [ "$#" -gt 0 ]; then printf '%s\n' "$@"; return; fi
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

  if [ "${#urls[@]}" -gt "$LIMIT" ]; then
    ans="$(ask "  ${file} has ${#urls[@]} links (limit ${LIMIT}). Continue? [Y/n] ")"
    case "$ans" in n|N|no|NO) continue ;; esac
  fi

  printf '\n  Checking %d link(s) in %s ...\n' "${#urls[@]}" "$file"
  for url in "${urls[@]}"; do
    status="$(http_status "$url")"
    [ "$status" = "200" ] && continue
    printf '    BROKEN (%s) %s\n' "$status" "$url"
    alts="$(suggest_alts "$url" 6)"
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
  alts=(); [ -n "${B_ALT[$i]}" ] && mapfile -t alts <<< "${B_ALT[$i]}"
  printf '\n  [%d] %s\n' "$((i+1))" "$file"
  printf '    URL : %s\n' "$url"
  note=""; case "$status" in ERR|000|TIMEOUT) note="  (unreachable)" ;; esac
  printf '    HTTP: %s%s\n' "$status" "$note"
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
    printf '    (no terminal — reporting only)\n'
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
