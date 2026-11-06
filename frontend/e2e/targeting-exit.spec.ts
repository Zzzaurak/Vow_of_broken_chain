import { test, expect } from '@playwright/test';

test('real directional input targets GPT and water on every side, exits use walking', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  for (const [key, dx, dy] of [
    ['ArrowLeft', -1, 0],
    ['ArrowUp', 0, -1],
    ['ArrowDown', 0, 1],
    ['ArrowRight', 1, 0],
  ] as const) {
    await page.evaluate(
      async ({ dx, dy }) => {
        const { getGameSnap, setGame } = await import('/src/pages/GamePage/runtime/store.ts');
        const { createGame, beginBattle } =
          await import('/src/pages/GamePage/functions/progression.ts');
        const { setSettings } = await import('/src/features/settings/store.ts');
        setSettings({ preset: 'keyboard' });
        const game = beginBattle(
          createGame({
            ...getGameSnap()!.snapshot,
            mapId: 'throne',
            checkpoint: 'throne',
            stage: 'ready',
            position: { x: 640, y: 448 },
            unlocked: ['glm', 'gpt', 'claude'],
            supports: ['claude', 'gpt'],
            cooldowns: { water: 0, glm: 0, gpt: 0, claude: 0 },
            hp: 100,
            mp: 100,
          }),
        );
        setGame({
          ...game,
          enemies: [110, 210, -80].map((offset, id) => ({
            ...game.enemies[0],
            id,
            kind: 'mage',
            hp: 160,
            maxHp: 160,
            shield: 0,
            phase: 'recover',
            timer: 10,
            position: { x: 640 + dx * offset, y: 448 + dy * offset },
          })),
        });
      },
      { dx, dy },
    );
    await page.keyboard.press(key);
    await page.keyboard.press('KeyE');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
          return getGameSnap()!.enemies.map((e) => e.hp);
        }),
      )
      .toEqual([95, 95, 160]);
    await page.screenshot({ path: `../.local/skill-${key}.png` });
    await page.keyboard.press('KeyK');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
          return getGameSnap()!.enemies[0].hp;
        }),
      )
      .toBe(63);
  }
  // Install a legal safe checkpoint through the actual persistence API.
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
        mapId: 'forest',
        checkpoint: 'forest',
        position: { x: 96, y: 448 },
        stage: 'cleared',
        completed: ['0-A', '1-A'],
        exploration: { visited: ['steps', 'market', 'forest'], flags: ['qwen'], collected: [] },
      },
      crypto.randomUUID(),
      p.revision,
    ).send();
  });
  await page.goto('/');
  await page.getByRole('button', { name: /继续旅途/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: '../.local/blue-exit.png' });
  await page.keyboard.down('KeyA');
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
        return getGameSnap()!.snapshot.mapId;
      }),
    )
    .toBe('harbor');
  await page.keyboard.up('KeyA');
  await expect(page.getByText('道路封锁', { exact: true })).toHaveCount(0);
});
