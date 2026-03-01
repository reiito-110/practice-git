# customize_taskbar_settings.ps1
# タスクバーのシステムアイコン（検索、タスクビュー、ウィジェット、チャット）の設定を変更します。

Add-Type -AssemblyName System.Windows.Forms

Write-Host "タスクバーの設定を変更しています..." -ForegroundColor Cyan

# パスの定義
$searchPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search"
$explorerAdv = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"

# レジストリ設定用ヘルパー
function Set-TaskbarSetting {
    param($Path, $Name, $Value)
    try {
        if (!(Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
        Set-ItemProperty -Path $Path -Name $Name -Value $Value -Type DWord -Force -ErrorAction Stop | Out-Null
        Write-Host "  [OK] $Name -> $Value" -ForegroundColor Gray
    }
    catch {
        Write-Host "  [!] $Name の適用に失敗: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 検索アイコン (1:アイコンのみ)
Set-TaskbarSetting -Path $searchPath -Name "SearchboxTaskbarMode" -Value 1
Set-TaskbarSetting -Path $explorerAdv -Name "SearchboxTaskbarMode" -Value 1

# タスクビュー (0:非表示)
Set-TaskbarSetting -Path $explorerAdv -Name "ShowTaskViewButton" -Value 0

# ウィジェット (0:非表示)
Set-TaskbarSetting -Path $explorerAdv -Name "TaskbarDa" -Value 0
# 新しいWindows 11ビルド向けの追加キー
Set-TaskbarSetting -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "TaskbarAl" -Value 0 # 左揃えに固定 (任意だが要望に近い)

# チャット / Microsoft Teams (0:非表示)
Set-TaskbarSetting -Path $explorerAdv -Name "TaskbarMn" -Value 0
Set-TaskbarSetting -Path $explorerAdv -Name "TaskbarChat" -Value 0

# システムトレイのメニュー (0:非表示)
Set-TaskbarSetting -Path $explorerAdv -Name "TaskbarSd" -Value 0 # ペンメニュー

Write-Host ""
Write-Host "  -> 設定をレジストリに書き込みました。" -ForegroundColor Green
Write-Host "  -> 検索: アイコンのみ / タスクビュー: 非表示 / ウィジェット: 非表示 / チャット: 非表示" -ForegroundColor White

# 設定反映のためエクスプローラー再起動
Write-Host "設定を反映するためエクスプローラーを再起動します..." -ForegroundColor Yellow
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# エクスプローラーの起動
Write-Host "エクスプローラーを起動しています..." -ForegroundColor Gray
Start-Process explorer.exe
Start-Sleep -Seconds 3

# --- ユーザーへの案内と設定画面の起動 ---
Write-Host "タスクバーの設定画面を開きます。" -ForegroundColor Yellow

$msg = "タスクバーの個人設定を確認してください。`n`n反映されていない場合は、以下の項目を確認・変更してください：`n・検索: 「検索アイコンのみ」`n・タスクビュー: 「オフ」`n・ウィジェット: 「オフ」`n・チャット: 「オフ」"

# 非同期でメッセージボックスを出して設定画面をブロックしないようにする
$code = {
    param($msg)
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($msg, "タスクバーの設定", "OK", "Information")
}
Start-Job -ScriptBlock $code -ArgumentList $msg | Out-Null

# 設定画面を確実に開く（explorer.exe 経由で開くのが確実な場合がある）
try {
    Start-Process "ms-settings:taskbar" -ErrorAction Stop
}
catch {
    Write-Host "  [!] 設定画面を直接開けませんでした。手動で「設定」>「個人用設定」>「タスクバー」を開いてください。" -ForegroundColor Red
    explorer.exe shell::: { 05d7476b-5124-4179-b1d4-ea4612badf99 } # 代替手段
}

Write-Host "--------------------------------"
Write-Host "タスクバーの設定変更を完了しました。" -ForegroundColor Green
Write-Host "※即座に反映されない場合は一度「サインアウト」をしてください。"
Write-Host "--------------------------------"
Write-Host "設定が完了したら Enterキーを押してください"
Read-Host
