import type { Images } from './assets';
import type { Vec } from '../objects/game';

/** Equal-cell source crops, uniform scale and a bottom-center world anchor. */
export function drawAtlasSprite(
  ctx: CanvasRenderingContext2D,
  images: Images,
  path: string,
  columns: number,
  rows: number,
  index: number,
  position: Vec,
  size: number,
) {
  const image = images.get(path);
  if (!image) return;
  const left = Math.round(((index % columns) * image.width) / columns);
  const top = Math.round((Math.floor(index / columns) * image.height) / rows);
  const width = Math.round((((index % columns) + 1) * image.width) / columns) - left;
  const height = Math.round(((Math.floor(index / columns) + 1) * image.height) / rows) - top;
  const scale = size / Math.max(width, height);
  ctx.drawImage(
    image,
    left,
    top,
    width,
    height,
    position.x - (width * scale) / 2,
    position.y - height * scale,
    width * scale,
    height * scale,
  );
}
export function drawProp(
  ctx: CanvasRenderingContext2D,
  images: Images,
  index: number,
  x: number,
  y: number,
  size = 64,
) {
  drawAtlasSprite(ctx, images, '/assets/world/exploration-props.png', 4, 4, index, { x, y }, size);
}

export function drawDecor(
  ctx: CanvasRenderingContext2D,
  images: Images,
  index: number,
  x: number,
  y: number,
  size: number,
) {
  drawAtlasSprite(ctx, images, '/assets/world/decor-atlas.png', 4, 2, index, { x, y }, size);
}

export function drawNorthern(
  ctx: CanvasRenderingContext2D,
  images: Images,
  index: number,
  x: number,
  y: number,
  size: number,
) {
  drawAtlasSprite(ctx, images, '/assets/world/northern-atlas.png', 2, 2, index, { x, y }, size);
}
