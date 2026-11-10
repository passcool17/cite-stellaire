// Sauvegarde : sérialisation pure + façade storage ({ getItem, setItem }, localStorage en jeu).
export const SAVE_KEY = 'cite-stellaire-ch1-save';
export const SETTINGS_KEY = 'cite-stellaire-settings';
const VERSION = 1;

export const serialize = (state) => JSON.stringify({ v: VERSION, state });

export function deserialize(json) {
  try {
    const data = JSON.parse(json);
    return data?.v === VERSION ? data.state : null;
  } catch {
    return null;
  }
}

export function saveTo(storage, key, state) {
  try {
    storage.setItem(key, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function loadFrom(storage, key) {
  try {
    const json = storage.getItem(key);
    return json === null ? null : deserialize(json);
  } catch {
    return null;
  }
}
