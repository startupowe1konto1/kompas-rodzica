import { expect, test } from '@playwright/test';

// FAQ: link na dole każdej strony (stopka), strona z pytaniami. Treść dopisuje Oskar w src/components/faq/pytania.ts;
// dopóki lista jest pusta, strona mówi, że pytania są w przygotowaniu.
test('link FAQ w stopce prowadzi do strony z pytaniami', async ({ page }) => {
  await page.goto('/dostepnosc');
  await page.getByRole('contentinfo').getByRole('link', { name: /FAQ/ }).click();
  await expect(page).toHaveURL(/\/faq$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Najczęstsze pytania' })).toBeVisible();
  const pytania = page.locator('[data-faq-pytanie]');
  if ((await pytania.count()) === 0) {
    await expect(page.locator('[data-stan="faq-w-przygotowaniu"]')).toBeVisible();
  } else {
    // Odpowiedzi zwinięte; rozwinięcie pokazuje treść.
    const pierwsze = pytania.first();
    await expect(pierwsze.locator('[data-faq-odpowiedz]')).toBeHidden();
    await pierwsze.locator('summary').click();
    await expect(pierwsze.locator('[data-faq-odpowiedz]')).toBeVisible();
  }
});
