import {
  exploration,
  hasConditions,
  playerStats,
  markFlag,
  nearestPoint,
  collectReward,
  exitAvailable,
} from './exploration';
import { cinematics, type CinematicId, type CinematicContinuation } from '../objects/cinematics';
import type { GameSnapshot, Partner } from '../../../apis/AdventureService/types';
import {
  balance,
  encounters,
  mapById,
  sceneById,
  regionById,
  growthItems,
} from '../objects/content';
import type { Enemy, GameState, WorldMode } from '../objects/game';
import { distance } from './geometry';
export function dialogueMode(
  scene: string,
  after: 'ready' | 'clear' | 'cg2' | 'epilogue' | 'finished' | 'fight' | 'explore',
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
  const cloned = structuredClone(snapshot);
  const e = exploration(cloned);
  const s = {
    ...cloned,
    exploration: { ...e, visited: [...new Set([...e.visited, cloned.mapId])] },
  };
  const state: GameState = {
    drops: [],
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
    hp: healed ? playerStats(s).maxHp : s.hp,
    mp: healed ? playerStats(s).maxMp : s.mp,
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
export function startCinematic(
  state: GameState,
  scene: CinematicId,
  after: CinematicContinuation,
): GameState {
  return {
    ...state,
    mode: { kind: 'cinematic', scene, elapsed: 0, after },
    enemies: [],
    projectiles: [],
    hazards: [],
    action: null,
    casts: [],
    effects: [],
    moving: false,
  };
}
function readyAfterDialogue(state: GameState): GameState {
  return checkpoint({
    ...state,
    snapshot: { ...markFlag(state.snapshot, `${state.snapshot.mapId}:arrival`), stage: 'ready' },
    mode: { kind: 'explore' },
  });
}
export function enterMap(state: GameState, destination: string, arrival?: number[]): GameState {
  const next = mapById(destination);
  const snapshot: GameSnapshot = {
    ...state.snapshot,
    mapId: next.id,
    checkpoint: next.id,
    position: { x: (arrival ?? next.spawn)[0], y: (arrival ?? next.spawn)[1] },
    stage:
      next.id === 'alley'
        ? 'ending'
        : next.encounter && state.snapshot.completed.includes(next.encounter)
          ? 'cleared'
          : next.before && !exploration(state.snapshot).flags.includes(`${next.id}:arrival`)
            ? 'arrival'
            : 'ready',
  };
  return { ...createGame(snapshot), autosave: state.autosave + 1, dirty: true };
}
export function advanceCinematic(state: GameState, dt: number, skip = false): GameState {
  if (state.mode.kind !== 'cinematic') return state;
  const mode = state.mode;
  const elapsed = mode.elapsed + dt;
  if (elapsed < cinematics[mode.scene].duration && !(skip && mode.elapsed >= 1.5))
    return { ...state, mode: { ...mode, elapsed } };
  switch (mode.after.kind) {
    case 'victoryDialogue':
      return { ...state, mode: dialogueMode(mode.after.scene, 'clear') };
    case 'clear':
      return finishMap(state);
    case 'ready':
      return readyAfterDialogue(state);
    case 'travel':
      return enterMap(mode.scene === 'escape' ? finishMap(state) : state, mode.after.destination);
  }
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
      if (mode.scene === '2-1') return readyAfterDialogue(state);
      return mode.scene === '5-1'
        ? startCinematic(state, 'breach', { kind: 'ready' })
        : readyAfterDialogue(state);
    case 'clear':
      return mode.scene === '0-2'
        ? notify(enterMap(finishMap(state), 'rain'), '圣光将你震落长阶。雨林南侧的泥路通向市集。')
        : mode.scene === '4-2'
          ? startCinematic(state, 'healing', { kind: 'clear' })
          : mode.scene === '5-4'
            ? startCinematic(state, 'escape', { kind: 'travel', destination: 'alley' })
            : finishMap(state);
    case 'explore':
      return checkpoint({ ...state, mode: { kind: 'explore' } });
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
        x: regionById(map.id).enemySpawns?.[i]?.[0] ?? map.width * 32 * 0.55 + (i % 3) * 100,
        y:
          regionById(map.id).enemySpawns?.[i]?.[1] ??
          map.height * 16 + (Math.floor(i / 3) * 2 - 1) * 90,
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
  const scene =
    map.id === 'steps'
      ? 'separation'
      : map.id === 'lair'
        ? 'trialFall'
        : map.id === 'garden'
          ? 'reunion'
          : null;
  if (scene && map.after)
    return startCinematic(clean, scene, { kind: 'victoryDialogue', scene: map.after });
  return map.after ? { ...clean, mode: dialogueMode(map.after, 'clear') } : finishMap(clean);
}
export function interact(state: GameState): GameState {
  if (state.mode.kind !== 'explore') return state;
  const map = mapById(state.snapshot.mapId),
    point = nearestPoint(state.snapshot);
  if (point) {
    if (!hasConditions(state.snapshot, point.requires))
      return notify(state, '先完成附近的机关或守卫，再来调查这里。');
    if (point.kind === 'breakable')
      return notify(
        state,
        exploration(state.snapshot).flags.includes(point.id)
          ? '障碍已经清除。'
          : '用摆尾或水球击碎这处障碍。',
      );
    if (point.kind === 'chest' && exploration(state.snapshot).collected.includes(point.id))
      return notify(state, '宝箱已经开启，宝物的力量仍伴随你。');
    let snapshot = markFlag(state.snapshot, point.id);
    if (point.reward) snapshot = collectReward(snapshot, point);
    if (point.warp) snapshot = { ...snapshot, position: { x: point.warp[0], y: point.warp[1] } };
    if (point.kind === 'camp' || point.reward === 'restore') {
      const stats = playerStats(snapshot);
      return notify(
        checkpoint({
          ...state,
          snapshot: {
            ...snapshot,
            hp: stats.maxHp,
            mp: stats.maxMp,
            cooldowns: { water: 0, glm: 0, gpt: 0, claude: 0 },
          },
          restTime: 2.5,
        }),
        point.text,
      );
    }
    if (point.kind === 'chest') {
      const item = growthItems.find((i) => i.id === point.reward);
      return notify(
        checkpoint({ ...state, snapshot }),
        `获得【${item?.name ?? point.name}】！探索成长已生效。`,
      );
    }
    if (point.warp) return notify(checkpoint({ ...state, snapshot }), point.text);
    return {
      ...state,
      snapshot,
      dirty: true,
      mode: dialogueMode(point.scene ?? `point:${point.id}`, 'explore'),
    };
  }
  if (
    !regionById(map.id).points.some((p) => p.kind === 'camp') &&
    distance(state.snapshot.position, { x: map.spawn[0], y: map.spawn[1] }) < 70
  ) {
    const stats = playerStats(state.snapshot);
    return notify(
      checkpoint({
        ...state,
        snapshot: {
          ...state.snapshot,
          hp: stats.maxHp,
          mp: stats.maxMp,
          cooldowns: { water: 0, glm: 0, gpt: 0, claude: 0 },
        },
        restTime: 2.5,
      }),
      '吃一碗白米饭。全状态恢复，检查点已记录。',
    );
  }
  const trigger = regionById(map.id).trigger;
  if (
    map.encounter &&
    !state.snapshot.completed.includes(map.encounter) &&
    distance(state.snapshot.position, { x: trigger[0], y: trigger[1] }) < 350
  )
    return beginBattle(state);
  return notify(state, '靠近人物、路牌、宝箱或营火调查；沿箭头走进通路可以切换区域。');
}
export function retryCheckpoint(state: GameState): GameState {
  const snapshot = {
    ...structuredClone(state.checkpoint),
    hp: playerStats(state.checkpoint).maxHp,
    mp: playerStats(state.checkpoint).maxMp,
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

// Failure presentation advances alone: battle, resources and save counters stay frozen.
export function advanceDefeat(state: GameState, dt: number): GameState {
  if (state.mode.kind !== 'failed' || state.mode.elapsed >= 0.9) return state;
  return { ...state, mode: { ...state.mode, elapsed: Math.min(0.9, state.mode.elapsed + dt) } };
}

export function crossExit(state: GameState): GameState {
  if (state.mode.kind !== 'explore') return state;
  const map = mapById(state.snapshot.mapId),
    p = state.snapshot.position;
  const exit = regionById(map.id).exits.find((e) => {
    const vertical = e.side === 'north' || e.side === 'south';
    return (
      Math.abs((vertical ? p.x : p.y) - e.at) <= 40 &&
      (e.side === 'north'
        ? p.y <= 36
        : e.side === 'south'
          ? p.y >= map.height * 32 - 36
          : e.side === 'west'
            ? p.x <= 36
            : p.x >= map.width * 32 - 36)
    );
  });
  if (!exit) return state;
  if (!exitAvailable(state.snapshot, exit))
    return notify(state, '这条路暂未开放。先查看路牌与当前任务，完成所需剧情或机关。');
  return exit.travel
    ? startCinematic(state, exit.travel, { kind: 'travel', destination: exit.to })
    : enterMap(state, exit.to, exit.arrival);
}
