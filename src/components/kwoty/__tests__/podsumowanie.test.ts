import { describe, expect, it } from 'vitest';
import { PRZYKLAD_KWOTY } from '../../../mocks/przyklad';
import { podsumowanieOsoby, rozbicieRodziny } from '../podsumowanie';

describe('podsumowanieOsoby', () => {
  it('przykład: 68 295,08 zł brutto, dwa odcinki, bez szacunku na rękę', () => {
    const p = podsumowanieOsoby(PRZYKLAD_KWOTY, 'mama');
    expect(p.brutto).toBe(68295.08);
    expect(p.odcinki.map((o) => o.odcinekId)).toEqual(['m1', 'r1']);
    expect(p.naReke).toBeUndefined();
  });
  it('na rękę: suma, gdy każdy odcinek ma szacunek', () => {
    const w = { ...PRZYKLAD_KWOTY, odcinki: PRZYKLAD_KWOTY.odcinki.map((o, i) => ({ ...o, naReke: [100.1, 200.2][i] })) };
    expect(podsumowanieOsoby(w, 'mama').naReke).toBe(300.3);
  });
  it('osoba bez odcinków: zero', () => {
    expect(podsumowanieOsoby(PRZYKLAD_KWOTY, 'tata')).toEqual({ brutto: 0, naReke: undefined, odcinki: [] });
  });
});

describe('rozbicieRodziny', () => {
  it('12 miesięcy, kwiecień 2027 sumuje dwa odcinki', () => {
    const r = rozbicieRodziny(PRZYKLAD_KWOTY);
    expect(r).toHaveLength(12);
    expect(r[0].miesiac).toBe('2026-12');
    expect(r.find((m) => m.miesiac === '2027-04')).toEqual({ miesiac: '2027-04', kwoty: { mama: 6143.86 }, razem: 6143.86 });
  });
  it('sumy po osobach i razem, miesiące rosnąco', () => {
    const w = {
      ...PRZYKLAD_KWOTY,
      odcinki: [
        { ...PRZYKLAD_KWOTY.odcinki[0], osobaId: 'tata', rozbicieMiesieczne: [{ miesiac: '2027-02', dni: 1, kwota: 0.1 }] },
        { ...PRZYKLAD_KWOTY.odcinki[1], rozbicieMiesieczne: [{ miesiac: '2027-02', dni: 1, kwota: 0.2 }, { miesiac: '2027-01', dni: 1, kwota: 1 }] },
      ],
    };
    expect(rozbicieRodziny(w)).toEqual([
      { miesiac: '2027-01', kwoty: { mama: 1 }, razem: 1 },
      { miesiac: '2027-02', kwoty: { tata: 0.1, mama: 0.2 }, razem: 0.3 },
    ]);
  });
});
