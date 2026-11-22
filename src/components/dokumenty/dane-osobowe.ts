/**
 * Dane osobowe do wniosków: sprawdzanie pól i scalanie z profilem. Czyste funkcje, bez Reacta.
 * Dane zostają tylko w przeglądarce (profil w localStorage).
 */
import type { DaneOsobowe, Dziecko, Osoba } from '../../engine/types';

const WAGI_PESEL = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];

function cyfraKontrolna(dziesiec: string): number {
  const suma = WAGI_PESEL.reduce((s, w, i) => s + w * Number(dziesiec[i]), 0);
  return (10 - (suma % 10)) % 10;
}

/** PESEL: 11 cyfr i zgodna suma kontrolna (wagi 1-3-7-9). */
export function peselPoprawny(pesel: string): boolean {
  if (!/^\d{11}$/.test(pesel)) return false;
  return cyfraKontrolna(pesel) === Number(pesel[10]);
}

/** Dolicza ostatnią cyfrę kontrolną do 10 cyfr (do danych fikcyjnych w testach). */
export function peselZCyfraKontrolna(dziesiec: string): string {
  return `${dziesiec}${cyfraKontrolna(dziesiec)}`;
}

export const bezSpacji = (t: string) => t.replace(/[\s-]/g, '');

export function rachunekPoprawny(tekst: string): boolean {
  return /^\d{26}$/.test(bezSpacji(tekst));
}

export const kodPocztowyPoprawny = (kod: string) => /^\d{2}-\d{3}$/.test(kod.trim());

export type PoleDanych =
  'imie' | 'nazwisko' | 'pesel' | 'dataUrodzenia' | 'ulica' | 'nrDomu' | 'nrLokalu' | 'kod' | 'miejscowosc' | 'telefon' | 'rachunekBankowy';

export type WartosciFormularza = Record<PoleDanych, string>;
export type BledyFormularza = Partial<Record<PoleDanych, string>>;

export function wartosciZOsoby(o: Osoba): WartosciFormularza {
  const d = o.dane;
  return {
    imie: d?.imie ?? '',
    nazwisko: d?.nazwisko ?? '',
    pesel: d?.pesel ?? '',
    dataUrodzenia: d?.dataUrodzenia ?? '',
    ulica: d?.adres?.ulica ?? '',
    nrDomu: d?.adres?.nrDomu ?? '',
    nrLokalu: d?.adres?.nrLokalu ?? '',
    kod: d?.adres?.kod ?? '',
    miejscowosc: d?.adres?.miejscowosc ?? '',
    telefon: d?.telefon ?? '',
    rachunekBankowy: d?.rachunekBankowy ?? '',
  };
}

const WYMAGANE: PoleDanych[] = ['imie', 'nazwisko', 'pesel', 'dataUrodzenia', 'ulica', 'nrDomu', 'kod', 'miejscowosc'];

/** Czy brakuje któregoś z wymaganych pól (numer lokalu, telefon i rachunek są opcjonalne). */
export function brakujeDanych(o: Osoba): boolean {
  const w = wartosciZOsoby(o);
  return WYMAGANE.some((p) => !w[p].trim());
}

export function sprawdzFormularz(w: WartosciFormularza, dzis: string): BledyFormularza {
  const b: BledyFormularza = {};
  const wymagane: [PoleDanych, string][] = [
    ['imie', 'Proszę wpisać imię.'],
    ['nazwisko', 'Proszę wpisać nazwisko.'],
    ['ulica', 'Proszę wpisać ulicę.'],
    ['nrDomu', 'Proszę wpisać numer domu.'],
    ['miejscowosc', 'Proszę wpisać miejscowość.'],
  ];
  for (const [p, tekst] of wymagane) if (!w[p].trim()) b[p] = tekst;

  const pesel = bezSpacji(w.pesel);
  if (!pesel) b.pesel = 'Proszę wpisać PESEL.';
  else if (!/^\d{11}$/.test(pesel)) b.pesel = 'PESEL ma 11 cyfr.';
  else if (!peselPoprawny(pesel)) b.pesel = 'Ten PESEL wygląda na błędny. Proszę sprawdzić cyfry.';

  if (!w.dataUrodzenia) b.dataUrodzenia = 'Proszę wybrać datę urodzenia.';
  else if (w.dataUrodzenia > dzis) b.dataUrodzenia = 'Data urodzenia nie może być w przyszłości.';

  if (!w.kod.trim()) b.kod = 'Proszę wpisać kod pocztowy.';
  else if (!kodPocztowyPoprawny(w.kod)) b.kod = 'Proszę wpisać kod pocztowy w formacie 00-000.';

  if (w.telefon.trim() && bezSpacji(w.telefon).replace(/^\+/, '').length < 9) b.telefon = 'Numer telefonu jest za krótki.';

  if (w.rachunekBankowy.trim() && !rachunekPoprawny(w.rachunekBankowy)) {
    b.rachunekBankowy = 'Numer rachunku ma 26 cyfr. Spacje można zostawić.';
  }
  return b;
}

/** Scala wpisane wartości z istniejącymi danymi osoby (nie kasuje pól, których formularz nie zna). */
export function scalDane(stare: DaneOsobowe | undefined, w: WartosciFormularza): DaneOsobowe {
  const adres: NonNullable<DaneOsobowe['adres']> = {
    ...stare?.adres,
    ulica: w.ulica.trim(),
    nrDomu: w.nrDomu.trim(),
    kod: w.kod.trim(),
    miejscowosc: w.miejscowosc.trim(),
  };
  if (w.nrLokalu.trim()) adres.nrLokalu = w.nrLokalu.trim();
  else delete adres.nrLokalu;

  const wynik: DaneOsobowe = {
    ...stare,
    imie: w.imie.trim(),
    nazwisko: w.nazwisko.trim(),
    pesel: bezSpacji(w.pesel),
    dataUrodzenia: w.dataUrodzenia,
    adres,
  };
  if (w.telefon.trim()) wynik.telefon = w.telefon.trim();
  else delete wynik.telefon;
  if (w.rachunekBankowy.trim()) wynik.rachunekBankowy = bezSpacji(w.rachunekBankowy);
  else delete wynik.rachunekBankowy;
  return wynik;
}

/** Dane dziecka, o które pytają wnioski: ZAM (str. 3–4) i wnioski do pracodawcy. PESEL dziecka bierzemy z rejestru, nie pytamy. */
export type PoleDziecka = 'imie' | 'nazwisko' | 'miejsceUrodzenia';
export type WartosciDziecka = Record<PoleDziecka, string>;

export function wartosciZDziecka(d: Dziecko): WartosciDziecka {
  return {
    imie: d.dane?.imie ?? '',
    nazwisko: d.dane?.nazwisko ?? '',
    miejsceUrodzenia: d.dane?.miejsceUrodzenia ?? '',
  };
}

/** Scala wpisane dane z istniejącymi (zostawia PESEL); puste pola znikają, a gdy nic nie zostaje, wynik to `undefined`. */
export function scalDaneDziecka(stare: Dziecko['dane'], w: WartosciDziecka): Dziecko['dane'] {
  const wynik: NonNullable<Dziecko['dane']> = { ...stare };
  for (const p of ['imie', 'nazwisko', 'miejsceUrodzenia'] as const) {
    const v = w[p].trim();
    if (v) wynik[p] = v;
    else delete wynik[p];
  }
  return Object.keys(wynik).length > 0 ? wynik : undefined;
}
