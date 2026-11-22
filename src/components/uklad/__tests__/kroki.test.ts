import { describe, expect, it } from 'vitest';
import { KROKI, aktualnyKrok, sasiednieKroki } from '../kroki';

describe('KROKI', () => {
  it('ma sześć kroków w kolejności ścieżki rodzica', () => {
    expect(KROKI.map((k) => k.sciezka)).toEqual(['/', '/sytuacja', '/wynik', '/plan', '/kalendarz', '/dokumenty']);
  });
});

describe('aktualnyKrok', () => {
  it.each([
    ['/', 0],
    ['/sytuacja', 1],
    ['/wynik', 2],
    ['/plan', 3],
    ['/kalendarz', 4],
    ['/dokumenty', 5],
  ])('%s → krok %i', (sciezka, krok) => {
    expect(aktualnyKrok(sciezka)).toBe(krok);
  });

  it('podstrona należy do kroku nadrzędnego', () => {
    expect(aktualnyKrok('/plan/porownanie')).toBe(3);
  });

  it('ignoruje końcowy ukośnik, parametry i kotwicę', () => {
    expect(aktualnyKrok('/wynik/')).toBe(2);
    expect(aktualnyKrok('/wynik?osoba=2')).toBe(2);
    expect(aktualnyKrok('/kalendarz#termin')).toBe(4);
    expect(aktualnyKrok('/?x=1')).toBe(0);
  });

  it('logowanie należy do Startu, dodanie osoby do Wyniku', () => {
    expect(aktualnyKrok('/logowanie')).toBe(0);
    expect(aktualnyKrok('/osoba')).toBe(2);
  });

  it.each(['/trudne-sytuacje', '/inne-wsparcie', '/wzornik', '/admin', '/nieznana'])('%s jest poza ścieżką', (sciezka) => {
    expect(aktualnyKrok(sciezka)).toBeNull();
  });

  it('nie myli tras o wspólnym początku', () => {
    expect(aktualnyKrok('/planista')).toBeNull();
    expect(aktualnyKrok('/wyniki')).toBeNull();
  });

  it('brak ścieżki → null', () => {
    expect(aktualnyKrok(null)).toBeNull();
    expect(aktualnyKrok(undefined)).toBeNull();
    expect(aktualnyKrok('')).toBeNull();
  });
});

// Uwaga z testów z użytkownikiem (22.11): na Planie (krok 4) nie było jak przejść dalej.
describe('sasiednieKroki', () => {
  it('Plan: wstecz do Wyniku, dalej do Kalendarza', () => {
    expect(sasiednieKroki('/plan')).toEqual({ poprzedni: KROKI[2], nastepny: KROKI[4] });
  });
  it('podstrona należy do kroku nadrzędnego', () => {
    expect(sasiednieKroki('/plan/porownanie').nastepny?.sciezka).toBe('/kalendarz');
  });
  it('Dokumenty: ostatni krok, bez „Dalej”', () => {
    expect(sasiednieKroki('/dokumenty')).toEqual({ poprzedni: KROKI[4], nastepny: null });
  });
  it('trasa spoza ścieżki: bez sąsiadów', () => {
    expect(sasiednieKroki('/faq')).toEqual({ poprzedni: null, nastepny: null });
  });
});
