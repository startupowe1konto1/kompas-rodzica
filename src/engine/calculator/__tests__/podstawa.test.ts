import { describe, expect, it } from 'vitest';
import { przesunMiesiac } from '../../daty';
import { PARAMETRY_2026, WERSJE_DOMYSLNE } from '../../params';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import type { MiesiacPodstawy, Osoba, TytulUbezpieczenia } from '../../types';
import { okresPodstawy } from '../miesiace';
import { obliczPodstawe } from '..';
import { minimumArt45 } from '../podstawa';

const DATA = '2026-12-01';
const osobaZ = (tytul: TytulUbezpieczenia): Osoba => ({ id: 'o1', rola: 'matka', tytuly: [tytul] });
const etat = (zmiany: Partial<TytulUbezpieczenia>): TytulUbezpieczenia => ({
  id: 't1', rodzaj: 'umowa_o_prace', chorobowe: 'obowiazkowe', od: '2023-03-01', wymiarEtatu: 1, ...zmiany,
});
const licz = (tytul: TytulUbezpieczenia, data = DATA, wersje = WERSJE_DOMYSLNE) => obliczPodstawe(osobaZ(tytul), tytul, data, wersje);

describe('obliczPodstawe – tryb prosty', () => {
  it('wzorzec: etat, pełny, 8000 zł', () => {
    const mama = PRZYKLAD_RODZINA.osoby[0];
    const w = obliczPodstawe(mama, mama.tytuly[0], DATA, WERSJE_DOMYSLNE);
    expect(w.osobaId).toBe('mama');
    expect(w.tytulId).toBe('etat-1');
    expect(w.kwota).toBe(6903.2);
    expect(w.metoda).toBe('srednia_12_miesiecy');
    expect(w.ograniczenia).toEqual([]);
    expect(w.sciezka.map((k) => k.wartosc)).toEqual([8000, 6903.2]);
    expect(w.sciezka.every((k) => k.przepis)).toBe(true);
  });
  it('EC-91: etat, pełny, 4000 zł poniżej płacy minimalnej', () => {
    const w = licz(etat({ wynagrodzenieMiesieczne: 4000 }));
    expect(w.kwota).toBe(4147.1);
    expect(w.ograniczenia).toEqual(['minimum_art_45']);
    expect(w.sciezka.at(-1)?.wartosc).toBe(4147.1);
  });
  it('EC-91b: etat 0,5, 2000 zł – minimum proporcjonalne do etatu', () => {
    const w = licz(etat({ wymiarEtatu: 0.5, wynagrodzenieMiesieczne: 2000 }));
    expect(w.kwota).toBe(2073.55);
    expect(w.ograniczenia).toEqual(['minimum_art_45']);
  });
  it('etat dokładnie na płacy minimalnej: bez ograniczenia', () => {
    const w = licz(etat({ wynagrodzenieMiesieczne: 4806 }));
    expect(w.kwota).toBe(4147.1);
    expect(w.ograniczenia).toEqual([]);
  });
  it('EC-92: działalność, zadeklarowana podstawa 30 000 zł – limit dobrowolnego chorobowego', () => {
    const w = licz({ id: 'dg', rodzaj: 'dzialalnosc', chorobowe: 'dobrowolne', od: '2022-01-01', zadeklarowanaPodstawa: 30000 });
    expect(w.kwota).toBe(20321.3);
    expect(w.ograniczenia).toEqual(['limit_dobrowolne']);
    expect(w.sciezka.map((k) => k.wartosc)).toEqual([30000, 23550, 20321.3]);
  });
  it('zlecenie z chorobowym, 5000 zł', () => {
    const w = licz({ id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2024-01-01', wynagrodzenieMiesieczne: 5000 });
    expect(w.kwota).toBe(4314.5);
    expect(w.metoda).toBe('srednia_12_miesiecy');
    expect(w.ograniczenia).toEqual([]);
  });
  it('zlecenie 1200 zł: minimum z art. 45 nie dotyczy niebędących pracownikami', () => {
    const w = licz({ id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2024-01-01', wynagrodzenieMiesieczne: 1200 });
    expect(w.kwota).toBe(1035.48);
    expect(w.ograniczenia).toEqual([]);
  });
  it('brak kwoty w ankiecie: nie rzuca, etat dostaje minimum i kod braku danych', () => {
    const w = licz(etat({}));
    expect(w.kwota).toBe(4147.1);
    expect(w.ograniczenia).toEqual(['brak_danych_o_przychodzie', 'minimum_art_45']);
  });
  it('liczby pochodzą z parametrów obowiązujących w dniu powstania prawa', () => {
    const od2027 = { ...PARAMETRY_2026, obowiazujeOd: '2027-01-01', kwoty: { ...PARAMETRY_2026.kwoty, placaMinimalna: 5000 } };
    const wersje = [...WERSJE_DOMYSLNE, od2027];
    expect(licz(etat({ wynagrodzenieMiesieczne: 4000 }), '2026-12-31', wersje).kwota).toBe(4147.1);
    expect(licz(etat({ wynagrodzenieMiesieczne: 4000 }), '2027-01-01', wersje).kwota).toBe(4314.5);
  });
});

describe('obliczPodstawe – tryb prosty, poprawki', () => {
  it('kwota ujemna albo nie-liczba to brak danych', () => {
    for (const zla of [-100, Number.NaN, Number.POSITIVE_INFINITY]) {
      const w = licz({ id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2024-01-01', wynagrodzenieMiesieczne: zla });
      expect(w.kwota).toBe(0);
      expect(w.ograniczenia).toEqual(['brak_danych_o_przychodzie']);
    }
  });
  it('wymiar etatu spoza (0, 1] liczy się jak pełny etat', () => {
    for (const wymiar of [0, -1, 1.5, Number.NaN]) {
      const w = licz(etat({ wymiarEtatu: wymiar, wynagrodzenieMiesieczne: 2000 }));
      expect(w.kwota).toBe(4147.1);
    }
  });
});

describe('obliczPodstawe – krok z kwotą z ankiety zależy od metody (bez „przed porodem”)', () => {
  const pierwszy = (t: TytulUbezpieczenia, data = '2026-12-10') => licz(t, data).sciezka[0];
  const bezPorodu = (t: TytulUbezpieczenia, data = '2026-12-10') => licz(t, data).sciezka.every((k) => !k.opis.includes('porod'));

  it('12 miesięcy: UZ art. 36 ust. 1', () => {
    const t = etat({ wynagrodzenieMiesieczne: 8000 });
    expect(pierwszy(t)).toMatchObject({ wartosc: 8000, przepis: 'UZ art. 36 ust. 1' });
    expect(bezPorodu(t)).toBe(true);
  });
  it('krótszy okres: średnia z pełnych miesięcy, UZ art. 36 ust. 2', () => {
    const t = etat({ od: '2026-08-01', wynagrodzenieMiesieczne: 8000 });
    expect(licz(t, '2026-12-10').metoda).toBe('srednia_pelnych_miesiecy');
    expect(pierwszy(t)).toMatchObject({ wartosc: 8000, przepis: 'UZ art. 36 ust. 2' });
    expect(pierwszy(t).opis).toContain('4 pełnych');
    expect(bezPorodu(t)).toBe(true);
  });
  it('bez pełnego miesiąca: z umowy, UZ art. 37', () => {
    const t = etat({ od: '2026-12-01', wynagrodzenieMiesieczne: 8000 });
    expect(pierwszy(t)).toMatchObject({ wartosc: 8000, przepis: 'UZ art. 37 ust. 1 i ust. 2 pkt 1' });
  });
  it('brak danych: krok mówi o braku danych i nie pokazuje kwoty 0 jako średniej', () => {
    const t = etat({});
    expect(pierwszy(t).opis.startsWith('Brak danych')).toBe(true);
    expect(pierwszy(t).wartosc).toBeUndefined();
    expect(bezPorodu(t)).toBe(true);
  });
  it('średnia z listy miesięcy też bez „przed porodem”', () => {
    const t = etat({ od: '2026-10-01', podstawaSkladek: [{ miesiac: '2026-10', kwota: 8000 }, { miesiac: '2026-11', kwota: 8000 }] });
    expect(bezPorodu(t)).toBe(true);
  });
});

describe('obliczPodstawe – pracownik z listy miesięcy', () => {
  const POROD = '2026-12-10';
  const mies = (m: string, kwota: number, reszta: Partial<MiesiacPodstawy> = {}): MiesiacPodstawy => ({ miesiac: m, kwota, ...reszta });
  const okres12 = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
  const dwanascie = (kwota: number, reszta: Partial<MiesiacPodstawy> = {}) => okres12.map((m) => mies(m, kwota, reszta));
  const jedenascieI = (maj: MiesiacPodstawy) => okres12.map((m) => (m === '2026-05' ? maj : mies(m, 8000)));

  it('12 miesięcy: średnia, miesiące spoza okresu pomijane', () => {
    const lista = [
      mies('2025-11', 1000),
      ...okres12.map((m, i) => mies(m, i < 6 ? 7000 : 9000)),
      mies('2026-12', 20000),
    ];
    const w = licz(etat({ podstawaSkladek: lista }), POROD);
    expect(w.kwota).toBe(6903.2);
    expect(w.metoda).toBe('srednia_12_miesiecy');
    expect(w.sciezka[0].wartosc).toBe(8000);
    expect(w.sciezka.every((k) => k.przepis)).toBe(true);
  });
  it('krótszy okres: średnia z pełnych miesięcy', () => {
    const t = etat({ od: '2026-07-15', podstawaSkladek: [mies('2026-07', 3000), ...['2026-08', '2026-09', '2026-10', '2026-11'].map((m) => mies(m, 8000))] });
    const w = licz(t, POROD);
    expect(okresPodstawy(t, POROD)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
    expect(w.kwota).toBe(6903.2);
    expect(w.metoda).toBe('srednia_pelnych_miesiecy');
  });
  it('pierwszy miesiąc: podstawa z umowy', () => {
    const t = etat({ od: '2026-12-01', wynagrodzenieMiesieczne: 8000 });
    const w = licz(t, POROD);
    expect(okresPodstawy(t, POROD)).toEqual([]);
    expect(w.kwota).toBe(6903.2);
    expect(w.metoda).toBe('z_umowy');
  });
  it('EC-95: miesiąc przepracowany w mniej niż połowie jest pominięty', () => {
    const w = licz(etat({ podstawaSkladek: jedenascieI(mies('2026-05', 2000, { dniPrzepracowane: 5, dniObowiazku: 21 })) }), POROD);
    expect(w.kwota).toBe(6903.2);
  });
  it('EC-95b: miesiąc niepełny uzupełniony ze składników stałych i zmiennych', () => {
    const maj = mies('2026-05', 4200, { dniPrzepracowane: 11, dniObowiazku: 21, skladnikiStale: 6000, skladnikiZmienne: 1100 });
    expect(licz(etat({ podstawaSkladek: jedenascieI(maj) }), POROD).kwota).toBe(6910.39);
  });
  it('EC-95c: miesiąc niepełny bez składników: cała kwota uzupełniona', () => {
    const maj = mies('2026-05', 4400, { dniPrzepracowane: 11, dniObowiazku: 21 });
    expect(licz(etat({ podstawaSkladek: jedenascieI(maj) }), POROD).kwota).toBe(6931.96);
  });
  it('wszystkie miesiące poniżej połowy: bierze się wszystkie po uzupełnieniu (art. 38 ust. 3)', () => {
    const w = licz(etat({ podstawaSkladek: dwanascie(2000, { dniPrzepracowane: 5, dniObowiazku: 20 }) }), POROD);
    expect(w.kwota).toBe(6903.2);
  });
  it('składniki kwartalne i roczne: po jednej dwunastej', () => {
    const t = etat({
      podstawaSkladek: dwanascie(8000),
      skladnikiKwartalne: ['2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3'].map((okres) => ({ okres, kwota: 1500 })),
      skladnikRoczny: 6000,
    });
    expect(licz(t, POROD).kwota).toBe(7766.1);
  });
  it('lista bez miesięcy z okresu: wraca do kwoty z umowy z ograniczeniem', () => {
    const w = licz(etat({ podstawaSkladek: [mies('2024-01', 5000)], wynagrodzenieMiesieczne: 8000 }), POROD);
    expect(w.kwota).toBe(6903.2);
    expect(w.ograniczenia).toContain('brak_miesiecy_w_okresie');
  });
  it('minimum po średniej', () => {
    const w = licz(etat({ podstawaSkladek: dwanascie(4000) }), POROD);
    expect(w.kwota).toBe(4147.1);
    expect(w.ograniczenia).toContain('minimum_art_45');
  });
  it('połówka grosza w średniej z dwóch miesięcy zaokrągla się w górę', () => {
    const t = etat({ od: '2026-10-01', podstawaSkladek: [mies('2026-10', 10000), mies('2026-11', 10000.01)] });
    expect(licz(t, POROD).kwota).toBe(8629.01);
  });
  it('wszystkie miesiące z zerem przepracowanych dni: powrót do kwoty z umowy', () => {
    const w = licz(etat({ wynagrodzenieMiesieczne: 8000, podstawaSkladek: dwanascie(2000, { dniPrzepracowane: 0, dniObowiazku: 20 }) }), POROD);
    expect(w.kwota).toBe(6903.2);
    expect(w.ograniczenia).toEqual(['brak_miesiecy_w_okresie']);
  });
  it('zero przepracowanych dni i brak kwoty z umowy: brak danych, wynik skończony', () => {
    const w = licz(etat({ podstawaSkladek: dwanascie(2000, { dniPrzepracowane: 0, dniObowiazku: 20 }) }), POROD);
    expect(Number.isFinite(w.kwota)).toBe(true);
    expect(w.ograniczenia).toEqual(['brak_miesiecy_w_okresie', 'brak_danych_o_przychodzie', 'minimum_art_45']);
  });
  it('miesiąc z NaN jest pomijany, reszta liczy się normalnie', () => {
    const lista = okres12.map((m, i) => mies(m, i === 3 ? Number.NaN : 8000));
    expect(licz(etat({ podstawaSkladek: lista }), POROD).kwota).toBe(6903.2);
  });
  it('dwa wpisy z tym samym miesiącem: liczy się jeden, ostatni na liście wygrywa', () => {
    expect(licz(etat({ podstawaSkladek: [mies('2026-05', 20000), ...dwanascie(8000)] }), POROD).kwota).toBe(6903.2);
    // późniejszy wpis poprawia wcześniejszy: (11 × 8000 + 9200) ÷ 12 = 8100; × 86,29% = 6989,49
    expect(licz(etat({ podstawaSkladek: [...dwanascie(8000), mies('2026-05', 9200)] }), POROD).kwota).toBe(6989.49);
  });
  it('wszystkie miesiące z NaN: powrót do kwoty z umowy', () => {
    const w = licz(etat({ wynagrodzenieMiesieczne: 8000, podstawaSkladek: dwanascie(Number.NaN) }), POROD);
    expect(w.kwota).toBe(6903.2);
    expect(w.ograniczenia).toEqual(['brak_miesiecy_w_okresie']);
  });
});

describe('obliczPodstawe – szacunek z ostatnich znanych miesięcy (lista nie sięga okresu podstawy)', () => {
  const PRAWO = '2028-02-01'; // okres podstawy: 02.2027–01.2028
  const miesiace = (od: string, ile: number, kwota: number): MiesiacPodstawy[] =>
    Array.from({ length: ile }, (_, i) => ({ miesiac: przesunMiesiac(od, i), kwota }));

  it('lista 11.2025–10.2026 po 9200 zł, bez kwoty z ankiety: średnia z ostatnich znanych miesięcy, nie minimum', () => {
    const w = licz(etat({ od: '2018-02-01', podstawaSkladek: miesiace('2025-11', 12, 9200) }), PRAWO);
    // 9200 × 86,29% = 7938,68 (bez szacunku: minimum 2027 r. 4950 × 86,29% = 4271,36)
    expect(w.kwota).toBe(7938.68);
    expect(w.metoda).toBe('srednia_12_miesiecy');
    expect(w.ograniczenia).toEqual(['brak_miesiecy_w_okresie', 'podstawa_z_ostatnich_znanych_miesiecy']);
    expect(w.sciezka.some((k) => k.opis.startsWith('Szacunek') && k.przepis === 'UZ art. 36 ust. 1')).toBe(true);
    expect(w.sciezka.every((k) => k.przepis)).toBe(true);
  });
  it('kwota z ankiety ma pierwszeństwo przed szacunkiem', () => {
    const w = licz(etat({ wynagrodzenieMiesieczne: 8000, podstawaSkladek: miesiace('2025-11', 12, 9200) }), PRAWO);
    expect(w.kwota).toBe(6903.2);
    expect(w.ograniczenia).toEqual(['brak_miesiecy_w_okresie']);
  });
  it('do szacunku bierzemy najwyżej 12 ostatnich miesięcy listy', () => {
    const lista = [...miesiace('2025-08', 3, 1000), ...miesiace('2025-11', 12, 9200)];
    expect(licz(etat({ podstawaSkladek: lista }), PRAWO).kwota).toBe(7938.68);
  });
  it('miesiące sprzed początku ubezpieczenia nie wchodzą do szacunku', () => {
    const lista = [...miesiace('2026-01', 4, 1000), ...miesiace('2026-05', 6, 9200)];
    expect(licz(etat({ od: '2026-05-01', podstawaSkladek: lista }), PRAWO).kwota).toBe(7938.68);
  });
  it('dwa wpisy z tym samym miesiącem: liczy się jeden, ostatni na liście wygrywa', () => {
    const lista = [{ miesiac: '2025-11', kwota: 1000 }, ...miesiace('2025-11', 12, 9200)];
    const w = licz(etat({ podstawaSkladek: lista }), PRAWO);
    // 12 miesięcy po 9200 zł (dubel 1000 zł odpada); bez poprawki 13 wpisów dawało niższą średnią
    expect(w.kwota).toBe(7938.68);
    expect(w.sciezka.find((k) => k.opis.startsWith('Średnie wynagrodzenie z'))?.opis).toContain('z 12 ostatnich znanych mies.');
  });
  it('NaN, nieskończone i ujemne kwoty w ostatnich 12 miesiącach listy: wcześniejszy poprawny miesiąc wchodzi do szacunku', () => {
    const zle = [Number.NaN, Number.POSITIVE_INFINITY, -100];
    const lista = [{ miesiac: '2025-10', kwota: 9200 }, ...miesiace('2025-11', 12, 0).map((m, i) => ({ ...m, kwota: zle[i % 3] }))];
    const w = licz(etat({ podstawaSkladek: lista }), PRAWO);
    // jedyny poprawny miesiąc: 9200 zł × 86,29% = 7938,68 (bez poprawki: minimum i brak miesięcy w okresie)
    expect(w.kwota).toBe(7938.68);
    expect(w.ograniczenia).toEqual(['brak_miesiecy_w_okresie', 'podstawa_z_ostatnich_znanych_miesiecy']);
  });
  it('klucz miesiąca spoza RRRR-MM (np. 2025-9) nie wchodzi do szacunku', () => {
    const lista = [...miesiace('2025-11', 12, 9200), { miesiac: '2025-9', kwota: 1000 }];
    const w = licz(etat({ podstawaSkladek: lista }), PRAWO);
    expect(w.kwota).toBe(7938.68);
    expect(w.sciezka.find((k) => k.opis.startsWith('Szacunek'))?.wzor).toBe('12 mies. od 2025-11 do 2026-10');
  });
});

describe('minimumArt45', () => {
  it('płaca minimalna × wymiar etatu po odliczeniu składek; wymiar spoza (0, 1] jak pełny etat', () => {
    // 4806 × 86,29% = 4147,10; pół etatu: 2403 × 86,29% = 2073,55
    expect(minimumArt45(etat({}), PARAMETRY_2026)).toBe(4147.1);
    expect(minimumArt45(etat({ wymiarEtatu: 0.5 }), PARAMETRY_2026)).toBe(2073.55);
    expect(minimumArt45(etat({ wymiarEtatu: 1.5 }), PARAMETRY_2026)).toBe(4147.1);
    expect(minimumArt45(etat({ wymiarEtatu: undefined }), PARAMETRY_2026)).toBe(4147.1);
  });
});
