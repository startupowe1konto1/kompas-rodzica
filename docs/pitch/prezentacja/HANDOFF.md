# Prezentacja: handoff

Stan na 22.11.2026, ok. 01:30. Właściciel prezentacji: Mikołaj (tor D). Czytaj po [README.md](README.md) i [SPEC.md](SPEC.md). Instrukcje zespołu: [../INSTRUKCJA-DECK-PITCH.md](../INSTRUKCJA-DECK-PITCH.md) i [../DECK-PLAYBOOK.md](../DECK-PLAYBOOK.md).

## Co jest zrobione

- 10 slajdów, jedna oś czasu rodziców prowadzi przez cały deck (tytuł → hook → problem → rozwiązanie → decyzje → zamknięcie).
- Każda kwota, data, komunikat i liczba testów pochodzi z `dane.json` (eksport z REST API silnika). Dane z commita `94817a2`; silnik, mocki i `app/api` nie zmieniły się do `a73d0bf`, więc liczby są aktualne.
- Zrobione według instrukcji Wojtka: jedno naciśnięcie na slajd, adres `#slajd.krok`, `?print=1`, `data-pomin`, slajdy po `data-name`, `deckBusy()`, przesuwanie palcem, scena `position: fixed` ze skalą z `clientWidth`, przejścia ok. 250 ms, kroki ok. 300 ms, bez etykiet wersalikami, bez akcentu jednego słowa innym kolorem, bez kropek-separatorów.
- `sprawdz.mjs`: wszystkie kontrole zielone (przejście 1 → 10 i z powrotem, treść bez wejść krok po kroku, najwyżej jedna animacja, adresy po odświeżeniu, 1280×720 i 1920×1080 bez wyjścia poza scenę, zero zapytań sieciowych, telefon w pionie, konsola bez błędów).
- PDF: 10 stron, ok. 2,2 MB.
- Twierdzenia ze slajdów sprawdzone w kodzie: `.ics` (`app/api/documents/ics`), odczyt ZAM (`src/forms/odczyt.ts`), wnioski do pracodawcy (`src/forms/pracodawca.ts`), wersje parametrów z `obowiazujeOd` w panelu admina, brak zapisu danych na serwerze w `app/api`.

## Stan slajdów (wersja 2)

| # | data-name | Stan | Uwagi |
|---|---|---|---|
| 1 | tytul | gotowy | makieta laptopa i telefonu |
| 2 | problem | gotowy | 87% z komunikatu ZUS z 27.05.2026 (research/04-problemy-rodzicow.md, sekcja F); cel ZUS z opisu zadania |
| 3 | rozwiazanie | gotowy | cztery filary aplikacji |
| 4 | decyzje | gotowy | Magda i Paweł, dane fikcyjne; skutek i termin na klik |
| 5 | wymagania | gotowy | punkty a–j; opis każdego zgodny z tabelą w docs/zgloszenie/opis-projektu.md |
| 6 | symulacje | gotowy | zrzut „Pobieramy Twoje dane” |
| 7 | kwoty | gotowy | |
| 8 | korzysci | gotowy | |
| 9 | zamkniecie | czeka na linki | `[link do demo]`, `[link do repozytorium]` |
| 10 | zewnetrzne | gotowy | załącznik po „Dziękujemy”, wymóg regulaminu; nie pokazujemy na scenie |

## Czego brakuje według instrukcji

1. **Etap 0, wywiad** (instrukcja PL, cz. 2): pytania otwarte do właściciela. Bez odpowiedzi nie piszemy scenariusza.
2. **`scenariusz.md`** (cz. 3): teza, SCQA, tabela „pitch w skrócie” z czasami i kryteriami oceny, tekst mówiony (130 słów/min, liczone skryptem), kolejność cięć, tabela liczb i źródeł, „czego nie mówimy”, plan B dla demo. Notatki w `<aside>` przepisać ze scenariusza.
3. **Nagłówek slajdu 7** to temat, nie wniosek (Minto).
4. **`pytania.md`** (cz. 8): 8–10 pytań jury z odpowiedziami do 30 s.
5. **Nowe zrzuty** z aktualnego `main`. Na tym laptopie `next dev` (Turbopack) pada z braku pamięci w trakcie zrzutów (`memory allocation … failed`). Zrób je na innym komputerze albo po zamknięciu innych programów: `npm run build && npm start`, potem krok 2 z README.
6. **Próba z zegarem** i pokaz na laptopie, który będzie na scenie (ludzie).

## Decyzje podjęte

| Decyzja | Kto, kiedy |
|---|---|
| Nazwa: „Kompas Rodzica”, podtytuł „Zasiłkowy przewodnik przyszłego rodzica”. Znak kompasu (`img/logo-znak.svg`, kopia z `docs/nazwa-i-logo/` z gałęzi `logo-kompas-rodzica` Wojtka) na slajdach 1 i 9. | Mikołaj, 22.11 |
| Wersja 2: pieniądze nie są na pierwszym planie; deck pokazuje wymagania zadania i to, co aplikacja rozwiązuje (problem, cztery filary, decyzja i skutek, a–j, uczciwe symulacje, kalkulator jako dowód poprawności, korzyści). Slajd „+18 001 zł” i osobny slajd ze zrzutami usunięte. | Mikołaj, 22.11 |
| Wersja 1: pełny pitch przed jury; bogatsze wizualnie (kafle, ikony, makiety), zmiana planu na klik na slajdach 3 i 5, bez slajdu z liczbami repozytorium, rozwiązania zewnętrzne jako załącznik po „Dziękujemy”. | Mikołaj, 22.11 |
| Oś czasu tylko na slajdach 3 i 5, gdzie niesie narrację; na 1, 4 i 10 była ozdobą i zniknęła. | Mikołaj, 22.11 |
| Historia: problem → case study (Magda i Paweł) → rozwiązanie. Stonowane kolory i animacje (tylko slajdy 3 i 5), bez zielonego paska, tło z siatką oktagonów jak w aplikacji. | Mikołaj, 22.11 |
| Mniej treści na slajdach i najwyżej jedna animacja na slajd, tylko najważniejsza; treść bez wejść element po elemencie. Animacje: 1 oś się rysuje, 2 plan się zmienia i kwota rośnie, 3 oś rozpada się na przepisy, 4 kawałki wracają na oś, 5 decyzja przesuwa urlop na tatę, 6 suma rośnie, 10 oś się rysuje; 7–9 bez animacji. | Mikołaj, 22.11 |
| Jedno naciśnięcie odgrywa cały slajd (jak w playbooku), naciśnięcie w trakcie przeskakuje do końca slajdu. Kroki na naciśnięcie (instrukcja PL, pod pilota) nie są używane. | Mikołaj, 22.11 |

## Decyzje do podjęcia

| Pytanie | Domyślnie, jeśli nikt nie zdecyduje |
|---|---|
| Czy wersja HTML i PDF trafiają do repo (`docs/pitch/`) | nie commitujemy bez zgody właściciela |
| Linki do demo i repozytorium na slajdzie 10 | miejsca do uzupełnienia |
