import { describe, expect, it } from 'vitest';
import { licznikiPul } from '../liczniki';
import { kreski, opisLicznika, zdaniePrzepadnie } from '../opisy';

const dni = (t: number) => t * 7;
const [rodz] = licznikiPul([{ pula: 'rodzicielski', wykorzystaneDni: dni(32), dostepneDni: dni(41), przepadnieDni: dni(9) }]);
const [wolne] = licznikiPul([{ pula: 'rodzicielski', wykorzystaneDni: dni(32), dostepneDni: dni(41) }]);

describe('opisy liczników puli', () => {
  it('kreski: 41 w sumie, 32 użyte, 9 przepada', () => {
    expect(kreski(rodz)).toEqual({ razem: 41, wykorzystane: 32, przepadnie: 9, wolne: 0 });
    expect(kreski(wolne)).toEqual({ razem: 41, wykorzystane: 32, przepadnie: 0, wolne: 9 });
  });
  it('niepełny tydzień zaokrągla w górę', () => {
    const [l] = licznikiPul([{ pula: 'macierzynski', wykorzystaneDni: 15, dostepneDni: 140 }]);
    expect(kreski(l).wykorzystane).toBe(3);
  });
  it('zdanie nad paskiem', () => {
    expect(opisLicznika(wolne)).toBe('Zostało 9 z 41 tygodni');
    expect(opisLicznika(rodz)).toBe('Zaplanowane 32 z 41 tygodni');
  });
  it('zdanie o tygodniach, które przepadną', () => {
    expect(zdaniePrzepadnie(rodz)).toBe('9 tygodni przepadnie, jeśli nikt ich nie weźmie');
    expect(zdaniePrzepadnie(wolne)).toBe('');
    const [n] = licznikiPul([{ pula: 'rodzicielski_nieprzenoszalne', osobaId: 'tata', wykorzystaneDni: 0, dostepneDni: dni(9), przepadnieDni: dni(9) }]);
    expect(zdaniePrzepadnie(n, 'Jan (Tata)')).toBe('9 tygodni przepadnie, jeśli Jan (Tata) ich nie weźmie');
  });
});
