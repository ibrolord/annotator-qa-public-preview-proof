import { expect, test } from '@playwright/test';

test('annual checkout is broken before the Annotator QA fix', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Annual' }).click();
  await page.locator('button[data-plan="annual"]').click();

  await expect(page.getByRole('dialog', { name: 'Stripe checkout' })).toHaveCount(0);
  expect(consoleErrors.join('\n')).toContain('Annual checkout failed');
});
