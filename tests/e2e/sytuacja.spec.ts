import { expect, test } from '@playwright/test';
import { pustaRodzina } from '../../src/components/start/zrodla-startu';
import type { StanProfilu } from '../../src/state/magazyn';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

test('kwota ujemna → błąd z kodem przy polu', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/sytuacja');
  await expect(page.getByRole('heading', { level: 1, name: 'Moja sytuacja' })).toBeAttached();
  const pole = page.getByLabel(/Jakie jest miesięczne wynagrodzenie brutto z tej umowy/i).first();
  for (let i = 0; i < 60 && !(await pole.isVisible()); i++) await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(pole).toBeVisible();
  await pole.fill('-5');
  await pole.blur();
  await expect(page.locator('[data-kod-bledu="KWOTA_UJEMNA"]')).toBeVisible();
  await expect(pole).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(pole).toBeVisible(); // z błędem nie przechodzimy dalej
  await pole.fill('8000');
  await expect(page.locator('[data-kod-bledu]')).toHaveCount(0);
  await expect(pole).not.toHaveAttribute('aria-invalid', 'true');
});

test('postęp „N z M” i przyklejony „Dalej”', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/sytuacja');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuetext', /(Pytanie|Krok) \d+ z \d+/);
  const dalej = await page.getByRole('button', { name: 'Dalej' }).boundingBox();
  const wysokosc = page.viewportSize()!.height;
  expect(dalej!.y + dalej!.height).toBeGreaterThan(wysokosc - 100); // przyklejony do dołu okna (telefon i komputer)
});

test('przy pytaniach nie ma znaczników źródła, a odpowiedź z profilu jest wypełniona', async ({ page }) => {
  await wstrzyknijProfil(page, {
    ...PROFIL_ANNY,
    pochodzenie: [{ sciezka: 'osoby[0].tytuly[0]', zrodlo: 'ezus' }],
  });
  await page.goto('/sytuacja');
  const pole = page.getByLabel(/Jakie jest miesięczne wynagrodzenie brutto z tej umowy/i).first();
  for (let i = 0; i < 60 && !(await pole.isVisible()); i++) await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(pole).not.toHaveValue('');
  await expect(page.locator('[data-zrodlo]')).toHaveCount(0);
  await pole.fill('9000');
  await expect(page.locator('[data-zrodlo]')).toHaveCount(0);
});

test('profil z persony przechodzi ankietę do ekranu „Plan jest gotowy” i wyniku', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/sytuacja');
  for (let i = 0; i < 60 && !(await page.getByRole('button', { name: 'Zobacz wynik' }).isVisible()); i++) {
    await page.getByRole('button', { name: 'Dalej' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Plan jest gotowy' })).toBeVisible();
  await page.getByRole('button', { name: 'Zobacz wynik' }).click();
  await expect(page).toHaveURL(/\/wynik$/);
});

// ───────── T1.3b: odpowiedzi do potwierdzenia i kilka umów ─────────

/** Profil jak po „Wpisz dane ręcznie”: pusta rodzina, rola i zdarzenie czekają na potwierdzenie. */
const PROFIL_PUSTY: Partial<StanProfilu> = (() => {
  const p = pustaRodzina('2026-11-21');
  return { rodzina: p.rodzina, doPotwierdzenia: p.doPotwierdzenia };
})();

// Wartości startowe pustego profilu (decyzja Wojtka 21.11): przy ręcznym wpisywaniu nic nie jest zaznaczone,
// rodzic wybiera sam; „Do sprawdzenia” zostaje tylko dla danych z usług (eZUS, mObywatel – symulacja).
test('rola startowa bez zaznaczenia: „Dalej” wymaga wyboru', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_PUSTY);
  await page.goto('/sytuacja');
  const mama = page.getByRole('radio', { name: 'Mamą' });
  await expect(mama).toBeVisible();
  await expect(mama).not.toBeChecked();
  await expect(page.getByText('Do sprawdzenia', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(page.locator('[data-kod-bledu="WYMAGANE"]').first()).toBeVisible();
  await expect(mama).toBeVisible(); // z błędem nie przechodzimy dalej
  await mama.check({ force: true });
  await expect(mama).toBeChecked();
  await expect(page.locator('[data-kod-bledu="WYMAGANE"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(mama).toHaveCount(0); // poszliśmy dalej
});

test('rola startowa: wybór innej roli przechodzi dalej', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_PUSTY);
  await page.goto('/sytuacja');
  await page.getByRole('radio', { name: 'Tatą' }).check({ force: true });
  await expect(page.locator('[data-do-potwierdzenia]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(page.getByRole('radio', { name: 'Tatą' })).toHaveCount(0);
});

test('druga umowa: dodaj i usuń', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/sytuacja');
  const dodaj = page.getByRole('button', { name: 'Dodaj kolejną umowę lub działalność' });
  for (let i = 0; i < 60 && !(await dodaj.isVisible()); i++) await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(page.getByRole('button', { name: /Usuń tę umowę/ })).toHaveCount(1);
  await dodaj.click();
  await expect(page.getByRole('button', { name: /Usuń tę umowę/ })).toHaveCount(2);
  await expect(page.getByRole('group', { name: 'Umowa o pracę 2' })).toBeVisible();
  await page.getByRole('button', { name: /Usuń tę umowę: Umowa o pracę 1/ }).click();
  await expect(page.getByRole('button', { name: /Usuń tę umowę/ })).toHaveCount(1);
  await expect(page.getByRole('group', { name: 'Umowa o pracę 1' })).toBeVisible();
});

test('„Nie mam teraz ubezpieczenia” zdejmuje wszystkie umowy', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/sytuacja');
  const dodaj = page.getByRole('button', { name: 'Dodaj kolejną umowę lub działalność' });
  for (let i = 0; i < 60 && !(await dodaj.isVisible()); i++) await page.getByRole('button', { name: 'Dalej' }).click();
  await page.getByRole('checkbox', { name: /Nie mam teraz ubezpieczenia/ }).check({ force: true });
  await expect(page.getByRole('button', { name: /Usuń tę umowę/ })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: /Nie mam teraz ubezpieczenia/ })).toBeChecked();
  await page.getByRole('checkbox', { name: /Umowa zlecenia/ }).check({ force: true });
  await expect(page.getByRole('checkbox', { name: /Nie mam teraz ubezpieczenia/ })).not.toBeChecked();
  await expect(page.getByRole('button', { name: /Usuń tę umowę/ })).toHaveCount(1);
});

test('pytanie o płatnika pokazuje, po co je zadajemy', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/sytuacja');
  const pytanie = page.locator('[data-pytanie="platnik_powyzej_20"]');
  for (let i = 0; i < 60 && !(await pytanie.isVisible()); i++) await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(pytanie).toContainText(/zasiłek wypłaca on sam/i);
});

test('„Wpisz dane ręcznie” na starcie zakłada pusty profil i od razu zaczyna ankietę', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('link', { name: 'Wpisz dane ręcznie' }).first().click();
  await expect(page).toHaveURL(/\/sytuacja$/);
  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect(page.getByText('Nie mamy jeszcze danych')).toHaveCount(0);
});
