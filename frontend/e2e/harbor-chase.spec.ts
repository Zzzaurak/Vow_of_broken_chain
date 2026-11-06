import { test, expect } from '@playwright/test';
test('harbor theft leaves a loadable exploration hub instead of forcing a chase duel', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  // Seed a valid authored checkpoint through the real save API. This is a focused
  // integration fixture, not evidence of playing through the earlier chapters.
  await page.evaluate(async () => {
    const { getProgressSnap } = await import('/src/features/saves/session.ts');
    const { SaveProgressMessage } =
      await import('/src/apis/AdventureService/SaveProgressMessage.ts');
    const { mapById } = await import('/src/pages/GamePage/objects/content.ts');
    const progress = getProgressSnap()!;
    const map = mapById('harbor');
    await new SaveProgressMessage(
      progress.save.adventureId,
      'manual',
      5,
      {
        ...progress.save.snapshot,
        mapId: map.id,
        checkpoint: map.checkpoint,
        position: { x: map.spawn[0], y: map.spawn[1] },
        stage: 'arrival',
        completed: ['0-A', '1-A'],
        exploration: {
          visited: ['steps', 'market', 'forest', 'harbor'],
          flags: ['qwen'],
          collected: [],
        },
      },
      crypto.randomUUID(),
      progress.revision,
    ).send();
  });
  await page.goto('/');
  await page.getByRole('button', { name: /继续旅途/ }).click();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  const state = () =>
    page.evaluate(async () => {
      const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
      return getGameSnap();
    });
  await expect.poll(async () => (await state())?.mode.kind).toBe('dialogue');
  for (let i = 0; i < 40 && (await state())?.mode.kind === 'dialogue'; i++)
    await page.keyboard.press('Enter');
  await expect.poll(async () => (await state())?.mode.kind).toBe('explore');
  const before = (await state())!.snapshot;
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '存读档', exact: true }).click();
  await expect(page.getByRole('button', { name: '存 1', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '旅途', exact: true }).click();
  await page.getByRole('button', { name: '继续游戏', exact: true }).click();
  const end = (await state())!;
  expect(end.snapshot.stage).toBe('ready');
  expect(end.snapshot.unlocked).toEqual([]);
  expect(end.snapshot.position).toEqual(before.position);
  expect(end.snapshot.hp).toBe(before.hp);
  await expect(page.getByText('进度已保存', { exact: true }).first()).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: '返回标题并继续旅途' }).click();
  await page.getByRole('button', { name: /继续旅途/ }).click();
  await expect.poll(async () => (await state())?.mode.kind).toBe('explore');
  expect((await state())?.snapshot.stage).toBe('ready');
  expect(errors).toEqual([]);
});
