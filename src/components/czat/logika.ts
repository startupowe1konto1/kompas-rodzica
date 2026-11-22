/** Logika panelu ZuSika bez Reacta – do testów. */
import type { Odcinek, Plan, WymianaCzatu } from '../../engine/types';

/** Tyle wcześniejszych wymian przyjmuje /api/chat (src/czat/rozmowa.ts, MAKS_HISTORIA). */
export const MAKS_HISTORIA = 10;

/** ZuSik jest na każdej stronie dla rodzica; nie ma go tylko w panelu admina. */
export function czyPokazacZusika(sciezka: string): boolean {
  return !(sciezka === '/admin' || sciezka.startsWith('/admin/'));
}

export function historiaDoWyslania(wymiany: WymianaCzatu[]): WymianaCzatu[] {
  return wymiany.slice(-MAKS_HISTORIA);
}

export type ZmianaOdcinka =
  | { rodzaj: 'nowy' | 'usuniety'; odcinek: Odcinek }
  | { rodzaj: 'zmieniony'; odcinek: Odcinek; przed: Odcinek };

const POLA: (keyof Odcinek)[] = ['osobaId', 'typ', 'od', 'do', 'wymiarPracy', 'tytulId'];
const rozne = (a: Odcinek, b: Odcinek) => POLA.some((p) => a[p] !== b[p]);

/** Co zmieni propozycja „co jeśli” względem obecnego planu (do karty w czacie). */
export function zmianyPlanu(przed: Plan, po: Plan): ZmianaOdcinka[] {
  const stare = new Map(przed.odcinki.map((o) => [o.id, o]));
  const nowe = new Set(po.odcinki.map((o) => o.id));
  const wynik: ZmianaOdcinka[] = [];
  for (const o of po.odcinki) {
    const s = stare.get(o.id);
    if (!s) wynik.push({ rodzaj: 'nowy', odcinek: o });
    else if (rozne(s, o)) wynik.push({ rodzaj: 'zmieniony', odcinek: o, przed: s });
  }
  for (const o of przed.odcinki) if (!nowe.has(o.id)) wynik.push({ rodzaj: 'usuniety', odcinek: o });
  return wynik;
}
