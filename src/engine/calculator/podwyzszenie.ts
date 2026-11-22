/**
 * Podwyższenie zasiłku macierzyńskiego do kwoty świadczenia rodzicielskiego (UZ art. 31 ust. 3a–3c).
 * Liczone dla osoby za miesiąc kalendarzowy, według praktyki ZUS:
 *  - [ZUS-podw] zus.pl, „Podwyższenie kwoty zasiłku macierzyńskiego do wysokości świadczenia rodzicielskiego”,
 *    https://www.zus.pl/-/podwyzszenie-kwoty-zasilku-macierzynskiego-do-wysokosci-swiadczenia-rodzicielskiego
 *  - Poradnik ZUS 2026 dla rodziców (materiały ZUS dla uczestników), s. 19.
 * Kwoty liczymy na groszach całkowitych.
 */
import { dniWMiesiacu, liczbaDni, ostatniDzienMiesiaca, pierwszyDzienMiesiaca, pozniejsza, wczesniejsza } from '../daty';
import { doGrosza } from '../pieniadze';
import type { MiesiacISO, Parametry, TypOdcinka } from '../types';
import { scalOkresy, type Okres } from './kawalki';
import { zl } from './liczby';

/**
 * Kwotę świadczenia za część miesiąca zaokrągla się „do 10 gr w górę” ([ZUS-podw], część miesiąca, przykład 3).
 * Reguła ZUS, nie parametr z przepisów, więc stała w kodzie.
 */
const ZAOKRAGLENIE_W_GORE_GROSZE = 10;

const grosze = (kwota: number): number => Math.round(kwota * 100);

/**
 * Czy zasiłek za odcinek tego typu podwyższa się do kwoty świadczenia rodzicielskiego.
 * UZ art. 31 ust. 3a obejmuje zasiłek „obliczony zgodnie z ust. 1–3”: macierzyński, na warunkach macierzyńskiego,
 * uzupełniający, rodzicielski. Urlop ojcowski i zasiłek w wysokości zasiłku macierzyńskiego są wyłączone
 * w praktyce ZUS ([ZUS-podw], wprost). Zasiłek chorobowy w ciąży to inny zasiłek.
 */
export function czyZPodwyzszeniem(typ: TypOdcinka): boolean {
  return typ === 'macierzynski' || typ === 'na_warunkach_macierzynskiego' || typ === 'uzupelniajacy' || typ === 'rodzicielski';
}

/** Liczba różnych dni miesiąca objętych okresami (dzień z dwóch tytułów liczy się raz). */
export function dniZasilkuWMiesiacu(okresy: Okres[], miesiac: MiesiacISO): number {
  const pierwszy = pierwszyDzienMiesiaca(miesiac);
  const ostatni = ostatniDzienMiesiaca(miesiac);
  const wMiesiacu = okresy
    .map((o) => ({ od: pozniejsza(o.od, pierwszy), do: wczesniejsza(o.do, ostatni) }))
    .filter((o) => o.od <= o.do);
  return scalOkresy(wMiesiacu).reduce((s, o) => s + liczbaDni(o.od, o.do), 0);
}

/**
 * Kwota świadczenia rodzicielskiego, do której podwyższa się zasiłek za miesiąc.
 * Za wszystkie dni miesiąca: pełna kwota (UZ art. 31 ust. 3a). Za część miesiąca (UZ art. 31 ust. 3c):
 * kwota ÷ liczba dni kalendarzowych miesiąca, do 1 gr według ogólnych zasad, × dni zasiłku, w górę do 10 gr ([ZUS-podw]).
 */
export function kwotaOdniesienia(miesiac: MiesiacISO, dniZasilku: number, p: Parametry): number {
  const pelna = grosze(p.kwoty.swiadczenieRodzicielskie);
  const dniMiesiaca = dniWMiesiacu(miesiac);
  if (dniZasilku >= dniMiesiaca) return doGrosza(pelna / 100);
  const dzienna = Math.round(pelna / dniMiesiaca);
  const zaDni = Math.ceil((dzienna * Math.max(0, dniZasilku)) / ZAOKRAGLENIE_W_GORE_GROSZE) * ZAOKRAGLENIE_W_GORE_GROSZE;
  return doGrosza(zaDni / 100);
}

/**
 * Wzór kwoty odniesienia za część miesiąca do ścieżki wyliczenia, np.
 * '1000,00 zł ÷ 31 = 32,26 zł; × 28 dni = 903,28 zł, w górę do dziesiątek groszy'; undefined za cały miesiąc.
 */
export function wzorKwotyOdniesienia(miesiac: MiesiacISO, dniZasilku: number, p: Parametry): string | undefined {
  const dniMiesiaca = dniWMiesiacu(miesiac);
  if (dniZasilku >= dniMiesiaca) return undefined;
  const dzienna = Math.round(grosze(p.kwoty.swiadczenieRodzicielskie) / dniMiesiaca);
  return `${zl(p.kwoty.swiadczenieRodzicielskie)} ÷ ${dniMiesiaca} = ${zl(doGrosza(dzienna / 100))}; × ${dniZasilku} dni = ` +
    `${zl(doGrosza((dzienna * dniZasilku) / 100))}, w górę do dziesiątek groszy`;
}

export interface PodwyzszenieMiesiaca {
  kwotaOdniesienia: number;
  /** Czy zasiłek przysługuje za wszystkie dni miesiąca. */
  calyMiesiac: boolean;
  /** Łączny zasiłek osoby za miesiąc (wszystkie tytuły) po zaliczce na podatek. */
  poZaliczce: number;
  /** Kwota odniesienia − zasiłek po zaliczce, gdy dodatnia; od podwyższenia nie ma zaliczki ([ZUS-podw]). */
  podwyzszenie: number;
}

/**
 * Podwyższenie za miesiąc dla jednej osoby. Porównujemy łączną kwotę zasiłków osoby ze wszystkich tytułów
 * pomniejszoną o zaliczkę na podatek (Poradnik ZUS 2026, s. 19; [ZUS-podw], przykład 4 i 7).
 */
export function podwyzszenieMiesiaca(
  miesiac: MiesiacISO,
  dniZasilku: number,
  brutto: number,
  zaliczka: number,
  p: Parametry,
): PodwyzszenieMiesiaca {
  const odniesienie = grosze(kwotaOdniesienia(miesiac, dniZasilku, p));
  const poZaliczce = grosze(brutto) - grosze(zaliczka);
  return {
    kwotaOdniesienia: doGrosza(odniesienie / 100),
    calyMiesiac: dniZasilku >= dniWMiesiacu(miesiac),
    poZaliczce: doGrosza(poZaliczce / 100),
    podwyzszenie: doGrosza(Math.max(0, odniesienie - poZaliczce) / 100),
  };
}
