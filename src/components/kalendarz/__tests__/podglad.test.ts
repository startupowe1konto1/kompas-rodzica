import { describe, expect, it } from 'vitest';
import type { Plan, Termin } from '../../../engine/types';
import { czesciTerminow, kluczTerminu, oknoKalendarza, opisDni, pasyZnacznikow } from '../podglad';

const t = (data: string, kod?: string): Termin => ({ data, kod, tytul: `T ${data}`, opis: '', rodzaj: 'wniosek' });

describe('opisDni', () => {
  it('dziś, jutro, liczba dni (1 dzień, n dni)', () => {
    expect(opisDni(0)).toEqual({ liczba: null, jednostka: 'Dziś', etykieta: 'Termin dziś' });
    expect(opisDni(1)).toEqual({ liczba: '1', jednostka: 'dzień', etykieta: 'Za 1 dzień' });
    expect(opisDni(10)).toEqual({ liczba: '10', jednostka: 'dni', etykieta: 'Za 10 dni' });
    expect(opisDni(128).liczba).toBe('128');
  });
  it('miniony termin: liczba dni temu', () => {
    expect(opisDni(-1)).toEqual({ liczba: '1', jednostka: 'dzień temu', etykieta: 'Termin minął 1 dzień temu' });
    expect(opisDni(-3)).toEqual({ liczba: '3', jednostka: 'dni temu', etykieta: 'Termin minął 3 dni temu' });
  });
});

describe('kluczTerminu', () => {
  it('kod terminu, a bez kodu tytuł; zawsze z datą', () => {
    expect(kluczTerminu(t('2027-03-30', 'WNIOSEK_RODZICIELSKI'))).toBe('2027-03-30-WNIOSEK_RODZICIELSKI');
    expect(kluczTerminu(t('2027-03-30'))).toBe('2027-03-30-T 2027-03-30');
  });
});

describe('oknoKalendarza', () => {
  const plan: Plan = {
    id: 'p',
    nazwa: 'p',
    odcinki: [
      { id: 'm', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-04-19' },
      { id: 'r', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-11-29' },
    ],
  } as Plan;

  it('obejmuje dziś, wszystkie odcinki i terminy z zapasem 14 dni', () => {
    expect(oknoKalendarza([t('2026-12-22'), t('2027-03-30')], plan, '2026-11-21')).toEqual({ od: '2026-11-07', do: '2027-12-13' });
  });
  it('termin po końcu planu poszerza okno', () => {
    expect(oknoKalendarza([t('2028-01-10')], plan, '2026-11-21').do).toBe('2028-01-24');
  });
  it('bez planu: tylko dziś i terminy', () => {
    expect(oknoKalendarza([t('2027-01-01')], null, '2026-12-01')).toEqual({ od: '2026-11-17', do: '2027-01-15' });
  });
});

describe('pasyZnacznikow', () => {
  it('bliskie znaczniki trafiają do kolejnych pasów, dalekie do pierwszego', () => {
    expect(pasyZnacznikow([0.1, 0.11, 0.115, 0.5, 0.505], 0.03)).toEqual([0, 1, 2, 0, 1]);
  });
  it('pas zwalnia się, gdy znacznik jest dość daleko', () => {
    expect(pasyZnacznikow([0.1, 0.12, 0.2], 0.03)).toEqual([0, 1, 0]);
  });
});

describe('czesciTerminow', () => {
  const w = (data: string, kod: string, osobaId = 'mama'): Termin => ({ data, kod, osobaId, tytul: kod, opis: '', rodzaj: 'wniosek' });
  it('ten sam kod tej samej osoby kilka razy: numery części po dacie', () => {
    const lista = [w('2027-07-20', 'WNIOSEK_RODZICIELSKI'), w('2026-12-22', 'TERMIN_815'), w('2027-03-30', 'WNIOSEK_RODZICIELSKI')];
    const c = czesciTerminow(lista);
    expect(c.get(kluczTerminu(lista[2]))).toBe(1);
    expect(c.get(kluczTerminu(lista[0]))).toBe(2);
    expect(c.has(kluczTerminu(lista[1]))).toBe(false);
  });
  it('różne osoby i terminy bez kodu nie są częściami', () => {
    const c = czesciTerminow([w('2027-03-30', 'WNIOSEK_RODZICIELSKI'), w('2027-04-30', 'WNIOSEK_RODZICIELSKI', 'tata'), t('2027-01-01'), t('2027-02-01')]);
    expect(c.size).toBe(0);
  });
});
