import { describe, expect, it } from 'vitest';
import type { Plan, Rodzina } from '../../../engine/types';
import { budujRodzine, domyslneOd, maDobrowolneChorobowe, nowyFormularz, OPCJE_UMOWY, parsujKwote, wybierzPlan, type Formularz } from '../budujRodzine';

const DZIS = '2026-11-21';

function formularz(zmiany: Partial<Formularz> = {}): Formularz {
  const f = nowyFormularz(DZIS);
  return { ...f, dataPorodu: '2027-01-01', mama: { ...f.mama, zarobki: '8000' }, ...zmiany };
}

describe('domyslneOd', () => {
  it('cofa o dwa lata', () => expect(domyslneOd('2026-11-21')).toBe('2024-11-21'));
  it('29 lutego daje 28 lutego', () => expect(domyslneOd('2028-02-29')).toBe('2026-02-28'));
});

describe('parsujKwote', () => {
  it.each([
    ['8000', 8000],
    ['8 000,50', 8000.5],
    ['8000.5', 8000.5],
  ])('%s daje %s', (napis, oczekiwane) => expect(parsujKwote(napis)).toBe(oczekiwane));
  it.each(['', '0', '-5', 'abc', '1,234'])('"%s" daje null', (napis) => expect(parsujKwote(napis)).toBeNull());
});

describe('budujRodzine', () => {
  it('mama sama na etacie: tytuł z wynagrodzeniem i obowiązkowym chorobowym', () => {
    const r = budujRodzine(formularz(), DZIS) as Rodzina;
    expect(r.osoby).toHaveLength(1);
    expect(r.osoby[0]).toMatchObject({ id: 'osoba-1', rola: 'matka' });
    expect(r.osoby[0].tytuly[0]).toMatchObject({
      rodzaj: 'umowa_o_prace',
      chorobowe: 'obowiazkowe',
      od: '2024-11-21',
      wynagrodzenieMiesieczne: 8000,
    });
    expect(r.dataAnalizy).toBe(DZIS);
  });

  it('para: tata dostaje rolę ojciec i własny tytuł', () => {
    const f = formularz({ policzTate: true });
    f.tata = { ...f.tata, zarobki: '6000' };
    const r = budujRodzine(f, DZIS) as Rodzina;
    expect(r.osoby.map((o) => o.rola)).toEqual(['matka', 'ojciec']);
    expect(r.osoby[1].tytuly[0].wynagrodzenieMiesieczne).toBe(6000);
  });

  it('para bez zarobków taty jest niekompletna', () => {
    expect(budujRodzine(formularz({ policzTate: true }), DZIS)).toBeNull();
  });

  it('tata nie wchodzi do rodziny, gdy przełącznik jest wyłączony', () => {
    const f = formularz();
    f.tata = { ...f.tata, zarobki: '6000' };
    expect((budujRodzine(f, DZIS) as Rodzina).osoby).toHaveLength(1);
  });

  it.each([
    ['zlecenie', 'wynagrodzenieMiesieczne'],
    ['dzialalnosc', 'zadeklarowanaPodstawa'],
    ['wspolpraca', 'zadeklarowanaPodstawa'],
    ['inny', 'wynagrodzenieMiesieczne'],
  ] as const)('%s z dobrowolnym chorobowym: kwota w polu %s', (umowa, pole) => {
    const f = formularz();
    f.mama = { ...f.mama, umowa, zarobki: '4 000' };
    const t = (budujRodzine(f, DZIS) as Rodzina).osoby[0].tytuly[0];
    expect(t).toMatchObject({ rodzaj: umowa, chorobowe: 'dobrowolne', [pole]: 4000 });
    const drugie = pole === 'zadeklarowanaPodstawa' ? 'wynagrodzenieMiesieczne' : 'zadeklarowanaPodstawa';
    expect(t[drugie]).toBeUndefined();
  });

  it.each(['zlecenie', 'dzialalnosc', 'wspolpraca', 'inny'] as const)('%s bez chorobowego: tytuł bez zarobków', (umowa) => {
    const f = formularz();
    f.mama = { ...f.mama, umowa, zarobki: '', chorobowe: false };
    const t = (budujRodzine(f, DZIS) as Rodzina).osoby[0].tytuly[0];
    expect(t).toMatchObject({ rodzaj: umowa, chorobowe: 'brak', od: '2024-11-21' });
    expect(t.wynagrodzenieMiesieczne).toBeUndefined();
    expect(t.zadeklarowanaPodstawa).toBeUndefined();
  });

  it('etat ignoruje przełącznik chorobowego (zawsze obowiązkowe)', () => {
    const f = formularz();
    f.mama = { ...f.mama, chorobowe: false };
    expect((budujRodzine(f, DZIS) as Rodzina).osoby[0].tytuly[0].chorobowe).toBe('obowiazkowe');
  });

  it('brak ubezpieczenia: osoba bez tytułów, zarobki nie są wymagane', () => {
    const f = formularz();
    f.mama = { ...f.mama, umowa: 'brak', zarobki: '' };
    expect((budujRodzine(f, DZIS) as Rodzina).osoby[0].tytuly).toEqual([]);
  });

  it('liczba dzieci', () => {
    expect((budujRodzine(formularz({ dzieci: 2 }), DZIS) as Rodzina).zdarzenie.dzieci).toHaveLength(2);
    expect((budujRodzine(formularz({ dzieci: 3 }), DZIS) as Rodzina).zdarzenie.dzieci).toHaveLength(3);
  });

  it('dziecko urodzone vs przewidywane', () => {
    expect((budujRodzine(formularz({ urodzone: true }), DZIS) as Rodzina).zdarzenie.przewidywana).toBe(false);
    expect((budujRodzine(formularz(), DZIS) as Rodzina).zdarzenie).toMatchObject({ typ: 'porod', data: '2027-01-01', przewidywana: true });
  });

  it('bez daty porodu albo zarobków nie ma rodziny', () => {
    expect(budujRodzine(formularz({ dataPorodu: '' }), DZIS)).toBeNull();
    const f = formularz();
    f.mama = { ...f.mama, zarobki: '' };
    expect(budujRodzine(f, DZIS)).toBeNull();
  });
});

describe('OPCJE_UMOWY', () => {
  it('ma rodzaje do wyboru i brak ubezpieczenia, bez współpracy (zdjętej po teście na stoisku)', () => {
    expect(OPCJE_UMOWY.map((o) => o.wartosc)).toEqual(['umowa_o_prace', 'zlecenie', 'dzialalnosc', 'inny', 'brak']);
  });
  it('chorobowe dobrowolne dotyczy wszystkich poza etatem i brakiem', () => {
    expect(OPCJE_UMOWY.filter((o) => maDobrowolneChorobowe(o.wartosc)).map((o) => o.wartosc)).toEqual(['zlecenie', 'dzialalnosc', 'inny']);
  });
});

describe('wybierzPlan', () => {
  const plan = (id: string, osoby: string[]): Plan => ({
    id,
    nazwa: id,
    wariant815: false,
    odcinki: osoby.map((osobaId, i) => ({ id: `${id}-${i}`, osobaId, typ: 'macierzynski', od: '2027-01-01', do: '2027-02-01' })),
  });
  const mama = budujRodzine(formularz(), DZIS) as Rodzina;
  const f = formularz({ policzTate: true });
  f.tata = { ...f.tata, zarobki: '6000' };
  const para = budujRodzine(f, DZIS) as Rodzina;

  it('brak planów daje null', () => expect(wybierzPlan([], mama)).toBeNull());
  it('mama sama: pierwszy plan', () => expect(wybierzPlan([plan('a', ['osoba-1']), plan('b', ['osoba-1'])], mama)?.id).toBe('a'));
  it('para: plan po równo', () =>
    expect(wybierzPlan([plan('a', ['osoba-1']), plan('po-rowno', ['osoba-1', 'osoba-2'])], para)?.id).toBe('po-rowno'));
  it('para bez planu po równo: pierwszy plan z oboma rodzicami', () =>
    expect(wybierzPlan([plan('a', ['osoba-1']), plan('b', ['osoba-1', 'osoba-2'])], para)?.id).toBe('b'));
});
