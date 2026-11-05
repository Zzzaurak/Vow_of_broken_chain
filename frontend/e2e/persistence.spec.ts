import { test, expect } from '@playwright/test';
test('new adventure is persisted and can be resumed after browser refresh', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '断链之誓' })).toBeVisible();
  await page.getByRole('button', { name: /开启新的冒险/ }).click();
  await expect(page).toHaveURL(/\/game$/);
  await expect(page.getByText(/东方圣殿长阶/).first()).toBeVisible();
  await page.goto('/');
  await page.reload();
  await page.getByRole('button', { name: /继续旅途/ }).click();
  await expect(page).toHaveURL(/\/game$/);
  await expect(page.getByText(/东方圣殿长阶/).first()).toBeVisible();
});
