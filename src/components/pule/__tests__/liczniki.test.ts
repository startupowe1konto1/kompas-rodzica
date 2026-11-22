import { describe, expect, it } from 'vitest';
import type { WykorzystaniePuli } from '../../../engine/types';
import { PRZYKLAD_WALIDACJA } from '../../../mocks/przyklad';
import { licznikiPul, naTygodnie } from '../liczniki';

describe('licznikiPul', () => {
  it('naTygodnie: 63 → 9, 10 → 1,4', () => {
    expect(naTygodnie(63)).toBe(9);
    expect(naTygodnie(10)).toBe(1.4);
  });
  it('przykład: kolejność pul i liczby tygodni', () => {
    const l = licznikiPul(PRZYKLAD_WALIDACJA.wykorzystanie);
    expect(l.map((x) => [x.pula, x.osobaId ?? null])).toEqual([['macierzynski', null], ['rodzicielski', null], ['rodzicielski_nieprzenoszalne', 'mama']]);
    expect(l[0]).toMatchObject({ wykorzystaneTyg: 20, dostepneTyg: 20, przepadnieTyg: 0, wolneTyg: 0 });
    expect(l[1]).toMatchObject({ wykorzystaneTyg: 32, dostepneTyg: 41, przepadnieTyg: 9, wolneTyg: 0 });
  });
  it('wolne = dostępne − wykorzystane − przepadnie', () => {
    const [x] = licznikiPul([{ pula: 'ojcowski', osobaId: 'tata', wykorzystaneDni: 7, dostepneDni: 14 }]);
    expect(x).toMatchObject({ wykorzystaneTyg: 1, wolneTyg: 1, przepadnieTyg: 0 });
  });
  it('wolne nie spada poniżej zera', () => {
    const [x] = licznikiPul([{ pula: 'ojcowski', wykorzystaneDni: 14, dostepneDni: 7 }]);
    expect(x.wolneTyg).toBe(0);
  });
  it('pełna kolejność pul', () => {
    const p = (pula: WykorzystaniePuli['pula']): WykorzystaniePuli => ({ pula, wykorzystaneDni: 0, dostepneDni: 7 });
    const l = licznikiPul([p('ojcowski'), p('rodzicielski_nieprzenoszalne'), p('rodzicielski'), p('uzupelniajacy'), p('macierzynski')]);
    expect(l.map((x) => x.pula)).toEqual(['macierzynski', 'uzupelniajacy', 'rodzicielski', 'rodzicielski_nieprzenoszalne', 'ojcowski']);
  });
});
