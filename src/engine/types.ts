/**
 * KONTRAKT DANYCH – Zasiłkowy Przewodnik Przyszłego Rodzica.
 *
 * Ten plik jest wspólny dla wszystkich czterech torów pracy (silnik, kalkulator, UI, wnioski).
 * ZMIENIA GO TYLKO INTEGRATOR (Oskar). Potrzebujesz nowego pola? Zgłoś to integratorowi,
 * nie dopisuj go u siebie – inaczej rozjadą się API, UI i testy.
 *
 * Zasady:
 *  - daty to napisy 'RRRR-MM-DD' (bez godzin i stref czasowych); liczymy je funkcjami z `daty.ts`;
 *  - odcinki są domknięte z obu stron: `od` i `do` to pierwszy i ostatni dzień;
 *  - tydzień = 7 dni kalendarzowych;
 *  - kwoty w złotych, zaokrąglone do grosza (2 miejsca), brutto;
 *  - silnik nie czyta zegara: „dziś” przychodzi w `Rodzina.dataAnalizy`.
 */

export type DataISO = string; // 'RRRR-MM-DD'
export type MiesiacISO = string; // 'RRRR-MM'

// ───────────────────────── Osoby i ubezpieczenie ─────────────────────────

export type Rola = 'matka' | 'ojciec' | 'przyjmujacy' | 'inny_czlonek_rodziny';

export type RodzajTytulu = 'umowa_o_prace' | 'zlecenie' | 'dzialalnosc' | 'wspolpraca' | 'inny';

/** Ubezpieczenie chorobowe: obowiązkowe (etat), dobrowolne (zlecenie, działalność) albo brak. */
export type Chorobowe = 'obowiazkowe' | 'dobrowolne' | 'brak';

export type PrzyczynaUstania =
  | 'koniec_umowy'
  | 'upadlosc'
  | 'likwidacja'
  | 'smierc_pracodawcy'
  | 'naruszenie_prawa_wyrok' // rozwiązanie umowy z naruszeniem prawa, prawomocny wyrok [UZ art. 30 ust. 1]
  | 'wyrejestrowanie'
  | 'zakonczenie_dzialalnosci';

/** Jeden miesiąc podstawy wymiaru składek (to, co widać na koncie ubezpieczonego w eZUS). */
export interface MiesiacPodstawy {
  miesiac: MiesiacISO;
  /** Podstawa wymiaru składki na ubezpieczenie chorobowe / przychód za ten miesiąc, brutto. */
  kwota: number;
  /** Tryb szczegółowy (jak w Z-3). Bez tych pól miesiąc traktujemy jako przepracowany w całości. */
  dniPrzepracowane?: number;
  dniObowiazku?: number;
  skladnikiStale?: number;
  skladnikiZmienne?: number;
}

export interface TytulUbezpieczenia {
  id: string;
  rodzaj: RodzajTytulu;
  chorobowe: Chorobowe;
  /** Od kiedy trwa tytuł (umowa, działalność). */
  od: DataISO;
  /** Do kiedy trwa. Brak = trwa nadal / bezterminowo. */
  do?: DataISO;
  /** Od kiedy osoba podlega ubezpieczeniu chorobowemu z tego tytułu. Brak = od `od`. */
  chorobowoOd?: DataISO;
  /** Etat: umowa na czas określony albo próbna > 1 mies. [KP art. 177 § 3]. */
  naCzasOkreslony?: boolean;
  /** Etat: umowa na zastępstwo – nie przedłuża się do dnia porodu [KP art. 177 § 3¹]. */
  naZastepstwo?: boolean;
  /** Etat: 1 = pełny etat, 0.5 = pół etatu. */
  wymiarEtatu?: number;
  /** Tryb prosty: miesięczne wynagrodzenie / przychód brutto, gdy nie ma `podstawaSkladek`. */
  wynagrodzenieMiesieczne?: number;
  /** Czy płatnik zgłasza do ubezpieczenia chorobowego ponad 20 osób (wtedy sam wypłaca) [UZ art. 61]. */
  platnikPowyzej20?: boolean;
  nazwaPlatnika?: string;
  nipPlatnika?: string;
  /**
   * REGON płatnika – do ZAM, gdy płatnik nie ma NIP. Źródło: eZUS („Ubezpieczenia i płatnicy”),
   * e-Urząd Skarbowy (własna działalność), pracodawca albo wpis rodzica. Silnik go nie używa.
   */
  regonPlatnika?: string;
  /** Podstawy za kolejne miesiące (symulowany eZUS albo wpisane ręcznie). */
  podstawaSkladek?: MiesiacPodstawy[];
  /** Składniki kwartalne, np. { okres: '2026-Q3', kwota: 1500 }. */
  skladnikiKwartalne?: { okres: string; kwota: number }[];
  /** Składnik roczny za poprzedni rok kalendarzowy. */
  skladnikRoczny?: number;
  /** Działalność / dobrowolne: zadeklarowana miesięczna podstawa składek. */
  zadeklarowanaPodstawa?: number;
  /** Zadłużenie składkowe na dzień powstania prawa (zł). */
  zadluzenieSkladkowe?: number;
  /**
   * Dzień, na który podano `zadluzenieSkladkowe`. eZUS (panel płatnika, „Składki i salda”) przed porodem zna saldo
   * tylko na dziś, a silnik potrzebuje stanu na dzień powstania prawa [UZ art. 2a ust. 1]. Brak = nie wiadomo.
   */
  zadluzenieSkladkoweNaDzien?: DataISO;
  /**
   * Ustanie tytułu ubezpieczenia. `przyczyna` jest opcjonalna: eZUS zna datę i tryb rozwiązania umowy, ale nie
   * przyczynę w rozumieniu ZAM (upadłość, likwidacja, śmierć pracodawcy, wyrok). Brak przyczyny = nie wiadomo,
   * więc reguły UZ art. 30 ust. 1 i 3 nie dają z niej prawa do zasiłku.
   */
  ustanie?: { data: DataISO; przyczyna?: PrzyczynaUstania };
  /**
   * Działalność: okresy zawieszenia (CEIDG – wpis jawny z datami zawieszenia i wznowienia). `do` = dzień przed
   * wznowieniem; brak `do` = zawieszona nadal.
   */
  zawieszenia?: { od: DataISO; do?: DataISO }[];
}

/** Dane do wniosków. Silnik ich nie potrzebuje. */
export interface DaneOsobowe {
  imie?: string;
  nazwisko?: string;
  pesel?: string;
  dataUrodzenia?: DataISO;
  /** `panstwo` – tylko przy adresie za granicą (ZAM); brak = Polska. */
  adres?: { ulica?: string; nrDomu?: string; nrLokalu?: string; kod?: string; miejscowosc?: string; panstwo?: string };
  /**
   * Rodzaj, seria i numer dokumentu tożsamości, np. 'paszport AB1234567'. ZAM wymaga go tylko, gdy osoba nie ma
   * PESEL. Źródło: rejestr PESEL (mObywatel) albo wpis rodzica.
   */
  dokumentTozsamosci?: string;
  telefon?: string;
  email?: string;
  rachunekBankowy?: string;
}

export interface Zdrowie {
  /**
   * Zwolnienia lekarskie; kodB = ciąża. `kodB` jest opcjonalny: IKP zna okresy zwolnień, ale nie kod B.
   * Brak `kodB` = nie wiadomo; silnik nie liczy takiego zwolnienia jako zwolnienia w ciąży.
   */
  eZLA?: { od: DataISO; do: DataISO; kodB?: boolean }[];
  orzeczenieNiezdolnosciSamodzielnejEgzystencji?: boolean;
  pobytWSzpitalu?: { od: DataISO; do: DataISO }[];
  zgon?: DataISO;
  porzucenieDziecka?: DataISO;
}

export interface Osoba {
  id: string;
  rola: Rola;
  dane?: DaneOsobowe;
  tytuly: TytulUbezpieczenia[];
  urlopWychowawczy?: { od: DataISO; do: DataISO };
  zdrowie?: Zdrowie;
  /** Czy osoba złożyła PIT-2 u wypłacającego zasiłek (kwota zmniejszająca podatek). Do szacunku „na rękę”. */
  pit2?: boolean;
  /**
   * Oświadczenia do wniosków (ZAM, wnioski do pracodawcy). Wpisuje rodzic; silnik ich nie używa.
   * `ojcowskiZInnegoTytulu` – ZAM, str. 5: czy za ten okres urlopu ojcowskiego pobierał już zasiłek z innego tytułu.
   */
  oswiadczenia?: { ojcowskiZInnegoTytulu?: boolean };
  /**
   * Zasiłki pobrane wcześniej – eZUS, „Świadczenia i przerwy” (kod, okres, kwota, kto wypłacał). Do symulacji eZUS
   * i do UZ art. 43 (podstawa poprzedniego zasiłku). `rodzaj` to kod albo nazwa świadczenia z eZUS.
   */
  pobraneZasilki?: {
    rodzaj: string;
    od: DataISO;
    do: DataISO;
    stawkaProc?: number;
    kwota?: number;
    ktoWyplacal?: 'platnik' | 'ZUS';
  }[];
}

// ───────────────────────── Dziecko (zdarzenie) ─────────────────────────

export type TypZdarzenia =
  | 'porod'
  | 'przysposobienie'
  | 'rodzina_zastepcza_niezawodowa'
  | 'rodzina_zastepcza_zawodowa'; // brak prawa – silnik ma to powiedzieć wprost

export interface Dziecko {
  martwe?: boolean;
  zgon?: DataISO;
  /** Tydzień ciąży w dniu porodu (wcześniak < 37). */
  tydzienCiazy?: number;
  masaG?: number;
  szpital?: { od: DataISO; do: DataISO }[];
  zaZyciem?: boolean;
  /** Przyjęcie na wychowanie. */
  dataUrodzenia?: DataISO;
  odroczonyObowiazekSzkolny?: boolean;
  /**
   * Dane dziecka do wniosków (ZAM str. 3–4, wnioski do pracodawcy, odpis aktu). Silnik ich nie używa.
   * Źródło: rejestr PESEL (mObywatel) i USC – dopiero po sporządzeniu aktu urodzenia; wcześniej wpis rodzica.
   */
  dane?: { imie?: string; nazwisko?: string; pesel?: string; miejsceUrodzenia?: string };
}

export interface ZdarzenieDziecka {
  typ: TypZdarzenia;
  /** Data porodu albo przyjęcia dziecka: faktyczna albo przewidywana. */
  data: DataISO;
  przewidywana: boolean;
  /** Przysposobienie: data uprawomocnienia (termin urlopu ojcowskiego). */
  dataUprawomocnienia?: DataISO;
  /** Liczba dzieci z jednego porodu / przyjętych jednocześnie = dzieci.length. */
  dzieci: Dziecko[];
}

export interface Rodzina {
  osoby: Osoba[];
  zdarzenie: ZdarzenieDziecka;
  /** „Dziś” – do ostrzeżeń o terminach. Ustawia UI. */
  dataAnalizy: DataISO;
}

// ───────────────────────── Plan na osi czasu ─────────────────────────

export type TypOdcinka =
  | 'chorobowy_ciaza'
  | 'w_wys_macierzynskiego' // zasiłek w wysokości zasiłku macierzyńskiego, do dnia porodu
  | 'macierzynski'
  | 'na_warunkach_macierzynskiego'
  | 'uzupelniajacy'
  | 'rodzicielski'
  | 'ojcowski'
  | 'praca'
  | 'przerwa'
  | 'wychowawczy';

export interface Odcinek {
  id: string;
  osobaId: string;
  typ: TypOdcinka;
  od: DataISO;
  do: DataISO;
  /** Łączenie urlopu rodzicielskiego z pracą: część etatu, na której osoba pracuje (≤ 0.5). */
  wymiarPracy?: number;
  /** Rodzicielski: część 1–5, ojcowski: 1–2. Nadaje silnik. */
  czescNr?: number;
  /** Z którego tytułu ubezpieczenia płynie zasiłek (gdy osoba ma kilka). */
  tytulId?: string;
}

export interface Plan {
  id: string;
  nazwa: string;
  odcinki: Odcinek[];
  /** Wariant 81,5% za cały okres (wniosek matki do 21 dni po porodzie) [UZ art. 30a]. */
  wariant815: boolean;
  wniosek815Data?: DataISO;
}

/** Zmiany, które rodzic robi na osi czasu. Silnik zwraca nowy plan i jego ocenę. */
export type AkcjaPlanu =
  | { typ: 'przesun'; odcinekId: string; nowyOd: DataISO }
  | { typ: 'zmien_koniec'; odcinekId: string; nowyDo: DataISO }
  | { typ: 'podziel'; odcinekId: string; pierwszyDzienDrugiejCzesci: DataISO }
  | { typ: 'usun'; odcinekId: string }
  | { typ: 'dodaj'; odcinek: Omit<Odcinek, 'id' | 'czescNr'> }
  | { typ: 'przenies_na_osobe'; odcinekId: string; osobaId: string }
  | { typ: 'rezygnacja_matki'; poTygodniach: number; przejmujeOsobaId: string }
  | { typ: 'polacz_z_praca'; odcinekId: string; wymiarPracy: number }
  | { typ: 'ustaw_wariant_815'; wartosc: boolean };

// ───────────────────────── Wyniki silnika ─────────────────────────

export type Swiadczenie =
  | 'zasilek_chorobowy_ciaza'
  | 'swiadczenie_rehabilitacyjne'
  | 'zasilek_w_wys_macierzynskiego'
  | 'macierzynski'
  | 'na_warunkach_macierzynskiego'
  | 'uzupelniajacy'
  | 'rodzicielski'
  | 'ojcowski';

export interface Uprawnienie {
  /** Stały kod powodu, np. 'UBEZP_W_DNIU_PORODU' albo 'BRAK_UBEZP_W_DNIU_PORODU'. Testy sprawdzają kody. */
  kod: string;
  osobaId: string;
  swiadczenie: Swiadczenie;
  /** 'warunkowo' = przysługuje, jeśli zajdzie opisany warunek (np. orzeczenie lekarza ZUS). */
  przysluguje: boolean | 'warunkowo';
  /** Zdanie dla rodzica, prostym językiem: dlaczego tak albo dlaczego nie. */
  powod: string;
  /** Np. 'UZ art. 29 ust. 1' albo 'KP art. 180 § 1'. */
  przepis: string;
  tytulId?: string;
  /** Gdy nie przysługuje: co zamiast tego (np. świadczenie rodzicielskie 1000 zł z gminy). */
  alternatywa?: string;
}

/** Pule w tygodniach dla całej rodziny i granice dat. */
export interface Pule {
  macierzynskiTyg: number;
  /**
   * Gdy koniec urlopu wynika z daty, a nie z pełnych tygodni (zgon dziecka: „nie krócej niż 7 dni
   * od zgonu”) – ostatni dzień urlopu macierzyńskiego. Ma pierwszeństwo przed `macierzynskiTyg`.
   */
  macierzynskiOstatniDzien?: DataISO;
  /** Ile tygodni macierzyńskiego wolno wziąć przed przewidywaną datą porodu (6). */
  macierzynskiPrzedPorodemMaxTyg: number;
  /** Ile tygodni po porodzie matka musi wykorzystać sama (14 albo 8). */
  obowiazkoweMatkiTyg: number;
  uzupelniajacyTyg: number;
  rodzicielskiTyg: number;
  /** Część rodzicielskiego tylko dla każdego z rodziców (9). */
  rodzicielskiNieprzenoszalneTyg: number;
  /** Maksimum rodzicielskiego przy łączeniu z pracą (82 / 86 / 130 / 134). */
  rodzicielskiMaxZPracaTyg: number;
  rodzicielskiMaxCzesci: number;
  ojcowskiTyg: number;
  /** Ostatni dzień, w którym można korzystać z rodzicielskiego. */
  rodzicielskiDoKiedy?: DataISO;
  /** Ostatni dzień, w którym można korzystać z ojcowskiego. */
  ojcowskiDoKiedy?: DataISO;
  /** Ostatni dzień na wniosek o 81,5%. */
  wniosek815DoKiedy?: DataISO;
  /** Uwagi do wymiaru, np. kod 'DO_POTWIERDZENIA_W_ZUS', gdy przepis nie rozstrzyga sprawy wprost. */
  uwagi?: Komunikat[];
}

export type PoziomKomunikatu = 'blad' | 'ostrzezenie' | 'konsekwencja' | 'info';

export interface Komunikat {
  /** Stały kod, np. 'MAC_MIN_14_TYG'. Testy sprawdzają kody, nie treść. */
  kod: string;
  poziom: PoziomKomunikatu;
  /** Dla rodzica, prostym językiem. */
  tresc: string;
  przepis?: string;
  osobaId?: string;
  odcinekId?: string;
  /** Co zrobić teraz. */
  coZrobic?: string;
}

/** Łagodna karta ryzyka: co może się stać, dlaczego, co możesz zrobić. */
export interface Ryzyko {
  kod: string;
  osobaId?: string;
  tytul: string;
  coMozeSieStac: string;
  dlaczego: string;
  coZrobic: string;
  /** Dokumenty, które warto mieć pod ręką, gdyby ZUS poprosił o wyjaśnienia. */
  coPrzygotowac?: string[];
  przepis?: string;
  /** Dzień, po którym prawo przepada albo zmienia się wariant (ryzyka terminowe). */
  termin?: DataISO;
  /** Do terminu zostało nie więcej niż `limity.ryzykoTerminPilneDni` dni – UI może wysłać powiadomienie. */
  pilne?: boolean;
}

/**
 * Wybór, który rodzic ma (albo którego nie ma): „tutaj możesz coś zmienić, od kiedy do kiedy,
 * i co się wtedy dzieje”. To wprost prośba mentora ZUS.
 */
export interface Mozliwosc {
  kod:
    | 'urlop_przed_porodem'
    | 'rezygnacja_matki_i_przejecie'
    | 'wariant_815'
    | 'podzial_rodzicielskiego'
    | 'rodzicielski_jednoczesnie'
    | 'laczenie_z_praca'
    | 'ojcowski_w_czesciach'
    | 'uzupelniajacy'
    | 'przejecie_sytuacja_szczegolna';
  dostepna: boolean;
  /** Dlaczego niedostępna albo na czym polega. */
  opis: string;
  odKiedy?: DataISO;
  doKiedy?: DataISO;
  /** Co się stanie, jeśli rodzic z niej skorzysta – także dla drugiej osoby. */
  konsekwencje: string[];
  przepis: string;
  ktoDecyduje?: string; // osobaId
}

export interface WynikUprawnien {
  uprawnienia: Uprawnienie[];
  pule: Pule;
  mozliwosci: Mozliwosc[];
  ryzyka: Ryzyko[];
}

export interface WykorzystaniePuli {
  pula: 'macierzynski' | 'uzupelniajacy' | 'rodzicielski' | 'rodzicielski_nieprzenoszalne' | 'ojcowski';
  osobaId?: string;
  wykorzystaneDni: number;
  dostepneDni: number;
  /** Dni, które przy tym planie przepadną (np. niewykorzystane 9 tygodni drugiego rodzica). */
  przepadnieDni?: number;
}

export interface WynikWalidacji {
  /** true, gdy nie ma żadnego błędu (ostrzeżenia i konsekwencje nie blokują). */
  poprawny: boolean;
  bledy: Komunikat[];
  ostrzezenia: Komunikat[];
  /** Co z tego planu wynika, np. „tata musi złożyć wniosek 14 dni przed przejęciem”. */
  konsekwencje: Komunikat[];
  wykorzystanie: WykorzystaniePuli[];
}

// ───────────────────────── Kalkulator ─────────────────────────

/** Jeden krok ścieżki wyliczenia, pokazywany rodzicowi i jury. */
export interface KrokWyliczenia {
  opis: string;
  /** Np. '8000,00 zł × (100% − 13,71%)'. */
  wzor?: string;
  wartosc?: number;
  przepis?: string;
}

export type MetodaPodstawy =
  | 'srednia_12_miesiecy'
  | 'srednia_pelnych_miesiecy'
  | 'z_umowy'
  | 'art_48a' // dobrowolne ubezpieczenie krócej niż 12 miesięcy
  | 'najnizsza_podstawa'
  | 'podstawa_poprzedniego_zasilku' // przerwa < 1 miesiąc [UZ art. 43]
  | 'reczna';

export interface PodstawaWymiaru {
  osobaId: string;
  tytulId: string;
  /** Miesięczna podstawa wymiaru zasiłku po odliczeniu 13,71%. */
  kwota: number;
  metoda: MetodaPodstawy;
  sciezka: KrokWyliczenia[];
  /** Zastosowane ograniczenia, np. 'minimum_art_45', 'limit_dobrowolne'. */
  ograniczenia: string[];
}

export interface KwotaOdcinka {
  odcinekId: string;
  osobaId: string;
  podstawa: number;
  /** 100, 70, 81.5 … */
  stawkaProc: number;
  /** Stawka dzienna po zastosowaniu stawki i wymiaru pracy. */
  dziennie: number;
  dni: number;
  /** Suma za cały odcinek. */
  razem: number;
  /** Kwota za pełny miesiąc (30 dni) – do pokazania „ile miesięcznie”. */
  miesiecznie: number;
  /** Podwyższenie do kwoty świadczenia rodzicielskiego, łącznie za odcinek [UZ art. 31 ust. 3a]. */
  podwyzszenie?: number;
  /** Szacunkowa zaliczka na podatek dochodowy za odcinek. */
  zaliczkaPodatku?: number;
  /** Szacunkowo „na rękę”: razem + podwyższenie − zaliczka. To przybliżenie, nie kwota z decyzji. */
  naReke?: number;
  rozbicieMiesieczne: { miesiac: MiesiacISO; dni: number; kwota: number }[];
  sciezka: KrokWyliczenia[];
}

export interface WynikKwot {
  podstawy: PodstawaWymiaru[];
  odcinki: KwotaOdcinka[];
  sumaOsoby: Record<string, number>;
  sumaRazem: number;
  /** Szacunkowo „na rękę” łącznie; brak, gdy nie policzono. */
  naRekeRazem?: number;
  uwagi: Komunikat[];
}

// ───────────────────────── Dokumenty i terminy ─────────────────────────

export type KodDokumentu =
  | 'ZAM'
  | 'Z-3'
  | 'Z-3a'
  | 'ZAS-53'
  | 'ZAS-12'
  | 'wniosek_macierzynski_przed_porodem'
  | 'wniosek_rodzicielski'
  | 'wniosek_rezygnacja_matki'
  | 'wniosek_przejecie_macierzynskiego'
  | 'wniosek_uzupelniajacy'
  | 'wniosek_ojcowski'
  | 'wniosek_laczenie_z_praca'
  | 'wniosek_815'
  | 'wniosek_na_warunkach_macierzynskiego' // przysposobienie / rodzina zastępcza [KP art. 183 § 6]
  | 'zalacznik';

export interface Dokument {
  kod: KodDokumentu;
  nazwa: string;
  /** osobaId albo 'platnik' (Z-3 i Z-3a wypełnia płatnik, nie rodzic). */
  ktoSklada: string;
  gdzie: 'pracodawca' | 'platnik' | 'ZUS';
  termin?: DataISO;
  /** Względem `rodzina.dataAnalizy`: można złożyć już teraz, dopiero później albo termin minął. */
  status: 'teraz' | 'pozniej' | 'po_terminie';
  /** Najwcześniejszy dzień, w którym wniosek ma sens (np. ZAM po porodzie). */
  odKiedy?: DataISO;
  zalaczniki: string[];
  /** true = aplikacja potrafi wygenerować ten dokument (POST /api/forms/{kod}). */
  moznaWygenerowac: boolean;
  odcinekId?: string;
  przepis?: string;
  /** Uwagi do dokumentu, np. kod 'DO_POTWIERDZENIA_W_ZUS', gdy przepis nie rozstrzyga sprawy wprost. */
  uwagi?: Komunikat[];
}

export interface Termin {
  /** Stały kod terminu, np. 'TERMIN_815', 'PONOWNE_ZGLOSZENIE_PO_ZASILKU'. UI i testy rozpoznają terminy po kodzie. */
  kod?: string;
  data: DataISO;
  tytul: string;
  opis: string;
  rodzaj: 'wniosek' | 'graniczny' | 'poczatek' | 'koniec';
  osobaId?: string;
  odcinekId?: string;
  przepis?: string;
}

export interface KtoWyplaca {
  osobaId: string;
  tytulId: string;
  kto: 'platnik' | 'ZUS';
  powod: string;
  przepis: string;
}

export interface WynikDokumentow {
  ktoWyplaca: KtoWyplaca[];
  dokumenty: Dokument[];
  terminy: Termin[];
  /** Uwagi do całej listy dokumentów, np. 'DO_POTWIERDZENIA_W_ZUS'. */
  uwagi?: Komunikat[];
}

// ───────────────────────── Źródła danych (symulacje) ─────────────────────────

export type ZrodloId =
  | 'mobywatel'
  | 'login_gov'
  | 'ezus'
  | 'eurzad_skarbowy'
  | 'ceidg'
  | 'ikp'
  | 'rsc'
  | 'empatia'
  | 'pracodawca'
  | 'lekarz_szpital'
  | 'sad'
  | 'formularz_pdf' // dane odczytane z wgranego wniosku
  | 'uzytkownik';

/** Skąd aplikacja ma daną wartość. `sciezka` to ścieżka pola w Rodzinie, np. 'osoby[0].dane.pesel'. */
export interface PochodzenieDanej {
  sciezka: string;
  zrodlo: ZrodloId;
}

export interface PersonaTestowa {
  id: string;
  nazwa: string;
  /** Jedno zdanie: kto to i jaki przypadek pokazuje. */
  opis: string;
  rodzina: Rodzina;
  pochodzenie: PochodzenieDanej[];
}

/**
 * Osoba widziana przez usługę: tytuły mogą być niepełne (np. e-Urząd Skarbowy zna nazwę i NIP firmy,
 * ale nie rodzaj chorobowego ani daty). `id` tytułu jest zawsze – po nim scalamy dane z profilem.
 */
export type CzesciowaOsoba = Omit<Partial<Osoba>, 'tytuly'> & {
  tytuly?: (Partial<TytulUbezpieczenia> & { id: string })[];
};

export type StatusDokumentuZrodla = 'oczekuje' | 'wystawione';

/**
 * Dokument, z którego usługa bierze dane, i jego stan w dniu `rodzina.dataAnalizy`. W prawdziwym eZUS każde
 * zamówione potwierdzenie najpierw „oczekuje”, potem jest „wystawione” z pieczęcią ZUS.
 */
export interface DokumentZrodla {
  kod: 'potwierdzenie_danych_z_zus' | 'e_zla' | 'zaswiadczenie_o_zadluzeniu' | 'odpis_aktu_urodzenia';
  nazwa: string;
  zrodlo: ZrodloId;
  /** Dzień, na który dokument podaje dane. */
  naDzien: DataISO;
  status: StatusDokumentuZrodla;
  /** Gdy oczekuje: najwcześniejszy dzień, w którym usługa może go wystawić. */
  wystawienieOd?: DataISO;
  /** Pola profilu, które dokument potwierdza (ścieżki jak w `pochodzenie`). */
  sciezki: string[];
}

/** Odpowiedź symulowanej usługi: tylko to, co ta usługa naprawdę ma (docs/zrodla-danych.md). */
export interface OdpowiedzZrodla {
  zrodlo: ZrodloId;
  symulacja: true;
  /** Fragment Rodziny do scalenia z profilem – dane osoby, która pyta. */
  dane: CzesciowaOsoba & { zdarzenie?: Partial<ZdarzenieDziecka> };
  /**
   * Dane innych osób, które usługa zna (np. rejestr PESEL w mObywatelu zna dane małżonka). `id` = osoba w rodzinie,
   * gdy wiadomo, której dotyczą; inaczej scala UI. Ścieżki w `pochodzenie` wskazują ich miejsce w Rodzinie.
   */
  osoby?: CzesciowaOsoba[];
  pochodzenie: PochodzenieDanej[];
  /** Czego ta usługa nie ma i trzeba to wpisać samemu. */
  brakuje: string[];
  /** Dokumenty, z których usługa bierze dane, i ich status na dzień analizy (np. zaświadczenie o zadłużeniu). */
  dokumenty?: DokumentZrodla[];
}

/** Wynik odczytu wgranego wniosku PDF (pola formularza, bez OCR). */
export interface OdpowiedzOdczytuWniosku {
  /** false = plik nie ma pól formularza (np. skan) – dane trzeba wpisać ręcznie. */
  rozpoznano: boolean;
  formularz?: 'ZAM' | 'nieznany';
  osoba?: CzesciowaOsoba;
  zdarzenie?: Partial<ZdarzenieDziecka>;
  /** Płatnik z ZAM (nazwa, NIP) – do tytułu ubezpieczenia, który wskaże rodzic. */
  platnik?: { nazwa?: string; nip?: string };
  /** Drugi rodzic z ZAM (dane osobowe, oświadczenia). */
  drugaOsoba?: CzesciowaOsoba;
  /** Okresy zasiłku z ZAM – szkic planu bez identyfikatorów (nadaje je planer). */
  odcinki?: Omit<Odcinek, 'id'>[];
  /** Czy we wniosku zaznaczono wariant 81,5% [UZ art. 30a]. */
  wariant815?: boolean;
  pochodzenie: PochodzenieDanej[];
  /** Pola formularza, których nie umiemy przenieść do profilu. */
  nieodczytane: string[];
  /** Zdanie dla rodzica: co się udało i co ma sprawdzić. */
  komunikat: string;
}

/** POST /api/forms/{kod} – odpowiedzią jest plik PDF. */
export interface ZapytanieWniosek {
  rodzina: Rodzina;
  plan: Plan;
  osobaId: string;
  /** Dla wniosków dotyczących jednego odcinka (np. część urlopu rodzicielskiego). */
  odcinekId?: string;
}

// ───────────────────────── Parametry (panel admina) ─────────────────────────

/** Wszystkie liczby z przepisów. Silnik nie ma żadnej liczby „na sztywno” poza tym obiektem. */
export interface Parametry {
  /** Wersja obowiązuje od tego dnia do dnia przed kolejną wersją. */
  obowiazujeOd: DataISO;
  opis: string;
  /** Akt prawny, z którego pochodzą wartości. */
  zrodlo: string;
  /** Podstawa prawna pojedynczych parametrów: ścieżka → przepis, np. 'stawkiProc.rodzicielski' → 'UZ art. 31 ust. 2'. */
  przepisy?: Record<string, string>;
  stawkiProc: {
    macierzynski: number; // 100
    rodzicielski: number; // 70
    wariant815: number; // 81.5
    ojcowski: number; // 100
    uzupelniajacy: number; // 100
    chorobowyCiaza: number; // 100
    rehabilitacyjneCiaza: number; // 100
  };
  wymiaryTyg: {
    /** Indeks = liczba dzieci − 1, ostatni dla 5 i więcej: [20, 31, 33, 35, 37]. */
    macierzynski: number[];
    macierzynskiPrzedPorodemMax: number; // 6
    obowiazkoweMatki: number; // 14
    obowiazkoweMatkiSzczegolne: number; // 8
    martweUrodzenie: number; // 8
    dniPoZgonieDziecka: number; // 7
    rodzicielski1: number; // 41
    rodzicielskiWiecej: number; // 43
    rodzicielskiZaZyciem1: number; // 65
    rodzicielskiZaZyciemWiecej: number; // 67
    rodzicielskiNieprzenoszalne: number; // 9
    rodzicielskiMaxZPraca: { jedno: number; wiecej: number; zaZyciemJedno: number; zaZyciemWiecej: number }; // 82/86/130/134
    ojcowski: number; // 2
    uzupelniajacyGranicaTyg: { ponizej28LubDo1000g: number; od28Do37: number; od37: number }; // 15 / 8 / 8
    /** Przyjęcie starszego dziecka [KP art. 183 § 3, § 4²] – do sprawdzenia w przepisie: 9 / 38 / 62. */
    przyjecieStarszegoDziecka: { naWarunkachMacierzynskiego: number; rodzicielski: number; rodzicielskiZaZyciem: number };
  };
  limity: {
    rodzicielskiMaxCzesci: number; // 5
    ojcowskiMaxCzesci: number; // 2
    ojcowskiMinDniCzesci: number; // 7
    ojcowskiDoMiesiecyZycia: number; // 12
    rodzicielskiDoRokuZycia: number; // 6 (koniec roku kalendarzowego)
    maxWymiarPracyPrzyLaczeniu: number; // 0.5
    okresZasilkowyCiazaDni: number; // 270
    wynagrodzenieChoroboweDni: number; // 33
    wynagrodzenieChoroboweDni50Plus: number; // 14
    wyczekiwanieObowiazkoweDni: number; // 30
    wyczekiwanieDobrowolneDni: number; // 90
    wiekPrzysposobienieLat: number; // 14
    wiekRodzinaZastepczaLat: number; // 7
    wiekRodzinaZastepczaOdroczenieLat: number; // 10
    progUbezpieczonychPlatnika: number; // 20
    /** Zaległość składkowa powyżej tylu procent płacy minimalnej wstrzymuje wypłatę zasiłku (1). */
    progZaleglosciProcPlacyMinimalnej: number;
    /** Tyle miesięcy na spłatę zaległości, żeby zasiłek przysługiwał za cały okres (6). */
    splataZaleglosciMiesiecy: number;
    /** Sygnał ryzyka „zgłoszenie tuż przed porodem”: mniej niż tyle dni chorobowego przed porodem. */
    ostrzezeniePozneZgloszenieDni: number;
    /** Początek ciąży = przewidywana data porodu minus tyle dni (280). Tymczasowo, pytanie 13. */
    ciazaDni: number;
    /** Umowa kończąca się po tym miesiącu ciąży przedłuża się do porodu (3) [KP art. 177 § 3]. */
    przedluzenieUmowyPoMiesiacuCiazy: number;
    /** Długość miesiąca ciąży w dniach (28 – miesiąc księżycowy, Zielona Linia gov.pl). Pytanie 13. */
    miesiacCiazyDni: number;
    /** Najdłuższa przerwa między okresami ubezpieczenia, które sumuje się do okresu wyczekiwania (30) [UZ art. 4 ust. 2]. */
    wyczekiwaniePrzerwaMaxDni: number;
    /** Ryzyko „umowa dla pozoru”: tytuł zaczęty w ciąży albo do tylu miesięcy przed nią (3). Pytanie 26. */
    ryzykoUmowaPrzedCiazaMies: number;
    /** Ryzyko „podwyższenie podstawy w ciąży”: wzrost średniej o co najmniej tyle procent (20). Pytanie 27. */
    ryzykoPodwyzkaProc: number;
    /** Ryzyko terminowe jest „pilne”, gdy do terminu zostało nie więcej niż tyle dni (30). */
    ryzykoTerminPilneDni: number;
    /** Progi urlopu uzupełniającego [KP art. 180² § 1]. */
    uzupelniajacy: {
      tydzienCiazyWczesniak: number; // 28
      tydzienCiazyDonoszone: number; // 37
      masaGWczesniak: number; // 1000
      donoszoneOdDniaZycia: number; // 5
      donoszonePierwszyDzienDo: number; // 28
      donoszoneMinKolejnychDni: number; // 2
    };
  };
  terminyDni: {
    wniosek815PoPorodzie: number; // 21
    wniosekRodzicielskiPrzed: number; // 21
    wniosekOjcowskiPrzed: number; // 7
    rezygnacjaMatkiPrzed: number; // 7
    przejecieOjcaPrzed: number; // 14
    wniosekUzupelniajacyPrzedKoncem: number; // 21
    wniosekLaczeniePrzed: number; // 21
    /** Wniosek o urlop na warunkach urlopu macierzyńskiego: w ciągu tylu dni od przyjęcia dziecka (7) [KP art. 183 § 6]. */
    wniosekNaWarunkachMacierzynskiegoPo: number;
  };
  kwoty: {
    placaMinimalna: number;
    /** 13.71 – część składek finansowana przez ubezpieczonego. */
    skladkiPracownikaProc: number;
    swiadczenieRodzicielskie: number; // 1000
    maxPodstawaSkladkiDobrowolne: number;
    najnizszaPodstawaDzialalnosc: number;
    /** Składki preferencyjne: podstawa jako procent płacy minimalnej (30). */
    podstawaPreferencyjnaProcPlacyMinimalnej: number;
    dniWMiesiacuDoStawkiDziennej: number; // 30
  };
  /** Do szacunku „na rękę” i do podwyższenia zasiłku (porównanie po zaliczce na podatek). */
  podatek: {
    zaliczkaProc: number;
    kwotaZmniejszajacaMiesiecznie: number;
  };
}

// ───────────────────────── REST API ─────────────────────────
// Każda odpowiedź błędu: { blad: string } ze statusem 4xx/5xx.

export interface ZapytanieRodzina {
  rodzina: Rodzina;
}
export interface ZapytaniePlan {
  rodzina: Rodzina;
  plan: Plan;
}
export interface ZapytanieAkcja {
  rodzina: Rodzina;
  plan: Plan;
  akcja: AkcjaPlanu;
}
/** POST /api/plan/shift – „dziecko się urodziło”: `rodzina` ma już nową datę zdarzenia. */
export interface ZapytaniePrzesuniecie {
  rodzina: Rodzina;
  plan: Plan;
  poprzedniaData: DataISO;
}
export interface OdpowiedzPlanDomyslny {
  /** Plan domyślny i gotowe scenariusze („mama cały urlop”, „po równo”, „tata po 14 tygodniach” …). */
  plany: Plan[];
}
export interface OdpowiedzAkcja {
  plan: Plan;
  walidacja: WynikWalidacji;
}

// ───────────────────────── ZuSik – czat „Zapytaj o swój plan” (funkcja z AI) ─────────────────────────

/** Jedna wcześniejsza wymiana w rozmowie (tylko tekst – rozmowa żyje w przeglądarce). */
export interface WymianaCzatu {
  pytanie: string;
  odpowiedz: string;
}

/** POST /api/chat */
export interface ZapytanieCzatu {
  /** null – rodzic nie wypełnił jeszcze ankiety; ZuSik mówi wtedy o aplikacji i odsyła do ankiety. */
  rodzina: Rodzina | null;
  /** null – brak planu; bez planu nie ma „co jeśli”. */
  plan: Plan | null;
  pytanie: string;
  historia?: WymianaCzatu[];
}

/** „Co jeśli”: zmiana planu policzona przez silnik. Plan rodzica zmienia się dopiero, gdy kliknie „Zastosuj”. */
export interface PropozycjaPlanu {
  akcja: AkcjaPlanu;
  plan: Plan;
  walidacja: WynikWalidacji;
  /** null, gdy kalkulator nie policzył kwot dla nowego planu. */
  kwoty: WynikKwot | null;
}

/**
 * Kod odpowiedzi czatu (UI i testy opierają się na kodzie):
 *  - ODPOWIEDZ – odpowiedź oparta na wyniku silnika;
 *  - ODESLANO_DO_ZUS – pytanie spoza danych aplikacji, pokaż „Zapytaj ZUS”;
 *  - NIEZWERYFIKOWANA – model podał kwotę albo przepis, których nie ma w wyniku silnika; odpowiedź odrzucona;
 *  - ODMOWA_MODELU – model odmówił odpowiedzi;
 *  - ZA_DUZO_KROKOW – model nie skończył w limicie kroków.
 */
export type KodOdpowiedziCzatu = 'ODPOWIEDZ' | 'ODESLANO_DO_ZUS' | 'NIEZWERYFIKOWANA' | 'ODMOWA_MODELU' | 'ZA_DUZO_KROKOW';

export interface OdpowiedzCzatu {
  kod: KodOdpowiedziCzatu;
  odpowiedz: string;
  /** Przepisy z wyniku silnika, na które powołuje się odpowiedź, np. 'KP art. 180 § 1'. */
  zrodla: string[];
  propozycja?: PropozycjaPlanu;
  /** Pokaż kontakt „Zapytaj ZUS” (src/content/linki.ts, ZAPYTAJ_ZUS). */
  zapytajZus: boolean;
}

/** GET /api/chat – czy czat działa (jest klucz API). Bez klucza UI nie pokazuje przycisku. */
export interface DostepnoscCzatu {
  dostepny: boolean;
}
