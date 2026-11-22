/**
 * AKCJE NA OSI CZASU – TOR A, zadanie A6 (docs/superpowers/plans/2026-11-21-tor-a.md, decyzje D9, D10, D11, D16, D18).
 *
 * Każda akcja zwraca nowy plan (z `czescNr` przeliczonym według D9) albo komunikat `AKCJA_NIEMOZLIWA`.
 * Plan wejściowy się nie zmienia. Ocenę planu (walidację) dokłada `planner/index.ts`.
 */
import { czyPoprawna, dodajDni, koniecOdcinka, koniecPoTygodniach, liczbaDni, pozniejsza } from '../daty';
import type { AkcjaPlanu, DataISO, Komunikat, Odcinek, Parametry, Plan, Rodzina, TypOdcinka } from '../types';
import { polaczZPraca } from './akcjeLaczenie';
import { przesunNaDatePorodu } from './akcjePorod';
import { niemozliwe, znajdzOsobe, zTytulem } from './akcjeWspolne';
import { nowyIdOdcinka, przeliczCzesci } from './odcinki';

/**
 * Typy odcinków, za które nie płynie zasiłek. Przy `dodaj` tylko one NIE dostają automatycznie `tytulId`;
 * pozostałe (zasiłkowe) dostają tytuł z `ubezpieczenieWDniu`, jeśli go nie podano.
 */
const TYPY_BEZ_ZASILKU: TypOdcinka[] = ['praca', 'przerwa', 'wychowawczy'];

const ZLA_DATA = 'Ta data jest niepoprawna. Proszę wybrać dzień z kalendarza.';
const ZLA_DATA_PORODU = 'Data porodu (albo dzisiejsza data) jest niepoprawna. Proszę ją poprawić w danych rodziny.';

/** Nowy plan po akcji albo komunikat `AKCJA_NIEMOZLIWA` (poziom `blad`), gdy akcji nie da się wykonać. */
export function zastosujAkcjeNaPlanie(rodzina: Rodzina, plan: Plan, akcja: AkcjaPlanu, p: Parametry): Plan | Komunikat {
  // Plan przychodzi z REST: odcinek ze złą datą zatrzymuje akcję, zamiast rzucić wyjątek w daty.ts.
  const zly = plan.odcinki.find((o) => !czyPoprawna(o.od) || !czyPoprawna(o.do));
  if (zly) return niemozliwe('W planie jest urlop z niepoprawną datą. Proszę go poprawić i spróbować jeszcze raz.', zly.id);
  const wynik = wykonaj(rodzina, plan, akcja, p);
  return 'poziom' in wynik ? wynik : przeliczCzesci(wynik);
}

/** „Dziecko się urodziło”: `rodzina.zdarzenie.data` ma już nową datę (EC-34, KP art. 180 § 2–3). */
export function przesunNaNowaDate(rodzina: Rodzina, plan: Plan, poprzedniaData: DataISO, p: Parametry): Plan {
  return przesunNaDatePorodu(rodzina, plan, poprzedniaData, p);
}

function wykonaj(rodzina: Rodzina, plan: Plan, akcja: AkcjaPlanu, p: Parametry): Plan | Komunikat {
  switch (akcja.typ) {
    case 'rezygnacja_matki':
      return rezygnacjaMatki(rodzina, plan, akcja.poTygodniach, akcja.przejmujeOsobaId, p);
    case 'dodaj':
      return dodaj(rodzina, plan, akcja.odcinek, p);
    case 'ustaw_wariant_815':
      if (!czyPoprawna(rodzina.zdarzenie.data) || !czyPoprawna(rodzina.dataAnalizy)) return niemozliwe(ZLA_DATA_PORODU);
      return wariant815(rodzina, plan, akcja.wartosc);
    case 'przesun':
    case 'zmien_koniec':
    case 'podziel':
    case 'usun':
    case 'przenies_na_osobe':
    case 'polacz_z_praca': {
      const o = plan.odcinki.find((x) => x.id === akcja.odcinekId);
      if (!o) {
        return niemozliwe('Nie ma takiego odcinka w planie. Proszę odświeżyć plan i spróbować jeszcze raz.', akcja.odcinekId);
      }
      return naOdcinku(rodzina, plan, o, akcja, p);
    }
    default:
      return niemozliwe('Nie umiemy wprowadzić tej zmiany w planie.');
  }
}

type AkcjaNaOdcinku = Extract<AkcjaPlanu, { odcinekId: string }>;

function naOdcinku(rodzina: Rodzina, plan: Plan, o: Odcinek, akcja: AkcjaNaOdcinku, p: Parametry): Plan | Komunikat {
  const zamien = (...nowe: Odcinek[]): Plan => ({
    ...plan,
    odcinki: plan.odcinki.flatMap((x) => (x.id === o.id ? nowe : [x])),
  });

  switch (akcja.typ) {
    case 'przesun': {
      // Przesunięcie zachowuje długość odcinka.
      if (!czyPoprawna(akcja.nowyOd)) return niemozliwe(ZLA_DATA, o.id);
      return zamien({ ...o, od: akcja.nowyOd, do: koniecOdcinka(akcja.nowyOd, liczbaDni(o.od, o.do)) });
    }
    case 'zmien_koniec': {
      if (!czyPoprawna(akcja.nowyDo)) return niemozliwe(ZLA_DATA, o.id);
      if (akcja.nowyDo < o.od) {
        return niemozliwe('Urlop nie może się skończyć, zanim się zacznie. Trzeba wybrać dzień początku albo późniejszy.', o.id);
      }
      return zamien({ ...o, do: akcja.nowyDo });
    }
    case 'podziel': {
      const dzien = akcja.pierwszyDzienDrugiejCzesci;
      if (!czyPoprawna(dzien)) return niemozliwe(ZLA_DATA, o.id);
      // Obie części muszą mieć co najmniej jeden dzień: dzień podziału w (od, do].
      if (dzien <= o.od || dzien > o.do) {
        return niemozliwe(
          'Druga część musi zaczynać się później niż pierwszy dzień tego urlopu i nie później niż jego ostatni dzień.',
          o.id,
        );
      }
      const druga: Odcinek = { ...o, id: nowyIdOdcinka(plan, o.osobaId, o.typ), od: dzien }; // D11
      // NIEJASNE (pytanie nr 15): części rodzicielskiego w pełnych tygodniach – nie blokujemy, ostrzega walidacja.
      return zamien({ ...o, do: dodajDni(dzien, -1) }, druga);
    }
    case 'usun':
      return zamien();
    case 'przenies_na_osobe': {
      const osoba = znajdzOsobe(rodzina, akcja.osobaId);
      if (!osoba) return niemozliwe('Tej osoby nie ma w danych rodziny. Najpierw trzeba ją dodać.', o.id);
      return zamien(zTytulem({ ...o, osobaId: osoba.id }, osoba, o.od, rodzina, p));
    }
    case 'polacz_z_praca':
      return polaczZPraca(rodzina, plan, o, akcja.wymiarPracy, p);
  }
}

/**
 * Matka rezygnuje z reszty urlopu macierzyńskiego, a resztę przejmuje inna osoba (KP art. 180 § 4–5, § 6–7).
 * Ostatni dzień matki: dzień porodu + poTygodniach × 7 − 1 (KP art. 183¹ § 1: tydzień = 7 dni). Osoba przejmująca
 * dostaje „część urlopu przypadającą po dniu rezygnacji” (KP art. 180 § 5):
 * - odcinek matki, w którym wypada dzień rezygnacji, dzieli się – reszta to nowy odcinek przejmującego (D11);
 * - późniejsze odcinki macierzyńskie matki (np. po przerwie) przechodzą na przejmującego w całości.
 * Minimum 14 (albo 8) tygodni sprawdza walidacja (`MAC_MIN_14_TYG`), nie akcja.
 */
function rezygnacjaMatki(rodzina: Rodzina, plan: Plan, poTygodniach: number, przejmujeId: string, p: Parametry): Plan | Komunikat {
  const przepis = 'KP art. 180 § 4–5';
  if (!Number.isInteger(poTygodniach) || poTygodniach <= 0) {
    return niemozliwe('Proszę podać, po ilu pełnych tygodniach od porodu mama wraca do pracy.', undefined, przepis);
  }
  if (!czyPoprawna(rodzina.zdarzenie.data)) return niemozliwe(ZLA_DATA_PORODU, undefined, przepis);
  const matka = rodzina.osoby.find((o) => o.rola === 'matka');
  const macierzynskie = matka ? plan.odcinki.filter((o) => o.osobaId === matka.id && o.typ === 'macierzynski') : [];
  if (!matka || macierzynskie.length === 0) {
    return niemozliwe('W planie nie ma urlopu macierzyńskiego mamy, więc nie ma z czego zrezygnować.', undefined, przepis);
  }
  const przejmujacy = znajdzOsobe(rodzina, przejmujeId);
  if (!przejmujacy || przejmujacy.id === matka.id) {
    return niemozliwe('Resztę urlopu macierzyńskiego może przejąć tylko inna osoba z rodziny. Najpierw trzeba ją dodać.', undefined, przepis);
  }

  const ostatniDzienMatki = koniecPoTygodniach(rodzina.zdarzenie.data, poTygodniach);
  const dzielony = macierzynskie.find((o) => o.od <= ostatniDzienMatki && ostatniDzienMatki < o.do);
  const pozniejsze = macierzynskie.filter((o) => o.od > ostatniDzienMatki);
  if (!dzielony && pozniejsze.length === 0) {
    return niemozliwe(
      `Po ${poTygodniach} tygodniach od porodu mamie nie zostaje już urlop macierzyński, który ktoś mógłby przejąć. Proszę wybrać mniej tygodni.`,
      macierzynskie[0].id,
      przepis,
    );
  }

  const naPrzejmujacego = (o: Odcinek): Odcinek => zTytulem({ ...o, osobaId: przejmujacy.id }, przejmujacy, o.od, rodzina, p);
  const odcinki = plan.odcinki.flatMap((x): Odcinek[] => {
    if (x === dzielony) {
      const reszta: Odcinek = { ...x, id: nowyIdOdcinka(plan, przejmujacy.id, 'macierzynski'), od: dodajDni(ostatniDzienMatki, 1) };
      return [{ ...x, do: ostatniDzienMatki }, naPrzejmujacego(reszta)];
    }
    // Późniejsze odcinki zachowują swoje id, jak przy `przenies_na_osobe`.
    if (pozniejsze.includes(x)) return [naPrzejmujacego(x)];
    return [x];
  });
  return { ...plan, odcinki };
}

/** Nowy odcinek z identyfikatorem według D11; `tytulId` z dnia początku, jeśli go nie podano. */
function dodaj(rodzina: Rodzina, plan: Plan, nowy: Omit<Odcinek, 'id' | 'czescNr'>, p: Parametry): Plan | Komunikat {
  const osoba = znajdzOsobe(rodzina, nowy.osobaId);
  if (!osoba) return niemozliwe('Tej osoby nie ma w danych rodziny. Najpierw trzeba ją dodać.');
  if (!czyPoprawna(nowy.od) || !czyPoprawna(nowy.do)) return niemozliwe(ZLA_DATA);
  if (nowy.do < nowy.od) return niemozliwe('Urlop nie może się skończyć, zanim się zacznie. Proszę poprawić daty.');

  const bezCzesci: Odcinek & { czescNr?: number } = { ...nowy, id: nowyIdOdcinka(plan, osoba.id, nowy.typ) };
  delete bezCzesci.czescNr; // nadaje przeliczCzesci (D9)
  const odcinek =
    bezCzesci.tytulId === undefined && !TYPY_BEZ_ZASILKU.includes(nowy.typ)
      ? zTytulem(bezCzesci, osoba, nowy.od, rodzina, p)
      : bezCzesci;
  return { ...plan, odcinki: [...plan.odcinki, odcinek] };
}

/**
 * Wariant 81,5% za cały okres (UZ art. 30a, decyzja D18, pytanie 23). Włączenie ustawia dzień wniosku
 * na późniejszy z dni: „dziś” albo dzień porodu (wniosek przed porodem uznajemy za skuteczny).
 */
function wariant815(rodzina: Rodzina, plan: Plan, wartosc: boolean): Plan {
  const wynik: Plan = { ...plan, wariant815: wartosc };
  if (wartosc) {
    wynik.wniosek815Data = plan.wniosek815Data ?? pozniejsza(rodzina.dataAnalizy, rodzina.zdarzenie.data);
  } else {
    delete wynik.wniosek815Data;
  }
  return wynik;
}
