import type { WorldMap } from '../objects/content';

/** Decorative pixels share world coordinates; every solid body comes from map.obstacles. */
export function drawScenery(ctx: CanvasRenderingContext2D, map: WorldMap) {
  const width = map.width * 32,
    height = map.height * 32,
    mid = height / 2;
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const flower = (x: number, y: number) => {
    rect(x, y, 3, 15, '#52724a');
    rect(x - 5, y + 7, 5, 3, '#749259');
    rect(x - 7, y - 4, 17, 8, '#d6b75c');
    rect(x - 3, y - 8, 9, 16, '#e4c66c');
    rect(x - 2, y - 3, 7, 7, '#655037');
  };
  const lamp = (x: number, y: number) => {
    rect(x - 2, y - 32, 4, 32, '#bca778');
    rect(x - 8, y - 40, 16, 12, '#493e36');
    rect(x - 4, y - 37, 8, 7, '#f0d88f');
    rect(x - 7, y, 14, 4, '#5a6660');
  };
  if (map.id === 'steps') {
    // Broad terraces, with a clear route between the columns.
    for (let x = 192; x < width - 128; x += 96) {
      rect(x, mid - 112, 8, 224, '#a6aca080');
      rect(x + 8, mid - 112, 5, 224, '#1e303b88');
    }
    rect(width - 176, mid - 128, 8, 256, '#d0bc7b');
  }
  if (map.theme === 'temple') {
    if (map.id !== 'garden' && map.id !== 'steps') {
      rect(32, mid - 72, width - 64, 144, '#733e4999');
      rect(32, mid - 72, width - 64, 3, '#c7ac6a');
      rect(32, mid + 69, width - 64, 3, '#c7ac6a');
      for (let x = 128; x < width; x += 160) {
        rect(x, mid - 64, 16, 4, '#c7ac6a88');
        rect(x, mid + 60, 16, 4, '#c7ac6a88');
      }
    }
    if (map.id === 'throne') {
      // Floor seal and stained-glass reflection leave the arena fully walkable.
      ctx.strokeStyle = '#d0b96e66';
      ctx.lineWidth = 3;
      for (const radius of [144, 176]) {
        ctx.beginPath();
        ctx.arc(width * 0.65, mid, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let x = 352; x < width - 256; x += 96) {
        rect(x, 48, 32, 80, x % 192 ? '#7894ae66' : '#c7949966');
      }
    }
    for (let x = 112; x < width - 64; x += 224) {
      lamp(x, 64);
      lamp(x, height - 48);
    }
  }
  if (map.id === 'garden') {
    ctx.strokeStyle = '#d4c37e88';
    ctx.lineWidth = 3;
    ctx.strokeRect(96, 192, width - 192, height - 384);
    for (let x = 144; x < width - 112; x += 40) {
      flower(x, 200);
      flower(x + 12, height - 192);
    }
  }
  if (map.id === 'market' || map.id === 'harbor' || map.id === 'alley') {
    // Roof/awning colors follow each solid footprint rather than floating blockers.
    for (const [x, y, w, h] of map.obstacles) {
      rect(x - 4, y - 20, w + 8, 24, '#463e40');
      for (let stripe = 0; stripe < w; stripe += 24)
        rect(
          x + stripe,
          y - 16,
          Math.min(20, w - stripe),
          20,
          map.id === 'harbor' ? '#789b9a' : stripe % 48 ? '#bd8a64' : '#d1bc85',
        );
      rect(x + 8, y + h - 12, w - 16, 8, '#b09060');
    }
    if (map.id === 'harbor') {
      rect(32, height - 96, width - 64, 64, '#28505e');
      for (let x = 64; x < width - 32; x += 64) {
        rect(x, height - 64, 32, 3, '#83b6b477');
        rect(x, height - 104, 8, 16, '#b8a17a');
      }
      // Water is a decorative edge beyond the navigable quay, not an unmarked pit.
      rect(32, height - 98, width - 64, 4, '#b8a17a');
    }
  }
  if (map.id === 'coast') {
    for (let x = 32; x < width - 32; x += 32) {
      rect(x, 32, 32, 40 + (x % 96), '#244b5d');
      rect(x, 72 + (x % 96), 32, 4, '#abc8bb');
    }
    // Distant dome silhouette, entirely outside the central travel lane.
    ctx.strokeStyle = '#b3d5d866';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(width * 0.7, 160, 112, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  if (map.theme === 'forest') {
    for (let i = 0; i < 38; i++) {
      const x = 48 + ((i * 137) % (width - 96)),
        y = 48 + ((i * 211) % (height - 96));
      if (Math.abs(y - mid) < 90) continue;
      rect(x, y, 3, 9, '#86a16b88');
      rect(x + 5, y + 3, 3, 6, '#86a16b88');
      if (map.id === 'crystal') {
        rect(x + 10, y - 6, 4, 13, '#9cbec888');
        rect(x + 8, y - 3, 8, 5, '#d1e1c566');
      }
    }
  }
  if (map.id === 'lair') {
    ctx.strokeStyle = '#bad9de99';
    ctx.lineWidth = 3;
    for (const radius of [176, 208]) {
      ctx.beginPath();
      ctx.arc(width * 0.6, mid, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      rect(
        width * 0.6 + Math.cos(angle) * 208 - 4,
        mid + Math.sin(angle) * 208 - 4,
        8,
        8,
        '#d3e8e6',
      );
    }
  }
  if (map.id === 'alley') {
    // The two bowls belong to the epilogue scene, not to a gameplay inventory.
    const x = width / 2,
      y = mid + 48;
    rect(x - 60, y - 5, 120, 44, '#574d3c');
    rect(x - 64, y - 12, 128, 36, '#a58b5e');
    for (const dx of [-28, 28]) {
      rect(x + dx - 14, y - 4, 28, 10, '#d3e0cf');
      rect(x + dx - 10, y + 6, 20, 7, '#759f9e');
      rect(x + dx - 10, y - 9, 20, 5, '#eee8d2');
      rect(x + dx - 6, y - 13, 12, 5, '#f5efdf');
    }
    flower(x - 84, y + 8);
  }
}
