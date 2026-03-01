$d1 = "F:\setup\PC_Kitting"
$d2 = $PSScriptRoot
$dirs = @($d1, $d2)
$utf8 = New-Object System.Text.UTF8Encoding($true)
foreach ($d in $dirs) {
    if (Test-Path $d) {
        $files = Get-ChildItem -Path $d -Filter "*.ps1"
        foreach ($f in $files) {
            if ($f.Name -ne "fix.ps1") {
                $c = [System.IO.File]::ReadAllText($f.FullName)
                [System.IO.File]::WriteAllText($f.FullName, $c, $utf8)
            }
        }
    }
}
Write-Host "Encoding fix finished."
