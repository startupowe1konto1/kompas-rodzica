/**
 * Trudne sytuacje (brief 4.8, opis zadania ZUS pkt 3 i). Tor D, zadanie D6. Czyta to tor C (C7).
 *
 * Każda pozycja mówi: co przysługuje (z przepisem), co zrobić najpierw i jakie dokumenty przygotować.
 * Źródła prawa: materialy/ZUS/tekst/*.txt (KP, UZ, rozp. Dz.U. 2026 poz. 1316 – „ROZP”,
 * rozp. Dz.U. 2025 poz. 322 – wnioski do pracodawcy) oraz strony zus.pl i gov.pl z `linki.ts`.
 * Gdy przepis nie rozstrzyga sprawy, wpis ma `doPotwierdzeniaWZus` (kod `DO_POTWIERDZENIA_W_ZUS`)
 * zamiast zgadniętej odpowiedzi.
 *
 * Kody sytuacji a dane silnika (`src/engine/types.ts`):
 *  - `martwe`        – `Dziecko.martwe`;
 *  - `poronienie`    – w kontrakcie nie ma osobnego pola; prawnie to ta sama ścieżka co `martwe`
 *                      (KP art. 180¹ § 1, ROZP § 13 ust. 1 pkt 2: „bez względu na czas trwania ciąży”);
 *  - `zgon_dziecka`  – `Dziecko.zgon`;
 *  - `wczesniak`     – `Dziecko.tydzienCiazy`, `Dziecko.masaG`, `Dziecko.szpital` (urlop uzupełniający);
 *  - `za_zyciem`     – `Dziecko.zaZyciem`;
 *  - `choroba_matki` – `Zdrowie.pobytWSzpitalu`, `Zdrowie.orzeczenieNiezdolnosciSamodzielnejEgzystencji`,
 *                      `Zdrowie.eZLA` z `kodB` osoby o roli `matka`;
 *  - `smierc_matki`  – `Zdrowie.zgon` osoby o roli `matka`.
 *
 * Język: forma bezosobowa albo „Pani/Pan” (jak na zus.pl), spokojnie, bez urzędowych zwrotów. Teksty są naszymi słowami, nie cytatami.
 */
import { type KluczLinku, LINKI, SPRAWDZONO } from './linki';

export type KodSytuacji =
  | 'martwe'
  | 'poronienie'
  | 'zgon_dziecka'
  | 'wczesniak'
  | 'za_zyciem'
  | 'choroba_matki'
  | 'smierc_matki';

export const KODY_SYTUACJI: readonly KodSytuacji[] = [
  'martwe',
  'poronienie',
  'zgon_dziecka',
  'wczesniak',
  'za_zyciem',
  'choroba_matki',
  'smierc_matki',
];

/** Ten sam kod co w komunikatach silnika – UI pokazuje przy nim link „Zapytaj ZUS”. */
export const KOD_DO_POTWIERDZENIA = 'DO_POTWIERDZENIA_W_ZUS' as const;

export interface DoPotwierdzenia {
  kod: typeof KOD_DO_POTWIERDZENIA;
  /** Pytanie prostym językiem, tak jak zadamy je w ZUS. */
  pytanie: string;
  /** Przepisy, które czytaliśmy i które sprawy nie rozstrzygają. */
  przepisy: string[];
  /** Numer w docs/pytania-do-mentora.md, gdy pytanie już tam jest. */
  numerPytania?: number;
}

export interface Uprawnienie {
  tekst: string;
  /** Np. 'KP art. 180¹ § 1'. Pusta lista tylko wtedy, gdy podajemy `zrodlo` (strona oficjalna). */
  przepisy: string[];
  zrodlo?: string;
}

export interface DokumentSytuacji {
  nazwa: string;
  /** Kiedy jest potrzebny. */
  kiedy?: string;
  przepis?: string;
  /** true = przepis nie mówi tego wprost; zapytaj płatnika albo ZUS. */
  doPotwierdzenia?: boolean;
}

export interface TrudnaSytuacja {
  id: KodSytuacji;
  /** Kody do łączenia z wynikami silnika; pierwszy to `id`. */
  kodySytuacji: KodSytuacji[];
  tytul: string;
  /** Pierwsze, ciepłe zdania. */
  wstep: string;
  coPrzysluguje: Uprawnienie[];
  coZrobicNajpierw: string[];
  dokumenty: DokumentSytuacji[];
  doPotwierdzeniaWZus: DoPotwierdzenia[];
  linki: KluczLinku[];
  sprawdzono: string;
}

const PYTANIE_RODZICIELSKI_PO_STRACIE: DoPotwierdzenia = {
  kod: KOD_DO_POTWIERDZENIA,
  pytanie:
    'Czy po martwym urodzeniu (także po poronieniu) przysługuje urlop rodzicielski i urlop ojcowski oraz zasiłek za te okresy? Przepisy mówią wprost tylko o 8 tygodniach urlopu macierzyńskiego.',
  przepisy: ['KP art. 180¹ § 1', 'KP art. 182¹a § 1', 'KP art. 182³ § 1'],
  numerPytania: 8,
};

const PYTANIE_STAWKA_PRZEJECIA: DoPotwierdzenia = {
  kod: KOD_DO_POTWIERDZENIA,
  pytanie:
    'Ile wynosi zasiłek taty albo innego członka rodziny, który przejmuje część urlopu macierzyńskiego – zwłaszcza gdy mama wybrała wcześniej wariant 81,5%?',
  przepisy: ['UZ art. 29 ust. 6–7', 'UZ art. 31 ust. 1 i 3'],
  numerPytania: 5,
};

const ZASILEK_POGRZEBOWY: Uprawnienie = {
  tekst:
    'Osoba, która pokrywa koszty pogrzebu, może otrzymać z ZUS zasiłek pogrzebowy. Członek rodziny otrzymuje 7000 zł, niezależnie od kosztów. Warunki są opisane na stronie ZUS.',
  przepisy: [],
  zrodlo: LINKI.zusZasilekPogrzebowy.url,
};

const PRZEKAZ_PLATNIKOWI =
  'Dokument trzeba przekazać płatnikowi (pracodawcy) albo do ZUS – zależnie od tego, kto wypłaca zasiłek. Podpowiadamy to w części „Dokumenty”. W tych sprawach może pomóc bliska osoba.';

export const TRUDNE_SYTUACJE: readonly TrudnaSytuacja[] = [
  {
    id: 'martwe',
    kodySytuacji: ['martwe'],
    tytul: 'Dziecko urodziło się martwe',
    wstep:
      'Bardzo nam przykro. Poniżej jest tylko to, co ważne w najbliższych dniach. Resztą można zająć się później albo poprosić o pomoc kogoś bliskiego.',
    coPrzysluguje: [
      {
        tekst:
          'Przysługuje urlop macierzyński i zasiłek macierzyński przez 8 tygodni po porodzie. Pracodawca nie może odmówić tego urlopu.',
        przepisy: ['KP art. 180¹ § 1', 'UZ art. 29a ust. 1'],
        zrodlo: LINKI.govStrataCiazy.url,
      },
      {
        tekst:
          'Zasiłek przysługuje, jeśli w dniu porodu trwało ubezpieczenie chorobowe – na tych samych zasadach na etacie, na zleceniu i w działalności.',
        przepisy: ['UZ art. 29 ust. 1'],
        zrodlo: LINKI.zusMartweUrodzenieDokumenty.url,
      },
      {
        tekst:
          'Jeśli przy jednym porodzie urodziło się więcej dzieci, a któreś żyje, urlop i zasiłek liczy się według liczby dzieci żyjących.',
        przepisy: ['KP art. 180¹ § 1'],
      },
      ZASILEK_POGRZEBOWY,
    ],
    coZrobicNajpierw: [
      'Proszę poprosić lekarza ginekologa albo położną o zaświadczenie o martwym urodzeniu. To zaświadczenie wystarczy do urlopu i zasiłku, gdy nie ma aktu urodzenia – bez względu na tydzień ciąży i bez ustalania płci dziecka.',
      'Jeśli lekarz ustalił płeć dziecka, szpital przekaże kartę martwego urodzenia do urzędu stanu cywilnego. Urodzenie trzeba wtedy zgłosić w USC w ciągu 3 dni od jej wystawienia – urząd sporządzi akt urodzenia z adnotacją, że dziecko urodziło się martwe.',
      PRZEKAZ_PLATNIKOWI,
      'Jeśli rodzice chcą pochować dziecko, można złożyć w ZUS wniosek Z-12 o zasiłek pogrzebowy.',
      'Organizacje poniżej wspierają rodziców po stracie dziecka. Można się do nich zwrócić w każdej chwili.',
    ],
    dokumenty: [
      {
        nazwa: 'Odpis skrócony aktu urodzenia z adnotacją, że dziecko urodziło się martwe',
        kiedy: 'gdy USC sporządził akt; gdy zasiłek wypłaca ZUS, odpisu nie trzeba dołączać – ZUS pobierze dane sam',
        przepis: 'ROZP § 13 ust. 1 pkt 2, ust. 2–3',
      },
      {
        nazwa: 'Zaświadczenie lekarza (położnictwo i ginekologia) albo położnej o martwym urodzeniu',
        kiedy: 'gdy nie sporządzono aktu urodzenia',
        przepis: 'ROZP § 13 ust. 1 pkt 2',
      },
      {
        nazwa: 'Wniosek Z-12 o zasiłek pogrzebowy oraz karta zgonu albo zaświadczenie o martwym urodzeniu',
        kiedy: 'przy wniosku o zasiłek pogrzebowy, gdy nie sporządzono aktu urodzenia',
      },
    ],
    doPotwierdzeniaWZus: [PYTANIE_RODZICIELSKI_PO_STRACIE],
    linki: ['zusMartweUrodzenieDokumenty', 'govStrataCiazy', 'zglosUrodzenie', 'zusZasilekPogrzebowy'],
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'poronienie',
    kodySytuacji: ['poronienie', 'martwe'],
    tytul: 'Utrata ciąży',
    wstep:
      'Bardzo nam przykro. Ta strata jest prawdziwa bez względu na to, jak długo trwała ciąża. Przepisy też to uznają: przysługują takie same uprawnienia jak po martwym urodzeniu.',
    coPrzysluguje: [
      {
        tekst:
          'Przysługuje 8 tygodni urlopu macierzyńskiego i zasiłku macierzyńskiego – bez względu na tydzień ciąży. Kodeks pracy nie odróżnia poronienia od martwego urodzenia, a pracodawca nie może odmówić tego urlopu.',
        przepisy: ['KP art. 180¹ § 1', 'ROZP § 13 ust. 1 pkt 2'],
        zrodlo: LINKI.govStrataCiazy.url,
      },
      {
        tekst:
          'Zasiłek przysługuje, jeśli w dniu straty trwało ubezpieczenie chorobowe – na etacie, a na zleceniu i w działalności, gdy opłacane jest dobrowolne ubezpieczenie chorobowe.',
        przepisy: ['UZ art. 29 ust. 1', 'UZ art. 29a ust. 1'],
        zrodlo: LINKI.zusMartweUrodzenieDokumenty.url,
      },
      ZASILEK_POGRZEBOWY,
    ],
    coZrobicNajpierw: [
      'Proszę poprosić lekarza ginekologa albo położną o zaświadczenie o martwym urodzeniu. Wystawią je na podstawie dokumentacji medycznej, bez badań genetycznych i bez ustalania płci.',
      PRZEKAZ_PLATNIKOWI,
      'Jeśli rodzice chcą pochować dziecko, lekarz może na ich wniosek wystawić kartę zgonu. Do zasiłku pogrzebowego wystarczy karta zgonu albo zaświadczenie lekarza lub położnej.',
      'Organizacje poniżej pomagają rodzicom po poronieniu: w szpitalu, przy pochówku i w żałobie.',
    ],
    dokumenty: [
      {
        nazwa: 'Zaświadczenie lekarza (położnictwo i ginekologia) albo położnej o martwym urodzeniu',
        kiedy: 'do urlopu i zasiłku macierzyńskiego, gdy nie sporządzono aktu urodzenia',
        przepis: 'ROZP § 13 ust. 1 pkt 2',
      },
      {
        nazwa: 'Wniosek Z-12 o zasiłek pogrzebowy oraz karta zgonu albo zaświadczenie o martwym urodzeniu',
        kiedy: 'przy wniosku o zasiłek pogrzebowy',
      },
    ],
    doPotwierdzeniaWZus: [PYTANIE_RODZICIELSKI_PO_STRACIE],
    linki: ['govStrataCiazy', 'zusMartweUrodzenieDokumenty', 'zusZasilekPogrzebowy'],
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'zgon_dziecka',
    kodySytuacji: ['zgon_dziecka'],
    tytul: 'Dziecko zmarło',
    wstep:
      'Bardzo nam przykro. Nie trzeba teraz załatwiać wszystkiego w pojedynkę. Zebraliśmy tu tylko to, co dotyczy urlopu i pieniędzy.',
    coPrzysluguje: [
      {
        tekst:
          'Jeśli dziecko zmarło, zanim skończyło 8 tygodni: urlop i zasiłek macierzyński trwają 8 tygodni od porodu, ale nie krócej niż 7 dni od dnia śmierci dziecka.',
        przepisy: ['KP art. 180¹ § 1', 'UZ art. 29a ust. 1'],
        zrodlo: LINKI.zusZasilekMacierzynskiOkres.url,
      },
      {
        tekst: 'Jeśli dziecko zmarło po 8. tygodniu życia: urlop i zasiłek macierzyński przysługują jeszcze przez 7 dni od dnia śmierci.',
        przepisy: ['KP art. 180¹ § 2', 'UZ art. 29a ust. 1'],
        zrodlo: LINKI.zusZasilekMacierzynskiOkres.url,
      },
      {
        tekst:
          'Jeśli przy jednym porodzie urodziło się więcej dzieci, urlop liczy się według liczby dzieci, które żyją – ale nie krócej niż 7 dni od śmierci dziecka.',
        przepisy: ['KP art. 180¹ § 1–2'],
      },
      {
        tekst: 'Jeśli w tym czasie trwał urlop rodzicielski, zasada 7 dni od śmierci dziecka dotyczy też tego urlopu.',
        przepisy: ['KP art. 182¹g (odesłanie do art. 180¹ § 2)', 'UZ art. 29a ust. 1'],
      },
      ZASILEK_POGRZEBOWY,
    ],
    coZrobicNajpierw: [
      'Kiedy będą na to siły, proszę dać znać pracodawcy (płatnikowi) albo do ZUS – wtedy ustalą, do kiedy trwa urlop i zasiłek. Może to zrobić także bliska osoba.',
      'Płatnik albo ZUS podpowie, jakim dokumentem potwierdzić datę śmierci dziecka.',
      'Osoba, która pokrywa koszty pogrzebu, może złożyć w ZUS wniosek Z-12 o zasiłek pogrzebowy.',
      'Organizacje poniżej wspierają rodziców po śmierci dziecka, także w grupach wsparcia.',
    ],
    dokumenty: [
      {
        nazwa: 'Dokument potwierdzający datę śmierci dziecka (np. odpis aktu zgonu)',
        kiedy: 'dla płatnika albo ZUS, żeby ustalić koniec urlopu i zasiłku',
        doPotwierdzenia: true,
      },
      { nazwa: 'Wniosek Z-12 o zasiłek pogrzebowy', kiedy: 'dla osoby, która pokrywa koszty pogrzebu' },
    ],
    doPotwierdzeniaWZus: [
      {
        kod: KOD_DO_POTWIERDZENIA,
        pytanie:
          'Co dzieje się z urlopem ojcowskim (i zasiłkiem za ten okres), który trwa albo był zaplanowany, gdy dziecko umrze? Przepis o urlopie ojcowskim nie odsyła do zasady 7 dni.',
        przepisy: ['KP art. 182³ § 3', 'KP art. 180¹ § 2'],
      },
    ],
    linki: ['zusZasilekMacierzynskiOkres', 'zusZasilekPogrzebowy'],
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'wczesniak',
    kodySytuacji: ['wczesniak'],
    tytul: 'Dziecko urodziło się za wcześnie albo zostaje w szpitalu',
    wstep:
      'To bardzo trudny czas. Przepisy dają tu rodzicom dodatkowe tygodnie, żeby mogli być z dzieckiem także po wyjściu ze szpitala.',
    coPrzysluguje: [
      {
        tekst:
          'Uzupełniający urlop macierzyński: tydzień urlopu i zasiłku (100%) za każdy tydzień pobytu dziecka w szpitalu, zaraz po urlopie macierzyńskim. Pobyty się sumuje, a niepełny tydzień liczy się jako pełny.',
        przepisy: ['KP art. 180² § 1 i 3', 'UZ art. 29a ust. 1', 'UZ art. 31 ust. 1'],
        zrodlo: LINKI.zusUzupelniajacy.url,
      },
      {
        tekst:
          'Które tygodnie się liczą: dziecko urodzone przed 28. tygodniem ciąży albo ważące do 1000 g – pobyt do 15. tygodnia po porodzie; od 28. do 37. tygodnia i ponad 1000 g – do 8. tygodnia; po 37. tygodniu – pobyt od 5. dnia do 8. tygodnia, jeśli trwał co najmniej 2 dni z rzędu i zaczął się między 5. a 28. dniem.',
        przepisy: ['KP art. 180² § 1 pkt 1–3'],
      },
      {
        tekst: 'Przy bliźniętach i więcej dzieciach liczy się najmniejsza masa urodzeniowa i najdłuższy pobyt w szpitalu.',
        przepisy: ['KP art. 180² § 2'],
      },
      {
        tekst: 'Z urlopu uzupełniającego korzysta mama albo tata – jednorazowo.',
        przepisy: ['KP art. 180² § 1 i 4'],
      },
      {
        tekst:
          'Przy umowie o pracę, gdy dziecko wymaga opieki szpitalnej, po 8 tygodniach urlopu macierzyńskiego resztę urlopu można wykorzystać później, po wyjściu dziecka ze szpitala.',
        przepisy: ['KP art. 181'],
      },
      {
        tekst:
          'Gdy rodzic nie ma zasiłku macierzyńskiego, świadczenie rodzicielskie z gminy też wydłuża się o czas pobytu dziecka w szpitalu.',
        przepisy: [],
        zrodlo: LINKI.govSwiadczenieRodzicielskie.url,
      },
    ],
    coZrobicNajpierw: [
      'Warto poprosić szpital o zaświadczenie z datami pobytu dziecka i informacją, w którym tygodniu ciąży się urodziło albo ile ważyło.',
      'Wniosek o urlop uzupełniający trzeba złożyć co najmniej 21 dni przed końcem urlopu macierzyńskiego i wpisać w nim datę końca urlopu macierzyńskiego.',
      'Jeśli zasiłek wypłaca ZUS, we wniosku ZAM są pola na dane o urodzeniu i pobycie dziecka w szpitalu.',
      'Organizacje poniżej pomagają rodzicom wcześniaków – poradnikiem, grupami wsparcia i wypożyczalnią sprzętu.',
    ],
    dokumenty: [
      {
        nazwa: 'Zaświadczenie ze szpitala o okresie pobytu dziecka i o tym, w którym tygodniu ciąży się urodziło (albo ile ważyło)',
        przepis: 'KP art. 180² § 5; ROZP § 26 pkt 4',
      },
      {
        nazwa: 'Wniosek do pracodawcy o uzupełniający urlop macierzyński',
        kiedy: 'co najmniej 21 dni przed końcem urlopu macierzyńskiego',
        przepis: 'KP art. 180² § 4 i 6',
      },
      {
        nazwa: 'Wniosek do płatnika zasiłku z datą końca zasiłku za okres urlopu macierzyńskiego',
        kiedy: 'poza umową o pracę (np. zlecenie, działalność)',
        przepis: 'ROZP § 26 pkt 3',
      },
      {
        nazwa: 'Oświadczenie, że drugi rodzic nie będzie korzystał z zasiłku za okres urlopu uzupełniającego',
        przepis: 'ROZP § 26 pkt 1',
      },
    ],
    doPotwierdzeniaWZus: [],
    linki: ['zusUzupelniajacy', 'govSwiadczenieRodzicielskie'],
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'za_zyciem',
    kodySytuacji: ['za_zyciem'],
    tytul: 'Dziecko jest ciężko chore',
    wstep:
      'Gdy rodzice dowiadują się, że dziecko jest ciężko chore, sprawy urzędowe są ostatnim, o czym chcą myśleć. Dlatego są tu tylko najważniejsze: dłuższy urlop, jednorazowe świadczenie i miejsca, w których można znaleźć wsparcie.',
    coPrzysluguje: [
      {
        tekst:
          'Jeśli dziecko ma zaświadczenie „Za życiem” (ciężkie i nieodwracalne upośledzenie albo nieuleczalna choroba zagrażająca życiu, powstałe w ciąży lub przy porodzie), urlop rodzicielski i zasiłek za ten okres są dłuższe: 65 tygodni przy jednym dziecku, 67 przy więcej dzieciach z jednego porodu.',
        przepisy: ['KP art. 182¹a § 2', 'UZ art. 29a ust. 1'],
      },
      {
        tekst: 'Przy łączeniu urlopu rodzicielskiego z pracą (najwyżej na pół etatu) urlop może się wydłużyć do 130 albo 134 tygodni.',
        przepisy: ['KP art. 182¹e § 1', 'KP art. 182¹f § 1¹'],
      },
      {
        tekst:
          'Reszta zasad jest taka sama: po 9 tygodni urlopu rodzicielskiego tylko dla każdego z rodziców, najwyżej 5 części, do końca roku, w którym dziecko kończy 6 lat.',
        przepisy: ['KP art. 182¹a § 4', 'KP art. 182¹c'],
      },
      {
        tekst:
          'Przy umowie o pracę, gdy dziecko wymaga opieki szpitalnej, po 8 tygodniach urlopu macierzyńskiego resztę urlopu można wykorzystać po wyjściu dziecka ze szpitala.',
        przepisy: ['KP art. 181'],
      },
      {
        tekst: 'Jednorazowo 4000 zł z gminy, bez względu na dochód. Wniosek można złożyć w ciągu 12 miesięcy od urodzenia dziecka.',
        przepisy: [],
        zrodlo: LINKI.govSwiadczenieZaZyciem.url,
      },
    ],
    coZrobicNajpierw: [
      'Proszę poprosić lekarza o zaświadczenie „Za życiem”. Wystawia je lekarz ze specjalizacją II stopnia albo specjalista m.in. położnictwa i ginekologii, perinatologii lub neonatologii.',
      'We wniosku o zasiłek (ZAM) trzeba zaznaczyć, że dziecko ma to zaświadczenie, a do wniosku o urlop rodzicielski u pracodawcy dołączyć jego kopię.',
      'Wniosek o 4000 zł można złożyć w gminie w ciągu 12 miesięcy od urodzenia dziecka.',
      'Fundacje prowadzące hospicja perinatalne pomagają rodzinom już w ciąży, gdy badania pokazują ciężką chorobę dziecka.',
    ],
    dokumenty: [
      {
        nazwa: 'Zaświadczenie „Za życiem” (art. 4 ust. 3 ustawy o wsparciu kobiet w ciąży i rodzin „Za życiem”)',
        kiedy: 'do dłuższego urlopu rodzicielskiego i do świadczenia 4000 zł',
        przepis: 'KP art. 182¹a § 2',
      },
      {
        nazwa: 'Kopia zaświadczenia „Za życiem” do wniosku o urlop rodzicielski',
        kiedy: 'przy umowie o pracę',
        przepis: 'rozp. Dz.U. 2025 poz. 322 § 15 ust. 2 pkt 3',
      },
      {
        nazwa: 'Oświadczenie we wniosku ZAM, że dziecko ma zaświadczenie „Za życiem”',
        przepis: 'ROZP załącznik 6 pkt 9',
      },
    ],
    doPotwierdzeniaWZus: [],
    linki: ['govSwiadczenieZaZyciem', 'zusZasilekMacierzynski'],
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'choroba_matki',
    kodySytuacji: ['choroba_matki'],
    tytul: 'Mama jest chora albo w szpitalu',
    wstep:
      'Gdy mama choruje, najważniejsze jest jej zdrowie. Przepisy pozwalają, żeby opiekę nad dzieckiem – razem z zasiłkiem – przejął na ten czas tata albo ktoś z najbliższej rodziny.',
    coPrzysluguje: [
      {
        tekst: 'W ciąży, na zwolnieniu lekarskim, zasiłek chorobowy wynosi 100% podstawy i przysługuje najwyżej przez 270 dni.',
        przepisy: ['UZ art. 11 ust. 2 pkt 1', 'UZ art. 8 ust. 1'],
      },
      {
        tekst:
          'Gdy zasiłek chorobowy się skończy, a dalsze leczenie daje szansę na powrót do pracy, może przysługiwać świadczenie rehabilitacyjne – w ciąży 100% podstawy. Decyduje lekarz orzecznik ZUS.',
        przepisy: ['UZ art. 18 ust. 1–3', 'UZ art. 19 ust. 1'],
      },
      {
        tekst:
          'Po porodzie: jeśli mama trafi do szpitala i nie może opiekować się dzieckiem, a wykorzystała już 8 tygodni urlopu macierzyńskiego, na czas pobytu w szpitalu urlop i zasiłek może przejąć tata albo inny członek najbliższej rodziny. Zasiłek mamy na ten czas się przerywa.',
        przepisy: ['KP art. 180 § 10–11', 'UZ art. 29 ust. 6'],
        zrodlo: LINKI.zusZasilekMacierzynskiOkres.url,
      },
      {
        tekst:
          'Jeśli mama ma orzeczenie o niezdolności do samodzielnej egzystencji, po 8 tygodniach może zrezygnować z reszty urlopu – przejmie ją tata albo inny członek najbliższej rodziny.',
        przepisy: ['KP art. 180 § 6–7', 'UZ art. 29 ust. 5'],
      },
      {
        tekst:
          'Jeśli mama nie ma ubezpieczenia chorobowego, a ma takie orzeczenie, ubezpieczony tata albo inny członek rodziny dostaje zasiłek za okres po dniu, w którym powstała niezdolność.',
        przepisy: ['KP art. 180 § 15 pkt 3', 'UZ art. 29 ust. 9 pkt 3'],
      },
      {
        tekst: 'Wszyscy razem nie wykorzystają więcej niż pełny wymiar urlopu macierzyńskiego.',
        przepisy: ['KP art. 180 § 14'],
      },
    ],
    coZrobicNajpierw: [
      'W ciąży: zwolnienie lekarskie (e-ZLA) z kodem B lekarz wysyła elektronicznie – samo trafia do ZUS i do pracodawcy.',
      'Proszę poprosić szpital o zaświadczenie o dacie przyjęcia, a potem o dacie wypisu.',
      'Mama pisze krótkie oświadczenie, od kiedy przerywa urlop (zasiłek) na czas pobytu w szpitalu.',
      'Tata albo inny członek rodziny składa wniosek u swojego pracodawcy o część urlopu macierzyńskiego i obiecuje dać znać, gdy mama wyjdzie ze szpitala.',
    ],
    dokumenty: [
      {
        nazwa: 'Zaświadczenie szpitala o dacie przyjęcia mamy',
        przepis: 'ROZP § 23 ust. 1 pkt 3, § 24 ust. 1 pkt 1; rozp. Dz.U. 2025 poz. 322 § 6 ust. 2 pkt 2',
      },
      { nazwa: 'Zaświadczenie szpitala o dacie wypisu mamy', przepis: 'ROZP § 23 ust. 1 pkt 4' },
      {
        nazwa: 'Oświadczenie mamy o dacie przerwania urlopu albo zasiłku',
        przepis: 'ROZP § 24 ust. 1 pkt 2; rozp. Dz.U. 2025 poz. 322 § 6 ust. 2 pkt 1',
      },
      {
        nazwa: 'Zaświadczenie płatnika o okresie i stawce zasiłku wypłaconego mamie',
        przepis: 'ROZP § 23 ust. 1 pkt 2',
      },
      {
        nazwa: 'Odpis skrócony aktu urodzenia dziecka',
        kiedy: 'do wniosku u pracodawcy; do ZUS nie, gdy zasiłek wypłaca ZUS',
        przepis: 'rozp. Dz.U. 2025 poz. 322 § 6 ust. 2 pkt 3; ROZP § 23 ust. 2 i § 13 ust. 2',
      },
      {
        nazwa: 'Orzeczenie o niezdolności do samodzielnej egzystencji',
        kiedy: 'gdy przejęcie wynika z orzeczenia',
        przepis: 'ROZP § 21 pkt 4, § 22',
      },
    ],
    doPotwierdzeniaWZus: [PYTANIE_STAWKA_PRZEJECIA],
    linki: ['zusZasilekMacierzynskiOkres', 'zusZasilekChorobowy'],
    sprawdzono: SPRAWDZONO,
  },
  {
    id: 'smierc_matki',
    kodySytuacji: ['smierc_matki'],
    tytul: 'Mama dziecka zmarła',
    wstep:
      'Bardzo nam przykro. Przepisy pozwalają, żeby tata albo ktoś z najbliższej rodziny przejął urlop i zasiłek i mógł być teraz z dzieckiem. Nie trzeba załatwiać wszystkiego od razu.',
    coPrzysluguje: [
      {
        tekst:
          'Tata dziecka albo inny członek najbliższej rodziny, który jest ubezpieczony, dostaje urlop i zasiłek macierzyński za pozostałą część urlopu macierzyńskiego – od dnia po śmierci mamy.',
        przepisy: ['KP art. 180 § 12', 'UZ art. 29 ust. 7', 'UZ art. 29a ust. 2'],
        zrodlo: LINKI.zusZasilekMacierzynskiOkres.url,
      },
      {
        tekst: 'Tak samo, jeśli mama nie miała ubezpieczenia chorobowego.',
        przepisy: ['KP art. 180 § 15 pkt 1', 'UZ art. 29 ust. 9 pkt 1'],
      },
      {
        tekst:
          'Przy umowie zlecenia albo działalności zasiłek przysługuje, gdy osoba przejmująca opiekę przerwie pracę zarobkową, żeby osobiście opiekować się dzieckiem.',
        przepisy: ['UZ art. 29 ust. 7'],
      },
      {
        tekst:
          'Jeśli tata nie ma prawa do zasiłku macierzyńskiego, może otrzymać świadczenie rodzicielskie z gminy, gdy mama zmarła.',
        przepisy: [],
        zrodlo: LINKI.govSwiadczenieRodzicielskie.url,
      },
      {
        tekst: 'Warto zapytać w ZUS, czy dziecku przysługuje renta rodzinna po mamie.',
        przepisy: [],
        zrodlo: LINKI.zusRentaRodzinna.url,
      },
      ZASILEK_POGRZEBOWY,
    ],
    coZrobicNajpierw: [
      'Gdy przyjdzie na to czas, proszę złożyć u swojego pracodawcy wniosek o część urlopu macierzyńskiego: z datą śmierci mamy i datą, od której ma się zacząć urlop.',
      'Jeśli mama dostawała zasiłek, potrzebne będzie zaświadczenie od jej płatnika (albo z ZUS), za jaki okres i w jakiej stawce go wypłacono.',
      'Przy zbieraniu dokumentów może pomóc bliska osoba – nie trzeba robić tego samemu.',
    ],
    dokumenty: [
      {
        nazwa: 'Oświadczenie o dacie śmierci mamy dziecka',
        przepis: 'ROZP § 20 ust. 3–4; rozp. Dz.U. 2025 poz. 322 § 8 ust. 1 pkt 2',
      },
      {
        nazwa: 'Odpis skrócony aktu urodzenia dziecka',
        kiedy: 'do wniosku u pracodawcy; do ZUS nie, gdy zasiłek wypłaca ZUS',
        przepis: 'ROZP § 20 ust. 1 pkt 1 i ust. 2; rozp. Dz.U. 2025 poz. 322 § 8 ust. 2',
      },
      {
        nazwa: 'Zaświadczenie płatnika zasiłku mamy o okresie i stawce wypłaconego jej zasiłku',
        kiedy: 'gdy mama była ubezpieczona',
        przepis: 'ROZP § 20 ust. 1 pkt 2 i ust. 3',
      },
      {
        nazwa: 'Oświadczenie o urlopie macierzyńskim mamy wykorzystanym przed porodem',
        kiedy: 'do wniosku u pracodawcy',
        przepis: 'rozp. Dz.U. 2025 poz. 322 § 8 ust. 1 pkt 3',
      },
    ],
    doPotwierdzeniaWZus: [
      PYTANIE_STAWKA_PRZEJECIA,
      {
        kod: KOD_DO_POTWIERDZENIA,
        pytanie:
          'Czy po śmierci mamy tata może wykorzystać też jej 9 tygodni urlopu rodzicielskiego, które zwykle są nieprzenoszalne?',
        przepisy: ['KP art. 182¹a § 4', 'KP art. 182¹g (odesłanie do art. 180 § 12)'],
      },
    ],
    linki: ['zusZasilekMacierzynskiOkres', 'zusRentaRodzinna', 'zusZasilekPogrzebowy', 'govSwiadczenieRodzicielskie'],
    sprawdzono: SPRAWDZONO,
  },
];

export function trudnaSytuacja(kod: KodSytuacji): TrudnaSytuacja | undefined {
  return TRUDNE_SYTUACJE.find((s) => s.id === kod);
}
