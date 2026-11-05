import { describe, expect, it } from 'vitest';
import { maps } from '../../objects/content';
import { add, distance, movePosition, validPosition } from '../geometry';
import { clearPath, pursuitDirection } from '../navigation';

const map = { ...maps[0], width: 30, height: 20, obstacles: [[400, 160, 80, 320]] };
describe('obstacle navigation', () => {
  it('reaches a player across a solid wall by walking around its end', () => {
    const start = { x: 320, y: 320 },
      target = { x: 560, y: 320 };
    let position = start;
    expect(clearPath(position, target, map)).toBe(false);
    for (let i = 0; i < 900 && distance(position, target) > 3; i++) {
      position = movePosition(
        position,
        add({ x: 0, y: 0 }, pursuitDirection(position, target, map), 2),
        map,
      );
      expect(validPosition(position, map)).toBe(true);
    }
    expect(distance(position, target)).toBeLessThan(3);
    expect(start).toEqual({ x: 320, y: 320 });
  });
  it('does not dash or get knocked through even a narrow obstacle', () => {
    const narrow = { ...map, obstacles: [[400, 160, 8, 320]] };
    const position = movePosition({ x: 350, y: 320 }, { x: 220, y: 0 }, narrow);
    expect(position.x).toBeLessThan(388);
    expect(validPosition(position, narrow)).toBe(true);
  });
  it('stops safely if a solid wall divides the entire room', () => {
    const divided = { ...map, obstacles: [[400, 0, 80, 640]] };
    expect(pursuitDirection({ x: 320, y: 320 }, { x: 560, y: 320 }, divided)).toEqual({
      x: 0,
      y: 0,
    });
    expect(clearPath({ x: 320, y: 320 }, { x: 350, y: 350 }, divided)).toBe(true);
  });
});
