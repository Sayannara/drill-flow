$utf8NoBom = New-Object System.Text.UTF8Encoding $False

# Trouver tous les fichiers append_partX.ps1, add_a2_batchX.ps1 et add_b1_batchX.ps1 et les trier
$files = Get-ChildItem -Path $PSScriptRoot -Filter "*.ps1" | Where-Object { $_.Name -match "^append_part\d+\.ps1$" -or $_.Name -match "^add_a2_batch\d+\.ps1$" -or $_.Name -match "^add_b1_batch\d+\.ps1$" } | Sort-Object Name
$allWords = @()

foreach ($file in $files) {
    $path = $file.FullName
    if (Test-Path $path) {
        $content = [System.IO.File]::ReadAllText($path, $utf8NoBom)
        
        # We look for lines starting with '    ("' or '    ("...' inside the script
        $lines = $content -split "`n"
        foreach ($line in $lines) {
            $trim = $line.Trim()
            if ($trim -match '^\(".*"\)[,]?$') {
                $trim = $trim.TrimEnd(',')
                $inner = $trim.Substring(1, $trim.Length - 2)
                $items = $inner -split '",\s*"'
                if ($items.Length -eq 6) {
                    $fr = $items[0].TrimStart('"')
                    $en = $items[1]
                    $de = $items[2]
                    $es = $items[3]
                    $type = $items[4]
                    $level = $items[5].TrimEnd('"')
                    
                    $allWords += [PSCustomObject]@{
                        fr = $fr
                        en = $en
                        de = $de
                        es = $es
                        type = $type
                        level = $level
                    }
                }
            }
        }
    }
}

$id = 1
$jsonLines = @()
foreach ($w in $allWords) {
    $jsonLines += "{`n    `"id`": `"word_$id`",`n    `"fr`": `"$($w.fr)`",`n    `"en`": `"$($w.en)`",`n    `"de`": `"$($w.de)`",`n    `"es`": `"$($w.es)`",`n    `"type`": `"$($w.type)`",`n    `"level`": `"$($w.level)`"`n  }"
    $id++
}

$jsContent = "export const vocabulary = [`n  " + ($jsonLines -join ",`n  ") + "`n];"
[System.IO.File]::WriteAllText("$PSScriptRoot\js\data\vocabulary.js", $jsContent, $utf8NoBom)
Write-Host "Re-generated vocabulary.js in pure UTF-8 with $($id - 1) words."
