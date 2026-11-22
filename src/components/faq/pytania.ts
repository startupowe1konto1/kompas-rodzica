/**
 * Najczęstsze pytania (FAQ) do strony /faq. Treść dopisuje Oskar (tor A) – pusta lista pokazuje
 * „Pytania w przygotowaniu”. Zasady tekstów jak w CLAUDE.md: prosty język, zwrot „per Pan/Pani” albo forma bezosobowa, pojęcia ZUS
 * (płatnik, „zasiłek macierzyński za okres urlopu rodzicielskiego”), przepis w polu `przepis`, nie w treści.
 * Odpowiedzi nie mogą obiecywać wyniku: gdy przepis nie rozstrzyga, piszemy „wymaga potwierdzenia w ZUS”.
 */
export interface PytanieFaq {
  /** Stały identyfikator, np. 'kiedy-wniosek-rodzicielski' (kotwica #id i klucz w testach). */
  id: string;
  pytanie: string;
  /** Akapity odpowiedzi. */
  odpowiedz: string[];
  /** Np. 'KP art. 182¹d § 1'. */
  przepis?: string;
}

export const PYTANIA_FAQ: PytanieFaq[] = [];
