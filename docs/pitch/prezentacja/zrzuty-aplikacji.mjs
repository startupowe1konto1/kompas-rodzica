// Robi zrzuty ekranów z działającej aplikacji (persona testowa „Marta i Piotr”, dane fikcyjne).
// Użycie: node docs/pitch/prezentacja/zrzuty-aplikacji.mjs [http://localhost:3000]
// Zapisuje JPEG do docs/pitch/prezentacja/img/. Przeglądarka: systemowy Edge (Playwright, channel msedge).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const B = process.argv[2] || 'http://localhost:3000';
const tu = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const out = path.join(tu, 'img');
fs.mkdirSync(out, { recursive: true });

// Ankieta jest wypełniona danymi persony: wystarczy przejść „Dalej” aż do wyniku.
async function przejdzAnkiete(page) {
  await page.getByRole('button', { name: /Dalej: sprawdź swoje dane/ }).click();
  await page.waitForURL('**/sytuacja');
  for (let i = 0; i < 120 && !page.url().endsWith('/wynik'); i++) {
    // Klik z poziomu strony: przyciski są podmieniane w trakcie animacji kroku.
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('main button')].filter((x) => /^(Dalej|Zobacz wynik)$/.test(x.textContent.trim()) && !x.disabled).pop();
      b?.click();
    });
    await page.waitForTimeout(400);
  }
  if (!page.url().endsWith('/wynik')) throw new Error('Ankieta nie doszła do wyniku');
}

const browser = await chromium.launch({ channel: 'msedge' });

async function sesja(viewport, scale, opcje = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, locale: 'pl-PL', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('błąd strony:', e.message));
  await page.goto(B + '/logowanie');
  await page.getByText('Marta i Piotr', { exact: false }).first().click();
  await page.getByRole('button', { name: /Dalej: sprawdź swoje dane/ }).waitFor({ timeout: 30000 });
  if (!opcje.tylkoPobieranie) await przejdzAnkiete(page);
  return { ctx, page };
}

async function zrzut(page, plik, { fullPage = false, maxH = null, clipY = 0 } = {}) {
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(900);
  const opts = { path: path.join(out, plik), type: 'jpeg', quality: 84 };
  if (fullPage) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const w = page.viewportSize().width;
    opts.fullPage = true;
    opts.clip = { x: 0, y: clipY, width: w, height: Math.min(h - clipY, maxH ?? h) };
  }
  // Duże zrzuty całej strony czasem się nie udają za pierwszym razem.
  for (let p = 1; ; p++) {
    try { await page.screenshot(opts); break; } catch (e) { if (p >= 4) throw e; await page.waitForTimeout(1500); }
  }
  console.log('zapisano', plik);
}

async function idz(page, adres, tekst) {
  await page.goto(B + adres);
  await page.locator('main h1').filter({ hasText: tekst }).first().waitFor({ timeout: 60000 });
  await page.waitForLoadState('networkidle');
}

// Komputer
{
  const p0 = await sesja({ width: 1440, height: 900 }, 1.5, { tylkoPobieranie: true });
  await zrzut(p0.page, 'k-pobieranie.jpg');
  await p0.ctx.close();
  const { ctx, page } = await sesja({ width: 1440, height: 900 }, 1.5);
  await idz(page, '/wynik', 'wynik');
  await zrzut(page, 'k-wynik.jpg', { fullPage: true, maxH: 2400 });
  await idz(page, '/plan', 'Twój plan');
  await zrzut(page, 'k-plan.jpg', { fullPage: true, maxH: 1500 });
  await idz(page, '/dokumenty', 'Dokumenty');
  await zrzut(page, 'k-dokumenty.jpg', { fullPage: true, maxH: 2400 });
  await ctx.close();
}
// Start bez logowania
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'pl-PL', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(B + '/');
  await page.getByText('Jak chcesz', { exact: false }).first().waitFor({ timeout: 30000 }).catch(() => {});
  await zrzut(page, 'k-start.jpg');
  await ctx.close();
}
// Telefon
{
  const { ctx, page } = await sesja({ width: 390, height: 844 }, 2.5);
  await idz(page, '/wynik', 'wynik');
  await zrzut(page, 't-wynik.jpg');
  await idz(page, '/plan', 'Twój plan');
  await zrzut(page, 't-plan.jpg');
  await idz(page, '/dokumenty', 'Dokumenty');
  await zrzut(page, 't-dokumenty.jpg');
  await idz(page, '/kalendarz', 'Kalendarz');
  await zrzut(page, 't-kalendarz.jpg');
  await ctx.close();
}
await browser.close();
