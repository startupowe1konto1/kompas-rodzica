import { describe, expect, it } from 'vitest';
import { opcjeWymiaruPracy } from '../akcje';
import { etykietaWymiaru, odczytajWymiar, wartoscWymiaru } from '../etykietyAkcji';

describe('etykietaWymiaru', () => {
  it('ósme części etatu do limitu mają polskie podpisy', () => {
    expect(opcjeWymiaruPracy(0.5).map(etykietaWymiaru)).toEqual(['1/8 etatu', '1/4 etatu', '3/8 etatu', '1/2 etatu']);
  });
  it('bez limitu ostatnia opcja to pełny etat', () => {
    const wszystkie = opcjeWymiaruPracy(1).map(etykietaWymiaru);
    expect(wszystkie).toHaveLength(8);
    expect(wszystkie.at(-1)).toBe('pełny etat');
  });
  it('wartość opcji wraca jako ta sama liczba', () => {
    expect(odczytajWymiar(wartoscWymiaru(0.375))).toBe(0.375);
    expect(odczytajWymiar(null)).toBeNull();
    expect(odczytajWymiar('abc')).toBeNull();
  });
});
