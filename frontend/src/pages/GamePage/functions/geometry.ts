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
  const x = { x: p.x + delta.x, y: p.y };
  const a = validPosition(x, map) ? x : p;
  const y = { x: a.x, y: p.y + delta.y };
  return validPosition(y, map) ? y : a;
}
export function camera(position: Vec, map: WorldMap): Vec {
  return {
    x: Math.max(0, Math.min(map.width * 32 - 960, position.x - 480)),
    y: Math.max(0, Math.min(map.height * 32 - 540, position.y - 270)),
  };
}
