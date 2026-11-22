/**
 * Szybki kalkulator: układanie wyniku z odpowiedzi API do pokazania. Czyste funkcje, tylko typy z silnika.
 * Kwoty i dni liczy silnik; tu tylko wybieramy, co pokazać, i zapisujemy w formie czytelnej dla rodzica.
 */
import type { Odcinek, Plan, Rodzina, WynikKwot } from '../../engine/types';

export interface OkresRodzica {
  odcinek: Odcinek;
  od: string;
  do: string;
  /** Tygodnie (dni z silnika ÷ 7). */
  tygodnie: number;
  stawkaProc: number;
  razem: number;
  miesiecznie: number;
}

export interface WierszRodzica {
  osobaId: string;
  rola: 'matka' | 'ojciec' | 'przyjmujacy' | 'inny_czlonek_rodziny';
  okresy: OkresRodzica[];
  razem: number;
}

/** Okresy z kwotą (urlopy i zasiłki; praca i przerwy nie mają kwoty), po datach, osobno dla każdego rodzica. */
export function wierszeRodzicow(rodzina: Rodzina, plan: Plan, kwoty: WynikKwot): WierszRodzica[] {
  return rodzina.osoby
    .map((o) => {
      const okresy = plan.odcinki
        .filter((x) => x.osobaId === o.id)
        .sort((a, b) => (a.od < b.od ? -1 : a.od > b.od ? 1 : 0))
        .flatMap((odcinek): OkresRodzica[] => {
          const k = kwoty.odcinki.find((x) => x.odcinekId === odcinek.id);
          if (!k) return [];
          return [
            {
              odcinek,
              od: odcinek.od,
              do: odcinek.do,
              tygodnie: k.dni / 7,
              stawkaProc: k.stawkaProc,
              razem: k.razem,
              miesiecznie: k.miesiecznie,
            },
          ];
        });
      return { osobaId: o.id, rola: o.rola, okresy, razem: kwoty.sumaOsoby[o.id] ?? 0 };
    })
    .filter((w) => w.okresy.length > 0);
}

/** Pierwszy pełny miesiąc mamy; gdy mama nie ma okresów z kwotą, pierwszy okres pierwszego rodzica, który je ma. */
export function kwotaMiesiecznaNaStart(wiersze: WierszRodzica[]): { wiersz: WierszRodzica; okres: OkresRodzica } | null {
  const wiersz = wiersze.find((w) => w.rola === 'matka') ?? wiersze[0];
  return wiersz ? { wiersz, okres: wiersz.okresy[0] } : null;
}

/** 20 → „20”, 14.5 → „14,5”. */
export function formatujTygodnie(t: number): string {
  const zaokraglone = Math.round(t * 10) / 10;
  return Number.isInteger(zaokraglone) ? String(zaokraglone) : String(zaokraglone).replace('.', ',');
}

/** 100 → „100%”, 81.5 → „81,5%”. */
export function formatujStawke(proc: number): string {
  return `${String(Math.round(proc * 10) / 10).replace('.', ',')}%`;
}
