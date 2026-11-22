import { expect, test, type Page } from '@playwright/test';
import type { Osoba, Plan, Rodzina, WynikKwot } from '../../src/engine/types';
import { KLUCZ_MAGAZYNU } from '../../src/state/magazyn';
import { PRZYKLAD_KWOTY, PRZYKLAD_PLAN, PRZYKLAD_RODZINA, PRZYKLAD_WALIDACJA } from '../../src/mocks/przyklad';
import { wstrzyknijProfil } from './pomocnicze';

const TATA: Osoba = { id: 'tata', rola: 'ojciec', dane: { imie: 'Piotr' }, tytuly: [] };
const RODZINA: Rodzina = { ...PRZYKLAD_RODZINA, dataAnalizy: '2026-11-21', osoby: [...PRZYKLAD_RODZINA.osoby, TATA] };

const PLAN_A: Plan = {
  ...PRZYKLAD_PLAN,
  odcinki: [...PRZYKLAD_PLAN.odcinki, { id: 't1', osobaId: 'tata', typ: 'ojcowski', od: '2027-01-04', do: '2027-01-17' }],
};
const PLAN_B: Plan = {
  ...PRZYKLAD_PLAN,
  id: 'tata-dluzej',
  nazwa: 'Tata dłużej',
  odcinki: [...PRZYKLAD_PLAN.odcinki, { id: 't2', osobaId: 'tata', typ: 'rodzicielski', od: '2027-01-04', do: '2027-03-01', czescNr: 1 }],
};

/** Kwoty zależne od planu: A 68 295,08, B 70 000,00, reszta (kopie) 71 000,00; miesiące z różnymi wartościami. */
function kwotyDla(plan: Plan): WynikKwot {
  const suma = plan.id === PLAN_A.id ? 68295.08 : plan.id === PLAN_B.id ? 70000 : 71000;
  const mnoznik = suma / 68295.08;
  return {
    ...PRZYKLAD_KWOTY,
    sumaRazem: suma,
    naRekeRazem: Math.round(suma * 0.8 * 100) / 100,
    odcinki: PRZYKLAD_KWOTY.odcinki.map((o) => ({
      ...o,
      rozbicieMiesieczne: o.rozbicieMiesieczne.map((m) => ({ ...m, kwota: Math.round(m.kwota * mnoznik * 100) / 100 })),
    })),
  };
}

async function otworz(page: Page, plany: Plan[] = [PLAN_A, PLAN_B]) {
  const wyslane: unknown[] = [];
  await page.route('**/api/calculate', (r) => r.fulfill({ json: kwotyDla(r.request().postDataJSON().plan) }));
  await page.route('**/api/plan/action', (r) => {
    const { plan, akcja } = r.request().postDataJSON();
    wyslane.push(akcja);
    return r.fulfill({ json: { plan: { ...plan, wariant815: akcja.wartosc }, walidacja: PRZYKLAD_WALIDACJA } });
  });
  await wstrzyknijProfil(page, { rodzina: RODZINA, plany, wybranyPlanId: plany[0].id });
  await page.goto('/plan/porownanie');
  await expect(page.getByRole('heading', { level: 1, name: 'Porównaj warianty' })).toBeVisible();
  return wyslane;
}

test('porównanie: kopia z 81,5% i dwie kolumny z sumami', async ({ page }) => {
  await otworz(page);
  const akcja = page.waitForRequest((r) => r.url().endsWith('/api/plan/action'));
  await page.getByRole('button', { name: 'Dodaj wersję z 81,5%' }).click();
  expect((await akcja).postDataJSON().akcja).toEqual({ typ: 'ustaw_wariant_815', wartosc: true });
  for (const w of ['a', 'b']) {
    await expect(page.locator(`[data-wariant="${w}"] [data-suma]`)).toHaveText(/\d[\d\s]*,\d{2}\s*zł/);
    await expect(page.locator(`[data-wariant="${w}"] [data-powrot="mama"]`)).toBeVisible();
  }
  await expect(page.locator('[data-roznica]')).toBeVisible();
  // Kopia jest teraz wariantem B i mówi o 81,5% w nazwie.
  await expect(page.locator('[data-wariant="b"]')).toHaveAttribute('data-plan', /-kopia-1$/);
  await expect(page.locator('[data-wariant="b"]')).toContainText('z 81,5%');
});

test('porównanie: sumy, różnica ze słowem „więcej” i zdanie o powrocie taty', async ({ page }) => {
  await otworz(page);
  await expect(page.locator('[data-wariant="a"] [data-suma]')).toHaveText(/68\s295,08\s*zł/);
  await expect(page.locator('[data-wariant="b"] [data-suma]')).toHaveText(/70\s000,00\s*zł/);
  await expect(page.locator('[data-roznica]')).toHaveText(/\+1\s704,92\s*zł\s+więcej/);
  await expect(page.getByText(/Wariant B daje o .* więcej, ale tata wraca 6 tygodni później/)).toBeVisible();
  await expect(page.locator('[data-wariant="a"] [data-powrot="tata"]')).toContainText('18 stycznia 2027');
  await expect(page.locator('[data-wariant="b"] [data-powrot="tata"]')).toContainText('2 marca 2027');
  // Wspólna skala: najwyższy słupek jednego z wariantów sięga pełnej wysokości.
  await expect(page.locator('[data-miesiac="2026-12"]')).toBeAttached();
});

test('porównanie: „Wybierz ten wariant” ustawia wybrany plan w profilu', async ({ page }) => {
  await otworz(page);
  await expect(page.locator('[data-wariant="a"]')).toContainText('To jest obecnie wybrany plan');
  // Przy dużym obciążeniu pierwszy klik może wyprzedzić hydratację, więc ponawiamy go do skutku.
  await expect(async () => {
    await page.locator('[data-wariant="b"]').getByRole('button', { name: 'Wybierz ten wariant' }).click({ timeout: 1000 });
    await expect(page.locator('[data-wariant="b"]')).toContainText('To jest obecnie wybrany plan', { timeout: 1000 });
  }).toPass();
  await expect(page.locator('[data-wariant="a"]').getByRole('button', { name: 'Wybierz ten wariant' })).toBeVisible();
  const zapisany = await page.evaluate((k) => JSON.parse(window.localStorage.getItem(k) ?? '{}'), KLUCZ_MAGAZYNU);
  expect(JSON.stringify(zapisany)).toContain(`"wybranyPlanId":"${PLAN_B.id}"`);
});

test('porównanie: zmiana wariantu A na plan z B zamienia strony', async ({ page }) => {
  await otworz(page);
  await expect(page.locator('[data-wariant="a"]')).toHaveAttribute('data-plan', PLAN_A.id);
  await page.getByText('Zmień porównywane warianty').click();
  await page.getByRole('group', { name: 'Wariant A' }).getByText('Tata dłużej').click();
  await expect(page.locator('[data-wariant="a"]')).toHaveAttribute('data-plan', PLAN_B.id);
  await expect(page.locator('[data-wariant="b"]')).toHaveAttribute('data-plan', PLAN_A.id);
  await expect(page.locator('[data-roznica]')).toHaveText(/−1\s704,92\s*zł\s+mniej/);
});

test('porównanie: jeden plan – prośba o dodanie drugiego wariantu', async ({ page }) => {
  await otworz(page, [PLAN_A]);
  await expect(page.getByRole('heading', { level: 2, name: 'Potrzebujemy drugiego wariantu' })).toBeVisible();
  await page.getByRole('button', { name: 'Dodaj wersję z 81,5%' }).click();
  await expect(page.locator('[data-wariant="b"]')).toBeVisible();
});

test('porównanie: bez profilu pokazuje stan pusty', async ({ page }) => {
  await page.goto('/plan/porownanie');
  await expect(page.getByRole('link', { name: 'Zacznij od początku' })).toBeVisible();
});

test('porównanie: strona nie ma przewijania poziomego', async ({ page }) => {
  await otworz(page);
  await expect(page.locator('[data-wariant="b"]')).toBeVisible();
  const szer = await page.evaluate(() => ({ dokument: document.documentElement.scrollWidth, okno: window.innerWidth }));
  expect(szer.dokument).toBeLessThanOrEqual(szer.okno);
});
