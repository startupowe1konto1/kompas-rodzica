import { describe, expect, it } from 'vitest';
import { MAMA, TATA, plan } from '../../os-czasu/__tests__/dane';
import { odcinekDlaDecyzji } from '../odcinekDecyzji';

const odcinki = [
  { id: 'm1', osobaId: MAMA.id, typ: 'macierzynski' as const, od: '2026-12-01', do: '2027-04-19' },
  { id: 'r1', osobaId: MAMA.id, typ: 'rodzicielski' as const, od: '2027-04-20', do: '2027-06-01' },
  { id: 'r2', osobaId: MAMA.id, typ: 'rodzicielski' as const, od: '2027-09-01', do: '2027-11-30' },
  { id: 'ojc', osobaId: TATA.id, typ: 'ojcowski' as const, od: '2027-01-04', do: '2027-01-17' },
  { id: 'p1', osobaId: MAMA.id, typ: 'praca' as const, od: '2027-06-02', do: '2027-08-31' },
];

describe('odcinekDlaDecyzji', () => {
  it('wariant 81,5%: macierzyński osoby decydującej', () => {
    expect(odcinekDlaDecyzji(plan(odcinki), { kod: 'wariant_815', ktoDecyduje: 'mama', odKiedy: '2026-12-01' })).toBe('m1');
  });
  it('podział rodzicielskiego: najbliższy odcinek rodzicielski względem okna', () => {
    expect(odcinekDlaDecyzji(plan(odcinki), { kod: 'podzial_rodzicielskiego', ktoDecyduje: 'mama', odKiedy: '2027-10-01' })).toBe('r2');
    expect(odcinekDlaDecyzji(plan(odcinki), { kod: 'podzial_rodzicielskiego', ktoDecyduje: 'mama', odKiedy: '2027-04-25' })).toBe('r1');
  });
  it('ojcowski: odcinek taty', () => {
    expect(odcinekDlaDecyzji(plan(odcinki), { kod: 'ojcowski_w_czesciach', ktoDecyduje: 'tata' })).toBe('ojc');
  });
  it('brak pasującego typu: pierwszy urlop osoby decydującej, nigdy praca', () => {
    expect(odcinekDlaDecyzji(plan(odcinki), { kod: 'uzupelniajacy', ktoDecyduje: 'mama' })).toBe('m1');
  });
  it('pusty plan: null', () => {
    expect(odcinekDlaDecyzji(plan([]), { kod: 'wariant_815', ktoDecyduje: 'mama' })).toBeNull();
  });
});
