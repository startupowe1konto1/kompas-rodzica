// Logika panelu admina bez Reacta: lista pól wersji parametrów, odczyt i ustawianie wartości po ścieżce.
// Z silnika bierze tylko typy.
import type { Parametry } from '@/src/engine/types';

export const GRUPY = ['stawkiProc', 'wymiaryTyg', 'limity', 'terminyDni', 'kwoty', 'podatek'] as const;
export type Grupa = (typeof GRUPY)[number];

export interface PoleWersji {
  /** Ścieżka z kropkami, np. 'stawkiProc.rodzicielski' albo 'wymiaryTyg.macierzynski.0'. */
  sciezka: string;
  grupa: Grupa;
  wartosc: number;
}

function zbierz(grupa: Grupa, sciezka: string, wartosc: unknown, wynik: PoleWersji[]): void {
  if (typeof wartosc === 'number') {
    wynik.push({ sciezka, grupa, wartosc });
  } else if (Array.isArray(wartosc)) {
    wartosc.forEach((element, i) => zbierz(grupa, `${sciezka}.${i}`, element, wynik));
  } else if (typeof wartosc === 'object' && wartosc !== null) {
    for (const [klucz, element] of Object.entries(wartosc)) zbierz(grupa, `${sciezka}.${klucz}`, element, wynik);
  }
}

/** Wpis dla każdej liczby w grupach parametrów, w kolejności z definicji wersji. */
export function polaWersji(wersja: Parametry): PoleWersji[] {
  const wynik: PoleWersji[] = [];
  for (const grupa of GRUPY) zbierz(grupa, grupa, wersja[grupa], wynik);
  return wynik;
}

/** Wartość liczbowa pod ścieżką albo undefined, gdy ścieżki nie ma. */
export function odczytajWartosc(wersja: Parametry, sciezka: string): number | undefined {
  let biezacy: unknown = wersja;
  for (const klucz of sciezka.split('.')) {
    if (typeof biezacy !== 'object' || biezacy === null) return undefined;
    biezacy = (biezacy as Record<string, unknown>)[klucz];
  }
  return typeof biezacy === 'number' ? biezacy : undefined;
}

/** Nowa wersja z podmienioną wartością; oryginał zostaje bez zmian. Nieistniejąca ścieżka: bez zmian w kopii. */
export function ustawWartosc(wersja: Parametry, sciezka: string, wartosc: number): Parametry {
  const kopia = structuredClone(wersja);
  const klucze = sciezka.split('.');
  const ostatni = klucze.pop();
  let cel: unknown = kopia;
  for (const klucz of klucze) {
    if (typeof cel !== 'object' || cel === null) return kopia;
    cel = (cel as Record<string, unknown>)[klucz];
  }
  if (ostatni !== undefined && typeof cel === 'object' && cel !== null && ostatni in cel) {
    (cel as Record<string, unknown>)[ostatni] = wartosc;
  }
  return kopia;
}

/** Kopia wersji z nową datą obowiązywania. */
export function kopiaZNowaData(wersja: Parametry, obowiazujeOd: string): Parametry {
  return { ...structuredClone(wersja), obowiazujeOd };
}

/** Podstawa prawna parametru; dla elementu tablicy (np. `.3`) przepis z klucza całej tablicy. */
export function przepisDla(wersja: Parametry, sciezka: string): string | undefined {
  const przepisy = wersja.przepisy;
  if (!przepisy) return undefined;
  if (sciezka in przepisy) return przepisy[sciezka];
  const bezIndeksu = sciezka.replace(/\.\d+$/, '');
  return bezIndeksu !== sciezka ? przepisy[bezIndeksu] : undefined;
}
