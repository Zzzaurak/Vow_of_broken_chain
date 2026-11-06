import { describe, it, expect } from 'vitest';
import { nearestForwardEnemy, directionVector } from '../targeting';
import { createGame, beginBattle, crossExit, interact } from '../progression';
import { stepGame } from '../combat';
import { emptyInput, type GameState, type Enemy } from '../../objects/game';
import { maps } from '../../objects/content';
import manifest from '../../../../../../content/manifest.json';
function game(mapId = 'throne'): GameState {
  return createGame({
    schemaVersion: 1,
    contentVersion: manifest.contentVersion,
    difficulty: 'easy',
    mapId,
    checkpoint: mapId,
    stage: 'ready',
    position: { x: 640, y: 448 },
    hp: 100,
    mp: 100,
    cooldowns: { water: 0, glm: 0, gpt: 0, claude: 0 },
    completed: [],
    unlocked: ['gpt'],
    supports: ['gpt'],
    playSeconds: 0,
  });
}
describe('direction-independent skills and room exits', () => {
  for (const [direction, forward] of Object.entries(directionVector)) {
    it(
      direction + ' selects nearest forward enemy, explodes once and preserves no-target cooldown',
      () => {
        let state = beginBattle(game());
        const origin = state.snapshot.position;
        const at = (id: number, a: number, b: number): Enemy => ({
          ...state.enemies[0],
          id,
          kind: 'mage',
          hp: 100,
          maxHp: 100,
          shield: 0,
          phase: 'recover',
          timer: 5,
          position: {
            x: origin.x + forward.x * a - forward.y * b,
            y: origin.y + forward.y * a + forward.x * b,
          },
        });
        const near = at(1, 110, 0),
          far = at(2, 220, 0),
          behind = at(3, -70, 0),
          side = at(4, 40, 80);
        state = { ...state, enemies: [far, behind, side, near] };
        expect(nearestForwardEnemy(state.enemies, origin, forward, 440)?.id).toBe(1);
        let result = stepGame(state, { ...emptyInput, aim: forward, support: 0 }, 1 / 60);
        expect(result.casts[0].target).toEqual(near.position);
        for (let i = 0; i < 40; i++)
          result = stepGame(result, { ...emptyInput, aim: forward }, 1 / 60);
        expect(result.enemies.find((e) => e.id === 1)?.hp).toBe(35);
        const pushed = result.enemies.find((e) => e.id === 1)!.position;
        expect(pushed.x).toBeCloseTo(near.position.x + forward.x * 55);
        expect(pushed.y).toBeCloseTo(near.position.y + forward.y * 55);
        expect(result.enemies.find((e) => e.id === 2)?.hp).toBe(35);
        expect(result.enemies.find((e) => e.id === 3)?.hp).toBe(100);
        const noTarget = stepGame(
          { ...state, enemies: [behind] },
          { ...emptyInput, aim: forward, support: 0 },
          1 / 60,
        );
        expect(noTarget.snapshot.cooldowns.gpt).toBe(0);
        expect(noTarget.casts).toEqual([]);
      },
    );
    it(direction + ' water reaches the selected point after moving during its windup', () => {
      const state = game('lair'),
        origin = state.snapshot.position;
      const target = { x: origin.x + forward.x * 160, y: origin.y + forward.y * 160 };
      let result = stepGame(state, { ...emptyInput, aim: forward, target, water: true }, 1 / 60);
      for (let i = 0; i < 10; i++)
        result = stepGame(result, { ...emptyInput, move: { x: -forward.y, y: forward.x } }, 1 / 60);
      for (let i = 0; i < 50 && !result.effects.some((e) => e.kind === 'water'); i++)
        result = stepGame(result, emptyInput, 1 / 60);
      const impact = result.effects.find((e) => e.kind === 'water')!;
      expect(impact).toBeDefined();
      expect(impact.position.x).toBeCloseTo(target.x, 6);
      expect(impact.position.y).toBeCloseTo(target.y, 6);
    });
  }
  it('90 degree cone boundaries and distance exclude lateral, dead and out-of-range enemies', () => {
    const state = beginBattle(game()),
      enemy = state.enemies[0],
      origin = { x: 640, y: 448 };
    const at = (x: number, y: number, hp = 100) => ({
      ...enemy,
      hp,
      position: { x: origin.x + x, y: origin.y + y },
    });
    expect(nearestForwardEnemy([at(100, 100)], origin, { x: 1, y: 0 }, 440)).toBeDefined();
    expect(
      nearestForwardEnemy([at(100, 101), at(441, 0), at(50, 0, 0)], origin, { x: 1, y: 0 }, 440),
    ).toBeUndefined();
  });
  it('every non-final room crosses automatically only after clearing its encounter', () => {
    for (const map of maps.filter((m) => m.next && m.id !== 'throne')) {
      const state = game(map.id);
      const exit = {
        ...state,
        snapshot: {
          ...state.snapshot,
          stage: 'cleared' as const,
          position: { x: map.width * 32 - 24, y: map.exit[1] },
        },
      };
      expect(interact(exit).snapshot.mapId).toBe(map.id);
      const result = stepGame(exit, emptyInput, 1 / 60);
      expect(result.mode.kind === 'cinematic' ? result.mode.scene : result.snapshot.mapId).toBe(
        map.id === 'harbor' ? 'voyage' : map.next,
      );
      expect(
        crossExit({
          ...exit,
          snapshot: { ...exit.snapshot, position: { x: map.width * 32 - 24, y: map.exit[1] + 60 } },
        }).snapshot.mapId,
      ).toBe(map.id);
      if (map.encounter)
        expect(
          crossExit({ ...exit, snapshot: { ...exit.snapshot, stage: 'ready' } }).snapshot.mapId,
        ).toBe(map.id);
    }
  });
});
