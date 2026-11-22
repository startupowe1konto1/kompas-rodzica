# Pytania do ZUS

Stan: 21.11.2026, ok. 14:40. Zasada zespołu: **gdy przepis nie rozstrzyga sprawy wprost, nie decydujemy sami.** Zapisujemy pytanie tutaj, idziemy z nim na stoisko ZUS, a do czasu odpowiedzi aplikacja mówi rodzicowi „to wymaga potwierdzenia w ZUS” zamiast podawać zgadnięty wynik.

**Numeracja od 21.11, 17:00 (żeby tory nie dublowały numerów):** nowe pytania toru A od 50, toru B od 60, toru C od 70, toru D od 80.

Jak dopisać pytanie: numer, przepis, czego dotyczy w kodzie (EC albo zadanie), wariant przyjęty tymczasowo. Po odpowiedzi wpisz ją pod pytaniem z godziną i nazwiskiem pytającego.

## Decyzja po rozmowie na stoisku (21.11, ok. 17:00)

Mentorka ZUS: odpowiedzi na pozostałe pytania wynikają z przepisów, a te przypadki są bardzo rzadkie i jury raczej ich nie sprawdzi. Dla ZUS najważniejsze są **uprawnienia**; na wysokość zasiłku jury spojrzy łagodniej.

Dlatego **nie pytamy dalej**. Pytania bez odpowiedzi (7 – kiedy 38 tygodni, 9, 13, 17 – wydłużenie a 9 tygodni, 18, 19 – urlop przed porodem i późniejszy poród, 21, 24, 26–28, 38, 40, 41, 45 oraz pytania torów B i D) zostają przy wariancie „Tymczasowo”, który opiera się na przepisie tam, gdzie się da. W aplikacji takie wyniki mają dopisek „wymaga potwierdzenia w ZUS” – to uczciwe wobec rodzica i nie blokuje pracy.

## Stan po sprawdzeniu źródeł (21.11, ok. 17:00)

Każde pytanie sprawdziliśmy w dokumentach od organizatora (Poradnik dla rodziców ZUS 2026, załącznik ZUS, treść zadania, wyciągi KP i UZ, rozporządzenia), w pełnych tekstach jednolitych (KP Dz.U. 2026 poz. 1245, UZ Dz.U. 2026 poz. 854, ustawa systemowa Dz.U. 2026 poz. 1474, KC Dz.U. 2026 poz. 795 – api.sejm.gov.pl) i na zus.pl / gov.pl. Blogi i portale nie są dowodem.

**Rozstrzygnięte – nie pytamy ZUS:**

| Nr | Odpowiedź | Źródło |
|---|---|---|
| 1 | Porównujemy miesięczny zasiłek **po zaliczce na podatek** z kwotą świadczenia rodzicielskiego; od podwyższenia nie pobiera się PIT. Wariant „brutto” usuwamy (tor B). | zus.pl „Zasiłek macierzyński – wysokość”; Poradnik ZUS 2026 s. 20 |
| 2 | Podwyższenie **nie przysługuje** za okres urlopu ojcowskiego (ani dla zasiłku w wysokości zasiłku macierzyńskiego). | zus.pl „Zasiłek macierzyński – wysokość” |
| 3 | Sumujemy zasiłki po zaliczce ze wszystkich tytułów; podwyższenie wypłaca ZUS, jeśli jest wśród płatników, inaczej płatnik wskazany przez ubezpieczonego. | UZ art. 62 ust. 5–6; Poradnik s. 20 |
| 4 | Stawka dzienna = podstawa ÷ 30 × stawka, **do grosza**, potem × liczba dni (przykłady liczbowe ZUS). Świadczenie rodzicielskie za część miesiąca: kwota ÷ dni miesiąca × dni, wynik w górę do 10 gr. Nasz wzorzec jest zgodny. | wyjaśnienie ZUS „Podwyższenie kwoty zasiłku macierzyńskiego…”, przykłady 3–4, 7–9; zus.pl „Wysokość” |
| 11 | Pracownik (także u płatnika do 20 osób) **nie składa ZAM** – wniosek o urlop do pracodawcy, pracodawca przekazuje Z-3. ZAM składają zleceniobiorcy (do płatnika) i przedsiębiorcy (do ZUS). | zus.pl „Jak uzyskać zasiłek macierzyński…”; Poradnik s. 35–36 |
| 12 | Ostatni dzień urlopu ojcowskiego = **dzień przed pierwszymi urodzinami** (wiek kończy się z początkiem dnia urodzin). Przy przysposobieniu: ta sama data 12 miesięcy po uprawomocnieniu, nie dłużej niż dzień przed 14. urodzinami. | KC art. 112 (przez KP art. 300); Poradnik s. 34 |
| 20 | Przy porodzie wcześniejszym niewykorzystane dni „przed porodem” w całości przechodzą na okres po porodzie. | KP art. 180 § 3; zus.pl (opis spraw) |
| 25 | Art. 17 ust. 1–1c UZ obowiązuje od **13.04.2026**, ust. 1d–1e od **1.01.2027**. | UZ t.j. przypisy 4–7; Dz.U. 2026 poz. 26 art. 43 |
| 42 (tor C) | Osobie współpracującej i przedsiębiorcy zasiłek **zawsze wypłaca ZUS**; progu „ponad 20” nie stosuje się. | UZ art. 61 ust. 1 pkt 2 lit. b; Poradnik s. 27, 29 |
| 43 (tor C) | Zlecenie z własnym pracodawcą albo wykonywane na jego rzecz = status pracownika, **chorobowe obowiązkowe**; każde inne zlecenie – dobrowolne. | ustawa systemowa art. 8 ust. 2a, art. 11; Poradnik s. 7–10 |
| 44 (tor C) | „Wyrejestrowanie” ma sens dla zlecenia z dobrowolnym chorobowym i działalności; przy etacie chorobowe trwa do ustania stosunku pracy (= `koniec_umowy`). | ustawa systemowa art. 13, art. 14 ust. 2 |

**Rozstrzygnięte częściowo – wynik wpisany do kodu, pytamy ZUS tylko o resztę** (pytania niżej mają zawężoną treść w punkcie „Zostaje”):
- 7: zasiłek na warunkach macierzyńskiego trwa **co najmniej 9 tygodni** (63 dni) nawet przy limicie wieku (zus.pl, załącznik ZUS). Zostaje: kiedy rodzicielski wynosi 38 tygodni.
- 13: miesiące ciąży liczy się jako **księżycowe, po 28 dni** (Zielona Linia gov.pl, źródło informacyjne). Zostaje: od jakiej daty ZUS liczy początek ciąży.
- 17: wydłużenie = dni łączenia × wymiar, niepełny dzień pomija się (przykład ZUS: 14 dni × 1/3 → 4 dni). Zostaje: czy wydłużenie wlicza się do 9 tygodni.
- 18: praca u innego pracodawcy w czasie rodzicielskiego jest dozwolona i nie jest łączeniem (Zielona Linia za PIP). Zostaje: skutek dla zasiłku.
- 19: limit 6 tygodni liczy się od przewidywanej daty, dni przed faktycznym porodem zmniejszają pulę. Zostaje: dni między przewidywaną a faktyczną datą.
- 23: 21 dni liczymy od dnia po porodzie (KC art. 111 § 2). Zostaje: czy wniosek złożony przed porodem jest skuteczny.
- 24: kategorię wcześniaka wpisuje szpital w zaświadczeniu (KP art. 180² § 5). Zostaje: czy dzień porodu wlicza się do pobytu.

**Progi ryzyk (26, 27, 28):** ZUS nie publikuje żadnych progów. W aplikacji to założenia zespołu, opisane jako „nasze założenie, nie kryterium ZUS”. Parametr 90 dni (28) nie może powoływać się na UZ art. 4 – to okres wyczekiwania na zasiłek chorobowy, nie próg dla macierzyńskiego.

## Pilne (blokują poprawność kalkulatora)

**1. Podwyższenie zasiłku do kwoty świadczenia rodzicielskiego: brutto czy po zaliczce na podatek?**
Art. 31 ust. 3a ustawy zasiłkowej mówi o „miesięcznej kwocie zasiłku obliczonego zgodnie z ust. 1–3” i nie wspomina o podatku. Strona zus.pl i sprawa, którą widzieliśmy, wskazują porównanie po zaliczce.
- Dotyczy: tor B, EC-90, EC-18.
- Ustalenie ze źródeł (tor B, 21.11 ok. 15:15): **po zaliczce**. Tak mówią Poradnik ZUS 2026 dla rodziców (materiały dla uczestników, s. 19), strona zus.pl „Podwyższenie kwoty zasiłku macierzyńskiego do wysokości świadczenia rodzicielskiego” i Komentarz ZUS do ustawy zasiłkowej (2023, pkt 191). Od samego podwyższenia zaliczki nie ma. Słowa „pomniejszonego o zaliczkę” były w art. 31 ust. 3a w tekstach jednolitych z lat 2017–2021; w obecnym (Dz.U. 2026 poz. 854) ich nie ma, a aktu, który je usunął, nie znaleźliśmy.
- W aplikacji: liczymy po zaliczce (wariant brutto usuwamy, zgodnie z rozstrzygnięciem w tabeli wyżej).
- Odpowiedź:

**2. Czy podwyższenie dotyczy zasiłku za okres urlopu ojcowskiego?**
Art. 31 ust. 3a odsyła do ust. 1–3, a ust. 1 obejmuje urlop ojcowski. Research (zus.pl) twierdzi, że za ojcowski podwyższenia nie ma.
- Dotyczy: tor B, EC-90b.
- Ustalenie ze źródeł (tor B): **nie dotyczy**. zus.pl: podwyższenie „nie przysługuje ubezpieczonemu pobierającemu zasiłek macierzyński za okres ustalony przepisami Kodeksu pracy jako okres urlopu ojcowskiego oraz osobie pobierającej zasiłek w wysokości zasiłku macierzyńskiego”. Sam ust. 3a tego wyłączenia nie zapisuje.
- W aplikacji: bez podwyższenia za ojcowski i za zasiłek w wysokości zasiłku macierzyńskiego.
- Odpowiedź:

**3. Podwyższenie przy kilku tytułach ubezpieczenia:** czy porównujemy sumę zasiłków ze wszystkich tytułów i kto wypłaca podwyższenie?
- Dotyczy: tor B, EC-18.
- Ustalenie ze źródeł (tor B): **suma po zaliczce ze wszystkich tytułów, jedno podwyższenie o różnicę**; wypłaca płatnik zasiłku, przy kilku płatnikach wskazuje go uprawniony, a jeśli jednym z nich jest ZUS – ZUS (zus.pl, przykład 4; Poradnik ZUS 2026, s. 19). Część miesiąca: 1000 zł ÷ dni kalendarzowe miesiąca (do grosza) × dni zasiłku, wynik w górę do 10 gr (zus.pl, przykład 3).
- Odpowiedź:

**4. Jak ZUS zaokrągla?** Stawka dzienna to 1/30 podstawy (art. 36 ust. 3). Czy zaokrągla się stawkę dzienną do grosza, a potem mnoży przez liczbę dni, czy zaokrągla dopiero kwotę za okres?
- Dotyczy: tor B, cały kalkulator i przykład wzorcowy.
- Ustalenie ze źródeł (tor B): przykłady ZUS liczą **stawkę dzienną do grosza, potem × liczba dni, bez dalszego zaokrąglania** (np. „42,57 zł [(1.277,09 zł : 30) x 100%]”, „31 x 42,57 zł = 1.319,67 zł” – zus.pl, przykład 7; Komentarz ZUS 2023). Tak liczy aplikacja.
- Zostaje do potwierdzenia: przy stawce innej niż 100% (70%, 81,5%) – czy 1/30 podstawy zaokrągla się przed pomnożeniem przez stawkę, czy dopiero wynik? Aplikacja zaokrągla raz, na końcu.
- Odpowiedź:

**5. Ojciec przejmuje część urlopu macierzyńskiego: jaka stawka i czyja podstawa?** W szczególności gdy matka wybrała 81,5%.
- Dotyczy: tor B, EC-70. Research: stawka jak u matki, podstawa ojca (pewność średnia).
- Odpowiedź: Tata przejmuje stawkę 81,5% wybraną przez mamę. Warunek wariantu 81,5%: co najmniej 1 dzień urlopu rodzicielskiego przed pierwszymi urodzinami dziecka. Czyja podstawa – nie padło wprost (zostaje podstawa taty). (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**6. Matka nieubezpieczona, ojciec ubezpieczony (art. 31 ust. 3h):** za jaki okres ojciec ma zasiłek (pełne 41 tygodni czy bez 9 tygodni matki) i w jakiej wysokości (70% czy może wybrać 81,5%)?
- Dotyczy: tor A i B, EC-56.
- Odpowiedź: Tata dostaje zasiłek za **32 tygodnie** (41 − 9), bo 9 tygodni jest wyłącznie dla mamy. Bierze tylko rodzicielski, bez wyboru 81,5% (wniosek o 81,5% składa mama). (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

## Ważne (uprawnienia i wymiar)

**7. Art. 183 § 3 Kodeksu pracy (9 tygodni + 38 tygodni rodzicielskiego): kiedy stosuje się § 3 zamiast § 1?**
Liczby 9, 38 i 62 są w przepisie. Nie jest dla nas jasne, w jakiej sytuacji: czy wtedy, gdy limit wieku dziecka (7, 10 albo 14 lat) skróciłby urlop z § 1 poniżej 9 tygodni?
- Dotyczy: tor A, EC-44.
- Tymczasowo: wynik „wymaga potwierdzenia w ZUS”.
- Odpowiedź: Niepewnie („wydaje mi się”): 38 tygodni, gdy dziecko jest przyjęte tak późno, że do 14. urodzin nie da się wykorzystać pełnego urlopu – urlop się skraca. Zostaje „do potwierdzenia”. (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**8. Martwe urodzenie: czy po 8 tygodniach urlopu macierzyńskiego przysługuje urlop rodzicielski albo ojcowski?**
- Dotyczy: tor A, EC-24. Tymczasowo: nie przysługuje, z dopiskiem „do potwierdzenia”.
- Odpowiedź: Po martwym urodzeniu **nie przysługuje** ani ojcowski, ani rodzicielski. Mama ma macierzyński 8 tygodni po porodzie (połóg, obowiązkowo), nie krócej niż 7 dni od śmierci dziecka. O zgonie dziecka po 8. tygodniu i bliźniętach – nie padło. (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**9. Poród w czasie urlopu wychowawczego: z czego liczy się podstawę wymiaru?**
- Dotyczy: tor B, EC-14.
- Odpowiedź: Niepewnie: podstawa z okresu przed urlopem wychowawczym. Mentor: to rzadki przypadek, jury raczej go nie sprawdzi. (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**10. Łączenie urlopu rodzicielskiego z pracą u osób bez etatu (zlecenie, działalność):** czy okres zasiłku się wydłuża i czy zasiłek się zmniejsza?
- Dotyczy: tor A i B, EC-85. Tymczasowo: wydłużenie tylko dla pracowników.
- Odpowiedź: W czasie zasiłku za okres urlopu **macierzyńskiego** praca generalnie nie jest przewidziana (ZUS tego nie weryfikuje). Przy **rodzicielskim** łączenie z pracą tylko u tego samego pracodawcy, maks. pół etatu, urlop się wydłuża proporcjonalnie. O zleceniu i firmie nie padło wprost. (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**11. Kiedy składa się ZAM?** Czy pracownik, któremu zasiłek wypłaca ZUS (płatnik do 20 osób), składa ZAM, czy wystarczy wniosek o urlop do pracodawcy i Z-3?
- Dotyczy: tor D, D2.
- Odpowiedź:

**12. Do kiedy można wykorzystać urlop ojcowski:** ostatni możliwy dzień to dzień przed pierwszymi urodzinami dziecka czy dzień urodzin?
- Dotyczy: tor A, pole `ojcowskiDoKiedy`.
- Odpowiedź:

**13. Koniec 3. miesiąca ciąży (art. 177 § 3 KP):** jak ZUS i pracodawcy liczą ten termin (od daty z zaświadczenia lekarskiego)?
- Dotyczy: tor A, EC-05, EC-06. Tymczasowo: przewidywana data porodu minus 280 dni plus 3 miesiące.
- Odpowiedź:

## Planer (tor A, dopisane 21.11 ok. 16:00)

Wyciąg KP i UZ sprawdzony: poniższych spraw tekst nie rozstrzyga wprost.

**14. 9 tygodni drugiego rodzica, gdy drugiego rodzica „nie ma” (KP art. 182¹a § 4):** czy jeden rodzic może wykorzystać całą pulę rodzicielskiego, gdy drugi nie żyje, jest pozbawiony władzy rodzicielskiej albo nie jest pracownikiem ani ubezpieczonym? Przepis nie przewiduje wyjątków.
- Dotyczy: tor A, A5 (`RODZ_NIEPRZENOSZALNE`), EC-56.
- Tymczasowo: 9 tygodni drugiego rodzica przepada; wynik „do potwierdzenia w ZUS”.
- Odpowiedź: 9 tygodni jest wyłącznie dla danego rodzica i nie przechodzi na drugiego (odpowiedź przy pytaniu 6). (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**15. Urlop rodzicielski w dniach czy w pełnych tygodniach?** KP art. 182¹a § 1 mówi „w wymiarze do 41 tygodni”, ale nie mówi, czy część urlopu może mieć np. 10 tygodni i 3 dni (ważne przy podziale „po równo”, np. 30,5 tygodnia na osobę).
- Dotyczy: tor A, A4 (`po-rowno`), A6 (`podziel`, `zmien_koniec`).
- Tymczasowo: części rodzicielskiego tylko w pełnych tygodniach.
- Odpowiedź: **Tylko pełne tygodnie.** (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**16. Czy rodzicielski ojca może się zacząć, zanim matka skończy urlop macierzyński?** KP art. 182¹a § 6–7 pozwala na jednoczesny rodzicielski obojga, ale nie mówi o nakładaniu się z macierzyńskim matki.
- Dotyczy: tor A, A5 (`RODZ_PRZED_KONCEM_MAC`).
- Tymczasowo: błąd – rodzicielski dopiero po wykorzystaniu macierzyńskiego.
- Odpowiedź: **Tak, może.** Rodzicielski taty może się zacząć, zanim mama skończy macierzyński. (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**17. Łączenie urlopu rodzicielskiego z pracą przez niepełne tygodnie (KP art. 182¹f § 2):** jak liczyć „liczbę tygodni” łączenia, gdy okres nie jest wielokrotnością tygodnia? Czy wydłużenie wlicza się do 9 tygodni wyłącznych rodzica?
- Dotyczy: tor A, A5 (`LACZENIE_WYDLUZA_URLOP`), A6 (`polacz_z_praca`).
- Tymczasowo: tygodnie łączenia = dni ÷ 7 (z ułamkiem), wydłużenie w dniach w dół (§ 4); wydłużenie nie wlicza się do 9 tygodni.
- Odpowiedź:

**18. Praca u innego pracodawcy w czasie urlopu rodzicielskiego:** czy wolno i jaki ma skutek dla zasiłku? (KP art. 182¹e mówi tylko o pracy u pracodawcy, który udzielił urlopu.)
- Dotyczy: tor A, EC-84.
- Tymczasowo: ostrzeżenie, że to nie jest łączenie w rozumieniu KP i nie wydłuża urlopu.
- Odpowiedź:

**19. Poród później niż przewidywany (KP art. 180 § 2–3):** czy urlop wzięty przed porodem może wtedy przekroczyć 6 tygodni i jak rozlicza się dni między przewidywaną a faktyczną datą porodu?
- Dotyczy: tor A, A6 (`przesunPlan`, EC-34).
- Tymczasowo: dni przed faktycznym porodem zużywają pulę (§ 3), reszta po porodzie; ostrzeżenie „do potwierdzenia”, gdy przed porodem wyszło ponad 6 tygodni.
- Odpowiedź: Jeśli mama nie zaczęła urlopu przed porodem: do porodu pracuje albo jest na zwolnieniu (zasiłek chorobowy), macierzyński od dnia porodu. O urlopie zaczętym przed porodem i późniejszym porodzie – nie padło. (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**20. Poród wcześniej niż przewidywany:** czy niewykorzystane tygodnie „przed porodem” w całości przechodzą na okres po porodzie?
- Dotyczy: tor A, A6 (`przesunPlan`, EC-34).
- Tymczasowo: tak, według KP art. 180 § 3 („aż do wyczerpania wymiaru”).
- Odpowiedź:

**21. Kto jest „członkiem najbliższej rodziny”** przejmującym urlop macierzyński (KP art. 175 pkt 3–4, UZ art. 29 ust. 5)? Wyciąg nie wylicza tych osób.
- Dotyczy: tor A, A2 (rola `inny_czlonek_rodziny`), A3 (`przejecie_sytuacja_szczegolna`).
- Tymczasowo: każda osoba z rolą `inny_czlonek_rodziny` z ubezpieczeniem chorobowym, z dopiskiem „do potwierdzenia”.
- Odpowiedź: Bez pewności; w praktyce „głównie dziadkowie albo rodzeństwo” mamy. Zostaje „do potwierdzenia”, w tekstach przykład: dziadkowie, rodzeństwo. (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**22. Przyjęcie dziecka: czy oboje przyjmujący mogą korzystać z urlopu na warunkach urlopu macierzyńskiego** (KP art. 183 § 1, § 1¹ mówią o „pracowniku”)?
- Dotyczy: tor A, A2 (EC-40–43).
- Tymczasowo: na warunkach macierzyńskiego jedna osoba; rodzicielski oboje.
- Odpowiedź: **Nie.** Na warunkach urlopu macierzyńskiego jest jedna osoba (jak macierzyński); jednocześnie oboje mogą być tylko na rodzicielskim. (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**23. Wniosek o 81,5% złożony przed porodem (UZ art. 30a ust. 1):** czy jest skuteczny i czy dzień porodu wlicza się do 21 dni?
- Dotyczy: tor A, A5 (`WARIANT_815_PO_TERMINIE`), `Pule.wniosek815DoKiedy`.
- Tymczasowo: wniosek przed porodem skuteczny; 21 dni liczone od dnia po porodzie (poród 1.12 → ostatni dzień 22.12).
- Odpowiedź: Niepewnie („chyba”): wniosek o 81,5% przed porodem jest ważny tylko wtedy, gdy mama zaczyna urlop macierzyński przed porodem (do 6 tygodni przed). Inaczej – po porodzie, do 21 dni. (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**24. Uzupełniający: granice „przed ukończeniem” i „po ukończeniu” 28. i 37. tygodnia ciąży (KP art. 180² § 1):** czy np. 28 tygodni i 0 dni to już „po ukończeniu 28. tygodnia”? Czy dzień porodu liczy się do pobytu w szpitalu?
- Dotyczy: tor A, A1 (EC-28–31).
- Tymczasowo: `tydzienCiazy` = ukończone tygodnie; 28 = „po ukończeniu 28.”; dzień porodu wlicza się do pobytu.
- Odpowiedź:

**25. Od kiedy obowiązują art. 17 ust. 1–1c ustawy zasiłkowej w obecnym brzmieniu** (praca zarobkowa w czasie zwolnienia)? Wyciąg ma datę tylko dla ust. 1d–1e (1.01.2027).
- Dotyczy: tor A, A3 (ryzyko `PRACA_NA_ZWOLNIENIU`).
- Odpowiedź:

**26. Kiedy ZUS zwykle sprawdza, czy umowa nie jest zawarta dla pozoru?** Przepis nie podaje progu. Chcemy łagodnie uprzedzić rodzica („ZUS może poprosić o wyjaśnienia”) i podpowiedzieć, jakie dokumenty mieć pod ręką. Ile czasu przed ciążą albo porodem musi zacząć się umowa o pracę lub zlecenie, żeby ZUS zwykle o nią nie pytał?
- Dotyczy: tor A, A3 (ryzyko `UMOWA_DLA_POZORU`), EC-16.
- Tymczasowo: karta, gdy tytuł zaczął się w ciąży albo do 3 miesięcy przed jej początkiem (parametr w panelu admina).
- Odpowiedź:

**27. Od jakiego wzrostu wynagrodzenia albo podstawy składek w ciąży ZUS zwykle prosi o wyjaśnienia?** Przepis nie podaje progu.
- Dotyczy: tor A, A3 (ryzyko `PODWYZSZENIE_PODSTAWY_W_CIAZY`), EC-17.
- Tymczasowo: karta, gdy średnia z miesięcy w ciąży jest wyższa o co najmniej 20% od średniej sprzed ciąży (parametr w panelu admina).
- Odpowiedź:

**28. Działalność: ile dni przed porodem zgłoszenie do dobrowolnego chorobowego ZUS uznaje za „późne”?** Mentor mówił o zgłoszeniu „około miesiąc przed porodem”.
- Dotyczy: tor A, A3 (ryzyko `POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA`), EC-10.
- Tymczasowo: 90 dni (`limity.ostrzezeniePozneZgloszenieDni`).
- Odpowiedź:

**29. Jak liczyć „w terminie niekrótszym niż X dni przed” (KP art. 180 § 8 i § 9, 182¹d, 182¹e, 182³)?** Czy ostatni dzień na wniosek to dzień rozpoczęcia urlopu (albo powrotu do pracy) minus X, czy między złożeniem a rozpoczęciem musi być X pełnych dni? Druga wykładnia daje termin o dzień wcześniej.
- Dotyczy: tor D, D2 (`terminyDlaPlanu`); ZADANIA D2, wiersz „przejęcie” podaje 2027-03-01, a metoda „dzień − 7” daje 2027-03-02.
- Tymczasowo: dzień − X (jak w przykładzie wzorcowym); w opisie terminu radzimy złożyć wniosek kilka dni wcześniej.
- Odpowiedź: Bez odpowiedzi ZUS – zostaje bezpieczne założenie: dzień − X, a opis terminu radzi złożyć wniosek kilka dni wcześniej.

**30. Zgon dziecka a urlop ojcowski:** co z urlopem ojcowskim, który trwa albo był zaplanowany, gdy dziecko umrze? KP art. 182³ § 3 nie odsyła do zasady „7 dni od zgonu” z art. 180¹ § 2 (rodzicielski odsyła do niej przez art. 182¹g).
- Dotyczy: tor D, D6 (`src/content/trudneSytuacje.ts`), tor A (pule po zgonie dziecka).
- Tymczasowo: treść mówi „do potwierdzenia w ZUS” (`DO_POTWIERDZENIA_W_ZUS`).
- Odpowiedź:

**31. Śmierć mamy a 9 nieprzenoszalnych tygodni urlopu rodzicielskiego:** czy tata może wykorzystać także tygodnie, które były tylko dla mamy? Przepisy: KP art. 182¹a § 4 i art. 182¹g w związku z art. 180 § 12.
- Dotyczy: tor D, D6; tor A (pule, `RODZ_NIEPRZENOSZALNE`).
- Tymczasowo: „do potwierdzenia w ZUS”.
- Odpowiedź:

**32. ZAM przy przejęciu urlopu macierzyńskiego przez ojca:** zaznacza się tylko okoliczność 5 („sytuacja matki”), czy także okoliczność 1 („urodzenie dziecka”)?
- Dotyczy: tor D, D3 (`src/forms/zam-mapowanie.ts`). Tymczasowo: tylko okoliczność 5.
- Odpowiedź:

**33. ZAM dla urlopu od przewidywanego dnia porodu:** składa się go dopiero po porodzie, z okolicznością 1 i danymi dziecka? Okoliczność 2 zaznaczamy tylko przy urlopie zaczętym przed porodem.
- Dotyczy: tor D, D3. Odpowiedź:

**34. Czy w ZAM wypełnionym komputerowo ZUS wymaga wielkich liter?** Formularz mówi „Wypełnij WIELKIMI LITERAMI”, a my wpisujemy dane tak, jak je podano.
- Dotyczy: tor D, D3. Odpowiedź:

**35. Wniosek o kolejną część urlopu rodzicielskiego:** czy „dotychczas wykorzystany urlop i liczba części” obejmuje części obojga rodziców, czy tylko wnioskodawcy?
- Dotyczy: tor D, D5 (`src/forms/pracodawca.ts`). Tymczasowo: tylko wnioskodawcy.
- Odpowiedź: Części liczą się dla obojga rodziców razem (odpowiedź przy pytaniu 39) (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**36. Wariant 81,5%, gdy zasiłek wypłaca ZUS:** czy potrzebny jest osobny pisemny wniosek (UZ art. 30a), czy wystarczy pole „Informuję…” na ZAM?
- Dotyczy: tor D, D2 i D3. Odpowiedź:

## Kalkulator (tor B, dopisane 21.11 ok. 16:00)

Tor B numeruje pytania od 60 (zasada numeracji z góry pliku), więc mają numery 60–63.

**60. Zasiłek trwa przez 1 stycznia, a od tego dnia rośnie płaca minimalna (2026: 4806 zł, 2027: 4950 zł). Czy podstawę podnosi się do nowego minimum (UZ art. 45 w zw. z art. 47) za dni od 1 stycznia?**
Art. 45 mówi, że podstawa „nie może być niższa” od minimum, ale nie mówi, czy ustala się ją na nowo w trakcie pobierania zasiłku (art. 43 każe nie ustalać podstawy na nowo przy przerwie krótszej niż miesiąc).
- Dotyczy: tor B, EC-97 (poród 1.12.2026, urlop do kwietnia 2027, pensja poniżej płacy minimalnej; także zwolnienie w ciąży od listopada 2026 i poród w styczniu 2027).
- Tymczasowo: od 1.01.2027 liczymy od nowego minimum; wynik ma dopisek „do potwierdzenia w ZUS”.
- Przy okazji: minimum 2027 to 4950 zł × 86,29% = 4271,355 zł, czyli dokładnie pół grosza. Liczymy 4271,36 (mnożenie przez 86,29%, jak w załączniku ZUS: 23 550 → 20 321,30). Odejmując zaokrągloną składkę 13,71% (678,65 zł) wychodzi 4271,35. Którą kwotę przyjmuje ZUS?
- Odpowiedź: Rozstrzygnięte z przepisu (tor D, 21.11 wieczór): UZ art. 30a wymaga „pisemnego wniosku”; pole „Informuję…” na ZAM jest takim wnioskiem, gdy płaci ZUS. Aplikacja daje i pole na ZAM, i osobny wniosek – nadmiar nie szkodzi.

**61. Minimum z art. 45 przy niepełnym etacie:** czy dla zasiłku macierzyńskiego minimum jest proporcjonalne do wymiaru etatu (pół etatu = połowa płacy minimalnej minus 13,71%)?
Komentarz ZUS do ustawy zasiłkowej (2023, pkt 318) mówi tak dla zasiłku chorobowego; art. 47 odsyła do art. 45 przy macierzyńskim. Poradnik ZUS 2026 podaje minimum tylko dla pełnego etatu (s. 25).
- Dotyczy: tor B, B1 (EC-91b).
- Tymczasowo: proporcjonalnie do etatu.
- Odpowiedź:

**62. Składniki wynagrodzenia z Z-3, których aplikacja nie rozróżnia:** czy dobrze rozumiemy, że kolumna 6 (składniki stałe) to pełna kwota z umowy, kolumna 7 (zmienne) – kwota wypłacona, którą ZUS uzupełnia, a kolumna 8 (premie i inne w kwocie faktycznej, np. nadgodziny) nie jest uzupełniana? Czy wyłączenie miesiąca przepracowanego w mniej niż połowie dotyczy tylko nieobecności usprawiedliwionych (kolumna 5)?
- Dotyczy: tor B, B2. Kontrakt danych ma dziś tylko kolumny 6 i 7; każdą nieobecność traktujemy jako usprawiedliwioną.
- Odpowiedź:

**63. Podwyższenie do kwoty świadczenia rodzicielskiego przy łączeniu urlopu rodzicielskiego z pracą: którą kwotę zasiłku porównuje się z 1000 zł?**
Art. 31 ust. 3a porównuje z kwotą świadczenia rodzicielskiego zasiłek „obliczony zgodnie z ust. 1–3”. Ust. 4a zmniejsza zasiłek proporcjonalnie do wymiaru pracy. Nie wiemy, czy ZUS porównuje zasiłek sprzed zmniejszenia, czy kwotę faktycznie wypłacaną, ani od której z nich odejmuje zaliczkę. Przykład: pół etatu, 2500 zł, w czerwcu pracuje 0,8 wymiaru w czasie urlopu rodzicielskiego. Zasiłek przed zmniejszeniem 1510,20 zł, wypłacany 302,10 zł, więc podwyższenie wynosi 0 zł albo 733,90 zł.
- Dotyczy: tor B, kalkulator (podwyższenie, łączenie z pracą, EC-80).
- Tymczasowo: porównujemy zasiłek sprzed zmniejszenia (dosłowne brzmienie ust. 3a), pomniejszony o zaliczkę policzoną od tej kwoty. Gdy od kwoty wypłacanej wyszłoby podwyższenie, wynik ma dopisek „do potwierdzenia w ZUS”.
- Odpowiedź:

## Źródła danych i symulacje

13 pytań o to, co naprawdę widać w eZUS, mObywatelu i innych usługach, jest w [zrodla-danych.md](zrodla-danych.md), sekcja (d). Najważniejsze: które pola wniosku ZAM eZUS podpowiada sam i czy numer rachunku jest na koncie ubezpieczonego.

## Poza ZUS (sprawdzamy sami w oficjalnym źródle)

Sprawdzone przez tor B 21.11 ok. 15:10 (szczegóły i adresy w `docs/superpowers/plans/2026-11-21-tor-b.md`, sekcja „Ustalenia z researchu”):
- Zaliczka od zasiłku: **12%** (ustawa o PIT art. 34 ust. 3, Dz.U. 2026 poz. 592); 1/12 kwoty zmniejszającej (**300 zł**) **tylko po oświadczeniu podatnika** (art. 31b ust. 1); podstawa i zaliczka w pełnych złotych (Ordynacja podatkowa art. 63 § 1). Zasiłek do 26. roku życia jest zwolniony (art. 21 ust. 1 pkt 148) – aplikacja tego jeszcze nie liczy.
- 2027: płaca minimalna **4950 zł** (Dz.U. 2026 poz. 1213); maks. podstawa dobrowolnego chorobowego **25 082,50 zł** (M.P. 2026 poz. 1120); prognozowane przeciętne wynagrodzenie **10 033 zł** (M.P. 2026 poz. 1098), więc najniższa podstawa dla działalności 6019,80 zł (wyliczenie 60%). Trzy pierwsze kwoty sprawdzone w PDF-ach aktów.
- Tekst jednolity ustawy zasiłkowej: **Dz.U. 2026 poz. 854** (API ELI Sejmu); zmiany od 1.01.2027 z Dz.U. 2026 poz. 26 nie dotyczą wysokości ani podstawy zasiłku macierzyńskiego.

## Potwierdzone w przepisie (nie pytamy)

- Zaległość składkowa: powyżej 1% płacy minimalnej wstrzymuje świadczenie do spłaty; prawo przedawnia się, jeśli zaległość nie zostanie spłacona w 6 miesięcy (UZ art. 2a).
- 9 tygodni urlopu rodzicielskiego drugiego rodzica zawsze 70% (UZ art. 31 ust. 3f).
- Praca zarobkowa w czasie zwolnienia odbiera zasiłek chorobowy za cały okres zwolnienia (UZ art. 17 ust. 1–1a).
- Wymiary przy przyjęciu dziecka: 9, 38 i 62 tygodnie istnieją w przepisie (KP art. 183 § 3, § 4 pkt 3, § 4³ pkt 3).

## Nowe pytania z przeglądów kodu toru A (21.11, ok. 17:30)

Numery 29–36 zajął tor D, dlatego te pytania mają 37–41.

**37. Do kiedy przysługuje urlop rodzicielski przy przysposobieniu i w rodzinie zastępczej?** KP art. 183 § 5 odsyła do art. 182¹c (koniec roku, w którym dziecko kończy 6 lat), a art. 183 § 4¹ przyznaje rodzicielski przy przysposobieniu dziecka do 14 lat. Dla starszego dziecka termin z art. 182¹c minął w chwili przyjęcia.
- Dotyczy: tor A, A1 (`rodzicielskiDoKiedy`), EC-40–43.
- Tymczasowo: art. 182¹c dosłownie, uwaga „do potwierdzenia”, gdy termin wypada przed końcem urlopu.
- Odpowiedź: Przy **przysposobieniu** urlop rodzicielski do **14. roku życia** dziecka. Przy rodzinie zastępczej „jest inaczej” – bez szczegółów. (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**38. Zasiłek w wysokości zasiłku macierzyńskiego do porodu (UZ art. 30 ust. 3): czy przysługuje także przy rozwiązaniu umowy z naruszeniem prawa?** Ustawa wymienia tylko śmierć, upadłość i likwidację pracodawcy; opis ZUS w zadaniu dodaje naruszenie prawa.
- Dotyczy: tor A, A2 (EC-07, EC-08).
- Tymczasowo: według ustawy – nie przysługuje.
- Odpowiedź:

**39. Limit 5 części urlopu rodzicielskiego (KP art. 182¹c, 182¹d § 2): dla każdego rodzica osobno czy dla obojga razem?** Art. 182¹d § 2 wlicza do części także wnioski o zasiłek drugiego rodzica.
- Dotyczy: tor A, A5 (`RODZ_ZA_DUZO_CZESCI`), EC-63.
- Tymczasowo: błąd przy > 5 częściach jednej osoby, ostrzeżenie „do potwierdzenia”, gdy razem jest ich ponad 5.
- Odpowiedź: **Razem** – limit 5 części dotyczy obojga rodziców łącznie. (stoisko ZUS, 21.11 ok. 16:30, pytał Oskar; nagranie rozmowy)

**40. Ustanie ubezpieczenia w ciąży (UZ art. 30 ust. 1): czy dotyczy także zlecenia (likwidacja zleceniodawcy) i czy zasiłek po ustaniu obejmuje też okres urlopu rodzicielskiego?** Przepis mówi o „pracodawcy”.
- Dotyczy: tor A, A2.
- Tymczasowo: tylko umowa o pracę „tak”; inne tytuły i rodzicielski po ustaniu – „do potwierdzenia”.
- Odpowiedź:

**41. Zaległość składkowa przy dwóch tytułach (UZ art. 2a):** osoba ma etat i działalność z zaległością powyżej 1% płacy minimalnej. Czy wstrzymany jest tylko zasiłek z działalności, a z etatu wypłacany normalnie?
- Dotyczy: tor A, A2 (EC-12b, EC-13).
- Tymczasowo: zasiłek z etatu przysługuje, część z działalności – „do potwierdzenia”.
- Odpowiedź:

**8 (rozszerzenie).** Oprócz martwego urodzenia: czy zgon dziecka po 8. tygodniu kończy też urlop rodzicielski 7 dni po zgonie (KP art. 182¹g w zw. z art. 180¹ § 2)? Przy porodzie mnogim, gdy żyje jedno dziecko – 41 czy 43 tygodnie rodzicielskiego?

## Ankieta (tor C, dopisane 21.11 ok. 15:30)

**42. Kto jest płatnikiem przy współpracy z osobą prowadzącą działalność i czy liczy się tu próg „ponad 20 ubezpieczonych”?**
- Dotyczy: tor C, ankieta (pytanie `platnik_powyzej_20`), tor D (kto wypłaca).
- Tymczasowo: pytanie o próg pokazujemy przy każdym tytule oprócz własnej działalności.
- Rozstrzygnięte ze źródeł – tabela „Stan po sprawdzeniu źródeł” na górze pliku.
- Odpowiedź:

**43. Umowa zlecenia z ubezpieczeniem chorobowym obowiązkowym:** kiedy zleceniobiorca ma chorobowe obowiązkowe zamiast dobrowolnego (np. zlecenie zawarte z własnym pracodawcą) i jak to pokazać w ankiecie?
- Dotyczy: tor C, ankieta (pytanie `chorobowe_dobrowolne`), tor A (uprawnienia).
- Tymczasowo: przy zleceniu pytamy tylko o dobrowolne chorobowe.
- Odpowiedź:

**44. Przyczyna ustania „wyrejestrowanie z ubezpieczenia”:** czy dotyczy także umów (etat, zlecenie), czy tylko działalności?
- Dotyczy: tor C, ankieta (pytania `ustanie_przyczyna_umowy`, `ustanie_przyczyna_firmy`), tor A (zasiłek po ustaniu ubezpieczenia).
- Tymczasowo: opcję pokazujemy przy umowach i przy działalności.
- Odpowiedź: rozstrzygnięte ze źródeł (tabela na górze pliku). Od 22.11 przy etacie opcji nie pokazujemy (`wgRodzaju.umowa_o_prace.opcje` w `ustanie_przyczyna_umowy`), a „koniec umowy” obejmuje wypowiedzenie i rozwiązanie umowy przez pracodawcę.

## Tor A (ciąg dalszy)

**45. Przyjęcie dziecka: czy osoba na urlopie na warunkach urlopu macierzyńskiego może przekazać jego część drugiej osobie, tak jak matka po 14 tygodniach?** KP art. 183 § 2 każe stosować art. 180 § 4–17 „odpowiednio”.
- Dotyczy: tor A, A4 (scenariusze przy przysposobieniu).
- Tymczasowo: przy przyjęciu dziecka aplikacja nie proponuje scenariuszy z przekazaniem urlopu.
- Odpowiedź:

## Tor D: dokumenty i terminy (dopisane 21.11, ok. 17:10)

**46. Kto wypłaca zasiłek za sam dzień porodu, gdy umowa przedłużona do dnia porodu (KP art. 177 § 3) jeszcze trwa:** duży pracodawca czy już ZUS (UZ art. 30 ust. 4)?
- Dotyczy: tor D, D2 (`src/engine/documents/ktoWyplaca.ts`), EC-05.
- Tymczasowo: ZUS od dnia porodu, zgodnie z brzmieniem art. 30 ust. 4.
- Odpowiedź:

**47. Umowa u dużego pracodawcy kończy się w trakcie pobierania zasiłku macierzyńskiego:** czy rodzic sam składa wtedy ZAM do ZUS za okres po ustaniu (UZ art. 61 ust. 1 pkt 2 lit. d), czy dokumenty przekazuje pracodawca?
- Dotyczy: tor D, D2. Dziś „kto wypłaca” pokazuje przejście na ZUS, ale lista dokumentów nie ma osobnego ZAM.
- Odpowiedź: Rozstrzygnięte z przepisu (tor D, 21.11 wieczór): od dnia po ustaniu płaci ZUS (UZ art. 61 ust. 1 pkt 2 lit. d), a postępowanie wszczyna wniosek złożony do ZUS (UZ art. 61b ust. 1 pkt 2). Dokumenty mają teraz ZAM do ZUS od dnia po ustaniu (test D2-08b).

## Ankieta (tor C, warunki pytań, dopisane 21.11 wieczorem)

**64. Zaświadczenie „Za życiem” w ciąży:** czy zaświadczenie można mieć już w ciąży (przed porodem)? Jeśli tak, pytanie o nie powinno być też na etapie „Czekamy na poród”.
- Dotyczy: tor C, ankieta (pytanie `dziecko_za_zyciem`), tor A (długość urlopu rodzicielskiego).
- Tymczasowo: pytamy tylko po porodzie i przy przyjęciu dziecka (KP art. 182¹a § 2; art. 183 § 4³–4⁵).
- Odpowiedź:

**65. Urlop uzupełniający przy przyjęciu dziecka (KP art. 183 § 3¹):** czy tydzień ciąży i masa urodzeniowa też mają znaczenie, czy liczy się tylko pobyt dziecka w szpitalu?
- Dotyczy: tor C, ankieta (pytania `dziecko_szpital`, `dziecko_tydzien_ciazy`, `dziecko_masa`), tor A.
- Tymczasowo: przy przyjęciu dziecka pytamy tylko o to, co dotyczy przyjęcia (bez tygodnia ciąży i masy).
- Odpowiedź:

**66. Zaległości w składkach a osoba współpracująca (EC-13):** czy zaległość wstrzymuje zasiłek także osobie współpracującej przy działalności, i czyją zaległość się liczy (swoją czy osoby prowadzącej firmę)?
- Dotyczy: tor C, ankieta (pytanie `zadluzenie_skladkowe`, dziś tylko przy własnej działalności), tor A (EC-13).
- Tymczasowo: o zaległości pytamy tylko przy własnej działalności.
- Odpowiedź:

**67. Umowa terminowa i umowa na zastępstwo przy ojcu i przy przyjęciu dziecka:** KP art. 177 § 3 i UZ art. 30 ust. 4 mówią o ciąży. Czy przedłużenie umowy do dnia porodu i zasiłek po jej końcu dotyczą też ojca i przyjmującego dziecko?
- Dotyczy: tor C, ankieta (pytania `etat_czas_okreslony`, `etat_zastepstwo`, `etat_do`), tor A.
- Tymczasowo: pytamy o umowę terminową w każdym przypadku, a silnik traktuje ją jak przy porodzie albo „do potwierdzenia”.
- Odpowiedź:

**68. Przyczyny ustania ubezpieczenia (upadłość, likwidacja) przy zleceniu i przy przyjęciu dziecka (UZ art. 30 ust. 1):** czy dotyczą też zleceniodawcy i czy liczą się, gdy umowa kończy się przed przyjęciem dziecka, a nie przed porodem?
- Dotyczy: tor C, ankieta (pytania `ustanie_umowy`, `ustanie_przyczyna_umowy`), tor A.
- Tymczasowo: te przyczyny pokazujemy przy każdej umowie niebędącej firmą, a wynik „do potwierdzenia”.
- Odpowiedź:

**69. Rola „inny członek najbliższej rodziny” przy przyjęciu dziecka:** czy taka osoba (np. babcia) ma prawo do urlopu i zasiłku przy przyjęciu dziecka na wychowanie, i na jakich zasadach?
- Dotyczy: tor C, ankieta (pytanie `rola`), tor A.
- Tymczasowo: rolę zostawiamy w ankiecie, a wynik dla niej oznaczamy „do potwierdzenia”.
- Odpowiedź:

**70. PIT-2 przy samej działalności gospodarczej:** czy osoba bez umowy o pracę ani zlecenia składa PIT-2 (komu?) i czy pytanie o PIT-2 ma sens, gdy zasiłek wypłaca ZUS?
- Dotyczy: tor C, ankieta (pytanie `pit2`), tor B (szacunek „na rękę”).
- Tymczasowo: pytamy o PIT-2 każdą osobę z jakimkolwiek tytułem ubezpieczenia.
- Odpowiedź:

## Ankieta i wynik (tor C, utrata pracy w ciąży, dopisane 22.11)

**71. Zawieszenie działalności w ciąży:** jaki jest skutek zawieszenia działalności gospodarczej dla dobrowolnego ubezpieczenia chorobowego i dla prawa do zasiłku (chorobowego w ciąży, a potem macierzyńskiego)? Czy zawieszenie to „ustanie tytułu ubezpieczenia” w rozumieniu UZ art. 7 i art. 30?
- Dotyczy: tor C (karta „Koniec ubezpieczenia przed porodem: co można zrobić”, `src/components/wynik/UtrataPracyWCiazy.tsx`, punkt `zawieszenie_dzialalnosci`; ankieta: opcja „Zamknięcie albo zawieszenie działalności” w `ustanie_przyczyna_firmy`), tor A (uprawnienia, `TytulUbezpieczenia.zawieszenia`).
- Tymczasowo: karta mówi „do potwierdzenia w ZUS” i nie opisuje skutku.
- Odpowiedź:

**72. Rejestracja w urzędzie pracy po utracie pracy w ciąży:** jak rejestracja jako osoba bezrobotna wpływa na zasiłek chorobowy po ustaniu ubezpieczenia (UZ art. 7) i na zasiłek macierzyński? Z ustawy wiemy tylko, że prawo do zasiłku dla bezrobotnych wyklucza zasiłek chorobowy za okres po ustaniu tytułu (UZ art. 13 ust. 1 pkt 4).
- Dotyczy: tor C (ta sama karta, punkt `urzad_pracy`), tor A (EC-104), tor D (katalog wsparcia).
- Tymczasowo: karta podaje tylko UZ art. 13 ust. 1 pkt 4, a resztę oznacza „do potwierdzenia w ZUS”.
- Odpowiedź:
