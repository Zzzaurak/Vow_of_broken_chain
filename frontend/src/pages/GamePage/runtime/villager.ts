import type { Vec } from '../objects/game';
import type { Images } from './assets';

export function drawTravelSprite(
  ctx: CanvasRenderingContext2D,
  images: Images,
  index: number,
  p: Vec,
  height: number,
) {
  const image = images.get('/assets/world/travelers-camp.png');
  if (!image) return;
  const cell = 512;
  ctx.drawImage(
    image,
    (index % 3) * cell,
    Math.floor(index / 3) * cell,
    cell,
    cell,
    p.x - height / 2,
    p.y - height,
    height,
    height,
  );
}
export function drawVillager(ctx: CanvasRenderingContext2D, images: Images, id: string, p: Vec) {
  const index =
    id === 'bun-aunt' || id === 'fishmonger'
      ? 0
      : id === 'scholar'
        ? 3
        : id === 'dwarf' || id === 'woodcutter'
          ? 4
          : id.includes('sailor') || id === 'afu'
            ? 2
            : 1;
  drawTravelSprite(ctx, images, index, p, 88);
}
export function drawCampfire(ctx: CanvasRenderingContext2D, images: Images, p: Vec) {
  drawTravelSprite(ctx, images, 5, p, 78);
}
