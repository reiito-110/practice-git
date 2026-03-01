# install_apps_and_tweaks.ps1
# Chrome, Slack, Zoom のインストール（GUI起動方式）と右クリックメニューの修正

# セットアップフォルダの動的検索 (D, E, F など)
$setupRootDir = $null
foreach ($drive in (Get-PSDrive -PSProvider FileSystem)) {
    $testPath = Join-Path $drive.Root "setup\☆個人設定"
    if (Test-Path $testPath) {
        $setupRootDir = $testPath
        break
    }
}

if ($setupRootDir) {
    Write-Host "セットアップフォルダを検出: $setupRootDir" -ForegroundColor Cyan
}
else {
    Write-Host "セットアップフォルダが見つかりません。手動インストールが必要です。" -ForegroundColor Yellow
}

# セットアップルート（☆個人設定の親）
$setupRoot = if ($setupRootDir) { Split-Path $setupRootDir -Parent } else { $null }

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host " アプリケーションのインストール"
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# ============================
# 1. Google Chrome
# ============================
Write-Host "[1/3] Google Chrome" -ForegroundColor Yellow

$chromeInstalled = $false
$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)
foreach ($p in $chromePaths) { if (Test-Path $p) { $chromeInstalled = $true; break } }

if ($chromeInstalled) {
    Write-Host "  -> 既にインストール済み。スキップします。" -ForegroundColor Green
}
else {
    $chromeSetup = if ($setupRoot) { Join-Path $setupRoot "1_ChromeSetup.exe" } else { $null }
    if ($chromeSetup -and (Test-Path $chromeSetup)) {
        Write-Host "  -> Chrome インストーラーを起動します。画面の指示に従ってください。" -ForegroundColor White
        $localCopy = Join-Path $env:TEMP "1_ChromeSetup.exe"
        Copy-Item $chromeSetup $localCopy -Force
        Start-Process $localCopy -Wait
        Write-Host "  -> Chrome インストーラーの処理が完了しました。" -ForegroundColor Green
    }
    else {
        Write-Host "  -> インストーラーが見つかりません。手動でインストールしてください。" -ForegroundColor Red
    }
}

# ============================
# 2. Slack
# ============================
Write-Host ""
Write-Host "[2/4] Slack" -ForegroundColor Yellow

# 既存のSlackプロセスを終了させる（インストールの邪魔になる場合があるため）
Get-Process -Name Slack -ErrorAction SilentlyContinue | Stop-Process -Force

$slackInstalled = (Get-AppxPackage -Name "*Slack*" -ErrorAction SilentlyContinue) -or
(Test-Path "$env:LOCALAPPDATA\slack\slack.exe") -or
(Test-Path "$env:ProgramFiles\Slack\slack.exe")

if ($slackInstalled) {
    Write-Host "  -> 既にインストール済み。スキップします。" -ForegroundColor Green
}
else {
    $slackExe = if ($setupRootDir) { Join-Path $setupRootDir "SlackSetup.exe" } else { $null }
    $slackMsix = if ($setupRootDir) { Join-Path $setupRootDir "Slack.msix" } else { $null }

    $installed = $false

    # ローカルの作業用フォルダを作成（日本語パス回避のため C:\ 直下に作成）
    $localTempBase = "C:\kitting_temp"
    if (!(Test-Path $localTempBase)) { New-Item -Path $localTempBase -ItemType Directory -Force | Out-Null }

    # 1. Winget を最優先 (インターネット接続があれば最新版が入る)
    if ((Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Host "  -> Winget を使用して最新の Slack をインストールします..." -ForegroundColor Cyan
        $process = Start-Process winget -ArgumentList "install --id SlackTechnologies.Slack --silent --accept-package-agreements --accept-source-agreements" -Wait -PassThru
        if ($process.ExitCode -eq 0) { $installed = $true }
    }

    # 2. 直接ダウンロードしてインストール (次点)
    if (-not $installed) {
        Write-Host "  -> 公式サイトから Slack の最新インストーラーをダウンロード中..." -ForegroundColor Yellow
        $slackDownloadUrl = "https://downloads.slack-edge.com/releases_x64/SlackSetup.exe"
        $tempPath = Join-Path $env:TEMP "SlackSetup_Downloaded.exe"
        try {
            Invoke-WebRequest -Uri $slackDownloadUrl -OutFile $tempPath -ErrorAction Stop
            Write-Host "  -> ダウンロード完了。インストーラーを起動します..." -ForegroundColor White
            Start-Process $tempPath -Wait
            $installed = (Test-Path "$env:LOCALAPPDATA\slack\slack.exe") -or (Test-Path "$env:ProgramFiles\Slack\slack.exe")
        }
        catch {
            Write-Host "  -> ダウンロード失敗: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    # 3. USB内のインストーラーを試す (最終手段)
    if (-not $installed) {
        if ($slackExe -and (Test-Path $slackExe)) {
            Write-Host "  -> USB内の SlackSetup.exe を起動します。画面の指示に従ってください。" -ForegroundColor White
            $localPath = Join-Path $localTempBase "SlackSetup.exe"
            Copy-Item $slackExe $localPath -Force
            Unblock-File $localPath -ErrorAction SilentlyContinue
            Start-Process "$localPath" -Wait
            $installed = (Test-Path "$env:LOCALAPPDATA\slack\slack.exe") -or (Test-Path "$env:ProgramFiles\Slack\slack.exe")
        }
        elseif ($slackMsix -and (Test-Path $slackMsix)) {
            Write-Host "  -> USB内の Slack.msix をインストール中..." -ForegroundColor Gray
            $localMsix = Join-Path $localTempBase "Slack.msix"
            Copy-Item $slackMsix $localMsix -Force
            Unblock-File $localMsix -ErrorAction SilentlyContinue
            try {
                Add-AppxPackage -Path "$localMsix" -ErrorAction Stop
                $installed = $true
            }
            catch {
                Write-Host "  -> MSIX インストール失敗: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }

    if ($installed) {
        Write-Host "  -> Slack のインストール処理が完了しました。" -ForegroundColor Green
    }
    else {
        Write-Host "  -> Slack のインストールに失敗しました。手動でインストールしてください。" -ForegroundColor Red
    }
}

# ============================
# 3. Zoom
# ============================
Write-Host ""
Write-Host "[3/6] Zoom" -ForegroundColor Yellow

$zoomInstalled = (Test-Path "$env:ProgramFiles\Zoom\bin\Zoom.exe") -or
(Test-Path "${env:ProgramFiles(x86)}\Zoom\bin\Zoom.exe") -or
(Test-Path "$env:APPDATA\Zoom\bin\Zoom.exe")

if ($zoomInstalled) {
    Write-Host "  -> 既にインストール済み。スキップします。" -ForegroundColor Green
}
else {
    $zoomExe = if ($setupRootDir) { Join-Path $setupRootDir "ZoomInstallerFull.exe" } else { $null }
    if ($zoomExe -and (Test-Path $zoomExe)) {
        Write-Host "  -> Zoom を実行中... 完了までお待ちください。" -ForegroundColor White
        $localPath = Join-Path $localTempBase "ZoomInstallerFull.exe"
        Copy-Item $zoomExe $localPath -Force
        Unblock-File $localPath -ErrorAction SilentlyContinue
        
        # サイレントインストール実行 (安定性のため Wait を徹底)
        $p = Start-Process "$localPath" -ArgumentList "/silent" -Wait -PassThru
        
        # インストール完了を待機
        Start-Sleep -Seconds 5

        # 再度インストール済みか確認
        $zoomInstalled = (Test-Path "$env:ProgramFiles\Zoom\bin\Zoom.exe") -or
        (Test-Path "${env:ProgramFiles(x86)}\Zoom\bin\Zoom.exe") -or
        (Test-Path "$env:APPDATA\Zoom\bin\Zoom.exe")
        
        if ($zoomInstalled) {
            Write-Host "  -> Zoom のインストールが完了しました。" -ForegroundColor Green
        }
        else {
            Write-Host "  -> Zoom の自動インストールが不安定です。インストーラーを手動で起動します。" -ForegroundColor Red
            Start-Process "$localPath" -Wait
        }
    }
    else {
        Write-Host "  -> Zoom のインストーラーが見つかりません ($zoomExe)。スキップします。" -ForegroundColor Red
    }
}

# ============================
# 4. CubeIce (New!)
# ============================
Write-Host ""
Write-Host "[4/6] CubeIce" -ForegroundColor Yellow

if (Test-Path "${env:ProgramFiles}\CubeIce\cubeice.exe") {
    Write-Host "  -> 既にインストール済み。スキップします。" -ForegroundColor Green
}
else {
    $cubeDir = if ($setupRoot) { Join-Path $setupRoot "cube" } else { $null }
    if ($cubeDir -and (Test-Path $cubeDir)) {
        $cubeIceSetup = Get-ChildItem -Path $cubeDir -Filter "cubeice-*-x64.exe" | Select-Object -First 1
        if ($cubeIceSetup) {
            Write-Host "  -> $($cubeIceSetup.Name) を展開して実行します..." -ForegroundColor White
            $localPath = Join-Path $localTempBase $cubeIceSetup.Name
            Copy-Item $cubeIceSetup.FullName $localPath -Force
            Unblock-File $localPath -ErrorAction SilentlyContinue
            # サイレントインストール実行 (/SP- は初期ダイアログ抑制)
            Write-Host "  -> インストール実行中..." -ForegroundColor Gray
            $p = Start-Process "$localPath" -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-" -Wait -PassThru
            if ($p.ExitCode -eq 0) { Write-Host "  -> CubeIce のインストールが完了しました。" -ForegroundColor Green }
            else { Write-Host "  -> CubeIce のインストールに失敗した可能性があります (Code: $($p.ExitCode))" -ForegroundColor Red }
        }
        else { Write-Host "  -> CubeIce のインストーラーが cube フォルダに見つかりません。" -ForegroundColor Red }
    }
    else { Write-Host "  -> Cube フォルダ ($cubeDir) が見つかりません。" -ForegroundColor Red }
}

# ============================
# 5. CubePDF Utility (New!)
# ============================
Write-Host ""
Write-Host "[5/6] CubePDF Utility" -ForegroundColor Yellow

if (Test-Path "${env:ProgramFiles}\CubePDF Utility\cubepdf-utility.exe") {
    Write-Host "  -> 既にインストール済み。スキップします。" -ForegroundColor Green
}
else {
    $cubeDir = if ($setupRoot) { Join-Path $setupRoot "cube" } else { $null }
    if ($cubeDir -and (Test-Path $cubeDir)) {
        $cubePdfUtilSetup = Get-ChildItem -Path $cubeDir -Filter "cubepdf-utility-*-x64.exe" | Select-Object -First 1
        if ($cubePdfUtilSetup) {
            Write-Host "  -> $($cubePdfUtilSetup.Name) を展開して実行します..." -ForegroundColor White
            $localPath = Join-Path $localTempBase $cubePdfUtilSetup.Name
            Copy-Item $cubePdfUtilSetup.FullName $localPath -Force
            Unblock-File $localPath -ErrorAction SilentlyContinue
            # サイレントインストール実行
            Write-Host "  -> インストール実行中..." -ForegroundColor Gray
            $p = Start-Process "$localPath" -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-" -Wait -PassThru
            if ($p.ExitCode -eq 0) { Write-Host "  -> CubePDF Utility のインストールが完了しました。" -ForegroundColor Green }
            else { Write-Host "  -> CubePDF Utility のインストールに失敗した可能性があります (Code: $($p.ExitCode))" -ForegroundColor Red }
        }
        else { Write-Host "  -> CubePDF Utility のインストーラーが cube フォルダに見つかりません。" -ForegroundColor Red }
    }
    else { Write-Host "  -> Cube フォルダ ($cubeDir) が見つかりません。" -ForegroundColor Red }
}

# ============================
# 6. ESET
# ============================
Write-Host ""
Write-Host "[6/6] ESET Endpoint Security" -ForegroundColor Yellow

# インストール済みチェック
$esetInstalled = (Test-Path "C:\Program Files\ESET\ESET Security\ecmd.exe") -or 
(Test-Path "C:\Program Files\ESET\ESET Security\egui.exe")

if ($esetInstalled) {
    Write-Host "  -> 既にインストール済み。スキップします。" -ForegroundColor Green
}
else {
    # セットアップドライブの ESET フォルダを探す
    $esetPath = $null
    if ($setupRoot) {
        $esetPath = Join-Path $setupRoot "ESET\epi_win_live_installer.exe"
    }

    if ($esetPath -and (Test-Path $esetPath)) {
        Write-Host "  -> ESET インストーラーを管理者権限で起動します。" -ForegroundColor White
        Write-Host "  -> UACダイアログが表示されたら「はい」を選択してください。" -ForegroundColor Cyan
        
        # 管理者として実行
        try {
            Start-Process "$esetPath" -Verb RunAs -Wait
            Write-Host "  -> ESET インストーラーの起動が完了しました。" -ForegroundColor Green
        }
        catch {
            Write-Host "  -> ESET の起動に失敗しました（権限不足など）: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    else {
        Write-Host "  -> ESET インストーラーが見つかりません ($esetPath)。スキップします。" -ForegroundColor Red
    }
}

# ============================
# 右クリックメニューの修正
# ============================
Write-Host ""
Write-Host "Windows 11 右クリックメニュー（旧仕様）の適用中..." -ForegroundColor Cyan

# レジストリ設定の強化
function Set-ClassicContextMenu {
    $clsid = "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}"
    $inproc = "$clsid\InprocServer32"
    
    try {
        if (!(Test-Path $clsid)) { New-Item $clsid -Force | Out-Null }
        if (!(Test-Path $inproc)) { New-Item $inproc -Force | Out-Null }
        
        # 既定の値を空（データなし）に設定することでクラシックメニューが有効になる
        Set-ItemProperty -Path $inproc -Name "(Default)" -Value "" -Force | Out-Null
        # コマンドプロンプト経由でも重ねて実行
        $cmdArgs = "/c reg add `"HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32`" /f /ve"
        Start-Process cmd.exe -ArgumentList $cmdArgs -Wait -NoNewWindow
        
        Write-Host "  -> 右クリックメニューを Windows 10 仕様に設定しました" -ForegroundColor Green
    }
    catch {
        Write-Host "  -> 右クリックメニューの設定に失敗しました: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Set-ClassicContextMenu

Write-Host "設定反映のため、エクスプローラーを再起動します..." -ForegroundColor Yellow
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Process explorer.exe

# 念のためもう一度再起動（反映されないケースへの対応）
Write-Host "念のため、もう一度エクスプローラーを再起動します..." -ForegroundColor Gray
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Process explorer.exe

Write-Host "--------------------------------"
Write-Host "処理完了。Enterキーを押して終了してください。"
Read-Host
