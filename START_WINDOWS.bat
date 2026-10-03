@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>&1
if errorlevel 1 (
 powershell -NoProfile -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Install Python 3.12 or 3.13 from python.org, including the Python Launcher.','DAW Bridge') | Out-Null"
 exit /b 1
)
py -3 -c "import pyflp,numpy,soundfile,psutil" >nul 2>&1
if errorlevel 1 (
 echo Installing DAW Bridge GOD MODE 4.2 local dependencies. Internet is needed for this first install.
 py -3 -m pip install -r requirements.txt > "%TEMP%\DAWBridge-install.log" 2>&1
 if errorlevel 1 (
  powershell -NoProfile -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Dependency installation failed. Check %TEMP%\DAWBridge-install.log or run START_WINDOWS.bat to inspect.','DAW Bridge') | Out-Null"
  exit /b 1
 )
)
echo Launching DAW Bridge GOD MODE 4.2 standalone app.
echo Choose a limited project/media folder in the launcher. Do not select an entire drive.
py -3 launch_daw_bridge.py
