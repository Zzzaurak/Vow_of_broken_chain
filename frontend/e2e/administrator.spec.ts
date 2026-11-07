import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
test('administrator login enables invincibility and one-hit without bypassing story', async ({
  page,
}) => {
  const credentials = {
    username: 'admin_test_' + crypto.randomUUID().slice(0, 8),
    password: 'test-admin-password',
  };
  const session = await (
    await page.request.post('/api/PlayerService/createanonymousplayer', { data: {} })
  ).json();
  const registration = await page.request.post('/api/PlayerService/registeraccount', {
    data: credentials,
    headers: { Authorization: 'Bearer ' + session.token },
  });
  expect(registration.ok()).toBe(true);
  execFileSync('psql', [
    '-h',
    '127.0.0.1',
    '-p',
    '55439',
    '-U',
    'oath',
    '-d',
    'oath',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `UPDATE player_accounts SET is_admin=TRUE WHERE username='${credentials.username}'`,
  ]);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (d) => d.accept());
  await page.goto('/account');
  await page.getByLabel('用户名').fill(credentials.username);
  await page.getByLabel('密码').fill(credentials.password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap()?.administrator
            ?.authorized,
      ),
    )
    .toBe(true);
  await page.evaluate(async () => {
    const { getGameSnap, setGame } = await import('/src/pages/GamePage/runtime/store.ts');
    const { beginBattle } = await import('/src/pages/GamePage/functions/progression.ts');
    const { setSettings } = await import('/src/features/settings/store.ts');
    setSettings({ preset: 'keyboard' });
    const s = beginBattle({ ...getGameSnap()!, mode: { kind: 'explore' } });
    setGame({
      ...s,
      snapshot: { ...s.snapshot, position: { x: 500, y: 400 } },
      enemies: s.enemies.map((e) => ({
        ...e,
        position: { x: 540, y: 400 },
        phase: 'windup',
        timer: 0.01,
        aim: { x: -1, y: 0 },
      })),
      mode: { kind: 'paused', previous: { kind: 'battle' } },
    });
  });
  await page.getByLabel('无敌', { exact: true }).check();
  await page.getByLabel('秒杀', { exact: true }).check();
  await page.getByRole('button', { name: '继续游戏', exact: true }).click();
  await page.waitForTimeout(1800);
  expect(
    await page.evaluate(
      async () => (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap()!.snapshot.hp,
    ),
  ).toBe(100);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.down('KeyJ');
  await expect
    .poll(() =>
      page.evaluate(
        async () => (await import('/src/pages/GamePage/runtime/store.ts')).getGameSnap()!.mode.kind,
      ),
    )
    .toBe('cinematic');
  await page.keyboard.up('KeyJ');
  expect(errors).toEqual([]);
});
test('ordinary guest has no administrator controls and gradient is one tenth of HUD height', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  await page.evaluate(async () => {
    const { getGameSnap, setGame } = await import('/src/pages/GamePage/runtime/store.ts');
    setGame({ ...getGameSnap()!, mode: { kind: 'explore' } });
  });
  const ratio = await page
    .locator('[data-hud-gradient]')
    .evaluate(
      (el) => el.getBoundingClientRect().height / el.parentElement!.getBoundingClientRect().height,
    );
  expect(ratio).toBeCloseTo(0.1, 2);
  await page.keyboard.press('Escape');
  await expect(page.getByText('管理员调试', { exact: true })).toHaveCount(0);
});
test('pre-CG conversation reuses the ending map canvas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('正在准备旅途画面…', { exact: true })).toHaveCount(0);
  const same = await page.evaluate(async () => {
    const { getGameSnap } = await import('/src/pages/GamePage/runtime/store.ts');
    const { createGame, dialogueMode } =
      await import('/src/pages/GamePage/functions/progression.ts');
    const { loadImages } = await import('/src/pages/GamePage/runtime/assets.ts');
    const { drawGame } = await import('/src/pages/GamePage/runtime/draw.ts');
    const state = createGame({
      ...getGameSnap()!.snapshot,
      mapId: 'alley',
      checkpoint: 'alley',
      stage: 'ending',
    });
    const images = await loadImages();
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d')!;
    drawGame(ctx, { ...state, mode: dialogueMode('5-5', 'cg2') }, images);
    const before = canvas.toDataURL();
    drawGame(ctx, { ...state, mode: dialogueMode('6-3', 'finished') }, images);
    return before === canvas.toDataURL();
  });
  expect(same).toBe(true);
});
