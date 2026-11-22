import { describe, expect, it } from 'vitest';
import type { Dokument, Odcinek } from '../../../engine/types';
import { kluczDokumentu, opisyCzesci } from '../czesci';

const dok = (kod: Dokument['kod'], ktoSklada: string, odcinekId: string | undefined, termin?: string): Dokument => ({
  kod,
  nazwa: 'x',
  ktoSklada,
  gdzie: 'pracodawca',
  termin,
  status: 'pozniej',
  zalaczniki: [],
  moznaWygenerowac: true,
  odcinekId,
});
const odc = (id: string, osobaId: string, typ: Odcinek['typ'], od: string, do_: string): Odcinek => ({ id, osobaId, typ, od, do: do_ });

describe('opisyCzesci', () => {
  it('dwa wnioski o urlop rodzicielski tej samej osoby to część 1 i część 2 (po dacie początku)', () => {
    const odcinki = [
      odc('r2', 'mama', 'rodzicielski', '2027-08-10', '2027-11-29'),
      odc('r1', 'mama', 'rodzicielski', '2027-04-20', '2027-08-09'),
    ];
    const dokumenty = [dok('wniosek_rodzicielski', 'mama', 'r2', '2027-07-20'), dok('wniosek_rodzicielski', 'mama', 'r1', '2027-03-30')];
    const opisy = opisyCzesci(dokumenty, odcinki);
    expect(opisy.get(kluczDokumentu(dokumenty[1]))).toMatchObject({
      nr: 1,
      razem: 2,
      od: '2027-04-20',
      do: '2027-08-09',
    });
    expect(opisy.get(kluczDokumentu(dokumenty[0]))).toMatchObject({
      nr: 2,
      razem: 2,
      od: '2027-08-10',
      do: '2027-11-29',
    });
  });

  it('jeden wniosek: bez numeru części', () => {
    const d = dok('wniosek_rodzicielski', 'mama', 'r1');
    expect(opisyCzesci([d], [odc('r1', 'mama', 'rodzicielski', '2027-04-20', '2027-08-09')]).size).toBe(0);
  });

  it('wnioski różnych osób nie są częściami jednego urlopu', () => {
    const dokumenty = [dok('wniosek_rodzicielski', 'mama', 'a'), dok('wniosek_rodzicielski', 'tata', 'b')];
    const odcinki = [
      odc('a', 'mama', 'rodzicielski', '2027-04-20', '2027-08-09'),
      odc('b', 'tata', 'rodzicielski', '2027-08-10', '2027-11-29'),
    ];
    expect(opisyCzesci(dokumenty, odcinki).size).toBe(0);
  });

  it('ZAM dla macierzyńskiego i rodzicielskiego to nie części', () => {
    const dokumenty = [dok('ZAM', 'mama', 'a'), dok('ZAM', 'mama', 'b')];
    const odcinki = [
      odc('a', 'mama', 'macierzynski', '2026-12-01', '2027-04-19'),
      odc('b', 'mama', 'rodzicielski', '2027-04-20', '2027-08-09'),
    ];
    expect(opisyCzesci(dokumenty, odcinki).size).toBe(0);
  });

  it('brak odcinka w planie: pomija dokument', () => {
    const dokumenty = [dok('wniosek_rodzicielski', 'mama', 'a'), dok('wniosek_rodzicielski', 'mama', 'zgubiony')];
    expect(opisyCzesci(dokumenty, [odc('a', 'mama', 'rodzicielski', '2027-04-20', '2027-08-09')]).size).toBe(0);
  });
});
