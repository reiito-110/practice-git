# fix_all_encodings.ps1
# 全ての .ps1 ファイルを UTF-8 with BOM に変換して文字化けを解消します。

$targetDirs = @(
    "F:\setup\PC_Kitting",
    "C:\Users\24030460\Desktop\antigravity\PCキッティング効率化"
)

# UTF-8 with BOM のエンコーディングオブジェクト
$utf8BOM = New-Object System.Text.UTF8Encoding($true)

foreach ($dir in $targetDirs) {
    if (Test-Path $dir) {
        Write-Host "ディレクトリ内のファイルを処理中: $dir" -ForegroundColor Cyan
        Get-ChildItem -Path $dir -Filter "*.ps1" | ForEach-Object {
            try {
                $content = [System.IO.File]::ReadAllText($_.FullName)
                [System.IO.File]::WriteAllText($_.FullName, $content, $utf8BOM)
                Write-Host "  成功: $($_.Name)" -ForegroundColor Green
            }
            catch {
                Write-Host "  失敗: $($_.Name) - $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    else {
        Write-Host "ディレクトリが見つかりません: $dir" -ForegroundColor Yellow
    }
}

Write-Host "エンコーディングの修正が完了しました。" -ForegroundColor Cyan
