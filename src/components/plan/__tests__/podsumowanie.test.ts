import { describe, expect, it } from 'vitest';
import { MAMA, TATA, plan, rodzina } from '../../os-czasu/__tests__/dane';
import { podsumowanieOsob, tygodnieSlownie, zdaniePodsumowania } from '../podsumowanie';

describe('tygodnieSlownie', () => {
  it('polska odmiana', () => {
    expect(tygodnieSlownie(1)).toBe('1 tydzień');
    expect(tygodnieSlownie(2)).toBe('2 tygodnie');
    expect(tygodnieSlownie(5)).toBe('5 tygodni');
    expect(tygodnieSlownie(12)).toBe('12 tygodni');
    expect(tygodnieSlownie(22)).toBe('22 tygodnie');
    expect(tygodnieSlownie(52)).toBe('52 tygodnie');
  });
});

describe('podsumowanie planu', () => {
  const odcinki = [
    { id: 'm1', osobaId: MAMA.id, typ: 'macierzynski' as const, od: '2026-12-01', do: '2027-04-19' },
    { id: 'r1', osobaId: MAMA.id, typ: 'rodzicielski' as const, od: '2027-04-20', do: '2027-05-18' },
    { id: 'p1', osobaId: MAMA.id, typ: 'praca' as const, od: '2027-05-19', do: '2027-12-31' },
    { id: 'o1', osobaId: TATA.id, typ: 'ojcowski' as const, od: '2027-01-04', do: '2027-01-17' },
  ];
  it('liczy tygodnie urlopów każdej osoby i najwcześniejszy początek, bez pracy', () => {
    const r = rodzina({ osoby: [MAMA, TATA] });
    expect(podsumowanieOsob(r, plan(odcinki))).toEqual([
      { osobaId: 'mama', tygodnie: 24, od: '2026-12-01', do: expect.any(String) },
      { osobaId: 'tata', tygodnie: 2, od: '2027-01-04', do: '2027-01-17' },
    ]);
  });
  it('zdanie z rolą i datą', () => {
    const r = rodzina({ osoby: [MAMA, TATA] });
    expect(zdaniePodsumowania(r, plan(odcinki))).toMatch((/^Mama: urlop od 1 grudnia 2026 do .+, razem 24 tygodnie. Tata: urlop od 4 stycznia 2027 do .+, razem 2 tygodnie.$/));
  });
  it('bez urlopu w planie: null', () => {
    expect(zdaniePodsumowania(rodzina(), plan([{ id: 'p', osobaId: 'mama', typ: 'praca', od: '2027-01-01', do: '2027-02-01' }]))).toBeNull();
  });
});
