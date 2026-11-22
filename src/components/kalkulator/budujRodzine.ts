/**
 * Szybki kalkulator (tor C): budowa `Rodzina` z jednoekranowego formularza i wybór planu do pokazania.
 * Czyste funkcje, bez Reacta, sieci i zegara. „Dziś” przychodzi z zewnątrz (`dzis`), jak `dataAnalizy` w silniku.
 * Z silnika bierzemy tylko typy.
 */
import type { DataISO, Osoba, Plan, RodzajTytulu, Rodzina, Rola, TytulUbezpieczenia } from '../../engine/types';

/** Rodzaj tytułu ubezpieczenia z kontraktu albo „brak ubezpieczenia”. */
export type RodzajUmowy = RodzajTytulu | 'brak';

/**
 * Etykiety listy „Umowa”: te same, co w pytaniu `tytuly_rodzaje` ankiety (pytania/definicje.ts,
 * tablica nie jest eksportowana, więc trzymamy zgodne brzmienie tutaj). Bez „współpracy przy działalności”:
 * na stoisku myliła się z pracą na czarno. Typ `wspolpraca` zostaje w `RodzajUmowy` i w budowie tytułu.
 */
export const OPCJE_UMOWY: { wartosc: RodzajUmowy; etykieta: string }[] = [
  { wartosc: 'umowa_o_prace', etykieta: 'Umowa o pracę' },
  { wartosc: 'zlecenie', etykieta: 'Umowa zlecenia' },
  { wartosc: 'dzialalnosc', etykieta: 'Jednoosobowa działalność gospodarcza' },
  { wartosc: 'inny', etykieta: 'Inna umowa (np. agencyjna, kontrakt menedżerski)' },
  { wartosc: 'brak', etykieta: 'Brak ubezpieczenia' },
];

/** Czy dla tego rodzaju pytamy o dobrowolne chorobowe (etat ma obowiązkowe, brak ubezpieczenia nie ma tytułu). */
export function maDobrowolneChorobowe(u: RodzajUmowy): boolean {
  return u !== 'umowa_o_prace' && u !== 'brak';
}

/** Firma i współpraca: kwota to miesięczna podstawa składek (`zadeklarowanaPodstawa`). */
export function kwotaToPodstawaSkladek(u: RodzajUmowy): boolean {
  return u === 'dzialalnosc' || u === 'wspolpraca';
}

export interface FormularzOsoby {
  umowa: RodzajUmowy;
  /** Napis z pola: wynagrodzenie brutto miesięcznie, a dla działalności miesięczna podstawa składek. */
  zarobki: string;
  /** Od kiedy trwa umowa / działalność. */
  od: DataISO;
  /** Zlecenie i firma: czy osoba opłaca dobrowolne ubezpieczenie chorobowe. */
  chorobowe: boolean;
}

export interface Formularz {
  dataPorodu: DataISO;
  urodzone: boolean;
  dzieci: 1 | 2 | 3;
  mama: FormularzOsoby;
  tata: FormularzOsoby;
  policzTate: boolean;
  wariant815: boolean;
}

/** Ten sam dzień dwa lata wcześniej (29 lutego → 28 lutego). */
export function domyslneOd(dzis: DataISO): DataISO {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dzis);
  if (!m) return '';
  const dzien = m[2] === '02' && m[3] === '29' ? '28' : m[3];
  return `${Number(m[1]) - 2}-${m[2]}-${dzien}`;
}

export function pustaOsoba(dzis: DataISO): FormularzOsoby {
  return { umowa: 'umowa_o_prace', zarobki: '', od: domyslneOd(dzis), chorobowe: true };
}

export function nowyFormularz(dzis: DataISO): Formularz {
  return {
    dataPorodu: '',
    urodzone: false,
    dzieci: 1,
    mama: pustaOsoba(dzis),
    tata: pustaOsoba(dzis),
    policzTate: false,
    wariant815: false,
  };
}

/** „8 000,50” → 8000.5. Puste, zero, ujemne albo nieczytelne → null. */
export function parsujKwote(napis: string): number | null {
  const czysty = napis.replace(/[\s ]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(czysty)) return null;
  const n = Number(czysty);
  return n > 0 ? n : null;
}

const PREFIKS: Record<RodzajTytulu, string> = {
  umowa_o_prace: 'etat',
  zlecenie: 'zlecenie',
  dzialalnosc: 'firma',
  wspolpraca: 'wspolpraca',
  inny: 'inny',
};

function czyData(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

/** Tytuł ubezpieczenia z pól osoby; null, gdy brak umowy; 'niekompletny', gdy pola są puste. */
function budujTytul(o: FormularzOsoby): TytulUbezpieczenia | null | 'niekompletny' {
  if (o.umowa === 'brak') return null;
  if (!czyData(o.od)) return 'niekompletny';
  const id = `${PREFIKS[o.umowa]}-1`;
  // Bez dobrowolnego chorobowego zarobki nie są potrzebne: silnik i tak odmówi zasiłku (kod w wyniku).
  if (maDobrowolneChorobowe(o.umowa) && !o.chorobowe) return { id, rodzaj: o.umowa, chorobowe: 'brak', od: o.od };
  const kwota = parsujKwote(o.zarobki);
  if (kwota === null) return 'niekompletny';
  // Etat: chorobowe obowiązkowe (types.ts, `Chorobowe`). Pozostałe rodzaje: dobrowolne.
  return {
    id,
    rodzaj: o.umowa,
    chorobowe: o.umowa === 'umowa_o_prace' ? 'obowiazkowe' : 'dobrowolne',
    od: o.od,
    // Firma i współpraca: miesięczna podstawa składek; reszta: wynagrodzenie miesięczne brutto.
    ...(kwotaToPodstawaSkladek(o.umowa) ? { zadeklarowanaPodstawa: kwota } : { wynagrodzenieMiesieczne: kwota }),
  };
}

function budujOsobe(id: string, rola: Rola, o: FormularzOsoby): Osoba | null {
  const t = budujTytul(o);
  if (t === 'niekompletny') return null;
  return { id, rola, tytuly: t ? [t] : [] };
}

/** `Rodzina` z formularza albo null, gdy czegoś brakuje (data porodu, zarobki, data początku umowy). */
export function budujRodzine(f: Formularz, dzis: DataISO): Rodzina | null {
  if (!czyData(f.dataPorodu)) return null;
  const mama = budujOsobe('osoba-1', 'matka', f.mama);
  if (!mama) return null;
  const osoby = [mama];
  if (f.policzTate) {
    const tata = budujOsobe('osoba-2', 'ojciec', f.tata);
    if (!tata) return null;
    osoby.push(tata);
  }
  return {
    osoby,
    zdarzenie: {
      typ: 'porod',
      data: f.dataPorodu,
      przewidywana: !f.urodzone,
      dzieci: Array.from({ length: f.dzieci }, () => ({})),
    },
    dataAnalizy: dzis,
  };
}

/**
 * Plan do pokazania: dla pary „po równo” (jeśli jest), inaczej pierwszy plan domyślny.
 * Null, gdy silnik nie zwrócił planów (np. brak prawa do zasiłku).
 */
export function wybierzPlan(plany: Plan[], rodzina: Rodzina): Plan | null {
  if (plany.length === 0) return null;
  if (rodzina.osoby.length > 1) {
    const poRowno = plany.find((p) => p.id === 'po-rowno');
    if (poRowno) return poRowno;
    const zObojgiem = plany.find((p) => rodzina.osoby.every((o) => p.odcinki.some((x) => x.osobaId === o.id)));
    if (zObojgiem) return zObojgiem;
  }
  return plany[0];
}
