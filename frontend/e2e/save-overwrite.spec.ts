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
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
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
  expect(confirmation).toContain('东方圣殿长阶');
  const saved = page.getByRole('button', { name: /手动 1 · 东方圣殿长阶/ });
  await expect(saved).toContainText('序章 · 长阶之别');
  await expect(saved).toContainText('击退三名近卫，接近 Claude');
  await expect(saved).toContainText(/游玩 \d+ 分 \d+ 秒/);
  await expect(saved).toContainText('保存于');
  await page.getByRole('button', { name: '旅途', exact: true }).click();
  await page.getByRole('button', { name: '返回标题', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('button', { name: /读取存档 ·/ }).click();
  await expect(saved).toContainText('序章 · 长阶之别');
  await expect(saved).toContainText(/游玩 \d+ 分 \d+ 秒/);
  await expect(saved).toContainText('简单');
});
