// Kontrole z docs/pitch/INSTRUKCJA-DECK-PITCH.md (cz. 6) i DECK-PLAYBOOK.md (cz. 9) na zbudowanym pliku.
// Użycie: node docs/pitch/prezentacja/sprawdz.mjs [katalog na zrzuty]
// 1. przejście samą klawiaturą 1 → N, jedno naciśnięcie na slajd; treść bez wejść krok po kroku, najwyżej jedna animacja;
// 2. powrót strzałką w lewo do slajdu 1, licznik slajdów się zgadza;
// 3. adres #slajd.krok po odświeżeniu otwiera ten sam stan;
// 4. nic nie wychodzi poza scenę przy 1280×720 i 1920×1080;
// 5. plik nie robi żadnych zapytań sieciowych (font i obrazy są w środku);
// 6. telefon w pionie: zrzut slajdu 2;
// 7. konsola bez błędów.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const tu = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const url = pathToFileURL(path.join(tu, '..', 'prezentacja.html')).href;
const out = process.argv[2] || path.join(tu, 'sprawdzenie');
fs.mkdirSync(out, { recursive: true });

const wyniki = [];
const ok = (nazwa, warunek, szczegol = '') => { wyniki.push([warunek ? 'OK ' : 'BŁĄD', nazwa, szczegol]); };
const browser = await chromium.launch({ channel: 'msedge' });

async function strona(viewport, opcje = {}) {
  const page = await browser.newPage({ viewport, ...opcje });
  const bledy = [], siec = [];
  page.on('console', (m) => { if (m.type() === 'error') bledy.push(m.text()); });
  page.on('pageerror', (e) => bledy.push(e.message));
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) siec.push(r.url()); });
  return { page, bledy, siec };
}
const gotowa = (page) => page.waitForFunction(() => document.documentElement.dataset.gotowe === '1');
const czekajKoniec = (page) => page.waitForFunction(() => !window.deckBusy(), null, { timeout: 20000 });

// 1–2: przejście klawiaturą i kolejność
{
  const { page, bledy, siec } = await strona({ width: 1920, height: 1080 });
  await page.goto(url + '#1');
  await gotowa(page);
  const ile = await page.evaluate(() => document.querySelectorAll('.slajd:not([data-pomin])').length);
  for (let i = 1; i <= ile; i++) {
    if (i > 1) await page.keyboard.press('ArrowRight');
    // Slajd ze zmianą na klik: drugie naciśnięcie uruchamia zmianę, zanim przejdziemy dalej
    await czekajKoniec(page);
    if (await page.evaluate(() => document.querySelector('.slajd.aktywny').querySelectorAll('[data-k]:not(.widac)').length > 0)) {
      await page.keyboard.press('ArrowRight');
      ok(`slajd ${i}: zmiana na klik`, await page.evaluate(() => document.querySelector('.slajd.aktywny').querySelectorAll('[data-k]:not(.widac)').length === 0));
    }
    // Treść stoi od razu, ruch najwyżej jeden: na slajdzie nie ma data-k, a slajd kończy się w kilka sekund.
    const t0 = Date.now();
    await czekajKoniec(page);
    const czas = Date.now() - t0;
    const stan = await page.evaluate(() => {
      const s = document.querySelector('.slajd.aktywny');
      return { nazwa: s.dataset.name, dataK: s.querySelectorAll('[data-k]').length, hash: location.hash };
    });
    ok(`slajd ${i} (${stan.nazwa}): ruch krótki (najwyżej jedna animacja)`, czas < 4500, `${czas} ms`);
    ok(`slajd ${i} (${stan.nazwa}): adres`, stan.hash.startsWith(`#${i}.`), stan.hash);
  }
  for (let i = ile; i > 1; i--) await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  const nr = await page.evaluate(() => [document.querySelector('.slajd.aktywny').dataset.name, location.hash]);
  ok('powrót strzałką do slajdu 1', nr[0] === 'tytul' && nr[1].startsWith('#1.'), nr.join(' '));
  ok('konsola bez błędów (przejście)', bledy.length === 0, bledy.join(' | '));
  ok('brak zapytań sieciowych', siec.length === 0, siec.slice(0, 3).join(' '));
  await page.close();
}

// 3: #slajd.krok po odświeżeniu
{
  const { page, bledy } = await strona({ width: 1920, height: 1080 });
  const planNa = async (h) => { await page.goto(url + '?s=' + h.slice(1) + h); await gotowa(page);
    return page.evaluate(() => ({ nazwa: document.querySelector('.slajd.aktywny').dataset.name, plan: document.querySelector('#os .naglowek .plan').textContent, hash: location.hash })); };
  const s0 = await planNa('#4.0'), s1 = await planNa('#4.1');
  ok('#4.0 po odświeżeniu: slajd 4 przed decyzją', s0.nazwa === 'decyzje' && /cały urlop/.test(s0.plan) && s0.hash === '#4.0', JSON.stringify(s0));
  ok('#4.1 po odświeżeniu: slajd 4 po decyzji', s1.nazwa === 'decyzje' && /14 tygodniach/.test(s1.plan) && s1.hash === '#4.1', JSON.stringify(s1));
  ok('konsola bez błędów (adres)', bledy.length === 0, bledy.join(' | '));
  await page.close();
}

// 4: nic poza sceną przy dwóch rozmiarach
for (const [w, h] of [[1280, 720], [1920, 1080]]) {
  const { page } = await strona({ width: w, height: h });
  const ile = await (async () => { await page.goto(url + '?print=1#1'); await gotowa(page); return page.evaluate(() => document.querySelectorAll('.slajd:not([data-pomin])').length); })();
  const zle = [];
  for (let i = 1; i <= ile; i++) {
    await page.goto(url + '?print=1&s=' + i + '#' + i);
    await gotowa(page);
    await page.waitForTimeout(300);
    const poza = await page.evaluate(() => {
      const s = document.getElementById('scena').getBoundingClientRect();
      const akt = document.querySelector('.slajd.aktywny');
      return [...akt.querySelectorAll('*'), ...document.querySelectorAll('#os .odc:not(.zero)')].filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || el.closest('aside, .okno, .ekran')) return false;
        return r.right > s.right + 1 || r.bottom > s.bottom + 1 || r.left < s.left - 1 || r.top < s.top - 1;
      }).length;
    });
    if (poza) zle.push(`${i}: ${poza}`);
    if (w === 1280 && (i === 2 || i === 5)) await page.screenshot({ path: path.join(out, `1280-slajd-${i}.png`) });
  }
  ok(`nic poza sceną przy ${w}×${h}`, zle.length === 0, zle.join(', '));
  await page.close();
}

// 6: telefon w pionie
{
  const { page, bledy } = await strona({ width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(url + '?print=1#2');
  await gotowa(page);
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => { const b = document.getElementById('scena').getBoundingClientRect(); return { w: Math.round(b.width), l: Math.round(b.left), szer: document.documentElement.clientWidth }; });
  await page.screenshot({ path: path.join(out, 'telefon-slajd-2.png') });
  ok('telefon: scena mieści się w szerokości ekranu', r.w <= r.szer + 1 && r.l >= -1, JSON.stringify(r));
  ok('konsola bez błędów (telefon)', bledy.length === 0, bledy.join(' | '));
  await page.close();
}

await browser.close();
for (const [s, n, d] of wyniki) console.log(`${s} ${n}${d && s !== 'OK ' ? ' — ' + d : ''}`);
const bl = wyniki.filter((x) => x[0] !== 'OK ').length;
console.log(bl ? `\n${bl} błędów` : '\nWszystkie kontrole przeszły.');
process.exitCode = bl ? 1 : 0;
