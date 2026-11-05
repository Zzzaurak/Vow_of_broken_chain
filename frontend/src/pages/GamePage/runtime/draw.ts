import { drawScenery } from './scenery';
import enemyAtlas from '../../../../../material/Enemies/manifest.json';
import type { GameState, Vec } from '../objects/game';
import { mapById, balance } from '../objects/content';
import { camera } from '../functions/geometry';
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
  ctx.drawImage(image, x, y, w, h, p.x - size / 2, p.y - size / 2, size, size);
}
export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  images: Images,
  preferences = { shake: true, reduceFlash: false },
): void {
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
    map.theme === 'forest'
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
  // Path and decorative borders never introduce hidden collision bodies.
  for (let x = 1; x < map.width - 1; x += 2) {
    tile(
      map.theme === 'forest'
        ? 5
        : map.theme === 'coast' || map.id === 'harbor'
          ? 6
          : map.theme === 'snow'
            ? 7
            : map.id === 'steps'
              ? 15
              : floor,
      x * 32,
      map.height * 16 - 32,
      64,
      64,
    );
  }
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++)
      if (y === 0 || x === 0 || y === map.height - 1 || x === map.width - 1) {
        ctx.fillStyle = palette[2];
        ctx.fillRect(x * 32, y * 32, 31, 29);
        ctx.fillStyle = '#08192355';
        ctx.fillRect(x * 32, y * 32 + 23, 31, 6);
      }
  for (const [x, y, w, h] of map.obstacles) {
    ctx.fillStyle = '#06152180';
    ctx.fillRect(x + 6, y + 8, w, h);
    tile(
      map.theme === 'forest'
        ? map.id === 'crystal'
          ? 9
          : 8
        : map.theme === 'town'
          ? 13
          : map.theme === 'snow'
            ? 11
            : map.theme === 'temple'
              ? 12
              : 10,
      x,
      y,
      w,
      h,
    );
  }
  drawScenery(ctx, map);
  circle(ctx, { x: map.spawn[0], y: map.spawn[1] }, 30, '#e8d79928');
  ctx.fillStyle = '#e8d799';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('休整', map.spawn[0], map.spawn[1] + 46);
  const open = !map.encounter || state.snapshot.stage === 'cleared';
  ctx.fillStyle = open ? '#e6c97d' : '#617171';
  ctx.fillRect(map.exit[0] - 10, map.exit[1] - 42, 20, 84);
  ctx.fillText(open ? '前往下一站' : '道路封锁', map.exit[0], map.exit[1] + 60);
  if (state.mode.kind === 'explore' && map.encounter && state.snapshot.stage !== 'cleared') {
    ctx.fillStyle = '#edd8a877';
    ctx.fillRect(map.width * 32 * 0.28, map.height * 16 - 50, 3, 100);
    ctx.fillStyle = '#e8d799';
    ctx.fillText('进入场地 · 交互开始', map.width * 32 * 0.4, map.height * 16 - 70);
  }
  for (const h of state.hazards) {
    circle(
      ctx,
      h.position,
      h.radius,
      h.timer < 1.2
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
  }
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy.phase === 'windup') {
      const range = balance.enemies[enemy.kind].range;
      ctx.save();
      ctx.translate(enemy.position.x, enemy.position.y);
      ctx.rotate(Math.atan2(enemy.aim.y, enemy.aim.x));
      ctx.fillStyle = '#efad5b30';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, range, -Math.PI / 3, Math.PI / 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  const npc =
    state.snapshot.mapId === 'market'
      ? 'qwen'
      : state.snapshot.mapId === 'crystal' && state.snapshot.stage === 'cleared'
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
    if (['glm', 'gpt', 'claude'].includes(enemy.kind))
      drawActor(
        ctx,
        images,
        enemy.kind,
        p,
        enemy.aim.x > 0 ? 'right' : 'left',
        'idle',
        0,
        enemy.kind === 'gpt' ? 110 : 80,
      );
    else {
      const frame = enemyAtlas.frames.find((f) => f.id === enemy.kind),
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
  drawActor(
    ctx,
    images,
    'deepseek',
    p,
    state.direction,
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
