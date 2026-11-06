import { balance } from '../objects/content';
import type { Enemy } from '../objects/game';

export const coneHalfAngle = Math.PI / 3;
export const hazardWarningSeconds = 1.2;
export function attackShape(enemy: Enemy) {
  switch (enemy.kind) {
    case 'guard':
    case 'beast':
    case 'hound':
    case 'knight':
      return 'cone';
    case 'gpt':
      return enemy.attack % 2 === 0 ? 'cone' : 'ground';
    case 'pope':
      return enemy.phaseTwo ? 'ground' : 'projectile';
    default:
      return 'ground';
  }
}
export const coneReach = (enemy: Enemy) => balance.enemies[enemy.kind].range + 20;
