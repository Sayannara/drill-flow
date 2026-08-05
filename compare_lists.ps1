$utf8NoBom = New-Object System.Text.UTF8Encoding $False
$eslContent = [System.IO.File]::ReadAllText("C:\Users\YGREDER\.gemini\antigravity\brain\c0eb0498-bd07-4b0e-b5de-3ca9028c000b\.system_generated\steps\365\content.md", $utf8NoBom)
$myData = [System.IO.File]::ReadAllText("c:\Users\YGREDER\OneDrive\projetsAntiGravity\Voc\generate_data.py", $utf8NoBom)

# 1. Parse ESL list
$eslWords = @()
$matches = [regex]::Matches($eslContent, '(?s)<td class="[^"]+">(.*?)</td>')
$text = ($matches | ForEach-Object { $_.Groups[1].Value }) -join "`n"
$lines = $text -split '<br>'
foreach ($line in $lines) {
    if ($line -match '^([^()]+)\s+\(') {
        $word = $matches[1].Trim().ToLower()
        $word = $word -replace '^to\s+', ''
        if ($word -match '/') {
            # split things like "a / an" or "right (adj / n)" -> just take the first or both?
            $parts = $word -split '\s*/\s*'
            foreach ($p in $parts) { $eslWords += $p.Trim() }
        } else {
            $eslWords += $word
        }
    }
}
$eslWords = $eslWords | Select-Object -Unique

# 2. Parse our A1 list (A1-1 and A1-2)
$myA1Words = @()
$lines = $myData -split "`n"
foreach ($line in $lines) {
    if ($line -match '\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"(A1-[12])"\)') {
        $enWord = $matches[2].Trim().ToLower()
        # our english words can be "eat", "I", "play", sometimes "boy/girl" maybe?
        $enWord = $enWord -replace '^to\s+', ''
        if ($enWord -match '/') {
            $parts = $enWord -split '\s*/\s*'
            foreach ($p in $parts) { $myA1Words += $p.Trim() }
        } else {
            $myA1Words += $enWord
        }
    }
}
$myA1Words = $myA1Words | Select-Object -Unique

# 3. Intersect
$common = @()
foreach ($w in $eslWords) {
    if ($myA1Words -contains $w) {
        $common += $w
    }
}

$countEsl = $eslWords.Count
$countMyA1 = $myA1Words.Count
$countCommon = $common.Count

Write-Host "Mots sur ESL : $countEsl"
Write-Host "Mots dans notre A1 : $countMyA1"
Write-Host "Mots en commun : $countCommon"
Write-Host "Pourcentage de couverture du site par notre base : $([math]::Round(($countCommon / $countEsl) * 100, 2))%"
