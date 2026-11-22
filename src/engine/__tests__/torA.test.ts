/**
 * T9: test całości toru A tak, jak używa go aplikacja (publiczne API silnika, to samo, co wołają trasy app/api):
 * `ustalUprawnienia` → `planyDomyslne` → `walidujPlan` → `zastosujAkcje` → `przesunPlan`.
 *
 * Rodziny typowe, które jury najpewniej sprawdzi (dane fikcyjne):
 *   (a) mama na etacie, 1 dziecko, poród 2026-12-01 (wzorzec, EC-01)
 *   (b) to samo, poród 2027-01-01 (przykład mentora ZUS)
 *   (c) mama + tata na etacie
 *   (d) bliźnięta, mama + tata na etacie (EC-20)
 *   (e) mama na zleceniu z dobrowolnym chorobowym + tata na etacie (EC-02)
 *   (f) mama z działalnością (chorobowe od 2022), sama (EC-09)
 *   (g) mama nieubezpieczona + tata na etacie (EC-56)
 *   (h) wcześniak z 30. tygodnia, 1400 g, 4 tygodnie w szpitalu (EC-29)
 *   (i) mama na zleceniu bez chorobowego – brak prawa (EC-03)
 *
 * Oczekiwania pochodzą z przepisów (KP, UZ), z tabel ZADANIA.md i planu toru A oraz z odpowiedzi ZUS ze stoiska
 * (docs/pytania-do-mentora.md, 21.11). Odstępstwo silnika od przepisu albo odpowiedzi ZUS zostaje jako `it.fails`
 * z opisem – naprawia je właściwy moduł, nie ten test.
 */
import { describe, expect, it } from 'vitest';
import { daty, planyDomyslne, przesunPlan, ustalUprawnienia, walidujPlan, WERSJE_DOMYSLNE, zastosujAkcje } from '../index';
import type { Odcinek, OdpowiedzAkcja, Plan, Rodzina, Swiadczenie, Uprawnienie, WynikUprawnien } from '../types';
import { dzialalnosc, kopia, mama, rodzina, tata, zlecenie } from './rodziny';

const W = WERSJE_DOMYSLNE;
const { dodajDni, liczbaDni } = daty;

type Prawo = [osobaId: string, swiadczenie: Swiadczenie, przysluguje: boolean | 'warunkowo', kod: string];

interface Przypadek {
  nazwa: string;
  r: Rodzina;
  /** Kluczowe uprawnienia: macierzyński, rodzicielski, ojcowski (i uzupełniający, gdy ma znaczenie). */
  prawa: Prawo[];
  /** Identyfikatory planów domyślnych w kolejności z planu A4. */
  plany: string[];
}

const ETAT_TATY = tata();

const RODZINY: Record<string, Przypadek> = {
  a: {
    nazwa: '(a) mama na etacie, poród 2026-12-01',
    r: rodzina({ osoby: [mama()] }),
    prawa: [
      // UZ art. 29 ust. 1 pkt 1; KP art. 180 § 1
      ['mama', 'macierzynski', true, 'UBEZP_W_DNIU_PORODU'],
      // KP art. 182¹a § 1
      ['mama', 'rodzicielski', true, 'RODZ_PO_MACIERZYNSKIM'],
      // KP art. 182³ § 1 – tylko ojciec
      ['mama', 'ojcowski', false, 'OJC_TYLKO_DLA_OJCA'],
    ],
    plany: ['mama-caly-urlop', 'mama-pol-etatu'],
  },
  b: {
    nazwa: '(b) mama na etacie, poród 2027-01-01 (przykład mentora)',
    r: rodzina({ osoby: [mama()], data: '2027-01-01' }),
    prawa: [
      ['mama', 'macierzynski', true, 'UBEZP_W_DNIU_PORODU'],
      ['mama', 'rodzicielski', true, 'RODZ_PO_MACIERZYNSKIM'],
      ['mama', 'ojcowski', false, 'OJC_TYLKO_DLA_OJCA'],
    ],
    plany: ['mama-caly-urlop', 'mama-pol-etatu'],
  },
  c: {
    nazwa: '(c) mama + tata na etacie',
    r: rodzina({ osoby: [mama(), ETAT_TATY] }),
    prawa: [
      ['mama', 'macierzynski', true, 'UBEZP_W_DNIU_PORODU'],
      ['mama', 'rodzicielski', true, 'RODZ_PO_MACIERZYNSKIM'],
      // KP art. 180 § 5; UZ art. 29 ust. 3 – ojciec ma macierzyński tylko przez przejęcie (D3)
      ['tata', 'macierzynski', 'warunkowo', 'MAC_TYLKO_PRZEJECIE'],
      // KP art. 182¹a § 1, § 4
      ['tata', 'rodzicielski', true, 'RODZ_UBEZPIECZONY'],
      // KP art. 182³ § 1; UZ art. 29 ust. 1
      ['tata', 'ojcowski', true, 'UBEZP_W_DNIU_PORODU'],
    ],
    plany: ['mama-caly-urlop', 'po-rowno', 'tata-po-14-tyg', 'tata-swoje-9-tyg', 'mama-pol-etatu'],
  },
  d: {
    nazwa: '(d) bliźnięta, mama + tata na etacie',
    r: rodzina({ osoby: [mama(), ETAT_TATY], dzieci: [{}, {}] }),
    prawa: [
      ['mama', 'macierzynski', true, 'UBEZP_W_DNIU_PORODU'],
      ['mama', 'rodzicielski', true, 'RODZ_PO_MACIERZYNSKIM'],
      ['tata', 'macierzynski', 'warunkowo', 'MAC_TYLKO_PRZEJECIE'],
      ['tata', 'rodzicielski', true, 'RODZ_UBEZPIECZONY'],
      ['tata', 'ojcowski', true, 'UBEZP_W_DNIU_PORODU'],
    ],
    plany: ['mama-caly-urlop', 'po-rowno', 'tata-po-14-tyg', 'tata-swoje-9-tyg', 'mama-pol-etatu'],
  },
  e: {
    nazwa: '(e) mama na zleceniu z dobrowolnym chorobowym + tata na etacie',
    r: rodzina({ osoby: [mama([zlecenie()]), ETAT_TATY] }),
    prawa: [
      // UZ art. 29 ust. 1 pkt 1 – każdy tytuł z chorobowym w dniu porodu
      ['mama', 'macierzynski', true, 'UBEZP_W_DNIU_PORODU'],
      ['mama', 'rodzicielski', true, 'RODZ_PO_MACIERZYNSKIM'],
      ['tata', 'macierzynski', 'warunkowo', 'MAC_TYLKO_PRZEJECIE'],
      ['tata', 'rodzicielski', true, 'RODZ_UBEZPIECZONY'],
      ['tata', 'ojcowski', true, 'UBEZP_W_DNIU_PORODU'],
    ],
    // D16: `mama-pol-etatu` tylko przy umowie o pracę mamy (KP art. 182¹e § 1)
    plany: ['mama-caly-urlop', 'po-rowno', 'tata-po-14-tyg', 'tata-swoje-9-tyg'],
  },
  f: {
    nazwa: '(f) mama z działalnością, chorobowe od 2022, sama',
    r: rodzina({ osoby: [mama([dzialalnosc()])] }),
    prawa: [
      ['mama', 'macierzynski', true, 'UBEZP_W_DNIU_PORODU'],
      ['mama', 'rodzicielski', true, 'RODZ_PO_MACIERZYNSKIM'],
      ['mama', 'ojcowski', false, 'OJC_TYLKO_DLA_OJCA'],
    ],
    plany: ['mama-caly-urlop'],
  },
  g: {
    nazwa: '(g) mama nieubezpieczona + tata na etacie (EC-56)',
    r: rodzina({ osoby: [mama([]), ETAT_TATY] }),
    prawa: [
      // UZ art. 29 ust. 1 – bez tytułu ubezpieczenia nie ma zasiłku
      ['mama', 'macierzynski', false, 'BRAK_TYTULU_UBEZPIECZENIA'],
      ['mama', 'rodzicielski', false, 'BRAK_TYTULU_UBEZPIECZENIA'],
      ['tata', 'ojcowski', true, 'UBEZP_W_DNIU_PORODU'],
    ],
    plany: ['tata-pelny-rodzicielski'],
  },
  h: {
    nazwa: '(h) wcześniak z 30. tygodnia, 1400 g, szpital 4 tygodnie',
    r: rodzina({
      osoby: [mama()],
      dzieci: [{ tydzienCiazy: 30, masaG: 1400, szpital: [{ od: '2026-12-01', do: '2026-12-28' }] }],
    }),
    prawa: [
      ['mama', 'macierzynski', true, 'UBEZP_W_DNIU_PORODU'],
      // KP art. 180² § 1 pkt 2: 28.–37. tydzień i ponad 1000 g – dni pobytu w szpitalu, do 8 tygodni
      ['mama', 'uzupelniajacy', true, 'UZUP_POBYT_DZIECKA_W_SZPITALU'],
      ['mama', 'rodzicielski', true, 'RODZ_PO_MACIERZYNSKIM'],
    ],
    plany: ['mama-caly-urlop', 'mama-pol-etatu'],
  },
  i: {
    nazwa: '(i) mama na zleceniu bez chorobowego (brak prawa)',
    r: rodzina({ osoby: [mama([zlecenie({ chorobowe: 'brak' })])] }),
    prawa: [
      // UZ art. 29 ust. 1 – zasiłek tylko dla objętych ubezpieczeniem chorobowym
      ['mama', 'macierzynski', false, 'BRAK_CHOROBOWEGO'],
      ['mama', 'rodzicielski', false, 'BRAK_CHOROBOWEGO'],
    ],
    plany: [],
  },
};

// ───────────────────────── pomocnicze ─────────────────────────

/** Jedyny wpis dla pary (osoba, świadczenie) – D2. */
function prawo(w: WynikUprawnien, osobaId: string, sw: Swiadczenie): Uprawnienie {
  const wpisy = w.uprawnienia.filter((u) => u.osobaId === osobaId && u.swiadczenie === sw);
  expect(wpisy, `${osobaId}/${sw}`).toHaveLength(1);
  return wpisy[0];
}

function odcinek(p: Plan, id: string): Odcinek {
  const o = p.odcinki.find((x) => x.id === id);
  if (!o) throw new Error(`Brak odcinka ${id} w planie ${p.id}`);
  return o;
}

function kody(w: OdpowiedzAkcja['walidacja'], poziom: 'bledy' | 'ostrzezenia' | 'konsekwencje'): string[] {
  return w[poziom].map((k) => k.kod);
}

/** Stosuje akcję przez publiczne API; sprawdza, że plan wejściowy się nie zmienił i walidacja jest policzona. */
function akcja(r: Rodzina, plan: Plan, a: Parameters<typeof zastosujAkcje>[2]): OdpowiedzAkcja {
  const przed = kopia(plan);
  const wynik = zastosujAkcje(r, plan, a, W);
  expect(plan).toEqual(przed);
  expect(wynik.walidacja).toMatchObject({
    bledy: expect.any(Array),
    ostrzezenia: expect.any(Array),
    konsekwencje: expect.any(Array),
    wykorzystanie: expect.any(Array),
  });
  return wynik;
}

/** „Dziecko urodziło się 5 dni wcześniej”: nowa, faktyczna data zdarzenia. */
function porodWczesniej(r: Rodzina, dni: number): Rodzina {
  return { ...r, zdarzenie: { ...r.zdarzenie, data: dodajDni(r.zdarzenie.data, -dni), przewidywana: false } };
}

const umowaOPrace = (r: Rodzina, osobaId: string) =>
  r.osoby.find((o) => o.id === osobaId)?.tytuly.some((t) => t.rodzaj === 'umowa_o_prace') ?? false;

// ───────────────────────── przebieg wspólny dla każdej rodziny ─────────────────────────

describe.each(Object.values(RODZINY))('$nazwa', ({ r, prawa, plany: idPlanow }) => {
  const w = ustalUprawnienia(r, W);
  const plany = planyDomyslne(r, W);

  it('ustalUprawnienia: kluczowe świadczenia mają oczekiwane `przysluguje` i kod', () => {
    for (const [osobaId, sw, przysluguje, kod] of prawa) {
      expect(prawo(w, osobaId, sw), `${osobaId}/${sw}`).toMatchObject({ przysluguje, kod });
    }
    // Każdy wpis ma przepis i powód dla rodzica.
    for (const u of w.uprawnienia) {
      expect(u.przepis.length).toBeGreaterThan(0);
      expect(u.powod.length).toBeGreaterThan(0);
    }
    // A3: zawsze 9 możliwości, po jednej na kod.
    expect(new Set(w.mozliwosci.map((m) => m.kod)).size).toBe(9);
  });

  it('planyDomyslne: oczekiwane scenariusze; każdy plan jest poprawny', () => {
    expect(plany.map((p) => p.id)).toEqual(idPlanow);
    const ktosMaPrawo = w.uprawnienia.some(
      (u) => ['macierzynski', 'rodzicielski', 'ojcowski'].includes(u.swiadczenie) && u.przysluguje !== false,
    );
    expect(plany.length > 0).toBe(ktosMaPrawo);
    for (const p of plany) {
      const wal = walidujPlan(r, p, W);
      expect(wal.bledy.map((b) => b.kod), p.id).toEqual([]);
      expect(wal.poprawny, p.id).toBe(true);
    }
  });

  const pierwszy = plany[0];
  if (!pierwszy) return;

  const ojciec = r.osoby.find((o) => o.rola === 'ojciec');
  const macMamy = pierwszy.odcinki.find((o) => o.osobaId === 'mama' && o.typ === 'macierzynski');
  if (ojciec && macMamy) {
    it('zastosujAkcje rezygnacja_matki po 14 tygodniach: tata przejmuje resztę macierzyńskiego, plan poprawny', () => {
      const pule = w.pule;
      const { plan, walidacja } = akcja(r, pierwszy, { typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: ojciec.id });
      // KP art. 180 § 4–5: mama co najmniej 14 tygodni, ojciec od następnego dnia do końca puli.
      const koniecMamy = dodajDni(r.zdarzenie.data, pule.obowiazkoweMatkiTyg * 7 - 1);
      expect(odcinek(plan, macMamy.id)).toMatchObject({ od: r.zdarzenie.data, do: koniecMamy });
      expect(odcinek(plan, 'tata-macierzynski-1')).toMatchObject({
        osobaId: ojciec.id,
        od: dodajDni(koniecMamy, 1),
        do: dodajDni(r.zdarzenie.data, pule.macierzynskiTyg * 7 - 1),
      });
      expect(walidacja.poprawny).toBe(true);
      expect(kody(walidacja, 'konsekwencje')).toContain('OJCIEC_MUSI_PRZEJAC');
    });
  }

  const rodz = pierwszy.odcinki.find((o) => o.typ === 'rodzicielski');
  if (rodz && umowaOPrace(r, rodz.osobaId)) {
    it('zastosujAkcje polacz_z_praca 0,5: odcinek dłuższy (KP art. 182¹f), plan poprawny', () => {
      const { plan, walidacja } = akcja(r, pierwszy, { typ: 'polacz_z_praca', odcinekId: rodz.id, wymiarPracy: 0.5 });
      const nowy = odcinek(plan, rodz.id);
      expect(nowy.wymiarPracy).toBe(0.5);
      expect(nowy.od).toBe(rodz.od);
      // D10, KP art. 182¹f § 7: przy pół etatu długość = dni ÷ (1 − 0,5) = dwa razy dłużej.
      expect(liczbaDni(nowy.od, nowy.do)).toBe(liczbaDni(rodz.od, rodz.do) * 2);
      expect(walidacja.poprawny).toBe(true);
      expect(kody(walidacja, 'konsekwencje')).toContain('LACZENIE_WYDLUZA_URLOP');
    });
  }

  if (rodz) {
    it('zastosujAkcje podziel: dwa stykające się odcinki, walidacja policzona, plan poprawny', () => {
      const dzien = dodajDni(rodz.od, 10 * 7); // pełne tygodnie (odpowiedź ZUS, pytanie 15)
      const { plan, walidacja } = akcja(r, pierwszy, { typ: 'podziel', odcinekId: rodz.id, pierwszyDzienDrugiejCzesci: dzien });
      const czesci = plan.odcinki.filter((o) => o.osobaId === rodz.osobaId && o.typ === 'rodzicielski');
      expect(czesci).toHaveLength(2);
      expect(czesci[0]).toMatchObject({ od: rodz.od, do: dodajDni(dzien, -1) });
      expect(czesci[1]).toMatchObject({ od: dzien, do: rodz.do });
      expect(walidacja.poprawny).toBe(true);
    });
  }

  it('przesunPlan: poród 5 dni wcześniej – wszystkie plany przesunięte o 5 dni i nadal poprawne (KP art. 180 § 3)', () => {
    const r2 = porodWczesniej(r, 5);
    for (const p of plany) {
      const przed = kopia(p);
      const { plan, walidacja } = przesunPlan(r2, p, r.zdarzenie.data, W);
      expect(p).toEqual(przed);
      // Bez urlopu przed porodem każdy odcinek przesuwa się o różnicę dat (plan A6, `przesunPlan`).
      expect(plan.odcinki.map((o) => [o.id, o.od, o.do])).toEqual(
        p.odcinki.map((o) => [o.id, dodajDni(o.od, -5), dodajDni(o.do, -5)]),
      );
      expect(walidacja.bledy.map((b) => b.kod), p.id).toEqual([]);
      expect(walidacja.poprawny, p.id).toBe(true);
    }
  });
});

// ───────────────────────── szczegóły rodzin ─────────────────────────

describe('(a) wzorzec EC-01', () => {
  const { r } = RODZINY.a;

  it('pule i daty graniczne', () => {
    expect(ustalUprawnienia(r, W).pule).toMatchObject({
      macierzynskiTyg: 20,
      obowiazkoweMatkiTyg: 14,
      rodzicielskiTyg: 41,
      rodzicielskiNieprzenoszalneTyg: 9,
      rodzicielskiMaxZPracaTyg: 82,
      ojcowskiTyg: 2,
      rodzicielskiDoKiedy: '2032-12-31',
      ojcowskiDoKiedy: '2027-11-30',
      wniosek815DoKiedy: '2026-12-22',
    });
  });

  it('mama-caly-urlop: macierzyński 2026-12-01–2027-04-19, rodzicielski 2027-04-20–2027-11-29 (32 tyg.)', () => {
    const [p] = planyDomyslne(r, W);
    expect(p.odcinki.map((o) => [o.typ, o.od, o.do])).toEqual([
      ['macierzynski', '2026-12-01', '2027-04-19'],
      ['rodzicielski', '2027-04-20', '2027-11-29'],
    ]);
    // KP art. 182¹a § 4: mama sama – 9 tygodni drugiego rodzica przepada.
    expect(walidujPlan(r, p, W).ostrzezenia.map((k) => k.kod)).toContain('RODZ_9_TYG_DRUGIEGO_RODZICA');
  });

  it('mama-pol-etatu: rodzicielski z pracą 0,5 do 2028-07-10 (D16)', () => {
    const p = planyDomyslne(r, W).find((x) => x.id === 'mama-pol-etatu')!;
    expect(odcinek(p, 'mama-rodzicielski-1')).toMatchObject({ od: '2027-04-20', do: '2028-07-10', wymiarPracy: 0.5 });
  });
});

describe('(b) przykład mentora: poród 2027-01-01', () => {
  const { r } = RODZINY.b;
  const pule = ustalUprawnienia(r, W).pule;

  it('macierzyński 2027-01-01–2027-05-20', () => {
    // KP art. 180 § 1 pkt 1: 20 tygodni = 140 dni, od dnia porodu włącznie: 2027-01-01 + 139 dni.
    // Styczeń 31 + luty 28 + marzec 31 + kwiecień 30 = 120 dni (do 30.04), + 20 dni maja = 140 → 2027-05-20.
    const [p] = planyDomyslne(r, W);
    expect(odcinek(p, 'mama-macierzynski-1')).toMatchObject({ od: '2027-01-01', do: '2027-05-20' });
    // Rodzicielski od następnego dnia, 41 − 9 = 32 tygodnie = 224 dni → 2027-05-21 + 223 dni = 2027-12-30.
    expect(odcinek(p, 'mama-rodzicielski-1')).toMatchObject({ od: '2027-05-21', do: '2027-12-30' });
  });

  it('rodzicielskiDoKiedy 2033-12-31', () => {
    // KP art. 182¹c § 1: do końca roku kalendarzowego, w którym dziecko kończy 6 lat: 2027 + 6 = 2033 → 31.12.2033.
    expect(pule.rodzicielskiDoKiedy).toBe('2033-12-31');
  });

  it('ojcowskiDoKiedy 2027-12-31', () => {
    // KP art. 182³ § 1 pkt 1: do ukończenia przez dziecko 12 miesięcy. Pierwsze urodziny 2028-01-01, wiek kończy się
    // z początkiem dnia urodzin (KC art. 112 przez KP art. 300; pytanie 12) → ostatni dzień 2027-12-31.
    expect(pule.ojcowskiDoKiedy).toBe('2027-12-31');
  });

  it('wniosek815DoKiedy 2027-01-22', () => {
    // UZ art. 30a ust. 1: wniosek nie później niż 21 dni po porodzie. Termin liczony od dnia po porodzie (KC art. 111 § 2,
    // pytanie 23, D18): 2027-01-02 jest dniem 1., 2027-01-22 – dniem 21.
    expect(pule.wniosek815DoKiedy).toBe('2027-01-22');
  });
});

describe('(c) mama + tata na etacie', () => {
  const { r } = RODZINY.c;
  const plany = planyDomyslne(r, W);

  it('scenariusze z planu A4 (D13–D17)', () => {
    const zakresy = (id: string) => plany.find((p) => p.id === id)!.odcinki.map((o) => [o.id, o.od, o.do]);
    expect(zakresy('po-rowno')).toEqual([
      ['mama-macierzynski-1', '2026-12-01', '2027-04-19'],
      ['mama-rodzicielski-1', '2027-04-20', '2027-07-05'],
      ['tata-rodzicielski-1', '2027-07-06', '2028-01-31'],
      ['tata-ojcowski-1', '2026-12-01', '2026-12-14'],
    ]);
    expect(zakresy('tata-po-14-tyg')).toEqual([
      ['mama-macierzynski-1', '2026-12-01', '2027-03-08'],
      ['tata-macierzynski-1', '2027-03-09', '2027-04-19'],
      ['tata-rodzicielski-1', '2027-04-20', '2027-11-29'],
      ['tata-ojcowski-1', '2026-12-01', '2026-12-14'],
    ]);
    expect(zakresy('tata-swoje-9-tyg')).toContainEqual(['tata-rodzicielski-1', '2027-11-30', '2028-01-31']);
  });

  it('ryzyko „9 tygodni przepadnie” dla każdego z rodziców (KP art. 182¹a § 4)', () => {
    const ryz = ustalUprawnienia(r, W).ryzyka.filter((x) => x.kod === 'RODZ_9_TYG_PRZEPADNIE');
    expect(ryz.map((x) => x.osobaId).sort()).toEqual(['mama', 'tata']);
  });

  it('rezygnacja_matki na planie wzorcowym: daty z tabeli A6', () => {
    const { plan } = zastosujAkcje(r, plany[0], { typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: 'tata' }, W);
    expect(odcinek(plan, 'mama-macierzynski-1').do).toBe('2027-03-08');
    expect(odcinek(plan, 'tata-macierzynski-1')).toMatchObject({ od: '2027-03-09', do: '2027-04-19', tytulId: 'etat-taty' });
  });
});

describe('(d) bliźnięta', () => {
  const { r } = RODZINY.d;

  it('pule: 31 tyg. macierzyńskiego, 43 rodzicielskiego, 86 z pracą (KP art. 180 § 1 pkt 2, 182¹a § 1 pkt 2)', () => {
    expect(ustalUprawnienia(r, W).pule).toMatchObject({ macierzynskiTyg: 31, rodzicielskiTyg: 43, rodzicielskiMaxZPracaTyg: 86 });
  });

  it('po-rowno według D14: mama 28 mac + 9 rodz, tata 3 mac + 34 rodz', () => {
    // T = 31 + 43 = 74; po 37 tygodni. Tata 37 > R − N = 34 → tata 34 rodz + 3 mac, mama 31 − 3 = 28 mac + 9 rodz.
    const p = planyDomyslne(r, W).find((x) => x.id === 'po-rowno')!;
    const dni = (id: string) => liczbaDni(odcinek(p, id).od, odcinek(p, id).do);
    expect(dni('mama-macierzynski-1')).toBe(28 * 7);
    expect(dni('tata-macierzynski-1')).toBe(3 * 7);
    expect(dni('tata-rodzicielski-1')).toBe(34 * 7);
    expect(dni('mama-rodzicielski-1')).toBe(9 * 7);
  });
});

describe('(e) mama na zleceniu + tata na etacie', () => {
  const { r } = RODZINY.e;

  it('zasiłek mamy z tytułu zlecenia; ryzyko ponownego zgłoszenia po zasiłku (D4)', () => {
    const w = ustalUprawnienia(r, W);
    expect(prawo(w, 'mama', 'macierzynski').tytulId).toBe('zlecenie-1');
    expect(w.ryzyka.map((x) => x.kod)).toContain('PONOWNE_ZGLOSZENIE_PO_ZASILKU');
  });

  it('polacz_z_praca u mamy na zleceniu: AKCJA_NIEMOZLIWA (KP art. 182¹e § 1, pytanie 10)', () => {
    const [p] = planyDomyslne(r, W);
    const { walidacja } = akcja(r, p, { typ: 'polacz_z_praca', odcinekId: 'mama-rodzicielski-1', wymiarPracy: 0.5 });
    expect(walidacja.poprawny).toBe(false);
    expect(kody(walidacja, 'bledy')).toContain('AKCJA_NIEMOZLIWA');
  });
});

describe('(f) mama z działalnością', () => {
  const { r } = RODZINY.f;

  it('bez ryzyka późnego zgłoszenia (chorobowe od 2022); łączenie z pracą niedostępne', () => {
    const w = ustalUprawnienia(r, W);
    expect(w.ryzyka.map((x) => x.kod)).not.toContain('POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA');
    expect(w.ryzyka.map((x) => x.kod)).toContain('PONOWNE_ZGLOSZENIE_PO_ZASILKU');
    expect(w.mozliwosci.find((m) => m.kod === 'laczenie_z_praca')?.dostepna).toBe(false);
  });
});

describe('(g) EC-56: mama nieubezpieczona, tata na etacie', () => {
  const { r } = RODZINY.g;
  const w = ustalUprawnienia(r, W);

  it('mama bez zasiłku, z alternatywą (świadczenie rodzicielskie); tata ma rodzicielski z kodem MATKA_NIEUBEZPIECZONA', () => {
    expect(prawo(w, 'mama', 'macierzynski').alternatywa).toBeTruthy();
    expect(prawo(w, 'tata', 'rodzicielski').kod).toBe('MATKA_NIEUBEZPIECZONA');
    expect(prawo(w, 'tata', 'rodzicielski').przysluguje).not.toBe(false);
  });

  it('plan taty: ojcowski, a dzień po nim rodzicielski 32 tygodnie (41 − 9, odpowiedź ZUS, pytania 6 i 16)', () => {
    const [p] = planyDomyslne(r, W);
    const rodz = odcinek(p, 'tata-rodzicielski-1');
    expect(liczbaDni(rodz.od, rodz.do)).toBe(32 * 7);
    expect(odcinek(p, 'tata-ojcowski-1')).toMatchObject({ od: '2026-12-01', do: '2026-12-14' });
    expect(rodz).toMatchObject({ od: '2026-12-15', do: '2027-07-26' });
    expect(walidujPlan(r, p, W).poprawny).toBe(true);
  });

  it('rezygnacja_matki bez macierzyńskiego mamy w planie: AKCJA_NIEMOZLIWA', () => {
    const [p] = planyDomyslne(r, W);
    const { walidacja } = akcja(r, p, { typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: 'tata' });
    expect(kody(walidacja, 'bledy')).toContain('AKCJA_NIEMOZLIWA');
  });

  // Odpowiedź ZUS na stoisku (pytania 6 i 14): tata dostaje zasiłek za okres urlopu rodzicielskiego za 32 tygodnie
  // (41 − 9) – sprawa rozstrzygnięta, więc bez `'warunkowo'` i bez dopisku „do potwierdzenia”
  // (KP art. 182¹a § 4; UZ art. 29a ust. 1, art. 31 ust. 3h).
  it('tata: rodzicielski przysługuje na pewno (true), bez dopisku „do potwierdzenia” – odpowiedź ZUS, pytanie 6', () => {
    const u = prawo(w, 'tata', 'rodzicielski');
    expect(u.przysluguje).toBe(true);
    expect(u.powod).not.toMatch(/potwierdzenia/);
  });
});

describe('(h) wcześniak z 30. tygodnia', () => {
  const { r } = RODZINY.h;

  it('uzupełniający 4 tygodnie (28 dni w szpitalu, ceil(28/7)) bezpośrednio po macierzyńskim (KP art. 180² § 1 pkt 2)', () => {
    expect(ustalUprawnienia(r, W).pule.uzupelniajacyTyg).toBe(4);
    const [p] = planyDomyslne(r, W);
    expect(p.odcinki.map((o) => [o.typ, o.od, o.do])).toEqual([
      ['macierzynski', '2026-12-01', '2027-04-19'],
      ['uzupelniajacy', '2027-04-20', '2027-05-17'],
      ['rodzicielski', '2027-05-18', '2027-12-27'],
    ]);
  });
});

describe('(i) mama na zleceniu bez chorobowego', () => {
  const { r } = RODZINY.i;

  it('brak prawa: alternatywa świadczenie rodzicielskie, pusta lista planów, wariant 81,5% niedostępny', () => {
    const w = ustalUprawnienia(r, W);
    expect(prawo(w, 'mama', 'macierzynski').alternatywa).toBeTruthy();
    expect(w.uprawnienia.filter((u) => u.przysluguje !== false)).toEqual([]);
    expect(w.mozliwosci.find((m) => m.kod === 'wariant_815')?.dostepna).toBe(false);
    expect(planyDomyslne(r, W)).toEqual([]);
  });
});
