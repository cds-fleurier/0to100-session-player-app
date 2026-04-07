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
let endTransitionDelay = false;
let endTransitionTimeoutId = null;

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
  const hasRunRenfo =
    lines.some((l) => /run/i.test(l) && /renfo/i.test(l)) ||
    (lines.some((l) => /course|footing|marche/i.test(l)) &&
      lines.some((l) => /renfo|chaise|pointe/i.test(l)));
  if (!hasRunRenfo) return null;

  const title = lines.find((l) => /run/i.test(l) && /renfo/i.test(l)) || fallbackTitle;
  const adviceLine = lines.find((l) => /^note\b/i.test(l)) || "";
  const advice = adviceLine.replace(/^note\s*/i, "").trim() || fallbackAdvice;

  const findDurationInLine = (line) => {
    const m = line.match(/(\d+\s*(?:s|sec|secs|mn|min|'|’))/i);
    return m ? parseDurationToken(m[1]) : null;
  };

  const isZoneLine = (line) => /zone\s*\d/i.test(line);
  const isIntensityLine = (line) => /\d+\s*\/\s*\d+/.test(line);

  const getLineIndex = (pattern) => lines.findIndex((l) => pattern.test(l));
  const getLastLineIndex = (pattern) => {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      if (pattern.test(lines[i])) return i;
    }
    return -1;
  };
  const findDurationNearIndex = (index) => {
    const candidates = [
      lines[index],
      lines[index - 1],
      lines[index - 2],
      lines[index + 1],
      lines[index + 2],
    ].filter(Boolean);
    for (const candidate of candidates) {
      if (isZoneLine(candidate) || isIntensityLine(candidate)) continue;
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

  const splitLineIndex = lines.findIndex((l) => /30s\s+de\s+marche/i.test(l) && /30s/i.test(l));
  const splitLine = splitLineIndex > -1 ? lines[splitLineIndex] : "";
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
    const isRenfoCandidate = (line) => {
      if (!line) return false;
      if (isZoneLine(line) || isIntensityLine(line)) return false;
      if (/r[ée]cup[ée]ration|échauffement|note|corps de séance/i.test(line)) return false;
      if (/^\d/.test(line)) return false;
      return /planche|pont|pompe|gainage|fente|squat|burpee|chaise|pointe|mountain|abdo|tronc/i.test(
        line
      );
    };

    const candidatePool = [];
    if (splitLineIndex > -1) {
      for (let i = splitLineIndex + 1; i < Math.min(lines.length, splitLineIndex + 6); i += 1) {
        if (isRenfoCandidate(lines[i])) candidatePool.push(lines[i]);
      }
    }
    if (!candidatePool.length) {
      lines.forEach((line) => {
        if (isRenfoCandidate(line)) candidatePool.push(line);
      });
    }

    const sanitized = candidatePool
      .flatMap((line) => line.split(/ou|\/|,/i))
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/\(.*?\)/g, "").trim())
      .filter(Boolean);

    if (sanitized.length) altNames = sanitized.slice(0, 2);
  }

  const cooldownIndex = getLastLineIndex(/r[ée]cup[ée]ration/i);
  let cooldownSeconds = null;
  if (cooldownIndex > 0) {
    const candidate = findDurationNearIndex(cooldownIndex);
    if (candidate && candidate >= 120) cooldownSeconds = candidate;
  }

  if (!workSeconds && !warmupSeconds && !recupSeconds) return null;

  const renfoAlternates = altNames.length ? altNames : ["Renforcement musculaire"];
  const exercises = [];
  const preSteps = [];
  const postSteps = [];

  if (warmupSeconds) {
    preSteps.push({ name: "Échauffement (marche rapide)", seconds: warmupSeconds });
  }

  if (workSeconds) exercises.push({ name: "Course facile (3/10)", work: workSeconds, rest: 0 });
  if (splitWork) {
    exercises.push({ name: "Marche", work: splitWork, rest: 0 });
  } else if (recupSeconds) {
    exercises.push({ name: "Récupération", work: recupSeconds, rest: 0 });
  }
  if (splitRenfo) {
    exercises.push({
      name: "Renfo alterné",
      alternates: renfoAlternates,
      work: splitRenfo,
      rest: 0,
    });
  }

  if (cooldownSeconds) {
    postSteps.push({ name: "Récupération (marche rapide)", seconds: cooldownSeconds });
  }

  const blocks = [];
  if (warmupSeconds) {
    blocks.push(`Bloc 1: Échauffement ${formatDurationForPlan(warmupSeconds)} marche rapide`);
  }

  if (rounds > 1 || workSeconds || splitWork || splitRenfo || recupSeconds) {
    const intervalParts = [];
    if (workSeconds) intervalParts.push(`${formatDurationForPlan(workSeconds)} course facile`);
    if (splitWork) intervalParts.push(`${formatDurationForPlan(splitWork)} marche`);
    if (splitRenfo) intervalParts.push(`${formatDurationForPlan(splitRenfo)} renfo`);
    if (!splitWork && !splitRenfo && recupSeconds) {
      intervalParts.push(`${formatDurationForPlan(recupSeconds)} récupération`);
    }

    const alternance =
      renfoAlternates.length >= 2
        ? ` (alternance ${renfoAlternates[0]} / ${renfoAlternates[1]})`
        : "";
    blocks.push(`Bloc 2: ${rounds} tours de ${intervalParts.join(" + ")}${alternance}`);
  }

  if (cooldownSeconds) {
    blocks.push(`Bloc 3: Récupération ${formatDurationForPlan(cooldownSeconds)} marche rapide`);
  }

  return { title, advice, rounds, exercises, blocks, preSteps, postSteps };
}

function formatSeconds(value) {
  return String(Math.max(0, value)).padStart(2, "0");
}

function formatDurationForPlan(seconds) {
  if (!seconds) return "0s";
  if (seconds % 60 === 0) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  }
  return `${seconds}s`;
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
  if (data.preSteps && data.preSteps.length) {
    data.preSteps.forEach((pre) => {
      steps.push({
        type: "work",
        name: pre.name,
        seconds: pre.seconds,
        round: 0,
        exIndex: -1,
      });
    });
  }
  for (let r = 1; r <= data.rounds; r += 1) {
    data.exercises.forEach((ex, exIndex) => {
      const stepName = ex.alternates && ex.alternates.length
        ? ex.alternates[(r - 1) % ex.alternates.length]
        : ex.name;
      steps.push({
        type: "work",
        name: stepName,
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
  if (data.postSteps && data.postSteps.length) {
    data.postSteps.forEach((post) => {
      steps.push({
        type: "work",
        name: post.name,
        seconds: post.seconds,
        round: 0,
        exIndex: data.exercises.length,
      });
    });
  }
  return steps;
}

function renderPlan(data) {
  els.meta.innerHTML = `
    <strong>${data.title}</strong><br>
    ${data.advice ? `Conseils: ${data.advice}<br>` : ""}
    ${data.blocks ? `${data.blocks.length} blocs` : `${data.exercises.length} exercices - ${data.rounds} tours`}
  `;

  els.list.innerHTML = "";
  if (data.blocks && data.blocks.length) {
    data.blocks.forEach((block) => {
      const li = document.createElement("li");
      li.textContent = block;
      els.list.appendChild(li);
    });
  } else {
    data.exercises.forEach((ex) => {
      const li = document.createElement("li");
      li.textContent =
        ex.rest && ex.rest > 0
          ? `${ex.name} - ${ex.work}s effort / ${ex.rest}s récup`
          : `${ex.name} - ${ex.work}s effort`;
      els.list.appendChild(li);
    });
  }
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
  if (step.round && step.round > 0) {
    els.current.textContent = isRest
      ? `Tour ${step.round}: récupération`
      : `Tour ${step.round}: ${step.name}`;
  } else {
    els.current.textContent = step.name;
  }
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

  if (step.type === "work" && remaining <= 5 && remaining > 0 && lastCountdownCall !== remaining) {
    lastCountdownCall = remaining;
    speak(String(remaining));
  }

  if (step.type === "rest" && remaining <= 5 && remaining > 0 && lastCountdownCall !== remaining) {
    lastCountdownCall = remaining;
    speak(String(remaining));
  }

  renderPlayer();

  if (remaining === 0) {
    if (!endTransitionDelay && lastCountdownCall === 1) {
      endTransitionDelay = true;
      endTransitionTimeoutId = setTimeout(() => {
        endTransitionDelay = false;
      }, 600);
      return;
    }
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
  if (endTransitionTimeoutId) {
    clearTimeout(endTransitionTimeoutId);
    endTransitionTimeoutId = null;
  }
  endTransitionDelay = false;
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
