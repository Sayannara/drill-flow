---
name: review-reports
description: >-
  Procedure pour analyser, verifier, proposer et appliquer les corrections des signalements
  utilisateurs (word_reports) dans drillFlow. A activer imperativement quand l'utilisateur demande
  de traiter, revoir, auditer ou corriger les signalements de vocabulaire.
---

# Procedure de Traitement des Signalements drillFlow

Ce workflow standardise et securise la revue, la proposition et la resolution des signalements d'utilisateurs.

## Regle Fondamentale : Aucun changement sans ACK

L'agent a **l'interdiction formelle** de modifier js/data/vocabulary.js ou de supprimer des documents Firestore sans avoir prealablement presente le plan et recu **l'ACK explicite** de l'utilisateur.

---

## Workflow d'Execution en 5 Etapes

### Etape 1 : Extraction et Croisement
1. Extraire les signalements actifs de la collection Firestore word_reports.
2. Pour chaque signalement, charger l'entree correspondante dans js/data/vocabulary.js (par son ID).
3. Inspecter les remarques utilisateurs, les langues de l'exercice et les motifs.

### Etape 2 : Creation Systematique de l'Implementation Plan en 2 Parties
L'agent doit **toujours** generer un artefact implementation_plan.md (avec RequestFeedback: true) decoupe obligatoirement en **2 etapes distinctes** :

1. **Partie 1 : Les mots evidents (100%)**
   - Tableau precis des corrections incontestables :
     - ID du mot
     - Paire de langues
     - Vocabulaire actuel
     - Remarque utilisateur
     - Modification textuelle exacte proposee
   - Liste des signalements deja conformes / deja resolus dans la version actuelle.

2. **Partie 2 : Les autres mots (Cas structurels & Nuances)**
   - Mots necessitant une separation de carte (ex: *anywhere / everywhere*).
   - Doublons d'entrees a clarifier ou fusionner.
   - Nuances de niveaux CEFR ou grammaire specifique (verbes modaux, etc.).
   - Questions et options explicites pour permettre a l'utilisateur de donner ses feedbacks directement.

### Etape 3 : Arret et Attente de l'ACK
- L'agent s'arrete obligatoirement.
- Il informe l'utilisateur que le plan d'implementation est pret.
- **Il attend l'ACK explicite de l'utilisateur** sur chaque partie ou cas specifique.

### Etape 4 : Application des Corrections Validees
Apres reception de l'ACK utilisateur :
1. Modifier js/data/vocabulary.js (en respectant UTF-8 sans BOM et la structure JSON).
2. Valider rigoureusement l'integrite du fichier de vocabulaire (parsing complet sans erreur).
3. Mettre a jour les numeros de version et de cache-busting (?v=...) dans les fichiers HTML et JS.

### Etape 5 : Resolution dans Firestore et Nettoyage
1. Supprimer de Firestore (word_reports) **uniquement** les signalements dont les corrections ont ete validees par l'utilisateur.
2. Laisser intacts dans Firestore les signalements restants non encore resolus.
3. Verifier le compteur du tableau de bord admin.\n