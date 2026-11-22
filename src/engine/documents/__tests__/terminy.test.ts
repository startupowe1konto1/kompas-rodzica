/** Terminy: sposób liczenia „X dni przed”, granice dat i przypadki skrajne poza tabelą D2. */
import { describe, expect, it } from 'vitest';
import { PARAMETRY_2026, WERSJE_DOMYSLNE, parametryNaDzien } from '../../params';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { dokumentyITerminy } from '..';
import { ostatniDzienPo, ostatniDzienPrzed, terminyDlaPlanu } from '../terminy';
import { ETAT, dokument, mamaZ, plan, rodzina, tataNaEtacie, terminy } from './dane';
import type { Odcinek, Parametry } from '../../types';

const W = WERSJE_DOMYSLNE;
const p = parametryNaDzien('2026-12-01');
const [M1, R1] = PRZYKLAD_PLAN.odcinki;

describe('liczenie terminów', () => {
  it('„X dni przed” = dzień rozpoczęcia − X dni; rok przestępny', () => {
    expect(ostatniDzienPrzed('2027-04-20', 21)).toBe('2027-03-30');
    expect(ostatniDzienPrzed('2028-03-01', 21)).toBe('2028-02-09');
    expect(ostatniDzienPrzed('2027-03-01', 7)).toBe('2027-02-22');
  });

  it('„nie później niż X dni po porodzie” = dzień porodu + X dni, także przez koniec roku', () => {
    expect(ostatniDzienPo('2026-12-01', 21)).toBe('2026-12-22');
    expect(ostatniDzienPo('2026-12-15', 21)).toBe('2027-01-05');
  });

  it('liczby dni pochodzą z parametrów: zmiana parametru zmienia termin', () => {
    const inne: Parametry = { ...PARAMETRY_2026, terminyDni: { ...PARAMETRY_2026.terminyDni, wniosekRodzicielskiPrzed: 28 } };
    const t = terminyDlaPlanu(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, inne);
    expect(terminy(t, { kod: 'WNIOSEK_RODZICIELSKI', odcinekId: 'r1' }).map((x) => x.data)).toEqual(['2027-03-23']);
  });
});

describe('terminyDlaPlanu', () => {
  it('terminy są posortowane po dacie', () => {
    const t = terminyDlaPlanu(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, p);
    expect(t.map((x) => x.data)).toEqual([...t.map((x) => x.data)].sort());
  });

  it('pusty plan: zostaje tylko przewidywany poród, bez wyjątku', () => {
    const t = terminyDlaPlanu(PRZYKLAD_RODZINA, plan([]), p);
    expect(t.map((x) => [x.kod, x.data, x.rodzaj])).toEqual([['POROD', '2026-12-01', 'poczatek']]);
  });

  it('koniec urlopu pokazujemy tylko wtedy, gdy po nim osoba wraca do pracy', () => {
    const t = terminyDlaPlanu(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, p);
    expect(terminy(t, { rodzaj: 'koniec' }).map((x) => [x.kod, x.data, x.odcinekId])).toEqual([['KONIEC_RODZICIELSKI', '2027-11-29', 'r1']]);
  });

  it('przysposobienie: 81,5% liczone od przyjęcia dziecka (UZ art. 30a ust. 2)', () => {
    const r = rodzina([PRZYKLAD_RODZINA.osoby[0]], { typ: 'przysposobienie', data: '2026-12-10', przewidywana: false, dzieci: [{ dataUrodzenia: '2023-01-01' }] });
    const n1: Odcinek = { id: 'n1', osobaId: 'mama', typ: 'na_warunkach_macierzynskiego', od: '2026-12-10', do: '2027-04-28' };
    const t = terminyDlaPlanu(r, plan([n1]), p);
    expect(terminy(t, { kod: 'TERMIN_815', przepis: 'UZ art. 30a ust. 2' }).map((x) => x.data)).toEqual(['2026-12-31']);
  });
});

describe('dokumenty – przypadki skrajne', () => {
  it('wariant 81,5% u dużego płatnika: osobny wniosek do pracodawcy w 21 dni po porodzie', () => {
    const w = dokumentyITerminy(PRZYKLAD_RODZINA, plan(PRZYKLAD_PLAN.odcinki, { wariant815: true }), W);
    expect(dokument(w, 'wniosek_815', 'mama')).toMatchObject({ gdzie: 'pracodawca', termin: '2026-12-22', przepis: 'UZ art. 30a ust. 1' });
    expect(terminy(w.terminy, { kod: 'WNIOSEK_815', osobaId: 'mama' }).map((x) => x.data)).toEqual(['2026-12-22']);
    expect(terminy(w.terminy, { kod: 'TERMIN_815' })).toEqual([]);
  });

  it('wariant 81,5%, gdy płaci ZUS: wybór jest we wniosku ZAM, więc ZAM ma termin 21 dni po porodzie', () => {
    const r = rodzina([mamaZ([{ ...ETAT, platnikPowyzej20: false }])]);
    const w = dokumentyITerminy(r, plan(PRZYKLAD_PLAN.odcinki, { wariant815: true }), W);
    expect(dokument(w, 'ZAM', 'mama')).toMatchObject({ termin: '2026-12-22', gdzie: 'ZUS' });
    expect(dokument(w, 'wniosek_815')).toBeUndefined();
    expect(terminy(w.terminy, { kod: 'WNIOSEK_ZAM', osobaId: 'mama' }).map((x) => x.data)).toEqual(['2026-12-22']);
  });

  it('ojcowski tuż po porodzie: termin wypada przed porodem, więc wniosek można złożyć od razu', () => {
    const o1: Odcinek = { id: 'o1', osobaId: 'tata', typ: 'ojcowski', od: '2026-12-02', do: '2026-12-15' };
    const r = rodzina([PRZYKLAD_RODZINA.osoby[0], tataNaEtacie()]);
    const d = dokument(dokumentyITerminy(r, plan([M1, R1, o1]), W), 'wniosek_ojcowski', 'tata');
    expect(d).toMatchObject({ termin: '2026-11-25', status: 'teraz' });
    expect(d?.odKiedy).toBeUndefined();
    const pozniej = dokumentyITerminy({ ...r, dataAnalizy: '2026-11-26' }, plan([M1, R1, o1]), W);
    expect(dokument(pozniej, 'wniosek_ojcowski', 'tata')?.status).toBe('po_terminie');
  });

  it('mama w szpitalu, tata przejmuje część macierzyńskiego: wniosek bez terminu (KP art. 180 § 16), bez rezygnacji mamy', () => {
    const mama = { ...PRZYKLAD_RODZINA.osoby[0], zdrowie: { pobytWSzpitalu: [{ od: '2027-02-01', do: '2027-02-20' }] } };
    const m1: Odcinek = { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-01-31' };
    const t1: Odcinek = { id: 't1', osobaId: 'tata', typ: 'macierzynski', od: '2027-02-01', do: '2027-02-20' };
    const w = dokumentyITerminy(rodzina([mama, tataNaEtacie()]), plan([m1, t1]), W);
    const d = dokument(w, 'wniosek_przejecie_macierzynskiego', 'tata');
    expect(d).toMatchObject({ przepis: 'KP art. 180 § 16' });
    expect(d?.termin).toBeUndefined();
    expect(dokument(w, 'wniosek_rezygnacja_matki')).toBeUndefined();
  });

  it('rodzicielski w kilku częściach: wniosek dla każdej części', () => {
    const r1: Odcinek = { ...R1, do: '2027-06-29' };
    const r2: Odcinek = { id: 'r2', osobaId: 'mama', typ: 'rodzicielski', od: '2028-03-01', do: '2028-05-01', czescNr: 2 };
    const w = dokumentyITerminy(PRZYKLAD_RODZINA, plan([M1, r1, r2]), W);
    expect(w.dokumenty.filter((d) => d.kod === 'wniosek_rodzicielski').map((d) => [d.odcinekId, d.termin])).toEqual([
      ['r1', '2027-03-30'],
      ['r2', '2028-02-09'],
    ]);
  });

  it('działalność, rodzicielski po przerwie: drugi ZAM najpóźniej dzień przed początkiem części (rozp. 2026 poz. 1316 § 29 pkt 3)', () => {
    const r = rodzina([mamaZ([{ id: 'dg-1', rodzaj: 'dzialalnosc', chorobowe: 'dobrowolne', od: '2022-05-01' }])]);
    const m1: Odcinek = { ...M1, tytulId: 'dg-1' };
    const r2: Odcinek = { id: 'r2', osobaId: 'mama', typ: 'rodzicielski', od: '2027-09-01', do: '2027-12-31', tytulId: 'dg-1' };
    const w = dokumentyITerminy(r, plan([m1, r2]), W);
    expect(w.dokumenty.filter((d) => d.kod === 'ZAM').map((d) => [d.odcinekId, d.termin])).toEqual([
      ['m1', undefined],
      ['r2', '2027-08-31'],
    ]);
  });

  it('każdy dokument ma status zgodny z terminem i datą analizy', () => {
    const w = dokumentyITerminy(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, W);
    for (const d of w.dokumenty) {
      if (d.termin && PRZYKLAD_RODZINA.dataAnalizy > d.termin) expect(d.status).toBe('po_terminie');
      if (d.odKiedy && PRZYKLAD_RODZINA.dataAnalizy < d.odKiedy) expect(d.status).toBe('pozniej');
    }
  });
});
