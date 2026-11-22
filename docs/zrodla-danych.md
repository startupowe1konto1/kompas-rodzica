# Skąd aplikacja bierze dane: mapa „dana → źródło”

Stan na 21.11.2026. Dokument odpowiada na pytanie mentora ZUS: jakie dane, z którego miejsca pobrać. Zasada: symulujemy pobranie tylko tego, co dana usługa naprawdę pokazuje obywatelowi po zalogowaniu. Resztę wpisuje człowiek albo pochodzi z papierowego dokumentu.

Pliki obok:
- `docs/zrodla-danych.json` – 57 rekordów w formie do wczytania przez aplikację (każde źródło ma status i link do dowodu),
- `docs/zam-pola.json` – 85 pól formularza ZAM z opisem, sekcją i położeniem na stronie.

**Statusy.** „Potwierdzone” znaczy: przeczytałem to na oficjalnej stronie usługi albo w rozporządzeniu z materiałów konkursowych (link w JSON, pole `dowod`). „Założenie” znaczy: nie znalazłem potwierdzenia i trzeba zapytać mentora. Nikt nie logował się do żadnej usługi, więc „potwierdzone” opiera się na dokumentacji i stronach pomocy, a nie na obejrzeniu ekranu po zalogowaniu.

**Kolumna „Wpisuje człowiek”** (w JSON: `zawszeUzytkownik`). „Tak” znaczy, że żadna e-usługa tej danej nie ma. Wtedy wpisuje ją użytkownik albo pochodzi z papieru: od lekarza, z sądu, od pracodawcy.

## (a) Co naprawdę ma każda usługa

| Usługa | Co obywatel tam widzi | Czego tam nie ma (a mogłoby się wydawać, że jest) | Dowód |
|---|---|---|---|
| **Rejestr PESEL** (usługa gov.pl „Sprawdź dane swoje lub swojego dziecka”, wgląd także przez mObywatel) | PESEL, imiona i nazwisko, nazwisko rodowe, data i miejsce urodzenia, płeć, obywatelstwo, numer aktu urodzenia i USC, stan cywilny, imię, nazwisko rodowe i PESEL małżonka, adres zameldowania, seria i numer dowodu oraz paszportu. Rodzic powiązany z dzieckiem widzi te same dane dziecka. | Adresu zamieszkania (jest tylko zameldowanie). PESEL-u drugiego rodzica, jeśli rodzice nie są małżeństwem. Czegokolwiek o dziecku przed sporządzeniem aktu urodzenia. | [czym jest rejestr PESEL](https://www.gov.pl/web/gov/czym-jest-rejestr-pesel), [sprawdź dane swoje lub dziecka](https://www.gov.pl/web/gov/sprawdz-swoje-dane-w-rejestrze-pesel) |
| **mObywatel** (aplikacja) | Wgląd w dane z rejestru PESEL i Rejestru Dowodów Osobistych. Od 5.03.2026 usługa „Zgłoś urodzenie dziecka”: dane zalogowanego rodzica uzupełniają się same, do 5 urodzeń w jednym zgłoszeniu, wybór sposobu doręczenia aktu. | Danych drugiego rodzica (w zgłoszeniu urodzenia wpisuje się je ręcznie). Ciąży i terminu porodu. Zatrudnienia i zarobków. Nie potwierdziłem, czy w samej aplikacji widać listę dzieci z ich danymi – serwisy mobywatel.gov.pl i info.mobywatel.gov.pl nie dały się odczytać (wymagają JavaScript). | [zgłoszenie urodzenia w mObywatelu](https://www.gov.pl/web/cyfryzacja/zglos-urodzenie-dziecka-w-mobywatelu-bez-umawiania-wizyty-w-urzedzie-bez-kolejek); zakres usługi mObywatel: [załącznik (PDF, znam tylko fragment z wyszukiwarki)](https://www.gov.pl/web/mobywatel-w-aplikacji/zalacznik-mobywatel) |
| **login.gov.pl / profil zaufany** | Usługa, do której się logujesz, dostaje co najmniej: nazwisko, imię, datę urodzenia i niepowtarzalny identyfikator. | Adresu, telefonu, rachunku, danych rodziny. To logowanie, a nie źródło danych. | [dla integratorów](https://www.gov.pl/web/login/dla-integratorow) |
| **eZUS (dawniej PUE ZUS), panel ubezpieczonego** | „Moje dane”: dane identyfikacyjne i adresowe ze zgłoszenia ZUA/ZZA. „Ubezpieczenia i płatnicy”: okresy i tytuły ubezpieczenia z kodem, dane płatnika (nazwa, NIP, REGON), dane o rozwiązaniu stosunku pracy (data, tryb, podstawa prawna). „Informacje o podstawach i składkach”: podstawy wymiaru składek, w tym chorobowej, za ostatnie 12 miesięcy. „Świadczenia i przerwy”: kod, okres, liczba dni, kwota, kto wypłacał. „Zaświadczenia lekarskie”: seria i numer, okres, płatnik, okres hospitalizacji, status, podgląd druku ZLA. Kreator zaświadczeń z pieczęcią ZUS. Wnioski 800+, Aktywny Rodzic, Dobry Start. | Składników wynagrodzenia (stałe, zmienne, premie) i dni przepracowanych. Wymiaru etatu i rodzaju umowy (nie ma ich na liście danych). Liczby ubezpieczonych u pracodawcy. Rachunku bankowego w „Moich danych”. Przewidywanej daty porodu. Dane starsze niż 12 miesięcy trzeba zamówić jako archiwalne. | [panel ubezpieczonego](https://www.zus.pl/portal/pomoc/kub0000.html), [szczegóły ubezpieczenia](https://www.zus.pl/portal/pomoc/kub0021.html), [dane płatnika](https://www.zus.pl/portal/pomoc/kub0009.html), [podstawy i składki](https://www.zus.pl/portal/pomoc/kub0002.html), [świadczenia i przerwy](https://www.zus.pl/portal/pomoc/kub0008.html), [zaświadczenia lekarskie](https://www.zus.pl/portal/pomoc/kub0022.html) |
| **eZUS, panel świadczeniobiorcy** | Zasiłki, do których ZUS ustalił prawo (rok bieżący i poprzedni): okres, procent świadczenia, kwota brutto, data wypłaty. | Zasiłków wypłaconych przez pracodawcę w tym widoku nie opisano. | [zasiłki](https://www.zus.pl/portal/pomoc/ksw0004.html) |
| **eZUS, panel płatnika** (dla prowadzących działalność) | „Składki i salda”: saldo bieżące i z 12 miesięcy, należne składki, wpłaty, deklaracje DRA. | Salda „na dzień powstania prawa do zasiłku” – widać stan bieżący i miesięczny. | [salda](https://www.zus.pl/portal/pomoc/kpl0009.html) |
| **mZUS** (aplikacja) | e-ZLA z ostatnich 12 miesięcy ze szczegółami, zaświadczenia z danymi z ZUS, status wniosków, wnioski o świadczenia dla rodzin. | Podstaw składek i okresów ubezpieczenia strona nie wymienia. | [mZUS](https://www.zus.pl/mzus) |
| **e-Urząd Skarbowy** | „Twoje dane”: imię i nazwisko, PESEL, NIP, adres zamieszkania, e-mail i telefon, **osobisty rachunek bankowy**. „Twoja działalność”: nazwa firmy, REGON, PKD. Twój e-PIT: roczne dane z informacji od płatników, ulgi na dzieci z poprzedniego roku. | Zarobków miesiąc po miesiącu i składników wynagrodzenia (PIT-11 jest roczny). Dat rozpoczęcia i zawieszenia działalności. Dziecka urodzonego w tym roku (ulga pojawia się dopiero po rozliczeniu). | [konto osoby fizycznej w e-US](https://www.podatki.gov.pl/eurzad-skarbowy-zalatw-sprawy-podatkowe-online/konto-osoby-fizycznej-w-eurzedzie-skarbowym), [co zawiera Twój e-PIT](https://podatki.gov.pl/twoj-e-pit/pytania-i-odpowiedzi/informacje-ogolne-i-formularze/22-jakie-dane-znajduja-sie-w-zeznaniu-udostepnionym-w-usludze-twoj-e-pit-czy-urzad-skarbowy-wie-o-ulgach-z-ktorych-podatnik-chce-skorzystac) |
| **Internetowe Konto Pacjenta / mojeIKP** | e-recepty, e-skierowania, historia leczenia, zwolnienia (widoczne 1–2 dni po wystawieniu, dane przychodzą z ZUS), konto dziecka. | Nie znalazłem modułu ciąży, przewidywanego terminu porodu, karty urodzenia ani masy urodzeniowej. Traktujemy to jako „nie ma”, dopóki mentor nie powie inaczej. | [zwolnienia na IKP](https://pacjent.gov.pl/sprawdzaj-zwolnienia-na-ikp), [mojeIKP](https://pacjent.gov.pl/internetowe-konto-pacjenta/poznaj-mojeikp) |
| **CEIDG** | Wpis jest jawny i zawiera m.in. datę rozpoczęcia działalności oraz daty zawieszenia i wznowienia. | Składek, podstawy, ubezpieczenia chorobowego. | [ustawa o CEIDG, Dz.U. 2022 poz. 541](https://eli.gov.pl/api/acts/DU/2022/541/text/U/D20220541Lj.pdf) (dowodem jest ustawa; strony wyszukiwarki nie udało się pobrać) |
| **USC / rejestr stanu cywilnego** | Obywatel nie ma podglądu rejestru. Może zgłosić urodzenie online i zamówić odpis aktu (papierowy albo elektroniczny na e-Doręczenia; kolejny odpis skrócony kosztuje 22 zł). Po rejestracji urodzenia dostaje bezpłatny odpis skrócony, powiadomienie o PESEL dziecka i zaświadczenie o zameldowaniu. | Karty urodzenia rodzic nie dostaje: szpital przekazuje ją prosto do USC. | [zgłoś urodzenie dziecka](https://www.gov.pl/web/gov/zglos-urodzenie-dziecka), [odpis aktu stanu cywilnego](https://www.gov.pl/web/gov/uzyskaj-odpis-aktu-stanu-cywilnego-urodzenia-malzenstwa-zgonu) |
| **Emp@tia** | Nie sprawdzone. Wnioski o 800+, Aktywnego Rodzica i Dobry Start składa się dziś przez eZUS/mZUS. | Dla wniosku ZAM i silnika zasiłków nic stąd nie potrzebujemy. | brak (założenie) |
| **Pracodawca / płatnik** (zaświadczenie Z-3, Z-3a) | Okres zatrudnienia i wymiar etatu, liczba ubezpieczonych, składniki wynagrodzenia z dniami przepracowanymi, okresy urlopów i stawka wypłaconego zasiłku, rachunek bankowy pracownika, dane dziecka i drugiego rodzica. | To dokument, który płatnik wysyła do ZUS. Rodzic go nie wypełnia i zwykle nie widzi. | rozporządzenie Dz.U. 2026 poz. 1316, załączniki 2 i 3 (w `materialy/ZUS/Materiały dla uczestników/`) |
| **Lekarz / szpital** | Zaświadczenie o przewidywanej dacie porodu (zwykły druk), zaświadczenie do urlopu uzupełniającego (tydzień ciąży, masa, pobyt w szpitalu), zaświadczenie „Za życiem”, zaświadczenie o martwym urodzeniu, zaświadczenie o przyjęciu matki do szpitala. | Wszystko na papierze. | rozporządzenia: Dz.U. 2026 poz. 1316 § 13–15, Dz.U. 2025 poz. 322 § 2, 6–7, 14–15 |
| **Sąd** | Zaświadczenie o dacie wystąpienia o przysposobienie, orzeczenie o umieszczeniu w rodzinie zastępczej, postanowienie o przysposobieniu, wyrok o rozwiązaniu umowy z naruszeniem prawa. | – | Dz.U. 2026 poz. 1316 § 15–16, Dz.U. 2025 poz. 322 § 17–18 |

## (b) Dana → źródło → status

Znak ⚠ przy źródle oznacza założenie. Pełne uzasadnienia i linki są w `docs/zrodla-danych.json`.

### Tożsamość i dane osobowe

| Dana | Do czego | Źródła (pierwsze = domyślne w symulacji) | Status | Wpisuje człowiek |
|---|---|---|---|---|
| PESEL osoby, która składa wniosek | ZAM, silnik | mObywatel / rejestr PESEL; eZUS; e-Urząd Skarbowy; login.gov.pl ⚠ | potwierdzone (⚠ = założenie) | nie |
| Imię i nazwisko wnioskodawcy | ZAM, pracodawca | mObywatel / rejestr PESEL; login.gov.pl; eZUS; e-Urząd Skarbowy | potwierdzone | nie |
| Data urodzenia wnioskodawcy | ZAM, silnik | mObywatel / rejestr PESEL; login.gov.pl | potwierdzone | nie |
| Rodzaj, seria i numer dokumentu tożsamości (tylko gdy brak PESEL) | ZAM | użytkownik; mObywatel / rejestr PESEL | potwierdzone | nie |
| Adres zamieszkania wnioskodawcy (ulica, numer domu i lokalu, kod, miejscowość, państwo) | ZAM | eZUS; e-Urząd Skarbowy; mObywatel / rejestr PESEL; użytkownik | potwierdzone | nie |
| Numer telefonu (pole dobrowolne) | ZAM | użytkownik; e-Urząd Skarbowy | potwierdzone | nie |
| Rola wobec dziecka: matka, ojciec, osoba przyjmująca dziecko, inny członek rodziny | silnik, ZAM | użytkownik; mObywatel / rejestr PESEL | potwierdzone | tak |
| Data wypełnienia wniosku i podpis | ZAM, pracodawca | użytkownik | potwierdzone | tak |
| Drugi rodzic albo członek rodziny: PESEL, imię, nazwisko (data urodzenia i dokument, gdy brak PESEL) | ZAM, pracodawca | użytkownik; mObywatel / rejestr PESEL | potwierdzone | nie |
| Dane matki dziecka, gdy wniosek składa ojciec albo inny członek rodziny | ZAM | użytkownik; mObywatel / rejestr PESEL | potwierdzone | nie |

### Ubezpieczenie i płatnik

| Dana | Do czego | Źródła (pierwsze = domyślne w symulacji) | Status | Wpisuje człowiek |
|---|---|---|---|---|
| Płatnik składek: NIP, REGON (albo PESEL / dokument, gdy ich nie ma) | ZAM | eZUS; e-Urząd Skarbowy; pracodawca (płatnik) | potwierdzone | nie |
| Nazwa płatnika składek albo imię i nazwisko | ZAM, pracodawca | eZUS; e-Urząd Skarbowy | potwierdzone | nie |
| Tytuły ubezpieczenia: kod tytułu, okres od–do, płatnik | silnik | eZUS | potwierdzone | nie |
| Czy jest ubezpieczenie chorobowe i jakie: obowiązkowe, dobrowolne, brak (w ZAM: pytanie TAK/NIE dla działalności, współpracy, duchownych, marynarzy) | silnik, ZAM | eZUS ⚠; użytkownik | założenie | nie |
| Wymiar czasu pracy (etat) | silnik | użytkownik; pracodawca (płatnik); eZUS ⚠ | potwierdzone (⚠ = założenie) | tak |
| Czy umowa jest na czas określony i do kiedy trwa | silnik | użytkownik; pracodawca (płatnik) | potwierdzone | tak |
| Ustanie zatrudnienia: data i przyczyna (upadłość, likwidacja, śmierć pracodawcy, zwolnienie z naruszeniem prawa) | silnik, ZAM | eZUS; pracodawca (płatnik); sąd; użytkownik | potwierdzone | nie |
| Ilu ubezpieczonych zgłasza płatnik (decyduje, kto wypłaca zasiłek: pracodawca czy ZUS) | silnik | użytkownik; pracodawca (płatnik) | potwierdzone | tak |
| Okres urlopu wychowawczego | silnik | użytkownik; eZUS ⚠; pracodawca (płatnik) | potwierdzone (⚠ = założenie) | nie |
| Wcześniej pobrane zasiłki: rodzaj, okres, stawka procentowa, kwota, kto wypłacał | silnik, pracodawca | eZUS; pracodawca (płatnik) | potwierdzone | nie |

### Wynagrodzenie i podstawa

| Dana | Do czego | Źródła (pierwsze = domyślne w symulacji) | Status | Wpisuje człowiek |
|---|---|---|---|---|
| Podstawa wymiaru składek miesiąc po miesiącu (ostatnie 12 miesięcy) | silnik | eZUS; użytkownik | potwierdzone | nie |
| Składniki wynagrodzenia: stałe, zmienne, premie kwartalne i roczne, dni przepracowane i do przepracowania | silnik | użytkownik; pracodawca (płatnik) | potwierdzone | tak |
| Roczny przychód od płatników (PIT-11) – tylko do sprawdzenia wiarygodności | silnik | e-Urząd Skarbowy | potwierdzone | nie |
| Działalność: zadeklarowana podstawa wymiaru składki chorobowej w kolejnych miesiącach | silnik | eZUS | potwierdzone | nie |

### Działalność gospodarcza

| Dana | Do czego | Źródła (pierwsze = domyślne w symulacji) | Status | Wpisuje człowiek |
|---|---|---|---|---|
| Działalność gospodarcza: data rozpoczęcia, zawieszenia i wznowienia, status | silnik | CEIDG; e-Urząd Skarbowy; eZUS | potwierdzone | nie |
| Działalność: zaległości w składkach (saldo na koncie płatnika) | silnik | eZUS | potwierdzone | nie |

### Dziecko

| Dana | Do czego | Źródła (pierwsze = domyślne w symulacji) | Status | Wpisuje człowiek |
|---|---|---|---|---|
| Dziecko: imię i nazwisko, data i miejsce urodzenia | ZAM, pracodawca, silnik | mObywatel / rejestr PESEL; USC / rejestr stanu cywilnego; użytkownik | potwierdzone | nie |
| PESEL dziecka | ZAM | mObywatel / rejestr PESEL; użytkownik | potwierdzone | nie |
| Liczba dzieci urodzonych przy jednym porodzie albo przyjętych jednocześnie | silnik | użytkownik; mObywatel / rejestr PESEL ⚠ | potwierdzone (⚠ = założenie) | tak |
| Przewidywana data porodu | silnik, ZAM, pracodawca | użytkownik; lekarz / szpital; IKP ⚠ | potwierdzone (⚠ = założenie) | tak |
| Rodzaj zdarzenia: urodzenie, przysposobienie, rodzina zastępcza; data przyjęcia dziecka na wychowanie | silnik, ZAM, pracodawca | użytkownik; sąd | potwierdzone | tak |
| Przysposobienie: wiek dziecka w dniu przyjęcia i ewentualne odroczenie obowiązku szkolnego | silnik | użytkownik; sąd | potwierdzone | tak |
| Wcześniak: tydzień ciąży w dniu porodu i masa urodzeniowa | silnik, ZAM | użytkownik; lekarz / szpital; IKP ⚠ | potwierdzone (⚠ = założenie) | tak |
| Pobyt dziecka w szpitalu po porodzie: od–do, data wypisu | silnik, ZAM | użytkownik; lekarz / szpital; IKP ⚠ | potwierdzone (⚠ = założenie) | tak |
| Czy dziecko ma zaświadczenie „Za życiem” (i które dziecko) | silnik, ZAM, pracodawca | użytkownik; lekarz / szpital | potwierdzone | tak |
| Martwe urodzenie albo zgon dziecka (data) | silnik | użytkownik; lekarz / szpital; USC / rejestr stanu cywilnego ⚠ | potwierdzone (⚠ = założenie) | tak |

### Zdrowie i sytuacja matki

| Dana | Do czego | Źródła (pierwsze = domyślne w symulacji) | Status | Wpisuje człowiek |
|---|---|---|---|---|
| Sytuacja matki: skrócenie zasiłku po 14 tyg., pobyt w szpitalu, orzeczenie, podjęcie pracy, porzucenie dziecka, śmierć – i data | silnik, ZAM, pracodawca | użytkownik; pracodawca (płatnik); lekarz / szpital | potwierdzone | tak |
| Pobyt wnioskodawcy (matki) w szpitalu i data wypisu | silnik, ZAM | użytkownik; lekarz / szpital; eZUS | potwierdzone | nie |
| Orzeczenie matki o niezdolności do samodzielnej egzystencji albo o znacznym stopniu niepełnosprawności | silnik, ZAM, pracodawca | użytkownik; eZUS ⚠ | potwierdzone (⚠ = założenie) | tak |
| Zwolnienia lekarskie w ciąży: okresy od–do, płatnik, status | silnik | eZUS; IKP | potwierdzone | nie |
| Kod „B” na zwolnieniu (niezdolność do pracy w ciąży – zasiłek 100%) | silnik | eZUS ⚠; użytkownik | założenie | nie |

### Plan urlopów

| Dana | Do czego | Źródła (pierwsze = domyślne w symulacji) | Status | Wpisuje człowiek |
|---|---|---|---|---|
| Czy drugi rodzic będzie pobierał zasiłek za urlop rodzicielski albo uzupełniający i w jakim okresie | ZAM, pracodawca, silnik | użytkownik | potwierdzone | tak |
| Urlop ojcowski: czy pobierał już zasiłek za ten okres z innego tytułu (tytuł i okres) | ZAM, pracodawca | użytkownik; eZUS | potwierdzone | nie |
| Plan: które urlopy, od kiedy do kiedy, która część rodzicielskiego (1–5) i ojcowskiego (1–2), data końca macierzyńskiego | silnik, ZAM, pracodawca | użytkownik | potwierdzone | tak |
| Deklaracja pełnego wymiaru macierzyńskiego i rodzicielskiego (zasiłek 81,5%) | silnik, ZAM | użytkownik | potwierdzone | tak |
| Łączenie urlopu rodzicielskiego z pracą: wymiar etatu i okres | silnik, pracodawca | użytkownik | potwierdzone | tak |
| Dotychczas wykorzystany urlop rodzicielski: okres i liczba części (albo wniosków o zasiłek) | silnik, pracodawca | użytkownik; eZUS | potwierdzone | nie |
| Oświadczenia we wnioskach do pracodawcy: drugi rodzic nie zamierza korzystać w tym okresie; okres macierzyńskiego wykorzystany przed porodem; zamiar rezygnacji matki | pracodawca | użytkownik | potwierdzone | tak |

### Wypłata

| Dana | Do czego | Źródła (pierwsze = domyślne w symulacji) | Status | Wpisuje człowiek |
|---|---|---|---|---|
| Numer rachunku bankowego do wypłaty zasiłku (pole dobrowolne) | ZAM | e-Urząd Skarbowy; pracodawca (płatnik); eZUS ⚠; użytkownik | potwierdzone (⚠ = założenie) | nie |

### Załączniki

| Dana | Do czego | Źródła (pierwsze = domyślne w symulacji) | Status | Wpisuje człowiek |
|---|---|---|---|---|
| Załącznik: zaświadczenie lekarskie o przewidywanej dacie porodu | ZAM, pracodawca | lekarz / szpital | potwierdzone | tak |
| Załącznik: odpis skrócony aktu urodzenia dziecka | pracodawca, ZAM | USC / rejestr stanu cywilnego; mObywatel / rejestr PESEL; użytkownik | potwierdzone | nie |
| Załącznik: zaświadczenie ze szpitala do uzupełniającego urlopu macierzyńskiego | pracodawca, ZAM | lekarz / szpital | potwierdzone | tak |
| Załącznik: kopia zaświadczenia „Za życiem” | pracodawca | lekarz / szpital | potwierdzone | tak |
| Załącznik: dokumenty z sądu przy przysposobieniu albo rodzinie zastępczej | pracodawca, ZAM | sąd | potwierdzone | tak |
| Załącznik: zaświadczenie płatnika składek Z-3 (pracownik) albo Z-3a (zlecenie) | ZAM | pracodawca (płatnik) | potwierdzone | tak |
| Załącznik: kopia wniosku ojca o pozostałą część urlopu / oświadczenie matki o rezygnacji | pracodawca | użytkownik | potwierdzone | tak |

## (c) Czego nie da się pobrać z żadnej usługi

Tych danych aplikacja nie może „pobierać” nawet na niby. Pyta o nie użytkownika i mówi, z jakiego dokumentu je przepisać.

1. **Przewidywana data porodu.** Jedyne źródło to zaświadczenie lekarskie na zwykłym druku. Nie ma jej w eZUS, mObywatelu ani (według tego, co znalazłem) w IKP.
2. **Składniki wynagrodzenia**: stałe, zmienne, premie kwartalne i roczne, dni przepracowane. Zna je tylko pracodawca i wpisuje do Z-3. eZUS pokazuje jedną kwotę miesięcznie: podstawę wymiaru składki. Kalkulator oparty na eZUS daje więc wynik przybliżony i trzeba to napisać na ekranie.
3. **Liczba ubezpieczonych u pracodawcy** (czyli kto wypłaci zasiłek). Zostaje pytanie „czy firma zgłasza do ubezpieczenia chorobowego więcej niż 20 osób”.
4. **Wymiar etatu, rodzaj umowy i data końca umowy na czas określony.**
5. **Cechy dziecka przy porodzie**: tydzień ciąży, masa urodzeniowa, pobyt w szpitalu, zaświadczenie „Za życiem”, martwe urodzenie.
6. **Dane dziecka przed rejestracją urodzenia.** Rejestr PESEL ma je dopiero po sporządzeniu aktu.
7. **Dane drugiego rodzica**, jeśli rodzice nie są małżeństwem. Dla małżonków rejestr PESEL podaje imię, nazwisko rodowe i PESEL małżonka.
8. **Sytuacja matki**: rezygnacja z części urlopu, pobyt w szpitalu, orzeczenie, porzucenie dziecka, śmierć.
9. **Przysposobienie i rodzina zastępcza**: data przyjęcia dziecka, wiek dziecka, odroczenie obowiązku szkolnego.
10. **Plan urlopów i podział z partnerem, wariant 81,5%, łączenie urlopu z pracą.** To decyzje rodziców.
11. **Przyczyna ustania zatrudnienia w rozumieniu ZAM** (upadłość, likwidacja, śmierć pracodawcy, wyrok sądu). eZUS pokazuje datę i kod trybu rozwiązania umowy, ale nie te cztery kategorie.
12. **Podpis i wszystkie oświadczenia.**

Dwie rzeczy działają odwrotnie, niż zakładaliśmy:
- **Numer rachunku** jest potwierdzony w e-Urzędzie Skarbowym, a nie w eZUS.
- **Odpisu aktu urodzenia nie trzeba dołączać do ZAM, gdy zasiłek wypłaca ZUS.** ZUS sam pobiera go z rejestru stanu cywilnego na podstawie danych dziecka (§ 13 ust. 2–4 rozporządzenia). Odpis albo jego kopia jest potrzebna do wniosków do pracodawcy.

## (d) Pytania do mentora ZUS

1. **Rachunek bankowy.** Czy ubezpieczony widzi w eZUS swój numer rachunku, jeśli jeszcze nie pobierał świadczenia z ZUS? Jeżeli nie, czy wolno nam pokazać „pobranie” rachunku z e-Urzędu Skarbowego?
2. **Wymiar etatu.** Czy w panelu ubezpieczonego (np. w podglądzie raportów miesięcznych) widać wymiar czasu pracy?
3. **Rodzaj ubezpieczenia chorobowego.** Czy portal pokazuje wprost, że chorobowe jest dobrowolne albo obowiązkowe i od kiedy trwa, czy trzeba to wyprowadzać z kodu tytułu i podstaw?
4. **Kod „B” na e-ZLA.** Czy ubezpieczony widzi kody literowe w szczegółach zwolnienia? Lista kolumn ich nie zawiera.
5. **Urlop wychowawczy.** Czy okno „Świadczenia i przerwy w opłacaniu składek” pokazuje urlop wychowawczy z datami?
6. **Kto wypłaca zasiłek.** Czy ubezpieczony może gdziekolwiek w eZUS sprawdzić, czy jego płatnik wypłaca zasiłki sam, czy robi to ZUS?
7. **Zaległości w składkach.** Silnik potrzebuje stanu na dzień powstania prawa do zasiłku. Czy saldo z panelu płatnika wystarczy do symulacji, czy właściwym źródłem jest zaświadczenie o niezaleganiu?
8. **Ustanie zatrudnienia.** Czy z kodów trybu rozwiązania umowy (ZUS ZWUA) da się odczytać upadłość, likwidację albo śmierć pracodawcy?
9. **PESEL przy logowaniu.** Czy „niepowtarzalny identyfikator” z login.gov.pl to dla polskiego profilu zaufanego PESEL? (Pytanie raczej do mentora z Ministerstwa Cyfryzacji).
10. **Dzieci w mObywatelu.** Czy rodzic widzi w aplikacji dane dziecka (imię, nazwisko, PESEL, data i miejsce urodzenia), czy tylko w usłudze gov.pl po zalogowaniu profilem zaufanym?
11. **IKP.** Czy potwierdzacie, że w IKP nie ma przewidywanej daty porodu, tygodnia ciąży, masy urodzeniowej ani okresu pobytu noworodka w szpitalu?
12. **Kreator ZAM w eZUS.** Które pola wniosku ZAM eZUS wypełnia sam po zalogowaniu? Nasza symulacja powinna robić to samo i nic ponad to.
13. **Formularz ZAM, strona 5.** Opisy pól w PDF (tooltipy) są tam przesunięte względem układu strony: pola `TAK2`/`NIE2`/`Okres1` leżą przy oświadczeniu o urlopie ojcowskim, a opis mówi o drugim rodzicu; pola `TAK`/`NIE`/`Okres` leżą przy informacji o drugim rodzicu, a opis mówi o działalności. Przyjęliśmy układ strony. Czy to poprawne odczytanie?

## Czego nie sprawdzono

- Żadnego ekranu po zalogowaniu. Wszystko opiera się na stronach pomocy i opisach usług.
- Aplikacji mObywatel od środka (strony informacyjne wymagają JavaScript) i podręcznika mZUS (PDF).
- Widoku wpisu w wyszukiwarce CEIDG oraz portalu Emp@tia.
- Tego, czy w e-Urzędzie Skarbowym da się otworzyć sam PIT-11 (potwierdzone jest tylko, że Twój e-PIT zawiera dane od płatników).
- Wzorów Z-3 i Z-3a pole po polu. Zakres danych wzięto z załączników 2 i 3 rozporządzenia.
