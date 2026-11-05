import { test, expect, type Page } from '@playwright/test';
async function state(page: Page) {
  return page.evaluate(async () => {
    const module = await import('/src/pages/GamePage/runtime/store.ts');
    return module.getGameSnap();
  });
}
test('tutorial plays through real input and preserves its checkpoint through save/load', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.getByText('东方圣殿长阶·骤雨欲来', { exact: false })).toBeVisible();
  for (let i = 0; i < 20 && (await state(page))?.mode.kind === 'dialogue'; i++)
    await page.keyboard.press('Enter');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(2100);
  await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyF');
  expect((await state(page)).mode.kind).toBe('battle');
  const canvas = page.locator('canvas');
  const box = (await canvas.boundingBox())!;
  for (let attempt = 0; attempt < 80; attempt++) {
    const game = await state(page);
    if (game.mode.kind !== 'battle') break;
    const p = game.snapshot.position;
    const target = game.enemies
      .filter((e: any) => e.hp > 0)
      .sort(
        (a: any, b: any) =>
          Math.hypot(a.position.x - p.x, a.position.y - p.y) -
          Math.hypot(b.position.x - p.x, b.position.y - p.y),
      )[0];
    if (!target) break;
    const camera = {
      x: Math.max(0, Math.min(1280 - 960, p.x - 480)),
      y: Math.max(0, Math.min(768 - 540, p.y - 270)),
    };
    await page.mouse.move(
      box.x + ((target.position.x - camera.x) * box.width) / 960,
      box.y + ((target.position.y - camera.y) * box.height) / 540,
    );
    await page.mouse.down({ button: 'left' });
    if (attempt % 8 === 0) {
      await page.mouse.click(
        box.x + ((target.position.x - camera.x) * box.width) / 960,
        box.y + ((target.position.y - camera.y) * box.height) / 540,
        { button: 'right' },
      );
    }
    await page.waitForTimeout(140);
  }
  await page.mouse.up();
  expect((await state(page)).mode.kind).toBe('dialogue');
  for (let i = 0; i < 80 && (await state(page))?.mode.kind === 'dialogue'; i++)
    await page.keyboard.press('Enter');
  expect((await state(page)).snapshot.stage).toBe('cleared');
  await expect(page.getByText('进度已保存').first()).toBeVisible();
  await page.screenshot({ path: '../.local/tutorial-cleared.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '存读档', exact: true }).click();
  await page.getByRole('button', { name: '存 1', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '进度已保存' })).toBeVisible();
});
