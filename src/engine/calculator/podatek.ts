/** Szacunkowa zaliczka płatnika na podatek dochodowy od zasiłków. Liczone na groszach (liczby całkowite). */
import type { Parametry } from '../types';

/**
 * Zaliczka płatnika od zasiłków z jednego tytułu w jednym miesiącu kalendarzowym. Pełne złote.
 * Płatnik liczy zaliczkę osobno od zasiłków, które sam wypłaca (zus.pl, „Podwyższenie kwoty zasiłku macierzyńskiego…”, przykład 4).
 *
 * `zPomniejszeniem`: płatnik uwzględnia kwotę zmniejszającą podatek tylko po oświadczeniu podatnika,
 * a przy kilku płatnikach łącznie nie więcej niż 1/12 (ustawa o PIT art. 31b ust. 1).
 */
export function zaliczkaMiesieczna(zasilekWMiesiacu: number, zPomniejszeniem: boolean, p: Parametry): number {
  const grosze = Math.max(0, Math.round(zasilekWMiesiacu * 100));
  // Ordynacja podatkowa art. 63 § 1: końcówki poniżej 50 gr pomijamy, od 50 gr podnosimy do pełnych złotych
  const podstawaZl = Math.floor((grosze + 50) / 100);
  // ustawa o PIT art. 34 ust. 3: zaliczka od zasiłków z ubezpieczenia społecznego; wynik znów do pełnych złotych (OP art. 63 § 1)
  const punktyBazowe = Math.round(p.podatek.zaliczkaProc * 100);
  const zaliczkaZl = Math.floor((podstawaZl * punktyBazowe + 5_000) / 10_000);
  if (!zPomniejszeniem) return zaliczkaZl;
  return Math.max(0, zaliczkaZl - p.podatek.kwotaZmniejszajacaMiesiecznie);
}
