import { test, expect } from '@playwright/test';
test('failed image loading blocks gameplay and can retry without losing the adventure', async ({
  page,
}) => {
  let fail = true;
  await page.route('**/assets/world/terrain-atlas.png', (route) =>
    fail ? route.abort() : route.continue(),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.getByRole('alert')).toContainText('素材加载失败');
  const snapshot = () =>
    page.evaluate(async () => {
      const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
      return getGameSnap();
    });
  const before = await snapshot();
  await page.keyboard.press('Enter');
  expect((await snapshot()).mode).toEqual(before.mode);
  fail = false;
  await page.getByRole('button', { name: '重新加载素材' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  expect((await snapshot()).snapshot).toEqual(before.snapshot);
  await page.keyboard.press('Enter');
  expect((await snapshot()).mode.revealed).toBeGreaterThan(0);
});
