import { create } from 'zustand';
export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'aimUp'
  | 'aimDown'
  | 'aimLeft'
  | 'aimRight'
  | 'melee'
  | 'water'
  | 'support1'
  | 'support2'
  | 'interact'
  | 'lock'
  | 'pause'
  | 'confirm'
  | 'hide'
  | 'history';
export type Preset = 'mouse' | 'keyboard';
export type Bindings = Record<Action, string>;
export const defaults: Record<Preset, Bindings> = {
  mouse: {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    aimUp: 'ArrowUp',
    aimDown: 'ArrowDown',
    aimLeft: 'ArrowLeft',
    aimRight: 'ArrowRight',
    melee: 'Mouse0',
    water: 'Mouse2',
    support1: 'KeyQ',
    support2: 'KeyE',
    interact: 'KeyF',
    lock: 'Tab',
    pause: 'Escape',
    confirm: 'Enter',
    hide: 'KeyH',
    history: 'KeyR',
  },
  keyboard: {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    aimUp: 'ArrowUp',
    aimDown: 'ArrowDown',
    aimLeft: 'ArrowLeft',
    aimRight: 'ArrowRight',
    melee: 'KeyJ',
    water: 'KeyK',
    support1: 'KeyQ',
    support2: 'KeyE',
    interact: 'KeyF',
    lock: 'Tab',
    pause: 'Escape',
    confirm: 'Enter',
    hide: 'KeyH',
    history: 'KeyR',
  },
};
export interface Settings {
  preset: Preset;
  bindings: Record<Preset, Bindings>;
  master: number;
  music: number;
  effects: number;
  muted: boolean;
  textSpeed: number;
  textSize: number;
  shake: boolean;
  reduceFlash: boolean;
  autosave: boolean;
}
export const defaultSettings: Settings = {
  preset: 'mouse',
  bindings: defaults,
  master: 0.6,
  music: 0.35,
  effects: 0.6,
  muted: false,
  textSpeed: 36,
  textSize: 20,
  shake: true,
  reduceFlash: false,
  autosave: true,
};
const key = 'oath.settings.v1';
function read(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null');
    return raw &&
      ['mouse', 'keyboard'].includes(raw.preset) &&
      typeof raw.textSpeed === 'number' &&
      raw.bindings?.mouse &&
      raw.bindings?.keyboard
      ? { ...defaultSettings, ...raw }
      : structuredClone(defaultSettings);
  } catch {
    return structuredClone(defaultSettings);
  }
}
const store = create<Settings>(() => read());
export const useSettings = () => store();
export const getSettingsSnap = () => store.getState();
export function setSettings(patch: Partial<Settings>) {
  store.setState(patch);
  localStorage.setItem(key, JSON.stringify(store.getState()));
}
export const keyLabel = (code: string) =>
  code
    .replace('Key', '')
    .replace('Digit', '')
    .replace('Arrow', '')
    .replace('Mouse0', '鼠标左键')
    .replace('Mouse2', '鼠标右键')
    .replace('Escape', 'Esc');
export const actionLabel = (action: Action) =>
  keyLabel(getSettingsSnap().bindings[getSettingsSnap().preset][action]);
