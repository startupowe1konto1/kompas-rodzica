# Prezentacja: spec

Napisane 21.11.2026, ok. 23:30, dla prezentacji do zgłoszenia ZUS (HackNation 2026). Źródło slajdów: `docs/pitch/prezentacja/src/`. Wynik: jeden samodzielny plik `docs/pitch/prezentacja.html` i `docs/pitch/prezentacja.pdf`. Instrukcje zespołu, które ten spec realizuje: `docs/pitch/INSTRUKCJA-DECK-PITCH.md` i `docs/pitch/DECK-PLAYBOOK.md` (22.11: dopasowane silnik, ruch i wygląd; stan w HANDOFF.md).

## 1. Co robimy

Jeden deck, użyty dwa razy:

- **Zgłoszenie w HackTribe:** PDF, każda strona czytelna bez mówcy.
- **Finał na żywo:** 5 minut prezentacji i 5 minut pytań. Strona HTML sterowana strzałkami, jedno naciśnięcie odgrywa cały slajd.

## 2. Twarde limity

| Limit | Źródło |
|---|---|
| Najwyżej 10 slajdów. Mniej jest w porządku, nie upychamy treści. | opis zadania pkt 4; prośba zespołu |
| Slajd „rozwiązania zewnętrzne i AI”, w tym katalog świadczeń przygotowany przed wydarzeniem. | regulamin zadania § 4 ust. 1; ZUS-BRIEF |
| Slajd „to już działa w Europie” (w Polsce oficjalnego narzędzia jeszcze nie ma). | ZADANIA.md, cz. 9 |
| Nie oceniamy ZUS: jury to ZUS. Potrzebę nazywamy słowami zadania. | ZADANIA.md, cz. 9 |
| Bez logotypów ZUS, mObywatela i gov.pl. „mObywatel (symulacja)” słowem. | CLAUDE.md |
| Przy wynikach: „To symulacja. Wynik nie jest decyzją ZUS.” | CLAUDE.md |
| Dane w przykładach fikcyjne. Żadnych spraw ZUS. | CLAUDE.md |
| Tylko licencje permisywne. Font Lato (OFL 1.1) z buildu aplikacji, osadzony w pliku. | CLAUDE.md |

## 3. Historia

Wersja 2 (22.11, decyzja Mikołaja): na pierwszym planie to, czego wymaga zadanie ZUS i co aplikacja rozwiązuje, a nie pieniądze. Źródło: ZUS-BRIEF.md, sekcje 2.1–2.3 (cel ZUS, uwagi mentora, funkcje a–j, symulacje).

- **Problem:** rodzic nie wie, co mu przysługuje, co się stanie po decyzji i co, gdzie i do kiedy złożyć. Dane ZUS: 87% osób na zasiłku za urlop rodzicielski to kobiety (komunikat ZUS z 27.05.2026). Cel ZUS z opisu zadania: mniej sporów i korespondencji, rodzic nie jest zaskakiwany decyzją.
- **Rozwiązanie:** uprawnienia dla konkretnej osoby z przepisem, warianty na osi czasu z ich skutkami (priorytet mentora), dokumenty i terminy z informacją, kto wypłaca, ryzyka i trudne sytuacje.
- **Dowody:** przykład Magdy i Pawła (dane fikcyjne) ze skutkiem decyzji na klik, pokrycie punktów a–j, uczciwe symulacje usług, wyliczenie z przepisami.

## 4. Slajdy

Scena 1920 × 1080. Przy każdym slajdzie stan końcowy, który pokazuje PDF. Kafle i ikony jak w aplikacji (białe kafle, ikona Tabler na zielonym kafelku), makiety urządzeń z prawdziwymi zrzutami.

| # | Slajd | Stan końcowy | Ruch |
|---|---|---|---|
| 1 | Tytuł | Nazwa, zdanie o tym, co robi aplikacja, zespół; laptop i telefon ze zrzutami. | brak |
| 2 | Problem | Trzy kafle z pytaniami rodzica; kafel 87% ze źródłem; pasek „Cel ZUS z opisu zadania”. | brak |
| 3 | Rozwiązanie | Cztery kafle (co przysługuje i dlaczego, warianty na osi, dokumenty i terminy, ryzyka i trudne sytuacje) i zrzut wyniku. | brak |
| 4 | Decyzja i skutek | Magda i Paweł; oś „Paweł przejmuje po 14 tygodniach”; kafel „Co z tego wynika” i termin dla Pawła. | na klik: plan „Magda bierze cały urlop” przechodzi w przejęcie, pojawiają się skutek i termin |
| 5 | Wymagania a–j | Dziewięć kafli z literami punktów zadania i tym, co robi aplikacja. | brak |
| 6 | Uczciwe symulacje | Sześć usług z tym, co zwracają, i zrzut ekranu „Pobieramy Twoje dane”. | brak |
| 7 | Kalkulator | Trzy linie wyliczenia z przepisami; kafel terminu na 81,5%. | brak |
| 8 | Korzyści | Kafle „Rodzic” i „ZUS” (cele z opisu zadania); pasek „Gotowe do wdrożenia”. | brak |
| 9 | Zamknięcie | Trzy zdania, linki, zespół, telefon ze zrzutem dokumentów. | brak |
| 10 | Załącznik | Rozwiązania zewnętrzne i AI (wymóg regulaminu § 4 ust. 1), po „Dziękujemy”, nie pokazujemy w wystąpieniu. | brak |

## 5. Dane

`eksport-danych.mjs` woła REST API działającej aplikacji (`/api/plan/default`, `/api/calculate`, `/api/plan/validate`, `/api/documents`) i liczy testy repozytorium. Wynik w `dane.json`. Build wkleja go do HTML. **Żadna kwota, data ani liczba testów nie jest wpisana w slajd ręcznie**; brakujące pole zatrzymuje build.

Zrzuty robi `zrzuty-aplikacji.mjs` (Playwright, systemowy Edge) z persony testowej „Marta i Piotr”. Bez makiet i retuszu.

## 6. Wygląd

- **Font:** tylko Lato 400/700/900, cyfry tabelaryczne przy kwotach.
- **Kolory jak w aplikacji, jeden kolor = jedno znaczenie:** granat `#00416e` nagłówki i urlop rodzicielski; zieleń `#007834` pieniądze i urlop macierzyński; morski `#006d77` urlop ojcowski; bursztyn `#fab856` tylko termin (tło, tekst granat); czerwień `#d5233f` tylko „nie można”; tło `#f3f4f6`, białe kafle.
- **Tło jak na ekranie startowym aplikacji:** jasny gradient, miękka poświata i pofalowana siatka oktagonów (`src/tlo.js`, przeniesione z `src/components/start/siatka-oktagonow.ts`). Na slajdach z treścią siatka jest słabsza. Bez zielonego paska u góry.
- **Stonowane kolory, zieleń i granat razem:** granat na nagłówkach i tekście głównym; zieleń ZUS jako akcent marki (wydarzenie, nazwa zespołu, linia kontekstu przykładu, numery kroków, liczby na slajdzie 8, przepisy, typy licencji, linki, cienkie linie podziału) i przy kwotach. Białe karty z cienką ramką zamiast pełnych kolorowych bloków.
- **Układ:** marginesy 144 px, tytuł do dwóch linii, najwyżej jedna myśl na slajd. Tabele z cienkimi liniami zamiast odznak.
- **Nie wolno:** emoji, ikon dekoracyjnych, gradientowego tekstu, cieni pod tekstem, etykiet wersalikami nad nagłówkami, kropek-separatorów, wyróżniania jednego słowa w nagłówku innym kolorem.

## 7. Ruch

- Animacje liczone czasem, nie klatkami, stonowane: przejście slajdu 0,25 s, zmiana planu na osi 1,6 s, licznik kwoty 1,6 s. Oś nie przelatuje między slajdami.
- **Ruch tylko tam, gdzie coś tłumaczy, i na klik** (decyzje Mikołaja, 22.11): na slajdzie 4 pierwsze naciśnięcie uruchamia decyzję i jej skutek, drugie przechodzi dalej. Treść pojawia się razem ze slajdem. Nic nie zapętla się poza bardzo wolnym dryfem siatki w tle, jak w aplikacji.
- **Mało treści:** jedna myśl na slajd, bez tabel z wieloma wierszami i bez list opisów. Szczegóły są w notatkach prezentera i w aplikacji.
- Jedno naciśnięcie odgrywa cały slajd; naciśnięcie w trakcie przeskakuje do stanu końcowego (decyzja Mikołaja, 22.11; kroki na naciśnięcie z instrukcji PL nie są używane).
- `?print=1` (także `?final`) i `prefers-reduced-motion` pokazują od razu stan końcowy (z tego korzysta PDF). Adres `#slajd.krok` otwiera dany stan.

## 8. Gotowe, gdy

1. Deck przechodzi od 1 do 10 samą strzałką w prawo, w Edge i Chrome, w 1920 × 1080 i 1366 × 768, bez błędów w konsoli.
2. PDF ma tyle stron, ile slajdów, a każda liczba na stronach jest w `dane.json`.
3. Slajd 1 ma nazwę, wyzwanie, zespół i imiona; slajd 9 wymienia rozwiązania zewnętrzne i AI.
4. Nie ma żadnego logotypu; „To symulacja. Wynik nie jest decyzją ZUS.” stoi przy kwotach.
5. Próba na czas: 4:30–5:00.
