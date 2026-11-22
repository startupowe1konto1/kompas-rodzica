import { expect, test, type Page, type Route } from '@playwright/test';
import type { OdpowiedzCzatu, Plan, ZapytanieCzatu } from '../../src/engine/types';
import { PRZYKLAD_PLAN } from '../../src/mocks/przyklad';
import { KLUCZ_MAGAZYNU } from '../../src/state/magazyn';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

// ZuSik – czat o planie (funkcja z AI). /api/chat jest przechwycone: testy nie wołają prawdziwego modelu.

const PROFIL = { ...PROFIL_ANNY, plany: [PRZYKLAD_PLAN], wybranyPlanId: PRZYKLAD_PLAN.id };
/** Gdy ustawione, test zapisuje zrzuty ekranu czatu w tym folderze (podgląd wyglądu). */
const ZRZUTY = process.env.ZRZUTY_ZUSIKA;

async function zrzut(page: Page, nazwa: string) {
  if (ZRZUTY) await page.screenshot({ path: `${ZRZUTY}/${test.info().project.name}-${nazwa}.png` });
}

function odpowiedzNa(z: ZapytanieCzatu): OdpowiedzCzatu {
  if (z.pytanie.includes('Co jeśli') && z.plan) {
    const plan: Plan = {
      ...z.plan,
      odcinki: [
        ...z.plan.odcinki.map((o) => (o.id === 'r1' ? { ...o, do: '2027-10-01' } : o)),
        { id: 'r2', osobaId: 'mama', typ: 'rodzicielski', od: '2027-10-02', do: '2027-11-29', czescNr: 2 },
      ],
    };
    return {
      kod: 'ODPOWIEDZ',
      odpowiedz: 'Sprawdziłem tę zmianę. Plan jest poprawny, a urlop rodzicielski dzieli się na dwie części.',
      zrodla: [],
      propozycja: { akcja: { typ: 'podziel', odcinekId: 'r1', pierwszyDzienDrugiejCzesci: '2027-10-02' }, plan, walidacja: { poprawny: true, bledy: [], ostrzezenia: [], konsekwencje: [], wykorzystanie: [] }, kwoty: null },
      zapytajZus: false,
    };
  }
  if (z.pytanie.includes('800')) {
    return { kod: 'ODESLANO_DO_ZUS', odpowiedz: 'Na to pytanie odpowie ZUS.', zrodla: [], zapytajZus: true };
  }
  return {
    kod: 'ODPOWIEDZ',
    odpowiedz: 'Masz 20 tygodni urlopu macierzyńskiego, bo urodzisz jedno dziecko (KP art. 180 § 1).',
    zrodla: ['KP art. 180 § 1'],
    zapytajZus: false,
  };
}

async function czatDziala(page: Page) {
  const zapytania: ZapytanieCzatu[] = [];
  await page.route('**/api/chat', async (r: Route) => {
    if (r.request().method() === 'GET') return r.fulfill({ json: { dostepny: true } });
    const z = r.request().postDataJSON() as ZapytanieCzatu;
    zapytania.push(z);
    return r.fulfill({ json: odpowiedzNa(z) });
  });
  return zapytania;
}

const przycisk = (page: Page) => page.getByRole('button', { name: 'Otwórz ZuSika – zapytaj o swój plan' });

test.beforeEach(async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL);
});

test('bez klucza API przycisku nie ma, wynik działa', async ({ page }) => {
  await page.route('**/api/chat', (r) => r.fulfill({ json: { dostepny: false } }));
  await page.goto('/wynik');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(przycisk(page)).toHaveCount(0);
});

test('bez profilu: przycisk na stronie startowej, pytanie idzie bez danych rodziny', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  const zapytania = await czatDziala(page);
  await page.goto('/');
  await expect(przycisk(page)).toBeVisible();
  await zrzut(page, '0-start');
  await przycisk(page).click();
  const panel = page.getByRole('dialog', { name: 'ZuSik' });
  await panel.getByRole('button', { name: 'Jak zacząć?' }).click();
  await expect.poll(() => zapytania.length).toBe(1);
  expect(zapytania[0].rodzina).toBeNull();
  expect(zapytania[0].plan).toBeNull();
});

test('w panelu admina przycisku nie ma', async ({ page }) => {
  await czatDziala(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(przycisk(page)).toHaveCount(0);
});

test('pytanie z listy: odpowiedź z przepisem, zamknięcie Escape', async ({ page }) => {
  const zapytania = await czatDziala(page);
  await page.goto('/wynik');
  await zrzut(page, '1-przycisk');
  await przycisk(page).click();
  const panel = page.getByRole('dialog', { name: 'ZuSik' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Asystent AI');
  await zrzut(page, '2-panel');
  await panel.getByRole('button', { name: 'Dlaczego mam tyle tygodni urlopu?' }).click();
  await expect(panel).toContainText('Masz 20 tygodni urlopu macierzyńskiego');
  await expect(panel.getByRole('list', { name: 'Przepisy' })).toContainText('KP art. 180 § 1');
  await zrzut(page, '3-odpowiedz');
  expect(zapytania[0].pytanie).toBe('Dlaczego mam tyle tygodni urlopu?');
  expect(zapytania[0].plan?.id).toBe(PRZYKLAD_PLAN.id);

  await panel.getByLabel('Pytanie do ZuSika').fill('A kiedy złożyć wniosek?');
  await panel.getByRole('button', { name: 'Wyślij pytanie' }).click();
  await expect.poll(() => zapytania.length).toBe(2);
  expect(zapytania[1].historia).toHaveLength(1);

  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(przycisk(page)).toBeVisible();
});

test('„co jeśli”: karta propozycji, plan zmienia się dopiero po „Zastosuj”', async ({ page }) => {
  await czatDziala(page);
  await page.goto('/plan');
  await przycisk(page).click();
  const panel = page.getByRole('dialog', { name: 'ZuSik' });
  await panel.getByLabel('Pytanie do ZuSika').fill('Co jeśli podzielę rodzicielski na dwie części?');
  await panel.getByLabel('Pytanie do ZuSika').press('Enter');
  await expect(panel).toContainText('Sprawdzona zmiana planu');
  await expect(panel).toContainText('Nowy:');
  await zrzut(page, '4-co-jesli');

  const odcinki = () =>
    page.evaluate((k) => (JSON.parse(window.localStorage.getItem(k) ?? '{}').plany?.[0]?.odcinki ?? []).length, KLUCZ_MAGAZYNU);
  expect(await odcinki()).toBe(PRZYKLAD_PLAN.odcinki.length);
  await panel.getByRole('button', { name: 'Zastosuj w moim planie' }).click();
  await expect(panel).toContainText('Zastosowano');
  await expect.poll(odcinki).toBe(PRZYKLAD_PLAN.odcinki.length + 1);
});

test('pytanie spoza aplikacji: kontakt „Zapytaj ZUS”', async ({ page }) => {
  await czatDziala(page);
  await page.goto('/wynik');
  await przycisk(page).click();
  const panel = page.getByRole('dialog', { name: 'ZuSik' });
  await panel.getByLabel('Pytanie do ZuSika').fill('A co z 800 plus?');
  await panel.getByRole('button', { name: 'Wyślij pytanie' }).click();
  await expect(panel.getByRole('link', { name: 'mama@zus.pl' })).toHaveAttribute('href', 'mailto:mama@zus.pl');
  await zrzut(page, '5-zapytaj-zus');
});

test('błąd serwera: komunikat w rozmowie, czat dalej działa', async ({ page }) => {
  await page.route('**/api/chat', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({ json: { dostepny: true } })
      : r.fulfill({ status: 503, json: { blad: 'ZuSik jest teraz niedostępny. Reszta aplikacji działa normalnie.' } }),
  );
  await page.goto('/wynik');
  await przycisk(page).click();
  const panel = page.getByRole('dialog', { name: 'ZuSik' });
  await panel.getByRole('button', { name: 'Ile dostanę i za jaki okres?' }).click();
  await expect(panel).toContainText('ZuSik jest teraz niedostępny');
  await expect(panel.getByLabel('Pytanie do ZuSika')).toBeEnabled();
});
