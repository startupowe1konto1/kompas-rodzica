import { expect, test, type Page } from '@playwright/test';
import type { Rodzina } from '../../src/engine/types';
import { PRZYKLAD_RODZINA } from '../../src/mocks/przyklad';
import { wstrzyknijProfil } from './pomocnicze';

/** Klika „Dalej”, aż pokaże się szukany element (ekran z danym polem). */
async function przejdzDo(page: Page, element: ReturnType<Page['locator']>) {
  for (let i = 0; i < 60 && !(await element.isVisible()); i++) await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(element).toBeVisible();
}

const wiersz = (page: Page, nazwa: string) => page.getByRole('group', { name: nazwa });

/** Mama z etatem, której zarobki podajemy miesiąc po miesiącu (lista na początku pusta). */
function rodzinaZMiesiacami(): Rodzina {
  const r = structuredClone(PRZYKLAD_RODZINA);
  r.osoby[0].tytuly[0] = { ...r.osoby[0].tytuly[0], podstawaSkladek: [] };
  delete r.osoby[0].tytuly[0].wynagrodzenieMiesieczne;
  return { ...r, dataAnalizy: '2026-11-21' };
}

test('lista miesięcy: dodaj, błędy przy właściwym wierszu, usuń', async ({ page }) => {
  await wstrzyknijProfil(page, { rodzina: rodzinaZMiesiacami() });
  await page.goto('/sytuacja');
  const dodaj = page.getByRole('button', { name: 'Dodaj miesiąc' });
  await przejdzDo(page, dodaj);

  // Pusta lista jest wymagana.
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(page.locator('[data-kod-bledu="WYMAGANE"]').first()).toBeVisible();

  // Pierwszy wiersz dostaje podpowiedź: miesiąc przed miesiącem analizy.
  await dodaj.click();
  await expect(page.locator('[data-wiersz] input[type="month"]')).toHaveValue('2026-10');
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(page.locator('[data-kod-bledu="NIE_LICZBA"]')).toHaveCount(1);

  const kwota1 = wiersz(page, 'Miesiąc 1').getByLabel('Kwota brutto');
  await kwota1.fill('-5');
  await expect(page.locator('[data-kod-bledu="KWOTA_UJEMNA"]')).toHaveCount(1);
  await expect(kwota1).toHaveAttribute('aria-invalid', 'true');
  await kwota1.fill('8000');
  await expect(page.locator('[data-kod-bledu]')).toHaveCount(0);

  // Drugi wiersz: ten sam miesiąc co pierwszy = błąd w wierszu 2.
  await dodaj.click();
  await expect(page.locator('[data-wiersz] input[type="month"]').nth(1)).toHaveValue('2026-09');
  await page.locator('[data-wiersz] input[type="month"]').nth(1).fill('2026-10');
  await wiersz(page, 'Miesiąc 2').getByLabel('Kwota brutto').fill('7000');
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(page.locator('[data-wiersz]').nth(1).locator('[data-kod-bledu="MIESIAC_POWTORZONY"]')).toBeVisible();
  await expect(page.locator('[data-wiersz]').nth(0).locator('[data-kod-bledu]')).toHaveCount(0);

  // Usunięcie wiersza 2 zostawia wiersz 1 z jego kwotą i odblokowuje „Dalej”.
  await page.getByRole('button', { name: 'Usuń miesiąc 2' }).click();
  await expect(page.locator('[data-wiersz]')).toHaveCount(1);
  await expect(wiersz(page, 'Miesiąc 1').getByLabel('Kwota brutto')).toHaveValue('8000');
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(dodaj).toHaveCount(0);
});

test('lista miesięcy: tryb szczegółowy pilnuje dni', async ({ page }) => {
  await wstrzyknijProfil(page, { rodzina: rodzinaZMiesiacami() });
  await page.goto('/sytuacja');
  const dodaj = page.getByRole('button', { name: 'Dodaj miesiąc' });
  await przejdzDo(page, dodaj);
  await dodaj.click();
  await wiersz(page, 'Miesiąc 1').getByLabel('Kwota brutto').fill('8000');
  await page.getByText('Tryb szczegółowy').click();
  await wiersz(page, 'Miesiąc 1').getByLabel('Dni do przepracowania').fill('20');
  await wiersz(page, 'Miesiąc 1').getByLabel('Dni przepracowane').fill('25');
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(page.locator('[data-kod-bledu="DNI_PONAD_OBOWIAZEK"]')).toBeVisible();
  await wiersz(page, 'Miesiąc 1').getByLabel('Dni przepracowane').fill('15');
  await expect(page.locator('[data-kod-bledu]')).toHaveCount(0);
});

test('zwolnienia w ciąży: okres, kod B i błędy wiersza', async ({ page }) => {
  await wstrzyknijProfil(page, { rodzina: { ...PRZYKLAD_RODZINA, dataAnalizy: '2026-11-21' } });
  await page.goto('/sytuacja');
  const dodaj = page.getByRole('button', { name: 'Dodaj zwolnienie' });
  await przejdzDo(page, dodaj);
  await dodaj.click();
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(page.locator('[data-kod-bledu="WYMAGANE"]')).toHaveCount(2); // od i do

  await wiersz(page, 'Zwolnienie 1').getByLabel('Od kiedy').fill('2026-10-10');
  await wiersz(page, 'Zwolnienie 1').getByLabel('Do kiedy').fill('2026-10-01');
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(page.locator('[data-kod-bledu="OKRES_ODWROCONY"]')).toBeVisible();

  await wiersz(page, 'Zwolnienie 1').getByLabel('Do kiedy').fill('2026-10-20');
  await page.getByRole('checkbox', { name: /kod B/ }).check();
  await expect(page.locator('[data-kod-bledu]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(dodaj).toHaveCount(0);
});

test('pobyt dziecka w szpitalu: bramka tak/nie, przy „tak” wiersz wymaga dat', async ({ page }) => {
  const r = structuredClone(PRZYKLAD_RODZINA);
  r.zdarzenie = { ...r.zdarzenie, data: '2026-11-10', przewidywana: false };
  await wstrzyknijProfil(page, { rodzina: { ...r, dataAnalizy: '2026-11-21' } });
  await page.goto('/sytuacja');
  // Na komputerze krok „Po porodzie” ma też listę pobytu mamy w szpitalu, więc szukamy w pytaniu o dziecko.
  const bramka = page.getByText('Czy dziecko po porodzie zostało w szpitalu?');
  const pole = page.locator('[data-pytanie="dziecko_szpital"]');
  const dodaj = pole.getByRole('button', { name: 'Dodaj okres' });
  await przejdzDo(page, bramka);
  // Bez odpowiedzi „tak” nie pytamy o daty pobytu.
  await expect(dodaj).toHaveCount(0);
  // „Tak”: pojawia się pusty wiersz, który wymaga dat.
  await page.getByRole('group', { name: /Czy dziecko po porodzie zostało w szpitalu/ }).getByText('Tak', { exact: true }).click();
  await przejdzDo(page, dodaj);
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(pole.locator('[data-kod-bledu="WYMAGANE"]')).toHaveCount(2);
  await pole.getByRole('button', { name: 'Usuń okres 1' }).click();
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(dodaj).toHaveCount(0);
});
