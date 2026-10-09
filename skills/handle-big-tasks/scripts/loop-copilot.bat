@echo off
rem ==========================================================================
rem loop-copilot.bat - run a large task through repeated GitHub Copilot CLI
rem runs.
rem
rem Starts a new Copilot CLI session with a prompt that names the plan file,
rem then answers Y in that same session after each response whose last line
rem is "CONTINUE? Y or N". Stops when the last line is "TASK COMPLETE!", when
rem a response ends with neither marker, when copilot fails, or at the
rem safety cap. Each response is printed when its run ends, and everything
rem is appended to <plan-file>.loop.log next to the plan file, with a
rem timestamped separator before each run.
rem
rem Usage:
rem   loop-copilot.bat <plan-file> [interval-minutes]
rem
rem   loop-copilot.bat docs\migration-plan.md       10 minutes between runs
rem   loop-copilot.bat docs\migration-plan.md 15    15 minutes between runs
rem
rem Environment:
rem   LOOP_MAX_ITERATIONS  Safety cap on copilot runs (default 50).
rem   LOOP_COPILOT_ARGS    Extra copilot flags, separated by spaces, for
rem                        example --allow-tool=write
rem
rem Exit codes:
rem   0  The last response ended with TASK COMPLETE!
rem   1  Stopped early: copilot failed, a response ended without a marker,
rem      or the safety cap was reached.
rem   2  Could not start: bad arguments, a missing plan file, or no copilot
rem      command on PATH.
rem
rem Uses only CMD built-ins and System32 tools (find, findstr, timeout,
rem where), called by full path so Unix ports earlier on PATH cannot shadow
rem them.
rem ==========================================================================
setlocal EnableExtensions DisableDelayedExpansion

set "_CLI=copilot"
set "_CONTINUE_MARKER=CONTINUE? Y or N"
set "_DONE_MARKER=TASK COMPLETE!"
set "_SYS32=%SystemRoot%\System32"
set "_SCRIPT_NAME=%~nx0"
set "_EXIT_CODE=1"
set "_LOG_FILE="
set "_WORK="
set "_OLD_CP="

rem CMD finds goto and call labels by scanning this file, and the scan goes
rem wrong when the file has LF line endings, as raw downloads of it do. So
rem before any label is used, write a copy with CRLF line endings and, when
rem it differs in size, run the copy instead. _LOOP_COPILOT_CRLF passes this
rem script's name to the copy and keeps the copy from doing the same.
if defined _LOOP_COPILOT_CRLF set "_SCRIPT_NAME=%_LOOP_COPILOT_CRLF%"
set "_CRLF_COPY=%TEMP%\loop-%_CLI%-crlf-%RANDOM%%TIME:~-2%.bat"
set "_RUN_CRLF_COPY="
if not defined _LOOP_COPILOT_CRLF (
  type "%~f0" | "%_SYS32%\find.exe" /v "" > "%_CRLF_COPY%" 2>nul
  for %%F in ("%~f0") do for %%C in ("%_CRLF_COPY%") do (
    if exist %%C if not "%%~zC"=="%%~zF" set "_RUN_CRLF_COPY=1"
  )
)
set "_LOOP_COPILOT_CRLF="
if defined _RUN_CRLF_COPY set "_LOOP_COPILOT_CRLF=%_SCRIPT_NAME%"
if defined _RUN_CRLF_COPY call "%_CRLF_COPY%" %*
if defined _RUN_CRLF_COPY set "_EXIT_CODE=%ERRORLEVEL%"
del "%_CRLF_COPY%" >nul 2>&1
if defined _RUN_CRLF_COPY (
  endlocal
  exit /b %_EXIT_CODE%
)

if "%~1"=="" (
  set "_MSG=Error: missing plan file."
  goto :start_error
)
if "%~1"=="/?" goto :usage
if /i "%~1"=="-h" goto :usage
if /i "%~1"=="--help" goto :usage
if not "%~3"=="" (
  set "_MSG=Error: too many arguments."
  goto :start_error
)
if not exist "%~1" (
  set "_MSG=Error: plan file not found: %~1"
  goto :start_error
)
if exist "%~1\*" (
  set "_MSG=Error: plan file is a folder: %~1"
  goto :start_error
)
set "_PLAN_FILE=%~f1"

set "_INTERVAL=%~2"
if not defined _INTERVAL set "_INTERVAL=10"
call :to_count _INTERVAL 0 || (
  set "_MSG=Error: interval-minutes must be a whole number from 0 to 99999."
  goto :start_error
)
set "_MAX_RUNS=%LOOP_MAX_ITERATIONS%"
if not defined _MAX_RUNS set "_MAX_RUNS=50"
call :to_count _MAX_RUNS 1 || (
  set "_MSG=Error: LOOP_MAX_ITERATIONS must be a whole number from 1 to 99999."
  goto :start_error
)
"%_SYS32%\where.exe" /q "%_CLI%" || (
  set "_MSG=Error: %_CLI% was not found on PATH."
  goto :start_error
)
set "_LOG_PATH=%_PLAN_FILE%.loop.log"
2>nul >>"%_LOG_PATH%" (call ) || (
  set "_MSG=Error: cannot write the log file: %_LOG_PATH%"
  goto :start_error
)

set "_FIRST_PROMPT=Use the handle-big-tasks skill to carry out the plan in the file %_PLAN_FILE%, one phase per response. While phases remain, end every response with a last line that is exactly the full marker '%_CONTINUE_MARKER%' without the quotes. Once the whole plan is done, end with a last line that is exactly '%_DONE_MARKER%' without the quotes. A script reads that last line and answers Y after each phase, so never shorten or format the marker. If a phase is blocked on something only a person can resolve, explain the blocker and end without either marker."

call :new_uuid
set "_WORK=%TEMP%\loop-%_CLI%-%_SESSION_ID%"
rem Show UTF-8 responses correctly, then restore the code page in :finish.
for /f "tokens=2 delims=:." %%C in ('"%_SYS32%\chcp.com" 2^>nul') do set /a "_OLD_CP=%%C"
"%_SYS32%\chcp.com" 65001 >nul 2>&1

set "_LOG_FILE=%_LOG_PATH%"
set "_MSG="
call :say
set "_MSG=----- %DATE% %TIME% | %_CLI% loop started -----"
call :say
set "_MSG=Plan file: %_PLAN_FILE%"
call :say
set "_MSG=Session:   %_SESSION_ID%"
call :say
set "_MSG=Interval:  %_INTERVAL% minute(s), safety cap %_MAX_RUNS% run(s)"
call :say

set /a _RUN=0

:next_run
set /a _RUN+=1
set "_MSG="
call :say
set "_MSG=----- %DATE% %TIME% | run %_RUN% of %_MAX_RUNS% -----"
call :say
rem Branch with goto, not a ( ) block, so parentheses in LOOP_COPILOT_ARGS,
rem such as --allow-tool=shell(git:*), cannot end the block early. The CLI
rem is an npm .cmd shim, so it must be started with call to return here.
if %_RUN% gtr 1 goto :resume_run
call "%_CLI%" -p "%_FIRST_PROMPT%" --session-id=%_SESSION_ID% -s --no-color %LOOP_COPILOT_ARGS% < nul > "%_WORK%.out.txt" 2> "%_WORK%.err.txt"
goto :show_run
:resume_run
call "%_CLI%" -p Y --resume=%_SESSION_ID% -s --no-color %LOOP_COPILOT_ARGS% < nul > "%_WORK%.out.txt" 2> "%_WORK%.err.txt"
:show_run
set "_CLI_STATUS=%ERRORLEVEL%"
type "%_WORK%.out.txt"
>> "%_LOG_FILE%" type "%_WORK%.out.txt"
for %%F in ("%_WORK%.err.txt") do if %%~zF gtr 0 (
  type "%_WORK%.err.txt"
  >> "%_LOG_FILE%" type "%_WORK%.err.txt"
)
if not "%_CLI_STATUS%"=="0" goto :stop_cli_failed

rem Keep the last non-blank line. Delayed expansion stays off here so any
rem ! in the response survives, and the line is only ever expanded with
rem !_LAST_LINE!, never %%_LAST_LINE%%, so its characters are never parsed.
set "_LAST_LINE="
for /f usebackq^ tokens^=*^ eol^= %%L in ("%_WORK%.out.txt") do set "_LAST_LINE=%%L"
setlocal EnableDelayedExpansion
> "!_WORK!.last.txt" echo(!_LAST_LINE!
endlocal
"%_SYS32%\findstr.exe" /r /x /c:"%_DONE_MARKER% *" "%_WORK%.last.txt" >nul && goto :task_complete
"%_SYS32%\findstr.exe" /r /x /c:"%_CONTINUE_MARKER% *" "%_WORK%.last.txt" >nul && goto :phase_complete
goto :stop_no_marker

:phase_complete
if %_RUN% geq %_MAX_RUNS% goto :stop_cap
set /a _NEXT_RUN=_RUN+1
set "_MSG="
call :say
set "_MSG=Phase complete. Waiting %_INTERVAL% minute(s) before run %_NEXT_RUN%. Press Ctrl+C to stop."
call :say
call :wait_minutes
goto :next_run

:task_complete
set "_MSG="
call :say
set "_MSG=Task complete after %_RUN% run(s)."
call :say
set "_EXIT_CODE=0"
goto :finish

:stop_cli_failed
set "_MSG="
call :say
set "_MSG=Stopping: %_CLI% exited with status %_CLI_STATUS%."
call :say
goto :stop_hint

:stop_no_marker
set "_MSG="
call :say
set "_MSG=Stopping: the last line was neither %_CONTINUE_MARKER% nor %_DONE_MARKER%"
call :say
setlocal EnableDelayedExpansion
set "_MSG=Last line: !_LAST_LINE!"
if not defined _LAST_LINE set "_MSG=Last line: (blank)"
call :say
endlocal
goto :stop_hint

:stop_cap
set "_MSG="
call :say
set "_MSG=Stopping: reached the safety cap of %_MAX_RUNS% runs before the task finished."
call :say

:stop_hint
set "_MSG=Resume the session by hand with: %_CLI% --resume=%_SESSION_ID%"
call :say

:finish
if defined _WORK del /q "%_WORK%.out.txt" "%_WORK%.err.txt" "%_WORK%.last.txt" >nul 2>&1
if defined _OLD_CP "%_SYS32%\chcp.com" %_OLD_CP% >nul 2>&1
endlocal & exit /b %_EXIT_CODE%

:start_error
call :say_error
>&2 echo(
call :usage_text 1>&2
endlocal & exit /b 2

:usage
call :usage_text
endlocal & exit /b 0

rem --------------------------------------------------------------------------
rem Subroutines
rem --------------------------------------------------------------------------

:usage_text
echo Usage: %_SCRIPT_NAME% ^<plan-file^> [interval-minutes]
echo(
echo   plan-file          The plan to carry out, one phase per run.
echo   interval-minutes   Minutes to wait between runs (default 10).
echo(
echo Environment: LOOP_MAX_ITERATIONS (default 50), LOOP_COPILOT_ARGS
echo Example: %_SCRIPT_NAME% docs\migration-plan.md 15
exit /b 0

:say
rem Prints _MSG and appends it to the log once logging has started.
setlocal EnableDelayedExpansion
echo(!_MSG!
if defined _LOG_FILE (>> "!_LOG_FILE!" echo(!_MSG!)
endlocal
exit /b 0

:say_error
setlocal EnableDelayedExpansion
>&2 echo(!_MSG!
endlocal
exit /b 0

:to_count
rem Checks that the variable named %1 holds a whole number from %2 to 99999
rem and rewrites it without leading zeros, so set /a cannot read it as octal.
setlocal EnableDelayedExpansion
set "_VALUE=!%~1!"
if not defined _VALUE exit /b 1
if not "!_VALUE:~5!"=="" exit /b 1
for /f "delims=0123456789" %%A in ("!_VALUE!") do exit /b 1
:to_count_strip
if "!_VALUE:~0,1!"=="0" if not "!_VALUE!"=="0" (
  set "_VALUE=!_VALUE:~1!"
  goto :to_count_strip
)
if !_VALUE! lss %~2 exit /b 1
endlocal & set "%~1=%_VALUE%"
exit /b 0

:new_uuid
rem Builds a version 4 UUID from RANDOM. The warm-up draws keep two loops
rem started in the same second from producing the same ID.
setlocal EnableDelayedExpansion
set "_HEX=0123456789abcdef"
set /a "_WARMUP=1%TIME:~-2% - 100"
for /l %%I in (0,1,%_WARMUP%) do set "_SKIP=!RANDOM!"
set "_UUID="
for /l %%I in (1,1,32) do (
  set /a "_DIGIT=!RANDOM! %% 16"
  if %%I==13 set "_DIGIT=4"
  if %%I==17 set /a "_DIGIT=_DIGIT %% 4 + 8"
  for %%D in (!_DIGIT!) do set "_UUID=!_UUID!!_HEX:~%%D,1!"
  if %%I==8 set "_UUID=!_UUID!-"
  if %%I==12 set "_UUID=!_UUID!-"
  if %%I==16 set "_UUID=!_UUID!-"
  if %%I==20 set "_UUID=!_UUID!-"
)
endlocal & set "_SESSION_ID=%_UUID%"
exit /b 0

:wait_minutes
rem timeout.exe exits at once when stdin is not a console (IDE tasks, CI,
rem shells such as Git Bash), so fall back to ping, which waits about one
rem second per echo request.
for /l %%M in (1,1,%_INTERVAL%) do (
  "%_SYS32%\timeout.exe" /t 60 /nobreak >nul 2>&1 || "%_SYS32%\PING.EXE" -n 61 127.0.0.1 >nul
)
exit /b 0
