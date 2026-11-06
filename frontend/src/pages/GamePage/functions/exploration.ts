import type { GameSnapshot } from '../../../apis/AdventureService/types';
import {
  growthItems,
  regions,
  regionById,
  mapById,
  balance,
  type ExplorationPoint,
  type MapExit,
} from '../objects/content';
import type { GameState, Vec } from '../objects/game';
import { distance } from './geometry';

export const exploration = (s: GameSnapshot) =>
  s.exploration ?? { visited: [], flags: [], collected: [] };
export const hasConditions = (s: GameSnapshot, conditions: string[]) =>
  conditions.every((id) => s.completed.includes(id) || exploration(s).flags.includes(id));
export const pointPosition = (p: ExplorationPoint): Vec => ({ x: p.position[0], y: p.position[1] });
export function playerStats(s: GameSnapshot) {
  const collected = new Set(exploration(s).collected);
  const rewards = regions
    .flatMap((r) => r.points)
    .filter((p) => collected.has(p.id))
    .map((p) => growthItems.find((i) => i.id === p.reward))
    .filter((i) => i !== undefined);
  const sum = (key: 'hp' | 'mp' | 'regen' | 'melee' | 'water' | 'radius') =>
    rewards.reduce((n, i) => n + i[key], 0);
  return {
    maxHp: 100 + sum('hp'),
    maxMp: 100 + sum('mp'),
    regen: balance.player.mpRegeneration + sum('regen'),
    melee: balance.player.meleeDamage * (1 + sum('melee')),
    water: balance.player.waterDamage * (1 + sum('water')),
    radius: balance.player.waterRadius * (1 + sum('radius')),
  };
}
export function markFlag(s: GameSnapshot, id: string): GameSnapshot {
  const e = exploration(s);
  return { ...s, exploration: { ...e, flags: [...new Set([...e.flags, id])] } };
}
export function collisionMap(s: GameSnapshot) {
  const map = mapById(s.mapId);
  return {
    ...map,
    obstacles: [
      ...map.obstacles,
      ...regionById(s.mapId)
        .points.filter((p) => p.blocker && !exploration(s).flags.includes(p.id))
        .map((p) => p.blocker!),
    ],
  };
}
export const exitAvailable = (s: GameSnapshot, e: MapExit) =>
  hasConditions(s, e.requires) && hasConditions(s, regionById(e.to).requires);
export function nearestPoint(s: GameSnapshot) {
  return regionById(s.mapId)
    .points.filter((p) => distance(s.position, pointPosition(p)) < 76)
    .sort(
      (a, b) => distance(s.position, pointPosition(a)) - distance(s.position, pointPosition(b)),
    )[0];
}
export function breakObjects(state: GameState, origin: Vec, radius: number): GameState {
  const points = regionById(state.snapshot.mapId).points.filter(
    (p) =>
      p.kind === 'breakable' &&
      hasConditions(state.snapshot, p.requires) &&
      distance(origin, pointPosition(p)) < radius &&
      !exploration(state.snapshot).flags.includes(p.id),
  );
  return points.length
    ? {
        ...state,
        snapshot: points.reduce((s, p) => markFlag(s, p.id), state.snapshot),
        dirty: true,
        toast: '障碍碎裂，新的角落露了出来。',
        toastTime: 3,
      }
    : state;
}
export function collectReward(s: GameSnapshot, p: ExplorationPoint): GameSnapshot {
  const e = exploration(s);
  if (e.collected.includes(p.id)) return s;
  const next = { ...s, exploration: { ...e, collected: [...e.collected, p.id] } };
  const stats = playerStats(next);
  return {
    ...next,
    hp: p.reward === 'rice' || p.reward === 'heal' || p.reward === 'restore' ? stats.maxHp : s.hp,
    mp: p.reward === 'restore' ? stats.maxMp : s.mp,
  };
}

export function explorationObjective(s: GameSnapshot): string {
  const flags = exploration(s).flags,
    cleared = (id: string) => s.completed.includes(id);
  if (s.mapId === 'market')
    return flags.includes('qwen')
      ? '西南古道通往港镇，也可以先逛逛后院与北街'
      : '在市集打听消息，寻找南边茶摊的 Qwen';
  if (s.mapId === 'harbor')
    return cleared('2-A')
      ? '行囊已找回，南边码头可渡海；也可返回船坞交付委托'
      : '打听怪盗下落，沿北侧通路探索船坞与旧仓库';
  if (s.mapId === 'dock')
    return !flags.includes('sluice')
      ? '先调查水闸绞盘，放下通往仓库的浮桥'
      : !flags.includes('bridge')
        ? '水位已降，调查木箱浮桥前往东侧仓库'
        : '仓库在东侧；横梁梯子藏在两个旧木桶之后';
  if (s.mapId === 'rift')
    return cleared('3-A')
      ? '已有北境星图，北行登山；南侧河床还有古老石刻'
      : '东行解救星绘师，或向南探索干涸河床';
  if (s.mapId === 'pass') return '北上龙巢；东西两侧分别是冰封古殿与避风营地';
  if (s.stage === 'cleared') return '区域已清理，可以回访岔路或沿路牌继续旅途';
  return mapById(s.mapId).objective;
}
