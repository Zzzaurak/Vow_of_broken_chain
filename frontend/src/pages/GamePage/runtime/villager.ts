import type { Vec } from '../objects/game';
// Small hand-authored pixel figures for incidental townsfolk; no missing portrait asset dependency.
const pixels = [
  '    hhhhhh    ',
  '   hhhhhhhh   ',
  '  hhhhhhhhhh  ',
  ' hhhhhhhhhhhh ',
  '   ssssssss   ',
  '   sEssEsss   ',
  '   ssssssss   ',
  '    ssmmss    ',
  '   cccccccc   ',
  '  cclcccclcc  ',
  ' ccclcccclccc ',
  'scccllll lcccs',
  'sssclcccclcsss',
  ' ssclcccclcss ',
  '   cccccccc   ',
  '   cccccccc   ',
  '   ddd  ddd   ',
  '   ddd  ddd   ',
  '   bbb  bbb   ',
  '  bbbb  bbbb  ',
];
export function drawVillager(ctx: CanvasRenderingContext2D, id: string, p: Vec) {
  const colors: Record<string, string> = {
    h: id === 'dwarf' ? '#745d46' : '#6b5c44',
    s: '#d8b18c',
    E: '#263c3c',
    m: '#8e5d4d',
    c:
      id === 'scholar'
        ? '#657a92'
        : id === 'bun-aunt'
          ? '#a77a6c'
          : id.includes('sailor')
            ? '#567b87'
            : '#7c8b68',
    l: '#c3b18a',
    d: '#535a53',
    b: '#3e413c',
  };
  const scale = 3;
  pixels.forEach((row, y) =>
    [...row].forEach((pixel, x) => {
      if (pixel !== ' ') {
        ctx.fillStyle = colors[pixel];
        ctx.fillRect(p.x + (x - 7) * scale, p.y + (y - 20) * scale, scale, scale);
      }
    }),
  );
  if (id === 'dwarf' || id === 'scholar' || id === 'storyteller') {
    ctx.fillStyle = id === 'dwarf' ? '#b18d63' : '#c2c1ac';
    ctx.fillRect(p.x - 9, p.y - 39, 18, 9);
    ctx.fillRect(p.x - 6, p.y - 30, 12, 6);
  }
}
