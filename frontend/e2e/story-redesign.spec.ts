import { test, expect } from '@playwright/test';
test('new story dialogues fit the viewport and preserve mystery, reading and history controls', async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    HTMLElement.prototype.requestFullscreen = async () => {};
  });
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  for (const [width, height] of [
    [1440, 900],
    [960, 540],
  ]) {
    await page.evaluate(async () => {
      if (document.fullscreenElement) await document.exitFullscreen();
    });
    await page.setViewportSize({ width, height });
    for (const scene of ['2-1', '4-C1', '4-C2', '5-5']) {
      await page.evaluate(async (scene) => {
        const { getGameSnap, setGame } = await import('/src/pages/GamePage/runtime/store.ts');
        const { dialogueMode } = await import('/src/pages/GamePage/functions/progression.ts');
        const { sceneById } = await import('/src/pages/GamePage/objects/content.ts');
        const s = getGameSnap()!;
        const mapId = (
          { '2-1': 'harbor', '4-C1': 'snowline', '4-C2': 'outpost', '5-5': 'alley' } as Record<
            string,
            string
          >
        )[scene];
        const lines = sceneById(scene).lines;
        const index = lines.reduce(
          (best, l, i) => (l.text.length > lines[best].text.length ? i : best),
          0,
        );
        setGame({
          ...s,
          snapshot: { ...s.snapshot, mapId },
          mode: { ...dialogueMode(scene, 'explore'), line: index, revealed: 1000, elapsed: 2 },
        });
      }, scene);
      await expect(page.getByText('按住 Ctrl 快进', { exact: false })).toBeVisible();
      const bounds = await page.getByText('按住 Ctrl 快进', { exact: false }).boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
      expect(await page.locator('section').innerText()).not.toContain('//');
      await page.screenshot({ path: `../.local/story-${scene}-${width}.png` });
    }
  }
  expect(errors).toEqual([]);
});
