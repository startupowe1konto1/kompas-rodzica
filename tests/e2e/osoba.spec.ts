import { expect, test, type Page } from '@playwright/test';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

const WYNIK_LACZNY = (page: Page) => page.getByRole('button', { name: 'Zobacz wynik łączny' });

/** Kafel roli jest cały klikalny, a pole radio jest ukryte wizualnie: klikamy kafel. */
const wybierzRole = (page: Page, nazwa: string) => page.locator('label', { has: page.getByRole('radio', { name: nazwa }) }).click();

async function zaznaczBrakUbezpieczenia(page: Page): Promise<void> {
  const brak = page.getByRole('checkbox', { name: /Nie mam teraz ubezpieczenia/ });
  if ((await brak.count()) > 0 && !(await brak.isChecked())) await page.locator('label', { has: brak }).click();
}

/** Klika „Dalej” aż do ekranu końcowego; przy pytaniu o ubezpieczenie wybiera „Nie mam teraz ubezpieczenia”. */
async function przejdzDoKonca(page: Page): Promise<void> {
  for (let i = 0; i < 60 && !(await WYNIK_LACZNY(page).isVisible()); i++) {
    await zaznaczBrakUbezpieczenia(page);
    await page.getByRole('button', { name: 'Dalej' }).click();
  }
  await expect(WYNIK_LACZNY(page)).toBeVisible();
}

test('dodaj tatę → plany domyślne liczone dla dwóch osób', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/osoba');
  await expect(page.getByRole('heading', { level: 1, name: 'Dodaj osobę' })).toBeVisible();
  await wybierzRole(page, 'Tata');
  await expect(page).toHaveURL(/\/osoba\?osoba=osoba-2$/);
  await przejdzDoKonca(page);
  const plany = page.waitForRequest((r) => r.url().endsWith('/api/plan/default'));
  await WYNIK_LACZNY(page).click();
  expect((await plany).postDataJSON().rodzina.osoby).toHaveLength(2);
  await expect(page).toHaveURL(/\/wynik$/);
  // Uprawnienia osób są w kaflu „Co przysługuje” (wynik w kaflach, 21.11).
  await page.locator('[data-kafel-sekcji="uprawnienia"]').click();
  await expect(page.getByRole('dialog').locator('[data-osoba-grupa]')).toHaveCount(2);
});

test('skrócona ankieta pyta tylko o nową osobę, nie o dziecko ani o pierwszą osobę', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/osoba');
  await wybierzRole(page, 'Tata');
  await expect(page.getByRole('button', { name: 'Dalej' })).toBeVisible();
  // Krok „Dziecko” (data porodu, zadana już Annie) nie wraca.
  for (let i = 0; i < 60 && !(await WYNIK_LACZNY(page).isVisible()); i++) {
    await expect(page.getByRole('heading', { name: 'Dziecko', exact: true })).toHaveCount(0);
    await zaznaczBrakUbezpieczenia(page);
    await page.getByRole('button', { name: 'Dalej' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Plan jest gotowy' })).toBeVisible();
  await expect(page.getByText('2 osoby')).toBeVisible();
});

test('dodaną osobę można usunąć; potem nie ma jej na liście ani w profilu', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/osoba');
  await wybierzRole(page, 'Mama');
  await expect(page).toHaveURL(/osoba=osoba-2/);
  await page.getByRole('button', { name: 'Zrezygnuj z dodawania' }).click();
  await expect(page).toHaveURL(/\/osoba$/);
  await expect(page.locator('[data-osoba-id]')).toHaveCount(0);

  // Dodajemy, wracamy do listy i usuwamy z potwierdzeniem.
  await wybierzRole(page, 'Tata');
  await przejdzDoKonca(page);
  await page.goto('/osoba');
  await expect(page.locator('[data-osoba-id="osoba-2"]')).toBeVisible();
  await page.getByRole('button', { name: /^Usuń:/ }).click();
  await page.getByRole('button', { name: 'Tak, usuń osobę' }).click();
  await expect(page.locator('[data-osoba-id]')).toHaveCount(0);
  const liczba = await page.evaluate(() => {
    const klucz = Object.keys(localStorage).find((k) => k.startsWith('zasilkowy-przewodnik'));
    return klucz ? JSON.parse(localStorage.getItem(klucz)!).rodzina.osoby.length : -1;
  });
  expect(liczba).toBe(1);
});

test('bez profilu: stan pusty z linkiem na start', async ({ page }) => {
  await page.goto('/osoba');
  await expect(page.getByRole('link', { name: 'Zacznij od początku' })).toBeVisible();
});
