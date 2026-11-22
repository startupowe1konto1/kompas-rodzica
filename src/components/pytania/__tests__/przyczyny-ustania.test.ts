/**
 * Przyczyny końca umowy (audyt „utrata pracy w ciąży”, 22.11): „wyrejestrowanie” tylko przy zleceniu i działalności,
 * bo przy etacie chorobowe trwa do ustania stosunku pracy (= `koniec_umowy`; docs/pytania-do-mentora.md, pyt. 44).
 */
import { describe, expect, it } from 'vitest';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import type { RodzajTytulu, Rodzina, TytulUbezpieczenia } from '../../../engine/types';
import { PYTANIA } from '../definicje';
import { walidujOdpowiedz, widocznePytania } from '../silnik-ankiety';
import type { PytanieWidoczne } from '../typy';

const PRZYCZYNY = ['ustanie_przyczyna_umowy', 'ustanie_przyczyna_firmy'];

function rodzinaZUstaniem(rodzaj: RodzajTytulu): Rodzina {
  const tytul: TytulUbezpieczenia = {
    id: 't1',
    rodzaj,
    chorobowe: rodzaj === 'umowa_o_prace' ? 'obowiazkowe' : 'dobrowolne',
    od: '2024-01-01',
    ustanie: { data: '2026-10-31', przyczyna: rodzaj === 'dzialalnosc' ? 'zakonczenie_dzialalnosci' : 'koniec_umowy' },
  };
  return { ...PRZYKLAD_RODZINA, osoby: [{ ...PRZYKLAD_RODZINA.osoby[0], tytuly: [tytul] }] };
}

/** Odpowiedzi do pokazania – jak w Ankieta.tsx (`widok`): wariant rodzaju umowy nadpisuje pola definicji. */
function opcjeWidoczne(rodzina: Rodzina, p: PytanieWidoczne): unknown[] {
  const rodzaj = rodzina.osoby[p.zakres.osoba!].tytuly[p.zakres.tytul!].rodzaj;
  const def = { ...p.def, ...p.def.wgRodzaju?.[rodzaj] };
  return (def.opcje ?? []).map((o) => o.wartosc);
}

function pytanieOPrzyczyne(rodzina: Rodzina): PytanieWidoczne {
  const lista = widocznePytania(PYTANIA, rodzina).filter((p) => PRZYCZYNY.includes(p.def.id));
  expect(lista).toHaveLength(1);
  return lista[0];
}

describe('przyczyna końca umowy: „wyrejestrowanie”', () => {
  it('etat: bez „wyrejestrowania”, „koniec umowy” obejmuje wypowiedzenie i rozwiązanie przez pracodawcę', () => {
    const r = rodzinaZUstaniem('umowa_o_prace');
    const p = pytanieOPrzyczyne(r);
    expect(p.def.id).toBe('ustanie_przyczyna_umowy');
    const opcje = opcjeWidoczne(r, p);
    expect(opcje).not.toContain('wyrejestrowanie');
    expect(opcje).toEqual(['koniec_umowy', 'upadlosc', 'likwidacja', 'smierc_pracodawcy', 'naruszenie_prawa_wyrok']);
    const koniec = p.def.wgRodzaju?.umowa_o_prace?.opcje?.find((o) => o.wartosc === 'koniec_umowy');
    expect(koniec?.etykieta).toMatch(/wypowiedział lub rozwiązał/);
  });

  it('zlecenie: „wyrejestrowanie” jest', () => {
    const r = rodzinaZUstaniem('zlecenie');
    const p = pytanieOPrzyczyne(r);
    expect(p.def.id).toBe('ustanie_przyczyna_umowy');
    expect(opcjeWidoczne(r, p)).toContain('wyrejestrowanie');
  });

  it('inna umowa: pełna lista z „wyrejestrowaniem”', () => {
    const r = rodzinaZUstaniem('inny');
    expect(opcjeWidoczne(r, pytanieOPrzyczyne(r))).toContain('wyrejestrowanie');
  });

  it('działalność: „wyrejestrowanie” jest (pytanie o przyczynę zakończenia działalności)', () => {
    const r = rodzinaZUstaniem('dzialalnosc');
    const p = pytanieOPrzyczyne(r);
    expect(p.def.id).toBe('ustanie_przyczyna_firmy');
    expect(opcjeWidoczne(r, p)).toContain('wyrejestrowanie');
  });

  it('warianty mają tylko wartości z głównej listy, więc zapisany profil przechodzi walidację', () => {
    const def = PYTANIA.find((x) => x.id === 'ustanie_przyczyna_umowy')!;
    const glowne = (def.opcje ?? []).map((o) => o.wartosc);
    for (const wariant of Object.values(def.wgRodzaju ?? {})) {
      for (const o of wariant?.opcje ?? []) expect(glowne).toContain(o.wartosc);
    }
    expect(walidujOdpowiedz(def, 'wyrejestrowanie', { dataAnalizy: '2026-11-22' })).toEqual([]);
  });
});
