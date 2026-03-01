$dest = "D:\setup\PC_Kitting"
if (Test-Path $dest) {
    Get-ChildItem -Path $dest -Filter "*.ps1" | ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName)
        [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Fixed encoding for: $($_.Name)"
    }
} else {
    Write-Warning "Destination $dest not found."
}
