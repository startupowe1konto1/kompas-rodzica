/**
 * Kwestionariusz: definicje pytań są spójne z mapą danych (docs/zrodla-danych.json),
 * z kontraktem (src/engine/types.ts) i z kształtem toru C (czyste dane, deklaratywne warunki).
 * Tor D, zadanie D1.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import mapa from '../../../docs/zrodla-danych.json';
import type { Rodzina } from '../../engine/types';
import { PRZYKLAD_RODZINA } from '../../mocks/przyklad';
import {
  KROKI_ANKIETY,
  KROKI_DOKUMENTOW,
  odczytaj,
  odczytajOdpowiedz,
  POZA_KWESTIONARIUSZEM,
  PYTANIA,
  PYTANIA_DOKUMENTY,
  pytaniaDoPokazania,
  sciezkaKonkretna,
  WSZYSTKIE_PYTANIA,
  zapisz,
  zapiszOdpowiedz,
  type DowolnePytanie,
  type Warunek,
} from '../pytania';

type RekordMapy = { id: string; potrzebne_do: string[]; zawszeUzytkownik: boolean };
const rekordy = mapa as RekordMapy[];
const idMapy = new Set(rekordy.map((r) => r.id));
const daneZPytan = (lista: DowolnePytanie[]) =>
  new Set(lista.flatMap((p) => [p.daneId, ...(p.takze ?? [])]).filter((id): id is string => id !== null));
const poza = new Map(POZA_KWESTIONARIUSZEM.map((p) => [p.daneId, p]));

/** Nazwy pól zadeklarowanych w kontrakcie – do wyłapania literówek w ścieżkach. */
const polaKontraktu = new Set(
  [
    ...readFileSync(fileURLToPath(new URL('../../engine/types.ts', import.meta.url)), 'utf8').matchAll(
      /(?:^\s+|[{;]\s*)(\w+)\??:/gm,
    ),
  ].map((m) => m[1]),
);

function pytanie(id: string): DowolnePytanie {
  const p = WSZYSTKIE_PYTANIA.find((x) => x.id === id);
  if (!p) throw new Error(`Brak pytania ${id}`);
  return p;
}

function idsPytan(warstwa: 'A' | 'B', rodzina: Rodzina): string[] {
  return pytaniaDoPokazania(warstwa, rodzina).map((p) => p.def.id);
}

function sciezkiWarunku(w: Warunek): string[] {
  if ('wszystkie' in w) return w.wszystkie.flatMap(sciezkiWarunku);
  if ('ktorykolwiek' in w) return w.ktorykolwiek.flatMap(sciezkiWarunku);
  if ('nie' in w) return sciezkiWarunku(w.nie);
  return [w.sciezka];
}

const ZNACZNIKI_ZAKRESU: Record<string, string[]> = {
  rodzina: [],
  osoba: ['$osoba'],
  tytul: ['$osoba', '$tytul'],
  dziecko: ['$dziecko'],
};

describe('pytania – spójność z mapą danych', () => {
  it('każde daneId i takze istnieje w mapie', () => {
    const nieznane = [...daneZPytan(WSZYSTKIE_PYTANIA)].filter((id) => !idMapy.has(id));
    expect(nieznane).toEqual([]);
  });

  it('identyfikatory pytań są unikalne w obu warstwach razem', () => {
    const ids = WSZYSTKIE_PYTANIA.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('PYTANIA to warstwa A, PYTANIA_DOKUMENTY to warstwa B', () => {
    expect(PYTANIA.every((p) => p.warstwa === 'A')).toBe(true);
    expect(PYTANIA_DOKUMENTY.every((p) => p.warstwa === 'B')).toBe(true);
  });

  it('wpisy „poza kwestionariuszem” istnieją w mapie i mają wyjaśnienie', () => {
    for (const p of POZA_KWESTIONARIUSZEM) {
      expect(idMapy.has(p.daneId), p.daneId).toBe(true);
      expect(p.wyjasnienie.length, p.daneId).toBeGreaterThan(10);
    }
  });

  it('każda dana do ZAM albo wniosku do pracodawcy ma pytanie albo powód, dla którego o nią nie pytamy', () => {
    const pokryte = daneZPytan(WSZYSTKIE_PYTANIA);
    const brak = rekordy
      .filter((r) => r.potrzebne_do.some((c) => c === 'ZAM' || c === 'wniosek_pracodawca'))
      .filter((r) => !pokryte.has(r.id) && !poza.has(r.id))
      .map((r) => r.id);
    expect(brak).toEqual([]);
  });

  it('dane dla silnika, których nie ma żadna e-usługa, są w warstwie A albo pochodzą z planu', () => {
    const wA = daneZPytan(PYTANIA);
    const brak = rekordy
      .filter((r) => r.potrzebne_do.includes('silnik') && r.zawszeUzytkownik)
      .filter((r) => !wA.has(r.id) && poza.get(r.id)?.rodzaj !== 'plan')
      .map((r) => r.id);
    expect(brak).toEqual([]);
  });

  it('pytania z opcjami mają co najmniej dwie opcje, a każde pytanie ma treść', () => {
    for (const p of WSZYSTKIE_PYTANIA) {
      expect(p.etykieta.length, p.id).toBeGreaterThan(2);
      if (p.typ === 'wybor' || p.typ === 'wiele') expect(p.opcje?.length ?? 0, p.id).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('pytania – kształt toru C', () => {
  it('definicje i kroki dają się zapisać jako JSON bez straty', () => {
    expect(JSON.parse(JSON.stringify(PYTANIA))).toEqual(PYTANIA);
    expect(JSON.parse(JSON.stringify(PYTANIA_DOKUMENTY))).toEqual(PYTANIA_DOKUMENTY);
    expect(JSON.parse(JSON.stringify(KROKI_ANKIETY))).toEqual(KROKI_ANKIETY);
    expect(JSON.parse(JSON.stringify(KROKI_DOKUMENTOW))).toEqual(KROKI_DOKUMENTOW);
    for (const p of WSZYSTKIE_PYTANIA) {
      for (const [pole, w] of Object.entries(p)) expect(typeof w, `${p.id}.${pole}`).not.toBe('function');
    }
  });

  it('każde pytanie należy do kroku ze swojej warstwy', () => {
    const krokiA = new Set(KROKI_ANKIETY.map((k) => k.id));
    const krokiB = new Set(KROKI_DOKUMENTOW.map((k) => k.id));
    for (const p of PYTANIA) expect(krokiA.has(p.krok), p.id).toBe(true);
    for (const p of PYTANIA_DOKUMENTY) expect(krokiB.has(p.krok), p.id).toBe(true);
  });

  it('kroki w definicjach idą w kolejności z listy kroków', () => {
    const kolejnosc = (lista: DowolnePytanie[]) => [...new Set(lista.map((p) => p.krok))];
    expect(kolejnosc(PYTANIA)).toEqual(KROKI_ANKIETY.map((k) => k.id));
    expect(kolejnosc(PYTANIA_DOKUMENTY)).toEqual(KROKI_DOKUMENTOW.map((k) => k.id));
  });

  it('ścieżki i warunki używają tylko znaczników ze swojego zakresu', () => {
    for (const p of WSZYSTKIE_PYTANIA) {
      const dozwolone = ZNACZNIKI_ZAKRESU[p.zakres];
      const sciezki = [p.sciezka, ...(p.warunek ? sciezkiWarunku(p.warunek) : []), ...(p.nieWczesniejNiz ? [p.nieWczesniejNiz] : [])];
      for (const s of sciezki) {
        expect(s, p.id).not.toMatch(/[{}]/);
        for (const z of s.match(/\$[a-z]+/g) ?? []) expect(dozwolone, `${p.id}: ${s}`).toContain(z);
      }
    }
  });

  it('kodek obecnosc ma wartość początkową', () => {
    for (const p of WSZYSTKIE_PYTANIA.filter((x) => x.kodek === 'obecnosc')) {
      expect(p.wartoscPoczatkowa, p.id).toBeDefined();
    }
  });

  it('przykład wzorcowy ma odpowiedź na każde wymagane pytanie warstwy A', () => {
    const puste = pytaniaDoPokazania('A', PRZYKLAD_RODZINA)
      .filter((p) => p.def.wymagane)
      .filter((p) => p.wartosc === undefined || p.wartosc === '' || (Array.isArray(p.wartosc) && p.wartosc.length === 0))
      .map((p) => p.klucz);
    expect(puste).toEqual([]);
  });
});

describe('pytania – ścieżki w profilu', () => {
  it('każdy segment ścieżki i warunku to pole z kontraktu (poza polami, które czekają na integratora)', () => {
    for (const p of WSZYSTKIE_PYTANIA.filter((p) => !p.czekaNaKontrakt)) {
      const sciezki = [p.sciezka, ...(p.warunek ? sciezkiWarunku(p.warunek) : []), ...(p.nieWczesniejNiz ? [p.nieWczesniejNiz] : [])];
      for (const sciezka of sciezki) {
        for (const s of sciezka.replace(/\[[^\]]*\]/g, '').split('.')) expect(polaKontraktu.has(s), `${p.id}: ${s}`).toBe(true);
      }
    }
  });

  it('zapisz → odczytaj zwraca tę samą wartość, a profil wejściowy się nie zmienia', () => {
    const rodzina: Rodzina = structuredClone(PRZYKLAD_RODZINA);
    const przed = JSON.stringify(rodzina);
    for (const p of WSZYSTKIE_PYTANIA.filter((p) => !p.czekaNaKontrakt && !p.kodek)) {
      const sciezka = sciezkaKonkretna(p, { osoba: 0, tytul: 0, dziecko: 0 });
      const wartosc = { pytanie: p.id };
      const po = zapisz(rodzina, sciezka, wartosc);
      expect(odczytaj(po, sciezka), p.id).toEqual(wartosc);
    }
    expect(JSON.stringify(rodzina)).toBe(przed);
  });

  it('sciezkaKonkretna wstawia numery osoby, tytułu i dziecka', () => {
    expect(sciezkaKonkretna(pytanie('etat_wymiar'), { osoba: 1, tytul: 2 })).toBe('osoby[1].tytuly[2].wymiarEtatu');
    expect(sciezkaKonkretna(pytanie('dziecko_masa'), { dziecko: 1 })).toBe('zdarzenie.dzieci[1].masaG');
    expect(() => sciezkaKonkretna(pytanie('etat_wymiar'), { osoba: 0 })).toThrow();
  });
});

describe('pytania – odpowiedzi przez kodeki', () => {
  it('liczba dzieci zmienia długość listy i zachowuje dane dzieci', () => {
    const p = pytanie('liczba_dzieci');
    const r1 = zapisz(PRZYKLAD_RODZINA, 'zdarzenie.dzieci[0].zaZyciem', true);
    const r2 = zapiszOdpowiedz(r1, p, {}, 2);
    expect(r2.zdarzenie.dzieci).toEqual([{ zaZyciem: true }, {}]);
    expect(odczytajOdpowiedz(r2, p, {})).toBe(2);
    expect(zapiszOdpowiedz(r2, p, {}, 1).zdarzenie.dzieci).toEqual([{ zaZyciem: true }]);
  });

  it('wybór źródeł ubezpieczenia tworzy tytuły i zachowuje istniejące', () => {
    const p = pytanie('tytuly_rodzaje');
    const r = zapiszOdpowiedz(PRZYKLAD_RODZINA, p, { osoba: 0 }, ['umowa_o_prace', 'zlecenie']);
    const tytuly = r.osoby[0].tytuly;
    expect(tytuly).toHaveLength(2);
    expect(tytuly[0]).toEqual(PRZYKLAD_RODZINA.osoby[0].tytuly[0]);
    expect(tytuly[1]).toMatchObject({ rodzaj: 'zlecenie', chorobowe: 'brak' });
    expect(new Set(tytuly.map((t) => t.id)).size).toBe(2);
    expect(odczytajOdpowiedz(r, p, { osoba: 0 })).toEqual(['umowa_o_prace', 'zlecenie']);
  });

  it('etat dostaje obowiązkowe chorobowe, a pusty wybór czyści tytuły', () => {
    const p = pytanie('tytuly_rodzaje');
    const bez = zapiszOdpowiedz(PRZYKLAD_RODZINA, p, { osoba: 0 }, []);
    expect(bez.osoby[0].tytuly).toEqual([]);
    const zEtatem = zapiszOdpowiedz(bez, p, { osoba: 0 }, ['umowa_o_prace']);
    expect(zEtatem.osoby[0].tytuly[0]).toMatchObject({ rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe' });
  });

  it('etap ustawia typ zdarzenia i to, czy data jest przewidywana', () => {
    const p = pytanie('etap');
    expect(odczytajOdpowiedz(PRZYKLAD_RODZINA, p, {})).toBe('w_ciazy');
    const urodzone = zapiszOdpowiedz(PRZYKLAD_RODZINA, p, {}, 'urodzone');
    expect(urodzone.zdarzenie).toMatchObject({ typ: 'porod', przewidywana: false, data: PRZYKLAD_RODZINA.zdarzenie.data });
    const przyjecie = zapiszOdpowiedz(PRZYKLAD_RODZINA, p, {}, 'przyjecie');
    expect(przyjecie.zdarzenie).toMatchObject({ typ: 'przysposobienie', przewidywana: false });
  });

  it('dobrowolne chorobowe: tak/nie zapisuje rodzaj chorobowego', () => {
    const p = pytanie('chorobowe_dobrowolne');
    const r = zapiszOdpowiedz(PRZYKLAD_RODZINA, p, { osoba: 0, tytul: 0 }, true);
    expect(r.osoby[0].tytuly[0].chorobowe).toBe('dobrowolne');
    expect(odczytajOdpowiedz(zapiszOdpowiedz(r, p, { osoba: 0, tytul: 0 }, false), p, { osoba: 0, tytul: 0 })).toBe(false);
  });

  it('tryb podstawy: „miesiące” tworzy pustą listę, „kwota” ją usuwa', () => {
    const p = pytanie('tryb_podstawy');
    const z = { osoba: 0, tytul: 0 };
    expect(odczytajOdpowiedz(PRZYKLAD_RODZINA, p, z)).toBe('kwota');
    const miesiace = zapiszOdpowiedz(PRZYKLAD_RODZINA, p, z, 'miesiace');
    expect(miesiace.osoby[0].tytuly[0].podstawaSkladek).toEqual([]);
    expect(odczytajOdpowiedz(miesiace, p, z)).toBe('miesiace');
    expect(zapiszOdpowiedz(miesiace, p, z, 'kwota').osoby[0].tytuly[0].podstawaSkladek).toBeUndefined();
  });

  it('obecność: „tak” wstawia wartość początkową, „nie” usuwa obiekt', () => {
    const p = pytanie('ustanie_umowy');
    const z = { osoba: 0, tytul: 0 };
    const tak = zapiszOdpowiedz(PRZYKLAD_RODZINA, p, z, true);
    expect(tak.osoby[0].tytuly[0].ustanie).toEqual({ data: '', przyczyna: 'koniec_umowy' });
    expect(odczytajOdpowiedz(tak, p, z)).toBe(true);
    expect(zapiszOdpowiedz(tak, p, z, false).osoby[0].tytuly[0].ustanie).toBeUndefined();
  });
});

describe('pytania – które pokazać', () => {
  it('etat: są pytania o etat, nie ma pytań o działalność ani o umowę na zastępstwo', () => {
    const ids = idsPytan('A', PRZYKLAD_RODZINA);
    expect(ids).toContain('etat_wymiar');
    expect(ids).toContain('platnik_powyzej_20');
    expect(ids).toContain('wynagrodzenie_miesieczne');
    expect(ids).not.toContain('dzialalnosc_podstawa');
    expect(ids).not.toContain('zadluzenie_skladkowe');
    expect(ids).not.toContain('etat_zastepstwo');
    expect(ids).not.toContain('etat_do');
    expect(ids).not.toContain('podstawa_miesiace');
  });

  it('umowa na czas określony: pojawia się pytanie o zastępstwo i datę końca', () => {
    const r = zapisz(PRZYKLAD_RODZINA, 'osoby[0].tytuly[0].naCzasOkreslony', true);
    expect(idsPytan('A', r)).toContain('etat_zastepstwo');
    expect(idsPytan('A', r)).toContain('etat_do');
  });

  it('działalność: pytania o podstawę składek, zadłużenie i chorobowe, bez pytań o etat i o 20 osób', () => {
    const r = zapiszOdpowiedz(PRZYKLAD_RODZINA, pytanie('tytuly_rodzaje'), { osoba: 0 }, ['dzialalnosc']);
    const ids = idsPytan('A', r);
    expect(ids).toContain('zadluzenie_skladkowe');
    expect(ids).toContain('chorobowe_dobrowolne');
    expect(ids).toContain('dzialalnosc_podstawa');
    expect(ids).toContain('ustanie_firmy');
    expect(ids).not.toContain('etat_wymiar');
    expect(ids).not.toContain('platnik_powyzej_20');
    expect(ids).not.toContain('wynagrodzenie_miesieczne');
    expect(ids).not.toContain('chorobowo_od');
    const zChorobowym = zapisz(r, 'osoby[0].tytuly[0].chorobowe', 'dobrowolne');
    expect(idsPytan('A', zChorobowym)).toContain('chorobowo_od');
  });

  it('osoba współpracująca: też pytamy o zadłużenie składkowe', () => {
    const r = zapiszOdpowiedz(PRZYKLAD_RODZINA, pytanie('tytuly_rodzaje'), { osoba: 0 }, ['wspolpraca']);
    expect(idsPytan('A', r)).toContain('zadluzenie_skladkowe');
  });

  it('ciąża: jest przewidywana data porodu, nie ma pytań o masę dziecka i pobyt w szpitalu', () => {
    const ids = idsPytan('A', PRZYKLAD_RODZINA);
    expect(ids).toContain('data_porodu_przewidywana');
    expect(ids).toContain('zwolnienia_w_ciazy');
    expect(ids).not.toContain('data_porodu');
    expect(ids).not.toContain('dziecko_masa');
    expect(ids).not.toContain('dziecko_szpital');
    expect(ids).not.toContain('pobyt_matki_w_szpitalu');
  });

  it('po porodzie: pytania o cechy każdego dziecka', () => {
    let r = zapiszOdpowiedz(PRZYKLAD_RODZINA, pytanie('etap'), {}, 'urodzone');
    r = zapiszOdpowiedz(r, pytanie('liczba_dzieci'), {}, 2);
    const masy = pytaniaDoPokazania('A', r).filter((p) => p.def.id === 'dziecko_masa');
    expect(masy.map((p) => p.sciezka)).toEqual(['zdarzenie.dzieci[0].masaG', 'zdarzenie.dzieci[1].masaG']);
    expect(masy.map((p) => p.klucz)).toEqual(['dziecko_masa@d0', 'dziecko_masa@d1']);
    const ids = idsPytan('A', r);
    expect(ids).toContain('data_porodu');
    expect(ids).toContain('pobyt_matki_w_szpitalu');
    expect(ids).not.toContain('data_porodu_przewidywana');
  });

  it('pytania o porzucenie i zgon mamy tylko przy dwóch osobach', () => {
    const r = zapiszOdpowiedz(PRZYKLAD_RODZINA, pytanie('etap'), {}, 'urodzone');
    expect(idsPytan('A', r)).not.toContain('zgon_matki');
    const para = zapisz(r, 'osoby[1]', { id: 'tata', rola: 'ojciec', tytuly: [] });
    const zgon = pytaniaDoPokazania('A', para).filter((p) => p.def.id === 'zgon_matki');
    expect(zgon.map((p) => p.sciezka)).toEqual(['osoby[0].zdrowie.zgon']);
  });

  it('ojciec nie dostaje pytania o zwolnienia w ciąży', () => {
    const r = zapisz(PRZYKLAD_RODZINA, 'osoby[0].rola', 'ojciec');
    expect(idsPytan('A', r)).not.toContain('zwolnienia_w_ciazy');
  });

  it('przysposobienie: pytania o datę przyjęcia, datę urodzenia dziecka i sąd, bez tygodnia ciąży', () => {
    const r = zapiszOdpowiedz(PRZYKLAD_RODZINA, pytanie('etap'), {}, 'przyjecie');
    const ids = idsPytan('A', r);
    expect(ids).toContain('typ_przyjecia');
    expect(ids).toContain('dziecko_data_urodzenia');
    expect(ids).toContain('data_przyjecia');
    expect(ids).toContain('data_uprawomocnienia');
    expect(ids).not.toContain('dziecko_tydzien_ciazy');
    expect(ids).not.toContain('data_porodu_przewidywana');
    expect(ids).not.toContain('zwolnienia_w_ciazy');
    expect(ids).not.toContain('dziecko_odroczony_obowiazek');
  });

  it('rodzina zastępcza: pytanie o odroczony obowiązek szkolny, bez pytania o sąd', () => {
    const r = zapisz(zapiszOdpowiedz(PRZYKLAD_RODZINA, pytanie('etap'), {}, 'przyjecie'), 'zdarzenie.typ', 'rodzina_zastepcza_niezawodowa');
    const ids = idsPytan('A', r);
    expect(ids).toContain('dziecko_odroczony_obowiazek');
    expect(ids).not.toContain('data_uprawomocnienia');
  });

  it('warstwa B rozwija pytania na każdą osobę', () => {
    const r = zapisz(PRZYKLAD_RODZINA, 'osoby[1]', { id: 'tata', rola: 'ojciec', tytuly: [] });
    const imiona = pytaniaDoPokazania('B', r).filter((p) => p.def.id === 'osoba_imie');
    expect(imiona.map((p) => p.sciezka)).toEqual(['osoby[0].dane.imie', 'osoby[1].dane.imie']);
    expect(imiona[0].wartosc).toBe('Anna');
    expect(idsPytan('B', r)).toContain('ojcowski_z_innego_tytulu');
    expect(idsPytan('B', PRZYKLAD_RODZINA)).not.toContain('ojcowski_z_innego_tytulu');
  });

  it('warstwa B: dane dziecka dopiero, gdy dziecko jest na świecie albo przyjęte', () => {
    expect(idsPytan('B', PRZYKLAD_RODZINA)).not.toContain('dziecko_imie');
    const r = zapiszOdpowiedz(PRZYKLAD_RODZINA, pytanie('etap'), {}, 'urodzone');
    expect(idsPytan('B', r)).toContain('dziecko_imie');
  });
});
