# Changelog

Toutes les évolutions notables du projet sont documentées ici.

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
- Fiabilisation audio mobile:
  - initialisation speech au geste utilisateur,
  - gestion `AudioContext` partagée et reprise (`resume()`),
  - fallback iOS/Android sur les transitions vocales.

## [0.1.0] - 2026-03-04

### Ajouté
- Version initiale du player de séance depuis texte brut.
- Parsing exercices/durée/récup/tours.
- Lecture auto effort/récup et alertes vocales/sonores.
