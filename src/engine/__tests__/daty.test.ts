import { describe, expect, it } from 'vitest';
import {
  czyPoprawna,
  dniWMiesiacu,
  dodajDni,
  dodajMiesiace,
  dodajTygodnie,
  koniecPoTygodniach,
  liczbaDni,
  nachodzaNaSiebie,
  przesunMiesiac,
  roznicaDni,
  rozbijNaMiesiace,
} from '../daty';

describe('daty', () => {
  it('20 tygodni urlopu macierzyńskiego od 1.12.2026 kończy się 19.04.2027', () => {
    expect(koniecPoTygodniach('2026-12-01', 20)).toBe('2027-04-19');
    expect(liczbaDni('2026-12-01', '2027-04-19')).toBe(140);
  });

  it('zmiana czasu nie przesuwa dnia (ostatnia niedziela marca i października)', () => {
    expect(dodajDni('2027-03-27', 1)).toBe('2027-03-28');
    expect(dodajDni('2027-03-28', 1)).toBe('2027-03-29');
    expect(dodajDni('2026-10-24', 2)).toBe('2026-10-26');
    expect(roznicaDni('2027-03-01', '2027-04-01')).toBe(31);
  });

  it('przejście przez koniec roku i rok przestępny', () => {
    expect(dodajDni('2026-12-31', 1)).toBe('2027-01-01');
    expect(dodajTygodnie('2027-12-20', 2)).toBe('2028-01-03');
    expect(dodajDni('2028-02-28', 1)).toBe('2028-02-29');
    expect(dniWMiesiacu('2028-02')).toBe(29);
    expect(dniWMiesiacu('2027-02')).toBe(28);
  });

  it('dodawanie miesięcy przycina do końca krótszego miesiąca', () => {
    expect(dodajMiesiace('2027-01-31', 1)).toBe('2027-02-28');
    expect(dodajMiesiace('2026-12-01', 12)).toBe('2027-12-01');
    expect(przesunMiesiac('2026-01', -1)).toBe('2025-12');
  });

  it('odrzuca niepoprawne daty', () => {
    expect(czyPoprawna('2027-02-30')).toBe(false);
    expect(czyPoprawna('1.01.2027')).toBe(false);
    expect(czyPoprawna('2027-01-01')).toBe(true);
    expect(() => dodajDni('01.01.2027', 1)).toThrow();
  });

  it('odcinki stykające się dzień po dniu nie nachodzą na siebie', () => {
    expect(nachodzaNaSiebie({ od: '2027-01-01', do: '2027-01-07' }, { od: '2027-01-08', do: '2027-01-14' })).toBe(false);
    expect(nachodzaNaSiebie({ od: '2027-01-01', do: '2027-01-08' }, { od: '2027-01-08', do: '2027-01-14' })).toBe(true);
  });

  it('rozbicie odcinka na miesiące zachowuje liczbę dni', () => {
    const kawalki = rozbijNaMiesiace('2026-12-01', '2027-04-19');
    expect(kawalki.map((k) => k.dni)).toEqual([31, 31, 28, 31, 19]);
    expect(kawalki.reduce((s, k) => s + k.dni, 0)).toBe(140);
  });
});
