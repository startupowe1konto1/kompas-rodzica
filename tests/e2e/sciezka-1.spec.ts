import { expect, test } from '@playwright/test';
import { zalogujJako } from './pomocnicze';

/**
 * Ścieżka 1: persona „marta-i-piotr” → ankieta → wynik → plan → „Mama wraca…” → przejęcie przez tatę → kalendarz.
 * STUB DO ZDJĘCIA PO POPRAWCE TORU A: POST /api/plan/action zwraca dla tej persony 500
 * („Błąd serwera przy liczeniu wyniku.”), więc odpowiedź podstawiamy (kształt OdpowiedzAkcja z src/lib/api.ts,
 * komunikat OJCIEC_MUSI_PRZEJAC jak w src/engine/planner/walidacjaMacierzynski.ts). Test nadal sprawdza, co UI WYSYŁA
 * (typ akcji, tata jako przejmujący) i że UI pokazuje komunikat po kodzie. Po poprawce usuń blok „STUB” i
 * sprawdź, że prawdziwa odpowiedź ma status 200.
 */
test('ścieżka 1: mama wraca po obowiązkowych tygodniach, tata przejmuje', async ({ page, request }) => {
  // Serwer deweloperski kompiluje trasy przy pierwszym wejściu: dajemy zapas na każdą nawigację.
  test.setTimeout(120_000);
  const persony: { id: string }[] = await (await request.get('/api/mock/persony')).json();
  test.fixme(!persony.some((p) => p.id === 'marta-i-piotr'), 'czeka na personę marta-i-piotr (tor D, D1)');

  await zalogujJako(page, 'marta-i-piotr');
  await page.getByRole('button', { name: 'Dalej: Moja sytuacja' }).click();
  await expect(page).toHaveURL(/\/sytuacja$/, { timeout: 30_000 });

  // Ankieta: przeklikujemy „Dalej”, aż pojawi się „Zobacz wynik”.
  const zobaczWynik = page.getByRole('button', { name: 'Zobacz wynik', exact: true });
  const dalej = page.getByRole('button', { name: 'Dalej', exact: true });
  for (let i = 0; i < 60 && !(await zobaczWynik.isVisible()); i++) {
    await expect(dalej.or(zobaczWynik)).toBeVisible();
    if (await zobaczWynik.isVisible()) break;
    await dalej.click();
  }
  await zobaczWynik.click();
  await expect(page).toHaveURL(/\/wynik$/, { timeout: 30_000 });
  await expect(page.locator('[data-suma-razem]').first()).toBeVisible({ timeout: 15_000 });
  // Uprawnienia są w sekcji na cały ekran: otwieramy kafel, sprawdzamy i zamykamy (Esc) przed przejściem dalej.
  await page.locator('[data-kafel-sekcji="uprawnienia"]').click();
  await expect(page.getByRole('dialog').locator('[data-osoba-grupa]').first()).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('link', { name: 'Ułóż plan na osi czasu' }).click();
  await expect(page).toHaveURL(/\/plan$/, { timeout: 30_000 });

  // „Proponowane układy urlopów” są domyślnie zwinięte.
  await page.locator('[data-slot="scenariusze"] summary').click();
  // Zawężone do sekcji Scenariusze: ta sama fraza jest też na karcie decyzji („Pokaż na osi Mama wraca…”).
  const przycisk = page.locator('[data-slot="mama-wraca"]').getByRole('button', { name: /^Mama wraca po \d+ tygodniach$/ });
  await expect(przycisk).toBeEnabled({ timeout: 30_000 });
  const odpowiedz = page.waitForResponse((r) => r.url().endsWith('/api/plan/action'));
  const zapytanie = page.waitForRequest((r) => r.url().endsWith('/api/plan/action'));
  await przycisk.click();
  const akcja = (await zapytanie).postDataJSON().akcja;
  expect(akcja.typ).toBe('rezygnacja_matki');
  expect(akcja.przejmujeOsobaId).toBeTruthy();
  expect((await odpowiedz).status()).toBe(200);
  await expect(page.locator('[data-kod="OJCIEC_MUSI_PRZEJAC"]').first()).toBeVisible({ timeout: 15_000 });

  await page.goto('/kalendarz');
  await expect(page.locator('[data-termin]').first()).toBeVisible({ timeout: 30_000 });
});
