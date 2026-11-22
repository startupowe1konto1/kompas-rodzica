// Zrzuty slajdów w stanie końcowym (1920 × 1080) i PDF ze wszystkich stron.
// Użycie: node docs/pitch/prezentacja/klatki.mjs [katalog na PNG] [--pdf]
// Działa na zbudowanym pliku prezentacja.html (file://), bez serwera. Przeglądarka: systemowy Edge.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

const tu = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const plik = path.join(tu, '..', 'prezentacja.html');
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(tu, 'klatki');
const pdf = process.argv.includes('--pdf');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: pdf ? 1.5 : 1 });
const bledy = [];
page.on('console', (m) => { if (m.type() === 'error') bledy.push(m.text()); });
page.on('pageerror', (e) => bledy.push(e.message));

const url = pathToFileURL(plik).href;
await page.goto(url + '?final#1', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => document.documentElement.dataset.gotowe === '1', null, { timeout: 90000 });
const ile = await page.evaluate(() => document.querySelectorAll('.slajd').length);
const strony = [];
for (let i = 1; i <= ile; i++) {
  // Inny parametr w adresie = pełne wczytanie (sama zmiana # nie przeładowuje strony)
  await page.goto(url + '?final&s=' + i + '#' + i, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => document.documentElement.dataset.gotowe === '1', null, { timeout: 90000 });
  await page.waitForTimeout(700);
  const p = path.join(out, `slajd-${String(i).padStart(2, '0')}.${pdf ? 'jpg' : 'png'}`);
  // Edge czasem odmawia zrzutu za pierwszym razem: ponawiamy.
  for (let proba = 1; ; proba++) {
    try { await page.screenshot(pdf ? { path: p, type: 'jpeg', quality: 88 } : { path: p }); break; }
    catch (e) { if (proba >= 4) throw e; await page.waitForTimeout(1200); }
  }
  strony.push(p);
  // Nic nie może wychodzić poza scenę
  const poza = await page.evaluate(() => {
    const s = document.getElementById('scena').getBoundingClientRect();
    const akt = document.querySelector('.slajd.aktywny');
    return [...akt.querySelectorAll('*'), ...document.querySelectorAll('#os .odc:not(.zero)')].filter((el) => {
      const r = el.getBoundingClientRect();
      // Zrzuty w ramkach przeglądarki i telefonu są przycięte przez ramkę, więc ich pomijamy.
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden' || el.closest('aside, .okno, .ekran')) return false;
      return r.right > s.right + 1 || r.bottom > s.bottom + 1 || r.left < s.left - 1 || r.top < s.top - 1;
    }).map((el) => el.className || el.tagName).slice(0, 5);
  });
  if (poza.length) console.log(`slajd ${i}: poza sceną:`, poza.join(', '));
}
await browser.close();
console.log(`${ile} slajdów → ${out}`);
if (bledy.length) { console.error('Błędy w konsoli:\n' + bledy.join('\n')); process.exitCode = 1; }

if (pdf) {
  const doc = await PDFDocument.create();
  doc.setTitle('Kompas Rodzica · vibecodersi · HackNation 2026');
  for (const p of strony) {
    const img = await doc.embedJpg(fs.readFileSync(p));
    const s = doc.addPage([1920, 1080]);
    s.drawImage(img, { x: 0, y: 0, width: 1920, height: 1080 });
  }
  const wyj = path.join(tu, '..', 'prezentacja.pdf');
  fs.writeFileSync(wyj, await doc.save());
  const n = (await PDFDocument.load(fs.readFileSync(wyj))).getPageCount();
  if (n !== ile) throw new Error(`PDF ma ${n} stron, a slajdów jest ${ile}`);
  console.log(`PDF: ${wyj} · ${n} stron · ${(fs.statSync(wyj).size / 1024 / 1024).toFixed(1)} MB`);
}
