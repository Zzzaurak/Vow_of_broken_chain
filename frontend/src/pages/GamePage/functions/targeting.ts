import type { Enemy, Vec, Direction } from '../objects/game';
import { distance, normalize, subtract } from './geometry';

export const directionVector: Record<Direction, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
export function nearestForwardEnemy(
  enemies: Enemy[],
  origin: Vec,
  forward: Vec,
  range: number,
): Enemy | undefined {
  return enemies
    .filter((enemy) => {
      const delta = subtract(enemy.position, origin);
      const unit = normalize(delta);
      return (
        enemy.hp > 0 &&
        distance(enemy.position, origin) <= range &&
        unit.x * forward.x + unit.y * forward.y >= Math.SQRT1_2 - 1e-9
      );
    })
    .reduce<Enemy | undefined>(
      (nearest, enemy) =>
        !nearest || distance(enemy.position, origin) < distance(nearest.position, origin)
          ? enemy
          : nearest,
      undefined,
    );
}
