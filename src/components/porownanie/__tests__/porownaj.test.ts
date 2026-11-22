import { describe, expect, it } from 'vitest';
import type { Plan, WynikKwot } from '../../../engine/types';
import { PRZYKLAD_KWOTY, PRZYKLAD_PLAN } from '../../../mocks/przyklad';
import { kopiaPlanu, porownajWarianty, powrotDoPracy } from '../porownaj';

describe('porównanie wariantów', () => {
  it('powrót do pracy: dzień po ostatnim urlopie każdej osoby', () => {
    const plan: Plan = {
      ...PRZYKLAD_PLAN,
      odcinki: [
        ...PRZYKLAD_PLAN.odcinki,
        { id: 'p1', osobaId: 'mama', typ: 'praca', od: '2027-11-30', do: '2028-03-01' },
        { id: 't1', osobaId: 'tata', typ: 'ojcowski', od: '2027-01-04', do: '2027-01-17' },
      ],
    };
    expect(powrotDoPracy(plan)).toEqual({ mama: '2027-11-30', tata: '2027-01-18' });
  });
  it('sumy, różnica B − A, miesiące z obu wariantów z zerami', () => {
    const b: WynikKwot = {
      ...PRZYKLAD_KWOTY,
      sumaRazem: 70000,
      naRekeRazem: 60000,
      odcinki: [{ ...PRZYKLAD_KWOTY.odcinki[0], rozbicieMiesieczne: [{ miesiac: '2026-11', dni: 30, kwota: 100 }] }],
    };
    const p = porownajWarianty({ plan: PRZYKLAD_PLAN, kwoty: PRZYKLAD_KWOTY }, { plan: PRZYKLAD_PLAN, kwoty: b });
    expect([p.sumaA, p.sumaB, p.roznica]).toEqual([68295.08, 70000, 1704.92]);
    expect(p.naRekeA).toBeUndefined();
    expect(p.naRekeB).toBe(60000);
    expect(p.miesiace).toHaveLength(13);
    expect(p.miesiace[0]).toEqual({ miesiac: '2026-11', a: 0, b: 100 });
    expect(p.powrotA).toEqual({ mama: '2027-11-30' });
  });
  it('kopiaPlanu: wolne id, ta sama treść, osobne tablice', () => {
    const id = PRZYKLAD_PLAN.id;
    const k = kopiaPlanu(PRZYKLAD_PLAN, [id, `${id}-kopia-1`]);
    expect(k.id).toBe(`${id}-kopia-2`);
    expect(k.nazwa).toBe(`${PRZYKLAD_PLAN.nazwa} (kopia)`);
    expect(k.odcinki).toEqual(PRZYKLAD_PLAN.odcinki);
    expect(k.odcinki).not.toBe(PRZYKLAD_PLAN.odcinki);
    expect(k.odcinki[0]).not.toBe(PRZYKLAD_PLAN.odcinki[0]);
  });
});
