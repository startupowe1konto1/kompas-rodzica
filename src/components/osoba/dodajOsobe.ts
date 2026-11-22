/**
 * Dodawanie i usuwanie osoby w rodzinie (tor C, C4). Czyste funkcje, bez Reacta i bez reguł prawnych:
 * ile osób i w jakich rolach może liczyć plan, rozstrzyga silnik.
 */
import type { PochodzenieDanej, Rodzina, Rola } from '../../engine/types';

/** Dopisuje osobę z pierwszym wolnym id „osoba-N” (N od liczby osób + 1), bez tytułów ubezpieczenia. Nie mutuje wejścia. */
export function dodajOsobe(rodzina: Rodzina, rola: Rola): { rodzina: Rodzina; indeks: number } {
  const zajete = new Set(rodzina.osoby.map((o) => o.id));
  let n = rodzina.osoby.length + 1;
  while (zajete.has(`osoba-${n}`)) n += 1;
  return {
    rodzina: { ...rodzina, osoby: [...rodzina.osoby, { id: `osoba-${n}`, rola, tytuly: [] }] },
    indeks: rodzina.osoby.length,
  };
}

/** Usuwa osobę o tym id. Pierwszej osoby (właściciela profilu) nie usuwamy: brak zmiany. */
export function usunOsobe(rodzina: Rodzina, id: string): Rodzina {
  const i = rodzina.osoby.findIndex((o) => o.id === id);
  if (i <= 0) return rodzina;
  return { ...rodzina, osoby: rodzina.osoby.filter((_, k) => k !== i) };
}

const PRZEDROSTEK_OSOBY = /^osoby\[(\d+)\]/;

/**
 * Ścieżki odpowiedzi (`osoby[2].tytuly[0].od`) po usunięciu osoby o indeksie `usuniety`:
 * ścieżki tej osoby znikają, ścieżki dalszych osób dostają numer o jeden mniejszy.
 */
export function przesunSciezki(sciezki: string[], usuniety: number): string[] {
  return sciezki.flatMap((s) => {
    const m = PRZEDROSTEK_OSOBY.exec(s);
    if (!m) return [s];
    const nr = Number(m[1]);
    if (nr === usuniety) return [];
    return [nr > usuniety ? s.replace(PRZEDROSTEK_OSOBY, `osoby[${nr - 1}]`) : s];
  });
}

export function przesunPochodzenie(p: PochodzenieDanej[], usuniety: number): PochodzenieDanej[] {
  return p.flatMap((x) => {
    const [nowa] = przesunSciezki([x.sciezka], usuniety);
    return nowa === undefined ? [] : [{ ...x, sciezka: nowa }];
  });
}
