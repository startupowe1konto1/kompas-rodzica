/**
 * Organizacje wyłącznie charytatywne (fundacje), które wspierają rodziców w trudnych sytuacjach.
 * Opis zadania ZUS, pkt 3 i). Tor D, zadanie D6. Czyta to tor C (C7).
 *
 * Zasada: żadnych nazw z pamięci. Każdy wpis sprawdziliśmy 21.11.2026 na dwa sposoby:
 *  1) oficjalna strona organizacji – działa i podaje ten numer KRS;
 *  2) odpis aktualny z oficjalnego API KRS Ministerstwa Sprawiedliwości (api-krs.ms.gov.pl):
 *     nazwa, forma prawna „fundacja”, status organizacji pożytku publicznego (OPP), cele statutowe.
 * Bez firm, klinik i płatnych usług. Gdy część pomocy bywa płatna, piszemy to w `uwaga`.
 * Zakres pomocy opisujemy własnymi słowami na podstawie strony organizacji.
 */
import { SPRAWDZONO } from './linki';
import type { KodSytuacji } from './trudneSytuacje';

export interface PotwierdzenieOrganizacji {
  /** Numer KRS (10 cyfr). */
  krs: string;
  /** Status organizacji pożytku publicznego według odpisu KRS. */
  opp: boolean;
  /** Odpis aktualny z API KRS (JSON, Ministerstwo Sprawiedliwości). */
  odpisKrs: string;
  /** Oficjalna strona organizacji, na której jest ten numer KRS. */
  stronaZNumeremKrs: string;
}

export interface Organizacja {
  id: string;
  /** Nazwa jak w KRS, w zwykłej pisowni. */
  nazwa: string;
  forma: 'fundacja' | 'stowarzyszenie';
  siedziba: string;
  /** Działa w całym kraju czy w regionie. */
  zasieg: string;
  /** W czym pomaga – prostym językiem. */
  zakresPomocy: string[];
  url: string;
  sytuacje: KodSytuacji[];
  potwierdzenie: PotwierdzenieOrganizacji;
  /** Ważne zastrzeżenie, np. że część pomocy jest płatna. */
  uwaga?: string;
  sprawdzono: string;
}

const odpis = (krs: string) => `https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/${krs}?rejestr=S&format=json`;

export const ORGANIZACJE: readonly Organizacja[] = [
  {
    id: 'fundacja-wczesniak',
    nazwa: 'Fundacja „Wcześniak Rodzice-Rodzicom”',
    forma: 'fundacja',
    siedziba: 'Warszawa',
    zasieg: 'cała Polska',
    zakresPomocy: [
      'Poradnik „Niezbędnik rodzica wcześniaka” – do czytania i słuchania online albo do zamówienia.',
      'Grupy wsparcia i program „Mentor” dla rodziców wcześniaków.',
      'Wypożyczalnia sprzętu, subkonta na leczenie i rehabilitację dziecka.',
      'Informacje o urlopach, zasiłkach i prawach rodziców wcześniaków.',
    ],
    url: 'https://wczesniak.pl/',
    sytuacje: ['wczesniak'],
    potwierdzenie: {
      krs: '0000191989',
      opp: true,
      odpisKrs: odpis('0000191989'),
      stronaZNumeremKrs: 'https://wczesniak.pl/',
    },
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'fundacja-rodzic-po-ludzku',
    nazwa: 'Fundacja „Rodzić po Ludzku”',
    forma: 'fundacja',
    siedziba: 'Warszawa',
    zasieg: 'cała Polska',
    zakresPomocy: [
      'Bezpłatny informator „Poronienie i urodzenie martwego dziecka w szpitalu” – o prawach rodziców w szpitalu i formalnościach.',
      'Porada prawna: rodzice, którzy nie wiedzą, jakie mają prawa w szpitalu, albo czują, że ich prawa naruszono, mogą napisać do fundacji.',
      'Baza i oceny oddziałów położniczych (portal gdzierodzic.info).',
    ],
    url: 'https://rodzicpoludzku.pl/',
    sytuacje: ['poronienie', 'martwe'],
    potwierdzenie: {
      krs: '0000150773',
      opp: true,
      odpisKrs: odpis('0000150773'),
      stronaZNumeremKrs: 'https://rodzicpoludzku.pl/',
    },
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'fundacja-warszawskie-hospicjum-dla-dzieci',
    nazwa: 'Fundacja Warszawskie Hospicjum dla Dzieci',
    forma: 'fundacja',
    siedziba: 'Warszawa',
    zasieg: 'Warszawa i okolice; na stronie lista hospicjów perinatalnych w całej Polsce',
    zakresPomocy: [
      'Hospicjum perinatalne: opieka medyczna i psychologiczna dla rodziców, którzy w ciąży dowiedzieli się o ciężkiej chorobie dziecka.',
      'Domowa opieka hospicyjna nad nieuleczalnie chorym dzieckiem po wyjściu ze szpitala.',
      'Grupa wsparcia dla rodziców w żałobie – otwarta dla każdego rodzica, który stracił dziecko.',
    ],
    url: 'https://www.hospicjum.waw.pl/hospicjum-perinatalne/',
    sytuacje: ['za_zyciem', 'zgon_dziecka', 'martwe'],
    potwierdzenie: {
      krs: '0000097123',
      opp: true,
      odpisKrs: odpis('0000097123'),
      stronaZNumeremKrs: 'https://www.hospicjum.waw.pl/',
    },
    uwaga: 'Według statutu w KRS fundacja świadczy opiekę paliatywną nieodpłatnie.',
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'fundacja-gajusz',
    nazwa: 'Fundacja Gajusz',
    forma: 'fundacja',
    siedziba: 'Łódź',
    zasieg: 'Łódź i województwo łódzkie',
    zakresPomocy: [
      'Hospicjum perinatalne: konsultacje medyczne, wsparcie psychologa i pomoc w organizacji porodu, gdy w ciąży wiadomo, że dziecko jest ciężko chore.',
      'Hospicjum domowe i stacjonarne dla nieuleczalnie chorych dzieci.',
      'Program wsparcia dla rodzeństwa chorego dziecka.',
    ],
    url: 'https://gajusz.org.pl/jak-pomagamy/',
    sytuacje: ['za_zyciem'],
    potwierdzenie: {
      krs: '0000109866',
      opp: true,
      odpisKrs: odpis('0000109866'),
      stronaZNumeremKrs: 'https://gajusz.org.pl/',
    },
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'fundacja-dzieciom-zdazyc-z-pomoca',
    nazwa: 'Fundacja Dzieciom „Zdążyć z Pomocą”',
    forma: 'fundacja',
    siedziba: 'Warszawa',
    zasieg: 'cała Polska',
    zakresPomocy: [
      'Subkonto dla chorego dziecka albo dziecka z niepełnosprawnością: można na nim zbierać darowizny i 1,5% podatku na leczenie i rehabilitację.',
      'Fundacja nie pobiera opłat od zbiórek, darowizn ani 1,5% podatku przekazywanych podopiecznym (według strony fundacji).',
      'Infolinia fundacji, pod którą można zapytać, jak założyć subkonto.',
    ],
    url: 'https://dzieciom.pl/',
    sytuacje: ['za_zyciem'],
    potwierdzenie: {
      krs: '0000037904',
      opp: true,
      odpisKrs: odpis('0000037904'),
      stronaZNumeremKrs: 'https://dzieciom.pl/',
    },
    sprawdzono: SPRAWDZONO,
  },
];

/** Organizacje dla danej sytuacji (kolejność jak w liście). */
export function organizacjeDla(kod: KodSytuacji): Organizacja[] {
  return ORGANIZACJE.filter((o) => o.sytuacje.includes(kod));
}
