import { expect, test, type Page } from '@playwright/test';
import { PRZYKLAD_DOKUMENTY, PRZYKLAD_UPRAWNIENIA } from '../../src/mocks/przyklad';
import { PROFIL_ANNY, wstrzyknijProfil } from './pomocnicze';

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

test('uprawnienia mamy z kodem i statusem; kto wypłaca', async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik');
  const dialog = await otworz(page, 'uprawnienia');
  const karta = dialog.locator('[data-osoba-grupa="mama"] [data-kod="UBEZP_W_DNIU_PORODU"]');
  await expect(karta).toHaveAttribute('data-status', 'przysluguje');
  await expect(karta).toHaveAttribute('data-swiadczenie', 'macierzynski');
  await expect(karta).toContainText('UZ art. 29 ust. 1');
  await expect(dialog.locator('[data-osoba-grupa="mama"] h3').first()).toBeVisible();
  await expect(dialog.getByRole('link', { name: /Zapytaj ZUS/ })).toHaveCount(0);
  await zamknij(page);
  const kto = await otworz(page, 'uprawnienia');
  await expect(kto.locator('[data-kto="platnik"]')).toHaveCount(1);
  await expect(kto.locator('[data-kto="platnik"]')).toContainText('pracodawca (płatnik)');
});

test('„Co przysługuje”: lista „mają zastosowanie” otwarta, „nie mają zastosowania” zwinięta', async ({ page }) => {
  const mieszane = {
    ...PRZYKLAD_UPRAWNIENIA,
    uprawnienia: [
      { ...PRZYKLAD_UPRAWNIENIA.uprawnienia[0], kod: 'UBEZP_W_DNIU_PORODU', przysluguje: true },
      {
        ...PRZYKLAD_UPRAWNIENIA.uprawnienia[0],
        kod: 'BRAK_UBEZP_W_DNIU_PORODU',
        swiadczenie: 'ojcowski',
        przysluguje: false,
        alternatywa: 'Świadczenie rodzicielskie 1000 zł z gminy',
      },
    ],
  };
  await page.route('**/api/eligibility', (r) => r.fulfill({ json: mieszane }));
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik');
  const dialog = await otworz(page, 'uprawnienia');
  const dotycza = dialog.locator('[data-osoba-grupa="mama"] [data-lista="dotycza"] details');
  const niedotycza = dialog.locator('[data-osoba-grupa="mama"] [data-lista="niedotycza"] details');
  await expect(dotycza).toHaveAttribute('open', '');
  await expect(dotycza.locator('summary')).toContainText('Świadczenia, które mają zastosowanie (1)');
  await expect(niedotycza.locator('summary')).toContainText('Świadczenia, które nie mają zastosowania (1)');
  await expect(niedotycza).not.toHaveAttribute('open', '');
  await expect(niedotycza.locator('[data-kod="BRAK_UBEZP_W_DNIU_PORODU"]')).toBeHidden();
  await niedotycza.locator('summary').click();
  await expect(niedotycza.locator('[data-kod="BRAK_UBEZP_W_DNIU_PORODU"]')).toBeVisible();
});

test('wynik warunkowy → link „Zapytaj ZUS”', async ({ page }) => {
  const zmienione = {
    ...PRZYKLAD_UPRAWNIENIA,
    uprawnienia: [{ ...PRZYKLAD_UPRAWNIENIA.uprawnienia[0], przysluguje: 'warunkowo' }],
  };
  await page.route('**/api/eligibility', (r) => r.fulfill({ json: zmienione }));
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik');
  const dialog = await otworz(page, 'uprawnienia');
  await expect(dialog.locator('[data-status="do_potwierdzenia"]')).toHaveCount(1);
  const link = dialog.getByRole('link', { name: /Zapytaj ZUS/ });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(link).toHaveAttribute('href', /^https:\/\//);
});

test('nie przysługuje → pokazuje alternatywę; ZUS jako wypłacający', async ({ page }) => {
  const nie = {
    ...PRZYKLAD_UPRAWNIENIA,
    uprawnienia: [
      {
        ...PRZYKLAD_UPRAWNIENIA.uprawnienia[0],
        kod: 'BRAK_UBEZP_W_DNIU_PORODU',
        przysluguje: false,
        alternatywa: 'Świadczenie rodzicielskie 1000 zł z gminy',
      },
    ],
  };
  const zus = {
    ...PRZYKLAD_DOKUMENTY,
    ktoWyplaca: [{ ...PRZYKLAD_DOKUMENTY.ktoWyplaca[0], kto: 'ZUS' }],
  };
  await page.route('**/api/eligibility', (r) => r.fulfill({ json: nie }));
  await page.route('**/api/documents', (r) => r.fulfill({ json: zus }));
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto('/wynik');
  const dialog = await otworz(page, 'uprawnienia');
  const karta = dialog.locator('[data-kod="BRAK_UBEZP_W_DNIU_PORODU"]');
  await expect(karta).toHaveAttribute('data-status', 'nie_przysluguje');
  await expect(karta).toContainText('Świadczenie rodzicielskie 1000 zł z gminy');
  await expect(dialog.getByRole('link', { name: /Zapytaj ZUS/ })).toHaveCount(0);
  await zamknij(page);
  const kto = await otworz(page, 'uprawnienia');
  await expect(kto.locator('[data-kto="ZUS"]')).toContainText('Zasiłek wypłaci ZUS');
});
