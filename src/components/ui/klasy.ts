/** Skleja klasy CSS, pomija puste i fałszywe wartości. */
export function polacz(...klasy: (string | false | null | undefined)[]): string {
  return klasy.filter(Boolean).join(' ');
}

export type PoziomNaglowka = 2 | 3 | 4;

/** Klasy nagłówka H3 z design.md (18 px telefon, 20 px komputer, 700). */
export const KLASY_H3 = 'text-lg font-bold leading-snug lg:text-xl';
