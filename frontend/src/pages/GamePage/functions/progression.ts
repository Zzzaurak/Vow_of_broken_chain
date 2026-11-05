import type { GameSnapshot, Partner } from '../../../apis/AdventureService/types';
import { balance, encounters, mapById, sceneById } from '../objects/content';
import type { Enemy, GameState, WorldMode } from '../objects/game';
import { distance } from './geometry';
export function dialogueMode(
  scene: string,
  after: 'ready' | 'clear' | 'cg2' | 'epilogue' | 'finished' | 'fight',
): WorldMode {
  return {
    kind: 'dialogue',
    scene,
    line: 0,
    revealed: 0,
    elapsed: 0,
    hidden: false,
    history: false,
    after,
  };
}
export function createGame(snapshot: GameSnapshot): GameState {
  const s = structuredClone(snapshot);
  const state: GameState = {
    snapshot: s,
    checkpoint: structuredClone(s),
    mode: { kind: 'explore' },
    enemies: [],
    projectiles: [],
    hazards: [],
    effects: [],
    action: null,
    casts: [],
    aim: { x: 1, y: 0 },
    direction: 'right',
    moving: false,
    walkTime: 0,
    meleeCooldown: 0,
    invulnerable: 0,
    bound: 0,
    slow: 0,
    barrier: 0,
    wave: 0,
    serial: 0,
    simulationTime: 0,
    autosave: 0,
    dirty: false,
    toast: '',
    toastTime: 0,
    lockedEnemy: null,
    calls: [],
  };
  const map = mapById(s.mapId);
  if (s.stage === 'finished') return { ...state, mode: { kind: 'credits' } };
  if (s.stage === 'ending') return { ...state, mode: dialogueMode('6-1', 'cg2') };
  if (s.stage === 'arrival' && map.before)
    return { ...state, mode: dialogueMode(map.before, 'ready') };
  return state;
}
export function checkpoint(state: GameState): GameState {
  return {
    ...state,
    checkpoint: structuredClone(state.snapshot),
    autosave: state.autosave + 1,
    dirty: true,
  };
}
export function notify(state: GameState, toast: string): GameState {
  return { ...state, toast, toastTime: 2.5 };
}
export function finishMap(state: GameState): GameState {
  const s = state.snapshot;
  const map = mapById(s.mapId);
  const partner = map.unlock as Partner | null;
  const unlocked = partner ? [...new Set([...s.unlocked, partner])] : s.unlocked;
  const supports: Partner[] =
    partner === 'claude'
      ? ['claude', s.supports.includes('gpt') ? 'gpt' : 'glm']
      : partner && s.supports.length < 2 && !s.supports.includes(partner)
        ? [...s.supports, partner]
        : s.supports;
  const healed = ['steps', 'lair', 'garden'].includes(s.mapId);
  const snapshot: GameSnapshot = {
    ...s,
    stage: 'cleared',
    unlocked,
    supports,
    completed: map.encounter ? [...new Set([...s.completed, map.encounter])] : s.completed,
    hp: healed ? 100 : s.hp,
    mp: healed ? 100 : s.mp,
  };
  return checkpoint({
    ...state,
    snapshot,
    mode: { kind: 'explore' },
    enemies: [],
    projectiles: [],
    hazards: [],
    action: null,
    casts: [],
    bound: 0,
    slow: 0,
    lockedEnemy: null,
  });
}
export function advanceDialogue(state: GameState, instant = false): GameState {
  if (state.mode.kind !== 'dialogue') return state;
  const mode = state.mode,
    scene = sceneById(mode.scene),
    line = scene.lines[mode.line];
  if ((mode.scene === '6-1' || mode.scene === '6-2') && mode.elapsed < 1.5) return state;
  if (mode.hidden) return { ...state, mode: { ...mode, hidden: false } };
  if (mode.history) return { ...state, mode: { ...mode, history: false } };
  if (!instant && mode.revealed < line.text.length)
    return { ...state, mode: { ...mode, revealed: line.text.length } };
  if (mode.line + 1 < scene.lines.length)
    return { ...state, mode: { ...mode, line: mode.line + 1, revealed: 0 } };
  switch (mode.after) {
    case 'ready':
      return checkpoint({
        ...state,
        snapshot: { ...state.snapshot, stage: 'ready' },
        mode: { kind: 'explore' },
      });
    case 'clear':
      return finishMap(state);
    case 'fight':
      return { ...state, mode: { kind: 'battle' } };
    case 'cg2':
      return { ...state, mode: dialogueMode('6-2', 'epilogue') };
    case 'epilogue':
      return { ...state, mode: dialogueMode('6-3', 'finished') };
    case 'finished':
      return checkpoint({
        ...state,
        snapshot: { ...state.snapshot, stage: 'finished' },
        mode: { kind: 'credits' },
      });
  }
}
export function spawnWave(state: GameState, wave: number): Enemy[] {
  const map = mapById(state.snapshot.mapId),
    encounter = encounters.find((e) => e.id === map.encounter);
  return (encounter?.waves[wave] ?? []).map((kind, i) => {
    const spec = balance.enemies[kind],
      hp = spec.hp * (state.snapshot.difficulty === 'hard' ? 2 : 1);
    return {
      id: state.serial + i + 1,
      kind,
      position: {
        x: map.width * 32 * 0.55 + (i % 3) * 100,
        y: map.height * 16 + (Math.floor(i / 3) * 2 - 1) * 90,
      },
      aim: { x: -1, y: 0 },
      hp,
      maxHp: hp,
      shield: 'shield' in spec ? spec.shield : 0,
      phase: 'chase',
      timer: 0,
      slowed: 0,
      broken: 0,
      attack: 0,
      phaseTwo: false,
    };
  });
}
export function beginBattle(state: GameState): GameState {
  const enemies = spawnWave(state, 0);
  return {
    ...state,
    mode: { kind: 'battle' },
    enemies,
    wave: 0,
    serial: state.serial + enemies.length,
    lockedEnemy: null,
    dirty: true,
    toast: '观察前摇，走位反击',
    toastTime: 3,
  };
}
export function victory(state: GameState): GameState {
  const map = mapById(state.snapshot.mapId);
  const clean = {
    ...state,
    enemies: [],
    projectiles: [],
    hazards: [],
    effects: [],
    action: null,
    casts: [],
    bound: 0,
    slow: 0,
    lockedEnemy: null,
  };
  return map.after ? { ...clean, mode: dialogueMode(map.after, 'clear') } : finishMap(clean);
}
export function interact(state: GameState): GameState {
  if (state.mode.kind !== 'explore') return state;
  const map = mapById(state.snapshot.mapId),
    pos = state.snapshot.position;
  if (distance(pos, { x: map.spawn[0], y: map.spawn[1] }) < 95)
    return notify(
      { ...state, snapshot: { ...state.snapshot, hp: 100, mp: 100 }, dirty: true },
      '吃一碗白米饭。HP / MP 已恢复。',
    );
  if (map.encounter && state.snapshot.stage !== 'cleared' && pos.x > map.width * 32 * 0.28)
    return beginBattle(state);
  if (distance(pos, { x: map.exit[0], y: map.exit[1] }) < 100) {
    if (map.encounter && state.snapshot.stage !== 'cleared')
      return notify(state, '先完成当前遭遇。');
    if (!map.next) return state;
    const next = mapById(map.next);
    const snapshot: GameSnapshot = {
      ...state.snapshot,
      mapId: next.id,
      checkpoint: next.id,
      position: { x: next.spawn[0], y: next.spawn[1] },
      stage: next.id === 'alley' ? 'ending' : 'arrival',
    };
    const entered = createGame(snapshot);
    return { ...entered, autosave: state.autosave + 1, dirty: true };
  }
  return notify(
    state,
    map.encounter && state.snapshot.stage !== 'cleared'
      ? '向前进入场地，按交互开始战斗。'
      : '沿道路前进，在金色出口处交互。',
  );
}
export function retryCheckpoint(state: GameState): GameState {
  const snapshot = {
    ...structuredClone(state.checkpoint),
    hp: 100,
    mp: 100,
    cooldowns: { water: 0, glm: 0, gpt: 0, claude: 0 },
  };
  const restored = createGame(snapshot);
  return { ...restored, autosave: state.autosave, dirty: true };
}
export function togglePause(state: GameState): GameState {
  if (state.mode.kind === 'paused') return { ...state, mode: state.mode.previous };
  if (state.mode.kind === 'failed') return state;
  return { ...state, mode: { kind: 'paused', previous: state.mode }, moving: false };
}
export function canSave(state: GameState): boolean {
  const mode = state.mode.kind === 'paused' ? state.mode.previous : state.mode;
  return mode.kind === 'explore' || mode.kind === 'credits';
}
export function configureSupport(state: GameState, slot: number, partner: Partner): GameState {
  if (!canSave(state) || !state.snapshot.unlocked.includes(partner)) return state;
  if (state.snapshot.mapId === 'throne' && (slot === 0 || partner === 'claude'))
    return notify(state, '终战第一槽固定为 Claude。');
  const supports = [...state.snapshot.supports];
  const existing = supports.indexOf(partner);
  if (existing >= 0) [supports[slot], supports[existing]] = [supports[existing], supports[slot]];
  else supports[slot] = partner;
  return {
    ...state,
    snapshot: { ...state.snapshot, supports: supports.filter(Boolean) },
    dirty: true,
  };
}

export function advanceReading(state: GameState, dt: number, textSpeed: number): GameState {
  if (state.mode.kind !== 'dialogue') return state;
  const mode = state.mode,
    elapsed = mode.elapsed + dt;
  const text = sceneById(mode.scene).lines[mode.line].text;
  const waiting = (mode.scene === '6-1' || mode.scene === '6-2') && elapsed < 1.5;
  const revealed = waiting
    ? 0
    : textSpeed === 0
      ? text.length
      : Math.min(text.length, mode.revealed + dt * textSpeed);
  return { ...state, mode: { ...mode, elapsed, revealed } };
}
