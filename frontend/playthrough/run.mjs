/** Real-input exploratory playthrough. Reads state for observation; never writes game state. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const difficulty = process.argv[2] ?? 'easy';
const keyboard = process.argv.includes('--keyboard');
const runName = `rpg-${difficulty}${keyboard ? '-keyboard' : ''}`;
if (!['easy', 'hard'].includes(difficulty))
  throw new Error('Usage: node playthrough/run.mjs easy|hard');
await mkdir('../.local/playthrough', { recursive: true });
const browser = await chromium.launch();
const resume = process.argv.includes('--resume');
const outputName = `${runName}${resume ? '-resume' : ''}`;
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  ...(resume ? { storageState: `../.local/playthrough/${runName}-storage.json` } : {}),
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
async function choose(label) {
  const button = page.getByRole('button', { name: label, exact: typeof label === 'string' });
  await button.waitFor();
  if (!keyboard) return button.click();
  for (let i = 0; i < 50; i++) {
    if (await button.evaluate((node) => node === document.activeElement && !node.disabled)) {
      await page.keyboard.press('Enter');
      return;
    }
    await page.keyboard.press('ArrowDown');
  }
  throw new Error(`Keyboard menu could not reach ${label}`);
}
async function releaseAttack() {
  if (keyboard) await page.keyboard.up('KeyJ');
  else await page.mouse.up();
}
let last = '',
  failures = 0,
  tick = 0,
  completed = false,
  resumedAfterReload = false;
try {
  await page.goto('http://127.0.0.1:5179');
  await page.getByRole('button', { name: /开启新的冒险/ }).waitFor();
  if (keyboard) {
    await choose('设置');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    if ((await page.getByLabel('控制方案').inputValue()) !== 'keyboard')
      throw new Error('Keyboard preset was not selected');
    await page.keyboard.press('Escape');
  }
  if (difficulty === 'hard') await choose('困难 · 迎接挑战');
  await choose(resume ? /继续旅途/ : /开启新的冒险/);
  await page.locator('canvas').waitFor();
  await page.getByText('正在准备旅途画面…', { exact: true }).waitFor({ state: 'hidden' });
  for (; tick < 6000; tick++) {
    const observation = await page.evaluate(async () => {
      const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
      const { mapById, balance, regionById, enemyBehavior } =
        await import('/src/pages/GamePage/objects/content.ts');
      const { movePosition, distance, normalize, subtract, camera } =
        await import('/src/pages/GamePage/functions/geometry.ts');
      const { exploration, collisionMap, playerStats, exitAvailable } =
        await import('/src/pages/GamePage/functions/exploration.ts');
      const { exitPosition } = await import('/src/pages/GamePage/runtime/explorationDraw.ts');
      const { pursuitDirection } = await import('/src/pages/GamePage/functions/navigation.ts');
      const game = getGameSnap();
      if (!game) return null;
      const map = collisionMap(game.snapshot),
        p = game.snapshot.position;
      let direction = { x: 0, y: 0 },
        target = null,
        action = null;
      if (game.mode.kind === 'explore') {
        const progress = exploration(game.snapshot),
          region = regionById(map.id);
        const done = (id) =>
          progress.flags.includes(id) ||
          progress.collected.includes(id) ||
          game.snapshot.completed.includes(id);
        const pointOrder =
          {
            rain: ['thorns', 'rain-pearl'],
            market: ['market-rice', 'qwen'],
            mine: ['mine-scale'],
            pavilion: ['pavilion-bench'],
            harbor: ['sailor', 'young-sailor', ...(done('2-A') ? ['sailor-reward'] : [])],
            dock: ['sluice', 'barrel-one', 'barrel-two', 'dock-ladder', 'dock-core', 'dock-down'],
            riverbed: ['river-rice'],
            camp: ['dwarf', 'snow-fire'],
            snowline: ['light-totem'],
            outpost: ['outpost-fire'],
            icehall: ['ice-lift', 'ice-seal', 'ice-pearl', 'ice-down'],
            relics: ['relic-core'],
            library: ['whitepaper', 'library-bench'],
          }[map.id] ?? [];
        const point = region.points.find((p) => p.id === pointOrder.find((id) => !done(id)));
        const nextMap = {
          steps: 'rain',
          rain: 'market',
          market: 'forest',
          forest: !progress.visited.includes('pavilion')
            ? 'pavilion'
            : !done('mine-scale')
              ? 'mine'
              : 'harbor',
          pavilion: 'forest',
          mine: 'forest',
          harbor: done('2-A') ? 'coast' : 'dock',
          dock: done('2-A') ? 'harbor' : 'warehouse',
          warehouse: 'dock',
          coast: 'rift',
          rift: !done('river-rice') ? 'riverbed' : !done('3-A') ? 'crystal' : 'pass',
          riverbed: 'rift',
          crystal: 'rift',
          pass: !done('snow-fire') ? 'camp' : !done('ice-pearl') ? 'icehall' : 'lair',
          camp: 'pass',
          icehall: 'pass',
          lair: 'snowline',
          snowline: 'outpost',
          outpost: 'corridor',
          corridor: !done('relic-core') ? 'relics' : !done('whitepaper') ? 'library' : 'garden',
          relics: 'corridor',
          library: 'corridor',
          garden: 'throne',
        }[map.id];
        const gate = region.exits.find((e) => e.to === nextMap);
        const mustFight = map.encounter && !done(map.encounter);
        let destination = mustFight
          ? { x: region.trigger[0], y: region.trigger[1] }
          : point
            ? { x: point.position[0], y: point.position[1] }
            : gate
              ? exitPosition(map.id, gate)
              : p;
        if (point?.kind === 'breakable' && !mustFight) {
          target = {
            id: null,
            position: { x: point.position[0], y: point.position[1] },
            kind: 'object',
          };
          destination = { x: target.position.x, y: target.position.y + 60 };
          if (distance(p, target.position) < 95) action = 'break';
        } else if (
          (mustFight && distance(p, destination) < 150) ||
          (point && distance(p, destination) < 20)
        )
          action = 'interact';
        if (!action) direction = pursuitDirection(p, destination, map);
        if (game.snapshot.hp < playerStats(game.snapshot).maxHp * 0.8 && !mustFight) {
          const fire = region.points.find((point) => point.kind === 'camp');
          const rest = { x: fire?.position[0] ?? map.spawn[0], y: fire?.position[1] ?? map.spawn[1] };
          target = null;
          action = distance(p, rest) < 60 ? 'interact' : null;
          direction = action ? { x: 0, y: 0 } : pursuitDirection(p, rest, map);
        }
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
            let cost =
              Math.abs(distance(future, target.position) - (target.kind === 'pope' ? 290 : 58)) *
              0.3;
            if (target.kind === 'pope') {
              // Orbit consistently rather than oscillating across a marked spot.
              const radial = normalize(subtract(p, target.position));
              const clockwise = { x: -radial.y, y: radial.x };
              cost += 28 * (1 - dir.x * clockwise.x - dir.y * clockwise.y);
            }
            if (distance(future, p) < 15 && (dir.x || dir.y)) cost += 40;
            for (const enemy of alive) {
              const spec = balance.enemies[enemy.kind],
                d = distance(future, enemy.position);
              const toward = normalize(subtract(future, enemy.position));
              const cone = toward.x * enemy.aim.x + toward.y * enemy.aim.y;
              if (
                enemy.phase === 'windup' &&
                enemy.timer < 0.65 &&
                ['guard', 'beast', 'hound', 'knight', 'gpt'].includes(enemyBehavior(enemy.kind)) &&
                d < spec.range + 32 &&
                cone > 0.35
              )
                cost += 500 + (spec.range + 32 - d);
              if (
                enemyBehavior(enemy.kind) === 'knight' &&
                enemy.broken <= 0 &&
                d < 100 &&
                cone > 0.25
              )
                cost += 80;
              if (
                enemy.id === target.id &&
                enemyBehavior(enemy.kind) === 'knight' &&
                enemy.phase !== 'chase'
              ) {
                const rear = {
                  x: enemy.position.x - enemy.aim.x * 55,
                  y: enemy.position.y - enemy.aim.y * 55,
                };
                cost += distance(future, rear) * 1.5;
              }
            }
            for (const hazard of game.hazards) {
              const d = distance(future, hazard.position);
              if (
                d < hazard.radius + 28 &&
                hazard.timer >= 0 &&
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
          const toward = normalize(subtract(p, target.position));
          const blocked =
            enemyBehavior(target.kind) === 'knight' &&
            target.broken <= 0 &&
            toward.x * target.aim.x + toward.y * target.aim.y > 0.25;
          if (
            !blocked &&
            !game.action &&
            game.snapshot.cooldowns.water <= 0 &&
            game.snapshot.mp >= 20 &&
            d < 420
          )
            action = 'water';
          else if (!blocked && d < 95) action = 'melee';
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
        exploration: game.snapshot.exploration,
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
          path: `../.local/playthrough/${runName}-${map.id}-${game.mode.kind}.png`,
        });
    }
    if (game.mode.kind === 'credits') {
      completed = true;
      break;
    }
    if (game.mode.kind === 'failed') {
      await movement([]);
      await releaseAttack();
      failures++;
      if (failures > 3)
        throw new Error(`Too many deaths at ${map.id}; investigate combat or input strategy`);
      await page.getByRole('heading', { name: '旅途尚未结束' }).waitFor();
      await choose(/重试检查点/);
      continue;
    }
    if (game.mode.kind === 'paused') {
      await page.keyboard.press('Escape');
      continue;
    }
    if (game.mode.kind === 'dialogue' || game.mode.kind === 'cinematic') {
      await movement([]);
      await releaseAttack();
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
    if (target && keyboard && target.kind === 'object') {
      const dx = target.position.x - game.snapshot.position.x,
        dy = target.position.y - game.snapshot.position.y;
      await page.keyboard.press(
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? 'ArrowRight'
            : 'ArrowLeft'
          : dy > 0
            ? 'ArrowDown'
            : 'ArrowUp',
      );
    } else if (target && keyboard) {
      if (game.lockedEnemy !== target.id) await page.keyboard.press('Tab');
    } else if (target) {
      const box = await page.locator('canvas').boundingBox();
      await page.mouse.move(
        box.x + ((target.position.x - camera.x) * box.width) / 960,
        box.y + ((target.position.y - camera.y) * box.height) / 540,
      );
    }
    await releaseAttack();
    if (action === 'interact') await page.keyboard.press('KeyF');
    if (action === 'water' && keyboard) await page.keyboard.press('KeyK');
    else if (action === 'water') {
      await page.mouse.down({ button: 'right' });
      await page.mouse.up({ button: 'right' });
    }
    if (action === 'melee' || action === 'break') {
      if (keyboard) await page.keyboard.down('KeyJ');
      else await page.mouse.down();
    }
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
  await page
    .getByText(resume && tick === 0 ? '进度已载入' : '进度已保存', { exact: true })
    .first()
    .waitFor();
  await page.reload();
  if (keyboard) {
    await page.getByRole('link', { name: '返回标题并继续旅途' }).waitFor();
    await page.keyboard.press('Tab');
    if (
      !(await page
        .getByRole('link', { name: '返回标题并继续旅途' })
        .evaluate((link) => link === document.activeElement))
    )
      throw new Error('Keyboard could not focus the return-to-title link');
    await page.keyboard.press('Enter');
  } else await page.getByRole('link', { name: '返回标题并继续旅途' }).click();
  await choose(/继续旅途/);
  await page.getByRole('heading', { name: '自由，从此开始' }).waitFor();
  resumedAfterReload = true;
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`PASS ${difficulty}: credits reached through real input; ${failures} retries`);
} catch (error) {
  errors.push(String(error));
  throw error;
} finally {
  await page.context().storageState({ path: `../.local/playthrough/${outputName}-storage.json` });
  await writeFile(
    `../.local/playthrough/${outputName}-result.json`,
    JSON.stringify(
      {
        difficulty,
        keyboard,
        resume,
        completed,
        resumedAfterReload,
        tick,
        failures,
        events,
        errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
