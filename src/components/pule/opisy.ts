/** Teksty i liczby kresek dla liczników puli. Czyste funkcje, bez Reacta. */
import type { LicznikPuliDane } from './liczniki';

function tekst(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString('pl-PL', { maximumFractionDigits: 1 });
}

function formaDwaCztery(n: number): boolean {
  const d = n % 10;
  const s = n % 100;
  return Number.isInteger(n) && d >= 2 && d <= 4 && (s < 12 || s > 14);
}

/** „1 tydzień”, „3 tygodnie”, „12 tygodni”, „2,5 tygodnia”. */
export function tygodnie(n: number): string {
  if (!Number.isInteger(n)) return `${tekst(n)} tygodnia`;
  if (n === 1) return '1 tydzień';
  return `${n} ${formaDwaCztery(n) ? 'tygodnie' : 'tygodni'}`;
}

function dopelniaczTygodni(n: number): string {
  return n === 1 || !Number.isInteger(n) ? 'tygodnia' : 'tygodni';
}

/** Liczba kresek: jedna na tydzień, niepełny tydzień w górę (dokładna liczba jest w tekście). */
export function kreski(l: LicznikPuliDane): { wykorzystane: number; wolne: number; przepadnie: number; razem: number } {
  const razem = Math.max(Math.ceil(l.dostepneTyg - 1e-9), 0);
  const wykorzystane = Math.min(Math.max(Math.ceil(l.wykorzystaneTyg - 1e-9), 0), razem);
  const przepadnie = Math.min(Math.max(Math.ceil(l.przepadnieTyg - 1e-9), 0), razem - wykorzystane);
  return { wykorzystane, przepadnie, wolne: razem - wykorzystane - przepadnie, razem };
}

/** Zdanie nad paskiem: „Zostało 9 z 41 tygodni”; gdy nic nie zostaje: „Zaplanowane 32 z 41 tygodni”. */
export function opisLicznika(l: LicznikPuliDane): string {
  if (l.wolneTyg <= 0 && l.dostepneTyg > 0) {
    return `Zaplanowane ${tekst(l.wykorzystaneTyg)} z ${tekst(l.dostepneTyg)} ${dopelniaczTygodni(l.dostepneTyg)}`;
  }
  const zostalo = l.wolneTyg;
  const czasownik = zostalo === 1 ? 'Został' : formaDwaCztery(zostalo) ? 'Zostały' : 'Zostało';
  return `${czasownik} ${tekst(zostalo)} z ${tekst(l.dostepneTyg)} ${dopelniaczTygodni(l.dostepneTyg)}`;
}

/**
 * „9 tygodni przepadnie, jeśli nikt ich nie weźmie”; dla części tylko dla jednego rodzica
 * „… jeśli {kto} ich nie weźmie”. Pusty napis, gdy nic nie przepada.
 */
export function zdaniePrzepadnie(l: LicznikPuliDane, kto?: string): string {
  if (l.przepadnieTyg <= 0) return '';
  const n = l.przepadnieTyg;
  const czasownik = formaDwaCztery(n) ? 'przepadną' : 'przepadnie';
  const ich = n === 1 ? 'go' : 'ich';
  if (l.pula === 'rodzicielski_nieprzenoszalne' && kto) return `${tygodnie(n)} ${czasownik}, jeśli ${kto} ${ich} nie weźmie`;
  return `${tygodnie(n)} ${czasownik}, jeśli nikt ${ich} nie weźmie`;
}
