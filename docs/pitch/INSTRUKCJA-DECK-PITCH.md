# Instrukcja dla Claude: prezentacja pitchu w HTML

Wklej ten plik na początku rozmowy w nowym projekcie. Opisuje, jak przygotować krótki pitch (3–7 minut) z prezentacją w HTML: od wywiadu o wizji, przez scenariusz, po jeden plik do oddania, który działa bez sieci. Temat nie ma znaczenia. Proces sprawdził się na hackathonie, gdzie prezentację oceniało jury.

---

## 1. Zasady pracy

- **Najpierw wizja, potem budowa.** Nie zaczynaj od slajdów. Najpierw zadaj pytania z sekcji 2 i poczekaj na odpowiedzi.
- **Pytaj otwarcie.** O wizję, narrację i zakończenie pytaj pytaniami otwartymi, bez gotowych opcji do wyboru. Gotowe opcje narzucają twoją wizję. Wybór z listy jest dobry tylko przy decyzjach technicznych albo stylu, kiedy kierunek jest już ustalony.
- **Każda liczba ma źródło.** Liczby bierz z plików, danych albo stron, które da się wskazać. Sprawdzaj je sam, nie przepisuj z notatek. Liczbę bez źródła oznacz jako „do potwierdzenia” i nie stawiaj jej na slajdzie.
- **Nie dopowiadaj faktów.** Gdy brakuje informacji, zapytaj albo zostaw miejsce „DO USTALENIA”.
- **Jedno źródło prawdy.** Scenariusz, notatki prezentera i treść slajdów muszą mówić to samo. Po każdej zmianie w jednym z nich popraw pozostałe.
- **Pokazuj stan, nie obiecuj.** Zanim powiesz „gotowe”, przejdź prezentację w przeglądarce i sprawdź konsolę.
- **Zmiany w repo tylko na prośbę.** Commit, push i PR dopiero wtedy, gdy użytkownik o to poprosi albo gdy projekt ma taką umowę.

---

## 2. Etap 0: wywiad (zanim cokolwiek napiszesz)

Zadaj te pytania w jednej wiadomości. Pozwól odpowiedzieć luźno, w punktach albo akapitem.

**Kontekst wystąpienia**
1. Gdzie i przed kim jest pitch? Ile trwa wystąpienie, a ile pytania?
2. Według jakich kryteriów oceniają słuchacze i ile waży każde z nich?
3. Co trzeba oddać i w jakiej formie (plik, nazwa pliku, termin, link do repo, dokumentacja)?
4. Na czym będzie pokaz: laptop, rzutnik, pilot, czy na sali jest internet?

**Treść**
5. Jakie jedno zdanie słuchacze mają powtórzyć po wyjściu z sali?
6. Od czego zaczynamy? Co dzieje się na scenie i na ekranie w pierwszych 30 sekundach?
7. Jaką historię opowiadamy? Kto albo co jest w jej środku (persona, problem, liczba, miasto)?
8. Gdzie jest kulminacja i co słuchacze mają wtedy poczuć?
9. Jakie mamy dowody: dane, analizę, działający produkt, demo?
10. Czym kończymy? Ostatnie zdanie i ostatni obraz.

**Wygląd**
11. Jaki nastrój: jasny czy ciemny, minimalistyczny czy z grafiką? Czy są logotypy, kolory marki, fonty, które trzeba użyć?
12. Czy coś ma być interaktywne na slajdzie (przełącznik, mapa, demo w makiecie telefonu)?

Po odpowiedziach streść ustalenia w kilku punktach i dopiero wtedy przejdź dalej. Gdy coś zostało niejasne, dopytaj jednym, konkretnym pytaniem.

---

## 3. Etap 1: scenariusz (plik `scenariusz.md`)

**Struktura (zasada piramidy Minto):**
- Na górze teza w dwóch zdaniach i tabela SCQA: sytuacja, komplikacja, pytanie, odpowiedź.
- Tabela „pitch w skrócie”: czas, sekundy, nagłówek slajdu i kryterium oceny, któremu ten slajd służy.
- Każdy nagłówek to wniosek, a nie temat. Przykład: „Po wdrożeniu czas obsługi zgłoszenia spada o połowę”, a nie „Analiza czasu obsługi”. Same nagłówki czytane po kolei mają dawać cały wywód.

**Każdy slajd w scenariuszu ma trzy części:**
- **Na ekranie:** co dokładnie widać i co się zmienia po kliknięciu.
- **Mówimy:** pełne zdania do wypowiedzenia, językiem mówionym, krótkimi zdaniami.
- **Czas:** liczba sekund.

**Czas:**
- Licz około 130 słów na minutę. Policz słowa skryptem, nie na oko.
- Zostaw 10–15% czasu na kliknięcia, animacje i pauzy.
- Dopisz kolejność cięć na wypadek, gdyby próba wyszła za długa.

**Na końcu scenariusza:**
- **Liczby i ich źródła:** liczba w pitchu, dokładna wartość, plik albo link.
- **Fakty do potwierdzenia:** stwierdzenia bez źródła.
- **Czego nie mówimy:** słowa i obietnice, których unikamy (np. przesadne zapewnienia, nazwy, które wprowadzają w błąd).
- **Zależności demo:** która funkcja jest gotowa, a która nie, i plan B dla każdego kroku.
- **Przygotowanie przed sceną:** lista kontrolna.

Na koniec przepuść tekst mówiony przez korektę naturalnego języka. Usuń urzędowe i tłumaczone frazy, ale zostaw liczby, nazwy i zastrzeżenia bez zmian.

**Bramka:** pokaż użytkownikowi przebieg (tabelę „pitch w skrócie”) i poczekaj na akceptację, zanim zaczniesz budować slajdy.

---

## 4. Etap 2: projekt wizualny

Zanim napiszesz kod, przygotuj krótki plan i pokaż go użytkownikowi:
- **Kolory:** 4–6 nazwanych wartości hex z rolami (tło, tekst, tekst pomocniczy, akcent na kluczowe liczby, kolory danych).
- **Typografia:** jedna rodzina albo dwie wyraźnie różne. Duża skala na hasła i liczby, czytelna na tekst. Tekst na slajdzie co najmniej 20–24 px przy scenie 1600×900.
- **Układ:** wyrównanie do lewej, stały margines, logotypy zawsze w tym samym rogu.
- **Jedno odważne miejsce:** jeden moment, który słuchacze zapamiętają (np. przełącznik, który na oczach sali zmienia wykres albo mapę). Reszta spokojna.

**Unikaj:**
- ścian tekstu (zamiast listy 20 punktów daj 3 grupy z liczbami i ikonami);
- etykiet wersalikami nad każdym nagłówkiem, kropek-separatorów, numerów 01/02/03 przy treści, która nie jest sekwencją;
- identycznych kart z tym samym cieniem na każdym slajdzie;
- akcentowania jednego słowa w nagłówku innym kolorem.

**Wykresy i mapy:**
- Kolor wynika z roli danych, a nie z dekoracji. Sprawdź paletę pod kątem daltonizmu i kontrastu.
- Każdy kolor ma podpis tekstem, a nie tylko legendę.
- Liczby na wykresie generuj skryptem z plików źródłowych, a nie wpisuj ręcznie.

Ikony: jeden zestaw w jednym stylu (np. cienka linia, SVG w kodzie), żadnych emoji.

---

## 5. Etap 3: budowa prezentacji w HTML

**Struktura plików** (w osobnym folderze, np. `docs/pitch/prezentacja/`):

| Plik | Rola |
|---|---|
| `index.html` | slajdy, style, silnik prezentacji |
| `dane.js` | dane wykresów, wygenerowane skryptem |
| `build_dane.py` | buduje `dane.js` z plików źródłowych i sprawdza liczby asercjami |
| `demo.js`, `demo.css`, `ekrany/` | zaprogramowane demo produktu (jeśli jest) |
| `font/` | pliki fontu z licencją, do wersji offline |
| `build_standalone.py` | składa wszystko w jeden plik HTML (i opcjonalnie PDF) |
| `README.md` | jak otworzyć, sterowanie, jak przebudować |

**Silnik prezentacji (bez bibliotek):**
- Scena 1600×900, skalowana do okna z zachowaniem proporcji. Skalę licz z `document.documentElement.clientWidth`, a scenę ustaw jako `position: fixed`, bo inaczej na telefonie widać powiększony fragment.
- Każdy slajd to `<section class="slajd" data-kroki="N">`. Elementy z `data-krok="k"` pojawiają się przy kolejnych naciśnięciach.
- Sterowanie z klawiatury i pilota: → spacja PageDown dalej, ← PageUp wstecz, Home/End, F pełny ekran, N notatki prezentera. Na telefonie przesuwanie palcem.
- Interaktywne elementy (przełączniki, etapy demo) też idą krokami, żeby dało się je wywołać pilotem, bez myszki.
- Adres slajdu w pasku: `#slajd.krok`, żeby po odświeżeniu wrócić w to samo miejsce.
- Notatki prezentera w `data-notatka` na każdym slajdzie, z tekstem ze scenariusza.
- Atrybut `data-pomin` ukrywa slajd bez usuwania go (łatwo przywrócić).
- `prefers-reduced-motion` wyłącza ruch. Fokus widoczny przy nawigacji klawiaturą.

**Ruch:**
- Ruch ma tłumaczyć, a nie zdobić. Jeden zaplanowany moment na slajd jest lepszy niż animacja każdego elementu.
- Przejścia między slajdami krótkie (ok. 250 ms), pojawianie się kroków ok. 300 ms, mocne ease-out.
- Wyjątek, który działa: animacja niosąca sens, np. łańcuch przyczyn przewracający się jak domino albo liczba, która zmienia się po przełączeniu scenariusza.

**Demo produktu:** zrób zaprogramowany przebieg, a nie aplikację na żywo w ramce.
- Każde naciśnięcie zmienia ekran w makiecie telefonu albo okna.
- Ekrany to prawdziwe zrzuty z działającego produktu, zrobione skryptem (np. Playwright w trybie bez okna), w podwójnej rozdzielczości.
- Klikany element ma podświetlenie, a obok jest duży podpis, co się dzieje. Gdy tekst na ekranie jest mały, pokaż powiększenie (lupę) fragmentu, o którym mówimy.
- Powód: aplikacja w ramce z innej domeny ma osobną pamięć przeglądarki, wymaga przygotowania i myszki, a do tego zależy od sieci na sali. Żywą wersję podaj jako link albo kod QR.

**Wersja do oddania (`build_standalone.py`):**
- Wpisuje font (`@font-face` z plikami woff2 jako `data:`), obrazy, style i skrypty do jednego pliku HTML.
- Plik działa otwarty z dysku, bez sieci, na komputerze i telefonie.
- Opcjonalnie robi PDF (strona na slajd, demo krok po kroku), bo komunikatory często nie pokazują podglądu HTML.
- Nazwa pliku według wymagań organizatora. Skrypt uruchamiaj po każdej zmianie slajdów.

---

## 6. Etap 4: sprawdzenie (przed każdym „gotowe”)

- [ ] Przejście całej prezentacji samą klawiaturą od pierwszego do ostatniego kroku i z powrotem. Licznik slajdów zawsze się zgadza.
- [ ] Skoki pod adresy `#N.k` i odświeżenie strony w środku prezentacji.
- [ ] Konsola bez błędów.
- [ ] Nic nie wychodzi poza scenę: sprawdź skryptem, czy żaden element nie przekracza prostokąta 1600×900. Zrzut ekranu może być nieaktualny albo przycięty.
- [ ] Widok przy 1280×720 i 1920×1080, a wersja do oddania także na telefonie w pionie.
- [ ] Wersja do oddania otwarta bez sieci: font się wczytuje, nie ma zapytań poza plik.
- [ ] Każda liczba na slajdach zgadza się z tabelą źródeł w scenariuszu.
- [ ] Kod QR odczytany czytnikiem, a linki otwarte w oknie prywatnym.
- [ ] Notatki prezentera zgadzają się ze scenariuszem.
- [ ] Próba z pomiarem czasu (robią ją ludzie, przypomnij o niej).

---

## 7. Pułapki, które już kosztowały czas

- **Pytania z gotowymi opcjami** w etapie wizji irytują i zawężają odpowiedź. Pytaj otwarcie.
- **Dwie różne miary pomylone ze sobą** (np. odsetek budynków i odsetek mieszkańców). W tabeli źródeł zapisz, czego dotyczy każda liczba.
- **Liczba, której słuchacze nie rozumieją.** Gdy na slajdzie są dwie liczby, jasno powiedz, która jest główna i dlaczego. Jeśli trzeba ją długo tłumaczyć, uprość slajd.
- **Przykład w demo sprzeczny z narracją.** Przykładowe dane w demo (osobę, adres, produkt) sprawdź na prawdziwych danych, zanim oprzesz na nich zdanie w scenariuszu.
- **Font z CDN** znika bez sieci. Do wersji do oddania wbuduj font.
- **Produkt zmienia się w trakcie.** Po każdej większej zmianie produktu przejrzyj slajdy, scenariusz, pytania i dokumentację pod kątem starych nazw i funkcji.
- **Plik do oddania nieaktualny.** Po każdej zmianie slajdów przebuduj go i zapisz.
- **Ukrycie najmocniejszego slajdu** w ostatniej chwili. Jeśli kluczowy dowód znika ze slajdów, przenieś go do odpowiedzi na pytania i powiedz o tym użytkownikowi.
- **Rozbieżne liczby w materiałach** (np. różna liczba zbiorów danych w prezentacji i dokumentacji). Jury to zauważa, więc ujednolić je przed oddaniem.

---

## 8. Materiały towarzyszące

- **`pytania.md`:** 8–10 pytań, które słuchacze prawdopodobnie zadadzą (licencje, koszty, wdrożenie, konkurencja, dokładność, prywatność, osoby wykluczone). Każda odpowiedź do 30 sekund mówienia (ok. 65 słów), zaczyna się od odpowiedzi, a pod nią są fakty w zanadrzu ze źródłami. Rzeczy niepewne oznacz, żeby nikt ich nie obiecał na scenie.
- **Pytania od konkretnych osób:** jeśli znasz skład jury, sprawdź publiczne profile i dopisz, o co każda osoba może zapytać.
- **Dokumentacja dla organizatora:** wykorzystane dane, założenia i ograniczenia, narzędzia z licencjami, opis użycia AI, atrybucje. Miejsca bez danych oznacz „DO UZUPEŁNIENIA”, zamiast zgadywać.

---

## 9. Definicja ukończenia

- [ ] Wywiad przeprowadzony, ustalenia zaakceptowane przez użytkownika.
- [ ] Scenariusz z tezą, czasami, tekstem mówionym, źródłami liczb i planem B.
- [ ] Prezentacja przechodzi wszystkie punkty z sekcji 6.
- [ ] Jeden plik do oddania, nazwany według wymagań, działa bez sieci.
- [ ] Pytania z odpowiedziami gotowe do ćwiczenia.
- [ ] Użytkownik wie, co zostało niesprawdzone (np. rzutnik, prawdziwy pilot, telefony uczestników).

---

## 10. Polecenie startowe (do wklejenia razem z tym plikiem)

> Przygotuj ze mną pitch i prezentację w HTML według załączonej instrukcji. Temat: [temat]. Wystąpienie: [gdzie, ile minut, przed kim]. Materiały, z których możesz korzystać: [pliki, repo, linki]. Zacznij od etapu 0: zadaj mi pytania otwarte o wizję i narrację, i nic nie buduj, dopóki nie odpowiem.
