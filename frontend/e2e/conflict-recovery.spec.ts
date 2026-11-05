import { test, expect } from '@playwright/test';
test('a stale tab can recover by explicitly loading the current server record', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  const mode = () =>
    page.evaluate(async () => {
      const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
      return getGameSnap()?.mode.kind;
    });
  await expect.poll(mode).toBe('dialogue');
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  for (let i = 0; i < 30 && (await mode()) === 'dialogue'; i++) await page.keyboard.press('Enter');
  await expect(page.getByText('进度已保存', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '存读档', exact: true }).click();
  const other = await context.newPage();
  await other.goto('/');
  await other.getByRole('button', { name: /继续旅途/ }).click();
  await expect(other.locator('canvas')).toBeVisible();
  await other.close();
  await page.bringToFront();
  await page.getByRole('button', { name: '存 1', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '进度已在另一次操作中改变' }),
  ).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: /自动.*东方圣殿长阶/ })
    .first()
    .click();
  await expect(page.getByText('进度已载入', { exact: true }).first()).toBeVisible();
  await expect.poll(mode).toBe('explore');
});
