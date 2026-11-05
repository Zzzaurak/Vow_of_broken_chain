import { test, expect, type Page } from '@playwright/test';
import type { ProgressResponse } from '../src/apis/AdventureService/types';
const state = (page: Page) =>
  page.evaluate(async () => {
    const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
    return getGameSnap();
  });
async function save(page: Page, slot: number) {
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/saveprogress') && r.request().postDataJSON().slot === slot,
  );
  await page.getByRole('button', { name: `存 ${slot}`, exact: true }).click();
  const result = await response;
  expect(result.ok()).toBe(true);
  await expect(page.getByRole('status').filter({ hasText: '进度已保存' })).toBeVisible();
  return (await result.json()) as ProgressResponse;
}
async function openSaves(page: Page) {
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page))?.mode.kind).toBe('paused');
  await page.getByRole('button', { name: '存读档', exact: true }).click();
}
test('rollback restores resources and failed manual saves retry the identical request', async ({
  page,
}) => {
  const requests: unknown[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/saveprogress')) requests.push(r.postDataJSON());
  });
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  for (let i = 0; i < 40 && (await state(page))?.mode.kind === 'dialogue'; i++)
    await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page))?.mode.kind).toBe('explore');
  await expect(page.getByText('进度已保存', { exact: true }).first()).toBeVisible();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyD');
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.5, { button: 'right' });
  await expect
    .poll(async () => (await state(page))?.snapshot.cooldowns.water ?? 0)
    .toBeGreaterThan(0);
  await openSaves(page);
  const source = (await save(page, 1)).save.snapshot;
  expect(source.mp).toBeLessThan(100);
  expect(source.cooldowns.water).toBeGreaterThan(0);
  await page.getByRole('button', { name: '旅途', exact: true }).click();
  await page.getByRole('button', { name: '继续游戏', exact: true }).click();
  await expect.poll(async () => (await state(page))?.mode.kind).toBe('explore');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyD');
  await openSaves(page);
  const advanced = (await save(page, 2)).save.snapshot;
  expect(advanced.position.x).toBeGreaterThan(source.position.x);
  expect(advanced.cooldowns.water).toBeLessThan(source.cooldowns.water);
  const count = requests.length;
  const loading = page.waitForResponse((r) => r.url().endsWith('/loadadventure'));
  await page.getByRole('button', { name: /手动 1 ·/ }).click();
  const response = await loading;
  expect(response.ok()).toBe(true);
  expect(((await response.json()) as ProgressResponse).save.snapshot).toEqual(source);
  await expect.poll(async () => (await state(page))?.mode.kind).toBe('explore');
  await openSaves(page);
  const loaded = (await state(page))!.snapshot;
  const elapsed = loaded.playSeconds - source.playSeconds;
  expect(elapsed).toBeLessThan(1);
  expect(loaded.position).toEqual(source.position);
  expect(loaded.hp).toEqual(source.hp);
  expect(loaded.mp).toBeCloseTo(Math.min(100, source.mp + elapsed * 2), 5);
  expect(loaded.cooldowns.water).toBeCloseTo(Math.max(0, source.cooldowns.water - elapsed), 5);
  expect(loaded.completed).toEqual(source.completed);
  await page.waitForTimeout(300);
  expect(requests).toHaveLength(count);
  let fail = true;
  await page.route('**/api/AdventureService/saveprogress', async (route) => {
    if (fail) {
      fail = false;
      const committed = await route.fetch();
      expect(committed.ok()).toBe(true);
      await route.abort();
    } else await route.continue();
  });
  const beforeFailure = (await state(page))!.snapshot;
  await page.getByRole('button', { name: '存 3', exact: true }).click();
  await expect(page.getByRole('button', { name: '重试同一次请求' })).toBeVisible();
  expect((await state(page))!.snapshot).toEqual(beforeFailure);
  const original = requests.at(-1);
  const retried = page.waitForResponse((r) => r.url().endsWith('/saveprogress'));
  await page.getByRole('button', { name: '重试同一次请求' }).click();
  expect((await retried).ok()).toBe(true);
  await expect(page.getByRole('status').filter({ hasText: '进度已保存' })).toBeVisible();
  expect(requests.at(-1)).toEqual(original);
  expect(requests).toHaveLength(count + 2);
});
