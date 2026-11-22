/** Dane testowe osi czasu. Fikcyjne. */
import type { Osoba, Plan, Rodzina } from '../../../engine/types';

export const MAMA: Osoba = { id: 'mama', rola: 'matka', tytuly: [] };
export const TATA: Osoba = { id: 'tata', rola: 'ojciec', tytuly: [] };

export function rodzina(zmiany: Partial<Rodzina> = {}): Rodzina {
  return {
    dataAnalizy: '2026-11-21',
    osoby: [MAMA],
    zdarzenie: { typ: 'porod', data: '2026-12-01', przewidywana: true, dzieci: [{}] },
    ...zmiany,
  };
}

export function plan(odcinki: Plan['odcinki']): Plan {
  return { id: 'p', nazwa: 'test', wariant815: false, odcinki };
}
