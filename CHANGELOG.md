# Changelog

Toutes les évolutions notables du projet sont documentées ici.

## [1.19.0] - 2026-09-15

### Ajouté
- **Séance intégrée C1S6 du 03/10/26 — Course I2/I3, fentes arrière et équilibre.** Sans échauffement : 5 min I1, puis **4 / 5 / 6 tours** (option, défaut 5 = 45 min) de 3 min I2 → 30 s fente arrière gauche + 30 s droite (tempo 1-0-1-0) → 3 min I3 → 30 s équilibre pied gauche + 30 s pied droit, genou levé.
- Moteur : `rounds: { option }` — nombre de tours choisi par l'utilisateur.

## [1.18.0] - 2026-09-15

### Ajouté
- **Séance intégrée C1S5 du 30/09/26 — Gammes, fentes marchées et cadence (≈ 60 min).** Préparation à la maison 14 min (équilibre genou levé + cadence des bras, mobilité hanches / tronc et rotations), course libre 10/12/15 min, **gammes simples** (3 passages talons-fesses / montées de genoux / course arrière, 30 m + retour trotté), puis **2 blocs de ~12 min** séparés de 2 min de récup : boucles de 30 s chaise → 30 m de gammes (genoux / talons-fesses / schtroumpf en rotation) → 30 fentes marchées → 30 m course en cadence I2 → retour trotté au départ. Retour au calme 5 / 7 / 10 min.
- **Steps « à ton rythme » (`estimated`).** Les éléments définis en distance ou en répétitions (30 m, 30 fentes) ne sont pas chronométrables pour tout le monde, et un décompte qui tombe trop tôt met en stress. Sur ces steps : pas de décompte final, annonce sans durée, chrono affiché avec `~` et pastille « À ton rythme », et le step suivant s'introduit par « Quand tu as fini » (ou une formule dédiée : « Quand tu es revenu au départ »). Le retour trotté, libre par nature, absorbe l'écart entre coureurs.
- **Option « Rythme » par séance** (Tranquille ×1,25 / Normal / Rapide ×0,8), mémorisée : multiplie les durées estimées. Le nombre de boucles d'un bloc défini par une durée (`rounds: { target }`) se recalcule pour rester proche de la durée du coach : 3 boucles en tranquille et normal, 4 en rapide.
- Moteur : step `kind: "rest"` (récup passive entre deux blocs, avec « Prépare-toi » avant la reprise).

## [1.17.0] - 2026-09-15

### Ajouté
- **Séance intégrée C1S4 du 27/09/26 — Course I2/I3 + renfo isométrique (42 min).** Sans échauffement. 3 blocs de 14 min : 4 min 15 course I2 → 45 s chaise → 4 min 15 course I2 → 45 s planche → 3 min 15 course I3 → 45 s fentes statiques (20 s G, 5 s changement, 20 s D).
- Moteur : **mini-transition dans un groupe** (`transition: true`, ex. « Changement de jambe » 5 s : consigne courte, 3-2-1, « Go ! » sur le step suivant) et **`roundLabel`** pour annoncer « Bloc 2 » plutôt que « Tour 2 » quand le coach parle de blocs.

## [1.16.0] - 2026-09-15

### Ajouté
- **Séance intégrée C1S3 du 23/09/26 — Run + renfo isométrique, modération d'impact.** Préparation à la maison 14 min (cadence 3 min, étirements actifs 3 × 1 min 40, équilibre 3 min avec cadence des bras, **mobilité hanches / tronc 2 × 1 min 30**), course libre 10/12/15 min, puis **12 tours** (31 min 20) de renfo en rotation — fentes statiques 20 s D + 20 s G → planche 30 s → mollets statiques 20 s G + 20 s D — suivi de 2 min de course en I2 découpée en 30 s cadence → 30 s libre → 30 s le moins de bruit possible → 30 s libre. Retour au calme 5 min.
- Compilateur : un item de tour peut être un **groupe** (`steps`, fixe) ou des **variantes par tour** (`variants`, modulo) — nécessaire quand le renfo n'a pas la même durée selon le tour.
- Le sélecteur trie les séances par date.

## [1.15.4] - 2026-09-15

### Modifié
- Le sélecteur affiche la date de chaque séance du plan : « C1S1 du 15/09/26 — … », « C1S2 du 19/09/26 — … » (champ `date` dans la bibliothèque).

## [1.15.3] - 2026-09-15

### Corrigé
- **L'intro du corps de séance mangeait la moitié de la première chaise.** Le rappel d'allure (~9 s de parole) était dit avant « Tour 1. Chaise à 90 degrés » sur un step de 20 s. Désormais l'intro d'un bloc est énoncée **en avance, pendant la fin du step précédent** quand il est assez long (à T-26, avant le « Prépare-toi » de T-11 et le décompte). Si le step précédent est trop court, on annonce d'abord l'action, l'intro vient après.
- Intros C1S1 / C1S2 raccourcies.

## [1.15.2] - 2026-09-15

### Modifié
- Bloc **Musique** aligné sur la carte principale : les sélecteurs Genre et « Écouter sur » passent en champs pleine largeur empilés (le second débordait de la carte sur desktop).

## [1.15.1] - 2026-09-15

### Corrigé
- **« Étirements actifs : mollets » était annoncé « É, 1 minute 40 ».** La voix ne garde que le bloc en majuscules d'un nom d'exercice (« CRUNCH Pieds au sol » → « CRUNCH ») ; sans le flag `u`, `\b` ne considère pas « É » comme une lettre et coupait après la majuscule accentuée. Le bloc doit désormais être suivi d'une espace, d'une ponctuation ou de la fin du nom. Par sécurité, tous les steps des séances intégrées portent leur libellé parlé explicite (`spoken` = nom par défaut) et ne passent plus par ce découpage.

## [1.15.0] - 2026-09-15

### Ajouté
- **Séance intégrée C1S2 — Course + renfo isométrique (45 min).** Séance complète telle que fournie, sans échauffement : 9 tours de 4 min de course + 30 s + 30 s de renfo. Tours impairs en I1 (demi-squat statique puis planche ventrale), tours pairs en I2 (planche puis demi-squat). Un tour = 5 min, 9 tours = 45 min pile. « Prépare-toi. Ensuite : … » à T-11 de chaque course.
- Champ `label` sur les items d'un tour dont le nom tourne : le plan affiche « course (I1 tours impairs / I2 tours pairs) » plutôt qu'un « renfo (…) » générique.

## [1.14.1] - 2026-09-15

### Modifié
- **Carte « Session Player » remise à plat.** Sur desktop la carte ne fait que ~350 px et le rang « boutons à gauche, réglages à droite » ne tenait pas (select « Séance » qui débordait, libellés sur trois lignes). Tout est désormais vertical et pleine largeur : champ « Séance » (et ses options) avec libellé en petites capitales, textarea puis deux boutons empilés en mode Nolio, et un bloc **Réglages** en liste (libellé à gauche, contrôle à droite : alertes vocales, voix, métronome). Même rendu mobile et desktop. Aucun changement de logique.

## [1.14.0] - 2026-09-15

### Ajouté
- **Séances intégrées.** Nouveau sélecteur « Séance » au-dessus du collage Nolio : les séances décrites dans `sessions-library.js` sont disponibles pour tous, sans rien coller. Le choix est mémorisé. Première séance : **C1S1 — Run + renfo isométrique** (préparation à la maison : cadence 3 min par slots de 20 s, étirements actifs 3 × 1 min 40, équilibre 3 min ; course libre ; 13 tours de 20 s renfo en rotation chaise → planche → équilibre G → équilibre D + 30 s course en cadence + 1 min 30 libre ; retour au calme 5 min).
  - Ces séances ne passent pas par le parser : leur structure (cycles imbriqués, tours définis par une durée totale, pause pour sortir) est décrite en déclaratif et compilée en timeline. Ajouter une séance = ajouter un objet dans `SESSION_LIBRARY`.
  - **Options de séance** : C1S1 propose la durée de la course libre (10 / 12 / 15 min), choix mémorisé.
  - **Checkpoint** : nouveau type de step qui met le player en pause avec une consigne (« Sors, et appuie sur Démarrer dès que tu es dehors ») ; la reprise se fait sur Démarrer.
  - **Intro de bloc** dite une seule fois (rappel d'allure I1 → I2 à l'entrée du corps de séance) ; « Tour N » n'est annoncé qu'au premier step de chaque tour, pas à chaque sous-step.
  - Un step de course long prévient à T-11 de ce qui suit (« Prépare-toi. Ensuite : planche ventrale »), pour savoir où s'arrêter.
- **Métronome de cadence** (case à cocher, 180 BPM, désactivé par défaut) : clics WebAudio pendant les steps « en cadence » des séances intégrées. Planifié 1,5 s en avance sur l'horloge audio pour survivre au ralentissement des timers en arrière-plan ; s'arrête en pause / reset / step non cadencé.

### Modifié
- Les durées du plan s'affichent en « 58 min 20 » plutôt qu'en secondes au-delà d'une minute ; la durée totale de la séance figure dans l'en-tête du plan pour les séances en blocs.

## [1.13.0] - 2026-09-09

### Corrigé
- **Plus aucun son sur iPhone en mode silencieux.** Le player joue ses bips en WebAudio, que WebKit range dans la catégorie audio « ambient » — celle que l'interrupteur Sonnerie/Silencieux coupe. Le comportement a changé côté iOS : la même séance sonnait auparavant téléphone en mode silence. Constaté sur Safari **et** Chrome iOS, qui partagent le moteur WebKit.
  - La page se déclare désormais en session audio `playback` via l'**AudioSession API** (`navigator.audioSession.type`), la catégorie de YouTube/Spotify, qui ignore l'interrupteur. Seul Safari l'implémente à ce jour.
  - Fallback pour les versions d'iOS sans cette API : un `<audio>` quasi silencieux joué en boucle (WAV mono 8 kHz d'amplitude 1/32767, généré à la volée — aucun fichier ajouté au repo), qui force la sortie WebAudio sur le canal média. Amplitude non nulle volontairement : iOS relâche la session audio quand le flux ne porte rien.
  - ⚠️ Les deux leviers traitent les **bips**. La **voix** passe par le TTS système (`speechSynthesis`) et rien côté web ne permet de forcer sa catégorie : à vérifier à l'usage en mode silence.
- **Le son ne revenait jamais après une mise en veille de l'écran.** iOS suspend (voire « interrompt ») l'`AudioContext` dès que la page passe en arrière-plan et ne le relance pas seul ; `visibilitychange` ne rétablissait que le Wake Lock. Un simple verrouillage d'écran en pleine séance coupait donc le son jusqu'à la fin. L'audio est désormais repris au retour au premier plan, quand une séance tourne ou est en pause.
- **Bips muets sur contexte suspendu.** `ctx.resume()` est asynchrone : `beep()` montait son oscillateur sans attendre la reprise. Le resume est maintenant attendu avant de produire le bip.

## [1.12.1] - 2026-07-22

### Corrigé
- La récup du tout dernier exercice de la séance était systématiquement supprimée. C'est le comportement voulu pour une récup passive (inutile de se reposer une fois la séance finie), mais pas pour une récup **active** : la corde à sauter est du travail et fait partie de la séance. Elle est désormais conservée, avec sa transition d'entrée — sans transition de sortie puisque rien ne suit.
- Garde-fou associé : sur le dernier step, la transition de sortie visait `data.exercises[0]` du tour `rounds + 1`, qui n'existe pas.

### Modifié
- Consigne de transition rendue générique : « Pose ton matériel et attrape ta corde à sauter » / « Repose ta corde et reprends ton matériel ». La version 1.12.0 mentionnait l'élastique en le déduisant du nom de l'exercice — heuristique intenable : « BEAR TAPE MAIN » en demande un sans le dire, « MONTER SUR POINTE DE PIED SUR MARCHE » n'en demande pas. Le texte Nolio ne porte pas l'information matériel ; la formulation générique est toujours juste et ne demande aucun réglage.

## [1.12.0] - 2026-07-21

### Ajouté
- **Steps de transition autour des récups actives** (8 s) : changer de matériel entre un exercice à l'élastique et la corde à sauter prend du temps, il est désormais réservé au lieu d'être pris sur la récup. Pastille violette « Transition », écran `Transition → Corde à sauter`.
- Consigne parlée au début de la transition — « Enlève ton élastique et attrape ta corde à sauter. » à l'aller, « Repose ta corde et reprends ton élastique. » au retour — puis décompte 3-2-1 et « Go ! » au lancement du step suivant.
- L'élastique n'est mentionné que si les exercices de la séance en utilisent réellement (détecté sur les noms d'exercices) ; sinon la consigne se limite à la corde.
- Pas de transition de sortie quand une récup suit immédiatement (fin de tour) : la récup inter-tours laisse déjà le temps. C'est elle qui porte alors la consigne « Repose ta corde et reprends ton élastique ».
- Le plan indique « 8s de transition autour des récups actives ».

### Note
- Durée de transition fixée à 8 s et non 5 : la consigne parlée dure ~3 s et le décompte 3-2-1 la couperait (`speak()` interrompt l'énoncé en cours). Constante `TRANSITION_SECONDS`.

## [1.11.0] - 2026-07-21

### Corrigé
- `1'` (apostrophe droite du clavier, U+0027) était interprété comme 1 **seconde** au lieu de 1 minute : la normalisation des apostrophes couvrait les variantes typographiques mais pas l'ASCII. La récup inter-tours `1' ENTRE LES TOURS` durait donc 1 seconde.
- Le player annonçait et décomptait le prochain **exercice** pendant la récup précédant la récup inter-tours : `nextExerciseName()` sautait les steps de repos. Résultat : « Prépare-toi, prochain exercice… », phase orange et décompte 5-4-3-2-1, puis c'est une minute de repos qui démarrait. Le player lit désormais le step réellement suivant (`upcomingStep()`) ; le rituel de lancement ne se déclenche que si un exercice suit vraiment.
- Format tabulé (exercice + durée + récup sur une même ligne) : l'exercice en attente sans récup était écrasé au lieu d'être enregistré, et la position du 2e token était cherchée avec `indexOf` — donc fausse quand les deux durées sont identiques (`30s … 30s`).

### Ajouté
- Récups actives : `30s corde à sauté` est distingué de `30s récup`. Le step s'affiche « Corde à sauter » avec une pastille verte « Actif » (au lieu du bleu « Récup »), est annoncé par la voix sous son nom, et apparaît dans le plan de séance.
- L'écran « Ensuite » affiche le step réel avec sa durée, récup comprise (ex : « Ensuite: Récup inter-tours (1 min) »).
- La récup inter-tours s'affiche « Récup inter-tours — avant tour N+1 ».
- Durées annoncées en minutes quand c'est plus naturel (« une minute » au lieu de « 60 secondes »).

## [1.10.0] - 2026-06-07

### Ajouté
- Support du format Nolio "RÉCUP OU CORDE" : `30s récup` et `30s corde à sauté` reconnus comme durée de repos (et non comme nom d'exercice).
- Récupération inter-tours : `1' ENTRE LES TOURS` parsé et injecté comme step dédié dans la timeline entre chaque tour.
- Exercice sans repos explicite (ex : SQUAT ÉLASTIQUE enchaîné sur SQUAT LATÉRAL) géré correctement (rest=0).

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
