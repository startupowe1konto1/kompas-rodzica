/**
 * Pomocnicze formaty tekstów dla rodzica (zadanie A2). Bez zegara i bez ustawień regionalnych systemu.
 */
import { doGrosza } from '../pieniadze';
import type { DataISO, Parametry } from '../types';

const MIESIACE = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];

/** '2026-12-11' → '11 grudnia 2026'. */
export function dataSlownie(d: DataISO): string {
  return `${+d.slice(8, 10)} ${MIESIACE[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
}

/** 1000 → '1000 zł', 48.06 → '48,06 zł'. */
export function zlote(kwota: number): string {
  const k = doGrosza(kwota);
  return Number.isInteger(k) ? `${k} zł` : `${k.toFixed(2).replace('.', ',')} zł`;
}

export const DO_POTWIERDZENIA = 'To wymaga potwierdzenia w ZUS.';

/**
 * Przykład „członka najbliższej rodziny”, który może przejąć urlop macierzyński (KP art. 180 § 6–17; UZ art. 29 ust. 5).
 * Odpowiedź ZUS na stoisku 21.11, pytanie nr 21: w praktyce głównie dziadkowie albo rodzeństwo mamy – bez pewności,
 * więc teksty z tym przykładem nadal mają dopisek „wymaga potwierdzenia w ZUS”.
 */
export const PRZYKLAD_CZLONKA_RODZINY = 'np. dziadkowie albo rodzeństwo mamy';

/** Alternatywa, gdy zasiłek macierzyński nie przysługuje (UZ art. 29; świadczenie z ustawy o świadczeniach rodzinnych). */
export function alternatywaSwiadczenieRodzicielskie(p: Parametry): string {
  return (
    `Można złożyć w gminie albo przez internet wniosek o świadczenie rodzicielskie – ${zlote(p.kwoty.swiadczenieRodzicielskie)} ` +
    'miesięcznie. Przysługuje ono także bez ubezpieczenia chorobowego.'
  );
}

// ───────────────────────── Gramatyka ─────────────────────────

/** Liczby 2–4, 22–24 … (bez 12–14) łączą się z formą „kilka” (2 tygodnie, 3 miesiące). */
function kilka(n: number): boolean {
  const j = n % 10;
  const d = n % 100;
  return Number.isInteger(n) && j >= 2 && j <= 4 && (d < 12 || d > 14);
}

function odmiana(n: number, jeden: string, kilkaForma: string, wiele: string): string {
  if (n === 1) return `${n} ${jeden}`;
  return `${n} ${kilka(n) ? kilkaForma : wiele}`;
}

/** Orzeczenie zgodne z liczebnikiem: orzeczenie(3, 'przepadnie', 'przepadną') → 'przepadną', orzeczenie(5, …) → 'przepadnie'. */
export const orzeczenie = (n: number, pojedyncza: string, mnoga: string) => (kilka(n) ? mnoga : pojedyncza);

/** Orzeczenie zgodne z liczebnikiem: „przysługuje 1 tydzień”, „przysługują 3 tygodnie”, „przysługuje 5 tygodni”. */
export const przysluguje = (n: number) => orzeczenie(n, 'przysługuje', 'przysługują');

/** 2 → '2 tygodnie', 9 → '9 tygodni', 1 → '1 tydzień'. */
export const tygodni = (n: number) => odmiana(n, 'tydzień', 'tygodnie', 'tygodni');
/** Dopełniacz: 82 → '82 tygodni', 1 → '1 tygodnia' („do 82 tygodni”, „z 41 tygodni”). */
export const tygodniDop = (n: number) => `${n} ${n === 1 ? 'tygodnia' : 'tygodni'}`;
/** Miejscownik: 14 → '14 tygodniach', 1 → '1 tygodniu' („po 14 tygodniach”). */
export const tygodniach = (n: number) => `${n} ${n === 1 ? 'tygodniu' : 'tygodniach'}`;
/** 7 → '7 dni', 1 → '1 dzień'. */
export const dni = (n: number) => odmiana(n, 'dzień', 'dni', 'dni');
/** 3 → '3 miesiące', 6 → '6 miesięcy'. */
export const miesiecy = (n: number) => odmiana(n, 'miesiąc', 'miesiące', 'miesięcy');
/** 6 → '6 lat'. */
export const lat = (n: number) => odmiana(n, 'rok', 'lata', 'lat');

/** 81.5 → '81,5%', 70 → '70%'. */
export function proc(n: number): string {
  return `${String(n).replace('.', ',')}%`;
}
