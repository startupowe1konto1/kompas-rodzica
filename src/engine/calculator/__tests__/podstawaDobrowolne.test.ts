import { describe, expect, it } from 'vitest';
import { przesunMiesiac } from '../../daty';
import { PARAMETRY_2026, WERSJE_DOMYSLNE } from '../../params';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import type { Osoba, Parametry, TytulUbezpieczenia } from '../../types';
import { obliczPodstawe } from '..';
import { mieszczyPelnyMiesiac, poczatekLancuchaZasilkow } from '../podstawaDobrowolne';

const DATA_PORODU = '2026-12-10';
const osobaZ = (tytul: TytulUbezpieczenia, zdrowie?: Osoba['zdrowie']): Osoba => ({ id: 'o1', rola: 'matka', tytuly: [tytul], zdrowie });
const dg = (zmiany: Partial<TytulUbezpieczenia>): TytulUbezpieczenia => ({
  id: 'dg', rodzaj: 'dzialalnosc', chorobowe: 'dobrowolne', od: '2022-01-01', ...zmiany,
});
const licz = (tytul: TytulUbezpieczenia, data = DATA_PORODU, zdrowie?: Osoba['zdrowie'], wersje: Parametry[] = WERSJE_DOMYSLNE) =>
  obliczPodstawe(osobaZ(tytul, zdrowie), tytul, data, wersje);

describe('podstawa niebędącego pracownikiem (UZ art. 48–49)', () => {
  it('EC-09: działalność od 2022, zadeklarowana najniższa podstawa', () => {
    const w = licz(dg({ zadeklarowanaPodstawa: 5652 }));
    expect(w.kwota).toBe(4877.11);
    expect(w.metoda).toBe('srednia_12_miesiecy');
  });
  it('EC-93: działalność z chorobowym od 3 miesięcy – art. 48a', () => {
    const w = licz(dg({ chorobowoOd: '2026-09-01', zadeklarowanaPodstawa: 20000 }));
    expect(w.metoda).toBe('art_48a');
    expect(w.kwota).toBe(7972.33);
    expect(w.sciezka.every((k) => k.przepis)).toBe(true);
    expect(w.sciezka.some((k) => k.wartosc === 4877.11)).toBe(true);
    expect(w.sciezka.some((k) => k.wartosc === 3095.22)).toBe(true);
    expect(w.sciezka.some((k) => k.opis.includes('3'))).toBe(true);
  });
  it('art. 48a bez żadnej kwoty: kwota 0 i kod braku danych, bez zmyślonej podstawy', () => {
    const w = licz(dg({ chorobowoOd: '2026-09-01' }));
    expect(w.metoda).toBe('art_48a');
    expect(w.kwota).toBe(0);
    expect(w.ograniczenia).toContain('brak_danych_o_przychodzie');
  });
  it('EC-93 limit: zadeklarowana obcięta do limitu', () => {
    const w = licz(dg({ chorobowoOd: '2026-09-01', zadeklarowanaPodstawa: 30000 }));
    expect(w.metoda).toBe('art_48a');
    // 23 550 − 5 652 = 17 898; × 86,29% = 15 444,18; × 3 ÷ 12 = 3 861,05; razem 4 877,11 + 3 861,05 = 8 738,16.
    expect(w.kwota).toBe(8738.16);
    expect(w.ograniczenia).toContain('limit_dobrowolne');
  });
  it('EC-93 preferencyjne: najniższa to 30% płacy minimalnej', () => {
    const w = licz(dg({ chorobowoOd: '2026-09-01', zadeklarowanaPodstawa: 1441.8 }));
    expect(w.metoda).toBe('art_48a');
    expect(w.kwota).toBe(1244.13);
  });
  it('EC-94 działalność: chorobowe od 20.11 – najniższa podstawa', () => {
    const w = licz(dg({ chorobowoOd: '2026-11-20', zadeklarowanaPodstawa: 20000 }));
    expect(w.metoda).toBe('najnizsza_podstawa');
    expect(w.kwota).toBe(4877.11);
  });
  it('EC-94 zlecenie: kwota z umowy', () => {
    const w = licz({ id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2026-11-20', wynagrodzenieMiesieczne: 5000 });
    expect(w.metoda).toBe('z_umowy');
    expect(w.kwota).toBe(4314.5);
  });
  it('zlecenie 4 miesiące: średnia z pełnych miesięcy', () => {
    const w = licz({ id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2026-08-01', wynagrodzenieMiesieczne: 5000 });
    expect(w.metoda).toBe('srednia_pelnych_miesiecy');
    expect(w.kwota).toBe(4314.5);
  });
  it('zlecenie z listą miesięcy: średnia z kwot miesięcy', () => {
    const w = licz({
      id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2026-10-01',
      podstawaSkladek: [{ miesiac: '2026-10', kwota: 4000 }, { miesiac: '2026-11', kwota: 6000 }],
    });
    expect(w.metoda).toBe('srednia_pelnych_miesiecy');
    expect(w.kwota).toBe(4314.5);
  });
  it('miesiąc z błędną kwotą na liście traktujemy jak brak danych, nie rzuca', () => {
    const w = licz({
      id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2026-10-01',
      podstawaSkladek: [{ miesiac: '2026-10', kwota: Number.NaN }, { miesiac: '2026-11', kwota: 5000 }],
    });
    expect(w.kwota).toBe(4314.5);
  });
});

describe('niebędący pracownikiem: parametry z miesięcy okresu podstawy, nie z dnia prawa (UZ art. 48 ust. 1, art. 48a ust. 1)', () => {
  const POROD_2027 = '2027-01-01';

  it('poród 1.01.2027, działalność z pełnymi składkami 5652 zł od 1.09.2026: składki w 2026 r. nie były preferencyjne', () => {
    const w = licz(dg({ chorobowoOd: '2026-09-01', zadeklarowanaPodstawa: 5652 }), POROD_2027);
    expect(w.metoda).toBe('art_48a');
    // okres 09–12.2026, w każdym miesiącu najniższa podstawa 2026 r. = 5652 zł (nie 6019,80 zł z 2027 r.):
    // pierwsza część 5652 × 86,29% = 4877,11; nadwyżka 0 → 4877,11
    expect(w.kwota).toBe(4877.11);
  });
  it('poród 1.01.2027, działalność 30 000 zł przez cały rok: limit dobrowolnego chorobowego z 2026 r.', () => {
    const w = licz(dg({ zadeklarowanaPodstawa: 30000 }), POROD_2027);
    expect(w.metoda).toBe('srednia_12_miesiecy');
    // okres 01–12.2026, limit każdego miesiąca 23 550 zł (nie 25 082,50 zł z 2027 r.); 23 550 × 86,29% = 20 321,30
    expect(w.kwota).toBe(20321.3);
    expect(w.ograniczenia).toEqual(['limit_dobrowolne']);
    expect(w.sciezka.map((k) => k.wartosc)).toEqual([30000, 23550, 20321.3]);
  });
  it('poród 1.01.2027, działalność 20 000 zł od 1.09.2026: art. 48a z najniższą podstawą 2026 r.', () => {
    const w = licz(dg({ chorobowoOd: '2026-09-01', zadeklarowanaPodstawa: 20000 }), POROD_2027);
    expect(w.metoda).toBe('art_48a');
    // pkt 1: 5652 × 86,29% = 4877,11 w każdym z 4 mies. → średnia 4877,11
    // pkt 2: (20 000 − 5652) × 86,29% = 12 380,89 na miesiąc; 4 × 12 380,89 = 49 523,56; ÷ 12 = 4126,96
    // razem 4877,11 + 4126,96 = 9004,07
    expect(w.kwota).toBe(9004.07);
    expect(w.sciezka.some((k) => k.wartosc === 4126.96)).toBe(true);
  });
  it('art. 48a, okres na przełomie lat: każdy miesiąc z najniższą podstawą swojego roku', () => {
    const w = licz(dg({ chorobowoOd: '2026-11-01', zadeklarowanaPodstawa: 20000 }), '2027-03-01');
    expect(w.metoda).toBe('art_48a');
    // pkt 1: 2 × 4877,11 (2026) + 2 × 5194,49 (6019,80 × 86,29%, 2027) = 20 143,20; ÷ 4 = 5035,80
    // pkt 2: 2 × 12 380,89 + 2 × 12 063,51 ((20 000 − 6019,80) × 86,29%) = 48 888,80; ÷ 12 = 4074,07
    // razem 5035,80 + 4074,07 = 9109,87
    expect(w.kwota).toBe(9109.87);
    expect(w.sciezka.some((k) => k.wartosc === 5035.8)).toBe(true);
    expect(w.sciezka.some((k) => k.wartosc === 4074.07)).toBe(true);
    expect(w.sciezka.every((k) => k.przepis)).toBe(true);
  });
  it('art. 48a, lista tylko z części miesięcy okresu: pierwsza część po wszystkich n miesiącach, nadwyżka z k miesięcy z danymi', () => {
    const lista = [{ miesiac: '2026-11', kwota: 20000 }, { miesiac: '2026-12', kwota: 20000 }];
    const w = licz(dg({ chorobowoOd: '2026-11-01', podstawaSkladek: lista }), '2027-03-01');
    expect(w.metoda).toBe('art_48a');
    // okres: 11.2026, 12.2026, 01.2027, 02.2027 (n = 4), dane za 2 z nich (k = 2)
    // pkt 1: (2 × 4877,11 + 2 × 5194,49) ÷ 4 = 20 143,20 ÷ 4 = 5035,80 (najniższa podstawa każdego z 4 miesięcy z jego roku)
    // pkt 2: (2 × 12 380,89 ÷ 2) × 4 ÷ 12 = 4126,96
    // razem 5035,80 + 4126,96 = 9162,76
    expect(w.kwota).toBe(9162.76);
    expect(w.sciezka.find((k) => k.przepis === 'UZ art. 48a ust. 1 pkt 1')).toMatchObject({ wartosc: 5035.8, wzor: '(2 × 4877,11 zł + 2 × 5194,49 zł) ÷ 4' });
    expect(w.sciezka.find((k) => k.przepis === 'UZ art. 48a ust. 1 pkt 2')).toMatchObject({ wartosc: 4126.96, wzor: '(2 × 12380,89 zł) ÷ 2 × 4 ÷ 12' });
  });
  it('art. 48a, dane tylko za późniejsze miesiące okresu: pierwsza część nadal po wszystkich n miesiącach', () => {
    const lista = [{ miesiac: '2027-01', kwota: 20000 }, { miesiac: '2027-02', kwota: 20000 }];
    const w = licz(dg({ chorobowoOd: '2026-11-01', podstawaSkladek: lista }), '2027-03-01');
    expect(w.metoda).toBe('art_48a');
    // pkt 1: jak wyżej 5035,80 (dwa miesiące 2026 r. po 4877,11 liczą się, choć nie mają danych)
    // pkt 2: nadwyżka (20 000 − 6019,80) × 86,29% = 12 063,51 w obu miesiącach; (2 × 12 063,51 ÷ 2) × 4 ÷ 12 = 4021,17
    // razem 5035,80 + 4021,17 = 9056,97
    expect(w.kwota).toBe(9056.97);
  });
  it('średnia z 12 miesięcy na przełomie lat: limit każdego miesiąca ze swojego roku', () => {
    const w = licz(dg({ zadeklarowanaPodstawa: 30000 }), '2027-03-01');
    // okres 03.2026–02.2027: 10 × 23 550 + 2 × 25 082,50 = 285 665; ÷ 12 = 23 805,42; × 86,29% = 20 541,70
    expect(w.kwota).toBe(20541.7);
    expect(w.ograniczenia).toEqual(['limit_dobrowolne']);
  });
  it('poród 1.01.2027, preferencyjne składki od 1.09.2026: podstawa preferencyjna z płacy minimalnej 2026 r.', () => {
    const w = licz(dg({ chorobowoOd: '2026-09-01', zadeklarowanaPodstawa: 1441.8 }), POROD_2027);
    // 30% × 4806 = 1441,80 w każdym miesiącu; × 86,29% = 1244,13 (z płacą minimalną 2027 r. byłoby 1485 × 86,29% = 1281,41)
    expect(w.kwota).toBe(1244.13);
  });
});

describe('niebędący pracownikiem: szacunek z ostatnich znanych miesięcy (lista nie sięga okresu podstawy)', () => {
  const PRAWO = '2028-02-01'; // okres podstawy: 02.2027–01.2028
  const miesiace = (od: string, ile: number, kwota: number) =>
    Array.from({ length: ile }, (_, i) => ({ miesiac: przesunMiesiac(od, i), kwota }));

  it('zlecenie, lista 11.2025–10.2026 po 5000 zł, bez kwoty z ankiety: szacunek zamiast 0 zł', () => {
    const w = licz({ id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2020-01-01', podstawaSkladek: miesiace('2025-11', 12, 5000) }, PRAWO);
    // 5000 × 86,29% = 4314,50
    expect(w.kwota).toBe(4314.5);
    expect(w.metoda).toBe('srednia_12_miesiecy');
    expect(w.ograniczenia).toEqual(['podstawa_z_ostatnich_znanych_miesiecy']);
    expect(w.sciezka.some((k) => k.opis.startsWith('Szacunek') && k.przepis === 'UZ art. 48 ust. 1')).toBe(true);
  });
  it('działalność, lista 2026 r. po 30 000 zł: limit z miesięcy listy (2026 r.), nie z dnia prawa', () => {
    const w = licz(dg({ podstawaSkladek: miesiace('2026-01', 12, 30000) }), PRAWO);
    // każdy miesiąc ograniczony do 23 550 zł (limit 2026 r.); 23 550 × 86,29% = 20 321,30 (z limitem 2027 r. byłoby 21 643,69)
    expect(w.kwota).toBe(20321.3);
    expect(w.ograniczenia).toEqual(['podstawa_z_ostatnich_znanych_miesiecy', 'limit_dobrowolne']);
  });
  it('dwa wpisy z tym samym miesiącem: liczy się jeden, ostatni na liście wygrywa', () => {
    const lista = [{ miesiac: '2025-11', kwota: 9000 }, ...miesiace('2025-11', 12, 5000)];
    const w = licz({ id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2020-01-01', podstawaSkladek: lista }, PRAWO);
    // 12 miesięcy po 5000 zł (dubel 9000 zł przed właściwym wpisem odpada); 5000 × 86,29% = 4314,50 (bez poprawki: 4580,01)
    expect(w.kwota).toBe(4314.5);
    expect(w.sciezka.find((k) => k.opis.startsWith('Szacunek'))?.wzor).toBe('12 mies. od 2025-11 do 2026-10');
  });
  it('dubel miesiąca: późniejszy wpis poprawia wcześniejszy', () => {
    const lista = [...miesiace('2025-11', 12, 5000), { miesiac: '2025-11', kwota: 9000 }];
    const w = licz({ id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2020-01-01', podstawaSkladek: lista }, PRAWO);
    // (11 × 5000 + 9000) ÷ 12 = 5333,33; × 86,29% = 4602,13
    expect(w.kwota).toBe(4602.13);
  });
  it('dubel miesiąca w okresie podstawy (bez szacunku): liczy się raz', () => {
    const lista = [{ miesiac: '2027-03', kwota: 9000 }, ...miesiace('2027-02', 12, 5000)];
    const w = licz({ id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2020-01-01', podstawaSkladek: lista }, PRAWO);
    expect(w.ograniczenia).toEqual([]);
    expect(w.kwota).toBe(4314.5);
  });
  it('NaN, nieskończone i ujemne kwoty w ostatnich 12 miesiącach listy: wcześniejszy poprawny miesiąc wchodzi do szacunku', () => {
    const zle = [Number.NaN, Number.POSITIVE_INFINITY, -100];
    const lista = [{ miesiac: '2025-10', kwota: 5000 }, ...miesiace('2025-11', 12, 0).map((m, i) => ({ ...m, kwota: zle[i % 3] }))];
    const w = licz({ id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2020-01-01', podstawaSkladek: lista }, PRAWO);
    // jedyny poprawny miesiąc: 5000 zł; 5000 × 86,29% = 4314,50 (bez poprawki: 0 zł i brak_danych_o_przychodzie)
    expect(w.kwota).toBe(4314.5);
    expect(w.ograniczenia).toEqual(['podstawa_z_ostatnich_znanych_miesiecy']);
    expect(w.sciezka.find((k) => k.opis.startsWith('Szacunek'))?.wzor).toBe('1 mies. od 2025-10 do 2025-10');
  });
  it('klucz miesiąca spoza RRRR-MM (np. 2025-9) nie wchodzi do szacunku', () => {
    const lista = [...miesiace('2025-11', 12, 5000), { miesiac: '2025-9', kwota: 7000 }];
    const w = licz({ id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2020-01-01', podstawaSkladek: lista }, PRAWO);
    // bez poprawki '2025-9' sortuje się między 2025-12 a 2026-01, wypiera 2025-11 i daje (11 × 5000 + 7000) ÷ 12 → 4458,32
    expect(w.kwota).toBe(4314.5);
    expect(w.sciezka.find((k) => k.opis.startsWith('Szacunek'))?.wzor).toBe('12 mies. od 2025-11 do 2026-10');
  });
  it('kwota z ankiety ma pierwszeństwo przed szacunkiem', () => {
    const w = licz({ id: 'zl', rodzaj: 'zlecenie', chorobowe: 'dobrowolne', od: '2020-01-01', wynagrodzenieMiesieczne: 3000, podstawaSkladek: miesiace('2025-11', 12, 5000) }, PRAWO);
    // 3000 × 86,29% = 2588,70
    expect(w.kwota).toBe(2588.7);
    expect(w.ograniczenia).toEqual([]);
  });
});

describe('art. 43 – podstawa poprzedniego zasiłku', () => {
  const mama = PRZYKLAD_RODZINA.osoby[0];
  const druga: Parametry = {
    ...PARAMETRY_2026,
    obowiazujeOd: '2026-10-01',
    kwoty: { ...PARAMETRY_2026.kwoty, placaMinimalna: 9000 },
  };
  const wersje = [PARAMETRY_2026, druga];

  it('EC-96: zwolnienie w ciąży bez przerwy – podstawa nie zmienia się', () => {
    const zdrowie = { eZLA: [{ od: '2026-09-15', do: '2026-11-30', kodB: true }] };
    const w = obliczPodstawe({ ...mama, zdrowie }, mama.tytuly[0], '2026-12-01', wersje);
    expect(w.metoda).toBe('podstawa_poprzedniego_zasilku');
    expect(w.kwota).toBe(6903.2);
    expect(w.sciezka.some((k) => k.przepis?.includes('UZ art. 43'))).toBe(true);
  });
  it('EC-96 przerwa: pełny miesiąc przerwy – podstawa liczona na nowo', () => {
    const zdrowie = { eZLA: [{ od: '2026-08-01', do: '2026-09-30', kodB: true }] };
    const w = obliczPodstawe({ ...mama, zdrowie }, mama.tytuly[0], '2026-12-01', wersje);
    expect(w.metoda).toBe('srednia_12_miesiecy');
    expect(w.kwota).toBe(7766.1);
  });
  it('zwolnienie zaczynające się po dniu porodu jest pomijane', () => {
    const zdrowie = { eZLA: [{ od: '2026-12-05', do: '2026-12-20', kodB: false }] };
    const w = obliczPodstawe({ ...mama, zdrowie }, mama.tytuly[0], '2026-12-01', wersje);
    expect(w.metoda).toBe('srednia_12_miesiecy');
  });
  it('łańcuch kilku zwolnień bez pełnego miesiąca przerwy liczy od początku łańcucha', () => {
    const zdrowie = {
      eZLA: [
        { od: '2026-09-15', do: '2026-10-10', kodB: true },
        { od: '2026-10-20', do: '2026-11-30', kodB: true },
      ],
    };
    const w = obliczPodstawe({ ...mama, zdrowie }, mama.tytuly[0], '2026-12-01', wersje);
    expect(w.metoda).toBe('podstawa_poprzedniego_zasilku');
    expect(w.kwota).toBe(6903.2);
  });
});

describe('art. 43 – granice łańcucha zwolnień', () => {
  const zla = (od: string, do_: string) => ({ od, do: do_, kodB: true });
  const osoba = (eZLA: { od: string; do: string; kodB: boolean }[]): Osoba => ({ id: 'o1', rola: 'matka', tytuly: [], zdrowie: { eZLA } });

  it('mieszczyPelnyMiesiac: 30.09 → 31.10 to jeszcze nie cały październik, 30.09 → 01.11 tak', () => {
    expect(mieszczyPelnyMiesiac('2026-09-30', '2026-10-31')).toBe(false);
    expect(mieszczyPelnyMiesiac('2026-09-30', '2026-11-01')).toBe(true);
  });
  it('mieszczyPelnyMiesiac: koniec w środku miesiąca nie zalicza tego miesiąca', () => {
    expect(mieszczyPelnyMiesiac('2026-09-15', '2026-10-31')).toBe(false);
    expect(mieszczyPelnyMiesiac('2026-09-15', '2026-11-01')).toBe(true);
  });
  it('mieszczyPelnyMiesiac: luty roku nieprzestępnego i przejście roku', () => {
    expect(mieszczyPelnyMiesiac('2026-01-31', '2026-02-28')).toBe(false);
    expect(mieszczyPelnyMiesiac('2026-01-31', '2026-03-01')).toBe(true);
    expect(mieszczyPelnyMiesiac('2026-12-31', '2027-01-31')).toBe(false);
    expect(mieszczyPelnyMiesiac('2026-12-31', '2027-02-01')).toBe(true);
  });
  it('dwa zwolnienia: przerwa 30.09 → 31.10 łączy łańcuch, 30.09 → 01.11 rozdziela', () => {
    expect(poczatekLancuchaZasilkow(osoba([zla('2026-09-01', '2026-09-30'), zla('2026-10-31', '2026-11-30')]), '2026-12-01')).toBe('2026-09-01');
    expect(poczatekLancuchaZasilkow(osoba([zla('2026-09-01', '2026-09-30'), zla('2026-11-01', '2026-11-30')]), '2026-12-01')).toBe('2026-11-01');
  });
  it('przerwa do dnia powstania prawa: koniec 31.10 → prawo 01.12 to pełny listopad, więc liczymy na nowo', () => {
    expect(poczatekLancuchaZasilkow(osoba([zla('2026-09-01', '2026-10-31')]), '2026-12-01')).toBeUndefined();
    expect(poczatekLancuchaZasilkow(osoba([zla('2026-09-01', '2026-10-31')]), '2026-11-30')).toBe('2026-09-01');
    expect(poczatekLancuchaZasilkow(osoba([zla('2026-09-01', '2026-11-30')]), '2026-12-01')).toBe('2026-09-01');
  });
  it('zwolnienie kończące się po dniu powstania prawa nadal liczy się do łańcucha', () => {
    expect(poczatekLancuchaZasilkow(osoba([zla('2026-11-10', '2026-12-20')]), '2026-12-01')).toBe('2026-11-10');
  });
  it('zwolnienie zaczynające się w dniu powstania prawa albo później jest pomijane', () => {
    expect(poczatekLancuchaZasilkow(osoba([zla('2026-12-01', '2026-12-20')]), '2026-12-01')).toBeUndefined();
  });
  it('zwolnienia nachodzące na siebie i zagnieżdżone: koniec łańcucha to najpóźniejszy koniec', () => {
    const lista = [zla('2026-09-15', '2026-09-20'), zla('2026-09-01', '2026-10-31'), zla('2026-11-20', '2026-11-25')];
    expect(poczatekLancuchaZasilkow(osoba(lista), '2026-12-01')).toBe('2026-09-01');
    const nachodzace = [zla('2026-09-01', '2026-09-30'), zla('2026-09-20', '2026-11-10')];
    expect(poczatekLancuchaZasilkow(osoba(nachodzace), '2026-12-01')).toBe('2026-09-01');
  });
  it('błędne daty i odwrócone zwolnienie są pomijane, bez wyjątku', () => {
    const lista = [zla('abc', '2026-11-30'), zla('2026-11-30', '2026-11-01'), zla('2026-02-30', '2026-11-30')];
    expect(poczatekLancuchaZasilkow(osoba(lista), '2026-12-01')).toBeUndefined();
    expect(poczatekLancuchaZasilkow({ id: 'o1', rola: 'matka', tytuly: [] }, '2026-12-01')).toBeUndefined();
  });
});

describe('B6: składki preferencyjne rozpoznane z kwoty z ankiety, a nie z każdego miesiąca osobno (UZ art. 48a ust. 1 i 5)', () => {
  // Kwota z ankiety to jedna deklaracja z roku, w którym rodzic ją podał. Bez danych za miesiące 2027 r. przenosimy ją
  // na te miesiące bez zmiany rodzaju składek: kto w 2026 r. płacił pełne składki, nie staje się w styczniu 2027 r.
  // płatnikiem preferencyjnym tylko dlatego, że najniższa podstawa wzrosła (5652 → 6019,80 zł).
  it('pełne składki 5652 zł (najniższa podstawa 2026 r.), okres 11.2026–02.2027: miesiące 2027 r. nie są preferencyjne', () => {
    const w = licz(dg({ chorobowoOd: '2026-11-01', zadeklarowanaPodstawa: 5652 }), '2027-03-01');
    expect(w.metoda).toBe('art_48a');
    // pkt 1: (2 × 4877,11 + 2 × 5194,49) ÷ 4 = 5035,80 – najniższa podstawa każdego miesiąca z jego roku
    // pkt 2: nadwyżka 0 (5652 nie przekracza najniższej podstawy żadnego miesiąca)
    expect(w.kwota).toBe(5035.8);
  });
  it('składki preferencyjne 1441,80 zł (30% płacy minimalnej 2026 r.): zostają preferencyjne także w 2027 r.', () => {
    const w = licz(dg({ chorobowoOd: '2026-11-01', zadeklarowanaPodstawa: 1441.8 }), '2027-03-01');
    expect(w.metoda).toBe('art_48a');
    // pkt 1: 2 × (1441,80 × 86,29%) + 2 × (1485 × 86,29%, 30% płacy minimalnej 2027 r.) ÷ 4; nadwyżka 0
    expect(w.kwota).toBe(1262.77);
  });
  it('dane z eZUS za miesiące 2027 r. poniżej najniższej podstawy: te miesiące są preferencyjne (porównanie miesiąc po miesiącu)', () => {
    const lista = [
      { miesiac: '2026-11', kwota: 5652 }, { miesiac: '2026-12', kwota: 5652 },
      { miesiac: '2027-01', kwota: 1485 }, { miesiac: '2027-02', kwota: 1485 },
    ];
    const w = licz(dg({ chorobowoOd: '2026-11-01', podstawaSkladek: lista }), '2027-03-01');
    expect(w.metoda).toBe('art_48a');
    // pkt 1: (2 × 4877,11 + 2 × 1281,41) ÷ 4 = 3079,26; nadwyżka 0
    expect(w.kwota).toBe(3079.26);
  });
});
