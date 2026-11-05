import { create } from 'zustand';
import { parseSettings, keyLabel, type Action, type Settings } from './model';
export { defaults, defaultSettings, keyLabel } from './model';
export type { Action, Preset, Bindings, Settings } from './model';
const key = 'oath.settings.v1';
function read() {
  try {
    return parseSettings(JSON.parse(localStorage.getItem(key) ?? 'null'));
  } catch {
    return { ...parseSettings(null), recovered: true };
  }
}
const initial = read();
const store = create<Settings>(() => initial.settings);
const noticeStore = create<{ notice: string }>(() => ({
  notice: initial.recovered ? '设置损坏或不兼容，已恢复默认设置。' : '',
}));
export const useSettings = () => store();
export const useSettingsNotice = () => noticeStore((s) => s.notice);
export const getSettingsSnap = () => store.getState();
export const subscribeSettings = (callback: () => void) => store.subscribe(callback);
export const dismissSettingsNotice = () => noticeStore.setState({ notice: '' });
export function setSettings(patch: Partial<Settings>) {
  const result = parseSettings({ ...getSettingsSnap(), ...patch });
  if (result.recovered) {
    noticeStore.setState({ notice: '设置未通过校验，未应用此项更改。' });
    return;
  }
  store.setState(result.settings);
  window.dispatchEvent(new Event('oath:clear-input'));
  try {
    localStorage.setItem(key, JSON.stringify(result.settings));
  } catch {
    noticeStore.setState({ notice: '浏览器无法保存设置，本次更改仅在当前页面生效。' });
  }
}
export const actionLabel = (action: Action) =>
  keyLabel(getSettingsSnap().bindings[getSettingsSnap().preset][action]);
