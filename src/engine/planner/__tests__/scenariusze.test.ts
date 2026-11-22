/**
 * Plany domyślne i scenariusze – tor A, zadanie A4 (docs/superpowers/plans/2026-11-21-tor-a.md, D11, D13–D17).
 * Testy sprawdzają identyfikatory, daty i liczby, nie treść nazw.
 */
import { describe, expect, it } from 'vitest';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { dodajDni, liczbaDni } from '../../daty';
import { ustalUprawnienia } from '../../eligibility';
import { WERSJE_DOMYSLNE } from '../../params';
import type { Odcinek, Plan, Rodzina } from '../../types';
import { etat, kopia, mama, P, rodzina, tata, zlecenie } from '../../__tests__/rodziny';
import { planyDomyslne, walidujPlan } from '..';
import { zbudujScenariusze } from '../scenariusze';

const plany = (r: Rodzina): Plan[] => planyDomyslne(r, WERSJE_DOMYSLNE);
const idy = (r: Rodzina): string[] => plany(r).map((p) => p.id);

function scenariusz(r: Rodzina, id: string): Plan {
  const s = plany(r).find((p) => p.id === id);
  if (!s) throw new Error(`brak scenariusza ${id}`);
  return s;
}

function odc(pl: Plan, id: string): Odcinek {
  const o = pl.odcinki.find((x) => x.id === id);
  if (!o) throw new Error(`brak odcinka ${id} w planie ${pl.id}`);
  return o;
}

/** [od, do] odcinka – krótko do porównań. */
const daty = (o: Odcinek): [string, string] => [o.od, o.do];

const SAMA = rodzina({ osoby: [mama()] });
const PARA = rodzina({ osoby: [mama(), tata()] });
const BLIZNIETA = rodzina({ osoby: [mama(), tata()], dzieci: [{}, {}] });
const TROJACZKI = rodzina({ osoby: [mama(), tata()], dzieci: [{}, {}, {}] });
const ZA_ZYCIEM = rodzina({ osoby: [mama(), tata()], dzieci: [{ zaZyciem: true }] });
const EC56 = rodzina({ osoby: [mama([]), tata()] });
/** EC-28: wcześniak z 26. tygodnia, 900 g, szpital 10 tygodni → uzupełniający 10 tygodni (pule.test.ts). */
const EC28 = rodzina({
  osoby: [mama(), tata()],
  przewidywana: false,
  dzieci: [{ tydzienCiazy: 26, masaG: 900, szpital: [{ od: '2026-12-01', do: '2027-02-08' }] }],
});
const ZGON_MATKI = rodzina({ osoby: [mama([], { zdrowie: { zgon: '2026-12-10' } }), tata()] });
const PORZUCENIE = rodzina({ osoby: [mama([], { zdrowie: { porzucenieDziecka: '2027-03-01' } }), tata()] });
const MAMA_ZLECENIE = rodzina({ osoby: [mama([zlecenie()]), tata()] });

// ───────── EC-01, mama sama ─────────

describe('EC-01: mama sama na etacie', () => {
  it('scenariusze: tylko „mama cały urlop” i „mama pół etatu” (bez drugiej osoby nie ma scenariuszy z tatą)', () => {
    expect(idy(SAMA)).toEqual(['mama-caly-urlop', 'mama-pol-etatu']);
  });

  it('mama-caly-urlop: macierzyński 2026-12-01–2027-04-19, rodzicielski 2027-04-20–2027-11-29 (32 tyg.), id według D11', () => {
    const pl = scenariusz(SAMA, 'mama-caly-urlop');
    expect(pl.wariant815).toBe(false);
    expect(pl.odcinki).toEqual([
      { id: 'mama-macierzynski-1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-04-19', tytulId: 'etat-1' },
      { id: 'mama-rodzicielski-1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-11-29', czescNr: 1, tytulId: 'etat-1' },
    ]);
    expect(liczbaDni('2027-04-20', '2027-11-29')).toBe(32 * 7);
  });

  it('kontrakt: pierwszy plan dla przykładu wzorcowego ma ten sam kształt odcinków co PRZYKLAD_PLAN', () => {
    const [pierwszy] = plany(PRZYKLAD_RODZINA);
    const bezId = (o: Odcinek) => {
      const { id, ...reszta } = o;
      void id;
      return reszta;
    };
    expect(pierwszy.id).toBe(PRZYKLAD_PLAN.id);
    expect(pierwszy.wariant815).toBe(PRZYKLAD_PLAN.wariant815);
    expect(pierwszy.odcinki.map(bezId)).toEqual(PRZYKLAD_PLAN.odcinki.map(bezId));
  });
});

// ───────── EC-01 + tata na etacie ─────────

describe('EC-01 + tata na etacie: pięć scenariuszy (tabela A4 z planu toru A)', () => {
  it('kolejność i identyfikatory', () => {
    expect(idy(PARA)).toEqual(['mama-caly-urlop', 'po-rowno', 'tata-po-14-tyg', 'tata-swoje-9-tyg', 'mama-pol-etatu']);
  });

  it('mama-caly-urlop bez ojcowskiego (D13)', () => {
    const pl = scenariusz(PARA, 'mama-caly-urlop');
    expect(pl.odcinki.map((o) => o.id)).toEqual(['mama-macierzynski-1', 'mama-rodzicielski-1']);
  });

  it('po-rowno: mama 20 tyg. mac + 11 tyg. rodz, tata 30 tyg. rodz i ojcowski od dnia porodu (D13, D14)', () => {
    const pl = scenariusz(PARA, 'po-rowno');
    expect(pl.odcinki).toHaveLength(4);
    expect(daty(odc(pl, 'mama-macierzynski-1'))).toEqual(['2026-12-01', '2027-04-19']);
    expect(daty(odc(pl, 'mama-rodzicielski-1'))).toEqual(['2027-04-20', '2027-07-05']);
    expect(daty(odc(pl, 'tata-rodzicielski-1'))).toEqual(['2027-07-06', '2028-01-31']);
    expect(daty(odc(pl, 'tata-ojcowski-1'))).toEqual(['2026-12-01', '2026-12-14']);
    expect(liczbaDni('2027-04-20', '2027-07-05')).toBe(11 * 7);
    expect(liczbaDni('2027-07-06', '2028-01-31')).toBe(30 * 7);
    expect(odc(pl, 'tata-rodzicielski-1')).toMatchObject({ tytulId: 'etat-taty', czescNr: 1 });
    expect(odc(pl, 'tata-ojcowski-1')).toMatchObject({ tytulId: 'etat-taty', czescNr: 1 });
  });

  it('tata-po-14-tyg: mama do 2027-03-08, tata przejmuje macierzyński 2027-03-09–2027-04-19, potem 32 tyg. rodz (D15)', () => {
    const pl = scenariusz(PARA, 'tata-po-14-tyg');
    expect(pl.odcinki).toHaveLength(4);
    expect(daty(odc(pl, 'mama-macierzynski-1'))).toEqual(['2026-12-01', '2027-03-08']);
    expect(odc(pl, 'tata-macierzynski-1')).toMatchObject({ od: '2027-03-09', do: '2027-04-19', tytulId: 'etat-taty' });
    expect(odc(pl, 'tata-macierzynski-1').czescNr).toBeUndefined();
    expect(daty(odc(pl, 'tata-rodzicielski-1'))).toEqual(['2027-04-20', '2027-11-29']);
    expect(daty(odc(pl, 'tata-ojcowski-1'))).toEqual(['2026-12-01', '2026-12-14']);
  });

  it('tata-swoje-9-tyg: mama jak „cały urlop”, tata 63 dni rodzicielskiego od dnia po mamie i 14 dni ojcowskiego (D17)', () => {
    const pl = scenariusz(PARA, 'tata-swoje-9-tyg');
    expect(pl.odcinki).toHaveLength(4);
    expect(daty(odc(pl, 'mama-macierzynski-1'))).toEqual(['2026-12-01', '2027-04-19']);
    expect(daty(odc(pl, 'mama-rodzicielski-1'))).toEqual(['2027-04-20', '2027-11-29']);
    const r = odc(pl, 'tata-rodzicielski-1');
    expect(daty(r)).toEqual(['2027-11-30', '2028-01-31']);
    expect(liczbaDni(r.od, r.do)).toBe(63);
    const o = odc(pl, 'tata-ojcowski-1');
    expect(liczbaDni(o.od, o.do)).toBe(14);
    expect(o.od).toBe('2026-12-01');
  });

  it('mama-pol-etatu: rodzicielski 2027-04-20–2028-07-10 (448 dni) z pracą na 0,5 etatu, bez ojcowskiego (D16)', () => {
    const pl = scenariusz(PARA, 'mama-pol-etatu');
    expect(pl.odcinki).toEqual([
      { id: 'mama-macierzynski-1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-04-19', tytulId: 'etat-1' },
      {
        id: 'mama-rodzicielski-1',
        osobaId: 'mama',
        typ: 'rodzicielski',
        od: '2027-04-20',
        do: '2028-07-10',
        wymiarPracy: 0.5,
        czescNr: 1,
        tytulId: 'etat-1',
      },
    ]);
    expect(liczbaDni('2027-04-20', '2028-07-10')).toBe(448);
  });

  it('nazwy planów są niepuste i różne', () => {
    const nazwy = plany(PARA).map((p) => p.nazwa);
    expect(nazwy.every((n) => n.trim().length > 0)).toBe(true);
    expect(new Set(nazwy).size).toBe(nazwy.length);
  });

  it('identyfikatory odcinków w planie są unikalne', () => {
    for (const pl of plany(PARA)) {
      const id = pl.odcinki.map((o) => o.id);
      expect(new Set(id).size).toBe(id.length);
    }
  });
});

// ───────── po-rowno dla większej puli (D14) ─────────

describe('po-rowno: długości z puli', () => {
  it('bliźnięta (mac 31, rodz 43): mama 28 mac + 9 rodz, tata 3 mac + 34 rodz', () => {
    // T = 31 + 43 = 74 → mama 37, tata 37 > 43 − 9 = 34 → tata rodz 34, tata mac 3, mama mac 28, mama rodz 9.
    // mama mac 196 dni: 2026-12-01 + 195 = 2027-06-14; tata mac 21 dni: 2027-06-15–2027-07-05;
    // tata rodz 238 dni: 2027-07-06 + 237 = 2028-02-28; mama rodz 63 dni: 2028-02-29 (rok przestępny) + 62 = 2028-05-01.
    const pl = scenariusz(BLIZNIETA, 'po-rowno');
    expect(daty(odc(pl, 'mama-macierzynski-1'))).toEqual(['2026-12-01', '2027-06-14']);
    expect(daty(odc(pl, 'tata-macierzynski-1'))).toEqual(['2027-06-15', '2027-07-05']);
    expect(daty(odc(pl, 'tata-rodzicielski-1'))).toEqual(['2027-07-06', '2028-02-28']);
    expect(daty(odc(pl, 'mama-rodzicielski-1'))).toEqual(['2028-02-29', '2028-05-01']);
    expect(daty(odc(pl, 'tata-ojcowski-1'))).toEqual(['2026-12-01', '2026-12-14']);
  });

  it('trojaczki (mac 33, rodz 43): mama 29 mac + 9 rodz, tata 4 mac + 34 rodz', () => {
    // T = 33 + 43 = 76 → mama 38, tata 38 > 34 → tata rodz 34, tata mac 4, mama mac 29 (≥ 14), mama rodz 9.
    // Wyliczenie ręczne:
    //  mama mac 29 × 7 = 203 dni od 2026-12-01: do 31.12 – 31 dni, do 31.01 – 62, do 28.02 – 90, do 31.03 – 121,
    //    do 30.04 – 151, do 31.05 – 182, + 21 dni czerwca = 203 → koniec 2027-06-21;
    //  tata mac 4 × 7 = 28 dni: 2027-06-22 + 27 = 2027-07-19;
    //  tata rodz 34 × 7 = 238 dni od 2027-07-20: 12 dni lipca, + 31 (sie) = 43, + 30 (wrz) = 73, + 31 (paź) = 104,
    //    + 30 (lis) = 134, + 31 (gru) = 165, + 31 (sty 2028) = 196, + 29 (lut 2028, przestępny) = 225,
    //    + 13 dni marca = 238 → koniec 2028-03-13;
    //  mama rodz 9 × 7 = 63 dni od 2028-03-14: 18 dni marca, + 30 (kwi) = 48, + 15 dni maja = 63 → koniec 2028-05-15.
    const pl = scenariusz(TROJACZKI, 'po-rowno');
    expect(pl.odcinki.map((o) => o.id)).toEqual([
      'mama-macierzynski-1',
      'tata-macierzynski-1',
      'tata-rodzicielski-1',
      'mama-rodzicielski-1',
      'tata-ojcowski-1',
    ]);
    expect(daty(odc(pl, 'mama-macierzynski-1'))).toEqual(['2026-12-01', '2027-06-21']);
    expect(daty(odc(pl, 'tata-macierzynski-1'))).toEqual(['2027-06-22', '2027-07-19']);
    expect(daty(odc(pl, 'tata-rodzicielski-1'))).toEqual(['2027-07-20', '2028-03-13']);
    expect(daty(odc(pl, 'mama-rodzicielski-1'))).toEqual(['2028-03-14', '2028-05-15']);
  });

  it('„Za życiem” (mac 20, rodz 65): mama 20 mac + 23 rodz, tata 42 rodz', () => {
    const pl = scenariusz(ZA_ZYCIEM, 'po-rowno');
    const m = odc(pl, 'mama-rodzicielski-1');
    const t = odc(pl, 'tata-rodzicielski-1');
    expect(liczbaDni(m.od, m.do)).toBe(23 * 7);
    expect(liczbaDni(t.od, t.do)).toBe(42 * 7);
    expect(pl.odcinki.some((o) => o.osobaId === 'tata' && o.typ === 'macierzynski')).toBe(false);
  });

  it('„Za życiem”: mama-pol-etatu – rodzicielski (65 − 9) × 7 dni bazowych, wydłużony do 2 × tyle', () => {
    const r = odc(scenariusz(ZA_ZYCIEM, 'mama-pol-etatu'), 'mama-rodzicielski-1');
    expect(liczbaDni(r.od, r.do)).toBe(56 * 7 * 2);
  });

  it('po-rowno nie ma, gdy mama miałaby mniej niż obowiązkowe tygodnie macierzyńskiego', () => {
    // Bliźnięta: po równo mama ma 28 tyg. macierzyńskiego. Gdyby obowiązkowe były 29 tyg., mama musiałaby oddać tacie
    // część okresu obowiązkowego – takiego scenariusza nie ma.
    const p = P();
    const r = BLIZNIETA;
    const u = ustalUprawnienia(r, WERSJE_DOMYSLNE);
    const ostre = { ...u, pule: { ...u.pule, obowiazkoweMatkiTyg: 29 } };
    expect(zbudujScenariusze(r, ostre, p).map((x) => x.id)).not.toContain('po-rowno');
    // Bez zmiany – jest.
    expect(zbudujScenariusze(r, u, p).map((x) => x.id)).toContain('po-rowno');
  });
});

// ───────── tabela A4 z ZADANIA.md ─────────

describe('kto ma prawo', () => {
  it('EC-56: matka bez prawa, ojciec z prawem – pierwszy (jedyny) plan od ojca: ojcowski od porodu, pula − 9 tygodni (odpowiedź ZUS 21.11, pytanie 6)', () => {
    const lista = plany(EC56);
    expect(lista.map((p) => p.id)).toEqual(['tata-pelny-rodzicielski']);
    const pl = lista[0];
    expect(pl.odcinki.every((o) => o.osobaId === 'tata')).toBe(true);
    expect(daty(odc(pl, 'tata-ojcowski-1'))).toEqual(['2026-12-01', '2026-12-14']);
    // Start dzień po ojcowskim (odpowiedź ZUS 21.11, pytanie 16: rodzicielski może zacząć się wcześniej niż po
    // macierzyńskim, którego mama i tak nie ma), 41 − 9 = 32 tygodnie.
    const r = odc(pl, 'tata-rodzicielski-1');
    expect(daty(r)).toEqual(['2026-12-15', '2027-07-26']);
    expect(liczbaDni(r.od, r.do)).toBe((41 - 9) * 7);
    expect(r.tytulId).toBe('etat-taty');
  });

  it('EC-56: walidacja bez błędów; 9 tygodni mamy przepada (RODZ_9_TYG_DRUGIEGO_RODZICA), bez „do potwierdzenia”', () => {
    const w = walidujPlan(EC56, plany(EC56)[0], WERSJE_DOMYSLNE);
    expect(w.poprawny).toBe(true);
    expect(w.ostrzezenia.find((k) => k.kod === 'RODZ_9_TYG_DRUGIEGO_RODZICA')?.osobaId).toBe('mama');
    expect(w.wykorzystanie.find((x) => x.pula === 'rodzicielski')?.przepadnieDni).toBe(63);
  });

  it('sam tata bez matki w rodzinie: plan od ojca bez 9 tygodni drugiego rodzica (pytanie 14)', () => {
    const r = rodzina({ osoby: [tata()] });
    const lista = plany(r);
    expect(lista.map((p) => p.id)).toEqual(['tata-pelny-rodzicielski']);
    const rodz = odc(lista[0], 'tata-rodzicielski-1');
    expect(liczbaDni(rodz.od, rodz.do)).toBe((41 - 9) * 7);
    expect(rodz.od).toBe(dodajDni(odc(lista[0], 'tata-ojcowski-1').do, 1));
  });

  it('EC-56, tata bez prawa do ojcowskiego: rodzicielski od dnia porodu', () => {
    const u = ustalUprawnienia(EC56, WERSJE_DOMYSLNE);
    const bezOjcowskiego = { ...u, uprawnienia: u.uprawnienia.filter((x) => !(x.osobaId === 'tata' && x.swiadczenie === 'ojcowski')) };
    const pl = zbudujScenariusze(EC56, bezOjcowskiego, P())[0];
    expect(pl.odcinki.map((o) => o.id)).toEqual(['tata-rodzicielski-1']);
    expect(daty(odc(pl, 'tata-rodzicielski-1'))).toEqual(['2026-12-01', '2027-07-12']);
  });

  it('nikt nie ma prawa – pusta lista', () => {
    const r = rodzina({ osoby: [mama([zlecenie({ chorobowe: 'brak' })]), tata([zlecenie({ id: 'z-taty', chorobowe: 'brak' })])] });
    expect(plany(r)).toEqual([]);
  });

  it('rodzina zastępcza zawodowa – pusta lista', () => {
    expect(plany(rodzina({ osoby: [mama(), tata()], typ: 'rodzina_zastepcza_zawodowa', dzieci: [{ dataUrodzenia: '2024-01-01' }] }))).toEqual([]);
  });

  it('tata bez ubezpieczenia chorobowego – tylko scenariusze mamy', () => {
    const r = rodzina({ osoby: [mama(), tata([zlecenie({ id: 'z-taty', chorobowe: 'brak' })])] });
    expect(idy(r)).toEqual(['mama-caly-urlop', 'mama-pol-etatu']);
  });

  it('mama na zleceniu: bez „mama pół etatu” (łączenie tylko przy umowie o pracę, D16), tytulId = zlecenie', () => {
    expect(idy(MAMA_ZLECENIE)).toEqual(['mama-caly-urlop', 'po-rowno', 'tata-po-14-tyg', 'tata-swoje-9-tyg']);
    expect(odc(scenariusz(MAMA_ZLECENIE, 'mama-caly-urlop'), 'mama-macierzynski-1').tytulId).toBe('zlecenie-1');
  });

  it('mama-pol-etatu nie ma, gdy umowa o pracę kończy się przed startem rodzicielskiego', () => {
    const r = rodzina({ osoby: [mama([etat({ do: '2027-03-31' })])] });
    expect(idy(r)).toEqual(['mama-caly-urlop']);
  });

  it('martwe urodzenie: tylko 8 tygodni macierzyńskiego mamy, bez rodzicielskiego i scenariuszy z tatą', () => {
    const r = rodzina({ osoby: [mama(), tata()], dzieci: [{ martwe: true }] });
    const lista = plany(r);
    expect(lista.map((p) => p.id)).toEqual(['mama-caly-urlop']);
    expect(lista[0].odcinki.map((o) => [o.id, o.od, o.do])).toEqual([['mama-macierzynski-1', '2026-12-01', '2027-01-25']]);
  });

  it('przysposobienie: urlop na warunkach macierzyńskiego od dnia przyjęcia; bez przejęcia przez tatę', () => {
    const r = rodzina({
      osoby: [mama(), tata()],
      typ: 'przysposobienie',
      dzieci: [{ dataUrodzenia: '2026-06-01' }],
      dataUprawomocnienia: '2026-12-15',
    });
    const lista = plany(r);
    expect(lista[0].id).toBe('mama-caly-urlop');
    expect(lista[0].odcinki[0]).toMatchObject({ id: 'mama-na_warunkach_macierzynskiego-1', od: '2026-12-01', do: '2027-04-19' });
    expect(lista.map((p) => p.id)).not.toContain('tata-po-14-tyg');
  });
});

// ───────── urlop uzupełniający (decyzja integratora, KP art. 180² § 1) ─────────

describe('EC-28: wcześniak, uzupełniający 10 tygodni bezpośrednio po macierzyńskim mamy', () => {
  // mac 2026-12-01–2027-04-19; uzup 70 dni: 2027-04-20 + 69 = 2027-06-28 (10 dni kwietnia, 31 maja, 28 czerwca);
  // rodzicielski mamy 224 dni od 2027-06-29: 2 dni czerwca, 184 do końca grudnia, 31 stycznia, 7 lutego → 2028-02-07.
  const UZUP = ['2027-04-20', '2027-06-28'];

  it('mama-caly-urlop: mac → uzup → rodz, rodzicielski przesunięty za uzupełniający', () => {
    const pl = scenariusz(EC28, 'mama-caly-urlop');
    expect(pl.odcinki.map((o) => o.id)).toEqual(['mama-macierzynski-1', 'mama-uzupelniajacy-1', 'mama-rodzicielski-1']);
    expect(odc(pl, 'mama-uzupelniajacy-1')).toMatchObject({ osobaId: 'mama', od: UZUP[0], do: UZUP[1], tytulId: 'etat-1' });
    expect(odc(pl, 'mama-uzupelniajacy-1').czescNr).toBeUndefined();
    expect(daty(odc(pl, 'mama-rodzicielski-1'))).toEqual(['2027-06-29', '2028-02-07']);
  });

  it('tata-swoje-9-tyg: tata 63 dni od dnia po rodzicielskim mamy (2028-02-08–2028-04-10)', () => {
    const pl = scenariusz(EC28, 'tata-swoje-9-tyg');
    expect(daty(odc(pl, 'mama-uzupelniajacy-1'))).toEqual(UZUP);
    expect(daty(odc(pl, 'tata-rodzicielski-1'))).toEqual(['2028-02-08', '2028-04-10']);
  });

  it('po-rowno (bez przejęcia): mama 11 tyg. rodz od 2027-06-29, tata 30 tyg. od 2027-09-14', () => {
    // 77 dni od 2027-06-29: 2 dni czerwca, + 31 (lip) = 33, + 31 (sie) = 64, + 13 dni września = 77 → 2027-09-13.
    const pl = scenariusz(EC28, 'po-rowno');
    expect(daty(odc(pl, 'mama-uzupelniajacy-1'))).toEqual(UZUP);
    expect(daty(odc(pl, 'mama-rodzicielski-1'))).toEqual(['2027-06-29', '2027-09-13']);
    expect(odc(pl, 'tata-rodzicielski-1').od).toBe('2027-09-14');
  });

  it('mama-pol-etatu: rodzicielski 448 dni od 2027-06-29', () => {
    const r = odc(scenariusz(EC28, 'mama-pol-etatu'), 'mama-rodzicielski-1');
    expect(r.od).toBe('2027-06-29');
    expect(liczbaDni(r.od, r.do)).toBe(448);
  });

  it('tata-po-14-tyg i po-rowno z przejęciem (bliźnięta) – bez uzupełniającego', () => {
    expect(scenariusz(EC28, 'tata-po-14-tyg').odcinki.some((o) => o.typ === 'uzupelniajacy')).toBe(false);
    const r = rodzina({ osoby: [mama(), tata()], przewidywana: false, dzieci: [EC28.zdarzenie.dzieci[0], {}] });
    expect(scenariusz(r, 'po-rowno').odcinki.some((o) => o.typ === 'uzupelniajacy')).toBe(false);
  });

  it('bez pobytu w szpitalu – bez uzupełniającego', () => {
    expect(plany(PARA).some((pl) => pl.odcinki.some((o) => o.typ === 'uzupelniajacy'))).toBe(false);
  });
});

// ───────── zgon albo porzucenie nieubezpieczonej matki (KP art. 180 § 15, UZ art. 29 ust. 9) ─────────

describe('tata-pelny-rodzicielski: tata przejmuje macierzyński po zdarzeniu', () => {
  it('zgon matki 2026-12-10: tata mac 2026-12-11–2027-04-19, rodz 32 tyg. od 2027-04-20 (pytania 6 i 14); ojcowski za rodzicielskim nie mieści się przed 2027-11-30 – pominięty', () => {
    const lista = plany(ZGON_MATKI);
    expect(lista.map((p) => p.id)).toEqual(['tata-pelny-rodzicielski']);
    const pl = lista[0];
    expect(pl.odcinki.map((o) => o.id)).toEqual(['tata-macierzynski-1', 'tata-rodzicielski-1']);
    expect(odc(pl, 'tata-macierzynski-1')).toMatchObject({ od: '2026-12-11', do: '2027-04-19', tytulId: 'etat-taty' });
    expect(daty(odc(pl, 'tata-rodzicielski-1'))).toEqual(['2027-04-20', '2027-11-29']);
  });

  it('porzucenie 2027-03-01: tata mac 2027-03-02–2027-04-19; ojcowski zostaje od dnia porodu, bo kończy się przed macierzyńskim taty', () => {
    const pl = plany(PORZUCENIE)[0];
    expect(daty(odc(pl, 'tata-macierzynski-1'))).toEqual(['2027-03-02', '2027-04-19']);
    expect(odc(pl, 'tata-rodzicielski-1').od).toBe('2027-04-20');
    expect(daty(odc(pl, 'tata-ojcowski-1'))).toEqual(['2026-12-01', '2026-12-14']);
  });

  it('ojcowski bezpośrednio za rodzicielskim taty, gdy mieści się przed ojcowskiDoKiedy (krótsza pula w danych testowych)', () => {
    const u = ustalUprawnienia(ZGON_MATKI, WERSJE_DOMYSLNE);
    const krotka = { ...u, pule: { ...u.pule, rodzicielskiTyg: 20 } };
    const pl = zbudujScenariusze(ZGON_MATKI, krotka, P())[0];
    // rodz (20 − 9) × 7 = 77 dni: 2027-04-20 + 76 = 2027-07-05; ojcowski 2027-07-06–2027-07-19 ≤ 2027-11-30.
    expect(daty(odc(pl, 'tata-rodzicielski-1'))).toEqual(['2027-04-20', '2027-07-05']);
    expect(daty(odc(pl, 'tata-ojcowski-1'))).toEqual(['2027-07-06', '2027-07-19']);
  });

  it('matka nieubezpieczona bez zgonu i porzucenia (EC-56) – bez macierzyńskiego taty, ojcowski od dnia porodu', () => {
    const pl = plany(EC56)[0];
    expect(pl.odcinki.some((o) => o.typ === 'macierzynski')).toBe(false);
    expect(odc(pl, 'tata-ojcowski-1').od).toBe('2026-12-01');
  });
});

// ───────── termin rodzicielskiego (KP art. 182¹c; zgon dziecka: KP art. 182¹g → 180¹ § 2) ─────────

const ZGON_DZIECKA_GRUDZIEN = rodzina({ osoby: [mama(), tata()], przewidywana: false, dzieci: [{ zgon: '2026-12-10' }] });
const ZGON_DZIECKA_MARZEC = rodzina({ osoby: [mama(), tata()], przewidywana: false, dzieci: [{ zgon: '2027-03-01' }] });
/** Przysposobienie 5-latka: rodzicielskiDoKiedy = 2027-12-31 (koniec roku, w którym dziecko kończy 6 lat). */
const PRZYSPOSOBIENIE_5L = rodzina({
  osoby: [mama(), tata()],
  typ: 'przysposobienie',
  dzieci: [{ dataUrodzenia: '2021-06-01' }],
  dataUprawomocnienia: '2026-12-15',
});

describe('rodzicielski najpóźniej do pule.rodzicielskiDoKiedy', () => {
  it('zgon dziecka 2026-12-10: tylko macierzyński mamy (do 2027-01-25), bez rodzicielskiego i scenariuszy, które się bez niego nie dadzą', () => {
    const lista = plany(ZGON_DZIECKA_GRUDZIEN);
    expect(lista.map((p) => p.id)).toEqual(['mama-caly-urlop']);
    expect(lista[0].odcinki.map((o) => [o.id, o.od, o.do])).toEqual([['mama-macierzynski-1', '2026-12-01', '2027-01-25']]);
  });

  it('zgon dziecka 2027-03-01: tylko macierzyński mamy do 2027-03-08', () => {
    const lista = plany(ZGON_DZIECKA_MARZEC);
    expect(lista.map((p) => p.id)).toEqual(['mama-caly-urlop']);
    expect(lista[0].odcinki.map((o) => [o.id, o.od, o.do])).toEqual([['mama-macierzynski-1', '2026-12-01', '2027-03-08']]);
  });

  it('przysposobienie 5-latka: rodzicielski do dnia przed 14. urodzinami, bez przycinania (KP art. 183 § 4¹; odpowiedź ZUS 21.11, pytanie 37)', () => {
    const lista = plany(PRZYSPOSOBIENIE_5L);
    const doKiedy = ustalUprawnienia(PRZYSPOSOBIENIE_5L, WERSJE_DOMYSLNE).pule.rodzicielskiDoKiedy!;
    // Dziecko urodzone 2021-06-01 → 14. urodziny 2035-06-01 → ostatni dzień 2035-05-31.
    expect(doKiedy).toBe('2035-05-31');
    for (const pl of lista) {
      for (const o of pl.odcinki.filter((x) => x.typ === 'rodzicielski')) expect(o.do <= doKiedy).toBe(true);
    }
    expect(daty(odc(scenariusz(PRZYSPOSOBIENIE_5L, 'po-rowno'), 'tata-rodzicielski-1'))).toEqual(['2027-07-06', '2028-01-31']);
    expect(daty(odc(scenariusz(PRZYSPOSOBIENIE_5L, 'tata-swoje-9-tyg'), 'tata-rodzicielski-1'))).toEqual(['2027-11-30', '2028-01-31']);
    const pol = odc(scenariusz(PRZYSPOSOBIENIE_5L, 'mama-pol-etatu'), 'mama-rodzicielski-1');
    expect(daty(pol)).toEqual(['2027-04-20', '2028-07-10']);
  });

  it('zgon dziecka w czasie rodzicielskiego: koniec z przepisu (7 dni od zgonu), odcinek przycięty co do dnia', () => {
    const r = rodzina({ osoby: [mama(), tata()], przewidywana: false, dzieci: [{ zgon: '2027-06-01' }] });
    const pl = scenariusz(r, 'mama-caly-urlop');
    // KP art. 182¹g → art. 180¹ § 2: rodzicielski najpóźniej 2027-06-08 – urlop kończy przepis, nie rodzic.
    expect(daty(odc(pl, 'mama-rodzicielski-1'))).toEqual(['2027-04-20', '2027-06-08']);
    expect(walidujPlan(r, pl, WERSJE_DOMYSLNE).bledy).toEqual([]);
  });
});

// ───────── zgon ubezpieczonej matki (KP art. 180 § 12, UZ art. 29 ust. 7) ─────────

const ZGON_UBEZP_MATKI = rodzina({ osoby: [mama([etat()], { zdrowie: { zgon: '2027-01-15' } }), tata()], przewidywana: false });
const ZGON_UBEZP_MATKI_GRUDZIEN = rodzina({ osoby: [mama([etat()], { zdrowie: { zgon: '2026-12-05' } }), tata()], przewidywana: false });
const ZGON_MATKI_PRZED_PORODEM = rodzina({ osoby: [mama([etat()], { zdrowie: { zgon: '2026-11-25' } }), tata()], przewidywana: false });

describe('tata-po-zgonie-mamy', () => {
  it('zgon 2027-01-15: mama mac do dnia zgonu, tata mac do końca puli, tata rodz 32 tyg.; ojcowski od porodu (kończy się przed macierzyńskim taty)', () => {
    const lista = plany(ZGON_UBEZP_MATKI);
    expect(lista.map((p) => p.id)).toEqual(['tata-po-zgonie-mamy']);
    const pl = lista[0];
    expect(daty(odc(pl, 'mama-macierzynski-1'))).toEqual(['2026-12-01', '2027-01-15']);
    expect(odc(pl, 'tata-macierzynski-1')).toMatchObject({ od: '2027-01-16', do: '2027-04-19', tytulId: 'etat-taty' });
    const r = odc(pl, 'tata-rodzicielski-1');
    expect(daty(r)).toEqual(['2027-04-20', '2027-11-29']);
    expect(liczbaDni(r.od, r.do)).toBe((41 - 9) * 7);
    expect(daty(odc(pl, 'tata-ojcowski-1'))).toEqual(['2026-12-01', '2026-12-14']);
    expect(pl.odcinki.some((o) => o.osobaId === 'mama' && o.od > '2027-01-15')).toBe(false);
  });

  it('zgon 2026-12-05: ojcowski nachodziłby na macierzyński taty, a za rodzicielskim (2027-11-30–12-13) nie mieści się przed 2027-11-30 – pominięty', () => {
    const pl = plany(ZGON_UBEZP_MATKI_GRUDZIEN)[0];
    expect(daty(odc(pl, 'tata-macierzynski-1'))).toEqual(['2026-12-06', '2027-04-19']);
    expect(pl.odcinki.some((o) => o.typ === 'ojcowski')).toBe(false);
  });

  it('walidacja: bez błędów, ostrzeżenie o 9 tygodniach mamy (pytanie 14)', () => {
    const w = walidujPlan(ZGON_UBEZP_MATKI, plany(ZGON_UBEZP_MATKI)[0], WERSJE_DOMYSLNE);
    expect(w.bledy).toEqual([]);
    expect(w.ostrzezenia.map((k) => k.kod)).toContain('RODZ_9_TYG_DRUGIEGO_RODZICA');
  });

  it('tata bez prawa: jedyny plan to macierzyński mamy do dnia zgonu', () => {
    const r = rodzina({
      osoby: [mama([etat()], { zdrowie: { zgon: '2027-01-15' } }), tata([zlecenie({ id: 'z-taty', chorobowe: 'brak' })])],
      przewidywana: false,
    });
    const lista = plany(r);
    expect(lista).toHaveLength(1);
    expect(lista[0].odcinki.map((o) => [o.id, o.od, o.do])).toEqual([['mama-macierzynski-1', '2026-12-01', '2027-01-15']]);
  });

  it('zgon przed porodem – jak brak prawa matki: plan od ojca, bez urlopu mamy', () => {
    const lista = plany(ZGON_MATKI_PRZED_PORODEM);
    expect(lista.map((p) => p.id)).toEqual(['tata-pelny-rodzicielski']);
    expect(lista[0].odcinki.every((o) => o.osobaId === 'tata')).toBe(true);
  });
});

// ───────── druga osoba, łączenie z pracą, ojcowski ─────────

describe('druga osoba i ojcowski', () => {
  it('dwie osoby przyjmujące: druga dostaje scenariusze z rodzicielskim (bez przejęcia)', () => {
    const r = rodzina({
      osoby: [mama([etat()], { rola: 'przyjmujacy' }), mama([etat({ id: 'etat-2' })], { id: 'druga', rola: 'przyjmujacy' })],
      typ: 'przysposobienie',
      dzieci: [{ dataUrodzenia: '2026-06-01' }],
      dataUprawomocnienia: '2026-12-15',
    });
    expect(idy(r)).toEqual(['mama-caly-urlop', 'po-rowno', 'tata-swoje-9-tyg', 'mama-pol-etatu']);
    expect(daty(odc(scenariusz(r, 'tata-swoje-9-tyg'), 'druga-rodzicielski-1'))).toEqual(['2027-11-30', '2028-01-31']);
  });

  it('tata ubezpieczony dopiero od 2027-05-01: ojcowski od pierwszego dnia ubezpieczenia', () => {
    const r = rodzina({ osoby: [mama(), tata([etat({ id: 'etat-taty', od: '2027-05-01' })])] });
    expect(daty(odc(scenariusz(r, 'po-rowno'), 'tata-ojcowski-1'))).toEqual(['2027-05-01', '2027-05-14']);
  });

  it('tata ubezpieczony od 2027-11-25: 14 dni nie mieści się przed 2027-11-30 – bez ojcowskiego', () => {
    const r = rodzina({ osoby: [mama(), tata([etat({ id: 'etat-taty', od: '2027-11-25' })])] });
    expect(plany(r).some((pl) => pl.odcinki.some((o) => o.typ === 'ojcowski'))).toBe(false);
  });

  it('tata bez prawa do ojcowskiego – żaden scenariusz nie ma ojcowskiego', () => {
    const u = ustalUprawnienia(PARA, WERSJE_DOMYSLNE);
    const bez = { ...u, uprawnienia: u.uprawnienia.map((x) => (x.osobaId === 'tata' && x.swiadczenie === 'ojcowski' ? { ...x, przysluguje: false } : x)) };
    const lista = zbudujScenariusze(PARA, bez, P());
    expect(lista.map((p) => p.id)).toContain('po-rowno');
    expect(lista.some((pl) => pl.odcinki.some((o) => o.typ === 'ojcowski'))).toBe(false);
  });

  it('mama-pol-etatu: umowa o pracę znaleziona niezależnie od kolejności tytułów (zlecenie przed etatem), tytulId = etat', () => {
    const r = rodzina({ osoby: [mama([zlecenie(), etat()])] });
    const pl = scenariusz(r, 'mama-pol-etatu');
    expect(odc(pl, 'mama-rodzicielski-1')).toMatchObject({ wymiarPracy: 0.5, tytulId: 'etat-1', do: '2028-07-10' });
  });

  it('mama-pol-etatu nie ma, gdy umowa o pracę kończy się w trakcie łączenia (2028-01-31)', () => {
    const r = rodzina({ osoby: [mama([etat({ do: '2028-01-31' })])] });
    expect(idy(r)).toEqual(['mama-caly-urlop']);
  });
});

// ───────── każdy plan przechodzi walidację ─────────

describe('każdy scenariusz przechodzi walidujPlan bez błędów', () => {
  const rodziny: [string, Rodzina][] = [
    ['1 dziecko, mama sama', SAMA],
    ['1 dziecko, para', PARA],
    ['bliźnięta', BLIZNIETA],
    ['trojaczki', TROJACZKI],
    ['„Za życiem”', ZA_ZYCIEM],
    ['EC-56', EC56],
    ['mama na zleceniu', MAMA_ZLECENIE],
    ['przykład wzorcowy', PRZYKLAD_RODZINA],
    ['sam tata', rodzina({ osoby: [tata()] })],
    ['martwe urodzenie', rodzina({ osoby: [mama(), tata()], dzieci: [{ martwe: true }] })],
    ['zgon nieubezpieczonej matki', ZGON_MATKI],
    ['porzucenie przez nieubezpieczoną matkę', PORZUCENIE],
    ['EC-28 wcześniak (uzupełniający)', EC28],
    ['zgon dziecka 2026-12-10', ZGON_DZIECKA_GRUDZIEN],
    ['zgon dziecka 2027-03-01', ZGON_DZIECKA_MARZEC],
    ['przysposobienie 5-latka', PRZYSPOSOBIENIE_5L],
    ['zgon ubezpieczonej matki 2027-01-15', ZGON_UBEZP_MATKI],
    ['zgon ubezpieczonej matki 2026-12-05', ZGON_UBEZP_MATKI_GRUDZIEN],
    ['zgon matki przed porodem', ZGON_MATKI_PRZED_PORODEM],
    ['tata ubezpieczony od 2027-05-01', rodzina({ osoby: [mama(), tata([etat({ id: 'etat-taty', od: '2027-05-01' })])] })],
    ['mama: zlecenie i etat', rodzina({ osoby: [mama([zlecenie(), etat()]), tata()] })],
    [
      'EC-28 bliźnięta wcześniaki (po-rowno z przejęciem)',
      rodzina({ osoby: [mama(), tata()], przewidywana: false, dzieci: [EC28.zdarzenie.dzieci[0], {}] }),
    ],
    ['mama z orzeczeniem (8 tygodni)', rodzina({ osoby: [mama([etat()], { zdrowie: { orzeczenieNiezdolnosciSamodzielnejEgzystencji: true } }), tata()] })],
    [
      'przysposobienie',
      rodzina({ osoby: [mama(), tata()], typ: 'przysposobienie', dzieci: [{ dataUrodzenia: '2026-06-01' }], dataUprawomocnienia: '2026-12-15' }),
    ],
    ['pięcioro dzieci', rodzina({ osoby: [mama(), tata()], dzieci: [{}, {}, {}, {}, {}] })],
  ];

  for (const [nazwa, r] of rodziny) {
    it(nazwa, () => {
      const lista = plany(r);
      expect(lista.length).toBeGreaterThan(0);
      for (const pl of lista) {
        const w = walidujPlan(r, pl, WERSJE_DOMYSLNE);
        expect({ plan: pl.id, bledy: w.bledy.map((k) => k.kod) }).toEqual({ plan: pl.id, bledy: [] });
      }
    });
  }
});

// ───────── czystość funkcji ─────────

describe('czysta funkcja', () => {
  it('nie zmienia wejścia i daje ten sam wynik przy każdym wywołaniu', () => {
    const r = kopia(TROJACZKI);
    const u = ustalUprawnienia(r, WERSJE_DOMYSLNE);
    const uKopia = kopia(u);
    const a = zbudujScenariusze(r, u, P());
    const b = zbudujScenariusze(r, u, P());
    expect(r).toEqual(TROJACZKI);
    expect(u).toEqual(uKopia);
    expect(a).toEqual(b);
  });
});
