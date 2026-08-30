#!/usr/bin/env bash

log_warn()  { printf '[WARN] %s\n'  "$*" >&2; }
log_error() { printf '[ERROR] %s\n' "$*" >&2; }

status_token() {
  case "$1" in
    success|copied|ok)   printf 'OK'   ;;
    manual|partial|warn) printf 'WARN' ;;
    failed|error)        printf 'FAIL' ;;
    skipped|absent|none) printf '-'   ;;
    *)                   printf '?'   ;;
  esac
}

json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\t'/\\t}"
  s="${s//$'\r'/\\r}"
  printf '%s' "$s"
}
