/**
 * Ruch w ankiecie: krótki (150–200 ms), tylko przy zmianie treści, bez ruchu przy prefers-reduced-motion (design.md).
 * Animacje WAAPI (`element.animate`) nie podlegają globalnej regule CSS z `globals.css`, więc każda sprawdza `bezRuchu()`.
 */

/** Mocne ease-out na wejście treści: szybki start, łagodny koniec. */
export const KRZYWA_WEJSCIA = 'cubic-bezier(0.23, 1, 0.32, 1)';

export function bezRuchu(): boolean {
  return typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
