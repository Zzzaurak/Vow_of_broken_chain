import { test, expect } from '@playwright/test';
test('ordinary combat defeat shows a fall before retry and cannot save the defeated state', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.getByRole('button', { name: '困难 · 迎接挑战' }).click();
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  const state = () =>
    page.evaluate(async () => {
      const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
      return getGameSnap();
    });
  for (let i = 0; i < 30 && (await state())?.mode.kind === 'dialogue'; i++)
    await page.keyboard.press('Enter');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(2100);
  await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyF');
  await expect.poll(async () => (await state())?.mode.kind).toBe('battle');
  // Take actual enemy attacks without altering HP or the runtime state.
  await expect
    .poll(async () => (await state())?.mode.kind, { timeout: 45000, intervals: [20] })
    .toBe('failed');
  await expect(page.getByRole('heading', { name: '旅途尚未结束' })).toHaveCount(0);
  const fallen = (await state())!;
  expect(fallen.snapshot.hp).toBe(0);
  await expect(page.getByRole('heading', { name: '旅途尚未结束' })).toBeVisible();
  expect((await state())!.snapshot).toEqual(fallen.snapshot);
  await page.getByRole('button', { name: '存读档', exact: true }).click();
  await expect(page.getByRole('button', { name: '存 1', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '旅途', exact: true }).click();
  await page.getByRole('button', { name: /重试检查点/ }).click();
  await expect.poll(async () => (await state())?.mode.kind).toBe('explore');
  const retried = (await state())!;
  expect(retried.snapshot.hp).toBe(100);
  expect(retried.snapshot.mp).toBe(100);
  expect(retried.snapshot.completed).toEqual([]);
  expect(retried.enemies).toEqual([]);
});
