import { describe, expect, it } from 'vitest';
import { zdanieNiedostepnych } from '../niedostepne';

describe('zdanieNiedostepnych', () => {
  it('odmienia liczebnik po polsku', () => {
    expect(zdanieNiedostepnych(1)).toBe('1 możliwość jest teraz niedostępna');
    expect(zdanieNiedostepnych(2)).toBe('2 możliwości są teraz niedostępne');
    expect(zdanieNiedostepnych(4)).toBe('4 możliwości są teraz niedostępne');
    expect(zdanieNiedostepnych(5)).toBe('5 możliwości jest teraz niedostępnych');
    expect(zdanieNiedostepnych(12)).toBe('12 możliwości jest teraz niedostępnych');
    expect(zdanieNiedostepnych(22)).toBe('22 możliwości są teraz niedostępne');
  });
});
