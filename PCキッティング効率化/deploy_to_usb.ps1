$src = "C:\Users\24030460\Desktop\antigravity\PCキッティング効率化"
$brain = $src  # 最新のスクリプトがあるディレクトリをソースに設定
$dest = "D:\setup\PC_Kitting"
$slackSource = "D:\setup\☆個人設定\Slack.msix"

if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force
}

# Sync from Brain directory to D:
Get-ChildItem -Path $brain -File | ForEach-Object {
    if ($_.Name -match "implementation_plan|task|walkthrough") { return } # アーティファクト自体は除外
    $target = Join-Path $dest $_.Name
    Copy-Item $_.FullName $target -Force
    
    # Fix encoding for scripts
    if ($_.Extension -eq ".ps1") {
        $content = Get-Content $_.FullName -Raw -Encoding UTF8
        [System.IO.File]::WriteAllText($target, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Deployed and Encoded: $($_.Name)"
    }
    else {
        Write-Host "Deployed: $($_.Name)"
    }
}

# Slack.msix をスクリプトと同じフォルダにコピーして扱いやすくする
if (Test-Path $slackSource) {
    Copy-Item $slackSource (Join-Path $dest "Slack.msix") -Force
    Write-Host "Slack.msix をキッティングフォルダへコピーしました。" -ForegroundColor Green
}

# Sync ChromeLinks folder
$linksSrc = Join-Path $src "ChromeLinks"
$linksDest = Join-Path $dest "ChromeLinks"
if (Test-Path $linksSrc) {
    if (-not (Test-Path $linksDest)) { New-Item -ItemType Directory -Path $linksDest -Force }
    Copy-Item "$linksSrc\*" $linksDest -Force
    Write-Host "Synced ChromeLinks folder."
}

# Run_Kitting.bat の作成/更新 (Shift-JIS)
$batContent = @"
@echo off
cd /d %~dp0
echo [Debug] Checking Administrator privileges...
NET SESSION >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] This script must be run as Administrator.
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
[System.IO.File]::WriteAllText((Join-Path $dest "Run_Kitting.bat"), $batContent, [System.Text.Encoding]::GetEncoding(932))
Write-Host "Run_Kitting.bat を更新しました。" -ForegroundColor Green

Write-Host "Deployment to USB Complete."
