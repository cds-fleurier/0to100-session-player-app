// Joue chaque séance de la bibliothèque (toutes combinaisons d'options) dans un
// faux navigateur et relève tout ce que le player prononce.
// Sortie : tools/phrases.json — { phrases: [texte…], sessions: { C1S4: [texte…] } }
// Usage : node tools/collect-phrases.cjs
//
// Pourquoi : sur iPhone, speechSynthesis coupe la musique des autres apps (test
// diag.html du 29/09/2026). Le player joue donc des phrases pré-enregistrées
// en Web Audio — il faut connaître d'avance toutes les phrases possibles.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

function stubElement() {
  const el = {
    value: "",
    checked: false,
    textContent: "",
    innerHTML: "",
    disabled: false,
    hidden: false,
    style: {},
    dataset: {},
    options: [],
    children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) {
      if (child && child.__option) el.options.push(child);
      return child;
    },
    append() {},
    replaceChildren() {},
    setAttribute() {},
    removeAttribute() {},
    querySelector: () => stubElement(),
    querySelectorAll: () => [],
    focus() {},
  };
  return el;
}

function makeContext(spoken) {
  const elements = {};
  const storage = new Map();
  const document = {
    getElementById(id) {
      if (!elements[id]) elements[id] = stubElement();
      return elements[id];
    },
    createElement(tag) {
      const el = stubElement();
      if (tag === "option") el.__option = true;
      return el;
    },
    querySelector: () => stubElement(),
    querySelectorAll: () => [],
    addEventListener() {},
    body: stubElement(),
    visibilityState: "visible",
  };
  const ctx = {
    console,
    document,
    navigator: { userAgent: "node", platform: "node", maxTouchPoints: 0 },
    localStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    },
    // Horloge pilotée à la main : les délais internes du player s'exécutent tout de suite.
    setTimeout: (fn) => {
      fn();
      return 1;
    },
    clearTimeout() {},
    setInterval: () => 1,
    clearInterval() {},
    performance: { now: () => 0 },
    URL: { createObjectURL: () => "" },
    Blob: function Blob() {},
    fetch: () => Promise.reject(new Error("no fetch")),
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const file of ["music-library.js", "sessions-library.js", "script.js"]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), ctx, { filename: file });
  }
  // La voix est coupée côté DOM stub : on capte le texte à la source.
  vm.runInContext("els.voiceToggle.checked = true;", ctx);
  ctx.speak = (text) => spoken.add(String(text));
  ctx.beep = () => {};
  return { ctx, storage };
}

function combos(options) {
  if (!options || !options.length) return [{}];
  const [first, ...rest] = options;
  const tails = combos(rest);
  const out = [];
  for (const choice of first.choices) {
    for (const tail of tails) out.push({ [first.key]: choice.value, ...tail });
  }
  return out;
}

function playSession(def, overrides) {
  const spoken = new Set();
  const { ctx, storage } = makeContext(spoken);
  for (const [key, value] of Object.entries(overrides)) {
    storage.set(`sportSessionLibraryOpt_${def.id}_${key}`, String(value));
  }
  vm.runInContext(
    `els.sessionPicker.value = ${JSON.stringify(def.id)};
     parseAndLoad();
     if (!sessionData) throw new Error("séance non chargée : ${def.id}");
     startTimer();
     let guard = 0;
     while (guard < 100000) {
       guard += 1;
       if (!timerId) {
         if (!currentStep()) break;
         startTimer();          // reprise après un checkpoint
         continue;
       }
       tick();
     }
     if (guard >= 100000) throw new Error("boucle infinie : ${def.id}");
     // FWD depuis n'importe où : l'annonce dépend du step précédent, déjà couvert,
     // mais on rejoue chaque annonce pour ne rien rater.
     timeline = buildTimeline(sessionData);
     for (let i = 0; i < timeline.length; i += 1) {
       idx = i;
       if (timeline[i].type !== "checkpoint") announceStepStart(timeline[i]);
     }`,
    ctx
  );
  return spoken;
}

const probe = makeContext(new Set()).ctx;
const library = vm.runInContext("SESSION_LIBRARY", probe);

const sessions = {};
const all = new Set();
for (const def of library) {
  const texts = new Set();
  for (const overrides of combos(def.options)) {
    for (const t of playSession(def, overrides)) texts.add(t);
  }
  // Chiffres du décompte : toujours disponibles.
  for (const n of ["1", "2", "3", "4", "5"]) texts.add(n);
  sessions[def.id] = [...texts].filter((t) => t.trim()).sort();
  sessions[def.id].forEach((t) => all.add(t));
  console.log(`${def.id} : ${sessions[def.id].length} phrases (${combos(def.options).length} combinaisons d'options)`);
}

const out = { phrases: [...all].sort(), sessions };
fs.writeFileSync(path.join(__dirname, "phrases.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`Total : ${out.phrases.length} phrases uniques → tools/phrases.json`);
