// Enregistre chaque phrase de tools/phrases.json avec les voix macOS, en AAC
// mono, et écrit voice/manifest.js (texte → fichier, et liste par séance).
// Incrémental : un fichier déjà présent n'est pas regénéré.
// Usage : node tools/collect-phrases.cjs && node tools/generate-voice.cjs
//
// Voix à installer sur le Mac (Réglages système → Accessibilité → Contenu
// énoncé → Voix du système → Gérer les voix → Français (France)) :
// « Audrey (Premium) » et « Daniel (Enhanced) ».

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const VOICES = {
  female: { dir: "audrey", say: "Audrey (Premium)" },
  male: { dir: "daniel", say: "Daniel (Enhanced)" },
};

const { phrases, sessions } = JSON.parse(fs.readFileSync(path.join(__dirname, "phrases.json"), "utf8"));
const clipId = (text) => crypto.createHash("sha1").update(text).digest("hex").slice(0, 12);

const tmp = path.join(os.tmpdir(), `voice-${process.pid}.aiff`);
let made = 0;
for (const voice of Object.values(VOICES)) {
  const dir = path.join(ROOT, "voice", voice.dir);
  fs.mkdirSync(dir, { recursive: true });
  const wanted = new Set();
  for (const text of phrases) {
    const file = path.join(dir, `${clipId(text)}.m4a`);
    wanted.add(path.basename(file));
    if (fs.existsSync(file)) continue;
    execFileSync("say", ["-v", voice.say, "-o", tmp, text]);
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "40000", tmp, file]);
    made += 1;
  }
  // Phrases disparues (séance modifiée) : on ne garde pas les fichiers orphelins.
  for (const f of fs.readdirSync(dir)) if (!wanted.has(f)) fs.unlinkSync(path.join(dir, f));
}
if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

const clips = Object.fromEntries(phrases.map((t) => [t, clipId(t)]));
const bySession = Object.fromEntries(Object.entries(sessions).map(([id, list]) => [id, list.map(clipId)]));
const manifest = `// Généré par tools/generate-voice.cjs — ne pas éditer à la main.
window.VOICE_MANIFEST = ${JSON.stringify(
  { voices: Object.fromEntries(Object.entries(VOICES).map(([k, v]) => [k, v.dir])), clips, sessions: bySession },
  null,
  1
)};
`;
fs.writeFileSync(path.join(ROOT, "voice", "manifest.js"), manifest);
console.log(`${made} fichiers générés, ${phrases.length} phrases par voix → voice/`);
