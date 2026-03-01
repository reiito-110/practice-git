$batContent = @"
@echo off
cd /d %~dp0

echo [Debug] Checking Administrator privileges...
NET SESSION >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] This script must be run as Administrator.
    echo Please right-click 'Run_Kitting.bat' and select 'Run as administrator'.
    pause
    exit /b
)

echo [Debug] Running kitting_launcher.ps1...
powershell -NoProfile -ExecutionPolicy Bypass -File "kitting_launcher.ps1"

if %errorlevel% neq 0 (
    echo [Error] PowerShell launcher exited with error code %errorlevel%.
    pause
) else (
    echo [Success] Execution finished.
    pause
)
"@

# Write with Shift-JIS (Encoding 932) to ensure CMD.exe handles it correctly without BOM issues
[System.IO.File]::WriteAllText("D:\setup\PC_Kitting\Run_Kitting.bat", $batContent, [System.Text.Encoding]::GetEncoding(932))
Write-Host "Re-created Run_Kitting.bat with Shift-JIS encoding."
