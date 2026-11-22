import { expect, test, type Page } from '@playwright/test';
import type { Plan, Rodzina, WynikUprawnien } from '../../src/engine/types';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA, PRZYKLAD_UPRAWNIENIA, PRZYKLAD_WALIDACJA } from '../../src/mocks/przyklad';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

async function otworzOs(page: Page) {
  await page.goto('/plan');
  // Oś jest domyślnie zwinięta na telefonie, rozwinięta na komputerze.
  const przelacznik = page.locator('[data-przelacznik-osi]');
  await expect(przelacznik).toHaveAttribute('aria-expanded', /true|false/);
  if ((await przelacznik.getAttribute('aria-expanded')) === 'false') await przelacznik.click();
  await expect(page.locator('[data-okno-od]')).toBeVisible();
}

test.describe('oś czasu na planie z API', () => {
  test.beforeEach(async ({ page }) => {
    await wstrzyknijProfil(page, PROFIL_ANNY);
    await otworzOs(page);
  });

  test('pigułki z liczbą tygodni, poród, dziś; okno wyboru 81,5% dopiero po „Pokaż na osi”', async ({ page }) => {
    await page.route('**/api/eligibility', (r) => r.fulfill({ json: PRZYKLAD_UPRAWNIENIA }));
    await otworzOs(page);
    await expect(page.locator('[data-typ="macierzynski"]').first()).toHaveAttribute('data-typ', 'macierzynski');
    await expect(page.locator('[data-typ="macierzynski"] [data-tygodnie]').first()).toHaveText(/20/);
    await expect(page.locator('[data-znacznik="dzis"]')).toHaveCount(1);
    await expect(page.locator('[data-znacznik="porod"]')).toHaveCount(1);
    // Domyślnie oś to sam podgląd: bez okien wyborów.
    await expect(page.locator('[data-wybor]')).toHaveCount(0);
    await page.getByRole('button', { name: /^Pokaż na osi: / }).first().click();
    await expect(page.locator('[data-wybor="wariant_815"]')).toBeVisible();
    await expect(page.locator('#wybor-wariant_815')).toHaveAttribute('data-dostepna', 'true');
  });

  test('przybliżenie zmienia okno; klik odcinka przewija do listy i go nie zaznacza do edycji', async ({ page }) => {
    const os = page.locator('[data-okno-od]');
    const przed = await os.getAttribute('data-okno-od');
    const doPrzed = await os.getAttribute('data-okno-do');
    await page.getByRole('button', { name: 'Przybliż' }).click();
    await expect(os).not.toHaveAttribute('data-okno-do', doPrzed!);
    await page.getByRole('button', { name: 'Pokaż całość' }).click();
    await expect(os).toHaveAttribute('data-okno-od', przed!);
    const odcinek = page.locator('button[data-typ="rodzicielski"]').first();
    const id = await odcinek.getAttribute('data-odcinek');
    await odcinek.click();
    await expect(page.locator(`[data-okres="${id}"]`)).toBeInViewport();
    // Oś nie edytuje: panel zmian otwiera dopiero „Zmień” w liście.
    await expect(page.locator('[data-slot="panel-akcji"]')).toHaveCount(0);
  });

  test('strzałki przesuwają fokus między odcinkami jednej osoby', async ({ page }) => {
    await page.locator('button[data-typ="macierzynski"]').first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('button[data-typ="rodzicielski"]').first()).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('button[data-typ="macierzynski"]').first()).toBeFocused();
  });

  test('numer okna zaznacza decyzję: pinezka na wierszu mamy i karta z terminem', async ({ page }) => {
    // Okna i terminy z przykładu wzorcowego: test sprawdza zachowanie osi, nie treść możliwości z silnika.
    await page.route('**/api/eligibility', (r) => r.fulfill({ json: PRZYKLAD_UPRAWNIENIA }));
    await otworzOs(page);
    // Okno wyboru jest nakładką: pojawia się dopiero po „Pokaż na osi” przy decyzji.
    await page.getByRole('button', { name: /^Pokaż na osi: / }).first().click();
    await page.getByRole('button', { name: /^Decyzja 1:/ }).click();
    await expect(page.locator('[data-pinezka="wariant_815"]')).toHaveAttribute('data-osoba', 'mama');
    const karta = page.locator('[data-decyzja="wariant_815"]');
    await expect(karta).toHaveAttribute('data-wybrany', 'true');
    await expect(karta.getByText(/Termin decyzji: 22 grudnia 2026/)).toBeVisible();
    await expect(page.locator('[data-decyzja="rezygnacja_matki_i_przejecie"]')).toHaveAttribute('data-dostepna', 'false');
  });
});

test('walidacja 500: oś i tak pokazuje odcinki', async ({ page }) => {
  await page.route('**/api/plan/validate', (r) => r.fulfill({ status: 500, json: { blad: 'x' } }));
  await wstrzyknijProfil(page, { ...PROFIL_ANNY, plany: [PRZYKLAD_PLAN], wybranyPlanId: PRZYKLAD_PLAN.id });
  await otworzOs(page);
  await expect(page.locator('[data-odcinek="m1"]')).toBeVisible();
  await expect(page.locator('[data-odcinek="r1"]')).toBeVisible();
});

// ── Podgląd „po zmianie” i skutek dla drugiego rodzica (dane z atrap, żeby wynik nie zależał od silnika) ──

const RODZINA_DWOJE: Rodzina = {
  ...PRZYKLAD_RODZINA,
  dataAnalizy: '2026-11-21',
  osoby: [...PRZYKLAD_RODZINA.osoby, { id: 'tata', rola: 'ojciec', tytuly: PRZYKLAD_RODZINA.osoby[0].tytuly.map((t) => ({ ...t, id: 'etat-t' })) }],
};

const UPRAWNIENIA_DWOJE: WynikUprawnien = {
  ...PRZYKLAD_UPRAWNIENIA,
  mozliwosci: PRZYKLAD_UPRAWNIENIA.mozliwosci.map((m) => (m.kod === 'rezygnacja_matki_i_przejecie' ? { ...m, dostepna: true } : m)),
};

/** Odpowiedź silnika na „rezygnacja_matki”: mama krócej, tata przejmuje resztę macierzyńskiego. */
const PLAN_PRZEJECIE: Plan = {
  ...PRZYKLAD_PLAN,
  odcinki: [
    { ...PRZYKLAD_PLAN.odcinki[0], do: '2027-03-08' },
    { id: 'tata-macierzynski-1', osobaId: 'tata', typ: 'macierzynski', od: '2027-03-09', do: '2027-04-19' },
    PRZYKLAD_PLAN.odcinki[1],
  ],
};

test('„Pokaż na osi”: wiersze po zmianie, linia do skutku u taty, „Zastosuj”', async ({ page }) => {
  await page.route('**/api/eligibility', (r) => r.fulfill({ json: UPRAWNIENIA_DWOJE }));
  await page.route('**/api/plan/validate', (r) => r.fulfill({ json: PRZYKLAD_WALIDACJA }));
  let akcja: unknown = null;
  await page.route('**/api/plan/action', (r) => {
    akcja = r.request().postDataJSON().akcja;
    return r.fulfill({ json: { plan: PLAN_PRZEJECIE, walidacja: PRZYKLAD_WALIDACJA } });
  });
  await wstrzyknijProfil(page, { rodzina: RODZINA_DWOJE, plany: [PRZYKLAD_PLAN], wybranyPlanId: PRZYKLAD_PLAN.id });
  await otworzOs(page);

  const karta = page.locator('[data-decyzja="rezygnacja_matki_i_przejecie"]');
  await karta.getByRole('button', { name: /Pokaż na osi/ }).click();
  expect(akcja).toEqual({ typ: 'rezygnacja_matki', poTygodniach: PRZYKLAD_UPRAWNIENIA.pule.obowiazkoweMatkiTyg, przejmujeOsobaId: 'tata' });

  // Wiersz „po zmianie” pod każdym rodzicem: u mamy skrócony macierzyński, u taty nowy odcinek.
  await expect(page.locator('[data-podglad-osoba="mama"]')).toHaveAttribute('data-zmiany', 'tak');
  await expect(page.locator('[data-podglad-osoba="tata"] [data-podglad-odcinek="tata-macierzynski-1"]')).toBeVisible();
  // Podgląd nie dubluje odcinków planu.
  await expect(page.locator('[data-odcinek="tata-macierzynski-1"]')).toHaveCount(0);
  // Pinezka na wierszu mamy (decyduje) i linia do skutku u taty.
  await expect(page.locator('[data-pinezka="rezygnacja_matki_i_przejecie"]')).toHaveAttribute('data-osoba', 'mama');
  await expect(page.locator('[data-linia-skutku="tata"]')).toHaveCount(1);
  await expect(page.locator('[data-cel-skutku="tata"]')).toHaveCount(1);
  // Karta: skutki osobno dla taty (druga osoba).
  await expect(karta.locator('[data-skutek-osoba="tata"]')).toHaveAttribute('data-zmiany', 'tak');

  await karta.getByRole('button', { name: 'Zastosuj w planie' }).click();
  await expect(page.locator('[data-odcinek="tata-macierzynski-1"]')).toHaveAttribute('data-typ', 'macierzynski');
  await expect(page.locator('[data-podglad-osoba]')).toHaveCount(0);
});
