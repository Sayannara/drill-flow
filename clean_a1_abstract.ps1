$utf8NoBom = New-Object System.Text.UTF8Encoding $False
$content = [System.IO.File]::ReadAllText("$PSScriptRoot\generate_data.py", $utf8NoBom)

# Words to move from A1-1 to B1-1
$to_b1 = @(
    "justice", "crime", "prison", "gouvernement", "guerre", "paix", "loi", "force", "peuple", 
    "état", "droit", "peine", "cause", "effet", "idée", "pensée", "raison", "vérité", "doute",
    "songer", "demeurer", "appuyer", "taire", "causer", "exister"
)

foreach ($word in $to_b1) {
    # Match exactly ("word", ..., "A1-1") or A1-2 if they were there
    $pattern = "\(`"$word`",([^)]+?)`"A1-[12]`"\)"
    $replacement = "(`"$word`",`$1`"B1-1`")"
    $content = $content -replace $pattern, $replacement
}

[System.IO.File]::WriteAllText("$PSScriptRoot\generate_data.py", $content, $utf8NoBom)
Write-Host "Nettoyage des mots abstraits terminé."
