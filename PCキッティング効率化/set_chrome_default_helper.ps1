# set_chrome_default_advanced.ps1
# DISMを使用してアプリケーションの関連付けをインポートし、Chromeを既定のブラウザに設定します。

Add-Type -AssemblyName System.Windows.Forms

# --- Chromeのインストールチェック ---
$chromeInstalled = $false
$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)
foreach ($p in $chromePaths) { if (Test-Path $p) { $chromeInstalled = $true; break } }

if (-not $chromeInstalled) {
    Write-Host "Google Chrome が見つかりません。インストールを試みます..." -ForegroundColor Yellow
    
    # セットアップフォルダの動的検索
    $setupRoot = $null
    foreach ($drive in (Get-PSDrive -PSProvider FileSystem)) {
        $testPath1 = Join-Path $drive.Root "setup\☆個人設定"
        if (Test-Path $testPath1) { $setupRoot = Join-Path $drive.Root "setup"; break }
        
        $testPath2 = Join-Path $drive.Root "setup"
        if (Test-Path $testPath2) { $setupRoot = $testPath2; break }
    }
    
    $chromeSetup = if ($setupRoot) { Join-Path $setupRoot "1_ChromeSetup.exe" } else { $null }
    
    if ($chromeSetup -and (Test-Path $chromeSetup)) {
        Write-Host "  -> USB内のインストーラーを実行します..." -ForegroundColor White
        Start-Process $chromeSetup -Wait
        $chromeInstalled = $true
    }
    elseif (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "  -> Winget を使用して Chrome をインストールします..." -ForegroundColor Cyan
        $process = Start-Process winget -ArgumentList "install --id Google.Chrome --silent --accept-package-agreements" -Wait -PassThru
        if ($process.ExitCode -eq 0) { $chromeInstalled = $true }
    }
}

if (-not $chromeInstalled) {
    [System.Windows.Forms.MessageBox]::Show("Google Chrome がインストールされていないため、既定の設定ができません。手動でインストールしてから再度実行してください。", "エラー", "OK", "Error")
    exit 1
}

# --- DISMによる関連付けインポート ---
$xmlPath = Join-Path $env:TEMP "AppAssociations.xml"

Write-Host "Chromeを既定のブラウザに設定しています (DISM Association Import)..." -ForegroundColor Cyan

$xmlContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<DefaultAssociations>
  <Association Identifier=".htm" ProgId="ChromeHTML" ApplicationName="Google Chrome" />
  <Association Identifier=".html" ProgId="ChromeHTML" ApplicationName="Google Chrome" />
  <Association Identifier="http" ProgId="ChromeHTML" ApplicationName="Google Chrome" />
  <Association Identifier="https" ProgId="ChromeHTML" ApplicationName="Google Chrome" />
  <Association Identifier=".pdf" ProgId="ChromeHTML" ApplicationName="Google Chrome" />
</DefaultAssociations>
"@

[System.IO.File]::WriteAllText($xmlPath, $xmlContent, [System.Text.Encoding]::UTF8)

try {
    $process = Start-Process dism.exe -ArgumentList "/Online /Import-DefaultAppAssociations:`"$xmlPath`"" -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -eq 0) {
        Write-Host "  -> 関連付けのインポートに成功しました" -ForegroundColor Green
    }
    else {
        Write-Warning "  -> DISMエラー (ExitCode: $($process.ExitCode))"
    }
}
catch {
    Write-Host "  -> 実行中にエラーが発生しました: $_" -ForegroundColor Red
}

# --- ユーザーへの案内と設定画面の起動 ---
Write-Host "既定のアプリ画面を開きます。" -ForegroundColor Yellow

$msg = "既定のブラウザを Chrome に変更します。`n`n開いた画面で「既定値に設定」ボタンをクリックしてください。"
[System.Windows.Forms.MessageBox]::Show($msg, "既定のブラウザ設定", "OK", "Information")

# Windows 11 の場合に Chrome の設定項目まで直接開く
Start-Process "ms-settings:defaultapps?registeredApp=Google%20Chrome"

Write-Host "--------------------------------"
Write-Host "設定が完了したら Enter キーを押してください。"
Read-Host
