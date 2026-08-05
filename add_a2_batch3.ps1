$utf8NoBom = New-Object System.Text.UTF8Encoding $False
$content = [System.IO.File]::ReadAllText("$PSScriptRoot\generate_data.py", $utf8NoBom)

$new_words = @"
    ,
    # --- BATCH A2-1 & A2-2 ---
    # Professions et Travail (A2-1)
    ("le médecin", "doctor", "der Arzt", "el médico", "nom", "A2-1"),
    ("l'infirmière", "nurse", "die Krankenschwester", "la enfermera", "nom", "A2-1"),
    ("le dentiste", "dentist", "der Zahnarzt", "el dentista", "nom", "A2-1"),
    ("le policier", "police officer", "der Polizist", "el policía", "nom", "A2-1"),
    ("le pompier", "firefighter", "der Feuerwehrmann", "el bombero", "nom", "A2-1"),
    ("le facteur", "postman", "der Briefträger", "el cartero", "nom", "A2-1"),
    ("le boulanger", "baker", "der Bäcker", "el panadero", "nom", "A2-1"),
    ("le boucher", "butcher", "der Metzger", "el carnicero", "nom", "A2-1"),
    ("le cuisinier", "cook/chef", "der Koch", "el cocinero", "nom", "A2-1"),
    ("l'ingénieur", "engineer", "der Ingenieur", "el ingeniero", "nom", "A2-1"),
    ("l'acteur", "actor", "der Schauspieler", "el actor", "nom", "A2-1"),
    ("le chanteur", "singer", "der Sänger", "el cantante", "nom", "A2-1"),
    ("le musicien", "musician", "der Musiker", "el músico", "nom", "A2-1"),
    ("le vendeur", "seller/shop assistant", "der Verkäufer", "el vendedor", "nom", "A2-1"),
    ("l'entreprise", "company", "das Unternehmen", "la empresa", "nom", "A2-2"),
    ("le bureau", "office", "das Büro", "la oficina", "nom", "A2-1"),
    ("le collègue", "colleague", "der Kollege", "el colega", "nom", "A2-1"),
    ("le patron", "boss", "der Chef", "el jefe", "nom", "A2-1"),

    # Sports et Loisirs (A2-1)
    ("le football", "football/soccer", "der Fußball", "el fútbol", "nom", "A2-1"),
    ("le tennis", "tennis", "das Tennis", "el tenis", "nom", "A2-1"),
    ("le basketball", "basketball", "der Basketball", "el baloncesto", "nom", "A2-1"),
    ("la natation", "swimming", "das Schwimmen", "la natación", "nom", "A2-1"),
    ("le ski", "skiing", "das Skifahren", "el esquí", "nom", "A2-1"),
    ("la course", "running/race", "das Rennen", "la carrera", "nom", "A2-1"),
    ("le ballon", "ball", "der Ball", "el balón", "nom", "A2-1"),
    ("l'équipe", "team", "die Mannschaft", "el equipo", "nom", "A2-2"),
    ("le stade", "stadium", "das Stadion", "el estadio", "nom", "A2-1"),
    ("le joueur", "player", "der Spieler", "el jugador", "nom", "A2-1"),
    ("le gagnant", "winner", "der Gewinner", "el ganador", "nom", "A2-1"),
    ("le perdant", "loser", "der Verlierer", "el perdedor", "nom", "A2-1"),
    ("la victoire", "victory", "der Sieg", "la victoria", "nom", "A2-1"),
    ("la défaite", "defeat", "die Niederlage", "la derrota", "nom", "A2-1"),
    ("pratiquer", "practice", "üben", "practicar", "verbe", "A2-1"),
    ("gagner", "win", "gewinnen", "ganar", "verbe", "A2-1"),
    ("perdre", "lose", "verlieren", "perder", "verbe", "A2-1"),

    # Santé et Corps (A2-2)
    ("la tête", "head", "der Kopf", "la cabeza", "nom", "A2-1"),
    ("le bras", "arm", "der Arm", "el brazo", "nom", "A2-1"),
    ("la jambe", "leg", "das Bein", "la pierna", "nom", "A2-1"),
    ("le pied", "foot", "der Fuß", "el pie", "nom", "A2-1"),
    ("la main", "hand", "die Hand", "la mano", "nom", "A2-1"),
    ("le doigt", "finger", "der Finger", "el dedo", "nom", "A2-1"),
    ("le ventre", "stomach", "der Bauch", "el vientre/estómago", "nom", "A2-1"),
    ("le dos", "back", "der Rücken", "la espalda", "nom", "A2-1"),
    ("l'œil", "eye", "das Auge", "el ojo", "nom", "A2-1"),
    ("la bouche", "mouth", "der Mund", "la boca", "nom", "A2-1"),
    ("le nez", "nose", "die Nase", "la nariz", "nom", "A2-1"),
    ("l'oreille", "ear", "das Ohr", "la oreja", "nom", "A2-1"),
    ("la dent", "tooth", "der Zahn", "el diente", "nom", "A2-1"),
    ("les cheveux", "hair", "die Haare", "el pelo", "nom", "A2-1"),
    ("la douleur", "pain", "der Schmerz", "el dolor", "nom", "A2-2"),
    ("le médicament", "medicine", "das Medikament", "el medicamento", "nom", "A2-2"),
    ("la pharmacie", "pharmacy", "die Apotheke", "la farmacia", "nom", "A2-2"),
    ("l'hôpital", "hospital", "das Krankenhaus", "el hospital", "nom", "A2-2"),
    ("la maladie", "disease/illness", "die Krankheit", "la enfermedad", "nom", "A2-2"),
    ("guérir", "heal/cure", "heilen", "curar", "verbe", "A2-2"),
    ("saigner", "bleed", "bluten", "sangrar", "verbe", "A2-2"),

    # Animaux sauvages et nature détaillée (A2-1)
    ("le cheval", "horse", "das Pferd", "el caballo", "nom", "A2-1"),
    ("la vache", "cow", "die Kuh", "la vaca", "nom", "A2-1"),
    ("le cochon", "pig", "das Schwein", "el cerdo", "nom", "A2-1"),
    ("le mouton", "sheep", "das Schaf", "la oveja", "nom", "A2-1"),
    ("la poule", "hen/chicken", "das Huhn", "la gallina", "nom", "A2-1"),
    ("l'oiseau", "bird", "der Vogel", "el pájaro", "nom", "A2-1"),
    ("le poisson", "fish", "der Fisch", "el pez", "nom", "A2-1"),
    ("l'ours", "bear", "der Bär", "el oso", "nom", "A2-1"),
    ("le loup", "wolf", "der Wolf", "el lobo", "nom", "A2-1"),
    ("le renard", "fox", "der Fuchs", "el zorro", "nom", "A2-1"),
    ("le lac", "lake", "der See", "el lago", "nom", "A2-1"),
    ("la rivière", "river", "der Fluss", "el río", "nom", "A2-1"),
    ("la forêt", "forest", "der Wald", "el bosque", "nom", "A2-1"),
    ("l'île", "island", "die Insel", "la isla", "nom", "A2-1"),

    # Ville détaillée (A2-1/A2-2)
    ("le bâtiment", "building", "das Gebäude", "el edificio", "nom", "A2-1"),
    ("l'église", "church", "die Kirche", "la iglesia", "nom", "A2-1"),
    ("le pont", "bridge", "die Brücke", "el puente", "nom", "A2-1"),
    ("la place", "square", "der Platz", "la plaza", "nom", "A2-1"),
    ("le trottoir", "sidewalk", "der Bürgersteig", "la acera", "nom", "A2-1"),
    ("le feu", "traffic light/fire", "die Ampel/das Feuer", "el semáforo/el fuego", "nom", "A2-1"),
    ("le carrefour", "intersection", "die Kreuzung", "el cruce", "nom", "A2-1"),
    ("la mairie", "town hall", "das Rathaus", "el ayuntamiento", "nom", "A2-2"),
    ("la poste", "post office", "die Post", "el correo", "nom", "A2-1"),
    ("le commissariat", "police station", "das Polizeirevier", "la comisaría", "nom", "A2-2"),

    # Sentiments et Caractère (A2-2)
    ("la peur", "fear", "die Angst", "el miedo", "nom", "A2-2"),
    ("la joie", "joy", "die Freude", "la alegría", "nom", "A2-2"),
    ("la colère", "anger", "die Wut", "la ira", "nom", "A2-2"),
    ("la tristesse", "sadness", "die Traurigkeit", "la tristeza", "nom", "A2-2"),
    ("la surprise", "surprise", "die Überraschung", "la sorpresa", "nom", "A2-2"),
    ("le courage", "courage", "der Mut", "el valor", "nom", "A2-2"),
    ("sympathique", "nice/friendly", "sympathisch", "simpático", "adjectif", "A2-2"),
    ("antipathique", "unfriendly", "unsympathisch", "antipático", "adjectif", "A2-2"),
    ("timide", "shy", "schüchtern", "tímido", "adjectif", "A2-2"),
    ("bavard", "talkative", "geschwätzig", "hablador", "adjectif", "A2-2"),
    ("poli", "polite", "höflich", "educado", "adjectif", "A2-2"),
    ("impoli", "impolite", "unhöflich", "maleducado", "adjectif", "A2-2"),

    # Verbes courants (A2-1 & A2-2)
    ("apporter", "bring", "bringen", "traer", "verbe", "A2-1"),
    ("emporter", "take away", "mitnehmen", "llevarse", "verbe", "A2-1"),
    ("cacher", "hide", "verstecken", "esconder", "verbe", "A2-1"),
    ("montrer", "show", "zeigen", "mostrar", "verbe", "A2-1"),
    ("toucher", "touch", "berühren", "tocar", "verbe", "A2-1"),
    ("sentir", "feel/smell", "fühlen/riechen", "sentir/oler", "verbe", "A2-1"),
    ("goûter", "taste", "schmecken", "probar", "verbe", "A2-1"),
    ("réfléchir", "think/reflect", "nachdenken", "reflexionar", "verbe", "A2-2"),
    ("imaginer", "imagine", "sich vorstellen", "imaginar", "verbe", "A2-2"),
    ("rêver", "dream", "träumen", "soñar", "verbe", "A2-2"),
    ("espérer", "hope", "hoffen", "esperar", "verbe", "A2-2"),
    ("décider", "decide", "entscheiden", "decidir", "verbe", "A2-2"),
    ("changer", "change", "ändern", "cambiar", "verbe", "A2-2")
]
"@

$content = $content -replace '\]\r?\nvocab_list = \[\]', "$new_words`nvocab_list = []"

[System.IO.File]::WriteAllText("$PSScriptRoot\generate_data.py", $content, $utf8NoBom)
Write-Host "Batch 3 injecté."
