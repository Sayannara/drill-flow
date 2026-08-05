$utf8NoBom = New-Object System.Text.UTF8Encoding $False
$content = [System.IO.File]::ReadAllText("$PSScriptRoot\generate_data.py", $utf8NoBom)

$new_words = @"
    ,
    # --- LETTRE V ---
    ("les vacances (US)", "vacation", "der Urlaub", "las vacaciones", "nom", "A1"),
    ("le légume", "vegetable", "das Gemüse", "la verdura", "nom", "A1"),
    ("très", "very", "sehr", "muy", "adverbe", "A1"),
    ("la vidéo", "video", "das Video", "el vídeo", "nom", "A1"),
    ("le village", "village", "das Dorf", "la aldea", "nom", "A1"),
    ("visiter", "visit", "besuchen", "visitar", "verbe", "A1"),
    ("le visiteur", "visitor", "der Besucher", "el visitante", "nom", "A1"),

    # --- LETTRE W ---
    ("attendre", "wait", "warten", "esperar", "verbe", "A1"),
    ("le serveur", "waiter", "der Kellner", "el camarero", "nom", "A1"),
    ("se réveiller", "wake", "aufwachen", "despertar", "verbe", "A1"),
    ("marcher", "walk", "gehen", "caminar", "verbe", "A1"),
    ("le mur", "wall", "die Wand", "la pared", "nom", "A1"),
    ("vouloir", "want", "wollen", "querer", "verbe", "A1"),
    ("chaud / chaleureux", "warm", "warm", "cálido", "adjectif", "A1"),
    ("laver", "wash", "waschen", "lavar", "verbe", "A1"),
    ("la montre", "watch", "die Uhr", "el reloj", "nom", "A1"),
    ("regarder (TV)", "watch", "schauen", "mirar", "verbe", "A1"),
    ("l'eau", "water", "das Wasser", "el agua", "nom", "A1"),
    ("le chemin / la façon", "way", "der Weg / die Art", "el camino / la manera", "nom", "A1"),
    ("nous", "we", "wir", "nosotros", "pron", "A1"),
    ("porter (vêtements)", "wear", "tragen", "llevar puesto", "verbe", "A1"),
    ("le temps (météo)", "weather", "das Wetter", "el clima", "nom", "A1"),
    ("le site web", "website", "die Website", "el sitio web", "nom", "A1"),
    ("mercredi", "Wednesday", "Mittwoch", "miércoles", "nom", "A1"),
    ("la semaine", "week", "die Woche", "la semana", "nom", "A1"),
    ("le week-end", "weekend", "das Wochenende", "el fin de semana", "nom", "A1"),
    ("bien", "well", "gut", "bien", "adverbe", "A1"),
    ("l'ouest", "west", "der Westen", "el oeste", "nom", "A1"),
    ("quoi", "what", "was", "qué", "pron", "A1"),
    ("quand", "when", "wann", "cuándo", "adverbe", "A1"),
    ("où", "where", "wo", "dónde", "adverbe", "A1"),
    ("lequel", "which", "welcher", "cuál", "pron", "A1"),
    ("blanc", "white", "weiß", "blanco", "adjectif", "A1"),
    ("qui", "who", "wer", "quién", "pron", "A1"),
    ("pourquoi", "why", "warum", "por qué", "adverbe", "A1"),
    ("la femme (épouse)", "wife", "die Ehefrau", "la esposa", "nom", "A1"),
    ("gagner", "win", "gewinnen", "ganar", "verbe", "A1"),
    ("la fenêtre", "window", "das Fenster", "la ventana", "nom", "A1"),
    ("le vin", "wine", "der Wein", "el vino", "nom", "A1"),
    ("l'hiver", "winter", "der Winter", "el invierno", "nom", "A1"),
    ("avec", "with", "mit", "con", "prep", "A1"),
    ("sans", "without", "ohne", "sin", "prep", "A1"),
    ("la femme", "woman", "die Frau", "la mujer", "nom", "A1"),
    ("merveilleux", "wonderful", "wunderbar", "maravilloso", "adjectif", "A1"),
    ("le mot", "word", "das Wort", "la palabra", "nom", "A1"),
    ("le travail", "work", "die Arbeit", "el trabajo", "nom", "A1"),
    ("travailler", "work", "arbeiten", "trabajar", "verbe", "A1"),
    ("le travailleur", "worker", "der Arbeiter", "el trabajador", "nom", "A1"),
    ("le monde", "world", "die Welt", "el mundo", "nom", "A1"),
    ("voudrait", "would", "würde", "haría (condicional)", "verbe", "A1"),
    ("écrire", "write", "schreiben", "escribir", "verbe", "A1"),
    ("l'écrivain", "writer", "der Autor", "el escritor", "nom", "A1"),
    ("l'écriture", "writing", "das Schreiben", "la escritura", "nom", "A1"),
    ("faux (erreur)", "wrong", "falsch", "equivocado", "adjectif", "A1"),

    # --- LETTRE Y & Z ---
    ("l'année", "year", "das Jahr", "el año", "nom", "A1"),
    ("jaune", "yellow", "gelb", "amarillo", "adjectif", "A1"),
    ("oui", "yes", "ja", "sí", "adverbe", "A1"),
    ("hier", "yesterday", "gestern", "ayer", "adverbe", "A1"),
    ("toi / vous", "you", "du / ihr / Sie", "tú / usted / vosotros", "pron", "A1"),
    ("jeune", "young", "jung", "joven", "adjectif", "A1"),
    ("ton / votre", "your", "dein / euer / Ihr", "tu / su / vuestro", "det", "A1"),
    ("le zoo", "zoo", "der Zoo", "el zoológico", "nom", "A1")
"@

$content = $content -replace 'vocab_list = \[', "vocab_list = [$new_words"

[System.IO.File]::WriteAllText("$PSScriptRoot\generate_data.py", $content, $utf8NoBom)
Write-Host "Part 6 (V-Z) injected."
