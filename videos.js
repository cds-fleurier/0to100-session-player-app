// Vidéos de démonstration des exercices, relevées dans les séances Nolio
// (section « Liens vidéos » en bas des explications du coach) le 28/10/2026.
//
// VIDEO_CATALOG : une entrée par vidéo. `match` porte sur le nom du step tel
// qu'affiché par le player (sessions-library.js) — à ajuster si on renomme un step.
// NOLIO_SESSION_VIDEOS : les vidéos que le coach a mises dans chaque séance.
// Quand plusieurs vidéos du catalogue collent à un step, on garde celles que
// le coach a mises dans CETTE séance ; si aucune n'y est, on les garde toutes.

const VIDEO_CATALOG = {
  cadence:            { title: "Cadence sur place", src: "yt:N_KQtI5Nbaw", match: /^Cadence ·|^Course sur place, cadence/ },
  etirMollets:        { title: "Étirement actif des mollets", src: "yt:A_IB4a2h2TM", match: /^Étirements actifs : mollets/ },
  etirQuadri:         { title: "Étirement actif des quadriceps", src: "yt:hpzhKsS6BV0", match: /^Étirements actifs : quadriceps/ },
  etirIschios:        { title: "Étirement actif des ischios", src: "yt:0LkcJsesCpk", match: /^Étirements actifs : (ischios|chaîne postérieure)/ },
  equilibreMG:        { title: "Équilibre, montée de genou de la jambe libre", src: "yt:nPOvUoWPtQw", match: /^Équilibre pied (gauche|droit), (genou|montée de genou)/ },
  equilibreSimpleMG:  { title: "Équilibre simple avec montée de genou", src: "yt:BeS6ByMjQaU", match: /^Équilibre pied (gauche|droit), (genou|montée de genou)/ },
  equilibreCadence:   { title: "Équilibre, cadence des bras", src: "yt:I7adimWomxE", match: /^Équilibre pied (gauche|droit),.*(cadence des bras|bras en cadence)/ },
  equilibreSkieur:    { title: "Équilibre skieur", src: "yt:CWD1zEy3SJs", match: /^Équilibre skieur/ },
  equilibrePatineur:  { title: "Équilibre patineur (skater)", src: "yt:KRrjmY5nGRQ", match: /^Équilibre skater/ },
  chaise:             { title: "Chaise", src: "yt:17eF2iIzxYU", match: /^Chaise|^Demi-squat statique/ },
  squats:             { title: "Squats", src: "yt:hPtPm-darpM", match: /\bsquats\b/i },
  squatsHaka:         { title: "Squats tempo (haka)", src: "yt:o-2yIP6iU6M", match: /\bsquats\b/i },
  fentesMarchees:     { title: "Fentes marchées", src: "yt:bCV_s-Z-Jd8", match: /fentes marchées/i },
  fentesArriere:      { title: "Fentes arrière", src: "yt:L3ywuNFxW-I", match: /^Fentes? arrière (gauche|droite)/ },
  fentesArriere2:     { title: "Fentes arrière (variante)", src: "yt:xhQvR9ESuuI", match: /^Fentes? arrière (gauche|droite)/ },
  fenteArriereMG:     { title: "Fente arrière + montée de genou", src: "yt:oPwBLUpjNys", match: /fentes? (arrière )?\+ montée de genou/i },
  fenteMG2:           { title: "Fente + montée de genou (variante)", src: "yt:oEtSd3s8Ems", match: /fentes? (arrière )?\+ montée de genou/i },
  fentesStatiques:    { title: "Fentes statiques", src: "yt:EnweztpzdFg", match: /^Fentes statiques/ },
  fentesRotations:    { title: "Fentes avec rotations", src: "yt:J4NX-eWxoLk", match: /^Mobilité : tronc$/ },
  fenteAvant:         { title: "Fentes avant", src: "yt:iEJKfrCl4rg", match: /^Fente avant/ },
  climbers:           { title: "Mountain climbers", src: "yt:-YV2MbF1xDU", match: /climbers/i },
  climbers2:          { title: "Mountain climbers (variante)", src: "yt:J9_Jv-8rMiU", match: /climbers/i },
  climbersLents:      { title: "Mountain climbers lents", src: "ig:CtJ6PFpNGCR", match: /^Mountain climbers lents/ },
  mollets:            { title: "Mollets", src: "yt:-D50uWoAxMc", match: /paires de mollets|^Mollet statique/ },
  plancheVentrale:    { title: "Planche ventrale", src: "yt:hqd6t1pyjQc", match: /^Planche ventrale/ },
  plancheTape:        { title: "Planche, main tape épaule", src: "yt:LpCXWpNdvuQ", match: /^Planche active/ },
  bears:              { title: "Bear tape", src: "yt:t7t3siFR4wk", match: /^Bear tape/ },
  pontPelvien:        { title: "Pont pelvien dynamique", src: "yt:pE09XdzGVGw", match: /^Pont pelvien/ },
  superman:           { title: "Superman", src: "yt:gz4fEDW2KKs", match: /^Superman/ },
  supermanCore:       { title: "Superman (pieds au sol)", src: "ig:CsJiZJ-NYb_", match: /^Superman/ },
  crunch:             { title: "Crunch, pieds au sol", src: "ig:Cr08E8QNV6q", match: /^Crunch/ },
  gammesSimples:      { title: "Gammes simples", src: "yt:WIlRjnO3_Vo", match: /^(Talons-fesses|Montées de genoux|Course arrière|Schtroumpf|Gammes libres)(?!.*(arrêt bref|double appui))/ },
  gammesArret:        { title: "Gammes contrôle : arrêt", src: "yt:8aAiuIDOkas", match: /arrêt bref/ },
  gammesDoubleAppui:  { title: "Gammes contrôle : double appui", src: "yt:RZxCKiJ1_3Y", match: /double appui \(mini saut\)/ },
  descenteDoubleAppui:{ title: "Descente en double appui", src: "yt:LZ60lmOBF50", match: /^Descente rapide en double appui/ },
  rotHanches:         { title: "Rotations de hanches", src: "yt:_EQTH_SdJA4", match: /^Rotations (de )?hanches?|^Mobilité : hanches|^Mobilité de hanches/ },
  rotGenoux:          { title: "Rotations de genoux", src: "vimeo:1180868763/c3dba34123", match: /^Rotations genou/ },
  rotChevilles:       { title: "Rotations de chevilles", src: "yt:jQY-5Sxj6Xo", match: /^Rotations (de )?chevilles?/ },
  pied:               { title: "Mobilisation du pied", src: "yt:INJ8kNNcyLI", match: /^Mobilité pied-cheville|^Piano|orteils$|^Stepper (sur place|avant)|^Basculer|^Ton exercice préféré/ },
};

const NOLIO_SESSION_VIDEOS = {
  C1S1: ["equilibreSimpleMG", "cadence", "etirMollets", "etirQuadri", "etirIschios", "equilibreMG", "chaise", "plancheVentrale"],
  C1S2: ["chaise", "plancheVentrale"],
  C1S3: ["fentesRotations", "etirMollets", "etirQuadri", "etirIschios", "equilibreCadence", "fentesStatiques", "plancheVentrale", "cadence", "mollets"],
  C1S4: ["chaise", "plancheVentrale", "fentesStatiques"],
  C1S5: ["cadence", "etirMollets", "etirQuadri", "etirIschios", "equilibreMG", "chaise", "fentesMarchees", "gammesSimples"],
  C1S6: ["equilibreMG", "fentesArriere"],
  C1S7: ["etirMollets", "etirQuadri", "etirIschios", "equilibreMG", "squats", "climbers", "mollets", "gammesSimples", "cadence"],
  C1S8: ["fentesArriere2", "fentesArriere", "climbers"],
  C1S9: ["etirMollets", "etirQuadri", "etirIschios", "rotHanches", "rotChevilles", "pied", "equilibreMG", "gammesSimples", "squatsHaka", "squats", "climbers"],
  C1S10: ["etirMollets", "etirQuadri", "etirIschios", "rotHanches", "rotChevilles", "pied", "squatsHaka", "fenteMG2", "squats", "climbers"],
  C1S11: ["etirMollets", "etirQuadri", "etirIschios", "rotHanches", "rotChevilles", "pied", "equilibreMG", "gammesSimples", "climbers", "fenteArriereMG"],
  C1S12: ["etirMollets", "etirQuadri", "etirIschios", "rotHanches", "rotChevilles", "pied", "fenteMG2", "fenteArriereMG"],
  C2S1: ["etirMollets", "etirQuadri", "etirIschios", "rotHanches", "rotChevilles", "pied", "equilibreMG", "gammesArret", "gammesDoubleAppui", "chaise", "squats", "pontPelvien", "climbers"],
  C2S2: ["etirMollets", "etirQuadri", "etirIschios", "rotHanches", "rotChevilles", "pied", "plancheTape", "equilibreCadence", "climbers2", "fenteMG2"],
  C2S3: ["etirMollets", "etirQuadri", "etirIschios", "rotHanches", "rotChevilles", "pied", "equilibreMG", "gammesArret", "gammesDoubleAppui", "chaise", "squats", "descenteDoubleAppui"],
  C2S4: ["etirMollets", "etirQuadri", "etirIschios", "rotHanches", "rotChevilles", "pied", "equilibreMG", "equilibreSkieur", "equilibrePatineur", "fenteMG2"],
  C2S5: ["etirMollets", "etirQuadri", "etirIschios", "rotHanches", "rotChevilles", "pied", "equilibreMG", "gammesSimples", "plancheVentrale", "bears", "fenteAvant", "superman", "pontPelvien"],
  C2S6: ["etirMollets", "etirQuadri", "etirIschios", "rotHanches", "rotChevilles", "pied", "equilibreMG", "climbers", "bears", "fenteMG2"],
  CORE: ["climbersLents", "supermanCore", "crunch"],
  PAVEL: [],
};

function videosForStep(sessionId, step) {
  if (!step || step.type !== "work" || !step.name) return [];
  const name = step.name.trim();
  const candidates = Object.keys(VIDEO_CATALOG).filter((key) => VIDEO_CATALOG[key].match.test(name));
  if (!candidates.length) return [];
  const coach = NOLIO_SESSION_VIDEOS[sessionId] || [];
  const preferred = candidates.filter((key) => coach.includes(key));
  return preferred.length ? preferred : candidates;
}

// Vidéos d'une séance, dans l'ordre où ses exercices arrivent (liste du Plan).
function videosForSession(sessionId, steps) {
  const seen = [];
  (steps || []).forEach((step) => {
    videosForStep(sessionId, step).forEach((key) => {
      if (!seen.includes(key)) seen.push(key);
    });
  });
  return seen;
}

function videoEmbedUrl(src) {
  const [kind, id] = src.split(/:(.*)/s);
  if (kind === "yt") return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
  if (kind === "vimeo") {
    const [num, hash] = id.split("/");
    return `https://player.vimeo.com/video/${num}?h=${hash}&autoplay=1&playsinline=1`;
  }
  if (kind === "ig") return `https://www.instagram.com/reel/${id}/embed`;
  return "";
}

// Lien de secours (« ouvrir dans l'appli ») si l'intégration ne s'affiche pas.
function videoWatchUrl(src) {
  const [kind, id] = src.split(/:(.*)/s);
  if (kind === "yt") return `https://youtu.be/${id}`;
  if (kind === "vimeo") return `https://vimeo.com/${id}`;
  if (kind === "ig") return `https://www.instagram.com/reel/${id}/`;
  return "";
}

// Presque toutes les vidéos du coach sont des Shorts (portrait). Paysage :
// les 7 vidéos YouTube classiques (vérifié via youtube.com/shorts/<id> le 28/10).
const LANDSCAPE_VIDEOS = ["N_KQtI5Nbaw", "xhQvR9ESuuI", "INJ8kNNcyLI", "o-2yIP6iU6M", "oEtSd3s8Ems", "J9_Jv-8rMiU", "BeS6ByMjQaU"];

function videoIsPortrait(src) {
  return !LANDSCAPE_VIDEOS.includes(src.replace(/^yt:/, ""));
}
