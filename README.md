# Kompas Rodzica

**Zasiłkowy Przewodnik Przyszłego Rodzica** – rozwiązanie zadania ZUS na HackNation 2026 (Bydgoszcz, 21–22 listopada 2026).

Aplikacja pokazuje przyszłym rodzicom, jakie świadczenia z ZUS im przysługują w ciąży i po porodzie, ile wyniosą i od kiedy. Układa urlopy obojga rodziców na osi czasu, przygotowuje wnioski z terminami i ostrzega przed ryzykiem, zanim pojawi się problem.

> To symulacja. Wynik nie jest decyzją ZUS.

## Linki

| Co | Gdzie |
|---|---|
| **Demo (strona internetowa)** | https://kompas-rodzica.netlify.app |
| **Repozytorium kodu** | https://github.com/startupowe1konto1/kompas-rodzica |
| **Film (2:16)** | [Kompas Rodzica na Dysku Google](https://drive.google.com/file/d/19RFV5skizuaH-gFJqwSf3oi4QUK9xF4H/view?usp=sharing) – scenariusz: [`docs/pitch/SCENARIUSZ-FILMU.md`](docs/pitch/SCENARIUSZ-FILMU.md) |
| **Prezentacja** | [`docs/pitch/prezentacja.pdf`](docs/pitch/prezentacja.pdf) (wersja HTML: [`docs/pitch/prezentacja.html`](docs/pitch/prezentacja.html)) |
| **Zrzuty ekranu (telefon i komputer)** | [`docs/zrzuty/`](docs/zrzuty/) |
| **Funkcje z AI i rozwiązania zewnętrzne** | [`docs/zewnetrzne.md`](docs/zewnetrzne.md) |
| **Logo i materiały graficzne** | [`docs/nazwa-i-logo/`](docs/nazwa-i-logo/) |

Zespół **vibecodersi**: Oskar Pelzer, Mateusz Wojciechowski, Wojciech Rudnicki, Mikołaj Konieczny.

## Jak przetestować demo

1. Otwórz https://kompas-rodzica.netlify.app (działa na telefonie i komputerze).
2. Wybierz jeden ze sposobów wejścia:
   - **Logowanie mObywatelem (symulacja)** – wybierasz osobę testową, a aplikacja „pobiera” jej dane z symulowanych usług (ZUS, eZUS, e-ZLA, zaświadczenie o zadłużeniu w składkach). Osoby testowe: Anna (umowa o pracę), Kasia (umowa zlecenia), Ola (własna firma), Monika (firma z zaległością w składkach), Marta i Piotr (bliźnięta), Ewa i Tomek (oboje rodzice), Joanna (przysposobienie). Wszystkie dane są fikcyjne.
   - **Wpisz dane ręcznie** – ankieta „Moja sytuacja”, np. poród 1 stycznia 2027.
   - **Wgraj wniosek** – edytowalny wniosek ZAM w PDF (np. wzór z zus.pl wypełniony na komputerze albo ZAM pobrany z aplikacji). Aplikacja czyta pola formularza i przenosi dane do ankiety do sprawdzenia. Skanów i pisma odręcznego nie czyta (bez OCR).
3. Zobacz **Wynik**, potem **Plan urlopów**, **Dokumenty** i **Kalendarz terminów**.
4. **Panel administratora:** https://kompas-rodzica.netlify.app/admin – odczyt bez hasła, zapis zmian po podaniu hasła. Hasło podajemy w opisie zgłoszenia w HackTribe.

Aplikacja nie zakłada kont i nie przechowuje danych rodzica na serwerze: profil zostaje w przeglądarce, a serwer tylko liczy wynik.

## Co jest w aplikacji (punkty a–j z opisu zadania)

| Punkt | Wymaganie | Gdzie w aplikacji |
|---|---|---|
| a) | świadczenia w czasie ciąży, także brak uprawnień: zasiłek chorobowy, świadczenie rehabilitacyjne, zasiłek w wysokości zasiłku macierzyńskiego | **Wynik** (`/wynik`): każde świadczenie z powodem i przepisem, także „nie przysługuje, bo…” |
| b) | kalkulator zasiłku macierzyńskiego dla obojga rodziców (liczba dzieci, wiek, „Za życiem”) | **Moja sytuacja** (`/sytuacja`) → **Wynik** i **Plan urlopów** (`/plan`); szybkie wyliczenie: **Szybki kalkulator** (`/kalkulator`) |
| c) | łączenie pracy z urlopem rodzicielskim | **Plan urlopów** (`/plan`): zmiana odcinka na oś czasu, kwota i wydłużenie urlopu liczone na żywo |
| d) | oboje rodzice korzystają z uprawnień | **Dodaj osobę** (`/osoba`), **Plan urlopów** (`/plan`) i **Porównaj warianty** (`/plan/porownanie`) |
| e), j) | rodzice adopcyjni i rodzina zastępcza | **Moja sytuacja** (przyjęcie dziecka na wychowanie) → **Wynik** i **Plan urlopów**; osoba testowa Joanna |
| f) | indywidualna podstawa wymiaru zasiłku | **Moja sytuacja** (wynagrodzenia, przychód z działalności) albo **wgrany wniosek ZAM**; na **Wyniku** pełna ścieżka wyliczenia kwoty |
| g) | dokumenty, terminy i miejsce złożenia (płatnik czy ZUS) | **Dokumenty** (`/dokumenty`) z wypełnionym ZAM i wnioskami do pracodawcy w PDF; **Kalendarz terminów** (`/kalendarz`) z eksportem `.ics` |
| h) | zagrożenia i ryzyka utraty lub zmiany świadczeń | **Wynik** (ryzyka z tym, co warto przygotować) i ostrzeżenia na **Planie urlopów** |
| i) | organizacje wyłącznie charytatywne w trudnych sytuacjach | **Trudne sytuacje** (`/trudne-sytuacje`) |

Wszystkie kalkulatory działają w jednym narzędziu: ankieta → wynik → plan, z opcjami wybieranymi w ankiecie i na osi czasu.

**Symulacje wymagane w zadaniu:** logowanie mObywatelem i dane z ZUS (`/logowanie`), zadłużenie składkowe na dzień powstania prawa do świadczenia, podgląd e-ZLA, połączenie z PUE/eZUS, wypełnienie i wysłanie wniosków do pracodawcy albo w eZUS (`/dokumenty`), wniosek o odpis aktu stanu cywilnego (`/trudne-sytuacje`), przekierowania do zus.pl, gov.pl i pip.gov.pl (stopka każdej strony). Symulacja usługi zwraca tylko te dane, które ta usługa naprawdę ma ([`docs/zrodla-danych.md`](docs/zrodla-danych.md)).

## Funkcje z AI

Jedna funkcja działa z AI: czat **ZuSik** („Zapytaj o swój plan”, przycisk w prawym dolnym rogu). Tłumaczy prostym językiem wynik silnika reguł. Uprawnienia, plan i kwoty liczy deterministyczny silnik bez AI, więc te same dane zawsze dają ten sam wynik. Model: Claude (Anthropic) przez Claude API. Do modelu nie trafiają imiona, nazwiska, PESEL, adresy ani numery kont.

**Przy tworzeniu:** kod, testy i dokumentacja powstawały z pomocą Claude Code (Anthropic). Reguły prawne zespół sprawdzał z przepisami.

Szczegóły (dane wysyłane do modelu, zabezpieczenia, testy): [`docs/zewnetrzne.md`](docs/zewnetrzne.md), sekcja „Użycie AI”.

## Rozwiązania zewnętrzne

Biblioteki (wyłącznie licencje MIT, Apache-2.0, BSD, ISC i pochodne), fonty, źródła treści i wzorce z innych krajów są wymienione w [`docs/zewnetrzne.md`](docs/zewnetrzne.md). Przed wydarzeniem zespół przygotował katalog świadczeń i formalności: [`research/katalog-swiadczen.yaml`](research/katalog-swiadczen.yaml). Wzory ZAM, Z-3 i Z-3a pochodzą z zus.pl ([`materialy/ZUS/wzory-formularzy/`](materialy/ZUS/wzory-formularzy/)).

## Architektura

Jedna aplikacja Next.js (React, TypeScript), responsywna (RWD), z REST API.

```
przeglądarka (React, src/components, app/)
      │  REST API (src/lib/api.ts)
      ▼
trasy API (app/api/**) ──► silnik reguł (src/engine): czyste funkcje TypeScript
      │                      uprawnienia i pule → planer wariantów → kalkulator → dokumenty i terminy
      ├─► parametry z datą obowiązywania (src/server/magazynParametrow.ts, panel /admin)
      ├─► wnioski PDF (src/forms, pdf-lib)
      ├─► symulowane usługi: mObywatel, ZUS, eZUS, e-ZLA (src/mocks)
      └─► czat ZuSik (src/czat, Claude API)
```

- **Silnik reguł** (`src/engine/`) to czyste funkcje bez sieci, plików i zegara. Każda reguła ma komentarz z przepisem (np. `// KP art. 180 § 4`).
- **Parametry z przepisów** (stawki, tygodnie, terminy, kwoty) nie są wpisane w kod. Każda wersja parametrów ma datę obowiązywania i podstawę prawną. Panel `/admin` dodaje nową wersję, np. po nowelizacji, i pokazuje, czy akt prawny obowiązuje (API ELI Sejmu).
- **Interfejs** rozmawia z silnikiem tylko przez REST API.
- Gdy przepis nie rozstrzyga sprawy wprost, aplikacja pokazuje „wymaga potwierdzenia w ZUS” zamiast zgadywać. Pytania i odpowiedzi mentorów ZUS: [`docs/pytania-do-mentora.md`](docs/pytania-do-mentora.md).

## REST API

| Metoda i trasa | Co robi |
|---|---|
| `POST /api/eligibility` | uprawnienia, pule tygodni, możliwości wyboru i ryzyka |
| `POST /api/plan/default` | plan domyślny i gotowe scenariusze |
| `POST /api/plan/action` | zmiana na osi czasu (przesuń, skróć, podziel, przenieś…) z oceną nowego planu |
| `POST /api/plan/validate` | błędy, ostrzeżenia i konsekwencje planu |
| `POST /api/plan/shift` | „dziecko się urodziło”: plan przesunięty na faktyczną datę porodu |
| `POST /api/calculate` | kwoty dla każdego odcinka planu ze ścieżką wyliczenia |
| `POST /api/documents` | kto wypłaca, lista dokumentów i terminy |
| `POST /api/documents/ics` | terminy jako plik kalendarza `.ics` |
| `POST /api/forms/{kod}` | wypełniony wniosek w PDF (ZAM, wnioski do pracodawcy) |
| `POST /api/forms/odczyt` | odczyt pól wgranego wniosku ZAM do profilu |
| `GET /api/mock/persony` | osoby testowe do symulowanego logowania |
| `GET /api/mock/{zrodlo}/{persona}` | symulowana odpowiedź usługi (mObywatel, ZUS, eZUS, e-ZLA…) |
| `GET`, `PUT /api/admin/params` | wersje parametrów; zapis i reset wymagają hasła |
| `GET /api/admin/eli` | czy akty prawne z podstaw parametrów obowiązują (API ELI Sejmu) |
| `GET`, `POST /api/chat` | czat ZuSik: dostępność i odpowiedź |

Typy danych wejściowych i wyjściowych: [`src/engine/types.ts`](src/engine/types.ts).

## Uruchomienie lokalne

Wymagany Node.js 22.12 lub nowszy.

```bash
npm ci
npm run dev       # aplikacja na http://localhost:3000
npm test          # testy silnika (Vitest)
npm run e2e       # testy interfejsu na telefonie i komputerze (Playwright)
npm run check     # typy + testy + lint
npm run build     # build produkcyjny
```

Zmienne środowiskowe są opisane w [`.env.example`](.env.example). Bez nich aplikacja działa. Bez `ANTHROPIC_API_KEY` nie ma czatu ZuSik, a bez `ADMIN_HASLO` panel admina tylko odczytuje parametry. Na hostingu bezserwerowym ustaw `MAGAZYN_PARAMETROW=pamiec`.

## Testy

Ponad 2000 testów jednostkowych silnika, kalkulatora, wniosków i czatu (Vitest) oraz testy end-to-end całej ścieżki rodzica na telefonie i komputerze (Playwright, `tests/e2e/`). Wszystkie dane w testach są fikcyjne.

## Struktura repozytorium

```
app/            strony i trasy REST API (Next.js)
src/engine/     silnik reguł: uprawnienia, planer, kalkulator, dokumenty, parametry
src/components/ interfejs
src/forms/      wnioski PDF (ZAM, wnioski do pracodawcy)
src/mocks/      symulowane usługi i osoby testowe
src/czat/       czat ZuSik (AI)
src/content/    treści: linki, organizacje wsparcia, inne świadczenia
tests/e2e/      testy interfejsu (Playwright)
docs/           źródła danych, rozwiązania zewnętrzne, zrzuty ekranu, prezentacja
materialy/ZUS/wzory-formularzy/  wzory wniosków z zus.pl
```

Przykładowych spraw udostępnionych przez ZUS nie ma w repozytorium ani w demo. Opis zadania zabrania ich kopiowania i rozpowszechniania.
