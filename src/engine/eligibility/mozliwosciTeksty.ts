/**
 * Wspólne narzędzia zadania A3 (możliwości i ryzyka): kontekst rodziny i teksty wspólne dla obu.
 * Gramatyka i formaty liczb są w `uprawnieniaTeksty.ts` (używa ich też A2), tu tylko je udostępniamy dalej.
 * Liczby w tekstach zawsze pochodzą z `Parametry` albo `Pule`.
 */
import { czyWOkresie, koniecPoTygodniach } from '../daty';
import type { DataISO, Osoba, Parametry, Pule, Rodzina, Swiadczenie, TytulUbezpieczenia, Uprawnienie } from '../types';
import { koniecTytulu } from './ubezpieczenie';
import { ustalListeUprawnien } from './uprawnienia';
import { dataSlownie, DO_POTWIERDZENIA, proc } from './uprawnieniaTeksty';

export {
  dataSlownie,
  dni,
  DO_POTWIERDZENIA,
  lat,
  miesiecy,
  orzeczenie,
  proc,
  PRZYKLAD_CZLONKA_RODZINY,
  przysluguje,
  tygodni,
  tygodniach,
  tygodniDop,
  zlote,
} from './uprawnieniaTeksty';

/**
 * Wniosek o wariant 81,5% złożony przed porodem (UZ art. 30a ust. 1). NIEJASNE (pytanie nr 23): odpowiedź ZUS na stoisku
 * 21.11, pytanie nr 23 była niepewna („chyba”) – przed porodem wniosek jest ważny tylko razem z wnioskiem o urlop
 * macierzyński przed porodem (KP art. 180 § 2), w innym razie po porodzie do `pule.wniosek815DoKiedy`. Stąd dopisek.
 */
export function wniosek815PrzedPorodem(p: Parametry, doKiedy: DataISO): string {
  return (
    `Przed porodem wniosek o wariant ${proc(p.stawkiProc.wariant815)} można złożyć tylko razem z wnioskiem o urlop macierzyński ` +
    `przed porodem. W innym razie trzeba go złożyć po porodzie, najpóźniej ${dataSlownie(doKiedy)}. ${DO_POTWIERDZENIA}`
  );
}

// ───────────────────────── Kontekst rodziny ─────────────────────────

/** Wszystko, czego potrzebują reguły możliwości i ryzyk; liczone raz. */
export interface KontekstA3 {
  rodzina: Rodzina;
  pule: Pule;
  p: Parametry;
  /** Dzień porodu albo przyjęcia dziecka. */
  z: DataISO;
  porod: boolean;
  /** „Dziś” (`rodzina.dataAnalizy`). */
  dzis: DataISO;
  uprawnienia: Uprawnienie[];
  /** Pierwsza osoba z rolą `matka`. */
  matka?: Osoba;
  /** Ostatni dzień urlopu macierzyńskiego (albo na warunkach macierzyńskiego) liczonego od dnia porodu/przyjęcia. */
  koniecMac: DataISO;
  /**
   * Zgon matki albo porzucenie przez nią dziecka (KP art. 180 § 12–13, § 15; UZ art. 29 ust. 7, 9): matka nie planuje
   * już urlopów – nie ma jej w `osobyZ`, nie dostaje kart terminów ani możliwości rezygnacji.
   */
  matkaOdeszla: boolean;
  /** Nazwa urlopu „macierzyńskiego” w trzech przypadkach: poród albo przyjęcie dziecka (KP art. 183). */
  urlopMac: { M: string; D: string; Ms: string };
}

export function kontekst(rodzina: Rodzina, pule: Pule, p: Parametry): KontekstA3 {
  const z = rodzina.zdarzenie.data;
  const matka = rodzina.osoby.find((o) => o.rola === 'matka');
  return {
    rodzina,
    pule,
    p,
    z,
    porod: rodzina.zdarzenie.typ === 'porod',
    dzis: rodzina.dataAnalizy,
    uprawnienia: ustalListeUprawnien(rodzina, pule, p),
    matka,
    koniecMac: pule.macierzynskiOstatniDzien ?? koniecPoTygodniach(z, pule.macierzynskiTyg),
    matkaOdeszla: matka?.zdrowie?.zgon !== undefined || matka?.zdrowie?.porzucenieDziecka !== undefined,
    urlopMac:
      rodzina.zdarzenie.typ === 'porod'
        ? { M: 'urlop macierzyński', D: 'urlopu macierzyńskiego', Ms: 'urlopie macierzyńskim' }
        : {
            M: 'urlop na warunkach urlopu macierzyńskiego',
            D: 'urlopu na warunkach urlopu macierzyńskiego',
            Ms: 'urlopie na warunkach urlopu macierzyńskiego',
          },
  };
}

/** Wpis uprawnienia osoby do świadczenia (D2: najwyżej jeden). */
export function uprawnienie(k: KontekstA3, osobaId: string, sw: Swiadczenie): Uprawnienie | undefined {
  return k.uprawnienia.find((u) => u.osobaId === osobaId && u.swiadczenie === sw);
}

/** Czy osoba ma świadczenie (także warunkowo). */
export function ma(k: KontekstA3, osobaId: string, sw: Swiadczenie): boolean {
  const u = uprawnienie(k, osobaId, sw);
  return u !== undefined && u.przysluguje !== false;
}

/** Osoby, które mają świadczenie (także warunkowo) i mogą je jeszcze zaplanować, w kolejności z rodziny. */
export function osobyZ(k: KontekstA3, sw: Swiadczenie): Osoba[] {
  return k.rodzina.osoby.filter((o) => ma(k, o.id, sw) && !(k.matkaOdeszla && o === k.matka));
}

/** Osoby, które mogą przejąć urlop macierzyński matki (KP art. 180 § 4–17; UZ art. 29 ust. 3–10). */
export function przejmujacy(k: KontekstA3): Osoba[] {
  return k.rodzina.osoby.filter((o) => (o.rola === 'ojciec' || o.rola === 'inny_czlonek_rodziny') && ma(k, o.id, 'macierzynski'));
}

/** Jak nazywać osobę w tekstach w trzeciej osobie. */
export function nazwa(o: Osoba): string {
  if (o.rola === 'ojciec') return 'Tata';
  if (o.rola === 'matka') return 'Mama';
  if (o.rola === 'przyjmujacy') return 'Osoba przyjmująca';
  return o.dane?.imie ?? 'Inny członek rodziny';
}

/** Czy tytuł trwa w dniu `dzien` (bez względu na ubezpieczenie chorobowe). */
export function trwaWDniu(t: TytulUbezpieczenia, dzien: DataISO): boolean {
  return czyWOkresie(dzien, t.od, koniecTytulu(t));
}

/** Czy osoba ma w dniu `dzien` umowę o pracę (wnioski do pracodawcy, łączenie urlopu z pracą – KP art. 182¹e). */
export function pracownikWDniu(o: Osoba, dzien: DataISO): boolean {
  return (o.tytuly ?? []).some((t) => t.rodzaj === 'umowa_o_prace' && trwaWDniu(t, dzien));
}
