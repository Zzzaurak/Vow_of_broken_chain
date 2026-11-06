import { playSound, setSoundtrack } from '../../../features/audio/engine';
import { scoreFor } from '../../../features/audio/composition';
import { useEffect, useRef, useState } from 'react';
import { getGameSnap, setGame, updateGame } from '../runtime/store';
import { loadImages } from '../runtime/assets';
import { drawGame } from '../runtime/draw';
import { stepGame } from '../functions/combat';
import {
  advanceDialogue,
  advanceDefeat,
  advanceReading,
  advanceCinematic,
  interact,
  togglePause,
} from '../functions/progression';
import { camera, distance, subtract } from '../functions/geometry';
import { mapById } from '../objects/content';
import { emptyInput, type FrameInput } from '../objects/game';
import { getSettingsSnap } from '../../../features/settings/store';
export function useGameRuntime() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext('2d');
    if (!context) return;
    setError('');
    setReady(false);
    let assetsReady = false;
    let cancelled = false,
      handle = 0,
      last = 0,
      accumulator = 0;
    const held = new Set<string>();
    const pressed = new Set<string>();
    let pointer: { x: number; y: number } | null = null;
    const storyControls = new Set<string>();
    let advanceTime = 0;
    const clear = () => {
      storyControls.clear();
      advanceTime = 0;
      held.clear();
      pressed.clear();
      pointer = null;
    };
    const keydown = (
      event: Pick<KeyboardEvent, 'code' | 'repeat' | 'defaultPrevented' | 'preventDefault'>,
    ) => {
      const game = getGameSnap();
      if (!game || event.defaultPrevented || !assetsReady) return;
      if (event.repeat && !held.has(event.code)) return;
      if (document.querySelector('[data-rebinding="true"]')) return;
      if (
        ['paused', 'failed', 'credits'].includes(game.mode.kind) &&
        document.querySelector('[data-game-menu]')
      )
        return;
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
      if (
        (event.code === 'ControlLeft' || event.code === 'ControlRight') &&
        (game.mode.kind === 'cinematic' || game.mode.kind === 'dialogue')
      ) {
        if (!event.repeat) storyControls.add(event.code);
        return;
      }
      if (game.mode.kind === 'cinematic') {
        event.preventDefault();
        if (!event.repeat && (event.code === bindings.confirm || event.code === 'Space'))
          updateGame((g) => advanceCinematic(g, 0, true));
        clear();
        return;
      }
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
        pointer = null;
        updateGame((g) => {
          const candidates = g.enemies.filter(
            (e) => e.hp > 0 && distance(e.position, g.snapshot.position) <= 440,
          );
          const index = candidates.findIndex((e) => e.id === g.lockedEnemy);
          return { ...g, lockedEnemy: candidates[(index + 1) % candidates.length]?.id ?? null };
        });
      }
    };
    const keyup = (e: KeyboardEvent) => {
      held.delete(e.code);
      storyControls.delete(e.code);
    };
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
      const game = getGameSnap();
      if (!game || !['explore', 'battle'].includes(game.mode.kind)) return;
      const code = `Mouse${e.button}`;
      element.focus();
      keydown({
        code,
        repeat: false,
        defaultPrevented: e.defaultPrevented,
        preventDefault: () => e.preventDefault(),
      });
    };
    const mouseup = (e: MouseEvent) => held.delete(`Mouse${e.button}`);
    const contextmenu = (e: MouseEvent) => e.preventDefault();
    const blur = () => {
      clear();
      const g = getGameSnap();
      if (g && g.mode.kind !== 'paused' && g.mode.kind !== 'failed') setGame(togglePause(g));
    };
    const fullscreenChanged = () => {
      if (!document.fullscreenElement) {
        const mode = getGameSnap()?.mode.kind;
        if (mode !== 'credits' && mode !== 'failed' && mode !== 'paused') blur();
      }
    };
    document.addEventListener('fullscreenchange', fullscreenChanged);
    window.addEventListener('oath:clear-input', clear);
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
        assetsReady = true;
        setReady(true);
        function frame(now: number) {
          if (cancelled) return;
          const delta = last ? Math.min((now - last) / 1000, 0.083) : 0;
          last = now;
          const game = getGameSnap();
          if (game) {
            if (game.mode.kind === 'failed') {
              setGame(advanceDefeat(game, delta));
              clear();
              accumulator = 0;
            } else if (game.mode.kind === 'cinematic') {
              setGame(advanceCinematic(game, delta * (storyControls.size ? 8 : 1)));
              held.clear();
              pressed.clear();
              pointer = null;
              accumulator = 0;
            } else if (game.mode.kind === 'dialogue') {
              const fast = storyControls.size > 0 && !game.mode.hidden && !game.mode.history;
              const reading = advanceReading(
                game,
                delta * (fast ? 8 : 1),
                fast ? 0 : getSettingsSnap().textSpeed,
              );
              advanceTime = fast ? advanceTime + delta : 0;
              if (advanceTime >= 0.14) {
                setGame(advanceDialogue(reading, true));
                advanceTime = 0;
              } else setGame(reading);
              held.clear();
              pressed.clear();
              pointer = null;
              accumulator = 0;
            } else if (game.mode.kind === 'explore' || game.mode.kind === 'battle') {
              storyControls.clear();
              advanceTime = 0;
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
                  x:
                    Number(held.has(b.aimRight) || pressed.has(b.aimRight)) -
                    Number(held.has(b.aimLeft) || pressed.has(b.aimLeft)),
                  y:
                    Number(held.has(b.aimDown) || pressed.has(b.aimDown)) -
                    Number(held.has(b.aimUp) || pressed.has(b.aimUp)),
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
                  melee: held.has(b.melee) || pressed.has(b.melee),
                  water: pressed.has(b.water),
                  support: pressed.has(b.support1) ? 0 : pressed.has(b.support2) ? 1 : null,
                };
                const next = stepGame(current, input, 1 / 60);
                for (const effect of next.effects)
                  if (!current.effects.some((e) => e.id === effect.id)) playSound(effect.kind);
                if (next.snapshot.hp < current.snapshot.hp) playSound('hurt');
                if (next.toast !== current.toast && next.toastTime > 0) playSound('error');
                if (
                  Object.keys(next.snapshot.cooldowns).some(
                    (key) =>
                      current.snapshot.cooldowns[key as keyof typeof current.snapshot.cooldowns] >
                        0 &&
                      next.snapshot.cooldowns[key as keyof typeof next.snapshot.cooldowns] === 0,
                  )
                )
                  playSound('ready');
                setGame(next);
                pressed.clear();
                accumulator -= 1 / 60;
              }
            } else {
              clear();
              accumulator = 0;
            }
            const latest = getGameSnap();
            if (latest) {
              setSoundtrack(
                scoreFor(latest.snapshot.mapId, latest.mode.kind === 'battle'),
                latest.mode.kind === 'paused' || latest.mode.kind === 'failed',
              );
              const settings = getSettingsSnap();
              drawGame(context!, latest, images, {
                shake: settings.shake,
                reduceFlash: settings.reduceFlash,
              });
            }
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
      document.removeEventListener('fullscreenchange', fullscreenChanged);
      window.removeEventListener('oath:clear-input', clear);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('mouseup', mouseup);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', onVisibility);
      element.removeEventListener('mousemove', mousemove);
      element.removeEventListener('mousedown', mousedown);
      element.removeEventListener('contextmenu', contextmenu);
    };
  }, [attempt]);
  return { canvas, error, ready, retry: () => setAttempt((value) => value + 1) };
}
