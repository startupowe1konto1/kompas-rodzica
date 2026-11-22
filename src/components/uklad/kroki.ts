/**
 * Kroki ścieżki rodzica pokazywane w pasku kroków (ZADANIA.md, C1).
 *
 * Trasy spoza listy:
 * - `/logowanie` należy do kroku „Start” (to wejście ze strony startowej),
 * - `/osoba` należy do kroku „Wynik” (dodanie osoby zaczyna się na ekranie wyniku),
 * - pozostałe (`/trudne-sytuacje`, `/inne-wsparcie`, `/wzornik`, `/admin` i każda inna)
 *   nie są częścią ścieżki, więc pasek kroków się na nich nie pokazuje.
 */

export interface Krok {
  sciezka: string;
  nazwa: string;
}

export const KROKI: readonly Krok[] = [
  { sciezka: '/', nazwa: 'Start' },
  { sciezka: '/sytuacja', nazwa: 'Moja sytuacja' },
  { sciezka: '/wynik', nazwa: 'Wynik' },
  { sciezka: '/plan', nazwa: 'Plan' },
  { sciezka: '/kalendarz', nazwa: 'Kalendarz' },
  { sciezka: '/dokumenty', nazwa: 'Dokumenty' },
];

/** Trasy pomocnicze przypisane do kroku ścieżki. */
const PRZYPISANE: Readonly<Record<string, string>> = {
  '/logowanie': '/',
  '/osoba': '/wynik',
};

function normalizuj(pathname: string): string {
  const bezParametrow = pathname.split(/[?#]/)[0] || '/';
  const bezUkosnika = bezParametrow.replace(/\/+$/, '');
  return bezUkosnika === '' ? '/' : bezUkosnika;
}

function pasuje(sciezka: string, wzorzec: string): boolean {
  if (wzorzec === '/') return sciezka === '/';
  return sciezka === wzorzec || sciezka.startsWith(`${wzorzec}/`);
}

/**
 * Indeks (od 0) kroku dla danej ścieżki albo `null`, gdy trasa nie należy do ścieżki
 * i pasek kroków ma się ukryć. Podstrony należą do kroku nadrzędnego (`/plan/porownanie` → Plan).
 */
export function aktualnyKrok(pathname: string | null | undefined): number | null {
  if (!pathname) return null;
  const sciezka = normalizuj(pathname);

  const indeks = KROKI.findIndex((k) => pasuje(sciezka, k.sciezka));
  if (indeks !== -1) return indeks;

  for (const [trasa, krok] of Object.entries(PRZYPISANE)) {
    if (pasuje(sciezka, trasa)) return KROKI.findIndex((k) => k.sciezka === krok);
  }
  return null;
}

/** Poprzedni i następny krok ścieżki dla przycisków „Wstecz” i „Dalej” pod treścią ekranu. */
export function sasiednieKroki(pathname: string | null | undefined): { poprzedni: Krok | null; nastepny: Krok | null } {
  const i = aktualnyKrok(pathname);
  if (i === null) return { poprzedni: null, nastepny: null };
  return { poprzedni: KROKI[i - 1] ?? null, nastepny: KROKI[i + 1] ?? null };
}
