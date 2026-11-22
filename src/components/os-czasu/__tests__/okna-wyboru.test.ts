import { describe, expect, it } from 'vitest';
import type { Mozliwosc } from '../../../engine/types';
import { PRZYKLAD_UPRAWNIENIA } from '../../../mocks/przyklad';
import { oknaWyboru } from '../okna-wyboru';

const OKNO = { od: '2026-12-01', do: '2027-11-30' }; // 365 dni

describe('oknaWyboru', () => {
  it('wariant 81,5%: od początku okna, 22 dni', () => {
    const w = oknaWyboru(PRZYKLAD_UPRAWNIENIA.mozliwosci, OKNO).find((o) => o.kod === 'wariant_815')!;
    expect(w).toMatchObject({ od: '2026-12-01', do: '2026-12-22', dostepna: true, punkt: false, start: 0, przyciety: { lewy: false, prawy: false } });
    expect(w.szerokosc).toBeCloseTo(22 / 365, 9);
  });
  it('bez doKiedy: punkt w dniu odKiedy, niedostępne też pokazujemy', () => {
    const w = oknaWyboru(PRZYKLAD_UPRAWNIENIA.mozliwosci, OKNO).find((o) => o.kod === 'rezygnacja_matki_i_przejecie')!;
    expect(w).toMatchObject({ od: '2027-03-09', do: '2027-03-09', dostepna: false, punkt: true });
    expect(w.start).toBeCloseTo(98 / 365, 9);
  });
  it('pomija możliwości bez dat i poza oknem; sortuje po dacie; przycina', () => {
    const m = [
      { kod: 'laczenie_z_praca', dostepna: true, opis: '', konsekwencje: [], przepis: '' },
      { kod: 'ojcowski_w_czesciach', dostepna: true, opis: '', odKiedy: '2028-01-01', doKiedy: '2028-02-01', konsekwencje: [], przepis: '' },
      { kod: 'uzupelniajacy', dostepna: true, opis: '', odKiedy: '2027-05-01', doKiedy: '2027-05-10', konsekwencje: [], przepis: '' },
      { kod: 'wariant_815', dostepna: true, opis: '', odKiedy: '2026-11-01', doKiedy: '2026-12-05', konsekwencje: [], przepis: '' },
    ] satisfies Mozliwosc[];
    const w = oknaWyboru(m, OKNO);
    expect(w.map((o) => o.kod)).toEqual(['wariant_815', 'uzupelniajacy']);
    expect(w[0].przyciety.lewy).toBe(true);
  });
});
