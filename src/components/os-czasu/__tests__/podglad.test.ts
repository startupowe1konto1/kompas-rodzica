import { describe, expect, it } from 'vitest';
import { celSkutku, opisZmian, zmianyPodgladu } from '../podglad';
import { plan } from './dane';

const BAZA = plan([
  { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-04-19' },
  { id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-11-29' },
]);

/** Odpowiedź silnika na „rezygnacja_matki” (kształt z /api/plan/action). */
const PRZEJECIE = plan([
  { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-02-14' },
  { id: 'tata-macierzynski-1', osobaId: 'tata', typ: 'macierzynski', od: '2027-02-15', do: '2027-04-19' },
  { id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-11-29' },
]);

describe('zmianyPodgladu', () => {
  it('rozdziela skutki na osoby: skrócony odcinek mamy, nowy odcinek taty', () => {
    const [mama, tata] = zmianyPodgladu(BAZA, PRZEJECIE, ['mama', 'tata']);
    expect(mama.zmienione.map((z) => z.po.do)).toEqual(['2027-02-14']);
    expect(mama.nowe).toEqual([]);
    expect(mama.pierwszaZmiana).toBe('2027-02-15');
    expect(tata.nowe.map((o) => o.id)).toEqual(['tata-macierzynski-1']);
    expect(tata.pierwszaZmiana).toBe('2027-02-15');
    expect(tata.doPodgladu.map((o) => o.id)).toEqual(['tata-macierzynski-1']);
  });

  it('bez zmian: puste listy i brak daty', () => {
    const [mama] = zmianyPodgladu(BAZA, { ...BAZA, wariant815: true }, ['mama']);
    expect(mama.pierwszaZmiana).toBeNull();
    expect(mama.doPodgladu).toEqual([]);
    expect(opisZmian(mama)).toEqual([]);
  });

  it('ten sam odcinek z nowym id nie jest zmianą; usunięty odcinek jest', () => {
    const po = plan([{ ...BAZA.odcinki[0], id: 'inne-id' }]);
    const [mama] = zmianyPodgladu(BAZA, po, ['mama']);
    expect(mama.nowe).toEqual([]);
    expect(mama.usuniete.map((o) => o.id)).toEqual(['r1']);
    expect(mama.pierwszaZmiana).toBe('2027-04-20');
  });

  it('zmiana stawki z kwot (wariant 81,5%) trafia do podglądu', () => {
    const [mama] = zmianyPodgladu(BAZA, { ...BAZA, wariant815: true }, ['mama'], {
      przed: { m1: 100, r1: 70 },
      po: { m1: 81.5, r1: 81.5 },
    });
    expect(mama.stawki.map((s) => [s.odcinek.id, s.po])).toEqual([
      ['m1', 81.5],
      ['r1', 81.5],
    ]);
    expect(mama.pierwszaZmiana).toBe('2026-12-01');
    expect(opisZmian(mama)[0]).toMatch(/81,5%.*100%/);
  });
});

describe('celSkutku', () => {
  it('pierwszy zmieniony odcinek drugiej osoby, w wierszu „po zmianie”', () => {
    const zmiany = zmianyPodgladu(BAZA, PRZEJECIE, ['mama', 'tata']);
    expect(celSkutku(zmiany, 'mama')).toEqual({ osobaId: 'tata', data: '2027-02-15', wiersz: 'podglad', odcinekId: 'tata-macierzynski-1' });
  });

  it('gdy zmienia się tylko u osoby, która decyduje – brak linii', () => {
    const zmiany = zmianyPodgladu(BAZA, PRZEJECIE, ['mama', 'tata']).filter((z) => z.osobaId === 'mama');
    expect(celSkutku(zmiany, 'mama')).toBeNull();
  });
});
