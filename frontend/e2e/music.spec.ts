import { test, expect } from '@playwright/test';
test('generated tracks decode, switch by region and honor pause, mute and focus', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    const tracks: HTMLAudioElement[] = [];
    Object.assign(window, { testMusic: tracks });
    window.Audio = function (src?: string) {
      const audio = new NativeAudio(src);
      tracks.push(audio);
      return audio;
    } as typeof Audio;
  });
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  const playing = () =>
    page.evaluate(() => {
      const a = (window as unknown as { testMusic: HTMLAudioElement[] }).testMusic.at(-1)!;
      return { src: a?.src, paused: a?.paused, time: a?.currentTime, ready: a?.readyState };
    });
  await expect.poll(async () => (await playing()).time).toBeGreaterThan(0);
  for (const [map, track] of [
    ['lair', 'frost'],
    ['alley', 'reunion'],
    ['forest', 'battle'],
  ]) {
    await page.evaluate(
      async ({ map, track }) => {
        const { getGameSnap, setGame } = await import('/src/pages/GamePage/runtime/store.ts');
        const state = getGameSnap()!;
        const { beginBattle } = await import('/src/pages/GamePage/functions/progression.ts');
        const next = {
          ...state,
          snapshot: { ...state.snapshot, mapId: map },
          mode: { kind: 'explore' as const },
        };
        setGame(track === 'battle' ? beginBattle(next) : next);
      },
      { map, track },
    );
    await expect.poll(async () => (await playing()).src).toContain(`/${track}.mp3`);
    await expect.poll(async () => (await playing()).time).toBeGreaterThan(0);
  }
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await playing()).paused).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await playing()).paused).toBe(false);
  await page.evaluate(async () =>
    (await import('/src/features/settings/store.ts')).setSettings({ muted: true }),
  );
  await expect.poll(async () => (await playing()).paused).toBe(true);
  await page.evaluate(async () =>
    (await import('/src/features/settings/store.ts')).setSettings({ muted: false }),
  );
  await expect.poll(async () => (await playing()).paused).toBe(false);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(async () => (await playing()).paused).toBe(true);
});
