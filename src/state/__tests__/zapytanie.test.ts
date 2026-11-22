import { describe, expect, it } from 'vitest';
import { BladApi } from '../../lib/api';
import { funkcjaNiegotowa, komunikatBledu, kluczZapytania } from '../zapytanie';

describe('kluczZapytania', () => {
  it('null, gdy którekolwiek wejście jest null albo undefined', () => {
    expect(kluczZapytania('kwoty', { a: 1 }, null)).toBeNull();
    expect(kluczZapytania('kwoty', undefined)).toBeNull();
  });

  it('ten sam klucz dla tych samych danych, inny dla innych', () => {
    expect(kluczZapytania('kwoty', { a: 1 })).toBe(kluczZapytania('kwoty', { a: 1 }));
    expect(kluczZapytania('kwoty', { a: 1 })).not.toBe(kluczZapytania('kwoty', { a: 2 }));
    expect(kluczZapytania('kwoty', { a: 1 })).not.toBe(kluczZapytania('dokumenty', { a: 1 }));
  });

  it('bez wejść to sama nazwa (zapytanie bez parametrów)', () => {
    expect(kluczZapytania('persony')).not.toBeNull();
  });
});

describe('komunikatBledu', () => {
  it('400: złe dane, z treścią z serwera w szczegółach', () => {
    const b = komunikatBledu(new BladApi('Brakuje pola "plan".', 400));
    expect(b.status).toBe(400);
    expect(b.szczegoly).toBe('Brakuje pola "plan".');
    expect(b.komunikat).toMatch(/dan/i);
    expect(b.komunikat).not.toContain('Brakuje pola');
  });

  it('501: funkcja jeszcze niegotowa', () => {
    expect(komunikatBledu(new BladApi('Jeszcze niegotowe: kwoty.', 501)).komunikat).toMatch(/jeszcze/i);
  });

  it('404 i 5xx mają różne komunikaty', () => {
    const k404 = komunikatBledu(new BladApi('x', 404)).komunikat;
    const k500 = komunikatBledu(new BladApi('x', 500)).komunikat;
    expect(k404).not.toBe(k500);
    expect(komunikatBledu(new BladApi('x', 503)).komunikat).toBe(k500);
  });

  it('błąd sieci (fetch rzuca TypeError) → komunikat o połączeniu', () => {
    const b = komunikatBledu(new TypeError('Failed to fetch'));
    expect(b.status).toBeUndefined();
    expect(b.komunikat).toMatch(/połącz/i);
  });

  it('cokolwiek innego → ogólny komunikat, nigdy pusty', () => {
    expect(komunikatBledu('dziwne').komunikat.length).toBeGreaterThan(0);
    expect(komunikatBledu(new Error('boom')).komunikat.length).toBeGreaterThan(0);
    expect(komunikatBledu(undefined).komunikat.length).toBeGreaterThan(0);
  });
});

describe('funkcjaNiegotowa', () => {
  it.each([[501, true], [404, true], [400, false], [500, false]])('status %i → %s', (status, wynik) => {
    expect(funkcjaNiegotowa({ status })).toBe(wynik);
  });
  it('brak błędu → false', () => expect(funkcjaNiegotowa(null)).toBe(false));
});
