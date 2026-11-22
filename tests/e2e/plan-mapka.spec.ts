import { expect, test, type Page } from '@playwright/test';
import type { WynikUprawnien } from '../../src/engine/types';
import { PRZYKLAD_KWOTY, PRZYKLAD_PLAN, PRZYKLAD_UPRAWNIENIA, PRZYKLAD_WALIDACJA } from '../../src/mocks/przyklad';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

/**
 * Ekran planu jako prosta mapka (decyzje 21.11, runda 2): podsumowanie i kafle na górze, oś jako sam podgląd
 * (zwijana, okna wyborów tylko po „Pokaż na osi”), lista okresów ze zmianami, zwarte decyzje z wierszami radio,
 * zwinięte „Proponowane układy urlopów” i „Szczegóły kwot”.
 */

/** Możliwość bez gotowej akcji („Inny układ urlopu”): łączenie z pracą w oknie, które zaczyna się w odcinku r1 mamy. */
const UPRAWNIENIA_INNA_DROGA: WynikUprawnien = {
  ...PRZYKLAD_UPRAWNIENIA,
  mozliwosci: [
    ...PRZYKLAD_UPRAWNIENIA.mozliwosci,
    {
      kod: 'laczenie_z_praca',
      dostepna: true,
      opis: 'Urlop rodzicielski możesz łączyć z pracą.',
      odKiedy: '2027-04-20',
      doKiedy: '2027-11-29',
      konsekwencje: ['Zasiłek jest wtedy niższy za czas pracy.'],
      przepis: 'KP art. 186¹',
      ktoDecyduje: 'mama',
    },
  ],
};

async function otworz(page: Page, walidacja = PRZYKLAD_WALIDACJA, uprawnienia: WynikUprawnien = PRZYKLAD_UPRAWNIENIA, adres = '/plan') {
  await page.route('**/api/eligibility', (r) => r.fulfill({ json: uprawnienia }));
  await page.route('**/api/plan/validate', (r) => r.fulfill({ json: walidacja }));
  await page.route('**/api/plan/action', (r) => r.fulfill({ json: { plan: { ...PRZYKLAD_PLAN, wariant815: true }, walidacja } }));
  await wstrzyknijProfil(page, { ...PROFIL_ANNY, plany: [PRZYKLAD_PLAN], wybranyPlanId: PRZYKLAD_PLAN.id });
  await page.goto(adres);
  await expect(page.locator('[data-decyzja]').first()).toBeVisible();
}

/** Oś jest domyślnie zwinięta na telefonie: test najpierw ją rozwija. */
async function rozwinOs(page: Page) {
  const przelacznik = page.locator('[data-przelacznik-osi]');
  await expect(przelacznik).toHaveAttribute('aria-expanded', /true|false/);
  if ((await przelacznik.getAttribute('aria-expanded')) === 'false') await przelacznik.click();
  await expect(page.locator('[data-okno-od]')).toBeVisible();
}

test('na górze: jedno zdanie podsumowania i para kafli kwot; panelu akcji nie ma bez zaznaczenia', async ({ page }) => {
  await page.route('**/api/calculate', (r) => r.fulfill({ json: PRZYKLAD_KWOTY }));
  await otworz(page);
  await expect(page.locator('[data-slot="podsumowanie-planu"]')).toContainText('od 1 grudnia 2026');
  await expect(page.locator('[data-suma-razem]')).toBeVisible();
  await expect(page.locator('[data-slot="panel-akcji"]')).toHaveCount(0);
});

// Jeden kafel kwot (uwaga zespołu 21.11): brutto w pełnym kolorze, „netto” jako druga linia w tym samym kaflu.
test('kafel kwot: „Razem” pełny ciemnozielony, „netto” w tym samym kaflu, bez dopisku o przybliżeniu', async ({ page }) => {
  await page.route('**/api/calculate', (r) => r.fulfill({ json: { ...PRZYKLAD_KWOTY, naRekeRazem: 61000 } }));
  await otworz(page);
  const razem = page.locator('[data-suma-razem]').locator('xpath=ancestor::div[contains(@class,"rounded-karta")][1]');
  const naReke = page.locator('[data-suma-na-reke]').locator('xpath=ancestor::div[contains(@class,"rounded-karta")][1]');
  await expect(razem).toHaveClass(/bg-zielen-noc/);
  await expect(naReke).toHaveClass(/bg-zielen-noc/);
  await expect(page.locator('.bg-niebieski-jasny')).toHaveCount(0);
  await expect(naReke).not.toContainText('przybliżenie');
});

test('„Proponowane układy urlopów” są zwinięte, a po rozwinięciu kafel 81,5% wysyła akcję', async ({ page }) => {
  await otworz(page);
  const uklady = page.locator('[data-slot="scenariusze"] details');
  await expect(uklady).not.toHaveAttribute('open', '');
  await expect(page.locator('[data-slot="scenariusze"] summary')).toContainText('Proponowane układy urlopów');
  await expect(page.getByText('Gotowe układy')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: /81,5%/ })).toBeHidden();
  // Pilny termin wniosku zostaje na wierzchu.
  await expect(page.getByRole('heading', { level: 2, name: /Wniosek do/ })).toContainText('22 grudnia 2026');

  await page.locator('[data-slot="scenariusze"] summary').click();
  const akcja = page.waitForRequest((r) => r.url().endsWith('/api/plan/action'));
  await page.getByRole('radio', { name: /81,5%/ }).check({ force: true });
  expect((await akcja).postDataJSON().akcja).toEqual({ typ: 'ustaw_wariant_815', wartosc: true });
  await expect(page.getByRole('radio', { name: /81,5%/ })).toBeChecked();
});

test('brak błędów i ostrzeżeń: tylko znacznik „Plan bez błędów”, bez panelu walidacji', async ({ page }) => {
  await otworz(page, { ...PRZYKLAD_WALIDACJA, poprawny: true, bledy: [], ostrzezenia: [], konsekwencje: [] });
  await expect(page.getByRole('status').filter({ hasText: 'Plan bez błędów' })).toBeVisible();
  await expect(page.locator('[data-slot="panel-walidacji"]')).toHaveCount(0);
});

test('decyzje: zwarte wiersze, rozwinięcie przyciskiem, wiersz z hasha rozwinięty', async ({ page }) => {
  await otworz(page);
  const wiersz = page.locator('[data-decyzja="wariant_815"]');
  const naglowek = wiersz.locator('[data-naglowek-decyzji]');
  await expect(naglowek).toHaveAttribute('aria-expanded', 'false');
  await expect(wiersz.getByText('Termin decyzji: 22 grudnia 2026')).toBeVisible();
  await expect(wiersz.getByRole('button', { name: /Pokaż na osi/ })).toBeVisible();
  await expect(wiersz.getByText('Co się wtedy stanie')).toHaveCount(0);
  await naglowek.click();
  await expect(naglowek).toHaveAttribute('aria-expanded', 'true');
  await expect(wiersz.getByText('Co się wtedy stanie')).toBeVisible();
  await naglowek.click();
  await expect(wiersz.getByText('Co się wtedy stanie')).toHaveCount(0);

  await page.goto('/plan#decyzja-wariant_815');
  await expect(page.locator('[data-decyzja="wariant_815"] [data-naglowek-decyzji]')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-decyzja="wariant_815"]')).toHaveAttribute('data-wybrany', 'true');
});

test('decyzja po rozwinięciu: jedno zdanie, dwa wiersze radio, skutki w skrócie, przepis na dole', async ({ page }) => {
  await otworz(page);
  const wiersz = page.locator('[data-decyzja="wariant_815"]');
  await wiersz.locator('[data-naglowek-decyzji]').click();
  // Jedno zdanie, czego dotyczy decyzja.
  await expect(wiersz).toContainText('Można wybrać równą wypłatę 81,5%');
  // Dwa radio-wiersze: „Tak jak teraz w planie” (zaznaczony) i alternatywa.
  const radia = wiersz.locator('[data-opcje-decyzji] input[type="radio"]');
  await expect(radia).toHaveCount(2);
  await expect(radia.first()).toBeChecked();
  await expect(wiersz.getByText('Tak jak teraz w planie')).toBeVisible();
  await expect(wiersz.getByText('Równa stawka przez cały urlop').first()).toBeVisible();
  // „Co się wtedy stanie”: najwyżej 3 punkty, reszta w zwiniętych szczegółach.
  const punkty = wiersz.locator('div:has(> p:text-is("Co się wtedy stanie")) > ul > li');
  expect(await punkty.count()).toBeLessThanOrEqual(3);
  await expect(wiersz.locator('[data-slot="wiecej-szczegolow"]')).not.toHaveAttribute('open', '');
  await expect(wiersz.getByText('Przepis: UZ art. 30a, art. 31 ust. 3')).toBeVisible();
});

test('oś bez okien wyborów domyślnie; okno i pinezka pojawiają się po „Pokaż na osi” i znikają po „Ukryj z osi”', async ({ page }) => {
  await otworz(page);
  await rozwinOs(page);
  await expect(page.locator('[data-wybor]')).toHaveCount(0);
  await expect(page.locator('[data-pinezka]')).toHaveCount(0);

  const wiersz = page.locator('[data-decyzja="wariant_815"]');
  await wiersz.getByRole('button', { name: /^Pokaż na osi/ }).click();
  await expect(page.locator('[data-wybor="wariant_815"]')).toBeVisible();
  await expect(page.locator('[data-pinezka="wariant_815"]')).toHaveAttribute('data-osoba', 'mama');
  // Tylko okno tej decyzji (niedostępne i inne nie są rysowane).
  await expect(page.locator('[data-wybor]')).toHaveCount(1);
  await expect(page.locator('[data-legenda-osi]')).toContainText('czas na decyzję');

  await wiersz.getByRole('button', { name: /^Ukryj z osi/ }).click();
  await expect(page.locator('[data-wybor]')).toHaveCount(0);
  await expect(page.locator('[data-pinezka]')).toHaveCount(0);
});

test('zwinięcie decyzji zdejmuje jej nakładkę z osi', async ({ page }) => {
  await otworz(page);
  await rozwinOs(page);
  const wiersz = page.locator('[data-decyzja="wariant_815"]');
  await wiersz.getByRole('button', { name: /^Pokaż na osi/ }).click();
  await expect(page.locator('[data-wybor="wariant_815"]')).toBeVisible();
  await wiersz.locator('[data-naglowek-decyzji]').click();
  await expect(wiersz.locator('[data-naglowek-decyzji]')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-wybor]')).toHaveCount(0);
});

test('legenda osi opisuje słowami kolory i wzory', async ({ page }) => {
  await otworz(page);
  await rozwinOs(page);
  const legenda = page.locator('[data-legenda-osi]');
  await expect(legenda).toContainText('Urlop macierzyński');
  await expect(legenda).toContainText('Urlop rodzicielski');
  await expect(legenda).toContainText('dziś');
  await expect(legenda).toContainText('poród');
});

test('niedostępne możliwości: jedna zwijana linia z liczbą, w środku powód z kłódką', async ({ page }) => {
  await otworz(page);
  const szczegoly = page.locator('[data-slot="niedostepne"]');
  await expect(szczegoly.locator('summary')).toHaveText('1 możliwość jest teraz niedostępna');
  await expect(szczegoly).not.toHaveAttribute('open', '');
  await szczegoly.locator('summary').click();
  const pozycja = szczegoly.locator('[data-decyzja="rezygnacja_matki_i_przejecie"]');
  await expect(pozycja).toBeVisible();
  await expect(pozycja).toContainText('dodać drugą osobę');
});

test('„Inna droga”: „Zmień w liście okresów” zaznacza okres i rozwija jego panel zmian', async ({ page }) => {
  await otworz(page, PRZYKLAD_WALIDACJA, UPRAWNIENIA_INNA_DROGA);
  const wiersz = page.locator('[data-decyzja="laczenie_z_praca"]');
  await wiersz.locator('[data-naglowek-decyzji]').click();
  // Druga opcja jest wyłączona (nie ma gotowej akcji), zamiast niej przycisk do listy okresów.
  await expect(wiersz.locator('[data-opcje-decyzji] input[type="radio"]').nth(1)).toBeDisabled();
  await wiersz.getByRole('button', { name: 'Zmień w liście okresów' }).click();

  // Najbliższy pasujący okres mamy (rodzicielski r1) jest rozwinięty w liście, panel stoi pod nim.
  await expect(page.locator('[data-okres="r1"]')).toHaveAttribute('data-wybrany', 'true');
  await expect(page.locator('[data-okres="r1"] [data-slot="panel-akcji"]')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Zmień: Urlop rodzicielski' })).toBeVisible();
  await expect(wiersz).toHaveAttribute('data-wybrany', 'true');
});

test('telefon: po rozwinięciu osi jest podpowiedź „Obróć telefon” tylko w pionie, bez wymuszania obrotu', async ({ page }, info) => {
  test.skip(info.project.name !== 'telefon', 'dotyczy telefonu');
  await otworz(page);
  await expect(page.locator('[data-okno-od]')).toHaveCount(0);
  await rozwinOs(page);
  await expect(page.locator('[data-podpowiedz-obrotu]')).toBeVisible();
  await page.setViewportSize({ width: 812, height: 375 });
  await expect(page.locator('[data-podpowiedz-obrotu]')).toHaveCount(0);
});

test('klik odcinka na osi przewija do okresu w liście, ale go nie edytuje', async ({ page }) => {
  await otworz(page);
  await rozwinOs(page);
  await page.locator('button[data-odcinek="r1"]').click();
  await expect(page.locator('[data-okres="r1"]')).toBeInViewport();
  await expect(page.locator('[data-slot="panel-akcji"]')).toHaveCount(0);
});
