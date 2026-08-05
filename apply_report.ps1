$utf8NoBom = New-Object System.Text.UTF8Encoding $False
$content = [System.IO.File]::ReadAllText("$PSScriptRoot\generate_data.py", $utf8NoBom)

# Words to move from A1-1 to B1-1
$to_b1 = @(
    "falloir", "rester", "reprendre", "parvenir", "diriger", "établir", "réussir", "étonner", "dresser", "arracher", 
    "examiner", "douter", "revoir", "remonter", "installer", "soulever", "imposer", "respirer", "souffler", "attirer", 
    "amuser", "éclater", "réunir", "traiter", "engager", "traîner", "employer", "marquer", "prouver", "importer", 
    "exiger", "soutenir", "considérer", "appartenir", "représenter", "tromper", "craindre", "exprimer", "posséder", 
    "découvrir", "prononcer", "trembler", "défendre", "créer", "maintenir", "indiquer", "promettre", "relever", 
    "abandonner", "ignorer", "accompagner", "observer", "séparer", "prévoir", "obliger", "éclairer", "poursuivre", 
    "livrer", "contenir", "pencher", "cacher", "remettre", "disparaître", "tonner"
)

foreach ($word in $to_b1) {
    # Match exactly ("word", ..., "A1-1")
    $pattern = "\(`"$word`",([^)]+?)`"A1-1`"\)"
    $replacement = "(`"$word`",`$1`"B1-1`")"
    $content = $content -replace $pattern, $replacement
}

# Words to move to A1-1 from A1-2
$to_a1_1 = @(
    "faim", "soif", "aujourd'hui", "demain", "hier", "toujours", "souvent", "parfois", "jamais", "si", "quand", 
    "pourquoi", "combien", "rien", "où", "comment", "ami", "famille", "maison", "chambre", "porte", "fenêtre", 
    "table", "chaise", "lit", "eau", "pain", "lait", "café", "thé", "voiture", "bus", "train", "école", "professeur", 
    "ville", "pays", "monde", "route", "rue", "jour", "nuit", "matin", "soir", "heure", "minute", "année", "mois"
)

foreach ($word in $to_a1_1) {
    $pattern = "\(`"$word`",([^)]+?)`"A1-2`"\)"
    $replacement = "(`"$word`",`$1`"A1-1`")"
    $content = $content -replace $pattern, $replacement
}

# Save back
[System.IO.File]::WriteAllText("$PSScriptRoot\generate_data.py", $content, $utf8NoBom)
Write-Host "Reclassification terminée."
