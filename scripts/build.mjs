// Build : un seul HTML autonome jouable en file:// (Phaser + jeu inline, aucun réseau).
import { build as esbuild } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { collectMedia, MEDIA_DIRS } from './media.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
export const OUT = `${root}dist/Cite-Stellaire-ch1-v3-final.html`;

const inline = (js) => js.replace(/<\/script/gi, '<\\/script');

export async function build() {
  const game = await esbuild({
    entryPoints: [`${root}src/phaser/main.js`], bundle: true, format: 'iife', target: 'es2019',
    write: false, legalComments: 'none', charset: 'utf8',
  });
  const phaser = readFileSync(`${root}vendor/phaser.min.js`, 'utf8');
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Cité Stellaire — Chapitre 1 (v3 final)</title>
<style>html,body{margin:0;height:100%;background:#0b0f1d;overflow:hidden;touch-action:none}#game{width:100%;height:100%}
#rotate{display:none;position:fixed;inset:0;z-index:10;background:#0b0f1d;color:#e7c45a;font:22px Georgia,serif;align-items:center;justify-content:center;text-align:center;padding:24px}
@media (orientation: portrait){#rotate{display:flex}}</style>
</head>
<body>
<div id="game"></div>
<div id="rotate">⟳ Tourne ton téléphone<br>Cité Stellaire se joue en paysage.</div>
<!-- Cadre mésopotamien et mythes des Anunna ; toute lecture extraterrestre est de la fiction. -->
<script>${inline(phaser)}</script>
<script>window.CS_MEDIA = ${inline(JSON.stringify(collectMedia(MEDIA_DIRS)))};</script>
<script>${inline(game.outputFiles[0].text)}</script>
</body>
</html>
`;
  mkdirSync(`${root}dist`, { recursive: true });
  writeFileSync(OUT, html);
  const sha256 = createHash('sha256').update(html).digest('hex');
  return { path: OUT, bytes: Buffer.byteLength(html), sha256 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await build();
  console.log(`${r.path}\n${r.bytes} octets\nsha256 ${r.sha256}`);
}
