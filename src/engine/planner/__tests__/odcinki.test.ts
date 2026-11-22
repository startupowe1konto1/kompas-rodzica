import { describe, expect, it } from 'vitest';
import { kopia, odcinek, plan } from '../../__tests__/rodziny';
import { czesciOsoby, nowyIdOdcinka, przeliczCzesci } from '../odcinki';

describe('czesciOsoby (D9)', () => {
  it('stykające się odcinki tej samej osoby i typu to jedna część', () => {
    const p = plan([
      odcinek({ id: 'a', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-05-31' }),
      odcinek({ id: 'b', osobaId: 'mama', typ: 'rodzicielski', od: '2027-06-01', do: '2027-06-30' }),
    ]);
    expect(czesciOsoby(p, 'mama', 'rodzicielski')).toEqual([{ od: '2027-04-20', do: '2027-06-30' }]);
  });

  it('przerwa choćby jednego dnia daje dwie części, w kolejności dat', () => {
    const p = plan([
      odcinek({ id: 'b', osobaId: 'mama', typ: 'rodzicielski', od: '2027-06-02', do: '2027-06-30' }),
      odcinek({ id: 'a', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-05-31' }),
    ]);
    expect(czesciOsoby(p, 'mama', 'rodzicielski')).toHaveLength(2);
    expect(czesciOsoby(p, 'mama', 'rodzicielski')[0].od).toBe('2027-04-20');
  });

  it('nie miesza osób ani typów', () => {
    const p = plan([
      odcinek({ osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-05-31' }),
      odcinek({ osobaId: 'tata', typ: 'rodzicielski', od: '2027-06-01', do: '2027-06-30' }),
      odcinek({ osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-04-19' }),
    ]);
    expect(czesciOsoby(p, 'mama', 'rodzicielski')).toEqual([{ od: '2027-04-20', do: '2027-05-31' }]);
  });
});

describe('przeliczCzesci (D9)', () => {
  it('nadaje czescNr rodzicielskiemu i ojcowskiemu, usuwa z innych typów, nie zmienia wejścia', () => {
    const p = plan([
      odcinek({ id: 'm', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-04-19', czescNr: 7 }),
      odcinek({ id: 'r2', osobaId: 'mama', typ: 'rodzicielski', od: '2027-08-01', do: '2027-08-31' }),
      odcinek({ id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-05-31' }),
      odcinek({ id: 'o', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-07' }),
    ]);
    const przed = kopia(p);
    const wynik = przeliczCzesci(p);
    expect(p).toEqual(przed);
    const nr = Object.fromEntries(wynik.odcinki.map((o) => [o.id, o.czescNr]));
    expect(nr).toEqual({ m: undefined, r1: 1, r2: 2, o: 1 });
  });
});

describe('nowyIdOdcinka (D11)', () => {
  it('daje najmniejszy wolny numer', () => {
    const p = plan([
      odcinek({ id: 'tata-ojcowski-1', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-07' }),
    ]);
    expect(nowyIdOdcinka(p, 'tata', 'ojcowski')).toBe('tata-ojcowski-2');
    expect(nowyIdOdcinka(p, 'mama', 'rodzicielski')).toBe('mama-rodzicielski-1');
  });
});
