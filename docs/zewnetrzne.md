# Rozwiązania zewnętrzne i użycie AI

Regulamin zadania ZUS (§ 4 ust. 1) wymaga wskazania w prezentacji wszystkich rozwiązań zewnętrznych, a opis zadania (pkt 4 i 9) – funkcji działających na AI i zakresu użycia AI przy tworzeniu. Ten plik jest źródłem do slajdu i do opisu projektu. **Dopisuj tu każdą nową zależność w chwili instalacji.**

## Biblioteki i narzędzia

| Nazwa | Wersja | Licencja | Do czego |
|---|---|---|---|
| Next.js | 16.4.6 | MIT | aplikacja webowa i REST API |
| React, React DOM | 19.3.0 | MIT | interfejs |
| Tailwind CSS (+ @tailwindcss/turbopack) | 4.3.3 | MIT | style, RWD |
| TypeScript (+ @types/node, @types/react, @types/react-dom) | 5.9.3 (typy: 22.20.5, 19.3.0, 19.3.0) | Apache-2.0 (typy: MIT) | język |
| Vitest | 5.1.1 | MIT | testy silnika |
| ESLint, eslint-config-next | 9.39.5, 16.4.6 | MIT | kontrola jakości kodu |
| Playwright (@playwright/test) | 1.63.0 | Apache-2.0 | testy end-to-end interfejsu (telefon i komputer), zrzuty ekranu do zgłoszenia |
| Tabler Icons (@tabler/icons-react) | 3.52.0 | MIT | ikony konturowe interfejsu (kalendarz, ostrzeżenie, informacja, źródło danych) |
| pdf-lib | 1.17.1 | MIT | wypełnianie wniosku ZAM, odczyt pól wgranego wniosku, PDF wniosków do pracodawcy (`src/forms/`) |
| @pdf-lib/fontkit | 1.1.1 | MIT | osadzanie fontu TTF z polskimi znakami w PDF |
| zależności pdf-lib: @pdf-lib/standard-fonts, @pdf-lib/upng, pako, tslib | 1.0.0, 1.0.1, 1.0.11, 1.14.1 | MIT; MIT; MIT i Zlib; 0BSD | instalowane razem z pdf-lib |
| Anthropic TypeScript SDK (@anthropic-ai/sdk) | 1.12.0 | Apache-2.0 | połączenie czatu ZuSik z Claude API (tylko po stronie serwera, `src/czat/model.ts`) |
| zależności pośrednie spoza MIT/Apache/BSD/ISC (nie wołamy ich bezpośrednio): sharp z binariami libvips (opcjonalna zależność Next.js; aplikacja nie używa `next/image`), lightningcss (build stylów), axe-core (lint), caniuse-lite (build) | 0.35.5, 1.32–1.33, 4.14.1, – | Apache-2.0 z binariami LGPL-3.0-or-later; MPL-2.0; MPL-2.0; CC-BY-4.0 | instalowane przez Next.js, Tailwind i eslint-config-next; nie trafiają do kodu aplikacji |
| zależności SDK Anthropic: @opentelemetry/api, json-schema-to-ts, ts-algebra, @babel/runtime, standardwebhooks, @stablelib/base64, fast-sha256 | 1.10.0, 3.1.1, 2.0.0, 7.29.15, 1.3.0, 1.0.1, 1.3.0 | Apache-2.0; MIT; MIT; MIT; MIT; MIT; Unlicense (domena publiczna) | instalowane razem z SDK; nie wołamy ich bezpośrednio |

## Fonty, ikony, grafiki

| Nazwa | Licencja | Do czego |
|---|---|---|
| Lato (Google Fonts przez `next/font/google`, wagi 400/700/900, latin + latin-ext) | SIL OFL 1.1 | krój pisma interfejsu, ten sam co na zus.pl |
| Noto Sans Regular i Bold, wersja 2.015 (pliki TTF z oficjalnego repozytorium github.com/notofonts, licencja w `src/forms/fonts/OFL.txt`) | SIL OFL 1.1 | polskie znaki w wypełnionym ZAM i we wnioskach do pracodawcy (PDF) |

## Materiały i dane

| Co | Skąd | Uwagi |
|---|---|---|
| Przepisy, poradnik, załącznik o zasiłkach | ZUS, materiały dla uczestników | źródło reguł silnika |
| Wzory ZAM, Z-3, Z-3a | zus.pl (wersje po 24.10.2026) | formularz ZAM wypełniamy programowo |
| Katalog świadczeń (`research/katalog-swiadczen.yaml`) | zespół, **przygotowany przed wydarzeniem** (20.11.2026) | sekcja „Inne wsparcie” |
| API ELI Sejmu (api.sejm.gov.pl/eli) | Kancelaria Sejmu, publiczne API aktów prawnych | panel admina pyta z serwera o to, czy akt z podstawy prawnej obowiązuje (pole `inForce`), tylko odczyt, bez danych użytkowników i bez klucza; wynik w pamięci serwera 6 godz.; gdy API nie odpowiada, zostaje sam przepis i link do ISAP; warunki wykorzystania: do sprawdzenia |
| Treści o świadczeniach i kontakt „Zapytaj ZUS” (`src/content/`) | zus.pl: strony o zasiłku macierzyńskim, chorobowym, pogrzebowym, rencie rodzinnej, 800+, Aktywnym Rodzicu, wzory formularzy „Zasiłki”, strona CKK, artykuł „ZUS dla przyszłych mam i rodziców” | sprawdzone 21.11.2026; teksty w aplikacji są naszymi słowami, bez cytatów |
| Becikowe, świadczenie rodzicielskie, świadczenie „Za życiem”, zgłoszenie urodzenia, odpis aktu, rejestr stanu cywilnego | gov.pl (w tym MRPiPS „Łatwiejszy dostęp do świadczeń po stracie ciąży”, licencja CC BY-SA 4.0) | sprawdzone 21.11.2026; kwoty z linkiem do źródła w `src/content/inneWsparcie.ts` |
| Porady prawne „Rodzicielstwo” | pip.gov.pl | link wymagany w zadaniu |
| Lista organizacji wsparcia (`src/content/organizacje.ts`) | oficjalne strony 5 fundacji + odpisy z API KRS Ministerstwa Sprawiedliwości (api-krs.ms.gov.pl) | tylko organizacje pożytku publicznego, sprawdzone 21.11.2026 |

## Inspiracje (wzorce, bez kopiowania kodu)

| Co | Skąd | Co wzięliśmy |
|---|---|---|
| Planer urlopu rodzicielskiego NAV (Norwegia) | github.com/navikt/foreldrepengesoknad, licencja MIT | układ: dwa tory rodziców, liczniki pul, plan jako propozycja do edycji |
| Elterngeldrechner mit Planer (Niemcy) | gitlab.opencode.de, licencja EUPL-1.2 | pomysł walidacji planu na żywo |
| Plan your Shared Parental Leave (Wielka Brytania) | gov.uk | terminy liczone z planu, udostępnianie planu linkiem |
| OpenFisca (Francja) | openfisca.org | parametry z datą obowiązywania i podstawą prawną |

Żaden fragment kodu z tych projektów nie trafił do repozytorium. Szczegóły: `research/03-istniejace-rozwiazania.md`.

## Użycie AI

**Przy tworzeniu:** kod, testy i dokumentacja powstawały z pomocą Claude Code (Anthropic). Reguły prawne zespół sprawdzał z przepisami.

**Funkcje z AI w aplikacji:** jedna – czat **ZuSik** („Zapytaj o swój plan”). Uprawnienia, plan i kwoty nadal liczy deterministyczny silnik reguł – te same dane zawsze dają ten sam wynik. AI tylko tłumaczy ten wynik.

### ZuSik – czat „Zapytaj o swój plan”

| | |
|---|---|
| **Co robi** | Tłumaczy prostym językiem wynik silnika: co przysługuje i na jakiej podstawie (przepis z wyniku), plan na osi czasu, kwoty, ryzyka, dokumenty i terminy. Odpowiada na pytania „dlaczego” i „co jeśli”. „Co jeśli” liczy silnik (ta sama funkcja co `POST /api/plan/action` + kalkulator); plan rodzica zmienia się dopiero, gdy kliknie „Zastosuj”. Pytania spoza danych aplikacji odsyła do ZUS (mama@zus.pl, infolinia, eZUS). |
| **Gdzie** | Okrągły przycisk z robocikiem w prawym dolnym rogu każdej strony dla rodzica (poza panelem admina). Bez wypełnionej ankiety ZuSik mówi, co sprawdzi aplikacja, i odsyła do ankiety – nie podaje wtedy kwot ani przepisów. Trasa `GET/POST /api/chat`, kod w `src/czat/` i `src/components/czat/`. |
| **Model** | Claude Opus 5.5 (`claude-opus-5-5`, Anthropic), Claude API przez oficjalne SDK, niski poziom wysiłku (krótkie odpowiedzi czatu). Gdy model odmówi odpowiedzi, API może ją powtórzyć na modelu zapasowym Anthropic (`fallbacks: "default"`). |
| **Jakie dane trafiają do modelu** | Wynik silnika (uprawnienia, pule, ryzyka, plan, walidacja, kwoty, dokumenty i terminy) i dane potrzebne do niego: role osób (mama, tata), tytuły ubezpieczenia z kwotami i datami, daty porodu i zwolnień. Pytanie rodzica i wcześniejsze pytania z tej rozmowy. |
| **Czego nie wysyłamy** | Imion, nazwisk, PESEL, adresów, numerów konta, telefonu, e-maila, dokumentu tożsamości, nazwy, NIP i REGON płatnika (biała lista pól, `src/czat/anonimizacja.ts`). Z pytania usuwamy PESEL, numer konta, e-mail, telefon oraz imiona, nazwiska i adres znane z profilu. Przykładowe sprawy ZUS nigdy nie trafiają do modelu. |
| **Wiedza o aplikacji** | Opis ekranów oraz kroków i pytań ankiety z wyjaśnieniami „po co pytamy”, „podpowiedź” i „skąd wziąć” (z `src/content/pytania.ts`) i FAQ – w stałej części zapytania. |
| **Zabezpieczenia** | Model nie liczy i nie cytuje przepisów z pamięci: strażnik (`src/czat/straznik.ts`) odrzuca odpowiedź z kwotą (także „tys. zł”), procentem albo artykułem, których nie ma w wyniku silnika, FAQ ani opisie ankiety; rodzic dostaje wtedy kontakt do ZUS. Niepełny albo uszkodzony profil i historia rozmowy nie powodują błędu. Limit czasu odpowiedzi mieści się w limicie funkcji na hostingu. Limit pytań (`src/czat/limit.ts`): domyślnie 60 na godzinę z jednego adresu IP i 500 na dobę łącznie, zmiana przez `ZUSIK_LIMIT_NA_GODZINE` i `ZUSIK_LIMIT_NA_DOBE`; po przekroczeniu odpowiedź 429 z komunikatem, za ile minut spróbować. Licznik jest w pamięci serwera (na hostingu bezserwerowym osobno w każdej instancji), adresów IP nie zapisujemy ani nie logujemy. Twardą granicą kosztów jest limit wydatków w konsoli Anthropic. Limit pytania 500 znaków, 10 wcześniejszych pytań, 4 kroki modelu na odpowiedź. Serwer niczego nie zapisuje; rozmowa żyje w przeglądarce do zamknięcia panelu. |
| **Bez klucza API** | Gdy na serwerze nie ma `ANTHROPIC_API_KEY`, `GET /api/chat` zwraca `{ "dostepny": false }`, przycisk się nie pokazuje, a reszta aplikacji działa bez zmian. |
| **Testy** | Vitest z atrapą modelu (`src/czat/__tests__/`), Playwright z przechwyconym `/api/chat` (`tests/e2e/zusik.spec.ts`). |

W nagłówku czatu zawsze: „Asystent AI” (rodzic wie, że rozmawia z AI); pasek „To symulacja. Wynik nie jest decyzją ZUS.” jest w stopce każdej strony.
