/** Oznaczenia terminów względem „dziś” (rodzina.dataAnalizy), nigdy zegara systemowego. */
import type { DataISO, Termin } from '../../engine/types';
import { dniMiedzy } from '../os-czasu/daty';

export type StanTerminu = 'minal' | 'wkrotce' | 'pozniej';

export function oznaczTerminy(
  t: Termin[],
  dataAnalizy: DataISO,
  progDni = 14,
): (Termin & { stan: StanTerminu; zaIleDni: number })[] {
  return [...t]
    .sort((x, y) => (x.data < y.data ? -1 : x.data > y.data ? 1 : 0))
    .map((x) => {
      const zaIleDni = dniMiedzy(dataAnalizy, x.data);
      const stan: StanTerminu = zaIleDni < 0 ? 'minal' : zaIleDni <= progDni ? 'wkrotce' : 'pozniej';
      return { ...x, stan, zaIleDni };
    });
}
