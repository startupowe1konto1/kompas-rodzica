import type { RodzajTytulu } from '../../engine/types';
/**
 * Kształt definicji pytań kwestionariusza „Moja sytuacja” (tor C, C3).
 *
 * Definicje są czystymi danymi (da się je zapisać jako JSON): bez funkcji, bez Reacta.
 * Dzięki temu tor D może dostarczyć `src/content/pytania.ts` w tym samym kształcie,
 * a interfejs nie zmieni ani linijki (spec, sekcja 5).
 *
 * Ścieżki to ścieżki pól w `Rodzina` z kontraktu (`src/engine/types.ts`), np.
 * `osoby[$osoba].tytuly[$tytul].od`. Znaczniki `$osoba`, `$tytul`, `$dziecko` zastępuje
 * silnik ankiety numerem osoby, tytułu ubezpieczenia albo dziecka.
 */

/** Rodzaj pola, które rysuje interfejs. */
export type TypPola =
  | 'tak_nie'
  | 'wybor'
  | 'wiele'
  | 'kwota'
  | 'liczba'
  | 'data'
  | 'lista_miesiecy' // MiesiacPodstawy[] – podstawa miesiąc po miesiącu
  | 'lista_okresow' // { od, do }[] – np. pobyt dziecka w szpitalu
  | 'lista_zwolnien'; // { od, do, kodB }[] – zwolnienia lekarskie (e-ZLA)

/**
 * Ile razy pytanie się powtarza:
 *  - `rodzina` – raz (np. data porodu),
 *  - `osoba` – raz dla każdej osoby (np. rola),
 *  - `tytul` – raz dla każdego tytułu ubezpieczenia każdej osoby,
 *  - `dziecko` – raz dla każdego dziecka ze zdarzenia.
 */
export type ZakresPytania = 'rodzina' | 'osoba' | 'tytul' | 'dziecko';

/**
 * Przekształcenie między odpowiedzią w formularzu a danymi w `Rodzina`, gdy nie są tym samym.
 *  - `rodzaje_tytulow`: lista rodzajów (`wiele`) ↔ `tytuly[]` (dodaje i usuwa tytuły),
 *  - `dlugosc_listy`: liczba ↔ długość listy (np. liczba dzieci ↔ `zdarzenie.dzieci`),
 *  - `etap`: 'w_ciazy' | 'urodzone' | 'przyjecie' ↔ `zdarzenie.typ` + `zdarzenie.przewidywana`,
 *  - `chorobowe_dobrowolne`: tak/nie ↔ `chorobowe: 'dobrowolne' | 'brak'`,
 *  - `tryb_podstawy`: 'kwota' | 'miesiace' ↔ obecność `podstawaSkladek`,
 *  - `obecnosc`: tak/nie ↔ obecność obiektu (np. `ustanie`); przy „tak” wstawia `wartoscPoczatkowa`.
 */
export type KodekPola =
  | 'rodzaje_tytulow'
  | 'dlugosc_listy'
  | 'etap'
  | 'chorobowe_dobrowolne'
  | 'tryb_podstawy'
  | 'obecnosc';

export type WartoscOpcji = string | number | boolean;

/** Etap rodziny z pytania „Na jakim etapie jesteście?” (kodek `etap`). */
export type EtapAnkiety = 'w_ciazy' | 'urodzone' | 'przyjecie';

export interface OpcjaPytania {
  wartosc: WartoscOpcji;
  etykieta: string;
  opis?: string;
}

/** Warunek pokazania pytania. Ścieżki mogą mieć znaczniki `$osoba`, `$tytul`, `$dziecko`. */
export type Warunek =
  | { sciezka: string; rowne: WartoscOpcji }
  | { sciezka: string; rozne: WartoscOpcji }
  | { sciezka: string; jedenZ: WartoscOpcji[] }
  | { sciezka: string; wypelnione: boolean }
  /** Dana istnieje (jest ustawiona), nawet gdy to pusta lista; `wypelnione` pustą listę uznaje za brak. */
  | { sciezka: string; istnieje: boolean }
  | { wszystkie: Warunek[] }
  | { ktorykolwiek: Warunek[] }
  | { nie: Warunek };

export interface DefinicjaPytania {
  /** Stały identyfikator pytania (bez polskich znaków). */
  id: string;
  /** A – zmienia wynik (krok „Moja sytuacja”), B – dane tylko do wniosków (krok „Dokumenty”). */
  warstwa: 'A' | 'B';
  /** Krok ankiety (grupa ekranów), id z `KROKI_ANKIETY`. */
  krok: string;
  zakres: ZakresPytania;
  /** Pytanie dla rodzica, w drugiej osobie. */
  etykieta: string;
  /** „Po co pytamy” – krótko, prostym językiem. */
  pomoc?: string;
  /**
   * Treść zależna od etapu (w ciąży, po porodzie, przyjęcie dziecka), żeby nie pisać „urodzi się lub trafi”
   * rodzicowi, którego dotyczy tylko jedno. Brak wariantu = `etykieta` / `pomoc`.
   */
  wgEtapu?: Partial<Record<EtapAnkiety, { etykieta?: string; pomoc?: string }>>;
  /**
   * Treść zależna od rodzaju umowy (pytania o tytuł), np. „Od kiedy prowadzisz działalność?”. `opcje` zastępują listę
   * odpowiedzi do pokazania przy tym rodzaju (np. bez „wyrejestrowania” przy etacie). Główna lista `opcje` musi mieć
   * wszystkie wartości z wariantów, bo według niej walidujemy zapisane odpowiedzi.
   */
  wgRodzaju?: Partial<Record<RodzajTytulu, { etykieta?: string; pomoc?: string; opcje?: OpcjaPytania[] }>>;
  /** Podpowiedź przy polu, np. gdzie znaleźć daną. */
  podpowiedz?: string;
  /** Rozwijane „Co to jest …?” z ikoną (i) przy pojęciu, którego rodzic może nie znać. */
  wyjasnienie?: { pojecie: string; tresc: string; /** Własny tekst przycisku zamiast „Co to jest …?”, np. „Kim jest płatnik?”. */ pytanie?: string };
  typ: TypPola;
  opcje?: OpcjaPytania[];
  /** Ścieżka w `Rodzina`, do której trafia odpowiedź. */
  sciezka: string;
  kodek?: KodekPola;
  /** Kodek `obecnosc`: co wstawić, gdy rodzic odpowie „tak”. */
  wartoscPoczatkowa?: unknown;
  /** Identyfikator danej z `docs/zrodla-danych.json`; `null`, gdy mapa tej danej nie ma. */
  daneId: string | null;
  warunek?: Warunek;
  wymagane?: boolean;
  /** `tak_nie`: dodaj odpowiedź „Nie wiem” (zapisuje brak wartości). */
  nieWiem?: boolean;
  /** Liczba / kwota: zakres. */
  min?: number;
  max?: number;
  jednostka?: string;
  /**
   * Data: rozsądny zakres w dniach względem `rodzina.dataAnalizy` (ujemne = w przeszłości).
   * To sprawdzenie literówek (np. zły rok), nie reguła prawna.
   */
  zakresDat?: { minDni?: number; maxDni?: number };
  /** Data nie wcześniejsza niż wartość pod tą ścieżką (np. koniec umowy ≥ początek). */
  nieWczesniejNiz?: string;
}

export interface KrokAnkiety {
  id: string;
  tytul: string;
  opis?: string;
}

/** Numery osoby, tytułu i dziecka, dla których pokazujemy dane pytanie. */
export interface ZakresInstancji {
  osoba?: number;
  tytul?: number;
  dziecko?: number;
}

/** Pytanie gotowe do narysowania: definicja + konkretne miejsce w `Rodzina`. */
export interface PytanieWidoczne {
  def: DefinicjaPytania;
  zakres: ZakresInstancji;
  /** Ścieżka po podstawieniu znaczników, np. 'osoby[0].tytuly[1].od'. */
  sciezka: string;
  /** Unikalny klucz (do React `key` i do mapy błędów), np. 'tytul_od@o0.t1'. */
  klucz: string;
  /** Aktualna odpowiedź (po kodeku). */
  wartosc: unknown;
}

export type KodBleduPola =
  | 'WYMAGANE'
  | 'ZLA_DATA'
  | 'DATA_ZA_WCZESNIE'
  | 'DATA_ZA_POZNO'
  | 'DATA_PRZED_INNA'
  | 'OKRES_ODWROCONY'
  | 'NIE_LICZBA'
  | 'KWOTA_UJEMNA'
  | 'ZA_MALO'
  | 'ZA_DUZO'
  | 'ZLA_OPCJA'
  | 'ZLY_MIESIAC'
  | 'MIESIAC_POWTORZONY'
  | 'MIESIAC_W_PRZYSZLOSCI'
  | 'DNI_PONAD_OBOWIAZEK'
  /** Odpowiedź z wartością startową, której rodzic jeszcze nie sprawdził (nie z silnika: dokłada ją ankieta). */
  | 'DO_POTWIERDZENIA';

export interface BladPola {
  kod: KodBleduPola;
  /** Komunikat dla rodzica, przy polu. Testy sprawdzają `kod`, nie treść. */
  komunikat: string;
  /** Dla list: które pole w liście, np. '[1].kwota' albo '[0].do'. */
  pole?: string;
}

export interface BladAnkiety extends BladPola {
  pytanieId: string;
  klucz: string;
  sciezka: string;
}

export interface WynikWalidacjiAnkiety {
  poprawna: boolean;
  bledy: BladAnkiety[];
}
