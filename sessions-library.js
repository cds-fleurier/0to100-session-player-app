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
//
// `cadence: true` : le métronome (si activé) tourne pendant ce step.
// `intro` (sur un bloc, ou sur le premier step d'un cycle/sequence) : phrase
// dite une seule fois à l'entrée, avant l'annonce du step.

const SESSION_LIBRARY = [
  {
    id: "C1S1",
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
          "Corps de séance, 13 tours. Commence facile en intensité 1, et monte progressivement vers intensité 2 au fil des tours.",
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
    // Séance complète telle que fournie : pas d'échauffement, on part sur 4' de course.
    id: "C1S2",
    title: "C1S2 — Course + renfo isométrique",
    subtitle: "45 min · 9 tours de 4 min course + 1 min renfo, intensité I1 / I2 en alternance",
    advice:
      "Alterner 4 min de course et 1 min de renfo isométrique. Tours impairs en I1 (demi-squat puis planche), tours pairs en I2 (planche puis demi-squat).",
    blocks: [
      {
        name: "Corps de séance",
        rounds: 9,
        intro:
          "Corps de séance, 9 tours de 5 minutes. 4 minutes de course, puis 1 minute de renfo. Intensité 1 sur les tours impairs, intensité 2 sur les tours pairs.",
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

  const seconds = (item) =>
    item.secondsFrom != null ? options[item.secondsFrom] : item.seconds;

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
      for (let r = 1; r <= block.rounds; r += 1) {
        block.round.forEach((item, i) => {
          const dur = seconds(item);
          blockSeconds += dur;
          push(blockId, {
            name: pick(item.name, r),
            spoken: item.spoken ? pick(item.spoken, r) : pick(item.name, r),
            seconds: dur,
            round: r,
            sayRound: i === 0,
            cadence: Boolean(item.cadence),
            announceNext: Boolean(item.announceNext),
            intro: r === 1 && i === 0 ? introFor() : undefined,
            blockName: block.name,
          });
        });
      }
      const roundDesc = block.round
        .map((item) => {
          // `label` : libellé du plan quand le nom tourne à chaque tour.
          const label = item.label || (Array.isArray(item.name) ? item.name.join(" / ") : item.name);
          return `${libraryFormatDuration(seconds(item))} ${label}`;
        })
        .join(" + ");
      detail.push(`${block.rounds} tours de ${roundDesc}`);
    }

    (block.steps || []).forEach((item) => {
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
