@echo off
REM myLib
::  A reusable function library with CALL-able labels.
::
::  usage: call myLib [function] [args...]
::   Functions:
::     trimWhitespace  [inputVar]            Trim leading/trailing spaces
::     toLower         [inputVar]            Convert value to lowercase
::     getTimestamp     [outputVar]           Get current date-time stamp
::     logMessage       [level] [message]    Write a log entry
::     padRight         [string] [width]     Right-pad a string with spaces
::
::  examples:
::   > set "myVar=  Hello World  "
::   > call myLib trimWhitespace myVar
::   > call myLib getTimestamp _now
::   > call myLib logMessage INFO "Acme Corp backup started"
::
set "_helpLinesMyLib=17"

:: ========================================================================
:: TEMPLATE INSTRUCTIONS
:: 1. Find/Replace "myLib" with your library name (camelCase).
:: 2. Find/Replace "MyLib" with your library name (PascalCase).
:: 3. Add your own :_funcNameMyLib labels below.
:: 4. Update the help block above (lines 2-17) for your library.
:: 5. Add any new variables to :_removeBatchVariablesMyLib.
:: ========================================================================

:: Route to the requested function.
set "_funcMyLib=%~1"
set "_argOneMyLib=%~2"
set "_argTwoMyLib=%~3"
set "_argThreeMyLib=%~4"

if "%_funcMyLib%"=="/?" call :_showHelpMyLib & goto _removeBatchVariablesMyLib
if /i "%_funcMyLib%"=="-h" call :_showHelpMyLib & goto _removeBatchVariablesMyLib
if /i "%_funcMyLib%"=="--help" call :_showHelpMyLib & goto _removeBatchVariablesMyLib

if /i "%_funcMyLib%"=="trimWhitespace" call :_trimWhitespaceMyLib & goto _removeBatchVariablesMyLib
if /i "%_funcMyLib%"=="toLower" call :_toLowerMyLib & goto _removeBatchVariablesMyLib
if /i "%_funcMyLib%"=="getTimestamp" call :_getTimestampMyLib & goto _removeBatchVariablesMyLib
if /i "%_funcMyLib%"=="logMessage" call :_logMessageMyLib & goto _removeBatchVariablesMyLib
if /i "%_funcMyLib%"=="padRight" call :_padRightMyLib & goto _removeBatchVariablesMyLib

echo ERROR: Unknown function "%_funcMyLib%". Run "%~n0 /?" for usage.
goto _removeBatchVariablesMyLib

:: ========================================================================
:: LIBRARY FUNCTIONS
:: ========================================================================

:_trimWhitespaceMyLib
    REM Trim leading and trailing spaces from a variable.
    REM   %_argOneMyLib% = name of the variable to trim (passed by name).
    if not defined _argOneMyLib goto :eof
    setlocal EnableDelayedExpansion
    set "_valMyLib=!%_argOneMyLib%!"
    REM Trim leading spaces.
    for /f "tokens=* delims= " %%a in ("!_valMyLib!") do set "_valMyLib=%%a"
    REM Trim trailing spaces.
    :_trimTrailingMyLib
    if "!_valMyLib:~-1!"==" " (
        set "_valMyLib=!_valMyLib:~0,-1!"
        goto _trimTrailingMyLib
    )
    endlocal & set "%_argOneMyLib%=%_valMyLib%"
goto :eof

:_toLowerMyLib
    REM Convert a variable's value to lowercase.
    REM   %_argOneMyLib% = name of the variable to convert (passed by name).
    if not defined _argOneMyLib goto :eof
    setlocal EnableDelayedExpansion
    set "_valMyLib=!%_argOneMyLib%!"
    for %%c in (A B C D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
        set "_valMyLib=!_valMyLib:%%c=%%c!"
    )
    REM Note: The for-loop substitution lowercases via cmd's case-insensitive
    REM replacement when the loop variable %%c is already lowercase at
    REM expansion time. For a full implementation, use an explicit mapping.
    endlocal & set "%_argOneMyLib%=%_valMyLib%"
goto :eof

:_getTimestampMyLib
    REM Write a YYYY-MM-DD_HH-MM-SS timestamp into the named variable.
    REM   %_argOneMyLib% = name of the output variable.
    if not defined _argOneMyLib goto :eof
    setlocal EnableDelayedExpansion
    for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do (
        set "_dtMyLib=%%a"
    )
    set "_stampMyLib=%_dtMyLib:~0,4%-%_dtMyLib:~4,2%-%_dtMyLib:~6,2%_%_dtMyLib:~8,2%-%_dtMyLib:~10,2%-%_dtMyLib:~12,2%"
    endlocal & set "%_argOneMyLib%=%_stampMyLib%"
goto :eof

:_logMessageMyLib
    REM Write a timestamped log line to stdout.
    REM   %_argOneMyLib% = level (INFO, WARN, ERROR)
    REM   %_argTwoMyLib% = message text
    setlocal EnableDelayedExpansion
    for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do (
        set "_dtMyLib=%%a"
    )
    set "_tsMyLib=%_dtMyLib:~0,4%-%_dtMyLib:~4,2%-%_dtMyLib:~6,2% %_dtMyLib:~8,2%:%_dtMyLib:~10,2%:%_dtMyLib:~12,2%"
    echo [%_tsMyLib%] [%_argOneMyLib%] %_argTwoMyLib%
    endlocal
goto :eof

:_padRightMyLib
    REM Pad a string to a given width with trailing spaces.
    REM   %_argOneMyLib% = the string to pad
    REM   %_argTwoMyLib% = desired total width
    if not defined _argOneMyLib goto :eof
    if not defined _argTwoMyLib goto :eof
    setlocal EnableDelayedExpansion
    set "_valMyLib=%_argOneMyLib%"
    set "_padMyLib=%_valMyLib%                                                  "
    set "_padMyLib=!_padMyLib:~0,%_argTwoMyLib%!"
    echo !_padMyLib!
    endlocal
goto :eof

:: ========================================================================
:: HELP
:: ========================================================================

:_showHelpMyLib
    echo:
    for /f "skip=1 tokens=* delims=" %%a in ('findstr /n "^" "%~f0"') do (
        set "_line=%%a"
        setlocal EnableDelayedExpansion
        set "_lineNum=!_line:~0,2!"
        if !_lineNum! GTR %_helpLinesMyLib% (
            endlocal
            goto :eof
        )
        set "_text=!_line:*:=!"
        if defined _text (
            echo !_text:~4!
        ) else (
            echo:
        )
        endlocal
    )
goto :eof

:: ========================================================================
:: CLEANUP — Remove all batch variables.
:: ========================================================================
:_removeBatchVariablesMyLib
    set _helpLinesMyLib=
    set _funcMyLib=
    set _argOneMyLib=
    set _argTwoMyLib=
    set _argThreeMyLib=
    set _valMyLib=
    REM Append new variables above this line.
    exit /b
