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
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
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
    rect(x - 17, y - 3, 34, 8, '#07131866');
    if (p.kind === 'npc') {
      if (p.id === 'qwen') actor('qwen', { x, y });
      else drawVillager(ctx, images, p.id, { x, y });
    } else if (p.kind === 'chest') {
      rect(x - 19, y - 25, 38, 25, collected ? '#554a3d' : '#9d6035');
      rect(x - 19, y - 25, 38, 6, collected ? '#382f29' : '#d6ad60');
      rect(x - 3, y - 19, 6, 10, collected ? '#605e54' : '#f5d99a');
    } else if (p.kind === 'camp') {
      drawCampfire(ctx, images, { x, y });
    } else if (p.kind === 'breakable') {
      rect(x - 22, y - 30, 44, 29, p.id === 'ice-seal' ? '#88b8cb' : '#6b8d70');
      rect(x - 13, y - 43, 9, 40, '#b0c9c4');
      rect(x + 7, y - 37, 8, 34, '#9ea8b8');
    } else if (p.kind === 'bridge') {
      for (let i = 0; i < 4; i++) rect(x - 18, y - i * 7, 36, 4, done ? '#8eb4bb' : '#a3845e');
    } else if (p.kind === 'switch') {
      rect(x - 13, y - 25, 26, 26, '#665947');
      rect(x - 3, y - 42, 6, 28, done ? '#8ab3a1' : '#cfb66a');
      rect(x - 12, y - 42, 24, 6, '#c0b393');
    } else {
      rect(x - 3, y - 22, 6, 24, '#7f6347');
      rect(x - 24, y - 42, 48, 24, p.kind === 'book' ? '#766786' : '#9a7c51');
      rect(x - 17, y - 35, 34, 3, '#d8cba5');
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
    if (t >= 1.5 && t < 2)
      for (let i = -2; i <= 2; i++) {
        ctx.fillStyle = '#bcdee8';
        ctx.beginPath();
        ctx.moveTo(x + i * 12 - 5, y + 8);
        ctx.lineTo(x + i * 12, y - 28);
        ctx.lineTo(x + i * 12 + 5, y + 8);
        ctx.fill();
      }
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
export function drawRest(ctx: CanvasRenderingContext2D, state: GameState) {
  if ((state.restTime ?? 0) <= 0) return;
  const p = state.snapshot.position,
    bob = Math.sin(state.restTime! * 7) * 2;
  ctx.fillStyle = '#b2824d';
  ctx.fillRect(p.x + 10, p.y - 40 + bob, 23, 12);
  ctx.fillStyle = '#f5ead1';
  ctx.fillRect(p.x + 13, p.y - 45 + bob, 17, 7);
  ctx.fillStyle = '#344d43';
  ctx.fillRect(p.x + 18, p.y - 42 + bob, 6, 6);
}
