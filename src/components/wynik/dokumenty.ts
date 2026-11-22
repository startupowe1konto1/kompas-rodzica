/** Grupowanie dokumentów według statusu: teraz, później, po terminie. */
import type { Dokument } from '../../engine/types';

export interface GrupyDokumentow {
  teraz: Dokument[];
  pozniej: Dokument[];
  poTerminie: Dokument[];
}

/** Po terminie rosnąco; dokumenty bez terminu na końcu (sort stabilny). */
function poTerminie(a: Dokument, b: Dokument): number {
  if (a.termin === b.termin) return 0;
  if (!a.termin) return 1;
  if (!b.termin) return -1;
  return a.termin < b.termin ? -1 : 1;
}

export function grupujDokumenty(d: Dokument[]): GrupyDokumentow {
  const wybierz = (status: Dokument['status']) => d.filter((x) => x.status === status).sort(poTerminie);
  return { teraz: wybierz('teraz'), pozniej: wybierz('pozniej'), poTerminie: wybierz('po_terminie') };
}
