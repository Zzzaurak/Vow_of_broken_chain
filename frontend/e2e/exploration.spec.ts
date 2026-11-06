import { test, expect, type Page } from '@playwright/test';
async function state(page: Page) {
  return page.evaluate(async () => {
    const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
    return getGameSnap()!;
  });
}
async function walk(page: Page, target: { x: number; y: number }, nextMap?: string) {
  const start = (await state(page)).snapshot.mapId;
  for (let i = 0; i < 240; i++) {
    const observation = await page.evaluate(async (target) => {
      const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
      const { pursuitDirection } = await import('/src/pages/GamePage/functions/navigation.ts');
      const { collisionMap } = await import('/src/pages/GamePage/functions/exploration.ts');
      const s = getGameSnap()!;
      return {
        map: s.snapshot.mapId,
        mode: s.mode.kind,
        p: s.snapshot.position,
        d: pursuitDirection(s.snapshot.position, target, collisionMap(s.snapshot)),
      };
    }, target);
    if (nextMap && observation.map === nextMap) return;
    if (!nextMap && Math.hypot(observation.p.x - target.x, observation.p.y - target.y) < 25) return;
    expect(observation.mode).toBe('explore');
    const keys = [];
    if (observation.d.x > 0.25) keys.push('KeyD');
    if (observation.d.x < -0.25) keys.push('KeyA');
    if (observation.d.y > 0.25) keys.push('KeyS');
    if (observation.d.y < -0.25) keys.push('KeyW');
    for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(100);
    for (const key of keys) await page.keyboard.up(key);
  }
  throw new Error(`Could not walk from ${start} to ${JSON.stringify(target)}`);
}
async function talk(page: Page) {
  await page.keyboard.press('KeyF');
  await page.keyboard.down('ControlLeft');
  await expect.poll(async () => (await state(page)).mode.kind, { timeout: 10000 }).toBe('explore');
  await page.keyboard.up('ControlLeft');
}
test('walks branching town and rainforest, collects upgrades once and reloads a real save', async ({
  page,
}) => {
  test.setTimeout(150000);
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.evaluate(async () => {
    const { getProgressSnap } = await import('/src/features/saves/session.ts');
    const { SaveProgressMessage } =
      await import('/src/apis/AdventureService/SaveProgressMessage.ts');
    const { setSettings } = await import('/src/features/settings/store.ts');
    setSettings({ preset: 'keyboard' });
    const p = getProgressSnap()!;
    await new SaveProgressMessage(
      p.save.adventureId,
      'manual',
      1,
      {
        ...p.save.snapshot,
        mapId: 'market',
        checkpoint: 'market',
        stage: 'ready',
        position: { x: 640, y: 600 },
        completed: ['0-A'],
        exploration: {
          visited: ['steps', 'rain', 'market'],
          flags: ['steps:arrival'],
          collected: [],
        },
      },
      crypto.randomUUID(),
      p.revision,
    ).send();
  });
  await page.goto('/');
  await page.getByRole('button', { name: /继续旅途/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: '当前区域探索地图' })).toBeVisible();
  await walk(page, { x: 640, y: 650 });
  await talk(page);
  expect((await state(page)).snapshot.exploration?.flags).toContain('qwen');
  await walk(page, { x: 1120, y: 224 });
  await page.keyboard.press('KeyF');
  await expect.poll(async () => (await state(page)).snapshot.hp).toBe(120);
  await page.keyboard.press('KeyF');
  expect((await state(page))?.snapshot.exploration?.collected).toEqual(['market-rice']);
  await page.screenshot({ path: '../.local/rpg-town.png' });
  await walk(page, { x: 640, y: 24 }, 'rain');
  await walk(page, { x: 208, y: 390 });
  await page.keyboard.press('ArrowUp');
  await page.keyboard.down('KeyJ');
  await expect
    .poll(async () => (await state(page)).snapshot.exploration?.flags)
    .toContain('thorns');
  await page.keyboard.up('KeyJ');
  await walk(page, { x: 208, y: 208 });
  await page.keyboard.press('KeyF');
  await expect
    .poll(async () => (await state(page))?.snapshot.exploration?.collected)
    .toContain('rain-pearl');
  await page.screenshot({ path: '../.local/rpg-rain.png' });
  await walk(page, { x: 208, y: 850 });
  await walk(page, { x: 640, y: 936 }, 'market');
  await walk(page, { x: 720, y: 650 });
  await page.keyboard.press('KeyF');
  await expect.poll(async () => (await state(page)).snapshot.mp).toBe(120);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '手记', exact: true }).click();
  await expect(page.getByText('HP 上限 120 · MP 上限 120 · 每秒回复 2.5 MP')).toBeVisible();
  await page.getByRole('button', { name: '存读档', exact: true }).click();
  await page.getByRole('button', { name: '存 2', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '进度已保存' })).toBeVisible();
  page.on('dialog', (d) => d.accept());
  await page.goto('/');
  await page.getByRole('button', { name: /继续旅途/ }).click();
  await expect
    .poll(async () => (await state(page))?.snapshot.exploration?.collected)
    .toEqual(['market-rice', 'rain-pearl']);
  expect((await state(page)).snapshot.hp).toBe(120);
  expect((await state(page)).snapshot.mp).toBe(120);
});
