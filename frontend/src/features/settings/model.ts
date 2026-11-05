export const gameActions = [
  'up',
  'down',
  'left',
  'right',
  'aimUp',
  'aimDown',
  'aimLeft',
  'aimRight',
  'melee',
  'water',
  'support1',
  'support2',
  'interact',
  'lock',
  'pause',
] as const;
export const dialogueActions = ['confirm', 'hide', 'history', 'pause'] as const;
export const menuActions = [
  'menuUp',
  'menuDown',
  'menuLeft',
  'menuRight',
  'menuConfirm',
  'menuBack',
] as const;
export const actions = [...new Set([...gameActions, ...dialogueActions, ...menuActions])];
export type Action =
  (typeof gameActions)[number] | (typeof dialogueActions)[number] | (typeof menuActions)[number];
export type Preset = 'mouse' | 'keyboard';
export type Bindings = Record<Action, string>;
export const actionNames: Record<Action, string> = {
  up: '向上移动',
  down: '向下移动',
  left: '向左移动',
  right: '向右移动',
  aimUp: '向上瞄准',
  aimDown: '向下瞄准',
  aimLeft: '向左瞄准',
  aimRight: '向右瞄准',
  melee: '肥鱼摆尾',
  water: '深海之力',
  support1: '援助槽 1',
  support2: '援助槽 2',
  interact: '交互 / 休整',
  lock: '切换锁定',
  pause: '暂停',
  confirm: '补全 / 下一句',
  hide: '隐藏文字',
  history: '对白记录',
  menuUp: '菜单上一项',
  menuDown: '菜单下一项',
  menuLeft: '菜单向左 / 减少',
  menuRight: '菜单向右 / 增加',
  menuConfirm: '菜单确认',
  menuBack: '菜单返回',
};
const common: Bindings = {
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
  menuUp: 'ArrowUp',
  menuDown: 'ArrowDown',
  menuLeft: 'ArrowLeft',
  menuRight: 'ArrowRight',
  menuConfirm: 'Enter',
  menuBack: 'Escape',
};
export const defaults: Record<Preset, Bindings> = {
  mouse: { ...common },
  keyboard: { ...common, melee: 'KeyJ', water: 'KeyK' },
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
export const keyLabel = (code: string) =>
  ({
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Mouse0: '鼠标左键',
    Mouse1: '鼠标中键',
    Mouse2: '鼠标右键',
    Mouse3: '鼠标侧键 1',
    Mouse4: '鼠标侧键 2',
    Escape: 'Esc',
    Space: '空格',
    Enter: 'Enter',
    Tab: 'Tab',
  })[code] ?? code.replace(/^Key/, '').replace(/^Digit/, '');
export function validCode(code: unknown, preset: Preset): code is string {
  return (
    typeof code === 'string' &&
    (/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Enter|Escape|Space|Tab|ShiftLeft|ShiftRight|Backspace)$/.test(
      code,
    ) ||
      (preset === 'mouse' && /^Mouse[0-4]$/.test(code)))
  );
}
export function conflicts(bindings: Bindings, action: Action, code: string): Action[] {
  const contexts: readonly (readonly Action[])[] = [gameActions, dialogueActions, menuActions];
  const peers = new Set(
    contexts.filter((group) => group.includes(action)).flatMap((group) => [...group]),
  );
  return actions.filter(
    (other) => other !== action && peers.has(other) && bindings[other] === code,
  );
}
export function bindingError(action: Action, code: string, preset: Preset): string | null {
  if (!validCode(code, preset))
    return preset === 'keyboard' ? '纯键盘模式只接受键盘按键。' : '此按键无法绑定，请换一个键。';
  if (code === 'Escape' && action !== 'pause' && action !== 'menuBack')
    return 'Esc 保留为暂停和菜单后退兜底。';
  if (
    code === 'Space' &&
    dialogueActions.includes(action as (typeof dialogueActions)[number]) &&
    action !== 'confirm'
  )
    return '空格保留为对白确认。';
  return null;
}
export function rebind(
  bindings: Bindings,
  action: Action,
  code: string,
  preset: Preset,
  swap = false,
): Bindings {
  const error = bindingError(action, code, preset);
  if (error) throw new Error(error);
  const matches = conflicts(bindings, action, code);
  if (matches.length && !swap) throw new Error('同一上下文中存在冲突。');
  if (matches.length > 1) throw new Error('此按键同时影响多个动作，请先分别修改。');
  const next = { ...bindings, [action]: code };
  if (matches.length) {
    const other = matches[0];
    next[other] = bindings[action];
    if (bindingError(other, next[other], preset) || conflicts(next, other, next[other]).length)
      throw new Error('无法安全交换，请选择其他按键。');
  }
  return next;
}
export function parseSettings(raw: unknown): { settings: Settings; recovered: boolean } {
  if (raw === null) return { settings: structuredClone(defaultSettings), recovered: false };
  try {
    const candidate = raw as Settings;
    if (!candidate || !['mouse', 'keyboard'].includes(candidate.preset)) throw new Error('preset');
    // Earlier builds lacked menu bindings; fill only these newly introduced fields.
    const bindings = Object.fromEntries(
      (['mouse', 'keyboard'] as const).map((preset) => {
        const map = {
          ...Object.fromEntries(menuActions.map((a) => [a, defaults[preset][a]])),
          ...candidate.bindings[preset],
        } as Bindings;
        for (const action of actions)
          if (
            bindingError(action, map[action], preset) ||
            conflicts(map, action, map[action]).length
          )
            throw new Error('binding');
        return [preset, map];
      }),
    ) as Record<Preset, Bindings>;
    for (const key of ['master', 'music', 'effects'] as const)
      if (!Number.isFinite(candidate[key]) || candidate[key] < 0 || candidate[key] > 1)
        throw new Error(key);
    if (
      !Number.isFinite(candidate.textSpeed) ||
      candidate.textSpeed < 0 ||
      candidate.textSpeed > 80 ||
      !Number.isFinite(candidate.textSize) ||
      candidate.textSize < 16 ||
      candidate.textSize > 26
    )
      throw new Error('reading');
    for (const key of ['muted', 'shake', 'reduceFlash', 'autosave'] as const)
      if (typeof candidate[key] !== 'boolean') throw new Error(key);
    return {
      settings: {
        preset: candidate.preset,
        bindings,
        master: candidate.master,
        music: candidate.music,
        effects: candidate.effects,
        muted: candidate.muted,
        textSpeed: candidate.textSpeed,
        textSize: candidate.textSize,
        shake: candidate.shake,
        reduceFlash: candidate.reduceFlash,
        autosave: candidate.autosave,
      },
      recovered: false,
    };
  } catch {
    return { settings: structuredClone(defaultSettings), recovered: true };
  }
}
