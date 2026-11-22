import { expect, test } from '@playwright/test';
import { PRZYKLAD_PLAN, PRZYKLAD_WALIDACJA } from '../../src/mocks/przyklad';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

const PROFIL = { ...PROFIL_ANNY, plany: [PRZYKLAD_PLAN], wybranyPlanId: PRZYKLAD_PLAN.id };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/plan/validate', (r) => r.fulfill({ json: PRZYKLAD_WALIDACJA }));
  // Znany błąd toru A: /api/plan/shift zwraca 500, więc odpowiedź podstawiamy; sprawdzamy to, co wysyła UI.
  await page.route('**/api/plan/shift', (r) => r.fulfill({ json: { plan: PRZYKLAD_PLAN, walidacja: PRZYKLAD_WALIDACJA } }));
});

test('poród 11 dni wcześniej: api.przesunPlan z poprzednią datą, komunikat i karty', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL);
  await page.goto('/plan');
  await page.getByRole('button', { name: 'Dziecko się urodziło' }).click();
  await page.getByLabel('Data porodu').fill('2026-11-20');
  const z = page.waitForRequest((r) => r.url().endsWith('/api/plan/shift'));
  await page.getByRole('button', { name: 'Przelicz plan' }).click();
  const cialo = (await z).postDataJSON();
  expect(cialo.poprzedniaData).toBe('2026-12-01');
  expect(cialo.rodzina.zdarzenie).toMatchObject({ data: '2026-11-20', przewidywana: false });
  await expect(page.getByText(/Plan, terminy i kwoty liczymy od/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Dane dziecka z rejestru stanu cywilnego/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gotowy wniosek do potwierdzenia' })).toBeVisible();
  await expect(page.getByRole('link', { name: /dokumenty/i }).first()).toHaveAttribute('href', '/dokumenty');
  await expect(page.getByRole('button', { name: 'Dziecko się urodziło' })).toHaveCount(0);
});

test('data w przyszłości: kod błędu i brak zapytania', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL);
  let wyslano = false;
  await page.route('**/api/plan/shift', (r) => {
    wyslano = true;
    return r.abort();
  });
  await page.goto('/plan');
  await page.getByRole('button', { name: 'Dziecko się urodziło' }).click();
  await page.getByLabel('Data porodu').fill('2099-01-01');
  await page.getByRole('button', { name: 'Przelicz plan' }).click();
  await expect(page.locator('[data-kod-bledu="DATA_W_PRZYSZLOSCI"]')).toBeVisible();
  expect(wyslano).toBe(false);
});

test('rejestr i wniosek: 501 → spokojny komunikat „w przygotowaniu”', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL);
  await page.route('**/api/mock/rsc/**', (r) => r.fulfill({ status: 501, json: { blad: 'x' } }));
  await page.route('**/api/forms/ZAM', (r) => r.fulfill({ status: 501, json: { blad: 'x' } }));
  await page.goto('/plan');
  await page.getByRole('button', { name: 'Dziecko się urodziło' }).click();
  await page.getByLabel('Data porodu').fill('2026-11-20');
  await page.getByRole('button', { name: 'Przelicz plan' }).click();
  await expect(page.locator('[data-karta="rejestr"]')).toHaveAttribute('data-stan', 'niegotowe');
  await page.getByRole('button', { name: 'Pobierz wniosek do wydruku' }).click();
  await expect(page.locator('[data-karta="wniosek"] [data-stan="niegotowe"]')).toBeVisible();
});

test('plan z datą faktyczną nie ma przycisku', async ({ page }) => {
  const rodzina = { ...PROFIL_ANNY.rodzina!, zdarzenie: { ...PROFIL_ANNY.rodzina!.zdarzenie, przewidywana: false } };
  await wstrzyknijProfil(page, { ...PROFIL, rodzina });
  await page.goto('/plan');
  await expect(page.getByRole('heading', { name: 'Plan urlopów' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dziecko się urodziło' })).toHaveCount(0);
});
