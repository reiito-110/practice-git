# setup_outlook_zero_config.ps1
# Outlookの初回起動ウィザードをスキップし、
# ログイン中のアカウント（Entra ID / Azure AD）で自動構成します。

Write-Host "Outlook ゼロ・クリック設定を適用しています..." -ForegroundColor Cyan

# 設定パスの定義
$path = "HKCU:\Software\Microsoft\Office\16.0\Outlook\Setup"

# フォルダが存在しない場合は作成
if (-not (Test-Path $path)) {
    New-Item -Path $path -Force | Out-Null
    Write-Host "設定パスを新規作成しました。"
}

# 自動構成フラグ (ZeroConfigExchange) を 1 (ON) に設定
try {
    New-ItemProperty -Path $path -Name "ZeroConfigExchange" -Value 1 -PropertyType DWord -Force | Out-Null
    Write-Host "レジストリ設定を書き込みました: ZeroConfigExchange = 1" -ForegroundColor Green
}
catch {
    Write-Host "エラー: レジストリの書き込みに失敗しました。" -ForegroundColor Red
    exit
}

Write-Host "--------------------------------"
Write-Host "設定が完了しました。"
Write-Host "※PCがAzure ADに参加していない場合、この設定は無視される可能性があります。"
Write-Host "--------------------------------"
