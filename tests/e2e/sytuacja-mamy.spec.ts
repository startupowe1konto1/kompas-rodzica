import { expect, test, type Page } from '@playwright/test';
import type { Rodzina } from '../../src/engine/types';
import { PRZYKLAD_RODZINA } from '../../src/mocks/przyklad';
import { wstrzyknijProfil } from './pomocnicze';

/** Klika „Dalej”, aż pokaże się szukany element (ekran z danym polem). */
async function przejdzDo(page: Page, element: ReturnType<Page['locator']>) {
  for (let i = 0; i < 60 && !(await element.isVisible()); i++) await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(element).toBeVisible();
}

/** Mama po porodzie i tata (druga osoba) – warunek pytań o porzucenie i zgon (KP art. 180 § 12–13). */
function rodzinaPoPorodzie(zTata: boolean): Rodzina {
  const r = structuredClone(PRZYKLAD_RODZINA);
  r.zdarzenie = { ...r.zdarzenie, data: '2026-11-10', przewidywana: false };
  if (zTata) r.osoby.push({ id: 'tata', rola: 'ojciec', tytuly: [] });
  return { ...r, dataAnalizy: '2026-11-21' };
}

const SYTUACJA_MAMY = ['orzeczenie_niezdolnosci', 'pobyt_matki_w_szpitalu', 'porzucenie_dziecka', 'zgon_matki'];

test('po porodzie, mama i tata: ankieta pyta o sytuację mamy (orzeczenie, szpital, porzucenie, zgon)', async ({ page }) => {
  await wstrzyknijProfil(page, { rodzina: rodzinaPoPorodzie(true) });
  await page.goto('/sytuacja');
  for (const id of SYTUACJA_MAMY) await przejdzDo(page, page.locator(`[data-pytanie="${id}"]`).first());
});

test('przed porodem pytań o sytuację mamy nie ma', async ({ page }) => {
  await wstrzyknijProfil(page, { rodzina: { ...PRZYKLAD_RODZINA, dataAnalizy: '2026-11-21' } });
  await page.goto('/sytuacja');
  const koniec = page.getByRole('button', { name: 'Zobacz wynik' });
  await przejdzDo(page, koniec);
  for (const id of SYTUACJA_MAMY) await expect(page.locator(`[data-pytanie="${id}"]`)).toHaveCount(0);
});
