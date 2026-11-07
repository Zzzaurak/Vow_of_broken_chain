import { drawProp, drawDecor, drawNorthern } from './props';
import { drawCampfire } from './villager';
import { regionById } from '../objects/content';
import { drawWildlife } from './wildlife';
import { drawRegionScenery } from './regionScenery';
import { regionPaths } from './regionPaths';
import { drawExploration, drawRest } from './explorationDraw';
import {
  attackShape,
  coneReach,
  coneHalfAngle,
  hazardWarningSeconds,
} from '../functions/enemyAttack';
import { drawScenery } from './scenery';
import enemyAtlas from '../../../../../material/Enemies/manifest.json';
import type { GameState, Vec } from '../objects/game';
import { mapById, balance, enemyBehavior } from '../objects/content';
import { camera, facing } from '../functions/geometry';
import { characters, animations, type Images } from './assets';
const palettes: Record<string, string[]> = {
  temple: ['#38464a', '#415055', '#71817d', '#c4b575'],
  town: ['#334b46', '#3b544c', '#78866b', '#c4a978'],
  forest: ['#213d36', '#29463c', '#496a50', '#c0c68c'],
  coast: ['#385c63', '#43686c', '#6b8a82', '#d4c5a0'],
  snow: ['#566e7b', '#617e89', '#9bb8bd', '#d2dcd7'],
};
function circle(ctx: CanvasRenderingContext2D, p: Vec, r: number, color: string) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
function drawActor(
  ctx: CanvasRenderingContext2D,
  images: Images,
  id: string,
  p: Vec,
  direction: string,
  action: string,
  age: number,
  height = 80,
) {
  const character = characters.find((c) => c.id === id);
  if (!character) return;
  const animated = animations.find((a) => a.id === `${id}-${action}`);
  if (animated) {
    const clips = animated.clips as Partial<
      Record<string, { frames: number[]; durationsMs: number[]; loop: boolean }>
    >;
    const clip = clips[direction] ?? clips.cast;
    if (clip) {
      const total = clip.durationsMs.reduce((a, b) => a + b, 0);
      let elapsed = clip.loop ? (age * 1000) % total : Math.min(total - 1, age * 1000);
      let i = 0;
      while (i < clip.frames.length - 1 && elapsed >= clip.durationsMs[i]) {
        elapsed -= clip.durationsMs[i];
        i++;
      }
      const frame = animated.frames[clip.frames[i]] as {
        rect: number[];
        visibleBounds: number[];
        suggestedAnchor: number[];
      };
      const image = images.get(`/assets/characters/${animated.path}`);
      if (image) {
        const [x, y, w, h] = frame.rect,
          scale = height / frame.visibleBounds[3];
        ctx.drawImage(
          image,
          x,
          y,
          w,
          h,
          p.x - frame.suggestedAnchor[0] * scale,
          p.y - frame.suggestedAnchor[1] * scale,
          w * scale,
          h * scale,
        );
        return;
      }
    }
  }
  const frame = character.frames.find((f) => f.direction === direction) ?? character.frames[0],
    image = images.get(`/assets/characters/${character.sprite}`);
  if (image) {
    const [x, y, w, h] = frame.rect,
      scale = height / frame.visibleBounds[3];
    ctx.drawImage(
      image,
      x,
      y,
      w,
      h,
      p.x - frame.suggestedFeetAnchor[0] * scale,
      p.y - frame.suggestedFeetAnchor[1] * scale,
      w * scale,
      h * scale,
    );
  }
}
function effect(
  ctx: CanvasRenderingContext2D,
  images: Images,
  id: string,
  p: Vec,
  age: number,
  size: number,
  hold = false,
  duration = 0,
  clip?: 'projectile' | 'impact',
) {
  const asset = animations.find((a) => a.id === id);
  if (!asset) return;
  const image = images.get(`/assets/characters/${asset.path}`);
  if (!image) return;
  const index =
    clip === 'impact'
      ? 4 + Math.min(3, Math.floor(age / 0.09))
      : clip === 'projectile'
        ? Math.floor(age / 0.09) % 4
        : hold
          ? age > duration - 0.14
            ? 3
            : Math.min(2, Math.floor(age / 0.12))
          : Math.min(3, Math.floor(age / 0.14));
  const frame = asset.frames[index];
  const [x, y, w, h] = frame.rect;
  // Starfall rises above its ground anchor; centering the full tile moves the
  // landing ring below the actual damage position.
  const anchor = id === 'gpt-starfall-fx' ? frame.suggestedAnchor : [w / 2, h / 2];
  ctx.drawImage(
    image,
    x,
    y,
    w,
    h,
    p.x - (anchor[0] / w) * size,
    p.y - (anchor[1] / h) * size,
    size,
    size,
  );
}
function drawCinematic(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  images: Images,
  reduceFlash: boolean,
) {
  if (state.mode.kind !== 'cinematic') return;
  const { scene, elapsed: t } = state.mode;
  ctx.imageSmoothingEnabled = false;
  const snow = scene === 'trialFall' || scene === 'healing';
  ctx.fillStyle = scene === 'voyage' ? '#183d50' : snow ? '#63808a' : '#24353f';
  ctx.fillRect(0, 0, 960, 540);
  const terrain = images.get('/assets/world/terrain-atlas.png');
  const index = scene === 'voyage' ? 14 : snow ? 3 : 4;
  if (terrain) {
    const sx = Math.round(((index % 4) * terrain.width) / 4),
      sy = Math.round((Math.floor(index / 4) * terrain.height) / 4);
    const sw = Math.round((((index % 4) + 1) * terrain.width) / 4) - sx,
      sh = Math.round(((Math.floor(index / 4) + 1) * terrain.height) / 4) - sy;
    for (let y = 64; y < 448; y += 64)
      for (let x = 0; x < 960; x += 64) ctx.drawImage(terrain, sx, sy, sw, sh, x, y, 64, 64);
  }
  const actor = (id: string, x: number, y: number, action = 'idle', height = 100) =>
    drawActor(ctx, images, id, { x, y }, 'right', action, t, height);
  const particles = (color: string, falling: boolean) => {
    ctx.fillStyle = color;
    for (let i = 0; i < 28; i++) {
      const x = (i * 137 + t * (falling ? 12 : 28)) % 960,
        y = 80 + ((i * 71 + t * (falling ? 70 : -18) + 800) % 320);
      ctx.fillRect(Math.floor(x), Math.floor(y), falling ? 8 : 4, falling ? 12 : 4);
    }
  };
  if (scene === 'separation') {
    actor('deepseek', 390 - Math.min(t, 2) * 42, 330, t < 2 ? 'walk' : 'idle');
    actor('claude', 570 + Math.min(t, 4) * 28, 330);
    ctx.fillStyle = '#d8bc7977';
    ctx.fillRect(478, 90, 12, 320);
    ctx.fillStyle = '#f1d794';
    for (let y = 100; y < 410; y += 32) ctx.fillRect(472, y, 24, 4);
    particles('#d8c37a', false);
  } else if (scene === 'harborChase') {
    // A self-contained stage: camera scroll is visual only and cannot move the save point.
    const run = Math.min(t, 4.5),
      scroll = run * 95;
    ctx.fillStyle = '#244e5a';
    ctx.fillRect(0, 64, 960, 384);
    ctx.fillStyle = '#8e7854';
    ctx.fillRect(0, 200, 960, 200);
    for (let i = -1; i < 25; i++) {
      const x = i * 64 - (scroll % 64);
      ctx.fillStyle = '#5b5142';
      ctx.fillRect(x, 200, 3, 200);
      ctx.fillStyle = '#ad9565';
      ctx.fillRect(x + 8, 211, 36, 2);
      ctx.fillRect(x + 20, 382, 30, 2);
    }
    for (let i = 0; i < 6; i++) {
      const x = i * 225 - scroll + 90;
      ctx.fillStyle = '#443d32';
      ctx.fillRect(x, 180, 18, 45);
      ctx.fillRect(x + 90, 380, 18, 45);
      ctx.strokeStyle = '#baab7b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 9, 190);
      ctx.quadraticCurveTo(x + 120, 223, x + 234, 190);
      ctx.stroke();
      ctx.fillStyle = '#695139';
      ctx.fillRect(x + 55, 225, 48, 42);
      ctx.strokeStyle = '#b29160';
      ctx.strokeRect(x + 59, 229, 40, 34);
    }
    const settle = Math.min(1, Math.max(0, (t - 4.5) / 1.5));
    const fishX = 260 + settle * 160;
    const foxX = 570 + settle * 45;
    const sway = Math.sin(run * 3) * 24 * (1 - settle);
    const landing = t < 1 ? -55 * (1 - t) : 0;
    const bob = Math.abs(Math.sin(t * 10)) * 5 * (1 - settle);
    actor('deepseek', fishX, 340 + sway - bob, t < 6 ? 'walk' : 'idle', 94);
    drawActor(
      ctx,
      images,
      'glm',
      { x: foxX, y: 330 - sway + landing - bob },
      t < 4.5 ? 'right' : 'left',
      'idle',
      t,
      96,
    );
    // The stolen rice bag stays visibly attached to GLM until the subsequent surrender scene.
    ctx.fillStyle = '#c2a16b';
    ctx.fillRect(foxX + 28, 285 - sway + landing - bob, 24, 28);
    ctx.strokeStyle = '#ead49a';
    ctx.lineWidth = 3;
    ctx.strokeRect(foxX + 34, 276 - sway + landing - bob, 12, 12);
    ctx.fillStyle = '#c4d9d33d';
    for (let i = 0; i < 8; i++)
      ctx.fillRect((i * 157 - t * 12 + 960) % 960, 105 + (i % 3) * 34, 120, 7);
  } else if (scene === 'voyage') {
    const x = 280 + Math.min(t, 7) * 45,
      y = 300 + Math.sin(t * 2) * 5;
    drawDecor(ctx, images, 3, x, y + 44, 220);
    actor('deepseek', x - 35, y + 8, 'idle', 74);
    actor('glm', x + 35, y + 8, 'idle', 74);
    ctx.fillStyle = '#a0c9ca77';
    for (let i = 0; i < 8; i++) ctx.fillRect((i * 137 - t * 35 + 960) % 960, 130 + i * 33, 48, 3);
    ctx.fillStyle = '#637d66';
    ctx.fillRect(910 - Math.max(0, t - 4) * 28, 90, 180, 330);
  } else if (scene === 'trialFall') {
    actor('gpt', 610, 320, 'idle', 135);
    ctx.save();
    ctx.translate(360, 332);
    ctx.rotate((-Math.min(1, t) * Math.PI) / 2);
    drawActor(ctx, images, 'deepseek', { x: 0, y: 0 }, 'down', 'idle', 0, 100);
    ctx.restore();
    particles('#c6e2e0', true);
    ctx.fillStyle = '#e1ceba';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('试炼通过 · 剧情重伤', 480, 398);
    ctx.fillStyle = '#c89289';
    ctx.fillText('HP 0 / 100', 480, 421);
  } else if (scene === 'healing') {
    actor('deepseek', 390, 330, t > 4 ? 'walk' : 'idle');
    actor('gpt', 560 - Math.min(t, 2) * 35, 330, 'starfall-cast', 125);
    circle(ctx, { x: 405, y: 280 }, 75, '#d6dba02b');
    particles('#ece1a4', false);
    if (t > 3 && t < 5) {
      ctx.fillStyle = `rgba(8,20,34,${Math.sin(((t - 3) / 2) * Math.PI) * 0.8})`;
      ctx.fillRect(0, 64, 960, 384);
    }
  } else if (scene === 'breach') {
    actor('deepseek', 300, 365);
    actor('glm', 385, 375);
    actor('gpt', 510, 360, 'starfall-cast', 135);
    ctx.strokeStyle = '#e2c67d';
    ctx.lineWidth = 5;
    for (let i = 0; i < 12; i++) {
      const angle = Math.PI + (i * Math.PI) / 12,
        drift = Math.max(0, t - 2) * 20;
      ctx.beginPath();
      ctx.arc(
        670 + Math.cos(angle) * drift,
        320 + Math.sin(angle) * drift,
        160,
        angle,
        angle + Math.PI / 14,
      );
      ctx.stroke();
    }
    ctx.fillStyle = '#c4e1e0bb';
    ctx.fillRect(650, 80, reduceFlash ? 8 : 16, Math.min(250, t * 130));
    if (t > 2) particles('#d6c28c', true);
  } else if (scene === 'reunion') {
    actor('deepseek', 300 + Math.min(t, 3) * 43, 335, t < 3 ? 'walk' : 'idle');
    actor('claude', 530 - Math.min(t, 3) * 22, 335);
    ctx.strokeStyle = `rgba(220,195,117,${Math.max(0, 1 - t / 3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(530, 290, 100, 0, Math.PI * 2);
    ctx.stroke();
    particles('#d6b963', false);
  } else if (scene === 'escape') {
    const flight = Math.max(0, t - 3),
      x = 290 + flight * 75,
      y = 340 - flight * 24;
    actor('gpt', x + 90, y, 'idle', 155);
    actor('deepseek', x + 45, y - 10, 'idle', 75);
    actor('claude', x + 95, y - 15, 'idle', 75);
    actor('glm', x + 145, y - 10, 'idle', 75);
    particles('#75878a', true);
    ctx.fillStyle = '#adc6c222';
    ctx.fillRect(720, 64, 240, 384);
    if (t > 6) {
      ctx.fillStyle = `rgba(190,211,203,${Math.min(0.6, (t - 6) * 0.3)})`;
      ctx.fillRect(0, 64, 960, 384);
    }
  }
}
export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  images: Images,
  preferences = { shake: true, reduceFlash: false },
): void {
  if (state.mode.kind === 'paused' && state.mode.previous.kind === 'cinematic') {
    drawCinematic(ctx, { ...state, mode: state.mode.previous }, images, preferences.reduceFlash);
    return;
  }
  if (state.mode.kind === 'cinematic') {
    ctx.save();
    if (state.mode.scene === 'escape' && preferences.shake) {
      const t = state.mode.elapsed;
      ctx.translate(Math.sin(t * 43) * 4, Math.cos(t * 37) * 3);
    }
    drawCinematic(ctx, state, images, preferences.reduceFlash);
    if (state.mode.scene === 'escape' && !preferences.reduceFlash) {
      ctx.fillStyle = `rgba(235,209,139,${Math.max(0, Math.sin(state.mode.elapsed * 4)) * 0.12})`;
      ctx.fillRect(0, 0, 960, 540);
    }
    ctx.restore();
    return;
  }
  const map = mapById(state.snapshot.mapId),
    view = camera(state.snapshot.position, map),
    palette = palettes[map.theme] ?? palettes.temple;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, 960, 540);
  ctx.save();
  const shaking =
    preferences.shake && state.invulnerable > 0.25 ? Math.sin(state.simulationTime * 95) * 3 : 0;
  ctx.translate(-Math.round(view.x) + shaking, -Math.round(view.y));
  const terrain = images.get('/assets/world/terrain-atlas.png');
  function tile(index: number, x: number, y: number, w: number, h: number) {
    if (!terrain) return;
    const left = Math.round(((index % 4) * terrain.width) / 4),
      top = Math.round((Math.floor(index / 4) * terrain.height) / 4),
      right = Math.round((((index % 4) + 1) * terrain.width) / 4),
      bottom = Math.round(((Math.floor(index / 4) + 1) * terrain.height) / 4);
    ctx.drawImage(terrain, left, top, right - left, bottom - top, x, y, w, h);
  }
  const floor =
    map.id === 'mine'
      ? 4
      : map.id === 'riverbed' || map.id === 'rift'
        ? 2
        : map.theme === 'forest'
          ? 0
          : map.theme === 'town'
            ? 1
            : map.theme === 'coast'
              ? 2
              : map.theme === 'snow'
                ? 3
                : 4;
  for (let y = 0; y < map.height; y += 2)
    for (let x = 0; x < map.width; x += 2) {
      tile(floor, x * 32, y * 32, 64, 64);
    }
  for (const [x, y] of regionPaths.get(map.id) ?? []) {
    tile(
      map.theme === 'forest'
        ? 5
        : map.theme === 'coast' || map.id === 'harbor'
          ? 6
          : map.theme === 'snow'
            ? 7
            : floor,
      x * 32,
      y * 32,
      32,
      32,
    );
  }
  for (const [x, y, w, h] of map.obstacles) {
    if (map.id === 'snowline') {
      drawNorthern(ctx, images, 0, x + w / 2, y + h, w);
      continue;
    }
    if (map.id === 'dock' && x < 544 && y <= 224) {
      tile(6, x, y, w, h);
      tile(10, x, y, w, h);
      continue;
    }
    if (map.id === 'icehall' && w === 32) {
      tile(4, x, y, w, h);
      continue;
    }
    if (map.id === 'library') {
      drawProp(ctx, images, 8, x + w / 2, y + h, w);
      continue;
    }

    tile(
      map.theme === 'forest'
        ? map.id === 'crystal' || map.id === 'mine'
          ? 9
          : 8
        : map.theme === 'town'
          ? 13
          : map.theme === 'snow'
            ? map.id === 'snowline'
              ? 8
              : 11
            : map.theme === 'temple'
              ? 12
              : 10,
      x,
      y,
      w,
      h,
    );
  }
  drawScenery(ctx, map, images);
  drawRegionScenery(ctx, state, images);
  if (!regionById(map.id).points.some((p) => p.kind === 'camp'))
    drawCampfire(ctx, images, { x: map.spawn[0], y: map.spawn[1] });
  drawExploration(ctx, state, images, (id, position) =>
    drawActor(ctx, images, id, position, 'down', 'idle', 0),
  );
  for (const h of state.hazards) {
    circle(
      ctx,
      h.position,
      h.radius,
      h.timer < hazardWarningSeconds
        ? '#e7a24b38'
        : h.kind === 'petal'
          ? '#e5c76266'
          : preferences.reduceFlash
            ? '#9d575755'
            : '#dc554d88',
    );
    ctx.strokeStyle = h.kind === 'petal' ? '#e9cf7e' : '#f7a279';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.position.x, h.position.y, h.radius, 0, Math.PI * 2);
    ctx.stroke();
    if (h.kind === 'page') {
      const progress = Math.min(1, h.timer / hazardWarningSeconds);
      ctx.save();
      ctx.translate(h.position.x, h.position.y - 48 * (1 - progress));
      ctx.rotate(progress * Math.PI);
      ctx.fillStyle = '#f7e6bb';
      ctx.fillRect(-8, -11, 16, 22);
      ctx.fillStyle = '#704877';
      for (const row of [-6, -1, 4]) ctx.fillRect(-5, row, 10, 2);
      ctx.restore();
    }
    if (h.kind === 'petal') {
      ctx.fillStyle = h.timer < hazardWarningSeconds ? '#f0ce77' : '#ffe791';
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5;
        ctx.beginPath();
        ctx.ellipse(
          h.position.x + Math.cos(angle) * h.radius * 0.8,
          h.position.y + Math.sin(angle) * h.radius * 0.8,
          8,
          3,
          angle,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy.phase === 'windup') {
      const shape = attackShape(enemy, map.id);
      ctx.save();
      ctx.translate(enemy.position.x, enemy.position.y);
      ctx.rotate(Math.atan2(enemy.aim.y, enemy.aim.x));
      ctx.beginPath();
      if (shape === 'cone') {
        const frost = enemy.kind === 'gpt';
        ctx.fillStyle = frost ? '#8bdbf14a' : '#efad5b30';
        ctx.strokeStyle = frost ? '#bdeafa' : '#eebd79';
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, coneReach(enemy), -coneHalfAngle, coneHalfAngle);
        ctx.closePath();
        ctx.fill();
      } else if (shape === 'projectile') {
        ctx.strokeStyle = '#ffd397';
        ctx.moveTo(22, 0);
        ctx.lineTo(95, 0);
      } else {
        // Ground targets are selected when the cast finishes. Only mark the caster until then.
        ctx.strokeStyle = enemy.kind === 'claude' ? '#f3d378' : '#d0bee6';
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
      }
      const highlight = ctx.strokeStyle;
      ctx.strokeStyle = '#253648';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = highlight;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
  const npc =
    state.snapshot.mapId === 'crystal' && state.snapshot.stage === 'cleared'
      ? 'gemini'
      : state.snapshot.mapId === 'alley'
        ? 'claude'
        : null;
  if (npc)
    drawActor(ctx, images, npc, { x: map.width * 16 + 72, y: map.height * 16 }, 'left', 'idle', 0);
  for (const enemy of [...state.enemies].sort((a, b) => a.position.y - b.position.y)) {
    if (enemy.hp <= 0) continue;
    const p = enemy.position;
    circle(ctx, { x: p.x, y: p.y - 3 }, 19, '#07131860');
    if (['glm', 'gpt', 'claude'].includes(enemy.kind)) {
      ctx.save();
      if (enemy.kind === 'glm') ctx.filter = 'brightness(0.18)';
      drawActor(
        ctx,
        images,
        enemy.kind,
        p,
        facing(enemy.aim),
        'idle',
        0,
        enemy.kind === 'gpt' ? 110 : 80,
      );
      ctx.restore();
    } else if (!drawWildlife(ctx, images, enemy, state.simulationTime)) {
      const frame = enemyAtlas.frames.find((f) => f.id === enemyBehavior(enemy.kind)),
        image = images.get('/assets/enemies/enemies-atlas.png');
      if (frame && image) {
        const [x, y, w, h] = frame.rect,
          scale = frame.worldHeight / frame.visibleBounds[3];
        const bob = enemy.phase === 'chase' ? Math.sin(state.simulationTime * 9 + enemy.id) * 2 : 0;
        ctx.drawImage(
          image,
          x,
          y,
          w,
          h,
          p.x - frame.anchor[0] * scale,
          p.y - frame.anchor[1] * scale + bob,
          w * scale,
          h * scale,
        );
      }
    }
    ctx.fillStyle = '#101b21';
    ctx.fillRect(p.x - 26, p.y - 82, 52, 5);
    ctx.fillStyle = enemy.shield > 0 ? '#8bd0df' : '#d88b7b';
    ctx.fillRect(
      p.x - 26,
      p.y - 82,
      52 *
        (enemy.shield > 0
          ? enemy.shield /
            (enemy.kind === 'gpt' ? balance.enemies.gpt.shield : balance.enemies.claude.shield)
          : enemy.hp / enemy.maxHp),
      5,
    );
    if (state.lockedEnemy === enemy.id) {
      ctx.strokeStyle = '#ead89c';
      ctx.strokeRect(p.x - 30, p.y - 70, 60, 75);
    }
  }
  const p = state.snapshot.position;
  circle(ctx, { x: p.x, y: p.y - 3 }, 20, '#07131870');
  ctx.globalAlpha =
    !preferences.reduceFlash &&
    state.invulnerable > 0 &&
    Math.floor(state.simulationTime * 20) % 2 === 0
      ? 0.5
      : 1;
  if (state.mode.kind === 'failed') {
    const progress = Math.min(1, state.mode.elapsed / 0.65);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((-Math.PI / 2) * progress);
    drawActor(ctx, images, 'deepseek', { x: 0, y: 0 }, 'down', 'idle', 0);
    ctx.restore();
  } else {
    drawActor(
      ctx,
      images,
      'deepseek',
      p,
      state.action ? facing(state.action.aim) : state.direction,
      state.action?.kind === 'melee'
        ? 'melee'
        : state.action?.kind === 'cast'
          ? 'cast'
          : state.moving
            ? 'walk'
            : 'idle',
      state.action?.age ?? state.walkTime,
    );
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#a9d9dc88';
    ctx.beginPath();
    ctx.moveTo(p.x + state.aim.x * 28, p.y + state.aim.y * 28);
    ctx.lineTo(p.x + state.aim.x * 42, p.y + state.aim.y * 42);
    ctx.stroke();
  }
  drawRest(ctx, state, images);
  for (const cast of state.casts) {
    const suffix =
      cast.partner === 'glm'
        ? 'forbidden-bind-cast'
        : cast.partner === 'gpt'
          ? 'starfall-cast'
          : 'sunflower-barrier-cast';
    drawActor(ctx, images, cast.partner, cast.position, 'down', suffix, cast.age);
  }
  for (const e of state.effects) {
    if (e.kind === 'melee') {
      circle(ctx, e.position, 35, '#a7dbe444');
      continue;
    }
    const id =
      e.kind === 'water'
        ? 'deepseek-water-fx'
        : e.kind === 'glm'
          ? 'glm-forbidden-bind-fx'
          : e.kind === 'gpt'
            ? 'gpt-starfall-fx'
            : 'claude-sunflower-barrier-fx';
    effect(
      ctx,
      images,
      id,
      e.kind === 'claude' ? p : e.position,
      e.age,
      e.kind === 'water' ? 110 : 210,
      e.kind === 'glm' || e.kind === 'claude',
      e.duration,
      e.kind === 'water' ? 'impact' : undefined,
    );
  }
  for (const projectile of state.projectiles) {
    if (projectile.enemy) circle(ctx, projectile.position, 9, '#f1cb79');
    else {
      ctx.save();
      ctx.translate(projectile.position.x, projectile.position.y);
      ctx.rotate(Math.atan2(projectile.direction.y, projectile.direction.x));
      effect(
        ctx,
        images,
        'deepseek-water-fx',
        { x: 0, y: 0 },
        state.simulationTime % 0.36,
        48,
        false,
        0,
        'projectile',
      );
      ctx.restore();
    }
  }
  ctx.restore();
}
