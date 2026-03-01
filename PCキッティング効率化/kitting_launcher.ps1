# kitting_launcher.ps1
# PCキッティング作業を一括管理・実行するためのGUIランチャー
# 必要な機能にチェックを入れて「実行」を押してください。

# 管理者権限チェック
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "管理者権限で実行されていません。一部の処理が失敗する可能性があります。"
    Write-Warning "Run_Kitting.bat から実行するか、右クリック→「管理者として実行」を選択してください。"
    Start-Sleep -Seconds 3
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# フォームの作成
$form = New-Object System.Windows.Forms.Form
$form.Text = "PC Kitting Automation Launcher"
$form.Size = New-Object System.Drawing.Size(500, 580)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

# タイトルラベル
$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(10, 110)
$label.Size = New-Object System.Drawing.Size(460, 20)
$label.Text = "実行したいキッティング項目を選択してください:"
$form.Controls.Add($label)

# システム情報表示エリア
$infoGroup = New-Object System.Windows.Forms.GroupBox
$infoGroup.Text = "現在の実行環境情報"
$infoGroup.Location = New-Object System.Drawing.Point(10, 10)
$infoGroup.Size = New-Object System.Drawing.Size(460, 90)
$form.Controls.Add($infoGroup)

$infoText = New-Object System.Windows.Forms.TextBox
$infoText.Multiline = $true
$infoText.ReadOnly = $true
$infoText.Location = New-Object System.Drawing.Point(10, 20)
$infoText.Size = New-Object System.Drawing.Size(440, 60)
$infoText.BackColor = [System.Drawing.Color]::White

# 情報取得
try {
    $os = Get-ComputerInfo -Property "OsName", "OsVersion", "OsHardwareAbstractionLayer"
    $build = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").DisplayVersion
    $adminStatus = if ($currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { "管理者権限: OK" } else { "管理者権限: なし (制限あり)" }
    $wingetStatus = if (Get-Command winget -ErrorAction SilentlyContinue) { "Winget: 利用可能" } else { "Winget: 未インストール" }
    
    $infoText.Text = "OS: $($os.OsName)`r`nビルド: $($os.OsVersion) ($build)`r`n$adminStatus  /  $wingetStatus"
}
catch {
    $infoText.Text = "システム情報の取得に失敗しました。"
}
$infoGroup.Controls.Add($infoText)

# チェックボックスリスト (Key: ScriptFileName, Value: Description)
$checkList = New-Object System.Windows.Forms.CheckedListBox
$checkList.Location = New-Object System.Drawing.Point(10, 130)
$checkList.Size = New-Object System.Drawing.Size(460, 280)
$checkList.CheckOnClick = $true
$form.Controls.Add($checkList)

# スクリプト定義 (表示名, ファイル名)
$scripts = @(
    @{ Name = "1. Google Chrome インストール"; File = "install_apps_and_tweaks.ps1" },
    @{ Name = "2. 既定のブラウザ設定 (Chrome設定画面を開く)"; File = "set_chrome_default_helper.ps1" },
    @{ Name = "3. 不明なプロファイルの削除"; File = "cleanup_unknown_profiles.ps1" },
    @{ Name = "4. 不要アプリ削除 (Outlook(new), Xbox等)"; File = "remove_unwanted_apps.ps1" },
    @{ Name = "5. アプリ インストール (Slack/Zoom/Cube製品) & 右クリック修正"; File = "install_apps_and_tweaks.ps1" },
    @{ Name = "6. タスクバー設定 (検索/ウィジェットOFF)"; File = "customize_taskbar_settings.ps1" },
    @{ Name = "7. タスクバーのピン留め (設定画面を自動で開きます)"; File = "pin_taskbar_apps_advanced.ps1" },
    @{ Name = "8. Chrome起動時URLの設定"; File = "configure_chrome_startup.ps1" },
    @{ Name = "9. プリンタードライバーのインストール"; File = "install_printer_drivers.ps1" }
)

foreach ($item in $scripts) {
    $checkList.Items.Add($item.Name)
}

# 全選択ボタン
$btnAll = New-Object System.Windows.Forms.Button
$btnAll.Location = New-Object System.Drawing.Point(10, 420)
$btnAll.Text = "すべて選択"
$btnAll.Add_Click({
        for ($i = 0; $i -lt $checkList.Items.Count; $i++) {
            $checkList.SetItemChecked($i, $true)
        }
    })
$form.Controls.Add($btnAll)

# 実行ボタン
$btnRun = New-Object System.Windows.Forms.Button
$btnRun.Location = New-Object System.Drawing.Point(370, 420)
$btnRun.Text = "実行開始"
$btnRun.DialogResult = "OK" 
$btnRun.Add_Click({
        $selectedIndices = $checkList.CheckedIndices
        if ($selectedIndices.Count -eq 0) {
            [System.Windows.Forms.MessageBox]::Show("実行する項目が選択されていません。", "確認", "OK", "Warning")
            return
        }

        $confirmation = [System.Windows.Forms.MessageBox]::Show("選択された項目を順番に実行します。よろしいですか？", "実行確認", "YesNo", "Question")
        if ($confirmation -eq "Yes") {
            $form.Hide() 
        
            foreach ($index in $selectedIndices) {
                $scriptInfo = $scripts[$index]
                $scriptFile = $scriptInfo.File
                $scriptPath = Join-Path $PSScriptRoot $scriptFile

                Write-Host "------------------------------------------------" -ForegroundColor Cyan
                Write-Host "実行中: $($scriptInfo.Name)" -ForegroundColor Yellow
            
                if (Test-Path $scriptPath) {
                    # スクリプトを呼び出し（Waitで完了を待つ）
                    Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -File `"$scriptPath`"" -Wait -NoNewWindow
                }
                else {
                    Write-Host "エラー: ファイルが見つかりません ($scriptFile)" -ForegroundColor Red
                }
            }

            Write-Host "------------------------------------------------" -ForegroundColor Green
            Write-Host "すべての処理が完了しました。"
            [System.Windows.Forms.MessageBox]::Show("すべての処理が完了しました。", "完了", "OK", "Information")
            $form.Close()
        }
    })
$form.Controls.Add($btnRun)

# フォーム表示
$form.ShowDialog() | Out-Null
