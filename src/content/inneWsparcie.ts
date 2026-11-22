/**
 * „Inne wsparcie” – świadczenia spoza ubezpieczenia chorobowego, pokazywane jako dodatek (brief 4.9).
 * Tor D, zadanie D6. Czyta to tor C (C7, `app/inne-wsparcie/`).
 *
 * Wybór pozycji: research/katalog-swiadczen.yaml (800+, becikowe, świadczenie rodzicielskie, Aktywny Rodzic,
 * świadczenie „Za życiem”). Każdą kwotę i termin sprawdziliśmy ponownie 21.11.2026 na stronie oficjalnej
 * podanej w `kwota.zrodlo` albo `termin.zrodlo`. Teksty są naszymi słowami.
 * Kwoty mogą się zmienić – zawsze pokazujemy link do źródła.
 */
import type { KodSytuacji } from './trudneSytuacje';
import { LINKI, SPRAWDZONO } from './linki';

export type KtoWyplaca = 'ZUS' | 'gmina';

export interface KwotaSwiadczenia {
  /** Kwota w złotych, gdy jest jedna. */
  zl?: number;
  /** Jak to opisać rodzicowi, np. „1000 zł miesięcznie”. */
  opis: string;
  /** Strona oficjalna, na której potwierdziliśmy kwotę. */
  zrodlo: string;
}

export interface Swiadczenie {
  id: 'swiadczenie_800_plus' | 'becikowe' | 'swiadczenie_rodzicielskie' | 'aktywny_rodzic' | 'swiadczenie_za_zyciem';
  nazwa: string;
  /** Jedno–dwa zdania: co to jest. */
  krotko: string;
  /** Kto wypłaca i gdzie składasz wniosek. */
  ktoWyplaca: KtoWyplaca;
  gdzieZlozyc: string;
  /** Komu przysługuje – najważniejsze warunki. */
  dlaKogo: string[];
  kwoty: KwotaSwiadczenia[];
  termin?: { opis: string; zrodlo: string };
  /** Na co uważać – łagodnie. */
  uwaga?: string;
  link: string;
  /**
   * Tylko przy tych sytuacjach z `trudneSytuacje.ts`. Brak pola = pokazujemy zawsze.
   * Świadczenie „Za życiem” pokazujemy dopiero wtedy, gdy rodzic sam zaznaczy ciężką chorobę dziecka
   * (katalog, `uwagi_dla_aplikacji`).
   */
  tylkoPrzySytuacjach?: KodSytuacji[];
  sprawdzono: string;
}

export const INNE_WSPARCIE: readonly Swiadczenie[] = [
  {
    id: 'swiadczenie_800_plus',
    nazwa: 'Świadczenie wychowawcze 800+',
    krotko: 'Pieniądze na każde dziecko do 18. urodzin, bez względu na dochód.',
    ktoWyplaca: 'ZUS',
    gdzieZlozyc:
      'Tylko przez internet: eZUS, a rodzice z numerem PESEL – także przez aplikację mZUS, portal Emp@tia albo bank.',
    dlaKogo: ['Rodzic albo opiekun dziecka do 18. roku życia.'],
    kwoty: [
      {
        zl: 800,
        opis: '800 zł miesięcznie na dziecko. Za miesiąc urodzenia – proporcjonalnie do liczby dni.',
        zrodlo: LINKI.zus800plus.url,
      },
    ],
    termin: {
      opis: 'Wniosek złożony w ciągu 3 miesięcy od urodzenia dziecka daje pieniądze od dnia urodzenia.',
      zrodlo: LINKI.zus800plus.url,
    },
    uwaga: 'Wniosek złożony później daje pieniądze dopiero od miesiąca złożenia wniosku.',
    link: LINKI.zus800plus.url,
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'becikowe',
    nazwa: 'Becikowe (jednorazowa zapomoga z tytułu urodzenia dziecka)',
    krotko: 'Jednorazowa kwota po urodzeniu dziecka dla rodzin z niższym dochodem.',
    ktoWyplaca: 'gmina',
    gdzieZlozyc: 'Urząd gminy albo miasta, ośrodek pomocy społecznej albo przez internet (portal Emp@tia).',
    dlaKogo: [
      'Dochód w rodzinie nie przekracza 1922 zł netto miesięcznie na osobę.',
      'Mama była pod opieką lekarza albo położnej najpóźniej od 10. tygodnia ciąży do porodu (zaświadczenie). Nie dotyczy opiekunów i rodziców adopcyjnych.',
    ],
    kwoty: [
      { zl: 1000, opis: '1000 zł jednorazowo.', zrodlo: LINKI.govBecikowe.url },
      { zl: 1922, opis: 'Próg dochodu: 1922 zł netto na osobę miesięcznie.', zrodlo: LINKI.govBecikowe.url },
    ],
    termin: { opis: 'Wniosek w ciągu 12 miesięcy od urodzenia dziecka.', zrodlo: LINKI.govBecikowe.url },
    uwaga:
      'O zaświadczenie o opiece od 10. tygodnia ciąży warto poprosić lekarza albo położną jeszcze w ciąży – po porodzie trudno je uzupełnić. Wniosek złożony po 12 miesiącach nie zostanie rozpatrzony.',
    link: LINKI.govBecikowe.url,
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'swiadczenie_rodzicielskie',
    nazwa: 'Świadczenie rodzicielskie',
    krotko:
      'Pieniądze z gminy dla rodzica, który nie dostaje zasiłku macierzyńskiego – np. studiuje, pracuje na umowie zlecenia bez ubezpieczenia chorobowego albo nie pracuje.',
    ktoWyplaca: 'gmina',
    gdzieZlozyc: 'Urząd gminy albo miasta, ośrodek pomocy społecznej, pocztą albo przez internet (Emp@tia).',
    dlaKogo: [
      'Rodzic nie dostaje zasiłku macierzyńskiego ani innego świadczenia za okres urlopu macierzyńskiego, rodzicielskiego albo uzupełniającego.',
      'Przysługuje bez względu na dochód.',
    ],
    kwoty: [
      {
        zl: 1000,
        opis: '1000 zł miesięcznie. Za niepełny miesiąc – proporcjonalnie do liczby dni.',
        zrodlo: LINKI.govSwiadczenieRodzicielskie.url,
      },
      {
        opis: 'Przez 52 tygodnie przy jednym dziecku; 65, 67, 69 albo 71 tygodni przy dwojgu, trojgu, czworgu albo pięciorgu i więcej dzieciach. Okres wydłuża się, gdy dziecko po porodzie leży w szpitalu.',
        zrodlo: LINKI.govSwiadczenieRodzicielskie.url,
      },
    ],
    termin: {
      opis: 'Wniosek złożony w ciągu 3 miesięcy od urodzenia daje pieniądze od miesiąca narodzin.',
      zrodlo: LINKI.govSwiadczenieRodzicielskie.url,
    },
    uwaga: 'Wniosek złożony później daje pieniądze dopiero od miesiąca złożenia wniosku.',
    link: LINKI.govSwiadczenieRodzicielskie.url,
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'aktywny_rodzic',
    nazwa: 'Aktywny Rodzic',
    krotko:
      'Trzy świadczenia do wyboru, gdy dziecko ma od 12 do 35 miesięcy. Na jedno dziecko w danym miesiącu przysługuje jedno z nich.',
    ktoWyplaca: 'ZUS',
    gdzieZlozyc: 'Tylko przez internet: eZUS, aplikacja mZUS, bank albo Emp@tia.',
    dlaKogo: [
      '„Aktywni rodzice w pracy” – gdy oboje rodzice pracują, a dziecko nie chodzi do żłobka ani przedszkola.',
      '„Aktywnie w żłobku” – dopłata do opłaty za żłobek, klub dziecięcy albo dziennego opiekuna; ZUS przelewa ją placówce.',
      '„Aktywnie w domu” – gdy rodzic opiekuje się dzieckiem w domu, bez względu na dochód i pracę.',
    ],
    kwoty: [
      {
        zl: 1500,
        opis: 'Aktywni rodzice w pracy: 1500 zł miesięcznie (1900 zł, gdy dziecko ma orzeczenie o niepełnosprawności z dwoma wskazaniami).',
        zrodlo: LINKI.zusAktywniRodziceWPracy.url,
      },
      {
        zl: 1500,
        opis: 'Aktywnie w żłobku: do 1500 zł miesięcznie (do 1900 zł przy takim orzeczeniu), nie więcej niż opłata za pobyt.',
        zrodlo: LINKI.zusAktywnieWZlobku.url,
      },
      {
        zl: 500,
        opis: 'Aktywnie w domu: 500 zł miesięcznie.',
        zrodlo: LINKI.zusAktywnieWDomu.url,
      },
    ],
    termin: {
      opis: 'Przy „aktywnych rodzicach w pracy” ZUS ustala prawo od miesiąca, w którym wpłynie wniosek, ale nie wcześniej niż od miesiąca, w którym dziecko kończy 12 miesięcy. Dlatego najlepiej złożyć wniosek właśnie w tym miesiącu.',
      zrodlo: LINKI.zusAktywniRodziceWPracy.url,
    },
    uwaga: 'Przy „aktywnie w żłobku” i „aktywnie w domu” terminy są trochę inne – warto sprawdzić je na stronie ZUS przed złożeniem wniosku.',
    link: LINKI.zusAktywnyRodzic.url,
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'swiadczenie_za_zyciem',
    nazwa: 'Jednorazowe świadczenie „Za życiem”',
    krotko:
      'Jednorazowa pomoc, gdy dziecko urodziło się żywe z ciężkim i nieodwracalnym upośledzeniem albo nieuleczalną chorobą zagrażającą życiu.',
    ktoWyplaca: 'gmina',
    gdzieZlozyc: 'Urząd gminy albo miasta, ośrodek pomocy społecznej, pocztą albo przez internet (Emp@tia).',
    dlaKogo: [
      'Stan dziecka potwierdza zaświadczenie lekarskie.',
      'Mama była pod opieką medyczną najpóźniej od 10. tygodnia ciąży (nie dotyczy opiekunów i rodziców adopcyjnych).',
      'Bez względu na dochód.',
    ],
    kwoty: [{ zl: 4000, opis: '4000 zł jednorazowo.', zrodlo: LINKI.govSwiadczenieZaZyciem.url }],
    termin: { opis: 'Wniosek w ciągu 12 miesięcy od urodzenia dziecka.', zrodlo: LINKI.govSwiadczenieZaZyciem.url },
    link: LINKI.govSwiadczenieZaZyciem.url,
    tylkoPrzySytuacjach: ['za_zyciem'],
    sprawdzono: SPRAWDZONO,
  },
];

/** Świadczenia do pokazania: zawsze widoczne oraz te, które pasują do zaznaczonych sytuacji. */
export function inneWsparcieDla(sytuacje: readonly KodSytuacji[] = []): Swiadczenie[] {
  return INNE_WSPARCIE.filter(
    (s) => !s.tylkoPrzySytuacjach || s.tylkoPrzySytuacjach.some((k) => sytuacje.includes(k)),
  );
}
