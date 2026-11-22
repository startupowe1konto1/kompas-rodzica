/**
 * Czysta logika kalendarza terminów: opis „ile dni zostało” do bloku na karcie terminu (K1)
 * i geometria widoku „Podejrzyj kalendarz” (K3). Daty tylko jako napisy RRRR-MM-DD (UTC).
 */
import type { DataISO, Plan, Termin } from '../../engine/types';
import { dodajDni, pozniejsza, wczesniejsza } from '../os-czasu/daty';
import type { Okno } from '../os-czasu/zakres';

export interface OpisDni {
  /** Duża liczba w bloku; null przy „Dziś”. */
  liczba: string | null;
  /** Słowo pod liczbą (albo samo „Dziś”). */
  jednostka: string;
  /** Pełne zdanie dla czytnika ekranu. */
  etykieta: string;
}

/** 1 dzień, 2 dni, 5 dni, 22 dni – w polszczyźnie „dzień” tylko przy jedynce. */
const jednostkaDni = (n: number) => (n === 1 ? 'dzień' : 'dni');

export function opisDni(zaIleDni: number): OpisDni {
  if (zaIleDni === 0) return { liczba: null, jednostka: 'Dziś', etykieta: 'Termin dziś' };
  const n = Math.abs(zaIleDni);
  if (zaIleDni < 0) {
    const jednostka = `${jednostkaDni(n)} temu`;
    return { liczba: String(n), jednostka, etykieta: `Termin minął ${n} ${jednostka}` };
  }
  return { liczba: String(n), jednostka: jednostkaDni(n), etykieta: `Za ${n} ${jednostkaDni(n)}` };
}

/** Stały klucz terminu: do podświetlenia w podglądzie i do zapamiętania rozwiniętych kart. */
export function kluczTerminu(t: Pick<Termin, 'data' | 'kod' | 'tytul'>): string {
  return `${t.data}-${t.kod ?? t.tytul}`;
}

const ZAPAS_DNI = 14;

/** Okno podglądu: dziś, wszystkie odcinki planu i wszystkie terminy, z zapasem po obu stronach. */
export function oknoKalendarza(terminy: Pick<Termin, 'data'>[], plan: Plan | null, dzis: DataISO): Okno {
  let od = dzis;
  let do_ = dzis;
  for (const d of [...terminy.map((t) => t.data), ...(plan?.odcinki ?? []).flatMap((o) => [o.od, o.do])]) {
    od = wczesniejsza(od, d);
    do_ = pozniejsza(do_, d);
  }
  return { od: dodajDni(od, -ZAPAS_DNI), do: dodajDni(do_, ZAPAS_DNI) };
}

/**
 * Pas (0, 1, 2…) dla każdego znacznika, żeby numerki terminów w tym samym tygodniu nie nachodziły na siebie.
 * `pozycje` rosnąco (ułamki okna), `prog` – najmniejszy odstęp w tym samym pasie.
 */
export function pasyZnacznikow(pozycje: number[], prog: number): number[] {
  const koniecPasa: number[] = [];
  return pozycje.map((x) => {
    let pas = koniecPasa.findIndex((k) => x - k >= prog);
    if (pas === -1) pas = koniecPasa.length;
    koniecPasa[pas] = x;
    return pas;
  });
}

/**
 * Numer części urlopu dla terminów, które w planie powtarzają się dla tej samej osoby (ten sam `kod`),
 * np. dwa „Wniosek o urlop rodzicielski”, gdy urlop jest podzielony – każdą część zgłasza się osobno
 * (KP art. 182¹d § 1). Tak samo nazywa je ekran dokumentów („część 1”, „część 2”). Klucz: `kluczTerminu`.
 */
export function czesciTerminow(terminy: Termin[]): Map<string, number> {
  const grupy = new Map<string, Termin[]>();
  for (const t of terminy) {
    if (!t.kod) continue;
    const g = `${t.kod}|${t.osobaId ?? ''}`;
    grupy.set(g, [...(grupy.get(g) ?? []), t]);
  }
  const wynik = new Map<string, number>();
  for (const g of grupy.values()) {
    if (g.length < 2) continue;
    [...g].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)).forEach((t, i) => wynik.set(kluczTerminu(t), i + 1));
  }
  return wynik;
}
