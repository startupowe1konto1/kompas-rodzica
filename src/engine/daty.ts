/**
 * Daty bez godzin i stref czasowych. Wszystko liczymy w UTC, żeby zmiana czasu (DST)
 * nigdy nie przesunęła dnia. Wspólne dla całego silnika – nie używaj `new Date()` bezpośrednio.
 */
import type { DataISO, MiesiacISO } from './types';

const DZIEN_MS = 86_400_000;

export function czyPoprawna(d: string): d is DataISO {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const ms = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return naISO(ms) === d;
}

function naMs(d: DataISO): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`Niepoprawna data: "${d}" (oczekiwano RRRR-MM-DD)`);
  return Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
}

function naISO(ms: number): DataISO {
  return new Date(ms).toISOString().slice(0, 10);
}

export function dodajDni(d: DataISO, n: number): DataISO {
  return naISO(naMs(d) + n * DZIEN_MS);
}

export function dodajTygodnie(d: DataISO, n: number): DataISO {
  return dodajDni(d, n * 7);
}

/** Dodaje miesiące; gdy docelowy miesiąc jest krótszy, zwraca jego ostatni dzień (31.01 + 1 mies. = 28/29.02). */
export function dodajMiesiace(d: DataISO, n: number): DataISO {
  const r = +d.slice(0, 4);
  const m = +d.slice(5, 7) - 1 + n;
  const dzien = +d.slice(8, 10);
  const ostatni = new Date(Date.UTC(r, m + 1, 0)).getUTCDate();
  return naISO(Date.UTC(r, m, Math.min(dzien, ostatni)));
}

export function dodajLata(d: DataISO, n: number): DataISO {
  return dodajMiesiace(d, n * 12);
}

/** Ile dni od `a` do `b` (b − a). Ujemne, gdy b jest wcześniej. */
export function roznicaDni(a: DataISO, b: DataISO): number {
  return Math.round((naMs(b) - naMs(a)) / DZIEN_MS);
}

/** Liczba dni odcinka domkniętego z obu stron: 01.01–07.01 = 7. */
export function liczbaDni(od: DataISO, do_: DataISO): number {
  return roznicaDni(od, do_) + 1;
}

/** Ostatni dzień odcinka, który zaczyna się `od` i trwa `dni` dni. */
export function koniecOdcinka(od: DataISO, dni: number): DataISO {
  return dodajDni(od, dni - 1);
}

/** Ostatni dzień odcinka, który zaczyna się `od` i trwa `tyg` tygodni. */
export function koniecPoTygodniach(od: DataISO, tyg: number): DataISO {
  return koniecOdcinka(od, tyg * 7);
}

export function rok(d: DataISO): number {
  return +d.slice(0, 4);
}

export function miesiac(d: DataISO): MiesiacISO {
  return d.slice(0, 7);
}

export function koniecRoku(r: number): DataISO {
  return `${r}-12-31`;
}

export function pierwszyDzienMiesiaca(m: MiesiacISO): DataISO {
  return `${m}-01`;
}

export function dniWMiesiacu(m: MiesiacISO): number {
  return new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
}

export function ostatniDzienMiesiaca(m: MiesiacISO): DataISO {
  return `${m}-${String(dniWMiesiacu(m)).padStart(2, '0')}`;
}

/** Miesiąc przesunięty o `n` (ujemne = wstecz): ('2026-01', -1) → '2025-12'. */
export function przesunMiesiac(m: MiesiacISO, n: number): MiesiacISO {
  return dodajMiesiace(`${m}-01`, n).slice(0, 7);
}

export function wczesniejsza(a: DataISO, b: DataISO): DataISO {
  return a <= b ? a : b;
}

export function pozniejsza(a: DataISO, b: DataISO): DataISO {
  return a >= b ? a : b;
}

/** Czy dwa odcinki domknięte mają choć jeden wspólny dzień. */
export function nachodzaNaSiebie(a: { od: DataISO; do: DataISO }, b: { od: DataISO; do: DataISO }): boolean {
  return a.od <= b.do && b.od <= a.do;
}

/** Czy dzień `d` leży w odcinku [od, do]; brak `do` = odcinek bez końca. */
export function czyWOkresie(d: DataISO, od: DataISO, do_?: DataISO): boolean {
  return d >= od && (do_ === undefined || d <= do_);
}

/** Rozbija odcinek na kawałki po miesiącach kalendarzowych. */
export function rozbijNaMiesiace(od: DataISO, do_: DataISO): { miesiac: MiesiacISO; od: DataISO; do: DataISO; dni: number }[] {
  const wynik: { miesiac: MiesiacISO; od: DataISO; do: DataISO; dni: number }[] = [];
  let start = od;
  while (start <= do_) {
    const m = miesiac(start);
    const koniec = wczesniejsza(ostatniDzienMiesiaca(m), do_);
    wynik.push({ miesiac: m, od: start, do: koniec, dni: liczbaDni(start, koniec) });
    start = dodajDni(koniec, 1);
  }
  return wynik;
}
