$d1 = "F:\setup\PC_Kitting"
$d2 = "C:\Users\24030460\Desktop\antigravity\PC" + [char]0x30AD + [char]0x30C3 + [char]0x30C6 + [char]0x30A3 + [char]0x30F3 + [char]0x30B0 + [char]0x52B9 + [char]0x7387 + [char]0x5316
$dirs = @($d1, $d2)
$utf8 = New-Object System.Text.UTF8Encoding($true)
foreach ($d in $dirs) {
    if (Test-Path $d) {
        $files = Get-ChildItem -Path $d -Filter "*.ps1"
        foreach ($f in $files) {
            $c = [System.IO.File]::ReadAllText($f.FullName)
            [System.IO.File]::WriteAllText($f.FullName, $c, $utf8)
        }
    }
}
Write-Host "Encoding fix finished."
