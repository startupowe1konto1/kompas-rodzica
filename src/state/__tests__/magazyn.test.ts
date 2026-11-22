import { describe, expect, it } from 'vitest';
import type { Plan, Rodzina } from '../../engine/types';
import {
  KLUCZ_MAGAZYNU,
  PUSTY_PROFIL,
  WERSJA_MAGAZYNU,
  deserializuj,
  dopiszPochodzenie,
  dzisISO,
  nowaRodzina,
  oznaczJakoWpisane,
  potwierdz,
  serializuj,
  wybranyPlan,
  zAktualizowanymPlanem,
  zDoPotwierdzenia,
  zPlanami,
  zPochodzeniem,
  zRodzina,
  zWybranymPlanem,
  type StanProfilu,
} from '../magazyn';

const rodzina: Rodzina = {
  osoby: [{ id: 'mama', rola: 'matka', tytuly: [] }],
  zdarzenie: { typ: 'porod', data: '2027-03-10', przewidywana: true, dzieci: [{}] },
  dataAnalizy: '2026-11-21',
};

const plan = (id: string, nazwa = id): Plan => ({ id, nazwa, odcinki: [], wariant815: false });

const stan: StanProfilu = { rodzina, plany: [plan('a'), plan('b')], wybranyPlanId: 'b', pochodzenie: [], doPotwierdzenia: [] };

describe('klucz i wersja', () => {
  it('klucz zawiera numer wersji', () => {
    expect(KLUCZ_MAGAZYNU).toBe(`zasilkowy-przewodnik:v${WERSJA_MAGAZYNU}`);
  });
});

describe('serializuj / deserializuj', () => {
  it('roundtrip zachowuje stan', () => {
    expect(deserializuj(serializuj(stan))).toEqual(stan);
  });

  it('roundtrip pustego profilu', () => {
    expect(deserializuj(serializuj(PUSTY_PROFIL))).toEqual(PUSTY_PROFIL);
  });

  it('zapisuje numer wersji', () => {
    expect(JSON.parse(serializuj(stan)).wersja).toBe(WERSJA_MAGAZYNU);
  });

  it('brak danych → null', () => {
    expect(deserializuj(null)).toBeNull();
    expect(deserializuj(undefined)).toBeNull();
    expect(deserializuj('')).toBeNull();
  });

  it('niepoprawny JSON → null', () => {
    expect(deserializuj('{nie json')).toBeNull();
    expect(deserializuj('undefined')).toBeNull();
  });

  it('inna wersja → null', () => {
    const zapis = JSON.parse(serializuj(stan));
    expect(deserializuj(JSON.stringify({ ...zapis, wersja: 0 }))).toBeNull();
    expect(deserializuj(JSON.stringify({ ...zapis, wersja: 3 }))).toBeNull();
    expect(deserializuj(JSON.stringify({ ...zapis, wersja: '2' }))).toBeNull();
  });

  it('zły kształt → null', () => {
    expect(deserializuj('null')).toBeNull();
    expect(deserializuj('[]')).toBeNull();
    expect(deserializuj('42')).toBeNull();
    expect(deserializuj(JSON.stringify({ wersja: 1 }))).toBeNull();
    expect(deserializuj(JSON.stringify({ wersja: 1, rodzina: null, plany: 'x', wybranyPlanId: null }))).toBeNull();
    expect(deserializuj(JSON.stringify({ wersja: 1, rodzina: { osoby: 'x' }, plany: [], wybranyPlanId: null }))).toBeNull();
    expect(
      deserializuj(JSON.stringify({ wersja: 1, rodzina: { osoby: [] }, plany: [], wybranyPlanId: null })),
    ).toBeNull();
    expect(deserializuj(JSON.stringify({ wersja: 1, rodzina: null, plany: [{ id: 1 }], wybranyPlanId: null }))).toBeNull();
    expect(deserializuj(JSON.stringify({ wersja: 1, rodzina: null, plany: [], wybranyPlanId: 7 }))).toBeNull();
  });

  it('wybrany plan, którego nie ma na liście, zamienia na pierwszy plan', () => {
    const zapis = serializuj({ ...stan, wybranyPlanId: 'nie-ma' });
    expect(deserializuj(zapis)?.wybranyPlanId).toBe('a');
  });
});

describe('zmiany stanu (czyste funkcje)', () => {
  it('zRodzina ustawia rodzinę i nie rusza planów', () => {
    const nowa = { ...rodzina, dataAnalizy: '2026-11-22' };
    const wynik = zRodzina(stan, nowa);
    expect(wynik.rodzina).toBe(nowa);
    expect(wynik.plany).toBe(stan.plany);
    expect(wynik.wybranyPlanId).toBe('b');
  });

  it('zRodzina przyjmuje funkcję aktualizującą', () => {
    const wynik = zRodzina(stan, (r) => (r ? { ...r, dataAnalizy: '2027-01-01' } : r));
    expect(wynik.rodzina?.dataAnalizy).toBe('2027-01-01');
  });

  it('zPlanami zachowuje wybór, jeśli plan nadal jest na liście', () => {
    expect(zPlanami(stan, [plan('b'), plan('c')]).wybranyPlanId).toBe('b');
  });

  it('zPlanami wybiera pierwszy plan, gdy poprzedniego już nie ma', () => {
    expect(zPlanami(stan, [plan('c'), plan('d')]).wybranyPlanId).toBe('c');
  });

  it('zPlanami z pustą listą czyści wybór', () => {
    expect(zPlanami(stan, []).wybranyPlanId).toBeNull();
  });

  it('zWybranymPlanem wybiera istniejący plan', () => {
    expect(zWybranymPlanem(stan, 'a').wybranyPlanId).toBe('a');
  });

  it('zWybranymPlanem ignoruje nieznane id', () => {
    expect(zWybranymPlanem(stan, 'nie-ma')).toBe(stan);
  });

  it('zWybranymPlanem(null) czyści wybór', () => {
    expect(zWybranymPlanem(stan, null).wybranyPlanId).toBeNull();
  });

  it('zAktualizowanymPlanem podmienia plan o tym samym id w tym samym miejscu', () => {
    const wynik = zAktualizowanymPlanem(stan, plan('a', 'Nowa nazwa'));
    expect(wynik.plany.map((p) => p.nazwa)).toEqual(['Nowa nazwa', 'b']);
    expect(wynik.wybranyPlanId).toBe('b');
  });

  it('zAktualizowanymPlanem dopisuje nowy plan na końcu', () => {
    const wynik = zAktualizowanymPlanem(stan, plan('c'));
    expect(wynik.plany.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('zAktualizowanymPlanem przy pustej liście wybiera dopisany plan', () => {
    expect(zAktualizowanymPlanem(PUSTY_PROFIL, plan('x')).wybranyPlanId).toBe('x');
  });

  it('wybranyPlan zwraca plan albo null', () => {
    expect(wybranyPlan(stan)?.id).toBe('b');
    expect(wybranyPlan(PUSTY_PROFIL)).toBeNull();
    expect(wybranyPlan({ ...stan, wybranyPlanId: 'nie-ma' })).toBeNull();
  });
});

describe('dzisISO i nowaRodzina', () => {
  it('dzisISO bierze lokalną datę kalendarzową, z zerami', () => {
    expect(dzisISO(new Date(2026, 10, 21, 23, 59))).toBe('2026-11-21');
    expect(dzisISO(new Date(2027, 0, 5, 0, 1))).toBe('2027-01-05');
  });

  it('nowaRodzina ustawia dataAnalizy na dziś', () => {
    const { osoby, zdarzenie } = rodzina;
    const wynik = nowaRodzina({ osoby, zdarzenie }, new Date(2026, 11, 1, 8, 0));
    expect(wynik.dataAnalizy).toBe('2026-12-01');
    expect(wynik.osoby).toBe(osoby);
    expect(wynik.zdarzenie).toBe(zdarzenie);
  });
});

describe('pochodzenie i odpowiedzi do potwierdzenia', () => {
  it('pusty profil ma puste listy, wersja 2', () => {
    expect(PUSTY_PROFIL.pochodzenie).toEqual([]);
    expect(PUSTY_PROFIL.doPotwierdzenia).toEqual([]);
    expect(WERSJA_MAGAZYNU).toBe(2);
  });
  it('zapis i odczyt zachowują obie listy', () => {
    const s: StanProfilu = { ...PUSTY_PROFIL, pochodzenie: [{ sciezka: 'osoby[0].dane.pesel', zrodlo: 'mobywatel' }], doPotwierdzenia: ['osoby[0].rola'] };
    expect(deserializuj(serializuj(s))).toEqual(s);
  });
  it('zapis w wersji 1 jest ignorowany', () => {
    expect(deserializuj(JSON.stringify({ wersja: 1, rodzina: null, plany: [], wybranyPlanId: null }))).toBeNull();
  });
  it('zapis z listą, która nie jest tablicą, jest ignorowany', () => {
    const zly = { wersja: WERSJA_MAGAZYNU, rodzina: null, plany: [], wybranyPlanId: null, pochodzenie: {}, doPotwierdzenia: [] };
    expect(deserializuj(JSON.stringify(zly))).toBeNull();
    expect(deserializuj(JSON.stringify({ ...zly, pochodzenie: [], doPotwierdzenia: 'x' }))).toBeNull();
  });
  it('dopiszPochodzenie: ta sama ścieżka – wygrywa nowy wpis', () => {
    const s = zPochodzeniem(PUSTY_PROFIL, [{ sciezka: 'a', zrodlo: 'ezus' }, { sciezka: 'b', zrodlo: 'mobywatel' }]);
    expect(dopiszPochodzenie(s, [{ sciezka: 'a', zrodlo: 'formularz_pdf' }]).pochodzenie).toEqual([
      { sciezka: 'b', zrodlo: 'mobywatel' },
      { sciezka: 'a', zrodlo: 'formularz_pdf' },
    ]);
  });
  it('oznaczJakoWpisane: poprawione pole ma źródło „uzytkownik”', () => {
    const sc = 'osoby[0].tytuly[0].wynagrodzenieMiesieczne';
    const s = zPochodzeniem(PUSTY_PROFIL, [{ sciezka: sc, zrodlo: 'ezus' }]);
    expect(oznaczJakoWpisane(s, sc).pochodzenie).toEqual([{ sciezka: sc, zrodlo: 'uzytkownik' }]);
    expect(oznaczJakoWpisane(PUSTY_PROFIL, sc)).toBe(PUSTY_PROFIL);
  });
  it('oznaczJakoWpisane: pole pokryte wpisem całego obiektu dostaje własny wpis „uzytkownik”', () => {
    const s = zPochodzeniem(PUSTY_PROFIL, [{ sciezka: 'osoby[0].tytuly[0]', zrodlo: 'ezus' }]);
    expect(oznaczJakoWpisane(s, 'osoby[0].tytuly[0].wynagrodzenieMiesieczne').pochodzenie).toEqual([
      { sciezka: 'osoby[0].tytuly[0]', zrodlo: 'ezus' },
      { sciezka: 'osoby[0].tytuly[0].wynagrodzenieMiesieczne', zrodlo: 'uzytkownik' },
    ]);
  });
  it('oznaczJakoWpisane: przodek już wpisany przez użytkownika – bez zmian', () => {
    const s = zPochodzeniem(PUSTY_PROFIL, [{ sciezka: 'osoby[0].tytuly[0]', zrodlo: 'uzytkownik' }]);
    expect(oznaczJakoWpisane(s, 'osoby[0].tytuly[0].od')).toBe(s);
  });
  it('oznaczJakoWpisane: wpisy pól pod poprawioną ścieżką też stają się „uzytkownik”', () => {
    const s = zPochodzeniem(PUSTY_PROFIL, [
      { sciezka: 'osoby[0].tytuly[0].od', zrodlo: 'ezus' },
      { sciezka: 'osoby[0].tytuly[0].platnikPowyzej20', zrodlo: 'uzytkownik' },
      { sciezka: 'osoby[1].tytuly[0].od', zrodlo: 'ezus' },
    ]);
    expect(oznaczJakoWpisane(s, 'osoby[0].tytuly[0]').pochodzenie).toEqual([
      { sciezka: 'osoby[0].tytuly[0].od', zrodlo: 'uzytkownik' },
      { sciezka: 'osoby[0].tytuly[0].platnikPowyzej20', zrodlo: 'uzytkownik' },
      { sciezka: 'osoby[1].tytuly[0].od', zrodlo: 'ezus' },
    ]);
  });
  it('potwierdz usuwa ścieżkę z listy do potwierdzenia', () => {
    const s = zDoPotwierdzenia(PUSTY_PROFIL, ['osoby[0].rola', 'zdarzenie']);
    expect(potwierdz(s, 'osoby[0].rola').doPotwierdzenia).toEqual(['zdarzenie']);
    expect(potwierdz(PUSTY_PROFIL, 'x')).toBe(PUSTY_PROFIL);
  });
});
