import { drawProp, drawDecor, drawNorthern } from './props';
import type { Images } from './assets';
import { drawVillager, drawCampfire } from './villager';
import type { GameState, Vec } from '../objects/game';
import { regionById, mapById, type MapExit } from '../objects/content';
import { exploration, exitAvailable, hasConditions, nearestPoint } from '../functions/exploration';

export function exitPosition(mapId: string, e: MapExit): Vec {
  const map = mapById(mapId);
  return e.side === 'north'
    ? { x: e.at, y: 24 }
    : e.side === 'south'
      ? { x: e.at, y: map.height * 32 - 24 }
      : e.side === 'west'
        ? { x: 24, y: e.at }
        : { x: map.width * 32 - 24, y: e.at };
}
export function isExitTile(state: GameState, x: number, y: number) {
  const map = mapById(state.snapshot.mapId);
  return regionById(map.id).exits.some(
    (e) =>
      exitAvailable(state.snapshot, e) &&
      (e.side === 'north'
        ? y === 0 && Math.abs(x * 32 - e.at) <= 32
        : e.side === 'south'
          ? y === map.height - 1 && Math.abs(x * 32 - e.at) <= 32
          : e.side === 'west'
            ? x === 0 && Math.abs(y * 32 - e.at) <= 32
            : x === map.width - 1 && Math.abs(y * 32 - e.at) <= 32),
  );
}
export function drawExploration(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  images: Images,
  actor: (id: string, p: Vec) => void,
) {
  const s = state.snapshot,
    region = regionById(s.mapId),
    progress = exploration(s);
  for (const e of region.exits) {
    const p = exitPosition(s.mapId, e),
      angle = { east: 0, south: Math.PI / 2, west: Math.PI, north: -Math.PI / 2 }[e.side];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = exitAvailable(s, e) ? '#69cfff' : '#8d8270';
    for (let i = 0; i < 3; i++) {
      const x = -65 + i * 22;
      ctx.beginPath();
      ctx.moveTo(x - 7, -9);
      ctx.lineTo(x + 4, 0);
      ctx.lineTo(x - 7, 9);
      ctx.lineTo(x, 9);
      ctx.lineTo(x + 11, 0);
      ctx.lineTo(x, -9);
      ctx.fill();
    }
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = exitAvailable(s, e) ? '#c4e6ed' : '#b7a487';
    ctx.fillText(
      `${exitAvailable(s, e) ? '' : '未开放 · '}${mapById(e.to).name}`,
      p.x - Math.cos(angle) * 90,
      p.y - Math.sin(angle) * 90 - 24,
    );
  }
  for (const p of region.points) {
    const [x, y] = p.position,
      done = progress.flags.includes(p.id),
      collected = progress.collected.includes(p.id);
    if (p.kind === 'breakable' && done) continue;
    ctx.fillStyle = '#07131866';
    ctx.beginPath();
    ctx.ellipse(x, y, 17, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (p.kind === 'npc') {
      if (p.id === 'qwen') actor('qwen', { x, y });
      else drawVillager(ctx, images, p.id, { x, y });
    } else if (p.kind === 'camp') {
      drawCampfire(ctx, images, { x, y });
    } else if (p.id === 'light-totem') {
      drawNorthern(ctx, images, 2, x, y + 32, 64);
    } else {
      const index =
        p.kind === 'chest'
          ? collected
            ? 1
            : 0
          : p.kind === 'breakable'
            ? p.id === 'ice-seal'
              ? 7
              : 6
            : p.id.startsWith('barrel-')
              ? 3
              : p.kind === 'switch'
                ? 4
                : p.id.startsWith('ice-')
                  ? 14
                  : p.kind === 'bridge'
                    ? 5
                    : p.kind === 'book'
                      ? 9
                      : 2;
      if (p.kind === 'breakable' && p.blocker) {
        const [left, top, width, height] = p.blocker;
        const size = Math.min(width, height);
        for (let offset = 0; offset < width; offset += size)
          drawProp(ctx, images, index, left + offset + size / 2, top + height, size);
      } else drawProp(ctx, images, index, x, y, 64);
    }
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = hasConditions(s, p.requires) ? '#e7d9b1' : '#9d9d98';
    ctx.fillText(p.kind === 'chest' && collected ? '已开启' : p.name, x, y + 20);
  }
  for (const trap of region.traps) {
    const [x, y] = trap.position,
      t = state.simulationTime % trap.period;
    ctx.strokeStyle = t < 1.5 ? '#daaa73' : t < 2 ? '#c1eafa' : '#779ba788';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, trap.radius, 0, Math.PI * 2);
    ctx.stroke();
    if (t >= 1.5 && t < 2) drawDecor(ctx, images, 7, x, y + 12, trap.radius * 2);
  }
  for (const drop of state.drops) {
    ctx.fillStyle = '#a6e3a7';
    ctx.beginPath();
    ctx.arc(
      drop.position.x,
      drop.position.y,
      7 + Math.sin(state.simulationTime * 4),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const nearby = nearestPoint(s);
  if (nearby && state.mode.kind === 'explore') {
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f1dfaa';
    ctx.fillText('调查 · ' + nearby.name, s.position.x, s.position.y - 100);
  }
}
export function drawRest(ctx: CanvasRenderingContext2D, state: GameState, images: Images) {
  if ((state.restTime ?? 0) <= 0) return;
  drawDecor(ctx, images, 2, state.snapshot.position.x + 20, state.snapshot.position.y - 24, 32);
}
