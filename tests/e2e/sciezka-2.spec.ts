import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Ścieżka 2 (C8): dane ręczne, poród 1.01.2027 → wynik → plan z 81,5% → porównanie wariantów.
 *
 * Bez stubów: prawdziwy kalkulator (tor B) i trasy planera (tor A, PR #14).
 */

/**
 * „Dalej” z ankiety. Pusty profil ma wartości startowe „do potwierdzenia” (np. rola mama):
 * przed „Dalej” potwierdzamy je przyciskiem „Tak, zgadza się”, jak zrobiłby to rodzic.
 */
async function dalej(page: Page) {
  const potwierdz = page.getByRole('button', { name: 'Tak, zgadza się' });
  while ((await potwierdz.count()) > 0) await potwierdz.first().click();
  await page.getByRole('button', { name: 'Dalej' }).click();
}

/** Klika „Dalej”, aż pojawi się element (jedno pytanie na ekran). */
async function dalejDo(page: Page, cel: Locator) {
  for (let i = 0; i < 60 && !(await cel.isVisible()); i++) await dalej(page);
  await expect(cel).toBeVisible();
}

test('ścieżka 2: dane ręczne → wynik → 81,5% → porównanie', async ({ page }) => {
  test.setTimeout(120_000); // dev server kompiluje każdą trasę przy pierwszym wejściu
  test.slow();
  await page.goto('/');
  await page.getByRole('link', { name: 'Wpisz dane ręcznie' }).first().click();
  await expect(page).toHaveURL(/\/sytuacja$/, { timeout: 30_000 });

  // Kim jesteś: mama.
  const mama = page.getByRole('radio', { name: 'Mamą' });
  await dalejDo(page, mama);
  await mama.check({ force: true });

  // Dziecko: czekamy na poród, 2027-01-01.
  const etap = page.getByRole('radio', { name: 'Czekamy na poród' });
  await dalejDo(page, etap);
  await etap.check({ force: true });
  const dataPorodu = page.getByLabel(/Kiedy jest przewidywany poród/i);
  await dalejDo(page, dataPorodu);
  await dataPorodu.fill('2027-01-01');

  // Praca: umowa o pracę od 2023-03-01, bez terminu końca.
  const etat = page.getByRole('checkbox', { name: /Umowa o pracę/ });
  await dalejDo(page, etat);
  await etat.check({ force: true });
  const od = page.getByLabel(/Od kiedy (trwa ta umowa|pracujesz na tej umowie)/i).first();
  await dalejDo(page, od);
  await od.fill('2023-03-01');

  // Dalej aż do zarobków (pytania z wartością startową potwierdza `dalej`).
  const kwota = page.getByLabel(/Jakie jest miesięczne wynagrodzenie brutto z tej umowy/i).first();
  const tryb = page.getByRole('radio', { name: 'Jedna kwota miesięcznie' });
  for (let i = 0; i < 60 && !(await kwota.isVisible()); i++) {
    // Telefon: tryb podania zarobków to osobny ekran, przed polem kwoty.
    if (await tryb.isVisible()) {
      await page.locator('label', { has: tryb }).click();
      await expect(tryb).toBeChecked();
    }
    await dalej(page);
  }
  await expect(kwota).toBeVisible();
  await kwota.fill('8000');

  const zobaczWynik = page.getByRole('button', { name: 'Zobacz wynik' });
  for (let i = 0; i < 60 && !(await zobaczWynik.isVisible()); i++) await dalej(page);
  await expect(page.getByRole('heading', { name: 'Plan jest gotowy' })).toBeVisible();
  await zobaczWynik.click();

  // Wynik: kwoty i uprawnienia.
  await expect(page).toHaveURL(/\/wynik$/, { timeout: 30_000 });
  await expect(page.locator('[data-suma-razem]').first()).toHaveText(/\d[\d\s]*,\d{2}\s*zł/);
  // Uprawnienia mamy: silnik uznaje ubezpieczenie w dniu porodu (kod i status, nie treść).
  await page.locator('[data-kafel-sekcji="uprawnienia"]').click();
  const uprawnienie = page.getByRole('dialog').locator('[data-osoba-grupa] [data-kod="UBEZP_W_DNIU_PORODU"]').first();
  await expect(uprawnienie).toHaveAttribute('data-status', 'przysluguje');
  await expect(uprawnienie).toHaveAttribute('data-swiadczenie', 'macierzynski');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  // Plan: kafel 81,5% przez cały okres.
  await page.getByRole('link', { name: 'Ułóż plan na osi czasu' }).click();
  await expect(page).toHaveURL(/\/plan$/, { timeout: 30_000 });
  // „Gotowe układy” są domyślnie zwinięte.
  await page.locator('[data-slot="scenariusze"] summary').click();
  const kafel815 = page.getByRole('radio', { name: /81,5% przez cały okres/ });
  await expect(kafel815).toBeAttached();
  const akcja = page.waitForResponse((r) => r.url().endsWith('/api/plan/action'));
  await kafel815.check({ force: true });
  await akcja;
  await expect(kafel815).toBeChecked();

  // Porównanie: kopia planu (z/bez 81,5%) obok oryginału, z różnicą.
  await page.getByRole('link', { name: 'Porównaj warianty' }).click();
  await expect(page).toHaveURL(/\/plan\/porownanie$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Porównaj warianty' })).toBeVisible();
  await page.getByRole('button', { name: /Dodaj wersję (bez|z) 81,5%/ }).click();
  for (const w of ['a', 'b']) {
    await expect(page.locator(`[data-wariant="${w}"] [data-suma]`)).toHaveText(/\d[\d\s]*,\d{2}\s*zł/);
  }
  await expect(page.locator('[data-roznica]')).toBeVisible();
});
