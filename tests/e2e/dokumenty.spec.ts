import { expect, test, type APIRequestContext } from '@playwright/test';
import type { Plan, Rodzina, WynikDokumentow } from '../../src/engine/types';
import { dodajDni } from '../../src/engine/daty';
import { PRZYKLAD_DOKUMENTY } from '../../src/mocks/przyklad';
import { PRZYKLAD_RODZINA } from '../../src/mocks/przyklad';
import { peselZCyfraKontrolna } from '../../src/components/dokumenty/dane-osobowe';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

const Z_PDF = { ...PRZYKLAD_DOKUMENTY, dokumenty: [{ ...PRZYKLAD_DOKUMENTY.dokumenty[0], kod: 'ZAM', gdzie: 'ZUS' as const, moznaWygenerowac: true }] };

test.describe('z podstawionym API dokumentów', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/documents', (r) => r.fulfill({ json: Z_PDF }));
    await wstrzyknijProfil(page, PROFIL_ANNY);
  });

  test('informacja o Z-3 i niegotowy PDF', async ({ page }) => {
    await page.route('**/api/forms/ZAM', (r) => r.fulfill({ status: 501, json: { blad: 'x' } }));
    await page.goto('/dokumenty');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dokumenty');
    await expect(page.locator('[data-info="z3-platnik"]')).toBeVisible();
    await expect(page.locator('[data-kod="ZAM"]')).toHaveAttribute('data-status', 'pozniej');
    await page.getByRole('button', { name: 'Pobierz wniosek do wydruku' }).click();
    await expect(page.locator('[data-stan="niegotowe"]')).toBeVisible();
  });

  test('PDF: plik i lista braków; eZUS symulacja', async ({ page }) => {
    await page.route('**/api/forms/ZAM', (r) =>
      r.fulfill({
        contentType: 'application/pdf',
        body: '%PDF-1.4',
        headers: { 'x-do-uzupelnienia': encodeURIComponent(JSON.stringify(['Numer rachunku'])) },
      }),
    );
    await page.goto('/dokumenty');
    const pobranie = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Pobierz wniosek do wydruku' }).click();
    expect((await pobranie).suggestedFilename()).toMatch(/\.pdf$/);
    await expect(page.locator('[data-do-uzupelnienia] li')).toHaveCount(1);
    await page.getByRole('button', { name: 'Złóż w eZUS (symulacja)' }).click();
    await expect(page.locator('[data-stan="zlozono-symulacja"]')).toBeVisible();
  });

  test('wniosek do pracodawcy: „Wyślij do pracodawcy (symulacja)”, nie eZUS', async ({ page }) => {
    await page.route('**/api/documents', (r) =>
      r.fulfill({
        json: {
          ...PRZYKLAD_DOKUMENTY,
          dokumenty: [{ ...PRZYKLAD_DOKUMENTY.dokumenty[0], gdzie: 'pracodawca', moznaWygenerowac: true }],
        },
      }),
    );
    await page.goto('/dokumenty');
    await expect(page.getByRole('button', { name: 'Złóż w eZUS (symulacja)' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Wyślij do pracodawcy (symulacja)' }).click();
    await expect(page.locator('[data-stan="zlozono-symulacja"]')).toContainText('pracodawcy');
  });

  test('dokument płatnika: bez przycisków, z objaśnieniem', async ({ page }) => {
    await page.route('**/api/documents', (r) =>
      r.fulfill({
        json: {
          ...PRZYKLAD_DOKUMENTY,
          dokumenty: [{ ...PRZYKLAD_DOKUMENTY.dokumenty[0], kod: 'Z-3', ktoSklada: 'platnik', moznaWygenerowac: false }],
        },
      }),
    );
    await page.goto('/dokumenty');
    const karta = page.locator('[data-kod="Z-3"]');
    await expect(karta).toContainText('płatnik');
    await expect(karta.getByRole('button')).toHaveCount(0);
  });

  test('błąd API: komunikat i ponowienie', async ({ page }) => {
    await page.route('**/api/documents', (r) => r.fulfill({ status: 500, json: { blad: 'x' } }));
    await page.goto('/dokumenty');
    await expect(page.getByRole('button', { name: 'Spróbuj ponownie' })).toBeVisible();
  });

  test('bez profilu: zachęta do startu', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto('/dokumenty');
    await expect(page.getByRole('link', { name: 'Zacznij od początku' })).toBeVisible();
  });

  // Dane fikcyjne; PESEL z poprawną sumą kontrolną.
  const PESEL_TESTOWY = peselZCyfraKontrolna('9405120001');
  const MAMA_BEZ_DANYCH = { ...PRZYKLAD_RODZINA.osoby[0], dane: undefined };
  const TATA_BEZ_DANYCH = { ...MAMA_BEZ_DANYCH, id: 'tata', rola: 'ojciec' as const, tytuly: [] };
  const PROFILE = [
    { nazwa: 'jedna osoba', osoby: [MAMA_BEZ_DANYCH], imiona: ['Ewa'] },
    { nazwa: 'dwoje rodziców', osoby: [MAMA_BEZ_DANYCH, TATA_BEZ_DANYCH], imiona: ['Ewa', 'Jan'] },
  ];

  for (const profil of PROFILE) {
    test(`karta „Dane do wniosków do uzupełnienia” (${profil.nazwa}): wypełnij, zapisz, zwinięta`, async ({ page }) => {
      await page.addInitScript(() => {
        // Czyścimy tylko przy pierwszym wczytaniu, żeby odświeżenie zachowało zapisane dane.
        if (!window.sessionStorage.getItem('wyczyszczono')) {
          window.localStorage.clear();
          window.sessionStorage.setItem('wyczyszczono', '1');
        }
      });
      await wstrzyknijProfil(page, { rodzina: { ...PRZYKLAD_RODZINA, osoby: profil.osoby, dataAnalizy: '2026-11-21' } });
      await page.goto('/dokumenty');

      const karta = page.locator('[data-karta-danych="otwarta"]');
      await expect(karta.getByRole('heading', { name: 'Dane do wniosków do uzupełnienia' })).toBeVisible();
      await expect(karta).toContainText('Zostają tylko w tej przeglądarce.');

      // Walidacja: zły PESEL pokazuje błąd przy polu.
      const pesel = karta.getByLabel('PESEL').first();
      await pesel.fill('12345678901');
      await karta.getByRole('button', { name: 'Zapisz dane' }).click();
      await expect(pesel).toHaveAttribute('aria-invalid', 'true');
      await expect(karta.getByLabel('Imię').first()).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('[data-karta-danych="zwinieta"]')).toHaveCount(0);

      const osoby = await karta.locator('fieldset:not([data-dziecko])').count();
      expect(osoby).toBe(profil.osoby.length);
      for (let i = 0; i < osoby; i++) {
        const f = karta.locator('fieldset').nth(i);
        await f.getByLabel('Imię').fill(profil.imiona[i]);
        await f.getByLabel('Nazwisko').fill('Testowa');
        await f.getByLabel('PESEL').fill(peselZCyfraKontrolna('9405120001'));
        await f.getByLabel('Data urodzenia').fill('1994-05-12');
        await f.getByLabel('Ulica').fill('Polna');
        await f.getByLabel('Numer domu').fill('5');
        await f.getByLabel('Kod pocztowy').fill('00-001');
        await f.getByLabel('Miejscowość').fill('Warszawa');
      }
      await karta.locator('[data-dziecko="0"]').getByLabel('Miejsce urodzenia').fill('Łódź');
      await karta.getByRole('button', { name: 'Zapisz dane' }).click();

      const zwinieta = page.locator('[data-karta-danych="zwinieta"]');
      await expect(zwinieta).toContainText('Dane do wniosków: uzupełnione');
      await expect(zwinieta.getByRole('status')).toHaveText('Zapisane. Dane zostają tylko w tej przeglądarce.');
      await expect(page.locator('[data-karta-danych="otwarta"]')).toHaveCount(0);
      await expect(page.locator('[data-kod="ZAM"]')).toContainText(`${profil.imiona[0]} (Mama)`);

      // Po odświeżeniu dane są w profilu, karta nadal zwinięta; „Zmień” otwiera formularz z danymi.
      await page.reload();
      await expect(page.locator('[data-karta-danych="zwinieta"]')).toBeVisible();
      await page.getByRole('button', { name: 'Zmień' }).click();
      await expect(page.getByLabel('Imię').first()).toHaveValue(profil.imiona[0]);
      await expect(page.locator('[data-dziecko="0"]').getByLabel('Miejsce urodzenia')).toHaveValue('Łódź');
    });
  }

  test('profil z kompletnymi danymi: karta zwinięta od razu', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    const dane = {
      imie: 'Ewa',
      nazwisko: 'Testowa',
      pesel: PESEL_TESTOWY,
      dataUrodzenia: '1994-05-12',
      adres: { ulica: 'Polna', nrDomu: '5', kod: '00-001', miejscowosc: 'Warszawa' },
    };
    await wstrzyknijProfil(page, { rodzina: { ...PRZYKLAD_RODZINA, osoby: [{ ...MAMA_BEZ_DANYCH, dane }], dataAnalizy: '2026-11-21' } });
    await page.goto('/dokumenty');
    await expect(page.locator('[data-karta-danych="zwinieta"]')).toBeVisible();
  });
});

// ───────────────────────── Realne API (bez stubów) ─────────────────────────
// Dane z /api/mock/persony; plan i dokumenty liczy prawdziwy silnik.
test.describe('realne API: części urlopu, spójność z wyborami, wypełnianie PDF', () => {
  test.setTimeout(120_000);

  async function persona(request: APIRequestContext, id: string): Promise<{ rodzina: Rodzina }> {
    const persony: { id: string; rodzina: Rodzina }[] = await (await request.get('/api/mock/persony')).json();
    const p = persony.find((x) => x.id === id);
    test.skip(!p, `brak persony ${id}`);
    return p!;
  }
  async function planyDomyslne(request: APIRequestContext, rodzina: Rodzina): Promise<Plan[]> {
    return ((await (await request.post('/api/plan/default', { data: { rodzina } })).json()) as { plany: Plan[] }).plany;
  }
  async function dokumentyPlanu(request: APIRequestContext, rodzina: Rodzina, plan: Plan): Promise<WynikDokumentow> {
    return (await (await request.post('/api/documents', { data: { rodzina, plan } })).json()) as WynikDokumentow;
  }

  test('D1: plan z podzielonym urlopem rodzicielskim to dwa wnioski opisane jako część 1 i część 2', async ({ page, request }) => {
    const { rodzina } = await persona(request, 'anna-etat');
    const plan0 = (await planyDomyslne(request, rodzina))[0];
    const rodz = plan0.odcinki.find((o) => o.typ === 'rodzicielski')!;
    const dzien2 = dodajDni(rodz.od, 112);
    const { plan } = (await (
      await request.post('/api/plan/action', {
        data: { rodzina, plan: plan0, akcja: { typ: 'podziel', odcinekId: rodz.id, pierwszyDzienDrugiejCzesci: dzien2 } },
      })
    ).json()) as { plan: Plan };
    const dok = await dokumentyPlanu(request, rodzina, plan);
    expect(dok.dokumenty.filter((d) => d.kod === 'wniosek_rodzicielski')).toHaveLength(2);

    await wstrzyknijProfil(page, { rodzina, plany: [plan], wybranyPlanId: plan.id });
    await page.goto('/dokumenty');
    await expect(page.locator('[data-info="czesci"]')).toBeVisible();
    await expect(page.locator('[data-kod="wniosek_rodzicielski"]')).toHaveCount(2);
    await expect(page.locator('[data-kod="wniosek_rodzicielski"][data-czesc="1"]')).toHaveCount(1);
    await expect(page.locator('[data-kod="wniosek_rodzicielski"][data-czesc="2"]')).toHaveCount(1);
  });

  test('D1: jeden urlop rodzicielski to jeden wniosek bez numeru części', async ({ page, request }) => {
    const { rodzina } = await persona(request, 'anna-etat');
    const plan = (await planyDomyslne(request, rodzina))[0];
    await wstrzyknijProfil(page, { rodzina, plany: [plan], wybranyPlanId: plan.id });
    await page.goto('/dokumenty');
    await expect(page.locator('[data-kod="wniosek_rodzicielski"]')).toHaveCount(1);
    await expect(page.locator('[data-czesc]')).toHaveCount(0);
    await expect(page.locator('[data-info="czesci"]')).toHaveCount(0);
  });

  test('D3: wybór 81,5% w planie daje wniosek o 81,5% na /dokumenty i jego termin na /kalendarz', async ({ page, request }) => {
    const { rodzina } = await persona(request, 'anna-etat');
    const plan = (await planyDomyslne(request, rodzina))[0];
    const przed = await dokumentyPlanu(request, rodzina, plan);
    expect(przed.dokumenty.some((d) => d.kod === 'wniosek_815')).toBe(false);

    await wstrzyknijProfil(page, { rodzina, plany: [plan], wybranyPlanId: plan.id });
    await page.goto('/plan');
    await page.locator('[data-slot="scenariusze"] summary').click();
    const akcja = page.waitForResponse((r) => r.url().endsWith('/api/plan/action'));
    await page.getByRole('radio', { name: /81,5%/ }).check({ force: true });
    const nowyPlan = ((await (await akcja).json()) as { plan: Plan }).plan;
    expect(nowyPlan.wariant815).toBe(true);
    await expect(page.getByRole('radio', { name: /81,5%/ })).toBeChecked();

    const po = await dokumentyPlanu(request, rodzina, nowyPlan);
    const w815 = po.dokumenty.find((d) => d.kod === 'wniosek_815');
    expect(w815?.termin).toBeTruthy();

    await page.goto('/dokumenty');
    await expect(page.locator('[data-kod="wniosek_815"]')).toHaveCount(1);

    await page.goto('/kalendarz');
    await expect(page.locator(`[data-termin][data-data="${w815!.termin}"]`).first()).toBeVisible();
  });

  test('D3: układ „mama na 50% etatu” dodaje wniosek o łączenie z pracą w dokumentach i w kalendarzu', async ({ page, request }) => {
    const { rodzina } = await persona(request, 'anna-etat');
    const plany = await planyDomyslne(request, rodzina);
    const pol = plany.find((p) => p.id === 'mama-pol-etatu');
    test.fixme(!pol, 'brak scenariusza „mama-pol-etatu” w planach domyślnych');
    const dok = await dokumentyPlanu(request, rodzina, pol!);
    const laczenie = dok.dokumenty.find((d) => d.kod === 'wniosek_laczenie_z_praca');
    expect(laczenie?.termin).toBeTruthy();

    await wstrzyknijProfil(page, { rodzina, plany, wybranyPlanId: pol!.id });
    await page.goto('/dokumenty');
    await expect(page.locator('[data-kod="wniosek_laczenie_z_praca"]')).toHaveCount(1);
    await page.goto('/kalendarz');
    await expect(page.locator(`[data-termin][data-data="${laczenie!.termin}"]`).first()).toBeVisible();
  });

  test('D4: po uzupełnieniu danych PDF nie prosi o imię, nazwisko ani miejscowość', async ({ page, request }) => {
    const { rodzina: pelna } = await persona(request, 'anna-etat');
    const rodzina: Rodzina = { ...pelna, osoby: pelna.osoby.map((o) => ({ ...o, dane: undefined })) };
    const plan = (await planyDomyslne(request, rodzina))[0];
    await wstrzyknijProfil(page, { rodzina, plany: [plan], wybranyPlanId: plan.id });
    await page.goto('/dokumenty');

    const pobierz = async () => {
      const pobranie = page.waitForEvent('download');
      await page.locator('[data-kod="wniosek_rodzicielski"]').getByRole('button', { name: 'Pobierz wniosek do wydruku' }).click();
      await pobranie;
      return page.locator('[data-kod="wniosek_rodzicielski"] [data-do-uzupelnienia] li').allInnerTexts();
    };
    const przed = (await pobierz()).join(' | ');
    expect(przed).toContain('Imię i nazwisko pracownika');
    expect(przed).toContain('Miejscowość');

    const karta = page.locator('[data-karta-danych="otwarta"]');
    const f = karta.locator('fieldset').first();
    await f.getByLabel('Imię').fill('Anna');
    await f.getByLabel('Nazwisko').fill('Testowa');
    await f.getByLabel('PESEL').fill(peselZCyfraKontrolna('9405120001'));
    await f.getByLabel('Data urodzenia').fill('1994-05-12');
    await f.getByLabel('Ulica').fill('Polna');
    await f.getByLabel('Numer domu').fill('5');
    await f.getByLabel('Kod pocztowy').fill('00-001');
    await f.getByLabel('Miejscowość').fill('Warszawa');
    await karta.getByRole('button', { name: 'Zapisz dane' }).click();
    await expect(page.locator('[data-karta-danych="zwinieta"]')).toBeVisible();

    const po = (await pobierz()).join(' | ');
    expect(po).not.toContain('Imię i nazwisko pracownika');
    expect(po).not.toContain('Miejscowość');
  });
});
