/**
 * Wymiar uzupełniającego urlopu macierzyńskiego – TOR A, zadanie A1 [KP art. 180²].
 *
 * Numeracja dni: dzień porodu = 1. dzień po porodzie (1. dzień życia), bo urlop macierzyński
 * po porodzie zaczyna się w dniu porodu [KP art. 183¹ § 2]. Stąd n-ty dzień = poród + (n − 1),
 * a „upływ k-tego tygodnia po porodzie” = dzień 7k. Dzień porodu wlicza się do pobytu w szpitalu.
 * NIEJASNE (pytanie nr 24): czy ZUS liczy tak samo. Liczymy też wariant bez dnia porodu
 * (1. dzień = dzień po porodzie) i gdy wynik się różni, dodajemy uwagę „do potwierdzenia”.
 */
import { dodajDni, roznicaDni } from '../daty';
import type { DataISO, Dziecko, Komunikat, Parametry } from '../types';

const PRZEPIS = 'KP art. 180² § 1';

interface Okno {
  /** Pierwszy liczony dzień po porodzie (numeracja od 1). */
  od: number;
  /** Ostatni liczony dzień po porodzie. */
  do: number;
  /** § 1 pkt 3: wymagany pobyt przez kolejne dni, z których pierwszy wypada w [od, pierwszyDo]. */
  warunek?: { pierwszyDo: number; minKolejnych: number };
}

/**
 * Numery dni po porodzie, w których dziecko było w szpitalu, nie dalej niż `doDnia`.
 * `bezDniaPorodu` = wariant, w którym 1. dzień to dzień po porodzie, a dzień porodu się nie liczy.
 */
function dniPobytu(dziecko: Dziecko, porod: DataISO, doDnia: number, bezDniaPorodu: boolean, odDaty?: DataISO): Set<number> {
  const przesuniecie = bezDniaPorodu ? 0 : 1;
  const dni = new Set<number>();
  for (const pobyt of dziecko.szpital ?? []) {
    let d = pobyt.od < porod ? porod : pobyt.od;
    // KP art. 183 § 3¹: przy przyjęciu dziecka liczy się tylko pobyt po przyjęciu na wychowanie.
    if (odDaty !== undefined && d < odDaty) d = odDaty;
    for (; d <= pobyt.do; d = dodajDni(d, 1)) {
      const nr = roznicaDni(porod, d) + przesuniecie;
      if (nr > doDnia) break;
      if (nr >= 1) dni.add(nr);
    }
  }
  return dni;
}

function spelniaWarunek(dni: Set<number>, okno: Okno): boolean {
  if (!okno.warunek) return true;
  // KP art. 180² § 1 pkt 3: pobyt co najmniej 2 kolejne dni, pierwszy z nich od 5. do 28. dnia po porodzie.
  for (let start = okno.od; start <= okno.warunek.pierwszyDo; start++) {
    let ciag = 0;
    while (ciag < okno.warunek.minKolejnych && dni.has(start + ciag)) ciag++;
    if (ciag >= okno.warunek.minKolejnych) return true;
  }
  return false;
}

/** Liczba dni pobytu dziecka najdłużej hospitalizowanego w oknie [KP art. 180² § 2–3]. */
function najdluzszyPobyt(dzieci: Dziecko[], porod: DataISO, okno: Okno, bezDniaPorodu: boolean, odDaty?: DataISO): number {
  let najwiecej = 0;
  for (const dziecko of dzieci) {
    const dni = dniPobytu(dziecko, porod, okno.do, bezDniaPorodu, odDaty);
    if (!spelniaWarunek(dni, okno)) continue;
    let liczone = 0;
    for (const nr of dni) if (nr >= okno.od) liczone++;
    najwiecej = Math.max(najwiecej, liczone);
  }
  return najwiecej;
}

/**
 * Liczba tygodni uzupełniającego urlopu macierzyńskiego.
 * @param porod dzień porodu (przy przyjęciu dziecka: data urodzenia dziecka)
 * @param odDaty przy przyjęciu dziecka: data przyjęcia – wcześniejszy pobyt się nie liczy [KP art. 183 § 3¹]
 */
export function ustalUzupelniajacy(
  dzieci: Dziecko[],
  porod: DataISO,
  p: Parametry,
  odDaty?: DataISO,
): { tyg: number; uwagi: Komunikat[] } {
  // Martwo urodzone dzieci nie wchodzą ani do najniższej masy, ani do najdłuższego pobytu.
  const zywe = dzieci.filter((d) => !d.martwe);
  if (!zywe.some((d) => (d.szpital ?? []).length > 0)) return { tyg: 0, uwagi: [] };

  const u = p.limity.uzupelniajacy;
  const granica = p.wymiaryTyg.uzupelniajacyGranicaTyg;
  const uwagi: Komunikat[] = [];

  // KP art. 180² § 2: przy porodzie mnogim liczy się najniższa masa urodzeniowa.
  const masy = zywe.map((d) => d.masaG).filter((m): m is number => m !== undefined);
  const masa = masy.length > 0 ? Math.min(...masy) : undefined;
  const tygodnie = zywe.map((d) => d.tydzienCiazy).filter((t): t is number => t !== undefined);
  // Tydzień ciąży to cecha porodu; przy rozbieżnych danych bierzemy wcześniejszy (korzystniejszy dla rodzica).
  const tydzien = tygodnie.length > 0 ? Math.min(...tygodnie) : undefined;

  // NIEJASNE (pytanie nr 24): `tydzienCiazy` to ukończone tygodnie, więc 28 = „po ukończeniu 28. tygodnia”.
  let okno: Okno;
  if ((tydzien !== undefined && tydzien < u.tydzienCiazyWczesniak) || (masa !== undefined && masa <= u.masaGWczesniak)) {
    // KP art. 180² § 1 pkt 1: przed ukończeniem 28. tygodnia lub ≤ 1000 g – do upływu 15. tygodnia po porodzie.
    okno = { od: 1, do: granica.ponizej28LubDo1000g * 7 };
  } else if (tydzien !== undefined && tydzien < u.tydzienCiazyDonoszone) {
    // KP art. 180² § 1 pkt 2: po ukończeniu 28. i przed ukończeniem 37. tygodnia, > 1000 g – do upływu 8. tygodnia.
    okno = { od: 1, do: granica.od28Do37 * 7 };
  } else {
    // KP art. 180² § 1 pkt 3: po ukończeniu 37. tygodnia – pobyt od 5. dnia do upływu 8. tygodnia po porodzie.
    okno = {
      od: u.donoszoneOdDniaZycia,
      do: granica.od37 * 7,
      warunek: { pierwszyDo: u.donoszonePierwszyDzienDo, minKolejnych: u.donoszoneMinKolejnychDni },
    };
    if (tydzien === undefined) {
      uwagi.push({
        kod: 'UZUP_BRAK_TYGODNIA_CIAZY',
        poziom: 'info',
        tresc:
          'Nie wiemy, w którym tygodniu ciąży urodziło się dziecko. Urlop uzupełniający policzyliśmy jak dla dziecka donoszonego. Jeśli dziecko urodziło się wcześniej, proszę wpisać tydzień ciąży – urlop może być dłuższy.',
        przepis: PRZEPIS,
      });
    }
  }

  // KP art. 180² § 1, § 3: tydzień urlopu za każdy tydzień pobytu, okresy się sumuje, niepełny tydzień w górę.
  const tyg = Math.ceil(najdluzszyPobyt(zywe, porod, okno, false, odDaty) / 7);
  const tygBezDniaPorodu = Math.ceil(najdluzszyPobyt(zywe, porod, okno, true, odDaty) / 7);

  // NIEJASNE (pytanie nr 24): czy dzień porodu liczy się do pobytu i numeracji dni po porodzie.
  if (tyg !== tygBezDniaPorodu) {
    uwagi.push({
      kod: 'DO_POTWIERDZENIA_W_ZUS',
      poziom: 'info',
      tresc:
        'Do pobytu dziecka w szpitalu wliczyliśmy dzień porodu. Bez tego dnia urlop uzupełniający miałby inną liczbę tygodni. Czy ten dzień się wlicza? To wymaga potwierdzenia w ZUS.',
      przepis: PRZEPIS,
    });
  }

  return { tyg, uwagi };
}
