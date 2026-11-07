import type { WorldMap } from '../objects/content';
import type { Images } from './assets';
import { drawProp, drawDecor } from './props';
/** Floor decoration is walkable. Solid scenery is rendered from obstacle geometry. */
export function drawScenery(ctx: CanvasRenderingContext2D, map: WorldMap, images: Images) {
  const width = map.width * 32,
    height = map.height * 32;
  if (map.theme === 'temple') {
    for (let x = 112; x < width - 64; x += 224) {
      drawDecor(ctx, images, 1, x, 96, 64);
      drawDecor(ctx, images, 1, x, height - 48, 64);
    }
    if (map.id === 'garden') {
      for (let x = 144; x < width - 112; x += 96) {
        drawDecor(ctx, images, 0, x, 224, 72);
        drawDecor(ctx, images, 0, x, height - 192, 72);
      }
    } else if (map.id !== 'steps') {
      for (let x = 160; x < width - 96; x += 112)
        drawDecor(ctx, images, 5, x, height / 2 + 64, 144);
    }
  }
  if (map.theme === 'forest') {
    for (let i = 0; i < 20; i++) {
      const x = 48 + ((i * 137) % (width - 96)),
        y = 48 + ((i * 211) % (height - 96));
      if (Math.abs(y - height / 2) > 90) drawDecor(ctx, images, 6, x, y, 32);
    }
  }
  if (map.id === 'rift') drawDecor(ctx, images, 4, 224, 184, 128);
  if (map.id === 'alley') drawProp(ctx, images, 15, map.width * 16, map.height * 16 + 80, 144);
  if (map.id === 'throne' || map.id === 'lair') {
    ctx.strokeStyle = '#c6c4a455';
    ctx.lineWidth = 2;
    for (const radius of [144, 176]) {
      ctx.beginPath();
      ctx.arc(map.width * 0.6 * 32, map.height * 16, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
