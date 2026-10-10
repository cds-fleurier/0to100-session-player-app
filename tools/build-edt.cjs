#!/usr/bin/env node
/* Génère la version École de Trail du player (repo ecole-de-trail-session-player).
 *
 * Même player, ISO : la page EDT charge script.js, les séances, la musique et les voix
 * DEPUIS ce repo (URL absolues). Seule la page d'accueil change : habillage EDT, et
 * surtout PAS de barre du hub 0 to 100 (aucun accès à la carte, aux dates de naissance…).
 *
 * Usage : node tools/build-edt.cjs [dossier cible]   (défaut : ../ecole-de-trail-session-player)
 * À relancer à chaque release du player (le ?v= suit celui de index.html), puis pousser les 2 repos.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "..", "ecole-de-trail-session-player"));
const BRAND = path.join(ROOT, "brands", "ecole-de-trail");
// EDT_BASE=http://localhost:8766/ pour prévisualiser contre le player local
const BASE = process.env.EDT_BASE || "https://cds-fleurier.github.io/0to100-session-player-app/";

let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const version = (html.match(/script\.js\?v=([\d.]+)/) || [])[1];
if (!version) throw new Error("?v= introuvable dans index.html");

function rep(from, to) {
  const before = html;
  html = html.replace(from, to);
  if (html === before) throw new Error(`Motif introuvable dans index.html : ${from}`);
}

rep(/<title>[^<]*<\/title>/, "<title>École de Trail · Session Player</title>");
rep(
  /<link rel="stylesheet" href="styles\.css\?v=([\d.]+)" \/>/,
  `<link rel="icon" type="image/png" href="favicon.png" />
    <link rel="apple-touch-icon" href="favicon.png" />
    <meta name="theme-color" content="#213b22" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700;800&family=Oswald:wght@500;700&display=swap" />
    <link rel="stylesheet" href="${BASE}styles.css?v=$1" />
    <link rel="stylesheet" href="edt.css?v=$1" />`
);
rep(
  /<img\s+class="brand-logo"[\s\S]*?\/>/,
  `<img class="brand-logo" src="logo-edt-blanc.svg" alt="École de Trail" />`
);
rep(/<h1>[^<]*<\/h1>/, "<h1>Session Player</h1>");
rep(/Choisis une séance 0 to 100, ou/, "Choisis une séance, ou");
// Barre du hub 0 to 100 : retirée
rep(/\s*<!-- Barre d'onglets partagée[^>]*-->\s*<script src="https:\/\/cds-fleurier\.github\.io\/0to100-hub\/nav\.js"[^>]*><\/script>/, "");
// Scripts du player servis depuis le repo 0 to 100 (+ base des fichiers voix)
rep(/(\s*)<script src="music-library\.js/, `$1<script>window.PLAYER_ASSET_BASE = "${BASE}";</script>$1<script src="${BASE}music-library.js`);
for (const f of ["sessions-library.js", "voice/manifest.js", "script.js"]) {
  rep(`<script src="${f}?v=`, `<script src="${BASE}${f}?v=`);
}

// Garde-fous : rien du hub, plus de marque 0 to 100 visible
const visible = html.split(BASE).join("");
for (const bad of ["0to100-hub", "nav.js", "0 to 100", "0-to-100", "Logo 0"]) {
  if (visible.includes(bad)) throw new Error(`Reste « ${bad} » dans la page EDT`);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), html);
for (const [src, dst] of [["edt.css", "edt.css"], ["logo-edt-blanc.svg", "logo-edt-blanc.svg"], ["favicon.png", "favicon.png"]]) {
  fs.copyFileSync(path.join(BRAND, src), path.join(OUT, dst));
}
console.log(`EDT v${version} → ${OUT}`);
