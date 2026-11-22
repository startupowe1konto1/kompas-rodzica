/**
 * PERSONY TESTOWE do symulowanego logowania – TOR D (Mikołaj). Lista i przypadki: ZADANIA.md, tor D, D1.
 *
 * Wszystkie dane są fikcyjne. PESEL, NIP i numer rachunku mają poprawne sumy kontrolne, żeby przeszły
 * walidację formularzy, ale nie należą do nikogo.
 *
 * `rodzina` to pełny profil, jaki rodzic miałby po pobraniu danych z usług i uzupełnieniu reszty.
 * `pochodzenie` mówi, skąd jest każde pole – zgodnie z mapą docs/zrodla-danych.json. Symulacja usługi
 * (src/mocks/zrodla.ts) wycina z tego profilu tylko to, co dana usługa naprawdę ma.
 *
 * Każda osoba loguje się sama (mObywatel, eZUS), także druga osoba w parze – dane drugiego rodzica
 * nie przychodzą z konta pierwszego (docs/zrodla-danych.md). Wyjątek: u małżonków (MALZONKOWIE) rejestr PESEL
 * w mObywatelu podaje imię i PESEL małżonka.
 */
import { przesunMiesiac } from '../engine/daty';
import type { MiesiacISO, MiesiacPodstawy, PersonaTestowa, PochodzenieDanej, Rodzina, ZrodloId } from '../engine/types';
import { PRZYKLAD_RODZINA } from './przyklad';

/**
 * Ostatni miesiąc, którego podstawy składek widać w eZUS w dniu analizy (21.11.2026): raporty
 * za październik płatnicy złożyli do 15 listopada, za listopad jeszcze nie.
 */
const OSTATNI_MIESIAC_W_EZUS: MiesiacISO = '2026-10';

/** `ile` kolejnych miesięcy od `od` z tą samą podstawą. */
function miesiace(od: MiesiacISO, ile: number, kwota: number): MiesiacPodstawy[] {
  return Array.from({ length: ile }, (_, i) => ({ miesiac: przesunMiesiac(od, i), kwota }));
}

/** 12 miesięcy widocznych w eZUS w dniu analizy, z tą samą podstawą. */
function rokPodstaw(kwota: number): MiesiacPodstawy[] {
  return miesiace(przesunMiesiac(OSTATNI_MIESIAC_W_EZUS, -11), 12, kwota);
}

/** Pochodzenie kilku pól spod jednego miejsca: pola('osoby[0].dane', { mobywatel: ['imie'] }). */
function pola(gdzie: string, zrodla: Partial<Record<ZrodloId, string[]>>): PochodzenieDanej[] {
  return (Object.entries(zrodla) as [ZrodloId, string[]][]).flatMap(([zrodlo, nazwy]) =>
    nazwy.map((nazwa) => ({ sciezka: `${gdzie}.${nazwa}`, zrodlo })),
  );
}

/**
 * Osoba po zalogowaniu mObywatelem i pobraniu danych z eZUS: tożsamość z rejestru PESEL, adres z eZUS
 * (adres zamieszkania ze zgłoszenia do ubezpieczeń), rachunek z e-Urzędu Skarbowego, rola i telefon od rodzica.
 */
function osobaPoZalogowaniu(i: number, { adres = 'ezus', rachunek = true }: { adres?: ZrodloId; rachunek?: boolean } = {}): PochodzenieDanej[] {
  return [
    ...pola(`osoby[${i}]`, { uzytkownik: ['rola'] }),
    ...pola(`osoby[${i}].dane`, {
      mobywatel: ['imie', 'nazwisko', 'pesel', 'dataUrodzenia'],
      uzytkownik: ['telefon'],
      ...(rachunek ? { eurzad_skarbowy: ['rachunekBankowy'] } : {}),
    }),
    ...pola(`osoby[${i}].dane`, { [adres]: ['adres'] }),
    { sciezka: `osoby[${i}].tytuly`, zrodlo: 'ezus' },
  ];
}

/** Etat: okres, płatnik i podstawy z eZUS; wymiar etatu i wielkość firmy wpisuje rodzic (eZUS ich nie ma). */
function etatZEzus(i: number, j: number, inneOdRodzica: string[] = []): PochodzenieDanej[] {
  return pola(`osoby[${i}].tytuly[${j}]`, {
    ezus: ['rodzaj', 'chorobowe', 'od', 'nazwaPlatnika', 'nipPlatnika', 'podstawaSkladek'],
    uzytkownik: ['wymiarEtatu', 'platnikPowyzej20', ...inneOdRodzica],
  });
}

/** e-ZLA z eZUS: lista zwolnień, a w każdym okres i kod B (kod B tylko w eZUS – założenie z mapy, pytanie 4). */
function ezlaZEzus(i: number, ile: number): PochodzenieDanej[] {
  return [
    { sciezka: `osoby[${i}].zdrowie.eZLA`, zrodlo: 'ezus' },
    ...Array.from({ length: ile }, (_, j) => pola(`osoby[${i}].zdrowie.eZLA[${j}]`, { ezus: ['od', 'do', 'kodB'] })).flat(),
  ];
}

/** Dane dzieci z rejestru PESEL (mObywatel) – po sporządzeniu aktu urodzenia. */
function dzieciZRejestru(ile: number): PochodzenieDanej[] {
  return Array.from({ length: ile }, (_, j) =>
    pola(`zdarzenie.dzieci[${j}].dane`, { mobywatel: ['imie', 'nazwisko', 'pesel', 'miejsceUrodzenia'] }),
  ).flat();
}

/** Zdarzenie wpisane przez rodzica: rodzaj, data (z zaświadczenia lekarza albo z sądu), liczba dzieci. */
const zdarzenieOdRodzica = pola('zdarzenie', { uzytkownik: ['typ', 'data', 'przewidywana', 'dzieci'] });

// ───────────────────────── anna-etat (EC-01) ─────────────────────────

const [annaWzor] = PRZYKLAD_RODZINA.osoby;

/** Przykład wzorcowy uzupełniony o dane do wniosków. Podstawy = wynagrodzenie z przykładu, więc wynik się nie zmienia. */
const ANNA: Rodzina = {
  ...PRZYKLAD_RODZINA,
  osoby: [
    {
      ...annaWzor,
      dane: {
        ...annaWzor.dane,
        pesel: '94051212125',
        adres: { ulica: 'Lipowa', nrDomu: '14', nrLokalu: '3', kod: '15-424', miejscowosc: 'Białystok' },
        telefon: '600 100 201',
        rachunekBankowy: '03114020040000412786100215',
      },
      tytuly: annaWzor.tytuly.map((t) => ({ ...t, nipPlatnika: '5273018467', podstawaSkladek: rokPodstaw(t.wynagrodzenieMiesieczne ?? 0) })),
    },
  ],
};

// ───────────────────────── kasia-zlecenie (EC-04) ─────────────────────────

const KASIA: Rodzina = {
  dataAnalizy: '2026-11-21',
  osoby: [
    {
      id: 'mama',
      rola: 'matka',
      dane: {
        imie: 'Katarzyna',
        nazwisko: 'Lipska',
        pesel: '97082330488',
        dataUrodzenia: '1997-08-23',
        adres: { ulica: 'Ogrodowa', nrDomu: '5', kod: '31-155', miejscowosc: 'Kraków' },
        telefon: '600 100 202',
        rachunekBankowy: '41105010090000903418726640',
      },
      tytuly: [
        {
          id: 'zlecenie-1',
          rodzaj: 'zlecenie',
          chorobowe: 'dobrowolne',
          od: '2025-03-03',
          // Umowa kończy się miesiąc przed porodem. Koniec zna tylko Kasia z umowy – eZUS zobaczy go po wyrejestrowaniu.
          do: '2026-12-15',
          platnikPowyzej20: false,
          nazwaPlatnika: 'Fundacja Zielony Kwadrat',
          nipPlatnika: '7341902581',
          podstawaSkladek: rokPodstaw(5200),
        },
      ],
    },
  ],
  zdarzenie: { typ: 'porod', data: '2027-01-15', przewidywana: true, dzieci: [{}] },
};

// ───────────────────────── ola-firma (EC-10) ─────────────────────────

const OLA: Rodzina = {
  dataAnalizy: '2026-11-21',
  osoby: [
    {
      id: 'mama',
      rola: 'matka',
      dane: {
        imie: 'Aleksandra',
        nazwisko: 'Nowicka',
        pesel: '92020351745',
        dataUrodzenia: '1992-02-03',
        adres: { ulica: 'Słoneczna', nrDomu: '27', nrLokalu: '8', kod: '80-180', miejscowosc: 'Gdańsk' },
        telefon: '600 100 203',
        rachunekBankowy: '74249000500000500473391028',
      },
      tytuly: [
        {
          id: 'firma-1',
          rodzaj: 'dzialalnosc',
          chorobowe: 'dobrowolne',
          od: '2024-04-02',
          // Dobrowolne chorobowe zgłoszone ok. 5 tygodni przed przewidywanym porodem, od 1. dnia miesiąca (kalkulator
          // uznaje miesiąc za pełny dopiero od 1. dnia). Wcześniej go nie było, więc eZUS nie ma podstaw na chorobowe
          // z poprzednich miesięcy (podstawa według UZ art. 48a).
          chorobowoOd: '2026-11-01',
          nazwaPlatnika: 'Pracownia Graficzna Aleksandra Nowicka',
          nipPlatnika: '8614520377',
          regonPlatnika: '221067438',
          zadeklarowanaPodstawa: 6000,
          // Saldo na koncie płatnika w eZUS. eZUS zna saldo tylko na dziś, więc data salda = dzień analizy, a nie
          // dzień powstania prawa do zasiłku (UZ art. 2a ust. 1) – stan na ten dzień potwierdzi dopiero zaświadczenie.
          zadluzenieSkladkowe: 0,
          zadluzenieSkladkoweNaDzien: '2026-11-21',
          // Wpis w CEIDG: firma zawieszona na lato 2025 r., wznowiona 1 września 2025 r. (`do` = dzień przed wznowieniem).
          zawieszenia: [{ od: '2025-07-01', do: '2025-08-31' }],
        },
      ],
    },
  ],
  zdarzenie: { typ: 'porod', data: '2026-12-07', przewidywana: true, dzieci: [{}] },
};

// ───────────────────────── monika-firma-zaleglosc (UZ art. 2a) ─────────────────────────

const MONIKA: Rodzina = {
  dataAnalizy: '2026-11-21',
  osoby: [
    {
      id: 'mama',
      rola: 'matka',
      dane: {
        imie: 'Monika',
        nazwisko: 'Lewandowska',
        pesel: '90051402845',
        dataUrodzenia: '1990-05-14',
        adres: { ulica: 'Ogrodowa', nrDomu: '14', kod: '30-001', miejscowosc: 'Kraków' },
        telefon: '600 100 207',
        rachunekBankowy: '56102018110000060203915742',
      },
      tytuly: [
        {
          id: 'firma-1',
          rodzaj: 'dzialalnosc',
          chorobowe: 'dobrowolne',
          od: '2021-03-01',
          // Dobrowolne chorobowe od początku działalności – bez ryzyka późnego zgłoszenia; persona pokazuje samą zaległość.
          chorobowoOd: '2021-03-01',
          nazwaPlatnika: 'Studio Fotografii Monika Lewandowska',
          nipPlatnika: '5832014475',
          regonPlatnika: '221087547',
          zadeklarowanaPodstawa: 5200,
          // Saldo na koncie płatnika w eZUS na dziś. Zaległość powyżej progu (UZ art. 2a ust. 1) wstrzymuje wypłatę
          // zasiłku do spłaty; stan na dzień powstania prawa potwierdzi dopiero zaświadczenie z ZUS.
          zadluzenieSkladkowe: 1840.37,
          zadluzenieSkladkoweNaDzien: '2026-11-21',
        },
      ],
    },
  ],
  zdarzenie: { typ: 'porod', data: '2027-01-12', przewidywana: true, dzieci: [{}] },
};

// ───────────────────────── marta-i-piotr (para, bliźnięta) ─────────────────────────

const ADRES_KOWALCZYKOW = { ulica: 'Kasztanowa', nrDomu: '9', kod: '62-020', miejscowosc: 'Swarzędz' };

const MARTA_I_PIOTR: Rodzina = {
  dataAnalizy: '2026-11-21',
  osoby: [
    {
      id: 'mama',
      rola: 'matka',
      dane: {
        imie: 'Marta',
        nazwisko: 'Kowalczyk',
        pesel: '91103024862',
        dataUrodzenia: '1991-10-30',
        adres: ADRES_KOWALCZYKOW,
        telefon: '600 100 204',
        rachunekBankowy: '40124010110000117802364591',
      },
      tytuly: [
        {
          id: 'etat-1',
          rodzaj: 'umowa_o_prace',
          chorobowe: 'obowiazkowe',
          od: '2020-09-01',
          wymiarEtatu: 1,
          platnikPowyzej20: false,
          nazwaPlatnika: 'Biuro Rachunkowe Bilans s.c.',
          nipPlatnika: '6450281930',
          podstawaSkladek: rokPodstaw(7400),
        },
      ],
      zdrowie: {
        eZLA: [
          // 33 dni w 2025 r. – wynagrodzenie chorobowe od pracodawcy (KP art. 92 § 1 pkt 1).
          { od: '2025-03-03', do: '2025-04-04', kodB: false },
          // Kolejne dni w tym samym roku – już zasiłek chorobowy (KP art. 92 § 4); jest niżej w `pobraneZasilki`.
          { od: '2025-10-06', do: '2025-10-10', kodB: false },
          // W ciąży, 7 dni w 2026 r. – wynagrodzenie chorobowe 100% (KP art. 92 § 1 pkt 2), więc to nie zasiłek.
          { od: '2026-11-02', do: '2026-11-08', kodB: true },
        ],
      },
      // eZUS, „Świadczenia i przerwy” i panel świadczeniobiorcy (rok bieżący i poprzedni). Płatnik zgłasza do 20 osób,
      // więc zasiłek wypłacał ZUS (UZ art. 61 ust. 1 pkt 2 lit. a). Stawka 80% (UZ art. 11 ust. 1). Kwota fikcyjna:
      // podstawa 7400 zł − 13,71% = 6385,46 zł; dziennie 6385,46 / 30 × 80% = 170,28 zł; za 5 dni 851,40 zł.
      pobraneZasilki: [{ rodzaj: 'zasiłek chorobowy', od: '2025-10-06', do: '2025-10-10', stawkaProc: 80, kwota: 851.4, ktoWyplacal: 'ZUS' }],
    },
    {
      id: 'tata',
      rola: 'ojciec',
      dane: {
        imie: 'Piotr',
        nazwisko: 'Kowalczyk',
        pesel: '89041736255',
        dataUrodzenia: '1989-04-17',
        adres: ADRES_KOWALCZYKOW,
        telefon: '600 100 205',
        rachunekBankowy: '50102010260000960204587312',
      },
      tytuly: [
        {
          id: 'etat-1',
          rodzaj: 'umowa_o_prace',
          chorobowe: 'obowiazkowe',
          od: '2018-02-01',
          wymiarEtatu: 1,
          platnikPowyzej20: true,
          nazwaPlatnika: 'Transkom Logistyka sp. z o.o.',
          nipPlatnika: '9182647308',
          podstawaSkladek: rokPodstaw(9200),
        },
      ],
    },
  ],
  // Bliźnięta urodziły się 12 dni przed dniem analizy; akt urodzenia jest już w rejestrze, a dzieci mają PESEL.
  zdarzenie: {
    typ: 'porod',
    data: '2026-11-09',
    przewidywana: false,
    dzieci: [
      { dane: { imie: 'Zofia', nazwisko: 'Kowalczyk', pesel: '26310904823', miejsceUrodzenia: 'Poznań' } },
      { dane: { imie: 'Jan', nazwisko: 'Kowalczyk', pesel: '26310905176', miejsceUrodzenia: 'Poznań' } },
    ],
  },
};

// ───────────────────────── ewa-bez-ubezpieczenia-i-tomek (EC-56) ─────────────────────────

const ADRES_EWY_I_TOMKA = { ulica: 'Polna', nrDomu: '3', nrLokalu: '12', kod: '20-400', miejscowosc: 'Lublin' };

const EWA_I_TOMEK: Rodzina = {
  dataAnalizy: '2026-11-21',
  osoby: [
    {
      id: 'mama',
      rola: 'matka',
      dane: {
        imie: 'Ewa',
        nazwisko: 'Szymańska',
        pesel: '00270815984',
        dataUrodzenia: '2000-07-08',
        adres: ADRES_EWY_I_TOMKA,
        telefon: '600 100 206',
      },
      // eZUS nie ma żadnego zgłoszenia Ewy do ubezpieczeń.
      tytuly: [],
    },
    {
      id: 'tata',
      rola: 'ojciec',
      dane: {
        imie: 'Tomasz',
        nazwisko: 'Wójcik',
        pesel: '98120147374',
        dataUrodzenia: '1998-12-01',
        adres: ADRES_EWY_I_TOMKA,
        telefon: '600 100 207',
        rachunekBankowy: '67116022020000004183527730',
      },
      tytuly: [
        {
          id: 'etat-1',
          rodzaj: 'umowa_o_prace',
          chorobowe: 'obowiazkowe',
          od: '2021-05-04',
          wymiarEtatu: 1,
          platnikPowyzej20: true,
          nazwaPlatnika: 'Piekarnia Złoty Kłos sp. z o.o.',
          nipPlatnika: '5720463191',
          podstawaSkladek: rokPodstaw(6800),
        },
      ],
    },
  ],
  zdarzenie: { typ: 'porod', data: '2026-12-14', przewidywana: true, dzieci: [{}] },
};

// ───────────────────────── adopcja-joanna (EC-40) ─────────────────────────

const JOANNA: Rodzina = {
  dataAnalizy: '2026-11-21',
  osoby: [
    {
      id: 'przyjmujaca',
      rola: 'przyjmujacy',
      dane: {
        imie: 'Joanna',
        nazwisko: 'Mazur',
        pesel: '85091428625',
        dataUrodzenia: '1985-09-14',
        adres: { ulica: 'Wrzosowa', nrDomu: '41', kod: '50-305', miejscowosc: 'Wrocław' },
        telefon: '600 100 208',
        rachunekBankowy: '13109010560000001348260914',
      },
      tytuly: [
        {
          id: 'etat-1',
          rodzaj: 'umowa_o_prace',
          chorobowe: 'obowiazkowe',
          od: '2019-01-07',
          wymiarEtatu: 1,
          platnikPowyzej20: true,
          nazwaPlatnika: 'Nordwind Software sp. z o.o.',
          nipPlatnika: '6938150245',
          // Podwyżka od kwietnia 2026 – eZUS pokazuje to jako wyższą podstawę, bez podziału na składniki.
          podstawaSkladek: [...miesiace('2025-11', 5, 8200), ...miesiace('2026-04', 7, 8600)],
        },
      ],
    },
  ],
  // Przyjęcie dziecka na wychowanie (sprawa o przysposobienie w sądzie). Postanowienie jeszcze się nie uprawomocniło.
  zdarzenie: { typ: 'przysposobienie', data: '2026-12-07', przewidywana: true, dzieci: [{ dataUrodzenia: '2022-06-15' }] },
};

// ───────────────────────── lista ─────────────────────────

/**
 * Pary w związku małżeńskim: persona → id obojga małżonków. Rejestr PESEL (mObywatel) zna imię, nazwisko rodowe
 * i PESEL małżonka; pary bez ślubu tych danych nie dostają (docs/zrodla-danych.md, część c, pkt 7).
 */
export const MALZONKOWIE: Record<string, readonly [string, string]> = {
  'marta-i-piotr': ['mama', 'tata'],
};

export const PERSONY: PersonaTestowa[] = [
  {
    id: 'anna-etat',
    nazwa: 'Anna, umowa o pracę',
    opis: 'Mama na pełnym etacie od 2023 r. w dużej firmie, pierwsze dziecko, poród w grudniu 2026. Przypadek podstawowy (EC-01).',
    rodzina: ANNA,
    pochodzenie: [...osobaPoZalogowaniu(0), ...etatZEzus(0, 0, ['wynagrodzenieMiesieczne']), ...zdarzenieOdRodzica],
  },
  {
    id: 'kasia-zlecenie',
    nazwa: 'Kasia, umowa zlecenia',
    opis: 'Zlecenie z dobrowolnym chorobowym kończy się miesiąc przed porodem: bez zasiłku macierzyńskiego, łagodne ostrzeżenie z wyprzedzeniem (EC-04).',
    rodzina: KASIA,
    pochodzenie: [
      ...osobaPoZalogowaniu(0),
      ...pola('osoby[0].tytuly[0]', {
        ezus: ['rodzaj', 'chorobowe', 'od', 'nazwaPlatnika', 'nipPlatnika', 'podstawaSkladek'],
        uzytkownik: ['do', 'platnikPowyzej20'],
      }),
      ...zdarzenieOdRodzica,
    ],
  },
  {
    id: 'ola-firma',
    nazwa: 'Ola, własna firma',
    opis: 'Działalność od 2024 r. (zawieszona latem 2025 r.), dobrowolne chorobowe zgłoszone 5 tygodni przed porodem, bez zaległości: ryzyko późnego zgłoszenia i podstawa z art. 48a (EC-10).',
    rodzina: OLA,
    pochodzenie: [
      ...osobaPoZalogowaniu(0),
      ...pola('osoby[0].tytuly[0]', {
        ezus: [
          'rodzaj',
          'chorobowe',
          'od',
          'chorobowoOd',
          'nazwaPlatnika',
          'nipPlatnika',
          'regonPlatnika',
          'zadeklarowanaPodstawa',
          'zadluzenieSkladkowe',
          'zadluzenieSkladkoweNaDzien',
        ],
        ceidg: ['zawieszenia'],
      }),
      ...zdarzenieOdRodzica,
    ],
  },
  {
    id: 'monika-firma-zaleglosc',
    nazwa: 'Monika, firma z zaległością w składkach',
    opis: 'Działalność od 2021 r. z dobrowolnym chorobowym, ale z zaległością w składkach powyżej progu: zaświadczenie o zadłużeniu z eZUS i zasiłek wstrzymany do spłaty (UZ art. 2a).',
    rodzina: MONIKA,
    pochodzenie: [
      ...osobaPoZalogowaniu(0),
      ...pola('osoby[0].tytuly[0]', {
        ezus: [
          'rodzaj',
          'chorobowe',
          'od',
          'chorobowoOd',
          'nazwaPlatnika',
          'nipPlatnika',
          'regonPlatnika',
          'zadeklarowanaPodstawa',
          'zadluzenieSkladkowe',
          'zadluzenieSkladkoweNaDzien',
        ],
      }),
      ...zdarzenieOdRodzica,
    ],
  },
  {
    id: 'marta-i-piotr',
    nazwa: 'Marta i Piotr, bliźnięta',
    opis: 'Oboje na etatach, bliźnięta urodzone 9 listopada 2026: planer dla pary, przejęcie urlopu przez tatę po 14 tygodniach, termin na 81,5%.',
    rodzina: MARTA_I_PIOTR,
    pochodzenie: [
      ...osobaPoZalogowaniu(0),
      ...etatZEzus(0, 0),
      ...ezlaZEzus(0, 3),
      { sciezka: 'osoby[0].pobraneZasilki', zrodlo: 'ezus' },
      ...osobaPoZalogowaniu(1),
      ...etatZEzus(1, 0),
      // Po sporządzeniu aktu urodzenia datę urodzenia i dane dzieci widać w rejestrze PESEL; liczbę dzieci podaje rodzic.
      ...pola('zdarzenie', { mobywatel: ['data', 'przewidywana'], uzytkownik: ['typ', 'dzieci'] }),
      ...dzieciZRejestru(2),
    ],
  },
  {
    id: 'ewa-bez-ubezpieczenia-i-tomek',
    nazwa: 'Ewa i Tomek',
    opis: 'Mama bez tytułu ubezpieczenia (świadczenie rodzicielskie), tata na etacie: tata ma prawo do pełnego urlopu rodzicielskiego (EC-56).',
    rodzina: EWA_I_TOMEK,
    pochodzenie: [
      // Ewa nigdy nie była zgłoszona do ubezpieczeń, więc eZUS nie ma jej adresu – jest adres zameldowania z rejestru PESEL.
      ...osobaPoZalogowaniu(0, { adres: 'mobywatel', rachunek: false }),
      ...osobaPoZalogowaniu(1),
      ...etatZEzus(1, 0),
      ...zdarzenieOdRodzica,
    ],
  },
  {
    id: 'adopcja-joanna',
    nazwa: 'Joanna, przysposobienie',
    opis: 'Joanna na etacie przyjmuje na wychowanie 4-letnie dziecko w toku sprawy o przysposobienie: urlop na warunkach urlopu macierzyńskiego (EC-40).',
    rodzina: JOANNA,
    pochodzenie: [
      ...osobaPoZalogowaniu(0),
      ...etatZEzus(0, 0),
      ...zdarzenieOdRodzica,
      // Datę przyjęcia podaje Joanna w oświadczeniu, datę urodzenia dziecka – zaświadczenie sądu opiekuńczego
      // o wystąpieniu o przysposobienie (rozp. Dz.U. 2026 poz. 1316 § 16 ust. 1).
      { sciezka: 'zdarzenie.dzieci[0].dataUrodzenia', zrodlo: 'sad' },
    ],
  },
];
