// Lista ekranów aplikacji wspólna dla testów dymnych i zrzutów ekranu.
// `nazwa` trafia do nazwy pliku zrzutu: docs/zrzuty/<projekt>-<nazwa>.png.
export type Trasa = { sciezka: string; nazwa: string; naglowek: string };

export const TRASY: Trasa[] = [
  { sciezka: "/logowanie", nazwa: "logowanie", naglowek: "Zaloguj się (symulacja)" },
  { sciezka: "/sytuacja", nazwa: "sytuacja", naglowek: "Moja sytuacja" },
  { sciezka: "/wynik", nazwa: "wynik", naglowek: "Wynik" },
  { sciezka: "/osoba", nazwa: "osoba", naglowek: "Dodaj osobę" },
  { sciezka: "/plan", nazwa: "plan", naglowek: "Plan urlopów" },
  { sciezka: "/plan/porownanie", nazwa: "porownanie", naglowek: "Porównaj warianty" },
  { sciezka: "/kalendarz", nazwa: "kalendarz", naglowek: "Kalendarz terminów" },
  { sciezka: "/dokumenty", nazwa: "dokumenty", naglowek: "Dokumenty" },
  { sciezka: "/trudne-sytuacje", nazwa: "trudne-sytuacje", naglowek: "Trudne sytuacje" },
  { sciezka: "/inne-wsparcie", nazwa: "inne-wsparcie", naglowek: "Inne wsparcie" },
  { sciezka: "/kalkulator", nazwa: "kalkulator", naglowek: "Szybki kalkulator zasiłku" },
  { sciezka: "/dostepnosc", nazwa: "dostepnosc", naglowek: "Deklaracja dostępności" },
];

/** Strona startowa: jej nagłówek zmienia się w C2, więc test sprawdza tylko, że jakiś jest. */
export const START = { sciezka: "/", nazwa: "start" } as const;
