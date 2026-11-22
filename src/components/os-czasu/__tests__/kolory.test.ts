import { describe, expect, it } from 'vitest';
import { KOLORY_ODCINKOW, opisWymiaruPracy, tygodnieKrotko } from '../kolory';

describe('kolory odcinków (design.md)', () => {
  it('wartości z tabeli', () => {
    expect(KOLORY_ODCINKOW.macierzynski.tlo).toBe('#007834');
    expect(KOLORY_ODCINKOW.w_wys_macierzynskiego.tlo).toBe('#007834');
    expect(KOLORY_ODCINKOW.rodzicielski.tlo).toBe('#00416e');
    expect(KOLORY_ODCINKOW.ojcowski.tlo).toBe('#006d77');
    expect(KOLORY_ODCINKOW.uzupelniajacy.tlo).toBe('#5b3f8c');
    expect(KOLORY_ODCINKOW.chorobowy_ciaza.tlo).toBe('#5e6670');
    expect(KOLORY_ODCINKOW.wychowawczy.tlo).toBe('#7a5c2e');
    expect(KOLORY_ODCINKOW.praca).toEqual({ tlo: '#ececec', tekst: '#1b1b1b' });
    expect(KOLORY_ODCINKOW.przerwa.ramka).toBe('przerywana');
  });

  it('znacznik tygodni i wymiar pracy słownie', () => {
    expect(tygodnieKrotko(140)).toBe('20 tyg.');
    expect(tygodnieKrotko(43)).toBe('6 tyg. 1 d');
    expect(tygodnieKrotko(5)).toBe('5 d');
    expect(opisWymiaruPracy(0.5)).toBe('1/2 etatu');
    expect(opisWymiaruPracy(0.375)).toBe('3/8 etatu');
    expect(opisWymiaruPracy(0.25)).toBe('1/4 etatu');
  });
});
