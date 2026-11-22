# Scenariusz filmu – Kompas Rodzica

**Film:** [Kompas Rodzica na Dysku Google](https://drive.google.com/file/d/19RFV5skizuaH-gFJqwSf3oi4QUK9xF4H/view?usp=sharing) (dostęp dla każdego z linkiem).

Wersja 2 (22.11.2026, ok. 09:00), po uwagach Wojtka do wersji 1. Bez lektora i bez muzyki. Zamiast paska napisów: ramki wokół elementów, dymki przy nich i przybliżenia na drobne elementy.

## Ramy

- **Długość:** 2:16 (limit z opisu zadania: 3:00).
- **Obraz:** nagranie aplikacji z `main` (1920×1080), z widocznym kursorem i kółkiem przy kliknięciu. Przejścia między ekranami są przyspieszone, a odcinki z dymkami idą w normalnym tempie.
- **Dymki:** biała karta z zielonym paskiem u góry, tytuł i jedno zdanie, strzałka do elementu. Element w bursztynowej ramce, reszta ekranu lekko przyciemniona.
- **Osoba testowa:** Anna, umowa o pracę, pierwsze dziecko, poród przewidywany 1.12.2026. Dane fikcyjne.
- **Narracja nie opiera się na kwotach.** Kwoty widać na ekranach aplikacji, ale dymki mówią o tym, co przysługuje, o terminach, planie i wnioskach.
- Żadnych spraw ZUS, logotypów ZUS, mObywatela ani gov.pl. Nazwa i znak: Kompas Rodzica.

## Sceny

| # | Czas | Ekran | Dymki |
|---|---|---|---|
| 1 | 0:00–0:05 | Plansza: znak, „Kompas Rodzica”, „Ile, od kiedy i co złożyć.” | – |
| 2 | 0:05–0:11 | Plansza: „Ile wyniesie zasiłek? Od kiedy urlop? Co i do kiedy złożyć?” | „Kompas Rodzica odpowiada na to w jednym planie.” |
| 3 | 0:11–0:27 | Start, „Zaczynamy”, sekcja „Jak zacząć?”: obraz stoi, dymki po kolei przy trzech kaflach | **Logowanie przez login.gov.pl:** to symulacja, dane osoby testowej są już wprowadzone. **Wpisz dane ręcznie:** ankietę można wypełnić samodzielnie i sprawdzić działanie. **Szybki kalkulator:** szybkie przeliczenie świadczeń bez wypełniania całej ankiety. |
| 4 | 0:27–0:49 | Logowanie (symulacja mObywatela), wybór Anny, zgoda, pobrane dane | **Osoby testowe:** dane fikcyjne, tu Anna. **Zgoda na pobranie danych:** tylko to, co eZUS, mObywatel i e-Urząd Skarbowy naprawdę mają (symulacja). **Tego usługi nie mają:** resztę uzupełnia się w ankiecie. |
| 5 | 0:49–0:56 | Ankieta „Moja sytuacja” | **Ankieta krok po kroku:** jedno pytanie po drugim, prostym językiem. |
| 6 | 0:56–1:12 | Wynik, karta „Na co uważać” | **Co przysługuje** (przybliżenie). **Ile tygodni urlopu** (przybliżenie). **Na co uważać:** termin, którego nie można przegapić: co się stanie, dlaczego i co zrobić. |
| 7 | 1:12–1:25 | Plan: oś czasu, decyzje do podjęcia | **Plan na osi czasu:** urlopy od porodu do powrotu do pracy. **Decyzje do podjęcia:** każda z terminem, „Pokaż na osi” pokazuje skutek. |
| 8 | 1:25–1:35 | Kalendarz terminów | **Terminy do kalendarza** (.ics, przybliżenie). **Każdy termin z datą:** ile dni zostało i co trzeba zrobić. |
| 9 | 1:35–1:44 | Dokumenty | **Gotowe wnioski:** wypełnione danymi z przewodnika, z terminem. **Wysyłka do właściwego adresata:** pracodawca, płatnik albo eZUS (symulacja), z przybliżeniem. |
| 10 | 1:44–1:53 | Szybki kalkulator: data porodu i wynagrodzenie | **Wynik od razu:** wystarczą data porodu i zarobki, bez logowania i ankiety (przybliżenie). |
| 11 | 1:53–2:03 | Panel administratora | **Panel administratora:** parametry przepisów w wersjach z datą obowiązywania. **Zmiana bez programisty:** nowa stawka od razu zmienia wyniki (przybliżenie). |
| 12 | 2:03–2:10 | Wynik na telefonie obok widoku komputera | **Na telefonie i na komputerze:** układ dopasowuje się do ekranu. |
| 13 | 2:10–2:16 | Plansza końcowa: znak, nazwa, hasło | „Każda reguła ma w kodzie odwołanie do przepisu. Ponad 2000 testów automatycznych.” Bez dopisku „To symulacja” (widać go na ekranach aplikacji). |

## Jak powstaje

Projekt filmu jest poza repozytorium: `../Hacknation-film` (README z poleceniami). `nagranie/nagraj2.mjs` nagrywa sceny i zapisuje położenie elementów, `src/sceny2.ts` układa odcinki i dymki, kompozycja `Film2`. Plik: `out/kompas-rodzica-film.mp4`.
