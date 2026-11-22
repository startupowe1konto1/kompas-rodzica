import { expect, test, type Page } from '@playwright/test';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

test.beforeEach(async ({ page }) => wstrzyknijProfil(page, PROFIL_ANNY));

test('terminy posortowane po dacie, z oznaczeniami', async ({ page }) => {
  await page.goto('/kalendarz');
  await expect(page.getByRole('heading', { level: 1, name: 'Kalendarz terminów' })).toBeVisible();
  await expect(page.locator('[data-termin]').first()).toBeVisible();
  const daty = await page.locator('[data-termin]').evaluateAll((el) => el.map((e) => e.getAttribute('data-data')!));
  expect(daty).toEqual([...daty].sort());
  const stany = await page.locator('[data-termin]').evaluateAll((el) => el.map((e) => e.getAttribute('data-stan')!));
  for (const s of stany) expect(['minal', 'wkrotce', 'pozniej']).toContain(s);
});

test('.ics: trasa niegotowa daje komunikat, gotowa daje plik', async ({ page }) => {
  await page.route('**/api/documents/ics', (r) => r.fulfill({ status: 501, json: { blad: 'x' } }));
  await page.goto('/kalendarz');
  await page.getByRole('button', { name: 'Dodaj do kalendarza (.ics)' }).first().click();
  await expect(page.locator('[data-stan="niegotowe"]')).toBeVisible();
  await page.unroute('**/api/documents/ics');
  await page.route('**/api/documents/ics', (r) => r.fulfill({ contentType: 'text/calendar', body: 'BEGIN:VCALENDAR\nEND:VCALENDAR' }));
  await page.reload();
  const pobranie = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Dodaj do kalendarza (.ics)' }).first().click();
  expect((await pobranie).suggestedFilename()).toMatch(/\.ics$/);
});

test('dokumenty 501: komunikat w przygotowaniu', async ({ page }) => {
  await page.route('**/api/documents', (r) => r.fulfill({ status: 501, json: { blad: 'x' } }));
  await page.goto('/kalendarz');
  await expect(page.locator('[data-stan="niegotowe"]')).toBeVisible();
});

// K1 + K2: na wierzchu karty tylko ile dni, co i do kiedy; reszta pod „Szczegóły”.
test('karta terminu: blok dni w kolorze stanu, szczegóły zwinięte', async ({ page }) => {
  await page.goto('/kalendarz');
  const karty = page.locator('[data-termin]');
  await expect(karty.first()).toBeVisible();
  const n = await karty.count();
  for (let i = 0; i < n; i++) {
    const k = karty.nth(i);
    const blok = k.locator('[data-dni]');
    await expect(blok).toBeVisible();
    // Kolor zawsze z tekstem: blok ma dostępną etykietę i ton zgodny ze stanem terminu.
    await expect(blok).toHaveAttribute('aria-label', /Za \d+|Termin (dziś|minął)/);
    await expect(blok).toHaveAttribute('data-ton', (await k.getAttribute('data-stan'))!);
    await expect(k.locator('details[data-szczegoly]')).not.toHaveAttribute('open', '');
  }
  // Opis terminu jest dopiero po rozwinięciu.
  const wniosek = page.locator('[data-termin][data-kod="WNIOSEK_RODZICIELSKI"]');
  await expect(wniosek.locator('[data-opis]')).toBeHidden();
  await wniosek.locator('details[data-szczegoly] > summary').click();
  await expect(wniosek.locator('[data-opis]')).toBeVisible();
  // Termin z wnioskiem prowadzi do dokumentów.
  await expect(wniosek.getByRole('link', { name: 'Przygotuj wniosek' })).toHaveAttribute('href', /\/dokumenty/);
});

// K3: jeden widok osi z wszystkimi terminami; klik terminu podświetla tylko ten jeden.
test('„Podejrzyj kalendarz”: oś z urlopami i wszystkimi terminami', async ({ page }) => {
  await page.goto('/kalendarz');
  await expect(page.locator('[data-termin]').first()).toBeVisible();
  const liczba = await page.locator('[data-termin]').count();
  await page.getByRole('button', { name: 'Podejrzyj kalendarz' }).click();
  const podglad = page.getByRole('dialog', { name: 'Kalendarz urlopów i terminów' });
  await expect(podglad).toBeVisible();
  await expect(podglad.locator('[data-odcinek]').first()).toBeVisible();
  await expect(podglad.locator('[data-znacznik-terminu]')).toHaveCount(liczba);
  await expect(podglad.locator('[data-znacznik-terminu][data-podswietlony="true"]')).toHaveCount(0);
  await podglad.getByRole('button', { name: 'Zamknij' }).click();
  await expect(podglad).toBeHidden();
});

async function sprawdzPodswietlenie(page: Page, klucz: string) {
  const podglad = page.getByRole('dialog', { name: 'Kalendarz urlopów i terminów' });
  await expect(podglad).toBeVisible();
  const podswietlone = podglad.locator('[data-znacznik-terminu][data-podswietlony="true"]');
  await expect(podswietlone).toHaveCount(1);
  await expect(podswietlone).toHaveAttribute('data-klucz', klucz);
  await expect(podglad.locator('[data-znacznik-terminu][data-podswietlony="false"]')).toHaveCount(
    (await page.locator('[data-termin]').count()) - 1,
  );
}

test('klik kafla dnia i „Pokaż na osi” otwierają podgląd z podświetlonym terminem', async ({ page }) => {
  await page.goto('/kalendarz');
  const kafel = page.locator('[data-kafel-dnia]').nth(1);
  await expect(kafel).toBeVisible();
  const klucz = (await kafel.getAttribute('data-klucz'))!;
  await kafel.click();
  await sprawdzPodswietlenie(page, klucz);
  await page.keyboard.press('Escape');

  const karta = page.locator('[data-termin]').nth(2);
  const kluczKarty = (await karta.getAttribute('data-klucz'))!;
  await karta.getByRole('button', { name: 'Pokaż na osi' }).click();
  await sprawdzPodswietlenie(page, kluczKarty);
});

test('podgląd na telefonie: oś przewija się w poziomie, strona nie', async ({ page }, info) => {
  test.skip(info.project.name !== 'telefon', 'tylko telefon');
  await page.goto('/kalendarz');
  await page.getByRole('button', { name: 'Podejrzyj kalendarz' }).click();
  const tor = page.locator('[data-tor-podgladu]');
  await expect(tor).toBeVisible();
  const { przewija, strona } = await tor.evaluate((el) => ({
    przewija: el.scrollWidth > el.clientWidth,
    strona: document.documentElement.scrollWidth <= window.innerWidth,
  }));
  expect(przewija).toBe(true);
  expect(strona).toBe(true);
});

// K4: powrót do poprzedniego kroku zaczyna stronę od góry; rozwinięte karty pamiętamy w sesji.
const SCIEZKI: Record<string, string> = { Plan: '/plan', Kalendarz: '/kalendarz' };

async function wroc(page: Page, nazwa: string, telefon: boolean) {
  if (telefon) await page.getByRole('link', { name: `Poprzedni krok: ${nazwa}` }).click();
  // Na komputerze pełna lista kroków; nazwa linku ma dopisek stanu („Kalendarz (zrobione)”).
  else await page.getByRole('navigation', { name: 'Kroki' }).locator(`a[href="${SCIEZKI[nazwa]}"]:not([aria-label])`).click();
}

test('powrót z kalendarza i dokumentów do poprzedniego kroku, od góry strony', async ({ page }, info) => {
  const telefon = info.project.name === 'telefon';
  await page.goto('/dokumenty');
  await expect(page.getByRole('heading', { level: 1, name: 'Dokumenty' })).toBeVisible();
  await page.mouse.wheel(0, 2000);
  await wroc(page, 'Kalendarz', telefon);
  await expect(page).toHaveURL(/\/kalendarz$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Kalendarz terminów' })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await expect(page.locator('[data-termin]').first()).toBeVisible();
  await page.mouse.wheel(0, 2000);
  await wroc(page, 'Plan', telefon);
  await expect(page).toHaveURL(/\/plan$/);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('rozwinięte szczegóły karty zostają po powrocie na kalendarz', async ({ page }) => {
  await page.goto('/kalendarz');
  const karta = page.locator('[data-termin][data-kod="WNIOSEK_RODZICIELSKI"]');
  await karta.locator('details[data-szczegoly] > summary').click();
  await expect(karta.locator('[data-opis]')).toBeVisible();
  await page.goto('/dokumenty');
  await page.goBack();
  await expect(page.locator('[data-termin][data-kod="WNIOSEK_RODZICIELSKI"] [data-opis]')).toBeVisible();
  await expect(page.locator('[data-termin]:not([data-kod="WNIOSEK_RODZICIELSKI"]) details[open]')).toHaveCount(0);
});
