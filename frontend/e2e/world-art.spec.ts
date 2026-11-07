import { test, expect } from '@playwright/test';
test('all region art loads and solid footprints match visible obstacle tiles', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  const ids = await page.evaluate(async () => {
    const { maps } = await import('/src/pages/GamePage/objects/content.ts');
    return maps.map((m) => m.id);
  });
  for (const id of ids) {
    const result = await page.evaluate(async (id) => {
      const { getGameSnap, setGame } = await import('/src/pages/GamePage/runtime/store.ts');
      const { createGame, spawnWave } =
        await import('/src/pages/GamePage/functions/progression.ts');
      const { mapById } = await import('/src/pages/GamePage/objects/content.ts');
      const { movePosition } = await import('/src/pages/GamePage/functions/geometry.ts');
      const map = mapById(id),
        snapshot = getGameSnap()!.snapshot;
      const state = createGame({
        ...snapshot,
        mapId: id,
        checkpoint: id,
        stage: 'ready',
        position: { x: map.width * 16, y: map.height * 16 },
        completed: [],
        exploration: { visited: [id], flags: [], collected: [] },
      });
      setGame({ ...state, mode: { kind: 'explore' }, enemies: spawnWave(state, 0) });
      return map.obstacles.every(([x, y, w, h]) => {
        if (w !== h) return false;
        const start = { x: x - 16, y: y + h / 2 };
        const end = movePosition(start, { x: 32, y: 0 }, map);
        return end.x < x - 12;
      });
    }, id);
    expect(result, `${id} solid bounds`).toBe(true);
    await page.waitForTimeout(80);
    await page.screenshot({ path: `../.local/art-${id}.png` });
  }
  expect(errors).toEqual([]);
});

test('real movement stops at the drawn tree edge and passes below its footprint', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  await page.evaluate(async () => {
    const { getGameSnap, setGame } = await import('/src/pages/GamePage/runtime/store.ts');
    const { createGame } = await import('/src/pages/GamePage/functions/progression.ts');
    const old = getGameSnap()!.snapshot;
    setGame(
      createGame({
        ...old,
        mapId: 'forest',
        checkpoint: 'forest',
        stage: 'cleared',
        position: { x: 200, y: 176 },
        completed: ['0-A', '1-A'],
        exploration: { visited: ['steps', 'market', 'forest'], flags: ['qwen'], collected: [] },
      }),
    );
  });
  const position = () =>
    page.evaluate(
      async () =>
        (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap()!.snapshot.position,
    );
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyD');
  expect((await position()).x).toBeLessThan(212);
  expect((await position()).x).toBeGreaterThan(200);
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(800);
  await page.keyboard.up('KeyS');
  expect((await position()).y).toBeGreaterThan(296);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyD');
  expect((await position()).x).toBeGreaterThan(240);
});
