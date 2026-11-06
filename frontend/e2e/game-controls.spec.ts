import { expect, test } from '@playwright/test';
import atlas from '../../material/Character/animation-manifest.json' with { type: 'json' };

test('control fast-forwards only while held, help follows bindings, four movement and attack clips reach canvas', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const draws: string[] = [];
    Object.assign(window, { heroDraws: draws });
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args: Parameters<typeof draw>) {
      const [img, x, y] = args;
      if (img instanceof HTMLImageElement && img.src.includes('deepseek/sprites/'))
        draws.push(img.src.split('/').pop() + ':' + x + ',' + y);
      return draw.apply(this, args);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByLabel('控制方案').selectOption('keyboard');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  const mode = () =>
    page.evaluate(
      async () => (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap()!.mode,
    );
  await page.keyboard.down('ControlLeft');
  await expect
    .poll(async () => {
      const m = await mode();
      return m.kind === 'dialogue' && m.line > 0;
    })
    .toBe(true);
  await page.keyboard.up('ControlLeft');
  const paused = await mode();
  await page.waitForTimeout(350);
  expect(await mode()).toMatchObject({ kind: 'dialogue', line: paused.line });
  await page.keyboard.down('ControlRight');
  await expect.poll(async () => (await mode()).kind).toBe('explore');
  await page.keyboard.up('ControlRight');
  for (const [dir, key] of [
    ['left', 'KeyA'],
    ['right', 'KeyD'],
    ['up', 'KeyW'],
    ['down', 'KeyS'],
  ] as const) {
    await page.evaluate(() => (window.heroDraws.length = 0));
    await page.keyboard.down(key);
    await page.waitForTimeout(360);
    await page.keyboard.up(key);
    await page.keyboard.down('KeyJ');
    await page.waitForTimeout(360);
    await page.keyboard.up('KeyJ');
    await expect
      .poll(
        () =>
          page.evaluate(
            async () =>
              (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap()!.snapshot
                .cooldowns.water,
          ),
        { timeout: 6000 },
      )
      .toBe(0);
    await page.keyboard.press('KeyK');
    await page.waitForTimeout(410);
    const calls = await page.evaluate(() => window.heroDraws);
    for (const [id, file] of [
      ['deepseek-walk', 'walk.png'],
      ['deepseek-melee', 'melee-tail.png'],
      ['deepseek-cast', 'cast-water.png'],
    ]) {
      const asset = atlas.assets.find((a) => a.id === id)!;
      const frames = asset.clips[dir].frames.map(
        (i) => file + ':' + asset.frames[i].rect.slice(0, 2).join(','),
      );
      expect(new Set(calls.filter((v) => frames.includes(v))).size).toBeGreaterThan(1);
    }
  }
  const screen = await page.locator('main').boundingBox();
  expect(screen?.width).toBe(1440);
  expect(screen?.height).toBe(900);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '帮助', exact: true }).click();
  await expect(page.getByRole('heading', { name: '冒险帮助' })).toBeVisible();
  await expect(page.getByText('探索与战斗 · 纯键盘')).toBeVisible();
  if (await page.evaluate(() => !!document.fullscreenElement)) {
    await page.getByRole('button', { name: '切换浏览器全屏' }).click();
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  }
  await page.getByRole('button', { name: '切换浏览器全屏' }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole('button', { name: '更改键位' }).click();
  await expect(page.getByLabel('控制方案')).toHaveValue('keyboard');
});
