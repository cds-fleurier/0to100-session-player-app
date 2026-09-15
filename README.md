# 0 to 100 Session Player

Web app légère pour jouer une séance 0 to 100 en player automatique (effort/récup/tours), soit depuis une séance intégrée à l'app, soit en collant le texte brut d'une séance de renforcement.

## Objectif

Coller une séance fournie par un coach et lancer immédiatement une session guidée, cadencée, avec alertes vocales.

## Fonctionnalités

- **Séances intégrées** (sélecteur « Séance ») : des séances 0 to 100 décrites dans `sessions-library.js`, disponibles pour tous sans rien coller. Voir § Séances intégrées.
- Collage d'une séance en texte libre
- Bouton `Coller ma séance depuis Nolio` (lecture du presse-papiers)
- Parsing automatique des exercices, durées, récupérations et nombre de tours
  - y compris les formats Nolio avec durées sur lignes séparées
  - prise en charge des minutes avec apostrophe (ex: `10'`)
  - prise en charge des consignes du type: `10' ... en réalisant 30s / 30s` (calcul auto des tours)
  - prise en charge des blocs `RUN & RENFO` (échauffement, séries, récupération)
  - affichage du plan RUN & RENFO en blocs (Bloc 1 / Bloc 2 / Bloc 3)
  - détection RUN & RENFO même sans le libellé explicite (course + renfo)
  - renfo détecté sur d'autres exercices (planche, ponts, gainage, etc.)
  - bouton `FWD bloc` pour sauter directement au bloc suivant
  - formats secondes avec guillemets acceptés (ex: `30"`)
  - `rounds` en anglais accepté (ex: `4 rounds`)
  - la voix annonce uniquement le nom d'exercice (sans précisions techniques)
- Player automatique:
  - enchaînement `exercice -> récupération -> exercice suivant`
  - pré-décompte de démarrage (5 secondes)
  - micro-latence "Top départ" avant le 1er exercice
  - annonce "prépare-toi" + nom du prochain exercice (à T-11)
  - countdown vocal sur les 5 dernières secondes (`5,4,3,2,1`)
- Alertes sonores + vocales
- **Métronome de cadence** (optionnel, 180 BPM) sur les steps « en cadence » des séances intégrées
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

## Séances intégrées

Certaines séances (course + renfo en enchaînements imbriqués) ne se laissent pas deviner depuis du texte : un cycle de 20 s à l'intérieur d'un bloc de 3 min, des tours définis par une durée totale, une pause pour sortir de la maison… Elles sont décrites en déclaratif dans `sessions-library.js` et compilées en timeline par `compileLibrarySession()`. Le player (voix, bips, FWD, pause) est le même que pour les séances collées.

Séances disponibles :

| Id | Séance | Durée |
|----|--------|-------|
| `C1S1` | Run + renfo isométrique — préparation à la maison (cadence, étirements actifs, équilibre), course libre 10/12/15 min, 13 tours de 20 s renfo + 30 s course en cadence + 1 min 30 libre, retour au calme 5 min | ≈ 58-61 min |
| `C1S2` | Course + renfo isométrique — 9 tours de 4 min course + 30 s + 30 s renfo (demi-squat statique / planche ventrale), I1 sur les tours impairs, I2 sur les pairs. Pas d'échauffement. | 45 min |

Notions propres à ces séances :

- **Checkpoint** : step qui met le player en pause (ex. « Sors, et appuie sur Démarrer dès que tu es dehors »). La reprise se fait sur Démarrer.
- **Options** : une séance peut exposer un choix (ex. durée de la course libre). Il s'affiche sous le sélecteur et le choix est mémorisé.
- **Cadence** : les steps marqués `cadence: true` font tourner le métronome si la case « Métronome cadence » est cochée.
- **Intro** : phrase dite une seule fois à l'entrée d'un bloc (rappel d'allure, consigne). « Tour N » n'est annoncé qu'au premier step de chaque tour.

Ajouter une séance = ajouter un objet dans `SESSION_LIBRARY` (le vocabulaire — `step`, `cycle`, `sequence`, `checkpoint`, `rounds`/`round` — est documenté en tête du fichier), puis bumper la version.

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
- AudioSession API (catégorie audio `playback` sur iOS)

## Son sur iPhone

WebKit range le Web Audio dans la catégorie audio « ambient », que l'interrupteur
Sonnerie/Silencieux de l'iPhone coupe. Depuis la v1.13.0 le player réclame la
catégorie `playback` (celle de YouTube/Spotify, qui ignore l'interrupteur) et
maintient en secours un `<audio>` quasi silencieux en boucle pour les versions
d'iOS sans l'AudioSession API.

Deux points à connaître :

- **La voix est muette en mode silence** (constaté sur iPhone, v1.13.0,
  septembre 2026). Elle passe par le TTS système (`speechSynthesis`) qui a sa
  propre session audio, hors de portée du web. Les **bips**, eux, sonnent.
  État assumé pour l'instant — voir « Voix en mode silence : options » ci-dessous.
- Ces mécanismes exigent un geste utilisateur : ils sont armés au clic sur
  **Démarrer**, pas au chargement de la page.

Si le son disparaît en pleine séance après un passage en arrière-plan, c'est un
autre mécanisme : iOS interrompt l'`AudioContext` et ne le relance pas seul. Le
player le reprend sur `visibilitychange` depuis la v1.13.0.

### Voix en mode silence : options (non retenues à ce jour)

Décision du 11/09/2026 : on reste sur `speechSynthesis`. Si le besoin devient
pressant, trois pistes étudiées, du plus simple au plus complet :

| | Principe | Noms d'exercices en silence | Infra | Effort |
|---|---|---|---|---|
| **A. Phrases fixes pré-enregistrées** | ~25 fichiers audio générés sur Mac (`say -v Thomas`, même voix Apple que sur iPhone) : décomptes, « Prépare-toi », « Go », consignes matériel, « Séance terminée ». Joués en WebAudio → canal `playback`. Les noms d'exercices restent en `speechSynthesis`. | ❌ muets (on entend « Prépare-toi, prochain exercice… » puis rien) | aucune | ~1-2 h |
| **B. TTS dans le navigateur (Piper WASM)** | Synthèse neuronale hors-ligne, voix FR, rendue en WebAudio. | ✅ | aucune, mais ~60 Mo de modèle à télécharger la 1re fois, perf incertaine sur iPhone | ½ journée + risque |
| **C. TTS cloud via mini-backend** | Cloudflare Worker (~50 lignes) → Google Cloud TTS ou OpenAI TTS, cache KV par phrase. Au clic **Démarrer**, le player pré-synthétise toute la timeline (~30 phrases distinctes, quasi toutes en cache dès la 2e séance) puis joue en WebAudio. `speechSynthesis` reste en fallback sans réseau. | ✅ | compte Cloudflare (gratuit) + clé TTS (Google : 1 M car./mois gratuits) | ~2-3 h |

Reco si on y va : **C** — seule option qui garde l'intérêt réel de la voix
(savoir quel exercice arrive sans regarder l'écran) sans embarquer 60 Mo sur le
téléphone ; le Worker est aussi la brique backend envisagée pour le sync
multi-devices du calendrier. A est un socle réutilisable pour C (les phrases
fixes n'auraient plus besoin du réseau).

## Maintenance

- `README.md` est mis à jour à chaque changement fonctionnel visible utilisateur.
- Historique des changements dans `CHANGELOG.md`.
- À chaque modification livrée, incrémenter `APP_VERSION` dans `script.js` (SemVer: `major.minor.patch`).

## Roadmap

- Ajouter les prochaines séances run + renfo (C1S2, …) dans `sessions-library.js`
- Parser plus tolérant sur des formats coach variés
- Sauvegarde locale de séances favorites
- Historique simple des séances réalisées
- Paramètres personnalisables (durée du pré-départ, timing d'annonce)

## Licence

Projet privé pour usage personnel (challenge 0 to 100).
