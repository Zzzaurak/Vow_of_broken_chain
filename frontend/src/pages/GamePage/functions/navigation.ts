import type { Vec } from '../objects/game';
import type { WorldMap } from '../objects/content';
import { distance, normalize, subtract, validPosition } from './geometry';

/** Segment against the same expanded solid rectangles used by foot collision. */
export function clearPath(from: Vec, to: Vec, map: WorldMap): boolean {
  if (!validPosition(from, map) || !validPosition(to, map)) return false;
  return !map.obstacles.some(([x, y, w, h]) => {
    let enter = 0;
    let leave = 1;
    for (const [start, delta, low, high] of [
      [from.x, to.x - from.x, x - 12, x + w + 12],
      [from.y, to.y - from.y, y - 8, y + h + 8],
    ]) {
      if (delta === 0) {
        if (start < low || start > high) return false;
      } else {
        const a = (low - start) / delta;
        const b = (high - start) / delta;
        enter = Math.max(enter, Math.min(a, b));
        leave = Math.min(leave, Math.max(a, b));
        if (enter > leave) return false;
      }
    }
    return enter <= leave;
  });
}

/** Small rooms use a visibility graph through obstacle corners, with no global cache/state. */
export function pursuitDirection(from: Vec, target: Vec, map: WorldMap): Vec {
  if (distance(from, target) < 1) return { x: 0, y: 0 };
  if (clearPath(from, target, map)) return normalize(subtract(target, from));
  const corners = map.obstacles
    .flatMap(([x, y, w, h]) => [
      { x: x - 16, y: y - 12 },
      { x: x + w + 16, y: y - 12 },
      { x: x - 16, y: y + h + 12 },
      { x: x + w + 16, y: y + h + 12 },
    ])
    .filter((point) => validPosition(point, map));
  const nodes = [from, target, ...corners];
  const costs = nodes.map((_, i) => (i === 0 ? 0 : Infinity));
  const previous = nodes.map(() => -1);
  const visited = new Set<number>();
  while (visited.size < nodes.length) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (
        !visited.has(i) &&
        Number.isFinite(costs[i]) &&
        (current < 0 || costs[i] < costs[current])
      )
        current = i;
    }
    if (current < 0) return { x: 0, y: 0 };
    if (current === 1) {
      let waypoint = 1;
      while (previous[waypoint] !== 0) waypoint = previous[waypoint];
      return normalize(subtract(nodes[waypoint], from));
    }
    visited.add(current);
    for (let i = 0; i < nodes.length; i++) {
      if (visited.has(i)) continue;
      const cost = costs[current] + distance(nodes[current], nodes[i]);
      if (cost < costs[i] && clearPath(nodes[current], nodes[i], map)) {
        costs[i] = cost;
        previous[i] = current;
      }
    }
  }
  return { x: 0, y: 0 };
}
