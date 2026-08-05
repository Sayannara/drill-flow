# Règles d'encodage (Encoding Rules)

1. **UTF-8 Obligatoire** : Tous les fichiers sources (HTML, JS, CSS, JSON, scripts PS1 ou Python, etc.) DOIVENT être encodés en **UTF-8**.
2. **Sans BOM** : L'encodage doit être **UTF-8 sans BOM** (Byte Order Mark) pour éviter des comportements inattendus dans les navigateurs et l'apparition de caractères parasites au début des fichiers.
3. **PowerShell** : Lorsque l'on lit ou écrit des fichiers via PowerShell 5.1 (qui utilise l'ANSI par défaut), il faut toujours forcer la lecture/écriture en UTF-8 sans BOM. 
   Exemple de bonne pratique en PowerShell :
   ```powershell
   $utf8NoBom = New-Object System.Text.UTF8Encoding $False
   $content = [System.IO.File]::ReadAllText("fichier.txt", $utf8NoBom)
   [System.IO.File]::WriteAllText("fichier.txt", $content, $utf8NoBom)
   ```
4. **Exécution des scripts PowerShell contenant des accents** : Si un script `.ps1` contient des caractères accentués (français, allemand, espagnol, etc.), il doit être lu et exécuté par PowerShell avec la garantie qu'il ne sera pas interprété en ANSI.
