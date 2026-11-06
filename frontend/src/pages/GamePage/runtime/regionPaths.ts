import { maps, regionById } from '../objects/content';
import { validPosition } from '../functions/geometry';
import { exitPosition } from './explorationDraw';
// Build once from authored geometry. Paths follow walkable tiles rather than painting
// a horizontal road through every room and through solid scenery.
export const regionPaths = new Map(
  maps.map((map) => {
    const region = regionById(map.id),
      start = [Math.floor(map.spawn[0] / 32), Math.floor(map.spawn[1] / 32)];
    const key = (x: number, y: number) => `${x},${y}`;
    const previous = new Map<string, string | null>([[key(start[0], start[1]), null]]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          k = key(nx, ny);
        if (!previous.has(k) && validPosition({ x: nx * 32 + 16, y: ny * 32 + 16 }, map)) {
          previous.set(k, key(x, y));
          queue.push([nx, ny]);
        }
      }
    }
    const tiles = new Set<string>();
    const goals = [
      ...region.exits.map((e) => exitPosition(map.id, e)),
      ...region.points
        .filter((p) => !['chest', 'breakable'].includes(p.kind))
        .map((p) => ({ x: p.position[0], y: p.position[1] })),
    ];
    for (const goal of goals) {
      const gx = Math.max(1, Math.min(map.width - 2, Math.floor(goal.x / 32))),
        gy = Math.max(1, Math.min(map.height - 2, Math.floor(goal.y / 32)));
      let current: string | null | undefined = key(gx, gy);
      while (current && previous.has(current)) {
        tiles.add(current);
        current = previous.get(current);
      }
    }
    return [map.id, [...tiles].map((k) => k.split(',').map(Number))] as const;
  }),
);
