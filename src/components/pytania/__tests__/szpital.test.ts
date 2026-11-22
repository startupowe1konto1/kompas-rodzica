import { describe, expect, it } from 'vitest';
import type { Rodzina } from '../../../engine/types';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { PYTANIA } from '../definicje';
import { odczytajOdpowiedz, widocznePytania, zapiszOdpowiedz } from '../silnik-ankiety';
import type { DefinicjaPytania } from '../typy';

function def(id: string): DefinicjaPytania {
  const d = PYTANIA.find((p) => p.id === id);
  if (!d) throw new Error(`Brak pytania ${id}`);
  return d;
}

function ids(rodzina: Rodzina): string[] {
  return widocznePytania(PYTANIA, rodzina).map((p) => p.def.id);
}

/** Dziecko już urodzone, bez pobytu w szpitalu. */
function urodzone(): Rodzina {
  const r = zapiszOdpowiedz(def('etap'), structuredClone(PRZYKLAD_RODZINA), {}, 'urodzone');
  return { ...r, zdarzenie: { ...r.zdarzenie, dzieci: [{}] } };
}

const BRAMKA = 'dziecko_szpital_czy';

// KP art. 180² § 1: urlop uzupełniający przysługuje „za każdy tydzień pobytu dziecka w szpitalu”;
// pkt 1 i 2 zależą od masy urodzeniowej, więc bez pobytu masa nie ma znaczenia.
describe('bramka „dziecko zostało w szpitalu”', () => {
  it('urodzone bez szpitala: jest bramka, nie ma dat pobytu ani masy', () => {
    const lista = ids(urodzone());
    expect(lista).toContain(BRAMKA);
    expect(lista).not.toContain('dziecko_szpital');
    expect(lista).not.toContain('dziecko_masa');
  });

  it('kolejność: bramka, potem pobyt, potem masa', () => {
    const r = zapiszOdpowiedz(def(BRAMKA), urodzone(), { dziecko: 0 }, true);
    const lista = ids(r);
    expect(lista.indexOf(BRAMKA)).toBeLessThan(lista.indexOf('dziecko_szpital'));
    expect(lista.indexOf('dziecko_szpital')).toBeLessThan(lista.indexOf('dziecko_masa'));
  });

  it('odpowiedź „tak” pokazuje pobyt i masę oraz wstawia pusty wiersz do uzupełnienia', () => {
    const r = zapiszOdpowiedz(def(BRAMKA), urodzone(), { dziecko: 0 }, true);
    expect(r.zdarzenie.dzieci?.[0].szpital).toEqual([{ od: '', do: '' }]);
    const lista = ids(r);
    expect(lista).toContain('dziecko_szpital');
    expect(lista).toContain('dziecko_masa');
    expect(odczytajOdpowiedz(def(BRAMKA), r, { dziecko: 0 })).toBe(true);
  });

  it('odpowiedź „nie” po „tak” czyści pobyt i chowa pytania', () => {
    const tak = zapiszOdpowiedz(def(BRAMKA), urodzone(), { dziecko: 0 }, true);
    const nie = zapiszOdpowiedz(def(BRAMKA), tak, { dziecko: 0 }, false);
    expect(nie.zdarzenie.dzieci?.[0].szpital).toBeUndefined();
    expect(ids(nie)).not.toContain('dziecko_szpital');
    expect(ids(nie)).not.toContain('dziecko_masa');
  });

  it('dane z pobytem (np. z profilu) od razu pokazują pobyt i masę', () => {
    const r = urodzone();
    r.zdarzenie.dzieci = [{ szpital: [{ od: '2026-12-01', do: '2026-12-28' }] }];
    expect(odczytajOdpowiedz(def(BRAMKA), r, { dziecko: 0 })).toBe(true);
    expect(ids(r)).toEqual(expect.arrayContaining(['dziecko_szpital', 'dziecko_masa']));
  });

  it('tydzień ciąży zostaje dla każdego urodzonego dziecka (silnik liczy z niego początek ciąży, nie tylko uzupełniający)', () => {
    expect(ids(urodzone())).toContain('dziecko_tydzien_ciazy');
  });

  it('w ciąży nie ma bramki ani żadnych pytań o pobyt i masę', () => {
    const lista = ids(PRZYKLAD_RODZINA);
    for (const id of [BRAMKA, 'dziecko_szpital', 'dziecko_masa', 'dziecko_tydzien_ciazy']) expect(lista).not.toContain(id);
  });
});
