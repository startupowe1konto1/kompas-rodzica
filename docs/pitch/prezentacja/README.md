# Prezentacja: Zasiłkowy Przewodnik Przyszłego Rodzica

Prezentacja do zgłoszenia ZUS (HackNation 2026), zbudowana według [../INSTRUKCJA-DECK-PITCH.md](../INSTRUKCJA-DECK-PITCH.md) i [../DECK-PLAYBOOK.md](../DECK-PLAYBOOK.md). Ustalenia: [SPEC.md](SPEC.md). Stan i otwarte sprawy: [HANDOFF.md](HANDOFF.md).

## Pliki do oddania

- `docs/pitch/prezentacja.html` – jeden plik, działa otwarty z dysku, bez sieci (font, dane i zrzuty są w środku).
- `docs/pitch/prezentacja.pdf` – strona na slajd, stan końcowy każdego slajdu.

## Sterowanie

| Klawisz | Co robi |
|---|---|
| → spacja PageDown Enter, klik w prawej części | dalej; jedno naciśnięcie odgrywa cały slajd, naciśnięcie w trakcie przeskakuje do jego końca |
| ← PageUp, klik w lewej trzeciej części | poprzedni slajd w stanie końcowym |
| Home / End | pierwszy / ostatni slajd |
| F | pełny ekran |
| N | notatki prezentera |
| przesunięcie palcem | telefon: w lewo dalej, w prawo wstecz |

Adres `#slajd.krok` (np. `#5.3`) otwiera dany stan po odświeżeniu. `?print=1` pokazuje stan końcowy bez ruchu (tak samo `prefers-reduced-motion`).

## Jak przebudować

Aplikacja musi działać na `http://localhost:3000` (`npm run dev`) tylko dla kroków 1 i 2.

1. Liczby z silnika (REST API) i liczba testów → `dane.json`:
   `node docs/pitch/prezentacja/eksport-danych.mjs http://localhost:3000`
2. Zrzuty ekranów (persona testowa „Marta i Piotr”, systemowy Edge) → `img/`:
   `node docs/pitch/prezentacja/zrzuty-aplikacji.mjs http://localhost:3000`
3. Jeden plik HTML: `node docs/pitch/prezentacja/buduj.mjs`
4. Kontrole (kolejność animacji, adresy, rozmiary, brak sieci, telefon, konsola):
   `node docs/pitch/prezentacja/sprawdz.mjs`
5. PDF: `node docs/pitch/prezentacja/klatki.mjs --pdf`

Podgląd źródeł bez budowania: `node docs/pitch/prezentacja/serwuj.mjs 3100`, potem `http://localhost:3100/prezentacja/src/index.html` (źródła) albo `http://localhost:3100/` (zbudowany plik).

## Jak zmienić slajd

- Treść i kolejność: `src/index.html`. Slajd to `<section class="slajd" data-name="…">`. Treść pojawia się razem ze slajdem.
- Jedyna animacja slajdu (jeśli jest): `src/deck.js`, obiekt `KONFIG` (klucz = `data-name`). Silnik nie pozwala na więcej niż jedną i na wejścia element po elemencie (`data-k`).
- Ukrycie slajdu bez usuwania: atrybut `data-pomin` na sekcji.
- Notatki prezentera: `<aside>` w sekcji.
- Liczby: nigdy w HTML. Wstawia je `deck.js` z `dane.json` (`data-w`, `data-lw`); brakujące pole zatrzymuje stronę błędem.
- Kolory i typografia: `src/deck.css`, tokeny z aplikacji (`app/globals.css`).

## Rozwiązania zewnętrzne użyte w prezentacji

Font Lato (SIL OFL 1.1, te same pliki co w aplikacji), Playwright (Apache-2.0) i pdf-lib (MIT) do zrzutów i PDF – wszystkie już są w `docs/zewnetrzne.md`. Nowych zależności nie ma.
