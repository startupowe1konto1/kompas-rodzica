/**
 * Zakres osi czasu i okno widoku (przybliżanie, oddalanie, przesuwanie).
 * Specyfikacja, sekcja 7: oś od początku ciąży do końca roku, w którym dziecko kończy 6 lat;
 * domyślnie widać pierwsze dwa lata.
 */
import type { DataISO, Plan, Rodzina } from '../../engine/types';
import { dniMiedzy, dodajDni, dodajMiesiace, koniecRoku, parsujDate, pozniejsza, wczesniejsza } from './daty';

/** Okno widoku: pierwszy i ostatni widoczny dzień (domknięte z obu stron). */
export interface Okno {
  od: DataISO;
  do: DataISO;
}

export interface ZakresOsi extends Okno {
  oknoDomyslne: Okno;
}

/**
 * Typowa długość ciąży od pierwszego dnia ostatniej miesiączki do terminu porodu (40 tygodni).
 * To konwencja położnicza do rysowania osi, a nie liczba z przepisów – nie wpływa na wynik.
 */
export const DNI_CIAZY = 280;
/** Najkrótsze okno, do którego da się przybliżyć. */
export const MIN_OKNO_DNI = 30;
/** Domyślne okno: pierwsze 2 lata osi. */
export const DOMYSLNE_OKNO_MIESIECY = 24;
/** Do końca roku, w którym dziecko kończy tyle lat (granica urlopu rodzicielskiego, KP art. 182¹c).
 *  Dla osi to tylko zakres rysowania; prawne granice dat daje silnik w `Pule.rodzicielskiDoKiedy`. */
const LATA_DZIECKA = 6;

/** Liczba dni okna. */
export function dlugoscOkna(o: Okno): number {
  return dniMiedzy(o.od, o.do) + 1;
}

function poczatekCiazy(rodzina: Rodzina): DataISO {
  const z = rodzina.zdarzenie;
  if (z.typ !== 'porod') return z.data; // przyjęcie dziecka: oś zaczyna się w dniu przyjęcia
  const tydzien = z.dzieci.find((d) => d.tydzienCiazy !== undefined)?.tydzienCiazy;
  return dodajDni(z.data, -(tydzien !== undefined ? tydzien * 7 : DNI_CIAZY));
}

function rokUrodzeniaDziecka(rodzina: Rodzina): number {
  const z = rodzina.zdarzenie;
  if (z.typ === 'porod') return parsujDate(z.data).rok;
  // przyjęcie: najmłodsze dziecko wyznacza najdalszą granicę
  const daty = z.dzieci.map((d) => d.dataUrodzenia).filter((d): d is DataISO => d !== undefined);
  const najmlodsze = daty.length ? daty.reduce(pozniejsza) : z.data;
  return parsujDate(najmlodsze).rok;
}

/**
 * Pełny zakres osi. Jeśli plan ma odcinki poza wyliczonym zakresem, oś je obejmuje,
 * żeby żaden odcinek nie zniknął.
 */
export function zakresOsi(rodzina: Rodzina, plan?: Plan): ZakresOsi {
  let od = poczatekCiazy(rodzina);
  let do_ = koniecRoku(rokUrodzeniaDziecka(rodzina) + LATA_DZIECKA);
  for (const o of plan?.odcinki ?? []) {
    od = wczesniejsza(od, o.od);
    do_ = pozniejsza(do_, o.do);
  }
  const koniecDomyslnego = dodajDni(dodajMiesiace(od, DOMYSLNE_OKNO_MIESIECY), -1);
  do_ = pozniejsza(do_, koniecDomyslnego);
  return { od, do: do_, oknoDomyslne: { od, do: koniecDomyslnego } };
}

/** Okno o zadanym początku i długości, wsunięte w zakres osi. */
function wZakresie(od: DataISO, dni: number, zakres: Okno): Okno {
  const pelne = dlugoscOkna(zakres);
  if (dni >= pelne) return { od: zakres.od, do: zakres.do };
  let start = od;
  if (start < zakres.od) start = zakres.od;
  const max = dodajDni(zakres.do, -(dni - 1));
  if (start > max) start = max;
  return { od: start, do: dodajDni(start, dni - 1) };
}

function srodek(o: Okno): DataISO {
  return dodajDni(o.od, Math.floor(dlugoscOkna(o) / 2));
}

/** Zmiana długości okna z kotwicą, która zostaje w tym samym miejscu ekranu. */
function zmienDlugosc(okno: Okno, zakres: Okno, noweDni: number, kotwica: DataISO): Okno {
  const dni = dlugoscOkna(okno);
  const ulamek = dniMiedzy(okno.od, kotwica) / dni;
  const od = dodajDni(kotwica, -Math.round(ulamek * noweDni));
  return wZakresie(od, noweDni, zakres);
}

/** Przybliża dwukrotnie (nie mniej niż MIN_OKNO_DNI). Kotwica domyślnie w środku okna. */
export function przybliz(okno: Okno, zakres: Okno, kotwica: DataISO = srodek(okno)): Okno {
  const noweDni = Math.max(MIN_OKNO_DNI, Math.round(dlugoscOkna(okno) / 2));
  return zmienDlugosc(okno, zakres, noweDni, kotwica);
}

/** Oddala dwukrotnie (najwyżej do pełnego zakresu osi). */
export function oddal(okno: Okno, zakres: Okno, kotwica: DataISO = srodek(okno)): Okno {
  const noweDni = Math.min(dlugoscOkna(zakres), dlugoscOkna(okno) * 2);
  return zmienDlugosc(okno, zakres, noweDni, kotwica);
}

/** Przesuwa okno o `dni` (ujemne = wstecz), bez wychodzenia poza oś. */
export function przesunOkno(okno: Okno, zakres: Okno, dni: number): Okno {
  return wZakresie(dodajDni(okno.od, dni), dlugoscOkna(okno), zakres);
}

/** Ustawia okno tak, żeby data była w środku (np. „pokaż dziś”), bez wychodzenia poza oś. */
export function wysrodkujOkno(okno: Okno, zakres: Okno, data: DataISO): Okno {
  const dni = dlugoscOkna(okno);
  return wZakresie(dodajDni(data, -Math.floor(dni / 2)), dni, zakres);
}
