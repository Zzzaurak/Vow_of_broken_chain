import { test, expect } from '@playwright/test';
test('keyboard can swap bindings, save each preset independently and restore settings after refresh', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByLabel('控制方案').selectOption('keyboard');
  await page.getByText('编辑按键', { exact: true }).click();
  await page.getByRole('button', { name: /肥鱼摆尾/ }).click();
  await page.keyboard.press('KeyK');
  await expect(page.getByRole('button', { name: '交换并应用' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '肥鱼摆尾 K', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '深海之力 J', exact: true })).toBeVisible();
  await page.getByLabel('控制方案').selectOption('mouse');
  await expect(page.getByRole('button', { name: '肥鱼摆尾 鼠标左键', exact: true })).toBeVisible();
  await page.getByLabel('控制方案').selectOption('keyboard');
  await page.reload();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByLabel('控制方案')).toHaveValue('keyboard');
  await page.getByText('编辑按键', { exact: true }).click();
  await expect(page.getByRole('button', { name: '肥鱼摆尾 K', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '游戏设置' })).not.toBeVisible();
});
test('malformed settings recover visibly and menu arrows can open settings', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('oath.settings.v1', '{"preset":"keyboard","textSpeed":"oops"}'),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('已恢复默认设置');
  const settings = page.getByRole('button', { name: '设置', exact: true });
  await settings.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: '游戏设置' })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: '知道了' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel('控制方案')).toBeFocused();
});

test('remapped menu controls adjust sliders and settings survive a game reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByLabel('总音量', { exact: true }).focus();
  const before = Number(await page.getByLabel('总音量', { exact: true }).inputValue());
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByLabel('总音量', { exact: true })).toHaveValue((before - 0.05).toFixed(2));
  await page.getByText('编辑按键', { exact: true }).click();
  await page.getByRole('button', { name: /菜单确认/ }).click();
  await page.keyboard.press('KeyN');
  await page.getByRole('button', { name: '应用新键', exact: true }).click();
  await page.getByRole('button', { name: '返回', exact: true }).focus();
  await page.keyboard.press('KeyN');
  await expect(page.getByRole('dialog', { name: '游戏设置' })).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByLabel('总音量', { exact: true })).toHaveValue((before - 0.05).toFixed(2));
  await page.getByRole('button', { name: '返回', exact: true }).focus();
  await page.keyboard.press('KeyN');
  await expect(page.getByRole('dialog', { name: '游戏设置' })).not.toBeVisible();
});
