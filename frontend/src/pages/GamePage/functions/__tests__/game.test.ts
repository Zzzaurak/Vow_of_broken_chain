import manifest from '../../../../../../content/manifest.json';
import { mapById } from '../../objects/content';
import { describe, it, expect } from 'vitest';
import {
  createGame,
  beginBattle,
  advanceDialogue,
  advanceDefeat,
  interact,
  retryCheckpoint,
  configureSupport,
  finishMap,
  startCinematic,
  advanceCinematic,
  canSave,
  togglePause,
} from '../progression';
import { stepGame, hitPlayer } from '../combat';
import { emptyInput, type GameState } from '../../objects/game';
import type { GameSnapshot } from '../../../../apis/AdventureService/types';
const initial: GameSnapshot = {
  schemaVersion: 1,
  contentVersion: manifest.contentVersion,
  difficulty: 'easy',
  mapId: 'steps',
  position: { x: 96, y: 384 },
  checkpoint: 'steps',
  stage: 'ready',
  completed: [],
  unlocked: [],
  supports: [],
  hp: 100,
  mp: 100,
  cooldowns: { water: 0, glm: 0, gpt: 0, claude: 0 },
  playSeconds: 0,
};
function battle(mapId = 'steps', difficulty: 'easy' | 'hard' = 'easy'): GameState {
  return beginBattle(
    createGame({ ...initial, mapId, checkpoint: mapId, difficulty, stage: 'ready' }),
  );
}
function finishDialogue(game: GameState): GameState {
  let next = game;
  for (
    let n = 0;
    n < 200 && (next.mode.kind === 'dialogue' || next.mode.kind === 'cinematic');
    n++
  ) {
    if (next.mode.kind === 'cinematic') next = advanceCinematic(next, 20);
    else next = advanceDialogue({ ...next, mode: { ...next.mode, elapsed: 2 } }, true);
  }
  return next;
}
describe('deterministic game rules', () => {
  it('ordinary defeat animates without continuing combat or changing the checkpoint', () => {
    const state = stepGame({ ...battle(), snapshot: { ...initial, hp: 0 } }, emptyInput, 1 / 60);
    expect(state.mode).toEqual({ kind: 'failed', elapsed: 0 });
    const half = advanceDefeat(state, 0.4);
    expect(half.mode).toEqual({ kind: 'failed', elapsed: 0.4 });
    expect(half.snapshot).toEqual(state.snapshot);
    expect(half.checkpoint).toEqual(state.checkpoint);
    expect(half.enemies).toEqual(state.enemies);
    expect(canSave(half)).toBe(false);
    expect(stepGame(half, { ...emptyInput, melee: true }, 1)).toEqual(half);
    const end = advanceDefeat(half, 1);
    expect(end.mode).toEqual({ kind: 'failed', elapsed: 0.9 });
    expect(advanceDefeat(end, 1)).toBe(end);
    expect(retryCheckpoint(end).snapshot.hp).toBe(100);
  });
  it('cinematics freeze combat and snapshots, disallow saving and respect pause and minimum skip time', () => {
    const state = startCinematic(battle('lair'), 'trialFall', {
      kind: 'victoryDialogue',
      scene: '4-2',
    });
    expect(canSave(state)).toBe(false);
    expect(state.enemies).toHaveLength(0);
    expect(stepGame(state, { ...emptyInput, melee: true }, 1)).toEqual(state);
    const early = advanceCinematic(state, 0, true);
    expect(early.mode.kind).toBe('cinematic');
    const elapsed = advanceCinematic(state, 2);
    expect(elapsed.snapshot).toEqual(state.snapshot);
    const paused = togglePause(elapsed);
    expect(advanceCinematic(paused, 20)).toEqual(paused);
    const resumed = togglePause(paused);
    const end = advanceCinematic(resumed, 0, true);
    expect(end.mode.kind).toBe('dialogue');
    expect(canSave(end)).toBe(false);
    expect(advanceCinematic(end, 20)).toEqual(end);
  });
  it('harbor theft leads through chase to a safe battle checkpoint without unlocking GLM', () => {
    let state = createGame({ ...initial, mapId: 'harbor', checkpoint: 'harbor', stage: 'arrival' });
    for (let i = 0; i < 40 && state.mode.kind === 'dialogue'; i++)
      state = advanceDialogue(state, true);
    expect(state.mode).toMatchObject({ kind: 'cinematic', scene: 'harborChase' });
    const before = state.snapshot;
    expect(canSave(state)).toBe(false);
    state = advanceCinematic(state, 3);
    expect(state.snapshot).toEqual(before);
    const paused = togglePause(state);
    expect(advanceCinematic(paused, 10)).toEqual(paused);
    state = advanceCinematic(togglePause(paused), 4);
    expect(state.mode.kind).toBe('explore');
    expect(state.snapshot.stage).toBe('ready');
    expect(state.snapshot.unlocked).toEqual([]);
    expect(state.snapshot.hp).toBe(before.hp);
    expect(state.snapshot.position).toEqual(before.position);
    expect(canSave(state)).toBe(true);
    expect(createGame(state.snapshot).mode.kind).toBe('explore');
    expect(beginBattle(state).enemies.map((enemy) => enemy.kind)).toEqual(['glm']);
  });
  it('escape finishes the encounter once and enters CG1 without a playable rubble room', () => {
    const state = createGame({
      ...initial,
      mapId: 'throne',
      checkpoint: 'throne',
      unlocked: ['glm', 'gpt', 'claude'],
      supports: ['claude', 'gpt'],
    });
    const escape = startCinematic(state, 'escape', { kind: 'travel', destination: 'alley' });
    const end = advanceCinematic(escape, 8);
    expect(end.snapshot.mapId).toBe('alley');
    expect(end.snapshot.completed).toEqual(['5-C']);
    expect(end.snapshot.supports).toEqual(['claude', 'gpt']);
    expect(end.mode).toMatchObject({ kind: 'dialogue', scene: '6-1' });
    expect(canSave(end)).toBe(false);
    expect(advanceCinematic(end, 8)).toEqual(end);
  });
  it('clearing the final battle preserves Claude and the chosen second support for safe saving', () => {
    const state = createGame({
      ...initial,
      mapId: 'throne',
      checkpoint: 'throne',
      unlocked: ['glm', 'gpt', 'claude'],
      supports: ['claude', 'gpt'],
    });
    expect(finishMap(state).snapshot.supports).toEqual(['claude', 'gpt']);
    const reordered = createGame({
      ...initial,
      mapId: 'corridor',
      checkpoint: 'corridor',
      unlocked: ['glm', 'gpt'],
      supports: ['gpt', 'glm'],
    });
    expect(finishMap(reordered).snapshot.supports).toEqual(['gpt', 'glm']);
  });
  it('same input produces same result and does not mutate its snapshot', () => {
    const game = battle();
    const before = structuredClone(game);
    const input = { ...emptyInput, move: { x: 1, y: 1 }, water: true };
    expect(stepGame(game, input, 1 / 60)).toEqual(stepGame(game, input, 1 / 60));
    expect(game).toEqual(before);
  });
  it('difficulty doubles only enemy body HP and damage; shields and player limits stay fixed', () => {
    const easy = battle('lair'),
      hard = battle('lair', 'hard');
    expect(hard.enemies[0].maxHp).toBe(easy.enemies[0].maxHp * 2);
    expect(hard.enemies[0].shield).toBe(easy.enemies[0].shield);
    expect(hitPlayer(easy, 10).snapshot.hp).toBe(90);
    expect(hitPlayer(hard, 10).snapshot.hp).toBe(80);
    expect(hard.snapshot.hp).toBe(100);
  });
  it('water rejects insufficient MP or cooling down without consuming resources', () => {
    const state = battle();
    const poor = { ...state, snapshot: { ...state.snapshot, mp: 5 } };
    const next = stepGame(poor, { ...emptyInput, water: true }, 0.01);
    expect(next.action).toBeNull();
    expect(next.snapshot.mp).toBeCloseTo(5.02);
    expect(next.snapshot.cooldowns.water).toBe(0);
    const cooling = {
      ...state,
      snapshot: { ...state.snapshot, cooldowns: { ...state.snapshot.cooldowns, water: 3 } },
    };
    expect(stepGame(cooling, { ...emptyInput, water: true }, 0.01).snapshot.mp).toBe(100);
  });
  it('casting pays once and emits one projectile after windup', () => {
    let state = battle();
    state = stepGame(state, { ...emptyInput, water: true }, 0.01);
    expect(state.snapshot.mp).toBe(80);
    for (let i = 0; i < 20; i++) state = stepGame(state, emptyInput, 0.01);
    expect(state.projectiles.filter((p) => !p.enemy)).toHaveLength(1);
    expect(state.snapshot.mp).toBeCloseTo(80.4);
    expect(state.snapshot.cooldowns.water).toBeCloseTo(3.8);
  });
  it('dialogue and pause freeze MP, CD and simulated time', () => {
    const state = createGame({
      ...initial,
      stage: 'arrival',
      mp: 20,
      cooldowns: { water: 3, glm: 2, gpt: 0, claude: 0 },
    });
    expect(stepGame(state, { ...emptyInput, water: true }, 1)).toBe(state);
    const paused: GameState = { ...state, mode: { kind: 'paused', previous: { kind: 'battle' } } };
    expect(stepGame(paused, emptyInput, 1)).toBe(paused);
  });
  it('melee action cannot repeatedly damage on repeated rendering ticks', () => {
    let state = battle();
    state = {
      ...state,
      enemies: [
        {
          ...state.enemies[0],
          hp: 100,
          maxHp: 100,
          position: { x: 140, y: 384 },
          phase: 'recover',
          timer: 10,
        },
      ],
    };
    state = stepGame(state, { ...emptyInput, melee: true }, 0.06);
    state = stepGame(state, emptyInput, 0.06);
    expect(state.enemies[0].hp).toBe(82);
    for (let n = 0; n < 10; n++) state = stepGame(state, emptyInput, 0.016);
    expect(state.enemies[0].hp).toBe(82);
  });
  it('GLM crossing surrender threshold enters dialogue, including lethal excess', () => {
    let state = battle('harbor');
    state = {
      ...state,
      enemies: [
        { ...state.enemies[0], hp: 1, position: { x: 140, y: 384 }, phase: 'recover', timer: 5 },
      ],
      action: {
        kind: 'melee',
        age: 0.1,
        fired: false,
        aim: { x: 1, y: 0 },
        target: { x: 140, y: 384 },
      },
    };
    const result = stepGame(state, emptyInput, 0.02);
    expect(result.mode.kind).toBe('dialogue');
    const ended = finishDialogue(result);
    expect(ended.snapshot.unlocked).toContain('glm');
    expect(ended.snapshot.stage).toBe('cleared');
  });
  it('trial victory is resolved before same-tick enemy damage', () => {
    let state = battle('lair');
    state = {
      ...state,
      snapshot: { ...state.snapshot, hp: 1 },
      enemies: [
        {
          ...state.enemies[0],
          shield: 0,
          position: { x: 140, y: 384 },
          phase: 'windup',
          timer: 0,
          aim: { x: -1, y: 0 },
        },
      ],
      action: {
        kind: 'melee',
        age: 0.1,
        fired: false,
        aim: { x: 1, y: 0 },
        target: { x: 140, y: 384 },
      },
    };
    const result = stepGame(state, emptyInput, 0.02);
    expect(result.mode.kind).toBe('cinematic');
    expect(result.snapshot.hp).toBe(1);
    const healed = finishDialogue(result);
    expect(healed.snapshot.hp).toBe(100);
    expect(healed.snapshot.mp).toBe(100);
    expect(healed.snapshot.unlocked).toContain('gpt');
  });
  it('Claude sparring damages only the shield and denies support', () => {
    let state = battle('garden');
    state = {
      ...state,
      snapshot: { ...state.snapshot, unlocked: ['glm', 'gpt'], supports: ['gpt', 'glm'] },
      enemies: [{ ...state.enemies[0], shield: 10, position: { x: 140, y: 384 } }],
      action: {
        kind: 'melee',
        age: 0.1,
        fired: false,
        aim: { x: 1, y: 0 },
        target: { x: 140, y: 384 },
      },
    };
    const result = stepGame(state, { ...emptyInput, support: 0 }, 0.02);
    expect(result.mode.kind).toBe('cinematic');
    expect(result.snapshot.cooldowns.gpt).toBe(0);
    expect(finishDialogue(result).snapshot.supports[0]).toBe('claude');
  });
  it('normal defeat retries the checkpoint without writing an autosave', () => {
    const state = battle();
    const dead = {
      ...state,
      snapshot: { ...state.snapshot, hp: 0 },
      mode: { kind: 'failed', elapsed: 0 } as const,
      autosave: 7,
    };
    const retry = retryCheckpoint(dead);
    expect(retry.snapshot.hp).toBe(100);
    expect(retry.snapshot.cooldowns.water).toBe(0);
    expect(retry.autosave).toBe(7);
    expect(retry.enemies).toHaveLength(0);
  });
  it('swapping partners preserves individual cooldowns and locks Claude at finale', () => {
    const state = createGame({
      ...initial,
      mapId: 'throne',
      unlocked: ['glm', 'gpt', 'claude'],
      supports: ['claude', 'gpt'],
      cooldowns: { water: 0, glm: 7, gpt: 10, claude: 5 },
    });
    const next = configureSupport(state, 1, 'glm');
    expect(next.snapshot.supports).toEqual(['claude', 'glm']);
    expect(next.snapshot.cooldowns).toEqual(state.snapshot.cooldowns);
    expect(configureSupport(next, 0, 'gpt').snapshot.supports[0]).toBe('claude');
  });
  it('uncleared encounters cannot be bypassed through the exit', () => {
    const state = createGame({ ...initial, position: { x: 1184, y: 384 } });
    const next = interact(state);
    expect(next.snapshot.mapId).toBe('steps');
    expect(next.mode.kind).toBe('battle');
  });
  it('an existing Claude barrier clears a later binding field once, without extending the window every tick', () => {
    let state = battle('throne');
    state = {
      ...state,
      barrier: 4,
      enemies: [{ ...state.enemies[0], phase: 'recover', timer: 2 }],
      hazards: [
        {
          id: 100,
          position: { ...state.snapshot.position },
          radius: 145,
          timer: 1.2,
          duration: 3,
          damage: 16,
          kind: 'bind',
          fired: false,
        },
      ],
    };
    const first = stepGame(state, emptyInput, 0.01);
    expect(first.hazards).toHaveLength(0);
    expect(first.enemies[0].timer).toBe(5);
    expect(first.snapshot.hp).toBe(100);
    const second = stepGame(first, emptyInput, 0.1);
    expect(second.enemies[0].timer).toBeCloseTo(4.9);
  });
  it('water cannot cross a solid map obstacle', () => {
    const [wallX, wallY] = mapById('forest').obstacles[0];
    const state = createGame({
      ...initial,
      mapId: 'forest',
      checkpoint: 'forest',
      position: { x: wallX - 20, y: wallY + 22 },
    });
    const next = stepGame(
      {
        ...state,
        projectiles: [
          {
            id: 1,
            position: { x: wallX - 14, y: wallY + 22 },
            direction: { x: 1, y: 0 },
            target: { x: wallX + 240, y: wallY + 22 },
            speed: 380,
            distance: 250,
            damage: 32,
            enemy: false,
            homing: false,
          },
        ],
      },
      emptyInput,
      0.02,
    );
    expect(next.projectiles).toHaveLength(0);
    expect(next.effects.some((e) => e.kind === 'water')).toBe(true);
  });
  it('the complete linear story reaches both CGs and credits', () => {
    let state = createGame({ ...initial, stage: 'arrival' });
    const visited: string[] = [];
    for (let rooms = 0; rooms < 12; rooms++) {
      visited.push(state.snapshot.mapId);
      state = finishDialogue(state);
      const encounterMap = [
        'steps',
        'forest',
        'harbor',
        'crystal',
        'lair',
        'corridor',
        'garden',
        'throne',
      ].includes(state.snapshot.mapId);
      if (encounterMap) {
        state = beginBattle(state);
        for (let wave = 0; wave < 3 && state.mode.kind === 'battle'; wave++) {
          state = {
            ...state,
            enemies: state.enemies.map((e) => ({
              ...e,
              hp: e.kind === 'claude' ? 100 : 0,
              shield: 0,
            })),
          };
          state = stepGame(state, emptyInput, 0.016);
        }
        state = finishDialogue(state);
      }
      if (state.snapshot.mapId === 'alley') {
        if (!visited.includes('alley')) visited.push('alley');
        break;
      }
      // Maps are imported rather than guessing world coordinates.
      const map = maps.find((m) => m.id === state.snapshot.mapId)!;
      state = {
        ...state,
        snapshot: { ...state.snapshot, position: { x: map.exit[0], y: map.exit[1] } },
      };
      state = interact(state);
    }
    expect(visited).toHaveLength(12);
    expect(state.mode.kind).toBe('credits');
    expect(state.snapshot.stage).toBe('finished');
    expect(state.snapshot.unlocked).toEqual(['glm', 'gpt', 'claude']);
  });
});
import { maps } from '../../objects/content';
