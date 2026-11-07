import { describe, it, expect } from 'vitest';
import {
  createGame,
  interact,
  advanceDialogue,
  enterMap,
  retryCheckpoint,
  finishMap,
  beginBattle,
} from '../progression';
import { playerStats, exploration, breakObjects, collisionMap } from '../exploration';
import { regionById, regions, mapById } from '../../objects/content';
import { stepGame } from '../combat';
import { emptyInput, type GameState } from '../../objects/game';
import manifest from '../../../../../../content/manifest.json';
function game(id = 'market'): GameState {
  return createGame({
    schemaVersion: 1,
    contentVersion: manifest.contentVersion,
    difficulty: 'easy',
    mapId: id,
    checkpoint: id,
    stage: 'ready',
    position: { x: 96, y: 448 },
    completed: ['0-A'],
    unlocked: [],
    supports: [],
    hp: 60,
    mp: 40,
    cooldowns: { water: 0, glm: 0, gpt: 0, claude: 0 },
    playSeconds: 0,
    exploration: { visited: ['steps', 'rain', id], flags: [], collected: [] },
  });
}
function use(state: GameState, id: string) {
  const p = regionById(state.snapshot.mapId).points.find((p) => p.id === id)!;
  let next = interact({
    ...state,
    snapshot: { ...state.snapshot, position: { x: p.position[0], y: p.position[1] } },
  });
  for (let i = 0; i < 50 && next.mode.kind === 'dialogue'; i++) next = advanceDialogue(next, true);
  return next;
}
describe('authored RPG exploration', () => {
  it('restores resources and reads the pre-battle camp scene once', () => {
    let s = game('outpost');
    s = {
      ...s,
      snapshot: {
        ...s.snapshot,
        completed: ['0-A', '1-A', '2-A', '3-A', '4-A'],
        position: { x: 704, y: 448 },
      },
    };
    s = interact(s);
    expect(s.mode).toMatchObject({ kind: 'dialogue', scene: '4-C2' });
    expect(s.snapshot.hp).toBe(100);
    expect(s.snapshot.mp).toBe(100);
    expect(s.autosave).toBeGreaterThan(0);
    while (s.mode.kind === 'dialogue') s = advanceDialogue(s, true);
    expect(interact(s).mode.kind).toBe('explore');
  });
  it('plays the cliff conversation before the ending illustrations', () => {
    let s = createGame({ ...game('alley').snapshot, stage: 'ending' });
    expect(s.mode).toMatchObject({ kind: 'dialogue', scene: '5-5' });
    for (let i = 0; i < 30 && s.mode.kind === 'dialogue' && s.mode.scene === '5-5'; i++)
      s = advanceDialogue(s, true);
    expect(s.mode).toMatchObject({ kind: 'dialogue', scene: '6-1' });
  });
  it('different branch orders retain unique rewards and revisit state', () => {
    const explore = (order: string[]) => order.reduce((s, id) => use(s, id), game());
    for (const order of [
      ['qwen', 'market-rice', 'storyteller'],
      ['market-rice', 'storyteller', 'qwen'],
    ]) {
      let s = explore(order);
      expect(playerStats(s.snapshot).maxHp).toBe(120);
      expect(s.snapshot.hp).toBe(120);
      expect(exploration(s.snapshot).flags).toContain('qwen');
      s = enterMap(enterMap(s, 'rain'), 'market');
      expect(s.mode.kind).toBe('explore');
      s = use(s, 'market-rice');
      expect(playerStats(s.snapshot).maxHp).toBe(120);
      expect(exploration(s.snapshot).collected).toEqual(['market-rice']);
    }
  });
  it('all four growth types derive from unique finds and persist through checkpoint retry', () => {
    let s = game();
    s = use(s, 'market-rice');
    s = enterMap(s, 'rain');
    s = breakObjects(s, { x: 208, y: 320 }, 90);
    s = use(s, 'rain-pearl');
    s = enterMap(s, 'mine');
    s = finishMap(beginBattle(s));
    s = use(s, 'mine-scale');
    s = enterMap(s, 'dock');
    for (const id of ['sluice', 'barrel-one', 'barrel-two', 'dock-ladder', 'dock-core'])
      s = use(s, id);
    const stats = playerStats(s.snapshot);
    expect(stats.maxHp).toBe(120);
    expect(stats.maxMp).toBe(120);
    expect(stats.regen).toBe(2.5);
    expect(stats.melee).toBeCloseTo(20.7);
    expect(stats.water).toBeCloseTo(38.4);
    expect(stats.radius).toBe(108);
    const restored = createGame(structuredClone(s.snapshot));
    expect(playerStats(restored.snapshot)).toEqual(stats);
    const retried = retryCheckpoint({ ...s, snapshot: { ...s.snapshot, hp: 1, mp: 0 } });
    expect(retried.snapshot.hp).toBe(120);
    expect(retried.snapshot.mp).toBe(120);
    const original = game();
    expect(playerStats(original.snapshot).maxHp).toBe(100);
  });
  it('sluice collision, bridge and two barrels enforce their prerequisites', () => {
    let s = game('dock');
    const original = s.snapshot.position;
    s = use(s, 'bridge');
    expect(exploration(s.snapshot).flags).not.toContain('bridge');
    expect(collisionMap(s.snapshot).obstacles.some((o) => o[0] === 864)).toBe(true);
    s = use(s, 'sluice');
    expect(collisionMap(s.snapshot).obstacles.some((o) => o[0] === 864)).toBe(false);
    s = use(s, 'bridge');
    expect(s.snapshot.position).toEqual({ x: 1088, y: 480 });
    s = use(s, 'dock-core');
    expect(exploration(s.snapshot).collected).toEqual([]);
    s = use(s, 'barrel-one');
    s = use(s, 'dock-ladder');
    expect(exploration(s.snapshot).flags).not.toContain('dock-ladder');
    s = use(s, 'barrel-two');
    s = use(s, 'dock-ladder');
    s = use(s, 'dock-core');
    expect(exploration(s.snapshot).collected).toContain('dock-core');
  });
  it('camp restores grown resources and cooldowns and exposes an eating animation', () => {
    let s = use(game(), 'market-rice');
    s = {
      ...s,
      snapshot: {
        ...s.snapshot,
        hp: 12,
        mp: 0,
        cooldowns: { water: 3, glm: 5, gpt: 10, claude: 5 },
      },
    };
    s = use(s, 'tea');
    expect(s.snapshot.hp).toBe(120);
    expect(s.snapshot.mp).toBe(100);
    expect(s.snapshot.cooldowns).toEqual({ water: 0, glm: 0, gpt: 0, claude: 0 });
    expect(s.restTime).toBeGreaterThan(0);
    expect(s.checkpoint).toEqual(s.snapshot);
  });
  it('snow traps warn before damage and difficulty scales damage only', () => {
    const run = (difficulty: 'easy' | 'hard', time: number) => {
      const s = game('pass');
      return stepGame(
        {
          ...s,
          simulationTime: time,
          snapshot: { ...s.snapshot, difficulty, position: { x: 640, y: 288 } },
        },
        emptyInput,
        0.01,
      );
    };
    expect(run('easy', 0.5).snapshot.hp).toBe(60);
    expect(run('easy', 1.6).snapshot.hp).toBe(50);
    expect(run('hard', 1.6).snapshot.hp).toBe(40);
  });
  it('hard-shell spiders reflect frontal hits but expose their rear, with difficulty-scaled reflection', () => {
    const run = (hard: boolean, rear: boolean) => {
      let s = beginBattle(game('mine'));
      s = {
        ...s,
        snapshot: {
          ...s.snapshot,
          difficulty: hard ? 'hard' : 'easy',
          position: { x: 600, y: 480 },
        },
        enemies: [
          {
            ...s.enemies[0],
            position: { x: 650, y: 480 },
            aim: { x: rear ? 1 : -1, y: 0 },
            phase: 'recover',
            timer: 5,
          },
        ],
      };
      s = stepGame(s, { ...emptyInput, aim: { x: 1, y: 0 }, melee: true }, 0.016);
      for (let i = 0; i < 8; i++) s = stepGame(s, emptyInput, 0.016);
      return s;
    };
    expect(run(false, false).snapshot.hp).toBe(57);
    expect(run(true, false).snapshot.hp).toBe(54);
    expect(run(false, true).snapshot.hp).toBe(60);
    expect(run(false, true).enemies[0].hp).toBe(46);
  });
  it('all regions have unique gates, real side branches, and no reward requires itself', () => {
    expect(regions).toHaveLength(25);
    expect(regions.filter((r) => r.exits.length >= 3).length).toBeGreaterThanOrEqual(5);
    for (const r of regions) {
      expect(new Set(r.exits.map((e) => e.side)).size).toBe(r.exits.length);
      for (const p of r.points) expect(p.requires).not.toContain(p.id);
    }
  });
});
