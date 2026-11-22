/**
 * Testy A2: ubezpieczenieWDniu i poczatekCiazy (docs/superpowers/plans/2026-11-21-tor-a.md, A2, D8).
 * Poród wzorcowy 2026-12-01 → początek ciąży 2026-02-24, koniec 3. miesiąca 2026-05-19 (3 × 28 dni, D8, pytanie 13).
 */
import { describe, expect, it } from 'vitest';
import { etat, mama, P, POROD, rodzina, zlecenie } from '../../__tests__/rodziny';
import type { Osoba } from '../../types';
import { koniecMiesiacaCiazy, poczatekCiazy, ubezpieczenieWDniu, wyczekiwanieNaChorobowy } from '../ubezpieczenie';

const p = P();

describe('poczatekCiazy (D8, pytanie 13)', () => {
  it('przewidywana data porodu minus limity.ciazaDni', () => {
    expect(poczatekCiazy(rodzina(), p)).toBe('2026-02-24');
  });

  it('koniec 3. miesiąca = początek + 3 × miesiacCiazyDni (84 dni)', () => {
    expect(koniecMiesiacaCiazy(rodzina(), p)).toBe('2026-05-19');
  });

  it('W2: poród już był, wcześniak z 28. tygodnia → początek = poród − 28 × 7 dni', () => {
    const r = rodzina({ data: '2026-10-01', przewidywana: false, dzieci: [{ tydzienCiazy: 30 }, { tydzienCiazy: 28 }] });
    expect(poczatekCiazy(r, p)).toBe('2026-03-19');
    expect(koniecMiesiacaCiazy(r, p)).toBe('2026-06-11');
  });

  it('W2: poród przewidywany – tydzień ciąży nie ma znaczenia', () => {
    const r = rodzina({ data: '2026-10-01', przewidywana: true, dzieci: [{ tydzienCiazy: 28 }] });
    expect(poczatekCiazy(r, p)).toBe('2025-12-25');
  });

  it('W2: poród był, ale tydzień ciąży nieznany → jak przy przewidywanym', () => {
    expect(poczatekCiazy(rodzina({ przewidywana: false }), p)).toBe('2026-02-24');
  });
});

describe('ubezpieczenieWDniu – proste okresy', () => {
  it('etat trwa w dniu porodu → ubezpieczona z tego tytułu', () => {
    const w = ubezpieczenieWDniu(mama(), POROD);
    expect(w).toEqual({ ubezpieczona: true, tytulId: 'etat-1', kod: 'UBEZP_W_DNIU_PORODU' });
  });

  it('tytuł kończy się dokładnie w dniu porodu → ubezpieczona', () => {
    expect(ubezpieczenieWDniu(mama([etat({ do: POROD })]), POROD).ubezpieczona).toBe(true);
  });

  it('tytuł zaczyna się w dniu porodu → ubezpieczona', () => {
    expect(ubezpieczenieWDniu(mama([zlecenie({ od: POROD })]), POROD).ubezpieczona).toBe(true);
  });

  it('chorobowe od późniejszej daty niż tytuł → przed nią brak ubezpieczenia', () => {
    const w = ubezpieczenieWDniu(mama([zlecenie({ chorobowoOd: '2026-12-02' })]), POROD);
    expect(w.ubezpieczona).toBe(false);
    expect(w.kod).toBe('BRAK_UBEZP_W_DNIU_PORODU');
  });

  it('zlecenie bez chorobowego trwa w dniu porodu → BRAK_CHOROBOWEGO', () => {
    const w = ubezpieczenieWDniu(mama([zlecenie({ chorobowe: 'brak' })]), POROD);
    expect(w.ubezpieczona).toBe(false);
    expect(w.kod).toBe('BRAK_CHOROBOWEGO');
  });

  it('zlecenie skończyło się przed porodem → BRAK_UBEZP_W_DNIU_PORODU', () => {
    const w = ubezpieczenieWDniu(mama([zlecenie({ do: '2026-10-31' })]), POROD);
    expect(w).toEqual({ ubezpieczona: false, kod: 'BRAK_UBEZP_W_DNIU_PORODU' });
  });

  it('ustanie wcześniej niż koniec umowy kończy ubezpieczenie', () => {
    const w = ubezpieczenieWDniu(mama([etat({ ustanie: { data: '2026-09-15', przyczyna: 'likwidacja' } })]), POROD);
    expect(w.ubezpieczona).toBe(false);
  });

  it('osoba bez tytułów → BRAK_TYTULU_UBEZPIECZENIA', () => {
    expect(ubezpieczenieWDniu(mama([]), POROD).kod).toBe('BRAK_TYTULU_UBEZPIECZENIA');
  });

  it('osoba bez pola tytuly (dane z JSON) → BRAK_TYTULU_UBEZPIECZENIA, bez wyjątku', () => {
    const o = { id: 'mama', rola: 'matka' } as unknown as Osoba;
    expect(ubezpieczenieWDniu(o, POROD, p, rodzina()).kod).toBe('BRAK_TYTULU_UBEZPIECZENIA');
  });

  it('pierwszy tytuł z chorobowym wygrywa (tytulId)', () => {
    const o = mama([zlecenie({ chorobowe: 'brak' }), etat()]);
    expect(ubezpieczenieWDniu(o, POROD).tytulId).toBe('etat-1');
  });
});

describe('ubezpieczenieWDniu – przedłużenie umowy do porodu (KP art. 177 § 3, § 3¹)', () => {
  const okreslona = (doDnia: string, extra = {}) => mama([etat({ naCzasOkreslony: true, do: doDnia, ...extra })]);

  it('EC-05: umowa na czas określony kończy się po 3. miesiącu ciąży → przedłużona do porodu', () => {
    const w = ubezpieczenieWDniu(okreslona('2026-08-31'), POROD, p, rodzina());
    expect(w).toEqual({ ubezpieczona: true, tytulId: 'etat-1', kod: 'UMOWA_PRZEDLUZONA_DO_PORODU' });
  });

  it('EC-05 bez parametrów i rodziny: tylko proste okresy (brak przedłużenia)', () => {
    expect(ubezpieczenieWDniu(okreslona('2026-08-31'), POROD).ubezpieczona).toBe(false);
  });

  it('przedłużenie trwa do dnia porodu, nie dłużej', () => {
    expect(ubezpieczenieWDniu(okreslona('2026-08-31'), '2026-12-02', p, rodzina()).ubezpieczona).toBe(false);
  });

  it('EC-06: umowa kończy się przed końcem 3. miesiąca ciąży → bez przedłużenia', () => {
    const w = ubezpieczenieWDniu(okreslona('2026-04-30'), POROD, p, rodzina());
    expect(w.kod).toBe('BRAK_UBEZP_W_DNIU_PORODU');
  });

  it('umowa kończy się dokładnie w dniu końca 3. miesiąca → bez przedłużenia', () => {
    expect(ubezpieczenieWDniu(okreslona('2026-05-19'), POROD, p, rodzina()).ubezpieczona).toBe(false);
  });

  it('umowa kończy się dzień po końcu 3. miesiąca → przedłużona', () => {
    expect(ubezpieczenieWDniu(okreslona('2026-05-20'), POROD, p, rodzina()).kod).toBe('UMOWA_PRZEDLUZONA_DO_PORODU');
  });

  it('EC-06b: umowa na zastępstwo nie przedłuża się', () => {
    const w = ubezpieczenieWDniu(okreslona('2026-08-31', { naZastepstwo: true }), POROD, p, rodzina());
    expect(w.ubezpieczona).toBe(false);
  });

  it('umowa bezterminowa, która się skończyła, nie przedłuża się', () => {
    expect(ubezpieczenieWDniu(mama([etat({ do: '2026-08-31' })]), POROD, p, rodzina()).ubezpieczona).toBe(false);
  });

  it('zlecenie nie przedłuża się do porodu', () => {
    const o = mama([zlecenie({ naCzasOkreslony: true, do: '2026-08-31' })]);
    expect(ubezpieczenieWDniu(o, POROD, p, rodzina()).ubezpieczona).toBe(false);
  });

  it('umowa rozwiązana z powodu likwidacji nie przedłuża się', () => {
    const o = mama([etat({ naCzasOkreslony: true, do: '2026-12-31', ustanie: { data: '2026-09-15', przyczyna: 'likwidacja' } })]);
    expect(ubezpieczenieWDniu(o, POROD, p, rodzina()).ubezpieczona).toBe(false);
  });
});

describe('ubezpieczenieWDniu – urlop wychowawczy (UZ art. 29 ust. 1)', () => {
  const naWychowawczym = mama([etat()], { urlopWychowawczy: { od: '2026-06-01', do: '2027-05-31' } });

  it('EC-14 / W4: w czasie urlopu wychowawczego nie ma chorobowego, kod POROD_W_TRAKCIE_WYCHOWAWCZEGO', () => {
    const w = ubezpieczenieWDniu(naWychowawczym, POROD, p, rodzina());
    expect(w).toEqual({ ubezpieczona: false, tytulId: 'etat-1', kod: 'POROD_W_TRAKCIE_WYCHOWAWCZEGO' });
  });

  it('W4: urlop wychowawczy liczy się także bez parametrów i rodziny', () => {
    expect(ubezpieczenieWDniu(naWychowawczym, POROD)).toEqual({ ubezpieczona: false, tytulId: 'etat-1', kod: 'POROD_W_TRAKCIE_WYCHOWAWCZEGO' });
  });

  it('W4: dzień po końcu urlopu wychowawczego → znów ubezpieczona z etatu', () => {
    expect(ubezpieczenieWDniu(naWychowawczym, '2027-06-01').kod).toBe('UBEZP_W_DNIU_PORODU');
  });

  it('inny tytuł z chorobowym w czasie wychowawczego ma pierwszeństwo', () => {
    const o = { ...naWychowawczym, tytuly: [etat(), zlecenie()] };
    expect(ubezpieczenieWDniu(o, POROD, p, rodzina())).toEqual({
      ubezpieczona: true,
      tytulId: 'zlecenie-1',
      kod: 'UBEZP_W_DNIU_PORODU',
    });
  });
});

describe('wyczekiwanieNaChorobowy (UZ art. 4)', () => {
  it('D3: ubezpieczenie kończy się dokładnie po 30 dniach → prawoOd null', () => {
    const o = mama([etat({ od: '2026-11-01', do: '2026-11-30' })]);
    expect(wyczekiwanieNaChorobowy(o, '2026-11-20', p)?.prawoOd).toBeNull();
  });

  it('31. dzień ubezpieczenia → prawo od niego', () => {
    const o = mama([etat({ od: '2026-11-01', do: '2026-12-31' })]);
    expect(wyczekiwanieNaChorobowy(o, '2026-11-20', p)).toMatchObject({ dni: 30, prawoOd: '2026-12-01', tytulId: 'etat-1' });
  });

  it('brak ubezpieczenia w dniu → undefined', () => {
    expect(wyczekiwanieNaChorobowy(mama([etat({ od: '2027-01-01' })]), '2026-11-20', p)).toBeUndefined();
  });
});
