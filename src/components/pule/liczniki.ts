/** Liczniki pul w tygodniach, do pokazania rodzicowi. Silnik liczy w dniach, UI w tygodniach. */
import type { WykorzystaniePuli } from '../../engine/types';

export interface LicznikPuliDane {
  pula: WykorzystaniePuli['pula'];
  osobaId?: string;
  wykorzystaneTyg: number;
  dostepneTyg: number;
  przepadnieTyg: number;
  wolneTyg: number;
}

const KOLEJNOSC_PUL: WykorzystaniePuli['pula'][] = [
  'macierzynski',
  'uzupelniajacy',
  'rodzicielski',
  'rodzicielski_nieprzenoszalne',
  'ojcowski',
];

/** Dni → tygodnie z jednym miejscem po przecinku. */
export function naTygodnie(dni: number): number {
  return Math.round((dni / 7 + Number.EPSILON) * 10) / 10;
}

export function licznikiPul(w: WykorzystaniePuli[]): LicznikPuliDane[] {
  return w
    .map((x, i) => ({ x, i }))
    .sort((a, b) => KOLEJNOSC_PUL.indexOf(a.x.pula) - KOLEJNOSC_PUL.indexOf(b.x.pula) || a.i - b.i)
    .map(({ x }) => {
      const przepadnie = x.przepadnieDni ?? 0;
      return {
        pula: x.pula,
        osobaId: x.osobaId,
        wykorzystaneTyg: naTygodnie(x.wykorzystaneDni),
        dostepneTyg: naTygodnie(x.dostepneDni),
        przepadnieTyg: naTygodnie(przepadnie),
        wolneTyg: naTygodnie(Math.max(0, x.dostepneDni - x.wykorzystaneDni - przepadnie)),
      };
    });
}
