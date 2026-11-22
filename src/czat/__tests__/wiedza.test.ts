import { describe, expect, it } from 'vitest';
import { KROKI_ANKIETY, KROKI_DOKUMENTOW, PYTANIA, PYTANIA_DOKUMENTY } from '../../content/pytania';
import { opisAplikacji } from '../wiedza';

describe('opisAplikacji – wiedza ZuSika o ankiecie i ekranach', () => {
  const opis = opisAplikacji();

  it('zawiera każdy krok ankiety i dokumentów', () => {
    for (const k of [...KROKI_ANKIETY, ...KROKI_DOKUMENTOW]) expect(opis, k.id).toContain(k.tytul);
  });

  it('zawiera każde pytanie ankiety i dokumentów z wyjaśnieniem „po co pytamy”', () => {
    for (const p of [...PYTANIA, ...PYTANIA_DOKUMENTY]) {
      expect(opis, p.id).toContain(p.etykieta);
      if (p.pomoc) expect(opis, `${p.id} pomoc`).toContain(p.pomoc);
    }
  });

  it('opisuje ekrany aplikacji', () => {
    for (const e of ['Moja sytuacja', 'Wynik', 'Plan', 'Kalendarz', 'Dokumenty', 'Trudne sytuacje', 'Inne wsparcie']) {
      expect(opis, e).toContain(e);
    }
  });

  it('mieści się w budżecie zapytania (do 40 000 znaków)', () => {
    expect(opis.length).toBeLessThan(40_000);
  });

  it('jest za każdym razem identyczny (stały początek zapytania – prompt caching)', () => {
    expect(opisAplikacji()).toBe(opis);
  });
});
