/** Porównanie dwóch wariantów planu: sumy, miesiące, powrót do pracy. Czyste funkcje, bez zegara. */
import type { DataISO, MiesiacISO, Plan, WynikKwot } from '../../engine/types';
import { dodajDni } from '../os-czasu/daty';
import { rozbicieRodziny } from '../kwoty/podsumowanie';

export interface Porownanie {
  sumaA: number;
  sumaB: number;
  roznica: number;
  naRekeA?: number;
  naRekeB?: number;
  powrotA: Record<string, DataISO>;
  powrotB: Record<string, DataISO>;
  miesiace: { miesiac: MiesiacISO; a: number; b: number }[];
}

const doGrosza = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

/** Dla każdej osoby: dzień po końcu jej ostatniego odcinka innego niż praca i przerwa. */
export function powrotDoPracy(plan: Plan): Record<string, DataISO> {
  const koniec: Record<string, DataISO> = {};
  for (const o of plan.odcinki) {
    if (o.typ === 'praca' || o.typ === 'przerwa') continue;
    if (koniec[o.osobaId] === undefined || o.do > koniec[o.osobaId]) koniec[o.osobaId] = o.do;
  }
  const wynik: Record<string, DataISO> = {};
  for (const [id, d] of Object.entries(koniec)) wynik[id] = dodajDni(d, 1);
  return wynik;
}

type Wariant = { plan: Plan; kwoty: WynikKwot };

export function porownajWarianty(a: Wariant, b: Wariant): Porownanie {
  const mA = new Map(rozbicieRodziny(a.kwoty).map((m) => [m.miesiac, m.razem]));
  const mB = new Map(rozbicieRodziny(b.kwoty).map((m) => [m.miesiac, m.razem]));
  const miesiace = [...new Set([...mA.keys(), ...mB.keys()])]
    .sort()
    .map((miesiac) => ({ miesiac, a: mA.get(miesiac) ?? 0, b: mB.get(miesiac) ?? 0 }));
  return {
    sumaA: a.kwoty.sumaRazem,
    sumaB: b.kwoty.sumaRazem,
    roznica: doGrosza(b.kwoty.sumaRazem - a.kwoty.sumaRazem),
    naRekeA: a.kwoty.naRekeRazem,
    naRekeB: b.kwoty.naRekeRazem,
    powrotA: powrotDoPracy(a.plan),
    powrotB: powrotDoPracy(b.plan),
    miesiace,
  };
}

/** Kopia planu z pierwszym wolnym id `${id}-kopia-N` i głęboko skopiowanymi odcinkami. */
export function kopiaPlanu(plan: Plan, zajeteId: string[]): Plan {
  let n = 1;
  while (zajeteId.includes(`${plan.id}-kopia-${n}`)) n++;
  return {
    ...plan,
    id: `${plan.id}-kopia-${n}`,
    nazwa: `${plan.nazwa} (kopia)`,
    odcinki: plan.odcinki.map((o) => ({ ...o })),
  };
}
