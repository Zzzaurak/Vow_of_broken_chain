import type { Vec, Direction } from '../objects/game';
import type { WorldMap } from '../objects/content';
export const length = (v: Vec) => Math.hypot(v.x, v.y);
export const subtract = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const distance = (a: Vec, b: Vec) => length(subtract(a, b));
export const normalize = (v: Vec): Vec => {
  const n = length(v);
  return n ? { x: v.x / n, y: v.y / n } : { x: 0, y: 1 };
};
export const add = (a: Vec, b: Vec, scale = 1): Vec => ({
  x: a.x + b.x * scale,
  y: a.y + b.y * scale,
});
export const facing = (v: Vec): Direction =>
  Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? 'right' : 'left') : v.y > 0 ? 'down' : 'up';
export function validPosition(p: Vec, map: WorldMap): boolean {
  return (
    p.x >= 24 &&
    p.y >= 24 &&
    p.x <= map.width * 32 - 24 &&
    p.y <= map.height * 32 - 24 &&
    !map.obstacles.some(
      ([x, y, w, h]) => p.x >= x - 12 && p.x <= x + w + 12 && p.y >= y - 8 && p.y <= y + h + 8,
    )
  );
}
export function movePosition(p: Vec, delta: Vec, map: WorldMap): Vec {
  // Subdivide dashes and knockback as well as normal movement, so neither
  // endpoint-only collision nor a delayed frame can jump across a wall.
  const steps = Math.max(1, Math.ceil(length(delta) / 4));
  const step = { x: delta.x / steps, y: delta.y / steps };
  let position = p;
  for (let i = 0; i < steps; i++) {
    const x = { x: position.x + step.x, y: position.y };
    const horizontal = validPosition(x, map) ? x : position;
    const y = { x: horizontal.x, y: horizontal.y + step.y };
    position = validPosition(y, map) ? y : horizontal;
  }
  return position;
}
export function camera(position: Vec, map: WorldMap): Vec {
  return {
    x: Math.max(0, Math.min(map.width * 32 - 960, position.x - 480)),
    y: Math.max(0, Math.min(map.height * 32 - 540, position.y - 270)),
  };
}
