/**
 * Dane do testów modułu wniosków. Wszystkie dane osobowe są fikcyjne
 * (PESEL-e i numer rachunku nie należą do nikogo).
 */
import type { DaneOsobowe, Dziecko, Plan, Rodzina, ZapytanieWniosek } from '../../engine/types';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../mocks/przyklad';

export const MAMA_DANE: DaneOsobowe = {
  imie: 'Anna',
  nazwisko: 'Przykładowa',
  pesel: '94051212345',
  dataUrodzenia: '1994-05-12',
  adres: { ulica: 'Słoneczna', nrDomu: '12', nrLokalu: '4', kod: '00-950', miejscowosc: 'Łódź' },
  telefon: '600100200',
  rachunekBankowy: '61 1090 1014 0000 0712 1981 2874',
};

export const TATA_DANE: DaneOsobowe = {
  imie: 'Piotr',
  nazwisko: 'Przykładowy',
  pesel: '92030354321',
  dataUrodzenia: '1992-03-03',
};

/** Dane dziecka do wniosków (`Dziecko.dane`). PESEL fikcyjny. */
export const DZIECKO_DANE: NonNullable<Dziecko['dane']> = {
  imie: 'Jan',
  nazwisko: 'Przykładowy',
  pesel: '26320100015',
  miejsceUrodzenia: 'Łódź',
};

export const DZIECKO2_DANE: NonNullable<Dziecko['dane']> = {
  imie: 'Zofia Maria',
  nazwisko: 'Przykładowa',
  miejsceUrodzenia: 'Łódź',
};

/** Przykład wzorcowy (mama na etacie, poród 1.12.2026) – kopia, żeby testy mogły ją zmieniać. */
export function wzorzec(): ZapytanieWniosek {
  return { rodzina: structuredClone(PRZYKLAD_RODZINA), plan: structuredClone(PRZYKLAD_PLAN), osobaId: 'mama' };
}

/**
 * Para rodziców: mama zaczyna urlop macierzyński 2 tygodnie przed przewidywanym porodem (1.12.2026),
 * potem rodzicielski; tata bierze ojcowski i 9 tygodni rodzicielskiego.
 */
export function rodzinaPara(): Rodzina {
  const r = structuredClone(PRZYKLAD_RODZINA);
  r.osoby[0].dane = structuredClone(MAMA_DANE);
  r.osoby[0].tytuly[0].nipPlatnika = '5250001009';
  r.osoby.push({
    id: 'tata',
    rola: 'ojciec',
    dane: structuredClone(TATA_DANE),
    tytuly: [
      {
        id: 'etat-t',
        rodzaj: 'umowa_o_prace',
        chorobowe: 'obowiazkowe',
        od: '2020-01-01',
        wynagrodzenieMiesieczne: 9000,
        platnikPowyzej20: false,
        nazwaPlatnika: 'Mała Firma Kowalski',
        nipPlatnika: '123-456-32-18',
      },
    ],
  });
  return r;
}

export function planPara(): Plan {
  return {
    id: 'plan-para',
    nazwa: 'Mama i tata',
    wariant815: false,
    odcinki: [
      { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-11-17', do: '2027-04-05', tytulId: 'etat-1' },
      { id: 'o1', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-07', do: '2026-12-20', czescNr: 1, tytulId: 'etat-t' },
      { id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-06', do: '2027-09-30', czescNr: 1, tytulId: 'etat-1' },
      { id: 'r2', osobaId: 'tata', typ: 'rodzicielski', od: '2027-10-01', do: '2027-12-02', czescNr: 2, tytulId: 'etat-t' },
    ],
  };
}

export function para(osobaId: 'mama' | 'tata' = 'mama', odcinekId?: string): ZapytanieWniosek {
  return { rodzina: rodzinaPara(), plan: planPara(), osobaId, odcinekId };
}
