import { expect, test, type Page } from '@playwright/test';
import type { AkcjaPlanu, Osoba, Rodzina, WynikWalidacji } from '../../src/engine/types';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA, PRZYKLAD_UPRAWNIENIA, PRZYKLAD_WALIDACJA } from '../../src/mocks/przyklad';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

const TATA: Osoba = { id: 'tata', rola: 'ojciec', dane: { imie: 'Piotr' }, tytuly: [] };
const RODZINA_Z_TATA: Rodzina = { ...PRZYKLAD_RODZINA, dataAnalizy: '2026-11-21', osoby: [...PRZYKLAD_RODZINA.osoby, TATA] };

/** Plan, uprawnienia i walidacja zastubowane (silnik ma własne testy); zapisujemy wysłane akcje. */
async function otworz(page: Page, walidacja: WynikWalidacji = PRZYKLAD_WALIDACJA, rodzina: Rodzina = PROFIL_ANNY.rodzina as Rodzina) {
  const wyslane: AkcjaPlanu[] = [];
  await page.route('**/api/eligibility', (r) => r.fulfill({ json: PRZYKLAD_UPRAWNIENIA }));
  await page.route('**/api/plan/validate', (r) => r.fulfill({ json: walidacja }));
  await page.route('**/api/plan/action', (r) => {
    wyslane.push(r.request().postDataJSON().akcja);
    return r.fulfill({ json: { plan: { ...PRZYKLAD_PLAN, wariant815: true }, walidacja } });
  });
  await wstrzyknijProfil(page, { rodzina, plany: [PRZYKLAD_PLAN], wybranyPlanId: PRZYKLAD_PLAN.id });
  await page.goto('/plan');
  await rozwinUklady(page);
  return wyslane;
}

/** „Proponowane układy urlopów” są domyślnie zwinięte: test najpierw je rozwija. */
async function rozwinUklady(page: Page) {
  await page.locator('[data-slot="scenariusze"] summary').click();
  await expect(page.locator('[data-scenariusz]').first()).toBeVisible();
}

/** „Szczegóły kwot i pul tygodni” (liczniki pul) są domyślnie zwinięte. */
async function rozwinSzczegoly(page: Page) {
  await page.locator('[data-slot="szczegoly-kwot"] > details > summary').click();
}

test('81,5%: akcja, konsekwencja z kodem, liczniki', async ({ page }) => {
  await page.route('**/api/plan/action', (r) =>
    r.fulfill({
      json: {
        plan: { ...PRZYKLAD_PLAN, wariant815: true },
        walidacja: { ...PRZYKLAD_WALIDACJA, konsekwencje: [{ kod: 'STAWKA_70_DLA_9_TYG', poziom: 'konsekwencja', tresc: 'x' }] },
      },
    }),
  );
  await page.route('**/api/eligibility', (r) => r.fulfill({ json: PRZYKLAD_UPRAWNIENIA }));
  await page.route('**/api/plan/validate', (r) => r.fulfill({ json: PRZYKLAD_WALIDACJA }));
  await wstrzyknijProfil(page, { ...PROFIL_ANNY, plany: [PRZYKLAD_PLAN], wybranyPlanId: PRZYKLAD_PLAN.id });
  await page.goto('/plan');
  await rozwinUklady(page);
  const akcja = page.waitForRequest((r) => r.url().endsWith('/api/plan/action'));
  await page.getByRole('radio', { name: /81,5%/ }).check({ force: true });
  expect((await akcja).postDataJSON().akcja).toEqual({ typ: 'ustaw_wariant_815', wartosc: true });
  await expect(page.locator('[data-kod="STAWKA_70_DLA_9_TYG"]')).toBeVisible();
  await expect(page.getByRole('radio', { name: /81,5%/ })).toBeChecked();
  await rozwinSzczegoly(page);
  await expect(page.locator('[data-pula="rodzicielski"]').first()).toHaveAttribute('data-przepadnie-tyg', '9');
});

test('mama sama: „Mama wraca…” nieaktywne, link do dodania osoby', async ({ page }) => {
  await otworz(page);
  await expect(page.getByRole('button', { name: /Mama wraca po \d+ tygodniach/ })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Dodaj drugiego rodzica' })).toHaveAttribute('href', '/osoba');
});

test('z drugim rodzicem: „Mama wraca po 14 tygodniach” wysyła rezygnację matki', async ({ page }) => {
  const wyslane = await otworz(page, PRZYKLAD_WALIDACJA, RODZINA_Z_TATA);
  const przycisk = page.getByRole('button', { name: 'Mama wraca po 14 tygodniach' });
  await expect(przycisk).toBeEnabled();
  await expect(page.getByRole('link', { name: 'Dodaj drugiego rodzica' })).toHaveCount(0);
  await przycisk.click();
  await expect.poll(() => wyslane.length).toBe(1);
  expect(wyslane[0]).toEqual({ typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: 'tata' });
});

test('wariant płatności: dwa kafle w „Proponowanych układach urlopów”, termin wniosku poza zwinięciem', async ({ page }) => {
  await otworz(page);
  await expect(page.getByRole('radio', { name: /100% \+ 70%/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /81,5%/ })).not.toBeChecked();
  await expect(page.getByRole('heading', { level: 2, name: /Wniosek do/ })).toContainText('22 grudnia 2026');
});

test('panel walidacji: trzy grupy z kodami, ogłoszenie o błędach i liczniki', async ({ page }) => {
  await otworz(page, {
    ...PRZYKLAD_WALIDACJA,
    poprawny: false,
    bledy: [{ kod: 'MAC_MIN_14_TYG', poziom: 'blad', tresc: 'Za krótko.', przepis: 'KP art. 180 § 4', coZrobic: 'Wydłuż odcinek.' }],
    ostrzezenia: [{ kod: 'OSTRZEZENIE_TEST', poziom: 'ostrzezenie', tresc: 'Uwaga.' }],
    konsekwencje: [{ kod: 'KONSEKWENCJA_TEST', poziom: 'konsekwencja', tresc: 'Skutek.' }],
  });
  const panel = page.locator('[data-slot="panel-walidacji"]');
  await expect(panel.getByRole('heading', { level: 3, name: 'Nie można, bo…' })).toBeVisible();
  await expect(panel.getByRole('heading', { level: 3, name: 'Można, ale…' })).toBeVisible();
  await expect(panel.getByRole('heading', { level: 3, name: 'Co z tego wynika' })).toBeVisible();
  await expect(panel.locator('[data-kod="MAC_MIN_14_TYG"]')).toContainText('KP art. 180 § 4');
  await expect(panel.locator('[data-kod="MAC_MIN_14_TYG"]')).toContainText('Wydłuż odcinek.');
  await expect(panel.locator('[data-kod="OSTRZEZENIE_TEST"]')).toBeVisible();
  await expect(panel.locator('[data-kod="KONSEKWENCJA_TEST"]')).toBeVisible();
  await expect(panel.getByRole('status')).toHaveText('Plan ma 1 błąd');
  // Liczniki pul są w zwiniętych „Szczegółach”, nie w panelu walidacji.
  await expect(panel.locator('[data-pula]')).toHaveCount(0);
  await rozwinSzczegoly(page);
  await expect(page.locator('[data-slot="szczegoly-kwot"] [data-pula="macierzynski"]')).toBeVisible();
});

test('panel walidacji: plan z ostrzeżeniem, ale bez błędów, nie ma grupy „Nie można, bo…”', async ({ page }) => {
  await otworz(page, { ...PRZYKLAD_WALIDACJA, poprawny: true, bledy: [] });
  const panel = page.locator('[data-slot="panel-walidacji"]');
  await expect(panel.getByRole('status')).toHaveText('Plan bez błędów');
  await expect(panel.getByRole('heading', { level: 3, name: 'Nie można, bo…' })).toHaveCount(0);
  await expect(page.locator('[data-slot="znacznik-walidacji"]')).toHaveCount(0);
});

test('panel walidacji: czysty plan to tylko znacznik „Plan bez błędów”, bez panelu', async ({ page }) => {
  await otworz(page, { ...PRZYKLAD_WALIDACJA, poprawny: true, bledy: [], ostrzezenia: [], konsekwencje: [] });
  await expect(page.locator('[data-slot="znacznik-walidacji"]')).toHaveText('Plan bez błędów');
  await expect(page.locator('[data-slot="znacznik-walidacji"]')).toHaveAttribute('role', 'status');
  await expect(page.locator('[data-slot="panel-walidacji"]')).toHaveCount(0);
});
