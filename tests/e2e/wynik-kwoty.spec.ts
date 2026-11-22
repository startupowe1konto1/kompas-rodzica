import { expect, test, type Page } from '@playwright/test';
import { PRZYKLAD_PLAN } from '../../src/mocks/przyklad';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

const DNI = (t: number) => t * 7;

async function otworz(page: Page, id: string) {
  await page.locator(`[data-kafel-sekcji="${id}"]`).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function zamknij(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
}

/** Realistyczna odpowiedź walidacji (trasa po stronie silnika bywa niedostępna): 32 z 41 tygodni, 9 przepada. */
async function podstawWalidacje(page: Page) {
  await page.route('**/api/plan/validate', (route) =>
    route.fulfill({
      json: {
        poprawny: true,
        bledy: [],
        ostrzezenia: [],
        konsekwencje: [],
        wykorzystanie: [
          { pula: 'macierzynski', osobaId: 'mama', wykorzystaneDni: DNI(20), dostepneDni: DNI(20) },
          { pula: 'rodzicielski', wykorzystaneDni: DNI(32), dostepneDni: DNI(41), przepadnieDni: DNI(9) },
        ],
      },
    }),
  );
}

test('pule: 41 kresek, 9 przepada; kafle 6 903,30 i 68 295,08 zł; PIT-2 przelicza', async ({ page }) => {
  await podstawWalidacje(page);
  // Kalkulator w main to jeszcze atrapa toru B: zwraca kwoty dla odcinków przykładu (m1, r1),
  // więc plan też bierzemy z przykładu, żeby kwoty pasowały do odcinków.
  await page.route('**/api/plan/default', (route) => route.fulfill({ json: { plany: [PRZYKLAD_PLAN] } }));
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik');

  // Dwa kafle kwot (uwaga zespołu 21.11): wypełniony tylko „Razem” (zielen-noc) z „netto” w drugiej linii; bez niebieskiego.
  const glowny = page.locator('[data-kafel-kwoty="glowny"]');
  await expect(glowny).toHaveCount(1);
  await expect(glowny).toContainText('Razem dla rodziny (brutto)');
  await expect(glowny).toHaveCSS('background-color', 'rgb(1, 61, 28)');
  await expect(page.locator('[data-kafel-kwoty="niebieski"]')).toHaveCount(0);
  await expect(page.locator('[data-kafel-kwoty]')).toHaveCount(2);
  await expect(page.getByRole('main').getByText(/przybliżenie/i)).toHaveCount(0);
  await expect(page.getByRole('main').getByText('To symulacja. Wynik nie jest decyzją ZUS.')).toHaveCount(0);

  await expect(page.locator('[data-kwota-miesiecznie]')).toHaveText(/6\s903,30\s*zł/);
  await expect(page.locator('[data-suma-razem]')).toHaveText(/68\s295,08\s*zł/);

  const pit2 = page.getByRole('group', { name: /PIT-2/ });
  await expect(pit2.getByRole('radio', { name: 'Nie' })).toBeChecked();
  const zapytanie = page.waitForRequest((r) => r.url().endsWith('/api/calculate') && r.postDataJSON().rodzina.osoby[0].pit2 === true);
  await pit2.getByText('Tak', { exact: true }).click();
  await zapytanie;
  await expect(pit2.getByRole('radio', { name: 'Tak' })).toBeChecked();

  // Pule: każdy rodzaj urlopu to zwinięty wiersz z nazwą i liczbą tygodni.
  const dialogPul = await otworz(page, 'pule');
  const rodz = dialogPul.locator('[data-pula="rodzicielski"]').first();
  await expect(rodz).toHaveAttribute('data-przepadnie-tyg', '9');
  await expect(rodz.getByText('Urlop rodzicielski – 41 tygodni')).toBeVisible();
  // Na telefonie wiersz jest zwinięty (rozwijamy go), na komputerze od razu rozwinięty (SekcjaPul: domyslnieOtwarte={komputer}).
  if (test.info().project.name === 'komputer') {
    await expect(rodz.locator('details').first()).toHaveAttribute('open', '');
  } else {
    await expect(rodz.locator('details').first()).not.toHaveAttribute('open', '');
    await rodz.locator('summary').first().click();
  }
  await expect(rodz.locator('[data-tydzien]')).toHaveCount(41);
  await expect(rodz.locator('[data-tydzien="przepadnie"]')).toHaveCount(9);
  await expect(rodz.locator('[data-tydzien="wykorzystany"]')).toHaveCount(32);
  await expect(rodz.getByText('Zaplanowane 32 z 41 tygodni')).toBeVisible();
  await expect(rodz.getByText('9 tygodni przepadnie, jeśli nikt ich nie weźmie')).toBeVisible();
  // Wyjaśnienie, dlaczego tygodnie przepadają.
  await rodz.getByText('Dlaczego przepadają i jak ich użyć?').click();
  await expect(rodz.getByText(/9 tygodni urlopu rodzicielskiego tylko dla siebie/)).toBeVisible();
  await expect(rodz.getByText(/182¹a § 4/)).toBeVisible();
  await zamknij(page);

  // Kwoty w danym okresie: w nakładce, ze ścieżką wyliczenia.
  const dialogKwot = await otworz(page, 'kwoty');
  await expect(dialogKwot.getByRole('heading', { level: 2, name: 'Kwoty w danym okresie' })).toBeVisible();
  await expect(dialogKwot.getByText('Za cały okres').first()).toBeVisible();
  await dialogKwot.getByText('Jak to policzyliśmy').first().click();
  await expect(dialogKwot.getByText(/230,11/).first()).toBeVisible();
});

test('pule: gdy walidacja planu zawodzi, są pule z uprawnień i „Spróbuj ponownie”', async ({ page }) => {
  await page.route('**/api/plan/validate', (route) => route.fulfill({ status: 500, json: { blad: 'Błąd serwera przy liczeniu wyniku.' } }));
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik');
  const dialog = await otworz(page, 'pule');
  const rodz = dialog.locator('[data-pula="rodzicielski"]').first();
  await expect(rodz).toHaveAttribute('data-przepadnie-tyg', '0');
  await rodz.locator('summary').first().click();
  await expect(rodz.locator('[data-tydzien]')).toHaveCount(41);
  await expect(dialog.locator('[data-stan="pule-zapasowe"]').getByRole('button', { name: 'Spróbuj ponownie' })).toBeVisible();
});
