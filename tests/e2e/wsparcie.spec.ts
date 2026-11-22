import { expect, test } from '@playwright/test';
import { TRUDNE_SYTUACJE } from '../../src/content/trudneSytuacje';
import { inneWsparcieDla } from '../../src/content/inneWsparcie';

test('trudne sytuacje: nagłówek, link do zus.pl, odpis aktu (symulacja)', async ({ page }) => {
  await page.goto('/trudne-sytuacje');
  await expect(page.getByRole('heading', { level: 1, name: 'Trudne sytuacje' })).toBeVisible();
  await expect(page.locator('main a[href*="zus.pl"]').first()).toBeVisible();
  await expect(page.locator('[data-sytuacja]')).toHaveCount(TRUDNE_SYTUACJE.length);

  const przycisk = page.getByRole('button', { name: 'Złóż wniosek o odpis aktu urodzenia (symulacja)' });
  await przycisk.click();
  await expect(page.locator('[data-stan="zlozono-symulacja"]')).toBeVisible();
});

test('trudne sytuacje: karta rozwija się, organizacje mają linki w nowej karcie', async ({ page }) => {
  await page.goto('/trudne-sytuacje');
  const karta = page.locator('[data-sytuacja="martwe"]');
  await karta.locator('summary').click();
  await expect(karta.getByRole('heading', { name: 'Co przysługuje' })).toBeVisible();
  await expect(karta.getByRole('heading', { name: 'Co można zrobić' })).toBeVisible();
  const org = karta.locator('[data-organizacja] a').first();
  await expect(org).toHaveAttribute('target', '_blank');
  await expect(org).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(org).toContainText('(otwiera się w nowej karcie)');
});

test('inne wsparcie: karty świadczeń z linkami', async ({ page }) => {
  await page.goto('/inne-wsparcie');
  await expect(page.getByRole('heading', { level: 1, name: 'Inne wsparcie' })).toBeVisible();
  await expect(page.locator('[data-wsparcie]')).toHaveCount(inneWsparcieDla([]).length);
  expect(await page.locator('[data-wsparcie]').count()).toBeGreaterThanOrEqual(4);
  const link = page.locator('[data-wsparcie] a').first();
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});
