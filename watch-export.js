// Export Apple Watch : la séance chargée → fichier .workout (app Exercice, watchOS 10+).
// Validé sur Apple Watch Ultra 3 / watchOS 26.6 (Jonathan, 03/11/2026) avec la C2S1.
//
// Le format .workout n'a pas de spec publique : on passe par l'encodeur open source
// @bibixx/workoutkit (MIT, rétro-ingénierie, vendor/workoutkit/encode.js), chargé
// seulement au clic. Ici on ne fait que traduire la timeline du player en plan
// « custom » WorkoutKit (JSON), sans dépendance : testable sous Node.
//
// Choix (validés avec Charles) :
// - un seul fichier, préparation à la maison comprise ; un checkpoint du player
//   (« Sortie »…) devient une étape sans durée, qu'on passe à la main sur la montre ;
// - WorkoutKit n'imbrique pas les répétitions : on aplatit, puis on regroupe les
//   motifs qui se répètent (tabata ×2, EPIC 20-20 ×9…) en blocs à N tours ;
// - uniquement les séances avec de la course (PAVEL, CORE : pas d'export).

// Mots entiers : « crunch » (CORE) contient « run ».
const WATCH_RUN_RE = /\b(course|epic|trott\w*|footing|jog|run)\b/i;

// « Chaise (1/8) » → « Chaise », « EPIC 3/9 — course facile » → « EPIC — course facile » :
// sans compteur, les tours identiques se ressemblent et se regroupent.
function watchStepName(name) {
  return String(name || "")
    .replace(/\s*\(\d+\/\d+\)/g, "")
    .replace(/\s+\d+\/\d+(?=\s|$)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function watchSessionHasRun(steps) {
  return steps.some((s) => s.type !== "checkpoint" && WATCH_RUN_RE.test(s.name || ""));
}

function watchStepsFromTimeline(steps) {
  return steps.map((s) => {
    if (s.type === "checkpoint") {
      const name = /sortie/i.test(s.name)
        ? "Sors ! Étape suivante une fois dehors"
        : `${s.name} : étape suivante quand tu es prêt`;
      return { purpose: "recovery", step: { goal: { type: "open" }, displayName: name } };
    }
    const name = s.type === "transition" ? `→ ${s.target}` : watchStepName(s.name);
    return {
      purpose: s.type === "work" ? "work" : "recovery",
      step: { goal: { type: "time", time: { value: s.seconds, unit: "seconds" } }, displayName: name },
    };
  });
}

// Regroupe les répétitions : à chaque position, le motif (jusqu'à 24 étapes) qui couvre
// le plus d'étapes en se répétant au moins 2 fois ; le reste va dans des blocs d'un tour.
function sameButName(a, b) {
  return a.purpose === b.purpose && JSON.stringify(a.step.goal) === JSON.stringify(b.step.goal);
}

function watchBlocks(items) {
  const key = (it) => JSON.stringify(it);
  const keys = items.map(key);
  const blocks = [];
  let single = [];
  const flush = () => {
    if (single.length) blocks.push({ iterations: 1, steps: single });
    single = [];
  };
  let i = 0;
  while (i < items.length) {
    let best = null;
    for (let p = 1; p <= 24 && i + 2 * p <= items.length; p += 1) {
      let k = 1;
      while (i + (k + 1) * p <= items.length) {
        let mismatch = -1;
        for (let j = 0; j < p; j += 1) {
          if (keys[i + k * p + j] !== keys[i + j]) { mismatch = j; break; }
        }
        if (mismatch === -1) { k += 1; continue; }
        // Dernier tour dont seule la récup finale change de nom (« Récup, prépare-toi
        // à courir ») : on le compte quand même, avec le nom des autres tours.
        // Jamais pour un effort : « Talons-fesses » ≠ « Talons-fesses + arrêt ».
        const last = items[i + k * p + p - 1];
        if (p >= 2 && mismatch === p - 1 && last.purpose === "recovery" && sameButName(last, items[i + p - 1])) k += 1;
        break;
      }
      if (k >= 2 && (!best || p * k > best.p * best.k)) best = { p, k };
    }
    if (best) {
      flush();
      blocks.push({ iterations: best.k, steps: items.slice(i, i + best.p) });
      i += best.p * best.k;
    } else {
      single.push(items[i]);
      i += 1;
    }
  }
  flush();
  return blocks;
}

function buildWatchPlan(data, steps) {
  const [code] = String(data.title || "Séance").split(" — ");
  return {
    referenceId: crypto.randomUUID(),
    custom: {
      activity: "running",
      location: "outdoor",
      displayName: `${code} · 0 to 100`,
      blocks: watchBlocks(watchStepsFromTimeline(steps)),
    },
  };
}

function watchFileName(data) {
  const [code] = String(data.title || "seance").split(" — ");
  return `${code.replace(/[^\w-]+/g, "_")}.workout`;
}
