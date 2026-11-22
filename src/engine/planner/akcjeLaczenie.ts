/**
 * Łączenie urlopu rodzicielskiego z pracą – TOR A, zadanie A6, decyzje D10 (z poprawką integratora: dni bazowe
 * w górę) i D16
 * (docs/superpowers/plans/2026-11-21-tor-a.md).
 */
import { czyPoprawna, czyWOkresie, koniecOdcinka, liczbaDni } from '../daty';
import { ubezpieczenieWDniu } from '../eligibility/ubezpieczenie';
import type { Komunikat, Odcinek, Parametry, Plan, Rodzina } from '../types';
import { niemozliwe, znajdzOsobe } from './akcjeWspolne';

/**
 * Najdłuższy łączny wymiar urlopu rodzicielskiego rodziny przy łączeniu z pracą, w tygodniach.
 * KP art. 182¹f § 1 (82 / 86 tygodni), § 1¹ („Za życiem”: 130 / 134 tygodnie).
 */
function maxZPracaTyg(rodzina: Rodzina, p: Parametry): number {
  const limity = p.wymiaryTyg.rodzicielskiMaxZPraca;
  const wiecejDzieci = rodzina.zdarzenie.dzieci.length > 1; // KP art. 182¹f § 1 pkt 2: przypadki z art. 180 § 1 pkt 2–5
  const zaZyciem = rodzina.zdarzenie.dzieci.some((d) => d.zaZyciem === true);
  if (zaZyciem) return wiecejDzieci ? limity.zaZyciemWiecej : limity.zaZyciemJedno;
  return wiecejDzieci ? limity.wiecej : limity.jedno;
}

/** Margines na błąd liczb zmiennoprzecinkowych (np. 90 × 0,7 = 62,99999999999999). */
const EPS = 1e-9;

/** Czy wymiar pracy oznacza łączenie: w przedziale (0, 1). Inne wartości traktujemy jak brak łączenia. */
function czyLaczenie(w: number | undefined): w is number {
  return w !== undefined && Number.isFinite(w) && w > 0 && w < 1;
}

/**
 * Dni „bazowe” odcinka łączonego z pracą – ile dni puli rodzicielskiego zużywa (D10 po zmianie integratora):
 * ceil(dni × (1 − w)). Zaokrąglenie w górę sprawia, że łączenie da się cofnąć bez gubienia dni:
 * dniBazoweLaczenia(dlugoscPrzyLaczeniu(b, w), w) === b. Bez łączenia (w = 0) – wszystkie dni.
 * KP art. 182¹f § 2, § 4.
 */
export function dniBazoweLaczenia(dni: number, w: number): number {
  if (!czyLaczenie(w)) return dni;
  return Math.ceil(dni * (1 - w) - EPS);
}

/**
 * Długość odcinka łączonego z pracą: floor(bazowe ÷ (1 − w)) dni (D16; KP art. 182¹f § 7 – wydłużenie,
 * które też łączy się z pracą, dzieli się przez 1 − wymiar; § 4 – niepełny dzień się pomija). Bez łączenia – bazowe.
 */
export function dlugoscPrzyLaczeniu(bazowe: number, w: number): number {
  if (!czyLaczenie(w)) return bazowe;
  return Math.floor(bazowe / (1 - w) + EPS);
}

/**
 * Czy osoba w dniu `o.od` jest pracownikiem na etacie z tytułu, z którego płynie ten urlop:
 * tytuł odcinka (`tytulId`), a gdy go brak – tytuł z `ubezpieczenieWDniu`.
 */
function pracownikWDniu(rodzina: Rodzina, o: Odcinek, p: Parametry): boolean {
  const osoba = znajdzOsobe(rodzina, o.osobaId);
  if (!osoba) return false;
  const tytulId = o.tytulId ?? ubezpieczenieWDniu(osoba, o.od, p, rodzina).tytulId;
  const tytul = osoba.tytuly.find((t) => t.id === tytulId);
  return tytul !== undefined && tytul.rodzaj === 'umowa_o_prace' && czyWOkresie(o.od, tytul.od, tytul.do);
}

/**
 * `polacz_z_praca`: ustawia wymiar pracy na odcinku rodzicielskiego i przelicza jego długość.
 *
 * - Dni bazowe liczone ze starego wymiaru (`dniBazoweLaczenia`), nowa długość z nowego (`dlugoscPrzyLaczeniu`);
 *   wymiar 0 cofa łączenie.
 * - Łączny rodzicielski rodziny nie dłuższy niż `rodzicielskiMaxZPraca` (KP art. 182¹f § 1, § 1¹); przycięcie
 *   nigdy nie schodzi poniżej dni bazowych (tego przekroczenia pilnuje walidacja).
 */
export function polaczZPraca(rodzina: Rodzina, plan: Plan, o: Odcinek, wymiarPracy: number, p: Parametry): Plan | Komunikat {
  // KP art. 182¹e § 1: łączyć z pracą można tylko urlop rodzicielski
  if (o.typ !== 'rodzicielski') {
    return niemozliwe('Z pracą można łączyć tylko urlop rodzicielski.', o.id, 'KP art. 182¹e § 1');
  }
  const max = p.limity.maxWymiarPracyPrzyLaczeniu;
  // KP art. 182¹e § 1: praca w wymiarze nie wyższym niż połowa pełnego wymiaru czasu pracy; 0 = cofnięcie łączenia
  if (!Number.isFinite(wymiarPracy) || wymiarPracy < 0 || wymiarPracy > max) {
    return niemozliwe(
      `W czasie urlopu rodzicielskiego można pracować najwyżej na ${String(max).replace('.', ',')} etatu. Proszę wybrać mniejszy wymiar albo 0, żeby zrezygnować z pracy.`,
      o.id,
      'KP art. 182¹e § 1',
    );
  }
  // KP art. 182¹e § 1: łączyć urlop z pracą może pracownik, u pracodawcy, który udzielił urlopu.
  // NIEJASNE (pytanie nr 10): zlecenie i działalność – nie wiemy, czy zasiłek się wydłuża; nie zgadujemy.
  // Cofnięcie łączenia (wymiar 0) jest zawsze możliwe.
  if (wymiarPracy > 0 && !pracownikWDniu(rodzina, o, p)) {
    return niemozliwe(
      'Urlop rodzicielski można łączyć z pracą przy umowie o pracę – u pracodawcy, który udzielił tego urlopu. ' +
        'Przy umowie zlecenia albo działalności to wymaga potwierdzenia w ZUS.',
      o.id,
      'KP art. 182¹e § 1',
    );
  }

  const inne = plan.odcinki.filter((x) => x.typ === 'rodzicielski' && x.id !== o.id);
  const zla = inne.find((x) => !czyPoprawna(x.od) || !czyPoprawna(x.do));
  if (zla) return niemozliwe('W planie jest urlop z niepoprawną datą. Proszę go poprawić i spróbować jeszcze raz.', zla.id);

  const bazowe = Math.max(1, dniBazoweLaczenia(liczbaDni(o.od, o.do), o.wymiarPracy ?? 0));
  const policzona = dlugoscPrzyLaczeniu(bazowe, wymiarPracy);
  const limitDni = maxZPracaTyg(rodzina, p) * 7; // KP art. 183¹ § 1 odpowiednio: tydzień = 7 dni
  const sumaInnych = inne.reduce((s, x) => s + liczbaDni(x.od, x.do), 0);
  const nowaDlugosc = Math.min(policzona, Math.max(bazowe, limitDni - sumaInnych));

  const nowy: Odcinek = { ...o, do: koniecOdcinka(o.od, nowaDlugosc) };
  if (wymiarPracy === 0) delete nowy.wymiarPracy;
  else nowy.wymiarPracy = wymiarPracy;
  return { ...plan, odcinki: plan.odcinki.map((x) => (x.id === o.id ? nowy : x)) };
}
