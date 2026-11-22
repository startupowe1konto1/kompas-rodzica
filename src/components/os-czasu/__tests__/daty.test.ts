import { describe, expect, it } from 'vitest';
import {
  czyPrzestepny,
  dniMiedzy,
  dniWMiesiacu,
  dodajDni,
  dodajMiesiace,
  formatujDate,
  koniecRoku,
  parsujDate,
  poczatekMiesiaca,
  wczesniejsza,
  pozniejsza,
} from '../daty';

describe('daty osi czasu (UTC)', () => {
  it('parsuje i formatuje RRRR-MM-DD', () => {
    expect(parsujDate('2028-02-29')).toEqual({ rok: 2028, miesiac: 2, dzien: 29 });
    expect(formatujDate(2027, 1, 5)).toBe('2027-01-05');
  });

  it('odrzuca niepoprawne daty', () => {
    expect(() => parsujDate('2027-02-29')).toThrow();
    expect(() => parsujDate('2027-13-01')).toThrow();
    expect(() => parsujDate('1.12.2026')).toThrow();
  });

  it('lata przestępne', () => {
    expect(czyPrzestepny(2028)).toBe(true);
    expect(czyPrzestepny(2027)).toBe(false);
    expect(czyPrzestepny(2100)).toBe(false);
    expect(czyPrzestepny(2000)).toBe(true);
    expect(dniWMiesiacu(2028, 2)).toBe(29);
    expect(dniWMiesiacu(2027, 2)).toBe(28);
  });

  it('liczy dni między datami (b − a)', () => {
    expect(dniMiedzy('2028-02-01', '2028-03-01')).toBe(29);
    expect(dniMiedzy('2027-02-01', '2027-03-01')).toBe(28);
    expect(dniMiedzy('2027-03-01', '2027-02-01')).toBe(-28);
    // zmiana czasu w Polsce (koniec marca) nie gubi dnia
    expect(dniMiedzy('2027-03-27', '2027-03-29')).toBe(2);
  });

  it('dodaje dni przez 29 lutego', () => {
    expect(dodajDni('2028-02-28', 1)).toBe('2028-02-29');
    expect(dodajDni('2028-02-29', 1)).toBe('2028-03-01');
    expect(dodajDni('2028-02-29', -280)).toBe('2027-05-25');
  });

  it('dodaje miesiące, przycinając do ostatniego dnia miesiąca', () => {
    expect(dodajMiesiace('2028-02-29', 12)).toBe('2029-02-28');
    expect(dodajMiesiace('2027-01-31', 1)).toBe('2027-02-28');
    expect(dodajMiesiace('2028-01-31', 1)).toBe('2028-02-29');
    expect(dodajMiesiace('2027-03-15', -3)).toBe('2026-12-15');
  });

  it('początek miesiąca, koniec roku, min i max', () => {
    expect(poczatekMiesiaca('2028-02-29')).toBe('2028-02-01');
    expect(koniecRoku(2034)).toBe('2034-12-31');
    expect(wczesniejsza('2027-01-02', '2026-12-31')).toBe('2026-12-31');
    expect(pozniejsza('2027-01-02', '2026-12-31')).toBe('2027-01-02');
  });
});
