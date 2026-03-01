# configure_chrome_startup.ps1
# 「ChromeLinks」フォルダ内のインターネットショートカット(.url)を読み込み、
# Chromeの起動時ページとしてレジストリポリシーを使用して自動設定します。

$scriptPath = $PSScriptRoot
$linksDir = Join-Path $scriptPath "ChromeLinks"

Write-Host "Chrome起動時URLの自動設定を開始します..." -ForegroundColor Cyan

if (!(Test-Path $linksDir)) {
    Write-Host "リンクフォルダがカレントディレクトリに見つかりません。USBドライブを検索中..." -ForegroundColor Gray
    # D, E, F ドライブのルート、または \setup\PC_Kitting 内を検索
    $checkPaths = @()
    foreach ($drive in "D", "E", "F") {
        $checkPaths += "$($drive):\"
        $checkPaths += "$($drive):\setup\PC_Kitting"
    }
    
    $usbLinks = Get-ChildItem -Path $checkPaths -Filter "ChromeLinks" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($usbLinks) {
        $linksDir = $usbLinks.FullName
        Write-Host "リンクフォルダが見つかりました: $linksDir" -ForegroundColor Cyan
    }
    else {
        Write-Host "エラー: リンクフォルダが見つかりません。 (ChromeLinks)" -ForegroundColor Red
        exit
    }
}

$urlFiles = Get-ChildItem -Path $linksDir -Filter "*.url"
$urls = @()

foreach ($file in $urlFiles) {
    $content = Get-Content $file.FullName
    foreach ($line in $content) {
        if ($line -match "^URL=(.+)$") {
            $foundUrl = $matches[1].Trim()
            $urls += $foundUrl
            Write-Host "読み込み中: $($file.Name) -> $foundUrl"
        }
    }
}

if ($urls.Count -eq 0) {
    Write-Host "有効なURLショートカットが見つかりませんでした。" -ForegroundColor Yellow
    exit
}

# レジストリポリシーの完全削除 (設定のロックを解除)
$chromePolicyPath = "HKLM:\SOFTWARE\Policies\Google\Chrome"
if (Test-Path $chromePolicyPath) {
    Write-Host "Chrome の強制ポリシーを削除して設定のロックを解除しています..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $chromePolicyPath -Recurse -Force -ErrorAction Stop
        Write-Host "  -> ポリシーの削除に成功しました" -ForegroundColor Green
    }
    catch {
        Write-Warning "  -> ポリシーの削除に失敗しました（権限不足の可能性があります）: $($_.Exception.Message)"
    }
}

Write-Host "--------------------------------"
Write-Host "指定されたURLを Chrome で開きます..." -ForegroundColor Cyan

# Chrome のパスを取得
$chromeExe = "chrome.exe"
$commonPaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)
foreach ($path in $commonPaths) {
    if (Test-Path $path) { $chromeExe = $path; break }
}

# URL を順番に開く
foreach ($url in $urls) {
    Write-Host "  -> 開いています: $url" -ForegroundColor Gray
    Start-Process $chromeExe -ArgumentList "`"$url`"" -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

Write-Host "--------------------------------"
Write-Host "設定のロック解除と URL の開き込みが完了しました。" -ForegroundColor Green
Write-Host "これ以降、起動時の設定は Chrome の「設定」から自由に変更可能です。"
Write-Host "--------------------------------"
Read-Host "Enterキーを押して終了してください"
