import { test, expect } from '@playwright/test';
test('retrying a lost start response reuses the operation and creates one adventure', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /开启新的冒险/ })).toBeEnabled();
  let dropped = false;
  const operations: string[] = [];
  await page.route('**/api/AdventureService/startadventure', async (route) => {
    operations.push(route.request().postDataJSON().operationId);
    if (!dropped) {
      dropped = true;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await page.getByRole('button', { name: '重试上次操作', exact: true }).click();
  await expect(page).toHaveURL(/\/game$/);
  expect(operations).toHaveLength(2);
  expect(operations[0]).toBe(operations[1]);
  const token = await page.evaluate(() => localStorage.getItem('oath.player-token.v1'));
  const response = await page.request.post('/api/AdventureService/listsaves', {
    headers: { Authorization: `Bearer ${token}` },
    data: {},
  });
  expect((await response.json()).adventures).toHaveLength(1);
});
