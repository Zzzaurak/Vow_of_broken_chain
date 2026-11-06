import { test, expect } from '@playwright/test';
test('cancelling reload or browser back preserves unsaved progress, accepting back leaves', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  const state = () =>
    page.evaluate(async () => {
      const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
      return getGameSnap();
    });
  for (let i = 0; i < 30 && (await state()).mode.kind === 'dialogue'; i++)
    await page.keyboard.press('Enter');
  await expect.poll(async () => (await state()).mode.kind).toBe('explore');
  await expect(page.getByText('进度已保存', { exact: true }).first()).toBeVisible();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyD');
  await page.keyboard.press('Escape');
  const before = await state();
  expect(before.dirty).toBe(true);
  let prompted = false;
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('beforeunload');
    prompted = true;
    await dialog.dismiss();
  });
  await page.reload({ timeout: 3000 }).catch((error) => {
    if (!String(error).includes('ERR_ABORTED') && !String(error).includes('Timeout')) throw error;
  });
  expect(prompted).toBe(true);
  expect((await state()).snapshot).toEqual(before.snapshot);
  await expect(page.getByRole('heading', { name: '旅途中歇' })).toBeVisible();
  const backDialog = page.waitForEvent('dialog');
  await page.evaluate(() => history.back());
  const cancelled = await backDialog;
  expect(cancelled.type()).toBe('confirm');
  await cancelled.dismiss();
  await expect(page).toHaveURL(/\/game$/);
  expect((await state()).snapshot).toEqual(before.snapshot);
  const nextDialog = page.waitForEvent('dialog');
  await page.evaluate(() => history.back());
  await (await nextDialog).accept();
  await expect(page.getByRole('button', { name: /开启新的冒险/ })).toBeVisible();
});
