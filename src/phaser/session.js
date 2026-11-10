// État de session partagé par les scènes : façade de sauvegarde (localStorage), réglages, sons.
import { saveTo, loadFrom, SAVE_KEY, SETTINGS_KEY } from '../core/save.js';

function pickStorage() {
  try {
    const s = window.localStorage;
    s.getItem(SAVE_KEY);
    return s;
  } catch {
    const m = new Map(); // localStorage bloqué : la partie marche, mais sans reprise après rechargement
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  }
}

export const storage = pickStorage();
export const session = {
  game: null,
  settings: { atbMode: 'wait', sfxVolume: 0.75, muted: false, ...loadFrom(storage, SETTINGS_KEY) },
  music: null,
};

export const saveSettings = () => saveTo(storage, SETTINGS_KEY, session.settings);
export const saveGame = () => saveTo(storage, SAVE_KEY, session.game);
export const loadGame = () => (session.game = loadFrom(storage, SAVE_KEY));
export const hasSave = () => loadFrom(storage, SAVE_KEY) !== null;
export const clearSave = () => storage.removeItem(SAVE_KEY);

export function applyMute(scene) { scene.sound.mute = session.settings.muted; }

export function playSfx(scene, key) {
  if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume: session.settings.sfxVolume });
}

// Musique en boucle à faible volume si le fichier existe ; sinon rien (aucune piste embarquée pour l'instant).
export function playMusic(scene, key) {
  if (session.music?.key === key || !scene.cache.audio.exists(key)) return;
  session.music?.stop();
  session.music = scene.sound.add(key, { loop: true, volume: 0.3 });
  session.music.play();
}
