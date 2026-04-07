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
  focusModeBtn: document.getElementById("focusModeBtn"),
  wakeLockBtn: document.getElementById("wakeLockBtn"),
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
let isFocusMode = false;
let wakeLockSentinel = null;
let wakeLockWanted = true;

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
  const m = clean.match(/(\d+)\s*(s|sec|secs|mn|min|'|’)?/i);
  if (!m) return null;
  const value = Number(m[1]);
  const unit = (m[2] || "s").toLowerCase();
  if (["mn", "min", "'", "’"].includes(unit)) return value * 60;
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

  const runRenfo = parseRunRenfo(lines, title, advice);
  if (runRenfo) return runRenfo;

  let rounds = 1;
  let roundsLocked = false;
  for (const line of lines) {
    const m = line.match(/(\d+)\s*tours?/i);
    if (m) {
      rounds = Number(m[1]);
      roundsLocked = true;
    }
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
    return /^(\d+)(s|sec|secs|mn|min|'|’)?$/.test(compact);
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

    const matches = [...line.matchAll(/(\d+\s*(?:s|sec|secs|mn|min|')?)/gi)];

    if (matches.length >= 2) {
      const firstTokenIndex = line.indexOf(matches[0][0]);
      const inlineName = line.slice(0, firstTokenIndex).trim();
      let name = inlineName || pendingName;

      if (
        matches.length >= 3 &&
        /en\s+r[ée]alisant|en\s+faisant|en\s+alternant/i.test(line) &&
        !roundsLocked
      ) {
        const total = parseDurationToken(matches[0][1]);
        const work = parseDurationToken(matches[1][1]);
        const rest = parseDurationToken(matches[2][1]);
        if (total && work && rest && work + rest > 0) {
          rounds = Math.floor(total / (work + rest)) || 1;
          roundsLocked = true;
          const enIndex = line.search(/en\s+r[ée]alisant|en\s+faisant|en\s+alternant/i);
          if (enIndex > -1) {
            name = line
              .slice(firstTokenIndex + matches[0][0].length, enIndex)
              .trim()
              .replace(/^de\s+/i, "")
              .replace(/[.,:;-]+$/, "");
          }
          pushExercise(name, matches[1][1], matches[2][1]);
          pendingName = null;
          pendingWork = null;
          continue;
        }
      }

      if (!name) {
        const secondTokenIndex = line.indexOf(matches[1][0]);
        if (secondTokenIndex > -1) {
          name = line.slice(firstTokenIndex + matches[0][0].length, secondTokenIndex).trim();
        }
      }

      name = name?.replace(/^de\s+/i, "").trim();
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

function parseRunRenfo(lines, fallbackTitle, fallbackAdvice) {
  const hasRunRenfo = lines.some((l) => /run/i.test(l) && /renfo/i.test(l));
  if (!hasRunRenfo) return null;

  const title = lines.find((l) => /run/i.test(l) && /renfo/i.test(l)) || fallbackTitle;
  const adviceLine = lines.find((l) => /^note\b/i.test(l)) || "";
  const advice = adviceLine.replace(/^note\s*/i, "").trim() || fallbackAdvice;

  const findDurationInLine = (line) => {
    const m = line.match(/(\d+\s*(?:s|sec|secs|mn|min|'|’))/i);
    return m ? parseDurationToken(m[1]) : null;
  };

  const isZoneLine = (line) => /zone\s*\d/i.test(line);

  const getLineIndex = (pattern) => lines.findIndex((l) => pattern.test(l));
  const findDurationNearIndex = (index) => {
    const candidates = [lines[index], lines[index - 1], lines[index + 1]].filter(Boolean);
    for (const candidate of candidates) {
      if (isZoneLine(candidate)) continue;
      const duration = findDurationInLine(candidate);
      if (duration) return duration;
    }
    return null;
  };

  const warmupIndex = getLineIndex(/échauffement/i);
  let warmupSeconds = null;
  if (warmupIndex > -1) {
    warmupSeconds = findDurationNearIndex(warmupIndex);
  }

  const roundsMatch = lines.join(" ").match(/(\d+)\s*x/i);
  const rounds = roundsMatch ? Number(roundsMatch[1]) : 1;

  const workIndex = getLineIndex(/facile/i);
  let workSeconds = null;
  if (workIndex > -1) {
    workSeconds = findDurationNearIndex(workIndex);
  }

  const recupIndex = getLineIndex(/r[ée]cup[ée]ration/i);
  let recupSeconds = null;
  if (recupIndex > -1) {
    recupSeconds = findDurationNearIndex(recupIndex);
  }

  const splitLine =
    lines.find((l) => /30s\s+de\s+marche/i.test(l) && /30s/i.test(l)) || "";
  const splitDurations = [...splitLine.matchAll(/(\d+\s*(?:s|sec|secs|mn|min|')?)/gi)].map(
    (m) => parseDurationToken(m[1])
  );
  const splitWork = splitDurations[0] || null;
  const splitRenfo = splitDurations[1] || null;
  let altNames = [];
  if (splitLine) {
    const afterDur = splitLine.replace(/.*30s\s+de\s+marche\s+puis\s+30s\s+de/i, "").trim();
    altNames = afterDur
      .split(/ou|\/|,/i)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/\(.*?\)/g, "").trim())
      .filter(Boolean);
  }
  if (!altNames.length) {
    const renfoLine = lines.find((l) => /monter\s+sur|chaise/i.test(l)) || "";
    if (renfoLine) {
      altNames = renfoLine
        .split(/ou|\/|,/i)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.replace(/\(.*?\)/g, "").trim())
        .filter(Boolean);
    }
  }

  const cooldownIndex = getLineIndex(/r[ée]cup[ée]ration/i);
  let cooldownSeconds = null;
  if (cooldownIndex > 0) {
    const candidate = findDurationNearIndex(cooldownIndex);
    if (candidate && candidate >= 120) cooldownSeconds = candidate;
  }

  if (!workSeconds && !warmupSeconds && !recupSeconds) return null;

  const exercises = [];
  if (warmupSeconds) {
    exercises.push({ name: "Échauffement (marche rapide)", work: warmupSeconds, rest: 0 });
  }

  const renfoAlternates = altNames.length ? altNames : ["Renforcement musculaire"];

  for (let i = 0; i < rounds; i += 1) {
    if (workSeconds) {
      exercises.push({ name: "Course facile (3/10)", work: workSeconds, rest: 0 });
    }

    if (splitWork) {
      exercises.push({ name: "Marche", work: splitWork, rest: 0 });
    } else if (recupSeconds) {
      exercises.push({ name: "Récupération", work: recupSeconds, rest: 0 });
    }

    if (splitRenfo) {
      const altName = renfoAlternates[i % renfoAlternates.length];
      exercises.push({ name: altName, work: splitRenfo, rest: 0 });
    }
  }

  if (cooldownSeconds) {
    exercises.push({ name: "Récupération (marche rapide)", work: cooldownSeconds, rest: 0 });
  }

  return { title, advice, rounds: 1, exercises };
}

function formatSeconds(value) {
  return String(Math.max(0, value)).padStart(2, "0");
}

function setStatus(text, isError = false) {
  els.parseStatus.textContent = text;
  els.parseStatus.style.color = isError ? "#b91c1c" : "#0f766e";
}

function toggleFocusMode() {
  isFocusMode = !isFocusMode;
  document.body.classList.toggle("focus-mode", isFocusMode);
  els.focusModeBtn.textContent = isFocusMode ? "Quitter focus" : "Mode focus";
}

function refreshWakeLockButton() {
  const state = wakeLockWanted ? "on" : "off";
  els.wakeLockBtn.textContent = `Écran actif: ${state}`;
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator) || !navigator.wakeLock?.request) {
    setStatus("Wake Lock non supporté sur ce navigateur.", true);
    wakeLockWanted = false;
    refreshWakeLockButton();
    return;
  }

  try {
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    wakeLockSentinel.addEventListener("release", () => {
      wakeLockSentinel = null;
      refreshWakeLockButton();
    });
    wakeLockWanted = true;
    refreshWakeLockButton();
  } catch (err) {
    wakeLockSentinel = null;
    wakeLockWanted = false;
    refreshWakeLockButton();
    setStatus("Impossible d'activer l'écran actif pour le moment.", true);
  }
}

async function releaseWakeLock() {
  wakeLockWanted = false;
  if (wakeLockSentinel) {
    await wakeLockSentinel.release();
    wakeLockSentinel = null;
  }
  refreshWakeLockButton();
}

async function toggleWakeLock() {
  if (wakeLockSentinel || wakeLockWanted) {
    await releaseWakeLock();
    return;
  }
  await requestWakeLock();
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
      if (!isFinalStep && ex.rest && ex.rest > 0) {
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
    li.textContent =
      ex.rest && ex.rest > 0
        ? `${ex.name} - ${ex.work}s effort / ${ex.rest}s récup`
        : `${ex.name} - ${ex.work}s effort`;
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
  if (wakeLockWanted && !wakeLockSentinel) requestWakeLock();
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
els.focusModeBtn.addEventListener("click", toggleFocusMode);
els.wakeLockBtn.addEventListener("click", toggleWakeLock);
els.voiceToggle.addEventListener("change", updateVoiceControlsState);
els.voiceMode.addEventListener("change", () => {
  localStorage.setItem(VOICE_PREF_KEY, els.voiceMode.value);
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && wakeLockWanted && !wakeLockSentinel) {
    requestWakeLock();
  }
});

const storedVoicePreference = localStorage.getItem(VOICE_PREF_KEY);
if (storedVoicePreference === "male" || storedVoicePreference === "female") {
  els.voiceMode.value = storedVoicePreference;
}
updateVoiceControlsState();
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
}
refreshWakeLockButton();

parseAndLoad();
