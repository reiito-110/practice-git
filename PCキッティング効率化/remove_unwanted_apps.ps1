# remove_unwanted_apps.ps1
# 指定された不要なアプリを削除するスクリプト (強化版)

# 削除対象のアプリリスト
$appsToRemove = @(
    "Microsoft.OutlookForWindows",      # Outlook (New)
    "Microsoft.MicrosoftSolitaireCollection", # Solitaire & Casual Games
    "Microsoft.GamingApp",              # Xbox App
    "Microsoft.XboxApp",
    "Microsoft.Xbox.TCUI",
    "Microsoft.XboxGamingOverlay",
    "Microsoft.XboxIdentityProvider",
    "Microsoft.XboxSpeechToTextOverlay",
    "MicrosoftCorporationII.QuickAssist", # Quick Assist
    "Microsoft.SkypeApp",               # Skype
    "*GameAssist*",   
    "*Xbox*",
    "*Skype*",
    "Microsoft.GamingServices"
)

Write-Host "アプリの削除を開始します (プロビジョニング済みパッケージを含む)..." -ForegroundColor Cyan

# 1. 現在および全ユーザーからの削除
foreach ($pattern in $appsToRemove) {
    # 全ユーザー対象で取得
    $packages = Get-AppxPackage -Name $pattern -AllUsers -ErrorAction SilentlyContinue
    if ($packages) {
        foreach ($pkg in $packages) {
            if ($pkg.Name -like "*XboxGameCallableUI*") { continue }
            Write-Host "削除中 ($($pkg.Name))..." -ForegroundColor Yellow
            try {
                # -AllUsers を指定して削除
                Remove-AppxPackage -Package $pkg.PackageFullName -AllUsers -ErrorAction Stop
                Write-Host "  -> 成功" -ForegroundColor Green
            }
            catch {
                Write-Host "  -> 失敗 (一部のシステムコンポーネントはDISK抹消で対応): $_" -ForegroundColor Gray
            }
        }
    }
}

# 2. システム全体（プロビジョニング済み）からの削除
# これを行わないと、新規ユーザー作成時にアプリが復活します
Write-Host "システム全体 (Provisioned Packages) からの削除を試行します..." -ForegroundColor Cyan
foreach ($pattern in $appsToRemove) {
    # ワイルドカードを正規表現形式に変換して検索
    $regex = $pattern.Replace(".", "\.").Replace("*", ".*")
    $provPackages = Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -match "^$regex" }
    
    if ($provPackages) {
        foreach ($pkg in $provPackages) {
            Write-Host "システム全体から削除中: $($pkg.DisplayName)" -ForegroundColor Yellow
            try {
                Remove-AppxProvisionedPackage -Online -PackageName $pkg.PackageName -ErrorAction Stop | Out-Null
                Write-Host "  -> 抹消成功" -ForegroundColor Green
            }
            catch {
                Write-Host "  -> 抹消失敗: $_" -ForegroundColor Red
            }
        }
    }
}

# 3. ショートカットのクリーンアップ
Write-Host "ショートカットを削除しています..." -ForegroundColor Cyan
$shortcutNames = @("*Game Assist*", "*ゲームアシスト*", "*Skype*")
$shortcutPaths = @(
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
    "$env:PUBLIC\Desktop"
)

foreach ($path in $shortcutPaths) {
    if (Test-Path $path) {
        foreach ($name in $shortcutNames) {
            Get-ChildItem -Path $path -Recurse -Filter "$name.lnk" -ErrorAction SilentlyContinue | Remove-Item -Force
        }
    }
}

Write-Host "--------------------------------"
Write-Host "削除処理が完了しました。"
Write-Host "--------------------------------"
Read-Host "Enterキーを押して終了してください"
