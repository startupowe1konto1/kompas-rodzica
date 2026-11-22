import { describe, expect, it } from 'vitest';
import { przesunMiesiac } from '../../daty';
import type { TytulUbezpieczenia } from '../../types';
import { czyPoprawnyMiesiac, okresPodstawy, ostatnieZnaneMiesiace, sredniaGroszy, uzupelnione, wpisyListy, wynagrodzenieMiesiaca } from '../miesiace';

const etat = (zmiany: Partial<TytulUbezpieczenia>): TytulUbezpieczenia => ({
  id: 't1', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2023-03-01', ...zmiany,
});

describe('okresPodstawy', () => {
  it('długi staż: 12 pełnych miesięcy przed miesiącem porodu, rosnąco', () => {
    expect(okresPodstawy(etat({}), '2026-12-10')).toEqual([
      '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11',
    ]);
  });
  it('początek w środku miesiąca: pierwszy pełny miesiąc jest następny', () => {
    expect(okresPodstawy(etat({ od: '2026-07-15' }), '2026-12-10')).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
  });
  it('początek 1. dnia miesiąca: ten miesiąc jest pełny', () => {
    expect(okresPodstawy(etat({ od: '2026-08-01' }), '2026-12-10')).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
  });
  it('pierwszy miesiąc ubezpieczenia = miesiąc porodu: okres pusty', () => {
    expect(okresPodstawy(etat({ od: '2026-12-01' }), '2026-12-10')).toEqual([]);
  });
  it('chorobowoOd ma pierwszeństwo przed od', () => {
    expect(okresPodstawy(etat({ od: '2020-01-01', chorobowoOd: '2026-10-01' }), '2026-12-10')).toEqual(['2026-10', '2026-11']);
  });
});

describe('wynagrodzenieMiesiaca', () => {
  it('miesiąc bez pól dni: kwota w całości', () => {
    expect(wynagrodzenieMiesiaca({ miesiac: '2026-01', kwota: 8000 })).toEqual({ kwota: 8000, uzupelniony: false });
  });
  it('komplet dni: kwota w całości', () => {
    expect(wynagrodzenieMiesiaca({ miesiac: '2026-01', kwota: 8000, dniPrzepracowane: 21, dniObowiazku: 21 })).toEqual({ kwota: 8000, uzupelniony: false });
  });
  it('mniej niż połowa: wyłączony', () => {
    expect(wynagrodzenieMiesiaca({ miesiac: '2026-01', kwota: 2000, dniPrzepracowane: 5, dniObowiazku: 21 })).toBeNull();
  });
  it('dokładnie połowa: uzupełniony ze składników', () => {
    expect(wynagrodzenieMiesiaca({ miesiac: '2026-01', kwota: 1, dniPrzepracowane: 10, dniObowiazku: 20, skladnikiStale: 6000, skladnikiZmienne: 1000 }))
      .toEqual({ kwota: 8000, uzupelniony: true });
  });
  it('uzupełnienie bez pól składników: cała kwota jak zmienna', () => {
    expect(wynagrodzenieMiesiaca({ miesiac: '2026-01', kwota: 4400, dniPrzepracowane: 11, dniObowiazku: 21 })).toEqual({ kwota: 8400, uzupelniony: true });
  });
});

describe('zaokrąglenia na groszach', () => {
  it('średnia: połówka grosza w górę', () => {
    expect(sredniaGroszy([10000, 10000.01])).toBe(10000.01);
  });
  it('uzupełnienie: połówka grosza w górę', () => {
    expect(wynagrodzenieMiesiaca({ miesiac: '2026-01', kwota: 10000.18, dniPrzepracowane: 12, dniObowiazku: 21 })).toEqual({ kwota: 17500.32, uzupelniony: true });
  });
});

describe('dane niepoprawne', () => {
  it('uzupełnienie przy zerze przepracowanych dni: brak wyniku zamiast Infinity', () => {
    expect(uzupelnione({ miesiac: '2026-01', kwota: 2000, dniPrzepracowane: 0, dniObowiazku: 20 })).toBeNull();
  });
  it('wartości NaN, nieskończone i ujemne: brak wyniku', () => {
    expect(wynagrodzenieMiesiaca({ miesiac: '2026-01', kwota: Number.NaN })).toBeNull();
    expect(wynagrodzenieMiesiaca({ miesiac: '2026-01', kwota: Number.POSITIVE_INFINITY })).toBeNull();
    expect(wynagrodzenieMiesiaca({ miesiac: '2026-01', kwota: -5 })).toBeNull();
    expect(wynagrodzenieMiesiaca({ miesiac: '2026-01', kwota: 1, dniPrzepracowane: 11, dniObowiazku: 21, skladnikiStale: Number.NaN })).toBeNull();
  });
});

describe('czyPoprawnyMiesiac', () => {
  it('tylko RRRR-MM z miesiącem 01–12', () => {
    expect(czyPoprawnyMiesiac('2025-09')).toBe(true);
    expect(czyPoprawnyMiesiac('2025-12')).toBe(true);
    for (const zly of ['2025-9', '2025-00', '2025-13', '25-09', '2025-09-01', ' 2025-09', '2025/09', '', 'abc']) {
      expect(czyPoprawnyMiesiac(zly)).toBe(false);
    }
  });
});

describe('wpisyListy', () => {
  it('brak listy: pusta tablica', () => {
    expect(wpisyListy(undefined)).toEqual([]);
  });
  it('jeden wpis na miesiąc, ostatni na liście wygrywa; klucze spoza RRRR-MM odpadają', () => {
    const lista = [
      { miesiac: '2026-01', kwota: 1 },
      { miesiac: '2026-02', kwota: 2 },
      { miesiac: '2026-9', kwota: 3 },
      { miesiac: '2026-01', kwota: 4 },
    ];
    expect(wpisyListy(lista)).toEqual([{ miesiac: '2026-01', kwota: 4 }, { miesiac: '2026-02', kwota: 2 }]);
  });
});

describe('ostatnieZnaneMiesiace', () => {
  const PRAWO_OKRES = ['2027-02', '2027-03']; // lista nie sięga okresu
  const tytul = (podstawaSkladek: { miesiac: string; kwota: number }[]) =>
    etat({ od: '2020-01-01', podstawaSkladek });
  const kolejne = (od: string, ile: number, kwota: number) =>
    Array.from({ length: ile }, (_, i) => ({ miesiac: przesunMiesiac(od, i), kwota }));

  it('najwyżej 12 ostatnich miesięcy, rosnąco', () => {
    const znane = ostatnieZnaneMiesiace(tytul(kolejne('2025-01', 14, 1000)), PRAWO_OKRES);
    expect(znane).toHaveLength(12);
    expect(znane[0]).toBe('2025-03');
    expect(znane[11]).toBe('2026-02');
  });
  it('miesiące z NaN, nieskończoną i ujemną kwotą odpadają przed wyborem 12, wcześniejszy poprawny miesiąc wchodzi', () => {
    const lista = [
      { miesiac: '2025-01', kwota: 1000 },
      ...kolejne('2025-02', 12, 0).map((m, i) => ({ ...m, kwota: [Number.NaN, Number.POSITIVE_INFINITY, -1][i % 3] })),
    ];
    expect(ostatnieZnaneMiesiace(tytul(lista), PRAWO_OKRES)).toEqual(['2025-01']);
  });
  it('kwota 0 jest poprawna', () => {
    expect(ostatnieZnaneMiesiace(tytul([{ miesiac: '2025-01', kwota: 0 }]), PRAWO_OKRES)).toEqual(['2025-01']);
  });
  it('duplikaty miesięcy liczą się raz, a klucz spoza RRRR-MM odpada', () => {
    const lista = [...kolejne('2025-01', 12, 1000), { miesiac: '2025-01', kwota: 2000 }, { miesiac: '2025-9', kwota: 3000 }];
    const znane = ostatnieZnaneMiesiace(tytul(lista), PRAWO_OKRES);
    expect(znane).toHaveLength(12);
    expect(znane[0]).toBe('2025-01');
    expect(znane).not.toContain('2025-9');
  });
  it('ostatni wpis miesiąca z błędną kwotą wygrywa i wyłącza ten miesiąc', () => {
    const lista = [{ miesiac: '2025-01', kwota: 1000 }, { miesiac: '2025-01', kwota: Number.NaN }, { miesiac: '2025-02', kwota: 1000 }];
    expect(ostatnieZnaneMiesiace(tytul(lista), PRAWO_OKRES)).toEqual(['2025-02']);
  });
});
