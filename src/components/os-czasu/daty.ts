/**
 * Daty dla osi czasu: napisy 'RRRR-MM-DD', liczone wyłącznie w UTC (zmiana czasu nie przesuwa dnia).
 * Kopia lokalna, bo UI nie importuje funkcji silnika (`src/engine/daty.ts`).
 */
import type { DataISO } from '../../engine/types';

const DZIEN_MS = 86_400_000;
const WZOR = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface CzesciDaty {
  rok: number;
  /** 1–12 */
  miesiac: number;
  dzien: number;
}

export function czyPrzestepny(rok: number): boolean {
  return (rok % 4 === 0 && rok % 100 !== 0) || rok % 400 === 0;
}

/** Liczba dni w miesiącu (miesiąc 1–12). */
export function dniWMiesiacu(rok: number, miesiac: number): number {
  return new Date(Date.UTC(rok, miesiac, 0)).getUTCDate();
}

export function parsujDate(d: DataISO): CzesciDaty {
  const m = WZOR.exec(d);
  if (!m) throw new Error(`Niepoprawna data: "${d}" (oczekiwano RRRR-MM-DD)`);
  const rok = +m[1];
  const miesiac = +m[2];
  const dzien = +m[3];
  if (miesiac < 1 || miesiac > 12 || dzien < 1 || dzien > dniWMiesiacu(rok, miesiac)) {
    throw new Error(`Niepoprawna data: "${d}"`);
  }
  return { rok, miesiac, dzien };
}

const dwie = (n: number) => String(n).padStart(2, '0');

export function formatujDate(rok: number, miesiac: number, dzien: number): DataISO {
  return `${String(rok).padStart(4, '0')}-${dwie(miesiac)}-${dwie(dzien)}`;
}

function naMs(d: DataISO): number {
  const { rok, miesiac, dzien } = parsujDate(d);
  return Date.UTC(rok, miesiac - 1, dzien);
}

function zMs(ms: number): DataISO {
  const t = new Date(ms);
  return formatujDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Ile dni od `a` do `b` (b − a). Ujemne, gdy `b` jest wcześniej. */
export function dniMiedzy(a: DataISO, b: DataISO): number {
  return Math.round((naMs(b) - naMs(a)) / DZIEN_MS);
}

export function dodajDni(d: DataISO, n: number): DataISO {
  return zMs(naMs(d) + n * DZIEN_MS);
}

/** Dodaje miesiące; gdy docelowy miesiąc jest krótszy, zwraca jego ostatni dzień (29.02.2028 + 12 mies. = 28.02.2029). */
export function dodajMiesiace(d: DataISO, n: number): DataISO {
  const { rok, miesiac, dzien } = parsujDate(d);
  const indeks = rok * 12 + (miesiac - 1) + n;
  const nowyRok = Math.floor(indeks / 12);
  const nowyMiesiac = indeks - nowyRok * 12 + 1;
  return formatujDate(nowyRok, nowyMiesiac, Math.min(dzien, dniWMiesiacu(nowyRok, nowyMiesiac)));
}

export function poczatekMiesiaca(d: DataISO): DataISO {
  const { rok, miesiac } = parsujDate(d);
  return formatujDate(rok, miesiac, 1);
}

export function koniecRoku(rok: number): DataISO {
  return formatujDate(rok, 12, 31);
}

/** Napisy 'RRRR-MM-DD' porównują się leksykograficznie tak samo jak daty. */
export function wczesniejsza(a: DataISO, b: DataISO): DataISO {
  return a <= b ? a : b;
}

export function pozniejsza(a: DataISO, b: DataISO): DataISO {
  return a >= b ? a : b;
}
