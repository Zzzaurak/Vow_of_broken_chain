import { expect, test } from '@playwright/test';

test('late list response cannot hide a manual save made after the refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  const mode = () =>
    page.evaluate(
      async () => (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap()?.mode.kind,
    );
  for (let i = 0; i < 40 && (await mode()) === 'dialogue'; i++) await page.keyboard.press('Enter');
  await expect(page.getByText('进度已保存', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '存读档', exact: true }).click();
  await expect(page.getByRole('button', { name: /自动 · 东方圣殿长阶/ }).first()).toBeVisible();
  let release!: () => void, captured!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fetched = new Promise<void>((resolve) => {
    captured = resolve;
  });
  let first = true;
  await page.route('**/AdventureService/listsaves', async (route) => {
    if (!first) return route.continue();
    first = false;
    const earlier = await route.fetch();
    captured();
    await hold;
    await route.fulfill({
      response: earlier,
      headers: { ...earlier.headers(), 'x-test-list': 'earlier' },
    });
  });
  await page.getByRole('button', { name: '刷新记录' }).click();
  await fetched;
  try {
    await page.getByRole('button', { name: '存 1', exact: true }).click();
    await expect(page.getByRole('button', { name: /手动 1 ·/ })).toBeVisible();
    const arrived = page.waitForResponse((r) => r.headers()['x-test-list'] === 'earlier');
    release();
    await (await arrived).finished();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(page.getByRole('button', { name: /手动 1 ·/ })).toBeVisible();
  } finally {
    release();
  }
});
