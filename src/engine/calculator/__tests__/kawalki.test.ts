import { describe, expect, it } from 'vitest';
import type { Osoba } from '../../types';
import { dzienPoLimicie, pierwszyRodzic, podzielNaKawalki, scalOkresy } from '../kawalki';

describe('podzielNaKawalki', () => {
  it('bez granic w środku odcinka zostaje jeden kawałek', () => {
    expect(podzielNaKawalki('2027-02-01', '2027-02-14', ['2026-01-01', '2027-01-01', '2027-02-01'])).toEqual([
      { od: '2027-02-01', do: '2027-02-14', dni: 14 },
    ]);
  });
  it('granica to pierwszy dzień nowego kawałka; powtórzenia i nieposortowane granice nie przeszkadzają', () => {
    expect(podzielNaKawalki('2026-12-01', '2027-04-19', ['2027-02-01', '2027-01-01', '2027-01-01'])).toEqual([
      { od: '2026-12-01', do: '2026-12-31', dni: 31 },
      { od: '2027-01-01', do: '2027-01-31', dni: 31 },
      { od: '2027-02-01', do: '2027-04-19', dni: 78 },
    ]);
  });
  it('granica w ostatnim dniu odcinka daje jednodniowy kawałek', () => {
    expect(podzielNaKawalki('2027-03-01', '2027-03-10', ['2027-03-10'])).toEqual([
      { od: '2027-03-01', do: '2027-03-09', dni: 9 },
      { od: '2027-03-10', do: '2027-03-10', dni: 1 },
    ]);
  });
});

describe('scalOkresy', () => {
  it('scala okresy nachodzące na siebie i stykające się, sortuje po dacie początku', () => {
    expect(scalOkresy([
      { od: '2027-06-16', do: '2027-06-30' },
      { od: '2027-06-01', do: '2027-06-15' },
      { od: '2027-06-10', do: '2027-06-20' },
      { od: '2027-08-01', do: '2027-08-05' },
    ])).toEqual([
      { od: '2027-06-01', do: '2027-06-30' },
      { od: '2027-08-01', do: '2027-08-05' },
    ]);
  });
  it('nie zmienia danych wejściowych', () => {
    const wejscie = [{ od: '2027-06-01', do: '2027-06-10' }, { od: '2027-06-05', do: '2027-06-20' }];
    scalOkresy(wejscie);
    expect(wejscie).toEqual([{ od: '2027-06-01', do: '2027-06-10' }, { od: '2027-06-05', do: '2027-06-20' }]);
  });
});

describe('dzienPoLimicie', () => {
  it('63 dni w jednym okresie: pierwszy dzień ponad limit to 64. dzień', () => {
    expect(dzienPoLimicie([{ od: '2027-11-30', do: '2028-02-07' }], 63)).toBe('2028-02-01');
  });
  it('limit liczony chronologicznie po kilku okresach, niezależnie od ich kolejności', () => {
    // 35 dni (2027-11-30 … 2028-01-03), potem 28 dni drugiego okresu: 64. dzień to 2028-03-29
    expect(dzienPoLimicie([{ od: '2028-03-01', do: '2028-04-04' }, { od: '2027-11-30', do: '2028-01-03' }], 63)).toBe('2028-03-29');
  });
  it('dni wspólne dla dwóch okresów (dwa tytuły) liczą się raz', () => {
    expect(dzienPoLimicie([{ od: '2027-06-01', do: '2027-06-30' }, { od: '2027-06-01', do: '2027-06-30' }], 20)).toBe('2027-06-21');
  });
  it('gdy dni nie przekraczają limitu: undefined', () => {
    expect(dzienPoLimicie([{ od: '2027-11-30', do: '2028-01-31' }], 63)).toBeUndefined();
    expect(dzienPoLimicie([], 63)).toBeUndefined();
  });
});

describe('pierwszyRodzic', () => {
  const mama: Osoba = { id: 'mama', rola: 'matka', tytuly: [] };
  const tata: Osoba = { id: 'tata', rola: 'ojciec', tytuly: [] };
  it('osoba z najwcześniejszym odcinkiem macierzyńskim (także gdy tata przejmuje część)', () => {
    expect(pierwszyRodzic([
      { osobaId: 'tata', typ: 'macierzynski', od: '2027-03-09' },
      { osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01' },
    ], [mama, tata])).toBe('mama');
  });
  it('urlop na warunkach macierzyńskiego też wskazuje pierwszego rodzica, nawet bez roli matki', () => {
    expect(pierwszyRodzic([
      { osobaId: 'tata', typ: 'rodzicielski', od: '2027-01-01' },
      { osobaId: 'tata', typ: 'na_warunkach_macierzynskiego', od: '2026-12-01' },
    ], [mama, tata])).toBe('tata');
  });
  it('bez macierzyńskiego w planie: osoba o roli matki; bez matki: brak', () => {
    expect(pierwszyRodzic([{ osobaId: 'tata', typ: 'rodzicielski', od: '2027-01-01' }], [tata, mama])).toBe('mama');
    expect(pierwszyRodzic([{ osobaId: 'tata', typ: 'rodzicielski', od: '2027-01-01' }], [tata])).toBeUndefined();
  });
});
