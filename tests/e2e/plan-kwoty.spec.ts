import { expect, test, type Page } from '@playwright/test';
import type { Plan, Rodzina, WynikKwot } from '../../src/engine/types';
import { PRZYKLAD_KWOTY, PRZYKLAD_PLAN, PRZYKLAD_RODZINA, PRZYKLAD_WALIDACJA } from '../../src/mocks/przyklad';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

/** Walidacja bywa niedostępna po stronie silnika; kwoty są tu osobnym tematem. */
async function podstawWalidacje(page: Page) {
  await page.route('**/api/plan/validate', (r) => r.fulfill({ json: PRZYKLAD_WALIDACJA }));
}

/** Sumy osób, liczniki pul i wykres są w zwiniętych „Szczegółach kwot”. */
async function rozwinSzczegoly(page: Page) {
  await page.locator('[data-slot="szczegoly-kwot"] > details > summary').click();
}

const RODZINA_2: Rodzina = {
  ...PRZYKLAD_RODZINA,
  dataAnalizy: '2026-11-21',
  osoby: [...PRZYKLAD_RODZINA.osoby, { id: 'tata', rola: 'ojciec', tytuly: [] }],
};

const PLAN_2: Plan = {
  ...PRZYKLAD_PLAN,
  odcinki: [
    ...PRZYKLAD_PLAN.odcinki,
    { id: 'o1', osobaId: 'tata', typ: 'ojcowski', od: '2027-05-01', do: '2027-05-14' },
  ],
};

/** Mama od grudnia do marca, tata w marcu i kwietniu: marzec ma dwie warstwy. */
const KWOTY_2: WynikKwot = {
  ...PRZYKLAD_KWOTY,
  sumaRazem: 4000 + 3000 + 2000,
  naRekeRazem: 7000,
  odcinki: [
    {
      ...PRZYKLAD_KWOTY.odcinki[0],
      osobaId: 'mama',
      razem: 7000,
      naReke: 5000,
      rozbicieMiesieczne: [
        { miesiac: '2026-12', dni: 31, kwota: 4000 },
        { miesiac: '2027-01', dni: 31, kwota: 3000 },
      ],
    },
    {
      ...PRZYKLAD_KWOTY.odcinki[0],
      odcinekId: 'o1',
      osobaId: 'tata',
      razem: 2000,
      naReke: 2000,
      rozbicieMiesieczne: [
        { miesiac: '2027-01', dni: 10, kwota: 1000 },
        { miesiac: '2027-02', dni: 10, kwota: 1000 },
      ],
    },
  ],
  sumaOsoby: { mama: 7000, tata: 2000 },
};

test('jedna osoba: sumy z kontraktu i 12 miesięcy na wykresie, tabela z tymi samymi liczbami', async ({ page }) => {
  await podstawWalidacje(page);
  await page.route('**/api/calculate', (r) => r.fulfill({ json: PRZYKLAD_KWOTY }));
  await wstrzyknijProfil(page, { ...PROFIL_ANNY, plany: [PRZYKLAD_PLAN], wybranyPlanId: PRZYKLAD_PLAN.id });
  await page.goto('/plan');
  await rozwinSzczegoly(page);

  await expect(page.locator('[data-suma-osoby="mama"]')).toHaveText(/68\s295,08\s*zł/);
  await expect(page.locator('[data-suma-razem]')).toHaveText(/68\s295,08\s*zł/);
  // Zdanie o symulacji jest w stopce (jak na wyniku), nie przy kwotach planu.
  await expect(page.getByRole('contentinfo').getByText(/To symulacja. Wynik nie jest decyzją ZUS./)).toBeVisible();

  const wykres = page.getByRole('img', { name: /Wykres/ });
  await expect(wykres).toBeVisible();
  await expect(page.locator('[data-miesiac]')).toHaveCount(12);

  await page.getByText('Pokaż jako tabelę').click();
  await expect(page.locator('[data-wiersz]')).toHaveCount(12);
  await expect(page.locator('[data-wiersz="2027-04"]')).toContainText(/6\s143,86\s*zł/);
});

test('dwie osoby: słupki warstwami, legenda, kwota miesiąca po kliknięciu', async ({ page }) => {
  await podstawWalidacje(page);
  await page.route('**/api/calculate', (r) => r.fulfill({ json: KWOTY_2 }));
  await wstrzyknijProfil(page, { rodzina: RODZINA_2, plany: [PLAN_2], wybranyPlanId: PLAN_2.id });
  await page.goto('/plan');
  await rozwinSzczegoly(page);

  await expect(page.locator('[data-suma-osoby="mama"]')).toHaveText(/7\s000,00\s*zł/);
  await expect(page.locator('[data-suma-osoby="tata"]')).toHaveText(/2\s000,00\s*zł/);
  await expect(page.locator('[data-suma-razem]')).toHaveText(/9\s000,00\s*zł/);
  await expect(page.locator('[data-suma-na-reke]')).toHaveText(/7\s000,00\s*zł/);

  await expect(page.getByRole('list', { name: 'Legenda wykresu' })).toContainText('Tata');
  await expect(page.locator('[data-miesiac]')).toHaveCount(3);
  // Styczeń: dwie warstwy (mama i tata).
  await expect(page.locator('[data-miesiac="2027-01"] rect[fill^="var(--color-"]')).toHaveCount(2);

  await page.locator('[data-miesiac="2027-01"]').click();
  await expect(page.locator('[data-odczyt="miesiac"]')).toContainText(/styczeń 2027: 4\s000,00\s*zł/);
});

test('błąd kwot: komunikat i „Spróbuj ponownie”, plan zostaje', async ({ page }) => {
  await podstawWalidacje(page);
  // Tryb deweloperski uruchamia efekt dwa razy, więc nie liczymy prób, tylko przełączamy stan.
  let dziala = false;
  await page.route('**/api/calculate', (r) =>
    dziala ? r.fulfill({ json: PRZYKLAD_KWOTY }) : r.fulfill({ status: 500, json: { blad: 'x' } }),
  );
  await wstrzyknijProfil(page, { ...PROFIL_ANNY, plany: [PRZYKLAD_PLAN], wybranyPlanId: PRZYKLAD_PLAN.id });
  await page.goto('/plan');
  const blad = page.locator('[data-slot="kwoty-planu"][data-stan="blad"]');
  await expect(blad).toBeVisible();
  dziala = true;
  await blad.getByRole('button', { name: 'Spróbuj ponownie' }).click();
  await expect(page.locator('[data-suma-razem]')).toHaveText(/68\s295,08\s*zł/);
});
