import { test, expect, type Page } from '@playwright/test';
async function snapshot(page: Page) {
  return page.evaluate(async () =>
    (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap()!,
  );
}
async function fixture(page: Page, id: string, x: number, y: number, missing: string[] = []) {
  await page.evaluate(
    async ({ id, x, y, missing }) => {
      const { getGameSnap, setGame } = await import('/src/pages/GamePage/runtime/store.ts');
      const { createGame } = await import('/src/pages/GamePage/functions/progression.ts');
      const { maps, regions } = await import('/src/pages/GamePage/objects/content.ts');
      const { setSettings } = await import('/src/features/settings/store.ts');
      setSettings({ preset: 'keyboard', autosave: false });
      const s = getGameSnap()!.snapshot;
      setGame(
        createGame({
          ...s,
          mapId: id,
          checkpoint: id,
          stage: 'cleared',
          position: { x, y },
          completed: maps.flatMap((m) => (m.encounter ? [m.encounter] : [])),
          unlocked: ['glm', 'gpt', 'claude'],
          supports: ['claude', 'gpt'],
          exploration: {
            visited: maps.map((m) => m.id),
            flags: regions
              .flatMap((r) => r.points.map((p) => p.id))
              .filter((p) => !missing.includes(p)),
            collected: [],
          },
        }),
      );
    },
    { id, x, y, missing },
  );
}
async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}
test('sealed routes stop real movement and permit ladder, lift and destruction travel', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  await fixture(page, 'rain', 208, 380, ['thorns']);
  await hold(page, 'KeyW', 900);
  expect((await snapshot(page)).snapshot.position.y).toBeGreaterThan(344);
  await page.keyboard.press('ArrowUp');
  await hold(page, 'KeyJ', 250);
  expect((await snapshot(page)).snapshot.exploration!.flags).toContain('thorns');
  await hold(page, 'KeyW', 650);
  expect((await snapshot(page)).snapshot.position.y).toBeLessThan(240);
  await page.screenshot({ path: '../.local/gates-rain.png' });
  await fixture(page, 'dock', 208, 320, ['dock-ladder', 'dock-down', 'sluice']);
  await hold(page, 'KeyW', 650);
  expect((await snapshot(page)).snapshot.position.y).toBeGreaterThan(264);
  await page.keyboard.press('KeyF');
  expect((await snapshot(page)).snapshot.position.y).toBe(160);
  await page.screenshot({ path: '../.local/gates-dock.png' });
  await page.keyboard.press('KeyF');
  expect((await snapshot(page)).snapshot.position.y).toBe(400);
  await fixture(page, 'dock', 800, 480, ['sluice']);
  await page.keyboard.press('KeyF');
  await hold(page, 'ControlLeft', 250); // finish any switch explanation
  await expect.poll(async () => (await snapshot(page)).mode.kind).toBe('explore');
  expect((await snapshot(page)).snapshot.exploration!.flags).toContain('sluice');
  await hold(page, 'KeyD', 3000);
  expect((await snapshot(page)).snapshot.mapId).toBe('warehouse');
  await fixture(page, 'icehall', 820, 480, ['ice-lift', 'ice-seal']);
  await hold(page, 'KeyD', 800);
  expect((await snapshot(page)).snapshot.position.x).toBeLessThan(852);
  await fixture(page, 'icehall', 352, 480, ['ice-lift', 'ice-seal']);
  await page.keyboard.press('KeyF');
  expect((await snapshot(page)).snapshot.position).toEqual({ x: 1040, y: 320 });
  await hold(page, 'KeyW', 600);
  expect((await snapshot(page)).snapshot.position.y).toBeGreaterThan(264);
  await page.keyboard.press('ArrowUp');
  await hold(page, 'KeyJ', 250);
  expect((await snapshot(page)).snapshot.exploration!.flags).toContain('ice-seal');
  await hold(page, 'KeyW', 500);
  expect((await snapshot(page)).snapshot.position.y).toBeLessThan(190);
  await page.screenshot({ path: '../.local/gates-icehall.png' });
  await fixture(page, 'icehall', 1120, 320, ['ice-down']);
  await page.keyboard.press('KeyF');
  expect((await snapshot(page)).snapshot.position).toEqual({ x: 352, y: 480 });
  expect(errors).toEqual([]);
});
