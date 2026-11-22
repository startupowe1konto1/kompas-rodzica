import { expect, test } from '@playwright/test';
import { PRZYKLAD_PLAN, PRZYKLAD_WALIDACJA } from '../../src/mocks/przyklad';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

test('planer: oś schowana na telefonie, rozwinięta na komputerze; lista okresów jest zawsze', async ({ page }, info) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/plan');
  await expect(page.getByRole('heading', { level: 1, name: 'Plan urlopów' })).toBeVisible();
  await expect(page.locator('[data-okres]').first()).toBeVisible();
  const przelacznik = page.locator('[data-przelacznik-osi]');
  if (info.project.name === 'telefon') {
    await expect(przelacznik).toHaveText('Pokaż oś czasu');
    await expect(przelacznik).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('[data-okno-od]')).toHaveCount(0);
  } else {
    await expect(przelacznik).toHaveText('Ukryj oś czasu');
    await expect(przelacznik).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-okno-od]')).toBeVisible();
  }
  // Nie ma już przełącznika „Oś czasu / Lista”.
  await expect(page.getByRole('button', { name: 'Lista', exact: true })).toHaveCount(0);
});

test('planer: przycisk osi rozwija i zwija ją, a link do porównania jest na dole', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/plan');
  const przelacznik = page.locator('[data-przelacznik-osi]');
  await expect(przelacznik).toHaveAttribute('aria-expanded', /true|false/);
  if ((await przelacznik.getAttribute('aria-expanded')) === 'true') await przelacznik.click();
  await expect(page.locator('[data-okno-od]')).toHaveCount(0);
  await przelacznik.click();
  await expect(przelacznik).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-okno-od]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Porównaj warianty' })).toHaveAttribute('href', '/plan/porownanie');
});

test('planer: „Zmień” rozwija panel pod okresem, „Zwiń” go zwija, a okres zostaje na liście', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/plan');
  const okres = page.locator('[data-okres]').first();
  await expect(page.locator('[data-slot="panel-akcji"]')).toHaveCount(0);
  await okres.getByRole('button', { name: /^Zmień:/ }).click();
  await expect(page.locator('[data-okres][data-wybrany="true"]')).toHaveCount(1);
  await expect(okres.locator('[data-slot="panel-akcji"]')).toBeVisible();
  await expect(okres.getByRole('button', { name: /^Zwiń:/ })).toHaveAttribute('aria-expanded', 'true');
  await okres.getByRole('button', { name: /^Zwiń:/ }).click();
  await expect(page.locator('[data-slot="panel-akcji"]')).toHaveCount(0);
  await expect(okres).toBeVisible();
  await expect(okres.getByRole('button', { name: /^Zmień:/ })).toHaveAttribute('aria-expanded', 'false');
});

test('planer: błąd walidacji (500) nie chowa planu i da się ponowić', async ({ page }) => {
  let proby = 0;
  await page.route('**/api/plan/validate', (r) => {
    proby += 1;
    return proby === 1 ? r.fulfill({ status: 500, json: { blad: 'x' } }) : r.fulfill({ json: PRZYKLAD_WALIDACJA });
  });
  await wstrzyknijProfil(page, { ...PROFIL_ANNY, plany: [PRZYKLAD_PLAN], wybranyPlanId: PRZYKLAD_PLAN.id });
  await page.goto('/plan');
  await expect(page.locator('[data-stan="walidacja-niedostepna"]')).toBeVisible();
  await expect(page.locator('[data-okres]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Spróbuj ponownie' }).click();
  await expect(page.locator('[data-stan="walidacja-niedostepna"]')).toHaveCount(0);
  await expect(page.locator('[data-slot="panel-walidacji"]')).toBeVisible();
});

test('planer: bez profilu pokazuje „Zacznij od początku”', async ({ page }) => {
  await page.goto('/plan');
  await expect(page.getByRole('link', { name: 'Zacznij od początku' })).toBeVisible();
});

test('planer (telefon): #wybor-{kod} przewija do karty decyzji i ją wyróżnia, bez sekcji „Twoje możliwości”', async ({ page }, info) => {
  test.skip(info.project.name !== 'telefon', 'oś jest domyślnie zwinięta tylko na telefonie');
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/plan#wybor-wariant_815');
  await expect(page.locator('[data-przelacznik-osi]')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('heading', { name: 'Twoje możliwości' })).toHaveCount(0);
  await expect(page.locator('li[id^="wybor-"]')).toHaveCount(0);
  const karta = page.locator('#decyzja-wariant_815');
  await expect(karta).toHaveAttribute('data-wybrany', 'true');
  await expect(karta).toBeInViewport();
  await expect(page.locator('[data-decyzja="wariant_815"]')).toHaveCount(1);
});
