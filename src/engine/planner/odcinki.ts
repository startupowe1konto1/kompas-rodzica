/**
 * Wspólne pomocniki planu – TOR A (integrator, zadanie T0). Używają ich A4, A5 i A6.
 * Decyzje D9 (części urlopu) i D11 (identyfikatory) w docs/superpowers/plans/2026-11-21-tor-a.md.
 */
import { dodajDni, pozniejsza } from '../daty';
import type { DataISO, Odcinek, Plan, TypOdcinka } from '../types';

export interface Okres {
  od: DataISO;
  do: DataISO;
}

/**
 * Części urlopu osoby danego typu: odcinki tej osoby i typu posortowane po dacie, a odcinki stykające się
 * (następny zaczyna się dzień po końcu poprzedniego) albo nachodzące na siebie sklejone w jedną część.
 * Liczba części = liczba wniosków [KP art. 182¹d § 2].
 */
export function czesciOsoby(plan: Plan, osobaId: string, typ: TypOdcinka): Okres[] {
  const odcinki = plan.odcinki
    .filter((o) => o.osobaId === osobaId && o.typ === typ)
    .map((o) => ({ od: o.od, do: o.do }))
    .sort((a, b) => a.od.localeCompare(b.od) || a.do.localeCompare(b.do));
  const czesci: Okres[] = [];
  for (const o of odcinki) {
    const ostatnia = czesci[czesci.length - 1];
    if (ostatnia && o.od <= dodajDni(ostatnia.do, 1)) {
      ostatnia.do = pozniejsza(ostatnia.do, o.do);
    } else {
      czesci.push({ ...o });
    }
  }
  return czesci;
}

/** Typy odcinków, które mają numer części (`czescNr`). */
const TYPY_Z_CZESCIAMI: TypOdcinka[] = ['rodzicielski', 'ojcowski'];

/** Nowy plan z `czescNr` nadanym według części (D9). Odcinki innych typów nie mają `czescNr`. Nie zmienia wejścia. */
export function przeliczCzesci(plan: Plan): Plan {
  const odcinki: Odcinek[] = plan.odcinki.map((o) => {
    const kopia: Odcinek = { ...o };
    delete kopia.czescNr;
    if (!TYPY_Z_CZESCIAMI.includes(o.typ)) return kopia;
    const czesci = czesciOsoby(plan, o.osobaId, o.typ);
    const nr = czesci.findIndex((c) => c.od <= o.od && o.od <= c.do);
    return { ...kopia, czescNr: nr + 1 };
  });
  return { ...plan, odcinki };
}

/** Deterministyczny identyfikator nowego odcinka: `${osobaId}-${typ}-${n}`, n = najmniejsza wolna liczba ≥ 1 (D11). */
export function nowyIdOdcinka(plan: Plan, osobaId: string, typ: TypOdcinka): string {
  const zajete = new Set(plan.odcinki.map((o) => o.id));
  let n = 1;
  while (zajete.has(`${osobaId}-${typ}-${n}`)) n++;
  return `${osobaId}-${typ}-${n}`;
}
