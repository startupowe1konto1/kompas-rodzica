// Prezentacja: scena, kroki slajdów i oś czasu, która przechodzi przez cały deck (SPEC.md, cz. 3 i 7).
// Każda liczba pochodzi z window.DANE (dane.json z silnika aplikacji). Brak pola = błąd, nie zgadywanie.
(function () {
  'use strict';
  const D = window.DANE;
  if (!D) throw new Error('Brak danych (dane.json)');
  const scena = document.getElementById('scena');
  const slajdy = [...document.querySelectorAll('.slajd')].filter((s) => !s.hasAttribute('data-pomin'));
  const parametry = new URLSearchParams(location.search);
  const FINAL = parametry.has('print') || parametry.has('final') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (FINAL) document.documentElement.classList.add('tryb-final');

  // ── Dane ──────────────────────────────────────────────────────────────
  const plan = (id) => { const p = D.plany.find((x) => x.id === id); if (!p) throw new Error('Brak planu ' + id); return p; };
  const odc = (p, osoba, typ) => { const o = p.odcinki.find((x) => x.osoba === osoba && x.typ === typ); if (!o) throw new Error(`Brak odcinka ${osoba}/${typ} w ${p.id}`); return o; };
  const zl = (n, ulamki = 0) => n.toLocaleString('pl-PL', { minimumFractionDigits: ulamki, maximumFractionDigits: ulamki }).replace(/ /g, ' ');
  const MIES = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const dataKrotko = (s) => { const [r, m, d] = s.split('-').map(Number); return `${d}.${String(m).padStart(2, '0')}.${r}`; };
  const dataSlownie = (s) => { const [r, m, d] = s.split('-').map(Number); return `${d} ${MIES[m - 1]} ${r}`; };
  const dni = (s) => Date.UTC(...s.split('-').map((x, i) => (i === 1 ? Number(x) - 1 : Number(x)))) / 864e5;
  const plusDni = (s, n) => new Date((dni(s) + n) * 864e5).toISOString().slice(0, 10);

  const A = plan('mama-caly-urlop');
  const C = plan('po-rowno');
  const B = plan('tata-po-14-tyg');
  const T9 = plan('tata-swoje-9-tyg');
  const roznica = Math.round(C.suma) - Math.round(A.suma);
  const sciezkaPodstawy = A.podstawy.find((x) => x.osoba === 'mama').sciezka;
  const mamaMac = odc(A, 'mama', 'macierzynski');
  const krokSciezki = (opis) => { const k = mamaMac.sciezka.find((x) => x.opis.startsWith(opis)); if (!k) throw new Error('Brak kroku ścieżki: ' + opis); return k; };
  const termin = (p, kod, osoba) => { const t = p.terminy.find((x) => x.kod === kod && (!osoba || x.osoba === osoba)); if (!t) throw new Error(`Brak terminu ${kod} w ${p.id}`); return t; };
  const komunikat = (p, kod) => { const k = p.komunikaty.find((x) => x.kod === kod); if (!k) throw new Error(`Brak komunikatu ${kod} w ${p.id}`); return k; };
  const przepada = (p, pula, osoba) => p.przepada.find((x) => x.pula === pula && (!osoba || x.osoba === osoba));
  const t = D.aplikacja.testy;
  if (!t || t.zielone !== t.wszystkie) throw new Error('Liczba testów niepełna albo nie wszystkie są zielone');

  // Liczby spoza aplikacji: każda ze źródłem (DECK-PLAYBOOK.md, cz. 6). Źródło: research/04-problemy-rodzicow.md, sekcja F.
  const ZEWNETRZNE = {
    kobietyNaRodzicielskim: { wartosc: '87%', zrodlo: 'komunikat ZUS z 27.05.2026, styczeń–kwiecień 2026' },
  };
  const tygodnieTaty = przepada(A, 'rodzicielski_nieprzenoszalne', 'tata')?.dni / 7;
  if (!Number.isInteger(tygodnieTaty)) throw new Error('Brak tygodni taty, które przepadają, w danych silnika');

  // Wartości wstawiane w [data-w]. Teksty z liczbami składamy tu, a nie w HTML.
  const W = {
    porod: dataSlownie(D.rodzina.porod),
    porodKrotko: dataKrotko(D.rodzina.porod),
    zarobkiMama: zl(D.rodzina.mama),
    zarobkiTata: zl(D.rodzina.tata),
    sumaA: zl(Math.round(A.suma)),
    sumaC: zl(Math.round(C.suma)),
    roznica: '+' + zl(roznica),
    kobietyProc: ZEWNETRZNE.kobietyNaRodzicielskim.wartosc,
    kobietyZrodlo: ZEWNETRZNE.kobietyNaRodzicielskim.zrodlo,
    tygodnieTaty: String(tygodnieTaty),
    terminPrzejecia: dataKrotko(termin(B, 'PRZEJECIE_OJCA').data),
    termin815: dataKrotko(termin(A, 'TERMIN_815').data),
    testy: zl(t.zielone),
    plikiTestow: zl(t.pliki),
    pola: String(D.aplikacja.polaDanych),
  };
  document.querySelectorAll('[data-w]').forEach((el) => {
    const v = W[el.dataset.w];
    if (v === undefined) throw new Error('Brak wartości ' + el.dataset.w);
    el.textContent = v;
  });
  // Liczniki: wartość końcowa z danych, tekst końcowy od razu (PDF i tryb final)
  const WL = { sumaA: Math.round(A.suma), sumaC: Math.round(C.suma), roznica, testy: t.zielone, pola: D.aplikacja.polaDanych };
  document.querySelectorAll('[data-lw]').forEach((el) => {
    const v = WL[el.dataset.lw];
    if (v === undefined) throw new Error('Brak licznika ' + el.dataset.lw);
    el.dataset.licz = String(v);
    el.textContent = zl(v);
  });
  // Zdanie na slajdzie 3 opisuje, co przepada w pierwszym planie: sprawdzamy je z danymi silnika.
  if (przepada(A, 'rodzicielski_nieprzenoszalne', 'tata')?.dni !== 63 || !przepada(A, 'ojcowski', 'tata')) throw new Error('Slajd 3: tekst o przepadających tygodniach taty nie zgadza się z danymi');
  document.querySelectorAll('.nr').forEach((el) => { const s = el.closest('.slajd'); el.textContent = `${slajdy.indexOf(s) + 1} / ${slajdy.length}`; });

  // Slajd 5: jeden skutek decyzji, w brzmieniu silnika
  const skutek = komunikat(B, 'OJCIEC_MUSI_PRZEJAC');
  document.getElementById('skutek').textContent = skutek.tresc;
  document.getElementById('skutek-przepis').textContent = skutek.przepis;
  document.getElementById('termin-opis').textContent = termin(B, 'PRZEJECIE_OJCA').tytul;

  // Slajd 6: trzy linie wyliczenia z silnika (podstawa, stawka dzienna, suma)
  const rach = document.getElementById('rachunek');
  const stawka = krokSciezki('Stawka za urlop');
  const wiersze6 = [
    { o: 'Podstawa wymiaru', f: sciezkaPodstawy[1].wzor, p: `${sciezkaPodstawy[0].przepis}, ${sciezkaPodstawy[1].przepis}`, v: sciezkaPodstawy[1].wartosc },
    { o: `Stawka dzienna (${stawka.wzor})`, f: krokSciezki('Stawka dzienna').wzor, p: stawka.przepis, v: krokSciezki('Stawka dzienna').wartosc },
    { o: `${krokSciezki('Za ').opis} urlopu macierzyńskiego`, f: krokSciezki('Za ').wzor, p: '', v: krokSciezki('Za ').wartosc, suma: true },
  ];
  for (const r of wiersze6) {
    if ([r.o, r.f, r.v].some((x) => x === undefined)) throw new Error('Slajd 6: brak kroku ścieżki w danych');
    const w = document.createElement('div');
    w.className = 'w' + (r.suma ? ' suma' : '');
    w.innerHTML = '<span class="o"></span><span class="f"></span><span class="p"></span><span class="v"></span>';
    w.querySelector('.o').textContent = r.o;
    w.querySelector('.f').textContent = r.f;
    w.querySelector('.p').textContent = r.p;
    const v = w.querySelector('.v');
    v.dataset.licz = String(r.v); v.dataset.u = '2'; v.dataset.sufiks = ' zł';
    v.textContent = zl(r.v, 2) + ' zł';
    rach.appendChild(w);
  }

  // ── Oś czasu ──────────────────────────────────────────────────────────
  const START = '2026-11-01', KONIEC = '2028-04-01';
  const zakres = dni(KONIEC) - dni(START);
  const pct = (s) => ((dni(s) - dni(START)) / zakres) * 100;
  const os = document.getElementById('os');
  const skala = os.querySelector('.skala');
  const siatka = os.querySelector('.siatka');
  const SKR = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  for (let r = 2026, m = 10; r < 2028 || m < 3; m++) {
    if (m === 12) { m = 0; r++; }
    const s = `${r}-${String(m + 1).padStart(2, '0')}-01`;
    const sp = document.createElement('span');
    sp.style.left = pct(s) + '%';
    sp.textContent = m === 0 ? String(r) : SKR[m];
    if (m === 0) sp.className = 'rok';
    else if (m % 3 === 0) sp.className = 'kw';
    skala.appendChild(sp);
    const kreska = document.createElement('i');
    kreska.style.left = pct(s) + '%';
    skala.appendChild(kreska);
    const g = document.createElement('i');
    g.style.left = `calc(${pct(s) / 100} * (100% - 0px))`;
    siatka.appendChild(g);
  }
  const znPorod = os.querySelector('.znacznik.porod');
  const znDzis = os.querySelector('.znacznik.dzis');
  const tory = { mama: os.querySelector('[data-osoba="mama"] .tor'), tata: os.querySelector('[data-osoba="tata"] .tor') };
  const NAZWY = { macierzynski: 'Macierzyński', rodzicielski: 'Rodzicielski', ojcowski: 'Ojcowski' };
  // Przepis przy fragmencie (slajd 3): ze ścieżek i terminów silnika
  const PRZEPISY = {
    'mama-macierzynski': mamaMac.sciezka.find((x) => x.opis.startsWith('Stawka za urlop')).przepis,
    'mama-rodzicielski': odc(A, 'mama', 'rodzicielski').sciezka.find((x) => x.opis.startsWith('Stawka za urlop')).przepis,
    'tata-rodzicielski': komunikat(A, 'RODZ_9_TYG_DRUGIEGO_RODZICA').przepis,
    'tata-ojcowski': termin(C, 'WNIOSEK_OJCOWSKI').przepis || 'KP art. 182³',
    'tata-macierzynski': komunikat(B, 'OJCIEC_MUSI_PRZEJAC').przepis,
  };

  // Odcinki planu. Tygodnie, które przepadną, stoją tam, gdzie wziąłby je plan z tym urlopem, z długością z silnika.
  function odcinkiPlanu(p) {
    const lista = p.odcinki.map((o) => ({ klucz: `${o.osoba}-${o.typ}`, osoba: o.osoba, typ: o.typ, od: o.od, do: o.do }));
    const miejsce9 = odc(T9, 'tata', 'rodzicielski');
    const r9 = przepada(p, 'rodzicielski_nieprzenoszalne');
    if (r9) lista.push({ klucz: `${r9.osoba}-rodzicielski${lista.some((x) => x.klucz === r9.osoba + '-rodzicielski') ? '-p' : ''}`, osoba: r9.osoba, typ: 'rodzicielski', od: miejsce9.od, do: plusDni(miejsce9.od, r9.dni - 1), przepada: true });
    const oj = przepada(p, 'ojcowski', 'tata');
    if (oj) { const m = odc(C, 'tata', 'ojcowski'); lista.push({ klucz: 'tata-ojcowski', osoba: 'tata', typ: 'ojcowski', od: m.od, do: plusDni(m.od, oj.dni - 1), przepada: true }); }
    return lista;
  }
  const PLANY = { A: odcinkiPlanu(A), B: odcinkiPlanu(B), C: odcinkiPlanu(C) };
  const elOdc = new Map();
  function element(o) {
    let el = elOdc.get(o.klucz);
    if (!el) {
      el = document.createElement('div');
      el.className = 'odc zero';
      el.innerHTML = '<span class="naz"></span><span class="tyg"></span><span class="przepis"></span>';
      tory[o.osoba].appendChild(el);
      elOdc.set(o.klucz, el);
      el.style.left = pct(o.od) + '%';
      el.style.width = '0%';
      void el.offsetWidth; // stan początkowy musi się wyrenderować, żeby odcinek „wyrósł”
    }
    return el;
  }

  let stanOsi = null;
  function ustawOs(s) {
    const prev = stanOsi || {};
    const { opoznienia, ...reszta } = s;
    stanOsi = { ...prev, ...reszta };
    const st = stanOsi;
    os.classList.toggle('ukryta', !st.widoczna);
    os.classList.toggle('mala', !!st.mala);
    os.classList.toggle('bez-karty', !!st.rozsyp);
    os.classList.toggle('rozsyp', !!st.rozsyp);
    if (st.box) { const [x, y, w, h] = st.box; Object.assign(os.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }); }
    os.querySelector('.naglowek .plan').textContent = st.etykieta || '';
    znPorod.style.left = `calc(112px + (100% - 112px) * ${pct(D.rodzina.porod) / 100})`;
    znDzis.style.left = `calc(112px + (100% - 112px) * ${pct('2026-11-22') / 100})`;
    const szerTor = (st.box ? st.box[2] : 800) - 64 - 112;
    const widoczne = new Set();
    for (const o of st.plan ? PLANY[st.plan] : []) {
      const el = element(o);
      widoczne.add(o.klucz);
      const szer = (pct(o.do) - pct(plusDni(o.od, 0)) + 100 / zakres) / 100 * szerTor;
      el.className = `odc ${o.typ}${o.przepada ? ' przepada' : ''}${szer < 64 ? ' waski' : ''}${szer < 92 ? ' bez-tyg' : ''}`;
      const tyg = Math.round((dni(o.do) - dni(o.od) + 1) / 7);
      // Przepadające tygodnie: przy szerokim odcinku napis i znacznik osobno, przy wąskim razem w znaczniku
      el.querySelector('.naz').textContent = o.przepada ? (szer > 250 ? 'przepada' : '') : szer > 230 ? NAZWY[o.typ] : '';
      el.querySelector('.tyg').textContent = o.przepada && szer <= 250 ? `${tyg} tyg. przepada` : `${tyg} tyg.`;
      el.querySelector('.przepis').textContent = PRZEPISY[o.klucz] || '';
      el.style.left = pct(o.od) + '%';
      el.style.width = (pct(o.do) - pct(o.od) + 100 / zakres) + '%';
      el.style.transitionDelay = opoznienia ? (opoznienia[o.klucz] || 0) + 'ms' : '0ms';
    }
    for (const [k, el] of elOdc) if (!widoczne.has(k)) { el.classList.add('zero'); el.style.width = '0%'; }
    // Rozsypanie: każdy odcinek leci w swoje miejsce (współrzędne sceny), z lekkim obrotem
    for (const [k, el] of elOdc) {
      const cel = st.rozsyp && st.rozsyp[k];
      if (!cel) { el.style.transform = ''; el.style.width = el.classList.contains('zero') ? '0%' : el.style.width; continue; }
      el.style.transform = '';
      const skal = scena.getBoundingClientRect().width / 1920;
      const r = el.getBoundingClientRect(), rs = scena.getBoundingClientRect();
      const x0 = (r.left - rs.left) / skal, y0 = (r.top - rs.top) / skal;
      el.style.width = cel.w + 'px';
      el.querySelector('.naz').textContent = NAZWY[el.classList.contains('ojcowski') ? 'ojcowski' : el.classList.contains('rodzicielski') ? 'rodzicielski' : 'macierzynski'];
      el.classList.remove('waski', 'bez-tyg');
      el.style.transform = `translate(${cel.x - x0}px, ${cel.y - y0}px) rotate(${cel.r}deg)`;
    }
    // Decyzja i terminy (slajd 5)
    const dec = os.querySelector('.decyzja');
    dec.classList.toggle('widac', !!st.decyzja);
  }
  // Decyzja: mama kończy macierzyński, tata przejmuje następnego dnia
  {
    const przejecie = odc(B, 'tata', 'macierzynski').od;
    const dec = os.querySelector('.decyzja');
    dec.style.left = `calc(112px + (100% - 112px) * ${pct(przejecie) / 100})`;
    dec.querySelector('.etykieta').textContent = `Magda wraca po 14 tygodniach, Paweł przejmuje od ${dataKrotko(przejecie)}`;
  }

  // ── Liczniki ─────────────────────────────────────────────────────────
  const animacje = new Set();
  function licz(el, od, czas = 1400, natychmiast = false) {
    const cel = Number(el.dataset.licz), u = Number(el.dataset.u || 0), suf = el.dataset.sufiks || '';
    if (natychmiast) { el.textContent = zl(cel, u) + suf; return; }
    const t0 = performance.now();
    const a = { stop: false };
    animacje.add(a);
    const krok = (teraz) => {
      if (a.stop) return;
      const p = Math.min(1, Math.max(0, (teraz - t0) / czas)), e = 1 - Math.pow(1 - p, 3);
      el.textContent = zl(od + (cel - od) * e, u) + suf;
      if (p < 1) requestAnimationFrame(krok); else animacje.delete(a);
    };
    requestAnimationFrame(krok);
  }
  const zatrzymajLiczniki = () => { animacje.forEach((a) => (a.stop = true)); animacje.clear(); };

  // ── Slajdy: stan osi i kroki ──────────────────────────────────────────
  const BOX = {
    tytul: [1010, 540, 766, 330],
    szeroka: [144, 290, 1632, 380],
    kroki: [144, 670, 1632, 300],
    decyzje: [144, 290, 1632, 340],
    koniec: [1090, 470, 686, 300],
  };
  const tlo = document.getElementById('tlo');
  const etykiety = { A: 'Magda bierze cały urlop', B: 'Paweł przejmuje po 14 tygodniach', C: 'Podział po równo' };

  // ── Slajdy ────────────────────────────────────────────────────────────
  // Zasady (decyzje Mikołaja, 22.11): treść pojawia się razem ze slajdem; ruch jest stonowany i tylko tam,
  // gdzie coś tłumaczy. naKlik: krok 1 (zmiana planu na osi i elementy z data-k="1") rusza dopiero po
  // naciśnięciu, a następne naciśnięcie przechodzi do kolejnego slajdu.
  // Oś czasu jest tylko na slajdzie z decyzją Magdy (przykład rodziny).
  // Slajdy szukamy po data-name, nie po numerze, więc data-pomin może ukryć slajd bez psucia reszty.
  const KONFIG = {
    tytul: { os: { widoczna: false }, tlo: 'pelne', kroki: [0] },
    problem: { os: { widoczna: false }, tlo: 'cicho', kroki: [0] },
    rozwiazanie: { os: { widoczna: false }, tlo: 'cicho', kroki: [0] },
    decyzje: {
      os: { widoczna: true, box: BOX.decyzje, mala: false, plan: 'A', etykieta: etykiety.A, rozsyp: null, decyzja: false },
      tlo: 'cicho', naKlik: true, kroki: [0, 0],
      krok(n) { if (n === 1) ustawOs({ plan: 'B', etykieta: etykiety.B, decyzja: true }); },
    },
    wymagania: { os: { widoczna: false }, tlo: 'cicho', kroki: [0] },
    symulacje: { os: { widoczna: false }, tlo: 'cicho', kroki: [0] },
    kwoty: { os: { widoczna: false, decyzja: false }, tlo: 'cicho', kroki: [0] },
    korzysci: { os: { widoczna: false }, tlo: 'cicho', kroki: [0] },
    zusik: { os: { widoczna: false }, tlo: 'cicho', kroki: [0] },
    zamkniecie: { os: { widoczna: false }, tlo: 'pelne', kroki: [0] },
    zewnetrzne: { os: { widoczna: false }, tlo: 'cicho', kroki: [0] },
  };
  const SLAJDY = slajdy.map((s) => {
    const k = KONFIG[s.dataset.name];
    if (!k) throw new Error('Brak konfiguracji slajdu ' + s.dataset.name);
    if (k.kroki.length > 2) throw new Error(`Slajd ${s.dataset.name}: więcej niż jedna animacja`);
    const dataK = [...s.querySelectorAll('[data-k]')];
    if (dataK.length && !k.naKlik) throw new Error(`Slajd ${s.dataset.name}: data-k tylko na slajdach ze zmianą na klik`);
    if (dataK.some((el) => el.dataset.k !== '1')) throw new Error(`Slajd ${s.dataset.name}: data-k może mieć tylko wartość 1`);
    return k;
  });
  const pokazK = (s, n) => s.querySelectorAll('[data-k]').forEach((el) => el.classList.toggle('widac', Number(el.dataset.k) <= n));

  // ── Sterowanie ────────────────────────────────────────────────────────
  let biezacy = -1, krokBiez = 0, timery = [], koniecRuchu = 0;
  const hud = document.getElementById('hud'), notatki = document.getElementById('notatki'), postep = document.getElementById('postep');
  // Dla skryptów (PDF, nagranie, kontrole): czy slajd jeszcze się odgrywa
  window.deckBusy = () => performance.now() < koniecRuchu || animacje.size > 0;

  function natychmiast(fn, el = scena) {
    el.classList.add('natychmiast');
    fn();
    void el.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('natychmiast')));
  }
  function adres() { history.replaceState(null, '', location.search + `#${biezacy + 1}.${Math.max(0, krokBiez)}`); }
  function wykonajKrok(i, n, nat) {
    pokazK(slajdy[i], n);
    SLAJDY[i].krok?.(n, nat, slajdy[i]);
    krokBiez = n;
    adres();
  }
  // Naciśnięcie w trakcie ruchu: bieżący krok od razu w stanie końcowym
  function doKonca(i) {
    timery.forEach(clearTimeout); timery = [];
    zatrzymajLiczniki();
    koniecRuchu = 0;
    natychmiast(() => { if (krokBiez >= 0) wykonajKrok(i, krokBiez, true); });
    natychmiast(() => ustawOs({}), os);
  }
  function pokaz(i, { doKroku = null, bezRuchu = false } = {}) {
    i = Math.max(0, Math.min(slajdy.length - 1, i));
    timery.forEach(clearTimeout); timery = [];
    zatrzymajLiczniki();
    const cfg = SLAJDY[i], s = slajdy[i];
    const ost = cfg.kroki.length - 1;
    slajdy.forEach((x, k) => x.classList.toggle('aktywny', k === i));
    tlo.classList.toggle('cicho', cfg.tlo === 'cicho');
    natychmiast(() => pokazK(s, 0), s);
    // Oś pojawia się razem ze slajdem, bez przelotu
    natychmiast(() => ustawOs(cfg.os), os);
    biezacy = i; krokBiez = -1;
    if (bezRuchu) {
      const do_ = doKroku === null ? ost : Math.min(ost, doKroku);
      natychmiast(() => { for (let n = 0; n <= do_; n++) wykonajKrok(i, n, true); });
      koniecRuchu = 0;
    } else {
      s.querySelectorAll('.odZera[data-licz]').forEach((el) => { el.textContent = zl(0); });
      wykonajKrok(i, 0, false);
      if (!cfg.naKlik) cfg.kroki.slice(1).forEach((ms, n) => timery.push(setTimeout(() => wykonajKrok(i, n + 1, false), ms)));
      koniecRuchu = performance.now() + 300;
    }
    hud.textContent = `${i + 1} / ${slajdy.length}   ←/→, F pełny ekran, N notatki`;
    postep.style.width = ((i + 1) / slajdy.length) * 100 + '%';
    const a = s.querySelector('aside'); notatki.textContent = a ? a.textContent.trim() : '';
    adres();
  }
  // Naciśnięcie: w trakcie ruchu kończy go; na slajdzie naKlik najpierw uruchamia zmianę, potem idzie dalej.
  function dalej() {
    if (window.deckBusy()) { doKonca(biezacy); return; }
    const cfg = SLAJDY[biezacy];
    if (cfg.naKlik && krokBiez < cfg.kroki.length - 1) {
      wykonajKrok(biezacy, krokBiez + 1, false);
      koniecRuchu = performance.now() + 1900;
      return;
    }
    if (biezacy < slajdy.length - 1) pokaz(biezacy + 1);
  }
  const wstecz = () => pokaz(biezacy - 1, { bezRuchu: true });

  // Skala z clientWidth/clientHeight i scena position: fixed: inaczej telefon pokazuje powiększony fragment.
  function dopasuj() {
    const w = document.documentElement.clientWidth, h = document.documentElement.clientHeight;
    const k = Math.min(w / 1920, h / 1080);
    scena.style.transform = `translate(-50%, -50%) scale(${k})`;
  }
  addEventListener('resize', () => { dopasuj(); if (stanOsi?.rozsyp) natychmiast(() => ustawOs({})); });
  addEventListener('keydown', (e) => {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); dalej(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); wstecz(); }
    else if (e.key === 'Home') { e.preventDefault(); pokaz(0); }
    else if (e.key === 'End') { e.preventDefault(); pokaz(slajdy.length - 1, { bezRuchu: true }); }
    else if (e.key === 'f' || e.key === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    else if (e.key === 'n' || e.key === 'N') notatki.classList.toggle('on');
  });
  addEventListener('click', (e) => { if (notatki.contains(e.target)) return; if (e.clientX > innerWidth / 3) dalej(); else wstecz(); });
  // Telefon: przesunięcie palcem w lewo = dalej, w prawo = wstecz
  let dotykX = null;
  addEventListener('touchstart', (e) => { dotykX = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (dotykX === null) return;
    const dx = e.changedTouches[0].clientX - dotykX; dotykX = null;
    if (Math.abs(dx) > 50) { dx < 0 ? dalej() : wstecz(); }
  });

  dopasuj();
  // Adres #slajd.krok otwiera dany stan; bez kroku albo w trybie druku pokazuje stan końcowy slajdu
  const [hS, hK] = location.hash.slice(1).split('.');
  const start = Math.max(0, (parseInt(hS, 10) || 1) - 1);
  const krokZAdresu = hK !== undefined && hK !== '' ? parseInt(hK, 10) : null;
  document.fonts.ready.then(() => {
    if (FINAL) pokaz(start, { bezRuchu: true });
    else if (krokZAdresu !== null && location.hash) pokaz(start, { bezRuchu: true, doKroku: krokZAdresu });
    else pokaz(start);
    document.documentElement.dataset.gotowe = '1';
  });
})();
