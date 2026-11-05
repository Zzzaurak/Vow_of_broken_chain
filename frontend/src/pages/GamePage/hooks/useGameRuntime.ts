import { useEffect, useRef, useState } from 'react';
import { getGameSnap, setGame, updateGame } from '../runtime/store';
import { loadImages } from '../runtime/assets';
import { drawGame } from '../runtime/draw';
import { stepGame } from '../functions/combat';
import { advanceDialogue, advanceReading, interact, togglePause } from '../functions/progression';
import { camera, distance, subtract } from '../functions/geometry';
import { mapById, sceneById } from '../objects/content';
import { emptyInput, type FrameInput } from '../objects/game';
import { getSettingsSnap } from '../../../features/settings/store';
export function useGameRuntime() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext('2d');
    if (!context) return;
    let cancelled = false,
      handle = 0,
      last = 0,
      accumulator = 0;
    const held = new Set<string>();
    const pressed = new Set<string>();
    let pointer: { x: number; y: number } | null = null;
    const clear = () => {
      held.clear();
      pressed.clear();
      pointer = null;
    };
    const keydown = (event: KeyboardEvent) => {
      const game = getGameSnap();
      if (!game) return;
      const settings = getSettingsSnap(),
        bindings = settings.bindings[settings.preset];
      if (event.code === 'Escape' || event.code === bindings.pause) {
        event.preventDefault();
        if (!event.repeat) updateGame(togglePause);
        clear();
        return;
      }
      if (
        game.mode.kind === 'paused' ||
        game.mode.kind === 'failed' ||
        game.mode.kind === 'credits'
      )
        return;
      if (game.mode.kind === 'dialogue') {
        if ([bindings.confirm, 'Space', bindings.hide, bindings.history].includes(event.code))
          event.preventDefault();
        if (event.repeat) return;
        if (event.code === bindings.confirm || event.code === 'Space')
          updateGame((g) => advanceDialogue(g));
        if (event.code === bindings.hide)
          updateGame((g) =>
            g.mode.kind === 'dialogue' ? { ...g, mode: { ...g.mode, hidden: !g.mode.hidden } } : g,
          );
        if (event.code === bindings.history)
          updateGame((g) =>
            g.mode.kind === 'dialogue'
              ? { ...g, mode: { ...g.mode, history: !g.mode.history } }
              : g,
          );
        clear();
        return;
      }
      if (Object.values(bindings).includes(event.code)) event.preventDefault();
      held.add(event.code);
      if (!event.repeat) pressed.add(event.code);
      if (!event.repeat && event.code === bindings.interact) {
        updateGame(interact);
        clear();
      }
      if (!event.repeat && event.code === bindings.lock) {
        updateGame((g) => {
          const candidates = g.enemies.filter(
            (e) => e.hp > 0 && distance(e.position, g.snapshot.position) <= 440,
          );
          const index = candidates.findIndex((e) => e.id === g.lockedEnemy);
          return { ...g, lockedEnemy: candidates[(index + 1) % candidates.length]?.id ?? null };
        });
      }
    };
    const keyup = (e: KeyboardEvent) => held.delete(e.code);
    const mousemove = (e: MouseEvent) => {
      if (getSettingsSnap().preset !== 'mouse') return;
      const rect = element.getBoundingClientRect();
      pointer = {
        x: ((e.clientX - rect.left) * 960) / rect.width,
        y: ((e.clientY - rect.top) * 540) / rect.height,
      };
    };
    const mousedown = (e: MouseEvent) => {
      if (getSettingsSnap().preset !== 'mouse') return;
      const code = `Mouse${e.button}`;
      held.add(code);
      pressed.add(code);
      element.focus();
    };
    const mouseup = (e: MouseEvent) => held.delete(`Mouse${e.button}`);
    const contextmenu = (e: MouseEvent) => e.preventDefault();
    const blur = () => {
      clear();
      const g = getGameSnap();
      if (g && g.mode.kind !== 'paused' && g.mode.kind !== 'failed') setGame(togglePause(g));
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('mouseup', mouseup);
    window.addEventListener('blur', blur);
    element.addEventListener('mousemove', mousemove);
    element.addEventListener('mousedown', mousedown);
    element.addEventListener('contextmenu', contextmenu);
    const onVisibility = () => {
      if (document.hidden) blur();
    };
    document.addEventListener('visibilitychange', onVisibility);
    loadImages()
      .then((images) => {
        if (cancelled) return;
        function frame(now: number) {
          if (cancelled) return;
          const delta = last ? Math.min((now - last) / 1000, 0.083) : 0;
          last = now;
          const game = getGameSnap();
          if (game) {
            if (game.mode.kind === 'dialogue') {
              setGame(advanceReading(game, delta, getSettingsSnap().textSpeed));
              clear();
              accumulator = 0;
            } else if (game.mode.kind === 'explore' || game.mode.kind === 'battle') {
              accumulator += delta;
              while (accumulator >= 1 / 60) {
                const current = getGameSnap();
                if (!current) break;
                const settings = getSettingsSnap(),
                  b = settings.bindings[settings.preset];
                const move = {
                  x: Number(held.has(b.right)) - Number(held.has(b.left)),
                  y: Number(held.has(b.down)) - Number(held.has(b.up)),
                };
                const keyAim = {
                  x: Number(held.has(b.aimRight)) - Number(held.has(b.aimLeft)),
                  y: Number(held.has(b.aimDown)) - Number(held.has(b.aimUp)),
                };
                const view = camera(current.snapshot.position, mapById(current.snapshot.mapId));
                const target =
                  settings.preset === 'mouse' && pointer
                    ? { x: pointer.x + view.x, y: pointer.y + view.y }
                    : null;
                const input: FrameInput = {
                  ...emptyInput,
                  move,
                  aim: target
                    ? subtract(target, current.snapshot.position)
                    : keyAim.x || keyAim.y
                      ? keyAim
                      : null,
                  target,
                  melee: held.has(b.melee),
                  water: pressed.has(b.water),
                  support: pressed.has(b.support1) ? 0 : pressed.has(b.support2) ? 1 : null,
                };
                setGame(stepGame(current, input, 1 / 60));
                pressed.clear();
                accumulator -= 1 / 60;
              }
            } else {
              clear();
              accumulator = 0;
            }
            const latest = getGameSnap();
            if (latest) drawGame(context!, latest, images);
          }
          handle = requestAnimationFrame(frame);
        }
        handle = requestAnimationFrame(frame);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载场景失败');
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(handle);
      clear();
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('mouseup', mouseup);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', onVisibility);
      element.removeEventListener('mousemove', mousemove);
      element.removeEventListener('mousedown', mousedown);
      element.removeEventListener('contextmenu', contextmenu);
    };
  }, []);
  return { canvas, error };
}
