import { expect, test, type Page } from '@playwright/test';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

const KAFLE = [
  { id: 'kwoty', tytul: 'Kwoty w danym okresie' },
  { id: 'uprawnienia', tytul: 'Co przysługuje' },
  { id: 'pule', tytul: 'Ile tygodni urlopu przysługuje' },
  { id: 'wybory', tytul: 'Wybory dotyczące urlopu' },
  { id: 'ryzyka', tytul: 'Na co uważać' },
  { id: 'dokumenty', tytul: 'Co można zrobić teraz' },
];

async function otworz(page: Page, id: string) {
  await page.locator(`[data-kafel-sekcji="${id}"]`).click();
  return page.getByRole('dialog');
}

test('wynik: nagłówek, kafle kwot i siedem kafli sekcji w kolejności; przejście do planu', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wynik – ile wyniosą zasiłki');
  await expect(page.locator('[data-suma-razem]')).toContainText(/\d\s*zł/);
  const kafle = page.locator('[data-kafel-sekcji]');
  await expect(kafle).toHaveCount(6); // „Kto wypłaca” jest w „Co przysługuje” (uwaga zespołu 21.11)
  await expect(kafle).toHaveText(KAFLE.map((k) => new RegExp(`^${k.tytul}`)));
  expect(await kafle.evaluateAll((els) => els.map((e) => e.getAttribute('data-kafel-sekcji')))).toEqual(KAFLE.map((k) => k.id));
  // Skróty to jedna linijka z liczbą; żaden kafel nie zostaje na „Liczymy…”.
  await expect(page.locator('[data-kafel-sekcji="uprawnienia"]')).toContainText(/\d+ świadcze/);
  await expect(page.locator('[data-kafel-sekcji]', { hasText: 'Liczymy…' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Ułóż plan na osi czasu' }).click();
  await expect(page).toHaveURL(/\/plan$/);
});

test('wynik: dane z API trafiają do sekcji (uprawnienia, liczniki pul, kto wypłaca, dokumenty)', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik');
  await expect(page.locator('[data-suma-razem]')).toContainText(/\d\s*zł/);

  let dialog = await otworz(page, 'uprawnienia');
  await expect(dialog.locator('[data-osoba-grupa] [data-kod]').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // Pule: liczniki z walidacji albo, gdy walidacja planu zawodzi po stronie silnika, pule z uprawnień.
  dialog = await otworz(page, 'pule');
  await expect(dialog.locator('[data-pula]').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  dialog = await otworz(page, 'uprawnienia');
  await expect(dialog.locator('[data-kto]').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await expect(page.getByRole('link', { name: 'Dodaj osobę' })).toHaveAttribute('href', '/osoba');
});

test('nakładka: dialog na cały ekran (komputer: okno na środku), Esc i „Zamknij” zamykają, fokus wraca na kafel, tło się nie przewija', async ({ page }, testInfo) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik');
  const kafel = page.locator('[data-kafel-sekcji="uprawnienia"]');

  await kafel.click();
  const dialog = page.getByRole('dialog', { name: 'Co przysługuje' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  // Po animacji: na telefonie nakładka zajmuje całe okno; na komputerze to duże okno na środku
  // z równymi marginesami (uwaga zespołu 21.11, NakladkaSekcji). Fokus jest na nagłówku.
  const okno = page.viewportSize()!;
  if (testInfo.project.name === 'telefon') {
    await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(okno.width);
    expect((await dialog.boundingBox())?.height).toBe(okno.height);
  } else {
    // Czekamy na koniec animacji „wyrastania” z kafla: marginesy po bokach i u góry/dołu są równe.
    const asymetria = async () => {
      const r = await dialog.boundingBox();
      return r ? Math.max(Math.abs(r.x - (okno.width - r.x - r.width)), Math.abs(r.y - (okno.height - r.y - r.height))) : 99;
    };
    await expect.poll(asymetria).toBeLessThanOrEqual(1);
    const r = (await dialog.boundingBox())!;
    expect(r.width).toBeLessThan(okno.width);
    expect(r.x).toBeGreaterThanOrEqual(31);
    expect(r.y).toBeGreaterThanOrEqual(31);
  }
  await expect(dialog.getByRole('heading', { level: 2, name: 'Co przysługuje' })).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');

  // Esc.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(kafel).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');

  // Przycisk ✕ „Zamknij”.
  await kafel.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Zamknij' }).click();
  await expect(dialog).toBeHidden();
  await expect(kafel).toBeFocused();
});

test('nakładka: kotwica #sekcja-wybory otwiera „Wybory dotyczące urlopu”', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik#sekcja-wybory');
  await expect(page.getByRole('dialog', { name: 'Wybory dotyczące urlopu' })).toBeVisible();
});

test('wynik bez profilu: zachęta do startu', async ({ page }) => {
  await page.goto('/wynik');
  await expect(page.getByRole('link', { name: 'Zacznij od początku' })).toBeVisible();
});
