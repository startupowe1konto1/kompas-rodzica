/**
 * Kolejka ekranów ankiety „Moja sytuacja” (tor C, C3): czyste funkcje bez Reacta.
 *
 * Kolejkę liczymy od nowa po każdej odpowiedzi (widoczność pytań się zmienia), więc bieżące
 * miejsce pamiętamy po kluczu pytania albo kroku, a nie po indeksie (`Miejsce`, `znajdzEkran`).
 *
 * Sekcja nie ma osobnego ekranu otwierającego (wariant A po testach na stoisku 22.11: krótki kafel na przemian
 * z długą kartą pytań dawał „sinusoidę” wysokości). Tytuł i kolor sekcji pokazuje pasek u góry każdego ekranu pytań.
 */
import type { Rodzina } from '../../engine/types';
import { KROKI_ANKIETY } from './definicje';
import { widocznePytania, type OpcjeWidocznosci } from './silnik-ankiety';
import type { DefinicjaPytania, PytanieWidoczne } from './typy';

export type Ekran = { rodzaj: 'pytania'; krok: string; pytania: PytanieWidoczne[] } | { rodzaj: 'koniec' };

export type TrybEkranu = 'telefon' | 'komputer';

/**
 * Telefon: po jednym pytaniu na ekran. Komputer: wszystkie pytania kroku na jednym ekranie.
 * Na końcu ekran „Plan jest gotowy”. Kroki bez widocznych pytań pomijamy.
 */
export function kolejkaEkranow(defs: DefinicjaPytania[], rodzina: Rodzina, tryb: TrybEkranu, opcje: OpcjeWidocznosci = {}): Ekran[] {
  const widoczne = widocznePytania(defs, rodzina, opcje);
  const ekrany: Ekran[] = [];
  for (const krok of KROKI_ANKIETY) {
    const pytania = widoczne.filter((p) => p.def.krok === krok.id);
    if (pytania.length === 0) continue;
    if (tryb === 'telefon') for (const p of pytania) ekrany.push({ rodzaj: 'pytania', krok: krok.id, pytania: [p] });
    else ekrany.push({ rodzaj: 'pytania', krok: krok.id, pytania });
  }
  ekrany.push({ rodzaj: 'koniec' });
  return ekrany;
}

/** Kroki (sekcje) z pytaniami, w kolejności kolejki: segmenty paska postępu i „Część X z N”. */
export function sekcjeKolejki(kolejka: Ekran[]): string[] {
  const kroki: string[] = [];
  for (const e of kolejka) if (e.rodzaj === 'pytania' && !kroki.includes(e.krok)) kroki.push(e.krok);
  return kroki;
}

/** Gdzie jest rodzic: kroki i klucze pytań przeżywają przeliczenie kolejki, indeks tylko jako ostatnia deska ratunku. */
export interface Miejsce {
  rodzaj: Ekran['rodzaj'];
  krok?: string;
  klucz?: string;
  indeks: number;
}

export function miejsceEkranu(ekran: Ekran, indeks: number): Miejsce {
  if (ekran.rodzaj === 'pytania') return { rodzaj: 'pytania', krok: ekran.krok, klucz: ekran.pytania[0].klucz, indeks };
  return { rodzaj: 'koniec', indeks };
}

/** Miejsce ekranu z pytaniem o danym kluczu (link „Popraw odpowiedź” z listy do poprawy); null, gdy takiego pytania nie widać. */
export function miejsceDlaPytania(kolejka: Ekran[], klucz: string): Miejsce | null {
  const i = kolejka.findIndex((e) => e.rodzaj === 'pytania' && e.pytania.some((p) => p.klucz === klucz));
  if (i < 0) return null;
  const e = kolejka[i];
  return e.rodzaj === 'pytania' ? { rodzaj: 'pytania', krok: e.krok, klucz, indeks: i } : null;
}

/** Indeks ekranu odpowiadającego miejscu w (przeliczonej) kolejce. Nigdy poza zakresem. */
export function znajdzEkran(kolejka: Ekran[], miejsce: Miejsce): number {
  const ostatni = kolejka.length - 1;
  if (miejsce.rodzaj === 'koniec') return ostatni;
  const i = kolejka.findIndex((e) => e.rodzaj === 'pytania' && e.pytania.some((p) => p.klucz === miejsce.klucz));
  if (i >= 0) return i;
  // Pytanie zniknęło (np. po zmianie odpowiedzi wyżej): zostajemy w tym samym kroku.
  const wKroku = kolejka.findIndex((e) => e.rodzaj === 'pytania' && e.krok === miejsce.krok);
  if (wKroku >= 0) return wKroku;
  return Math.max(0, Math.min(miejsce.indeks, ostatni));
}

/**
 * Indeks ekranu, na który prowadzi „Wstecz”: dokładnie jeden ekran wcześniej, tak żeby cofanie było lustrem
 * „Dalej” (uwaga z testów z użytkownikiem 22.11: cofanie nie może przeskakiwać do innej części ankiety).
 */
export function ekranWstecz(kolejka: Ekran[], indeks: number): number {
  return Math.max(0, Math.min(indeks, kolejka.length) - 1);
}

export interface NumeracjaPytan {
  /** Liczba wszystkich pytań w kolejce. */
  lacznie: number;
  /** Numer (od 1) pierwszego pytania na ekranie; ekran końcowy dostaje numer ostatniego pytania. */
  numerEkranu: (indeks: number) => number;
}

export function numeryPytan(kolejka: Ekran[]): NumeracjaPytan {
  const pierwszeNumery: number[] = [];
  let licznik = 0;
  for (const e of kolejka) {
    pierwszeNumery.push(licznik + 1);
    if (e.rodzaj === 'pytania') licznik += e.pytania.length;
  }
  const lacznie = licznik;
  return {
    lacznie,
    numerEkranu: (indeks) => Math.min(pierwszeNumery[Math.max(0, Math.min(indeks, pierwszeNumery.length - 1))], Math.max(lacznie, 1)),
  };
}
