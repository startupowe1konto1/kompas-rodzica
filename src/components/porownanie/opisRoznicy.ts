/** Zdanie o różnicy między wariantami: „Wariant B daje o X więcej, ale mama wraca 6 tygodni później”. Czyste funkcje. */
import type { DataISO } from '../../engine/types';
import { formatujKwote } from '../format';
import { dniMiedzy } from '../os-czasu/daty';

/** Polska odmiana liczebnika: 1 tydzień, 2–4 tygodnie, 5+ tygodni (12–14 też „tygodni”). */
export function liczebnik(n: number, jeden: string, kilka: string, wiele: string): string {
  const k = Math.abs(n);
  if (k === 1) return `${k} ${jeden}`;
  const o10 = k % 10;
  const o100 = k % 100;
  return o10 >= 2 && o10 <= 4 && !(o100 >= 12 && o100 <= 14) ? `${k} ${kilka}` : `${k} ${wiele}`;
}

/** Różnica dni (B − A) jako „6 tygodni” (zaokrąglone do tygodni) albo „3 dni”, gdy mniej niż tydzień. */
export function opisCzasu(dni: number): string {
  const k = Math.abs(dni);
  if (k < 7) return liczebnik(k, 'dzień', 'dni', 'dni');
  return liczebnik(Math.round(k / 7), 'tydzień', 'tygodnie', 'tygodni');
}

export interface RoznicaPowrotu {
  osobaId: string;
  /** Dni późniejszego powrotu w B względem A (ujemne: B wraca wcześniej). */
  dni: number;
}

/** Osoby, które w obu wariantach mają datę powrotu, i różnią się nią o co najmniej dzień. */
export function roznicePowrotu(powrotA: Record<string, DataISO>, powrotB: Record<string, DataISO>): RoznicaPowrotu[] {
  const wynik: RoznicaPowrotu[] = [];
  for (const osobaId of Object.keys(powrotA)) {
    const b = powrotB[osobaId];
    if (b === undefined) continue;
    const dni = dniMiedzy(powrotA[osobaId], b);
    if (dni !== 0) wynik.push({ osobaId, dni });
  }
  return wynik;
}

export interface OpisRoznicy {
  /** Część o pieniądzach: „Wariant B daje o 1 704,92 zł więcej”. */
  pieniadze: string;
  /** Po jednym zdaniu na osobę: „mama wraca 6 tygodni później”. */
  powroty: string[];
  zdanie: string;
}

/**
 * `nazwy`: osobaId → słowo w zdaniu („mama”, „tata”). Spójnik: „ale”, gdy B daje więcej pieniędzy, a ktoś wraca później;
 * „za to”, gdy B daje mniej, a ktoś wraca wcześniej; w pozostałych przypadkach „i”.
 */
export function opiszRoznice(args: {
  roznica: number;
  powrotA: Record<string, DataISO>;
  powrotB: Record<string, DataISO>;
  nazwy: Record<string, string>;
}): OpisRoznicy {
  const { roznica, powrotA, powrotB, nazwy } = args;
  const roznicePowrotow = roznicePowrotu(powrotA, powrotB);
  const powroty = roznicePowrotow.map(
    (r) => `${nazwy[r.osobaId] ?? 'osoba'} wraca ${opisCzasu(r.dni)} ${r.dni > 0 ? 'później' : 'wcześniej'}`,
  );

  const pieniadze =
    roznica === 0
      ? 'Oba warianty dają tyle samo pieniędzy'
      : `Wariant B daje o ${formatujKwote(Math.abs(roznica))} ${roznica > 0 ? 'więcej' : 'mniej'}`;

  if (powroty.length === 0) {
    return {
      pieniadze,
      powroty,
      zdanie: roznica === 0 ? 'Oba warianty dają tyle samo pieniędzy i te same terminy powrotu do pracy.' : `${pieniadze}, a powroty do pracy wypadają w tych samych terminach.`,
    };
  }

  const pozniej = roznicePowrotow.some((r) => r.dni > 0);
  const wczesniej = roznicePowrotow.some((r) => r.dni < 0);
  const spojnik = roznica > 0 && pozniej ? 'ale' : roznica < 0 && wczesniej ? 'za to' : 'i';
  return { pieniadze, powroty, zdanie: `${pieniadze}, ${spojnik} ${powroty.join(' i ')}.` };
}
