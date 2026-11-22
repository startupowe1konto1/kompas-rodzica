import { describe, expect, it } from 'vitest';
import type { Plan, WymianaCzatu } from '../../../engine/types';
import { czyPokazacZusika, historiaDoWyslania, MAKS_HISTORIA, zmianyPlanu } from '../logika';

const plan = (odcinki: Plan['odcinki']): Plan => ({ id: 'p', nazwa: 'Plan', wariant815: false, odcinki });

describe('czyPokazacZusika', () => {
  it.each([
    ['/wynik', true],
    ['/plan', true],
    ['/plan/porownanie', true],
    ['/', true],
    ['/sytuacja', true],
    ['/logowanie', true],
    ['/dokumenty', true],
    ['/admin', false],
    ['/admin/parametry', false],
    ['/administracja', true],
  ])('%s → %s', (sciezka, oczekiwane) => expect(czyPokazacZusika(sciezka)).toBe(oczekiwane));
});

describe('historiaDoWyslania', () => {
  it(`wysyła najwyżej ${MAKS_HISTORIA} ostatnich wymian`, () => {
    const wymiany: WymianaCzatu[] = Array.from({ length: MAKS_HISTORIA + 3 }, (_, i) => ({ pytanie: `p${i}`, odpowiedz: `o${i}` }));
    const h = historiaDoWyslania(wymiany);
    expect(h).toHaveLength(MAKS_HISTORIA);
    expect(h[0].pytanie).toBe('p3');
    expect(h.at(-1)?.pytanie).toBe(`p${MAKS_HISTORIA + 2}`);
  });
});

describe('zmianyPlanu', () => {
  const r1 = { id: 'r1', osobaId: 'mama', typ: 'rodzicielski' as const, od: '2027-04-20', do: '2027-11-29' };
  const m1 = { id: 'm1', osobaId: 'mama', typ: 'macierzynski' as const, od: '2026-12-01', do: '2027-04-19' };

  it('bez zmian → pusta lista', () => {
    expect(zmianyPlanu(plan([m1, r1]), plan([m1, r1]))).toEqual([]);
  });

  it('pokazuje odcinki zmienione, nowe i usunięte', () => {
    const t1 = { id: 't1', osobaId: 'osoba-2', typ: 'rodzicielski' as const, od: '2027-10-02', do: '2027-11-29' };
    const zmiany = zmianyPlanu(plan([m1, r1]), plan([{ ...r1, do: '2027-10-01' }, t1]));
    expect(zmiany).toEqual([
      { rodzaj: 'zmieniony', odcinek: { ...r1, do: '2027-10-01' }, przed: r1 },
      { rodzaj: 'nowy', odcinek: t1 },
      { rodzaj: 'usuniety', odcinek: m1 },
    ]);
  });

  it('zmiana osoby albo wymiaru pracy to też zmiana', () => {
    const z = zmianyPlanu(plan([r1]), plan([{ ...r1, osobaId: 'osoba-2', wymiarPracy: 0.5 }]));
    expect(z.map((x) => x.rodzaj)).toEqual(['zmieniony']);
  });
});
