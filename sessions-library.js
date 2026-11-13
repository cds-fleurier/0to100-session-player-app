// Bibliothèque de séances intégrées 0 to 100.
//
// Ces séances ne passent pas par le parser Nolio : leur structure (cycles de
// 20 s dans un bloc de 3 min, tours définis par une durée totale, pause pour
// sortir de la maison…) est trop imbriquée pour être devinée depuis du texte.
// On les décrit ici en déclaratif, et compileLibrarySession() en sort la
// timeline que le player joue. Ajouter une séance = ajouter un objet dans
// SESSION_LIBRARY.
//
// ⚠️ Après tout ajout ou changement de texte parlé : regénérer la voix enregistrée
//   node tools/collect-phrases.cjs && node tools/generate-voice.cjs
// (sinon la phrase passe par speechSynthesis, qui coupe la musique sur iPhone).
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
// `lastRounds: { count, name?, spoken? }` sur un step de `round` : sur les `count`
// derniers tours, ce nom / cette phrase remplacent les siens (« vers I4 sur la fin
// du bloc ») — compté depuis la fin, donc juste quel que soit le nombre de tours.

// Préparation à la maison des séances « EDT » (C1S9 →) : 9 min, + 5 min d'équilibre
// quand le coach le demande, puis la pause « Sors ».
function edtHomePrep({ balance = false } = {}) {
  return [
    {
      kind: "sequence",
      name: "Étirements actifs",
      intro: "Étirements actifs, 3 minutes.",
      items: [
        { name: "Étirements actifs : mollets", seconds: 60 },
        { name: "Étirements actifs : quadriceps", seconds: 60 },
        { name: "Étirements actifs : ischios", seconds: 60 },
      ],
    },
    {
      kind: "sequence",
      name: "Rotations articulaires",
      intro: "Rotations articulaires, 3 minutes.",
      items: [
        { name: "Rotations de hanches", spoken: "Rotations des hanches", seconds: 90 },
        { name: "Rotations de chevilles", spoken: "Rotations des chevilles", seconds: 90 },
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
    ...(balance
      ? [
          {
            kind: "cycle",
            name: "Équilibre",
            total: 300,
            slot: 15,
            intro: "Équilibre sur un pied, genou de la jambe libre levé. 5 minutes, on change de pied toutes les 15 secondes.",
            items: [
              { name: "Équilibre pied gauche, genou levé", spoken: "Pied gauche" },
              { name: "Équilibre pied droit, genou levé", spoken: "Pied droit" },
            ],
          },
        ]
      : []),
    {
      kind: "checkpoint",
      name: "Sortie",
      instruction: "Préparation terminée. Sors, et appuie sur Démarrer dès que tu es dehors.",
    },
  ];
}

// Gammes simples EDT, découpage de Céline (coach EDT, 10/10) : 30 s de trot puis 20 s de
// gamme, 6 fois — 2 talons-fesses, 2 montées de genoux, 2 schtroumpfs (le 2e genou plus haut) = 5 min.
const EDT_GAMMES = {
  name: "Gammes simples",
  intro: "Gammes simples, 5 minutes. Tu alternes 30 secondes de trot et 20 secondes de gamme.",
  steps: [
    ["Talons-fesses", "Talons-fesses"],
    ["Talons-fesses", "Talons-fesses"],
    ["Montées de genoux", "Montées de genoux"],
    ["Montées de genoux", "Montées de genoux"],
    ["Schtroumpf facile", "Schtroumpf, facile"],
    ["Schtroumpf, genou plus haut", "Schtroumpf, genou un peu plus haut"],
  ].flatMap(([name, spoken]) => [
    { kind: "step", name: "Trot", spoken: "Trottine", seconds: 30 },
    { kind: "step", name, spoken, seconds: 20 },
  ]),
};

// Corps « course à allures variables + 1 min de renfo après chaque portion » (C1S10, C1S12).
// `renfoAfterLast: false` : pas de renfo après la dernière portion (C1S12).
// 4e élément d'une portion à `false` : pas de renfo après elle (la minute I5 de la C2S2).
function edtRunRenfoSteps(portions, renfo, { renfoAfterLast = true } = {}) {
  return portions.flatMap(([seconds, name, spoken, withRenfo = true], i) => [
    { kind: "step", name, spoken, seconds, announceNext: true },
    ...(withRenfo && (renfoAfterLast || i < portions.length - 1) ? renfo.map((r) => ({ kind: "step", ...r })) : []),
  ]);
}

// Variantes par option : un nœud (step, bloc…) porte `on: { <clé d'option>: { champs remplacés } }`.
// compileLibrarySession applique, pour chaque option active (valeur ≠ 0), les champs de cette clé.
//
// Option « Mode hiver » (note ADAPTATION HIVER des coachs EDT, 09/11) : pas de statique dans
// le froid → la chaise devient des squats, la planche des climbers. Validée par Céline le 16/10 :
// seulement s'il fait froid (« 10 degrés, ça passe »), autres remplacements à venir de sa part.
const WINTER_OPTION = {
  key: "winter",
  label: "Mode hiver (froid)",
  default: 0,
  choices: [
    { value: 0, label: "Non" },
    { value: 1, label: "Oui, il fait froid (moins de 10 °C) : pas de chaise ni de planche" },
  ],
};

function libraryApplyOptionVariants(node, active) {
  if (Array.isArray(node)) return node.map((n) => libraryApplyOptionVariants(n, active));
  if (!node || typeof node !== "object") return node;
  const { on, ...rest } = node;
  let merged = rest;
  if (on) active.forEach((key) => { if (on[key]) merged = { ...merged, ...on[key] }; });
  const out = {};
  Object.keys(merged).forEach((k) => {
    out[k] = libraryApplyOptionVariants(merged[k], active);
  });
  return out;
}

// Échauffement PAVEL 9' (Nolio, PAVEL du 25/11 et du 28/11). Durées du coach ; les répétitions
// tiennent dans le temps donné (« environ 15'' » par série de 5).
const PAVEL_WARMUP = [
  { kind: "step", name: "Hip hinge (à genoux, debout ou avec un balai)", spoken: "Hip hinge. Flexion, extension de hanche, à genoux, debout ou avec un balai", seconds: 40 },
  { kind: "step", name: "Pont fessier iso, talons décollés (1/2)", spoken: "Pont fessier, talons décollés, tiens", seconds: 20 },
  { kind: "step", name: "Repos", spoken: "Repos", seconds: 20, sayDuration: false },
  { kind: "step", name: "Pont fessier iso, talons décollés (2/2)", spoken: "Pont fessier, talons décollés, tiens", seconds: 20 },
  { kind: "step", name: "Repos", spoken: "Repos", seconds: 20, sayDuration: false },
  { kind: "step", name: "Pont dynamique explosif × 3 (genou poitrine 3 s, pont 2 s, redescente 5 s, 10 s de repos)", spoken: "Pont dynamique explosif, 3 fois. Genou poitrine 3 secondes, pont 2 secondes, redescente 5 secondes, puis 10 secondes de repos", seconds: 60 },
  { kind: "step", name: "Bird dog, bras gauche + jambe droite (5 × 5 s)", spoken: "4 pattes, bird dog. Bras gauche et jambe droite, 5 fois 5 secondes", seconds: 30 },
  { kind: "step", name: "Bird dog, bras droit + jambe gauche (5 × 5 s)", spoken: "Inverse, bras droit et jambe gauche", seconds: 30 },
  { kind: "step", name: "Éducatifs pompes × 3 (à genoux, descente en 5 s, étirement 10 s)", spoken: "Éducatifs pompes, 3 fois. À genoux, descends en 5 secondes, remonte tranquille, puis étire-toi, fesses vers les talons", seconds: 45 },
  { kind: "step", name: "Soulevé de terre × 5", spoken: "Soulevé de terre, 5 fois", seconds: 75 },
  { kind: "step", name: "Tirage × 5", spoken: "Tirage, 5 fois", seconds: 75 },
  { kind: "step", name: "Dead swing × 5", spoken: "Dead swing, 5 fois", seconds: 105 },
];

// WOD KB FORCE : 3 séries d'un exercice, récup réglable entre les séries (pas après la dernière
// du dernier exercice).
function wodForceBlock(name, steps, last = false) {
  const out = [];
  for (let k = 1; k <= 3; k += 1) {
    steps.forEach((st) => out.push({ kind: "step", ...st, name: `${st.name} — série ${k}/3` }));
    if (!(last && k === 3)) {
      out.push({ kind: "step", name: "Récup", spoken: "Récup", secondsFrom: "wodRest", announceNext: true });
    }
  }
  return { name, intro: `${name}, 3 séries.`, steps: out };
}

// Option « Tabata en musique » (C2S1, idée de Céline le 15/10) : chaque tabata devient une pause.
// L'écran du player propose d'ouvrir un morceau « Tabata Songs » (4 min 02 = un tabata,
// 8 × 20 s / 10 s, les changements sont dans la musique), on revient sur Démarrer.
const TABATA_MUSIC_OPTION = {
  key: "tabataMusic",
  label: "Tabata",
  default: 0,
  choices: [
    { value: 0, label: "Guidé par le player" },
    { value: 1, label: "En musique (un morceau Tabata)" },
  ],
};

const EDT_CHAISE_WINTER = { name: "Squats (hiver, à la place de la chaise)", spoken: "Squats, à la place de la chaise" };

// Mobilité de base du cycle 2 (doc de Céline) : 9 min, pied-cheville, rotations, étirements actifs.
// Seule préparation des séances run & renfo (C2S2, C2S4, C2S6) ; début de l'échauffement des autres.
function edtC2Mobility() {
  return [
    {
      kind: "sequence",
      name: "Pied-cheville",
      intro: "Pied et cheville, 3 minutes, sur les deux pieds.",
      items: [
        { name: "Piano : gros orteil puis petits orteils", spoken: "Piano : lève le gros orteil, puis les petits", seconds: 20 },
        { name: "Écarter et relâcher les orteils", spoken: "Écarte et relâche les orteils", seconds: 20 },
        { name: "Griffer et relâcher les orteils", spoken: "Griffe et relâche les orteils", seconds: 20 },
        { name: "Stepper sur place", spoken: "Stepper sur place", seconds: 20 },
        { name: "Stepper avant-arrière (6 pas)", spoken: "Stepper avant, arrière, 6 pas", seconds: 40 },
        { name: "Basculer à droite et à gauche", spoken: "Bascule à droite et à gauche", seconds: 20 },
        { name: "Ton exercice préféré", spoken: "Refais ton exercice préféré", seconds: 40 },
      ],
    },
    {
      kind: "sequence",
      name: "Rotations articulaires",
      intro: "Rotations articulaires, 3 minutes.",
      items: [
        { name: "Rotations cheville gauche", spoken: "Cheville gauche", seconds: 30 },
        { name: "Rotations cheville droite", spoken: "Cheville droite", seconds: 30 },
        { name: "Rotations genou gauche", spoken: "Genou gauche", seconds: 30 },
        { name: "Rotations genou droit", spoken: "Genou droit", seconds: 30 },
        { name: "Rotations hanche gauche", spoken: "Hanche gauche", seconds: 30 },
        { name: "Rotations hanche droite", spoken: "Hanche droite", seconds: 30 },
      ],
    },
    {
      kind: "sequence",
      name: "Étirements actifs",
      intro: "Étirements actifs, 3 minutes.",
      items: [
        { name: "Étirements actifs : mollets", seconds: 60 },
        { name: "Étirements actifs : quadriceps gauche", spoken: "Quadriceps gauche", seconds: 30 },
        { name: "Étirements actifs : quadriceps droit", spoken: "Quadriceps droit", seconds: 30 },
        { name: "Étirements actifs : ischios gauche", spoken: "Ischios gauche", seconds: 30 },
        { name: "Étirements actifs : ischios droit", spoken: "Ischios droit", seconds: 30 },
      ],
    },
  ];
}

const EDT_SORTIE = {
  kind: "checkpoint",
  name: "Sortie",
  instruction: "Préparation terminée. Sors, et appuie sur Démarrer dès que tu es dehors.",
};

// Échauffement du cycle 2, détaillé par Céline (Google Doc « seances EDT dans le player », 15/10) :
// préparation à la maison 12 min (pied-cheville, rotations, étirements actifs, équilibre), pause
// « Sors », 10 min de course I1, 5 min de gammes contrôle. Les gammes changent selon la séance
// (« remplacer la section gammes ») : `gammes` = [nom, phrase] des 7 gammes, une par 20 s.
const EDT_GAMMES_C2S1 = [
  ["Talons-fesses", "Talons-fesses"],
  ["Talons-fesses, arrêt bref tous les 5 appuis", "Talons-fesses, arrêt bref tous les 5 appuis"],
  ["Talons-fesses, arrêt bref tous les 5 appuis", "Talons-fesses, arrêt bref"],
  ["Montées de genoux", "Montées de genoux"],
  ["Montées de genoux, arrêt bref tous les 5 appuis", "Montées de genoux, arrêt bref tous les 5 appuis"],
  ["Montées de genoux, arrêt bref tous les 5 appuis", "Montées de genoux, arrêt bref"],
  ["Gammes libres, arrêt bref tous les 5 appuis", "Gammes libres, arrêt bref tous les 5 appuis"],
];
// C2S3 : la 3e de chaque série passe en double appui (= mini saut).
const EDT_GAMMES_C2S3 = [
  ["Talons-fesses", "Talons-fesses"],
  ["Talons-fesses, arrêt bref tous les 5 appuis", "Talons-fesses, arrêt bref tous les 5 appuis"],
  ["Talons-fesses, double appui (mini saut) tous les 5 appuis", "Talons-fesses, double appui, un mini saut tous les 5 appuis"],
  ["Montées de genoux", "Montées de genoux"],
  ["Montées de genoux, arrêt bref tous les 5 appuis", "Montées de genoux, arrêt bref tous les 5 appuis"],
  ["Montées de genoux, double appui (mini saut) tous les 5 appuis", "Montées de genoux, double appui, un mini saut tous les 5 appuis"],
  ["Gammes libres, arrêt bref tous les 5 appuis", "Gammes libres, arrêt bref tous les 5 appuis"],
];
// C2S5 : sans arrêt, avec schtroumpfs.
const EDT_GAMMES_C2S5 = [
  ["Talons-fesses", "Talons-fesses"],
  ["Talons-fesses", "Talons-fesses"],
  ["Montées de genoux", "Montées de genoux"],
  ["Montées de genoux", "Montées de genoux"],
  ["Schtroumpf", "Schtroumpf"],
  ["Schtroumpf", "Schtroumpf"],
  ["Gammes libres", "Gammes libres"],
];

// C2S11 : gammes en côte, 3 min (20 s de gamme en montée, 40 s de trot en redescendant).
const EDT_GAMMES_COTE = {
  name: "Gammes en côte",
  intro: "Gammes en côte, 3 minutes. 20 secondes de gamme en montée, 40 secondes de trot en redescendant.",
  steps: [
    ["Talons-fesses en côte", "Talons-fesses, en montée"],
    ["Montées de genoux en côte", "Montées de genoux, en montée"],
    ["Schtroumpf en côte", "Schtroumpf, en montée"],
  ].flatMap(([name, spoken]) => [
    { kind: "step", name, spoken, seconds: 20, sayDuration: false },
    { kind: "step", name: "Trot en descente", spoken: "Redescends en trottant", seconds: 40, sayDuration: false },
  ]),
};

// C2S13 : gammes contrôle en descente, 10 min (40 s de course facile en cadence en montée,
// 20 s de gamme en descente, 10 fois).
const EDT_GAMMES_DESCENTE = {
  name: "Gammes contrôle en descente",
  intro: "Gammes contrôle en descente, 10 minutes. 40 secondes de course facile en cadence en montée, puis 20 secondes de gamme en descente.",
  steps: [
    ["Talons-fesses en descente", "Talons-fesses, en descente"],
    ["Talons-fesses, arrêt bref tous les 5 appuis, en descente", "Talons-fesses, arrêt bref tous les 5 appuis"],
    ["Talons-fesses, double appui (mini saut) tous les 5 appuis, en descente", "Talons-fesses, double appui tous les 5 appuis"],
    ["Montées de genoux en descente", "Montées de genoux, en descente"],
    ["Montées de genoux, arrêt bref tous les 5 appuis, en descente", "Montées de genoux, arrêt bref tous les 5 appuis"],
    ["Montées de genoux, double appui (mini saut) tous les 5 appuis, en descente", "Montées de genoux, double appui tous les 5 appuis"],
    ["Gammes libres, arrêt bref tous les 5 appuis, en descente", "Gammes libres, arrêt bref tous les 5 appuis"],
    ["Talons-fesses, double appui tous les 5 appuis, en descente", "Talons-fesses, double appui"],
    ["Montées de genoux, double appui tous les 5 appuis, en descente", "Montées de genoux, double appui"],
    ["Course jambes tendues en descente", "Course jambes tendues, en descente"],
  ].flatMap(([name, spoken]) => [
    { kind: "step", name: "Course facile en montée, cadence", spoken: "Course facile en montée, en cadence", seconds: 40, cadence: true, sayDuration: false },
    { kind: "step", name, spoken, seconds: 20, sayDuration: false },
  ]),
};

// `gammes` : les 7 gammes [nom, phrase] du découpage 20 s / 20 s, ou un bloc complet
// (EDT_GAMMES_COTE, EDT_GAMMES_DESCENTE). `balance: "skieur"` : équilibre skieur (C2S13).
function edtC2Warmup(gammes = EDT_GAMMES_C2S1, { balance: balanceKind = "mg" } = {}) {
  const skieur = balanceKind === "skieur";
  const balance = (side) => skieur
    ? {
        name: `Équilibre skieur, ${side === "G" ? "pied gauche" : "pied droit"}`,
        spoken: side === "G" ? "Skieur, pied gauche" : "Skieur, pied droit",
        seconds: 20,
      }
    : {
        name: `Équilibre ${side === "G" ? "pied gauche" : "pied droit"}, genou levé`,
        spoken: side === "G" ? "Pied gauche, genou levé" : "Pied droit, genou levé",
        seconds: 20,
      };
  return [
    {
      name: "Préparation (à la maison)",
      steps: [
        ...edtC2Mobility(),
        {
          kind: "sequence",
          name: "Équilibre",
          intro: skieur ? "Équilibre skieur, 3 minutes." : "Équilibre avec montée de genou, 3 minutes.",
          items: [
            balance("G"), balance("D"), balance("G"), balance("D"),
            { name: "Course sur place, cadence", spoken: "Course sur place, en cadence", seconds: 20, cadence: true },
            balance("G"), balance("D"), balance("G"), balance("D"),
          ],
        },
        EDT_SORTIE,
      ],
    },
    {
      name: "Course facile",
      steps: [
        {
          kind: "step",
          name: "Course facile (I1)",
          spoken: "Course facile, intensité 1. Tu peux papoter",
          seconds: 600,
          announceNext: true,
        },
      ],
    },
    Array.isArray(gammes) ? {
      name: "Gammes contrôle",
      intro: "Gammes contrôle, 5 minutes. Tu alternes 20 secondes de course facile en cadence et 20 secondes de gamme.",
      steps: gammes
        .flatMap(([name, spoken]) => [
          { kind: "step", name: "Course facile, cadence", spoken: "Course facile, en cadence", seconds: 20, cadence: true, sayDuration: false },
          { kind: "step", name, spoken, seconds: 20, sayDuration: false },
        ])
        .concat([{ kind: "step", name: "Course facile, cadence", spoken: "Course facile, en cadence", seconds: 20, cadence: true, sayDuration: false }]),
    } : gammes,
  ];
}

// C2S1, doc de Céline : un bloc = tabata 4 min (8 × 20 s / 10 s de récup : chaise, squats,
// pont pelvien, climbers, 2 fois) + EPIC 20-20 6 min (9 × 20 s course facile / 20 s rapide)
// + 1 min de récup (trotter ou marcher), y compris après le bloc 3. Le « rapide » change selon
// le bloc : I3, progressivement I4, progressivement I5.
function edtEpicBlock(n, fastName, fastSpoken, track) {
  const tabata = [
    { name: "Chaise", spoken: "Chaise", on: { winter: EDT_CHAISE_WINTER } },
    { name: "Squats", spoken: "Squats" },
    { name: "Pont pelvien", spoken: "Pont pelvien" },
    { name: "Climbers", spoken: "Climbers" },
  ];
  const renfo = [...tabata, ...tabata].flatMap((ex, i) => [
    { kind: "step", ...ex, name: `${ex.name} (${i + 1}/8)`, seconds: 20, sayDuration: false,
      ...(ex.on ? { on: { winter: { ...ex.on.winter, name: `${ex.on.winter.name} (${i + 1}/8)` } } } : {}) },
    { kind: "rest", name: i < 7 ? "Récup" : "Récup, prépare-toi à courir", seconds: 10 },
  ]);
  const epic = [];
  for (let k = 1; k <= 9; k += 1) {
    epic.push({
      kind: "step",
      name: `EPIC ${k}/9 — course facile`,
      spoken: k === 1 ? "Course EPIC, 6 minutes. Course facile" : k === 9 ? "Facile, dernier" : "Facile",
      seconds: 20,
      sayDuration: false,
    });
    epic.push({ kind: "step", name: `EPIC ${k}/9 — ${fastName}`, spoken: fastSpoken, seconds: 20, sayDuration: false });
  }
  const order = "chaise, squats, pont pelvien, climbers, 2 fois";
  const instruction = (exercises) =>
    `Bloc ${n}, tabata en musique. Lance le morceau ${track.title}, une fois : ${exercises}, au rythme de la musique. Reviens ici et appuie sur Démarrer quand il est fini.`;
  return [
    {
      name: `Tabata ${n}/3`,
      intro: `Bloc ${n}. Tabata, 20 secondes d'effort, 10 secondes de récup.`,
      steps: renfo,
      on: {
        tabataMusic: {
          intro: undefined,
          steps: [
            {
              kind: "checkpoint",
              name: `Tabata en musique : ${track.title}`,
              instruction: instruction(order),
              music: track,
              on: { winter: { instruction: instruction("squats à la place de la chaise, squats, pont pelvien, climbers, 2 fois") } },
            },
            { kind: "rest", name: "Récup, prépare-toi à courir", seconds: 10 },
          ],
        },
      },
    },
    {
      name: `EPIC ${n}/3`,
      steps: [
        ...epic,
        { kind: "step", name: "Récup (trotter ou marcher)", spoken: "Récup, trotte ou marche", seconds: 60, announceNext: true },
      ],
    },
  ];
}

// C2S5, doc de Céline : un bloc = tabata 3 min (2 exercices, 20 s / 10 s de récup, 3 fois)
// + EPIC 15-15 5 min (10 × 15 s lent I2 / 15 s rapide) + 1 min de récup. 4 blocs, 10 fois
// le 15-15 partout (Céline, 16/10 : le « 12 fois » des blocs 3-4 était une erreur de saisie).
// Pas d'option musique : les morceaux « Tabata Songs » font 4 min, ces tabatas 3.
function edtC2S5Block(n, exercises, fastName, fastSpoken) {
  const tabata = [1, 2, 3].flatMap((k) =>
    exercises.flatMap((ex, j) => [
      {
        kind: "step",
        ...ex,
        name: `${ex.name} (${k}/3)`,
        seconds: 20,
        sayDuration: false,
        ...(ex.on ? { on: { winter: { ...ex.on.winter, name: `${ex.on.winter.name} (${k}/3)` } } } : {}),
      },
      { kind: "rest", name: k === 3 && j === 1 ? "Récup, prépare-toi à courir" : "Récup", seconds: 10 },
    ])
  );
  const epic = [];
  for (let k = 1; k <= 10; k += 1) {
    epic.push({
      kind: "step",
      name: `EPIC ${k}/10 — course lente I2`,
      spoken: k === 1 ? "Course EPIC 15-15, 5 minutes. Lent, intensité 2" : k === 10 ? "Lent, dernier" : "Lent",
      seconds: 15,
      sayDuration: false,
    });
    epic.push({ kind: "step", name: `EPIC ${k}/10 — ${fastName}`, spoken: fastSpoken, seconds: 15, sayDuration: false });
  }
  return [
    { name: `Tabata ${n}/4`, intro: `Bloc ${n}. Tabata, 3 minutes.`, steps: tabata },
    {
      name: `EPIC ${n}/4`,
      steps: [
        ...epic,
        { kind: "step", name: "Récup (trotter ou marcher)", spoken: "Récup, trotte ou marche", seconds: 60, announceNext: true },
      ],
    },
  ];
}

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
    subtitle: "≈ 66 min · échauffement 25 min (préparation + course libre), gammes, 2 à 4 blocs renfo + course EPIC 15-15",
    advice:
      "Échauffement 25 min : la préparation dure ~18 min, la course libre est raccourcie à 7 min 20 (consigne du coach). Bloc = 3 min de renfo à ton rythme (squats et mollets en tempo 1-0-1-0, mountain climbers, 2 séries) + 4 min de course EPIC 15-15 : 15 s lent I1-I2, 15 s plus rapide, de plus en plus vite sur les 4 min pour finir un peu au-dessus de I3. 1 min de récup entre les blocs.",
    options: [
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
            cadence: true,
            intro: "Équilibre sur un pied, genou de la jambe libre levé. 3 minutes, 30 secondes par côté, 3 fois chaque côté. Tu peux faire les bras en cadence.",
            items: [
              { name: "Équilibre pied gauche, genou levé" },
              { name: "Équilibre pied droit, genou levé" },
            ],
          },
          { kind: "step", name: "Mobilité de hanches", spoken: "Mobilité des hanches", seconds: 180 },
          {
            kind: "step",
            name: "Étirements balistiques, 15 côté gauche",
            spoken: "15 côté gauche",
            intro: "Étirements balistiques progressifs, 15 de chaque côté.",
            seconds: 20,
            estimated: true,
          },
          {
            kind: "step",
            name: "Étirements balistiques, 15 côté droit",
            spoken: "15 côté droit",
            seconds: 20,
            estimated: true,
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
            // Le coach veut 25 min d'échauffement : préparation 17 min 40 + 7 min 20.
            name: "Course libre, très facile (I1)",
            spoken: "Course libre, très facile, intensité 1",
            seconds: 440,
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
          "Corps de séance. Chaque bloc : 3 minutes de renfo en 2 séries, squats, mountain climbers, mollets, puis 4 minutes de course EPIC 15-15, 15 secondes lent, 15 secondes plus rapide, de plus en plus vite. 1 minute de récup entre les blocs.",
        round: [
          {
            label: "renfo ~3 min, 2 × (15 squats 1-0-1-0 · 30 mountain climbers · 10 paires de mollets 1-0-1-0)",
            steps: [
              { name: "15 squats (1-0-1-0)", spoken: "Série 1. 15 squats, tempo un, zéro, un, zéro", seconds: 30, estimated: true },
              { name: "30 mountain climbers", spoken: "30 mountain climbers", seconds: 30, estimated: true },
              { name: "10 paires de mollets (1-0-1-0)", spoken: "10 paires de mollets, tempo un, zéro, un, zéro", seconds: 30, estimated: true },
              { name: "15 squats (1-0-1-0) — série 2", spoken: "Série 2. 15 squats", seconds: 30, estimated: true },
              { name: "30 mountain climbers — série 2", spoken: "30 mountain climbers", seconds: 30, estimated: true },
              { name: "10 paires de mollets (1-0-1-0) — série 2", spoken: "10 paires de mollets", seconds: 30, estimated: true, doneCue: "Quand tu as fini" },
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
  {
    id: "C1S9",
    date: "13/10/26",
    title: "C1S9 — Aller progressivement vers I3-I4, squats et climbers",
    subtitle: "≈ 55 min · préparation 14 min, 10 min I1, gammes, 2 blocs de 6-7 tours (renfo + 30 s I3→I4 + 20 s I2), 2 min récup active, 5 min I1",
    advice:
      "Objectif : préparer les structures à aller vers la VMA. Terrain plat ou en légère montée, facile. Un tour = 10 squats tempo 2-0-1-0 (2 s à la descente) au bloc 1, 30 climbers au bloc 2, puis 30 s en I3 et 20 s de récup en I2. Monte vers I4 sur les 2 derniers tours du bloc 1 et les 3 derniers du bloc 2. 2 min de récup active entre les blocs (marche ou trot).",
    options: [
      {
        key: "pace",
        label: "Rythme sur le renfo",
        default: 1,
        choices: [
          { value: 1.25, label: "Tranquille" },
          { value: 1, label: "Normal" },
          { value: 0.8, label: "Rapide" },
        ],
      },
      {
        key: "rounds",
        label: "Tours par bloc",
        default: 7,
        choices: [
          { value: 6, label: "6 tours (8 min)" },
          { value: 7, label: "7 tours (9 min 20)" },
        ],
      },
    ],
    blocks: [
      { name: "Préparation (à la maison)", steps: edtHomePrep({ balance: true }) },
      {
        name: "Course facile",
        steps: [
          {
            kind: "step",
            name: "Course facile (I1)",
            spoken: "Course facile, intensité 1. Tu peux tenir une conversation facilement",
            seconds: 600,
            announceNext: true,
          },
        ],
      },
      EDT_GAMMES,
      {
        name: "Squats + I3",
        rounds: { option: "rounds" },
        intro:
          "Bloc 1. À chaque tour : 10 squats, tempo 2, 0, 1, 0, deux secondes à la descente. Puis 30 secondes en intensité 3, et 20 secondes de récup en intensité 2. Sur les 2 derniers tours, tu montes vers l'intensité 4.",
        round: [
          { name: "10 squats (2-0-1-0)", spoken: "10 squats, deux secondes à la descente", seconds: 30, estimated: true },
          {
            name: "Course I3",
            spoken: "Course, intensité 3",
            seconds: 30,
            sayDuration: false,
            lastRounds: { count: 2, name: "Course vers I4", spoken: "Course, monte vers intensité 4" },
          },
          { name: "Récup, course I2", spoken: "Récup, intensité 2", seconds: 20, sayDuration: false },
        ],
      },
      {
        name: "Récup active",
        steps: [
          { kind: "step", name: "Récup active (marche ou trot)", spoken: "Récup active, marche ou trottine pour ne pas te refroidir", seconds: 120, announceNext: true },
        ],
      },
      {
        name: "Climbers + I3",
        rounds: { option: "rounds" },
        intro:
          "Bloc 2. À chaque tour : 30 climbers, puis 30 secondes en intensité 3, et 20 secondes de récup en intensité 2. Sur les 3 derniers tours, tu montes vers l'intensité 4.",
        round: [
          { name: "30 climbers", spoken: "30 climbers", seconds: 30, estimated: true },
          {
            name: "Course I3",
            spoken: "Course, intensité 3",
            seconds: 30,
            sayDuration: false,
            lastRounds: { count: 3, name: "Course vers I4", spoken: "Course, monte vers intensité 4" },
          },
          { name: "Récup, course I2", spoken: "Récup, intensité 2", seconds: 20, sayDuration: false },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile, intensité 1", seconds: 300 },
        ],
      },
    ],
  },
  {
    id: "C1S10",
    date: "17/10/26",
    title: "C1S10 — Variations d'allures et renfo squats-climbers",
    subtitle: "≈ 54 min · préparation 9 min, 9 portions de course I1 à I4 avec 1 min de renfo après chacune, 5 min I1",
    advice:
      "Endurance, terrain plat et facile. Après chaque portion de course : 1 min de renfo = 30 s de squats tempo 1-0-1-0 + 30 s de climbers. Portions : 5 min I1, 3 min I2, 3 min I3, 2 min en montant vers I4, deux fois, puis 5 min I1. Retour au calme 5 min après le dernier renfo.",
    blocks: [
      { name: "Préparation (à la maison)", steps: edtHomePrep() },
      {
        name: "Corps de séance",
        intro:
          "Corps de séance, 40 minutes. Tu alternes une portion de course et une minute de renfo : 30 secondes de squats, 30 secondes de climbers.",
        steps: edtRunRenfoSteps(
          [
            [300, "Course I1", "Course, intensité 1"],
            [180, "Course I2", "Course, intensité 2"],
            [180, "Course I3", "Course, intensité 3"],
            [120, "Course, progressivement I4", "Course, monte progressivement vers intensité 4"],
            [300, "Course I1", "Course, intensité 1"],
            [180, "Course I2", "Course, intensité 2"],
            [180, "Course I3", "Course, intensité 3"],
            [120, "Course, progressivement I4", "Course, monte progressivement vers intensité 4"],
            [300, "Course I1", "Course, intensité 1"],
          ],
          [
            { name: "Squats (1-0-1-0)", spoken: "Squats, tempo un, zéro, un, zéro", seconds: 30 },
            { name: "Climbers", seconds: 30 },
          ]
        ),
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile, intensité 1", seconds: 300 },
        ],
      },
    ],
  },
  {
    id: "C1S12",
    date: "20/10/26",
    title: "C1S12 — Pyramide d'allures jusqu'à I5, fentes et montée de genou",
    subtitle: "≈ 50 min · préparation 9 min, 11 portions de course I1 → I5 → I1, 1 min de renfo entre chaque",
    advice:
      "Endurance, chercher progressivement I4 puis I5. Terrain plat et facile. Entre deux portions de course : 1 min de renfo = 30 s de fente + montée de genou à gauche, puis 30 s à droite. Portions : 5 min I1, 4 min I2, 3 min I3, 2 min vers I4, 1 min vers I5, 1 min I2, 1 min vers I5, 2 min vers I4, 3 min I3, 4 min I2, 5 min I1. Pas de renfo après les 5 dernières minutes en I1 : la séance se termine là.",
    blocks: [
      { name: "Préparation (à la maison)", steps: edtHomePrep() },
      {
        name: "Corps de séance",
        intro:
          "Corps de séance, 41 minutes. Tu alternes une portion de course et une minute de renfo : fente et montée de genou, 30 secondes à gauche, 30 secondes à droite.",
        steps: edtRunRenfoSteps(
          [
            [300, "Course I1", "Course, intensité 1"],
            [240, "Course I2", "Course, intensité 2"],
            [180, "Course I3", "Course, intensité 3"],
            [120, "Course, progressivement I4", "Course, monte progressivement vers intensité 4"],
            [60, "Course, progressivement I5", "Course, monte progressivement vers intensité 5"],
            [60, "Course I2", "Course, intensité 2"],
            [60, "Course, progressivement I5", "Course, monte progressivement vers intensité 5"],
            [120, "Course I4", "Course, intensité 4"],
            [180, "Course I3", "Course, intensité 3"],
            [240, "Course I2", "Course, intensité 2"],
            [300, "Course I1", "Course, intensité 1"],
          ],
          [
            { name: "Fente + montée de genou gauche", spoken: "Fente et montée de genou, jambe gauche", seconds: 30 },
            { name: "Fente + montée de genou droite", spoken: "Jambe droite", seconds: 30 },
          ],
          { renfoAfterLast: false }
        ),
      },
    ],
  },
  {
    // Validée par Céline (coach EDT) le 10/10 : boucle convertie en temps, 7 boucles (8 depuis le 15/10 :
    // descente ramenée de 60 à 40 s, elle avait compté large en testant → boucle de 2 min 40, 1 boucle de plus pour rester ~20 min ;
    // la 8e reprend la 1re consigne, cadence — validé par Céline le 16/10),
    // une consigne technique par montée (ordre de sa liste), I2 → I3 progressif à chaque montée.
    id: "C1S11",
    date: "30/10/26",
    title: "C1S11 — Technique de course en côte",
    subtitle: "≈ 55 min · préparation 14 min, 10 min I1, gammes, 8 boucles de 2 min 40 en côte (climbers, montée I2 → I3 avec consigne technique, fentes, descente), 5 min I1",
    advice:
      "Terrain : une petite côte de 5 à 10 %, facile, de 100 à 120 m (sinon une petite côte ou des escaliers). Boucle de 2 min 40 : 40 s de climbers en bas, 30 s de montée (pars en I2, accélère progressivement, en I3 au bout de 20 s et finis en I3) avec une consigne technique, 40 s de fentes arrière + montée de genou en haut (6 paires), 40 s maximum de descente relâchée I1-I2, 10 s pour te remettre en place.",
    blocks: [
      { name: "Préparation (à la maison)", steps: edtHomePrep({ balance: true }) },
      {
        name: "Course facile",
        steps: [
          {
            kind: "step",
            name: "Course facile (I1)",
            spoken: "Course facile, intensité 1. Tu peux tenir une conversation facilement",
            seconds: 600,
            announceNext: true,
          },
        ],
      },
      EDT_GAMMES,
      {
        name: "Technique en côte",
        rounds: 8,
        roundLabel: "Boucle",
        intro:
          "Technique de course en côte, 8 boucles de 2 minutes 40. En bas, 20 climbers. Tu montes avec une consigne technique, en haut 6 paires de fentes arrière avec montée de genou, et tu redescends relâché.",
        round: [
          { name: "20 climbers (en bas)", spoken: "En bas, 20 climbers", seconds: 40 },
          {
            label: "30 s de montée I2 → I3 avec une consigne (cadence · grandis-toi · bras · cadence + bras · cadence + grandis-toi · grandis-toi + bras · libre)",
            name: [
              "Montée I2 → I3 — cadence",
              "Montée I2 → I3 — grandis-toi",
              "Montée I2 → I3 — bras",
              "Montée I2 → I3 — cadence + bras",
              "Montée I2 → I3 — cadence + grandis-toi",
              "Montée I2 → I3 — grandis-toi + bras",
              "Montée I2 → I3 — libre",
            ],
            spoken: [
              "Montée. Pars en intensité 2 et accélère progressivement. Beaucoup de cadence, appuis brefs, le sol brûle",
              "Montée. Pars en intensité 2 et accélère progressivement. Grandis-toi, redresse-toi, regarde au loin",
              "Montée. Pars en intensité 2 et accélère progressivement. Exagère le travail des bras",
              "Montée. Pars en intensité 2 et accélère progressivement. Cadence et bras",
              "Montée. Pars en intensité 2 et accélère progressivement. Cadence, et grandis-toi",
              "Montée. Pars en intensité 2 et accélère progressivement. Grandis-toi, et les bras",
              "Montée. Pars en intensité 2 et accélère progressivement. Consigne libre",
            ],
            seconds: 20,
            sayDuration: false,
          },
          { name: "Montée en I3", spoken: "Tu dois être en intensité 3. Finis en intensité 3", seconds: 10, sayDuration: false },
          { name: "6 paires de fentes arrière + montée de genou", spoken: "6 paires de fentes arrière, avec montée de genou", seconds: 40 },
          { name: "Descente relâchée (I1-I2)", spoken: "Descente relâchée, facile", seconds: 40 },
          { name: "Mise en place", spoken: "Mets-toi en place", seconds: 10, sayDuration: false },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile, intensité 1", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Écrite d'après le Google Doc détaillé de Céline (coach EDT) du 15/10 (« seances EDT dans le player »).
    id: "C2S1",
    date: "03/11/26",
    title: "C2S1 — Endurance de force et EPIC 20-20",
    subtitle: "≈ 65 min · préparation 12 min, 10 min I1, gammes contrôle, 3 blocs (tabata 4 min + EPIC 20-20 6 min + 1 min récup), 5 min de retour au calme",
    advice:
      "Cycle 2 : endurance de force et intervalles courts à haute intensité. Terrain montée et plat, facile. Un bloc = 4 min de tabata (20 s d'effort, 10 s de récup : chaise, squats, pont pelvien, climbers, 2 fois), 6 min de course EPIC 20-20 (20 s de course facile, 20 s rapide), 1 min de récup en trottant ou en marchant. Le rapide : I3 au bloc 1, progressivement I4 au bloc 2, progressivement I5 au bloc 3. Retour au calme 5 min, en trottant ou en marchant. Option « Tabata en musique » : à chaque tabata, le player se met en pause et te propose un morceau Tabata (4 min, les changements 20 s / 10 s sont dans la musique) ; appuie sur Démarrer quand il est fini.",
    options: [TABATA_MUSIC_OPTION, WINTER_OPTION],
    blocks: [
      ...edtC2Warmup(),
      ...edtEpicBlock(1, "course I3", "Intensité 3", { artist: "Tabata Songs", title: "Cake by the Ocean (Tabata)" }),
      ...edtEpicBlock(2, "progressivement I4", "Progressivement vers intensité 4", { artist: "Tabata Songs", title: "Eye of the Tiger (Tabata)" }),
      ...edtEpicBlock(3, "progressivement I5", "Progressivement vers intensité 5", { artist: "Tabata Songs", title: "Final Countdown (Tabata)" }),
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Retour au calme (trotter ou marcher)", spoken: "Retour au calme, trotte ou marche", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Doc de Céline (16/10) : mobilité de base 9 min, deux portions I2 au début, pas de renfo
    // après la minute I5 (Nolio n'avait qu'une portion I2). Planche de face, main qui tape
    // l'épaule : « latérale » dans le titre Nolio était une erreur (Céline, 16/10).
    id: "C2S2",
    date: "06/11/26",
    title: "C2S2 — Variations d'allures, planche et équilibre",
    subtitle: "≈ 48 min · mobilité 9 min, 11 portions de course I1 → I5 → I1 avec 1 min de renfo entre chaque",
    advice:
      "Terrain plat et facile. Entre deux portions de course : 1 min de renfo = 30 s de planche active en touchant l'épaule opposée avec la main, puis 30 s d'équilibre avec les bras en cadence (15 s pied gauche, 15 s pied droit). Portions : 3 min I1, 3 min I2, 3 min I2, 3 min I3, 3 min I3, 3 min I4, 1 min I5, 3 min I4, 3 min I3, 3 min I2, 2 min I1. Pas de renfo après la minute I5 (tu enchaînes sur l'I4), ni après les 2 dernières minutes : la séance se termine là.",
    options: [WINTER_OPTION],
    blocks: [
      { name: "Mobilité (à la maison)", steps: [...edtC2Mobility(), EDT_SORTIE] },
      {
        name: "Corps de séance",
        intro:
          "Corps de séance, 39 minutes. Tu alternes une portion de course et une minute de renfo : 30 secondes de planche en touchant tes épaules, puis 30 secondes d'équilibre, les bras en cadence.",
        on: { winter: {
          intro:
            "Corps de séance, 39 minutes. Tu alternes une portion de course et une minute de renfo : 30 secondes de climbers, puis 30 secondes d'équilibre, les bras en cadence.",
        } },
        steps: edtRunRenfoSteps(
          [
            [180, "Course I1", "Course, intensité 1"],
            [180, "Course I2", "Course, intensité 2"],
            [180, "Course I2", "Course, intensité 2"],
            [180, "Course I3", "Course, intensité 3"],
            [180, "Course I3", "Course, intensité 3"],
            [180, "Course I4", "Course, intensité 4"],
            [60, "Course I5", "Course, intensité 5", false],
            [180, "Course I4", "Course, intensité 4"],
            [180, "Course I3", "Course, intensité 3"],
            [180, "Course I2", "Course, intensité 2"],
            [120, "Course I1", "Course, intensité 1"],
          ],
          [
            {
              name: "Planche active, main → épaule opposée",
              spoken: "Planche, touche l'épaule opposée avec la main",
              seconds: 30,
              on: { winter: { name: "Climbers (hiver, à la place de la planche)", spoken: "Climbers, à la place de la planche" } },
            },
            { name: "Équilibre pied gauche, bras en cadence", spoken: "Équilibre pied gauche, les bras en cadence", seconds: 15, cadence: true },
            { name: "Équilibre pied droit, bras en cadence", spoken: "Pied droit", seconds: 15, cadence: true },
          ],
          { renfoAfterLast: false }
        ),
      },
    ],
  },
  {
    // Doc de Céline (16/10) : 7 tours chronométrés de 5 min (fini l'estimation au rythme),
    // gammes avec double appui. Les tours partent du haut d'une côte.
    id: "C2S3",
    date: "10/11/26",
    title: "C2S3 — Circuit montée-descente (séance livre)",
    subtitle: "≈ 67 min · préparation 12 min, 10 min I1, gammes double appui, circuit montée-descente 7 × 5 min, 5 min de retour au calme",
    advice:
      "Séance livre « Moins courir pour mieux courir ». Objectif : montées, descentes, technique de descente. Trouve une côte facile : 30 s de descente rapide, environ 1 min 10 pour remonter tranquille. Un tour de 5 min, en partant du haut : 30 s de chaise, 30 s de squats (1 s pour descendre, 1 s pour monter), 30 s de descente rapide en hypercadence, 1 min 10 de remontée facile, 40 s de squats en haut, 30 s de descente rapide en double appui, 1 min 10 de remontée facile. 7 tours. Retour au calme 5 min en trottant ou en marchant.",
    options: [WINTER_OPTION],
    blocks: [
      ...edtC2Warmup(EDT_GAMMES_C2S3),
      {
        name: "Circuit montée-descente",
        rounds: 7,
        intro: "Circuit montée-descente, 7 tours de 5 minutes. Place-toi en haut de la côte.",
        round: [
          { name: "Chaise", spoken: "Chaise", seconds: 30, on: { winter: EDT_CHAISE_WINTER } },
          { name: "Squats (1 s descente, 1 s montée)", spoken: "Squats, une seconde pour descendre, une pour monter", seconds: 30 },
          { name: "Descente rapide, hypercadence", spoken: "Descente rapide, hypercadence", seconds: 30, cadence: true },
          { name: "Remontée facile", spoken: "Remonte, facile", seconds: 70, announceNext: true },
          { name: "En haut : squats (1 s descente, 1 s montée)", spoken: "En haut, squats", seconds: 40 },
          { name: "Descente rapide en double appui", spoken: "Descente rapide en double appui", seconds: 30 },
          { name: "Remontée facile", spoken: "Remonte, facile", seconds: 70, announceNext: true },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Retour au calme (trotter ou marcher)", spoken: "Retour au calme, trotte ou marche", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Nolio 12/11 : « 5x CIRCUIT SPÉ ELASTIQUE 30/30 (ROUGE) (Copie) » + « Jog 10' @ Z1 enchaîner après renfo ».
    // Le titre dit 5x, le détail 4 tours : on suit le détail. Pas de récup entre squat élastique et
    // squat latéral : ils s'enchaînent (Charles, 12/11 — ce n'était pas un oubli du tableau).
    // 4 × 7 min 30 + 3 × 1 min + 10 min = 43 min (Nolio annonce 45).
    // Récups d'exercice en alternance récup / corde à sauter (corde = step de travail).
    id: "CIRCUIT-ELASTIQUE",
    date: "12/11/26",
    title: "CIRCUIT — Élastique 30/30 + 10 min I1",
    subtitle: "43 min · élastique rouge · 4 tours de 8 exercices de 30 s (les 2 squats enchaînés), puis récup ou corde à sauter de 30 s, 1 min entre les tours, puis 10 min de course I1",
    advice:
      "Matériel : élastique rouge (Elast'iring) et corde à sauter. Chaque exercice dure 30 s. Squat élastique et squat latéral s'enchaînent sans pause ; après chacun des autres exercices, 30 s de récup ou de corde à sauter, en alternance. 1 min de récup entre les tours. Puis enchaîne 10 min de course très facile.",
    options: [WINTER_OPTION],
    blocks: [
      {
        name: "Circuit élastique",
        rounds: 4,
        restBetweenRounds: 60,
        intro: "Circuit élastique, 4 tours. 30 secondes par exercice, puis 30 secondes de récup ou de corde à sauter.",
        round: [
          { name: "Squat élastique", spoken: "Squat élastique", seconds: 30 },
          { name: "Squat latéral", spoken: "Enchaîne : squat latéral", seconds: 30 },
          { name: "Corde à sauter", spoken: "Corde à sauter", seconds: 30 },
          { name: "Bear tape main", spoken: "Bear tape main", seconds: 30 },
          { name: "Récup", spoken: "Récup", seconds: 30, announceNext: true, sayDuration: false },
          { name: "Montée sur pointe de pied sur marche, droite", spoken: "Montée sur pointe de pied sur la marche, pied droit", seconds: 30 },
          { name: "Corde à sauter", spoken: "Corde à sauter", seconds: 30 },
          { name: "Montée sur pointe de pied sur marche, gauche", spoken: "Montée sur pointe de pied sur la marche, pied gauche", seconds: 30 },
          { name: "Récup", spoken: "Récup", seconds: 30, announceNext: true, sayDuration: false },
          {
            name: "Planche avec élastique",
            spoken: "Planche avec élastique",
            seconds: 30,
            on: { winter: { name: "Climbers (hiver, à la place de la planche)", spoken: "Climbers, à la place de la planche" } },
          },
          { name: "Corde à sauter", spoken: "Corde à sauter", seconds: 30 },
          { name: "Montée de genou élastique, droite", spoken: "Montée de genou avec élastique, jambe droite", seconds: 30 },
          { name: "Récup", spoken: "Récup", seconds: 30, announceNext: true, sayDuration: false },
          { name: "Montée de genou élastique, gauche", spoken: "Montée de genou avec élastique, jambe gauche", seconds: 30 },
          { name: "Corde à sauter", spoken: "Corde à sauter", seconds: 30 },
        ],
      },
      {
        name: "Course",
        steps: [
          { kind: "step", name: "Course I1 (très facile)", spoken: "Enchaîne avec la course, très facile, intensité 1", seconds: 600 },
        ],
      },
    ],
  },
  {
    // Doc de Céline (16/10). Date confirmée dans Nolio (relu le 11/11 : « 4 à 5 fois », on garde 5).
    id: "C2S4",
    date: "14/11/26",
    title: "C2S4 — Run et renfo, équilibres",
    subtitle: "≈ 60 min · mobilité 9 min, 5 min I1, 5 × (4 min I2 + équilibre skieur, 2 min I4 + équilibre skater), 5 min de retour au calme",
    advice:
      "Après chaque portion de course, 1 min d'équilibre : 30 s sur le pied gauche, 30 s sur le pied droit. Après les 5 min I1 : équilibre avec montée de genou. Puis 5 fois : 4 min I2 et équilibre skieur, 2 min I4 et équilibre skater. Retour au calme 5 min en trottant ou en marchant.",
    blocks: [
      { name: "Mobilité (à la maison)", steps: [...edtC2Mobility(), EDT_SORTIE] },
      {
        name: "Mise en route",
        steps: [
          { kind: "step", name: "Course I1 (très facile)", spoken: "Course très facile, intensité 1", seconds: 300, announceNext: true },
          { kind: "step", name: "Équilibre pied gauche, montée de genou", spoken: "Équilibre pied gauche, montée de genou", seconds: 30 },
          { kind: "step", name: "Équilibre pied droit, montée de genou", spoken: "Pied droit", seconds: 30 },
        ],
      },
      {
        name: "Corps de séance",
        rounds: 5,
        intro: "5 fois : 4 minutes en intensité 2 et équilibre skieur, 2 minutes en intensité 4 et équilibre skater.",
        round: [
          { name: "Course I2 (facile)", spoken: "Course facile, intensité 2", seconds: 240, announceNext: true },
          { name: "Équilibre skieur, pied gauche", spoken: "Équilibre skieur, pied gauche", seconds: 30 },
          { name: "Équilibre skieur, pied droit", spoken: "Pied droit", seconds: 30 },
          { name: "Course I4 (très difficile)", spoken: "Course très difficile, intensité 4", seconds: 120, announceNext: true },
          { name: "Équilibre skater, pied gauche", spoken: "Équilibre skater, pied gauche", seconds: 30 },
          { name: "Équilibre skater, pied droit", spoken: "Pied droit", seconds: 30 },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Retour au calme (trotter ou marcher)", spoken: "Retour au calme, trotte ou marche", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Doc de Céline (16/10) + corrections du 16/10 (4 blocs, 10 × 15-15 partout). Date donnée le 26/10.
    id: "C2S5",
    date: "18/11/26",
    title: "C2S5 — Tabata et EPIC 15-15",
    subtitle: "≈ 68 min · préparation 12 min, 10 min I1, gammes, 4 blocs (tabata 3 min + EPIC 15-15 5 min + 1 min récup), 5 min de retour au calme",
    advice:
      "Un bloc = 3 min de tabata (2 exercices, 20 s d'effort, 10 s de récup, 3 fois), 5 min de course EPIC 15-15 (15 s lent en I2, 15 s rapide), 1 min de récup en trottant ou en marchant. Tabatas : planche ventrale et bear tape, fentes avant gauche et droite, pont pelvien et superman, équilibre avec montée de genou gauche et droit. Le rapide : I3 aux blocs 1 et 2, I4 au bloc 3, I5 au bloc 4. Retour au calme 5 min.",
    options: [WINTER_OPTION],
    blocks: [
      ...edtC2Warmup(EDT_GAMMES_C2S5),
      ...edtC2S5Block(1, [
        { name: "Planche ventrale", spoken: "Planche ventrale", on: { winter: { name: "Climbers (hiver, à la place de la planche)", spoken: "Climbers, à la place de la planche" } } },
        { name: "Bear tape", spoken: "Bear tape" },
      ], "course I3", "Intensité 3"),
      ...edtC2S5Block(2, [
        { name: "Fente avant gauche", spoken: "Fente avant, jambe gauche" },
        { name: "Fente avant droite", spoken: "Fente avant, jambe droite" },
      ], "course I3", "Intensité 3"),
      ...edtC2S5Block(3, [
        { name: "Pont pelvien", spoken: "Pont pelvien" },
        { name: "Superman", spoken: "Superman" },
      ], "course I4", "Intensité 4"),
      ...edtC2S5Block(4, [
        { name: "Équilibre pied gauche, montée de genou", spoken: "Équilibre pied gauche, montée de genou" },
        { name: "Équilibre pied droit, montée de genou", spoken: "Pied droit, montée de genou" },
      ], "course I5", "Intensité 5"),
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Retour au calme (trotter ou marcher)", spoken: "Retour au calme, trotte ou marche", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Doc de Céline (16/10). Date donnée le 26/10.
    id: "C2S6",
    date: "21/11/26",
    title: "C2S6 — Run et core",
    subtitle: "≈ 60 min · mobilité 9 min, 5 min I1, 4 × (4 min 30 I2 + 30 s climbers, 4 min 30 I3 + 30 s bear tape), 5 min de retour au calme",
    advice:
      "Après les 5 min I1 : 30 s d'équilibre avec montée de genou sur chaque pied. Puis 4 fois 10 min : 4 min 30 en I2 et 30 s de climbers, 4 min 30 en I3 et 30 s de bear tape. Retour au calme 5 min en trottant ou en marchant.",
    blocks: [
      { name: "Mobilité (à la maison)", steps: [...edtC2Mobility(), EDT_SORTIE] },
      {
        name: "Mise en route",
        steps: [
          { kind: "step", name: "Course I1 (très facile)", spoken: "Course très facile, intensité 1", seconds: 300, announceNext: true },
          { kind: "step", name: "Équilibre pied gauche, montée de genou", spoken: "Équilibre pied gauche, montée de genou", seconds: 30 },
          { kind: "step", name: "Équilibre pied droit, montée de genou", spoken: "Pied droit", seconds: 30 },
        ],
      },
      {
        name: "Corps de séance",
        rounds: 4,
        intro: "4 fois 10 minutes : intensité 2 et climbers, intensité 3 et bear tape.",
        round: [
          { name: "Course I2 (facile)", spoken: "Course facile, intensité 2", seconds: 270, announceNext: true },
          { name: "Climbers", spoken: "Climbers", seconds: 30 },
          { name: "Course I3 (difficile)", spoken: "Course difficile, intensité 3", seconds: 270, announceNext: true },
          { name: "Bear tape", spoken: "Bear tape", seconds: 30 },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Retour au calme (trotter ou marcher)", spoken: "Retour au calme, trotte ou marche", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Doc de Céline (« Cycle 2 spé », 28/10). Nolio (relu le 13/11) : 24/11, même circuit écrit en
    // distances / répétitions (« corps de séance 30' ») — on garde le découpage chronométré de Céline.
    id: "C2S7",
    date: "24/11/26",
    title: "C2S7 — Circuit capacité aérobie en côte",
    subtitle: "≈ 60 min · préparation 12 min, 10 min I1, gammes double appui, 7 tours de 4 min en côte et descente, 5 min de retour au calme",
    advice:
      "Trouve une côte. Un tour de 4 min, en partant du bas : 20 s de montées de genoux sur place, 10 s de course en cadence en montée (I3), 50 s de fentes avant tempo 2-0-1-0 (2 s pour descendre, 1 s pour monter, en alternant gauche et droite), 20 s de marche en amplitude en montée (I3), 20 s de squats tempo 1-0-1-0, 30 s de course I4 en montée, puis 1 min 30 de descente facile, concentré sur la technique (cadence, engagement). 7 tours. Retour au calme 5 min.",
    blocks: [
      ...edtC2Warmup(EDT_GAMMES_C2S3),
      {
        name: "Circuit en côte",
        rounds: 7,
        intro: "Circuit en côte, 7 tours de 4 minutes. Place-toi en bas de la côte.",
        round: [
          { name: "Montées de genoux sur place", spoken: "Montées de genoux sur place", seconds: 20 },
          { name: "Course en cadence en montée (I3)", spoken: "Course en cadence, en montée, intensité 3", seconds: 10, cadence: true, sayDuration: false },
          { name: "Fentes avant tempo 2-0-1-0 (alterner G et D)", spoken: "Fentes avant, 2 secondes pour descendre, 1 pour monter. Alterne gauche et droite", seconds: 50 },
          { name: "Marche en amplitude en montée (I3)", spoken: "Marche en amplitude, en montée, intensité 3", seconds: 20 },
          { name: "Squats tempo 1-0-1-0", spoken: "Squats, une seconde pour descendre, une pour monter", seconds: 20 },
          { name: "Course I4 en montée", spoken: "Course en montée, intensité 4", seconds: 30 },
          { name: "Descente facile, technique (cadence, engagement)", spoken: "Descente facile. Concentre-toi sur la technique : cadence, engagement", seconds: 90, announceNext: true },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Retour au calme (trotter ou marcher)", spoken: "Retour au calme, trotte ou marche", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Doc de Céline (28/10) + retour au calme ajouté le 29/10 (oubli dans le doc, il est dans Nolio).
    id: "C2S8",
    date: "27/11/26",
    title: "C2S8 — Run et renfo plio",
    subtitle: "≈ 54 min · mobilité 9 min, 3 min I1 + rotations de hanches, 3 × (5 min I1 + hanches et jumping jacks, 5 min I2 + balistique et montées de genoux), 5 min de retour au calme",
    advice:
      "Après 3 min en I1 : 1 min de rotations de hanches. Puis 3 fois : 5 min en I1, 30 s de rotations de hanches et 30 s de jumping jacks ; 5 min en I2, 30 s de mobilité balistique et 30 s de montées de genoux sur place. Retour au calme 5 min en I1.",
    blocks: [
      { name: "Mobilité (à la maison)", steps: [...edtC2Mobility(), EDT_SORTIE] },
      {
        name: "Mise en route",
        steps: [
          { kind: "step", name: "Course I1", spoken: "Course, intensité 1", seconds: 180, announceNext: true },
          { kind: "step", name: "Rotations de hanches", spoken: "Rotations de hanches", seconds: 60 },
        ],
      },
      {
        name: "Run et plio",
        rounds: 3,
        intro: "3 fois : 5 minutes en intensité 1, hanches et jumping jacks ; 5 minutes en intensité 2, balistique et montées de genoux.",
        round: [
          { name: "Course I1", spoken: "Course, intensité 1", seconds: 300, announceNext: true },
          { name: "Rotations de hanches", spoken: "Rotations de hanches", seconds: 30 },
          { name: "Jumping jacks", spoken: "Jumping jacks", seconds: 30 },
          { name: "Course I2", spoken: "Course, intensité 2", seconds: 300, announceNext: true },
          { name: "Mobilité balistique", spoken: "Mobilité balistique", seconds: 30 },
          { name: "Montées de genoux sur place", spoken: "Montées de genoux sur place", seconds: 30 },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile, intensité 1", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Doc de Céline (28/10). Séance du livre « Moins courir pour mieux courir ».
    // Nolio : 01/12 (« C2 S9 SEANCE LIVRE P108 », circuit 25' en distances) — découpage de Céline gardé.
    id: "C2S9",
    date: "01/12/26",
    title: "C2S9 — Circuit en côte (séance livre)",
    subtitle: "≈ 57 min · préparation 12 min, 10 min I1, gammes double appui, 7 tours de 3 min 30 en côte, 5 min de retour au calme",
    advice:
      "Trouve une côte. Un tour de 3 min 30, en partant du bas : 30 s de climbers, 10 s de course en cadence en côte (« courir léger », I3), 20 s de marche en fentes en côte, 10 s de course en cadence (I3), 20 s de squats sautés sur place, 30 s de course en I5 en côte, 1 min 30 de descente facile en cadence. 7 tours (24 min 30). Retour au calme 5 min en I1.",
    blocks: [
      ...edtC2Warmup(EDT_GAMMES_C2S3),
      {
        name: "Circuit en côte",
        rounds: 7,
        intro: "Circuit en côte, 7 tours de 3 minutes 30. Place-toi en bas de la côte.",
        round: [
          { name: "Climbers (en bas)", spoken: "En bas, climbers", seconds: 30 },
          { name: "Course en cadence en côte, courir léger (I3)", spoken: "Course en cadence, cours léger, intensité 3", seconds: 10, cadence: true, sayDuration: false },
          { name: "Fentes marchées en côte", spoken: "Marche en fentes", seconds: 20 },
          { name: "Course en cadence en côte, courir léger (I3)", spoken: "Course en cadence, cours léger", seconds: 10, cadence: true, sayDuration: false },
          { name: "Squats jumps sur place", spoken: "Squats sautés, sur place", seconds: 20 },
          { name: "Course I5 en côte", spoken: "Course en côte, intensité 5", seconds: 30 },
          { name: "Descente facile en cadence", spoken: "Descente facile, en cadence", seconds: 90, cadence: true, announceNext: true },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile, intensité 1", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Doc de Céline (28/10). Le lien vidéo du retour au calme (« FENTE MG 2 ») est une erreur :
    // on alterne fente arrière + montée de genou (après l'I2) et équilibre montée de genou (Céline, 29/10).
    id: "C2S10",
    date: "05/12/26",
    title: "C2S10 — Run et renfo, équilibres",
    subtitle: "≈ 54 min · mobilité 9 min, 2 × (3 min I1 + mobilité), 4 × (3 min I2 + équilibre fente, 3 min I3 + équilibre montée de genou), 5 min de retour au calme",
    advice:
      "3 min en I1 puis 1 min de mobilité épaules et tronc ; 3 min en I1 puis 1 min de mobilité du pied (stepper). Puis 4 fois : 3 min en I2 et 1 min d'équilibre fente arrière + montée de genou (en alternant gauche et droite), 3 min en I3 et 1 min d'équilibre avec montée de genou (30 s gauche, 30 s droite). Retour au calme 5 min en I1.",
    blocks: [
      { name: "Mobilité (à la maison)", steps: [...edtC2Mobility(), EDT_SORTIE] },
      {
        name: "Mise en route",
        steps: [
          { kind: "step", name: "Course I1", spoken: "Course, intensité 1", seconds: 180, announceNext: true },
          { kind: "step", name: "Mobilité épaules et tronc", spoken: "Mobilité des épaules et du tronc", seconds: 60 },
          { kind: "step", name: "Course I1", spoken: "Course, intensité 1", seconds: 180, announceNext: true },
          { kind: "step", name: "Mobilité du pied : stepper", spoken: "Mobilité du pied, stepper", seconds: 60 },
        ],
      },
      {
        name: "Run et équilibres",
        rounds: 4,
        intro: "4 fois : 3 minutes en intensité 2 et équilibre fente, 3 minutes en intensité 3 et équilibre avec montée de genou.",
        round: [
          { name: "Course I2", spoken: "Course, intensité 2", seconds: 180, announceNext: true },
          { name: "Équilibre fente arrière + montée de genou (alterner G et D)", spoken: "Équilibre, fente arrière et montée de genou. Alterne gauche et droite", seconds: 60 },
          { name: "Course I3", spoken: "Course, intensité 3", seconds: 180, announceNext: true },
          { name: "Équilibre pied gauche, montée de genou", spoken: "Équilibre pied gauche, montée de genou", seconds: 30 },
          { name: "Équilibre pied droit, montée de genou", spoken: "Pied droit", seconds: 30 },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile, intensité 1", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Doc de Céline (28/10) + 30 s de battement avant le corps de séance (Céline, 29/10).
    id: "C2S11",
    title: "C2S11 — PMA en côte",
    subtitle: "≈ 61 min · préparation 12 min, 10 min I1, gammes en côte, 2 blocs de 6 montées de 35 s en I4-I5, 5 min de retour au calme",
    advice:
      "Côte moyenne. Une première montée de 35 s en I4-I5 : pose ton cône là où tu arrives, tu iras jusqu'à cette marque à chaque fois. Bloc 1, 6 fois : 45 s de fentes avant alternées, montée en I4-I5 jusqu'au cône, 1 min de descente en t'engageant mais en restant relâché. 2 min de récup. Bloc 2, 6 fois : pareil avec 35 s de climbers à la place des fentes. Retour au calme 5 min en I1.",
    blocks: [
      ...edtC2Warmup(EDT_GAMMES_COTE),
      {
        name: "Repérage du cône",
        steps: [
          { kind: "step", name: "Mise en place au pied de la côte", spoken: "Mets-toi en place au pied de la côte, avec ton cône", seconds: 30 },
          { kind: "step", name: "Course I4-I5 en côte : pose ton cône", spoken: "Course en côte, intensité 4 à 5. Pose ton cône là où tu arrives", seconds: 35 },
          { kind: "step", name: "Récup (redescends)", spoken: "Récup, redescends", seconds: 60, announceNext: true },
        ],
      },
      {
        name: "Bloc 1 : fentes",
        rounds: 6,
        intro: "Bloc 1, 6 fois : fentes avant, montée jusqu'au cône, descente engagée.",
        round: [
          { name: "Fentes avant alternées", spoken: "Fentes avant, en alternant", seconds: 45 },
          { name: "Course I4-I5 en côte jusqu'au cône", spoken: "Monte jusqu'au cône, intensité 4 à 5", seconds: 35 },
          { name: "Descente engagée mais relâchée", spoken: "Descente. Engage-toi, mais reste relâché", seconds: 60, announceNext: true },
        ],
      },
      {
        name: "Récup",
        steps: [
          { kind: "step", name: "Récup (trotter ou marcher)", spoken: "Récup, trotte ou marche", seconds: 120, announceNext: true },
        ],
      },
      {
        name: "Bloc 2 : climbers",
        rounds: 6,
        intro: "Bloc 2, 6 fois : climbers, montée jusqu'au cône, descente engagée.",
        round: [
          { name: "Climbers", spoken: "Climbers", seconds: 35 },
          { name: "Course I4-I5 en côte jusqu'au cône", spoken: "Monte jusqu'au cône, intensité 4 à 5", seconds: 35 },
          { name: "Descente engagée mais relâchée", spoken: "Descente. Engage-toi, mais reste relâché", seconds: 60, announceNext: true },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile, intensité 1", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Doc de Céline (28/10). Équilibre aussi après la minute en I5 (Céline, 29/10), pas comme la C2S2.
    id: "C2S12",
    title: "C2S12 — Run et renfo, équilibres (pyramide)",
    subtitle: "≈ 60 min · mobilité 9 min, 11 portions de course I1 → I5 → I1 avec 1 min d'équilibre entre chaque",
    advice:
      "Après chaque portion de course, 1 min d'équilibre (30 s gauche, 30 s droite), dans l'ordre : montée de genou, skieur, skater. Portions : 5 min I1, 4 min I2, 4 min I2, 4 min I3, 4 min I3, 3 min I4, 1 min I5, 3 min I4, 4 min I3, 4 min I2, 5 min I1. Pas d'équilibre après les 5 dernières minutes : la séance se termine là.",
    blocks: [
      { name: "Mobilité (à la maison)", steps: [...edtC2Mobility(), EDT_SORTIE] },
      {
        name: "Corps de séance",
        intro: "Corps de séance, 51 minutes. Après chaque portion de course, une minute d'équilibre : montée de genou, skieur, puis skater.",
        steps: [
          [300, 1], [240, 2], [240, 2], [240, 3], [240, 3], [180, 4], [60, 5], [180, 4], [240, 3], [240, 2], [300, 1],
        ].flatMap(([seconds, i], k, all) => {
          const balance = [
            ["Équilibre pied gauche, montée de genou", "Équilibre pied gauche, montée de genou", "Équilibre pied droit, montée de genou"],
            ["Équilibre skieur, pied gauche", "Équilibre skieur, pied gauche", "Équilibre skieur, pied droit"],
            ["Équilibre skater, pied gauche", "Équilibre skater, pied gauche", "Équilibre skater, pied droit"],
          ][k % 3];
          return [
            { kind: "step", name: `Course I${i}`, spoken: `Course, intensité ${i}`, seconds, announceNext: true },
            ...(k < all.length - 1
              ? [
                  { kind: "step", name: balance[0], spoken: balance[1], seconds: 30 },
                  { kind: "step", name: balance[2], spoken: "Pied droit", seconds: 30 },
                ]
              : []),
          ];
        }),
      },
    ],
  },
  {
    // Doc de Céline (28/10) : échauffement des S9/S11 avec équilibre skieur et gammes en descente
    // (10 min) ; 10 tours de 2 min 30 (3 fois la série skieur / skater / skater croisé, puis un tour libre).
    id: "C2S13",
    title: "C2S13 — Technique de descente",
    subtitle: "≈ 62 min · préparation 12 min, 10 min I1, gammes en descente 10 min, 10 tours de 2 min 30 en côte, 5 min de retour au calme",
    advice:
      "Trouve une côte. Un tour de 2 min 30 : 30 s de climbers en bas, 40 s de course facile en côte (I2), 40 s d'équilibre en haut (20 s gauche, 20 s droite), 20 s de descente avec une consigne technique, 20 s de course facile pour boucler. Équilibre et consigne changent à chaque tour : skieur et hypercadence, skater et engagement, skater croisé et double appui, 3 fois ; le 10e tour, équilibre et consigne au choix. Retour au calme 5 min en I1.",
    blocks: (() => {
      const balances = ["skieur", "skater", "skater croisé"];
      const descents = [
        ["Descente avec hypercadence", "Descente, hypercadence"],
        ["Descente avec engagement", "Descente, avec engagement"],
        ["Descente en double appui", "Descente, en double appui"],
      ];
      const tours = Array.from({ length: 10 }, (_, k) => k);
      const pick = (k, list, libre) => (k === 9 ? libre : list[k % 3]);
      return [
        ...edtC2Warmup(EDT_GAMMES_DESCENTE, { balance: "skieur" }),
        {
          name: "Technique de descente",
          rounds: 10,
          intro: "Technique de descente, 10 tours de 2 minutes 30. Place-toi en bas de la côte.",
          round: [
            { name: "Climbers (en bas)", spoken: "En bas, climbers", seconds: 30 },
            { name: "Course facile en côte (I2)", spoken: "Course facile en côte, intensité 2", seconds: 40 },
            {
              label: "20 s d'équilibre en haut, pied gauche (skieur · skater · skater croisé · au choix au 10e tour)",
              name: tours.map((k) => `Équilibre ${pick(k, balances, "au choix")}, pied gauche`),
              spoken: tours.map((k) => `En haut, équilibre ${pick(k, balances, "au choix")}, pied gauche`),
              seconds: 20,
            },
            {
              label: "20 s pied droit",
              name: tours.map((k) => `Équilibre ${pick(k, balances, "au choix")}, pied droit`),
              spoken: "Pied droit",
              seconds: 20,
            },
            {
              label: "20 s de descente (hypercadence · engagement · double appui · consigne libre au 10e tour)",
              name: tours.map((k) => pick(k, descents, ["Descente, consigne technique libre", ""])[0]),
              spoken: tours.map((k) => pick(k, descents, ["", "Descente, consigne technique au choix"])[1]),
              seconds: 20,
            },
            { name: "Bouclage : course facile", spoken: "Boucle en course facile", seconds: 20 },
          ],
        },
        {
          name: "Retour au calme",
          steps: [
            { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile, intensité 1", seconds: 300 },
          ],
        },
      ];
    })(),
  },
  {
    // Doc de Céline (28/10) + descriptif du 29/10 : 7 × (9 min de course + 35 s de climbers
    // + 25 s de squats tempo) = 70 min, puis 5 min de retour au calme en I1.
    id: "C2S14",
    title: "C2S14 — Simulation trail",
    subtitle: "≈ 84 min · mobilité 9 min, rando-course 70 min en I1-I2 avec renfo toutes les 10 min, 5 min de retour au calme",
    advice:
      "Rando-course facile en I1-I2. Toutes les 10 min : 35 s de climbers (environ 30) et 25 s de squats tempo 1-0-1-0 (environ 10). 7 fois. Retour au calme 5 min en I1.",
    blocks: [
      { name: "Mobilité (à la maison)", steps: [...edtC2Mobility(), EDT_SORTIE] },
      {
        name: "Rando-course",
        rounds: 7,
        intro: "Rando-course, 7 fois 10 minutes : 9 minutes facile, puis climbers et squats.",
        round: [
          { name: "Rando-course facile (I1-I2)", spoken: "Rando-course facile, intensité 1 à 2", seconds: 540, announceNext: true },
          { name: "Climbers (environ 30)", spoken: "Climbers, une trentaine", seconds: 35 },
          { name: "Squats tempo 1-0-1-0 (environ 10)", spoken: "10 squats, une seconde pour descendre, une pour monter", seconds: 25 },
        ],
      },
      {
        name: "Retour au calme",
        steps: [
          { kind: "step", name: "Course facile (I1)", spoken: "Retour au calme, course facile, intensité 1", seconds: 300 },
        ],
      },
    ],
  },
  {
    // Nolio 03/12 « WOD KB FORCE » (1 h 15 annoncée). Répétitions en tempo 3-0-1-0 : steps estimés
    // (pas de décompte), récup entre séries réglable (le coach dit 2 à 3 min). Pas de plio.
    id: "WOD-KB-FORCE",
    date: "03/12/26",
    title: "WOD KB — Force (squat bulgare, deadlift roumain, gobelet)",
    subtitle: "≈ 40 min · échauffement 5 tours, puis 3 × 3 séries de 6 en tempo 3-0-1-0, 2 à 3 min de récup",
    advice:
      "Tempo 3-0-1-0 : 3 s pour descendre, pas de pause, 1 s pour remonter. Échauffement 5 tours : 10 air squats, 20 good mornings, 30 s de planche, 30 s de superman. Puis 3 séries de 6 squats bulgares par jambe, 3 séries de 6 deadlifts roumains par jambe, 3 séries de 6 squats gobelet, avec 2 à 3 min de récup entre les séries. Les répétitions sont à ton rythme : le player passe à la suite sans décompte.",
    options: [
      {
        key: "wodRest",
        label: "Récup entre séries",
        default: 150,
        choices: [
          { value: 120, label: "2 min" },
          { value: 150, label: "2 min 30" },
          { value: 180, label: "3 min" },
        ],
      },
    ],
    blocks: [
      {
        name: "Échauffement",
        rounds: 5,
        intro: "Échauffement, 5 tours : air squats, good mornings, planche, superman.",
        round: [
          { name: "10 air squats", spoken: "10 air squats", seconds: 25, estimated: true },
          { name: "20 good mornings", spoken: "20 good mornings", seconds: 40, estimated: true },
          { name: "Planche", spoken: "Planche", seconds: 30 },
          { name: "Superman", spoken: "Superman", seconds: 30 },
        ],
      },
      wodForceBlock("Squat bulgare", [
        { name: "6 squats bulgares, jambe droite (tempo 3-0-1-0)", spoken: "6 squats bulgares, jambe droite. 3 secondes pour descendre, 1 pour monter", seconds: 35, estimated: true },
        { name: "6 squats bulgares, jambe gauche (tempo 3-0-1-0)", spoken: "Jambe gauche, 6 squats bulgares", seconds: 35, estimated: true },
      ]),
      wodForceBlock("Deadlift roumain", [
        { name: "6 deadlifts roumains, jambe droite (tempo 3-0-1-0)", spoken: "6 deadlifts roumains, jambe droite. 3 secondes pour descendre, 1 pour monter", seconds: 35, estimated: true },
        { name: "6 deadlifts roumains, jambe gauche (tempo 3-0-1-0)", spoken: "Jambe gauche, 6 deadlifts roumains", seconds: 35, estimated: true },
      ]),
      wodForceBlock("Squat gobelet", [
        { name: "6 squats gobelet (tempo 3-0-1-0)", spoken: "6 squats gobelet. 3 secondes pour descendre, 1 pour monter", seconds: 35, estimated: true },
      ], true),
    ],
  },
  {
    // PAVEL (musculation, kettlebell) : toutes les 30 s, 5 swings × 4, 1 min de récup,
    // 5 pompes dynamiques × 4, 1 min de récup, en boucle pendant 12 ou 18 min.
    id: "PAVEL",
    date: "04/11/26",
    title: "PAVEL — Swings et pompes",
    subtitle: "12 ou 18 min · toutes les 30 s : 5 swings × 4, 1 min de récup, 5 pompes dynamiques × 4, 1 min de récup",
    advice:
      "À faire à jeun, après un petit échauffement de mobilité des hanches et du haut du corps. Toutes les 30 secondes : 5 swings, 4 fois, puis 1 min de récup ; 5 pompes dynamiques, 4 fois, puis 1 min de récup. Tu récupères le reste des 30 secondes.",
    options: [
      {
        key: "cycles",
        label: "Durée",
        default: 2,
        choices: [
          { value: 2, label: "12 min" },
          { value: 3, label: "18 min" },
        ],
      },
      {
        key: "pavelWarmup",
        label: "Échauffement PAVEL 9 min",
        default: 0,
        choices: [
          { value: 0, label: "Non" },
          { value: 1, label: "Oui" },
        ],
      },
    ],
    blocks: [
      {
        // Échauffement PAVEL 9' (Nolio, à partir du 25/11). Bloc vide si l'option est sur « Non ».
        name: "Échauffement PAVEL",
        steps: [],
        on: { pavelWarmup: { steps: PAVEL_WARMUP } },
      },
      {
        name: "PAVEL",
        rounds: { option: "cycles" },
        roundLabel: "Cycle",
        intro: "PAVEL. Toutes les 30 secondes, 5 swings, 4 fois. 1 minute de récup. Puis 5 pompes dynamiques, 4 fois, et 1 minute de récup.",
        round: [
          {
            label: "4 × 30 s (5 swings)",
            steps: [1, 2, 3, 4].map((k) => ({
              name: `5 swings (${k}/4)`,
              spoken: "5 swings",
              seconds: 30,
              sayDuration: false,
            })),
          },
          { name: "Récup", spoken: "Récup", seconds: 60, announceNext: true },
          {
            label: "4 × 30 s (5 pompes dynamiques)",
            steps: [1, 2, 3, 4].map((k) => ({
              name: `5 pompes dynamiques (${k}/4)`,
              spoken: "5 pompes dynamiques",
              seconds: 30,
              sayDuration: false,
            })),
          },
          { name: "Récup", spoken: "Récup", seconds: 60, announceNext: true },
        ],
      },
    ],
  },
  {
    // CORE : selon le jour, Nolio donne 20 s / 40 s (07/11, 06/12) ou 30 s / 30 s (22/11) → option.
    id: "CORE",
    date: "07/11/26",
    title: "CORE — Climbers, superman, crunch",
    subtitle: "9 ou 12 min · 3 exercices, 20 s / 40 s ou 30 s / 30 s, 3 ou 4 tours",
    advice:
      "Mountain climbers lents et contrôlés. Superman : pieds au sol, bras tendus vers l'avant, regarde le sol. Crunch : pieds au sol, genoux fléchis. Effort et récup selon le jour : 20 s / 40 s ou 30 s / 30 s.",
    options: [
      {
        key: "tours",
        label: "Tours",
        default: 3,
        choices: [
          { value: 3, label: "3 tours (9 min)" },
          { value: 4, label: "4 tours (12 min)" },
        ],
      },
      {
        key: "core3030",
        label: "Effort / récup",
        default: 0,
        choices: [
          { value: 0, label: "20 s / 40 s" },
          { value: 1, label: "30 s / 30 s" },
        ],
      },
    ],
    blocks: [
      {
        name: "Core",
        rounds: { option: "tours" },
        intro: "Gainage. 3 exercices, 20 secondes d'effort, 40 secondes de récup.",
        on: { core3030: { intro: "Gainage. 3 exercices, 30 secondes d'effort, 30 secondes de récup." } },
        round: [
          { name: "Mountain climbers lents", spoken: "Mountain climbers, lents et contrôlés", seconds: 20, on: { core3030: { seconds: 30 } } },
          { name: "Récup", spoken: "Récup", seconds: 40, announceNext: true, sayDuration: false, on: { core3030: { seconds: 30 } } },
          { name: "Superman", spoken: "Superman, pieds au sol, bras tendus, regarde le sol", seconds: 20, on: { core3030: { seconds: 30 } } },
          { name: "Récup", spoken: "Récup", seconds: 40, announceNext: true, sayDuration: false, on: { core3030: { seconds: 30 } } },
          { name: "Crunch", spoken: "Crunch, pieds au sol, genoux fléchis", seconds: 20, on: { core3030: { seconds: 30 } } },
          { name: "Récup", spoken: "Récup", seconds: 40, announceNext: true, sayDuration: false, on: { core3030: { seconds: 30 } } },
        ],
      },
    ],
  },
];

// Séances qui reviennent dans Nolio (PAVEL, CORE…) : une entrée de plus dans le
// sélecteur par date, même contenu, durée par défaut de ce jour-là. Id = "<id>-jj-mm".
const LIBRARY_REPEATS = [
  { of: "PAVEL", date: "11/11/26", options: { cycles: 2 } },
  { of: "PAVEL", date: "15/11/26", options: { cycles: 3 } },
  { of: "PAVEL", date: "20/11/26", options: { cycles: 3 } },
  { of: "CORE", date: "22/11/26", options: { tours: 4, core3030: 1 }, label: "12 min, 30 s / 30 s" },
  { of: "PAVEL", date: "25/11/26", options: { cycles: 2, pavelWarmup: 1 }, label: "21 min avec échauffement" },
  { of: "PAVEL", date: "28/11/26", options: { cycles: 3, pavelWarmup: 1 }, label: "27 min avec échauffement" },
  { of: "CORE", date: "06/12/26", options: { tours: 3, core3030: 0 }, label: "9 min, 20 s / 40 s" },
];

LIBRARY_REPEATS.forEach(({ of, date, options, label }) => {
  const base = SESSION_LIBRARY.find((s) => s.id === of);
  if (!base) return;
  const opts = (base.options || []).map((o) =>
    options && options[o.key] != null ? { ...o, default: options[o.key] } : o
  );
  const chosen = opts.map((o) => o.choices.find((c) => c.value === o.default)).filter(Boolean);
  // « 12 min » ou « 4 tours (12 min) » → la durée du jour en tête du sous-titre.
  // Libellé imposé, sinon la durée tirée de la 1re option (« 4 tours (12 min) » → « 12 min »).
  const dur = label || (chosen[0] ? (chosen[0].label.match(/\(([^)]+)\)/) || [, chosen[0].label])[1] : "");
  const [, ...restSub] = base.subtitle.split(" · ");
  SESSION_LIBRARY.push({
    ...base,
    id: `${of}-${date.slice(0, 5).replace("/", "-")}`,
    date,
    subtitle: dur ? [dur, ...restSub].join(" · ") : base.subtitle,
    options: opts,
    repeatOf: of,
  });
});

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
  const activeOptions = Object.keys(options).filter((k) => options[k]);
  if (activeOptions.length) def = libraryApplyOptionVariants(def, activeOptions);
  // Bloc rendu vide par une option (échauffement PAVEL sur « Non ») : on l'enlève du plan.
  def = { ...def, blocks: def.blocks.filter((b) => b.round || (b.steps && b.steps.length)) };
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
            // `lastRounds` : variante sur les N derniers tours (compté depuis la fin).
            const late = sub.lastRounds && r > rounds - sub.lastRounds.count ? sub.lastRounds : null;
            const subName = late && late.name ? late.name : pick(sub.name, r);
            const subSpoken = late && late.spoken ? late.spoken : sub.spoken ? pick(sub.spoken, r) : subName;
            push(blockId, {
              name: subName,
              spoken: subSpoken,
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
          music: item.music,
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
        sayDuration: item.sayDuration,
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
