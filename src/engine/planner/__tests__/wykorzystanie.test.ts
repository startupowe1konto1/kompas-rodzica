/**
 * Wykorzystanie pul – tor A, zadanie A5. Liczniki „wykorzystaj albo stracisz” dla UI.
 */
import { describe, expect, it } from 'vitest';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA, PRZYKLAD_UPRAWNIENIA, PRZYKLAD_WALIDACJA } from '../../../mocks/przyklad';
import { koniecOdcinka } from '../../daty';
import type { Odcinek, Pule, WykorzystaniePuli } from '../../types';
import { mama, odcinek, P, plan, rodzina, tata } from '../../__tests__/rodziny';
import { ustalListeUprawnien } from '../../eligibility/uprawnienia';
import { walidujPlanZ } from '../walidacja';
import { policzWykorzystanie } from '../wykorzystanie';

const PULE: Pule = PRZYKLAD_UPRAWNIENIA.pule;
const R1 = rodzina();
const R2 = rodzina({ osoby: [mama(), tata()] });

const mac = (od: string, do_: string, osobaId = 'mama'): Odcinek => odcinek({ osobaId, typ: 'macierzynski', od, do: do_ });
const rodz = (osobaId: string, od: string, do_: string, wymiarPracy?: number): Odcinek =>
  odcinek({ osobaId, typ: 'rodzicielski', od, do: do_, ...(wymiarPracy !== undefined ? { wymiarPracy } : {}) });

function wpis(w: WykorzystaniePuli[], pula: WykorzystaniePuli['pula'], osobaId?: string) {
  return w.find((x) => x.pula === pula && x.osobaId === osobaId);
}

describe('policzWykorzystanie', () => {
  it('publiczne policzWykorzystanie liczy uprawnienia samo i daje to samo co walidacja', () => {
    const pl = plan([mac('2026-12-01', '2027-04-19'), rodz('mama', '2027-04-20', '2027-11-29')]);
    const u = { ...PRZYKLAD_UPRAWNIENIA, uprawnienia: ustalListeUprawnien(R2, PULE, P()) };
    expect(policzWykorzystanie(R2, pl, PULE, P())).toEqual(walidujPlanZ(R2, pl, u, P()).wykorzystanie);
  });

  it('przykład wzorcowy daje wykorzystanie z PRZYKLAD_WALIDACJA', () => {
    expect(policzWykorzystanie(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, PULE, P())).toEqual(PRZYKLAD_WALIDACJA.wykorzystanie);
  });

  it('mama bierze 32 tygodnie rodzicielskiego, taty nie ma w planie → przepadnieDni 63', () => {
    const w = policzWykorzystanie(R1, plan([mac('2026-12-01', '2027-04-19'), rodz('mama', '2027-04-20', '2027-11-29')]), PULE, P());
    expect(wpis(w, 'rodzicielski')).toEqual({ pula: 'rodzicielski', wykorzystaneDni: 224, dostepneDni: 287, przepadnieDni: 63 });
  });

  it('tata jest w rodzinie, ale bez rodzicielskiego: jego 9 tygodni przepada, licznik taty 0 z 63', () => {
    const w = policzWykorzystanie(R2, plan([mac('2026-12-01', '2027-04-19'), rodz('mama', '2027-04-20', '2027-11-29')]), PULE, P());
    expect(wpis(w, 'rodzicielski')?.przepadnieDni).toBe(63);
    expect(wpis(w, 'rodzicielski_nieprzenoszalne', 'tata')).toMatchObject({ wykorzystaneDni: 0, dostepneDni: 63, przepadnieDni: 63 });
    expect(wpis(w, 'rodzicielski_nieprzenoszalne', 'mama')).toMatchObject({ wykorzystaneDni: 63, dostepneDni: 63 });
  });

  it('EC-56 (odpowiedź ZUS 21.11, pytania nr 6 i 14): mama bez prawa do rodzicielskiego – jej 9 tygodni przepada', () => {
    const r = rodzina({ osoby: [mama([]), tata()] });
    const w = policzWykorzystanie(r, plan([rodz('tata', '2027-04-20', '2027-11-29')]), PULE, P());
    expect(wpis(w, 'rodzicielski')).toEqual({ pula: 'rodzicielski', wykorzystaneDni: 224, dostepneDni: 287, przepadnieDni: 63 });
    expect(wpis(w, 'rodzicielski_nieprzenoszalne', 'mama')).toMatchObject({ wykorzystaneDni: 0, dostepneDni: 63, przepadnieDni: 63 });
  });

  it('oboje biorą swoje 9 tygodni → nic nie przepada', () => {
    const w = policzWykorzystanie(
      R2,
      plan([mac('2026-12-01', '2027-04-19'), rodz('mama', '2027-04-20', '2027-11-29'), rodz('tata', '2027-11-30', '2028-01-31')]),
      PULE,
      P(),
    );
    expect(wpis(w, 'rodzicielski')).toMatchObject({ wykorzystaneDni: 287, przepadnieDni: 0 });
  });

  it('nic nie przepada ponad to, co zostało w puli', () => {
    // mama 32 tygodnie, tata 9 tygodni, ale tylko 5 dni z nich: zostało 58 dni, z czego przepada 58
    const w = policzWykorzystanie(
      R2,
      plan([mac('2026-12-01', '2027-04-19'), rodz('mama', '2027-04-20', '2027-11-29'), rodz('tata', '2027-11-30', '2027-12-04')]),
      PULE,
      P(),
    );
    expect(wpis(w, 'rodzicielski')).toMatchObject({ wykorzystaneDni: 229, przepadnieDni: 58 });
  });

  it('łączenie z pracą na pół etatu: 448 dni urlopu zużywa 224 dni puli (D10)', () => {
    const w = policzWykorzystanie(R1, plan([mac('2026-12-01', '2027-04-19'), rodz('mama', '2027-04-20', '2028-07-10', 0.5)]), PULE, P());
    expect(wpis(w, 'rodzicielski')).toMatchObject({ wykorzystaneDni: 224, dostepneDni: 287, przepadnieDni: 63 });
  });

  it('macierzyński mamy i przejęty przez tatę liczą się razem', () => {
    const w = policzWykorzystanie(R2, plan([mac('2026-12-01', '2027-03-08'), mac('2027-03-09', '2027-04-19', 'tata')]), PULE, P());
    expect(wpis(w, 'macierzynski')).toEqual({ pula: 'macierzynski', wykorzystaneDni: 140, dostepneDni: 140 });
  });

  it('ojcowski: licznik dla taty z ojcowskim w planie', () => {
    const o = odcinek({ osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-07' });
    const w = policzWykorzystanie(R2, plan([mac('2026-12-01', '2027-04-19'), o]), PULE, P());
    expect(wpis(w, 'ojcowski', 'tata')).toEqual({ pula: 'ojcowski', osobaId: 'tata', wykorzystaneDni: 7, dostepneDni: 14, przepadnieDni: 7 });
  });

  it('ojcowski: tata w rodzinie bez ojcowskiego w planie ma licznik 0 z 14', () => {
    const w = policzWykorzystanie(R2, plan([mac('2026-12-01', '2027-04-19')]), PULE, P());
    expect(wpis(w, 'ojcowski', 'tata')).toMatchObject({ wykorzystaneDni: 0, dostepneDni: 14 });
    expect(wpis(w, 'ojcowski', 'mama')).toBeUndefined();
  });

  it('uzupełniający: wpis tylko, gdy pula > 0', () => {
    const pl = plan([mac('2026-12-01', '2027-04-19'), odcinek({ osobaId: 'mama', typ: 'uzupelniajacy', od: '2027-04-20', do: koniecOdcinka('2027-04-20', 14) })]);
    expect(wpis(policzWykorzystanie(R1, pl, PULE, P()), 'uzupelniajacy')).toBeUndefined();
    expect(wpis(policzWykorzystanie(R1, pl, { ...PULE, uzupelniajacyTyg: 8 }, P()), 'uzupelniajacy')).toEqual({
      pula: 'uzupelniajacy',
      wykorzystaneDni: 14,
      dostepneDni: 56,
    });
  });

  it('pula macierzyńskiego z ostatniego dnia (zgon dziecka): od porodu do macierzynskiOstatniDzien', () => {
    const pule = { ...PULE, macierzynskiTyg: 8, macierzynskiOstatniDzien: '2027-01-25', rodzicielskiTyg: 0 };
    const w = policzWykorzystanie(R1, plan([mac('2026-12-01', '2027-01-20')]), pule, P());
    expect(wpis(w, 'macierzynski')).toMatchObject({ wykorzystaneDni: 51, dostepneDni: 56 });
  });
});
