import { test, expect, type Page } from '@playwright/test';
async function navigateTo(page: Page, label: string) {
  for (let n = 0; n < 40; n++) {
    const name = await page.evaluate(() => document.activeElement?.textContent?.trim());
    if (name === label) return;
    await page.keyboard.press('ArrowDown');
  }
  throw new Error(`Keyboard focus could not reach ${label}`);
}
test('pure keyboard opens settings, changes preset, starts, moves, aims and opens pause', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /开启新的冒险/ })).toBeEnabled();
  await navigateTo(page, '设置');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: '游戏设置' })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel('控制方案')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('控制方案')).toHaveValue('keyboard');
  await page.keyboard.press('Escape');
  await navigateTo(page, '开启新的冒险');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/game$/);
  const state = () =>
    page.evaluate(async () => {
      const m = await import('/src/pages/GamePage/runtime/store.ts');
      return m.getGameSnap();
    });
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  // The opening cinematic can finish after assets load; do not send movement before dialogue.
  await expect.poll(async () => (await state()).mode.kind).toBe('dialogue');
  for (let n = 0; n < 20 && (await state()).mode.kind === 'dialogue'; n++)
    await page.keyboard.press('Enter');
  await expect.poll(async () => (await state()).mode.kind).toBe('explore');
  const before = (await state()).snapshot.position.x;
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyD');
  expect((await state()).snapshot.position.x).toBeGreaterThan(before + 20);
  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => (await state()).direction).toBe('up');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '旅途中歇' })).toBeVisible();
  await navigateTo(page, '设置');
  await page.keyboard.press('Enter');
  await expect(page.getByText('本次冒险难度 · 简单')).toBeVisible();
  await expect(page.getByLabel('控制方案')).toBeVisible();
  // Closed key bindings must not trap arrow navigation on invisible controls.
  const size = page.getByLabel('正文字号');
  for (let i = 0; i < 25 && !(await size.evaluate((el) => el === document.activeElement)); i++)
    await page.keyboard.press('ArrowDown');
  await expect(size).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(size).toHaveValue('21');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '继续游戏' })).toBeVisible();
  await navigateTo(page, '继续游戏');
  await page.keyboard.press('Enter');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(150);
  // Headless Chromium keeps background pages focused; exercise the blur event boundary.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(async () => (await state()).mode.kind).toBe('paused');
  const blurred = (await state()).snapshot;
  await page.keyboard.up('KeyD');
  await navigateTo(page, '继续游戏');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  expect((await state()).snapshot.position).toEqual(blurred.position);
});
