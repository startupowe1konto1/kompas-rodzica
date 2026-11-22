// Zapisuje dane.json: każda liczba na slajdach pochodzi z silnika aplikacji przez REST API.
// Użycie (aplikacja musi działać): node docs/pitch/prezentacja/eksport-danych.mjs [http://localhost:3000]
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const B = process.argv[2] || 'http://localhost:3000';
const tu = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const post = async (p, b) => {
  const r = await fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
  return r.json();
};

// Rodzina z demo: przypadek, który jury może podać z głowy (ZADANIA.md, cz. 9). Dane fikcyjne.
const rodzina = {
  dataAnalizy: '2026-11-22',
  osoby: [
    { id: 'mama', rola: 'matka', tytuly: [{ id: 'etat-1', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2023-03-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 8000, platnikPowyzej20: true }] },
    { id: 'tata', rola: 'ojciec', tytuly: [{ id: 'etat-t', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2020-01-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 9000, platnikPowyzej20: true }] },
  ],
  zdarzenie: { typ: 'porod', data: '2027-01-01', przewidywana: true, dzieci: [{}] },
};

const { plany } = await post('/api/plan/default', { rodzina });
const wynik = [];
for (const p of plany) {
  const k = await post('/api/calculate', { rodzina, plan: p });
  const w = await post('/api/plan/validate', { rodzina, plan: p });
  const d = await post('/api/documents', { rodzina, plan: p });
  wynik.push({
    id: p.id,
    nazwa: p.nazwa,
    odcinki: p.odcinki.map((o) => {
      const ko = k.odcinki.find((x) => x.odcinekId === o.id) || {};
      return { osoba: o.osobaId, typ: o.typ, od: o.od, do: o.do, stawka: ko.stawkaProc, dziennie: ko.dziennie, dni: ko.dni, miesiecznie: ko.miesiecznie, razem: ko.razem, sciezka: ko.sciezka };
    }),
    suma: k.sumaRazem,
    naReke: k.naRekeRazem,
    podstawy: k.podstawy.map((x) => ({ osoba: x.osobaId, kwota: x.kwota, sciezka: x.sciezka })),
    przepada: w.wykorzystanie.filter((x) => x.przepadnieDni).map((x) => ({ pula: x.pula, osoba: x.osobaId, dni: x.przepadnieDni })),
    komunikaty: [...w.bledy, ...w.ostrzezenia, ...w.konsekwencje].map((x) => ({ kod: x.kod, poziom: x.poziom, tresc: x.tresc, przepis: x.przepis })),
    terminy: d.terminy.map((t) => ({ kod: t.kod, data: t.data, tytul: t.tytul, osoba: t.osobaId, przepis: t.przepis })),
  });
}

// Przykład błędu, który blokuje plan: mama kończy urlop macierzyński po 10 tygodniach zamiast 14.
const zly = structuredClone(plany.find((p) => p.id === 'tata-po-14-tyg'));
for (const o of zly.odcinki) {
  if (o.osobaId === 'mama' && o.typ === 'macierzynski') o.do = '2027-03-11';
  if (o.osobaId === 'tata' && o.typ === 'macierzynski') o.od = '2027-03-12';
}
const wz = await post('/api/plan/validate', { rodzina, plan: zly });
const przykladBledu = (wz.bledy || []).map((x) => ({ kod: x.kod, tresc: x.tresc, przepis: x.przepis }))[0] || null;
if (!przykladBledu) throw new Error('Silnik nie zwrócił błędu dla planu z 10 tygodniami macierzyńskiego');

// Liczby o aplikacji, policzone z repozytorium, nie wpisane ręcznie.
const repo = path.resolve(tu, '../../..');
const zrodla = JSON.parse(fs.readFileSync(path.join(repo, 'docs/zrodla-danych.json'), 'utf8'));
const policzPola = (x) => (Array.isArray(x) ? x.length : Array.isArray(x?.pola) ? x.pola.length : Object.keys(x).length);
let testy = null;
try {
  // Tylko testy z repozytorium (src/), dwa wątki: przy działającej aplikacji pełna pula wywraca Node.
  const out = execSync('npx vitest run src --maxWorkers=2', { cwd: repo, timeout: 600000, stdio: ['ignore', 'pipe', 'pipe'] }).toString().replace(/\x1b\[[0-9;]*m/g, '');
  const m = out.match(/Tests\s+(\d+) passed \((\d+)\)/);
  const f = out.match(/Test Files\s+(\d+) passed/);
  if (m) testy = { zielone: Number(m[1]), wszystkie: Number(m[2]), pliki: f ? Number(f[1]) : null };
} catch (e) {
  console.error('Testy nie przeszły w całości:', e.message.slice(0, 300));
}

const commit = execSync('git rev-parse --short HEAD', { cwd: repo }).toString().trim();
const dane = { zrobiono: new Date().toISOString(), commit, rodzina: { porod: rodzina.zdarzenie.data, mama: 8000, tata: 9000 }, plany: wynik, przykladBledu, aplikacja: { testy, polaDanych: policzPola(zrodla) } };
fs.writeFileSync(path.join(tu, 'dane.json'), JSON.stringify(dane, null, 2) + '\n');
for (const p of wynik) console.log(p.id.padEnd(18), String(p.suma).padStart(10), 'przepada:', JSON.stringify(p.przepada));
console.log('testy', testy, 'pola', dane.aplikacja.polaDanych, 'commit', commit);
