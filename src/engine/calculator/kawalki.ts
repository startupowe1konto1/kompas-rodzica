/**
 * Okresy i kawałki odcinków: podział odcinka na kawałki o stałej stawce, scalanie okresów,
 * liczenie dni urlopu rodzicielskiego drugiego rodzica. Daty wyłącznie funkcjami z `daty.ts`.
 */
import { dodajDni, liczbaDni } from '../daty';
import type { DataISO, Osoba, TypOdcinka } from '../types';

export interface Okres {
  od: DataISO;
  do: DataISO;
}

/**
 * Dzieli odcinek [od, do] na kawałki. Każda granica to pierwszy dzień nowego kawałka;
 * liczą się tylko granice leżące po pierwszym dniu odcinka i nie później niż w jego ostatnim dniu.
 */
export function podzielNaKawalki(od: DataISO, do_: DataISO, granice: DataISO[]): (Okres & { dni: number })[] {
  const punkty = [...new Set(granice.filter((g) => g > od && g <= do_))].sort();
  const wynik: (Okres & { dni: number })[] = [];
  let start = od;
  for (const g of punkty) {
    const koniec = dodajDni(g, -1);
    wynik.push({ od: start, do: koniec, dni: liczbaDni(start, koniec) });
    start = g;
  }
  wynik.push({ od: start, do: do_, dni: liczbaDni(start, do_) });
  return wynik;
}

/** Okresy posortowane po dacie początku, z połączonymi okresami nachodzącymi na siebie i stykającymi się. */
export function scalOkresy(okresy: Okres[]): Okres[] {
  const posortowane = [...okresy].sort((a, b) => a.od.localeCompare(b.od));
  const wynik: Okres[] = [];
  for (const o of posortowane) {
    const ostatni = wynik[wynik.length - 1];
    if (ostatni !== undefined && o.od <= dodajDni(ostatni.do, 1)) {
      if (o.do > ostatni.do) ostatni.do = o.do;
    } else {
      wynik.push({ od: o.od, do: o.do });
    }
  }
  return wynik;
}

/**
 * Pierwszy dzień po wykorzystaniu `limitDni` dni z okresów, liczonych chronologicznie (dzień wspólny dla kilku
 * okresów, np. dwóch tytułów ubezpieczenia, liczy się raz); undefined, gdy okresy nie przekraczają limitu.
 */
export function dzienPoLimicie(okresy: Okres[], limitDni: number): DataISO | undefined {
  let pozostalo = limitDni;
  for (const o of scalOkresy(okresy)) {
    const dni = liczbaDni(o.od, o.do);
    if (dni > pozostalo) return dodajDni(o.od, pozostalo);
    pozostalo -= dni;
  }
  return undefined;
}

/**
 * Rodzic, którego urlop rodzicielski NIE jest częścią „drugiego rodzica” z KP art. 182¹a § 4:
 * osoba z najwcześniejszym odcinkiem urlopu macierzyńskiego albo na warunkach macierzyńskiego
 * (gdy tata przejmuje część macierzyńskiego, wcześniej zaczyna go mama), a gdy takiego odcinka nie ma –
 * osoba o roli matki. Undefined, gdy nie da się wskazać żadnej z nich.
 */
export function pierwszyRodzic(odcinki: { osobaId: string; typ: TypOdcinka; od: DataISO }[], osoby: Osoba[]): string | undefined {
  const macierzynskie = odcinki
    .filter((o) => o.typ === 'macierzynski' || o.typ === 'na_warunkach_macierzynskiego')
    .reduce<{ osobaId: string; od: DataISO } | undefined>((naj, o) => (naj === undefined || o.od < naj.od ? o : naj), undefined);
  return macierzynskie?.osobaId ?? osoby.find((o) => o.rola === 'matka')?.id;
}
