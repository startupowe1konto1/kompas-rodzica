import { describe, expect, it } from 'vitest';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { bladDatyPorodu, dzieckoSieUrodzilo } from '../porod';

describe('dzieckoSieUrodzilo', () => {
  it('faktyczna data, przewidywana=false, poprzednia data zwrócona, bez mutacji', () => {
    const w = dzieckoSieUrodzilo(PRZYKLAD_RODZINA, '2026-11-20');
    expect(w.poprzedniaData).toBe('2026-12-01');
    expect(w.rodzina.zdarzenie).toMatchObject({ data: '2026-11-20', przewidywana: false });
    expect(w.rodzina.dataAnalizy).toBe('2026-11-21');
    expect(PRZYKLAD_RODZINA.zdarzenie.przewidywana).toBe(true);
  });
  it('kody błędów daty', () => {
    expect(bladDatyPorodu('2026-11-20', PRZYKLAD_RODZINA)).toBeNull();
    expect(bladDatyPorodu('2026-11-21', PRZYKLAD_RODZINA)).toBeNull();
    expect(bladDatyPorodu('2026-11-22', PRZYKLAD_RODZINA)).toBe('DATA_W_PRZYSZLOSCI');
    expect(bladDatyPorodu('2026-02-30', PRZYKLAD_RODZINA)).toBe('ZLA_DATA');
    expect(bladDatyPorodu('', PRZYKLAD_RODZINA)).toBe('WYMAGANE');
    expect(bladDatyPorodu('2025-11-20', PRZYKLAD_RODZINA)).toBe('DATA_ZA_WCZESNIE');
  });
});
