/**
 * Kształt definicji pytań kwestionariusza. Właściciel treści: tor D. Kształt: tor C (C3).
 *
 * To wierna kopia typów z `src/components/pytania/typy.ts` (gałąź toru C): te same nazwy i pola.
 * Dzięki temu tor C może zamienić swoją listę roboczą na jedną linię
 * `export { PYTANIA, KROKI_ANKIETY } from '../../content/pytania';` i interfejs działa bez zmian.
 * Pliku toru C nie importujemy, bo należy do toru C i nie ma go na `main`.
 *
 * Definicje są czystymi danymi (da się je zapisać jako JSON): bez funkcji, bez Reacta.
 *
 * Ścieżki to ścieżki pól w `Rodzina` z kontraktu (`src/engine/types.ts`), np.
 * `osoby[$osoba].tytuly[$tytul].od`. Znaczniki `$osoba`, `$tytul`, `$dziecko` zastępuje
 * silnik ankiety numerem osoby, tytułu ubezpieczenia albo dziecka.
 *
 * Pola tylko toru D (wszystkie opcjonalne, więc nie łamią zgodności z torem C):
 * `takze`, `skadWziac`, `delikatne`, `zaawansowane`, `czekaNaKontrakt`.
 * Zmieniając typy z części wspólnej, zmieniaj je razem z torem C.
 */

// ───────────────────────── Część wspólna z torem C ─────────────────────────

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
  /** Podpowiedź przy polu, np. gdzie znaleźć daną. */
  podpowiedz?: string;
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

  // ── Pola tylko toru D (opcjonalne; UI toru C może je pominąć) ──

  /** Inne rekordy mapy danych, które to samo pytanie wypełnia (np. imię drugiego rodzica = imię osoby nr 2). */
  takze?: string[];
  /** Z jakiego dokumentu przepisać daną, gdy żadna e-usługa jej nie ma. */
  skadWziac?: string;
  /** Pytanie o trudną sytuację: pokaż je łagodnie, np. pod „Czy wydarzyło się coś, o czym powinniśmy wiedzieć?”. */
  delikatne?: true;
  /** Tryb szczegółowy (np. jak w Z-3): można go domyślnie zwinąć. */
  zaawansowane?: true;
  /** Pola nie ma jeszcze w kontrakcie (`src/engine/types.ts`) – czeka na integratora. UI może pytanie pominąć. */
  czekaNaKontrakt?: true;
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
  | 'DNI_PONAD_OBOWIAZEK';

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

// ───────────────────────── Tylko tor D ─────────────────────────

/**
 * Pola, których potrzebują tylko wnioski (warstwa B): tekst i numery. Typ toru C ich nie ma,
 * dlatego pytania warstwy B są w osobnej liście `PYTANIA_DOKUMENTY`, a nie w `PYTANIA`.
 */
export type TypPolaDokumentu =
  | TypPola
  | 'tekst'
  | 'pesel'
  | 'nip'
  | 'regon'
  | 'telefon'
  | 'rachunek'
  | 'adres'; // { ulica, nrDomu, nrLokalu, kod, miejscowosc }

/** Pytanie warstwy B (dane do wniosków): ten sam kształt, szerszy wybór rodzajów pól. */
export interface DefinicjaPytaniaDokumentu extends Omit<DefinicjaPytania, 'typ' | 'warstwa'> {
  warstwa: 'B';
  typ: TypPolaDokumentu;
}

/** Dana z mapy, o którą kwestionariusz celowo nie pyta – z powodem. */
export interface DanaPozaKwestionariuszem {
  daneId: string;
  rodzaj: 'plan' | 'automatyczne' | 'zalacznik' | 'oswiadczenie' | 'symulacja';
  wyjasnienie: string;
}
