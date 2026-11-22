/**
 * Wspólne narzędzia modułu wniosków (tor D): wczytanie wzoru ZAM i fontu, zapis dat na formularzach,
 * błąd danych wniosku. Moduł działa tylko po stronie serwera (czyta pliki z dysku).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { czyPoprawna } from '../engine/daty';
import type { DataISO } from '../engine/types';

/** Złe albo niepełne dane do wniosku, uszkodzony plik itp. Trasa REST zwraca wtedy status 400. */
export class BladWniosku extends Error {}

// Ścieżki od katalogu projektu (literały w path.join, żeby Next.js dołączył pliki do funkcji serwerowej).
const SCIEZKA_WZORU_ZAM = path.join(process.cwd(), 'materialy', 'ZUS', 'wzory-formularzy', 'ZAM_edytowalny.pdf');
const SCIEZKA_FONTU = path.join(process.cwd(), 'src', 'forms', 'fonts', 'NotoSans-Regular.ttf');
const SCIEZKA_FONTU_POGRUBIONEGO = path.join(process.cwd(), 'src', 'forms', 'fonts', 'NotoSans-Bold.ttf');

const pamiec = new Map<string, Promise<Uint8Array>>();

function wczytaj(sciezka: string): Promise<Uint8Array> {
  let plik = pamiec.get(sciezka);
  if (!plik) {
    plik = readFile(sciezka).then((b) => new Uint8Array(b));
    plik.catch(() => pamiec.delete(sciezka));
    pamiec.set(sciezka, plik);
  }
  return plik;
}

/** Edytowalny wzór ZAM ze strony ZUS (wersja po 24.10.2026). */
export const wczytajWzorZAM = () => wczytaj(SCIEZKA_WZORU_ZAM);
/** Noto Sans (SIL OFL 1.1) – ma polskie znaki, których nie mają standardowe fonty PDF. */
export const wczytajFont = () => wczytaj(SCIEZKA_FONTU);
export const wczytajFontPogrubiony = () => wczytaj(SCIEZKA_FONTU_POGRUBIONEGO);

function sprawdzDate(d: DataISO): void {
  if (!czyPoprawna(d)) throw new BladWniosku(`Niepoprawna data: "${d}" (oczekiwano RRRR-MM-DD).`);
}

/** '2026-12-01' → '01.12.2026' (zapis dla człowieka). */
export function dataPL(d: DataISO): string {
  sprawdzDate(d);
  return `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
}

/** '2026-12-01' → '01122026' (pola ZAM z kratkami „dd / mm / rrrr”). */
export function dataWKratkach(d: DataISO): string {
  sprawdzDate(d);
  return `${d.slice(8, 10)}${d.slice(5, 7)}${d.slice(0, 4)}`;
}

/** '01122026' → '2026-12-01'; niepoprawna data → undefined. */
export function dataZKratek(s: string): DataISO | undefined {
  const m = /^(\d{2})(\d{2})(\d{4})$/.exec(s.trim());
  if (!m) return undefined;
  const d = `${m[3]}-${m[2]}-${m[1]}`;
  return czyPoprawna(d) ? d : undefined;
}

/** Wszystkie poprawne daty „dd.mm.rrrr” (albo z „-” lub „/”) w tekście wpisanym ręcznie → RRRR-MM-DD, po kolei. */
export function datyWTekscie(s: string): DataISO[] {
  const daty: DataISO[] = [];
  for (const m of s.matchAll(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\b/g)) {
    const d = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (czyPoprawna(d)) daty.push(d);
  }
  return daty;
}

/** Pierwsza data „dd.mm.rrrr” (albo z „-” lub „/”) w tekście wpisanym ręcznie → RRRR-MM-DD. */
export function pierwszaDataWTekscie(s: string): DataISO | undefined {
  return datyWTekscie(s)[0];
}

/** Okres domknięty: 'od 01.12.2026 do 19.04.2027'. */
export function okresPL(od: DataISO, do_: DataISO): string {
  return `od ${dataPL(od)} do ${dataPL(do_)}`;
}

/** Same cyfry (PESEL, NIP, rachunek); pusty wynik → undefined. */
export function tylkoCyfry(s: string | undefined): string | undefined {
  const cyfry = (s ?? '').replace(/\D/g, '');
  return cyfry || undefined;
}
