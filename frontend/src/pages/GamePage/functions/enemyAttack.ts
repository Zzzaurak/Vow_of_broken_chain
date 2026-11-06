import { balance } from '../objects/content';
import type { WorldMap } from '../objects/content';
import { add } from './geometry';
import { clearPath } from './navigation';
import type { Enemy, Vec } from '../objects/game';

export const coneHalfAngle = Math.PI / 3;
export const hazardWarningSeconds = 1.2;
export function attackShape(enemy: Enemy, mapId: string) {
  switch (enemy.kind) {
    case 'guard':
    case 'beast':
    case 'hound':
    case 'knight':
      return 'cone';
    case 'gpt':
      return enemy.attack % 2 === 0 ? 'cone' : 'ground';
    case 'mage':
      return mapId === 'forest' ? 'projectile' : 'ground';
    case 'pope':
      return enemy.phaseTwo ? 'ground' : 'projectile';
    default:
      return 'ground';
  }
}
export const coneReach = (enemy: Enemy) => balance.enemies[enemy.kind].range + 20;

/** Prefer the player's back, then their flanks when pressed against scenery. */
export function runeLanding(player: Vec, aim: Vec, origin: Vec, map: WorldMap): Vec {
  const back = Math.atan2(-aim.y, -aim.x);
  for (const distance of [80, 48]) {
    for (const angle of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
      const landing = add(
        player,
        { x: Math.cos(back + angle), y: Math.sin(back + angle) },
        distance,
      );
      if (clearPath(player, landing, map)) return landing;
    }
  }
  return origin;
}
