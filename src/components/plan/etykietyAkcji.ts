/** Czyste pomocnicze panelu akcji: podpisy wymiaru pracy i odczyt wybranej opcji. */

const NAZWY_ULAMKOW: Record<number, string> = {
  1: '1/8',
  2: '1/4',
  3: '3/8',
  4: '1/2',
  5: '5/8',
  6: '3/4',
  7: '7/8',
};

/** 0.125 → „1/8 etatu”, 0.25 → „1/4 etatu”, 0.5 → „1/2 etatu”, 1 → „pełny etat”. */
export function etykietaWymiaru(wymiar: number): string {
  const osmych = Math.round(wymiar * 8);
  if (osmych >= 8) return 'pełny etat';
  const ulamek = NAZWY_ULAMKOW[osmych];
  return ulamek ? `${ulamek} etatu` : `${Math.round(wymiar * 100)}% etatu`;
}

/** Wartość opcji w polu wyboru (tekst). */
export function wartoscWymiaru(wymiar: number): string {
  return String(wymiar);
}

/** Odczyt wybranej opcji z powrotem na liczbę; null, gdy nic nie wybrano. */
export function odczytajWymiar(wartosc: string | null): number | null {
  if (wartosc === null) return null;
  const n = Number(wartosc);
  return Number.isFinite(n) && n > 0 ? n : null;
}
