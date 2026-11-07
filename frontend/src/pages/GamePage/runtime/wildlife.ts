import type { Enemy } from '../objects/game';
import type { Images } from './assets';
import { drawAtlasSprite } from './props';
const species = ['sprout', 'rabbit', 'spider', 'crab', 'golem', 'lizard', 'slime', 'officer'];
export function drawWildlife(
  ctx: CanvasRenderingContext2D,
  images: Images,
  enemy: Enemy,
  time: number,
): boolean {
  const index = species.indexOf(enemy.kind);
  if (index < 0) return false;
  const bob = enemy.phase === 'chase' ? Math.sin(time * 9 + enemy.id) * 2 : 0;
  drawAtlasSprite(
    ctx,
    images,
    '/assets/enemies/wildlife-atlas.png',
    4,
    2,
    index,
    { x: enemy.position.x, y: enemy.position.y + bob },
    enemy.kind === 'golem' ? 110 : 82,
  );
  return true;
}
