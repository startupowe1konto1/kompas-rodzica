/**
 * Parametry z datą obowiązywania. TOR B (Mateusz).
 *
 * `parametryNaDzien` jest czystą funkcją: dostaje listę wersji i datę. Skąd lista pochodzi
 * (plik domyślny + zmiany z panelu admina), decyduje warstwa serwera: `src/server/magazynParametrow.ts`.
 */
import type { DataISO, Parametry } from '../types';
import { WERSJE_DOMYSLNE } from './domyslne';

export { PARAMETRY_2026, PARAMETRY_2027, WERSJE_DOMYSLNE } from './domyslne';

/** Zwraca wersję parametrów obowiązującą w dniu `data` (ostatnią z `obowiazujeOd` ≤ data). */
export function parametryNaDzien(data: DataISO, wersje: Parametry[] = WERSJE_DOMYSLNE): Parametry {
  const posortowane = [...wersje].sort((a, b) => a.obowiazujeOd.localeCompare(b.obowiazujeOd));
  let wybrana = posortowane[0];
  for (const w of posortowane) {
    if (w.obowiazujeOd <= data) wybrana = w;
  }
  if (!wybrana) throw new Error('Brak parametrów – lista wersji jest pusta.');
  return wybrana;
}
