import { describe, it, expect } from 'vitest';
import { createGame, interact, advanceDialogue } from '../progression';
import { collisionMap, markFlag } from '../exploration';
import { validPosition } from '../geometry';
import { mapById, regionById } from '../../objects/content';
import manifest from '../../../../../../content/manifest.json';
function state(id: string, flags: string[] = []) {
  const map = mapById(id);
  return createGame({
    schemaVersion: 1,
    contentVersion: manifest.contentVersion,
    difficulty: 'easy',
    mapId: id,
    checkpoint: id,
    stage: 'cleared',
    position: { x: map.spawn[0], y: map.spawn[1] },
    completed: ['0-A', '1-A', '3-A', 'ice-guard'],
    unlocked: [],
    supports: [],
    hp: 100,
    mp: 100,
    cooldowns: { water: 0, glm: 0, gpt: 0, claude: 0 },
    playSeconds: 0,
    exploration: { visited: [id], flags, collected: [] },
  });
}
function reaches(s: ReturnType<typeof state>, target: { x: number; y: number }) {
  const map = collisionMap(s.snapshot),
    step = 8;
  const start = {
    x: Math.round(s.snapshot.position.x / step) * step,
    y: Math.round(s.snapshot.position.y / step) * step,
  };
  const queue = [start],
    seen = new Set([`${start.x},${start.y}`]);
  for (const p of queue) {
    if (Math.hypot(p.x - target.x, p.y - target.y) < 16) return true;
    for (const [dx, dy] of [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
    ]) {
      const n = { x: p.x + dx, y: p.y + dy },
        key = `${n.x},${n.y}`;
      if (!seen.has(key) && validPosition(n, map)) {
        seen.add(key);
        queue.push(n);
      }
    }
  }
  return false;
}
describe('sealed treasure routes', () => {
  it('rain chest cannot be reached by walking around either end of the thorns', () => {
    const s = state('rain');
    expect(reaches(s, { x: 208, y: 208 })).toBe(false);
    expect(reaches({ ...s, snapshot: markFlag(s.snapshot, 'thorns') }, { x: 208, y: 208 })).toBe(
      true,
    );
  });
  it('dock platform remains isolated even after the sluice opens; only the ladder connects it', () => {
    let s = state('dock', ['sluice', 'barrel-one', 'barrel-two']);
    expect(reaches(s, { x: 304, y: 144 })).toBe(false);
    expect(reaches(s, { x: 1184, y: 480 })).toBe(true);
    const ladder = regionById('dock').points.find((p) => p.id === 'dock-ladder')!;
    s = interact({
      ...s,
      snapshot: { ...s.snapshot, position: { x: ladder.position[0], y: ladder.position[1] } },
    });
    expect(reaches(s, { x: 304, y: 144 })).toBe(true);
    s = interact({ ...s, snapshot: { ...s.snapshot, position: { x: 208, y: 160 } } });
    expect(reaches(s, { x: 640, y: 800 })).toBe(true);
  });
  it('ice wall cannot be bypassed even after breaking the seal; lift works both ways', () => {
    let s = state('icehall', ['ice-lift', 'ice-seal']);
    expect(reaches(s, { x: 1040, y: 144 })).toBe(false);
    s = interact({
      ...s,
      snapshot: {
        ...s.snapshot,
        position: { x: 352, y: 480 },
        exploration: { visited: ['icehall'], flags: [], collected: [] },
      },
    });
    expect(reaches(s, { x: 1040, y: 144 })).toBe(false);
    s = { ...s, snapshot: markFlag(s.snapshot, 'ice-seal') };
    expect(reaches(s, { x: 1040, y: 144 })).toBe(true);
    s = interact({ ...s, snapshot: { ...s.snapshot, position: { x: 1120, y: 320 } } });
    expect(s.snapshot.position).toEqual({ x: 352, y: 480 });
  });
});
