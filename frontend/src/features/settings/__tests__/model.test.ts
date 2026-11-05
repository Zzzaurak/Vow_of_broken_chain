import { describe, it, expect } from 'vitest';
import {
  defaultSettings,
  defaults,
  parseSettings,
  rebind,
  conflicts,
  bindingError,
} from '../model';
describe('settings validation and contextual bindings', () => {
  it('both default presets are valid despite reuse across contexts', () => {
    expect(parseSettings(defaultSettings).recovered).toBe(false);
    expect(conflicts(defaults.keyboard, 'aimUp', 'ArrowUp')).toEqual([]);
  });
  it('same-context conflict requires explicit swap and preserves both actions', () => {
    expect(() => rebind(defaults.keyboard, 'melee', 'KeyK', 'keyboard')).toThrow();
    const changed = rebind(defaults.keyboard, 'melee', 'KeyK', 'keyboard', true);
    expect(changed.melee).toBe('KeyK');
    expect(changed.water).toBe('KeyJ');
    expect(defaults.keyboard.melee).toBe('KeyJ');
  });
  it('cross-context reuse is allowed', () => {
    expect(rebind(defaults.keyboard, 'menuConfirm', 'KeyJ', 'keyboard').menuConfirm).toBe('KeyJ');
  });
  it('keyboard mode rejects mouse and reserved keys', () => {
    expect(bindingError('melee', 'Mouse0', 'keyboard')).not.toBeNull();
    expect(bindingError('melee', 'Escape', 'keyboard')).not.toBeNull();
    expect(bindingError('confirm', 'F5', 'keyboard')).not.toBeNull();
    expect(bindingError('hide', 'Space', 'mouse')).not.toBeNull();
  });
  it('rejects NaN, invalid sliders, incomplete or conflicting configurations', () => {
    for (const patch of [
      { master: NaN },
      { music: 2 },
      { textSize: 5 },
      { preset: 'gamepad' },
      { bindings: { mouse: {}, keyboard: {} } },
      { bindings: { ...defaults, keyboard: { ...defaults.keyboard, melee: 'KeyK' } } },
    ])
      expect(parseSettings({ ...defaultSettings, ...patch }).recovered).toBe(true);
  });
  it('older valid preferences gain menu defaults without losing custom controls', () => {
    const saved = structuredClone(defaultSettings);
    delete (saved.bindings.keyboard as Partial<typeof saved.bindings.keyboard>).menuConfirm;
    saved.bindings.keyboard.melee = 'KeyL';
    const result = parseSettings(saved);
    expect(result.recovered).toBe(false);
    expect(result.settings.bindings.keyboard.menuConfirm).toBe('Enter');
    expect(result.settings.bindings.keyboard.melee).toBe('KeyL');
  });
  it('missing data uses defaults quietly; corrupt data reports recovery', () => {
    expect(parseSettings(null).recovered).toBe(false);
    expect(parseSettings({}).recovered).toBe(true);
  });
});
