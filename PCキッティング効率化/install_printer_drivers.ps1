# install_printer_drivers.ps1
# USBドライブ内の setup\driver フォルダからプリンタードライバーを一括インストールします。

# ドライブの動的検索
$driverDir = $null
foreach ($drive in (Get-PSDrive -PSProvider FileSystem)) {
    $testPath = Join-Path $drive.Root "setup\driver"
    if (Test-Path $testPath) {
        $driverDir = $testPath
        break
    }
}

if (!$driverDir) {
    Write-Host "エラー: プリンタードライバーのフォルダが見つかりません (setup\driver)" -ForegroundColor Red
    Read-Host "Enterキーを押して終了してください"
    exit
}

Write-Host "プリンタードライバーのインストールを開始します..." -ForegroundColor Cyan
Write-Host "ドライバーフォルダ: $driverDir" -ForegroundColor Gray

# 1. ルート直下の .exe ファイルを検索して実行
$exeFiles = Get-ChildItem -Path $driverDir -Filter "*.exe" -File
foreach ($file in $exeFiles) {
    Write-Host ""
    Write-Host "  -> ドライバーを起動中: $($file.Name)" -ForegroundColor Yellow
    Write-Host "     画面の指示に従ってインストールしてください。" -ForegroundColor White
    try {
        Start-Process $file.FullName -Wait
        Write-Host "  -> $($file.Name) の処理が完了しました" -ForegroundColor Green
    }
    catch {
        Write-Warning "  -> $($file.Name) の実行中にエラーが発生しました"
    }
}

# 2. サブフォルダ内の Setup.exe を検索して実行
$subSetups = Get-ChildItem -Path $driverDir -Recurse -Filter "Setup.exe" -File
foreach ($setup in $subSetups) {
    Write-Host ""
    Write-Host "  -> セットアップを起動中: $($setup.Directory.Name)\$($setup.Name)" -ForegroundColor Yellow
    Write-Host "     画面の指示に従ってインストールしてください。" -ForegroundColor White
    try {
        Start-Process $setup.FullName -Wait
        Write-Host "  -> $($setup.Directory.Name) の処理が完了しました" -ForegroundColor Green
    }
    catch {
        Write-Warning "  -> $($setup.FullName) の実行中にエラーが発生しました"
    }
}

Write-Host ""
Write-Host "--------------------------------"
Write-Host "プリンタードライバーの一括実行が完了しました。" -ForegroundColor Green
Write-Host "※IPアドレス等の設定が必要な場合はプリンター設定画面で行ってください。"
Write-Host "--------------------------------"
Read-Host "Enterキーを押して終了してください"
