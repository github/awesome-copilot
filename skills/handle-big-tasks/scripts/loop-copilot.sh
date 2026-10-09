#!/usr/bin/env bash
#
# loop-copilot.sh - run a large task through repeated GitHub Copilot CLI runs.
#
# Starts a new Copilot CLI session with a prompt that names the plan file,
# then answers Y in that same session after each response whose last line is
# "CONTINUE? Y or N". Stops when the last line is "TASK COMPLETE!", when a
# response ends with neither marker, when copilot fails, or at the safety
# cap. Responses stream to the terminal, and everything is appended to
# <plan-file>.loop.log next to the plan file, with a timestamped separator
# before each run.
#
# Usage:
#   ./loop-copilot.sh <plan-file> [interval-minutes]
#
#   ./loop-copilot.sh docs/migration-plan.md       # 10 minutes between runs
#   ./loop-copilot.sh docs/migration-plan.md 15    # 15 minutes between runs
#
# Environment:
#   LOOP_MAX_ITERATIONS  Safety cap on copilot runs (default 50).
#   LOOP_COPILOT_ARGS    Extra copilot flags, separated by spaces, for example
#                        "--allow-tool=write --model <model>".
#
# Exit codes:
#   0  The last response ended with TASK COMPLETE!
#   1  Stopped early: copilot failed, a response ended without a marker, a
#      response could not be saved to a temporary file, or the safety cap
#      was reached. Also used when output could not be written to the log.
#   2  Could not start: bad arguments, a missing plan file, or no copilot
#      command on PATH.

set -uo pipefail

readonly _CLI=copilot
readonly _CONTINUE_MARKER='CONTINUE? Y or N'
readonly _DONE_MARKER='TASK COMPLETE!'
readonly _SCRIPT_NAME=${0##*/}

_plan_file=''
_log_file=''
_interval=0
_max_runs=0
_extra_args=()
_response_file=''

usage() {
  cat <<EOF
Usage: $_SCRIPT_NAME <plan-file> [interval-minutes]

  plan-file          The plan to carry out, one phase per run.
  interval-minutes   Minutes to wait between runs (default 10).

Environment: LOOP_MAX_ITERATIONS (default 50), LOOP_COPILOT_ARGS
Example: $_SCRIPT_NAME docs/migration-plan.md 15
EOF
}

start_error() {
  printf 'Error: %s\n\n' "$1" >&2
  usage >&2
  exit 2
}

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

# Prints $1 without leading zeros when it is a whole number from 0 to 99999.
to_count() {
  [[ $1 =~ ^[0-9]{1,5}$ ]] || return 1
  printf '%d' "$((10#$1))"
}

new_uuid() {
  if [[ -r /proc/sys/kernel/random/uuid ]]; then
    cat /proc/sys/kernel/random/uuid
  else
    # Version 4 layout built from RANDOM, for shells without /proc.
    printf '%04x%04x-%04x-4%03x-%04x-%04x%04x%04x\n' \
      "$RANDOM" "$RANDOM" "$RANDOM" "$((RANDOM & 0x0fff))" \
      "$(((RANDOM & 0x3fff) | 0x8000))" "$RANDOM" "$RANDOM" "$RANDOM"
  fi
}

# Prints the last non-blank line of a file without surrounding whitespace,
# so a marker followed by a blank line or carriage return still matches.
last_line() {
  local _line _last=''
  while IFS= read -r _line || [[ -n $_line ]]; do
    _line=${_line//$'\r'/}
    _line=${_line#"${_line%%[![:space:]]*}"}
    _line=${_line%"${_line##*[![:space:]]}"}
    [[ -n $_line ]] && _last=$_line
  done < "$1"
  printf '%s' "$_last"
}

resume_hint() {
  printf 'Resume the session by hand with: %s --resume=%s\n' "$_CLI" "$1"
}

run_loop() {
  local _session_id _statuses _last _first_prompt _run=0

  _session_id=$(new_uuid)
  _first_prompt="Use the handle-big-tasks skill to carry out the plan in the \
file ${_plan_file}, one phase per response. While phases remain, end every \
response with a last line that is exactly the full marker '${_CONTINUE_MARKER}' \
without the quotes. Once the whole plan is done, end with a last line that is \
exactly '${_DONE_MARKER}' without the quotes. A script reads that last line and \
answers Y after each phase, so never shorten or format the marker. If a phase \
is blocked on something only a person can resolve, explain the blocker and end \
without either marker."

  printf '\n----- %s | %s loop started -----\n' "$(timestamp)" "$_CLI"
  printf 'Plan file: %s\n' "$_plan_file"
  printf 'Session:   %s\n' "$_session_id"
  printf 'Interval:  %d minute(s), safety cap %d run(s)\n' "$_interval" "$_max_runs"

  while (( _run < _max_runs )); do
    _run=$((_run + 1))
    printf '\n----- %s | run %d of %d -----\n' "$(timestamp)" "$_run" "$_max_runs"

    if (( _run == 1 )); then
      "$_CLI" -p "$_first_prompt" --session-id="$_session_id" -s --no-color \
        ${_extra_args[@]+"${_extra_args[@]}"} < /dev/null | tee "$_response_file"
    else
      "$_CLI" -p Y --resume="$_session_id" -s --no-color \
        ${_extra_args[@]+"${_extra_args[@]}"} < /dev/null | tee "$_response_file"
    fi
    # Keep tee's status too: a failed write leaves the response file
    # incomplete, and its last line must not decide what happens next.
    _statuses=("${PIPESTATUS[@]}")

    if (( _statuses[0] != 0 )); then
      printf '\nStopping: %s exited with status %d.\n' "$_CLI" "${_statuses[0]}"
      resume_hint "$_session_id"
      return 1
    fi
    if (( _statuses[1] != 0 )); then
      printf '\nStopping: could not save the response to %s\n' "$_response_file"
      resume_hint "$_session_id"
      return 1
    fi

    _last=$(last_line "$_response_file")
    if [[ $_last == "$_DONE_MARKER" ]]; then
      printf '\nTask complete after %d run(s).\n' "$_run"
      return 0
    fi
    if [[ $_last != "$_CONTINUE_MARKER" ]]; then
      printf '\nStopping: the last line was neither %s nor %s\n' "$_CONTINUE_MARKER" "$_DONE_MARKER"
      printf 'Last line: %s\n' "${_last:-(blank)}"
      resume_hint "$_session_id"
      return 1
    fi

    if (( _run < _max_runs )); then
      printf '\nPhase complete. Waiting %d minute(s) before run %d. Press Ctrl+C to stop.\n' \
        "$_interval" "$((_run + 1))"
      sleep "$((_interval * 60))"
    fi
  done

  printf '\nStopping: reached the safety cap of %d runs before the task finished.\n' "$_max_runs"
  resume_hint "$_session_id"
  return 1
}

main() {
  local _statuses

  case ${1:-} in
    '') start_error 'missing plan file.' ;;
    -h | --help) usage; exit 0 ;;
  esac
  (( $# <= 2 )) || start_error 'too many arguments.'

  _plan_file=$1
  [[ -e $_plan_file ]] || start_error "plan file not found: $_plan_file"
  [[ -f $_plan_file && -r $_plan_file ]] || start_error "plan file is not a readable file: $_plan_file"
  _interval=$(to_count "${2:-10}") ||
    start_error 'interval-minutes must be a whole number from 0 to 99999.'
  _max_runs=$(to_count "${LOOP_MAX_ITERATIONS:-50}") && (( _max_runs > 0 )) ||
    start_error 'LOOP_MAX_ITERATIONS must be a whole number from 1 to 99999.'
  read -r -a _extra_args <<< "${LOOP_COPILOT_ARGS:-}"
  command -v "$_CLI" > /dev/null || start_error "$_CLI was not found on PATH."

  _log_file=$_plan_file.loop.log
  { : >> "$_log_file"; } 2> /dev/null || start_error "cannot write the log file: $_log_file"

  # The trap lives here, not in run_loop: bash 5.1 lets an EXIT trap set in
  # a piped subshell replace that subshell's exit status with the trap's own.
  _response_file=$(mktemp) || start_error 'could not create a temporary file.'
  trap 'rm -f -- "$_response_file"' EXIT

  run_loop 2>&1 | tee -a "$_log_file"
  _statuses=("${PIPESTATUS[@]}")
  if (( _statuses[1] != 0 )); then
    printf 'Error: could not write all output to the log file: %s\n' "$_log_file" >&2
    (( _statuses[0] != 0 )) || exit 1
  fi
  exit "${_statuses[0]}"
}

main "$@"
