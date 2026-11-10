// Médias embarqués dans le HTML (data URI) : file:// interdit le chargement XHR des fichiers locaux.
// La clé = nom du fichier sans extension (identique aux clés de placeholders).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const MEDIA_DIR = fileURLToPath(new URL('../assets/media', import.meta.url));
// Ordre = priorité croissante : un fichier de media-peint remplace la même clé de media.
export const MEDIA_DIRS = [MEDIA_DIR, ...['media-peint', 'media-persos'].map((d) => fileURLToPath(new URL(`../assets/${d}`, import.meta.url)))];
const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', mp3: 'audio/mpeg' };

export function collectMedia(dirs) {
  const media = { images: {}, audio: {}, tiles: {} };
  for (const dir of [dirs].flat()) addDir(media, dir);
  return media;
}

function addDir(media, dir) {
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir).sort()) {
    const [, key, ext] = file.match(/^(.+)\.(png|jpg|webp|mp3)$/) ?? [];
    if (!key) continue;
    const uri = `data:${MIME[ext]};base64,${readFileSync(`${dir}/${file}`).toString('base64')}`;
    (ext === 'mp3' ? media.audio : media.images)[key] = uri;
  }
  if (!existsSync(`${dir}/manifest-crea.json`)) return;
  const manifest = JSON.parse(readFileSync(`${dir}/manifest-crea.json`, 'utf8'));
  for (const [name, t] of Object.entries(manifest.assets['tileset-eridu.png'].tiles)) {
    media.tiles[name] = [t.atlas_x, t.atlas_y, t.width, t.height];
  }
}
