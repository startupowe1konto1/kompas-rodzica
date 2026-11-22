import { describe, expect, it } from 'vitest';
import { PARAMETRY_2026 } from '../../engine/params';
import { OPISY_PARAMETROW } from '@/app/admin/opisyParametrow';
import {
  kopiaZNowaData,
  odczytajWartosc,
  polaWersji,
  przepisDla,
  ustawWartosc,
} from '@/app/admin/sciezki';

describe('polaWersji', () => {
  const pola = polaWersji(PARAMETRY_2026);
  const wartosc = (sciezka: string) => pola.find((p) => p.sciezka === sciezka)?.wartosc;

  it('zwraca wpis dla każdej liczby w grupach', () => {
    expect(wartosc('stawkiProc.rodzicielski')).toBe(70);
    expect(wartosc('wymiaryTyg.macierzynski.0')).toBe(20);
    expect(wartosc('wymiaryTyg.macierzynski.4')).toBe(37);
    expect(wartosc('wymiaryTyg.rodzicielskiMaxZPraca.jedno')).toBe(82);
    expect(wartosc('podatek.zaliczkaProc')).toBe(12);
    expect(wartosc('kwoty.placaMinimalna')).toBe(4806);
  });

  it('nie zwraca pól spoza grup liczbowych i ma unikalne ścieżki', () => {
    expect(pola.some((p) => p.sciezka.startsWith('opis') || p.sciezka.startsWith('przepisy'))).toBe(false);
    expect(new Set(pola.map((p) => p.sciezka)).size).toBe(pola.length);
    expect(pola.every((p) => typeof p.wartosc === 'number')).toBe(true);
  });

  it('podaje grupę pola', () => {
    expect(pola.find((p) => p.sciezka === 'limity.rodzicielskiMaxCzesci')?.grupa).toBe('limity');
  });

  it('każda ścieżka ma opis w OPISY_PARAMETROW', () => {
    for (const { sciezka } of pola) {
      const opis = OPISY_PARAMETROW[sciezka];
      expect(opis, sciezka).toBeDefined();
      expect(opis.etykieta.length, sciezka).toBeGreaterThan(0);
      expect(opis.dotyczy.length, sciezka).toBeGreaterThan(0);
    }
  });

  it('dopisek o kalkulatorze mają dokładnie parametry, które czyta kalkulator (src/engine/calculator)', () => {
    // Lista z przeglądu kodu kalkulatora: stawki.ts (stawkiProc), kwoty.ts (rodzicielskiNieprzenoszalne,
    // dniWMiesiacuDoStawkiDziennej), liczby.ts i podstawa.ts (składki, płaca minimalna), podstawaDobrowolne.ts
    // (limit, najniższa i preferencyjna podstawa), podwyzszenie.ts (świadczenie rodzicielskie), podatek.ts.
    const czytaKalkulator = [
      'stawkiProc.macierzynski', 'stawkiProc.rodzicielski', 'stawkiProc.wariant815', 'stawkiProc.ojcowski',
      'stawkiProc.uzupelniajacy', 'stawkiProc.chorobowyCiaza',
      'wymiaryTyg.rodzicielskiNieprzenoszalne',
      'kwoty.placaMinimalna', 'kwoty.skladkiPracownikaProc', 'kwoty.swiadczenieRodzicielskie', 'kwoty.maxPodstawaSkladkiDobrowolne',
      'kwoty.najnizszaPodstawaDzialalnosc', 'kwoty.podstawaPreferencyjnaProcPlacyMinimalnej', 'kwoty.dniWMiesiacuDoStawkiDziennej',
      'podatek.zaliczkaProc', 'podatek.kwotaZmniejszajacaMiesiecznie',
    ];
    const zDopiskiem = Object.entries(OPISY_PARAMETROW)
      .filter(([, o]) => o.dotyczy.includes('Zmiana od razu zmienia kwoty w kalkulatorze.'))
      .map(([sciezka]) => sciezka);
    expect(zDopiskiem.sort()).toEqual([...czytaKalkulator].sort());
  });
});

describe('odczytajWartosc i ustawWartosc', () => {
  it('odczytuje wartość po ścieżce, także z tablicy', () => {
    expect(odczytajWartosc(PARAMETRY_2026, 'stawkiProc.rodzicielski')).toBe(70);
    expect(odczytajWartosc(PARAMETRY_2026, 'wymiaryTyg.macierzynski.1')).toBe(31);
    expect(odczytajWartosc(PARAMETRY_2026, 'brak.takiej')).toBeUndefined();
  });

  it('ustawia wartość i nie zmienia oryginału', () => {
    const nowa = ustawWartosc(PARAMETRY_2026, 'stawkiProc.rodzicielski', 75);
    expect(nowa.stawkiProc.rodzicielski).toBe(75);
    expect(PARAMETRY_2026.stawkiProc.rodzicielski).toBe(70);
    expect(nowa).not.toBe(PARAMETRY_2026);
  });

  it('ustawia element tablicy i pole zagnieżdżone', () => {
    const a = ustawWartosc(PARAMETRY_2026, 'wymiaryTyg.macierzynski.2', 34);
    expect(a.wymiaryTyg.macierzynski).toEqual([20, 31, 34, 35, 37]);
    expect(PARAMETRY_2026.wymiaryTyg.macierzynski[2]).toBe(33);
    const b = ustawWartosc(PARAMETRY_2026, 'wymiaryTyg.rodzicielskiMaxZPraca.jedno', 90);
    expect(b.wymiaryTyg.rodzicielskiMaxZPraca.jedno).toBe(90);
    expect(PARAMETRY_2026.wymiaryTyg.rodzicielskiMaxZPraca.jedno).toBe(82);
  });
});

describe('kopiaZNowaData', () => {
  it('kopiuje wersję z nową datą i nie zmienia oryginału', () => {
    const kopia = kopiaZNowaData(PARAMETRY_2026, '2028-01-01');
    expect(kopia.obowiazujeOd).toBe('2028-01-01');
    expect(kopia.stawkiProc).toEqual(PARAMETRY_2026.stawkiProc);
    expect(kopia.stawkiProc).not.toBe(PARAMETRY_2026.stawkiProc);
    expect(PARAMETRY_2026.obowiazujeOd).toBe('2026-01-01');
  });
});

describe('przepisDla', () => {
  it('zwraca przepis dla ścieżki liścia', () => {
    expect(przepisDla(PARAMETRY_2026, 'stawkiProc.rodzicielski')).toBe('UZ art. 31 ust. 2');
  });

  it('dla elementu tablicy bierze przepis z klucza tablicy', () => {
    expect(przepisDla(PARAMETRY_2026, 'wymiaryTyg.macierzynski.3')).toBe('KP art. 180 § 1');
  });

  it('zwraca undefined, gdy przepisu nie ma', () => {
    expect(przepisDla(PARAMETRY_2026, 'kwoty.nieistnieje')).toBeUndefined();
    expect(przepisDla({ ...PARAMETRY_2026, przepisy: undefined }, 'stawkiProc.rodzicielski')).toBeUndefined();
  });
});
