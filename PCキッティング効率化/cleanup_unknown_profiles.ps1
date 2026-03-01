# cleanup_unknown_profiles.ps1
# 不明なアカウント（SID）のプロファイルを削除します。

Write-Host "ユーザープロファイルのクリーンアップを開始します..." -ForegroundColor Cyan

$profiles = Get-WmiObject -Class Win32_UserProfile | Where-Object { $_.Special -eq $false }

foreach ($profile in $profiles) {
    try {
        $user = ([WMI]"" -replace '""', $profile.__PATH).LocalPath
        $sid = $profile.SID
        
        # SIDから名前が解決できないもの＝不明なアカウント
        $objSID = New-Object System.Security.Principal.SecurityIdentifier($sid)
        $objUser = $objSID.Translate([System.Security.Principal.NTAccount])
        Write-Host "  健全なプロファイル: $objUser" -ForegroundColor Gray
    }
    catch {
        Write-Host "  不明なプロファイルを検出: $($profile.LocalPath)" -ForegroundColor Yellow
        Write-Host "  削除しています..." -ForegroundColor Yellow
        $profile.Delete()
        Write-Host "  -> 削除完了" -ForegroundColor Green
    }
}

Write-Host "--------------------------------"
Write-Host "処理が完了しました。"
Write-Host "--------------------------------"
Read-Host "Enterキーを押して終了してください"
