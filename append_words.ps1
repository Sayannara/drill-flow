$utf8NoBom = New-Object System.Text.UTF8Encoding $False
$content = [System.IO.File]::ReadAllText("$PSScriptRoot\generate_data.py", $utf8NoBom)

# We want to replace the very last `]` of the list with our new elements + `]`
$new_words = @"
    ,
    # --- AJOUTS A1-1 (Mots outils manquants) ---
    ("besoin", "need", "Bedürfnis", "necesidad", "nom", "A1-1"),
    ("mal", "badly/wrong", "schlecht", "mal", "adverbe", "A1-1"),
    ("ici", "here", "hier", "aquí", "adverbe", "A1-1"),
    ("là", "there", "dort", "allí", "adverbe", "A1-1"),
    ("parce que", "because", "weil", "porque", "conjonction", "A1-1"),
    ("personne", "nobody/person", "niemand/Person", "nadie/persona", "pronom", "A1-1"),
    ("quelque chose", "something", "etwas", "algo", "pronom", "A1-1"),
    ("chaque", "each", "jeder", "cada", "adjectif", "A1-1"),
    ("même", "same/even", "selbe/sogar", "mismo/incluso", "adjectif", "A1-1"),
    ("autre", "other", "andere", "otro", "adjectif", "A1-1"),
    ("notre", "our", "unser", "nuestro", "adjectif", "A1-1"),
    ("votre", "your (pl)", "euer/Ihr", "vuestro", "adjectif", "A1-1"),
    ("leur", "their", "ihr", "su", "adjectif", "A1-1"),
    ("ce", "this (m)", "dieser", "este", "adjectif", "A1-1"),
    ("cette", "this (f)", "diese", "esta", "adjectif", "A1-1"),
    ("ces", "these", "diese", "estos/estas", "adjectif", "A1-1"),
    ("ceci", "this", "dies", "esto", "pronom", "A1-1"),
    ("cela", "that", "das", "eso", "pronom", "A1-1"),
    ("lequel", "which one", "welcher", "cuál", "pronom", "A1-1"),

    # --- AJOUTS A2-1 ---
    ("cuisiner", "cook", "kochen", "cocinar", "verbe", "A2-1"),
    ("visiter", "visit", "besuchen", "visitar", "verbe", "A2-1"),
    ("monter", "go up", "hinaufgehen", "subir", "verbe", "A2-1"),
    ("descendre", "go down", "hinuntergehen", "bajar", "verbe", "A2-1"),

    # --- AJOUTS A2-2 ---
    ("douleur", "pain", "Schmerz", "dolor", "nom", "A2-2"),
    ("fatigue", "fatigue", "Müdigkeit", "fatiga", "nom", "A2-2"),
    ("sentiment", "feeling", "Gefühl", "sentimiento", "nom", "A2-2"),
    ("peur", "fear", "Angst", "miedo", "nom", "A2-2"),
    ("joie", "joy", "Freude", "alegría", "nom", "A2-2"),
    ("humeur", "mood", "Laune", "humor", "nom", "A2-2"),
    ("réunion", "meeting", "Besprechung", "reunión", "nom", "A2-2"),
    ("projet", "project", "Projekt", "proyecto", "nom", "A2-2"),
    ("résultat", "result", "Ergebnis", "resultado", "nom", "A2-2"),
    ("objectif", "objective", "Ziel", "objetivo", "nom", "A2-2"),
    ("progrès", "progress", "Fortschritt", "progreso", "nom", "A2-2"),
    ("problème", "problem", "Problem", "problema", "nom", "A2-2"),
    ("solution", "solution", "Lösung", "solución", "nom", "A2-2"),
    ("équipe", "team", "Team", "equipo", "nom", "A2-2"),
    ("emploi", "job", "Job/Beschäftigung", "empleo", "nom", "A2-2"),
    ("salaire", "salary", "Gehalt", "salario", "nom", "A2-2"),
    ("coût", "cost", "Kosten", "costo", "nom", "A2-2"),
    ("prix", "price", "Preis", "precio", "nom", "A2-2"),
    ("achat", "purchase", "Kauf", "compra", "nom", "A2-2"),
    ("vente", "sale", "Verkauf", "venta", "nom", "A2-2"),
    ("campagne", "countryside", "Land", "campo", "nom", "A2-2")
]
"@

# Since `generate_data.py` ends with `]\nvocab_list = []...`, we will replace the first `]\nvocab_list` with `$new_words\nvocab_list`
$content = $content -replace '\]\r?\nvocab_list = \[\]', "$new_words`nvocab_list = []"

[System.IO.File]::WriteAllText("$PSScriptRoot\generate_data.py", $content, $utf8NoBom)
Write-Host "Mots manquants ajoutés avec succès."
