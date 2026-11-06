import { test, expect } from '@playwright/test';

test('a failed dragon trial can retry its own checkpoint and a lost load can retry the same operation', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.getByRole('button', { name: '困难 · 迎接挑战' }).click();
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  // Seed a legal low-HP checkpoint. All subsequent navigation and combat use the game UI.
  await page.evaluate(async () => {
    const { getProgressSnap } = await import('/src/features/saves/session.ts');
    const { SaveProgressMessage } =
      await import('/src/apis/AdventureService/SaveProgressMessage.ts');
    const p = getProgressSnap()!;
    await new SaveProgressMessage(
      p.save.adventureId,
      'manual',
      1,
      {
        ...p.save.snapshot,
        mapId: 'lair',
        checkpoint: 'lair',
        stage: 'ready',
        position: { x: 640, y: 384 },
        hp: 1,
        unlocked: ['glm'],
        supports: ['glm'],
        completed: ['0-A', '1-A', '2-A', '3-A'],
        exploration: {
          visited: [
            'steps',
            'market',
            'forest',
            'harbor',
            'dock',
            'warehouse',
            'coast',
            'crystal',
            'pass',
            'lair',
          ],
          flags: ['qwen', 'sluice', 'bridge'],
          collected: [],
        },
      },
      crypto.randomUUID(),
      p.revision,
    ).send();
  });
  await page.goto('/');
  const loadIds: string[] = [];
  await page.route('**/api/AdventureService/loadadventure', async (route) => {
    loadIds.push(route.request().postDataJSON().operationId);
    if (loadIds.length === 1) {
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('button', { name: /继续旅途/ }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: '重试上次操作' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  expect(loadIds).toHaveLength(2);
  expect(loadIds[0]).toBe(loadIds[1]);
  await page.keyboard.press('KeyF');
  await expect(page.getByRole('meter', { name: '龙鳞护盾' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '旅途尚未结束' })).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: /重试检查点/ }).click();
  const state = await page.evaluate(async () => {
    const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
    return getGameSnap()!;
  });
  expect(state.mode.kind).toBe('explore');
  expect(state.snapshot).toMatchObject({
    difficulty: 'hard',
    mapId: 'lair',
    stage: 'ready',
    hp: 100,
    mp: 100,
    completed: ['0-A', '1-A', '2-A', '3-A'],
  });

  // Isolate the winning hit from the long fight. Two-difficulty playthroughs cover the full duel.
  const saved: { mapId: string; stage: string; hp: number; mp: number; unlocked: string[] }[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/saveprogress')) saved.push(request.postDataJSON().snapshot);
  });
  await page.keyboard.press('KeyF');
  await expect(page.getByRole('meter', { name: '龙鳞护盾' })).toBeVisible();
  await page.evaluate(async () => {
    const { updateGame } = await import('/src/pages/GamePage/runtime/store.ts');
    updateGame((g) => ({
      ...g,
      enemies: g.enemies.map((e) => ({
        ...e,
        shield: 0,
        phase: 'recover',
        timer: 3,
        position: { x: g.snapshot.position.x + 45, y: g.snapshot.position.y },
      })),
    }));
  });
  const point = await page.evaluate(async () => {
    const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
    const { camera } = await import('/src/pages/GamePage/functions/geometry.ts');
    const { mapById } = await import('/src/pages/GamePage/objects/content.ts');
    const game = getGameSnap()!;
    const origin = camera(game.snapshot.position, mapById(game.snapshot.mapId));
    const bounds = document.querySelector('canvas')!.getBoundingClientRect();
    const enemy = game.enemies[0].position;
    return {
      x: ((enemy.x - origin.x) * bounds.width) / 960,
      y: ((enemy.y - origin.y) * bounds.height) / 540,
    };
  });
  await page.locator('canvas').click({ position: point });
  await expect(page.getByText('古龙的认可', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '存读档', exact: true }).click();
  await expect(page.getByRole('button', { name: '存 1', exact: true })).toBeDisabled();
  expect(saved).toEqual([]);
  await page.getByRole('button', { name: '旅途', exact: true }).click();
  await page.getByRole('button', { name: '继续游戏', exact: true }).click();
  const skip = page.getByRole('button', { name: /跳过演出/ });
  await skip.click();
  for (let i = 0; i < 80 && !(await skip.count()); i++) await page.keyboard.press('Enter');
  await skip.click();
  await expect(page.getByText('进度已保存', { exact: true }).first()).toBeVisible();
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    mapId: 'lair',
    stage: 'cleared',
    hp: 100,
    mp: 100,
    unlocked: ['glm', 'gpt'],
  });
});
