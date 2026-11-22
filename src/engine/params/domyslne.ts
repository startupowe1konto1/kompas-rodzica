/**
 * Domyślne parametry z datą obowiązywania. TOR B (Mateusz) jest właścicielem tego pliku.
 *
 * Każda liczba z przepisów mieszka tutaj. Silnik nie ma liczb „na sztywno”.
 * Źródła: ZUS-BRIEF.md sekcja 7 (Kodeks pracy, ustawa zasiłkowa, załącznik ZUS) i research z 21.11.2026
 * (akty w API ELI Sejmu). Mapa `przepisy`: ścieżka parametru → podstawa prawna (pokazuje ją panel admina).
 * Skróty: KP – Kodeks pracy (Dz.U. 2026 poz. 1245), UZ – ustawa zasiłkowa (Dz.U. 2026 poz. 854).
 */
import type { Parametry } from '../types';

/** Podstawa prawna parametrów, które w 2027 r. się nie zmieniają (wymiary, stawki, limity, terminy, podatek). */
const PRZEPISY_WSPOLNE: Record<string, string> = {
  'stawkiProc.macierzynski': 'UZ art. 31 ust. 1',
  'stawkiProc.rodzicielski': 'UZ art. 31 ust. 2',
  'stawkiProc.wariant815': 'UZ art. 31 ust. 3',
  'stawkiProc.ojcowski': 'UZ art. 31 ust. 1',
  'stawkiProc.uzupelniajacy': 'UZ art. 31 ust. 1',
  'stawkiProc.chorobowyCiaza': 'UZ art. 11 ust. 2 pkt 1',
  'stawkiProc.rehabilitacyjneCiaza': 'UZ art. 19 ust. 1',

  'wymiaryTyg.macierzynski': 'KP art. 180 § 1',
  'wymiaryTyg.macierzynskiPrzedPorodemMax': 'KP art. 180 § 2',
  'wymiaryTyg.obowiazkoweMatki': 'KP art. 180 § 4; UZ art. 29 ust. 3',
  'wymiaryTyg.obowiazkoweMatkiSzczegolne': 'KP art. 180 § 6, § 10, § 13; UZ art. 29 ust. 5–7',
  'wymiaryTyg.martweUrodzenie': 'KP art. 180¹ § 1',
  'wymiaryTyg.dniPoZgonieDziecka': 'KP art. 180¹ § 1–2',
  'wymiaryTyg.rodzicielski1': 'KP art. 182¹a § 1 pkt 1',
  'wymiaryTyg.rodzicielskiWiecej': 'KP art. 182¹a § 1 pkt 2',
  'wymiaryTyg.rodzicielskiZaZyciem1': 'KP art. 182¹a § 2 pkt 1',
  'wymiaryTyg.rodzicielskiZaZyciemWiecej': 'KP art. 182¹a § 2 pkt 2',
  'wymiaryTyg.rodzicielskiNieprzenoszalne': 'KP art. 182¹a § 4',
  'wymiaryTyg.rodzicielskiMaxZPraca.jedno': 'KP art. 182¹f § 1 pkt 1',
  'wymiaryTyg.rodzicielskiMaxZPraca.wiecej': 'KP art. 182¹f § 1 pkt 2',
  'wymiaryTyg.rodzicielskiMaxZPraca.zaZyciemJedno': 'KP art. 182¹f § 1¹ pkt 1',
  'wymiaryTyg.rodzicielskiMaxZPraca.zaZyciemWiecej': 'KP art. 182¹f § 1¹ pkt 2',
  'wymiaryTyg.ojcowski': 'KP art. 182³ § 1',
  'wymiaryTyg.uzupelniajacyGranicaTyg.ponizej28LubDo1000g': 'KP art. 180² § 1 pkt 1',
  'wymiaryTyg.uzupelniajacyGranicaTyg.od28Do37': 'KP art. 180² § 1 pkt 2',
  'wymiaryTyg.uzupelniajacyGranicaTyg.od37': 'KP art. 180² § 1 pkt 3',
  'wymiaryTyg.przyjecieStarszegoDziecka.naWarunkachMacierzynskiego': 'KP art. 183 § 3',
  'wymiaryTyg.przyjecieStarszegoDziecka.rodzicielski': 'KP art. 183 § 4 pkt 3, § 4²',
  'wymiaryTyg.przyjecieStarszegoDziecka.rodzicielskiZaZyciem': 'KP art. 183 § 4³ pkt 3, § 4⁵',

  'limity.rodzicielskiMaxCzesci': 'KP art. 182¹c; art. 183 § 4⁶',
  'limity.ojcowskiMaxCzesci': 'KP art. 182³ § 1¹',
  'limity.ojcowskiMinDniCzesci': 'KP art. 182³ § 1¹ (część nie krótsza niż tydzień) i § 3 w zw. z art. 183¹ § 1 (tydzień = 7 dni)',
  'limity.ojcowskiDoMiesiecyZycia': 'KP art. 182³ § 1 pkt 1',
  'limity.rodzicielskiDoRokuZycia': 'KP art. 182¹c',
  'limity.maxWymiarPracyPrzyLaczeniu': 'KP art. 182¹e § 1',
  'limity.okresZasilkowyCiazaDni': 'UZ art. 8 ust. 1',
  'limity.wynagrodzenieChoroboweDni': 'KP art. 92 § 1 pkt 1, § 4',
  'limity.wynagrodzenieChoroboweDni50Plus': 'KP art. 92 § 1 pkt 1, § 4–5',
  'limity.wyczekiwanieObowiazkoweDni': 'UZ art. 4 ust. 1 pkt 1',
  'limity.wyczekiwanieDobrowolneDni': 'UZ art. 4 ust. 1 pkt 2',
  'limity.wiekPrzysposobienieLat': 'UZ art. 29 ust. 1 pkt 2; KP art. 183 § 1¹',
  'limity.wiekRodzinaZastepczaLat': 'UZ art. 29 ust. 1 pkt 3; KP art. 183 § 1',
  'limity.wiekRodzinaZastepczaOdroczenieLat': 'UZ art. 29 ust. 1 pkt 3; KP art. 183 § 1',
  'limity.progUbezpieczonychPlatnika': 'UZ art. 61 ust. 1 pkt 1, ust. 2',
  'limity.progZaleglosciProcPlacyMinimalnej': 'UZ art. 2a ust. 1',
  'limity.splataZaleglosciMiesiecy': 'UZ art. 2a ust. 2',
  'limity.ostrzezeniePozneZgloszenieDni': 'założenie zespołu',
  // Parametry dopisane przez integratora (tor A); przepisy i założenia jak w jego wpisach.
  'limity.ciazaDni': 'założenie zespołu (pytanie 13)',
  'limity.miesiacCiazyDni': 'Zielona Linia gov.pl (pytanie 13)',
  'limity.wyczekiwaniePrzerwaMaxDni': 'UZ art. 4 ust. 2',
  'limity.przedluzenieUmowyPoMiesiacuCiazy': 'KP art. 177 § 3',
  'limity.ryzykoUmowaPrzedCiazaMies': 'założenie zespołu (pytanie 26)',
  'limity.ryzykoPodwyzkaProc': 'założenie zespołu (pytanie 27)',
  'limity.ryzykoTerminPilneDni': 'założenie zespołu',
  'limity.uzupelniajacy.tydzienCiazyWczesniak': 'KP art. 180² § 1',
  'limity.uzupelniajacy.tydzienCiazyDonoszone': 'KP art. 180² § 1',
  'limity.uzupelniajacy.masaGWczesniak': 'KP art. 180² § 1',
  'limity.uzupelniajacy.donoszoneOdDniaZycia': 'KP art. 180² § 1',
  'limity.uzupelniajacy.donoszonePierwszyDzienDo': 'KP art. 180² § 1',
  'limity.uzupelniajacy.donoszoneMinKolejnychDni': 'KP art. 180² § 1',

  'terminyDni.wniosek815PoPorodzie': 'UZ art. 30a ust. 1',
  'terminyDni.wniosekRodzicielskiPrzed': 'KP art. 182¹d § 1',
  'terminyDni.wniosekOjcowskiPrzed': 'KP art. 182³ § 2',
  'terminyDni.rezygnacjaMatkiPrzed': 'KP art. 180 § 8',
  'terminyDni.przejecieOjcaPrzed': 'KP art. 180 § 9',
  'terminyDni.wniosekUzupelniajacyPrzedKoncem': 'KP art. 180² § 4',
  'terminyDni.wniosekLaczeniePrzed': 'KP art. 182¹e § 2',
  'terminyDni.wniosekNaWarunkachMacierzynskiegoPo': 'KP art. 183 § 6',

  'kwoty.skladkiPracownikaProc': 'UZ art. 3 pkt 4, art. 45 ust. 1',
  'kwoty.swiadczenieRodzicielskie':
    'ustawa o świadczeniach rodzinnych art. 17c ust. 5 (Dz.U. 2026 poz. 1240); UZ art. 31 ust. 3a',
  'kwoty.podstawaPreferencyjnaProcPlacyMinimalnej': 'do potwierdzenia – brak w materiałach',
  'kwoty.dniWMiesiacuDoStawkiDziennej': 'UZ art. 36 ust. 3',

  'podatek.zaliczkaProc': 'ustawa o PIT art. 34 ust. 3 (Dz.U. 2026 poz. 592)',
  'podatek.kwotaZmniejszajacaMiesiecznie': 'ustawa o PIT art. 31b ust. 1 w zw. z art. 27 ust. 1 (Dz.U. 2026 poz. 592)',
};

export const PARAMETRY_2026: Parametry = {
  obowiazujeOd: '2026-01-01',
  opis: 'Stan prawny 2026',
  zrodlo:
    'Kodeks pracy (Dz.U. 2026 poz. 1245), ustawa zasiłkowa (Dz.U. 2026 poz. 854), załącznik ZUS do zadania; ' +
    'płaca minimalna: Dz.U. 2025 poz. 1242; maks. podstawa dobrowolnego chorobowego: M.P. 2025 poz. 1216; ' +
    'prognozowane przeciętne wynagrodzenie 9420 zł: Dz.U. 2026 poz. 62 art. 24; ' +
    'ustawa o PIT: https://api.sejm.gov.pl/eli/acts/DU/2026/592/text.pdf',
  stawkiProc: {
    macierzynski: 100,
    rodzicielski: 70,
    wariant815: 81.5,
    ojcowski: 100,
    uzupelniajacy: 100,
    chorobowyCiaza: 100,
    rehabilitacyjneCiaza: 100,
  },
  wymiaryTyg: {
    macierzynski: [20, 31, 33, 35, 37],
    macierzynskiPrzedPorodemMax: 6,
    obowiazkoweMatki: 14,
    obowiazkoweMatkiSzczegolne: 8,
    martweUrodzenie: 8,
    dniPoZgonieDziecka: 7,
    rodzicielski1: 41,
    rodzicielskiWiecej: 43,
    rodzicielskiZaZyciem1: 65,
    rodzicielskiZaZyciemWiecej: 67,
    rodzicielskiNieprzenoszalne: 9,
    rodzicielskiMaxZPraca: { jedno: 82, wiecej: 86, zaZyciemJedno: 130, zaZyciemWiecej: 134 },
    ojcowski: 2,
    uzupelniajacyGranicaTyg: { ponizej28LubDo1000g: 15, od28Do37: 8, od37: 8 },
    // Liczby potwierdzone w KP art. 183 § 3, § 4 pkt 3, § 4³ pkt 3. NIEJASNE (pytanie 7): kiedy stosuje się § 3.
    przyjecieStarszegoDziecka: { naWarunkachMacierzynskiego: 9, rodzicielski: 38, rodzicielskiZaZyciem: 62 },
  },
  limity: {
    rodzicielskiMaxCzesci: 5,
    ojcowskiMaxCzesci: 2,
    ojcowskiMinDniCzesci: 7,
    ojcowskiDoMiesiecyZycia: 12,
    rodzicielskiDoRokuZycia: 6,
    maxWymiarPracyPrzyLaczeniu: 0.5,
    okresZasilkowyCiazaDni: 270,
    wynagrodzenieChoroboweDni: 33,
    wynagrodzenieChoroboweDni50Plus: 14,
    wyczekiwanieObowiazkoweDni: 30,
    wyczekiwanieDobrowolneDni: 90,
    wiekPrzysposobienieLat: 14,
    wiekRodzinaZastepczaLat: 7,
    wiekRodzinaZastepczaOdroczenieLat: 10,
    progUbezpieczonychPlatnika: 20,
    // UZ art. 2a ust. 1–2: zaległość powyżej 1% płacy minimalnej, 6 miesięcy na spłatę (potwierdzone w przepisie).
    progZaleglosciProcPlacyMinimalnej: 1,
    splataZaleglosciMiesiecy: 6,
    // Nasze założenie [W]: mentor mówił o zgłoszeniu „na miesiąc przed porodem”; ostrzegamy z zapasem.
    ostrzezeniePozneZgloszenieDni: 90,
    // Założenia tymczasowe (pytania 13, 26, 27 w docs/pytania-do-mentora.md); dopisał integrator (tor A).
    ciazaDni: 280,
    przedluzenieUmowyPoMiesiacuCiazy: 3,
    // Zielona Linia (gov.pl): „miesiące ciąży oblicza się według miary miesięcy księżycowych”, 1 miesiąc = 28 dni.
    // https://zielonalinia.gov.pl/umowa-na-czas-okreslony-a-cia-1/ – źródło informacyjne, pytanie 13.
    miesiacCiazyDni: 28,
    wyczekiwaniePrzerwaMaxDni: 30,
    ryzykoUmowaPrzedCiazaMies: 3,
    ryzykoPodwyzkaProc: 20,
    ryzykoTerminPilneDni: 30,
    uzupelniajacy: {
      tydzienCiazyWczesniak: 28,
      tydzienCiazyDonoszone: 37,
      masaGWczesniak: 1000,
      donoszoneOdDniaZycia: 5,
      donoszonePierwszyDzienDo: 28,
      donoszoneMinKolejnychDni: 2,
    },
  },
  terminyDni: {
    wniosek815PoPorodzie: 21,
    wniosekRodzicielskiPrzed: 21,
    wniosekOjcowskiPrzed: 7,
    rezygnacjaMatkiPrzed: 7,
    przejecieOjcaPrzed: 14,
    wniosekUzupelniajacyPrzedKoncem: 21,
    wniosekLaczeniePrzed: 21,
    wniosekNaWarunkachMacierzynskiegoPo: 7,
  },
  kwoty: {
    placaMinimalna: 4806,
    skladkiPracownikaProc: 13.71,
    swiadczenieRodzicielskie: 1000,
    maxPodstawaSkladkiDobrowolne: 23550,
    // 60% prognozowanego przeciętnego wynagrodzenia na 2026 r. (9420 zł, Dz.U. 2026 poz. 62 art. 24) – wyliczenie.
    najnizszaPodstawaDzialalnosc: 5652,
    podstawaPreferencyjnaProcPlacyMinimalnej: 30,
    dniWMiesiacuDoStawkiDziennej: 30,
  },
  // Ustawa o PIT (Dz.U. 2026 poz. 592): zaliczka 12% – art. 34 ust. 3; 1/12 kwoty zmniejszającej (300 zł) tylko
  // po oświadczeniu podatnika – art. 31b ust. 1. Zaokrąglenia do pełnych złotych: Ordynacja podatkowa art. 63 § 1.
  podatek: {
    zaliczkaProc: 12,
    kwotaZmniejszajacaMiesiecznie: 300,
  },
  przepisy: {
    ...PRZEPISY_WSPOLNE,
    'kwoty.placaMinimalna': 'Dz.U. 2025 poz. 1242 (minimalne wynagrodzenie na 2026 r.); stosowane w UZ art. 45 ust. 1',
    'kwoty.maxPodstawaSkladkiDobrowolne':
      'M.P. 2025 poz. 1216 (250% prognozowanego przeciętnego wynagrodzenia na 2026 r.); załącznik ZUS do zadania',
    'kwoty.najnizszaPodstawaDzialalnosc':
      '60% × 9420 zł (prognozowane przeciętne wynagrodzenie, Dz.U. 2026 poz. 62 art. 24), wyliczenie; ' +
      'stosowane w UZ art. 48a ust. 1, art. 49 ust. 1 pkt 1; przepis o 60%: do potwierdzenia – brak w materiałach',
  },
};

const BAZA_2027 = structuredClone(PARAMETRY_2026);

export const PARAMETRY_2027: Parametry = {
  ...BAZA_2027,
  obowiazujeOd: '2027-01-01',
  opis:
    'Stan prawny od 1.01.2027. Zmienione: płaca minimalna 4950 zł, maks. podstawa dobrowolnego chorobowego ' +
    '25 082,50 zł, najniższa podstawa dla działalności 6019,80 zł (60% × 10 033 zł; prognozowane przeciętne ' +
    'wynagrodzenie z obwieszczenia MRPiPS, bo ustawa budżetowa na 2027 r. nie jest jeszcze uchwalona). ' +
    'Bez zmian względem 2026: stawki, wymiary urlopów, limity, terminy, składki 13,71%, świadczenie rodzicielskie ' +
    '1000 zł, podstawa preferencyjna 30%, podatek (12% i 300 zł) – brak ogłoszonej wartości ani zmiany przepisu. ' +
    'Dz.U. 2026 poz. 26 (od 1.01.2027) zmienia okres zasiłkowy przy kilku tytułach, nie wysokość ani podstawę ' +
    'zasiłku macierzyńskiego.',
  zrodlo:
    'płaca minimalna: rozporządzenie RM z 14.09.2026, Dz.U. 2026 poz. 1213 – https://api.sejm.gov.pl/eli/acts/DU/2026/1213; ' +
    'maks. podstawa: komunikat Prezesa ZUS z 5.11.2026, M.P. 2026 poz. 1120 – https://api.sejm.gov.pl/eli/acts/MP/2026/1120; ' +
    'prognozowane przeciętne wynagrodzenie 10 033 zł: obwieszczenie MRPiPS z 3.11.2026, M.P. 2026 poz. 1098 – ' +
    'https://api.sejm.gov.pl/eli/acts/MP/2026/1098; ' +
    'świadczenie rodzicielskie: https://api.sejm.gov.pl/eli/acts/DU/2026/1240; ' +
    'ustawa zasiłkowa: https://api.sejm.gov.pl/eli/acts/DU/2026/854; ' +
    'ustawa o PIT: https://api.sejm.gov.pl/eli/acts/DU/2026/592/text.pdf',
  kwoty: {
    ...BAZA_2027.kwoty,
    placaMinimalna: 4950,
    maxPodstawaSkladkiDobrowolne: 25082.5,
    // 60% × 10 033 zł (M.P. 2026 poz. 1098) – wyliczenie, kwota nie występuje wprost w akcie.
    najnizszaPodstawaDzialalnosc: 6019.8,
  },
  przepisy: {
    ...PRZEPISY_WSPOLNE,
    'kwoty.placaMinimalna':
      'rozporządzenie RM z 14.09.2026, Dz.U. 2026 poz. 1213 (minimalne wynagrodzenie na 2027 r.); stosowane w UZ art. 45 ust. 1',
    'kwoty.maxPodstawaSkladkiDobrowolne':
      'komunikat Prezesa ZUS z 5.11.2026, M.P. 2026 poz. 1120 (250% prognozowanego przeciętnego wynagrodzenia na 2027 r.)',
    'kwoty.najnizszaPodstawaDzialalnosc':
      '60% × 10 033 zł (prognozowane przeciętne wynagrodzenie, obwieszczenie MRPiPS z 3.11.2026, M.P. 2026 poz. 1098), ' +
      'wyliczenie; stosowane w UZ art. 48a ust. 1, art. 49 ust. 1 pkt 1; przepis o 60%: do potwierdzenia – brak w materiałach',
  },
};

/** Wersje posortowane rosnąco po `obowiazujeOd`. */
export const WERSJE_DOMYSLNE: Parametry[] = [PARAMETRY_2026, PARAMETRY_2027];
