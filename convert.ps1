$utf8NoBom = New-Object System.Text.UTF8Encoding $False
$content = [System.IO.File]::ReadAllText("$PSScriptRoot\generate_data.py", $utf8NoBom)

if ($content -match 'vocab_list = \[(?s)(.*?)\]') {
    $lines = $matches[1].Split("`n")
    $vocabList = @()
    $id = 1
    foreach ($line in $lines) {
        $trim = $line.Trim()
        if ($trim.StartsWith("(") -and ($trim.EndsWith("),") -or $trim.EndsWith(")"))) {
            if ($trim.EndsWith(",")) {
                $inner = $trim.Substring(1, $trim.Length - 3)
            } else {
                $inner = $trim.Substring(1, $trim.Length - 2)
            }
            # split by comma, handling potential spaces
            $parts = $inner -split '",\s*"'
            if ($parts.Length -eq 6) {
                $fr = $parts[0].TrimStart('("').TrimStart('"')
                $en = $parts[1]
                $de = $parts[2]
                $es = $parts[3]
                $type = $parts[4]
                $level = $parts[5].TrimEnd(')"').TrimEnd('"')
                
                $vocabList += "{`n    `"id`": `"word_$id`",`n    `"fr`": `"$fr`",`n    `"en`": `"$en`",`n    `"de`": `"$de`",`n    `"es`": `"$es`",`n    `"type`": `"$type`",`n    `"level`": `"$level`"`n  }"
                $id++
            }
        }
    }
    
    $jsContent = "export const vocabulary = [`n  " + ($vocabList -join ",`n  ") + "`n];"
    [System.IO.File]::WriteAllText("$PSScriptRoot\js\data\vocabulary.js", $jsContent, $utf8NoBom)
    Write-Host "Base de données générée avec $($id - 1) mots."
} else {
    Write-Host "Failed to parse generate_data.py"
}
