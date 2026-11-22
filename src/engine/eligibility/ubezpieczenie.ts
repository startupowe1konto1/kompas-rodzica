/**
 * UBEZPIECZENIE W DNIU – TOR A, zadanie A2 (docs/superpowers/plans/2026-11-21-tor-a.md).
 * Czy osoba w danym dniu podlega ubezpieczeniu chorobowemu, z którego tytułu, i od kiedy ma prawo
 * do zasiłku chorobowego (okres wyczekiwania). Używają: A2, A3, A5, tor D (kto wypłaca).
 *
 * Kody `UbezpieczenieWDniu.kod` (nazwy pochodzą od dnia porodu, ale funkcja działa dla każdego dnia):
 *  - 'UBEZP_W_DNIU_PORODU'            ubezpieczona: true – tytuł z ubezpieczeniem chorobowym trwa w tym dniu;
 *  - 'UMOWA_PRZEDLUZONA_DO_PORODU'    ubezpieczona: true – umowa na czas określony przedłużona do porodu
 *                                     (KP art. 177 § 3; tylko z `p` i `rodzina`);
 *  - 'POROD_W_TRAKCIE_WYCHOWAWCZEGO'  ubezpieczona: false – urlop wychowawczy, a żaden inny tytuł nie daje
 *                                     chorobowego; `tytulId` = umowa o pracę. Do zasiłku macierzyńskiego to
 *                                     wystarcza (UZ art. 29 ust. 1), do chorobowego nie;
 *  - 'BRAK_TYTULU_UBEZPIECZENIA'      ubezpieczona: false – osoba nie ma żadnego tytułu;
 *  - 'BRAK_CHOROBOWEGO'               ubezpieczona: false – tytuł jest, ale bez ubezpieczenia chorobowego;
 *  - 'BRAK_UBEZP_W_DNIU_PORODU'       ubezpieczona: false – w tym dniu żaden tytuł nie daje ubezpieczenia chorobowego.
 */
import { czyWOkresie, dodajDni, liczbaDni, wczesniejsza } from '../daty';
import type { DataISO, Osoba, Parametry, PrzyczynaUstania, Rodzina, TytulUbezpieczenia } from '../types';

export interface UbezpieczenieWDniu {
  ubezpieczona: boolean;
  /** Tytuł, z którego w tym dniu jest ubezpieczenie chorobowe. */
  tytulId?: string;
  /** Kod powodu, np. 'UBEZP_W_DNIU_PORODU', 'UMOWA_PRZEDLUZONA_DO_PORODU', 'BRAK_CHOROBOWEGO'. */
  kod: string;
}

/** Tytuły osoby; dane z REST mogą nie mieć pola `tytuly`. */
export function tytulyOsoby(osoba: Osoba): TytulUbezpieczenia[] {
  return osoba.tytuly ?? [];
}

/** Pierwszy dzień ubezpieczenia chorobowego z tytułu. */
export function poczatekChorobowego(t: TytulUbezpieczenia): DataISO {
  return t.chorobowoOd ?? t.od;
}

/** Ostatni dzień tytułu: wcześniejszy z `do` i daty ustania (data ustania = ostatni dzień tytułu). */
export function koniecTytulu(t: TytulUbezpieczenia): DataISO | undefined {
  if (t.ustanie && t.do) return wczesniejsza(t.ustanie.data, t.do);
  return t.ustanie?.data ?? t.do;
}

/**
 * Początek ciąży (decyzja D8, pytanie 13). Gdy poród już był i znamy tydzień ciąży (przy kilkorgu dzieci
 * najmniejszy) – data porodu minus tyle tygodni. W pozostałych przypadkach przewidywana data porodu minus
 * `limity.ciazaDni`.
 */
export function poczatekCiazy(rodzina: Rodzina, p: Parametry): DataISO {
  const { data, przewidywana, dzieci } = rodzina.zdarzenie;
  const tygodnie = (dzieci ?? []).map((d) => d.tydzienCiazy).filter((t): t is number => t !== undefined);
  if (!przewidywana && tygodnie.length > 0) return dodajDni(data, -Math.min(...tygodnie) * 7);
  return dodajDni(data, -p.limity.ciazaDni);
}

/**
 * Ostatni dzień 3. miesiąca ciąży (D8): początek ciąży + `przedluzenieUmowyPoMiesiacuCiazy × miesiacCiazyDni`
 * (miesiące księżycowe). NIEJASNE (pytanie 13): jak liczą ten termin ZUS i pracodawcy.
 */
export function koniecMiesiacaCiazy(rodzina: Rodzina, p: Parametry): DataISO {
  return dodajDni(poczatekCiazy(rodzina, p), p.limity.przedluzenieUmowyPoMiesiacuCiazy * p.limity.miesiacCiazyDni);
}

/** Przyczyny ustania, po których zasiłek macierzyński przysługuje mimo braku ubezpieczenia w dniu porodu. */
export const USTANIE_Z_WINY_PRACODAWCY: PrzyczynaUstania[] = ['smierc_pracodawcy', 'upadlosc', 'likwidacja']; // UZ art. 30 ust. 1 pkt 1

export type Przedluzenie = 'przedluzona' | 'zastepstwo' | 'przed_koncem_miesiaca' | 'nie_dotyczy';

/**
 * Czy umowa przedłuża się do dnia porodu.
 * KP art. 177 § 3: umowa na czas określony albo na okres próbny ponad miesiąc, która rozwiązałaby się
 * po upływie 3. miesiąca ciąży, przedłuża się do dnia porodu. KP art. 177 § 3¹: nie dotyczy umowy na
 * zastępstwo. Dotyczy tylko pracownicy (umowa o pracę), nie zlecenia ani działalności (UZ art. 30 ust. 4).
 */
export function przedluzenieDoPorodu(t: TytulUbezpieczenia, rodzina: Rodzina, p: Parametry): Przedluzenie {
  const porod = rodzina.zdarzenie.data;
  if (rodzina.zdarzenie.typ !== 'porod') return 'nie_dotyczy';
  if (t.rodzaj !== 'umowa_o_prace' || !t.naCzasOkreslony || t.chorobowe === 'brak' || !t.do) return 'nie_dotyczy';
  // Umowa rozwiązana z innej przyczyny niż upływ czasu (np. likwidacja) nie „ulega rozwiązaniu” z upływem terminu.
  if (t.ustanie && t.ustanie.przyczyna !== 'koniec_umowy' && t.ustanie.data <= t.do) return 'nie_dotyczy';
  if (t.do >= porod) return 'nie_dotyczy';
  // KP art. 177 § 3 – „po upływie trzeciego miesiąca ciąży”. NIEJASNE (pytanie 13): koniec miesiąca według D8.
  if (t.do <= koniecMiesiacaCiazy(rodzina, p)) return 'przed_koncem_miesiaca';
  if (t.naZastepstwo) return 'zastepstwo'; // KP art. 177 § 3¹
  return 'przedluzona';
}

function naUrlopieWychowawczym(osoba: Osoba, dzien: DataISO): boolean {
  const w = osoba.urlopWychowawczy;
  return w !== undefined && czyWOkresie(dzien, w.od, w.do);
}

/**
 * Czy osoba w dniu `dzien` podlega ubezpieczeniu chorobowemu (kody: opis na początku pliku).
 * Zawsze uwzględnia okresy tytułów i urlop wychowawczy (`osoba.urlopWychowawczy`). Z `p` i `rodzina`
 * uwzględnia też przedłużenie umowy na czas określony do porodu (KP art. 177 § 3, § 3¹).
 */
export function ubezpieczenieWDniu(osoba: Osoba, dzien: DataISO, p?: Parametry, rodzina?: Rodzina): UbezpieczenieWDniu {
  const tytuly = tytulyOsoby(osoba);
  if (tytuly.length === 0) return { ubezpieczona: false, kod: 'BRAK_TYTULU_UBEZPIECZENIA' };

  // W czasie urlopu wychowawczego pracownik nie podlega ubezpieczeniu chorobowemu z umowy o pracę;
  // inny tytuł (np. zlecenie) może je dawać.
  const wychowawczy = naUrlopieWychowawczym(osoba, dzien);

  // UZ art. 29 ust. 1 – okres ubezpieczenia chorobowego.
  for (const t of tytuly) {
    if (t.chorobowe === 'brak') continue;
    if (wychowawczy && t.rodzaj === 'umowa_o_prace') continue;
    if (czyWOkresie(dzien, poczatekChorobowego(t), koniecTytulu(t))) {
      return { ubezpieczona: true, tytulId: t.id, kod: 'UBEZP_W_DNIU_PORODU' };
    }
  }

  // KP art. 177 § 3; UZ art. 30 ust. 4 – umowa przedłużona do dnia porodu.
  if (p && rodzina) {
    for (const t of tytuly) {
      if (przedluzenieDoPorodu(t, rodzina, p) === 'przedluzona' && t.do! < dzien && dzien <= rodzina.zdarzenie.data) {
        return { ubezpieczona: true, tytulId: t.id, kod: 'UMOWA_PRZEDLUZONA_DO_PORODU' };
      }
    }
  }

  // Urlop wychowawczy: bez ubezpieczenia chorobowego, ale UZ art. 29 ust. 1 („albo w okresie urlopu
  // wychowawczego”) daje prawo do zasiłku macierzyńskiego – rozstrzyga o tym A2 po kodzie.
  if (wychowawczy) {
    const umowa =
      tytuly.find((t) => t.rodzaj === 'umowa_o_prace' && czyWOkresie(dzien, t.od, koniecTytulu(t))) ??
      tytuly.find((t) => t.rodzaj === 'umowa_o_prace');
    return { ubezpieczona: false, ...(umowa ? { tytulId: umowa.id } : {}), kod: 'POROD_W_TRAKCIE_WYCHOWAWCZEGO' };
  }

  const bezChorobowegoWDniu = tytuly.some((t) => t.chorobowe === 'brak' && czyWOkresie(dzien, t.od, koniecTytulu(t)));
  if (bezChorobowegoWDniu || tytuly.every((t) => t.chorobowe === 'brak')) {
    return { ubezpieczona: false, kod: 'BRAK_CHOROBOWEGO' };
  }
  return { ubezpieczona: false, kod: 'BRAK_UBEZP_W_DNIU_PORODU' };
}

// ───────────────────────── Okres wyczekiwania (UZ art. 4) ─────────────────────────

interface Okres {
  od: DataISO;
  do?: DataISO; // brak = trwa
}

export interface Wyczekiwanie {
  /** Ile dni nieprzerwanego ubezpieczenia trzeba mieć (30 obowiązkowe / 90 dobrowolne). */
  dni: number;
  /** Pierwszy dzień z prawem do zasiłku chorobowego; null = w tym okresie ubezpieczenia prawo nie powstanie. */
  prawoOd: DataISO | null;
  tytulId: string;
}

/** Okresy ubezpieczenia chorobowego osoby (z przedłużeniem umowy do porodu), połączone, gdy nachodzą lub się stykają. */
function okresyChorobowego(osoba: Osoba, p?: Parametry, rodzina?: Rodzina): Okres[] {
  const okresy: Okres[] = tytulyOsoby(osoba)
    .filter((t) => t.chorobowe !== 'brak')
    .map((t) => {
      const przedluzona = p && rodzina && przedluzenieDoPorodu(t, rodzina, p) === 'przedluzona';
      return { od: poczatekChorobowego(t), do: przedluzona ? rodzina.zdarzenie.data : koniecTytulu(t) };
    })
    .sort((a, b) => (a.od < b.od ? -1 : a.od > b.od ? 1 : 0));
  const wynik: Okres[] = [];
  for (const o of okresy) {
    const ost = wynik[wynik.length - 1];
    if (ost && (ost.do === undefined || o.od <= dodajDni(ost.do, 1))) {
      if (ost.do !== undefined && (o.do === undefined || o.do > ost.do)) ost.do = o.do;
    } else {
      wynik.push({ ...o });
    }
  }
  return wynik;
}

/**
 * Okres wyczekiwania na zasiłek chorobowy liczony dla dnia `dzien` (np. początku zwolnienia).
 * UZ art. 4 ust. 1: prawo po upływie 30 dni nieprzerwanego ubezpieczenia obowiązkowego albo 90 dni dobrowolnego.
 * UZ art. 4 ust. 2: wlicza się poprzednie okresy, jeśli przerwa nie przekroczyła 30 dni albo była urlopem wychowawczym.
 * Zwraca undefined, gdy w tym dniu osoba nie ma ubezpieczenia chorobowego.
 * Wyjątki z UZ art. 4 ust. 3 (absolwenci, 10 lat ubezpieczenia obowiązkowego, wypadek w drodze) – brak danych, nie liczymy.
 */
export function wyczekiwanieNaChorobowy(osoba: Osoba, dzien: DataISO, p: Parametry, rodzina?: Rodzina): Wyczekiwanie | undefined {
  const u = ubezpieczenieWDniu(osoba, dzien, p, rodzina);
  if (!u.ubezpieczona || !u.tytulId) return undefined;

  // UZ art. 4 ust. 1 pkt 1–2: rodzaj ubezpieczenia w dniu powstania niezdolności.
  const aktywne = tytulyOsoby(osoba).filter(
    (t) => t.chorobowe !== 'brak' && (t.id === u.tytulId || czyWOkresie(dzien, poczatekChorobowego(t), koniecTytulu(t))),
  );
  const dni = aktywne.some((t) => t.chorobowe === 'obowiazkowe')
    ? p.limity.wyczekiwanieObowiazkoweDni
    : p.limity.wyczekiwanieDobrowolneDni;

  const maxPrzerwa = p.limity.wyczekiwaniePrzerwaMaxDni; // UZ art. 4 ust. 2
  const okresy = okresyChorobowego(osoba, p, rodzina);
  const i = okresy.findIndex((o) => czyWOkresie(dzien, o.od, o.do));
  if (i < 0) return undefined;

  // UZ art. 4 ust. 2 – poprzedni okres wlicza się, gdy przerwa ≤ maxPrzerwa albo była urlopem wychowawczym.
  const sklejone = (k: number): boolean => {
    const przerwaOd = dodajDni(okresy[k - 1].do!, 1);
    const przerwaDo = dodajDni(okresy[k].od, -1);
    const wych = osoba.urlopWychowawczy;
    return liczbaDni(przerwaOd, przerwaDo) <= maxPrzerwa || (wych !== undefined && wych.od <= przerwaOd && przerwaDo <= wych.do);
  };
  let start = i;
  while (start > 0 && sklejone(start)) start -= 1;

  // Dzień, w którym upływa `dni` dni ubezpieczenia (przerwy się nie liczą); prawo od następnego dnia.
  let zebrane = 0;
  for (let k = start; k < okresy.length; k++) {
    if (k > start && !sklejone(k)) break;
    const o = okresy[k];
    const dlugosc = o.do === undefined ? Infinity : liczbaDni(o.od, o.do);
    if (zebrane + dlugosc >= dni) {
      const prawoOd = dodajDni(o.od, dni - zebrane);
      // Okres upływa w ostatnim dniu ubezpieczenia – prawo nie powstanie, chyba że ubezpieczenie trwa dalej.
      if (o.do !== undefined && prawoOd > o.do) {
        const nastepny = okresy[k + 1];
        return { dni, prawoOd: nastepny && sklejone(k + 1) ? nastepny.od : null, tytulId: u.tytulId };
      }
      return { dni, prawoOd, tytulId: u.tytulId };
    }
    zebrane += dlugosc;
  }
  return { dni, prawoOd: null, tytulId: u.tytulId };
}
