import { describe, expect, it } from 'vitest';
import type { Rodzina } from '../../../engine/types';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import {
  bledyWiersza,
  miesiacDoDodania,
  nazwaTytulu,
  opcjeDoWyboru,
  pasujaceDoPotwierdzenia,
  poprzedniMiesiac,
  rodzajNowejUmowy,
  zmienRodzajTytulu,
} from '../listy';
import { dodajTytul } from '../silnik-ankiety';

describe('poprzedniMiesiac', () => {
  it('cofa o miesiąc, także przez granicę roku', () => {
    expect(poprzedniMiesiac('2026-11')).toBe('2026-10');
    expect(poprzedniMiesiac('2026-01')).toBe('2025-12');
  });
  it('nieczytelny miesiąc → undefined', () => {
    expect(poprzedniMiesiac('')).toBeUndefined();
    expect(poprzedniMiesiac('2026-13')).toBeUndefined();
  });
});

describe('miesiacDoDodania', () => {
  it('pusta lista: miesiąc przed miesiącem analizy', () => {
    expect(miesiacDoDodania([], '2026-11-21')).toBe('2026-10');
    expect(miesiacDoDodania(undefined, '2026-01-05')).toBe('2025-12');
  });
  it('kolejne dodajemy w tył, przed najwcześniejszym wpisanym miesiącem', () => {
    const w = [
      { miesiac: '2026-10', kwota: 1 },
      { miesiac: '2026-08', kwota: 1 },
    ];
    expect(miesiacDoDodania(w, '2026-11-21')).toBe('2026-07');
  });
  it('wiersze bez poprawnego miesiąca nie psują podpowiedzi', () => {
    expect(miesiacDoDodania([{ miesiac: '', kwota: 1 }], '2026-11-21')).toBe('2026-10');
  });
});

describe('nazwaTytulu', () => {
  const rodzina = dodajTytul(dodajTytul(PRZYKLAD_RODZINA, 0, 'umowa_o_prace'), 0, 'zlecenie');
  const tytuly = rodzina.osoby[0].tytuly;
  it('numeruje w obrębie rodzaju', () => {
    expect(nazwaTytulu(tytuly, 0)).toBe('Umowa o pracę 1');
    expect(nazwaTytulu(tytuly, 1)).toBe('Umowa o pracę 2');
    expect(nazwaTytulu(tytuly, 2)).toBe('Umowa zlecenia 1');
  });
  it('tryb „gdy kilka”: numer tylko, gdy jest więcej niż jeden tytuł tego rodzaju', () => {
    expect(nazwaTytulu(tytuly, 0, false)).toBe('Umowa o pracę 1');
    expect(nazwaTytulu(tytuly, 2, false)).toBe('Umowa zlecenia');
  });
});

describe('rodzajNowejUmowy', () => {
  it('bez tytułów: umowa o pracę; w przeciwnym razie rodzaj ostatniego', () => {
    expect(rodzajNowejUmowy([])).toBe('umowa_o_prace');
    const r = dodajTytul(PRZYKLAD_RODZINA, 0, 'zlecenie');
    expect(rodzajNowejUmowy(r.osoby[0].tytuly)).toBe('zlecenie');
  });
});

describe('zmienRodzajTytulu', () => {
  it('zmienia rodzaj i dopasowuje chorobowe, nie zmieniając oryginału', () => {
    const zlecenie = zmienRodzajTytulu(PRZYKLAD_RODZINA, 0, 0, 'zlecenie');
    expect(zlecenie.osoby[0].tytuly[0].rodzaj).toBe('zlecenie');
    expect(zlecenie.osoby[0].tytuly[0].chorobowe).toBe('brak');
    expect(PRZYKLAD_RODZINA.osoby[0].tytuly[0].rodzaj).toBe('umowa_o_prace');
    const znowuEtat = zmienRodzajTytulu(zlecenie, 0, 0, 'umowa_o_prace');
    expect(znowuEtat.osoby[0].tytuly[0].chorobowe).toBe('obowiazkowe');
  });
  it('dobrowolne chorobowe zostaje przy zmianie między rodzajami bez etatu', () => {
    const r: Rodzina = structuredClone(PRZYKLAD_RODZINA);
    r.osoby[0].tytuly[0] = { ...r.osoby[0].tytuly[0], rodzaj: 'zlecenie', chorobowe: 'dobrowolne' };
    expect(zmienRodzajTytulu(r, 0, 0, 'dzialalnosc').osoby[0].tytuly[0].chorobowe).toBe('dobrowolne');
  });
});

describe('pasujaceDoPotwierdzenia', () => {
  const lista = ['osoby[0].rola', 'zdarzenie'];
  it('dokładna ścieżka i ścieżki pod wpisem', () => {
    expect(pasujaceDoPotwierdzenia('osoby[0].rola', lista)).toEqual(['osoby[0].rola']);
    expect(pasujaceDoPotwierdzenia('zdarzenie', lista)).toEqual(['zdarzenie']);
    expect(pasujaceDoPotwierdzenia('zdarzenie.data', lista)).toEqual(['zdarzenie']);
    expect(pasujaceDoPotwierdzenia('zdarzenie.dzieci', lista)).toEqual(['zdarzenie']);
  });
  it('wpis pod ścieżką pytania (pytanie o całą listę)', () => {
    expect(pasujaceDoPotwierdzenia('osoby[0].tytuly', ['osoby[0].tytuly[0]'])).toEqual(['osoby[0].tytuly[0]']);
  });
  it('inne ścieżki nie pasują, także o wspólnym początku nazwy', () => {
    expect(pasujaceDoPotwierdzenia('osoby[1].rola', lista)).toEqual([]);
    expect(pasujaceDoPotwierdzenia('zdarzenie2.data', lista)).toEqual([]);
    expect(pasujaceDoPotwierdzenia('osoby[0].roleta', lista)).toEqual([]);
  });
});

describe('bledyWiersza', () => {
  const bledy = [
    { kod: 'NIE_LICZBA' as const, komunikat: 'a', pole: '[1].kwota' },
    { kod: 'ZLY_MIESIAC' as const, komunikat: 'b', pole: '[1].miesiac' },
    { kod: 'WYMAGANE' as const, komunikat: 'c', pole: '[10].od' },
    { kod: 'WYMAGANE' as const, komunikat: 'd' },
  ];
  it('zbiera błędy wiersza po nazwie pola, bez pomylenia [1] z [10]', () => {
    const w = bledyWiersza(bledy, 1);
    expect(w.kwota?.kod).toBe('NIE_LICZBA');
    expect(w.miesiac?.kod).toBe('ZLY_MIESIAC');
    expect(w.od).toBeUndefined();
    expect(bledyWiersza(bledy, 10).od?.kod).toBe('WYMAGANE');
    expect(bledyWiersza(bledy, 0)).toEqual({});
  });
});

describe('opcjeDoWyboru (rodzaje spoza listy wyboru)', () => {
  const opcje = [{ wartosc: 'umowa_o_prace' }, { wartosc: 'dzialalnosc' }, { wartosc: 'wspolpraca' }, { wartosc: 'inny' }];

  it('nie proponuje współpracy, gdy profil jej nie ma', () => {
    expect(opcjeDoWyboru(opcje, ['umowa_o_prace']).map((o) => o.wartosc)).toEqual(['umowa_o_prace', 'dzialalnosc', 'inny']);
  });

  it('zostawia współpracę, gdy profil już ma taki tytuł (da się ją zobaczyć i odznaczyć)', () => {
    expect(opcjeDoWyboru(opcje, ['wspolpraca']).map((o) => o.wartosc)).toEqual(['umowa_o_prace', 'dzialalnosc', 'wspolpraca', 'inny']);
  });

  it('nazwaTytulu dalej zna współpracę ze starego profilu', () => {
    const r = structuredClone(PRZYKLAD_RODZINA) as Rodzina;
    r.osoby[0].tytuly = [{ ...r.osoby[0].tytuly[0], rodzaj: 'wspolpraca' }];
    expect(nazwaTytulu(r.osoby[0].tytuly, 0, false).length).toBeGreaterThan(0);
  });
});
