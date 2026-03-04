const els = {
  input: document.getElementById("sessionInput"),
  pasteNolioBtn: document.getElementById("pasteNolioBtn"),
  parseBtn: document.getElementById("parseBtn"),
  parseStatus: document.getElementById("parseStatus"),
  list: document.getElementById("exerciseList"),
  meta: document.getElementById("sessionMeta"),
  phase: document.getElementById("phaseLabel"),
  countdown: document.getElementById("countdown"),
  current: document.getElementById("currentLabel"),
  next: document.getElementById("nextLabel"),
  start: document.getElementById("startBtn"),
  pause: document.getElementById("pauseBtn"),
  reset: document.getElementById("resetBtn"),
  voiceToggle: document.getElementById("voiceToggle"),
  voiceMode: document.getElementById("voiceMode"),
};

let sessionData = null;
let timeline = [];
let idx = 0;
let remaining = 0;
let timerId = null;
let paused = false;
let prepareAnnounced = false;
let lastCountdownCall = null;
let preStartRemaining = 5;
let preStartLaunching = false;
let preStartLaunchTimeoutId = null;
const VOICE_PREF_KEY = "sportSessionVoicePreference";
const IS_IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_ANDROID = /Android/i.test(navigator.userAgent);
let speechPrimed = false;
let sharedAudioCtx = null;

function normalizeText(value) {
  return (value || "").toLowerCase();
}

function getPreferredVoice() {
  if (!window.speechSynthesis) return null;
  const all = window.speechSynthesis.getVoices() || [];
  if (!all.length) return null;

  const french = all.filter((v) => normalizeText(v.lang).startsWith("fr"));
  const pool = french.length ? french : all;
  const pref = els.voiceMode?.value || "female";

  const femaleHints = ["female", "femme", "woman", "amelie", "audrey", "claire", "julie", "marie"];
  const maleHints = ["male", "homme", "man", "thomas", "daniel", "paul", "nicolas", "alex"];
  const wanted = pref === "male" ? maleHints : femaleHints;
  const avoided = pref === "male" ? femaleHints : maleHints;

  const scoreVoice = (voice) => {
    const haystack = `${normalizeText(voice.name)} ${normalizeText(voice.voiceURI)}`;
    let score = 0;
    for (const hint of wanted) {
      if (haystack.includes(hint)) score += 3;
    }
    for (const hint of avoided) {
      if (haystack.includes(hint)) score -= 2;
    }
    if (normalizeText(voice.lang).startsWith("fr")) score += 1;
    return score;
  };

  const sorted = [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return sorted[0] || null;
}

function updateVoiceControlsState() {
  if (!els.voiceMode) return;
  els.voiceMode.disabled = !els.voiceToggle.checked;
}

function ensureAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
  return sharedAudioCtx;
}

function initMediaEngines() {
  primeSpeechSynthesis();
  const ctx = ensureAudioContext();
  if (ctx && ctx.state === "suspended") ctx.resume();
}

function primeSpeechSynthesis() {
  if (!els.voiceToggle.checked || !window.speechSynthesis || speechPrimed) return;
  const warmup = new SpeechSynthesisUtterance(" ");
  warmup.lang = "fr-FR";
  warmup.volume = 0;
  window.speechSynthesis.speak(warmup);
  speechPrimed = true;
}

function parseDurationToken(token) {
  if (!token) return null;
  const clean = token.trim().toLowerCase();
  const m = clean.match(/(\d+)\s*(s|sec|secs|mn|min)?/i);
  if (!m) return null;
  const value = Number(m[1]);
  const unit = (m[2] || "s").toLowerCase();
  if (["mn", "min"].includes(unit)) return value * 60;
  return value;
}

function parseSession(text) {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\u200b/g, "").trim())
    .filter(Boolean);

  const title = lines.find((l) => /séance|session/i.test(l)) || "Séance";
  const adviceLine = lines.find((l) => /conseils?/i.test(l)) || "";
  const advice = adviceLine.replace(/conseils?\s*:\s*/i, "").trim();

  let rounds = 1;
  for (const line of lines) {
    const m = line.match(/(\d+)\s*tours?/i);
    if (m) rounds = Number(m[1]);
  }

  const isSessionMetaLine = (line) => {
    return (
      /^exercices?/i.test(line) ||
      /^conseils?/i.test(line) ||
      /^dur[ée]e?$/i.test(line) ||
      /^r[ée]cup$/i.test(line) ||
      /tours?/i.test(line) ||
      /séance|session/i.test(line)
    );
  };

  const isDurationOnlyLine = (line) => {
    const compact = line.replace(/\s+/g, "").toLowerCase();
    return /^(\d+)(s|sec|secs|mn|min)?$/.test(compact);
  };

  const exercises = [];
  let pendingName = null;
  let pendingWork = null;

  const pushExercise = (name, workToken, restToken) => {
    const work = parseDurationToken(workToken);
    const rest = parseDurationToken(restToken);
    if (!work || !rest || !name) return;
    exercises.push({ name: name.trim().replace(/[\-:]+$/, ""), work, rest });
  };

  for (const line of lines) {
    if (isSessionMetaLine(line)) continue;

    const matches = [...line.matchAll(/(\d+\s*(?:s|sec|secs|mn|min)?)/gi)];

    if (matches.length >= 2) {
      const firstTokenIndex = line.indexOf(matches[0][0]);
      const inlineName = line.slice(0, firstTokenIndex).trim();
      const name = inlineName || pendingName;
      pushExercise(name, matches[0][1], matches[1][1]);
      pendingName = null;
      pendingWork = null;
      continue;
    }

    if (matches.length === 1) {
      const token = matches[0][1];
      const namePart = line.replace(matches[0][0], "").trim().replace(/[\-:]+$/, "");

      if (namePart) {
        pendingName = namePart;
        pendingWork = token;
        continue;
      }

      if (isDurationOnlyLine(line) && pendingName) {
        if (!pendingWork) {
          pendingWork = token;
        } else {
          pushExercise(pendingName, pendingWork, token);
          pendingName = null;
          pendingWork = null;
        }
      }
      continue;
    }

    // Exercise name on one line, durations on following lines.
    pendingName = line.replace(/[\-:]+$/, "");
    pendingWork = null;
  }

  if (!exercises.length) {
    throw new Error("Aucun exercice détecté. Vérifie le format (nom + durée + récup).");
  }

  return { title, advice, rounds, exercises };
}

function formatSeconds(value) {
  return String(Math.max(0, value)).padStart(2, "0");
}

function setStatus(text, isError = false) {
  els.parseStatus.textContent = text;
  els.parseStatus.style.color = isError ? "#b91c1c" : "#0f766e";
}

async function pasteFromClipboard() {
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    setStatus("Le collage automatique n'est pas supporté ici. Colle manuellement dans la zone de texte.", true);
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) {
      setStatus("Le presse-papiers est vide. Copie ta séance Nolio puis réessaie.", true);
      return;
    }
    stopTimer();
    els.input.value = text.trim();
    parseAndLoad();
    setStatus("Séance collée depuis le presse-papiers.");
  } catch (err) {
    setStatus(
      "Accès au presse-papiers refusé. Autorise le collage puis réessaie, ou colle manuellement.",
      true
    );
  }
}

function speak(text, interrupt = true) {
  if (!els.voiceToggle.checked || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const preferredVoice = getPreferredVoice();
  if (preferredVoice && !IS_IOS) {
    utterance.voice = preferredVoice;
    utterance.lang = preferredVoice.lang || "fr-FR";
  } else {
    utterance.lang = "fr-FR";
  }
  if (IS_IOS) {
    const pref = els.voiceMode?.value || "female";
    utterance.pitch = pref === "male" ? 0.9 : 1.1;
  }
  if (IS_ANDROID) utterance.rate = 1.02;
  utterance.volume = 1;
  utterance.rate = utterance.rate || 1;
  if (interrupt && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
    window.speechSynthesis.cancel();
  }
  window.speechSynthesis.speak(utterance);
}

function beep() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.value = 0.08;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.18);
}

function buildTimeline(data) {
  const steps = [];
  for (let r = 1; r <= data.rounds; r += 1) {
    data.exercises.forEach((ex, exIndex) => {
      steps.push({
        type: "work",
        name: ex.name,
        seconds: ex.work,
        round: r,
        exIndex,
      });

      const isFinalStep = r === data.rounds && exIndex === data.exercises.length - 1;
      if (!isFinalStep) {
        steps.push({
          type: "rest",
          name: "Récupération",
          seconds: ex.rest,
          round: r,
          exIndex,
        });
      }
    });
  }
  return steps;
}

function renderPlan(data) {
  els.meta.innerHTML = `
    <strong>${data.title}</strong><br>
    ${data.advice ? `Conseils: ${data.advice}<br>` : ""}
    ${data.exercises.length} exercices - ${data.rounds} tours
  `;

  els.list.innerHTML = "";
  data.exercises.forEach((ex) => {
    const li = document.createElement("li");
    li.textContent = `${ex.name} - ${ex.work}s effort / ${ex.rest}s récup`;
    els.list.appendChild(li);
  });
}

function currentStep() {
  return timeline[idx] || null;
}

function nextExerciseName() {
  for (let i = idx + 1; i < timeline.length; i += 1) {
    if (timeline[i].type === "work") return timeline[i].name;
  }
  return "Fin de séance";
}

function renderPlayer() {
  const step = currentStep();
  if (!step) {
    els.phase.textContent = "Terminé";
    els.phase.className = "phase";
    els.countdown.textContent = "00";
    els.current.textContent = "Séance terminée";
    els.next.textContent = "";
    els.start.disabled = true;
    els.pause.disabled = true;
    return;
  }

  if (idx === 0 && (preStartRemaining > 0 || preStartLaunching)) {
    const isLaunchPause = preStartLaunching;
    els.phase.textContent = isLaunchPause ? "Top départ" : "Prépare-toi";
    els.phase.className = "phase prepare";
    els.countdown.textContent = isLaunchPause ? "00" : formatSeconds(preStartRemaining);
    els.current.textContent = isLaunchPause ? "On y va" : "Démarrage imminent";
    els.next.textContent = `Premier exercice: ${step.name}`;
    return;
  }

  const isRest = step.type === "rest";
  const inPrepareWindow = isRest && remaining <= 5 && remaining > 0;
  els.phase.textContent = inPrepareWindow ? "Prépare-toi" : isRest ? "Récup" : "Exercice";
  els.phase.className = `phase ${inPrepareWindow ? "prepare" : isRest ? "rest" : ""}`.trim();
  els.countdown.textContent = formatSeconds(remaining);
  els.current.textContent = isRest
    ? `Tour ${step.round}: récupération`
    : `Tour ${step.round}: ${step.name}`;
  els.next.textContent = `Ensuite: ${nextExerciseName()}`;
}

function announceStepStart(step) {
  if (!step) return;
  if (step.type === "work") {
    speak(`Tour ${step.round}. ${step.name}. ${step.seconds} secondes.`);
  } else {
    const nextName = nextExerciseName();
    speak(`Récupération. ${step.seconds} secondes. Ensuite ${nextName}.`);
  }
  beep();
}

function tick() {
  const step = currentStep();
  if (!step) return;

  if (idx === 0 && preStartRemaining > 0) {
    renderPlayer();
    if (lastCountdownCall !== preStartRemaining) {
      lastCountdownCall = preStartRemaining;
      speak(String(preStartRemaining));
      beep();
    }

    preStartRemaining -= 1;
    if (preStartRemaining === 0) lastCountdownCall = null;
    return;
  }

  if (idx === 0 && preStartRemaining === 0) {
    if (!preStartLaunching) {
      preStartLaunching = true;
      renderPlayer();
      preStartLaunchTimeoutId = setTimeout(() => {
        preStartLaunchTimeoutId = null;
        preStartLaunching = false;
        if (!timerId) return;
        const firstStep = currentStep();
        if (!firstStep) return;
        preStartRemaining = -1;
        announceStepStart(firstStep);
        renderPlayer();
      }, 700);
    } else {
      renderPlayer();
    }
    return;
  }

  if (step.type === "rest" && remaining === 11 && !prepareAnnounced) {
    prepareAnnounced = true;
    speak(`Prépare-toi. Prochain exercice: ${nextExerciseName()}.`);
    beep();
  }

  if (step.type === "rest" && remaining <= 5 && remaining > 0 && lastCountdownCall !== remaining) {
    lastCountdownCall = remaining;
    speak(String(remaining));
  }

  renderPlayer();

  if (remaining === 0) {
    idx += 1;
    const nextStep = currentStep();
    if (!nextStep) {
      stopTimer();
      renderPlayer();
      speak("Séance terminée. Bravo.");
      return;
    }

    remaining = nextStep.seconds;
    prepareAnnounced = false;
    lastCountdownCall = null;
    announceStepStart(nextStep);
    renderPlayer();
    return;
  }

  remaining -= 1;
}

function startTimer() {
  if (!sessionData) return;
  initMediaEngines();
  if (!timeline.length) {
    timeline = buildTimeline(sessionData);
    idx = 0;
    remaining = timeline[0].seconds;
    prepareAnnounced = false;
    lastCountdownCall = null;
    preStartRemaining = 5;
    preStartLaunching = false;
    renderPlayer();
  }

  if (timerId) return;
  paused = false;
  els.start.disabled = true;
  els.pause.disabled = false;
  timerId = setInterval(tick, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  if (preStartLaunchTimeoutId) {
    clearTimeout(preStartLaunchTimeoutId);
    preStartLaunchTimeoutId = null;
  }
  preStartLaunching = false;
}

function pauseTimer() {
  if (!timerId) return;
  stopTimer();
  paused = true;
  els.start.disabled = false;
  els.pause.disabled = true;
}

function resetTimer() {
  stopTimer();
  paused = false;
  timeline = sessionData ? buildTimeline(sessionData) : [];
  idx = 0;
  remaining = timeline[0] ? timeline[0].seconds : 0;
  prepareAnnounced = false;
  lastCountdownCall = null;
  preStartRemaining = 5;
  preStartLaunching = false;

  els.start.disabled = !sessionData;
  els.pause.disabled = true;
  els.reset.disabled = !sessionData;

  els.phase.textContent = "Pret";
  els.phase.className = "phase";
  els.countdown.textContent = timeline[0] ? formatSeconds(preStartRemaining) : "00";
  els.current.textContent = timeline[0]
    ? "Démarrage imminent"
    : "Charge une séance";
  els.next.textContent = timeline[0] ? `Premier exercice: ${timeline[0].name}` : "";
}

function parseAndLoad() {
  try {
    sessionData = parseSession(els.input.value);
    renderPlan(sessionData);
    timeline = buildTimeline(sessionData);
    idx = 0;
    remaining = timeline[0].seconds;
    prepareAnnounced = false;
    lastCountdownCall = null;
    preStartRemaining = 5;
    preStartLaunching = false;

    els.start.disabled = false;
    els.pause.disabled = true;
    els.reset.disabled = false;

    els.phase.textContent = "Pret";
    els.phase.className = "phase";
    els.countdown.textContent = formatSeconds(preStartRemaining);
    els.current.textContent = "Démarrage imminent";
    els.next.textContent = `Premier exercice: ${timeline[0].name}`;

    setStatus("Séance chargée. Appuie sur Demarrer.");
  } catch (err) {
    sessionData = null;
    timeline = [];
    idx = 0;
    remaining = 0;
    renderPlan({ title: "-", advice: "", rounds: 0, exercises: [] });
    els.start.disabled = true;
    els.pause.disabled = true;
    els.reset.disabled = true;
    els.phase.textContent = "Pret";
    els.countdown.textContent = "00";
    els.current.textContent = "Charge une séance";
    els.next.textContent = "";
    setStatus(err.message, true);
  }
}

els.parseBtn.addEventListener("click", () => {
  stopTimer();
  parseAndLoad();
});
els.pasteNolioBtn.addEventListener("click", pasteFromClipboard);
els.start.addEventListener("click", startTimer);
els.pause.addEventListener("click", pauseTimer);
els.reset.addEventListener("click", resetTimer);
els.voiceToggle.addEventListener("change", updateVoiceControlsState);
els.voiceMode.addEventListener("change", () => {
  localStorage.setItem(VOICE_PREF_KEY, els.voiceMode.value);
});

const storedVoicePreference = localStorage.getItem(VOICE_PREF_KEY);
if (storedVoicePreference === "male" || storedVoicePreference === "female") {
  els.voiceMode.value = storedVoicePreference;
}
updateVoiceControlsState();
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
}

parseAndLoad();
