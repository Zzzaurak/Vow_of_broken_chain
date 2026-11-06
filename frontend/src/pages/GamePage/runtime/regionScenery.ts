import type { GameState } from '../objects/game';
import { mapById } from '../objects/content';
import { exploration } from '../functions/exploration';
export function drawRegionScenery(ctx: CanvasRenderingContext2D, state: GameState) {
  const map = mapById(state.snapshot.mapId),
    flags = exploration(state.snapshot).flags;
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  if (map.id === 'rain') {
    rect(96, 48, 128, 128, '#235767');
    for (let i = 0; i < 8; i++) rect(100 + i * 15, 48, 7, 128, '#88b9c6');
    rect(64, 160, 224, 26, '#408291');
    rect(960, 256, 88, 24, '#63553f');
    rect(1000, 208, 24, 112, '#4b5141');
  }
  if (map.id === 'market') {
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e9d8ab';
    ctx.fillText('包子铺', 320, 224);
    ctx.fillText('四海茶摊', 640, 592);
    for (let i = 0; i < 5; i++) rect(1040 + i * 25, 96, 19, 64, i % 2 ? '#4e6681' : '#a8b7b3');
    rect(1024, 92, 160, 4, '#b5a17e');
    rect(624, 208, 28, 70, '#665645');
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 13; x++) {
        if (((x - 6) / 6) ** 2 + ((y - 3) / 3) ** 2 > 1.1) continue;
        rect(
          584 + x * 8,
          152 + y * 8,
          9,
          9,
          ['#365447', '#486951', '#5f7d58'][(x * 7 + y * 3) % 3],
        );
      }
  }
  if (map.id === 'mine') {
    for (const [x, y, w, h] of map.obstacles) {
      rect(x, y, w, h, '#535663');
      for (let i = 0; i < w; i += 40) rect(x + i + 8, y - 12, 12, 36, '#8e93b0');
    }
    rect(264, 432, 80, 8, '#765f4c');
    rect(276, 416, 12, 40, '#a5855e');
  }
  if (map.id === 'dock') {
    rect(864, 32, 160, 896, flags.includes('sluice') ? '#555b55' : '#254d62');
    for (let y = 64; y < 896; y += 48)
      rect(880, y, 128, 4, flags.includes('sluice') ? '#7d8070' : '#80a6ac');
    if (flags.includes('sluice'))
      for (let x = 864; x < 1024; x += 24) rect(x, 456, 18, 48, '#b49361');
    rect(128, 96, 256, 96, '#61533e');
    rect(128, 180, 256, 8, '#bd9c68');
  }
  if (map.id === 'rift') {
    for (const [x, y, w, h] of map.obstacles) {
      rect(x, y, w, h, '#51515e');
      rect(x, y + h - 12, w, 12, '#2c3345');
    }
    rect(192, 48, 64, 112, '#606471');
    rect(176, 48, 96, 16, '#9a9290');
    ctx.fillStyle = '#c5b891';
    ctx.font = '12px serif';
    ctx.fillText('封印哨塔', 224, 184);
  }
  if (map.id === 'riverbed') {
    for (let x = 64; x < map.width * 32 - 64; x += 80) {
      rect(x, 96 + Math.round(Math.sin(x) * 20), 48, 12, '#93937d');
      rect(x, 784, 56, 10, '#777c6b');
    }
    rect(976, 256, 160, 24, '#615b49');
  }
  if (map.id === 'icehall') {
    rect(960, 96, 224, 304, '#6f98a9');
    rect(960, 376, 224, 24, '#4e738c');
    rect(304, 440, 96, 80, '#a3c4cb');
    for (const [x, y, w, h] of map.obstacles) {
      rect(x, y, w, h, '#7fa8b9');
      rect(x, y, w, 6, '#bfd8dd');
    }
  }
  if (map.id === 'library') {
    for (const [x, y, w, h] of map.obstacles) {
      rect(x, y, w, h, '#66513e');
      for (let i = 0; i < w; i += 18)
        rect(x + i + 4, y + 8, 10, h - 16, i % 36 ? '#8b8e70' : '#8d6466');
    }
    rect(592, 272, 96, 28, '#8c7453');
    rect(614, 262, 48, 18, '#d9cca5');
  }
  if (map.id === 'relics') {
    rect(976, 288, 128, 24, '#9e947c');
    rect(1000, 264, 80, 24, '#c5b38c');
  }
}
