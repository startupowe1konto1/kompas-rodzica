/**
 * LISTA ROBOCZA pytań kwestionariusza „Moja sytuacja” (warstwa A – to, co zmienia wynik).
 *
 * To plik tymczasowy toru C. Docelowe definicje dostarcza tor D w `src/content/pytania.ts`
 * (ZADANIA.md, D1). Gdy się pojawią, ten plik zamienia się w jedną linię:
 *
 *   export { PYTANIA, KROKI_ANKIETY } from '../../content/pytania';
 *
 * i interfejs działa dalej bez zmian, bo kształt (`DefinicjaPytania` z `./typy`) jest wspólny.
 *
 * Zasady (spec, sekcja 5; brief 4.2):
 *  - pytamy tylko o to, co zmienia wynik; jedno pytanie = jedna dana z `docs/zrodla-danych.json`;
 *  - pytania warunkowe: o działalność tylko przy działalności, o sąd tylko przy przysposobieniu;
 *  - tu nie ma reguł prawnych – decyduje silnik. Zakresy dat to tylko łapanie literówek.
 *
 * Teksty: prosto, per Pan/Pani jak na zus.pl (decyzja prowadzącego po teście na stoisku 22.11). Najpierw formy
 * bezosobowe i „proszę + bezokolicznik”, a gdy trzeba zwrócić się wprost: „Pani/Pan” w tej kolejności, wielką literą.
 * Definicje w `wyjasnienie` są zgodne ze słownikiem pojęć ZUS (zus.pl/slownik), pisane własnymi słowami.
 */
import type { DefinicjaPytania, KrokAnkiety, OpcjaPytania, Warunek } from './typy';

export type { DefinicjaPytania, KrokAnkiety } from './typy';

export const KROKI_ANKIETY: KrokAnkiety[] = [
  {
    id: 'kim_jestes',
    tytul: 'Pierwsze spotkanie z dzieckiem',
    opis: 'Na początek: kim jest Pani/Pan dla dziecka. Mamie, tacie i osobie przyjmującej dziecko przysługują różne urlopy i zasiłki.',
  },
  {
    id: 'dziecko',
    tytul: 'Dziecko – data urodzenia lub przyjęcia',
    opis: 'Data porodu albo przyjęcia dziecka na wychowanie. Od tego dnia liczą się urlopy i terminy wniosków.',
  },
  { id: 'ubezpieczenie', tytul: 'Źródła ubezpieczenia', opis: 'Umowy i działalność, z tytułu których ma Pani/Pan ubezpieczenie.' },
  { id: 'zarobki', tytul: 'Wynagrodzenie', opis: 'Od wysokości wynagrodzenia zależy wysokość zasiłku.' },
  { id: 'ciaza', tytul: 'Zwolnienia lekarskie w ciąży' },
  { id: 'po_porodzie', tytul: 'Po urodzeniu dziecka' },
  { id: 'podatek', tytul: 'Podatek', opis: 'Tylko do szacunku kwoty netto.' },
];

const ROK = 365;
/** Górna granica miesięcznych kwot: tylko łapanie literówek (np. dodatkowe zera), nie reguła prawna. */
const KWOTA_MAX = 1_000_000;

// ───────── Ścieżki i warunki używane wiele razy ─────────

const TYTUL = 'osoby[$osoba].tytuly[$tytul]';
const RODZAJ = `${TYTUL}.rodzaj`;

const PORÓD: Warunek = { sciezka: 'zdarzenie.typ', rowne: 'porod' };
const PRZYJECIE: Warunek = { sciezka: 'zdarzenie.typ', rozne: 'porod' };
const URODZONE: Warunek = { wszystkie: [PORÓD, { sciezka: 'zdarzenie.przewidywana', rowne: false }] };
/** Dziecko zostało po porodzie w szpitalu (odpowiedź „tak” na bramkę zakłada listę pobytów). */
const POBYT_W_SZPITALU: Warunek = { sciezka: 'zdarzenie.dzieci[$dziecko].szpital', istnieje: true };

const ETAT: Warunek = { sciezka: RODZAJ, rowne: 'umowa_o_prace' };
const FIRMA: Warunek = { sciezka: RODZAJ, jedenZ: ['dzialalnosc', 'wspolpraca'] };
const NIE_FIRMA: Warunek = { nie: FIRMA };
const MA_USTANIE: Warunek = { sciezka: `${TYTUL}.ustanie`, wypelnione: true };
// Zasiłek macierzyński z tytułu przysługuje tylko przy ubezpieczeniu chorobowym (UZ art. 29 ust. 1).
// Nowy tytuł ma `chorobowe` = obowiązkowe (etat) albo brak (reszta), a rodzic odpowiada na pytanie o chorobowe
// wcześniej niż na pytania zależne od tego warunku.
const MA_CHOROBOWE: Warunek = { sciezka: `${TYTUL}.chorobowe`, rozne: 'brak' };
// Rodzic ma już wpisane tytuły (każde pytanie o ustanie, zarobki itd. dotyczy konkretnego tytułu).
const TYT: Warunek = { sciezka: 'osoby[$osoba].tytuly', wypelnione: true };
// Pusta lista miesięcy to już tryb „miesiąc po miesiącu” (rodzic jeszcze niczego nie wpisał), więc `istnieje`, nie `wypelnione`.
const TRYB_KWOTA: Warunek = { sciezka: `${TYTUL}.podstawaSkladek`, istnieje: false };
const MATKA: Warunek = { sciezka: 'osoby[$osoba].rola', rowne: 'matka' };
const DRUGA_OSOBA: Warunek = { sciezka: 'osoby[1]', wypelnione: true };

const RODZAJE_TYTULOW: OpcjaPytania[] = [
  { wartosc: 'umowa_o_prace', etykieta: 'Umowa o pracę', opis: 'Na cały etat albo na część etatu, np. pół.' },
  { wartosc: 'zlecenie', etykieta: 'Umowa zlecenia' },
  { wartosc: 'dzialalnosc', etykieta: 'Jednoosobowa działalność gospodarcza' },
  // Współpracy nie proponujemy w liście wyboru (na stoisku myliła się z pracą na czarno): ukrywa ją `opcjeDoWyboru`
  // z ./listy. Opcja zostaje tutaj, żeby profil, który już ma taki tytuł, przechodził walidację i miał nazwę.
  {
    wartosc: 'wspolpraca',
    etykieta: 'Współpraca przy działalności gospodarczej',
    opis: 'Osoba współpracująca, np. małżonek albo dziecko osoby prowadzącej działalność.',
  },
  { wartosc: 'inny', etykieta: 'Inna umowa (np. agencyjna, kontrakt menedżerski)' },
];

/** „Koniec umowy” obejmuje też wypowiedzenie i rozwiązanie umowy przez drugą stronę (audyt „utrata pracy w ciąży”, 22.11). */
const koniecUmowy = (kto?: string): OpcjaPytania => ({
  wartosc: 'koniec_umowy',
  etykieta: kto ? `Umowa się skończyła albo ${kto} ją wypowiedział lub rozwiązał` : 'Umowa się skończyła albo została wypowiedziana lub rozwiązana',
});

// UZ art. 30 ust. 1 i 3: przyczyny, przy których zasiłek przysługuje mimo ustania ubezpieczenia w ciąży.
const PRZYCZYNY_PO_STRONIE_PLATNIKA: OpcjaPytania[] = [
  { wartosc: 'upadlosc', etykieta: 'Upadłość pracodawcy' },
  { wartosc: 'likwidacja', etykieta: 'Likwidacja pracodawcy' },
  { wartosc: 'smierc_pracodawcy', etykieta: 'Śmierć pracodawcy' },
  { wartosc: 'naruszenie_prawa_wyrok', etykieta: 'Zwolnienie z naruszeniem prawa, potwierdzone prawomocnym wyrokiem sądu' },
];

const WYREJESTROWANIE: OpcjaPytania = { wartosc: 'wyrejestrowanie', etykieta: 'Wyrejestrowanie z ubezpieczenia' };

/** Pełna lista (inna umowa). Według niej walidujemy też zapisane odpowiedzi, więc ma wszystkie wartości. */
const PRZYCZYNY_USTANIA_UMOWY: OpcjaPytania[] = [koniecUmowy(), ...PRZYCZYNY_PO_STRONIE_PLATNIKA, WYREJESTROWANIE];

// Bez „wyrejestrowania”: przy etacie ubezpieczenie chorobowe trwa do ustania stosunku pracy, więc jego koniec to
// `koniec_umowy` (ustawa systemowa art. 13, art. 14 ust. 2; docs/pytania-do-mentora.md, pyt. 44).
const PRZYCZYNY_USTANIA_ETATU: OpcjaPytania[] = [koniecUmowy('pracodawca'), ...PRZYCZYNY_PO_STRONIE_PLATNIKA];

// Zlecenie: chorobowe jest dobrowolne, więc wyrejestrowanie ma sens (pyt. 44).
const PRZYCZYNY_USTANIA_ZLECENIA: OpcjaPytania[] = [koniecUmowy('zleceniodawca'), ...PRZYCZYNY_PO_STRONIE_PLATNIKA, WYREJESTROWANIE];

const PRZYCZYNY_USTANIA_FIRMY: OpcjaPytania[] = [
  { wartosc: 'zakonczenie_dzialalnosci', etykieta: 'Zamknięcie albo zawieszenie działalności' },
  { wartosc: 'wyrejestrowanie', etykieta: 'Wyrejestrowanie z ubezpieczenia chorobowego' },
];

export const PYTANIA: DefinicjaPytania[] = [
  // ───────── Pierwsze spotkanie z dzieckiem (rola) ─────────
  {
    id: 'rola',
    warstwa: 'A',
    krok: 'kim_jestes',
    zakres: 'osoba',
    etykieta: 'Kim jest Pani/Pan dla dziecka?',
    pomoc: 'Mamie, tacie i osobie, która przyjmuje dziecko na wychowanie, przysługują różne urlopy i zasiłki.',
    // KP art. 180, 182¹a, 182³, 183 i 184; UZ art. 29; słownik ZUS „urlop macierzyński”.
    wyjasnienie: {
      pojecie: 'urlop macierzyński i rodzicielski',
      pytanie: 'Jakie urlopy przysługują po urodzeniu albo przyjęciu dziecka?',
      tresc:
        'Urlop macierzyński przysługuje mamie po urodzeniu dziecka, a część może wykorzystać tata. Przy przyjęciu dziecka na wychowanie jest urlop na warunkach urlopu macierzyńskiego. Po nim przysługuje urlop rodzicielski, który rodzice mogą podzielić między siebie. Tata ma też własny urlop ojcowski. Za czas tych urlopów przysługuje zasiłek macierzyński, a za urlop rodzicielski – zasiłek macierzyński za okres urlopu rodzicielskiego.',
    },
    typ: 'wybor',
    opcje: [
      { wartosc: 'matka', etykieta: 'Mamą' },
      { wartosc: 'ojciec', etykieta: 'Tatą' },
      { wartosc: 'przyjmujacy', etykieta: 'Osobą, która przyjmuje dziecko na wychowanie', opis: 'Przysposobienie (adopcja) albo rodzina zastępcza.' },
      { wartosc: 'inny_czlonek_rodziny', etykieta: 'Innym członkiem najbliższej rodziny', opis: 'Np. babcią lub dziadkiem, który przejmuje opiekę nad dzieckiem.' },
    ],
    sciezka: 'osoby[$osoba].rola',
    daneId: 'wnioskodawca_plec_rola',
    wymagane: true,
  },

  // ───────── Dziecko – data urodzenia lub przyjęcia ─────────
  {
    id: 'etap',
    warstwa: 'A',
    krok: 'dziecko',
    zakres: 'rodzina',
    etykieta: 'Na jakim etapie jest rodzina?',
    pomoc: 'Urlopy i terminy wniosków liczymy od dnia porodu albo od dnia przyjęcia dziecka na wychowanie.',
    typ: 'wybor',
    opcje: [
      { wartosc: 'w_ciazy', etykieta: 'Czekamy na poród' },
      { wartosc: 'urodzone', etykieta: 'Dziecko już się urodziło' },
      { wartosc: 'przyjecie', etykieta: 'Przyjmujemy dziecko na wychowanie' },
    ],
    sciezka: 'zdarzenie',
    kodek: 'etap',
    daneId: 'zdarzenie_typ_i_data_przyjecia',
    wymagane: true,
  },
  {
    id: 'typ_przyjecia',
    warstwa: 'A',
    krok: 'dziecko',
    zakres: 'rodzina',
    etykieta: 'W jakiej formie dziecko jest przyjmowane na wychowanie?',
    pomoc: 'Przy przysposobieniu i przy rodzinie zastępczej obowiązują inne zasady urlopu i zasiłku. Formę przyjęcia można sprawdzić w dokumentach z sądu.',
    // KP art. 183 § 1; UZ art. 29 ust. 1 pkt 2 i 3 (bez rodziny zastępczej zawodowej).
    wyjasnienie: {
      pojecie: 'przysposobienie i rodzina zastępcza niezawodowa',
      tresc:
        'Przysposobienie to adopcja: sąd orzeka, że dziecko staje się dzieckiem osoby przysposabiającej. Rodzina zastępcza niezawodowa przyjmuje dziecko na wychowanie, ale nie robi tego zawodowo. Zawodowej rodzinie zastępczej urlop na warunkach urlopu macierzyńskiego i zasiłek macierzyński nie przysługują.',
    },
    typ: 'wybor',
    opcje: [
      { wartosc: 'przysposobienie', etykieta: 'Przysposobienie (adopcja)' },
      { wartosc: 'rodzina_zastepcza_niezawodowa', etykieta: 'Rodzina zastępcza (niezawodowa)' },
      { wartosc: 'rodzina_zastepcza_zawodowa', etykieta: 'Zawodowa rodzina zastępcza' },
    ],
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
    typ: 'data',
    sciezka: 'zdarzenie.data',
    daneId: 'przewidywana_data_porodu',
    warunek: { wszystkie: [PORÓD, { sciezka: 'zdarzenie.przewidywana', rowne: true }] },
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
    etykieta: 'Ile dzieci się urodzi albo ile dzieci jest przyjmowanych jednocześnie?',
    wgEtapu: {
      w_ciazy: { etykieta: 'Ile dzieci się urodzi?' },
      urodzone: { etykieta: 'Ile dzieci się urodziło?' },
      przyjecie: { etykieta: 'Ile dzieci jest przyjmowanych jednocześnie?' },
    },
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
    pomoc: 'Urlop i zasiłek przy przyjęciu dziecka przysługują tylko do określonego wieku dziecka.',
    typ: 'data',
    sciezka: 'zdarzenie.dzieci[$dziecko].dataUrodzenia',
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
    pomoc: 'Przy starszych dzieciach to może zmienić, czy urlop przysługuje.',
    // KP art. 183 § 1.
    wyjasnienie: {
      pojecie: 'odroczony obowiązek szkolny',
      tresc:
        'Dziecko rozpocznie naukę w szkole później, niż wynika z jego wieku, bo w jego sprawie wydano decyzję o odroczeniu. Przy rodzinie zastępczej niezawodowej wydłuża to wiek dziecka, do którego przysługuje urlop i zasiłek.',
    },
    typ: 'tak_nie',
    sciezka: 'zdarzenie.dzieci[$dziecko].odroczonyObowiazekSzkolny',
    daneId: 'dziecko_wiek_i_odroczenie_obowiazku_szkolnego',
    // KP art. 183 § 1; UZ art. 29 ust. 1 pkt 3: odroczenie obowiązku szkolnego liczy się tylko przy rodzinie zastępczej niezawodowej.
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
    typ: 'data',
    sciezka: 'zdarzenie.dataUprawomocnienia',
    daneId: 'zal_dokumenty_sadowe',
    warunek: { sciezka: 'zdarzenie.typ', rowne: 'przysposobienie' },
    zakresDat: { minDni: -7 * ROK, maxDni: 2 * ROK },
  },

  // ───────── Źródła ubezpieczenia ─────────
  {
    id: 'tytuly_rodzaje',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'osoba',
    etykieta: 'Z jakich umów lub działalności ma Pani/Pan ubezpieczenie? Proszę zaznaczyć wszystkie pasujące.',
    pomoc: 'Można mieć kilka naraz, np. umowę o pracę i umowę zlecenia. Sprawdzimy, z których z nich przysługuje zasiłek i w jakiej wysokości. Jeśli nie ma Pani/Pan teraz żadnej umowy ani działalności, proszę wybrać „Nie mam teraz ubezpieczenia”.',
    // Słownik ZUS: „ubezpieczony”, „tytuł ubezpieczenia”.
    wyjasnienie: {
      pojecie: 'tytuł ubezpieczenia',
      pytanie: 'Kto jest ubezpieczonym i co to jest tytuł ubezpieczenia?',
      tresc:
        'Ubezpieczony to osoba, która podlega co najmniej jednemu ubezpieczeniu społecznemu, np. pracownik albo zleceniobiorca. Tytuł ubezpieczenia to powód, dla którego ktoś jest ubezpieczony: umowa o pracę, umowa zlecenia, prowadzenie działalności gospodarczej i inne. Można mieć kilka tytułów jednocześnie.',
    },
    typ: 'wiele',
    opcje: RODZAJE_TYTULOW,
    sciezka: 'osoby[$osoba].tytuly',
    kodek: 'rodzaje_tytulow',
    daneId: 'tytuly_ubezpieczenia_okresy',
  },
  {
    id: 'tytul_od',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Od kiedy trwa ta umowa?',
    pomoc: 'Od tej daty liczymy staż i podstawę zasiłku.',
    wgRodzaju: {
      umowa_o_prace: { etykieta: 'Od kiedy trwa ta umowa o pracę?' },
      zlecenie: { etykieta: 'Od kiedy trwa ta umowa zlecenia?' },
      dzialalnosc: { etykieta: 'Od kiedy jest prowadzona działalność gospodarcza?' },
      wspolpraca: { etykieta: 'Od kiedy trwa współpraca przy działalności gospodarczej?' },
    },
    typ: 'data',
    sciezka: `${TYTUL}.od`,
    daneId: 'tytuly_ubezpieczenia_okresy',
    wymagane: true,
    zakresDat: { minDni: -50 * ROK, maxDni: ROK },
  },
  {
    id: 'etat_czas_okreslony',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Czy to umowa na czas określony?',
    pomoc: 'Umowa na czas określony może skończyć się przed porodem. Sprawdzimy, co wtedy z zasiłkiem.',
    wgEtapu: {
      przyjecie: { pomoc: 'Umowa na czas określony może skończyć się przed przyjęciem dziecka. Sprawdzimy, co wtedy z zasiłkiem.' },
    },
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
    etykieta: 'Czy to umowa na zastępstwo?',
    pomoc: 'Umowa na zastępstwo działa inaczej niż zwykła umowa na czas określony.',
    typ: 'tak_nie',
    sciezka: `${TYTUL}.naZastepstwo`,
    daneId: 'umowa_czas_okreslony',
    warunek: { wszystkie: [ETAT, { sciezka: `${TYTUL}.naCzasOkreslony`, rowne: true }] },
  },
  {
    id: 'etat_do',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Data zakończenia umowy',
    pomoc: 'Porównamy tę datę z datą porodu.',
    wgEtapu: {
      przyjecie: { pomoc: 'Porównamy tę datę z dniem przyjęcia dziecka na wychowanie.' },
    },
    typ: 'data',
    sciezka: `${TYTUL}.do`,
    daneId: 'umowa_czas_okreslony',
    warunek: { wszystkie: [ETAT, { sciezka: `${TYTUL}.naCzasOkreslony`, rowne: true }] },
    wymagane: true,
    zakresDat: { minDni: -50 * ROK, maxDni: 10 * ROK },
    nieWczesniejNiz: `${TYTUL}.od`,
  },
  {
    id: 'tytul_do',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Data zakończenia umowy',
    pomoc: 'Jeśli umowa jest zawarta na czas nieokreślony, proszę zostawić pole puste. Porównamy tę datę z datą porodu.',
    wgEtapu: {
      przyjecie: {
        pomoc: 'Jeśli umowa jest zawarta na czas nieokreślony, proszę zostawić pole puste. Porównamy tę datę z dniem przyjęcia dziecka na wychowanie.',
      },
    },
    // Wariant rodzaju wygrywa z wariantem etapu (Ankieta), więc pomoc przy działalności nie mówi o porodzie.
    wgRodzaju: {
      dzialalnosc: {
        etykieta: 'Data zakończenia działalności',
        pomoc: 'Jeśli zakończenie działalności nie jest planowane, proszę zostawić pole puste.',
      },
      wspolpraca: {
        etykieta: 'Data zakończenia współpracy',
        pomoc: 'Jeśli zakończenie współpracy nie jest planowane, proszę zostawić pole puste.',
      },
    },
    typ: 'data',
    sciezka: `${TYTUL}.do`,
    daneId: 'tytuly_ubezpieczenia_okresy',
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
    pomoc: 'Wymiar etatu jest wpisany w umowie o pracę. Tej danej nie ma w żadnej e-usłudze.',
    typ: 'liczba',
    // Gotowe wymiary na liście; inny (np. 0,6) rodzic wpisuje sam (PoleAnkiety: „Inna wartość”).
    opcje: [
      { wartosc: 1, etykieta: 'Pełny etat' },
      { wartosc: 0.75, etykieta: '3/4 etatu' },
      { wartosc: 0.5, etykieta: 'Pół etatu' },
      { wartosc: 0.25, etykieta: '1/4 etatu' },
    ],
    sciezka: `${TYTUL}.wymiarEtatu`,
    daneId: 'wymiar_etatu',
    warunek: ETAT,
    min: 0.01,
    max: 1,
  },
  {
    id: 'chorobowe_dobrowolne',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Czy z tej umowy lub działalności jest opłacane dobrowolne ubezpieczenie chorobowe?',
    pomoc: 'Bez ubezpieczenia chorobowego z tej umowy lub działalności nie przysługuje z niej zasiłek macierzyński.',
    podpowiedz: 'Jeśli nie ma Pani/Pan pewności, proszę sprawdzić w eZUS albo zapytać płatnika, np. zleceniodawcę.',
    // UZ art. 29 ust. 1; słownik ZUS: „ubezpieczenie chorobowe”, „dobrowolne ubezpieczenie”.
    wyjasnienie: {
      pojecie: 'dobrowolne ubezpieczenie chorobowe',
      tresc:
        'Ubezpieczenie chorobowe chroni finansowo w razie choroby i macierzyństwa. Przy umowie o pracę jest obowiązkowe. Przy umowie zlecenia i przy działalności gospodarczej można do niego przystąpić dobrowolnie, na własny wniosek. Bez niego zasiłek macierzyński z tej umowy lub działalności nie przysługuje.',
    },
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
    etykieta: 'Czy z tej umowy ma Pani/Pan ubezpieczenie chorobowe?',
    pomoc: 'Bez ubezpieczenia chorobowego nie przysługuje zasiłek z tej umowy.',
    podpowiedz: 'Jeśli nie ma Pani/Pan pewności, proszę sprawdzić w eZUS albo zapytać płatnika.',
    typ: 'wybor',
    opcje: [
      { wartosc: 'obowiazkowe', etykieta: 'Tak, obowiązkowe' },
      { wartosc: 'dobrowolne', etykieta: 'Tak, dobrowolne (opłacane na własny wniosek)' },
      { wartosc: 'brak', etykieta: 'Nie mam' },
    ],
    sciezka: `${TYTUL}.chorobowe`,
    daneId: 'rodzaj_ubezpieczenia_chorobowego',
    warunek: { sciezka: RODZAJ, rowne: 'inny' },
    wymagane: true,
  },
  {
    id: 'platnik_powyzej_20',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Czy Pani/Pana pracodawca albo zleceniodawca zatrudnia ponad 20 osób?',
    pomoc: 'Gdy płatnik zgłasza do ubezpieczenia chorobowego ponad 20 osób, zasiłek wypłaca on sam, a gdy 20 lub mniej – ZUS. Jeśli nie ma Pani/Pan pewności, proszę zapytać w kadrach.',
    // UZ art. 61; słownik ZUS „płatnik składek”.
    wyjasnienie: {
      pojecie: 'płatnik',
      pytanie: 'Kim jest płatnik?',
      tresc:
        'Płatnik składek ma obowiązek opłacać składki na ubezpieczenia społeczne za osoby ubezpieczone. Zwykle jest nim pracodawca albo zleceniodawca, a przy własnej działalności – sam przedsiębiorca. Gdy płatnik zgłasza do ubezpieczenia chorobowego ponad 20 osób, sam wypłaca zasiłek. Gdy 20 lub mniej, zasiłek wypłaca ZUS.',
    },
    typ: 'tak_nie',
    nieWiem: true,
    sciezka: `${TYTUL}.platnikPowyzej20`,
    daneId: 'liczba_ubezpieczonych_u_platnika',
    // Pytamy tylko tam, gdzie próg 20 osób coś zmienia:
    //  - działalność i współpraca: zasiłek wypłaca ZUS (UZ art. 61 ust. 1 pkt 2 lit. b), więc nie pytamy;
    //  - bez ubezpieczenia chorobowego nie ma zasiłku z tego tytułu (UZ art. 29 ust. 1);
    //  - po ustaniu ubezpieczenia zasiłek wypłaca ZUS (UZ art. 61 ust. 1 pkt 2 lit. d).
    warunek: {
      wszystkie: [{ sciezka: RODZAJ, jedenZ: ['umowa_o_prace', 'zlecenie', 'inny'] }, MA_CHOROBOWE, { nie: MA_USTANIE }],
    },
  },
  {
    id: 'chorobowo_od',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Od kiedy jest opłacane dobrowolne ubezpieczenie chorobowe?',
    pomoc: 'Przy dobrowolnym ubezpieczeniu liczy się, ile czasu przed porodem już trwa.',
    podpowiedz: 'Datę zgłoszenia można sprawdzić w eZUS.',
    wgEtapu: {
      przyjecie: { pomoc: 'Przy dobrowolnym ubezpieczeniu liczy się, ile czasu przed przyjęciem dziecka już trwa.' },
    },
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
    pomoc: 'Zaległość w składkach może wstrzymać wypłatę zasiłku do czasu jej spłaty. Dlatego warto sprawdzić to wcześniej.',
    podpowiedz: 'Saldo można sprawdzić w eZUS, w panelu płatnika.',
    typ: 'kwota',
    jednostka: 'zł',
    sciezka: `${TYTUL}.zadluzenieSkladkowe`,
    daneId: 'zadluzenie_skladkowe',
    warunek: { sciezka: RODZAJ, rowne: 'dzialalnosc' },
    min: 0,
  },
  {
    id: 'ustanie_umowy',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Czy ta umowa skończyła się albo skończy, zanim dziecko się urodzi lub trafi do Pani/Pana?',
    wgEtapu: {
      w_ciazy: { etykieta: 'Czy ta umowa skończyła się albo skończy przed porodem?' },
      urodzone: { etykieta: 'Czy ta umowa skończyła się przed porodem?' },
      przyjecie: {
        etykieta: 'Czy ta umowa skończyła się albo skończy, zanim dziecko trafi do Pani/Pana?',
        pomoc: 'Koniec umowy przed przyjęciem dziecka może zmienić prawo do zasiłku. Ważne jest też, dlaczego się skończyła.',
      },
    },
    pomoc: 'Koniec umowy przed porodem może zmienić prawo do zasiłku. Ważne jest też, dlaczego się skończyła.',
    typ: 'tak_nie',
    sciezka: `${TYTUL}.ustanie`,
    kodek: 'obecnosc',
    wartoscPoczatkowa: { data: '', przyczyna: 'koniec_umowy' },
    daneId: 'ustanie_ubezpieczenia',
    // UZ art. 29 ust. 1: bez ubezpieczenia chorobowego nie ma zasiłku, więc o jego ustaniu nie pytamy.
    warunek: { wszystkie: [NIE_FIRMA, MA_CHOROBOWE] },
  },
  {
    id: 'ustanie_firmy',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Czy działalność została albo zostanie zakończona, zanim dziecko się urodzi lub trafi do Pani/Pana?',
    wgEtapu: {
      w_ciazy: { etykieta: 'Czy działalność została albo zostanie zakończona przed porodem?' },
      urodzone: { etykieta: 'Czy działalność została zakończona przed porodem?' },
      przyjecie: {
        etykieta: 'Czy działalność została albo zostanie zakończona, zanim dziecko trafi do Pani/Pana?',
        pomoc: 'Koniec ubezpieczenia przed przyjęciem dziecka może zmienić prawo do zasiłku.',
      },
    },
    pomoc: 'Koniec ubezpieczenia przed porodem może zmienić prawo do zasiłku.',
    typ: 'tak_nie',
    sciezka: `${TYTUL}.ustanie`,
    kodek: 'obecnosc',
    wartoscPoczatkowa: { data: '', przyczyna: 'zakonczenie_dzialalnosci' },
    daneId: 'ustanie_ubezpieczenia',
    // UZ art. 29 ust. 1.
    warunek: { wszystkie: [FIRMA, MA_CHOROBOWE] },
  },
  {
    id: 'ustanie_data',
    warstwa: 'A',
    krok: 'ubezpieczenie',
    zakres: 'tytul',
    etykieta: 'Kiedy był albo będzie ostatni dzień?',
    wgEtapu: {
      w_ciazy: { etykieta: 'Kiedy będzie ostatni dzień?' },
      urodzone: { etykieta: 'Kiedy był ostatni dzień?' },
      przyjecie: { etykieta: 'Kiedy był ostatni dzień?' },
    },
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
    pomoc: 'Przy niektórych przyczynach zasiłek przysługuje mimo końca umowy.',
    typ: 'wybor',
    opcje: PRZYCZYNY_USTANIA_UMOWY,
    // Ankieta podmienia `opcje` wariantem rodzaju umowy (jak etykietę): przy etacie bez „wyrejestrowania” (pyt. 44).
    wgRodzaju: {
      umowa_o_prace: { opcje: PRZYCZYNY_USTANIA_ETATU },
      zlecenie: { opcje: PRZYCZYNY_USTANIA_ZLECENIA },
    },
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
    etykieta: 'Dlaczego działalność się zakończyła?',
    typ: 'wybor',
    opcje: PRZYCZYNY_USTANIA_FIRMY,
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
    wgEtapu: {
      w_ciazy: { etykieta: 'Czy w czasie ciąży trwa Pani/Pana urlop wychowawczy, np. ze starszym dzieckiem?' },
      urodzone: { etykieta: 'Czy w dniu porodu trwał Pani/Pana urlop wychowawczy, np. ze starszym dzieckiem?' },
      przyjecie: { etykieta: 'Czy w dniu przyjęcia dziecka trwał Pani/Pana urlop wychowawczy, np. ze starszym dzieckiem?' },
    },
    // Słownik ZUS „urlop wychowawczy”; zasiłek w okresie urlopu wychowawczego: UZ art. 29 ust. 1.
    wyjasnienie: {
      pojecie: 'urlop wychowawczy',
      tresc:
        'Urlop, który pracownik dostaje, żeby osobiście opiekować się dzieckiem. Zachowuje w tym czasie prawa pracownicze, ale nie dostaje wynagrodzenia. To inny urlop niż macierzyński i rodzicielski.',
    },
    typ: 'tak_nie',
    sciezka: 'osoby[$osoba].urlopWychowawczy',
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
    sciezka: 'osoby[$osoba].urlopWychowawczy.od',
    daneId: 'urlop_wychowawczy',
    warunek: { sciezka: 'osoby[$osoba].urlopWychowawczy', wypelnione: true },
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
    sciezka: 'osoby[$osoba].urlopWychowawczy.do',
    daneId: 'urlop_wychowawczy',
    warunek: { sciezka: 'osoby[$osoba].urlopWychowawczy', wypelnione: true },
    wymagane: true,
    zakresDat: { minDni: -10 * ROK, maxDni: 7 * ROK },
    nieWczesniejNiz: 'osoby[$osoba].urlopWychowawczy.od',
  },

  // ───────── Wynagrodzenie (podstawa) ─────────
  {
    id: 'tryb_podstawy',
    warstwa: 'A',
    krok: 'zarobki',
    zakres: 'tytul',
    etykieta: 'Jak podać wynagrodzenie z tej umowy lub działalności?',
    pomoc: 'Jedna kwota wystarczy do szacunku. Lista miesięcy daje dokładniejszy wynik, gdy wynagrodzenie się zmieniało.',
    // UZ art. 36 ust. 1–2 (pracownik) i art. 48 (ubezpieczony niebędący pracownikiem); minimalna podstawa: art. 45.
    wyjasnienie: {
      pojecie: 'podstawa wymiaru zasiłku',
      tresc:
        'To kwota, od której liczy się zasiłek. Zwykle jest to przeciętne miesięczne wynagrodzenie z 12 pełnych miesięcy kalendarzowych przed miesiącem, w którym powstało prawo do zasiłku, po odjęciu składek na ubezpieczenia społeczne. Gdy ubezpieczenie trwa krócej, liczą się pełne miesiące ubezpieczenia.',
    },
    typ: 'wybor',
    opcje: [
      { wartosc: 'kwota', etykieta: 'Jedna kwota miesięcznie' },
      { wartosc: 'miesiace', etykieta: 'Miesiąc po miesiącu (dokładniej)' },
    ],
    sciezka: TYTUL,
    kodek: 'tryb_podstawy',
    daneId: 'podstawa_skladek_miesiecznie',
    // UZ art. 29 ust. 1: podstawa jest potrzebna tylko przy ubezpieczeniu chorobowym.
    warunek: MA_CHOROBOWE,
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
    // UZ art. 29 ust. 1.
    warunek: { wszystkie: [MA_CHOROBOWE, TRYB_KWOTA, NIE_FIRMA] },
    wymagane: true,
    min: 0,
    max: KWOTA_MAX,
  },
  {
    id: 'dzialalnosc_podstawa',
    warstwa: 'A',
    krok: 'zarobki',
    zakres: 'tytul',
    etykieta: 'Od jakiej miesięcznej podstawy są opłacane składki na ubezpieczenia społeczne?',
    pomoc: 'Przy działalności gospodarczej zasiłek liczymy od zadeklarowanej podstawy składek, a nie od przychodu czy dochodu.',
    podpowiedz: 'Podstawę można sprawdzić w eZUS albo w deklaracji ZUS DRA.',
    // UZ art. 48; słownik ZUS „podstawa wymiaru składek”.
    wyjasnienie: {
      pojecie: 'podstawa wymiaru składek',
      tresc:
        'Kwota, od której oblicza się składki na ubezpieczenia społeczne. Przy działalności gospodarczej przedsiębiorca sam ją deklaruje, w granicach określonych w przepisach. Od niej liczy się też podstawę zasiłku.',
    },
    typ: 'kwota',
    jednostka: 'zł',
    sciezka: `${TYTUL}.zadeklarowanaPodstawa`,
    daneId: 'podstawa_zadeklarowana_dzialalnosc',
    // UZ art. 29 ust. 1.
    warunek: { wszystkie: [MA_CHOROBOWE, TRYB_KWOTA, FIRMA] },
    wymagane: true,
    min: 0,
    max: KWOTA_MAX,
  },
  {
    id: 'podstawa_miesiace',
    warstwa: 'A',
    krok: 'zarobki',
    zakres: 'tytul',
    etykieta: 'Podstawa składek miesiąc po miesiącu (ostatnie 12 miesięcy)',
    pomoc: 'Proszę wpisać kwotę brutto za każdy miesiąc. Jeśli w którymś miesiącu były dni bez pracy, można dopisać dni przepracowane.',
    podpowiedz: 'Te kwoty można sprawdzić w eZUS, w „Informacjach o podstawach i składkach”.',
    typ: 'lista_miesiecy',
    jednostka: 'zł',
    sciezka: `${TYTUL}.podstawaSkladek`,
    daneId: 'podstawa_skladek_miesiecznie',
    // UZ art. 29 ust. 1.
    warunek: { wszystkie: [MA_CHOROBOWE, { sciezka: `${TYTUL}.podstawaSkladek`, istnieje: true }] },
    wymagane: true,
    max: KWOTA_MAX,
  },

  // ───────── Ciąża i zwolnienia ─────────
  {
    id: 'zwolnienia_w_ciazy',
    warstwa: 'A',
    krok: 'ciaza',
    zakres: 'osoba',
    etykieta: 'Zwolnienia lekarskie w ciąży',
    pomoc: 'Proszę dodać każde zwolnienie z czasu ciąży i zaznaczyć, czy lekarz wpisał kod B (ciąża). Jeśli zwolnień nie było, lista zostaje pusta.',
    podpowiedz: 'Zwolnienia można sprawdzić w eZUS albo w Internetowym Koncie Pacjenta.',
    // UZ art. 11 ust. 2 pkt 2.
    wyjasnienie: {
      pojecie: 'e-ZLA z kodem B',
      tresc:
        'e-ZLA to elektroniczne zwolnienie lekarskie. Kod B oznacza, że niezdolność do pracy przypada w okresie ciąży. Za taki okres zasiłek chorobowy wynosi 100% podstawy wymiaru.',
    },
    typ: 'lista_zwolnien',
    sciezka: 'osoby[$osoba].zdrowie.eZLA',
    daneId: 'ezla_okresy',
    warunek: { wszystkie: [TYT, { sciezka: 'osoby[$osoba].rola', rowne: 'matka' }, PORÓD] },
    zakresDat: { minDni: -2 * ROK, maxDni: ROK },
  },

  // ───────── Po porodzie (dla każdego dziecka) ─────────
  {
    id: 'dziecko_tydzien_ciazy',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'W którym tygodniu ciąży urodziło się dziecko?',
    pomoc: 'Przy wcześniakach przysługuje dodatkowy urlop.',
    podpowiedz: 'Tydzień jest na zaświadczeniu ze szpitala.',
    typ: 'liczba',
    jednostka: 'tydzień',
    sciezka: 'zdarzenie.dzieci[$dziecko].tydzienCiazy',
    daneId: 'dziecko_tydzien_ciazy_i_masa',
    warunek: URODZONE,
    min: 20,
    max: 45,
  },
  {
    id: 'dziecko_szpital_czy',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'Czy dziecko po porodzie zostało w szpitalu?',
    pomoc: 'Gdy dziecko jest w szpitalu, przysługuje dodatkowy urlop – tydzień za każdy tydzień pobytu.',
    // KP art. 180² § 1.
    wyjasnienie: {
      pojecie: 'uzupełniający urlop macierzyński',
      tresc:
        'Dodatkowy urlop bezpośrednio po urlopie macierzyńskim, gdy dziecko zostało po porodzie w szpitalu: tydzień za każdy tydzień pobytu, do limitu zależnego od tygodnia ciąży i masy urodzeniowej. Za ten czas przysługuje zasiłek macierzyński.',
    },
    typ: 'tak_nie',
    // Ta sama ścieżka co lista pobytów poniżej: „tak” zakłada listę z jednym pustym wierszem, „nie” ją usuwa.
    sciezka: 'zdarzenie.dzieci[$dziecko].szpital',
    kodek: 'obecnosc',
    wartoscPoczatkowa: [{ od: '', do: '' }],
    daneId: 'dziecko_pobyt_w_szpitalu',
    warunek: URODZONE,
  },
  {
    id: 'dziecko_szpital',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'Od kiedy do kiedy dziecko było w szpitalu?',
    pomoc: 'Jeśli dziecko jest tam nadal, proszę wpisać dzień, w którym według lekarzy wyjdzie ze szpitala.',
    // KP art. 180² § 1.
    wyjasnienie: {
      pojecie: 'uzupełniający urlop macierzyński',
      tresc:
        'Dodatkowy urlop bezpośrednio po urlopie macierzyńskim, gdy dziecko zostało po porodzie w szpitalu: tydzień za każdy tydzień pobytu, do limitu zależnego od tygodnia ciąży i masy urodzeniowej. Za ten czas przysługuje zasiłek macierzyński.',
    },
    typ: 'lista_okresow',
    sciezka: 'zdarzenie.dzieci[$dziecko].szpital',
    daneId: 'dziecko_pobyt_w_szpitalu',
    warunek: { wszystkie: [URODZONE, POBYT_W_SZPITALU] },
    zakresDat: { minDni: -7 * ROK, maxDni: ROK },
  },
  {
    id: 'dziecko_masa',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'Ile ważyło dziecko po urodzeniu?',
    pomoc: 'Przy bardzo małej masie urodzeniowej przysługuje dłuższy dodatkowy urlop.',
    typ: 'liczba',
    jednostka: 'g',
    sciezka: 'zdarzenie.dzieci[$dziecko].masaG',
    daneId: 'dziecko_tydzien_ciazy_i_masa',
    // KP art. 180² § 1 pkt 1 i 2: masa liczy się tylko przy urlopie uzupełniającym, czyli gdy dziecko zostało w szpitalu.
    warunek: { wszystkie: [URODZONE, POBYT_W_SZPITALU] },
    min: 200,
    max: 7000,
  },
  {
    id: 'dziecko_za_zyciem',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'Czy dziecko ma zaświadczenie „Za życiem”?',
    pomoc: 'Z tym zaświadczeniem urlop rodzicielski jest dłuższy.',
    wgEtapu: {
      przyjecie: { pomoc: 'Z tym zaświadczeniem urlop rodzicielski przy przyjęciu dziecka jest dłuższy.' },
    },
    // Ustawa o wsparciu kobiet w ciąży i rodzin „Za życiem”, art. 4 ust. 3; długość urlopu: KP art. 182¹a (ZUS-BRIEF, sekcja 8).
    wyjasnienie: {
      pojecie: '„Za życiem”',
      tresc:
        'To zaświadczenie od lekarza, że dziecko ma ciężkie i nieodwracalne upośledzenie albo nieuleczalną chorobę zagrażającą życiu, które powstały w czasie ciąży lub porodu. Z takim zaświadczeniem urlop rodzicielski trwa 65 tygodni zamiast 41 (przy bliźniętach i więcej dzieciach 67 zamiast 43).',
    },
    typ: 'tak_nie',
    sciezka: 'zdarzenie.dzieci[$dziecko].zaZyciem',
    daneId: 'dziecko_za_zyciem',
    // Nie w ciąży: zaświadczenie dostaje się po urodzeniu (KP art. 182¹a § 2) albo przy przyjęciu (KP art. 183 § 4³–4⁵).
    warunek: { ktorykolwiek: [URODZONE, PRZYJECIE] },
  },
  {
    id: 'dziecko_martwe',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'Czy dziecko urodziło się martwe?',
    pomoc: 'Wiemy, że to bardzo trudne pytanie. Zadajemy je, bo przepisy przewidują wtedy inną długość urlopu i zasiłku. Jeśli nie dotyczy, proszę je pominąć.',
    typ: 'tak_nie',
    sciezka: 'zdarzenie.dzieci[$dziecko].martwe',
    daneId: 'martwe_urodzenie_albo_zgon_dziecka',
    warunek: URODZONE,
  },
  {
    id: 'dziecko_zgon',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'dziecko',
    etykieta: 'Jeśli dziecko zmarło, proszę podać datę.',
    pomoc: 'Bardzo nam przykro, jeśli tak się stało. Od tej daty liczymy, do kiedy trwa urlop. Jeśli nie dotyczy, proszę zostawić pole puste.',
    typ: 'data',
    sciezka: 'zdarzenie.dzieci[$dziecko].zgon',
    daneId: 'martwe_urodzenie_albo_zgon_dziecka',
    warunek: { wszystkie: [URODZONE, { sciezka: 'zdarzenie.dzieci[$dziecko].martwe', rozne: true }] },
    zakresDat: { minDni: -7 * ROK, maxDni: 0 },
    nieWczesniejNiz: 'zdarzenie.data',
  },

  // ───────── Sytuacja mamy po porodzie (KP art. 180 § 6–13, art. 182) ─────────
  // Definicje i treść jak w src/content/pytania.ts (tor D). Silnik: zdrowie mamy w walidacji i uprawnieniach.
  {
    id: 'orzeczenie_niezdolnosci',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'osoba',
    etykieta: 'Czy mama dziecka ma orzeczenie o niezdolności do samodzielnej egzystencji?',
    pomoc: 'Wtedy drugi rodzic może wcześniej przejąć część urlopu macierzyńskiego.',
    podpowiedz: 'Orzeczenie lekarza orzecznika ZUS albo komisji.',
    typ: 'tak_nie',
    sciezka: 'osoby[$osoba].zdrowie.orzeczenieNiezdolnosciSamodzielnejEgzystencji',
    daneId: 'orzeczenie_o_niezdolnosci_do_samodzielnej_egzystencji',
    warunek: { wszystkie: [MATKA, URODZONE] },
  },
  {
    id: 'pobyt_matki_w_szpitalu',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'osoba',
    etykieta: 'Czy mama dziecka jest po porodzie w szpitalu i nie może opiekować się dzieckiem? Proszę podać, od kiedy do kiedy.',
    pomoc: 'Drugi rodzic może wtedy przejąć część urlopu macierzyńskiego. Jeśli to nie dotyczy, proszę zostawić listę pustą.',
    podpowiedz: 'Zaświadczenie ze szpitala.',
    typ: 'lista_okresow',
    sciezka: 'osoby[$osoba].zdrowie.pobytWSzpitalu',
    daneId: 'pobyt_wnioskodawcy_w_szpitalu',
    warunek: { wszystkie: [MATKA, URODZONE] },
    zakresDat: { minDni: -7 * ROK, maxDni: ROK },
  },
  {
    id: 'porzucenie_dziecka',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'osoba',
    etykieta: 'Jeśli mama porzuciła dziecko, proszę podać datę.',
    pomoc: 'Wtedy opiekę i urlop może przejąć tata albo ktoś z najbliższej rodziny. Jeśli to nie dotyczy, proszę zostawić pole puste.',
    typ: 'data',
    sciezka: 'osoby[$osoba].zdrowie.porzucenieDziecka',
    daneId: 'sytuacja_matki',
    warunek: { wszystkie: [MATKA, URODZONE, DRUGA_OSOBA] },
    zakresDat: { minDni: -7 * ROK, maxDni: 0 },
    nieWczesniejNiz: 'zdarzenie.data',
  },
  {
    id: 'zgon_matki',
    warstwa: 'A',
    krok: 'po_porodzie',
    zakres: 'osoba',
    etykieta: 'Jeśli mama dziecka zmarła, proszę podać datę.',
    pomoc: 'Bardzo nam przykro, jeśli tak się stało. Urlop i zasiłek może wtedy przejąć tata albo ktoś z najbliższej rodziny.',
    typ: 'data',
    sciezka: 'osoby[$osoba].zdrowie.zgon',
    daneId: 'sytuacja_matki',
    warunek: { wszystkie: [MATKA, URODZONE, DRUGA_OSOBA] },
    zakresDat: { minDni: -7 * ROK, maxDni: 0 },
    nieWczesniejNiz: 'zdarzenie.data',
  },

  // ───────── Podatek ─────────
  {
    id: 'pit2',
    warstwa: 'A',
    krok: 'podatek',
    zakres: 'osoba',
    etykieta: 'Czy u pracodawcy albo u tego, kto będzie wypłacać zasiłek, jest złożony PIT-2?',
    pomoc: 'PIT-2 to oświadczenie, dzięki któremu z każdej wypłaty potrąca się trochę mniejszą zaliczkę na podatek. Zmienia tylko szacunek kwoty netto, nie prawo do zasiłku.',
    // Objaśnienie pojęcia, bez reguły prawnej (PIT-2 zmienia tylko szacunek kwoty netto).
    wyjasnienie: {
      pojecie: 'PIT-2',
      tresc: 'Oświadczenie, dzięki któremu płatnik pobiera z wypłaty mniejszą zaliczkę na podatek.',
    },
    typ: 'tak_nie',
    nieWiem: true,
    warunek: TYT,
    sciezka: 'osoby[$osoba].pit2',
    // Mapa źródeł danych nie ma PIT-2 (to dana tylko do szacunku kwoty netto).
    daneId: null,
  },
];
