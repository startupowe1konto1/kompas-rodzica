/**
 * A6: „Dziecko się urodziło” – przesunNaNowaDate (EC-34, KP art. 180 § 2–3, pytania 19–20).
 */
import { describe, expect, it } from 'vitest';
import { PRZYKLAD_PLAN } from '../../../mocks/przyklad';
import type { Odcinek, Plan } from '../../types';
import { kopia, mama, odcinek, P, plan, rodzina, tata } from '../../__tests__/rodziny';
import { przesunNaNowaDate } from '../akcje';

const PRZEWIDYWANY = '2026-12-01';

/** Przesuwa plan na faktyczną datę porodu i sprawdza, że wejście się nie zmieniło. */
function urodzilo(wejscie: Plan, faktyczna: string): Plan {
  const r = rodzina({ osoby: [mama(), tata()], data: faktyczna, przewidywana: false });
  const przed = kopia(wejscie);
  const wynik = przesunNaNowaDate(r, wejscie, PRZEWIDYWANY, P(faktyczna));
  expect(wejscie).toEqual(przed);
  return wynik;
}

function odc(p: Plan, id: string): Odcinek {
  const o = p.odcinki.find((x) => x.id === id);
  if (!o) throw new Error(`Brak odcinka ${id}`);
  return o;
}

/** Mama na macierzyńskim 2 tygodnie przed przewidywanym porodem, potem rodzicielski; tata ojcowski od porodu. */
const PRZED_PORODEM = plan([
  odcinek({ id: 'm', osobaId: 'mama', typ: 'macierzynski', od: '2026-11-17', do: '2027-04-05', tytulId: 'etat-1' }),
  odcinek({ id: 'r', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-06', do: '2027-11-15', czescNr: 1, tytulId: 'etat-1' }),
  odcinek({ id: 'o', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14', czescNr: 1 }),
]);

describe('bez urlopu przed porodem: cały plan przesuwa się o różnicę dat', () => {
  it('poród 5 dni wcześniej: wszystko −5 dni (jak w kontrakt.test.ts)', () => {
    const w = urodzilo(PRZYKLAD_PLAN, '2026-11-26');
    expect(odc(w, 'm1')).toMatchObject({ od: '2026-11-26', do: '2027-04-14' });
    expect(odc(w, 'r1')).toMatchObject({ od: '2027-04-15', do: '2027-11-24', czescNr: 1 });
  });

  it('poród 10 dni później: wszystko +10 dni', () => {
    const w = urodzilo(PRZYKLAD_PLAN, '2026-12-11');
    expect(odc(w, 'm1')).toMatchObject({ od: '2026-12-11', do: '2027-04-29' });
    expect(odc(w, 'r1')).toMatchObject({ od: '2027-04-30', do: '2027-12-09' });
  });

  it('ta sama data: plan bez zmian', () => {
    expect(urodzilo(PRZYKLAD_PLAN, PRZEWIDYWANY)).toEqual(PRZYKLAD_PLAN);
  });

  it('zła data (poprzednia, nowa albo w odcinku): plan bez zmian, bez wyjątku', () => {
    expect(urodzilo(PRZYKLAD_PLAN, '2026-11-31')).toEqual(PRZYKLAD_PLAN);
    const r = rodzina({ osoby: [mama()], data: '2026-11-26' });
    expect(przesunNaNowaDate(r, PRZYKLAD_PLAN, '2026-12-1', P())).toEqual(PRZYKLAD_PLAN);
    const zly = plan([odcinek({ id: 'r', osobaId: 'mama', typ: 'rodzicielski', od: '2027-4-20', do: '2027-11-29' })]);
    expect(urodzilo(zly, '2026-11-26')).toEqual(zly);
  });

  it('wniosek815Data przesuwa się o różnicę dat', () => {
    const w = urodzilo({ ...PRZYKLAD_PLAN, wariant815: true, wniosek815Data: '2026-12-01' }, '2026-11-26');
    expect(w.wniosek815Data).toBe('2026-11-26');
  });
});

describe('urlop macierzyński wzięty przed porodem (KP art. 180 § 2–3)', () => {
  it('poród 2026-11-24 (7 dni wcześniej): macierzyński 2026-11-17–2027-04-05, rodzicielski od 2027-04-06, ta sama długość', () => {
    const w = urodzilo(PRZED_PORODEM, '2026-11-24');
    expect(odc(w, 'm')).toMatchObject({ od: '2026-11-17', do: '2027-04-05' });
    expect(odc(w, 'r')).toMatchObject({ od: '2027-04-06', do: '2027-11-15' });
    // ojcowski liczony od porodu przesuwa się razem z porodem
    expect(odc(w, 'o')).toMatchObject({ od: '2026-11-24', do: '2026-12-07' });
  });

  it('poród 2026-11-10, przed zaplanowanym urlopem od 2026-11-17: macierzyński od dnia porodu, 140 dni (do 2027-03-29)', () => {
    const w = urodzilo(PRZED_PORODEM, '2026-11-10');
    expect(odc(w, 'm')).toMatchObject({ od: '2026-11-10', do: '2027-03-29' });
    expect(odc(w, 'r')).toMatchObject({ od: '2027-03-30', do: '2027-11-08' });
    expect(odc(w, 'o')).toMatchObject({ od: '2026-11-10', do: '2026-11-23' });
  });

  it('poród 30 dni później: macierzyński i rodzicielski mamy bez zmian (dni przed porodem zużywają pulę), ojcowski +30', () => {
    // NIEJASNE (pytanie nr 19): przed porodem wychodzi 44 dni > 6 tygodni – akcja to zostawia, ostrzega walidacja.
    const w = urodzilo(PRZED_PORODEM, '2026-12-31');
    expect(odc(w, 'm')).toMatchObject({ od: '2026-11-17', do: '2027-04-05' });
    expect(odc(w, 'r')).toMatchObject({ od: '2027-04-06', do: '2027-11-15' });
    expect(odc(w, 'o')).toMatchObject({ od: '2026-12-31', do: '2027-01-13' });
  });

  it('odcinki stykające się z macierzyńskim (przejęcie przez tatę) i ich następne zachowują ciągłość', () => {
    const wej = plan([
      odcinek({ id: 'm', osobaId: 'mama', typ: 'macierzynski', od: '2026-11-17', do: '2027-02-22' }),
      odcinek({ id: 'tm', osobaId: 'tata', typ: 'macierzynski', od: '2027-02-23', do: '2027-04-05' }),
      odcinek({ id: 'tr', osobaId: 'tata', typ: 'rodzicielski', od: '2027-04-06', do: '2027-06-07' }),
    ]);
    const pozniej = urodzilo(wej, '2026-12-11');
    expect(odc(pozniej, 'tm')).toMatchObject({ od: '2027-02-23', do: '2027-04-05' });
    expect(odc(pozniej, 'tr')).toMatchObject({ od: '2027-04-06', do: '2027-06-07' });

    const wczesniej = urodzilo(wej, '2026-11-10');
    expect(odc(wczesniej, 'm')).toMatchObject({ od: '2026-11-10', do: '2027-02-15' });
    expect(odc(wczesniej, 'tm')).toMatchObject({ od: '2027-02-16', do: '2027-03-29' });
    expect(odc(wczesniej, 'tr')).toMatchObject({ od: '2027-03-30', do: '2027-05-31' });
  });

  it('zwolnienie w ciąży przed porodem zostaje na miejscu', () => {
    const wej = plan([
      odcinek({ id: 'c', osobaId: 'mama', typ: 'chorobowy_ciaza', od: '2026-10-01', do: '2026-11-16' }),
      ...PRZED_PORODEM.odcinki,
    ]);
    const w = urodzilo(wej, '2026-11-24');
    expect(odc(w, 'c')).toMatchObject({ od: '2026-10-01', do: '2026-11-16' });
  });
});
