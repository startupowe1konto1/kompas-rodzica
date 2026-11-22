import { describe, expect, it } from 'vitest';
import type { Rodzina } from '../../../engine/types';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { dodajOsobe, przesunPochodzenie, przesunSciezki, usunOsobe } from '../dodajOsobe';

describe('dodajOsobe', () => {
  it('dopisuje osobę z unikalnym id, bez tytułów, bez mutacji', () => {
    const w = dodajOsobe(PRZYKLAD_RODZINA, 'ojciec');
    expect(w.indeks).toBe(1);
    expect(w.rodzina.osoby[1]).toEqual({ id: 'osoba-2', rola: 'ojciec', tytuly: [] });
    expect(PRZYKLAD_RODZINA.osoby).toHaveLength(1);
  });
  it('id nie koliduje z istniejącym', () => {
    const r: Rodzina = { ...PRZYKLAD_RODZINA, osoby: [...PRZYKLAD_RODZINA.osoby, { id: 'osoba-3', rola: 'ojciec', tytuly: [] }] };
    expect(dodajOsobe(r, 'inny_czlonek_rodziny').rodzina.osoby[2].id).toBe('osoba-4');
  });
  it('pierwsze wolne id po usunięciu środkowej osoby', () => {
    const r: Rodzina = { ...PRZYKLAD_RODZINA, osoby: [...PRZYKLAD_RODZINA.osoby, { id: 'osoba-2', rola: 'ojciec', tytuly: [] }] };
    const bez = usunOsobe(r, 'osoba-2');
    expect(dodajOsobe(bez, 'matka').rodzina.osoby[1].id).toBe('osoba-2');
  });
});

describe('usunOsobe', () => {
  const z2 = dodajOsobe(PRZYKLAD_RODZINA, 'ojciec').rodzina;
  it('usuwa dodaną osobę bez mutacji', () => {
    expect(usunOsobe(z2, 'osoba-2').osoby).toHaveLength(1);
    expect(z2.osoby).toHaveLength(2);
  });
  it('nie usuwa pierwszej osoby ani nieznanego id', () => {
    expect(usunOsobe(z2, PRZYKLAD_RODZINA.osoby[0].id)).toBe(z2);
    expect(usunOsobe(z2, 'nie-ma')).toBe(z2);
  });
});

describe('przesunSciezki', () => {
  it('usuwa ścieżki usuniętej osoby i przesuwa dalsze', () => {
    expect(przesunSciezki(['osoby[0].rola', 'osoby[1].rola', 'osoby[2].tytuly[0].od', 'zdarzenie.data'], 1)).toEqual([
      'osoby[0].rola',
      'osoby[1].tytuly[0].od',
      'zdarzenie.data',
    ]);
  });
  it('przesunPochodzenie zachowuje resztę wpisu', () => {
    const w = przesunPochodzenie([{ sciezka: 'osoby[2].dane.pesel', zrodlo: 'mobywatel' }], 1);
    expect(w).toEqual([{ sciezka: 'osoby[1].dane.pesel', zrodlo: 'mobywatel' }]);
  });
});
