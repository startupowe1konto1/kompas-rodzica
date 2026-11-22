/**
 * Kiedy pokazać kartę „Umowa skończyła się przed porodem: co można zrobić” (UtrataPracyWCiazy.tsx).
 * Czysta funkcja: bez Reacta, daty przez `src/engine/daty.ts`. Nie rozstrzyga prawa do świadczeń – to robi silnik
 * (`api.uprawnienia`); tu tylko wybieramy, które informacje pokazać.
 */
import { czyPoprawna, roznicaDni } from '../../engine/daty';
import type { DataISO, PrzyczynaUstania, RodzajTytulu, Rodzina, Swiadczenie, WynikUprawnien } from '../../engine/types';

/** Świadczenia, które w tej karcie znaczą „jest zasiłek macierzyński” (poród albo przyjęcie dziecka). */
const ZASILEK_MACIERZYNSKI: readonly Swiadczenie[] = ['macierzynski', 'na_warunkach_macierzynskiego'];

/** Role, dla których zasiłek macierzyński zależy od własnego ubezpieczenia w dniu porodu albo przyjęcia dziecka. */
const ROLE: readonly string[] = ['matka', 'przyjmujacy'];

const FIRMA: readonly RodzajTytulu[] = ['dzialalnosc', 'wspolpraca'];

/** Punkty karty. Każdy ma w karcie przepis albo znacznik „do potwierdzenia w ZUS”. */
export type PunktUtratyPracy =
  /** KP art. 177 § 1 i § 4; UZ art. 30 ust. 1 pkt 2 (wyrok sądu). Tylko etat. */
  | 'zakaz_wypowiedzenia'
  /** UZ art. 7, art. 8 ust. 1–2, art. 13 ust. 1 pkt 2 i 4. */
  | 'chorobowy_po_ustaniu'
  /** UZ art. 30 ust. 1 pkt 1 i ust. 3. Tylko poród i umowa (nie działalność). */
  | 'upadlosc_likwidacja'
  /** Alternatywa z silnika (`Uprawnienie.alternatywa`). */
  | 'swiadczenie_rodzicielskie'
  /** Do potwierdzenia w ZUS (pyt. 72). */
  | 'urzad_pracy'
  /** Do potwierdzenia w ZUS (pyt. 71). Tylko działalność. */
  | 'zawieszenie_dzialalnosci';

export interface TytulPoUstaniu {
  /** Numer tytułu w `osoby[i].tytuly` (do linku do pytania w ankiecie). */
  indeks: number;
  rodzaj: RodzajTytulu;
  /** Ostatni dzień ubezpieczenia z tego tytułu. */
  data: DataISO;
  przyczyna?: PrzyczynaUstania;
}

export interface UtrataPracyOsoby {
  osobaId: string;
  /** Numer osoby w `rodzina.osoby` (do linku do pytania w ankiecie). */
  osobaIndeks: number;
  /** true – poród (ciąża), false – przyjęcie dziecka. */
  porod: boolean;
  /** Tytuły, które ustały przed dniem porodu albo przyjęcia dziecka. */
  tytuly: TytulPoUstaniu[];
  /** Co zamiast zasiłku – zdanie z silnika (np. świadczenie rodzicielskie). */
  alternatywa?: string;
  punkty: PunktUtratyPracy[];
}

/**
 * Osoby, którym pokazujemy kartę: mama albo osoba przyjmująca dziecko, której tytuł ubezpieczenia ustał przed dniem
 * porodu albo przyjęcia dziecka (`ustanie.data` wcześniej niż `zdarzenie.data`), a silnik nie przyznał jej zasiłku
 * macierzyńskiego (żadne uprawnienie `macierzynski` / `na_warunkach_macierzynskiego` nie ma `przysluguje: true`).
 * „Warunkowo” liczymy jak brak: wtedy też warto znać możliwości. Bez wyniku silnika – pusta lista.
 */
export function utrataPracyPrzedZdarzeniem(rodzina: Rodzina | null, wynik: WynikUprawnien | null): UtrataPracyOsoby[] {
  const dataZdarzenia = rodzina?.zdarzenie?.data;
  if (!rodzina || !wynik || !dataZdarzenia || !czyPoprawna(dataZdarzenia)) return [];
  const porod = rodzina.zdarzenie.typ === 'porod';

  const lista: UtrataPracyOsoby[] = [];
  rodzina.osoby.forEach((osoba, osobaIndeks) => {
    if (!ROLE.includes(osoba.rola)) return;

    const tytuly: TytulPoUstaniu[] = [];
    (osoba.tytuly ?? []).forEach((t, indeks) => {
      const data = t.ustanie?.data;
      // Ostatni dzień ubezpieczenia przed dniem porodu / przyjęcia: w tym dniu z tego tytułu nie ma już ubezpieczenia.
      if (data && czyPoprawna(data) && roznicaDni(data, dataZdarzenia) > 0) {
        tytuly.push({ indeks, rodzaj: t.rodzaj, data, ...(t.ustanie?.przyczyna ? { przyczyna: t.ustanie.przyczyna } : {}) });
      }
    });
    if (tytuly.length === 0) return;

    const swoje = wynik.uprawnienia.filter((u) => u.osobaId === osoba.id);
    const glowne = swoje.filter((u) => ZASILEK_MACIERZYNSKI.includes(u.swiadczenie));
    if (glowne.some((u) => u.przysluguje === true)) return;

    const alternatywa = (glowne.find((u) => u.alternatywa) ?? swoje.find((u) => u.alternatywa))?.alternatywa;
    const etat = tytuly.some((t) => t.rodzaj === 'umowa_o_prace');
    const umowa = tytuly.some((t) => !FIRMA.includes(t.rodzaj));
    const firma = tytuly.some((t) => FIRMA.includes(t.rodzaj));

    const punkty: PunktUtratyPracy[] = [];
    if (etat) punkty.push('zakaz_wypowiedzenia');
    punkty.push('chorobowy_po_ustaniu');
    if (porod && umowa) punkty.push('upadlosc_likwidacja');
    if (alternatywa) punkty.push('swiadczenie_rodzicielskie');
    punkty.push('urzad_pracy');
    if (firma) punkty.push('zawieszenie_dzialalnosci');

    lista.push({ osobaId: osoba.id, osobaIndeks, porod, tytuly, ...(alternatywa ? { alternatywa } : {}), punkty });
  });
  return lista;
}
