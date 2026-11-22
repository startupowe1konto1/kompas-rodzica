/**
 * KWESTIONARIUSZ – definicje pytań. Właściciel: tor D (Mikołaj). Czyta: tor C (Wojtek).
 *
 * Eksporty dla interfejsu:
 *  - `PYTANIA` + `KROKI_ANKIETY` – warstwa A („Moja sytuacja”: to, co zmienia wynik). Kształt jest
 *    dokładnie ten z typów toru C (`./pytania-typy`), więc tor C podłącza je jedną linią:
 *    `export { PYTANIA, KROKI_ANKIETY } from '../../content/pytania';`
 *  - `PYTANIA_DOKUMENTY` + `KROKI_DOKUMENTOW` – warstwa B („Dokumenty”: dane tylko do wniosków).
 *    Ten sam kształt, ale z polami tekstowymi (imię, PESEL, NIP…), których typ toru C jeszcze nie ma.
 *  - `POZA_KWESTIONARIUSZEM` – dane z mapy, o które celowo nie pytamy, z powodem.
 *
 * Zasady (specyfikacja, sekcja 5; brief 4.2):
 *  - jedno pytanie = jedna dana z mapy `docs/zrodla-danych.json` (`daneId`, ewentualnie `takze`);
 *  - definicje to czyste dane (da się je zapisać jako JSON), warunki są deklaratywne;
 *  - `sciezka` wskazuje pole w `Rodzina`; `$osoba`, `$tytul`, `$dziecko` to numery w listach;
 *  - dana pobrana z symulacji jest już wypełniona (znacznik źródła), ale rodzic może ją poprawić;
 *  - pytania warunkowe: o firmę tylko przy działalności, o dziecko po porodzie dopiero po porodzie;
 *  - tu nie ma reguł prawnych – decyduje silnik. Zakresy dat łapią tylko literówki.
 *
 * Funkcje pomocnicze na dole pliku (`pytaniaDoPokazania`, `zapiszOdpowiedz`…) działają na tym
 * samym kształcie. Tor C ma własny silnik ankiety i nie musi z nich korzystać.
 */
import type { Dziecko, RodzajTytulu, Rodzina, TytulUbezpieczenia, ZdarzenieDziecka } from '../engine/types';
import type {
  DanaPozaKwestionariuszem,
  DefinicjaPytania,
  DefinicjaPytaniaDokumentu,
  KrokAnkiety,
  OpcjaPytania,
  Warunek,
  ZakresInstancji,
} from './pytania-typy';

export type {
  DanaPozaKwestionariuszem,
  DefinicjaPytania,
  DefinicjaPytaniaDokumentu,
  KodekPola,
  KrokAnkiety,
  OpcjaPytania,
  TypPola,
  TypPolaDokumentu,
  Warunek,
  ZakresInstancji,
  ZakresPytania,
} from './pytania-typy';

// ───────────────────────── Kroki ─────────────────────────

export const KROKI_ANKIETY: KrokAnkiety[] = [
  { id: 'kim_jestes', tytul: 'Kim jest Pani/Pan dla dziecka' },
  { id: 'dziecko', tytul: 'Dziecko', opis: 'Kiedy dziecko się urodzi albo trafi do Pani/Pana.' },
  { id: 'ubezpieczenie', tytul: 'Praca i ubezpieczenie', opis: 'Umowy i firma, z których ma Pani/Pan ubezpieczenie.' },
  { id: 'zarobki', tytul: 'Zarobki', opis: 'Od nich zależy wysokość zasiłku.' },
  { id: 'ciaza', tytul: 'Ciąża i zwolnienia' },
  { id: 'po_porodzie', tytul: 'Po porodzie', opis: 'Jeśli te pytania nie dotyczą Pani/Pana sytuacji, można je pominąć.' },
  {
    id: 'trudne_sytuacje',
    tytul: 'Czy wydarzyło się coś, o czym powinniśmy wiedzieć?',
    opis: 'Jeśli te pytania nie dotyczą Pani/Pana sytuacji, można je pominąć. Pomagają sprawdzić, kto może przejąć opiekę i urlop.',
  },
  { id: 'podatek', tytul: 'Podatek', opis: 'Tylko do szacunku kwoty „na rękę”.' },
];

export const KROKI_DOKUMENTOW: KrokAnkiety[] = [
  { id: 'dane_osobowe', tytul: 'Dane osobowe', opis: 'Potrzebne tylko do wypełnienia wniosków.' },
  { id: 'dane_platnika', tytul: 'Pracodawca albo zleceniodawca', opis: 'Kto wpisze się jako płatnik na wniosku.' },
  { id: 'dane_dziecka', tytul: 'Dane dziecka' },
  { id: 'oswiadczenia', tytul: 'Oświadczenia', opis: 'Odpowiedzi do pytań z wniosku ZAM.' },
];

/** Rozsądne zakresy dat (łapanie literówek), nie reguły prawne. */
const ROK = 365;

// ───────────────────────── Ścieżki i warunki ─────────────────────────

const OSOBA = 'osoby[$osoba]';
const TYTUL = `${OSOBA}.tytuly[$tytul]`;
const RODZAJ = `${TYTUL}.rodzaj`;
const DZIECKO = 'zdarzenie.dzieci[$dziecko]';

const POROD: Warunek = { sciezka: 'zdarzenie.typ', rowne: 'porod' };
const PRZYJECIE: Warunek = { sciezka: 'zdarzenie.typ', rozne: 'porod' };
const W_CIAZY: Warunek = { wszystkie: [POROD, { sciezka: 'zdarzenie.przewidywana', rowne: true }] };
const URODZONE: Warunek = { wszystkie: [POROD, { sciezka: 'zdarzenie.przewidywana', rowne: false }] };
const DZIECKO_JEST: Warunek = { ktorykolwiek: [URODZONE, PRZYJECIE] };

const MATKA: Warunek = { sciezka: `${OSOBA}.rola`, rowne: 'matka' };
const DRUGA_OSOBA: Warunek = { sciezka: 'osoby[1]', wypelnione: true };

const ETAT: Warunek = { sciezka: RODZAJ, rowne: 'umowa_o_prace' };
const FIRMA: Warunek = { sciezka: RODZAJ, jedenZ: ['dzialalnosc', 'wspolpraca'] };
const NIE_FIRMA: Warunek = { nie: FIRMA };
const MA_PLATNIKA: Warunek = { sciezka: RODZAJ, jedenZ: ['umowa_o_prace', 'zlecenie'] };
const MA_USTANIE: Warunek = { sciezka: `${TYTUL}.ustanie`, wypelnione: true };
const TRYB_KWOTA: Warunek = { sciezka: `${TYTUL}.podstawaSkladek`, wypelnione: false };
const TRYB_MIESIACE: Warunek = { sciezka: `${TYTUL}.podstawaSkladek`, wypelnione: true };
const CZAS_OKRESLONY: Warunek = { wszystkie: [ETAT, { sciezka: `${TYTUL}.naCzasOkreslony`, rowne: true }] };
const MA_URLOP_WYCHOWAWCZY: Warunek = { sciezka: `${OSOBA}.urlopWychowawczy`, wypelnione: true };

// ───────────────────────── Opcje ─────────────────────────

const OPCJE_ROLA: OpcjaPytania[] = [
  { wartosc: 'matka', etykieta: 'Mamą' },
  { wartosc: 'ojciec', etykieta: 'Tatą' },
  {
    wartosc: 'przyjmujacy',
    etykieta: 'Osobą, która przyjmuje dziecko na wychowanie',
    opis: 'Przysposobienie (adopcja) albo rodzina zastępcza.',
  },
  {
    wartosc: 'inny_czlonek_rodziny',
    etykieta: 'Innym członkiem najbliższej rodziny',
    opis: 'Np. babcią lub dziadkiem, który przejmuje opiekę nad dzieckiem.',
  },
];

const OPCJE_ETAP: OpcjaPytania[] = [
  { wartosc: 'w_ciazy', etykieta: 'Czekamy na poród' },
  { wartosc: 'urodzone', etykieta: 'Dziecko już się urodziło' },
  { wartosc: 'przyjecie', etykieta: 'Przyjmujemy dziecko na wychowanie' },
];

const OPCJE_TYP_PRZYJECIA: OpcjaPytania[] = [
  { wartosc: 'przysposobienie', etykieta: 'Przysposobienie (adopcja)' },
  { wartosc: 'rodzina_zastepcza_niezawodowa', etykieta: 'Rodzina zastępcza (niezawodowa)' },
  { wartosc: 'rodzina_zastepcza_zawodowa', etykieta: 'Zawodowa rodzina zastępcza' },
];

const OPCJE_TYTULY: OpcjaPytania[] = [
  { wartosc: 'umowa_o_prace', etykieta: 'Umowa o pracę (etat)' },
  { wartosc: 'zlecenie', etykieta: 'Umowa zlecenia' },
  { wartosc: 'dzialalnosc', etykieta: 'Własna firma (działalność gospodarcza)' },
  {
    wartosc: 'wspolpraca',
    etykieta: 'Pomagam w firmie bliskiej osoby',
    opis: 'Osoba współpracująca przy prowadzeniu działalności.',
  },
  { wartosc: 'inny', etykieta: 'Coś innego' },
];

const OPCJE_CHOROBOWE_INNY: OpcjaPytania[] = [
  { wartosc: 'obowiazkowe', etykieta: 'Tak, obowiązkowe' },
  { wartosc: 'dobrowolne', etykieta: 'Tak, dobrowolne (opłacane na własny wniosek)' },
  { wartosc: 'brak', etykieta: 'Nie mam' },
];

const OPCJE_USTANIE_UMOWY: OpcjaPytania[] = [
  { wartosc: 'koniec_umowy', etykieta: 'Umowa po prostu się skończyła albo została rozwiązana' },
  { wartosc: 'upadlosc', etykieta: 'Upadłość pracodawcy' },
  { wartosc: 'likwidacja', etykieta: 'Likwidacja pracodawcy' },
  { wartosc: 'smierc_pracodawcy', etykieta: 'Śmierć pracodawcy' },
  {
    wartosc: 'naruszenie_prawa_wyrok',
    etykieta: 'Zwolnienie z naruszeniem prawa, potwierdzone prawomocnym wyrokiem sądu',
  },
  { wartosc: 'wyrejestrowanie', etykieta: 'Wyrejestrowanie z ubezpieczenia' },
];

const OPCJE_USTANIE_FIRMY: OpcjaPytania[] = [
  { wartosc: 'zakonczenie_dzialalnosci', etykieta: 'Zamknięcie albo zawieszenie firmy' },
  { wartosc: 'wyrejestrowanie', etykieta: 'Wyrejestrowanie z ubezpieczenia chorobowego' },
];

const OPCJE_TRYB_PODSTAWY: OpcjaPytania[] = [
  { wartosc: 'kwota', etykieta: 'Jedna kwota miesięcznie' },
  { wartosc: 'miesiace', etykieta: 'Miesiąc po miesiącu (dokładniej)' },
];

// ───────────────────────── Warstwa A: „Moja sytuacja” ─────────────────────────

export const PYTANIA: DefinicjaPytania[] = [
  // ── Kim jesteś ──
  {
    id: 'rola',
    warstwa: 'A',
    krok: 'kim_jestes',
    zakres: 'osoba',
    etykieta: 'Kim jest Pani/Pan dla dziecka?',
    pomoc: 'Od tego zależy, jakie urlopy i zasiłki przysługują.',
    typ: 'wybor',
    opcje: OPCJE_ROLA,
    sciezka: `${OSOBA}.rola`,
    daneId: 'wnioskodawca_plec_rola',
    wymagane: true,
  },

  // ── Dziecko ──
  {
    id: 'etap',
    warstwa: 'A',
    krok: 'dziecko',
    zakres: 'rodzina',
    etykieta: 'Na jakim etapie jest rodzina?',
    pomoc: 'Od tego zależy, od jakiej daty liczymy urlopy i terminy wniosków.',
    typ: 'wybor',
    opcje: OPCJE_ETAP,
    sciezka: 'zdarzenie',
    kodek: 'etap',
    daneId: 'zdarzenie_typ_i_data_przyjecia',
    takze: ['przewidywana_data_porodu'],
    wymagane: true,
  },
  {
    id: 'typ_przyjecia',
    warstwa: 'A',
    krok: 'dziecko',
    zakres: 'rodzina',
    etykieta: 'W jakiej formie dziecko jest przyjmowane na wychowanie?',
    pomoc: 'Od formy przyjęcia zależy, jaki urlop i zasiłek przysługują.',
    skadWziac: 'Postanowienie sądu albo umowa o pełnienie funkcji rodziny zastępczej.',
    typ: 'wybor',
    opcje: OPCJE_TYP_PRZYJECIA,
    sciezka: 'zdarzenie.typ',
    daneId: 'zdarzenie_typ_i_data_przyjecia',
    warunek: PRZYJECIE,
    wymagane: true,
  },
  {
    id: 'data_porodu_przewidywana',
    warstwa: 'A',
    krok: 'dziecko',
    zakres: 'rodzina',
    etykieta: 'Kiedy jest przewidywany poród?',
    pomoc: 'Od tej daty liczymy początek urlopu i terminy wniosków. Po porodzie wystarczy wpisać prawdziwą datę, a plan przesunie się sam.',
    podpowiedz: 'Data jest na zaświadczeniu od lekarza.',
    skadWziac: 'Zaświadczenie lekarskie o przewidywanej dacie porodu albo karta ciąży.',
    typ: 'data',
    sciezka: 'zdarzenie.data',
    daneId: 'przewidywana_data_porodu',
    warunek: W_CIAZY,
    wymagane: true,
    zakresDat: { minDni: -42, maxDni: 300 },
  },
  {
    id: 'data_porodu',
    warstwa: 'A',
    krok: 'dziecko',
    zakres: 'rodzina',
    etykieta: 'Kiedy urodziło się dziecko?',
    pomoc: 'Od dnia porodu liczymy urlopy i terminy wniosków.',
    typ: 'data',
    sciezka: 'zdarzenie.data',
    daneId: 'dziecko_dane_podstawowe',
    warunek: URODZONE,
    wymagane: true,
    zakresDat: { minDni: -7 * ROK, maxDni: 0 },
  },
  {
    id: 'data_przyjecia',
    warstwa: 'A',
    krok: 'dziecko',
    zakres: 'rodzina',
    etykieta: 'Kiedy dziecko trafiło albo trafi do Pani/Pana na wychowanie?',
    pomoc: 'Od tej daty liczymy urlop i terminy wniosków.',
    podpowiedz: 'Data jest w dokumentach z sądu albo z ośrodka.',
    skadWziac: 'Zaświadczenie z sądu albo orzeczenie o umieszczeniu dziecka w rodzinie zastępczej.',
    typ: 'data',
    sciezka: 'zdarzenie.data',
    daneId: 'zdarzenie_typ_i_data_przyjecia',
    warunek: PRZYJECIE,
    wymagane: true,
    zakresDat: { minDni: -7 * ROK, maxDni: ROK },
  },
  {
    id: 'liczba_dzieci',
    warstwa: 'A',
    krok: 'dziecko',
    zakres: 'rodzina',
    etykieta: 'Ile dzieci urodzi się przy tym porodzie albo ile dzieci jest przyjmowanych jednocześnie?',
    pomoc: 'Przy bliźniętach i większej liczbie dzieci urlop jest dłuższy.',
    typ: 'liczba',
    sciezka: 'zdarzenie.dzieci',
    kodek: 'dlugosc_listy',
    daneId: 'liczba_dzieci_przy_jednym_porodzie',
    wymagane: true,
    min: 1,
    max: 10,
  },
  {
    id: 'dziecko_data_urodzenia',
    warstwa: 'A',
    krok: 'dziecko',
    zakres: 'dziecko',
    etykieta: 'Kiedy urodziło się przyjmowane dziecko?',
    pomoc: 'Od wieku dziecka zależy, czy i na jak długo przysługuje urlop.',
    typ: 'data',
    sciezka: `${DZIECKO}.dataUrodzenia`,
    daneId: 'dziecko_wiek_i_odroczenie_obowiazku_szkolnego',
    warunek: PRZYJECIE,
    wymagane: true,
    zakresDat: { minDni: -18 * ROK, maxDni: 0 },
  },
  {
    id: 'dziecko_odroczony_obowiazek',
    warstwa: 'A',
    krok: 'dziecko',
    zakres: 'dziecko',
    etykieta: 'Czy dziecko ma odroczony obowiązek szkolny?',
    pomoc: 'W rodzinie zastępczej od tego zależy, do jakiego wieku dziecka przysługuje urlop.',
    skadWziac: 'Decyzja dyrektora szkoły o odroczeniu obowiązku szkolnego.',
    typ: 'tak_nie',
    sciezka: `${DZIECKO}.odroczonyObowiazekSzkolny`,
    daneId: 'dziecko_wiek_i_odroczenie_obowiazku_szkolnego',
    warunek: { sciezka: 'zdarzenie.typ', rowne: 'rodzina_zastepcza_niezawodowa' },
  },
  {
    id: 'data_uprawomocnienia',
    warstwa: 'A',
    krok: 'dziecko',
    zakres: 'rodzina',
    etykieta: 'Kiedy postanowienie sądu o przysposobieniu stało się prawomocne?',
    pomoc: 'Od tej daty liczy się termin na urlop ojcowski. Jeśli postanowienie nie jest jeszcze prawomocne, proszę zostawić pole puste.',
    podpowiedz: 'Data jest na postanowieniu sądu.',
    skadWziac: 'Postanowienie sądu o przysposobieniu.',
    typ: 'data',
    sciezka: 'zdarzenie.dataUprawomocnienia',
    daneId: 'zdarzenie_typ_i_data_przyjecia',
    warunek: { sciezka: 'zdarzenie.typ', rowne: 'przysposobienie' },
    zakresDat: { minDni: -7 * ROK, maxDni: 2 * ROK },
  },

  // ── Praca i ubezpieczenie ──
  {
    id: 'tytuly_rodzaje',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'osoba',
    etykieta: 'Z jakich umów lub działalności ma Pani/Pan ubezpieczenie? Proszę zaznaczyć wszystkie pasujące.',
    pomoc: 'Można mieć kilka naraz, np. umowę o pracę i umowę zlecenia. Od tego zależy, czy przysługuje zasiłek i w jakiej wysokości. Jeśli nie ma Pani/Pan teraz żadnej umowy ani firmy, proszę nic nie zaznaczać.',
    typ: 'wiele',
    opcje: OPCJE_TYTULY,
    sciezka: `${OSOBA}.tytuly`,
    kodek: 'rodzaje_tytulow',
    daneId: 'tytuly_ubezpieczenia_okresy',
  },
  {
    id: 'tytul_od',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Od kiedy trwa ta umowa albo firma?',
    pomoc: 'Od długości ubezpieczenia zależy, od kiedy przysługuje zasiłek.',
    typ: 'data',
    sciezka: `${TYTUL}.od`,
    daneId: 'tytuly_ubezpieczenia_okresy',
    takze: ['dzialalnosc_daty_status'],
    wymagane: true,
    zakresDat: { minDni: -50 * ROK, maxDni: ROK },
  },
  {
    id: 'etat_czas_okreslony',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Czy to umowa na czas określony albo na okres próbny dłuższy niż miesiąc?',
    pomoc: 'Taka umowa może skończyć się przed porodem. Sprawdzimy, co wtedy z zasiłkiem.',
    skadWziac: 'Umowa o pracę.',
    typ: 'tak_nie',
    sciezka: `${TYTUL}.naCzasOkreslony`,
    daneId: 'umowa_czas_okreslony',
    warunek: ETAT,
  },
  {
    id: 'etat_zastepstwo',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Czy to umowa na zastępstwo innej osoby?',
    pomoc: 'Umowa na zastępstwo działa inaczej niż zwykła umowa na czas określony.',
    skadWziac: 'Umowa o pracę.',
    typ: 'tak_nie',
    sciezka: `${TYTUL}.naZastepstwo`,
    daneId: 'umowa_czas_okreslony',
    warunek: CZAS_OKRESLONY,
  },
  {
    id: 'etat_do',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Do kiedy trwa umowa?',
    pomoc: 'Porównamy tę datę z datą porodu.',
    skadWziac: 'Umowa o pracę.',
    typ: 'data',
    sciezka: `${TYTUL}.do`,
    daneId: 'umowa_czas_okreslony',
    takze: ['tytuly_ubezpieczenia_okresy'],
    warunek: CZAS_OKRESLONY,
    wymagane: true,
    zakresDat: { minDni: -50 * ROK, maxDni: 10 * ROK },
    nieWczesniejNiz: `${TYTUL}.od`,
  },
  {
    id: 'tytul_do',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Do kiedy trwa ta umowa albo firma? Jeśli nie ma daty końca, proszę zostawić pole puste.',
    pomoc: 'Porównamy tę datę z datą porodu.',
    typ: 'data',
    sciezka: `${TYTUL}.do`,
    daneId: 'tytuly_ubezpieczenia_okresy',
    takze: ['dzialalnosc_daty_status'],
    warunek: { nie: ETAT },
    zakresDat: { minDni: -50 * ROK, maxDni: 10 * ROK },
    nieWczesniejNiz: `${TYTUL}.od`,
  },
  {
    id: 'etat_wymiar',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Jaki jest wymiar etatu?',
    pomoc: 'Proszę wpisać 1 przy pełnym etacie, 0,5 przy pół etatu. Tej danej nie ma w żadnej e-usłudze – jest wpisana w umowie o pracę.',
    skadWziac: 'Umowa o pracę.',
    typ: 'liczba',
    sciezka: `${TYTUL}.wymiarEtatu`,
    daneId: 'wymiar_etatu',
    warunek: ETAT,
    min: 0.01,
    max: 1,
  },
  {
    id: 'platnik_powyzej_20',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Czy Pani/Pana pracodawca zatrudnia ponad 20 osób?',
    pomoc:
      'Pytamy, bo od tego zależy, kto wypłaci zasiłek. Gdy pracodawca zgłasza do ubezpieczenia chorobowego ponad 20 osób, wypłaca zasiłek sam. Gdy 20 lub mniej, wypłaca ZUS i wtedy wniosek składa się inaczej. Przy umowie zlecenia chodzi o zleceniodawcę. Jeśli nie ma Pani/Pan pewności, proszę zapytać w kadrach.',
    typ: 'tak_nie',
    nieWiem: true,
    sciezka: `${TYTUL}.platnikPowyzej20`,
    daneId: 'liczba_ubezpieczonych_u_platnika',
    // Przy własnej firmie zasiłek zawsze wypłaca ZUS (brief 7.7), więc nie pytamy.
    warunek: { sciezka: RODZAJ, rozne: 'dzialalnosc' },
  },
  {
    id: 'chorobowe_dobrowolne',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Czy z tej umowy lub działalności jest opłacane dobrowolne ubezpieczenie chorobowe?',
    pomoc: 'Bez ubezpieczenia chorobowego z tej umowy albo firmy nie przysługuje z niej zasiłek. Można to sprawdzić w eZUS albo zapytać zleceniodawcę.',
    typ: 'tak_nie',
    sciezka: `${TYTUL}.chorobowe`,
    kodek: 'chorobowe_dobrowolne',
    daneId: 'rodzaj_ubezpieczenia_chorobowego',
    warunek: { sciezka: RODZAJ, jedenZ: ['zlecenie', 'dzialalnosc', 'wspolpraca'] },
  },
  {
    id: 'chorobowe_inny',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Czy z tego tytułu ma Pani/Pan ubezpieczenie chorobowe?',
    pomoc: 'Bez ubezpieczenia chorobowego nie przysługuje zasiłek z tego tytułu.',
    typ: 'wybor',
    opcje: OPCJE_CHOROBOWE_INNY,
    sciezka: `${TYTUL}.chorobowe`,
    daneId: 'rodzaj_ubezpieczenia_chorobowego',
    warunek: { sciezka: RODZAJ, rowne: 'inny' },
    wymagane: true,
  },
  {
    id: 'chorobowo_od',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Od kiedy jest opłacane dobrowolne ubezpieczenie chorobowe?',
    pomoc: 'Przy dobrowolnym ubezpieczeniu liczy się, ile czasu przed porodem już trwa.',
    podpowiedz: 'Datę zgłoszenia można sprawdzić w eZUS.',
    typ: 'data',
    sciezka: `${TYTUL}.chorobowoOd`,
    daneId: 'rodzaj_ubezpieczenia_chorobowego',
    warunek: { sciezka: `${TYTUL}.chorobowe`, rowne: 'dobrowolne' },
    wymagane: true,
    zakresDat: { minDni: -50 * ROK, maxDni: ROK },
  },
  {
    id: 'zadluzenie_skladkowe',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Ile wynoszą zaległości w składkach ZUS? Jeśli ich nie ma, proszę wpisać 0.',
    pomoc: 'Zaległość w składkach może wstrzymać wypłatę zasiłku do czasu jej spłaty. Dlatego warto to sprawdzić wcześniej.',
    podpowiedz: 'Saldo można sprawdzić w eZUS, w panelu płatnika.',
    typ: 'kwota',
    jednostka: 'zł',
    sciezka: `${TYTUL}.zadluzenieSkladkowe`,
    daneId: 'zadluzenie_skladkowe',
    // Firma i osoba współpracująca (brief, EC-12 i EC-13).
    warunek: FIRMA,
    min: 0,
  },
  {
    id: 'ustanie_umowy',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Czy ta umowa skończyła się albo skończy, zanim dziecko się urodzi lub trafi do Pani/Pana?',
    pomoc: 'Koniec umowy przed porodem może zmienić prawo do zasiłku. Ważne jest też, dlaczego się skończyła.',
    typ: 'tak_nie',
    sciezka: `${TYTUL}.ustanie`,
    kodek: 'obecnosc',
    wartoscPoczatkowa: { data: '', przyczyna: 'koniec_umowy' },
    daneId: 'ustanie_ubezpieczenia',
    warunek: NIE_FIRMA,
  },
  {
    id: 'ustanie_firmy',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Czy firma została albo zostanie zamknięta, zanim dziecko się urodzi lub trafi do Pani/Pana?',
    pomoc: 'Koniec ubezpieczenia przed porodem może zmienić prawo do zasiłku.',
    typ: 'tak_nie',
    sciezka: `${TYTUL}.ustanie`,
    kodek: 'obecnosc',
    wartoscPoczatkowa: { data: '', przyczyna: 'zakonczenie_dzialalnosci' },
    daneId: 'ustanie_ubezpieczenia',
    takze: ['dzialalnosc_daty_status'],
    warunek: FIRMA,
  },
  {
    id: 'ustanie_data',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Kiedy był albo będzie ostatni dzień?',
    pomoc: 'Zwykle to ten sam dzień, co koniec umowy albo zamknięcie firmy.',
    typ: 'data',
    sciezka: `${TYTUL}.ustanie.data`,
    daneId: 'ustanie_ubezpieczenia',
    warunek: MA_USTANIE,
    wymagane: true,
    zakresDat: { minDni: -10 * ROK, maxDni: 5 * ROK },
    nieWczesniejNiz: `${TYTUL}.od`,
  },
  {
    id: 'ustanie_przyczyna_umowy',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Dlaczego umowa się skończyła?',
    pomoc: 'Przy niektórych przyczynach, np. upadłości pracodawcy, zasiłek przysługuje mimo końca umowy.',
    typ: 'wybor',
    opcje: OPCJE_USTANIE_UMOWY,
    sciezka: `${TYTUL}.ustanie.przyczyna`,
    daneId: 'ustanie_ubezpieczenia',
    warunek: { wszystkie: [MA_USTANIE, NIE_FIRMA] },
    wymagane: true,
  },
  {
    id: 'ustanie_przyczyna_firmy',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Co się stało z firmą?',
    typ: 'wybor',
    opcje: OPCJE_USTANIE_FIRMY,
    sciezka: `${TYTUL}.ustanie.przyczyna`,
    daneId: 'ustanie_ubezpieczenia',
    warunek: { wszystkie: [MA_USTANIE, FIRMA] },
    wymagane: true,
  },
  {
    id: 'urlop_wychowawczy',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'osoba',
    etykieta: 'Czy w tym czasie trwa Pani/Pana urlop wychowawczy, np. ze starszym dzieckiem?',
    pomoc: 'Urlop wychowawczy może zmienić prawo do zasiłku i jego wysokość.',
    typ: 'tak_nie',
    sciezka: `${OSOBA}.urlopWychowawczy`,
    kodek: 'obecnosc',
    wartoscPoczatkowa: { od: '', do: '' },
    daneId: 'urlop_wychowawczy',
  },
  {
    id: 'urlop_wychowawczy_od',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'osoba',
    etykieta: 'Od kiedy trwa urlop wychowawczy?',
    typ: 'data',
    sciezka: `${OSOBA}.urlopWychowawczy.od`,
    daneId: 'urlop_wychowawczy',
    warunek: MA_URLOP_WYCHOWAWCZY,
    wymagane: true,
    zakresDat: { minDni: -10 * ROK, maxDni: 7 * ROK },
  },
  {
    id: 'urlop_wychowawczy_do',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'osoba',
    etykieta: 'Do kiedy trwa urlop wychowawczy?',
    typ: 'data',
    sciezka: `${OSOBA}.urlopWychowawczy.do`,
    daneId: 'urlop_wychowawczy',
    warunek: MA_URLOP_WYCHOWAWCZY,
    wymagane: true,
    zakresDat: { minDni: -10 * ROK, maxDni: 7 * ROK },
    nieWczesniejNiz: `${OSOBA}.urlopWychowawczy.od`,
  },

  // ── Zarobki (podstawa) ──
  {
    id: 'tryb_podstawy',
    warstwa: 'A',
    krok: 'zarobki',
    zakres: 'tytul',
    etykieta: 'Jak podać zarobki z tej umowy albo firmy?',
    pomoc: 'Jedna kwota wystarczy do szacunku. Lista miesięcy daje dokładniejszy wynik, gdy zarobki się zmieniały.',
    typ: 'wybor',
    opcje: OPCJE_TRYB_PODSTAWY,
    sciezka: TYTUL,
    kodek: 'tryb_podstawy',
    daneId: 'podstawa_skladek_miesiecznie',
    wymagane: true,
  },
  {
    id: 'wynagrodzenie_miesieczne',
    warstwa: 'A',
    krok: 'zarobki',
    zakres: 'tytul',
    etykieta: 'Jakie jest miesięczne wynagrodzenie brutto z tej umowy?',
    pomoc: 'Od tej kwoty liczymy zasiłek. Brutto to kwota przed potrąceniem podatku i składek. Przy umowie zlecenia proszę wpisać przychód z umowy.',
    podpowiedz: 'Kwota brutto jest w umowie albo na pasku wypłaty.',
    typ: 'kwota',
    jednostka: 'zł',
    sciezka: `${TYTUL}.wynagrodzenieMiesieczne`,
    daneId: 'podstawa_skladek_miesiecznie',
    warunek: { wszystkie: [TRYB_KWOTA, NIE_FIRMA] },
    wymagane: true,
    min: 0,
  },
  {
    id: 'dzialalnosc_podstawa',
    warstwa: 'A',
    krok: 'zarobki',
    zakres: 'tytul',
    etykieta: 'Od jakiej miesięcznej podstawy są opłacane składki na ubezpieczenia społeczne?',
    pomoc: 'Przy firmie zasiłek liczymy od podstawy, od której są opłacane składki, a nie od przychodu czy dochodu firmy.',
    podpowiedz: 'Podstawę można sprawdzić w eZUS albo w deklaracji ZUS DRA.',
    skadWziac: 'Deklaracja rozliczeniowa w eZUS.',
    typ: 'kwota',
    jednostka: 'zł',
    sciezka: `${TYTUL}.zadeklarowanaPodstawa`,
    daneId: 'podstawa_zadeklarowana_dzialalnosc',
    warunek: { wszystkie: [TRYB_KWOTA, FIRMA] },
    wymagane: true,
    min: 0,
  },
  {
    id: 'podstawa_miesiace',
    warstwa: 'A',
    krok: 'zarobki',
    zakres: 'tytul',
    etykieta: 'Podstawa składek miesiąc po miesiącu (ostatnie 12 miesięcy)',
    pomoc: 'Proszę wpisać kwotę brutto za każdy miesiąc. Jeśli w którymś miesiącu były dni bez pracy, można dopisać dni przepracowane.',
    podpowiedz: 'Te kwoty można sprawdzić w eZUS, w „Informacjach o podstawach i składkach”.',
    skadWziac: 'eZUS: „Informacje o podstawach i składkach”. Dni przepracowane i składniki zna pracodawca (Z-3).',
    typ: 'lista_miesiecy',
    jednostka: 'zł',
    sciezka: `${TYTUL}.podstawaSkladek`,
    daneId: 'podstawa_skladek_miesiecznie',
    takze: ['skladniki_wynagrodzenia'],
    warunek: TRYB_MIESIACE,
    wymagane: true,
    zaawansowane: true,
  },
  {
    id: 'skladnik_roczny',
    warstwa: 'A',
    krok: 'zarobki',
    zakres: 'tytul',
    etykieta: 'Ile wyniosła premia roczna za poprzedni rok? Jeśli jej nie było, proszę zostawić pole puste.',
    pomoc: 'Premia roczna też może podnieść zasiłek.',
    podpowiedz: 'Kwota jest na pasku wypłaty; można też zapytać w kadrach.',
    skadWziac: 'Pasek wynagrodzenia albo pracodawca.',
    typ: 'kwota',
    jednostka: 'zł',
    sciezka: `${TYTUL}.skladnikRoczny`,
    daneId: 'skladniki_wynagrodzenia',
    warunek: { wszystkie: [ETAT, TRYB_MIESIACE] },
    min: 0,
    zaawansowane: true,
  },

  // ── Ciąża i zwolnienia ──
  {
    id: 'zwolnienia_w_ciazy',
    warstwa: 'A',
    krok: 'ciaza',
    zakres: 'osoba',
    etykieta: 'Zwolnienia lekarskie w ciąży',
    pomoc: 'Proszę dodać każde zwolnienie z czasu ciąży. Na zwolnieniu z kodem B (ciąża) zasiłek jest wyższy, więc warto zaznaczyć, jeśli lekarz go wpisał. Jeśli zwolnień nie było, lista zostaje pusta.',
    podpowiedz: 'Zwolnienia można sprawdzić w eZUS albo w Internetowym Koncie Pacjenta.',
    skadWziac: 'eZUS albo mZUS: „Zaświadczenia lekarskie”.',
    typ: 'lista_zwolnien',
    sciezka: `${OSOBA}.zdrowie.eZLA`,
    daneId: 'ezla_okresy',
    takze: ['ezla_kod_b'],
    warunek: { wszystkie: [MATKA, POROD] },
    zakresDat: { minDni: -2 * ROK, maxDni: ROK },
  },

  // ── Po porodzie (dla każdego dziecka) ──
  {
    id: 'dziecko_tydzien_ciazy',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'W którym tygodniu ciąży urodziło się dziecko?',
    pomoc: 'Przy wcześniakach przysługuje dodatkowy urlop.',
    podpowiedz: 'Tydzień jest na zaświadczeniu ze szpitala.',
    skadWziac: 'Karta informacyjna ze szpitala.',
    typ: 'liczba',
    jednostka: 'tydzień',
    sciezka: `${DZIECKO}.tydzienCiazy`,
    daneId: 'dziecko_tydzien_ciazy_i_masa',
    warunek: URODZONE,
    min: 20,
    max: 45,
  },
  {
    id: 'dziecko_masa',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'Ile ważyło dziecko po urodzeniu?',
    pomoc: 'Przy bardzo małej masie urodzeniowej przysługuje dłuższy dodatkowy urlop.',
    skadWziac: 'Karta informacyjna ze szpitala.',
    typ: 'liczba',
    jednostka: 'g',
    sciezka: `${DZIECKO}.masaG`,
    daneId: 'dziecko_tydzien_ciazy_i_masa',
    warunek: URODZONE,
    min: 200,
    max: 7000,
  },
  {
    id: 'dziecko_szpital',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'Czy dziecko po porodzie zostało w szpitalu? Proszę podać, od kiedy do kiedy.',
    pomoc: 'Gdy dziecko po porodzie zostaje w szpitalu, może przysługiwać dodatkowy urlop. Jeśli nie zostało, proszę zostawić pole puste.',
    skadWziac: 'Zaświadczenie ze szpitala o okresie pobytu dziecka.',
    typ: 'lista_okresow',
    sciezka: `${DZIECKO}.szpital`,
    daneId: 'dziecko_pobyt_w_szpitalu',
    warunek: URODZONE,
    zakresDat: { minDni: -7 * ROK, maxDni: ROK },
  },
  {
    id: 'dziecko_za_zyciem',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'Czy dziecko ma zaświadczenie „Za życiem”?',
    pomoc: 'Lekarz wystawia je przy ciężkiej chorobie albo niepełnosprawności dziecka. Z tym zaświadczeniem urlop rodzicielski jest dłuższy.',
    skadWziac: 'Zaświadczenie lekarskie „Za życiem”.',
    typ: 'tak_nie',
    sciezka: `${DZIECKO}.zaZyciem`,
    daneId: 'dziecko_za_zyciem',
    warunek: POROD,
    delikatne: true,
  },
  {
    id: 'dziecko_martwe',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'Czy dziecko urodziło się martwe?',
    pomoc: 'Wiemy, że to bardzo trudne pytanie. Zadajemy je, bo od tego zależy długość urlopu i zasiłku. Jeśli nie dotyczy, proszę je pominąć.',
    skadWziac: 'Zaświadczenie o martwym urodzeniu.',
    typ: 'tak_nie',
    sciezka: `${DZIECKO}.martwe`,
    daneId: 'martwe_urodzenie_albo_zgon_dziecka',
    warunek: URODZONE,
    delikatne: true,
  },
  {
    id: 'dziecko_zgon',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'Jeśli dziecko zmarło, proszę podać datę.',
    pomoc: 'Bardzo nam przykro, jeśli tak się stało. Od tej daty zależy, do kiedy trwa urlop. Jeśli nie dotyczy, proszę zostawić pole puste.',
    typ: 'data',
    sciezka: `${DZIECKO}.zgon`,
    daneId: 'martwe_urodzenie_albo_zgon_dziecka',
    warunek: { wszystkie: [URODZONE, { sciezka: `${DZIECKO}.martwe`, rozne: true }] },
    zakresDat: { minDni: -7 * ROK, maxDni: 0 },
    nieWczesniejNiz: 'zdarzenie.data',
    delikatne: true,
  },

  // ── Trudne sytuacje (zdrowie i sytuacja mamy) ──
  {
    id: 'orzeczenie_niezdolnosci',
    warstwa: 'A',
    krok: 'trudne_sytuacje',
    zakres: 'osoba',
    etykieta: 'Czy mama dziecka ma orzeczenie o niezdolności do samodzielnej egzystencji?',
    pomoc: 'Wtedy drugi rodzic może wcześniej przejąć część urlopu macierzyńskiego.',
    skadWziac: 'Orzeczenie lekarza orzecznika ZUS albo komisji.',
    typ: 'tak_nie',
    sciezka: `${OSOBA}.zdrowie.orzeczenieNiezdolnosciSamodzielnejEgzystencji`,
    daneId: 'orzeczenie_o_niezdolnosci_do_samodzielnej_egzystencji',
    warunek: MATKA,
    delikatne: true,
  },
  {
    id: 'pobyt_matki_w_szpitalu',
    warstwa: 'A',
    krok: 'trudne_sytuacje',
    zakres: 'osoba',
    etykieta: 'Czy mama dziecka jest po porodzie w szpitalu i nie może opiekować się dzieckiem? Proszę podać, od kiedy do kiedy.',
    pomoc: 'Drugi rodzic może wtedy przejąć część urlopu macierzyńskiego. Jeśli to nie dotyczy, proszę zostawić pole puste.',
    skadWziac: 'Zaświadczenie ze szpitala.',
    typ: 'lista_okresow',
    sciezka: `${OSOBA}.zdrowie.pobytWSzpitalu`,
    daneId: 'pobyt_wnioskodawcy_w_szpitalu',
    takze: ['sytuacja_matki'],
    warunek: { wszystkie: [MATKA, URODZONE] },
    zakresDat: { minDni: -7 * ROK, maxDni: ROK },
    delikatne: true,
  },
  {
    id: 'porzucenie_dziecka',
    warstwa: 'A',
    krok: 'trudne_sytuacje',
    zakres: 'osoba',
    etykieta: 'Jeśli mama porzuciła dziecko, proszę podać datę.',
    pomoc: 'Wtedy opiekę i urlop może przejąć tata albo ktoś z najbliższej rodziny. Jeśli to nie dotyczy, proszę zostawić pole puste.',
    typ: 'data',
    sciezka: `${OSOBA}.zdrowie.porzucenieDziecka`,
    daneId: 'sytuacja_matki',
    warunek: { wszystkie: [MATKA, URODZONE, DRUGA_OSOBA] },
    zakresDat: { minDni: -7 * ROK, maxDni: 0 },
    nieWczesniejNiz: 'zdarzenie.data',
    delikatne: true,
  },
  {
    id: 'zgon_matki',
    warstwa: 'A',
    krok: 'trudne_sytuacje',
    zakres: 'osoba',
    etykieta: 'Jeśli mama dziecka zmarła, proszę podać datę.',
    pomoc: 'Bardzo nam przykro, jeśli tak się stało. Urlop i zasiłek może wtedy przejąć tata albo ktoś z najbliższej rodziny.',
    typ: 'data',
    sciezka: `${OSOBA}.zdrowie.zgon`,
    daneId: 'sytuacja_matki',
    warunek: { wszystkie: [MATKA, URODZONE, DRUGA_OSOBA] },
    zakresDat: { minDni: -7 * ROK, maxDni: 0 },
    delikatne: true,
  },

  // ── Podatek ──
  {
    id: 'pit2',
    warstwa: 'A',
    krok: 'podatek',
    zakres: 'osoba',
    etykieta: 'Czy u pracodawcy albo u tego, kto będzie wypłacać zasiłek, jest złożony PIT-2?',
    pomoc: 'PIT-2 to oświadczenie, dzięki któremu z każdej wypłaty potrąca się trochę mniejszą zaliczkę na podatek. Zmienia tylko szacunek kwoty „na rękę”, nie prawo do zasiłku.',
    typ: 'tak_nie',
    nieWiem: true,
    sciezka: `${OSOBA}.pit2`,
    daneId: 'pit2_zlozony',
    zaawansowane: true,
  },
];

// ───────────────────────── Warstwa B: dane do wniosków ─────────────────────────

export const PYTANIA_DOKUMENTY: DefinicjaPytaniaDokumentu[] = [
  // ── Twoje dane ──
  {
    id: 'osoba_imie',
    warstwa: 'B',
    krok: 'dane_osobowe',
    zakres: 'osoba',
    etykieta: 'Imię',
    typ: 'tekst',
    sciezka: `${OSOBA}.dane.imie`,
    daneId: 'wnioskodawca_imie_nazwisko',
    takze: ['drugi_rodzic_dane', 'matka_dane'],
    wymagane: true,
  },
  {
    id: 'osoba_nazwisko',
    warstwa: 'B',
    krok: 'dane_osobowe',
    zakres: 'osoba',
    etykieta: 'Nazwisko',
    typ: 'tekst',
    sciezka: `${OSOBA}.dane.nazwisko`,
    daneId: 'wnioskodawca_imie_nazwisko',
    takze: ['drugi_rodzic_dane', 'matka_dane'],
    wymagane: true,
  },
  {
    id: 'osoba_pesel',
    warstwa: 'B',
    krok: 'dane_osobowe',
    zakres: 'osoba',
    etykieta: 'PESEL',
    typ: 'pesel',
    sciezka: `${OSOBA}.dane.pesel`,
    daneId: 'wnioskodawca_pesel',
    takze: ['drugi_rodzic_dane', 'matka_dane'],
    wymagane: true,
  },
  {
    id: 'osoba_data_urodzenia',
    warstwa: 'B',
    krok: 'dane_osobowe',
    zakres: 'osoba',
    etykieta: 'Data urodzenia',
    typ: 'data',
    sciezka: `${OSOBA}.dane.dataUrodzenia`,
    daneId: 'wnioskodawca_data_urodzenia',
    zakresDat: { minDni: -100 * ROK, maxDni: 0 },
  },
  {
    id: 'osoba_dokument',
    warstwa: 'B',
    krok: 'dane_osobowe',
    zakres: 'osoba',
    etykieta: 'Rodzaj, seria i numer dokumentu tożsamości',
    pomoc: 'Proszę wypełnić tylko wtedy, gdy nie ma Pani/Pan numeru PESEL.',
    typ: 'tekst',
    sciezka: `${OSOBA}.dane.dokumentTozsamosci`,
    daneId: 'wnioskodawca_dokument_tozsamosci',
    warunek: { sciezka: `${OSOBA}.dane.pesel`, wypelnione: false },
  },
  {
    id: 'osoba_adres',
    warstwa: 'B',
    krok: 'dane_osobowe',
    zakres: 'osoba',
    etykieta: 'Adres zamieszkania',
    typ: 'adres',
    sciezka: `${OSOBA}.dane.adres`,
    daneId: 'wnioskodawca_adres',
    wymagane: true,
  },
  {
    id: 'osoba_telefon',
    warstwa: 'B',
    krok: 'dane_osobowe',
    zakres: 'osoba',
    etykieta: 'Numer telefonu (nieobowiązkowo)',
    pomoc: 'Ułatwi ZUS kontakt w sprawie wniosku.',
    typ: 'telefon',
    sciezka: `${OSOBA}.dane.telefon`,
    daneId: 'wnioskodawca_telefon',
  },
  {
    id: 'osoba_rachunek',
    warstwa: 'B',
    krok: 'dane_osobowe',
    zakres: 'osoba',
    etykieta: 'Numer rachunku do wypłaty zasiłku (nieobowiązkowo)',
    pomoc: 'Bez numeru rachunku zasiłek przyjdzie w inny sposób, np. przekazem pocztowym.',
    typ: 'rachunek',
    sciezka: `${OSOBA}.dane.rachunekBankowy`,
    daneId: 'rachunek_bankowy',
  },

  // ── Pracodawca albo zleceniodawca ──
  {
    id: 'tytul_nazwa_platnika',
    warstwa: 'B',
    krok: 'dane_platnika',
    zakres: 'tytul',
    etykieta: 'Nazwa pracodawcy albo zleceniodawcy',
    typ: 'tekst',
    sciezka: `${TYTUL}.nazwaPlatnika`,
    daneId: 'platnik_nazwa',
    warunek: MA_PLATNIKA,
    wymagane: true,
  },
  {
    id: 'tytul_nip_platnika',
    warstwa: 'B',
    krok: 'dane_platnika',
    zakres: 'tytul',
    etykieta: 'NIP pracodawcy albo zleceniodawcy',
    podpowiedz: 'Jest w umowie albo na pasku wypłaty.',
    typ: 'nip',
    sciezka: `${TYTUL}.nipPlatnika`,
    daneId: 'platnik_identyfikatory',
    warunek: MA_PLATNIKA,
    wymagane: true,
  },
  {
    id: 'tytul_regon_platnika',
    warstwa: 'B',
    krok: 'dane_platnika',
    zakres: 'tytul',
    etykieta: 'REGON pracodawcy albo zleceniodawcy (tylko jeśli nie ma NIP)',
    typ: 'regon',
    sciezka: `${TYTUL}.regonPlatnika`,
    daneId: 'platnik_identyfikatory',
    warunek: { wszystkie: [MA_PLATNIKA, { sciezka: `${TYTUL}.nipPlatnika`, wypelnione: false }] },
  },

  // ── Dane dziecka ──
  {
    id: 'dziecko_imie',
    warstwa: 'B',
    krok: 'dane_dziecka',
    zakres: 'dziecko',
    etykieta: 'Imię dziecka',
    typ: 'tekst',
    sciezka: `${DZIECKO}.dane.imie`,
    daneId: 'dziecko_dane_podstawowe',
    warunek: DZIECKO_JEST,
    wymagane: true,
  },
  {
    id: 'dziecko_nazwisko',
    warstwa: 'B',
    krok: 'dane_dziecka',
    zakres: 'dziecko',
    etykieta: 'Nazwisko dziecka',
    typ: 'tekst',
    sciezka: `${DZIECKO}.dane.nazwisko`,
    daneId: 'dziecko_dane_podstawowe',
    warunek: DZIECKO_JEST,
    wymagane: true,
  },
  {
    id: 'dziecko_miejsce_urodzenia',
    warstwa: 'B',
    krok: 'dane_dziecka',
    zakres: 'dziecko',
    etykieta: 'Miejsce urodzenia dziecka',
    typ: 'tekst',
    sciezka: `${DZIECKO}.dane.miejsceUrodzenia`,
    daneId: 'dziecko_dane_podstawowe',
    warunek: DZIECKO_JEST,
    wymagane: true,
  },
  {
    id: 'dziecko_pesel',
    warstwa: 'B',
    krok: 'dane_dziecka',
    zakres: 'dziecko',
    etykieta: 'PESEL dziecka',
    pomoc: 'Dziecko otrzymuje PESEL po zarejestrowaniu urodzenia. Jeśli jeszcze go nie ma, proszę zostawić pole puste.',
    typ: 'pesel',
    sciezka: `${DZIECKO}.dane.pesel`,
    daneId: 'dziecko_pesel',
    warunek: DZIECKO_JEST,
  },

  // ── Oświadczenia ──
  {
    id: 'ojcowski_z_innego_tytulu',
    warstwa: 'B',
    krok: 'oswiadczenia',
    zakres: 'osoba',
    etykieta: 'Czy za ten sam okres urlopu ojcowskiego otrzymuje Pan już zasiłek z innej umowy?',
    pomoc: 'To pytanie z wniosku ZAM. Zwykle odpowiedź to „nie”.',
    typ: 'tak_nie',
    sciezka: `${OSOBA}.oswiadczenia.ojcowskiZInnegoTytulu`,
    daneId: 'ojcowski_zasilek_z_innego_tytulu',
    warunek: { sciezka: `${OSOBA}.rola`, rowne: 'ojciec' },
  },
];

// ───────────────────────── Poza kwestionariuszem ─────────────────────────

export const POZA_KWESTIONARIUSZEM: DanaPozaKwestionariuszem[] = [
  {
    daneId: 'plan_okresy_urlopow',
    rodzaj: 'plan',
    wyjasnienie: 'Okresy urlopów rodzic ustawia na osi czasu (planer), a nie w kwestionariuszu.',
  },
  {
    daneId: 'wariant_81_5',
    rodzaj: 'plan',
    wyjasnienie: 'Wybór 81,5% to przełącznik planu (Plan.wariant815).',
  },
  {
    daneId: 'laczenie_rodzicielskiego_z_praca',
    rodzaj: 'plan',
    wyjasnienie: 'Łączenie z pracą to akcja na odcinku planu (wymiarPracy).',
  },
  {
    daneId: 'drugi_rodzic_korzysta_z_zasilku',
    rodzaj: 'plan',
    wyjasnienie: 'Wynika z odcinków drugiej osoby w planie; wniosek odczytuje to z planu.',
  },
  {
    daneId: 'wykorzystany_urlop_rodzicielski',
    rodzaj: 'plan',
    wyjasnienie: 'Wykorzystane części to odcinki rodzicielskie w planie sprzed dnia analizy.',
  },
  {
    daneId: 'data_wypelnienia',
    rodzaj: 'automatyczne',
    wyjasnienie: 'Data wypełnienia to dzień wygenerowania wniosku; podpis rodzic składa na wydruku.',
  },
  {
    daneId: 'oswiadczenia_do_pracodawcy',
    rodzaj: 'oswiadczenie',
    wyjasnienie: 'Treść oświadczeń wynika z planu; rodzic potwierdza je przy pobieraniu wniosku do pracodawcy.',
  },
  {
    daneId: 'pobrane_zasilki',
    rodzaj: 'symulacja',
    wyjasnienie: 'Pokazuje je symulowany eZUS („Świadczenia i przerwy”); rodzic ich nie wpisuje. Kontrakt nie ma jeszcze na nie pola.',
  },
  {
    daneId: 'zal_zaswiadczenie_o_przewidywanej_dacie_porodu',
    rodzaj: 'zalacznik',
    wyjasnienie: 'Dokument od lekarza; aplikacja tylko mówi, że trzeba go dołączyć (lista załączników w dokumentach).',
  },
  {
    daneId: 'zal_odpis_aktu_urodzenia',
    rodzaj: 'zalacznik',
    wyjasnienie: 'Dokument z USC; symulacja wniosku o odpis jest osobno, a lista dokumentów mówi, kiedy jest potrzebny.',
  },
  {
    daneId: 'zal_zaswiadczenie_szpitalne_uzupelniajacy',
    rodzaj: 'zalacznik',
    wyjasnienie: 'Dokument ze szpitala; aplikacja tylko mówi, że trzeba go dołączyć.',
  },
  {
    daneId: 'zal_za_zyciem',
    rodzaj: 'zalacznik',
    wyjasnienie: 'Kopię zaświadczenia „Za życiem” dołącza rodzic; w kwestionariuszu pytamy tylko, czy je ma.',
  },
  {
    daneId: 'zal_dokumenty_sadowe',
    rodzaj: 'zalacznik',
    wyjasnienie: 'Dokumenty z sądu przy przysposobieniu i rodzinie zastępczej dołącza rodzic.',
  },
  {
    daneId: 'zal_zaswiadczenie_platnika_z3',
    rodzaj: 'zalacznik',
    wyjasnienie: 'Z-3 i Z-3a wypełnia i wysyła płatnik, nie rodzic.',
  },
  {
    daneId: 'zal_wniosek_ojca_albo_oswiadczenie_matki',
    rodzaj: 'zalacznik',
    wyjasnienie: 'Aplikacja generuje te pisma z planu (wnioski do pracodawcy).',
  },
];

// ───────────────────────── Funkcje pomocnicze ─────────────────────────
// Tor C ma własny silnik ankiety; te funkcje działają na tym samym kształcie (testy toru D, inne moduły).

/** Pytanie z dowolnej warstwy. */
export type DowolnePytanie = DefinicjaPytania | DefinicjaPytaniaDokumentu;

/** Obie warstwy razem, w kolejności: najpierw A, potem B. */
export const WSZYSTKIE_PYTANIA: DowolnePytanie[] = [...PYTANIA, ...PYTANIA_DOKUMENTY];

type Segment = string | number;

function segmenty(sciezka: string): Segment[] {
  const wynik: Segment[] = [];
  for (const m of sciezka.matchAll(/([^.[\]]+)|\[(\d+)\]/g)) {
    wynik.push(m[2] !== undefined ? Number(m[2]) : m[1]);
  }
  return wynik;
}

const ZNACZNIKI: Record<string, keyof ZakresInstancji> = { $osoba: 'osoba', $tytul: 'tytul', $dziecko: 'dziecko' };

function podstaw(sciezka: string, indeksy: ZakresInstancji, id?: string): string {
  return sciezka.replace(/\$[a-z]+/g, (znacznik) => {
    const nazwa = ZNACZNIKI[znacznik];
    const nr = nazwa === undefined ? undefined : indeksy[nazwa];
    if (nr === undefined) throw new Error(`${id ? `Pytanie ${id}: ` : ''}ścieżka „${sciezka}” wymaga numeru ${znacznik}.`);
    return String(nr);
  });
}

/** Wstawia numery osoby, tytułu i dziecka do ścieżki z definicji pytania. */
export function sciezkaKonkretna(pytanie: Pick<DowolnePytanie, 'sciezka' | 'id'>, indeksy: ZakresInstancji): string {
  return podstaw(pytanie.sciezka, indeksy, pytanie.id);
}

/** Wartość pod ścieżką (np. 'osoby[0].tytuly[1].od') albo undefined. */
export function odczytaj(rodzina: Rodzina, sciezka: string): unknown {
  let w: unknown = rodzina;
  for (const k of segmenty(sciezka)) {
    if (w === null || typeof w !== 'object') return undefined;
    w = (w as Record<Segment, unknown>)[k];
  }
  return w;
}

/**
 * Nowa rodzina z wartością pod ścieżką. Wejście się nie zmienia; brakujące obiekty i listy
 * powstają po drodze. `undefined` usuwa pole.
 */
export function zapisz(rodzina: Rodzina, sciezka: string, wartosc: unknown): Rodzina {
  const k = segmenty(sciezka);
  if (k.length === 0) return structuredClone(wartosc) as Rodzina;
  const kopia = structuredClone(rodzina);
  let w = kopia as unknown as Record<Segment, unknown>;
  for (let i = 0; i < k.length - 1; i++) {
    if (w[k[i]] === undefined || w[k[i]] === null) w[k[i]] = typeof k[i + 1] === 'number' ? [] : {};
    w = w[k[i]] as Record<Segment, unknown>;
  }
  const ostatni = k[k.length - 1];
  if (wartosc === undefined) delete w[ostatni];
  else w[ostatni] = typeof wartosc === 'object' && wartosc !== null ? structuredClone(wartosc) : wartosc;
  return kopia;
}

function wypelnione(v: unknown): boolean {
  return v !== undefined && v !== null && v !== '';
}

/** Czy warunek pokazania pytania jest spełniony dla tej rodziny i tych numerów osoby/tytułu/dziecka. */
export function spelniaWarunek(w: Warunek, rodzina: Rodzina, indeksy: ZakresInstancji): boolean {
  if ('wszystkie' in w) return w.wszystkie.every((x) => spelniaWarunek(x, rodzina, indeksy));
  if ('ktorykolwiek' in w) return w.ktorykolwiek.some((x) => spelniaWarunek(x, rodzina, indeksy));
  if ('nie' in w) return !spelniaWarunek(w.nie, rodzina, indeksy);
  const v = odczytaj(rodzina, podstaw(w.sciezka, indeksy));
  if ('rowne' in w) return v === w.rowne;
  if ('rozne' in w) return v !== w.rozne;
  if ('jedenZ' in w) return w.jedenZ.some((x) => x === v);
  return wypelnione(v) === w.wypelnione;
}

function nowyIdTytulu(rodzaj: string, zajete: Set<string>): string {
  let n = 1;
  while (zajete.has(`${rodzaj}-${n}`)) n++;
  zajete.add(`${rodzaj}-${n}`);
  return `${rodzaj}-${n}`;
}

/** Aktualna odpowiedź na pytanie w kształcie z formularza (po kodeku). */
export function odczytajOdpowiedz(rodzina: Rodzina, pytanie: DowolnePytanie, indeksy: ZakresInstancji): unknown {
  const w = odczytaj(rodzina, sciezkaKonkretna(pytanie, indeksy));
  switch (pytanie.kodek) {
    case 'rodzaje_tytulow':
      return Array.isArray(w) ? [...new Set((w as TytulUbezpieczenia[]).map((t) => t.rodzaj))] : [];
    case 'dlugosc_listy':
      return Array.isArray(w) ? w.length : undefined;
    case 'etap': {
      const z = w as ZdarzenieDziecka | undefined;
      if (!z) return undefined;
      if (z.typ === 'porod') return z.przewidywana ? 'w_ciazy' : 'urodzone';
      return 'przyjecie';
    }
    case 'chorobowe_dobrowolne':
      return w === 'dobrowolne' ? true : w === 'brak' ? false : undefined;
    case 'tryb_podstawy': {
      const t = w as TytulUbezpieczenia | undefined;
      if (!t) return undefined;
      if (Array.isArray(t.podstawaSkladek)) return 'miesiace';
      return t.wynagrodzenieMiesieczne !== undefined || t.zadeklarowanaPodstawa !== undefined ? 'kwota' : undefined;
    }
    case 'obecnosc':
      return w !== undefined && w !== null;
    default:
      return w;
  }
}

/** Zapisuje odpowiedź z formularza (przez kodek, jeśli pytanie go ma). Zwraca nową rodzinę. */
export function zapiszOdpowiedz(rodzina: Rodzina, pytanie: DowolnePytanie, indeksy: ZakresInstancji, wartosc: unknown): Rodzina {
  const sciezka = sciezkaKonkretna(pytanie, indeksy);
  switch (pytanie.kodek) {
    case 'rodzaje_tytulow': {
      const wybrane = [...new Set((Array.isArray(wartosc) ? wartosc : []).map(String))] as RodzajTytulu[];
      const istniejace = (odczytaj(rodzina, sciezka) as TytulUbezpieczenia[] | undefined) ?? [];
      const zostaja = istniejace.filter((t) => wybrane.includes(t.rodzaj));
      const zajete = new Set(zostaja.map((t) => t.id));
      for (const rodzaj of wybrane) {
        if (zostaja.some((t) => t.rodzaj === rodzaj)) continue;
        zostaja.push({
          id: nowyIdTytulu(rodzaj, zajete),
          rodzaj,
          // Pracownik podlega chorobowemu obowiązkowo [ustawa o systemie ubezpieczeń społecznych, art. 11 ust. 1];
          // przy pozostałych tytułach pytamy wprost (`chorobowe_dobrowolne`, `chorobowe_inny`).
          chorobowe: rodzaj === 'umowa_o_prace' ? 'obowiazkowe' : 'brak',
          // Pusta data = „jeszcze nie odpowiedziano”; pytanie `tytul_od` jest wymagane.
          od: '',
        });
      }
      return zapisz(rodzina, sciezka, zostaja);
    }
    case 'dlugosc_listy': {
      const n = typeof wartosc === 'number' ? Math.floor(wartosc) : Number.NaN;
      if (!Number.isFinite(n) || n < 0) return rodzina;
      const obecne = (odczytaj(rodzina, sciezka) as Dziecko[] | undefined) ?? [];
      return zapisz(rodzina, sciezka, Array.from({ length: n }, (_, i) => obecne[i] ?? {}));
    }
    case 'etap': {
      const z = rodzina.zdarzenie;
      if (wartosc === 'w_ciazy') return zapisz(rodzina, sciezka, { ...z, typ: 'porod', przewidywana: true });
      if (wartosc === 'urodzone') return zapisz(rodzina, sciezka, { ...z, typ: 'porod', przewidywana: false });
      if (wartosc === 'przyjecie') {
        return zapisz(rodzina, sciezka, { ...z, typ: z.typ === 'porod' ? 'przysposobienie' : z.typ, przewidywana: false });
      }
      return rodzina;
    }
    case 'chorobowe_dobrowolne':
      if (wartosc === true) return zapisz(rodzina, sciezka, 'dobrowolne');
      if (wartosc === false) return zapisz(rodzina, sciezka, 'brak');
      return rodzina;
    case 'tryb_podstawy': {
      const obecna = odczytaj(rodzina, `${sciezka}.podstawaSkladek`);
      if (wartosc === 'miesiace') return Array.isArray(obecna) ? rodzina : zapisz(rodzina, `${sciezka}.podstawaSkladek`, []);
      if (wartosc === 'kwota') return obecna === undefined ? rodzina : zapisz(rodzina, `${sciezka}.podstawaSkladek`, undefined);
      return rodzina;
    }
    case 'obecnosc':
      if (wartosc === true) {
        return odczytaj(rodzina, sciezka) !== undefined ? rodzina : zapisz(rodzina, sciezka, pytanie.wartoscPoczatkowa ?? {});
      }
      return zapisz(rodzina, sciezka, undefined);
    default:
      return zapisz(rodzina, sciezka, wartosc);
  }
}

/** Pytanie rozwinięte na konkretną osobę, tytuł albo dziecko. */
export interface PytanieDoPokazania {
  def: DowolnePytanie;
  zakres: ZakresInstancji;
  /** Ścieżka z wstawionymi numerami, np. 'osoby[0].tytuly[1].od'. */
  sciezka: string;
  /** Unikalny klucz, np. 'tytul_od@o0.t1'. */
  klucz: string;
  /** Aktualna odpowiedź z profilu (z symulacji, wgranego wniosku albo wpisana), po kodeku. */
  wartosc: unknown;
}

function instancje(pytanie: DowolnePytanie, rodzina: Rodzina): ZakresInstancji[] {
  switch (pytanie.zakres) {
    case 'rodzina':
      return [{}];
    case 'osoba':
      return rodzina.osoby.map((_, osoba) => ({ osoba }));
    case 'tytul':
      return rodzina.osoby.flatMap((o, osoba) => o.tytuly.map((_, tytul) => ({ osoba, tytul })));
    case 'dziecko':
      return rodzina.zdarzenie.dzieci.map((_, dziecko) => ({ dziecko }));
  }
}

function klucz(id: string, z: ZakresInstancji): string {
  const czesci = [
    z.osoba !== undefined ? `o${z.osoba}` : '',
    z.tytul !== undefined ? `t${z.tytul}` : '',
    z.dziecko !== undefined ? `d${z.dziecko}` : '',
  ].filter(Boolean);
  return czesci.length ? `${id}@${czesci.join('.')}` : id;
}

/**
 * Pytania z danej warstwy, które trzeba pokazać dla tej rodziny: rozwinięte na osoby, tytuły i dzieci,
 * z gotową ścieżką i aktualną wartością. Kolejność: jak w definicjach, a w ramach pytania – po numerach.
 */
export function pytaniaDoPokazania(warstwa: 'A' | 'B', rodzina: Rodzina): PytanieDoPokazania[] {
  return WSZYSTKIE_PYTANIA.filter((p) => p.warstwa === warstwa).flatMap((def) =>
    instancje(def, rodzina)
      .filter((z) => !def.warunek || spelniaWarunek(def.warunek, rodzina, z))
      .map((z) => ({
        def,
        zakres: z,
        sciezka: sciezkaKonkretna(def, z),
        klucz: klucz(def.id, z),
        wartosc: odczytajOdpowiedz(rodzina, def, z),
      })),
  );
}
