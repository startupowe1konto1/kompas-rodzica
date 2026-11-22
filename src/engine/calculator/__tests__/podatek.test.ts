import { describe, expect, it } from 'vitest';
import { PARAMETRY_2026 } from '../../params';
import { zaliczkaMiesieczna } from '../podatek';

describe('zaliczkaMiesieczna', () => {
  it('12% od podstawy zaokrąglonej do pełnych złotych: 7133,41 zł → 856 zł', () => {
    expect(zaliczkaMiesieczna(7133.41, false, PARAMETRY_2026)).toBe(856);
  });
  it('z oświadczeniem PIT-2 odejmuje 300 zł: 856 − 300 = 556 zł', () => {
    expect(zaliczkaMiesieczna(7133.41, true, PARAMETRY_2026)).toBe(556);
  });
  it('nie schodzi poniżej zera: 1035,48 zł z PIT-2 → 0 zł', () => {
    expect(zaliczkaMiesieczna(1035.48, true, PARAMETRY_2026)).toBe(0);
  });
  it('brak zasiłku w miesiącu → 0 zł', () => {
    expect(zaliczkaMiesieczna(0, false, PARAMETRY_2026)).toBe(0);
    expect(zaliczkaMiesieczna(0, true, PARAMETRY_2026)).toBe(0);
  });
  it('podstawa 241,50 zł idzie w górę do 242 zł, zaliczka 29,04 zł → 29 zł', () => {
    expect(zaliczkaMiesieczna(241.5, false, PARAMETRY_2026)).toBe(29);
  });
  it('końcówka poniżej 50 gr jest pomijana: 7133,49 zł → 7133 zł → 856 zł', () => {
    expect(zaliczkaMiesieczna(7133.49, false, PARAMETRY_2026)).toBe(856);
  });
  it('zaliczka zaokrągla się do pełnych złotych od 50 gr: 4671,03 zł → 4671 zł × 12% = 560,52 → 561 zł', () => {
    expect(zaliczkaMiesieczna(4671.03, false, PARAMETRY_2026)).toBe(561);
  });
  it('stawkę i kwotę zmniejszającą bierze z parametrów, nie z kodu', () => {
    const inne = { ...PARAMETRY_2026, podatek: { zaliczkaProc: 10, kwotaZmniejszajacaMiesiecznie: 100 } };
    expect(zaliczkaMiesieczna(1000, false, inne)).toBe(100);
    expect(zaliczkaMiesieczna(1000, true, inne)).toBe(0);
    expect(zaliczkaMiesieczna(2000, true, inne)).toBe(100);
  });
});
