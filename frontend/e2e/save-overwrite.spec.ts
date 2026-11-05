import { test, expect } from '@playwright/test';
test('a second save to a newly occupied slot requires confirmation even without reopening the list', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  const mode = () =>
    page.evaluate(async () => {
      const m = await import('/src/pages/GamePage/runtime/store.ts');
      return m.getGameSnap()?.mode.kind;
    });
  await expect.poll(mode).toBe('dialogue');
  for (let n = 0; n < 20 && (await mode()) === 'dialogue'; n++) await page.keyboard.press('Enter');
  await expect.poll(mode).toBe('explore');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '存读档', exact: true }).click();
  await page.getByRole('button', { name: '存 1', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '进度已保存' })).toBeVisible();
  let confirmation = '';
  page.once('dialog', async (dialog) => {
    confirmation = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: '存 1', exact: true }).click();
  await expect.poll(() => confirmation).toContain('覆盖手动槽 1');
});
