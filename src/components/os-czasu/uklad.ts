/**
 * Model układu osi czasu: czyste dane, które warstwa wizualna tylko rysuje.
 * Oś czasu (`ukladOsi`) i lista (`listaOdcinkow`) to dwa widoki tego samego stanu.
 * Bez Reacta, bez stylów, bez zegara: „dziś” to `rodzina.dataAnalizy`.
 */
import type {
  DataISO,
  Komunikat,
  Odcinek,
  Osoba,
  Plan,
  Rodzina,
  Rola,
  TypOdcinka,
  WynikWalidacji,
} from '../../engine/types';
import { dniMiedzy, dodajMiesiace, formatujDate, parsujDate, poczatekMiesiaca } from './daty';
import { skala, type Przyciecie } from './skala';
import {
  MIESIACE_MIANOWNIK,
  MIESIACE_SKROT,
  NAZWY_ROL,
  NAZWY_TYPOW,
  etykietaOdcinka,
  opisDlugosci,
  opisOkresu,
} from './teksty';
import type { Okno } from './zakres';

// ───────────────────────── Typy wyniku ─────────────────────────

/** Odcinek opisany słowami – wspólny dla osi i listy. */
export interface OpisOdcinka {
  id: string;
  osobaId: string;
  typ: TypOdcinka;
  /** Np. 'Urlop macierzyński'. */
  nazwa: string;
  od: DataISO;
  do: DataISO;
  /** Liczba dni (od i do włącznie). */
  dni: number;
  czescNr?: number;
  wymiarPracy?: number;
  /** '1 grudnia 2026 – 19 kwietnia 2027'. */
  okres: string;
  /** '20 tygodni'. */
  dlugosc: string;
  /** Pełne zdanie dla czytnika ekranu. */
  etykietaDostepna: string;
  /** Walidacja zgłosiła błąd wskazujący ten odcinek (`Komunikat.odcinekId`). */
  maBlad: boolean;
  maOstrzezenie: boolean;
  /** Kody błędów dla tego odcinka (do powiązania z panelem komunikatów). */
  kodyBledow: string[];
}

export interface OdcinekNaOsi extends OpisOdcinka {
  /** Ułamek 0..1 szerokości okna. */
  start: number;
  szerokosc: number;
  przyciety: Przyciecie;
  /** Wiersz w ścieżce osoby (0 = pierwszy); nachodzące odcinki dostają kolejne wiersze. */
  wiersz: number;
}

export interface SciezkaOsi {
  osobaId: string;
  /** Brak, gdy plan wskazuje osobę spoza `rodzina.osoby`. */
  rola?: Rola;
  /** 'Mama', 'Tata' … */
  etykieta: string;
  /** Liczba wierszy liczona ze wszystkich odcinków osoby (nie zmienia się przy przesuwaniu okna), co najmniej 1. */
  liczbaWierszy: number;
  /** Tylko odcinki widoczne w oknie, posortowane po dacie. */
  odcinki: OdcinekNaOsi[];
}

export type RodzajZnacznika = 'porod' | 'dzis';

export interface ZnacznikOsi {
  rodzaj: RodzajZnacznika;
  data: DataISO;
  etykieta: string;
  /** Ułamek 0..1: środek dnia. */
  pozycja: number;
}

export interface ZnacznikPozaOknem {
  rodzaj: RodzajZnacznika;
  data: DataISO;
  etykieta: string;
  /** Po której stronie okna leży (np. do przycisku „pokaż dziś”). */
  strona: 'lewo' | 'prawo';
}

export interface KreskaPodzialki {
  /** Pierwszy dzień miesiąca albo roku. */
  data: DataISO;
  /** Ułamek 0..1: początek dnia. */
  pozycja: number;
  /** Krótko: 'sty' albo '2027'. */
  etykieta: string;
  /** Pełno: 'styczeń 2027' albo '2027'. */
  etykietaPelna: string;
  rok: number;
  poczatekRoku: boolean;
}

export interface Podzialka {
  rodzaj: 'miesiac' | 'rok';
  kreski: KreskaPodzialki[];
}

export interface UkladOsi {
  okno: Okno;
  sciezki: SciezkaOsi[];
  /** Tylko znaczniki widoczne w oknie. */
  znaczniki: ZnacznikOsi[];
  znacznikiPozaOknem: ZnacznikPozaOknem[];
  podzialka: Podzialka;
}

export interface GrupaListy {
  osobaId: string;
  rola?: Rola;
  etykieta: string;
  /** Wszystkie odcinki osoby, posortowane po dacie. */
  odcinki: OpisOdcinka[];
}

// ───────────────────────── Stałe ─────────────────────────

/** Okno do ok. 3 lat → kreski miesięczne, dłuższe → roczne. */
export const PROG_PODZIALKI_MIESIECZNEJ_DNI = 1096;

const KOLEJNOSC_ROL: Record<Rola, number> = {
  matka: 0,
  ojciec: 1,
  przyjmujacy: 2,
  inny_czlonek_rodziny: 3,
};

const OSOBA_SPOZA_RODZINY = 'Inna osoba';

// ───────────────────────── Osoby ─────────────────────────

interface OsobaOsi {
  osobaId: string;
  rola?: Rola;
  etykieta: string;
}

/**
 * Stała kolejność: mama, tata, osoba przyjmująca, inni członkowie rodziny, na końcu osoby
 * z planu, których nie ma w rodzinie. W obrębie roli – kolejność z danych.
 */
function osobyOsi(rodzina: Rodzina, plan: Plan): OsobaOsi[] {
  const znane = rodzina.osoby
    .map((o, i) => ({ o, i }))
    .sort((a, b) => KOLEJNOSC_ROL[a.o.rola] - KOLEJNOSC_ROL[b.o.rola] || a.i - b.i)
    .map(({ o }) => o);

  const ileRol = new Map<Rola, number>();
  for (const o of znane) ileRol.set(o.rola, (ileRol.get(o.rola) ?? 0) + 1);
  const numer = new Map<Rola, number>();
  const wynik: OsobaOsi[] = znane.map((o: Osoba) => {
    const nazwa = NAZWY_ROL[o.rola];
    if ((ileRol.get(o.rola) ?? 0) < 2) return { osobaId: o.id, rola: o.rola, etykieta: nazwa };
    const n = (numer.get(o.rola) ?? 0) + 1;
    numer.set(o.rola, n);
    const imie = o.dane?.imie?.trim();
    return { osobaId: o.id, rola: o.rola, etykieta: imie ? `${nazwa} (${imie})` : `${nazwa} ${n}` };
  });

  const ids = new Set(wynik.map((w) => w.osobaId));
  for (const odc of plan.odcinki) {
    if (!ids.has(odc.osobaId)) {
      ids.add(odc.osobaId);
      wynik.push({ osobaId: odc.osobaId, etykieta: OSOBA_SPOZA_RODZINY });
    }
  }
  return wynik;
}

// ───────────────────────── Odcinki ─────────────────────────

function porownajOdcinki(a: Odcinek, b: Odcinek): number {
  if (a.od !== b.od) return a.od < b.od ? -1 : 1;
  if (a.do !== b.do) return a.do < b.do ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function kodyDla(komunikaty: Komunikat[] | undefined, odcinekId: string): string[] {
  return (komunikaty ?? []).filter((k) => k.odcinekId === odcinekId).map((k) => k.kod);
}

function opisz(o: Odcinek, walidacja?: WynikWalidacji): OpisOdcinka {
  const dni = dniMiedzy(o.od, o.do) + 1;
  const kodyBledow = kodyDla(walidacja?.bledy, o.id);
  const maBlad = kodyBledow.length > 0;
  return {
    id: o.id,
    osobaId: o.osobaId,
    typ: o.typ,
    nazwa: NAZWY_TYPOW[o.typ],
    od: o.od,
    do: o.do,
    dni,
    ...(o.czescNr !== undefined ? { czescNr: o.czescNr } : {}),
    ...(o.wymiarPracy !== undefined ? { wymiarPracy: o.wymiarPracy } : {}),
    okres: opisOkresu(o.od, o.do),
    dlugosc: opisDlugosci(dni),
    etykietaDostepna: etykietaOdcinka(o, dni, maBlad),
    maBlad,
    maOstrzezenie: kodyDla(walidacja?.ostrzezenia, o.id).length > 0,
    kodyBledow,
  };
}

/** Zachłanny podział na wiersze: odcinek trafia do pierwszego wiersza, w którym nic na niego nie nachodzi. */
function przydzielWiersze(posortowane: Odcinek[]): { wiersze: Map<string, number>; liczba: number } {
  const koniecWiersza: DataISO[] = [];
  const wiersze = new Map<string, number>();
  for (const o of posortowane) {
    let w = koniecWiersza.findIndex((koniec) => koniec < o.od);
    if (w === -1) {
      w = koniecWiersza.length;
      koniecWiersza.push(o.do);
    } else {
      koniecWiersza[w] = o.do;
    }
    wiersze.set(o.id, w);
  }
  return { wiersze, liczba: Math.max(1, koniecWiersza.length) };
}

// ───────────────────────── Znaczniki i podziałka ─────────────────────────

function etykietaZdarzenia(rodzina: Rodzina): string {
  const z = rodzina.zdarzenie;
  if (z.typ === 'porod') return z.przewidywana ? 'Przewidywany poród' : 'Poród';
  return z.przewidywana ? 'Przewidywane przyjęcie dziecka' : 'Przyjęcie dziecka';
}

function podzialka(okno: Okno): Podzialka {
  const s = skala(okno);
  const kreski: KreskaPodzialki[] = [];
  if (s.dni <= PROG_PODZIALKI_MIESIECZNEJ_DNI) {
    let d = poczatekMiesiaca(okno.od);
    if (d < okno.od) d = dodajMiesiace(d, 1);
    for (; d <= okno.do; d = dodajMiesiace(d, 1)) {
      const { rok, miesiac } = parsujDate(d);
      kreski.push({
        data: d,
        pozycja: s.ulamek(d),
        etykieta: MIESIACE_SKROT[miesiac - 1],
        etykietaPelna: `${MIESIACE_MIANOWNIK[miesiac - 1]} ${rok}`,
        rok,
        poczatekRoku: miesiac === 1,
      });
    }
    return { rodzaj: 'miesiac', kreski };
  }
  const { rok: rokOd } = parsujDate(okno.od);
  for (let rok = okno.od.endsWith('-01-01') ? rokOd : rokOd + 1; ; rok++) {
    const d = formatujDate(rok, 1, 1);
    if (d > okno.do) break;
    kreski.push({ data: d, pozycja: s.ulamek(d), etykieta: String(rok), etykietaPelna: String(rok), rok, poczatekRoku: true });
  }
  return { rodzaj: 'rok', kreski };
}

// ───────────────────────── API ─────────────────────────

/**
 * Układ osi dla okna: ścieżka na każdą osobę z rodziny (także bez odcinków, żeby było gdzie dodać urlop)
 * i na każdą osobę z planu spoza rodziny; odcinki w ułamkach okna; znaczniki porodu i dziś; podziałka.
 */
export function ukladOsi(rodzina: Rodzina, plan: Plan, okno: Okno, walidacja?: WynikWalidacji): UkladOsi {
  const s = skala(okno);

  const sciezki: SciezkaOsi[] = osobyOsi(rodzina, plan).map((osoba) => {
    const wszystkie = plan.odcinki.filter((o) => o.osobaId === osoba.osobaId).sort(porownajOdcinki);
    const { wiersze, liczba } = przydzielWiersze(wszystkie);
    const odcinki: OdcinekNaOsi[] = [];
    for (const o of wszystkie) {
      const poz = s.przytnij(o.od, o.do);
      if (!poz) continue;
      odcinki.push({ ...opisz(o, walidacja), ...poz, wiersz: wiersze.get(o.id) ?? 0 });
    }
    return { ...osoba, liczbaWierszy: liczba, odcinki };
  });

  const kandydaci: { rodzaj: RodzajZnacznika; data: DataISO; etykieta: string }[] = [
    { rodzaj: 'porod', data: rodzina.zdarzenie.data, etykieta: etykietaZdarzenia(rodzina) },
    { rodzaj: 'dzis', data: rodzina.dataAnalizy, etykieta: 'Dziś' },
  ];
  const znaczniki: ZnacznikOsi[] = [];
  const znacznikiPozaOknem: ZnacznikPozaOknem[] = [];
  for (const z of kandydaci) {
    if (z.data < okno.od) znacznikiPozaOknem.push({ ...z, strona: 'lewo' });
    else if (z.data > okno.do) znacznikiPozaOknem.push({ ...z, strona: 'prawo' });
    else znaczniki.push({ ...z, pozycja: s.ulamek(z.data) + 0.5 / s.dni });
  }

  return { okno, sciezki, znaczniki, znacznikiPozaOknem, podzialka: podzialka(okno) };
}

/** Te same odcinki jako lista: grupy osób w kolejności osi, odcinki posortowane po dacie. */
export function listaOdcinkow(rodzina: Rodzina, plan: Plan, walidacja?: WynikWalidacji): GrupaListy[] {
  return osobyOsi(rodzina, plan).map((osoba) => ({
    ...osoba,
    odcinki: plan.odcinki
      .filter((o) => o.osobaId === osoba.osobaId)
      .sort(porownajOdcinki)
      .map((o) => opisz(o, walidacja)),
  }));
}
