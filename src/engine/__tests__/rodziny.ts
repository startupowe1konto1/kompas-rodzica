/**
 * Budowniczy rodzin do testów silnika (tor A, zadanie T0). Dane fikcyjne.
 * Domyślnie: poród przewidywany 2026-12-01, jedno dziecko, analiza 2026-11-21 – jak przykład wzorcowy EC-01.
 *
 *   const r = rodzina({ osoby: [mama(), tata()] });
 *   const r2 = rodzina({ osoby: [mama([zlecenie({ chorobowe: 'brak' })])], dzieci: [{}, {}] });
 */
import { parametryNaDzien, WERSJE_DOMYSLNE } from '../params';
import type {
  DataISO,
  Dziecko,
  Osoba,
  Parametry,
  Plan,
  Odcinek,
  Rodzina,
  TypZdarzenia,
  TytulUbezpieczenia,
} from '../types';

export const POROD = '2026-12-01';

/** Parametry obowiązujące w danym dniu (domyślnie w dniu porodu wzorcowego). */
export function P(data: DataISO = POROD): Parametry {
  return parametryNaDzien(data, WERSJE_DOMYSLNE);
}

export function etat(t: Partial<TytulUbezpieczenia> = {}): TytulUbezpieczenia {
  return {
    id: 'etat-1',
    rodzaj: 'umowa_o_prace',
    chorobowe: 'obowiazkowe',
    od: '2023-03-01',
    wymiarEtatu: 1,
    wynagrodzenieMiesieczne: 8000,
    platnikPowyzej20: true,
    ...t,
  };
}

export function zlecenie(t: Partial<TytulUbezpieczenia> = {}): TytulUbezpieczenia {
  return {
    id: 'zlecenie-1',
    rodzaj: 'zlecenie',
    chorobowe: 'dobrowolne',
    od: '2024-01-01',
    wynagrodzenieMiesieczne: 5000,
    ...t,
  };
}

export function dzialalnosc(t: Partial<TytulUbezpieczenia> = {}): TytulUbezpieczenia {
  return {
    id: 'dzialalnosc-1',
    rodzaj: 'dzialalnosc',
    chorobowe: 'dobrowolne',
    od: '2022-01-01',
    zadeklarowanaPodstawa: 5652,
    ...t,
  };
}

export function mama(tytuly: TytulUbezpieczenia[] = [etat()], o: Partial<Osoba> = {}): Osoba {
  return { id: 'mama', rola: 'matka', tytuly, ...o };
}

export function tata(tytuly: TytulUbezpieczenia[] = [etat({ id: 'etat-taty', wynagrodzenieMiesieczne: 6000 })], o: Partial<Osoba> = {}): Osoba {
  return { id: 'tata', rola: 'ojciec', tytuly, ...o };
}

export interface OpcjeRodziny {
  osoby?: Osoba[];
  data?: DataISO;
  typ?: TypZdarzenia;
  przewidywana?: boolean;
  dzieci?: Dziecko[];
  dataAnalizy?: DataISO;
  dataUprawomocnienia?: DataISO;
}

export function rodzina(o: OpcjeRodziny = {}): Rodzina {
  return {
    osoby: o.osoby ?? [mama()],
    zdarzenie: {
      typ: o.typ ?? 'porod',
      data: o.data ?? POROD,
      przewidywana: o.przewidywana ?? true,
      dzieci: o.dzieci ?? [{}],
      ...(o.dataUprawomocnienia ? { dataUprawomocnienia: o.dataUprawomocnienia } : {}),
    },
    dataAnalizy: o.dataAnalizy ?? '2026-11-21',
  };
}

/** Odcinek planu do testów; `id` domyślnie `${osobaId}-${typ}-1`. */
export function odcinek(o: Omit<Odcinek, 'id'> & { id?: string }): Odcinek {
  return { id: o.id ?? `${o.osobaId}-${o.typ}-1`, ...o };
}

export function plan(odcinki: Odcinek[], p: Partial<Plan> = {}): Plan {
  return { id: 'test', nazwa: 'Plan testowy', wariant815: false, odcinki, ...p };
}

/** Głęboka kopia do sprawdzania, że funkcja nie zmieniła wejścia. */
export function kopia<T>(x: T): T {
  return structuredClone(x);
}
