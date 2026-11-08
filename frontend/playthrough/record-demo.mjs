/** Course demo: genuine UI input; game state is read only for observation/navigation. */
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] ?? path.join(root, '.local/submission/recording'));
const plan = JSON.parse(await readFile(path.join(root, 'material/Demo/narration.json'), 'utf8'));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--window-size=1280,720', '--force-device-scale-factor=1'],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  screen: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  locale: 'zh-CN',
  recordVideo: { dir: out, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
const start = Date.now();
const events = [];
const errors = [];
const keys = new Set();
page.on('pageerror', (error) => errors.push(error.message));
page.on('dialog', (dialog) => dialog.accept());
const state = () =>
  page.evaluate(async () => (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap());
const wait = (seconds) => page.waitForTimeout(seconds * 1000);
async function move(next) {
  for (const key of keys)
    if (!next.includes(key)) {
      await page.keyboard.up(key);
      keys.delete(key);
    }
  for (const key of next)
    if (!keys.has(key)) {
      await page.keyboard.down(key);
      keys.add(key);
    }
}
async function mounted() {
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  const bounds = await page.locator('canvas').boundingBox();
  if (Math.round(bounds.width) !== 1280 || Math.round(bounds.height) !== 720)
    throw new Error('Fullscreen dimensions differ from the video recording size');
}
async function section(id, action) {
  const chapter = plan.chapters.find((chapter) => chapter.id === id);
  const begin = Date.now();
  console.log('Recording:', id);
  await action(async (seconds) => {
    const remaining = seconds - (Date.now() - begin) / 1000;
    if (remaining > 0) await wait(remaining);
  });
  await move([]);
  const remaining = chapter.min_seconds - (Date.now() - begin) / 1000;
  if (remaining > 0) await wait(remaining);
  events.push({ id, start: (begin - start) / 1000, end: (Date.now() - start) / 1000 });
  console.log(id, 'finished', events.at(-1).end - events.at(-1).start, 'seconds');
}
async function aim(target) {
  const view = await page.evaluate(async () => {
    const s = (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap();
    const { mapById } = await import('/src/pages/GamePage/objects/content.ts');
    const { camera } = await import('/src/pages/GamePage/functions/geometry.ts');
    return camera(s.snapshot.position, mapById(s.snapshot.mapId));
  });
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.move(
    box.x + ((target.x - view.x) * box.width) / 960,
    box.y + ((target.y - view.y) * box.height) / 540,
    { steps: 5 },
  );
}
async function walk(target, limit = 200) {
  for (let n = 0; n < limit; n++) {
    const observation = await page.evaluate(async (target) => {
      const s = (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap();
      const { pursuitDirection } = await import('/src/pages/GamePage/functions/navigation.ts');
      const { collisionMap } = await import('/src/pages/GamePage/functions/exploration.ts');
      return {
        mode: s.mode.kind,
        p: s.snapshot.position,
        d: pursuitDirection(s.snapshot.position, target, collisionMap(s.snapshot)),
      };
    }, target);
    if (Math.hypot(observation.p.x - target.x, observation.p.y - target.y) < 22) {
      await move([]);
      return;
    }
    if (observation.mode !== 'explore') throw new Error('Unexpected encounter while walking');
    const next = [];
    if (observation.d.x > 0.25) next.push('KeyD');
    if (observation.d.x < -0.25) next.push('KeyA');
    if (observation.d.y > 0.25) next.push('KeyS');
    if (observation.d.y < -0.25) next.push('KeyW');
    await move(next);
    await wait(0.1);
  }
  throw new Error('Walking could not reach destination');
}
async function openSaves() {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '旅途中歇' })).toBeVisible();
  await page.getByRole('button', { name: '存读档', exact: true }).click();
}
async function manual(slot) {
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/saveprogress') && r.request().postDataJSON().slot === slot,
  );
  await page.getByRole('button', { name: `存 ${slot}`, exact: true }).click();
  const result = await response;
  if (!result.ok()) throw new Error('Manual save was rejected');
  await expect(page.getByRole('status').filter({ hasText: '进度已保存' })).toBeVisible();
  return (await result.json()).save.snapshot;
}
async function resume() {
  await page.getByRole('button', { name: '旅途', exact: true }).click();
  await page.getByRole('button', { name: '继续游戏', exact: true }).click();
}

try {
  await page.goto('http://127.0.0.1:5179/');
  await expect(page.getByRole('button', { name: /开启新的冒险/ })).toBeEnabled();
  await section('intro', async (at) => {
    await at(5);
    await page.getByRole('button', { name: '困难 · 迎接挑战', exact: true }).click();
    await at(9);
    await page.getByRole('button', { name: '简单 · 聆听故事', exact: true }).click();
  });
  await section('settings', async (at) => {
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await at(3);
    await page.getByLabel('控制方案').selectOption('keyboard');
    await page.getByText('编辑按键', { exact: true }).click();
    await at(7);
    await page.getByRole('button', { name: '深海之力 K', exact: true }).click();
    await page.keyboard.press('KeyL');
    await page.getByRole('button', { name: '应用新键', exact: true }).click();
    await at(10);
    await page.getByRole('button', { name: '恢复当前方案默认键位', exact: true }).click();
    await page.getByText('编辑按键', { exact: true }).click();
    await page.getByLabel('控制方案').selectOption('mouse');
    const volume = page.getByRole('slider', { name: '背景音乐', exact: true });
    await volume.focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
    await page.getByRole('slider', { name: '正文字号', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await at(18);
    await page.getByRole('button', { name: '返回', exact: true }).click();
  });
  await section('story', async (at) => {
    await page.getByRole('button', { name: /开启新的冒险/ }).click();
    await mounted();
    await at(5);
    await page.keyboard.press('Enter');
    await at(7);
    await page.keyboard.press('Enter');
    await page.keyboard.press('KeyR');
    await at(10);
    await page.keyboard.press('KeyR');
    await at(12);
    await page.keyboard.down('ControlLeft');
    await expect.poll(async () => (await state()).mode.kind, { timeout: 12000 }).toBe('explore');
    await page.keyboard.up('ControlLeft');
  });
  await section('combat', async (at) => {
    await walk({ x: 448, y: 384 });
    await page.keyboard.press('KeyF');
    await expect.poll(async () => (await state()).mode.kind).toBe('battle');
    const began = Date.now();
    for (let n = 0; n < 220; n++) {
      const s = await state();
      if (s.mode.kind !== 'battle') break;
      const target = s.enemies
        .filter((e) => e.hp > 0)
        .sort(
          (a, b) =>
            Math.hypot(a.position.x - s.snapshot.position.x, a.position.y - s.snapshot.position.y) -
            Math.hypot(b.position.x - s.snapshot.position.x, b.position.y - s.snapshot.position.y),
        )[0];
      if (!target) break;
      await aim(target.position);
      const dx = target.position.x - s.snapshot.position.x,
        dy = target.position.y - s.snapshot.position.y;
      const d = Math.hypot(dx, dy),
        elapsed = (Date.now() - began) / 1000;
      const next = [];
      if (d > 65) {
        if (dx > 20) next.push('KeyD');
        if (dx < -20) next.push('KeyA');
        if (dy > 20) next.push('KeyS');
        if (dy < -20) next.push('KeyW');
      }
      await move(next);
      if (elapsed > 2) await page.mouse.down({ button: 'left' });
      if (elapsed > 5 && s.snapshot.cooldowns.water <= 0 && s.snapshot.mp >= 20) {
        await page.mouse.down({ button: 'right' });
        await page.mouse.up({ button: 'right' });
      }
      await wait(0.15);
    }
    await page.mouse.up({ button: 'left' });
    await move([]);
    if ((await state()).mode.kind === 'battle') throw new Error('Tutorial fight did not finish');
    await at(22);
  });
  await section('exploration', async () => {
    if ((await state()).mode.kind === 'cinematic') await page.keyboard.press('Enter');
    if ((await state()).mode.kind === 'dialogue') {
      await page.keyboard.down('ControlLeft');
      await expect
        .poll(async () => (await state()).snapshot.mapId, { timeout: 12000 })
        .toBe('rain');
      await page.keyboard.up('ControlLeft');
    }
    await expect.poll(async () => (await state()).mode.kind).toBe('explore');
    await walk({ x: 208, y: 390 });
    await aim({ x: 208, y: 320 });
    await page.mouse.down({ button: 'left' });
    await expect.poll(async () => (await state()).snapshot.exploration.flags).toContain('thorns');
    await page.mouse.up({ button: 'left' });
    await walk({ x: 208, y: 208 });
    await page.keyboard.press('KeyF');
    await expect
      .poll(async () => (await state()).snapshot.exploration.collected)
      .toContain('rain-pearl');
  });
  let source;
  await section('saves', async (at) => {
    await aim({ x: 440, y: 208 });
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    await wait(0.5);
    await openSaves();
    await at(6);
    source = await manual(1);
    await at(10);
    await resume();
    await move(['KeyS']);
    await wait(0.7);
    await move([]);
    await aim({ x: 440, y: 330 });
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    await wait(0.3);
    await openSaves();
    await manual(2);
    await at(18);
    const response = page.waitForResponse((r) => r.url().endsWith('/loadadventure'));
    await page.getByRole('button', { name: /手动 1 ·/ }).click();
    const loaded = await response;
    if (!loaded.ok()) throw new Error('Rollback request rejected');
    const restored = (await loaded.json()).save.snapshot;
    if (JSON.stringify(restored) !== JSON.stringify(source))
      throw new Error('Rollback snapshot mismatch');
    await expect.poll(async () => (await state()).mode.kind).toBe('explore');
  });
  await section('resume', async (at) => {
    await page.reload();
    await page.getByRole('link', { name: '返回标题并继续旅途' }).click();
    await at(4);
    await page.getByRole('button', { name: /继续旅途/ }).click();
    await mounted();
    await expect
      .poll(async () => (await state()).snapshot.exploration.collected)
      .toContain('rain-pearl');
    await at(9);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '手记', exact: true }).click();
    await expect(page.getByText('HP 上限 100 · MP 上限 120 · 每秒回复 2.5 MP')).toBeVisible();
  });
  await section('outro', async (at) => {
    await page.getByRole('button', { name: '旅途', exact: true }).click();
    await page.getByRole('button', { name: '返回标题', exact: true }).click();
    await expect(page.getByRole('button', { name: /继续旅途/ })).toBeVisible();
    await at(10);
  });
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await move([]).catch(() => {});
  const elapsed = (Date.now() - start) / 1000;
  await page.screenshot({ path: path.join(out, 'last-frame.png') }).catch(() => {});
  const video = page.video();
  await context.close();
  await video.saveAs(path.join(out, 'raw.webm'));
  await writeFile(
    path.join(out, 'timeline.json'),
    JSON.stringify({ elapsed, events, errors }, null, 2) + '\n',
  );
  await browser.close();
}
