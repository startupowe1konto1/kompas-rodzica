/** Okna wyboru na osi: kiedy da się skorzystać z danej możliwości (np. wniosek o wariant 81,5%). */
import type { DataISO, Mozliwosc } from '../../engine/types';
import { skala, type Przyciecie } from './skala';
import type { Okno } from './zakres';

export interface OknoWyboru {
  kod: Mozliwosc['kod'];
  mozliwosc: Mozliwosc;
  dostepna: boolean;
  od: DataISO;
  do: DataISO;
  /** Brak `doKiedy`: jeden dzień (rysowany jako znacznik). */
  punkt: boolean;
  start: number;
  szerokosc: number;
  przyciety: Przyciecie;
}

export function oknaWyboru(m: Mozliwosc[], okno: Okno): OknoWyboru[] {
  const s = skala(okno);
  const wynik: OknoWyboru[] = [];
  for (const mozliwosc of m) {
    if (!mozliwosc.odKiedy) continue;
    const od = mozliwosc.odKiedy;
    const do_ = mozliwosc.doKiedy ?? od;
    const p = s.przytnij(od, do_);
    if (!p) continue;
    wynik.push({
      kod: mozliwosc.kod,
      mozliwosc,
      dostepna: mozliwosc.dostepna,
      od,
      do: do_,
      punkt: !mozliwosc.doKiedy,
      start: p.start,
      szerokosc: p.szerokosc,
      przyciety: p.przyciety,
    });
  }
  return wynik.sort((a, b) => (a.od < b.od ? -1 : a.od > b.od ? 1 : 0));
}
