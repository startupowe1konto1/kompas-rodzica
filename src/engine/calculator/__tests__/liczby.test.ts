import { describe, expect, it } from 'vitest';
import { PARAMETRY_2026 } from '../../params';
import { poOdliczeniuSkladek, proc, procentZ, razyDni, stawkaDzienna, zl } from '../liczby';

describe('liczby', () => {
  it('procentZ zaokrągla połówkę grosza w górę (23 550 × 86,29% = 20 321,295)', () => {
    expect(procentZ(23550, 86.29)).toBe(20321.3);
    expect(procentZ(161.07, 50)).toBe(80.54);
    expect(procentZ(8000, 86.29)).toBe(6903.2);
  });
  it('poOdliczeniuSkladek bierze procent składek z parametrów', () => {
    expect(poOdliczeniuSkladek(8000, PARAMETRY_2026)).toBe(6903.2);
    expect(poOdliczeniuSkladek(4806, PARAMETRY_2026)).toBe(4147.1);
    const inne = { ...PARAMETRY_2026, kwoty: { ...PARAMETRY_2026.kwoty, skladkiPracownikaProc: 10 } };
    expect(poOdliczeniuSkladek(8000, inne)).toBe(7200);
  });
  it('stawkaDzienna zaokrągla raz, po zastosowaniu stawki', () => {
    expect(stawkaDzienna(6903.2, 100, 30)).toBe(230.11);
    expect(stawkaDzienna(6903.2, 70, 30)).toBe(161.07);
    expect(stawkaDzienna(6903.2, 81.5, 30)).toBe(187.54);
    expect(stawkaDzienna(5177.4, 100, 30)).toBe(172.58);
  });
  it('stawkaDzienna przy dzielniku 0 albo ujemnym daje 0, nie Infinity ani NaN (obrona przed złymi parametrami)', () => {
    expect(stawkaDzienna(6903.2, 100, 0)).toBe(0);
    expect(stawkaDzienna(6903.2, 100, -30)).toBe(0);
    expect(stawkaDzienna(6903.2, 100, Number.NaN)).toBe(0);
  });
  it('razyDni nie gubi groszy', () => {
    expect(razyDni(230.11, 140)).toBe(32215.4);
    expect(razyDni(161.07, 224)).toBe(36079.68);
  });
  it('zl i proc formatują po polsku', () => {
    expect(zl(8000)).toBe('8000,00 zł');
    expect(zl(6903.2)).toBe('6903,20 zł');
    expect(proc(100)).toBe('100%');
    expect(proc(13.71)).toBe('13,71%');
    expect(proc(81.5)).toBe('81,5%');
  });
});
