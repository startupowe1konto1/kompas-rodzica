/**
 * KTO WYPŁACA ZASIŁEK – TOR D (Mikołaj).
 *
 * UZ art. 61 ust. 1: prawo do zasiłku ustala i zasiłek wypłaca
 *  - pkt 1: płatnik składek, który zgłasza do ubezpieczenia chorobowego powyżej 20 ubezpieczonych
 *    (próg: `Parametry.limity.progUbezpieczonychPlatnika`; liczba ze stanu na 30 listopada poprzedniego roku, ust. 2);
 *  - pkt 2: ZUS – ubezpieczonym małych płatników (lit. a), osobom prowadzącym działalność i współpracującym (lit. b),
 *    osobom uprawnionym do zasiłku za okres po ustaniu ubezpieczenia (lit. d).
 *
 * Czy płatnik zgłasza ponad 20 osób, wie tylko płatnik – w kontrakcie to `TytulUbezpieczenia.platnikPowyzej20`
 * (eZUS tej liczby nie pokazuje, docs/zrodla-danych.md).
 *
 * UBEZPIECZENIE W DNIU – co bierzemy z toru A (`src/engine/eligibility/ubezpieczenie.ts`):
 *  - `koniecTytulu`, `poczatekChorobowego` – te same reguły dat tytułu co w A2;
 *  - `przedluzenieDoPorodu` – umowa na czas określony przedłużona do porodu (KP art. 177 § 3, § 3¹), patrz
 *    `uwzglednijPrzedluzenie`.
 * Samego `ubezpieczenieWDniu` nie używamy: zwraca jeden tytuł, a D2 potrzebuje wszystkich naraz (etat i zlecenie
 * z chorobowym to dwóch płatników, dwa wpisy „kto wypłaca” i dwa wnioski). Dlatego sprawdzamy każdy tytuł osobno.
 */
import { dodajDni, czyWOkresie } from '../daty';
import { koniecTytulu, poczatekChorobowego, przedluzenieDoPorodu } from '../eligibility/ubezpieczenie';
import type { DataISO, KtoWyplaca, Odcinek, Osoba, Parametry, Plan, Rodzina, TypOdcinka, TytulUbezpieczenia } from '../types';

export { koniecTytulu };

/**
 * Odcinki, za które płynie zasiłek macierzyński (KP art. 184, UZ art. 29) albo zasiłek w wysokości zasiłku
 * macierzyńskiego (UZ art. 30 ust. 3). Zasiłek chorobowy w ciąży ma osobne dokumenty (e-ZLA) – poza D2.
 */
export const TYPY_ZASILKU_MACIERZYNSKIEGO: readonly TypOdcinka[] = [
  'w_wys_macierzynskiego',
  'macierzynski',
  'na_warunkach_macierzynskiego',
  'uzupelniajacy',
  'rodzicielski',
  'ojcowski',
];

export function czyOdcinekZasilkowy(o: Odcinek): boolean {
  return TYPY_ZASILKU_MACIERZYNSKIEGO.includes(o.typ);
}

/**
 * Rodzina z umowami przedłużonymi do porodu (KP art. 177 § 3; reguły przedłużenia: `przedluzenieDoPorodu`, tor A).
 * Przedłużona umowa trwa w D2 do dnia przed porodem: część urlopu macierzyńskiego przed porodem bierze się
 * u pracodawcy (wniosek do niego, zasiłek według UZ art. 61 ust. 1), a od dnia porodu zasiłek macierzyński
 * przysługuje „po ustaniu ubezpieczenia” (UZ art. 30 ust. 4), więc wypłaca go ZUS (UZ art. 61 ust. 1 pkt 2 lit. d).
 * Tak opisuje to też EC-05 w ZUS-BRIEF.md.
 * NIEJASNE (do dopisania w docs/pytania-do-mentora.md): kto wypłaca zasiłek za sam dzień porodu, w którym umowa
 * jeszcze trwa – duży pracodawca czy już ZUS. Przyjmujemy ZUS, zgodnie z brzmieniem UZ art. 30 ust. 4.
 * Funkcja jest idempotentna: drugie wywołanie niczego nie zmienia.
 */
export function uwzglednijPrzedluzenie(rodzina: Rodzina, p: Parametry): Rodzina {
  const doKiedy = dodajDni(rodzina.zdarzenie.data, -1);
  let zmiana = false;
  const osoby = rodzina.osoby.map((osoba) => {
    const tytuly = osoba.tytuly.map((t) => {
      if (t.do === doKiedy || przedluzenieDoPorodu(t, rodzina, p) !== 'przedluzona') return t;
      zmiana = true;
      // Umowa skończyłaby się z upływem czasu – to samo ustanie przesuwa się razem z nią.
      const ustanie = t.ustanie?.przyczyna === 'koniec_umowy' ? { ustanie: { ...t.ustanie, data: doKiedy } } : {};
      return { ...t, do: doKiedy, ...ustanie };
    });
    return tytuly.some((t, i) => t !== osoba.tytuly[i]) ? { ...osoba, tytuly } : osoba;
  });
  return zmiana ? { ...rodzina, osoby } : rodzina;
}

/**
 * Czy w dniu `dzien` osoba podlega ubezpieczeniu chorobowemu z tytułu `t` (UZ art. 29 ust. 1). Przedłużenie umowy
 * do porodu uwzględnia `uwzglednijPrzedluzenie`, wywoływane na wejściu każdej publicznej funkcji D2.
 */
export function ubezpieczonyWDniu(t: TytulUbezpieczenia, dzien: DataISO): boolean {
  if (t.chorobowe === 'brak') return false;
  return czyWOkresie(dzien, poczatekChorobowego(t), koniecTytulu(t));
}

/**
 * Z których tytułów płynie zasiłek za odcinek. Kolejność: tytuł wskazany w odcinku; tytuły z chorobowym
 * trwające w pierwszym dniu odcinka; a gdy takich nie ma – ostatni tytuł z chorobowym, który ustał wcześniej
 * (zasiłek po ustaniu ubezpieczenia, UZ art. 30). O samym prawie do zasiłku decyduje tor A.
 * Urlop wychowawczy: tor A zwraca wtedy `ubezpieczona: false` (kod POROD_W_TRAKCIE_WYCHOWAWCZEGO), ale umowa
 * o pracę i tak jest tytułem zasiłku macierzyńskiego (UZ art. 29 ust. 1: poród „w okresie urlopu wychowawczego”),
 * a zasiłek wypłaca ten sam płatnik. Dlatego tutaj umowy w czasie urlopu wychowawczego nie pomijamy.
 */
export function tytulyDlaOdcinka(osoba: Osoba, o: Odcinek): TytulUbezpieczenia[] {
  if (o.tytulId !== undefined) {
    const wskazany = osoba.tytuly.find((t) => t.id === o.tytulId);
    return wskazany ? [wskazany] : [];
  }
  const trwajace = osoba.tytuly.filter((t) => ubezpieczonyWDniu(t, o.od));
  if (trwajace.length > 0) return trwajace;
  const zakonczone = osoba.tytuly
    .filter((t) => t.chorobowe !== 'brak' && (koniecTytulu(t) ?? o.od) < o.od)
    .sort((a, b) => (koniecTytulu(b) as DataISO).localeCompare(koniecTytulu(a) as DataISO));
  return zakonczone.slice(0, 1);
}

/** Pracownik w rozumieniu Kodeksu pracy – tylko on składa wnioski o urlopy do pracodawcy. */
export function czyPracownik(t: TytulUbezpieczenia): boolean {
  return t.rodzaj === 'umowa_o_prace';
}

/**
 * Umowa o pracę, która trwa w dniu `dzien` – wtedy wnioski o urlop idą do tego pracodawcy. Liczy się sam stosunek
 * pracy, także w czasie urlopu wychowawczego (umowa wtedy trwa, choć nie daje ubezpieczenia chorobowego).
 */
export function pracodawcaWDniu(osoba: Osoba, dzien: DataISO): TytulUbezpieczenia | undefined {
  return osoba.tytuly.find((t) => czyPracownik(t) && czyWOkresie(dzien, t.od, koniecTytulu(t)));
}

export type PrzyczynaPlatnika = 'dzialalnosc' | 'po_ustaniu' | 'ponad_prog' | 'do_progu' | 'brak_danych';

const PRZEPIS: Record<PrzyczynaPlatnika, string> = {
  ponad_prog: 'UZ art. 61 ust. 1 pkt 1',
  do_progu: 'UZ art. 61 ust. 1 pkt 2 lit. a',
  brak_danych: 'UZ art. 61 ust. 1 pkt 2 lit. a',
  dzialalnosc: 'UZ art. 61 ust. 1 pkt 2 lit. b',
  po_ustaniu: 'UZ art. 61 ust. 1 pkt 2 lit. d',
};

/** Kto wypłaca zasiłek z tytułu `t` za dzień `dzien` i dlaczego. */
export function ktoWyplacaWDniu(t: TytulUbezpieczenia, dzien: DataISO): { kto: 'platnik' | 'ZUS'; przyczyna: PrzyczynaPlatnika } {
  // UZ art. 61 ust. 1 pkt 2 lit. b: działalność i osoby współpracujące – zawsze ZUS.
  if (t.rodzaj === 'dzialalnosc' || t.rodzaj === 'wspolpraca') return { kto: 'ZUS', przyczyna: 'dzialalnosc' };
  // UZ art. 61 ust. 1 pkt 2 lit. d: okres po ustaniu ubezpieczenia – ZUS.
  const koniec = koniecTytulu(t);
  if (koniec !== undefined && koniec < dzien) return { kto: 'ZUS', przyczyna: 'po_ustaniu' };
  // UZ art. 61 ust. 1 pkt 1 i pkt 2 lit. a: według liczby ubezpieczonych zgłaszanych przez płatnika.
  if (t.platnikPowyzej20 === true) return { kto: 'platnik', przyczyna: 'ponad_prog' };
  if (t.platnikPowyzej20 === false) return { kto: 'ZUS', przyczyna: 'do_progu' };
  // Brak danej: przyjmujemy ZUS, bo wtedy przygotujemy ZAM, a mały płatnik i tak przekazuje wniosek do ZUS
  // (UZ art. 61b ust. 5). Rodzic dostaje prośbę, żeby sprawdził to w kadrach.
  return { kto: 'ZUS', przyczyna: 'brak_danych' };
}

/** Jak rodzic nazywa swojego płatnika składek. */
export function nazwaPlatnika(t: TytulUbezpieczenia): string {
  if (t.rodzaj === 'umowa_o_prace') return 'pracodawca';
  if (t.rodzaj === 'zlecenie') return 'zleceniodawca';
  return 'płatnik składek';
}

function dzienPl(d: DataISO): string {
  return `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
}

function powod(t: TytulUbezpieczenia, przyczyna: PrzyczynaPlatnika, p: Parametry, od?: DataISO): string {
  const kto = nazwaPlatnika(t);
  const Kto = kto.charAt(0).toUpperCase() + kto.slice(1);
  const prog = p.limity.progUbezpieczonychPlatnika;
  const zaswiadczenie = t.rodzaj === 'umowa_o_prace' ? 'Z-3' : t.rodzaj === 'zlecenie' ? 'Z-3a' : undefined;
  switch (przyczyna) {
    case 'ponad_prog':
      return `${Kto} zgłasza do ubezpieczenia chorobowego ponad ${prog} osób, więc sam wypłaca zasiłek.`;
    case 'do_progu':
      return (
        `${Kto} zgłasza do ubezpieczenia chorobowego najwyżej ${prog} osób, więc zasiłek wypłaci ZUS.` +
        (zaswiadczenie ? ` ${Kto} przekaże do ZUS zaświadczenie ${zaswiadczenie}.` : '')
      );
    case 'brak_danych':
      return (
        `Nie wiemy, ilu osób ubezpieczenie chorobowe zgłasza ${kto}. Warto zapytać o to w kadrach. ` +
        `Jeśli ponad ${prog}, zasiłek wypłaci ${kto}; jeśli mniej – ZUS. Na razie przyjmujemy, że ZUS, ` +
        `i przygotowujemy dokumenty dla obu sytuacji.`
      );
    case 'dzialalnosc':
      return t.rodzaj === 'wspolpraca'
        ? 'Osobie współpracującej przy działalności zasiłek wypłaca ZUS.'
        : 'Osobie prowadzącej działalność zasiłek wypłaca ZUS.';
    case 'po_ustaniu':
      return od
        ? `Od ${dzienPl(od)} zasiłek przysługuje już po zakończeniu ubezpieczenia, a wtedy wypłaca go ZUS.`
        : 'Zasiłek przysługuje po zakończeniu ubezpieczenia, a wtedy zawsze wypłaca go ZUS.';
  }
}

/**
 * Kto wypłaca zasiłek każdej osobie z każdego tytułu, z którego płynie zasiłek w tym planie.
 * Gdy tytuł kończy się w trakcie zasiłku wypłacanego przez płatnika, dochodzi drugi wpis: ZUS od dnia po końcu tytułu.
 */
export function ustalKtoWyplaca(rodzinaWejscie: Rodzina, plan: Plan, p: Parametry): KtoWyplaca[] {
  const rodzina = uwzglednijPrzedluzenie(rodzinaWejscie, p);
  const wynik: KtoWyplaca[] = [];
  for (const osoba of rodzina.osoby) {
    const okresy = new Map<string, { tytul: TytulUbezpieczenia; od: DataISO; do: DataISO }>();
    const odcinki = plan.odcinki.filter((o) => o.osobaId === osoba.id && czyOdcinekZasilkowy(o));
    for (const o of odcinki) {
      for (const tytul of tytulyDlaOdcinka(osoba, o)) {
        const okres = okresy.get(tytul.id);
        if (!okres) okresy.set(tytul.id, { tytul, od: o.od, do: o.do });
        else okresy.set(tytul.id, { tytul, od: o.od < okres.od ? o.od : okres.od, do: o.do > okres.do ? o.do : okres.do });
      }
    }
    for (const { tytul, od, do: doKiedy } of okresy.values()) {
      const naPoczatku = ktoWyplacaWDniu(tytul, od);
      wynik.push({ osobaId: osoba.id, tytulId: tytul.id, kto: naPoczatku.kto, powod: powod(tytul, naPoczatku.przyczyna, p), przepis: PRZEPIS[naPoczatku.przyczyna] });
      const koniec = koniecTytulu(tytul);
      if (naPoczatku.kto === 'platnik' && koniec !== undefined && koniec < doKiedy) {
        const poUstaniu = dodajDni(koniec, 1);
        wynik.push({ osobaId: osoba.id, tytulId: tytul.id, kto: 'ZUS', powod: powod(tytul, 'po_ustaniu', p, poUstaniu), przepis: PRZEPIS.po_ustaniu });
      }
    }
  }
  return wynik;
}
