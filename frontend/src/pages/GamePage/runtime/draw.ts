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
  } else if (scene === 'voyage') {
    const x = 280 + Math.min(t, 7) * 45,
      y = 300 + Math.sin(t * 2) * 5;
    ctx.fillStyle = '#513e33';
    ctx.fillRect(x - 80, y, 160, 32);
    ctx.fillRect(x - 60, y + 32, 120, 12);
    ctx.fillStyle = '#ba9663';
    ctx.fillRect(x - 72, y + 4, 144, 6);
    ctx.fillRect(x + 12, y - 128, 5, 128);
    ctx.fillStyle = '#d7caaa';
    ctx.beginPath();
    ctx.moveTo(x + 17, y - 124);
    ctx.lineTo(x + 80, y - 32);
    ctx.lineTo(x + 17, y - 32);
    ctx.fill();
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
    drawCinematic(ctx, state, images, preferences.reduceFlash);
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
