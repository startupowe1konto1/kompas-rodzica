import { expect, test, type Page } from '@playwright/test';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

async function otworz(page: Page, id: string) {
  await page.locator(`[data-kafel-sekcji="${id}"]`).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function zamknij(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
}

test('wybory tylko dostępne; dokument w „Później”; ryzyko z kodem', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik');
  const wybory = await otworz(page, 'wybory');
  await expect(wybory.locator('[data-kod="wariant_815"][data-dostepna="true"]')).toBeVisible();
  // Niedostępnych wyborów nie ma na liście, jest tylko jedna linia z ich liczbą.
  await expect(wybory.locator('[data-dostepna="false"]')).toHaveCount(0);
  await expect(wybory.locator('[data-kod="rezygnacja_matki_i_przejecie"]')).toHaveCount(0);
  await expect(wybory.locator('[data-niedostepne]')).toContainText(/niedostępn/);
  await zamknij(page);
  const dokumenty = await otworz(page, 'dokumenty');
  await expect(dokumenty.locator('[data-kod="wniosek_rodzicielski"]')).toHaveAttribute('data-status', 'pozniej');
  await zamknij(page);
  const ryzyka = await otworz(page, 'ryzyka');
  await expect(ryzyka.locator('[data-kod="TERMIN_815"]')).toBeVisible();
});

test('ryzyko: trzy części i bez czerwieni; wybór: link na oś z kodem', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik');
  const dialogRyzyk = await otworz(page, 'ryzyka');
  const ryzyko = dialogRyzyk.locator('[data-kod="TERMIN_815"]');
  await expect(ryzyko.getByText('Co może się stać')).toBeVisible();
  await expect(ryzyko.getByText('Dlaczego', { exact: true })).toBeVisible();
  await expect(ryzyko.getByText('Co można zrobić')).toBeVisible();
  await zamknij(page);
  const dialogWyborow = await otworz(page, 'wybory');
  const wybor = dialogWyborow.locator('[data-kod="wariant_815"]');
  await expect(wybor.getByText('Dostępne', { exact: true })).toBeVisible();
  await expect(wybor.getByRole('heading', { level: 4, name: 'Co się wtedy stanie' })).toBeVisible();
  await expect(wybor.getByRole('link', { name: 'Zobacz na osi czasu' })).toHaveAttribute('href', '/plan#wybor-wariant_815');
});

test('dokumenty: grupa „Później”, bez pustych grup, link do wszystkich', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik');
  const sekcja = await otworz(page, 'dokumenty');
  await expect(sekcja.getByRole('heading', { level: 3, name: 'Później' })).toBeVisible();
  await expect(sekcja.getByRole('heading', { level: 3, name: 'Termin minął' })).toHaveCount(0);
  await expect(sekcja.getByRole('link', { name: 'Wszystkie dokumenty' })).toHaveAttribute('href', '/dokumenty');
  await expect(sekcja.locator('[data-kod="wniosek_rodzicielski"]')).toContainText('2027');
});

test('dokumenty „teraz”: komunikat z terminem; wniosek płatnika bez przycisku PDF', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.route('**/api/documents', async (route) => {
    const odp = await route.fetch();
    const json = await odp.json();
    json.dokumenty = [
      ...json.dokumenty,
      { kod: 'ZAM', nazwa: 'Zaświadczenie', ktoSklada: 'mama', gdzie: 'ZUS', termin: '2026-12-10', status: 'teraz', zalaczniki: [], moznaWygenerowac: true },
      { kod: 'Z-3', nazwa: 'Zaświadczenie płatnika', ktoSklada: 'platnik', gdzie: 'platnik', status: 'teraz', zalaczniki: [], moznaWygenerowac: false },
    ];
    await route.fulfill({ response: odp, json });
  });
  await page.goto('/wynik');
  const sekcja = await otworz(page, 'dokumenty');
  await expect(sekcja.getByRole('heading', { level: 3, name: 'Do złożenia teraz' })).toBeVisible();
  await expect(sekcja.locator('[data-kod="ZAM"] time')).toHaveAttribute('datetime', '2026-12-10');
  await expect(sekcja.locator('[data-kod="Z-3"]')).toContainText('płatnik');
  await expect(sekcja.locator('[data-kod="Z-3"]').getByRole('button')).toHaveCount(0);
});
