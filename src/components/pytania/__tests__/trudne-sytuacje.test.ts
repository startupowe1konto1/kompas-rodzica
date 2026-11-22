/**
 * Sytuacje szczególne mamy w ankiecie (KP art. 180 § 6–13, art. 182): orzeczenie o niezdolności do samodzielnej
 * egzystencji, pobyt w szpitalu, porzucenie dziecka, zgon. Silnik je obsługuje; bez tych pytań rodzic nie mógł
 * do nich dojść w aplikacji. Definicje jak w `src/content/pytania.ts` toru D.
 */
import { describe, expect, it } from 'vitest';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import type { Osoba, Rodzina } from '../../../engine/types';
import { PYTANIA } from '../definicje';
import { odczytajWartosc, widocznePytania, zapiszOdpowiedz } from '../silnik-ankiety';

const IDS = ['orzeczenie_niezdolnosci', 'pobyt_matki_w_szpitalu', 'porzucenie_dziecka', 'zgon_matki'];
const TATA: Osoba = { id: 'tata', rola: 'ojciec', tytuly: [] };

const urodzone = (r: Rodzina): Rodzina => ({ ...r, zdarzenie: { ...r.zdarzenie, przewidywana: false } });
const zTata = (r: Rodzina): Rodzina => ({ ...r, osoby: [...r.osoby, TATA] });
/** Widoczne pytania o sytuację mamy: `id@indeks osoby`. */
const widoczne = (r: Rodzina) =>
  widocznePytania(PYTANIA, r)
    .filter((p) => IDS.includes(p.def.id))
    .map((p) => `${p.def.id}@${p.zakres.osoba}`);

describe('ankieta: sytuacje szczególne mamy (KP art. 180 § 6–13)', () => {
  it('cztery pytania istnieją w kroku „Po porodzie” i są nieobowiązkowe', () => {
    for (const id of IDS) {
      const def = PYTANIA.find((p) => p.id === id);
      expect(def, id).toBeDefined();
      expect(def?.krok).toBe('po_porodzie');
      expect(def?.wymagane).not.toBe(true);
    }
  });

  it('przed porodem nie pytamy o nic z tej listy', () => {
    expect(widoczne(zTata(PRZYKLAD_RODZINA))).toEqual([]);
  });

  it('po porodzie, sama mama: orzeczenie i szpital; porzucenie i zgon dopiero, gdy jest druga osoba', () => {
    expect(widoczne(urodzone(PRZYKLAD_RODZINA))).toEqual(['orzeczenie_niezdolnosci@0', 'pobyt_matki_w_szpitalu@0']);
  });

  it('po porodzie, mama i tata: wszystkie cztery pytania tylko dla mamy', () => {
    expect(widoczne(zTata(urodzone(PRZYKLAD_RODZINA)))).toEqual(IDS.map((id) => `${id}@0`));
  });

  it('odpowiedzi trafiają do zdrowia mamy, z którego korzysta silnik', () => {
    let r = zTata(urodzone(PRZYKLAD_RODZINA));
    const def = (id: string) => PYTANIA.find((p) => p.id === id)!;
    r = zapiszOdpowiedz(def('zgon_matki'), r, { osoba: 0 }, '2026-12-20');
    r = zapiszOdpowiedz(def('pobyt_matki_w_szpitalu'), r, { osoba: 0 }, [{ od: '2026-12-02', do: '2026-12-15' }]);
    r = zapiszOdpowiedz(def('orzeczenie_niezdolnosci'), r, { osoba: 0 }, true);
    expect(odczytajWartosc(r, 'osoby[0].zdrowie.zgon')).toBe('2026-12-20');
    expect(odczytajWartosc(r, 'osoby[0].zdrowie.pobytWSzpitalu')).toEqual([{ od: '2026-12-02', do: '2026-12-15' }]);
    expect(odczytajWartosc(r, 'osoby[0].zdrowie.orzeczenieNiezdolnosciSamodzielnejEgzystencji')).toBe(true);
    expect(r.osoby[1].zdrowie).toBeUndefined();
  });
});
