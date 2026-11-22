import { expect, test } from '@playwright/test';
import { zalogujJako } from './pomocnicze';

test('login.gov.pl → metoda → persona → zgoda → pobrane dane ze źródłami → ankieta', async ({ page }) => {
  await page.goto('/logowanie');
  await expect(page.getByRole('heading', { level: 1, name: 'Zaloguj się (symulacja)' })).toBeVisible();
  await zalogujJako(page, 'anna-etat');
  await expect(page.getByRole('heading', { level: 2, name: 'Pobieramy dane' })).toBeVisible();
  await expect(page.locator('[data-grupa-zrodla="ezus"]')).toBeVisible();
  await expect(page.locator('[data-grupa-zrodla="mobywatel"]')).toBeVisible();
  await expect(page.locator('[data-brakuje]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Dalej: Moja sytuacja' }).click();
  await expect(page).toHaveURL(/\/sytuacja$/);
  // Ankieta zaczyna się od razu od pierwszego pytania (bez znaczników źródła – decyzja 22.11).
  await expect(page.locator('section[data-ekran="pytania"]')).toBeVisible();
});

test('lista person ma przycisk na każdą personę i nie przewija się w poziomie', async ({ page }) => {
  await page.goto('/logowanie');
  await page.locator('[data-metoda="profil-zaufany"]').click();
  await page.locator('[data-logowanie-dalej]').click();
  await expect(page.locator('[data-persona]').first()).toBeVisible();
  expect(await page.locator('[data-persona]').count()).toBeGreaterThanOrEqual(3);
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(sw).toBeLessThanOrEqual(cw);
});

test('gdy usługa odpowiada 501, grupy biorą się z danych persony', async ({ page }) => {
  await page.route('**/api/mock/ezus/**', (r) => r.fulfill({ status: 501, json: { blad: 'brak' } }));
  await zalogujJako(page, 'anna-etat');
  await expect(page.locator('[data-grupa-zrodla="ezus"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dalej: Moja sytuacja' })).toBeEnabled();
});

test('bez zgody na pobranie danych: przejście do ręcznego wpisywania', async ({ page }) => {
  await page.goto('/logowanie');
  await page.locator('[data-metoda="mobywatel"]').click();
  await page.locator('[data-logowanie-dalej]').click();
  await page.locator('[data-persona="anna-etat"]').click();
  await page.locator('[data-zgoda="nie"]').click();
  await expect(page).toHaveURL(/\/sytuacja$/);
});

test('„Kontynuuj bez logowania” prowadzi do ankiety', async ({ page }) => {
  await page.goto('/logowanie');
  await page.locator('[data-bez-logowania]').click();
  await expect(page).toHaveURL(/\/sytuacja$/);
});
