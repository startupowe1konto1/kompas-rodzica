/**
 * Testy A2: ustalListeUprawnien (ZADANIA.md „A2. Uprawnienia”, plan toru A: A2-a … A2-e, D2, D3).
 * Pule podajemy ręcznie (A1 robi inny agent). Testy sprawdzają kody i liczby, nie treść.
 */
import { describe, expect, it } from 'vitest';
import { PRZYKLAD_UPRAWNIENIA } from '../../../mocks/przyklad';
import { dzialalnosc, etat, mama, P, rodzina, tata, zlecenie } from '../../__tests__/rodziny';
import type { Osoba, Pule, Rodzina, Swiadczenie, TypZdarzenia, Uprawnienie } from '../../types';
import { ustalListeUprawnien } from '../uprawnienia';
import { PRZYKLAD_CZLONKA_RODZINY } from '../uprawnieniaTeksty';

const p = P();
const PULE: Pule = PRZYKLAD_UPRAWNIENIA.pule;

const WSZYSTKIE: Swiadczenie[] = [
  'zasilek_chorobowy_ciaza',
  'swiadczenie_rehabilitacyjne',
  'zasilek_w_wys_macierzynskiego',
  'macierzynski',
  'na_warunkach_macierzynskiego',
  'uzupelniajacy',
  'rodzicielski',
  'ojcowski',
];

function lista(r: Rodzina, pule: Partial<Pule> = {}): Uprawnienie[] {
  return ustalListeUprawnien(r, { ...PULE, ...pule }, p);
}

function u(l: Uprawnienie[], osobaId: string, sw: Swiadczenie): Uprawnienie {
  const w = l.filter((x) => x.osobaId === osobaId && x.swiadczenie === sw);
  expect(w, `${osobaId}/${sw}`).toHaveLength(1);
  return w[0];
}

function sama(o: Osoba, opcje: Parameters<typeof rodzina>[0] = {}): Uprawnienie[] {
  return lista(rodzina({ osoby: [o], ...opcje }));
}

describe('A2: prawo do zasiłku macierzyńskiego matki', () => {
  it('EC-01: etat trwa w dniu porodu → macierzyński i rodzicielski', () => {
    const l = sama(mama());
    expect(u(l, 'mama', 'macierzynski')).toMatchObject({ przysluguje: true, kod: 'UBEZP_W_DNIU_PORODU', tytulId: 'etat-1' });
    expect(u(l, 'mama', 'rodzicielski')).toMatchObject({ przysluguje: true, kod: 'RODZ_PO_MACIERZYNSKIM', tytulId: 'etat-1' });
  });

  it('EC-02: zlecenie z dobrowolnym chorobowym trwa w dniu porodu', () => {
    expect(u(sama(mama([zlecenie()])), 'mama', 'macierzynski')).toMatchObject({ przysluguje: true, kod: 'UBEZP_W_DNIU_PORODU' });
  });

  it('EC-03: zlecenie bez chorobowego → nie, alternatywa ze świadczeniem rodzicielskim', () => {
    const m = u(sama(mama([zlecenie({ chorobowe: 'brak' })])), 'mama', 'macierzynski');
    expect(m).toMatchObject({ przysluguje: false, kod: 'BRAK_CHOROBOWEGO' });
    expect(m.alternatywa).toContain(String(p.kwoty.swiadczenieRodzicielskie));
  });

  it('EC-04: zlecenie kończy się przed porodem → nie, alternatywa', () => {
    const m = u(sama(mama([zlecenie({ do: '2026-10-31' })])), 'mama', 'macierzynski');
    expect(m).toMatchObject({ przysluguje: false, kod: 'BRAK_UBEZP_W_DNIU_PORODU' });
    expect(m.alternatywa).toBeDefined();
  });

  it('EC-05: etat na czas określony do 2026-08-31 → przedłużony do porodu', () => {
    const m = u(sama(mama([etat({ naCzasOkreslony: true, do: '2026-08-31' })])), 'mama', 'macierzynski');
    expect(m).toMatchObject({ przysluguje: true, kod: 'UMOWA_PRZEDLUZONA_DO_PORODU', tytulId: 'etat-1' });
    expect(m.przepis).toContain('UZ art. 30 ust. 4');
  });

  it('EC-06: etat na czas określony do 2026-04-30 → nie', () => {
    const m = u(sama(mama([etat({ naCzasOkreslony: true, do: '2026-04-30' })])), 'mama', 'macierzynski');
    expect(m).toMatchObject({ przysluguje: false, kod: 'BRAK_UBEZP_W_DNIU_PORODU' });
    expect(m.przepis).toContain('KP art. 177 § 3');
  });

  it('EC-06b: umowa na zastępstwo → nie, przepis KP art. 177 § 3¹', () => {
    const m = u(sama(mama([etat({ naCzasOkreslony: true, naZastepstwo: true, do: '2026-08-31' })])), 'mama', 'macierzynski');
    expect(m).toMatchObject({ przysluguje: false, kod: 'BRAK_UBEZP_W_DNIU_PORODU' });
    expect(m.przepis).toContain('KP art. 177 § 3¹');
  });

  it('EC-07: likwidacja pracodawcy w ciąży → zasiłek w wysokości macierzyńskiego i macierzyński', () => {
    const l = sama(mama([etat({ ustanie: { data: '2026-09-15', przyczyna: 'likwidacja' } })]));
    expect(u(l, 'mama', 'zasilek_w_wys_macierzynskiego')).toMatchObject({ przysluguje: true, kod: 'USTANIE_Z_PRZYCZYN_PRACODAWCY' });
    expect(u(l, 'mama', 'macierzynski')).toMatchObject({ przysluguje: true, kod: 'USTANIE_Z_PRZYCZYN_PRACODAWCY' });
  });

  it('D10: EC-07 rodzicielski po ustaniu ubezpieczenia → tak z dopiskiem do potwierdzenia', () => {
    const l = sama(mama([etat({ ustanie: { data: '2026-09-15', przyczyna: 'likwidacja' } })]));
    expect(u(l, 'mama', 'rodzicielski').przysluguje).toBe(true);
    expect(u(l, 'mama', 'rodzicielski').powod).toContain('wymaga potwierdzenia w ZUS');
    expect(u(sama(mama()), 'mama', 'rodzicielski').powod).not.toContain('wymaga potwierdzenia w ZUS');
  });

  it('W6: zlecenie zakończone z powodu likwidacji w ciąży → warunkowo, do potwierdzenia', () => {
    const m = u(sama(mama([zlecenie({ do: '2026-12-31', ustanie: { data: '2026-09-15', przyczyna: 'likwidacja' } })])), 'mama', 'macierzynski');
    expect(m).toMatchObject({ przysluguje: 'warunkowo', kod: 'USTANIE_Z_PRZYCZYN_PRACODAWCY' });
    expect(m.powod).toContain('wymaga potwierdzenia w ZUS');
  });

  it('D1: koniec umowy blisko granicy 3. miesiąca → dopisek do potwierdzenia (w obie strony)', () => {
    const przedluzona = u(sama(mama([etat({ naCzasOkreslony: true, do: '2026-05-22' })])), 'mama', 'macierzynski');
    expect(przedluzona).toMatchObject({ przysluguje: true, kod: 'UMOWA_PRZEDLUZONA_DO_PORODU' });
    expect(przedluzona.powod).toContain('wymaga potwierdzenia w ZUS');
    const nie = u(sama(mama([etat({ naCzasOkreslony: true, do: '2026-05-15' })])), 'mama', 'macierzynski');
    expect(nie).toMatchObject({ przysluguje: false, kod: 'BRAK_UBEZP_W_DNIU_PORODU' });
    expect(nie.powod).toContain('wymaga potwierdzenia w ZUS');
    expect(u(sama(mama([etat({ naCzasOkreslony: true, do: '2026-08-31' })])), 'mama', 'macierzynski').powod).not.toContain('wymaga potwierdzenia w ZUS');
  });

  it('W2: wcześniak z 28. tygodnia (poród był) – umowa do 2026-05-01 kończy się przed 3. miesiącem', () => {
    const t = etat({ naCzasOkreslony: true, do: '2026-05-01' });
    const urodzony = sama(mama([t]), { data: '2026-10-01', przewidywana: false, dzieci: [{ tydzienCiazy: 28 }] });
    expect(u(urodzony, 'mama', 'macierzynski')).toMatchObject({ przysluguje: false, kod: 'BRAK_UBEZP_W_DNIU_PORODU' });
    const przewidywany = sama(mama([t]), { data: '2026-10-01', przewidywana: true, dzieci: [{ tydzienCiazy: 28 }] });
    expect(u(przewidywany, 'mama', 'macierzynski').kod).toBe('UMOWA_PRZEDLUZONA_DO_PORODU');
  });

  it('EC-08: rozwiązanie z naruszeniem prawa (wyrok) → macierzyński', () => {
    const l = sama(mama([etat({ ustanie: { data: '2026-09-15', przyczyna: 'naruszenie_prawa_wyrok' } })]));
    expect(u(l, 'mama', 'macierzynski')).toMatchObject({ przysluguje: true, kod: 'USTANIE_NARUSZENIE_PRAWA' });
  });

  it('EC-09: działalność z dobrowolnym chorobowym od 2022', () => {
    expect(u(sama(mama([dzialalnosc()])), 'mama', 'macierzynski').przysluguje).toBe(true);
  });

  it('EC-10: działalność, chorobowe od 2026-11-01 → macierzyński przysługuje', () => {
    expect(u(sama(mama([dzialalnosc({ chorobowoOd: '2026-11-01' })])), 'mama', 'macierzynski').przysluguje).toBe(true);
  });

  it('EC-11: działalność bez chorobowego → nie, alternatywa', () => {
    const m = u(sama(mama([dzialalnosc({ chorobowe: 'brak' })])), 'mama', 'macierzynski');
    expect(m).toMatchObject({ przysluguje: false, kod: 'BRAK_CHOROBOWEGO' });
    expect(m.alternatywa).toBeDefined();
  });

  it('EC-12: zaległość 30 zł (poniżej progu) → macierzyński przysługuje', () => {
    expect(u(sama(mama([dzialalnosc({ zadluzenieSkladkowe: 30 })])), 'mama', 'macierzynski').przysluguje).toBe(true);
  });

  it('EC-12b: zaległość 500 zł → warunkowo, WSTRZYMANY_DO_SPLATY_ZALEGLOSCI', () => {
    const l = sama(mama([dzialalnosc({ zadluzenieSkladkowe: 500 })]));
    expect(u(l, 'mama', 'macierzynski')).toMatchObject({ przysluguje: 'warunkowo', kod: 'WSTRZYMANY_DO_SPLATY_ZALEGLOSCI' });
    expect(u(l, 'mama', 'rodzicielski')).toMatchObject({ przysluguje: 'warunkowo', kod: 'WSTRZYMANY_DO_SPLATY_ZALEGLOSCI' });
    expect(u(l, 'mama', 'macierzynski').przepis).toContain('UZ art. 2a');
  });

  it('EC-13: osoba współpracująca z zaległością 500 zł → jak EC-12b', () => {
    const wspolpraca = dzialalnosc({ id: 'wsp-1', rodzaj: 'wspolpraca', zadluzenieSkladkowe: 500 });
    expect(u(sama(mama([wspolpraca])), 'mama', 'macierzynski')).toMatchObject({
      przysluguje: 'warunkowo',
      kod: 'WSTRZYMANY_DO_SPLATY_ZALEGLOSCI',
    });
  });

  it('zaległość dokładnie równa progowi (1% płacy minimalnej) → przysługuje', () => {
    const prog = (p.kwoty.placaMinimalna * p.limity.progZaleglosciProcPlacyMinimalnej) / 100;
    expect(u(sama(mama([dzialalnosc({ zadluzenieSkladkowe: prog })])), 'mama', 'macierzynski').przysluguje).toBe(true);
    expect(u(sama(mama([dzialalnosc({ zadluzenieSkladkowe: prog + 0.01 })])), 'mama', 'macierzynski').przysluguje).toBe('warunkowo');
  });

  it('W3: etat + działalność z zaległością → tak z etatu, w obu kolejnościach, z dopiskiem', () => {
    const d = dzialalnosc({ zadluzenieSkladkowe: 500 });
    for (const tytuly of [[etat(), d], [d, etat()]]) {
      const m = u(sama(mama(tytuly)), 'mama', 'macierzynski');
      expect(m).toMatchObject({ przysluguje: true, kod: 'UBEZP_W_DNIU_PORODU', tytulId: 'etat-1' });
      expect(m.powod).toContain('wymaga potwierdzenia w ZUS');
    }
  });

  it('W3: dwa tytuły z zaległością → warunkowo WSTRZYMANY_DO_SPLATY_ZALEGLOSCI', () => {
    const tytuly = [dzialalnosc({ zadluzenieSkladkowe: 500 }), dzialalnosc({ id: 'wsp-1', rodzaj: 'wspolpraca', zadluzenieSkladkowe: 200 })];
    expect(u(sama(mama(tytuly)), 'mama', 'macierzynski')).toMatchObject({ przysluguje: 'warunkowo', kod: 'WSTRZYMANY_DO_SPLATY_ZALEGLOSCI' });
  });

  it('D8: zaległość oznacza też wpisy warunkowe (ojciec, przejęcie macierzyńskiego)', () => {
    const l = lista(rodzina({ osoby: [mama(), tata([dzialalnosc({ id: 'dz-taty', zadluzenieSkladkowe: 500 })])] }));
    expect(u(l, 'tata', 'macierzynski')).toMatchObject({ przysluguje: 'warunkowo', kod: 'WSTRZYMANY_DO_SPLATY_ZALEGLOSCI' });
  });

  it('zaległość na etacie (to nie działalność) nie wstrzymuje zasiłku', () => {
    expect(u(sama(mama([etat({ zadluzenieSkladkowe: 500 })])), 'mama', 'macierzynski').przysluguje).toBe(true);
  });

  it('EC-14: poród w czasie urlopu wychowawczego → macierzyński', () => {
    const o = mama([etat()], { urlopWychowawczy: { od: '2026-06-01', do: '2027-05-31' } });
    expect(u(sama(o), 'mama', 'macierzynski')).toMatchObject({ przysluguje: true, kod: 'POROD_W_TRAKCIE_WYCHOWAWCZEGO', tytulId: 'etat-1' });
  });

  it('EC-15: brak tytułów → wszystko nie, BRAK_TYTULU_UBEZPIECZENIA', () => {
    const l = sama(mama([]));
    for (const sw of WSZYSTKIE) {
      expect(u(l, 'mama', sw)).toMatchObject({ przysluguje: false, kod: 'BRAK_TYTULU_UBEZPIECZENIA' });
    }
  });
});

describe('A2: przyjęcie dziecka (KP art. 183, UZ art. 29 ust. 1 pkt 2–3)', () => {
  const przyjmujacy = (tytuly = [etat()]): Osoba => ({ id: 'p1', rola: 'przyjmujacy', tytuly });
  const przyjecie = (typ: TypZdarzenia, dataUrodzenia: string, extra = {}) =>
    lista(rodzina({ osoby: [przyjmujacy()], typ, przewidywana: false, data: '2027-02-01', dzieci: [{ dataUrodzenia, ...extra }] }));

  it('EC-40: przysposobienie, dziecko 5 lat → na warunkach macierzyńskiego i rodzicielski', () => {
    const l = przyjecie('przysposobienie', '2021-12-01');
    expect(u(l, 'p1', 'na_warunkach_macierzynskiego')).toMatchObject({ przysluguje: true, tytulId: 'etat-1' });
    expect(u(l, 'p1', 'rodzicielski').przysluguje).toBe(true);
  });

  it('EC-41: rodzina zastępcza niezawodowa, dziecko 8 lat bez odroczenia → nie, DZIECKO_ZA_STARE', () => {
    const l = przyjecie('rodzina_zastepcza_niezawodowa', '2018-06-01');
    expect(u(l, 'p1', 'na_warunkach_macierzynskiego')).toMatchObject({ przysluguje: false, kod: 'DZIECKO_ZA_STARE' });
    expect(u(l, 'p1', 'rodzicielski')).toMatchObject({ przysluguje: false, kod: 'DZIECKO_ZA_STARE' });
  });

  it('EC-41b: jw., 8 lat z odroczonym obowiązkiem szkolnym → tak', () => {
    const l = przyjecie('rodzina_zastepcza_niezawodowa', '2018-06-01', { odroczonyObowiazekSzkolny: true });
    expect(u(l, 'p1', 'na_warunkach_macierzynskiego').przysluguje).toBe(true);
  });

  it('EC-42: rodzina zastępcza zawodowa → nie, RODZINA_ZAWODOWA_BEZ_PRAWA', () => {
    const l = przyjecie('rodzina_zastepcza_zawodowa', '2024-06-01');
    expect(u(l, 'p1', 'na_warunkach_macierzynskiego')).toMatchObject({ przysluguje: false, kod: 'RODZINA_ZAWODOWA_BEZ_PRAWA' });
    expect(u(l, 'p1', 'rodzicielski')).toMatchObject({ przysluguje: false, kod: 'RODZINA_ZAWODOWA_BEZ_PRAWA' });
  });

  it('EC-43: przysposobienie, dziecko 15 lat → nie, DZIECKO_ZA_STARE', () => {
    const l = przyjecie('przysposobienie', '2011-06-01');
    expect(u(l, 'p1', 'na_warunkach_macierzynskiego')).toMatchObject({ przysluguje: false, kod: 'DZIECKO_ZA_STARE' });
  });

  it('przysposobienie w dniu 14. urodzin → za stare; dzień wcześniej → tak', () => {
    const dzien14 = lista(rodzina({ osoby: [przyjmujacy()], typ: 'przysposobienie', data: '2027-02-01', dzieci: [{ dataUrodzenia: '2013-02-01' }] }));
    expect(u(dzien14, 'p1', 'na_warunkach_macierzynskiego').kod).toBe('DZIECKO_ZA_STARE');
    const dzienPrzed = lista(rodzina({ osoby: [przyjmujacy()], typ: 'przysposobienie', data: '2027-01-31', dzieci: [{ dataUrodzenia: '2013-02-01' }] }));
    expect(u(dzienPrzed, 'p1', 'na_warunkach_macierzynskiego').przysluguje).toBe(true);
  });

  it('W1: kilkoro dzieci – wystarczy, że jedno mieści się w limicie wieku (w obu kolejnościach)', () => {
    for (const dzieci of [
      [{ dataUrodzenia: '2011-06-01' }, { dataUrodzenia: '2021-12-01' }],
      [{ dataUrodzenia: '2021-12-01' }, { dataUrodzenia: '2011-06-01' }],
    ]) {
      const l = lista(rodzina({ osoby: [przyjmujacy()], typ: 'przysposobienie', data: '2027-02-01', dzieci }));
      expect(u(l, 'p1', 'na_warunkach_macierzynskiego').przysluguje).toBe(true);
    }
  });

  it('W1: wszystkie dzieci za stare → DZIECKO_ZA_STARE', () => {
    const dzieci = [{ dataUrodzenia: '2011-06-01' }, { dataUrodzenia: '2010-06-01' }];
    const l = lista(rodzina({ osoby: [przyjmujacy()], typ: 'przysposobienie', data: '2027-02-01', dzieci }));
    expect(u(l, 'p1', 'na_warunkach_macierzynskiego').kod).toBe('DZIECKO_ZA_STARE');
  });

  it('D7: ojcowski dla roli przyjmujący – warunkowo, osobny kod', () => {
    const l = przyjecie('przysposobienie', '2021-12-01');
    expect(u(l, 'p1', 'ojcowski')).toMatchObject({ przysluguje: 'warunkowo', kod: 'OJC_PRZYJMUJACY_DO_POTWIERDZENIA' });
  });

  it('przyjmujący dostaje 4 wpisy według D3', () => {
    const l = przyjecie('przysposobienie', '2021-12-01');
    expect(l.map((x) => x.swiadczenie).sort()).toEqual(['na_warunkach_macierzynskiego', 'ojcowski', 'rodzicielski', 'uzupelniajacy']);
  });

  it('dwoje przyjmujących: na warunkach macierzyńskiego jedna osoba, druga tylko przejęcie – bez „do potwierdzenia” (pytanie 22)', () => {
    const drugi: Osoba = { id: 'p2', rola: 'przyjmujacy', tytuly: [etat({ id: 'etat-p2' })] };
    const l = lista(rodzina({ osoby: [przyjmujacy(), drugi], typ: 'przysposobienie', data: '2027-02-01', dzieci: [{ dataUrodzenia: '2021-12-01' }] }));
    expect(u(l, 'p1', 'na_warunkach_macierzynskiego').przysluguje).toBe(true);
    const drugiWpis = u(l, 'p2', 'na_warunkach_macierzynskiego');
    expect(drugiWpis).toMatchObject({ przysluguje: 'warunkowo', kod: 'NA_WARUNKACH_TYLKO_PRZEJECIE' });
    expect(drugiWpis.powod).not.toContain('wymaga potwierdzenia w ZUS');
    expect(u(l, 'p2', 'rodzicielski').przysluguje).toBe(true);
  });
});

describe('A2: ojciec i inni członkowie rodziny (D3)', () => {
  it('A2-b: mama + tata na etacie', () => {
    const l = lista(rodzina({ osoby: [mama(), tata()] }));
    expect(u(l, 'tata', 'ojcowski')).toMatchObject({ przysluguje: true, kod: 'UBEZP_W_DNIU_PORODU', tytulId: 'etat-taty' });
    expect(u(l, 'tata', 'rodzicielski').przysluguje).toBe(true);
    expect(u(l, 'tata', 'macierzynski')).toMatchObject({ przysluguje: 'warunkowo', kod: 'MAC_TYLKO_PRZEJECIE' });
    expect(l.filter((x) => x.osobaId === 'tata').map((x) => x.swiadczenie).sort()).toEqual([
      'macierzynski',
      'ojcowski',
      'rodzicielski',
      'uzupelniajacy',
    ]);
  });

  it('EC-56 / A2-c: matka bez tytułów, ojciec na etacie', () => {
    const l = lista(rodzina({ osoby: [mama([]), tata()] }));
    const mm = u(l, 'mama', 'macierzynski');
    expect(mm.przysluguje).toBe(false);
    expect(mm.alternatywa).toContain(String(p.kwoty.swiadczenieRodzicielskie));
    // Odpowiedź ZUS na stoisku 21.11, pytania nr 6 i 14: tata ma zasiłek za pulę bez 9 tygodni mamy, bez 81,5%.
    const tr = u(l, 'tata', 'rodzicielski');
    expect(tr).toMatchObject({ przysluguje: true, kod: 'MATKA_NIEUBEZPIECZONA' });
    expect(tr.powod).not.toContain('wymaga potwierdzenia w ZUS');
    expect(tr.powod).toContain(`${PULE.rodzicielskiTyg - PULE.rodzicielskiNieprzenoszalneTyg} tygod`);
    expect(tr.powod).toContain(`${PULE.rodzicielskiNieprzenoszalneTyg} tygodni`);
    expect(tr.powod).toContain(`${p.stawkiProc.wariant815}`.replace('.', ','));
    expect(u(l, 'tata', 'ojcowski').przysluguje).toBe(true);
    expect(u(l, 'tata', 'macierzynski').kod).not.toBe('MAC_TYLKO_PRZEJECIE');
  });

  it('EC-56 / D6: matka nieubezpieczona z samym orzeczeniem → ojciec macierzyński warunkowo (UZ art. 29 ust. 9 pkt 3)', () => {
    const l = lista(rodzina({ osoby: [mama([], { zdrowie: { orzeczenieNiezdolnosciSamodzielnejEgzystencji: true } }), tata()] }));
    expect(u(l, 'tata', 'macierzynski')).toMatchObject({ przysluguje: 'warunkowo', kod: 'MAC_MATKA_NIEUBEZPIECZONA_ORZECZENIE' });
  });

  it('EC-56: zgon nieubezpieczonej matki → ojciec macierzyński tak (UZ art. 29 ust. 9 pkt 1)', () => {
    const l = lista(rodzina({ osoby: [mama([], { zdrowie: { zgon: '2026-12-10' } }), tata()] }));
    expect(u(l, 'tata', 'macierzynski')).toMatchObject({ przysluguje: true, kod: 'MAC_MATKA_NIEUBEZPIECZONA_ZDARZENIE' });
  });

  it('EC-56: zgon nieubezpieczonej matki → rodzicielski taty bez zdania o braku 81,5% (wyjątek zus.pl, UZ art. 29 ust. 9)', () => {
    const l = lista(rodzina({ osoby: [mama([], { zdrowie: { zgon: '2026-12-10' } }), tata()] }));
    const tr = u(l, 'tata', 'rodzicielski');
    expect(tr).toMatchObject({ przysluguje: true, kod: 'MATKA_NIEUBEZPIECZONA' });
    expect(tr.powod).not.toContain(`${p.stawkiProc.wariant815}`.replace('.', ','));
  });

  it('W5: matka bez tytułu → ojciec macierzyński warunkowo, gdy mama podejmie pracę (UZ art. 29 ust. 10)', () => {
    const l = lista(rodzina({ osoby: [mama([]), tata()] }));
    expect(u(l, 'tata', 'macierzynski')).toMatchObject({ przysluguje: 'warunkowo', kod: 'MAC_GDY_MATKA_PODEJMIE_PRACE' });
  });

  it('W5: matka ma tytuł bez chorobowego → ust. 10 nie dotyczy, ojciec macierzyński nie', () => {
    const l = lista(rodzina({ osoby: [mama([zlecenie({ chorobowe: 'brak' })]), tata()] }));
    expect(u(l, 'tata', 'macierzynski')).toMatchObject({ przysluguje: false, kod: 'MAC_MATKA_BEZ_PRAWA_DO_ZASILKU' });
    expect(u(l, 'tata', 'rodzicielski').kod).toBe('MATKA_NIEUBEZPIECZONA');
  });

  it('sam ojciec, bez matki w rodzinie', () => {
    const l = lista(rodzina({ osoby: [tata()] }));
    expect(l).toHaveLength(4);
    expect(u(l, 'tata', 'macierzynski')).toMatchObject({ przysluguje: 'warunkowo', kod: 'MAC_TYLKO_PRZEJECIE' });
    expect(u(l, 'tata', 'rodzicielski')).toMatchObject({ przysluguje: true, kod: 'RODZ_UBEZPIECZONY' });
    expect(u(l, 'tata', 'ojcowski')).toMatchObject({ przysluguje: true, kod: 'UBEZP_W_DNIU_PORODU' });
  });

  it('W7: ojciec na urlopie wychowawczym do 2027-01-31 → ojcowski i rodzicielski od powrotu', () => {
    const t = tata(undefined, { urlopWychowawczy: { od: '2026-02-01', do: '2027-01-31' } });
    const l = lista(rodzina({ osoby: [mama(), t] }));
    expect(u(l, 'tata', 'ojcowski')).toMatchObject({ przysluguje: true, kod: 'UBEZP_PO_PORODZIE', tytulId: 'etat-taty' });
    expect(u(l, 'tata', 'ojcowski').powod).toContain('1 lutego 2027');
    expect(u(l, 'tata', 'rodzicielski')).toMatchObject({ przysluguje: true, tytulId: 'etat-taty' });
  });

  it('D5: ojciec ubezpieczony dopiero po końcu urlopu macierzyńskiego → macierzyński nie', () => {
    const l = lista(rodzina({ osoby: [mama(), tata([etat({ id: 'etat-taty', od: '2027-05-01' })])] }));
    expect(u(l, 'tata', 'macierzynski').przysluguje).toBe(false);
    expect(u(l, 'tata', 'rodzicielski').przysluguje).toBe(true);
  });

  it('EC-67: ojciec zaczął pracę po narodzinach, dziecko < 12 mies. → ojcowski', () => {
    const l = lista(rodzina({ osoby: [mama(), tata([etat({ id: 'etat-taty', od: '2027-02-01' })])] }));
    expect(u(l, 'tata', 'ojcowski')).toMatchObject({ przysluguje: true, kod: 'UBEZP_PO_PORODZIE', tytulId: 'etat-taty' });
  });

  it('ojciec zaczyna pracę po terminie ojcowskiego → ojcowski nie', () => {
    const l = lista(rodzina({ osoby: [mama(), tata([etat({ id: 'etat-taty', od: '2027-12-01' })])] }));
    expect(u(l, 'tata', 'ojcowski').przysluguje).toBe(false);
  });

  it('ojciec bez tytułów → wszystkie jego wpisy BRAK_TYTULU_UBEZPIECZENIA', () => {
    const l = lista(rodzina({ osoby: [mama(), tata([])] }));
    for (const x of l.filter((y) => y.osobaId === 'tata')) {
      expect(x).toMatchObject({ przysluguje: false, kod: 'BRAK_TYTULU_UBEZPIECZENIA' });
    }
  });

  it('A2-e: inny członek rodziny z etatem → tylko macierzyński warunkowo', () => {
    const babcia: Osoba = { id: 'babcia', rola: 'inny_czlonek_rodziny', tytuly: [etat({ id: 'etat-b' })] };
    const l = lista(rodzina({ osoby: [mama(), babcia] })).filter((x) => x.osobaId === 'babcia');
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ swiadczenie: 'macierzynski', przysluguje: 'warunkowo', kod: 'PRZEJECIE_SYTUACJA_SZCZEGOLNA' });
    expect(l[0].powod).toContain('wymaga potwierdzenia w ZUS');
    // Odpowiedź ZUS na stoisku 21.11, pytanie nr 21: przykład – dziadkowie albo rodzeństwo mamy.
    expect(l[0].powod).toContain(PRZYKLAD_CZLONKA_RODZINY);
  });
});

describe('A2: jeden wpis na parę (D2) i tytuł dający prawo', () => {
  it('A2-a: EC-01 → dokładnie jeden wpis na każde z 8 świadczeń matki', () => {
    const l = sama(mama());
    expect(l).toHaveLength(WSZYSTKIE.length);
    for (const sw of WSZYSTKIE) u(l, 'mama', sw);
  });

  it('A2-d: etat skończył się przed porodem + zlecenie z chorobowym trwa → tytulId zlecenia', () => {
    const l = sama(mama([etat({ do: '2026-06-30' }), zlecenie()]));
    expect(u(l, 'mama', 'macierzynski')).toMatchObject({ przysluguje: true, tytulId: 'zlecenie-1' });
  });

  it('wpis „nie przysługuje” ma tytulId pierwszego tytułu osoby', () => {
    expect(u(sama(mama([zlecenie({ chorobowe: 'brak' })])), 'mama', 'macierzynski').tytulId).toBe('zlecenie-1');
  });

  it('każdy wpis ma kod, powód i przepis', () => {
    const l = lista(rodzina({ osoby: [mama(), tata()] }));
    for (const x of l) {
      expect(x.kod).toMatch(/^[A-Z0-9_]+$/);
      expect(x.powod.length).toBeGreaterThan(0);
      expect(x.przepis.length).toBeGreaterThan(0);
    }
  });

  it('EC-01: uzupełniający nie przysługuje (UZUP_BRAK_PRZESLANEK), ojcowski nie dla matki', () => {
    const l = sama(mama());
    expect(u(l, 'mama', 'uzupelniajacy')).toMatchObject({ przysluguje: false, kod: 'UZUP_BRAK_PRZESLANEK' });
    expect(u(l, 'mama', 'ojcowski').przysluguje).toBe(false);
    expect(u(l, 'mama', 'na_warunkach_macierzynskiego').przysluguje).toBe(false);
    expect(u(l, 'mama', 'zasilek_w_wys_macierzynskiego').przysluguje).toBe(false);
  });

  it('uzupełniający w puli → matka tak, ojciec warunkowo (tylko po przejęciu macierzyńskiego)', () => {
    const l = lista(rodzina({ osoby: [mama(), tata()] }), { uzupelniajacyTyg: 3 });
    expect(u(l, 'mama', 'uzupelniajacy').przysluguje).toBe(true);
    expect(u(l, 'tata', 'uzupelniajacy').przysluguje).toBe('warunkowo');
  });

  it('EC-24: pula rodzicielskiego i ojcowskiego 0 (martwe urodzenie) → nie, bez „do potwierdzenia” (pytanie 8)', () => {
    const l = lista(rodzina({ osoby: [mama(), tata()], dzieci: [{ martwe: true }] }), { rodzicielskiTyg: 0, ojcowskiTyg: 0 });
    const r = u(l, 'mama', 'rodzicielski');
    expect(r).toMatchObject({ przysluguje: false, kod: 'RODZ_BRAK_WYMIARU' });
    expect(r.powod).not.toContain('wymaga potwierdzenia w ZUS');
    const o = u(l, 'tata', 'ojcowski');
    expect(o).toMatchObject({ przysluguje: false, kod: 'OJC_BRAK_WYMIARU' });
    expect(o.powod).not.toContain('wymaga potwierdzenia w ZUS');
  });

  it('dwie osoby z rolą matka → każda ma własny wynik', () => {
    const l = lista(rodzina({ osoby: [mama(), mama([zlecenie({ chorobowe: 'brak' })], { id: 'mama2' })] }));
    expect(u(l, 'mama', 'macierzynski').przysluguje).toBe(true);
    expect(u(l, 'mama2', 'macierzynski')).toMatchObject({ przysluguje: false, kod: 'BRAK_CHOROBOWEGO' });
  });

  it('osoba bez pola tytuly → BRAK_TYTULU_UBEZPIECZENIA, bez wyjątku', () => {
    const o = { id: 'mama', rola: 'matka' } as unknown as Osoba;
    expect(u(sama(o), 'mama', 'macierzynski').kod).toBe('BRAK_TYTULU_UBEZPIECZENIA');
  });
});

describe('A2: ciąża – zasiłek chorobowy i świadczenie rehabilitacyjne', () => {
  const zla = (od: string, do_: string) => ({ zdrowie: { eZLA: [{ od, do: do_, kodB: true }] } });

  it('EC-100: etat od ponad 30 dni, e-ZLA z kodem B → CHOROBOWY_PO_WYCZEKIWANIU', () => {
    const l = sama(mama([etat()], zla('2026-09-01', '2026-09-30')));
    expect(u(l, 'mama', 'zasilek_chorobowy_ciaza')).toMatchObject({ przysluguje: true, kod: 'CHOROBOWY_PO_WYCZEKIWANIU', tytulId: 'etat-1' });
  });

  it('EC-01 bez zwolnienia: chorobowy w ciąży przysługuje (staż od 2023)', () => {
    expect(u(sama(mama()), 'mama', 'zasilek_chorobowy_ciaza')).toMatchObject({ przysluguje: true, kod: 'CHOROBOWY_PO_WYCZEKIWANIU' });
  });

  it('EC-101: etat od 10 dni, e-ZLA z kodem B → OKRES_WYCZEKIWANIA, data w powodzie', () => {
    const l = sama(mama([etat({ od: '2026-11-11' })], zla('2026-11-21', '2026-11-30')));
    const c = u(l, 'mama', 'zasilek_chorobowy_ciaza');
    expect(c).toMatchObject({ przysluguje: false, kod: 'OKRES_WYCZEKIWANIA' });
    expect(c.powod).toContain('11 grudnia 2026');
  });

  it('EC-101b: zlecenie z dobrowolnym chorobowym od 60 dni → OKRES_WYCZEKIWANIA (90 dni)', () => {
    const l = sama(mama([zlecenie({ od: '2026-09-22' })], zla('2026-11-21', '2026-11-30')));
    const c = u(l, 'mama', 'zasilek_chorobowy_ciaza');
    expect(c).toMatchObject({ przysluguje: false, kod: 'OKRES_WYCZEKIWANIA' });
    expect(c.powod).toContain('21 grudnia 2026');
  });

  it('wyczekiwanie: dwa tytuły z przerwą 30 dni sklejają się', () => {
    const o = mama([etat({ id: 'e1', od: '2026-09-01', do: '2026-09-20' }), etat({ id: 'e2', od: '2026-10-21' })], zla('2026-10-31', '2026-11-10'));
    expect(u(sama(o), 'mama', 'zasilek_chorobowy_ciaza')).toMatchObject({ przysluguje: true, tytulId: 'e2' });
  });

  it('wyczekiwanie: przerwa 31 dni przerywa ciągłość', () => {
    const o = mama([etat({ id: 'e1', od: '2026-09-01', do: '2026-09-20' }), etat({ id: 'e2', od: '2026-10-22' })], zla('2026-10-31', '2026-11-10'));
    const c = u(sama(o), 'mama', 'zasilek_chorobowy_ciaza');
    expect(c).toMatchObject({ przysluguje: false, kod: 'OKRES_WYCZEKIWANIA' });
    expect(c.powod).toContain('21 listopada 2026');
  });

  it('EC-103: e-ZLA łącznie ponad 270 dni → świadczenie rehabilitacyjne warunkowo', () => {
    const l = sama(mama([etat()], zla('2026-02-25', '2026-11-30')));
    expect(u(l, 'mama', 'swiadczenie_rehabilitacyjne')).toMatchObject({ przysluguje: 'warunkowo', kod: 'PO_WYCZERPANIU_ZASILKU' });
  });

  it('e-ZLA dokładnie 270 dni → świadczenie rehabilitacyjne jeszcze nie', () => {
    const l = sama(mama([etat()], zla('2026-03-01', '2026-11-25')));
    expect(u(l, 'mama', 'swiadczenie_rehabilitacyjne').przysluguje).toBe(false);
  });

  it('EC-12b: zaległość wstrzymuje też zasiłek chorobowy', () => {
    const l = sama(mama([dzialalnosc({ zadluzenieSkladkowe: 500 })]));
    expect(u(l, 'mama', 'zasilek_chorobowy_ciaza')).toMatchObject({ przysluguje: 'warunkowo', kod: 'WSTRZYMANY_DO_SPLATY_ZALEGLOSCI' });
  });
});
