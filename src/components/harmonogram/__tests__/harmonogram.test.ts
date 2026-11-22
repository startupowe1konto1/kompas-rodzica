import { describe, expect, it } from 'vitest';
import type { KtoWyplaca, KwotaOdcinka, Odcinek, Plan, WynikKwot } from '../../../engine/types';
import { zbudujHarmonogram } from '../harmonogram';

function plan(odcinki: Odcinek[], wariant815 = false): Plan {
  return { id: 'p1', nazwa: 'Plan testowy', odcinki, wariant815 };
}

function kwota(o: Partial<KwotaOdcinka> & Pick<KwotaOdcinka, 'odcinekId' | 'osobaId' | 'stawkaProc' | 'rozbicieMiesieczne'>): KwotaOdcinka {
  const razem = o.razem ?? Math.round(o.rozbicieMiesieczne.reduce((s, m) => s + m.kwota, 0) * 100) / 100;
  return {
    podstawa: 6000,
    dziennie: 200,
    dni: o.rozbicieMiesieczne.reduce((s, m) => s + m.dni, 0),
    miesiecznie: 6000,
    sciezka: [],
    ...o,
    razem,
  };
}

function wynik(odcinki: KwotaOdcinka[]): WynikKwot {
  return { podstawy: [], odcinki, sumaOsoby: {}, sumaRazem: 0, uwagi: [] };
}

describe('zbudujHarmonogram', () => {
  it('rozbija odcinek na miesiące i układa je po kolei', () => {
    const p = plan([{ id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2027-01-15', do: '2027-03-10' }]);
    const w = wynik([
      kwota({
        odcinekId: 'm1',
        osobaId: 'mama',
        stawkaProc: 100,
        rozbicieMiesieczne: [
          { miesiac: '2027-03', dni: 10, kwota: 2000 },
          { miesiac: '2027-01', dni: 17, kwota: 3400 },
          { miesiac: '2027-02', dni: 28, kwota: 5600 },
        ],
      }),
    ]);
    const h = zbudujHarmonogram(w, p);
    expect(h.wiersze.map((r) => [r.miesiac, r.typ, r.stawkaProc, r.dni, r.brutto])).toEqual([
      ['2027-01', 'macierzynski', 100, 17, 3400],
      ['2027-02', 'macierzynski', 100, 28, 5600],
      ['2027-03', 'macierzynski', 100, 10, 2000],
    ]);
    expect(h.miesiace.map((m) => m.miesiac)).toEqual(['2027-01', '2027-02', '2027-03']);
    expect(h.sumaBrutto).toBe(11000);
    expect(h.sumaNetto).toBeUndefined();
  });

  it('różne stawki w kolejnych miesiącach: macierzyński 100%, potem rodzicielski 70%', () => {
    const p = plan([
      { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2027-01-01', do: '2027-02-15' },
      { id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-02-16', do: '2027-04-30', czescNr: 1 },
    ]);
    const w = wynik([
      kwota({
        odcinekId: 'm1',
        osobaId: 'mama',
        stawkaProc: 100,
        rozbicieMiesieczne: [
          { miesiac: '2027-01', dni: 31, kwota: 6200 },
          { miesiac: '2027-02', dni: 15, kwota: 3000 },
        ],
      }),
      kwota({
        odcinekId: 'r1',
        osobaId: 'mama',
        stawkaProc: 70,
        rozbicieMiesieczne: [
          { miesiac: '2027-02', dni: 13, kwota: 1820 },
          { miesiac: '2027-03', dni: 31, kwota: 4340 },
          { miesiac: '2027-04', dni: 30, kwota: 4200 },
        ],
      }),
    ]);
    const h = zbudujHarmonogram(w, p);
    expect(h.wiersze.map((r) => [r.miesiac, r.typ, r.stawkaProc, r.brutto])).toEqual([
      ['2027-01', 'macierzynski', 100, 6200],
      ['2027-02', 'macierzynski', 100, 3000],
      ['2027-02', 'rodzicielski', 70, 1820],
      ['2027-03', 'rodzicielski', 70, 4340],
      ['2027-04', 'rodzicielski', 70, 4200],
    ]);
    const luty = h.miesiace.find((m) => m.miesiac === '2027-02');
    expect(luty?.wiersze).toHaveLength(2);
    expect(luty?.brutto).toBe(4820);
    expect(h.sumaBrutto).toBe(19560);
  });

  it('dwie osoby w tym samym miesiącu: osobne wiersze w kolejności osób, sumy osób i miesiąca', () => {
    const p = plan([
      { id: 'o1', osobaId: 'tata', typ: 'ojcowski', od: '2027-01-04', do: '2027-01-17' },
      { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2027-01-01', do: '2027-01-31' },
    ]);
    const w = wynik([
      kwota({ odcinekId: 'o1', osobaId: 'tata', stawkaProc: 100, rozbicieMiesieczne: [{ miesiac: '2027-01', dni: 14, kwota: 3500 }] }),
      kwota({ odcinekId: 'm1', osobaId: 'mama', stawkaProc: 100, rozbicieMiesieczne: [{ miesiac: '2027-01', dni: 31, kwota: 6200 }] }),
    ]);
    const h = zbudujHarmonogram(w, p, { kolejnoscOsob: ['mama', 'tata'] });
    expect(h.wiersze.map((r) => [r.osobaId, r.typ, r.brutto])).toEqual([
      ['mama', 'macierzynski', 6200],
      ['tata', 'ojcowski', 3500],
    ]);
    expect(h.miesiace).toHaveLength(1);
    expect(h.miesiace[0].brutto).toBe(9700);
    expect(h.osoby).toEqual([
      { osobaId: 'mama', brutto: 6200, netto: undefined },
      { osobaId: 'tata', brutto: 3500, netto: undefined },
    ]);
  });

  it('łączy dwie części tego samego świadczenia z tą samą stawką w jednym miesiącu', () => {
    const p = plan([
      { id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-05-01', do: '2027-05-14', czescNr: 1 },
      { id: 'r2', osobaId: 'mama', typ: 'rodzicielski', od: '2027-05-20', do: '2027-05-31', czescNr: 2 },
    ]);
    const w = wynik([
      kwota({ odcinekId: 'r1', osobaId: 'mama', stawkaProc: 70, rozbicieMiesieczne: [{ miesiac: '2027-05', dni: 14, kwota: 1960 }] }),
      kwota({ odcinekId: 'r2', osobaId: 'mama', stawkaProc: 70, rozbicieMiesieczne: [{ miesiac: '2027-05', dni: 12, kwota: 1680 }] }),
    ]);
    const h = zbudujHarmonogram(w, p);
    expect(h.wiersze).toHaveLength(1);
    expect(h.wiersze[0]).toMatchObject({ miesiac: '2027-05', dni: 26, brutto: 3640, odcinekIds: ['r1', 'r2'] });
  });

  it('netto i podwyższenie rozkłada na miesiące proporcjonalnie, a sumy zgadzają się co do grosza', () => {
    const p = plan([{ id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2027-01-01', do: '2027-03-31' }]);
    const w = wynik([
      kwota({
        odcinekId: 'm1',
        osobaId: 'mama',
        stawkaProc: 81.5,
        razem: 3000,
        podwyzszenie: 100,
        naReke: 2900,
        rozbicieMiesieczne: [
          { miesiac: '2027-01', dni: 31, kwota: 1000 },
          { miesiac: '2027-02', dni: 28, kwota: 1000 },
          { miesiac: '2027-03', dni: 31, kwota: 1000 },
        ],
      }),
    ]);
    const h = zbudujHarmonogram(w, p);
    expect(h.wiersze.map((r) => r.stawkaProc)).toEqual([81.5, 81.5, 81.5]);
    expect(h.wiersze.map((r) => r.brutto)).toEqual([1033.34, 1033.33, 1033.33]);
    expect(h.wiersze.map((r) => r.netto)).toEqual([966.67, 966.67, 966.66]);
    expect(h.sumaBrutto).toBe(3100);
    expect(h.sumaNetto).toBe(2900);
    expect(h.maPodwyzszenie).toBe(true);
  });

  it('pomija pracę, przerwę, odcinki spoza planu i miesiące z kwotą 0', () => {
    const p = plan([
      { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2027-01-01', do: '2027-01-31' },
      { id: 'w1', osobaId: 'mama', typ: 'wychowawczy', od: '2027-02-01', do: '2027-02-28' },
      { id: 'pr', osobaId: 'mama', typ: 'praca', od: '2027-03-01', do: '2027-03-31' },
    ]);
    const w = wynik([
      kwota({ odcinekId: 'm1', osobaId: 'mama', stawkaProc: 100, rozbicieMiesieczne: [{ miesiac: '2027-01', dni: 31, kwota: 6200 }] }),
      kwota({ odcinekId: 'w1', osobaId: 'mama', stawkaProc: 0, rozbicieMiesieczne: [{ miesiac: '2027-02', dni: 28, kwota: 0 }] }),
      kwota({ odcinekId: 'pr', osobaId: 'mama', stawkaProc: 0, rozbicieMiesieczne: [{ miesiac: '2027-03', dni: 31, kwota: 0 }] }),
      kwota({ odcinekId: 'stary', osobaId: 'mama', stawkaProc: 100, rozbicieMiesieczne: [{ miesiac: '2027-04', dni: 30, kwota: 6000 }] }),
    ]);
    const h = zbudujHarmonogram(w, p);
    expect(h.wiersze.map((r) => r.odcinekIds)).toEqual([['m1']]);
    expect(h.sumaBrutto).toBe(6200);
  });

  it('kto wypłaca: po tytule ubezpieczenia, a bez tytułu tylko gdy dla osoby jest jeden płatnik', () => {
    const p = plan([
      { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2027-01-01', do: '2027-01-31', tytulId: 'zlecenie' },
      { id: 'o1', osobaId: 'tata', typ: 'ojcowski', od: '2027-01-04', do: '2027-01-17' },
      { id: 'r1', osobaId: 'babcia', typ: 'rodzicielski', od: '2027-01-04', do: '2027-01-17' },
    ]);
    const lista: KtoWyplaca[] = [
      { osobaId: 'mama', tytulId: 'etat', kto: 'platnik', powod: '', przepis: '' },
      { osobaId: 'mama', tytulId: 'zlecenie', kto: 'ZUS', powod: '', przepis: '' },
      { osobaId: 'tata', tytulId: 'etat', kto: 'platnik', powod: '', przepis: '' },
      { osobaId: 'babcia', tytulId: 'a', kto: 'platnik', powod: '', przepis: '' },
      { osobaId: 'babcia', tytulId: 'b', kto: 'ZUS', powod: '', przepis: '' },
    ];
    const w = wynik([
      kwota({ odcinekId: 'm1', osobaId: 'mama', stawkaProc: 100, rozbicieMiesieczne: [{ miesiac: '2027-01', dni: 31, kwota: 6200 }] }),
      kwota({ odcinekId: 'o1', osobaId: 'tata', stawkaProc: 100, rozbicieMiesieczne: [{ miesiac: '2027-01', dni: 14, kwota: 3500 }] }),
      kwota({ odcinekId: 'r1', osobaId: 'babcia', stawkaProc: 70, rozbicieMiesieczne: [{ miesiac: '2027-01', dni: 14, kwota: 1400 }] }),
    ]);
    const h = zbudujHarmonogram(w, p, { kolejnoscOsob: ['mama', 'tata', 'babcia'], ktoWyplaca: lista });
    expect(h.wiersze.map((r) => [r.osobaId, r.ktoWyplaca, r.tytulId])).toEqual([
      ['mama', 'ZUS', 'zlecenie'],
      ['tata', 'platnik', 'etat'],
      ['babcia', undefined, undefined],
    ]);
  });

  it('łączenie z pracą: osobny wiersz z wymiarem pracy', () => {
    const p = plan([
      { id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-05-01', do: '2027-05-14' },
      { id: 'r2', osobaId: 'mama', typ: 'rodzicielski', od: '2027-05-15', do: '2027-05-31', wymiarPracy: 0.5 },
    ]);
    const w = wynik([
      kwota({ odcinekId: 'r1', osobaId: 'mama', stawkaProc: 70, rozbicieMiesieczne: [{ miesiac: '2027-05', dni: 14, kwota: 1960 }] }),
      kwota({ odcinekId: 'r2', osobaId: 'mama', stawkaProc: 70, rozbicieMiesieczne: [{ miesiac: '2027-05', dni: 17, kwota: 1190 }] }),
    ]);
    const h = zbudujHarmonogram(w, p);
    expect(h.wiersze.map((r) => [r.wymiarPracy, r.brutto])).toEqual([
      [undefined, 1960],
      [0.5, 1190],
    ]);
  });
});
