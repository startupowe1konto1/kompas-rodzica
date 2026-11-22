import { describe, expect, it } from 'vitest';
import type { Osoba } from '../../../engine/types';
import {
  brakujeDanych,
  peselPoprawny,
  peselZCyfraKontrolna,
  scalDane,
  scalDaneDziecka,
  sprawdzFormularz,
  wartosciZDziecka,
  wartosciZOsoby,
} from '../dane-osobowe';

const PESEL = peselZCyfraKontrolna('9405120001');
const osoba = (dane?: Osoba['dane']): Osoba => ({
  id: 'mama',
  rola: 'matka',
  tytuly: [],
  dane,
});
const pelne = {
  ...wartosciZOsoby(osoba()),
  imie: 'Ewa',
  nazwisko: 'Testowa',
  pesel: PESEL,
  dataUrodzenia: '1994-05-12',
  ulica: 'Polna',
  nrDomu: '5',
  kod: '00-001',
  miejscowosc: 'Warszawa',
};

describe('PESEL', () => {
  it('liczy sumę kontrolną', () => {
    expect(peselPoprawny(PESEL)).toBe(true);
    expect(peselPoprawny('44051401359')).toBe(true); // znany przykład poprawnego numeru
    expect(peselPoprawny(`${PESEL.slice(0, 10)}${(Number(PESEL[10]) + 1) % 10}`)).toBe(false);
    expect(peselPoprawny('123')).toBe(false);
    expect(peselPoprawny('abcdefghijk')).toBe(false);
  });
});

describe('sprawdzFormularz', () => {
  it('pełne poprawne dane nie mają błędów', () => {
    expect(sprawdzFormularz(pelne, '2026-11-21')).toEqual({});
  });
  it('puste wymagane pola dają błędy, opcjonalne nie', () => {
    const b = sprawdzFormularz(wartosciZOsoby(osoba()), '2026-11-21');
    expect(Object.keys(b).sort()).toEqual(['dataUrodzenia', 'imie', 'kod', 'miejscowosc', 'nazwisko', 'nrDomu', 'pesel', 'ulica']);
  });
  it('zły PESEL, kod, rachunek i data z przyszłości', () => {
    const b = sprawdzFormularz(
      {
        ...pelne,
        pesel: '12345678901',
        kod: '0000',
        rachunekBankowy: '123',
        dataUrodzenia: '2030-01-01',
      },
      '2026-11-21',
    );
    expect(Object.keys(b).sort()).toEqual(['dataUrodzenia', 'kod', 'pesel', 'rachunekBankowy']);
  });
  it('rachunek ze spacjami (26 cyfr) jest dobry', () => {
    const r = '12 3456 7890 1234 5678 9012 3456';
    expect(sprawdzFormularz({ ...pelne, rachunekBankowy: r }, '2026-11-21')).toEqual({});
  });
});

describe('scalDane', () => {
  it('nie kasuje istniejących pól i usuwa spacje z rachunku', () => {
    const d = scalDane(
      { email: 'a@b.pl', adres: { panstwo: 'Niemcy' } },
      { ...pelne, rachunekBankowy: '12 3456 7890 1234 5678 9012 3456' },
    );
    expect(d.email).toBe('a@b.pl');
    expect(d.adres).toMatchObject({
      panstwo: 'Niemcy',
      ulica: 'Polna',
      kod: '00-001',
    });
    expect(d.rachunekBankowy).toBe('12345678901234567890123456');
  });
  it('brakujeDanych: kompletne dane z formularza zamykają kartę', () => {
    expect(brakujeDanych(osoba())).toBe(true);
    expect(brakujeDanych(osoba(scalDane(undefined, pelne)))).toBe(false);
  });
});

describe('dane dziecka do wniosków (ZAM str. 3–4, wnioski do pracodawcy)', () => {
  it('odczytuje wartości z dziecka, puste gdy brak danych', () => {
    expect(wartosciZDziecka({})).toEqual({
      imie: '',
      nazwisko: '',
      miejsceUrodzenia: '',
    });
    expect(
      wartosciZDziecka({
        dane: { imie: 'Zofia', nazwisko: 'Testowa', miejsceUrodzenia: 'Łódź' },
      }),
    ).toEqual({
      imie: 'Zofia',
      nazwisko: 'Testowa',
      miejsceUrodzenia: 'Łódź',
    });
  });

  it('scala z danymi dziecka, nie kasuje PESEL z rejestru i usuwa wyczyszczone pole', () => {
    const stare = {
      imie: 'Zofia',
      pesel: '26121200000',
      miejsceUrodzenia: 'Łódź',
    };
    const nowe = scalDaneDziecka(stare, {
      imie: ' Zosia ',
      nazwisko: 'Testowa',
      miejsceUrodzenia: '',
    });
    expect(nowe).toEqual({
      imie: 'Zosia',
      nazwisko: 'Testowa',
      pesel: '26121200000',
    });
  });

  it('puste wartości nie tworzą danych dziecka', () => {
    expect(
      scalDaneDziecka(undefined, {
        imie: '',
        nazwisko: '',
        miejsceUrodzenia: '',
      }),
    ).toBeUndefined();
  });
});
