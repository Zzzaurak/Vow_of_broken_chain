/** Real-input exploratory playthrough. Reads state for observation; never writes game state. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const difficulty = process.argv[2] ?? 'easy';
if (!['easy', 'hard'].includes(difficulty))
  throw new Error('Usage: node playthrough/run.mjs easy|hard');
await mkdir('../.local/playthrough', { recursive: true });
const browser = await chromium.launch();
const resume = process.argv.includes('--resume');
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  ...(resume ? { storageState: `../.local/playthrough/${difficulty}-storage.json` } : {}),
});
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
const events = [];
const keys = new Set();
async function movement(next) {
  for (const key of keys) await page.keyboard.up(key);
  keys.clear();
  for (const key of next)
    if (!keys.has(key)) {
      await page.keyboard.down(key);
      keys.add(key);
    }
}
let last = '',
  failures = 0,
  tick = 0,
  completed = false;
try {
  await page.goto('http://127.0.0.1:5179');
  if (difficulty === 'hard') await page.getByRole('button', { name: '困难 · 迎接挑战' }).click();
  await page.getByRole('button', { name: resume ? /继续旅途/ : /开启新的冒险/ }).click();
  await page.locator('canvas').waitFor();
  for (; tick < 6000; tick++) {
    const observation = await page.evaluate(async () => {
      const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
      const { mapById, balance } = await import('/src/pages/GamePage/objects/content.ts');
      const { movePosition, distance, normalize, subtract, camera } =
        await import('/src/pages/GamePage/functions/geometry.ts');
      const { pursuitDirection } = await import('/src/pages/GamePage/functions/navigation.ts');
      const game = getGameSnap();
      if (!game) return null;
      const map = mapById(game.snapshot.mapId),
        p = game.snapshot.position;
      let direction = { x: 0, y: 0 },
        target = null,
        action = null;
      if (game.mode.kind === 'explore') {
        // Recover at real rest points after combat, then walk towards the next encounter/exit.
        const destination =
          map.encounter && game.snapshot.stage !== 'cleared'
            ? { x: map.width * 32 * 0.32, y: map.height * 16 }
            : { x: map.exit[0], y: map.exit[1] };
        if (distance(p, destination) < 24) action = 'interact';
        else direction = pursuitDirection(p, destination, map);
        if (distance(p, { x: map.spawn[0], y: map.spawn[1] }) < 90 && game.snapshot.hp < 100)
          action = 'interact';
      }
      if (game.mode.kind === 'battle') {
        const alive = game.enemies.filter((e) => e.hp > 0);
        target = alive.sort((a, b) => distance(a.position, p) - distance(b.position, p))[0];
        if (target) {
          const choices = [
            ...(target.kind === 'pope' ? [] : [{ x: 0, y: 0 }]),
            ...Array.from({ length: 8 }, (_, i) => ({
              x: Math.cos((i * Math.PI) / 4),
              y: Math.sin((i * Math.PI) / 4),
            })),
          ];
          const chase = pursuitDirection(p, target.position, map);
          if (target.kind !== 'pope' || Math.hypot(chase.x, chase.y) > 0) choices.push(chase);
          const score = (dir) => {
            const future = movePosition(p, { x: dir.x * 65, y: dir.y * 65 }, map);
            // Keep the tail's reach rather than standing inside a projectile emitter.
            let cost = Math.abs(distance(future, target.position) - 58) * 0.3;
            if (distance(future, p) < 15 && (dir.x || dir.y)) cost += 40;
            for (const enemy of alive) {
              const spec = balance.enemies[enemy.kind],
                d = distance(future, enemy.position);
              const toward = normalize(subtract(future, enemy.position));
              const cone = toward.x * enemy.aim.x + toward.y * enemy.aim.y;
              if (
                enemy.phase === 'windup' &&
                enemy.timer < 0.65 &&
                ['guard', 'beast', 'hound', 'knight', 'gpt'].includes(enemy.kind) &&
                d < spec.range + 32 &&
                cone > 0.35
              )
                cost += 500 + (spec.range + 32 - d);
              if (enemy.kind === 'knight' && enemy.broken <= 0 && d < 100 && cone > 0.25)
                cost += 80;
            }
            for (const hazard of game.hazards) {
              const d = distance(future, hazard.position);
              if (
                d < hazard.radius + 28 &&
                hazard.timer > 0.25 &&
                !(hazard.kind === 'bind' && game.barrier > 0)
              )
                cost += 350 + (hazard.radius + 28 - d) * 2;
            }
            for (const projectile of game.projectiles.filter((q) => q.enemy)) {
              const projected = {
                x: projectile.position.x + projectile.direction.x * 50,
                y: projectile.position.y + projectile.direction.y * 50,
              };
              if (distance(future, projected) < 55) cost += 250;
            }
            return cost;
          };
          direction = choices.sort((a, b) => score(a) - score(b))[0];
          const d = distance(p, target.position);
          if (
            !game.action &&
            game.snapshot.cooldowns.water <= 0 &&
            game.snapshot.mp >= 20 &&
            d < 420
          )
            action = 'water';
          else if (d < 95) action = 'melee';
        }
      }
      return { game, map, direction, target, action, camera: camera(p, map) };
    });
    if (tick % 200 === 0)
      console.log(
        JSON.stringify({
          heartbeat: tick,
          map: observation?.map.id,
          hp: observation?.game.snapshot.hp,
          position: observation?.game.snapshot.position,
          enemies: observation?.game.enemies.map((e) => ({
            kind: e.kind,
            hp: e.hp,
            shield: e.shield,
            phase: e.phase,
            phaseTwo: e.phaseTwo,
          })),
        }),
      );
    if (!observation) throw new Error('Game disappeared during playthrough');
    const { game, map, direction, target, action, camera } = observation;
    const milestone = `${map.id}:${game.mode.kind}:${game.mode.scene ?? ''}:${game.wave}`;
    if (milestone !== last) {
      const entry = {
        tick,
        milestone,
        hp: game.snapshot.hp,
        mp: game.snapshot.mp,
        completed: game.snapshot.completed,
        unlocked: game.snapshot.unlocked,
      };
      console.log(JSON.stringify(entry));
      events.push(entry);
      last = milestone;
      if (
        game.mode.kind === 'battle' ||
        game.mode.kind === 'credits' ||
        game.mode.kind === 'failed'
      )
        await page.screenshot({
          path: `../.local/playthrough/${difficulty}-${map.id}-${game.mode.kind}.png`,
        });
    }
    if (game.mode.kind === 'credits') {
      completed = true;
      break;
    }
    if (game.mode.kind === 'failed') {
      await movement([]);
      await page.mouse.up();
      failures++;
      if (failures > 3)
        throw new Error(`Too many deaths at ${map.id}; investigate combat or input strategy`);
      await page.getByRole('button', { name: /重试检查点/ }).click();
      continue;
    }
    if (game.mode.kind === 'paused') {
      await page.keyboard.press('Escape');
      continue;
    }
    if (game.mode.kind === 'dialogue') {
      await movement([]);
      await page.mouse.up();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(35);
      continue;
    }
    const next = [];
    if (direction.x > 0.3) next.push('KeyD');
    if (direction.x < -0.3) next.push('KeyA');
    if (direction.y > 0.3) next.push('KeyS');
    if (direction.y < -0.3) next.push('KeyW');
    await movement(next);
    if (target) {
      const box = await page.locator('canvas').boundingBox();
      await page.mouse.move(
        box.x + ((target.position.x - camera.x) * box.width) / 960,
        box.y + ((target.position.y - camera.y) * box.height) / 540,
      );
    }
    await page.mouse.up();
    if (action === 'interact') await page.keyboard.press('KeyF');
    if (action === 'water') {
      await page.mouse.down({ button: 'right' });
      await page.mouse.up({ button: 'right' });
    }
    if (action === 'melee') await page.mouse.down();
    if (game.mode.kind === 'battle' && map.id !== 'garden') {
      for (let slot = 0; slot < game.snapshot.supports.length; slot++) {
        const partner = game.snapshot.supports[slot];
        if (
          game.snapshot.cooldowns[partner] <= 0 &&
          (partner !== 'claude' ||
            game.hazards.some((h) => h.kind === 'bind') ||
            game.snapshot.hp < 60)
        )
          await page.keyboard.press(slot === 0 ? 'KeyQ' : 'KeyE');
      }
    }
    await page.waitForTimeout(160);
  }
  if (!completed) throw new Error('Playthrough exhausted its action limit');
  await page.getByText('进度已保存', { exact: true }).first().waitFor();
  await page.reload();
  await page.getByRole('link', { name: '返回标题并继续旅途' }).click();
  await page.getByRole('button', { name: /继续旅途/ }).click();
  await page.getByRole('heading', { name: '自由，从此开始' }).waitFor();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`PASS ${difficulty}: credits reached through real input; ${failures} retries`);
} finally {
  await page.context().storageState({ path: `../.local/playthrough/${difficulty}-storage.json` });
  await writeFile(
    `../.local/playthrough/${difficulty}-result.json`,
    JSON.stringify({ difficulty, completed, tick, failures, events, errors }, null, 2),
  );
  await browser.close();
}
