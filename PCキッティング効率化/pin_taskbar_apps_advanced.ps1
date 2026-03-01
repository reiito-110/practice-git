# pin_taskbar_apps_advanced.ps1
# タスクバーへのアプリ固定（新規ユーザー用 + 手動ピン留め案内）

Write-Host "タスクバーのピン留め設定..." -ForegroundColor Cyan

# ============================
# 新規ユーザー用: LayoutModification.xml
# ============================
# ※ 既存ユーザーには適用されません（Windows 11 の仕様）

# 固定したいアプリのリンクを検索
$links = @()
$searchPaths = @("$env:ProgramData\Microsoft\Windows\Start Menu\Programs", "$env:APPDATA\Microsoft\Windows\Start Menu\Programs")

$appPatterns = @(
  @{ Name = "Google Chrome"; Pattern = "Google Chrome.lnk" },
  @{ Name = "Outlook"; Pattern = "Outlook.lnk" },
  @{ Name = "Word"; Pattern = "Word.lnk" },
  @{ Name = "Excel"; Pattern = "Excel.lnk" },
  @{ Name = "Slack"; Pattern = "Slack.lnk" }
)

foreach ($app in $appPatterns) {
  $match = $null
  
  # 1. 直接指定されたパターンで検索
  $match = Get-ChildItem -Path $searchPaths -Recurse -Filter "$($app.Pattern)" -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -notlike "*Outlook (New)*" -and $_.Name -notlike "*Pre-release*" } |
  Select-Object -First 1
    
  # 2. Slack 特化の検索 (MSIX版やカスタムパス対応)
  if (-not $match -and $app.Name -eq "Slack") {
    $slackCommonPaths = @(
      "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
      "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
      "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Slack Technologies Inc",
      "$env:LOCALAPPDATA\slack"
    )
    $match = Get-ChildItem -Path $slackCommonPaths -Recurse -Filter "Slack.lnk" -ErrorAction SilentlyContinue | Select-Object -First 1
  }

  # 3. あいまい検索
  if (-not $match) {
    $match = Get-ChildItem -Path $searchPaths -Recurse -Filter "*$($app.Name)*.lnk" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notlike "*Outlook (New)*" -and $_.Name -notlike "*Pre-release*" } |
    Select-Object -First 1
  }

  if ($match) {
    $links += $match.FullName
    Write-Host "  Found: $($match.Name) ($($match.FullName))" -ForegroundColor Green
  }
  else {
    Write-Host "  Not Found: $($app.Name)" -ForegroundColor Yellow
  }
}

# XML作成・保存（新規ユーザー用のみ）
$xml = @"
<?xml version="1.0" encoding="utf-8"?>
<LayoutModificationTemplate xmlns="http://schemas.microsoft.com/Start/2014/LayoutModification" xmlns:defaultlayout="http://schemas.microsoft.com/Start/2014/FullDefaultLayout" xmlns:start="http://schemas.microsoft.com/Start/2014/StartLayout" xmlns:taskbar="http://schemas.microsoft.com/Start/2014/TaskbarLayout" Version="1">
  <CustomTaskbarLayoutCollection PinListPlacement="Replace">
    <defaultlayout:TaskbarLayout>
      <taskbar:TaskbarPinList>
        <taskbar:DesktopApp DesktopApplicationID="Microsoft.Windows.Explorer" />
"@

foreach ($link in $links) {
  if ($link -match "explorer") { continue }
  $mappedPath = $link -replace [regex]::Escape($env:ProgramData), "%ALLUSERSPROFILE%" -replace [regex]::Escape($env:APPDATA), "%APPDATA%"
  $xml += "`n        <taskbar:DesktopApp DesktopApplicationLinkPath=`"$mappedPath`" />"
}

$xml += @"

      </taskbar:TaskbarPinList>
    </defaultlayout:TaskbarLayout>
  </CustomTaskbarLayoutCollection>
</LayoutModificationTemplate>
"@

# Default プロファイルに保存（新規ユーザー作成時に適用される）
$defaultUserPath = "C:\Users\Default\AppData\Local\Microsoft\Windows\Shell\LayoutModification.xml"
try {
  $dir = Split-Path $defaultUserPath
  if (!(Test-Path $dir)) { New-Item -Path $dir -ItemType Directory -Force | Out-Null }
  [System.IO.File]::WriteAllText($defaultUserPath, $xml, [System.Text.Encoding]::UTF8)
  Write-Host "  -> 新規ユーザー用のピン留め設定を保存しました" -ForegroundColor Green
}
catch {
  Write-Host "  -> 新規ユーザー用の設定に失敗しました: $_" -ForegroundColor Gray
}

# ============================
# 既存ユーザー向け: 手動ピン留めの案内 & 設定画面起動
# ============================
Write-Host ""
Write-Host "================================" -ForegroundColor Yellow
Write-Host " 【手動ピン留めのお願い】" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Windows 11 の仕様により、現在のアカウントには"
Write-Host "自動でピン留めができません。以下のアプリを"
Write-Host "タスクバーにドラッグ＆ドロップまたは右クリックで"
Write-Host "ピン留めしてください:" 
Write-Host ""
Write-Host "  1. Chrome      (最優先)" -ForegroundColor Cyan
Write-Host "  2. Outlook     (クラシック版)" -ForegroundColor White
Write-Host "  3. Word" -ForegroundColor White
Write-Host "  4. Excel" -ForegroundColor White
Write-Host "  5. Slack" -ForegroundColor White
Write-Host ""
Write-Host "タスクバーの「個人用設定」画面を自動で開きます。" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow

# 設定画面を起動
Start-Process "ms-settings:taskbar"

$msg = "タスクバーへのピン留めが必要です。`n以下のアプリを手動で固定してください。`n`n・Chrome (最優先)`n・Outlook`n・Word`n・Excel`n・Slack"
[System.Windows.Forms.MessageBox]::Show($msg, "手動作業のお願い", "OK", "Information")

Write-Host "--------------------------------"
Read-Host "Enterキーを押して終了してください"
