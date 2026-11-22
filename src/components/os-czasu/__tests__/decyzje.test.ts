import { describe, expect, it } from 'vitest';
import type { Mozliwosc, WynikUprawnien } from '../../../engine/types';
import { PRZYKLAD_UPRAWNIENIA } from '../../../mocks/przyklad';
import { decyzje, numeryDecyzji } from '../decyzje';
import { MAMA, TATA, plan, rodzina } from './dane';

function mozliwosc(kod: Mozliwosc['kod'], odKiedy: string | undefined, dostepna = true, ktoDecyduje = 'mama'): Mozliwosc {
  return { kod, dostepna, opis: '', odKiedy, konsekwencje: [], przepis: '', ktoDecyduje };
}

const PLAN = plan([
  { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-04-19' },
  { id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-11-29' },
]);

function uprawnienia(mozliwosci: Mozliwosc[]): WynikUprawnien {
  return { ...PRZYKLAD_UPRAWNIENIA, mozliwosci };
}

describe('numeryDecyzji', () => {
  it('numeruje dostępne po dacie, bez daty na końcu, niedostępne bez numeru', () => {
    const n = numeryDecyzji([
      mozliwosc('laczenie_z_praca', undefined),
      mozliwosc('rezygnacja_matki_i_przejecie', '2027-03-09'),
      mozliwosc('ojcowski_w_czesciach', '2026-12-01', false),
      mozliwosc('wariant_815', '2026-12-01'),
    ]);
    expect([...n.entries()]).toEqual([
      ['wariant_815', 1],
      ['rezygnacja_matki_i_przejecie', 2],
      ['laczenie_z_praca', 3],
    ]);
  });
});

describe('decyzje', () => {
  it('81,5%: alternatywa przełącza wariant', () => {
    const [d] = decyzje(rodzina(), PLAN, uprawnienia([mozliwosc('wariant_815', '2026-12-01')]));
    expect(d.nr).toBe(1);
    expect(d.alternatywa.akcja).toEqual({ typ: 'ustaw_wariant_815', wartosc: true });
    const [w] = decyzje(rodzina(), { ...PLAN, wariant815: true }, uprawnienia([mozliwosc('wariant_815', '2026-12-01')]));
    expect(w.alternatywa.akcja).toEqual({ typ: 'ustaw_wariant_815', wartosc: false });
  });

  it('przejęcie: rezygnacja_matki z tygodniami z pul i drugą osobą', () => {
    const r = rodzina({ osoby: [MAMA, TATA] });
    const [d] = decyzje(r, PLAN, uprawnienia([mozliwosc('rezygnacja_matki_i_przejecie', '2027-03-09')]));
    expect(d.alternatywa.akcja).toEqual({
      typ: 'rezygnacja_matki',
      poTygodniach: PRZYKLAD_UPRAWNIENIA.pule.obowiazkoweMatkiTyg,
      przejmujeOsobaId: 'tata',
    });
  });

  it('przejęcie bez drugiej osoby: brak akcji, jest powód', () => {
    const [d] = decyzje(rodzina(), PLAN, uprawnienia([mozliwosc('rezygnacja_matki_i_przejecie', '2027-03-09')]));
    expect(d.alternatywa.akcja).toBeNull();
    expect(d.alternatywa.powod).toBeTruthy();
  });

  it('podział rodzicielskiego dzieli jedyny odcinek w połowie', () => {
    const [d] = decyzje(rodzina(), PLAN, uprawnienia([mozliwosc('podzial_rodzicielskiego', '2027-04-20')]));
    expect(d.alternatywa.akcja).toMatchObject({ typ: 'podziel', odcinekId: 'r1' });
  });
});
