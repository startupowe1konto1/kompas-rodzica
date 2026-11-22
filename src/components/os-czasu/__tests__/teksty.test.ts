import { describe, expect, it } from 'vitest';
import { NAZWY_TYPOW, opisDaty, opisDlugosci, opisOkresu } from '../teksty';

describe('teksty osi czasu', () => {
  it('data słownie z miesiącem w dopełniaczu', () => {
    expect(opisDaty('2026-12-01')).toBe('1 grudnia 2026');
    expect(opisDaty('2028-02-29')).toBe('29 lutego 2028');
    expect(opisOkresu('2026-12-01', '2027-04-19')).toBe('1 grudnia 2026 – 19 kwietnia 2027');
  });

  it('długość w tygodniach i dniach z polską odmianą', () => {
    expect(opisDlugosci(1)).toBe('1 dzień');
    expect(opisDlugosci(5)).toBe('5 dni');
    expect(opisDlugosci(7)).toBe('1 tydzień');
    expect(opisDlugosci(10)).toBe('1 tydzień i 3 dni');
    expect(opisDlugosci(14)).toBe('2 tygodnie');
    expect(opisDlugosci(84)).toBe('12 tygodni');
    expect(opisDlugosci(140)).toBe('20 tygodni');
    expect(opisDlugosci(147)).toBe('21 tygodni');
    expect(opisDlugosci(154)).toBe('22 tygodnie');
    expect(opisDlugosci(15)).toBe('2 tygodnie i 1 dzień');
  });

  it('każdy typ odcinka ma nazwę', () => {
    expect(NAZWY_TYPOW.macierzynski).toBe('Urlop macierzyński');
    expect(Object.values(NAZWY_TYPOW).every((n) => n.length > 0)).toBe(true);
  });
});
