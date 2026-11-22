import { expect, test, type Page } from '@playwright/test';
import type { AkcjaPlanu, Osoba, Rodzina } from '../../src/engine/types';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA, PRZYKLAD_WALIDACJA } from '../../src/mocks/przyklad';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

/** Plan z mocka, walidacja i akcja zastubowane (silnik i walidacja mają własne testy); zapisujemy wysłane akcje. */
async function otworzListe(page: Page, rodzina: Rodzina = PROFIL_ANNY.rodzina as Rodzina, opoznienieMs = 0) {
  const wyslane: AkcjaPlanu[] = [];
  await page.route('**/api/plan/validate', (r) => r.fulfill({ json: PRZYKLAD_WALIDACJA }));
  await page.route('**/api/plan/action', async (r) => {
    wyslane.push(r.request().postDataJSON().akcja);
    if (opoznienieMs) await new Promise((ok) => setTimeout(ok, opoznienieMs));
    await r.fulfill({ json: { plan: PRZYKLAD_PLAN, walidacja: PRZYKLAD_WALIDACJA } });
  });
  await wstrzyknijProfil(page, { rodzina, plany: [PRZYKLAD_PLAN], wybranyPlanId: PRZYKLAD_PLAN.id });
  await page.goto('/plan');
  await expect(page.locator('[data-okres]').first()).toBeVisible();
  return wyslane;
}

async function zmien(page: Page, id: string) {
  await page.locator(`[data-okres="${id}"]`).getByRole('button', { name: /^Zmień:/ }).click();
}

const TATA: Osoba = { id: 'tata', rola: 'ojciec', dane: { imie: 'Piotr' }, tytuly: [] };

test('lista: grupa na osobę z odcinkami, przycisk Zmień otwiera panel', async ({ page }) => {
  await otworzListe(page);
  await expect(page.locator('[data-osoba-grupa="mama"]').getByRole('heading', { level: 3 })).toBeVisible();
  await expect(page.locator('[data-okres="r1"]')).toHaveAttribute('data-typ', 'rodzicielski');
  await zmien(page, 'r1');
  await expect(page.locator('[data-okres="r1"]')).toHaveAttribute('data-wybrany', 'true');
  await expect(page.getByRole('group', { name: 'Zmień: Urlop rodzicielski' })).toBeVisible();
});

test('lista: „Tydzień krócej” na rodzicielskim wysyła akcję zmien_koniec', async ({ page }) => {
  const wyslane = await otworzListe(page);
  await zmien(page, 'r1');
  const akcja = page.waitForRequest((r) => r.url().endsWith('/api/plan/action'));
  await page.getByRole('button', { name: 'Tydzień krócej' }).click();
  expect((await akcja).postDataJSON().akcja).toEqual({ typ: 'zmien_koniec', odcinekId: 'r1', nowyDo: '2027-11-22' });
  expect(wyslane).toHaveLength(1);
});

test('lista: „Tydzień dłużej” wydłuża koniec o 7 dni', async ({ page }) => {
  await otworzListe(page);
  await zmien(page, 'r1');
  const akcja = page.waitForRequest((r) => r.url().endsWith('/api/plan/action'));
  await page.getByRole('button', { name: 'Tydzień dłużej' }).click();
  expect((await akcja).postDataJSON().akcja).toEqual({ typ: 'zmien_koniec', odcinekId: 'r1', nowyDo: '2027-12-06' });
});

test('lista: duże przyciski „krócej / dłużej” mają co najmniej 56 px wysokości i leżą obok siebie', async ({ page }) => {
  await otworzListe(page);
  await zmien(page, 'r1');
  const a = await page.getByRole('button', { name: 'Tydzień krócej' }).boundingBox();
  const b = await page.getByRole('button', { name: 'Tydzień dłużej' }).boundingBox();
  expect(a && b).toBeTruthy();
  expect(a!.height).toBeGreaterThanOrEqual(56);
  expect(b!.height).toBeGreaterThanOrEqual(56);
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
  expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1);
});

test('lista: przesunięcie o tydzień wcześniej i później', async ({ page }) => {
  const wyslane = await otworzListe(page);
  await zmien(page, 'r1');
  await page.getByRole('button', { name: 'Przesuń o tydzień wcześniej' }).click();
  await expect.poll(() => wyslane.length).toBe(1);
  await page.getByRole('button', { name: 'Przesuń o tydzień później' }).click();
  await expect.poll(() => wyslane.length).toBe(2);
  expect(wyslane[0]).toEqual({ typ: 'przesun', odcinekId: 'r1', nowyOd: '2027-04-13' });
  expect(wyslane[1]).toEqual({ typ: 'przesun', odcinekId: 'r1', nowyOd: '2027-04-27' });
});

test('lista: nowa data końca wysyła zmien_koniec', async ({ page }) => {
  await otworzListe(page);
  await zmien(page, 'r1');
  await page.getByLabel('Nowa data końca').fill('2027-10-01');
  const akcja = page.waitForRequest((r) => r.url().endsWith('/api/plan/action'));
  await page.getByRole('button', { name: 'Zmień koniec' }).click();
  expect((await akcja).postDataJSON().akcja).toEqual({ typ: 'zmien_koniec', odcinekId: 'r1', nowyDo: '2027-10-01' });
});

test('lista: podziel wysyła akcję podziel z datą w połowie', async ({ page }) => {
  await otworzListe(page);
  await zmien(page, 'r1');
  const akcja = page.waitForRequest((r) => r.url().endsWith('/api/plan/action'));
  await page.getByRole('button', { name: 'Podziel na dwie części' }).click();
  expect((await akcja).postDataJSON().akcja).toMatchObject({ typ: 'podziel', odcinekId: 'r1', pierwszyDzienDrugiejCzesci: '2027-08-10' });
});

test('lista: bez drugiej osoby nie ma przycisku przeniesienia', async ({ page }) => {
  await otworzListe(page);
  await zmien(page, 'r1');
  await expect(page.getByRole('button', { name: /^Przenieś na/ })).toHaveCount(0);
});

test('lista: z drugą osobą „Przenieś na: Piotr (Tata)” wysyła przenies_na_osobe', async ({ page }) => {
  await otworzListe(page, { ...PRZYKLAD_RODZINA, dataAnalizy: '2026-11-21', osoby: [...PRZYKLAD_RODZINA.osoby, TATA] });
  await zmien(page, 'r1');
  const akcja = page.waitForRequest((r) => r.url().endsWith('/api/plan/action'));
  await page.getByRole('button', { name: /^Przenieś na: Piotr \(Tata\)/ }).click();
  expect((await akcja).postDataJSON().akcja).toEqual({ typ: 'przenies_na_osobe', odcinekId: 'r1', osobaId: 'tata' });
});

test('lista: połączenie z pracą oferuje ułamki etatu do 1/2 i wysyła polacz_z_praca; macierzyński tego nie ma', async ({ page }) => {
  await page.route('**/api/admin/params', async (r) => {
    const odp = await r.fetch();
    await r.fulfill({ response: odp });
  });
  await otworzListe(page);
  await zmien(page, 'm1');
  await expect(page.getByRole('button', { name: 'Połącz z pracą' })).toHaveCount(0);
  await zmien(page, 'r1');
  const grupa = page.getByRole('group', { name: /części etatu/ });
  await expect(grupa.getByText('1/2 etatu')).toBeVisible();
  await expect(grupa.getByText('3/4 etatu')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Połącz z pracą' })).toBeDisabled();
  await grupa.getByText('1/4 etatu').click();
  const akcja = page.waitForRequest((r) => r.url().endsWith('/api/plan/action'));
  await page.getByRole('button', { name: 'Połącz z pracą' }).click();
  expect((await akcja).postDataJSON().akcja).toEqual({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0.25 });
});

test('lista: usunięcie wymaga potwierdzenia w panelu', async ({ page }) => {
  const wyslane = await otworzListe(page);
  await zmien(page, 'r1');
  await page.getByRole('button', { name: 'Usuń', exact: true }).click();
  expect(wyslane).toHaveLength(0);
  await page.getByRole('button', { name: 'Nie, zostaw' }).click();
  expect(wyslane).toHaveLength(0);
  await page.getByRole('button', { name: 'Usuń', exact: true }).click();
  const akcja = page.waitForRequest((r) => r.url().endsWith('/api/plan/action'));
  await page.getByRole('button', { name: 'Tak, usuń' }).click();
  expect((await akcja).postDataJSON().akcja).toEqual({ typ: 'usun', odcinekId: 'r1' });
});

test('lista: w trakcie akcji przyciski są wyłączone z aria-busy, po akcji fokus wraca na odcinek', async ({ page }) => {
  await otworzListe(page, PROFIL_ANNY.rodzina as Rodzina, 600);
  await zmien(page, 'r1');
  const dluzej = page.getByRole('button', { name: 'Tydzień dłużej' });
  await dluzej.click();
  await expect(dluzej).toBeDisabled();
  await expect(dluzej).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('button', { name: 'Podziel na dwie części' })).toBeDisabled();
  await expect(dluzej).toBeEnabled();
  await expect(page.locator('[data-okres="r1"]').getByRole('button', { name: /^Zwiń:/ })).toBeFocused();
});

test('lista: błąd błędnej akcji z API nie zmienia planu i pokazuje komunikat', async ({ page }) => {
  await otworzListe(page);
  await page.unroute('**/api/plan/action');
  await page.route('**/api/plan/action', (r) => r.fulfill({ status: 500, json: { blad: 'x' } }));
  await zmien(page, 'r1');
  await page.getByRole('button', { name: 'Tydzień dłużej' }).click();
  await expect(page.getByRole('heading', { name: 'Nie udało się zmienić planu' })).toBeVisible();
  await expect(page.locator('[data-okres="r1"]')).toContainText('29 listopada 2027');
});

test('lista: „Zwiń” zwija panel, okres zostaje, „Zmień” rozwija go znowu', async ({ page }) => {
  await otworzListe(page);
  await zmien(page, 'r1');
  await expect(page.locator('[data-okres="r1"] [data-slot="panel-akcji"]')).toBeVisible();
  await page.locator('[data-okres="r1"]').getByRole('button', { name: /^Zwiń:/ }).click();
  await expect(page.locator('[data-slot="panel-akcji"]')).toHaveCount(0);
  await expect(page.locator('[data-okres="r1"]')).toBeVisible();
  await expect(page.locator('[data-okres="r1"]')).not.toHaveAttribute('data-wybrany', 'true');
  await zmien(page, 'r1');
  await expect(page.locator('[data-okres="r1"] [data-slot="panel-akcji"]')).toBeVisible();
});

test('lista: „Podziel” i „Połącz z pracą” mają opis tego, co naprawdę robią', async ({ page }) => {
  await otworzListe(page);
  await zmien(page, 'r1');
  const panel = page.locator('[data-okres="r1"] [data-slot="panel-akcji"]');
  await expect(panel.getByText(/dwa kolejne kawałki/)).toBeVisible();
  await expect(panel.getByText('Praca na część etatu w czasie urlopu wydłuża urlop proporcjonalnie.')).toBeVisible();
});
