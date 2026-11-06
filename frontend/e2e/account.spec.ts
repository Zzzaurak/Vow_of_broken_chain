import { test, expect } from '@playwright/test';
test('registering keeps guest progress, login recovers it in another browser and logout revokes the session', async ({
  page,
  browser,
}) => {
  const username = 'traveler_' + crypto.randomUUID().slice(0, 8),
    password = 'local-test-password';
  await page.goto('/');
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.goto('/');
  await page.getByRole('link', { name: /注册 \/ 登录/ }).click();
  await page.getByRole('button', { name: '注册新账号' }).click();
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '注册并保留存档' }).click();
  await expect(page.getByRole('link', { name: '账号 · ' + username })).toBeVisible();
  await expect(page.getByRole('button', { name: /继续旅途/ })).toBeVisible();
  const second = await browser.newContext();
  try {
    const other = await second.newPage();
    await other.goto('http://127.0.0.1:5179/');
    await other.getByRole('link', { name: /注册 \/ 登录/ }).click();
    await other.getByLabel('用户名').fill(username);
    await other.getByLabel('密码').fill('wrong-password');
    await other.getByRole('button', { name: '登录', exact: true }).click();
    await expect(other.getByRole('alert')).toContainText('用户名或密码错误');
    await other.getByLabel('密码').fill(password);
    await other.getByRole('button', { name: '登录', exact: true }).click();
    await expect(other.getByRole('button', { name: /继续旅途/ })).toBeVisible();
    await other.getByRole('button', { name: /继续旅途/ }).click();
    await expect(other.locator('canvas')).toBeVisible();
    const token = await other.evaluate(() => localStorage.getItem('oath.player-token.v1'));
    await other.goto('http://127.0.0.1:5179/account');
    await other.getByRole('button', { name: '退出登录' }).click();
    await expect(other.getByRole('link', { name: /游客/ })).toBeVisible();
    await expect(other.getByRole('button', { name: /继续旅途/ })).toHaveCount(0);
    expect(
      (
        await other.request.post('http://127.0.0.1:5179/api/AdventureService/listsaves', {
          data: {},
          headers: { Authorization: 'Bearer ' + token },
        })
      ).status(),
    ).toBe(401);
  } finally {
    await second.close();
  }
});
