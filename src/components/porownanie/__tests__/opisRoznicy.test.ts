import { describe, expect, it } from 'vitest';
import { liczebnik, opisCzasu, opiszRoznice, roznicePowrotu } from '../opisRoznicy';

const NBSP = ' ';

describe('opis różnicy wariantów', () => {
  it('odmienia liczebniki', () => {
    expect(liczebnik(1, 'tydzień', 'tygodnie', 'tygodni')).toBe('1 tydzień');
    expect(liczebnik(3, 'tydzień', 'tygodnie', 'tygodni')).toBe('3 tygodnie');
    expect(liczebnik(6, 'tydzień', 'tygodnie', 'tygodni')).toBe('6 tygodni');
    expect(liczebnik(12, 'tydzień', 'tygodnie', 'tygodni')).toBe('12 tygodni');
    expect(liczebnik(22, 'tydzień', 'tygodnie', 'tygodni')).toBe('22 tygodnie');
  });
  it('czas: tygodnie od 7 dni, poniżej dni', () => {
    expect(opisCzasu(42)).toBe('6 tygodni');
    expect(opisCzasu(-14)).toBe('2 tygodnie');
    expect(opisCzasu(3)).toBe('3 dni');
    expect(opisCzasu(1)).toBe('1 dzień');
  });
  it('różnice powrotu: tylko osoby z datą w obu wariantach i różnicą', () => {
    const r = roznicePowrotu({ mama: '2027-11-30', tata: '2027-01-18', ona: '2027-02-01' }, { mama: '2027-11-30', tata: '2027-03-01', inna: '2027-05-01' });
    expect(r).toEqual([{ osobaId: 'tata', dni: 42 }]);
  });
  it('B daje więcej, ale tata wraca później', () => {
    const o = opiszRoznice({
      roznica: 1704.92,
      powrotA: { tata: '2027-01-18' },
      powrotB: { tata: '2027-03-01' },
      nazwy: { tata: 'tata' },
    });
    expect(o.zdanie).toBe(`Wariant B daje o 1${NBSP}704,92${NBSP}zł więcej, ale tata wraca 6 tygodni później.`);
  });
  it('B daje mniej, za to ktoś wraca wcześniej', () => {
    const o = opiszRoznice({ roznica: -500, powrotA: { mama: '2027-12-01' }, powrotB: { mama: '2027-06-02' }, nazwy: { mama: 'mama' } });
    expect(o.zdanie).toBe(`Wariant B daje o 500,00${NBSP}zł mniej, za to mama wraca 26 tygodni wcześniej.`);
  });
  it('więcej pieniędzy i wcześniejszy powrót: spójnik „i”', () => {
    const o = opiszRoznice({ roznica: 10, powrotA: { mama: '2027-12-01' }, powrotB: { mama: '2027-11-24' }, nazwy: { mama: 'mama' } });
    expect(o.zdanie).toContain(', i mama wraca 1 tydzień wcześniej');
  });
  it('bez różnic', () => {
    const o = opiszRoznice({ roznica: 0, powrotA: { mama: '2027-12-01' }, powrotB: { mama: '2027-12-01' }, nazwy: { mama: 'mama' } });
    expect(o.powroty).toEqual([]);
    expect(o.zdanie).toMatch(/tyle samo/);
  });
});
