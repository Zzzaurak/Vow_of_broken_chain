import { test, expect } from '@playwright/test';
test('campfires replace duplicate resting points and combat prompts remain visible', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  const inspect = async (mapId: string, x: number, y: number) =>
    page.evaluate(
      async ({ mapId, x, y }) => {
        const { getGameSnap, setGame } = await import('/src/pages/GamePage/runtime/store.ts');
        const { createGame } = await import('/src/pages/GamePage/functions/progression.ts');
        const s = getGameSnap()!.snapshot;
        setGame(
          createGame({
            ...s,
            mapId,
            checkpoint: mapId,
            position: { x, y },
            stage: 'ready',
            hp: 35,
            mp: 20,
            completed: ['0-A'],
            exploration: {
              visited: [...new Set(['steps', 'market', mapId])],
              flags: mapId === 'forest' ? ['qwen'] : [],
              collected: [],
            },
          }),
        );
      },
      { mapId, x, y },
    );
  await inspect('market', 96, 320);
  await page.keyboard.press('KeyF');
  expect(
    await page.evaluate(
      async () => (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap()!.snapshot.hp,
    ),
  ).toBe(35);
  await inspect('market', 720, 650);
  await page.keyboard.press('KeyF');
  expect(
    await page.evaluate(
      async () => (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap()!.snapshot.hp,
    ),
  ).toBe(100);
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyS');
  await page.screenshot({ path: '../.local/visual-market.png' });
  await inspect('forest', 96, 448);
  await page.keyboard.press('KeyF');
  expect(
    await page.evaluate(
      async () => (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap()!.snapshot.hp,
    ),
  ).toBe(100);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyD');
  await page.screenshot({ path: '../.local/visual-forest.png' });
  await inspect('steps', 448, 384);
  await page.evaluate(async () => {
    const { getGameSnap, setGame } = await import('/src/pages/GamePage/runtime/store.ts');
    const s = getGameSnap()!;
    setGame({ ...s, snapshot: { ...s.snapshot, completed: [] } });
  });
  await expect(page.getByText(/交互进入战斗/)).toBeVisible();
  await page.screenshot({ path: '../.local/visual-battle-prompt.png' });
  await page.keyboard.press('KeyF');
  expect(
    await page.evaluate(
      async () => (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap()!.mode.kind,
    ),
  ).toBe('battle');
});
