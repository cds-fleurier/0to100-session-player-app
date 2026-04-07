# 0 to 100 Session Player

Web app légère pour transformer une séance de renforcement musculaire en texte brut en player automatique (effort/récup/tours).

## Objectif

Coller une séance fournie par un coach et lancer immédiatement une session guidée, cadencée, avec alertes vocales.

## Fonctionnalités

- Collage d'une séance en texte libre
- Bouton `Coller ma séance depuis Nolio` (lecture du presse-papiers)
- Parsing automatique des exercices, durées, récupérations et nombre de tours
  - y compris les formats Nolio avec durées sur lignes séparées
  - prise en charge des minutes avec apostrophe (ex: `10'`)
- Player automatique:
  - enchaînement `exercice -> récupération -> exercice suivant`
  - pré-décompte de démarrage (5 secondes)
  - micro-latence "Top départ" avant le 1er exercice
  - annonce "prépare-toi" + nom du prochain exercice (à T-11)
  - countdown vocal sur les 5 dernières secondes (`5,4,3,2,1`)
- Alertes sonores + vocales
- Option de voix `Femme` / `Homme` (préférence sauvegardée)
- Mode `Focus` (affichage grand écran centré sur le player)
- Option `Écran actif` (Wake Lock) activée par défaut pour éviter la mise en veille pendant la séance
- Compatibilités mobile renforcées (iOS Safari / Android Chrome)
- Interface customisée dans l'univers du challenge 0 to 100

## Utilisation

### Option 1: ouverture directe

Ouvrir le fichier `index.html` dans le navigateur.

### Option 2: serveur local

```bash
cd /Users/cds/agents-codex/sport-session-player
python3 -m http.server 8000
```

Puis ouvrir: `http://localhost:8000`

## Version live (participants)

App publique:

- https://cds-fleurier.github.io/0to100-session-player-app/

## Format de séance attendu (exemple)

```text
Séance de renforcement à poids de corps.

Conseils: Faire cette séance en intérieur ou en extérieur après 5' de marche

EXERCICES  Durée  Récup
CHAISE 20s 40s
POMPE SUR CHAISE (OU BANC OU BOX) 20s 40s
PLANCHE en appuis sur les coudes 20s 40s
MONTER SUR POINTES DE PIEDS 20s 40s
3 TOURS
```

Le parser détecte pour chaque ligne d'exercice:
- nom de l'exercice
- durée d'effort
- durée de récupération

et détecte aussi le nombre de tours (`X TOURS`).

## Stack

- HTML
- CSS
- JavaScript vanilla (sans build)
- Web Speech API (voix navigateur)
- Web Audio API (bips)

## Maintenance

- `README.md` est mis à jour à chaque changement fonctionnel visible utilisateur.
- Historique des changements dans `CHANGELOG.md`.

## Roadmap

- Parser plus tolérant sur des formats coach variés
- Sauvegarde locale de séances favorites
- Historique simple des séances réalisées
- Paramètres personnalisables (durée du pré-départ, timing d'annonce)

## Licence

Projet privé pour usage personnel (challenge 0 to 100).
