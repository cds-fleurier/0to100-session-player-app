# Changelog

Toutes les évolutions notables du projet sont documentées ici.

## [1.9.0] - 2026-05-19

### Modifié
- Sélecteur de plateforme unique (Spotify / Apple Music / YouTube / Deezer) sauvegardé en localStorage.
- Un seul bouton par titre au lieu de 4 — UI plus lisible, même expérience.

## [1.8.0] - 2026-05-19

### Modifié
- Bibliothèque de 88 titres curatés (Motown/Soul, Hip-hop, Électro, Rock, Lo-fi) avec BPMs vérifiés et durées en secondes.
- Algorithme de sélection : filtre par genre + plage BPM adaptée au type de séance (Run & Renfo vs Renfo), puis remplit la durée totale de la séance.
- Affichage d'une playlist de titres spécifiques avec liens directs Spotify / Apple Music / YouTube / Deezer par titre.
- En-tête playlist : nombre de titres, durée totale vs durée de séance.
- Easter egg : option "🔥 Spécial Myriam" (180+ BPM) — pour ceux qui courent comme si leur vie en dépendait.

## [1.7.0] - 2026-05-19

### Ajouté
- Section Musique : sélecteur de genre (Motown/Soul, Hip-hop, Électro, Rock, Lo-fi, Sans musique).
- Suggestion musicale adaptée au type de séance (Run & Renfo vs Renfo classique) avec BPM calibré.
- 4 boutons de liens directs vers Spotify, Apple Music, YouTube Music et Deezer.
- Préférence de genre sauvegardée via `localStorage`.
- Section cachée en mode Focus.

## [1.6.0] - 2026-05-19

### Modifié
- Parser Run & Renfo réécrit : détection de la durée par scan arrière (`findDurationBefore`) jusqu'à 6 lignes, en sautant les lignes meta Nolio (Zone X, bpm, intensité X/10).
- Corrige l'échauffement mal détecté (7s au lieu de 10 min) quand Zone + bpm sont intercalés entre la durée et le label `Échauffement`.
- Corrige le cooldown non détecté quand `5'` est à plus de 2 lignes du label `Récupération` final.
- Détection de `Corps de séance` comme label du bloc travail (en plus de `Facile`).

## [1.5.1] - 2026-05-17

### Ajouté
- Badge de version visible dans le player (`v1.5.1`) pour valider rapidement la version testée.

### Modifié
- Champ de saisie vide par défaut avec placeholder `Colle ta session ici`.
- Voix: lecture simplifiée du nom d'exercice (sans précisions entre parenthèses / suffixes descriptifs).
- Règle de maintenance documentée: incrément obligatoire de `APP_VERSION` à chaque livraison.

## [0.3.0] - 2026-03-04

### Ajouté
- Bouton `Coller ma séance depuis Nolio` avec lecture automatique du presse-papiers.
- Bouton `Mode focus` pour passer en affichage grand écran du player.
- Bouton `Écran actif` (Wake Lock) pour limiter la mise en veille pendant la séance.
- Option de voix `Femme` / `Homme` sous les alertes vocales.

### Modifié
- `Écran actif` est désormais activé par défaut (état `on` au chargement).
- Persistance de la préférence de voix via `localStorage`.
- Pré-décompte de démarrage 5 secondes avant le premier exercice.
- Micro-latence "Top départ" pour éviter la coupure du `1` avant exercice 1.
- Alerte anticipée "Prépare-toi" à T-11 pendant la récupération.
- Countdown vocal des 5 dernières secondes en récupération.

### Modifié
- Refonte visuelle dans l'univers 0 to 100 (palette, cards, lisibilité chrono).
- Intégration du logo 0 to 100 en en-tête.
- Ajustement de la taille du logo pour desktop/mobile.

### Technique
- Correction parser: prise en charge des exercices Nolio sur plusieurs lignes (`nom`, puis `durée`, puis `récup`).
- Correction parser: support des minutes au format `10'` et extraction du nom au milieu d'une phrase.
- Correction parser: calcul automatique des tours quand la consigne est `X' ... en réalisant 30s / 30s`.
- Correction parser: prise en charge des séances `RUN & RENFO` avec alternance marche + renfo.
- Affichage du plan `RUN & RENFO` par blocs (échauffement, séries, récupération).
- Correctifs RUN & RENFO: échauffement/récup détectés même avec “Zone”/intensité, alternance renfo stable, tours correctement incrémentés.
- Ajout d’un countdown vocal de fin d’exercice (5,4,3,2,1) avec micro-pause avant la transition.
- Amélioration détection renfo: support d’exercices variés (planche, ponts, gainage, etc.).
- Ajout bouton `FWD bloc` pour sauter au bloc suivant (échauffement -> séries -> récup).
- Parsing: support des durées en format `30"` et des répétitions en format `4 rounds`.
- Voix: suppression des précisions d'exercice à l'oral (parenthèses/suffixes explicatifs).
- Fiabilisation audio mobile:
  - initialisation speech au geste utilisateur,
  - gestion `AudioContext` partagée et reprise (`resume()`),
  - fallback iOS/Android sur les transitions vocales.

## [0.1.0] - 2026-03-04

### Ajouté
- Version initiale du player de séance depuis texte brut.
- Parsing exercices/durée/récup/tours.
- Lecture auto effort/récup et alertes vocales/sonores.
