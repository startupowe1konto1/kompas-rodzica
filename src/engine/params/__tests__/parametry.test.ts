import { describe, expect, it } from 'vitest';
import { PARAMETRY_2026, PARAMETRY_2027, WERSJE_DOMYSLNE, parametryNaDzien } from '..';
import { obliczPodstawe } from '../../calculator';
import { poOdliczeniuSkladek } from '../../calculator/liczby';
import type { Osoba, Parametry, TytulUbezpieczenia } from '../../types';

const GRUPY = ['stawkiProc', 'wymiaryTyg', 'limity', 'terminyDni', 'kwoty', 'podatek'] as const;

/** Ścieżki do liści liczbowych: obiekt schodzi głębiej, tablica liczb to jeden klucz. */
function sciezkiLiczbowe(obiekt: object, prefiks = ''): string[] {
  return Object.entries(obiekt).flatMap(([klucz, wartosc]: [string, unknown]) => {
    const sciezka = prefiks ? `${prefiks}.${klucz}` : klucz;
    if (typeof wartosc === 'number' || Array.isArray(wartosc)) return [sciezka];
    if (wartosc && typeof wartosc === 'object') return sciezkiLiczbowe(wartosc, sciezka);
    return [];
  });
}

const sciezkiWersji = (p: Parametry) => GRUPY.flatMap((g) => sciezkiLiczbowe(p[g], g));

describe('parametry – wersje', () => {
  it('poród 1.01.2027 bierze wersję 2027, dzień wcześniej wersję 2026', () => {
    expect(parametryNaDzien('2027-01-01').obowiazujeOd).toBe('2027-01-01');
    expect(parametryNaDzien('2026-12-31').obowiazujeOd).toBe('2026-01-01');
  });
  it('WERSJE_DOMYSLNE: 2026 i 2027, rosnąco, bez powtórzonych dat', () => {
    const daty = WERSJE_DOMYSLNE.map((w) => w.obowiazujeOd);
    expect(daty).toEqual([...daty].sort());
    expect(new Set(daty).size).toBe(daty.length);
    expect(WERSJE_DOMYSLNE).toEqual([PARAMETRY_2026, PARAMETRY_2027]);
  });
  it('obie wersje mają te same klucze w każdej grupie', () => {
    for (const g of GRUPY) {
      expect(sciezkiLiczbowe(PARAMETRY_2027[g], g)).toEqual(sciezkiLiczbowe(PARAMETRY_2026[g], g));
    }
  });
  it('każda ścieżka liczbowa obu wersji ma podstawę prawną w `przepisy`', () => {
    for (const p of WERSJE_DOMYSLNE) {
      const brak = sciezkiWersji(p).filter((s) => !p.przepisy?.[s]?.trim());
      expect(brak, `wersja ${p.obowiazujeOd}`).toEqual([]);
    }
  });
  it('`przepisy` nie ma kluczy spoza parametrów', () => {
    for (const p of WERSJE_DOMYSLNE) {
      const sciezki = new Set(sciezkiWersji(p));
      expect(Object.keys(p.przepisy ?? {}).filter((k) => !sciezki.has(k))).toEqual([]);
    }
  });
  it('wersja 2027 podaje adres źródła i wartości z ogłoszonych aktów', () => {
    expect(PARAMETRY_2027.zrodlo).toContain('http');
    expect(PARAMETRY_2027.kwoty.placaMinimalna).toBe(4950);
    expect(PARAMETRY_2027.kwoty.maxPodstawaSkladkiDobrowolne).toBe(25082.5);
    expect(PARAMETRY_2027.kwoty.najnizszaPodstawaDzialalnosc).toBe(6019.8);
  });
  it('wartości 2026 bez zmian', () => {
    expect(PARAMETRY_2026.kwoty.placaMinimalna).toBe(4806);
    expect(PARAMETRY_2026.kwoty.maxPodstawaSkladkiDobrowolne).toBe(23550);
    expect(PARAMETRY_2026.kwoty.najnizszaPodstawaDzialalnosc).toBe(5652);
    expect(PARAMETRY_2026.podatek).toEqual({ zaliczkaProc: 12, kwotaZmniejszajacaMiesiecznie: 300 });
  });
  it('etat 4000 zł, prawo od 1.01.2027: podstawa podniesiona do płacy minimalnej 2027', () => {
    const tytul: TytulUbezpieczenia = {
      id: 't1', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2023-03-01', wymiarEtatu: 1, wynagrodzenieMiesieczne: 4000,
    };
    const osoba: Osoba = { id: 'o1', rola: 'matka', tytuly: [tytul] };
    const w = obliczPodstawe(osoba, tytul, '2027-01-01', WERSJE_DOMYSLNE);
    expect(w.kwota).toBe(poOdliczeniuSkladek(PARAMETRY_2027.kwoty.placaMinimalna, PARAMETRY_2027));
    expect(w.ograniczenia).toEqual(['minimum_art_45']);
  });
});
