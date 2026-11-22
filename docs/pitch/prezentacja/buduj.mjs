// Składa prezentację w jeden samodzielny plik: docs/pitch/prezentacja.html.
// Wkleja CSS, JS, dane.json, fonty i zrzuty (data URI), więc plik działa bez internetu.
// Użycie: node docs/pitch/prezentacja/buduj.mjs
import fs from 'node:fs';
import path from 'node:path';

const tu = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const src = path.join(tu, 'src');
const wyj = path.join(tu, '..', 'prezentacja.html');
const typy = { '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const dataUri = (rel, baza) => {
  const p = path.resolve(baza, rel);
  if (!fs.existsSync(p)) throw new Error('Brak pliku: ' + p);
  return `data:${typy[path.extname(p)]};base64,${fs.readFileSync(p).toString('base64')}`;
};

// Ikona Tabler jako jednoliniowy SVG bez stałego rozmiaru (rozmiar daje CSS)
const ikony = path.resolve(tu, '../../../node_modules/@tabler/icons/icons/outline');
const ikona = (nazwa) => {
  const p = path.join(ikony, nazwa + '.svg');
  if (!fs.existsSync(p)) throw new Error('Brak ikony: ' + nazwa);
  return fs.readFileSync(p, 'utf8').replace(/\s+/g, ' ').replace(/ (width|height|class)="[^"]*"/g, '').trim();
};

const dane = JSON.parse(fs.readFileSync(path.join(tu, 'dane.json'), 'utf8'));
if (!dane.aplikacja?.testy) throw new Error('dane.json bez liczby testów: uruchom eksport-danych.mjs');

let css = fs.readFileSync(path.join(src, 'deck.css'), 'utf8').replace(/url\("(\.\.\/fonty\/[^"]+)"\)/g, (_, rel) => `url("${dataUri(rel, src)}")`);
const js = fs.readFileSync(path.join(src, 'deck.js'), 'utf8');
const tloJs = fs.readFileSync(path.join(src, 'tlo.js'), 'utf8');
let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');

html = html
  .replace('<link rel="stylesheet" href="deck.css">', () => `<style>\n${css}</style>`)
  .replace('<script src="tlo.js"></script>', () => `<script>\n${tloJs}</script>`)
  .replace('<script src="deck.js"></script>', () => `<script>\n${js}</script>`)
  .replace('/*DANE*/', () => JSON.stringify(dane).replace(/</g, '\\u003c'))
  .replace(/src="(\.\.\/img\/[^"]+)"/g, (_, rel) => `src="${dataUri(rel, src)}"`)
  // Ikony: te same co w aplikacji, z @tabler/icons (MIT), wklejone jako SVG
  .replace(/<span class="ikona([^"]*)" data-ikona="([a-z0-9-]+)"><\/span>/g, (_, kl, nazwa) => `<span class="ikona${kl}" aria-hidden="true">${ikona(nazwa)}</span>`);

if (/data-ikona=|href="deck\.css"|src="deck\.js"|src="tlo\.js"|\.\.\/img\/|\.\.\/fonty\//.test(html)) throw new Error('Zostały odwołania do plików zewnętrznych');
fs.writeFileSync(wyj, html);
console.log(`zapisano ${path.relative(process.cwd(), wyj)} · ${(fs.statSync(wyj).size / 1024 / 1024).toFixed(2)} MB · dane z commita ${dane.commit}`);
