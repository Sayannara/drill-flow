$utf8NoBom = New-Object System.Text.UTF8Encoding $False
$content = [System.IO.File]::ReadAllText("$PSScriptRoot\generate_data.py", $utf8NoBom)

$new_words = @"
    ,
    # Adjectifs courants (A2-1)
    ("beau", "beautiful", "schön", "hermoso", "adjectif", "A2-1"),
    ("laid", "ugly", "hässlich", "feo", "adjectif", "A2-1"),
    ("jeune", "young", "jung", "joven", "adjectif", "A2-1"),
    ("vieux", "old", "alt", "viejo", "adjectif", "A2-1"),
    ("nouveau", "new", "neu", "nuevo", "adjectif", "A2-1"),
    ("ancien", "ancient/former", "alt/ehemalig", "antiguo", "adjectif", "A2-1"),
    ("rapide", "fast", "schnell", "rápido", "adjectif", "A2-1"),
    ("lent", "slow", "langsam", "lento", "adjectif", "A2-1"),
    ("fort", "strong", "stark", "fuerte", "adjectif", "A2-1"),
    ("faible", "weak", "schwach", "débil", "adjectif", "A2-1"),
    ("riche", "rich", "reich", "rico", "adjectif", "A2-1"),
    ("pauvre", "poor", "arm", "pobre", "adjectif", "A2-1"),
    ("heureux", "happy", "glücklich", "feliz", "adjectif", "A2-1"),
    ("triste", "sad", "traurig", "triste", "adjectif", "A2-1"),
    ("fatigué", "tired", "müde", "cansado", "adjectif", "A2-1"),
    ("malade", "sick", "krank", "enfermo", "adjectif", "A2-1"),
    ("libre", "free", "frei", "libre", "adjectif", "A2-1"),
    ("occupé", "busy", "beschäftigt", "ocupado", "adjectif", "A2-1"),

    # Famille étendue (A2-1)
    ("le grand-père", "grandfather", "der Großvater", "el abuelo", "nom", "A2-1"),
    ("la grand-mère", "grandmother", "die Großmutter", "la abuela", "nom", "A2-1"),
    ("l'oncle", "uncle", "der Onkel", "el tío", "nom", "A2-1"),
    ("la tante", "aunt", "die Tante", "la tía", "nom", "A2-1"),
    ("le cousin", "cousin (m)", "der Cousin", "el primo", "nom", "A2-1"),
    ("la cousine", "cousin (f)", "die Cousine", "la prima", "nom", "A2-1"),
    ("le neveu", "nephew", "der Neffe", "el sobrino", "nom", "A2-1"),
    ("la nièce", "niece", "die Nichte", "la sobrina", "nom", "A2-1"),

    # Transport (A2-1)
    ("le vélo", "bicycle", "das Fahrrad", "la bicicleta", "nom", "A2-1"),
    ("l'avion", "airplane", "das Flugzeug", "el avión", "nom", "A2-1"),
    ("le bateau", "boat", "das Boot", "el barco", "nom", "A2-1"),
    ("le billet", "ticket", "das Ticket", "el billete", "nom", "A2-1"),
    ("la gare", "train station", "der Bahnhof", "la estación", "nom", "A2-1"),
    ("l'aéroport", "airport", "der Flughafen", "el aeropuerto", "nom", "A2-1"),
    ("le quai", "platform/dock", "der Bahnsteig/Kai", "el andén/muelle", "nom", "A2-1"),
    ("le vol", "flight", "der Flug", "el vuelo", "nom", "A2-1"),
    ("le passager", "passenger", "der Passagier", "el pasajero", "nom", "A2-1"),
    ("la valise", "suitcase", "der Koffer", "la maleta", "nom", "A2-1"),
    ("le bagage", "baggage", "das Gepäck", "el equipaje", "nom", "A2-1"),

    # Technologie (A2-2)
    ("le clavier", "keyboard", "die Tastatur", "el teclado", "nom", "A2-2"),
    ("l'écran", "screen", "der Bildschirm", "la pantalla", "nom", "A2-2"),
    ("la batterie", "battery", "der Akku", "la batería", "nom", "A2-2"),
    ("le réseau", "network", "das Netzwerk", "la red", "nom", "A2-2"),
    ("le message", "message", "die Nachricht", "el mensaje", "nom", "A2-2"),
    ("le courriel", "email", "die E-Mail", "el correo electrónico", "nom", "A2-2"),
    ("l'application", "application", "die App", "la aplicación", "nom", "A2-2"),
    ("le site web", "website", "die Webseite", "el sitio web", "nom", "A2-2"),
    ("le fichier", "file", "die Datei", "el archivo", "nom", "A2-2"),

    # Argent et achats (A2-2)
    ("l'argent", "money", "das Geld", "el dinero", "nom", "A2-2"),
    ("la banque", "bank", "die Bank", "la banco", "nom", "A2-2"),
    ("la carte de crédit", "credit card", "die Kreditkarte", "la tarjeta de crédito", "nom", "A2-2"),
    ("le compte", "account", "das Konto", "la cuenta", "nom", "A2-2"),
    ("le prix", "price", "der Preis", "el precio", "nom", "A2-2"),
    ("le marché", "market", "der Markt", "el mercado", "nom", "A2-2"),
    ("le magasin", "store", "das Geschäft", "la tienda", "nom", "A2-2"),
    ("le supermarché", "supermarket", "der Supermarkt", "el supermercado", "nom", "A2-2"),
    ("la caisse", "checkout", "die Kasse", "la caja", "nom", "A2-2"),
    ("cher", "expensive", "teuer", "caro", "adjectif", "A2-2"),
    ("bon marché", "cheap", "billig", "barato", "adjectif", "A2-2"),

    # Météo et nature (A2-2)
    ("le soleil", "sun", "die Sonne", "el sol", "nom", "A2-2"),
    ("la lune", "moon", "der Mond", "la luna", "nom", "A2-2"),
    ("l'étoile", "star", "der Stern", "la estrella", "nom", "A2-2"),
    ("le ciel", "sky", "der Himmel", "el cielo", "nom", "A2-2"),
    ("le nuage", "cloud", "die Wolke", "la nube", "nom", "A2-2"),
    ("la pluie", "rain", "der Regen", "la lluvia", "nom", "A2-2"),
    ("la neige", "snow", "der Schnee", "la nieve", "nom", "A2-2"),
    ("le vent", "wind", "der Wind", "el viento", "nom", "A2-2"),
    ("la tempête", "storm", "der Sturm", "la tormenta", "nom", "A2-2"),
    ("le froid", "cold", "die Kälte", "el frío", "nom", "A2-2"),
    ("la chaleur", "heat", "die Hitze", "el calor", "nom", "A2-2"),
    ("la montagne", "mountain", "der Berg", "la montaña", "nom", "A2-2"),
    ("la plage", "beach", "der Strand", "la playa", "nom", "A2-2")
]
"@

$content = $content -replace '\]\r?\nvocab_list = \[\]', "$new_words`nvocab_list = []"

[System.IO.File]::WriteAllText("$PSScriptRoot\generate_data.py", $content, $utf8NoBom)
Write-Host "Batch A2-2 injecté."
