import { describe, expect, it } from 'vitest';
import { odwzorowaniePerspektywy, wierzcholkiOktagonu, zbudujSiatke } from '../siatka-oktagonow';

describe('wierzcholkiOktagonu', () => {
  it('sąsiednie oktagony dzielą bok (siatka jest połączona)', () => {
    const lewy = wierzcholkiOktagonu(0, 0);
    const prawy = wierzcholkiOktagonu(1, 0);
    // Prawy bok lewego (wierzchołki 1 i 2) = lewy bok prawego (wierzchołki 6 i 5).
    expect(prawy[6][0]).toBeCloseTo(lewy[1][0]);
    expect(prawy[6][1]).toBeCloseTo(lewy[1][1]);
    expect(prawy[5][0]).toBeCloseTo(lewy[2][0]);
    expect(prawy[5][1]).toBeCloseTo(lewy[2][1]);
  });

  it('oktagon jest foremny: osiem równych boków', () => {
    const w = wierzcholkiOktagonu(3, -2);
    const boki = w.map(([x, y], k) => {
      const [x2, y2] = w[(k + 1) % 8];
      return Math.hypot(x2 - x, y2 - y);
    });
    for (const b of boki) expect(b).toBeCloseTo(boki[0]);
  });
});

describe('zbudujSiatke z perspektywą', () => {
  for (const [nazwa, szer, wys] of [
    ['telefon', 375, 640],
    ['komputer', 1280, 610],
  ] as const) {
    it(`${nazwa}: wypełnia ekran, krycie w zakresie 0–1, bez NaN`, () => {
      const { odwzoruj, zakres } = odwzorowaniePerspektywy(szer, wys);
      const grupy = zbudujSiatke(odwzoruj, zakres, szer, wys);
      const wszystkie = grupy.flatMap((g) => g.oktagony);
      // Dość oktagonów, żeby była siatka, ale nie tyle, żeby rysowanie na telefonie było ciężkie.
      expect(wszystkie.length).toBeGreaterThan(150);
      expect(wszystkie.length).toBeLessThan(6000);
      for (const g of grupy) {
        expect(g.krycie).toBeGreaterThan(0);
        expect(g.krycie).toBeLessThanOrEqual(1);
      }
      const xs = wszystkie.flatMap((p) => p.filter((_, k) => k % 2 === 0));
      const ys = wszystkie.flatMap((p) => p.filter((_, k) => k % 2 === 1));
      expect(xs.every(Number.isFinite) && ys.every(Number.isFinite)).toBe(true);
      // Siatka sięga od lewej do prawej i od góry do dołu ekranu.
      expect(Math.min(...xs)).toBeLessThan(0);
      expect(Math.max(...xs)).toBeGreaterThan(szer);
      expect(Math.min(...ys)).toBeLessThan(wys * 0.2);
      expect(Math.max(...ys)).toBeGreaterThan(wys);
    });
  }

  it('w dali (góra ekranu) oczka są mniejsze i bledsze niż blisko (dół)', () => {
    const { odwzoruj } = odwzorowaniePerspektywy(1280, 610);
    const rozmiar = (j: number) => {
      const a = odwzoruj(0, j)!;
      const b = odwzoruj(1, j)!;
      return { szer: Math.hypot(b.x - a.x, b.y - a.y), y: a.y, krycie: a.krycie };
    };
    const blisko = rozmiar(1);
    const daleko = rozmiar(60);
    expect(daleko.szer).toBeLessThan(blisko.szer / 2);
    expect(daleko.y).toBeLessThan(blisko.y);
    expect(daleko.krycie).toBeLessThan(0.3);
  });
});
