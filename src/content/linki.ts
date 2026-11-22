/**
 * Linki do oficjalnych stron i kontakt „Zapytaj ZUS”. Tor D, zadanie D6.
 *
 * Czyta to tor C:
 *  - stopka z linkami wymaganymi w zadaniu (C1) – `LINKI_STOPKA`;
 *  - link „Zapytaj ZUS” przy wynikach `'warunkowo'` / `DO_POTWIERDZENIA_W_ZUS` (C4) – `ZAPYTAJ_ZUS`;
 *  - trudne sytuacje i inne wsparcie (C7) – `LINKI` po kluczu.
 *
 * Każdy adres otworzyliśmy 21.11.2026 (odpowiedź 200, właściwa treść strony). Opisy są naszymi słowami,
 * nie cytatami ze stron. Gdy strona przekierowuje, zapisujemy adres docelowy.
 * Wymagane adresy: opis zadania ZUS, pkt 3 (przekierowania do zus.pl, gov.pl/web/rodzina/urlop-rodzicielski,
 * pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo oraz symulacja odpisu aktu z rejestru stanu cywilnego).
 */

/** Dzień, w którym sprawdziliśmy adresy, kontakt i kwoty w `src/content/`. */
export const SPRAWDZONO = '2026-11-21';

export type Wydawca = 'ZUS' | 'MRPiPS' | 'PIP' | 'Ministerstwo Cyfryzacji' | 'gov.pl';

export interface Link {
  /** Tekst linku dla rodzica. */
  nazwa: string;
  url: string;
  /** Jedno zdanie: co tam znajdziesz. */
  opis: string;
  wydawca: Wydawca;
  sprawdzono: string;
}

export const LINKI = {
  // ── Wymagane w opisie zadania ZUS (pkt 3) ──
  zus: {
    nazwa: 'zus.pl',
    url: 'https://www.zus.pl/',
    opis: 'Oficjalna strona ZUS: zasiłki, wzory wniosków, eZUS i kontakt.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  urlopRodzicielskiGov: {
    nazwa: 'Urlopy dla rodziców – Ministerstwo Rodziny, Pracy i Polityki Społecznej',
    url: 'https://www.gov.pl/web/rodzina/urlop-rodzicielski',
    opis: 'Ministerstwo wyjaśnia urlopy związane z rodzicielstwem: macierzyński, rodzicielski, ojcowski.',
    wydawca: 'MRPiPS',
    sprawdzono: SPRAWDZONO,
  },
  pipRodzicielstwo: {
    nazwa: 'Rodzicielstwo – porady prawne Państwowej Inspekcji Pracy',
    url: 'https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo',
    opis: 'Prawa pracownika-rodzica i obowiązki pracodawcy, opisane przez inspekcję pracy.',
    wydawca: 'PIP',
    sprawdzono: SPRAWDZONO,
  },
  rejestrStanuCywilnego: {
    nazwa: 'Rejestr stanu cywilnego',
    url: 'https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego',
    opis: 'Co można załatwić przez internet w rejestrze stanu cywilnego, np. odpis aktu urodzenia dziecka.',
    wydawca: 'Ministerstwo Cyfryzacji',
    sprawdzono: SPRAWDZONO,
  },

  // ── Akt urodzenia (USC) ──
  odpisAktuStanuCywilnego: {
    nazwa: 'Uzyskaj odpis aktu stanu cywilnego',
    url: 'https://www.gov.pl/web/gov/uzyskaj-odpis-aktu-stanu-cywilnego-urodzenia-malzenstwa-zgonu',
    opis: 'Wniosek o odpis zupełny albo skrócony aktu urodzenia – przez internet albo w urzędzie.',
    wydawca: 'gov.pl',
    sprawdzono: SPRAWDZONO,
  },
  zglosUrodzenie: {
    nazwa: 'Zgłoś urodzenie dziecka',
    url: 'https://www.gov.pl/web/gov/zglos-urodzenie-dziecka',
    opis: 'Jak zgłosić urodzenie w USC, także gdy dziecko urodziło się martwe.',
    wydawca: 'gov.pl',
    sprawdzono: SPRAWDZONO,
  },

  // ── ZUS: zasiłki ──
  zusZasilekMacierzynski: {
    nazwa: 'Zasiłek macierzyński na zus.pl',
    url: 'https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski',
    opis: 'Komu przysługuje zasiłek macierzyński, ile wynosi i jak go dostać.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusZasilekMacierzynskiOkres: {
    nazwa: 'Jak długo przysługuje zasiłek macierzyński',
    url: 'https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski/prawo-do-zasilku-i-okres-przyslugiwania/za-okres-urlopu-macierzynskiego-albo-urlopu-na-warunkach-urlopu-macierzynskiego',
    opis: 'Okres zasiłku, także gdy dziecko umrze albo gdy mama zachoruje lub umrze.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusZasilekMacierzynskiDokumenty: {
    nazwa: 'Dokumenty do zasiłku macierzyńskiego',
    url: 'https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski/niezbedne-dokumenty',
    opis: 'Jakie dokumenty są potrzebne w różnych sytuacjach, także po martwym urodzeniu.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusUzupelniajacy: {
    nazwa: 'Zasiłek za okres uzupełniającego urlopu macierzyńskiego',
    url: 'https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski/prawo-do-zasilku-i-okres-przyslugiwania/za-okres-uzupelniajacego-urlopu-macierzynskiego',
    opis: 'Dodatkowe tygodnie, gdy wcześniak albo noworodek długo przebywa w szpitalu.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusZasilekChorobowy: {
    nazwa: 'Zasiłek chorobowy na zus.pl',
    url: 'https://www.zus.pl/swiadczenia/zasilki/zasilek-chorobowy',
    opis: 'Zasiłek na czas zwolnienia lekarskiego, także w ciąży.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusZasilekPogrzebowy: {
    nazwa: 'Zasiłek pogrzebowy na zus.pl',
    url: 'https://www.zus.pl/swiadczenia/zasilki/zasilek-pogrzebowy',
    opis: 'Komu ZUS wypłaca zasiłek pogrzebowy, w jakiej wysokości i jakie dokumenty są potrzebne.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusRentaRodzinna: {
    nazwa: 'Renta rodzinna na zus.pl',
    url: 'https://www.zus.pl/swiadczenia/renty/renta-rodzinna',
    opis: 'Kiedy dziecko może dostać rentę po zmarłym rodzicu.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusMartweUrodzenieDokumenty: {
    nazwa: 'ZUS: dokumenty, gdy dziecko urodzi się martwe',
    url: 'https://www.zus.pl/-/nowe-zasady-sk%C5%82adania-dokument%C3%B3w-gdy-dziecko-urodzi-si%C4%99-martwe',
    opis: 'Od 6 sierpnia 2025 r. do zasiłku wystarczy zaświadczenie lekarza albo położnej o martwym urodzeniu.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  govStrataCiazy: {
    nazwa: 'Łatwiejszy dostęp do świadczeń po stracie ciąży',
    url: 'https://www.gov.pl/web/rodzina/latwiejszy-dostep-do-swiadczen-po-stracie-ciazy',
    opis: 'Ministerstwo wyjaśnia urlop, zasiłek i zasiłek pogrzebowy po stracie ciąży, w każdym jej tygodniu.',
    wydawca: 'MRPiPS',
    sprawdzono: SPRAWDZONO,
  },
  zusDlaRodzicow: {
    nazwa: 'ZUS dla przyszłych mam i rodziców',
    url: 'https://www.zus.pl/-/zus-dla-przysz%C5%82ych-mam-i-rodzic%C3%B3w',
    opis: 'Poradnik ZUS dla rodziców i skrzynka mama@zus.pl na pytania w indywidualnych sprawach.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },

  // ── Formularze i kontakt ──
  zusFormularzeZasilki: {
    nazwa: 'Wzory formularzy – zasiłki',
    url: 'https://www.zus.pl/wzory-formularzy/zasilki',
    opis: 'Wszystkie wzory wniosków i zaświadczeń zasiłkowych ZUS do pobrania.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  ezusLogowanie: {
    nazwa: 'Zaloguj się do eZUS',
    url: 'https://www.zus.pl/ezus/logowanie?jezyk=pl',
    opis: 'Konto w ZUS: wnioski, dane o ubezpieczeniu i wiadomości od ZUS.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusZadajPytanie: {
    nazwa: 'Zadaj pytanie ZUS',
    url: 'https://www.zus.pl/o-zus/kontakt/zadaj-pytanie-zus',
    opis: 'Formularz pytania ogólnego; pytanie o własną sprawę można zadać po zalogowaniu do eZUS.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusEwizyta: {
    nazwa: 'E-wizyta w ZUS',
    url: 'https://www.zus.pl/e-wizyta',
    opis: 'Rozmowa wideo z pracownikiem ZUS w umówionym terminie.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusKontaktCKK: {
    nazwa: 'Centrum Kontaktu Klientów ZUS',
    url: 'https://www.zus.pl/o-zus/kontakt/centrum-kontaktu-klient%C3%B3w-ckk-',
    opis: 'Infolinia ZUS, godziny pracy konsultantów i adres e-mail do pytań ogólnych.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },

  // ── Inne wsparcie (gmina, gov.pl) ──
  govBecikowe: {
    nazwa: 'Uzyskaj becikowe',
    url: 'https://www.gov.pl/web/gov/uzyskaj-becikowe',
    opis: 'Warunki, termin i sposób złożenia wniosku o becikowe.',
    wydawca: 'gov.pl',
    sprawdzono: SPRAWDZONO,
  },
  govSwiadczenieRodzicielskie: {
    nazwa: 'Uzyskaj świadczenie rodzicielskie',
    url: 'https://www.gov.pl/web/gov/uzyskaj-swiadczenie-rodzicielskie',
    opis: 'Świadczenie z gminy dla rodziców, którzy nie dostają zasiłku macierzyńskiego.',
    wydawca: 'gov.pl',
    sprawdzono: SPRAWDZONO,
  },
  govSwiadczenieZaZyciem: {
    nazwa: 'Jednorazowe świadczenie 4000 zł („Za życiem”)',
    url: 'https://www.gov.pl/web/gov/uzyskaj-jednorazowe-swiadczenie-w-wysokosci-4000-zl',
    opis: 'Świadczenie z gminy, gdy dziecko urodzi się ciężko i nieodwracalnie chore.',
    wydawca: 'gov.pl',
    sprawdzono: SPRAWDZONO,
  },
  zus800plus: {
    nazwa: 'Świadczenie wychowawcze 800+ na zus.pl',
    url: 'https://www.zus.pl/swiadczenia/swiadczenia-dla-rodzin/swiadczenie-wychowawcze-800-plus',
    opis: 'Kto może dostać 800+, kiedy złożyć wniosek i jak liczy się pierwszy miesiąc.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusAktywnyRodzic: {
    nazwa: 'Program Aktywny Rodzic na zus.pl',
    url: 'https://www.zus.pl/aktywnyrodzic',
    opis: 'Trzy świadczenia dla rodziców dzieci w wieku od 12 do 35 miesięcy.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusAktywniRodziceWPracy: {
    nazwa: 'Aktywni rodzice w pracy',
    url: 'https://www.zus.pl/aktywnyrodzic/swiadczenie-aktywni-rodzice-w-pracy',
    opis: 'Świadczenie, gdy oboje rodzice pracują, a dziecko nie chodzi do żłobka.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusAktywnieWZlobku: {
    nazwa: 'Aktywnie w żłobku',
    url: 'https://www.zus.pl/aktywnyrodzic/wiadczenie-aktywnie-w-zlobku',
    opis: 'Dopłata do opłaty za żłobek, klub dziecięcy albo dziennego opiekuna.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
  zusAktywnieWDomu: {
    nazwa: 'Aktywnie w domu',
    url: 'https://www.zus.pl/aktywnyrodzic/wiadczenie-aktywnie-w-domu',
    opis: 'Świadczenie, gdy rodzic opiekuje się dzieckiem w domu.',
    wydawca: 'ZUS',
    sprawdzono: SPRAWDZONO,
  },
} as const satisfies Record<string, Link>;

export type KluczLinku = keyof typeof LINKI;

/** Adresy, które opis zadania ZUS (pkt 3) każe pokazać rodzicowi. */
export const LINKI_WYMAGANE_W_ZADANIU: readonly KluczLinku[] = [
  'zus',
  'urlopRodzicielskiGov',
  'pipRodzicielstwo',
  'rejestrStanuCywilnego',
];

/** Stopka każdej strony (ZADANIA.md, C1). */
export const LINKI_STOPKA: readonly KluczLinku[] = ['zus', 'urlopRodzicielskiGov', 'pipRodzicielstwo'];

// ───────────────────────── Formularze zasiłkowe na zus.pl ─────────────────────────

export type SymbolFormularza = 'ZAM' | 'Z-3' | 'Z-3a' | 'ZAS-53' | 'ZAS-12' | 'ZAS-55' | 'ZAS-26' | 'Z-12';

export interface FormularzZasilkowy {
  symbol: SymbolFormularza;
  /** Pełna nazwa jak na zus.pl. */
  nazwa: string;
  /** Kto wypełnia: Ty (ubezpieczony) czy płatnik (pracodawca, zleceniodawca). */
  ktoWypelnia: 'ubezpieczony' | 'platnik';
  /** Po co i kiedy – prostym językiem. */
  opis: string;
  /**
   * Strona kategorii na zus.pl, na której jest wzór. Linkujemy do kategorii, bo adresy samych plików
   * zawierają parametry systemu, które się zmieniają.
   */
  url: string;
  /** Data aktualizacji formularza podana na zus.pl. */
  aktualizacja: string;
  zrodlo: string;
  sprawdzono: string;
}

const WZORY_MACIERZYNSKI = 'https://www.zus.pl/wzory-formularzy/zasilki/zasilek-macierzynski';
const WZORY_CHOROBOWY = 'https://www.zus.pl/wzory-formularzy/zasilki/zasilek-chorobowy';
const WZORY_PLATNIK = 'https://www.zus.pl/wzory-formularzy/zasilki/formularze-dla-pracodawcy';
const WZORY_POGRZEBOWY = 'https://www.zus.pl/wzory-formularzy/zasilki/zasilek-pogrzebowy';

export const FORMULARZE_ZASILKOWE: readonly FormularzZasilkowy[] = [
  {
    symbol: 'ZAM',
    nazwa: 'Wniosek o zasiłek macierzyński',
    ktoWypelnia: 'ubezpieczony',
    opis: 'Jeden wniosek o zasiłek za wszystkie okresy urlopów. Od 24 października 2026 r. zastępuje dawne ZUR i ZAO.',
    url: WZORY_MACIERZYNSKI,
    aktualizacja: '2026-10-24',
    zrodlo: WZORY_MACIERZYNSKI,
    sprawdzono: SPRAWDZONO,
  },
  {
    symbol: 'Z-3',
    nazwa: 'Zaświadczenie płatnika składek (dotyczące pracowników)',
    ktoWypelnia: 'platnik',
    opis: 'Wypełnia pracodawca, gdy zasiłek wypłaca ZUS. Ubezpieczony go nie wypełnia.',
    url: WZORY_PLATNIK,
    aktualizacja: '2026-10-24',
    zrodlo: WZORY_PLATNIK,
    sprawdzono: SPRAWDZONO,
  },
  {
    symbol: 'Z-3a',
    nazwa: 'Zaświadczenie płatnika składek',
    ktoWypelnia: 'platnik',
    opis: 'Wypełnia płatnik, np. zleceniodawca, przy innej umowie niż umowa o pracę.',
    url: WZORY_PLATNIK,
    aktualizacja: '2026-10-24',
    zrodlo: WZORY_PLATNIK,
    sprawdzono: SPRAWDZONO,
  },
  {
    symbol: 'ZAS-53',
    nazwa: 'Wniosek o zasiłek chorobowy',
    ktoWypelnia: 'ubezpieczony',
    opis: 'Wniosek o zasiłek chorobowy, np. przy prowadzeniu działalności (opis zadania ZUS, pkt 2).',
    url: WZORY_CHOROBOWY,
    aktualizacja: '2026-10-24',
    zrodlo: WZORY_CHOROBOWY,
    sprawdzono: SPRAWDZONO,
  },
  {
    symbol: 'ZAS-12',
    nazwa: 'Zaświadczenie płatnika składek – zasiłek chorobowy lub opiekuńczy za dalszy okres',
    ktoWypelnia: 'platnik',
    opis: 'Wypełnia pracodawca, gdy zwolnienie trwa dalej, a zasiłek wypłaca ZUS.',
    url: WZORY_CHOROBOWY,
    aktualizacja: '2026-10-26',
    zrodlo: WZORY_CHOROBOWY,
    sprawdzono: SPRAWDZONO,
  },
  {
    symbol: 'ZAS-55',
    nazwa: 'Wniosek o zasiłek w wysokości zasiłku macierzyńskiego i zasiłek wyrównawczy',
    ktoWypelnia: 'ubezpieczony',
    opis: 'Gdy zatrudnienie ustało w czasie ciąży z powodu upadłości, likwidacji albo śmierci pracodawcy.',
    url: WZORY_MACIERZYNSKI,
    aktualizacja: '2025-01-01',
    zrodlo: WZORY_MACIERZYNSKI,
    sprawdzono: SPRAWDZONO,
  },
  {
    symbol: 'ZAS-26',
    nazwa: 'Oświadczenie o przyjęciu na wychowanie dziecka do ustalenia prawa do zasiłku macierzyńskiego',
    ktoWypelnia: 'ubezpieczony',
    opis: 'Przy przyjęciu dziecka na wychowanie (przysposobienie albo rodzina zastępcza).',
    url: WZORY_MACIERZYNSKI,
    aktualizacja: '2025-01-01',
    zrodlo: WZORY_MACIERZYNSKI,
    sprawdzono: SPRAWDZONO,
  },
  {
    symbol: 'Z-12',
    nazwa: 'Wniosek o zasiłek pogrzebowy',
    ktoWypelnia: 'ubezpieczony',
    opis: 'Gdy pokrywa się koszty pogrzebu bliskiej osoby, także dziecka.',
    url: WZORY_POGRZEBOWY,
    aktualizacja: '2026-03-27',
    zrodlo: WZORY_POGRZEBOWY,
    sprawdzono: SPRAWDZONO,
  },
];

// ───────────────────────── „Zapytaj ZUS” ─────────────────────────

export interface KanalKontaktu {
  rodzaj: 'email' | 'telefon' | 'ezus' | 'wideo' | 'formularz';
  nazwa: string;
  /** Adres e-mail, numer telefonu albo adres strony. */
  wartosc: string;
  /** Link do otwarcia (mailto:, tel: albo https://). */
  href: string;
  opis: string;
  /** Godziny pracy, gdy strona ZUS je podaje. */
  godziny?: string;
  /** Strona zus.pl, na której to potwierdziliśmy. */
  zrodlo: string;
  sprawdzono: string;
}

export interface KontaktZus {
  tytul: string;
  /** Kiedy pokazać: przy wynikach, których silnik nie rozstrzyga. */
  opis: string;
  kanaly: KanalKontaktu[];
  /** Uwaga o bezpieczeństwie danych, za stroną CKK. */
  uwaga: string;
  zrodlo: string;
  sprawdzono: string;
}

const ZRODLO_MAMA = LINKI.zusDlaRodzicow.url;
const ZRODLO_CKK = LINKI.zusKontaktCKK.url;

/**
 * Kontakt dla przyszłych rodziców. Potwierdzone na zus.pl 21.11.2026:
 *  - mama@zus.pl: skrzynka uruchomiona w marcu 2026 r. na pytania rodziców o ich sprawy
 *    (artykuł „ZUS dla przyszłych mam i rodziców”, 26 maja 2026 r.);
 *  - infolinia 22 560 16 00, konsultanci pon.–pt. 7.00–18.00 (strona CKK, stan z 28 sierpnia 2026 r.);
 *  - cot@zus.pl tylko do pytań ogólnych; o swoją sprawę pytasz w eZUS („Zadaj pytanie ZUS”).
 * ZUS nie podaje adresu pocztowego specjalnie dla rodziców, więc go tu nie ma.
 */
export const ZAPYTAJ_ZUS: KontaktZus = {
  tytul: 'Zapytaj ZUS',
  opis:
    'Tego wyniku nie da się ustalić bez ZUS. Proszę napisać albo zadzwonić, podać, czego dotyczy pytanie, i poprosić o odpowiedź w swojej sprawie.',
  kanaly: [
    {
      rodzaj: 'email',
      nazwa: 'Skrzynka dla rodziców',
      wartosc: 'mama@zus.pl',
      href: 'mailto:mama@zus.pl',
      opis: 'Skrzynka ZUS dla przyszłych i obecnych rodziców. Można pytać o własną sytuację i formalności.',
      zrodlo: ZRODLO_MAMA,
      sprawdzono: SPRAWDZONO,
    },
    {
      rodzaj: 'telefon',
      nazwa: 'Infolinia ZUS (Centrum Kontaktu Klientów)',
      wartosc: '22 560 16 00',
      href: 'tel:+48225601600',
      opis: 'Koszt połączenia według taryfy operatora. Szczegóły własnej sprawy można poznać po podaniu identyfikatora eZUS i PIN-u.',
      godziny: 'konsultanci: poniedziałek–piątek, 7.00–18.00',
      zrodlo: ZRODLO_CKK,
      sprawdzono: SPRAWDZONO,
    },
    {
      rodzaj: 'ezus',
      nazwa: 'Pytanie w eZUS',
      wartosc: LINKI.ezusLogowanie.url,
      href: LINKI.ezusLogowanie.url,
      opis: 'Po zalogowaniu proszę wybrać „Zadaj pytanie ZUS”. Odpowiedź pojawi się na koncie.',
      zrodlo: ZRODLO_CKK,
      sprawdzono: SPRAWDZONO,
    },
    {
      rodzaj: 'wideo',
      nazwa: 'E-wizyta',
      wartosc: LINKI.zusEwizyta.url,
      href: LINKI.zusEwizyta.url,
      opis: 'Umówiona rozmowa wideo z pracownikiem ZUS.',
      zrodlo: ZRODLO_MAMA,
      sprawdzono: SPRAWDZONO,
    },
    {
      rodzaj: 'email',
      nazwa: 'Pytania ogólne',
      wartosc: 'cot@zus.pl',
      href: 'mailto:cot@zus.pl',
      opis: 'Adres do pytań ogólnych, bez danych z konta w ZUS.',
      zrodlo: ZRODLO_CKK,
      sprawdzono: SPRAWDZONO,
    },
  ],
  uwaga:
    'ZUS uprzedza, że zwykły e-mail nie chroni danych. Proszę nie wysyłać w nim więcej danych osobowych, niż to konieczne. Pytanie o szczegóły swojego konta najlepiej zadać w eZUS.',
  zrodlo: ZRODLO_CKK,
  sprawdzono: SPRAWDZONO,
};

/** Wszystkie adresy z tego pliku – do testów i do listy źródeł. */
export function wszystkieAdresy(): string[] {
  return [
    ...Object.values(LINKI).map((l) => l.url),
    ...FORMULARZE_ZASILKOWE.flatMap((f) => [f.url, f.zrodlo]),
    ZAPYTAJ_ZUS.zrodlo,
    ...ZAPYTAJ_ZUS.kanaly.flatMap((k) => [k.zrodlo, ...(k.href.startsWith('http') ? [k.href] : [])]),
  ];
}
