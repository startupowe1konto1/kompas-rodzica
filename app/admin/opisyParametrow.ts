// Etykiety i opisy parametrów w panelu admina. Klucz = ścieżka z `polaWersji`.
// `dotyczy` opisuje znaczenie parametru (wg komentarzy w `types.ts` i przepisu), bez obietnic, gdzie silnik go czyta.
// Zdanie o wpływie na kalkulator dopisujemy tylko tam, gdzie kalkulator naprawdę czyta wartość.
export interface OpisParametru {
  etykieta: string;
  /** Jedno zdanie: czego dotyczy parametr. */
  dotyczy: string;
}

const KALKULATOR = ' Zmiana od razu zmienia kwoty w kalkulatorze.';

const dzieci = (n: string, i: number): OpisParametru => ({
  etykieta: `Urlop macierzyński, ${n} (tygodnie)`,
  dotyczy: `Wymiar urlopu macierzyńskiego (i okresu zasiłku) przy porodzie, po którym liczba dzieci wynosi ${i}.`,
});

export const OPISY_PARAMETROW: Record<string, OpisParametru> = {
  'stawkiProc.macierzynski': {
    etykieta: 'Zasiłek macierzyński (% podstawy)',
    dotyczy: 'Jaki procent podstawy wynosi zasiłek macierzyński.' + KALKULATOR,
  },
  'stawkiProc.rodzicielski': {
    etykieta: 'Zasiłek macierzyński za okres urlopu rodzicielskiego (% podstawy)',
    dotyczy: 'Jaki procent podstawy wynosi zasiłek macierzyński za okres urlopu rodzicielskiego.' + KALKULATOR,
  },
  'stawkiProc.wariant815': {
    etykieta: 'Wariant 81,5% za całość (% podstawy)',
    dotyczy: 'Jaki procent podstawy wynosi zasiłek, gdy matka wybierze jedną stawkę za cały okres macierzyńskiego i rodzicielskiego.' + KALKULATOR,
  },
  'stawkiProc.ojcowski': {
    etykieta: 'Zasiłek macierzyński za okres urlopu ojcowskiego (% podstawy)',
    dotyczy: 'Jaki procent podstawy wynosi zasiłek macierzyński za okres urlopu ojcowskiego.' + KALKULATOR,
  },
  'stawkiProc.uzupelniajacy': {
    etykieta: 'Zasiłek macierzyński za okres uzupełniającego urlopu macierzyńskiego (% podstawy)',
    dotyczy: 'Jaki procent podstawy wynosi zasiłek macierzyński za okres uzupełniającego urlopu macierzyńskiego (dziecko w szpitalu po porodzie).' + KALKULATOR,
  },
  'stawkiProc.chorobowyCiaza': {
    etykieta: 'Zasiłek chorobowy w ciąży (% podstawy)',
    dotyczy: 'Jaki procent podstawy wynosi zasiłek chorobowy za zwolnienie lekarskie w ciąży.' + KALKULATOR,
  },
  'stawkiProc.rehabilitacyjneCiaza': {
    etykieta: 'Świadczenie rehabilitacyjne w ciąży (% podstawy)',
    dotyczy: 'Jaki procent podstawy wynosi świadczenie rehabilitacyjne w ciąży.',
  },

  'wymiaryTyg.macierzynski.0': dzieci('1 dziecko', 1),
  'wymiaryTyg.macierzynski.1': dzieci('2 dzieci', 2),
  'wymiaryTyg.macierzynski.2': dzieci('3 dzieci', 3),
  'wymiaryTyg.macierzynski.3': dzieci('4 dzieci', 4),
  'wymiaryTyg.macierzynski.4': dzieci('5 i więcej dzieci', 5),
  'wymiaryTyg.macierzynskiPrzedPorodemMax': {
    etykieta: 'Macierzyński przed porodem, maksimum (tygodnie)',
    dotyczy: 'Ile tygodni urlopu macierzyńskiego można wziąć przed przewidywaną datą porodu.',
  },
  'wymiaryTyg.obowiazkoweMatki': {
    etykieta: 'Obowiązkowa część urlopu matki (tygodnie)',
    dotyczy: 'Ile tygodni po porodzie matka wykorzystuje osobiście; dopiero potem urlop może przejąć ojciec.',
  },
  'wymiaryTyg.obowiazkoweMatkiSzczegolne': {
    etykieta: 'Obowiązkowa część urlopu matki w sytuacjach szczególnych (tygodnie)',
    dotyczy: 'Krótszy okres obowiązkowy matki w sytuacjach szczególnych, po którym urlop może przejąć ojciec.',
  },
  'wymiaryTyg.martweUrodzenie': {
    etykieta: 'Urlop po martwym urodzeniu lub zgonie dziecka (tygodnie)',
    dotyczy: 'Wymiar urlopu po martwym urodzeniu albo zgonie dziecka przed 8. tygodniem życia.',
  },
  'wymiaryTyg.dniPoZgonieDziecka': {
    etykieta: 'Prawo do urlopu po zgonie dziecka (dni)',
    dotyczy: 'Przez ile dni od zgonu dziecka prawo do urlopu zostaje zachowane.',
  },
  'wymiaryTyg.rodzicielski1': {
    etykieta: 'Urlop rodzicielski, 1 dziecko (tygodnie)',
    dotyczy: 'Wspólna pula urlopu rodzicielskiego obojga rodziców przy jednym dziecku.',
  },
  'wymiaryTyg.rodzicielskiWiecej': {
    etykieta: 'Urlop rodzicielski, 2 i więcej dzieci (tygodnie)',
    dotyczy: 'Wspólna pula urlopu rodzicielskiego przy porodzie wielorakim.',
  },
  'wymiaryTyg.rodzicielskiZaZyciem1': {
    etykieta: 'Urlop rodzicielski „Za życiem”, 1 dziecko (tygodnie)',
    dotyczy: 'Pula urlopu rodzicielskiego przy jednym dziecku objętym programem „Za życiem”.',
  },
  'wymiaryTyg.rodzicielskiZaZyciemWiecej': {
    etykieta: 'Urlop rodzicielski „Za życiem”, 2 i więcej dzieci (tygodnie)',
    dotyczy: 'Pula urlopu rodzicielskiego przy porodzie wielorakim w programie „Za życiem”.',
  },
  'wymiaryTyg.rodzicielskiNieprzenoszalne': {
    etykieta: 'Część rodzicielskiego wyłączna dla każdego rodzica (tygodnie)',
    dotyczy:
      'Ile tygodni z puli rodzicielskiej przysługuje wyłącznie danemu rodzicowi (nie można ich przekazać); przy wariancie 81,5% za tę część drugiego rodzica zasiłek wynosi 70%.' +
      KALKULATOR,
  },
  'wymiaryTyg.rodzicielskiMaxZPraca.jedno': {
    etykieta: 'Rodzicielski z pracą, maksimum: 1 dziecko (tygodnie)',
    dotyczy: 'Górna granica urlopu rodzicielskiego wydłużonego przez łączenie z pracą, jedno dziecko.',
  },
  'wymiaryTyg.rodzicielskiMaxZPraca.wiecej': {
    etykieta: 'Rodzicielski z pracą, maksimum: 2 i więcej dzieci (tygodnie)',
    dotyczy: 'Górna granica urlopu rodzicielskiego wydłużonego przez łączenie z pracą, poród wielorodny.',
  },
  'wymiaryTyg.rodzicielskiMaxZPraca.zaZyciemJedno': {
    etykieta: 'Rodzicielski z pracą, „Za życiem”: 1 dziecko (tygodnie)',
    dotyczy: 'Górna granica urlopu rodzicielskiego z pracą w programie „Za życiem”, jedno dziecko.',
  },
  'wymiaryTyg.rodzicielskiMaxZPraca.zaZyciemWiecej': {
    etykieta: 'Rodzicielski z pracą, „Za życiem”: 2 i więcej dzieci (tygodnie)',
    dotyczy: 'Górna granica urlopu rodzicielskiego z pracą w programie „Za życiem”, poród wielorodny.',
  },
  'wymiaryTyg.ojcowski': {
    etykieta: 'Urlop ojcowski (tygodnie)',
    dotyczy: 'Wymiar urlopu ojcowskiego.',
  },
  'wymiaryTyg.uzupelniajacyGranicaTyg.ponizej28LubDo1000g': {
    etykieta: 'Urlop uzupełniający: dziecko urodzone przed 28. tygodniem lub do 1000 g (tygodnie)',
    dotyczy: 'Do którego tygodnia po porodzie pobyt dziecka w szpitalu może być liczony do urlopu uzupełniającego.',
  },
  'wymiaryTyg.uzupelniajacyGranicaTyg.od28Do37': {
    etykieta: 'Urlop uzupełniający: dziecko urodzone między 28. a 37. tygodniem (tygodnie)',
    dotyczy: 'Do którego tygodnia po porodzie pobyt dziecka w szpitalu może być liczony do urlopu uzupełniającego.',
  },
  'wymiaryTyg.uzupelniajacyGranicaTyg.od37': {
    etykieta: 'Urlop uzupełniający: dziecko urodzone od 37. tygodnia (tygodnie)',
    dotyczy: 'Do którego tygodnia po porodzie pobyt dziecka w szpitalu może być liczony do urlopu uzupełniającego.',
  },
  'wymiaryTyg.przyjecieStarszegoDziecka.naWarunkachMacierzynskiego': {
    etykieta: 'Przyjęcie starszego dziecka: na warunkach macierzyńskiego (tygodnie)',
    dotyczy: 'Wymiar urlopu na warunkach macierzyńskiego przy przyjęciu starszego dziecka.',
  },
  'wymiaryTyg.przyjecieStarszegoDziecka.rodzicielski': {
    etykieta: 'Przyjęcie starszego dziecka: rodzicielski (tygodnie)',
    dotyczy: 'Wymiar urlopu rodzicielskiego przy przyjęciu starszego dziecka.',
  },
  'wymiaryTyg.przyjecieStarszegoDziecka.rodzicielskiZaZyciem': {
    etykieta: 'Przyjęcie starszego dziecka: rodzicielski „Za życiem” (tygodnie)',
    dotyczy: 'Wymiar urlopu rodzicielskiego przy przyjęciu starszego dziecka w programie „Za życiem”.',
  },

  'limity.rodzicielskiMaxCzesci': {
    etykieta: 'Rodzicielski: maksimum części',
    dotyczy: 'Na ile najwyżej części można podzielić urlop rodzicielski.',
  },
  'limity.ojcowskiMaxCzesci': {
    etykieta: 'Ojcowski: maksimum części',
    dotyczy: 'Na ile najwyżej części można podzielić urlop ojcowski.',
  },
  'limity.ojcowskiMinDniCzesci': {
    etykieta: 'Ojcowski: najkrótsza część (dni)',
    dotyczy: 'Minimalna długość jednej części urlopu ojcowskiego.',
  },
  'limity.ojcowskiDoMiesiecyZycia': {
    etykieta: 'Ojcowski: do ilu miesięcy życia dziecka',
    dotyczy: 'Do jakiego wieku dziecka (w miesiącach) można wykorzystać urlop ojcowski.',
  },
  'limity.rodzicielskiDoRokuZycia': {
    etykieta: 'Rodzicielski: do którego roku życia dziecka',
    dotyczy: 'Urlop rodzicielski trzeba wykorzystać najpóźniej do końca roku kalendarzowego, w którym dziecko kończy tyle lat.',
  },
  'limity.maxWymiarPracyPrzyLaczeniu': {
    etykieta: 'Łączenie z pracą: maksymalny wymiar etatu (ułamek)',
    dotyczy: 'Do jakiego wymiaru etatu można pracować w trakcie urlopu rodzicielskiego (0,5 = pół etatu).',
  },
  'limity.okresZasilkowyCiazaDni': {
    etykieta: 'Zasiłek chorobowy w ciąży: okres zasiłkowy (dni)',
    dotyczy: 'Maksymalna liczba dni zasiłku chorobowego w ciąży.',
  },
  'limity.wynagrodzenieChoroboweDni': {
    etykieta: 'Wynagrodzenie chorobowe od pracodawcy (dni w roku)',
    dotyczy: 'Przez ile dni w roku wynagrodzenie za czas choroby płaci pracodawca; potem wypłaca się zasiłek.',
  },
  'limity.wynagrodzenieChoroboweDni50Plus': {
    etykieta: 'Wynagrodzenie chorobowe od pracodawcy, po 50. roku życia (dni w roku)',
    dotyczy: 'To samo co wyżej dla pracownicy po 50. roku życia.',
  },
  'limity.wyczekiwanieObowiazkoweDni': {
    etykieta: 'Okres wyczekiwania, ubezpieczenie obowiązkowe (dni)',
    dotyczy: 'Ile dni ubezpieczenia chorobowego trzeba mieć, by przysługiwał zasiłek chorobowy.',
  },
  'limity.wyczekiwanieDobrowolneDni': {
    etykieta: 'Okres wyczekiwania, ubezpieczenie dobrowolne (dni)',
    dotyczy: 'To samo przy dobrowolnym ubezpieczeniu chorobowym.',
  },
  'limity.wiekPrzysposobienieLat': {
    etykieta: 'Przysposobienie: maksymalny wiek dziecka (lata)',
    dotyczy: 'Do jakiego wieku dziecka przysługuje urlop przy przysposobieniu.',
  },
  'limity.wiekRodzinaZastepczaLat': {
    etykieta: 'Rodzina zastępcza: maksymalny wiek dziecka (lata)',
    dotyczy: 'Do jakiego wieku dziecka przysługuje urlop w rodzinie zastępczej.',
  },
  'limity.wiekRodzinaZastepczaOdroczenieLat': {
    etykieta: 'Rodzina zastępcza przy odroczonym obowiązku szkolnym: maksymalny wiek (lata)',
    dotyczy: 'Wyższa granica wieku dziecka w rodzinie zastępczej, gdy odroczono obowiązek szkolny.',
  },
  'limity.progUbezpieczonychPlatnika': {
    etykieta: 'Próg liczby ubezpieczonych u płatnika',
    dotyczy: 'Płatnik zgłaszający powyżej tylu ubezpieczonych wypłaca zasiłki sam, w pozostałych przypadkach wypłaca ZUS.',
  },
  'limity.progZaleglosciProcPlacyMinimalnej': {
    etykieta: 'Próg zaległości składkowej (% płacy minimalnej)',
    dotyczy: 'Zaległość składkowa powyżej tego procentu płacy minimalnej wstrzymuje wypłatę zasiłku.',
  },
  'limity.splataZaleglosciMiesiecy': {
    etykieta: 'Czas na spłatę zaległości (miesiące)',
    dotyczy: 'Tyle miesięcy można mieć na spłatę zaległości, żeby zasiłek przysługiwał za cały okres.',
  },
  'limity.ostrzezeniePozneZgloszenieDni': {
    etykieta: 'Sygnał „późne zgłoszenie” (dni chorobowego przed porodem)',
    dotyczy: 'Sygnał ryzyka „zgłoszenie tuż przed porodem”: mniej niż tyle dni chorobowego przed porodem.',
  },
  'limity.ciazaDni': {
    etykieta: 'Długość ciąży do wyznaczenia jej początku (dni)',
    dotyczy: 'Początek ciąży to przewidywana data porodu minus tyle dni (wartość tymczasowa).',
  },
  'limity.miesiacCiazyDni': {
    etykieta: 'Długość miesiąca ciąży (dni)',
    dotyczy: 'Ile dni liczy jeden miesiąc ciąży (miesiąc księżycowy, wartość tymczasowa).',
  },
  'limity.wyczekiwaniePrzerwaMaxDni': {
    etykieta: 'Okres wyczekiwania: najdłuższa przerwa w ubezpieczeniu (dni)',
    dotyczy: 'Najdłuższa przerwa między okresami ubezpieczenia, które sumuje się do okresu wyczekiwania.',
  },
  'limity.przedluzenieUmowyPoMiesiacuCiazy': {
    etykieta: 'Przedłużenie umowy do porodu: po którym miesiącu ciąży',
    dotyczy: 'Umowa kończąca się po tym miesiącu ciąży przedłuża się do dnia porodu.',
  },
  'limity.ryzykoUmowaPrzedCiazaMies': {
    etykieta: 'Ryzyko „umowa dla pozoru” (miesiące przed ciążą)',
    dotyczy: 'Sygnał ryzyka dla tytułu ubezpieczenia zaczętego w ciąży albo do tylu miesięcy przed nią.',
  },
  'limity.ryzykoPodwyzkaProc': {
    etykieta: 'Ryzyko „podwyższenie podstawy w ciąży” (% wzrostu)',
    dotyczy: 'Sygnał ryzyka, gdy średnia podstawa wzrosła o co najmniej tyle procent.',
  },
  'limity.ryzykoTerminPilneDni': {
    etykieta: 'Ryzyko terminowe „pilne” (dni do terminu)',
    dotyczy: 'Ryzyko terminowe jest pilne, gdy do terminu zostało nie więcej niż tyle dni.',
  },
  'limity.uzupelniajacy.tydzienCiazyWczesniak': {
    etykieta: 'Urlop uzupełniający: próg wcześniaka (tydzień ciąży)',
    dotyczy: 'Próg tygodnia ciąży, poniżej którego dziecko jest wcześniakiem przy urlopie uzupełniającym.',
  },
  'limity.uzupelniajacy.tydzienCiazyDonoszone': {
    etykieta: 'Urlop uzupełniający: próg dziecka donoszonego (tydzień ciąży)',
    dotyczy: 'Próg tygodnia ciąży, od którego dziecko jest donoszone przy urlopie uzupełniającym.',
  },
  'limity.uzupelniajacy.masaGWczesniak': {
    etykieta: 'Urlop uzupełniający: masa urodzeniowa wcześniaka (g)',
    dotyczy: 'Masa urodzeniowa (do tej wartości), przy której dziecko kwalifikuje się do najdłuższego urlopu uzupełniającego.',
  },
  'limity.uzupelniajacy.donoszoneOdDniaZycia': {
    etykieta: 'Urlop uzupełniający, dziecko donoszone: od którego dnia życia',
    dotyczy: 'Początek przedziału dni życia, w którym musi zacząć się pobyt dziecka donoszonego w szpitalu.',
  },
  'limity.uzupelniajacy.donoszonePierwszyDzienDo': {
    etykieta: 'Urlop uzupełniający, dziecko donoszone: pierwszy dzień pobytu najpóźniej w dniu życia',
    dotyczy: 'Koniec przedziału dni życia, w którym musi zacząć się pobyt dziecka donoszonego w szpitalu.',
  },
  'limity.uzupelniajacy.donoszoneMinKolejnychDni': {
    etykieta: 'Urlop uzupełniający, dziecko donoszone: minimalny pobyt (kolejne dni)',
    dotyczy: 'Ile kolejnych dni musi trwać pobyt dziecka donoszonego w szpitalu.',
  },

  'terminyDni.wniosek815PoPorodzie': {
    etykieta: 'Wniosek o wariant 81,5% (dni po porodzie)',
    dotyczy: 'Do ilu dni po porodzie matka może złożyć wniosek o jedną stawkę za cały okres.',
  },
  'terminyDni.wniosekRodzicielskiPrzed': {
    etykieta: 'Wniosek o urlop rodzicielski (dni przed)',
    dotyczy: 'Ile dni przed rozpoczęciem urlopu rodzicielskiego trzeba złożyć wniosek.',
  },
  'terminyDni.wniosekOjcowskiPrzed': {
    etykieta: 'Wniosek o urlop ojcowski (dni przed)',
    dotyczy: 'Ile dni przed rozpoczęciem urlopu ojcowskiego trzeba złożyć wniosek.',
  },
  'terminyDni.rezygnacjaMatkiPrzed': {
    etykieta: 'Wniosek matki o powrót do pracy (dni przed)',
    dotyczy: 'Ile dni przed powrotem do pracy matka składa wniosek o rezygnację z reszty urlopu.',
  },
  'terminyDni.przejecieOjcaPrzed': {
    etykieta: 'Wniosek ojca o przejęcie urlopu (dni przed)',
    dotyczy: 'Ile dni przed przejęciem urlopu ojciec składa wniosek.',
  },
  'terminyDni.wniosekUzupelniajacyPrzedKoncem': {
    etykieta: 'Wniosek o urlop uzupełniający (dni przed końcem macierzyńskiego)',
    dotyczy: 'Ile dni przed końcem urlopu macierzyńskiego trzeba złożyć wniosek o urlop uzupełniający.',
  },
  'terminyDni.wniosekLaczeniePrzed': {
    etykieta: 'Wniosek o łączenie urlopu rodzicielskiego z pracą (dni przed)',
    dotyczy: 'Ile dni przed rozpoczęciem łączenia z pracą trzeba złożyć wniosek.',
  },
  'terminyDni.wniosekNaWarunkachMacierzynskiegoPo': {
    etykieta: 'Wniosek o urlop na warunkach urlopu macierzyńskiego (dni po przyjęciu dziecka)',
    dotyczy: 'W ciągu ilu dni od przyjęcia dziecka na wychowanie trzeba złożyć wniosek o ten urlop.',
  },

  'kwoty.placaMinimalna': {
    etykieta: 'Płaca minimalna (zł brutto)',
    dotyczy: 'Płaca minimalna dla pełnego etatu; od niej zależy najniższa podstawa zasiłku.' + KALKULATOR,
  },
  'kwoty.skladkiPracownikaProc': {
    etykieta: 'Składki finansowane przez ubezpieczonego (%)',
    dotyczy: 'Część składek finansowana przez ubezpieczonego, odliczana od podstawy zasiłku.' + KALKULATOR,
  },
  'kwoty.swiadczenieRodzicielskie': {
    etykieta: 'Świadczenie rodzicielskie (zł miesięcznie)',
    dotyczy: 'Kwota świadczenia rodzicielskiego z gminy; do tej kwoty podwyższa się zbyt niski miesięczny zasiłek.' + KALKULATOR,
  },
  'kwoty.maxPodstawaSkladkiDobrowolne': {
    etykieta: 'Maksymalna podstawa składki przy dobrowolnym chorobowym (zł)',
    dotyczy: 'Górny limit podstawy składki, a więc i zasiłku, przy dobrowolnym ubezpieczeniu chorobowym.' + KALKULATOR,
  },
  'kwoty.najnizszaPodstawaDzialalnosc': {
    etykieta: 'Najniższa podstawa dla działalności gospodarczej (zł)',
    dotyczy: 'Najniższa podstawa składek dla osób prowadzących działalność; od niej zależy podstawa zasiłku przy krótkim ubezpieczeniu.' + KALKULATOR,
  },
  'kwoty.podstawaPreferencyjnaProcPlacyMinimalnej': {
    etykieta: 'Składki preferencyjne: podstawa (% płacy minimalnej)',
    dotyczy: 'Podstawa składek na preferencyjnych zasadach jako procent płacy minimalnej.' + KALKULATOR,
  },
  'kwoty.dniWMiesiacuDoStawkiDziennej': {
    etykieta: 'Dni w miesiącu do stawki dziennej',
    dotyczy: 'Przez tyle dni dzieli się miesięczną kwotę zasiłku, żeby otrzymać stawkę dzienną.' + KALKULATOR,
  },

  'podatek.zaliczkaProc': {
    etykieta: 'Zaliczka na podatek dochodowy (%)',
    dotyczy: 'Stawka zaliczki na podatek od zasiłku, potrzebna do szacunku kwoty „na rękę”.' + KALKULATOR,
  },
  'podatek.kwotaZmniejszajacaMiesiecznie': {
    etykieta: 'Kwota zmniejszająca zaliczkę (zł miesięcznie)',
    dotyczy: 'Miesięczna kwota zmniejszająca zaliczkę na podatek w szacunku „na rękę”.' + KALKULATOR,
  },
};
