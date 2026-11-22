# Design: Zasiłkowy Przewodnik Przyszłego Rodzica

Kierunek wizualny toru C. Każdy ekran i komponent trzyma się tych zasad. Zmiana zasady = zmiana w tym pliku i w tokenach `app/globals.css`, nie w pojedynczym komponencie.

## Kim jest użytkownik

- **Rodzic** (najczęściej w ciąży), na telefonie, w domu albo w przerwie w pracy. Zestresowany, nie zna przepisów, chce wiedzieć: ile, od kiedy, co mam zrobić. Czasem czyta z drugim rodzicem na jednym ekranie.
- **Jury ZUS** na laptopie wpisuje własne dane (np. poród 1.01.2027) i sprawdza, czy liczby się zgadzają i czy widać wszystkie warianty.

Dlatego: najpierw telefon (375 px), duże i konkretne liczby, jedna główna akcja na ekran, każda decyzja widoczna na osi czasu.

## Charakter

**Konkretny, wyrazisty, po ZUS-owsku.** Pełne kolory zamiast pasteli, kafle, mocne nagłówki, cienkie ikony konturowe. Spokój budujemy językiem (bez straszenia, bez czerwonych alarmów przy ryzykach), nie wypranym kolorem.

**Dwa tryby (inspiracje Wojtka, 21.11):**

1. **Bento w aplikacji** (wzór: siatka kafli z pomarańczowym akcentem). Jasnoszare tło strony, białe kafle z dużym zaokrągleniem, w każdym widoku **jeden kafel w pełnym kolorze** z najważniejszą liczbą (np. kwota na zielonym kaflu), reszta biała. Statusy jako małe znaczniki z kropką i liczbą. Kalendarz jako rząd kafli dni z wyróżnionym dniem w pełnym kolorze.
2. **Szkło na zieleni tylko na ekranie startowym** (wzór: matowe szklane kafle, tło z siatką pikseli i światłem; kolor zmieniony z niebieskiego na zielony ZUS, decyzja Wojtka 21.11). Ciemne tło od głębokiej zieleni (ok. #013d1c) przez `zielen-ciemna` do `zielen`, z delikatną siatką pikseli i jaśniejszą zieloną poświatą (własne CSS/SVG, nie zdjęcie). Poświata nie może być jaśniejsza niż `zielen` (#007834) tam, gdzie stoi biały tekst, żeby zachować kontrast ≥ 4,5:1. Na nim szklane kafle trzech wejść: półprzezroczysta biel, rozmycie tła, cienka jasna ramka, **biały tekst** (kontrast liczymy względem najjaśniejszego miejsca tła). Szklane ikony w tym samym stylu. Poza ekranem startowym nie ma szkła: na jasnym tle szkło traci kontrast i czytelność. Główny przycisk na tym ekranie: pełny `bursztyn` z tekstem `granat` (dobrze odcina się od zieleni).

Skąd: kolory zmierzone na zus.pl i eZUS (21.11.2026), font jak na zus.pl. Nie używamy logotypów ZUS, mObywatela ani gov.pl, liter „ZUS” w kroju logo ani seledynu z logo eZUS (#bcd144).

Odrzucone z generatora `ui-ux-pro-max`: wideo w hero, granatowo-niebieska paleta, font Lexend. Wzięte: zasady dostępności (niżej).

## Decyzje per obszar (Wojtek, 21.11, z moodboardu)

| Obszar | Decyzja | Wzór |
|---|---|---|
| Ankieta (C3) | **Jedno pytanie na ekran** na telefonie: pasek z segmentami u góry („3 z 8”), duże kafle odpowiedzi (cała szerokość, min. 56 px), przycisk „Dalej” przyklejony na dole. Każda sekcja (Ty, praca, dziecko) zaczyna się kolorowym ekranem otwierającym w pełnym kolorze. Na komputerze może być kilka pytań jednej sekcji naraz. Na końcu ekran „Twój plan jest gotowy”. | kurs językowy 01/05, fitness, Heap |
| Wynik i kwoty (C4) | **Ciemnozielony kafel** (`zielen-noc` #013d1c) z dużą kwotą miesięczną, białym tekstem i nagłówkiem; obok kafel w pełnej `zielen` (np. „razem za cały urlop”, biały tekst), reszta białe kafle. To jedyna para kolorowych kafli w widoku. Bursztyn zostaje tylko dla terminów i ostrzeżeń. | Spruce |
| Liczniki puli | **Pasek z kreskami**: jedna kreska = jeden tydzień. Wykorzystane/zaplanowane – pełne w kolorze typu; wolne – szare; przepadające – w kratkę z napisem „przepadnie”. Nad paskiem liczba słownie: „Zostało 12 z 41 tygodni”. | Progress Indicator, Goal Progress |
| Oś czasu (C5) | **Jasny gantt z pigułkami**: odcinki jako zaokrąglone pigułki w kolorach typu z liczbą tygodni w małym znaczniku, pionowa linia „Dziś” ze znacznikiem u góry i linia porodu, siatka miesięcy. Akcje: duże przyciski +/− („tydzień krócej / dłużej”). Na telefonie domyślnie lista tych samych odcinków. **Wybory (decyzja 21.11, wariant C z linią z B z prototypu trzech wariantów, usuniętego przed zgłoszeniem):** na osi ponumerowane okna wyboru nad siatką; pod osią numerowane karty decyzji („Decyzja 2 … Zdecyduj do 2 marca 2027”) z dwoma dużymi kafelkami „W planie” / „Pokaż na osi”; wybranie alternatywy dorysowuje pod każdym rodzicem wiersz „po zmianie” z przerywanymi pigułkami tylko tych odcinków, które się zmieniają (przy 81,5% nowa stawka na pigułkach); dla wybranej decyzji pinezka na wierszu osoby, która decyduje („Decyduje mama”), i przerywana linia do miejsca skutku na wierszu drugiego rodzica. | Workflow plan (w jasnej wersji), Water, prototyp C+B |

Dodatkowo z moodboardu: jedna ogromna liczba (Lato 900) przy najważniejszej wartości ekranu; wybór 81,5% albo 100/70 można pokazać jako dwa duże kafle do porównania.

## Kolory

| Token | HEX | Do czego | Kontrast z białym |
|---|---|---|---|
| `zielen` | #007834 | główna akcja, linki, stopka, macierzyński na osi (belki u góry strony już nie ma, decyzja 21.11) | 5,6:1 |
| `zielen-ciemna` | #025a28 | hover i wciśnięcie zielonych elementów | 8,4:1 |
| `granat` | #00416e | nagłówki, przycisk na bursztynie, ramka fokusu | 10,6:1 |
| `granat-ciemny` | #283754 | pasek „To symulacja”, karty ryzyka | 11,9:1 |
| `bursztyn` | #fab856 | **tylko tło**: termin i „zrób teraz”; tekst na nim zawsze `granat` (6,1:1) | jako tekst 1,7:1 – zakaz |
| `szary-kafel` | #ececec | tła kafli i liczników | – |
| `szary-linia` | #d4d4d4 | tylko ozdobne podziały i obramowania kart (nie pól) | 1,5:1 |
| `szary-ramka` | #858585 | ramki pól formularza i wyboru (WCAG 1.4.11 wymaga ≥ 3:1) | 3,7:1 |
| `tekst` | #1b1b1b | treść | 17:1 |
| `tekst-drugi` | #4a4a4a | opisy, podpisy | 8,9:1 |
| `blad` | #d5233f | błąd blokujący („nie można, bo…”), pełne tło z białym tekstem | 5,1:1 |
| `sukces` | #4e7522 | potwierdzenia (przyciemniona zieleń z eZUS #598527, która ma tylko 4,4:1) | 5,4:1 |
| `info` | #0052a5 | „wymaga potwierdzenia w ZUS”, informacje | 7,6:1 |

**Jeden kolor = jedno znaczenie.** Zieleń to „działaj / przysługuje / Twoje pieniądze”, bursztyn to „uwaga: termin, zrób teraz, ostrzeżenie w planie”, czerwień tylko błąd, który blokuje plan. Kolor nigdy nie niesie znaczenia sam: zawsze jest też tekst albo ikona.

## Oś czasu: kolory odcinków

Pełne wypełnienie, biały tekst w środku (nazwa skrócona, gdy się mieści), kontrast ≥ 5:1.

| Typ odcinka | Kolor | HEX |
|---|---|---|
| `macierzynski`, `na_warunkach_macierzynskiego`, `w_wys_macierzynskiego` | zieleń | #007834 |
| `rodzicielski` | granat | #00416e |
| `ojcowski` | morski | #006d77 |
| `uzupelniajacy` | fiolet | #5b3f8c |
| `chorobowy_ciaza` | grafit | #5e6670 |
| `wychowawczy` (bezpłatny) | brąz | #7a5c2e |
| `praca` | `szary-kafel` + ciemny tekst | #ececec |
| `przerwa` | białe tło, przerywana ramka `szary-linia` | – |

- Łączenie urlopu z pracą (`wymiarPracy`): kolor typu z ukośnymi białymi paskami (repeating-linear-gradient), etykieta „+ praca 1/2 etatu”.
- Odcinek z błędem: ramka 3 px `blad` i ikona ostrzeżenia; w etykiecie dla czytnika „ten odcinek ma błąd w planie”.
- Tygodnie, które przepadną: ten sam kolor co pula, wzór kratki, napis „przepadnie”.
- Znaczniki: poród – pionowa linia `granat` 2 px z etykietą; dziś – linia przerywana `tekst-drugi`.

## Typografia

Font: **Lato** (SIL OFL 1.1, przez `next/font/google`, podzbiory latin i latin-ext), wagi 400, 700, 900.

| Rola | Telefon | Komputer | Waga |
|---|---|---|---|
| Kwota główna | 32 px | 40 px | 900, `tabular-nums` |
| H1 | 26 px | 32 px | 900 |
| H2 | 22 px | 24 px | 700 |
| H3 | 18 px | 20 px | 700 |
| Treść | 16 px | 17 px | 400, interlinia 1,6 |
| Podpis, etykieta osi | 14 px | 14 px | 400 (nigdy mniej niż 14 px) |

Linia tekstu ciągłego najwyżej ok. 70 znaków (`max-w-prose`). Kwoty i daty zawsze z `src/components/format.ts`.

## Kształty i odstępy

- Promień: 8 px przyciski i pola, 16 px kafle i karty, 12 px komunikaty, 6 px odcinki osi, pełne zaokrąglenie tylko dla małych znaczników statusu.
- Tło strony `tlo` (#f3f4f6), na nim białe kafle. Głębia z różnicy tła; cień tylko jeden, delikatny (`shadow-kafel`), dla kafla „pływającego” nad innymi (np. podgląd odcinka). Bez gradientów poza tłem ekranu startowego.
- Belka 6 px `zielen` na górze strony (motyw z zus.pl).
- Odstępy: skala Tailwind (4 px). Karta: padding 16 px na telefonie, 24 px na komputerze. Sekcje co 32–48 px.
- Szerokość treści: `max-w-3xl` dla ankiety i wyniku, `max-w-6xl` dla planera i porównania.

## Komponenty

- **Przycisk główny:** pełna `zielen`, biały tekst 700, min. wysokość 48 px, hover `zielen-ciemna`. Jeden na ekran.
- **Przycisk drugi:** biały, ramka 2 px `zielen`, tekst `zielen`.
- **Przycisk na bursztynie:** pełny `granat`, biały tekst (jak w komunikacie terminu).
- **Pole:** etykieta nad polem (zawsze widoczna), ramka 1 px `szary-ramka`, wysokość 48 px, błąd: ramka 2 px `blad` + komunikat pod polem z ikoną.
- **Komunikat „termin / zrób teraz”** (wariant A, wybrany 21.11): pełny `bursztyn`, tekst `granat`, ikona kalendarza 24 px, nagłówek 700 z datą, zdanie wyjaśnienia, po prawej przycisk `granat` („Dodaj do kalendarza”); na telefonie przycisk pod tekstem na całą szerokość.
- **Bez kolorowych pasków przy krawędzi karty** (np. `border-l-4` w kolorze) – nigdy, decyzja Wojtka 22.11. Wyróżnienie daje ikona w kolorze, nagłówek albo pełne tło.
- **Karta ryzyka:** biała karta z cienką szarą ramką, ciemny tekst, ikona w `bursztyn`, termin jako zwykła linia „Termin: do …” (zmiana 21.11: pełny granat był „za agresywny”). Trzy części: co może się stać, dlaczego, co możesz zrobić; opcjonalnie lista „co warto mieć przygotowane”.
- **Błąd planu („nie można, bo…”):** pełna `blad`, biały tekst, przepis w osobnej linii.
- **Znacznik uprawnienia:** pełne tło, biały tekst 700: „Przysługuje” (`zielen`), „Nie przysługuje” (grafit #5e6670), „Do potwierdzenia w ZUS” (`info`).
- **Znacznik źródła danych:** ramka 1 px `granat`, tekst `granat` 14 px, mała ikona; „z eZUS (symulacja)”.
- **Kafel liczby** (`KafelLiczby`): domyślnie biały na tle `tlo`; `szary` tylko wewnątrz białej karty; warianty w kolorze: `zielen-noc` i `zielen` (para kafli z kwotami w wyniku), `bursztyn` (termin), `granat`. Podpis 14 px nad liczbą, liczba 900.
- **Licznik puli** (`LicznikPuli`): pasek z kreskami, jedna kreska = jeden tydzień; wykorzystane/zaplanowane pełne w kolorze typu, wolne białe z ramką `szary-ramka` (≥ 3:1), przepadające w paski z napisem „przepadnie”; nad paskiem „Zostało 9 z 41 tygodni”.
- **Znacznik statusu** (`ZnacznikStatusu`): mały, w pełni zaokrąglony znacznik z kropką i liczbą, np. „Teraz • 3”; tony: bursztyn, zielen, blad, granat, info, szary.
- Ikony: **Tabler Icons** (`@tabler/icons-react`, MIT), wersja konturowa, kreska 1,75–2 px, 20–24 px. Bez emoji.

## Dostępność (WCAG 2.1 AA, wymóg ustawy o dostępności cyfrowej)

- Kontrast tekstu ≥ 4,5:1, elementów interfejsu ≥ 3:1 (tabela wyżej).
- Fokus: obrys 3 px `granat` z odstępem 2 px (`outline-offset`), widoczny na każdym tle.
- Link „Przejdź do treści” na początku strony. Logiczna kolejność tabulacji.
- Cele dotykowe ≥ 44×44 px (przyciski 48 px), odstęp ≥ 8 px.
- Każde pole ma etykietę; błędy przy polu i powiązane przez `aria-describedby`.
- Oś czasu ma równoważny widok listy (domyślny na telefonie), a odcinki mają `etykietaDostepna`.
- Ruch krótki (150–200 ms, tylko kolor, przezroczystość, transform), wyłączony przy `prefers-reduced-motion`.
- Tylko jasny motyw (jak zus.pl). Bez trybu ciemnego w wersji na zgłoszenie.

## Teksty

Zasady z CLAUDE.md: prosty język, druga osoba, ryzyka spokojnie. Stały pasek: „To symulacja. Wynik nie jest decyzją ZUS.” Pojęcia ZUS: płatnik, ubezpieczony, „zasiłek macierzyński za okres urlopu rodzicielskiego”.

## Czego nie robimy

Pastelowe tła komunikatów, mocne cienie, gradienty poza ekranem startowym, szkło na jasnym tle, emoji, tekst w bursztynie, czerwień przy ryzykach, ikona albo kolor bez podpisu, więcej niż jeden przycisk główny i więcej niż jedna para kolorowych kafli na widok.

## Telefon przede wszystkim

Większość rodziców otworzy aplikację na telefonie, więc każdy ekran projektujemy i sprawdzamy najpierw na 375 px:
- kafle bento na telefonie w jednej kolumnie, kolorowy kafel na górze;
- główna akcja w przyklejonym pasku na dole ekranu (z `env(safe-area-inset-bottom)`), w zasięgu kciuka;
- planer: domyślnie widok listy, oś czasu przewijana poziomo z przyciskami zamiast przeciągania;
- pola z właściwą klawiaturą (`inputmode="decimal"` dla kwot, natywny wybór daty), tekst pól ≥ 16 px (inaczej iOS przybliża stronę);
- bez efektów hover jako jedynej informacji; `100dvh` zamiast `100vh`;
- sprawdzenie skillem `mobile-native` i w Playwright (profil „telefon”), na koniec na prawdziwym telefonie przez publiczny link.
