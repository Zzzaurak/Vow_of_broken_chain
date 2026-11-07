import type { GameState } from '../objects/game';
import type { Images } from './assets';
import { mapById } from '../objects/content';
import { exploration } from '../functions/exploration';
import { drawProp } from './props';
export function drawRegionScenery(ctx: CanvasRenderingContext2D, state: GameState, images: Images) {
  const map = mapById(state.snapshot.mapId),
    flags = exploration(state.snapshot).flags;
  const prop = (index: number, x: number, y: number, size: number) =>
    drawProp(ctx, images, index, x, y, size);
  if (map.id === 'rain') {
    prop(11, 176, 192, 192);
    prop(12, 1008, 304, 144);
  }
  if (map.id === 'market') prop(13, 1120, 176, 160);
  if (map.id === 'mine') prop(12, 304, 456, 96);
  if (map.id === 'dock') {
    const terrain = images.get('/assets/world/terrain-atlas.png');
    if (terrain) {
      const index = flags.includes('sluice') ? 2 : 14;
      const cell = terrain.width / 4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(864, 32, 160, 896);
      ctx.clip();
      for (let y = 32; y < 928; y += 64)
        for (let x = 864; x < 1024; x += 64)
          ctx.drawImage(
            terrain,
            (index % 4) * cell,
            Math.floor(index / 4) * cell,
            cell,
            cell,
            x,
            y,
            64,
            64,
          );
      ctx.restore();
    }
    if (flags.includes('sluice')) {
      const terrain = images.get('/assets/world/terrain-atlas.png');
      if (terrain) {
        const cell = terrain.width / 4;
        for (let x = 864; x < 1024; x += 32)
          ctx.drawImage(terrain, 2 * cell, cell, cell, cell, x, 456, 32, 32);
      }
    }
  }
  if (map.id === 'riverbed') prop(12, 1056, 288, 160);
  if (map.id === 'icehall') prop(14, 1072, 400, 224);

  if (map.id === 'relics') prop(10, 1040, 312, 128);
}
