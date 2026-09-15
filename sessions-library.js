// Bibliothèque de séances intégrées 0 to 100.
//
// Ces séances ne passent pas par le parser Nolio : leur structure (cycles de
// 20 s dans un bloc de 3 min, tours définis par une durée totale, pause pour
// sortir de la maison…) est trop imbriquée pour être devinée depuis du texte.
// On les décrit ici en déclaratif, et compileLibrarySession() en sort la
// timeline que le player joue. Ajouter une séance = ajouter un objet dans
// SESSION_LIBRARY.
//
// Vocabulaire d'un bloc :
//   - steps  : liste de steps joués une fois (kind: "step" | "cycle" |
//              "sequence" | "checkpoint")
//   - rounds + round : les steps de `round` sont répétés `rounds` fois
//
// Kinds :
// Chaque séance porte `date` (jour du plan d'entraînement, affiché dans le sélecteur).
//   - step       : { name, seconds | secondsFrom: <clé d'option>, cadence?, spoken?, announceNext? }
//   - cycle      : { name, total, slot, items: [nom | {name, cadence}] }
//                  → enchaîne les items par slots de `slot` s jusqu'à `total`
//                    (le dernier cycle peut rester incomplet, c'est voulu :
//                    on suit la durée du bloc, pas le nombre d'items)
//   - sequence   : { items: [{ name, seconds, cadence? }] }
//   - checkpoint : { name, instruction } → le player se met en pause, la
//                  reprise se fait sur Démarrer
//
// Dans un `round`, `name` peut être un tableau : l'item tourne à chaque tour
// (tour 1 → [0], tour 2 → [1], …, modulo). `label` donne alors le libellé du plan.
// Un item de `round` peut aussi être un groupe : `steps: [...]` (fixe) ou
// `variants: [[...], [...]]` (le groupe change à chaque tour, modulo) — pour un
// renfo dont la durée dépend du tour. `label` obligatoire pour un libellé propre.
// Dans un groupe, `{ transition: true, name, seconds }` = mini-transition
// (consigne courte + 3-2-1 + « Go ! » sur le step suivant).
// `roundLabel` sur un bloc à tours : mot annoncé à la place de « Tour » (ex. « Bloc »).
//
// `cadence: true` : le métronome (si activé) tourne pendant ce step.
// `estimated: true` : durée estimée (distance ou répétitions, pas un chrono du
// coach). Le player n'y fait pas de décompte final, annonce le step sans sa durée
// et introduit le suivant par « Quand tu as fini » (`doneCue` pour une formule
// dédiée). Si la séance a une option `pace`, sa valeur multiplie ces durées.
// `rounds` peut être `{ target: <s> }` : nombre de tours = arrondi(target / durée
// d'un tour), calculé après application du rythme — le bloc garde ~la durée du coach ;
// ou `{ option: <clé> }` : nombre de tours choisi par l'utilisateur (option de la séance).
// `restBetweenRounds: <s>` sur un bloc à tours : récup passive entre les tours.
// `sayDuration: false` sur un step : la voix n'énonce pas la durée (intervalles courts répétés).
// `kind: "rest"` : récup passive (type "rest" du player, « Prépare-toi » avant le step suivant).
// `intro` (sur un bloc, ou sur le premier step d'un cycle/sequence) : phrase
// dite une seule fois à l'entrée, avant l'annonce du step.

const SESSION_LIBRARY = [
  {
    id: "C1S1",
    date: "15/09/26",
    title: "C1S1 — Run + renfo isométrique",
    subtitle: "≈ 60 min · préparation à la maison, corps de séance en course",
    advice:
      "Allure de course : commencer facile en I1, puis I2 max au fil des tours, progressivement.",
    options: [
      {
        key: "freeRun",
        label: "Course libre (échauffement)",
        default: 720,
        choices: [
          { value: 600, label: "10 min" },
          { value: 720, label: "12 min" },
          { value: 900, label: "15 min" },
        ],
      },
    ],
    blocks: [
      {
        name: "Préparation (à la maison)",
        steps: [
          {
            kind: "cycle",
            name: "Cadence",
            total: 180,
            slot: 20,
            cadence: true,
            intro: "Cadence, 3 minutes, à 180 battements par minute. Alterne toutes les 20 secondes.",
            items: [
              "Mouvements de bras sans courir",
              "Stepper",
              "Marche",
              "Course sur place",
            ],
          },
          {
            kind: "sequence",
            name: "Étirements actifs",
            intro: "Étirements actifs, 5 minutes.",
            items: [
              { name: "Étirements actifs : mollets", seconds: 100 },
              { name: "Étirements actifs : quadriceps", seconds: 100 },
              { name: "Étirements actifs : chaîne postérieure", seconds: 100 },
            ],
          },
          {
            kind: "cycle",
            name: "Équilibre",
            total: 180,
            slot: 20,
            intro: "Équilibre sur un pied, 3 minutes.",
            items: [
              { name: "Équilibre pied gauche, genou droit levé" },
              { name: "Équilibre pied droit, genou gauche levé" },
              { name: "Course sur place en cadence", cadence: true },
            ],
          },
          {
            kind: "checkpoint",
            name: "Sortie",
            instruction:
              "Préparation terminée. Sors, et appuie sur Démarrer dès que tu es dehors.",
          },
        ],
      },
      {
        name: "Course libre",
        steps: [
          {
            kind: "step",
            name: "Course libre, très facile (I1)",
            spoken: "Course libre, très très facile, intensité 1",
            secondsFrom: "freeRun",
            announceNext: true,
          },
        ],
      },
      {
        name: "Corps de séance",
        rounds: 13,
        intro:
          "Corps de séance, 13 tours. Allure facile en intensité 1 au début, jusqu'à intensité 2 sur les derniers tours.",
        round: [
          {
            name: [
              "Chaise à 90°",
              "Planche ventrale",
              "Équilibre pied gauche, genou droit levé",
              "Équilibre pied droit, genou gauche levé",
            ],
            spoken: [
              "Chaise à 90 degrés",
              "Planche ventrale",
              "Équilibre pied gauche, genou droit levé",
              "Équilibre pied droit, genou gauche levé",
            ],
            label: "renfo (chaise → planche → équilibre G → équilibre D, en rotation)",
            seconds: 20,
          },
          { name: "Course en cadence (170-190)", spoken: "Course en cadence", seconds: 30, cadence: true },
          { name: "Course libre", seconds: 90, announceNext: true },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile", seconds: 300 },
        ],
      },
    ],
  },
  {
    id: "C1S3",
    date: "23/09/26",
    title: "C1S3 — Run + renfo isométrique, modération d'impact",
    subtitle: "≈ 60 min · préparation à la maison, corps de séance en course I2",
    advice:
      "Course en I2 sur tout le corps de séance. Chaque course de 2 min : 30 s en cadence, 30 s libre, 30 s le moins de bruit possible, 30 s libre.",
    options: [
      {
        key: "freeRun",
        label: "Course libre (échauffement)",
        default: 720,
        choices: [
          { value: 600, label: "10 min" },
          { value: 720, label: "12 min" },
          { value: 900, label: "15 min" },
        ],
      },
    ],
    blocks: [
      {
        name: "Préparation (à la maison)",
        steps: [
          {
            kind: "cycle",
            name: "Cadence",
            total: 180,
            slot: 20,
            cadence: true,
            intro: "Cadence, 3 minutes, à 180 battements par minute. Alterne toutes les 20 secondes.",
            items: [
              "Mouvements de bras sans courir",
              "Stepper",
              "Marche",
              "Course sur place",
            ],
          },
          {
            kind: "sequence",
            name: "Étirements actifs",
            intro: "Étirements actifs, 5 minutes.",
            items: [
              { name: "Étirements actifs : mollets", seconds: 100 },
              { name: "Étirements actifs : quadriceps", seconds: 100 },
              { name: "Étirements actifs : chaîne postérieure", seconds: 100 },
            ],
          },
          {
            kind: "cycle",
            name: "Équilibre",
            total: 180,
            slot: 20,
            intro: "Équilibre sur un pied avec cadence des bras, 3 minutes.",
            items: [
              { name: "Équilibre pied gauche, cadence des bras" },
              { name: "Équilibre pied droit, cadence des bras" },
              { name: "Course sur place en cadence", cadence: true },
            ],
          },
          {
            kind: "sequence",
            name: "Mobilité",
            intro: "Mobilité, 3 minutes.",
            items: [
              { name: "Mobilité : hanches", seconds: 90 },
              { name: "Mobilité : tronc", seconds: 90 },
            ],
          },
          {
            kind: "checkpoint",
            name: "Sortie",
            instruction:
              "Préparation terminée. Sors, et appuie sur Démarrer dès que tu es dehors.",
          },
        ],
      },
      {
        name: "Course libre",
        steps: [
          {
            kind: "step",
            name: "Course libre, très facile (I1)",
            spoken: "Course libre, très facile, intensité 1",
            secondsFrom: "freeRun",
            announceNext: true,
          },
        ],
      },
      {
        name: "Corps de séance",
        rounds: 12,
        intro:
          "Corps de séance, 12 tours, course en intensité 2. Un renfo, puis 2 minutes de course : 30 secondes en cadence, 30 libre, 30 le moins de bruit possible, 30 libre.",
        round: [
          {
            label: "renfo en rotation (fentes statiques 20 s D + 20 s G → planche 30 s → mollets 20 s G + 20 s D)",
            variants: [
              [
                { name: "Fentes statiques, jambe droite", seconds: 20 },
                { name: "Fentes statiques, jambe gauche", seconds: 20 },
              ],
              [{ name: "Planche ventrale", seconds: 30 }],
              [
                { name: "Mollet statique gauche", spoken: "Mollet statique gauche, sur la pointe du pied", seconds: 20 },
                { name: "Mollet statique droit", spoken: "Mollet statique droit, sur la pointe du pied", seconds: 20 },
              ],
            ],
          },
          {
            label: "course 2 min I2 (30 s cadence → 30 s libre → 30 s sans bruit → 30 s libre)",
            steps: [
              { name: "Course en cadence (170-190)", spoken: "Course en cadence", seconds: 30, cadence: true },
              { name: "Course libre (I2)", spoken: "Course libre", seconds: 30 },
              { name: "Course silencieuse (moins de bruit possible)", spoken: "Course silencieuse, le moins de bruit possible", seconds: 30 },
              { name: "Course libre (I2)", spoken: "Course libre", seconds: 30, announceNext: true },
            ],
          },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Séance complète telle que fournie : pas d'échauffement, on part sur 4' de course.
    id: "C1S2",
    date: "19/09/26",
    title: "C1S2 — Course + renfo isométrique",
    subtitle: "45 min · 9 tours de 4 min course + 1 min renfo, intensité I1 / I2 en alternance",
    advice:
      "Alterner 4 min de course et 1 min de renfo isométrique. Tours impairs en I1 (demi-squat puis planche), tours pairs en I2 (planche puis demi-squat).",
    blocks: [
      {
        name: "Corps de séance",
        rounds: 9,
        intro:
          "Corps de séance, 9 tours. 4 minutes de course puis 1 minute de renfo. Intensité 1 sur les tours impairs, intensité 2 sur les tours pairs.",
        round: [
          {
            name: ["Course, intensité I1", "Course, intensité I2"],
            spoken: ["Course, intensité 1", "Course, intensité 2"],
            label: "course (I1 tours impairs / I2 tours pairs)",
            seconds: 240,
            announceNext: true,
          },
          {
            name: ["Demi-squat statique", "Planche ventrale"],
            label: "demi-squat / planche",
            seconds: 30,
          },
          {
            name: ["Planche ventrale", "Demi-squat statique"],
            label: "planche / demi-squat",
            seconds: 30,
          },
        ],
      },
    ],
  },
  {
    // Séance complète telle que fournie : pas d'échauffement, on part sur 4'15 de course.
    id: "C1S4",
    date: "27/09/26",
    title: "C1S4 — Course I2/I3 + renfo isométrique",
    subtitle: "42 min · 3 blocs de 14 min : 3 courses (I2, I2, I3) coupées de 45 s de renfo",
    advice:
      "3 fois le bloc : 4 min 15 course I2 → 45 s chaise → 4 min 15 course I2 → 45 s planche → 3 min 15 course I3 → 45 s fentes statiques (20 s G, 5 s changement, 20 s D).",
    blocks: [
      {
        name: "Corps de séance",
        rounds: 3,
        roundLabel: "Bloc",
        intro:
          "Corps de séance, 3 blocs de 14 minutes. Deux courses en intensité 2, puis une en intensité 3, avec 45 secondes de renfo après chaque course.",
        round: [
          { name: "Course, intensité I2", spoken: "Course, intensité 2", seconds: 255, announceNext: true },
          { name: "Chaise", spoken: "Chaise", seconds: 45 },
          { name: "Course, intensité I2", spoken: "Course, intensité 2", seconds: 255, announceNext: true },
          { name: "Planche ventrale", seconds: 45 },
          { name: "Course, intensité I3", spoken: "Course, intensité 3", seconds: 195, announceNext: true },
          {
            label: "45 s fentes statiques (20 s G, 5 s changement, 20 s D)",
            steps: [
              { name: "Fentes statiques, jambe gauche", seconds: 20 },
              { transition: true, name: "Changement de jambe", seconds: 5 },
              { name: "Fentes statiques, jambe droite", seconds: 20 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "C1S5",
    date: "30/09/26",
    title: "C1S5 — Gammes, fentes marchées et cadence",
    subtitle: "≈ 65 min · préparation à la maison, gammes, 2 blocs de boucles en course",
    advice:
      "Gammes et fentes sont estimées en temps : pas de décompte, chacun finit à son rythme et enchaîne. Le retour trotté au départ absorbe l'écart. Règle ton rythme si ça va trop vite ou trop lentement.",
    options: [
      {
        key: "freeRun",
        label: "Course libre (échauffement)",
        default: 720,
        choices: [
          { value: 600, label: "10 min" },
          { value: 720, label: "12 min" },
          { value: 900, label: "15 min" },
        ],
      },
      {
        key: "pace",
        label: "Rythme sur gammes et fentes",
        default: 1,
        choices: [
          { value: 1.25, label: "Tranquille" },
          { value: 1, label: "Normal" },
          { value: 0.8, label: "Rapide" },
        ],
      },
      {
        key: "coolDown",
        label: "Retour au calme",
        default: 300,
        choices: [
          { value: 300, label: "5 min" },
          { value: 420, label: "7 min" },
          { value: 600, label: "10 min" },
        ],
      },
    ],
    blocks: [
      {
        name: "Préparation (à la maison)",
        steps: [
          {
            kind: "cycle",
            name: "Cadence",
            total: 180,
            slot: 20,
            cadence: true,
            intro: "Cadence, 3 minutes, à 180 battements par minute. Alterne toutes les 20 secondes.",
            items: [
              "Mouvements de bras sans courir",
              "Stepper",
              "Marche",
              "Course sur place",
            ],
          },
          {
            kind: "sequence",
            name: "Étirements actifs",
            intro: "Étirements actifs, 5 minutes.",
            items: [
              { name: "Étirements actifs : mollets", seconds: 100 },
              { name: "Étirements actifs : quadriceps", seconds: 100 },
              { name: "Étirements actifs : chaîne postérieure", seconds: 100 },
            ],
          },
          {
            kind: "cycle",
            name: "Équilibre",
            total: 180,
            slot: 20,
            intro: "Équilibre sur un pied, genou de la jambe libre levé, avec cadence des bras. 3 minutes.",
            items: [
              { name: "Équilibre pied gauche, genou levé, cadence des bras" },
              { name: "Équilibre pied droit, genou levé, cadence des bras" },
              { name: "Course sur place en cadence", cadence: true },
            ],
          },
          {
            kind: "sequence",
            name: "Mobilité",
            intro: "Mobilité, 3 minutes.",
            items: [
              { name: "Mobilité : hanches", seconds: 90 },
              { name: "Mobilité : tronc et rotations articulaires", seconds: 90 },
            ],
          },
          {
            kind: "checkpoint",
            name: "Sortie",
            instruction:
              "Préparation terminée. Sors, et appuie sur Démarrer dès que tu es dehors.",
          },
        ],
      },
      {
        name: "Course libre",
        steps: [
          {
            kind: "step",
            name: "Course libre, très facile (I1)",
            spoken: "Course libre, très facile, intensité 1",
            secondsFrom: "freeRun",
            announceNext: true,
          },
        ],
      },
      {
        name: "Gammes simples",
        rounds: 3,
        roundLabel: "Passage",
        intro:
          "Gammes simples, 3 passages de 30 mètres, retour en trottant. Peu de vitesse de déplacement, beaucoup de cadence.",
        round: [
          {
            label: "talons-fesses 30 m + retour trotté",
            steps: [
              { name: "Talons-fesses, 30 m", spoken: "Talons-fesses, 30 mètres", seconds: 15, estimated: true },
              { name: "Retour en trottant", seconds: 20, estimated: true, doneCue: "Quand tu es revenu" },
            ],
          },
          {
            label: "montées de genoux 30 m + retour trotté",
            steps: [
              { name: "Montées de genoux, 30 m", spoken: "Montées de genoux, 30 mètres", seconds: 15, estimated: true },
              { name: "Retour en trottant", seconds: 20, estimated: true, doneCue: "Quand tu es revenu" },
            ],
          },
          {
            label: "course arrière 30 m + retour trotté",
            steps: [
              { name: "Course arrière, 30 m", spoken: "Course arrière, 30 mètres", seconds: 15, estimated: true },
              { name: "Retour en trottant", seconds: 20, estimated: true, doneCue: "Quand tu es revenu" },
            ],
          },
        ],
      },
      {
        name: "Corps de séance — bloc 1",
        rounds: { target: 720 },
        roundLabel: "Boucle",
        intro:
          "Corps de séance, bloc 1 sur 2, environ 12 minutes. À chaque boucle : chaise, 30 mètres de gammes, 30 fentes marchées, 30 mètres de course en cadence, puis retour au départ en trottant.",
        round: [
          { name: "Chaise", seconds: 30 },
          {
            label: "30 m de gammes (montées de genoux / talons-fesses / schtroumpf)",
            variants: [
              [{ name: "Montées de genoux, 30 m", spoken: "Montées de genoux, 30 mètres", seconds: 15, estimated: true }],
              [{ name: "Talons-fesses, 30 m", spoken: "Talons-fesses, 30 mètres", seconds: 15, estimated: true }],
              [{ name: "Schtroumpf, 30 m", spoken: "Schtroumpf, 30 mètres", seconds: 15, estimated: true }],
            ],
          },
          { name: "30 fentes marchées", spoken: "30 fentes marchées", seconds: 90, estimated: true, doneCue: "Quand tu as fini tes fentes" },
          { name: "Course en cadence 30 m (I2)", spoken: "30 mètres de course en cadence, facile", seconds: 12, cadence: true, estimated: true },
          { name: "Retour au départ en trottant (I2)", spoken: "Retour au point de départ en trottant", seconds: 60, estimated: true, doneCue: "Quand tu es revenu au départ" },
        ],
      },
      {
        name: "Récupération entre les blocs",
        steps: [{ kind: "rest", name: "Récupération", seconds: 120 }],
      },
      {
        name: "Corps de séance — bloc 2",
        rounds: { target: 720 },
        roundLabel: "Boucle",
        intro: "Bloc 2 sur 2, dernier bloc. Mêmes boucles.",
        round: [
          { name: "Chaise", seconds: 30 },
          {
            label: "30 m de gammes (montées de genoux / talons-fesses / schtroumpf)",
            variants: [
              [{ name: "Montées de genoux, 30 m", spoken: "Montées de genoux, 30 mètres", seconds: 15, estimated: true }],
              [{ name: "Talons-fesses, 30 m", spoken: "Talons-fesses, 30 mètres", seconds: 15, estimated: true }],
              [{ name: "Schtroumpf, 30 m", spoken: "Schtroumpf, 30 mètres", seconds: 15, estimated: true }],
            ],
          },
          { name: "30 fentes marchées", spoken: "30 fentes marchées", seconds: 90, estimated: true, doneCue: "Quand tu as fini tes fentes" },
          { name: "Course en cadence 30 m (I2)", spoken: "30 mètres de course en cadence, facile", seconds: 12, cadence: true, estimated: true },
          { name: "Retour au départ en trottant (I2)", spoken: "Retour au point de départ en trottant", seconds: 60, estimated: true, doneCue: "Quand tu es revenu au départ" },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile", secondsFrom: "coolDown" },
        ],
      },
    ],
  },
  {
    // Séance complète telle que fournie : pas d'échauffement, on part sur 5' de course.
    id: "C1S6",
    date: "03/10/26",
    title: "C1S6 — Course I2/I3, fentes arrière et équilibre",
    subtitle: "45 min · 5 min I1 puis 4 à 6 tours de 8 min (3 min I2, fentes, 3 min I3, équilibre)",
    advice:
      "5 min de course I1, puis 4 à 6 tours : 3 min I2 → 30 s fente arrière gauche + 30 s droite (tempo 1-0-1-0) → 3 min I3 → 30 s équilibre pied gauche + 30 s pied droit, genou de la jambe libre levé. 5 tours = 45 min.",
    options: [
      {
        key: "rounds",
        label: "Nombre de tours",
        default: 5,
        choices: [
          { value: 4, label: "4 tours (37 min)" },
          { value: 5, label: "5 tours (45 min)" },
          { value: 6, label: "6 tours (53 min)" },
        ],
      },
    ],
    blocks: [
      {
        name: "Mise en route",
        steps: [
          { kind: "step", name: "Course, intensité I1", spoken: "Course, intensité 1", seconds: 300, announceNext: true },
        ],
      },
      {
        name: "Corps de séance",
        rounds: { option: "rounds" },
        intro:
          "Corps de séance, tours de 8 minutes. 3 minutes en intensité 2, fentes arrière, 3 minutes en intensité 3, équilibre sur un pied.",
        round: [
          { name: "Course, intensité I2", spoken: "Course, intensité 2", seconds: 180, announceNext: true },
          {
            label: "30 s fente arrière G + 30 s D (tempo 1-0-1-0)",
            steps: [
              { name: "Fente arrière gauche (1-0-1-0)", spoken: "Fente arrière gauche, tempo un, zéro, un, zéro", seconds: 30 },
              { name: "Fente arrière droite (1-0-1-0)", spoken: "Fente arrière droite", seconds: 30 },
            ],
          },
          { name: "Course, intensité I3", spoken: "Course, intensité 3", seconds: 180, announceNext: true },
          {
            label: "30 s équilibre pied G + 30 s pied D, genou levé",
            steps: [
              { name: "Équilibre pied gauche, genou levé", spoken: "Équilibre pied gauche, genou de la jambe libre levé", seconds: 30 },
              { name: "Équilibre pied droit, genou levé", spoken: "Équilibre pied droit, genou levé", seconds: 30 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "C1S7",
    date: "06/10/26",
    title: "C1S7 — Renfo + EPIC 15-15",
    subtitle: "≈ 70 min · préparation à la maison, gammes, 2 à 4 blocs renfo + course EPIC 15-15",
    advice:
      "Renfo en répétitions, à ton rythme (squats, mountain climbers, mollets, 2 séries). EPIC 15-15 : 15 s lent I1-I2, 15 s plus rapide, de plus en plus vite sur les 4 min pour finir un peu au-dessus de I3.",
    options: [
      {
        key: "freeRun",
        label: "Course libre (échauffement)",
        default: 720,
        choices: [
          { value: 600, label: "10 min" },
          { value: 720, label: "12 min" },
          { value: 900, label: "15 min" },
        ],
      },
      {
        key: "pace",
        label: "Rythme sur gammes et renfo",
        default: 1,
        choices: [
          { value: 1.25, label: "Tranquille" },
          { value: 1, label: "Normal" },
          { value: 0.8, label: "Rapide" },
        ],
      },
      {
        key: "blocs",
        label: "Nombre de blocs",
        default: 4,
        choices: [
          { value: 2, label: "2 blocs (15 min)" },
          { value: 3, label: "3 blocs (23 min)" },
          { value: 4, label: "4 blocs (31 min)" },
        ],
      },
    ],
    blocks: [
      {
        name: "Préparation (à la maison)",
        steps: [
          {
            kind: "cycle",
            name: "Cadence",
            total: 180,
            slot: 20,
            cadence: true,
            intro: "Cadence, 3 minutes, à 180 battements par minute. Alterne toutes les 20 secondes.",
            items: [
              "Mouvements de bras sans courir",
              "Stepper",
              "Marche",
              "Course sur place",
            ],
          },
          {
            kind: "sequence",
            name: "Étirements actifs",
            intro: "Étirements actifs, 5 minutes.",
            items: [
              { name: "Étirements actifs : mollets", seconds: 100 },
              { name: "Étirements actifs : quadriceps", seconds: 100 },
              { name: "Étirements actifs : chaîne postérieure", seconds: 100 },
            ],
          },
          {
            kind: "cycle",
            name: "Équilibre",
            total: 180,
            slot: 30,
            intro: "Équilibre sur un pied, genou de la jambe libre levé. 3 minutes, 30 secondes par côté.",
            items: [
              { name: "Équilibre pied gauche, genou levé" },
              { name: "Équilibre pied droit, genou levé" },
            ],
          },
          {
            kind: "sequence",
            name: "Mobilité",
            intro: "Mobilité, 3 minutes.",
            items: [
              { name: "Mobilité : hanches", seconds: 60 },
              { name: "Mobilité : tronc", seconds: 60 },
              { name: "Étirements balistiques progressifs", seconds: 60 },
            ],
          },
          {
            kind: "sequence",
            name: "Mobilité pied-cheville",
            intro: "Mobilité du pied et de la cheville, 3 minutes.",
            items: [
              { name: "Mobilité pied-cheville : pied gauche", spoken: "Pied et cheville gauches", seconds: 90 },
              { name: "Mobilité pied-cheville : pied droit", spoken: "Pied et cheville droits", seconds: 90 },
            ],
          },
          {
            kind: "checkpoint",
            name: "Sortie",
            instruction:
              "Préparation terminée. Sors, et appuie sur Démarrer dès que tu es dehors.",
          },
        ],
      },
      {
        name: "Course libre",
        steps: [
          {
            kind: "step",
            name: "Course libre, très facile (I1)",
            spoken: "Course libre, très facile, intensité 1",
            secondsFrom: "freeRun",
            announceNext: true,
          },
        ],
      },
      {
        name: "Gammes simples",
        rounds: 3,
        roundLabel: "Passage",
        intro:
          "Gammes simples, 3 passages de 30 mètres, retour en trottant. Peu de vitesse de déplacement, beaucoup de cadence.",
        round: [
          {
            label: "talons-fesses 30 m + retour trotté",
            steps: [
              { name: "Talons-fesses, 30 m", spoken: "Talons-fesses, 30 mètres", seconds: 15, estimated: true },
              { name: "Retour en trottant", seconds: 20, estimated: true, doneCue: "Quand tu es revenu" },
            ],
          },
          {
            label: "montées de genoux 30 m + retour trotté",
            steps: [
              { name: "Montées de genoux, 30 m", spoken: "Montées de genoux, 30 mètres", seconds: 15, estimated: true },
              { name: "Retour en trottant", seconds: 20, estimated: true, doneCue: "Quand tu es revenu" },
            ],
          },
          {
            label: "course arrière 30 m + retour trotté",
            steps: [
              { name: "Course arrière, 30 m", spoken: "Course arrière, 30 mètres", seconds: 15, estimated: true },
              { name: "Retour en trottant", seconds: 20, estimated: true, doneCue: "Quand tu es revenu" },
            ],
          },
        ],
      },
      {
        name: "Corps de séance",
        rounds: { option: "blocs" },
        roundLabel: "Bloc",
        restBetweenRounds: 60,
        intro:
          "Corps de séance. Chaque bloc : renfo en 2 séries, squats, mountain climbers, mollets, puis 4 minutes de course EPIC 15-15, 15 secondes lent, 15 secondes plus rapide, de plus en plus vite.",
        round: [
          {
            label: "renfo ~3 min, 2 × (15 squats 1-0-1-0 · 30 mountain climbers · 10 paires de mollets)",
            steps: [
              { name: "15 squats (1-0-1-0)", spoken: "Série 1. 15 squats, tempo un, zéro, un, zéro", seconds: 30, estimated: true },
              { name: "30 mountain climbers", spoken: "30 mountain climbers", seconds: 30, estimated: true },
              { name: "10 paires de mollets", spoken: "10 paires de mollets", seconds: 30, estimated: true },
              { name: "15 squats (1-0-1-0) — série 2", spoken: "Série 2. 15 squats", seconds: 30, estimated: true },
              { name: "30 mountain climbers — série 2", spoken: "30 mountain climbers", seconds: 30, estimated: true },
              { name: "10 paires de mollets — série 2", spoken: "10 paires de mollets", seconds: 30, estimated: true, doneCue: "Quand tu as fini" },
            ],
          },
          {
            label: "4 min course EPIC 15-15 (8 × 15 s lent / 15 s plus rapide, progressif)",
            steps: [
              { name: "EPIC 1/8 — lent (I1-I2)", spoken: "Course EPIC, 4 minutes. Lent", seconds: 15, sayDuration: false },
              { name: "EPIC 1/8 — plus rapide", spoken: "Plus rapide", seconds: 15, sayDuration: false },
              { name: "EPIC 2/8 — lent", spoken: "Lent", seconds: 15, sayDuration: false },
              { name: "EPIC 2/8 — plus rapide", spoken: "Plus rapide", seconds: 15, sayDuration: false },
              { name: "EPIC 3/8 — lent", spoken: "Lent", seconds: 15, sayDuration: false },
              { name: "EPIC 3/8 — plus rapide", spoken: "Plus rapide", seconds: 15, sayDuration: false },
              { name: "EPIC 4/8 — lent", spoken: "Lent", seconds: 15, sayDuration: false },
              { name: "EPIC 4/8 — plus rapide", spoken: "Plus rapide, à mi-série", seconds: 15, sayDuration: false },
              { name: "EPIC 5/8 — lent", spoken: "Lent", seconds: 15, sayDuration: false },
              { name: "EPIC 5/8 — plus rapide", spoken: "Plus rapide", seconds: 15, sayDuration: false },
              { name: "EPIC 6/8 — lent", spoken: "Lent", seconds: 15, sayDuration: false },
              { name: "EPIC 6/8 — plus rapide", spoken: "Plus rapide", seconds: 15, sayDuration: false },
              { name: "EPIC 7/8 — lent", spoken: "Lent", seconds: 15, sayDuration: false },
              { name: "EPIC 7/8 — plus rapide", spoken: "Plus rapide", seconds: 15, sayDuration: false },
              { name: "EPIC 8/8 — lent", spoken: "Lent, dernier", seconds: 15, sayDuration: false },
              { name: "EPIC 8/8 — plus rapide (> I3)", spoken: "Plus rapide, au-dessus de I3", seconds: 15, sayDuration: false },
            ],
          },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Séance complète telle que fournie : pas d'échauffement à la maison.
    id: "C1S8",
    date: "09/10/26",
    title: "C1S8 — Course I2/I3, fentes arrière et climbers",
    subtitle: "≈ 60 min · 5 min I1, 6 à 7 tours de 8 min (renfo 1 min, 3 min I2, renfo 1 min, 3 min I3), 5 min I1",
    advice:
      "Renfo 1 min = 30 s fentes arrière gauche-droite (tempo 1-0-1-0) + 30 s climbers. Puis 3 min I2, renfo, 3 min I3. Retour au calme 5 min I1.",
    options: [
      {
        key: "rounds",
        label: "Nombre de tours",
        default: 6,
        choices: [
          { value: 6, label: "6 tours (58 min)" },
          { value: 7, label: "7 tours (66 min)" },
        ],
      },
    ],
    blocks: [
      {
        name: "Mise en route",
        steps: [
          { kind: "step", name: "Course, intensité I1", spoken: "Course, intensité 1", seconds: 300, announceNext: true },
        ],
      },
      {
        name: "Corps de séance",
        rounds: { option: "rounds" },
        intro:
          "Corps de séance, tours de 8 minutes. Une minute de renfo, 3 minutes en intensité 2, une minute de renfo, 3 minutes en intensité 3.",
        round: [
          {
            label: "1 min renfo (30 s fentes arrière G-D 1-0-1-0 + 30 s climbers)",
            steps: [
              { name: "Fentes arrière gauche-droite (1-0-1-0)", spoken: "Fentes arrière, gauche droite, tempo un, zéro, un, zéro", seconds: 30 },
              { name: "Climbers", seconds: 30 },
            ],
          },
          { name: "Course, intensité I2", spoken: "Course, intensité 2", seconds: 180, announceNext: true },
          {
            label: "1 min renfo (30 s fentes arrière G-D 1-0-1-0 + 30 s climbers)",
            steps: [
              { name: "Fentes arrière gauche-droite (1-0-1-0)", spoken: "Fentes arrière, gauche droite", seconds: 30 },
              { name: "Climbers", seconds: 30 },
            ],
          },
          { name: "Course, intensité I3", spoken: "Course, intensité 3", seconds: 180, announceNext: true },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course, intensité I1", spoken: "Retour au calme, course facile, intensité 1", seconds: 300 },
        ],
      },
    ],
  },
];

function librarySessionById(id) {
  return SESSION_LIBRARY.find((s) => s.id === id) || null;
}

// Valeurs d'options effectives : localStorage > défaut de la séance.
function librarySessionOptionValues(def, overrides = {}) {
  const values = {};
  (def.options || []).forEach((opt) => {
    const raw = overrides[opt.key];
    const allowed = opt.choices.map((c) => c.value);
    values[opt.key] = allowed.includes(Number(raw)) ? Number(raw) : opt.default;
  });
  return values;
}

function libraryFormatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (!m) return `${s} s`;
  return s ? `${m} min ${String(s).padStart(2, "0")}` : `${m} min`;
}

// Produit { title, advice, blocks (lignes du plan), timelineSteps, ... }
// dans le format que renderPlan / buildTimeline consomment.
function compileLibrarySession(def, optionOverrides = {}) {
  const options = librarySessionOptionValues(def, optionOverrides);
  const steps = [];
  const planLines = [];

  const pick = (value, round) =>
    Array.isArray(value) ? value[(round - 1) % value.length] : value;

  const push = (blockId, fields) => {
    steps.push({
      type: "work",
      round: 0,
      exIndex: steps.length,
      blockId,
      ...fields,
    });
  };

  const pace = options.pace || 1;
  const seconds = (item) => {
    const base = item.secondsFrom != null ? options[item.secondsFrom] : item.seconds;
    return item.estimated ? Math.max(5, Math.round(base * pace)) : base;
  };

  def.blocks.forEach((block, blockIndex) => {
    const blockId = blockIndex + 1;
    let blockSeconds = 0;
    const detail = [];
    let firstOfBlock = true;
    const introFor = (own) => {
      // L'intro du bloc part avec son premier step ; celle d'un cycle/sequence
      // avec le sien. Les deux peuvent se cumuler sur le tout premier step.
      const parts = [];
      if (firstOfBlock && block.intro) parts.push(block.intro);
      if (own) parts.push(own);
      firstOfBlock = false;
      return parts.length ? parts.join(" ") : undefined;
    };

    if (block.rounds && block.round) {
      // Un item de tour est soit un step simple, soit un groupe fixe (`steps`),
      // soit un groupe qui change à chaque tour (`variants`, modulo) — utile quand
      // le renfo n'a pas la même durée selon le tour (40 s de fentes, 30 s de planche…).
      const groupFor = (item, r) => {
        if (item.variants) return item.variants[(r - 1) % item.variants.length];
        if (item.steps) return item.steps;
        return [item];
      };
      const loopSeconds = block.round.reduce(
        (sum, item) => sum + groupFor(item, 1).reduce((a, sub) => a + seconds(sub), 0),
        0
      );
      // rounds : nombre fixe, `{ target }` (durée visée) ou `{ option }` (choix utilisateur).
      const rounds =
        typeof block.rounds === "object"
          ? block.rounds.option
            ? options[block.rounds.option]
            : Math.max(1, Math.round(block.rounds.target / loopSeconds))
          : block.rounds;
      for (let r = 1; r <= rounds; r += 1) {
        block.round.forEach((item, i) => {
          const group = groupFor(item, r);
          group.forEach((sub, j) => {
            const dur = seconds(sub);
            blockSeconds += dur;
            // Mini-transition dans un groupe (« 5 s changement de jambe ») : consigne
            // courte, décompte 3-2-1, puis « Go ! » sur le step suivant.
            if (sub.transition) {
              const nextSub = group[j + 1];
              push(blockId, {
                type: "transition",
                name: sub.name || "Transition",
                instruction: sub.instruction || sub.name,
                target: nextSub ? pick(nextSub.name, r) : "",
                targetType: "work",
                seconds: dur,
                round: r,
                roundLabel: block.roundLabel,
                blockName: block.name,
              });
              return;
            }
            push(blockId, {
              name: pick(sub.name, r),
              spoken: sub.spoken ? pick(sub.spoken, r) : pick(sub.name, r),
              seconds: dur,
              round: r,
              roundLabel: block.roundLabel,
              sayRound: i === 0 && j === 0,
              cadence: Boolean(sub.cadence),
              estimated: Boolean(sub.estimated),
              sayDuration: sub.sayDuration,
              doneCue: sub.doneCue,
              announceNext: Boolean(sub.announceNext),
              intro: r === 1 && i === 0 && j === 0 ? introFor() : undefined,
              blockName: block.name,
            });
          });
        });
        // Récup entre les tours (pas après le dernier).
        if (block.restBetweenRounds && r < rounds) {
          blockSeconds += block.restBetweenRounds;
          push(blockId, {
            type: "rest",
            name: "Récupération",
            seconds: block.restBetweenRounds,
            round: r,
            roundLabel: block.roundLabel,
            blockName: block.name,
          });
        }
      }
      const roundDesc = block.round
        .map((item) => {
          // `label` : libellé du plan quand le nom tourne à chaque tour ou pour un groupe.
          if (item.label) return item.label;
          // Durée estimée : « 30 fentes marchées (~1 min 30) », pas « 1 min 30 30 fentes ».
          const fmt = (sub, name) =>
            sub.estimated
              ? `${name} (~${libraryFormatDuration(seconds(sub))})`
              : `${libraryFormatDuration(seconds(sub))} ${name}`;
          if (item.variants || item.steps) {
            return groupFor(item, 1).map((sub) => fmt(sub, pick(sub.name, 1))).join(" → ");
          }
          return fmt(item, Array.isArray(item.name) ? item.name.join(" / ") : item.name);
        })
        .join(" + ");
      const restDesc = block.restBetweenRounds
        ? `, ${libraryFormatDuration(block.restBetweenRounds)} de récup entre`
        : "";
      detail.push(`${rounds} ${(block.roundLabel || "tour").toLowerCase()}s de ${roundDesc}${restDesc}`);
    }

    (block.steps || []).forEach((item) => {
      if (item.kind === "rest") {
        const dur = seconds(item);
        blockSeconds += dur;
        push(blockId, {
          type: "rest",
          name: item.name || "Récupération",
          spoken: item.spoken,
          seconds: dur,
          intro: introFor(item.intro),
          blockName: block.name,
        });
        detail.push(`${libraryFormatDuration(dur)} ${(item.name || "récupération").toLowerCase()}`);
        return;
      }

      if (item.kind === "checkpoint") {
        push(blockId, {
          type: "checkpoint",
          name: item.name,
          instruction: item.instruction,
          seconds: 0,
          blockName: block.name,
        });
        detail.push(`pause : ${item.name.toLowerCase()}`);
        return;
      }

      if (item.kind === "cycle") {
        const items = item.items.map((it) => (typeof it === "string" ? { name: it } : it));
        let elapsed = 0;
        let k = 0;
        while (elapsed < item.total) {
          const it = items[k % items.length];
          const dur = Math.min(item.slot, item.total - elapsed);
          const alreadyPrefixed = it.name.toLowerCase().startsWith(item.name.toLowerCase());
          push(blockId, {
            name: alreadyPrefixed ? it.name : `${item.name} · ${it.name}`,
            spoken: it.spoken || it.name,
            seconds: dur,
            cadence: Boolean(item.cadence || it.cadence),
            intro: k === 0 ? introFor(item.intro) : undefined,
            blockName: block.name,
          });
          elapsed += dur;
          k += 1;
        }
        blockSeconds += item.total;
        detail.push(
          `${item.name.toLowerCase()} ${libraryFormatDuration(item.total)} (${item.slot} s : ${items
            .map((it) => it.name.toLowerCase())
            .join(" · ")})`
        );
        return;
      }

      if (item.kind === "sequence") {
        item.items.forEach((it, k) => {
          push(blockId, {
            name: it.name,
            spoken: it.spoken || it.name,
            seconds: it.seconds,
            cadence: Boolean(it.cadence),
            intro: k === 0 ? introFor(item.intro) : undefined,
            blockName: block.name,
          });
          blockSeconds += it.seconds;
        });
        const total = item.items.reduce((s, it) => s + it.seconds, 0);
        detail.push(
          `${item.name.toLowerCase()} ${libraryFormatDuration(total)} (${item.items
            .map((it) => `${libraryFormatDuration(it.seconds)} ${it.name.replace(/^.*:\s*/, "").toLowerCase()}`)
            .join(" · ")})`
        );
        return;
      }

      // kind: "step"
      const dur = seconds(item);
      blockSeconds += dur;
      push(blockId, {
        name: item.name,
        spoken: item.spoken || item.name,
        seconds: dur,
        cadence: Boolean(item.cadence),
        estimated: Boolean(item.estimated),
        doneCue: item.doneCue,
        announceNext: Boolean(item.announceNext),
        intro: introFor(item.intro),
        blockName: block.name,
      });
      detail.push(`${libraryFormatDuration(dur)} ${item.name}`);
    });

    planLines.push(
      `Bloc ${blockId} — ${block.name}${blockSeconds ? ` (${libraryFormatDuration(blockSeconds)})` : ""} : ${detail.join(", ")}`
    );
  });

  return {
    title: def.title,
    subtitle: def.subtitle,
    advice: def.advice,
    libraryId: def.id,
    rounds: 1,
    exercises: [],
    blocks: planLines,
    timelineSteps: steps,
  };
}
