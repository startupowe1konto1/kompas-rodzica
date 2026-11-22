/**
 * Skala okna: data ↔ ułamek szerokości (0 = początek pierwszego dnia okna, 1 = koniec ostatniego).
 * Dzień zajmuje przedział [d, d+1), więc odcinek od–do ma szerokość (do − od + 1) dni.
 */
import type { DataISO } from '../../engine/types';
import { dniMiedzy, dodajDni } from './daty';
import type { Okno } from './zakres';

export interface Przyciecie {
  lewy: boolean;
  prawy: boolean;
}

export interface PozycjaOdcinka {
  /** Ułamek 0..1 od lewej krawędzi okna. */
  start: number;
  /** Ułamek 0..1 szerokości okna. */
  szerokosc: number;
  /** Czy odcinek wychodzi poza okno z lewej / prawej strony. */
  przyciety: Przyciecie;
}

export interface Skala {
  okno: Okno;
  /** Liczba dni w oknie. */
  dni: number;
  /** Pozycja początku dnia; poza oknem daje wartości < 0 albo > 1 (bez przycinania). */
  ulamek(data: DataISO): number;
  /** Dzień pod danym ułamkiem, ograniczony do okna. */
  data(ulamek: number): DataISO;
  /** Pozycja odcinka przycięta do okna albo null, gdy odcinek jest całkiem poza oknem. */
  przytnij(od: DataISO, do_: DataISO): PozycjaOdcinka | null;
}

export function skala(okno: Okno): Skala {
  const dni = dniMiedzy(okno.od, okno.do) + 1;
  const ulamek = (data: DataISO) => dniMiedzy(okno.od, data) / dni;
  return {
    okno,
    dni,
    ulamek,
    data(u) {
      const indeks = Math.min(dni - 1, Math.max(0, Math.floor(u * dni)));
      return dodajDni(okno.od, indeks);
    },
    przytnij(od, do_) {
      if (do_ < okno.od || od > okno.do) return null;
      const lewy = od < okno.od;
      const prawy = do_ > okno.do;
      const start = lewy ? 0 : ulamek(od);
      const koniec = prawy ? 1 : ulamek(dodajDni(do_, 1));
      return { start, szerokosc: koniec - start, przyciety: { lewy, prawy } };
    },
  };
}
