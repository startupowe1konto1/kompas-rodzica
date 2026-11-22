/**
 * Geometria tła ekranu startowego: siatka oktagonów połączonych ze sobą (układ 4.8.8 – oktagony
 * stykają się bokami, między nimi powstają małe kwadraty), wygięta tak, jakby falowała w przestrzeni.
 * Czyste funkcje, bez DOM: komponent `SiatkaOktagonow` rysuje wynik na płótnie (canvas).
 *
 * Jednostki siatki: odstęp środków sąsiednich oktagonów = 1. Odwzorowanie zamienia punkt siatki
 * (u, v) na punkt ekranu (x, y) w pikselach CSS i krycie linii w tym miejscu (0–1).
 */

export type PunktEkranu = { x: number; y: number; krycie: number };
export type Odwzorowanie = (u: number, v: number) => PunktEkranu | null;

/** Oktagon foremny w siatce 4.8.8: bok a = 1 / (1 + √2), więc sąsiednie oktagony dzielą bok. */
const POL_BOKU = 1 / (1 + Math.SQRT2) / 2;
const POL_OCZKA = 0.5;

/** Wierzchołki oktagonu o środku (i, j) w jednostkach siatki, zgodnie z ruchem wskazówek zegara. */
export function wierzcholkiOktagonu(i: number, j: number): [number, number][] {
  const a = POL_BOKU;
  const p = POL_OCZKA;
  return [
    [i + a, j - p],
    [i + p, j - a],
    [i + p, j + a],
    [i + a, j + p],
    [i - a, j + p],
    [i - p, j + a],
    [i - p, j - a],
    [i - a, j - p],
  ];
}

/** Oktagony pogrupowane według krycia (jedna ścieżka na grupę = jedno pociągnięcie pędzla). */
export type GrupaKrycia = { krycie: number; oktagony: number[][] };

/** Liczba poziomów krycia. Więcej poziomów = gładsze przejścia, ale więcej pociągnięć. */
const POZIOMY = 10;

/**
 * Buduje oktagony siatki w zakresie i ∈ [i0, i1], j ∈ [j0, j1] i grupuje je według krycia.
 * Oktagon wypada, gdy odwzorowanie zwróci null dla któregoś wierzchołka albo krycie jest bliskie 0,
 * albo gdy cały leży poza ekranem (szer × wys, z zapasem).
 * Każdy oktagon to płaska tablica [x0, y0, x1, y1, …] (8 punktów).
 */
export function zbudujSiatke(
  odwzoruj: Odwzorowanie,
  zakres: ZakresSiatki,
  szer: number,
  wys: number,
): GrupaKrycia[] {
  const grupy: number[][][] = Array.from({ length: POZIOMY }, () => []);
  const zapas = 80;
  for (let j = zakres.j0; j <= zakres.j1; j++) {
    for (let i = zakres.i0; i <= zakres.i1; i++) {
      const punkty: number[] = [];
      let krycie = 0;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let pominiety = false;
      for (const [u, v] of wierzcholkiOktagonu(i, j)) {
        const p = odwzoruj(u, v);
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
          pominiety = true;
          break;
        }
        punkty.push(p.x, p.y);
        krycie += p.krycie;
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      if (pominiety) continue;
      if (maxX < -zapas || minX > szer + zapas || maxY < -zapas || minY > wys + zapas) continue;
      krycie /= 8;
      if (!(krycie >= 0.02)) continue;
      const poziom = Math.min(POZIOMY - 1, Math.floor(krycie * POZIOMY));
      grupy[poziom].push(punkty);
    }
  }
  return grupy
    .map((oktagony, poziom) => ({ krycie: (poziom + 0.5) / POZIOMY, oktagony }))
    .filter((g) => g.oktagony.length > 0);
}

/** Łagodne pole wysokości: dwie przecinające się fale i szersza fala długa. */
export function wysokoscFali(u: number, v: number): number {
  return (
    0.55 * Math.sin(0.32 * u + 0.18 * v) +
    0.35 * Math.sin(0.21 * v - 0.27 * u + 1.3) +
    0.25 * Math.sin(0.09 * u + 0.11 * v + 2.1)
  );
}

const ogranicz = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

export type ZakresSiatki = { i0: number; i1: number; j0: number; j1: number };

/**
 * Płachta siatki w perspektywie, dopasowana do rozmiaru ekranu (szer × wys w px CSS).
 * Kamera wisi nad płaszczyzną; głębokość rośnie z v. Blisko (dół ekranu) oczka są większe,
 * w dali (góra) gęstsze i bledsze (mgła), a fale unoszą i opuszczają siatkę. Całość jest lekko
 * obrócona, żeby fale biegły po skosie. Zwraca odwzorowanie i zakres indeksów do zbudowania.
 */
export function odwzorowaniePerspektywy(szer: number, wys: number): { odwzoruj: Odwzorowanie; zakres: ZakresSiatki } {
  const telefon = szer < 768;
  // Szerokość oczka w px: blisko (dół) i w dali (góra).
  const blisko = telefon ? 40 : 54;
  const daleko = telefon ? 9 : 11;
  const D0 = 20;
  const F = blisko * D0;
  const D1 = F / daleko;
  const margines = 40;
  // Wysokość kamery i położenie horyzontu dobrane tak, by płachta wypełniła ekran od dołu do góry.
  const kamera = (wys + 2 * margines) / (F * (1 / D0 - 1 / D1));
  const horyzont = -margines - (F * kamera) / D1;
  const amplituda = telefon ? 2.2 : 2.8;
  const kat = (telefon ? -8 : -10) * (Math.PI / 180);
  const cos = Math.cos(kat);
  const sin = Math.sin(kat);
  const sx = szer / 2;
  const sy = wys / 2;

  const odwzoruj: Odwzorowanie = (u, v) => {
    const Y = D0 + v;
    if (Y <= 1) return null;
    const glebia = ogranicz((Y - D0) / (D1 - D0), 0, 1);
    // Fale słabną w dali, żeby gęste rzędy przy horyzoncie się nie zlewały.
    const Z = amplituda * wysokoscFali(u, v) * (1 - 0.6 * glebia);
    const x0 = szer * 0.55 + (F * u) / Y;
    const y0 = horyzont + (F * (kamera - Z)) / Y;
    const x = sx + (x0 - sx) * cos - (y0 - sy) * sin;
    const y = sy + (x0 - sx) * sin + (y0 - sy) * cos;
    // Mgła: w dali bledziej. Stoki zwrócone do światła (lewo-góra) trochę mocniej.
    const stok = wysokoscFali(u + 0.5, v - 0.5) - wysokoscFali(u, v);
    const krycie = ogranicz((1 - glebia) ** 2 * (0.75 + 0.9 * stok), 0, 1);
    return { x, y, krycie };
  };

  const kolumny = Math.ceil((szer * D1) / F / 2) + 6;
  return { odwzoruj, zakres: { i0: -kolumny, i1: kolumny, j0: -2, j1: Math.ceil(D1 - D0) + 2 } };
}
