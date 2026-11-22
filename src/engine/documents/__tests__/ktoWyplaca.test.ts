/** Przypadki skrajne „kto wypłaca” (UZ art. 61), poza tabelą D2. */
import { describe, expect, it } from 'vitest';
import { parametryNaDzien } from '../../params';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { ustalKtoWyplaca } from '../ktoWyplaca';
import { ETAT, ZLECENIE, mamaZ, odcinkiWzorca, plan, rodzina } from './dane';

const p = parametryNaDzien('2026-12-01');

describe('ustalKtoWyplaca – przypadki skrajne', () => {
  it('brak informacji o liczbie ubezpieczonych u pracodawcy → bezpiecznie ZUS (lit. a)', () => {
    const { platnikPowyzej20: _, ...bezLiczby } = ETAT;
    void _;
    const w = ustalKtoWyplaca(rodzina([mamaZ([bezLiczby])]), PRZYKLAD_PLAN, p);
    expect(w).toEqual([expect.objectContaining({ kto: 'ZUS', przepis: 'UZ art. 61 ust. 1 pkt 2 lit. a' })]);
  });

  it('umowa kończy się w trakcie zasiłku: najpierw płatnik, po końcu umowy ZUS (lit. d)', () => {
    const r = rodzina([mamaZ([{ ...ETAT, do: '2027-02-28', naCzasOkreslony: true }])]);
    const w = ustalKtoWyplaca(r, plan(odcinkiWzorca()), p);
    expect(w.map((k) => [k.tytulId, k.kto, k.przepis])).toEqual([
      ['etat-1', 'platnik', 'UZ art. 61 ust. 1 pkt 1'],
      ['etat-1', 'ZUS', 'UZ art. 61 ust. 1 pkt 2 lit. d'],
    ]);
  });

  it('dwa tytuły w dniu porodu (etat i zlecenie z chorobowym) → osobny wpis dla każdego', () => {
    const r = rodzina([mamaZ([ETAT, ZLECENIE])]);
    const w = ustalKtoWyplaca(r, plan(odcinkiWzorca()), p);
    expect(w.map((k) => [k.tytulId, k.kto])).toEqual([
      ['etat-1', 'platnik'],
      ['zl-1', 'ZUS'],
    ]);
  });

  it('zlecenie bez chorobowego nie daje zasiłku – nie ma wpisu', () => {
    const r = rodzina([mamaZ([ETAT, { ...ZLECENIE, chorobowe: 'brak' }])]);
    expect(ustalKtoWyplaca(r, plan(odcinkiWzorca()), p).map((k) => k.tytulId)).toEqual(['etat-1']);
  });

  it('pusty plan, osoba bez tytułów, odcinki bez zasiłku → pusta lista', () => {
    expect(ustalKtoWyplaca(PRZYKLAD_RODZINA, plan([]), p)).toEqual([]);
    expect(ustalKtoWyplaca(rodzina([mamaZ([])]), PRZYKLAD_PLAN, p)).toEqual([]);
    const praca = plan([{ id: 'p1', osobaId: 'mama', typ: 'praca', od: '2027-04-20', do: '2027-12-31' }]);
    expect(ustalKtoWyplaca(PRZYKLAD_RODZINA, praca, p)).toEqual([]);
  });

  it('wskazany w odcinku tytuł ma pierwszeństwo przed szukaniem po datach', () => {
    const r = rodzina([mamaZ([ETAT, ZLECENIE])]);
    const w = ustalKtoWyplaca(r, plan(odcinkiWzorca('zl-1')), p);
    expect(w.map((k) => k.tytulId)).toEqual(['zl-1']);
  });
});
