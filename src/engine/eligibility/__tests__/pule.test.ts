/**
 * Testy zadania A1 (pule tygodni). Jeden `it` na wiersz tabeli A1 z ZADANIA.md i planu toru A.
 * Konwencja dni (KP art. 183¹ § 2): dzień porodu = 1. dzień urlopu i 1. dzień życia dziecka,
 * więc n-ty dzień życia = poród + (n − 1) dni, a koniec k-tego tygodnia = poród + 7k − 1 dni.
 */
import { describe, expect, it } from 'vitest';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { P, POROD, rodzina } from '../../__tests__/rodziny';
import type { Dziecko, Pule } from '../../types';
import { ustalPule } from '../pule';

const p = P();
/** Termin rodzicielskiego w rodzinie zastępczej niezawodowej – uwaga „do potwierdzenia” (pytanie 37). */
const PRZEPIS_TERMIN_PRZYJECIE = 'KP art. 183 § 4, § 5, art. 182¹c';

function pule(o: Parameters<typeof rodzina>[0] = {}): Pule {
  return ustalPule(rodzina(o), P(o.data ?? POROD));
}

function uwaga(w: Pule, kod: string, przepis?: string) {
  return (w.uwagi ?? []).find((u) => u.kod === kod && (przepis === undefined || u.przepis === przepis));
}

describe('ustalPule – tabela A1', () => {
  it('EC-01: jedno dziecko, poród 1.12.2026', () => {
    const w = ustalPule(PRZYKLAD_RODZINA, p);
    expect(w.macierzynskiTyg).toBe(20);
    expect(w.macierzynskiPrzedPorodemMaxTyg).toBe(6);
    expect(w.obowiazkoweMatkiTyg).toBe(14);
    expect(w.uzupelniajacyTyg).toBe(0);
    expect(w.rodzicielskiTyg).toBe(41);
    expect(w.rodzicielskiNieprzenoszalneTyg).toBe(9);
    expect(w.rodzicielskiMaxZPracaTyg).toBe(82);
    expect(w.rodzicielskiMaxCzesci).toBe(5);
    expect(w.ojcowskiTyg).toBe(2);
    expect(w.rodzicielskiDoKiedy).toBe('2032-12-31');
    expect(w.wniosek815DoKiedy).toBe('2026-12-22');
    expect(w.ojcowskiDoKiedy).toBe('2027-11-30');
    expect(w.macierzynskiOstatniDzien).toBeUndefined();
    expect(w.uwagi ?? []).toEqual([]);
  });

  it('mentor: poród 1.01.2027 (ojcowski do dnia przed 1. urodzinami – pytanie 12)', () => {
    const w = pule({ data: '2027-01-01' });
    expect(w.rodzicielskiDoKiedy).toBe('2033-12-31');
    expect(w.wniosek815DoKiedy).toBe('2027-01-22');
    expect(w.ojcowskiDoKiedy).toBe('2027-12-31');
  });

  it('EC-20: bliźnięta', () => {
    const w = pule({ dzieci: [{}, {}] });
    expect(w.macierzynskiTyg).toBe(31);
    expect(w.rodzicielskiTyg).toBe(43);
    expect(w.rodzicielskiMaxZPracaTyg).toBe(86);
    expect(w.ojcowskiTyg).toBe(2);
  });

  it('EC-21: 3 / 4 / 5 / 6 dzieci', () => {
    const wyniki = [3, 4, 5, 6].map((n) => pule({ dzieci: Array.from({ length: n }, () => ({})) }));
    expect(wyniki.map((w) => w.macierzynskiTyg)).toEqual([33, 35, 37, 37]);
    expect(wyniki.map((w) => w.rodzicielskiTyg)).toEqual([43, 43, 43, 43]);
  });

  it('EC-22: jedno dziecko „Za życiem”', () => {
    const w = pule({ dzieci: [{ zaZyciem: true }] });
    expect(w.rodzicielskiTyg).toBe(65);
    expect(w.rodzicielskiMaxZPracaTyg).toBe(130);
  });

  it('EC-23: bliźnięta, jedno „Za życiem”', () => {
    const w = pule({ dzieci: [{ zaZyciem: true }, {}] });
    expect(w.rodzicielskiTyg).toBe(67);
    expect(w.rodzicielskiMaxZPracaTyg).toBe(134);
  });

  it('EC-24 / A1-c: martwe urodzenie – 8 tygodni, rodzicielski i ojcowski 0, bez „do potwierdzenia” (pytanie 8, odpowiedź ZUS)', () => {
    const w = pule({ dzieci: [{ martwe: true }] });
    expect(w.macierzynskiTyg).toBe(8);
    expect(w.rodzicielskiTyg).toBe(0);
    expect(w.ojcowskiTyg).toBe(0);
    expect(w.rodzicielskiMaxZPracaTyg).toBe(0);
    expect(w.uzupelniajacyTyg).toBe(0);
    expect(w.rodzicielskiDoKiedy).toBeUndefined();
    expect(w.ojcowskiDoKiedy).toBeUndefined();
    expect(uwaga(w, 'DO_POTWIERDZENIA_W_ZUS')).toBeUndefined();
  });

  it('EC-25: zgon w 3. dniu życia – koniec 8. tygodnia po porodzie', () => {
    // zgon 2026-12-03; koniec 8. tygodnia = 2026-12-01 + 55 = 2027-01-25; zgon + 7 = 2026-12-10 → 2027-01-25
    const w = pule({ dzieci: [{ zgon: '2026-12-03' }] });
    expect(w.macierzynskiOstatniDzien).toBe('2027-01-25');
    expect(w.macierzynskiTyg).toBe(8);
  });

  it('EC-25b: zgon w 55. dniu życia – później niż 8 tygodni wychodzi z „7 dni od zgonu”', () => {
    // 55. dzień życia = 2026-12-01 + 54 = 2027-01-24; zgon + 7 = 2027-01-31 > 2027-01-25
    const w = pule({ dzieci: [{ zgon: '2027-01-24' }] });
    expect(w.macierzynskiOstatniDzien).toBe('2027-01-31');
  });

  it('EC-26: zgon w 12. tygodniu – 7 dni od zgonu', () => {
    // 80. dzień życia = 2026-12-01 + 79 = 2027-02-18; zgon + 7 = 2027-02-25 (przed końcem 20 tygodni 2027-04-19)
    const w = pule({ dzieci: [{ zgon: '2027-02-18' }] });
    expect(w.macierzynskiOstatniDzien).toBe('2027-02-25');
  });

  it('EC-27: troje dzieci, jedno martwe – wymiar jak dla dwojga', () => {
    const w = pule({ dzieci: [{}, { martwe: true }, { zaZyciem: true }] });
    expect(w.macierzynskiTyg).toBe(31);
    expect(w.rodzicielskiTyg).toBe(67);
  });

  it('EC-27 (bez „Za życiem”): troje dzieci, jedno martwe – mac 31, rodz 43', () => {
    const w = pule({ dzieci: [{}, { martwe: true }, {}] });
    expect(w.macierzynskiTyg).toBe(31);
    expect(w.rodzicielskiTyg).toBe(43);
  });

  it('EC-28: wcześniak z 26. tygodnia, szpital 10 tygodni', () => {
    // 2026-12-01 … 2027-02-08 = 70 dni w oknie 15 tygodni → 10 tygodni
    const w = pule({ dzieci: [{ tydzienCiazy: 26, masaG: 900, szpital: [{ od: '2026-12-01', do: '2027-02-08' }] }] });
    expect(w.uzupelniajacyTyg).toBe(10);
  });

  it('EC-28b: wcześniak 900 g, szpital 20 tygodni – limit 15', () => {
    // 2026-12-01 … 2027-04-19 = 140 dni; okno 15 tygodni = 105 dni → 15
    const w = pule({ dzieci: [{ tydzienCiazy: 30, masaG: 900, szpital: [{ od: '2026-12-01', do: '2027-04-19' }] }] });
    expect(w.uzupelniajacyTyg).toBe(15);
  });

  it('EC-29: 33. tydzień, 1500 g, szpital 3 tygodnie i 2 dni – niepełny tydzień w górę', () => {
    // 2026-12-01 … 2026-12-23 = 23 dni → ceil(23/7) = 4
    const w = pule({ dzieci: [{ tydzienCiazy: 33, masaG: 1500, szpital: [{ od: '2026-12-01', do: '2026-12-23' }] }] });
    expect(w.uzupelniajacyTyg).toBe(4);
    // bez dnia porodu: 22 dni → też 4 tygodnie, więc bez uwagi „do potwierdzenia”
    expect(uwaga(w, 'DO_POTWIERDZENIA_W_ZUS')).toBeUndefined();
  });

  it('EC-30: 39. tydzień, szpital od 6. do 20. dnia życia – liczymy od 5. dnia', () => {
    // 6. dzień = 2026-12-06, 20. dzień = 2026-12-20; w oknie 5.–56. dnia: 15 dni → ceil(15/7) = 3
    const w = pule({ dzieci: [{ tydzienCiazy: 39, masaG: 3400, szpital: [{ od: '2026-12-06', do: '2026-12-20' }] }] });
    expect(w.uzupelniajacyTyg).toBe(3);
  });

  it('EC-30 (od porodu): donoszone, szpital od 1. do 10. dnia – liczą się dni 5.–10.', () => {
    // pobyt 2026-12-01 … 2026-12-10; dni 5. i 6. to „2 kolejne dni”, pierwszy w 5.–28. dniu;
    // liczymy dni 5.–10. = 6 dni → 1 tydzień
    const w = pule({ dzieci: [{ tydzienCiazy: 40, masaG: 3500, szpital: [{ od: '2026-12-01', do: '2026-12-10' }] }] });
    expect(w.uzupelniajacyTyg).toBe(1);
  });

  it('EC-31: bliźnięta wcześniaki – najniższa masa i najdłuższy pobyt', () => {
    // najniższa masa 950 g → okno 15 tygodni (KP 180² § 1 pkt 1);
    // najdłuższy pobyt: dziecko B 2026-12-01 … 2027-02-28 = 90 dni → ceil(90/7) = 13
    // (z masą dziecka B, 1300 g, okno miałoby 8 tygodni i wyszłoby 8)
    const w = pule({
      dzieci: [
        { tydzienCiazy: 30, masaG: 950, szpital: [{ od: '2026-12-01', do: '2026-12-10' }] },
        { tydzienCiazy: 30, masaG: 1300, szpital: [{ od: '2026-12-01', do: '2027-02-28' }] },
      ],
    });
    expect(w.uzupelniajacyTyg).toBe(13);
  });

  it('EC-44 / A1-d: przysposobienie, limit 14 lat skraca urlop z § 1¹ – do potwierdzenia (pytanie 7)', () => {
    // dziecko ur. 2013-03-01 kończy 14 lat 2027-03-01; 20 tygodni od 2026-12-01 kończyłoby się 2027-04-19
    const w = pule({
      typ: 'przysposobienie',
      przewidywana: false,
      dzieci: [{ dataUrodzenia: '2013-03-01' }],
    });
    expect(w.macierzynskiTyg).toBe(20);
    expect(w.macierzynskiOstatniDzien).toBe('2027-02-28');
    expect(uwaga(w, 'DO_POTWIERDZENIA_W_ZUS', 'KP art. 183 § 3')).toBeDefined();
  });

  it('A1-a: bliźnięta, poród 1.12.2026', () => {
    const w = pule({ dzieci: [{}, {}] });
    expect(w.macierzynskiTyg).toBe(31);
    expect(w.rodzicielskiTyg).toBe(43);
    expect(w.rodzicielskiMaxZPracaTyg).toBe(86);
  });

  it('A1-b / EC-40: przysposobienie 5-latka, uprawomocnienie 10.02.2027', () => {
    // ojcowski: wcześniejsza z (12 miesięcy od uprawomocnienia = 2028-02-10 – termin, nie wiek: KC art. 112 zd. 1,
    // dzień przed 14. urodzinami = 2035-06-14 – wiek: KC art. 112 zd. 2)
    const w = pule({
      typ: 'przysposobienie',
      przewidywana: false,
      dataUprawomocnienia: '2027-02-10',
      dzieci: [{ dataUrodzenia: '2021-06-15' }],
    });
    expect(w.ojcowskiDoKiedy).toBe('2028-02-10');
    expect(w.ojcowskiTyg).toBe(2);
    expect(w.macierzynskiTyg).toBe(20);
    expect(w.macierzynskiPrzedPorodemMaxTyg).toBe(0);
    expect(w.rodzicielskiTyg).toBe(41);
    expect(w.wniosek815DoKiedy).toBe('2026-12-22');
    expect(w.macierzynskiOstatniDzien).toBeUndefined();
  });

  it('A1-e: 39. tydzień, szpital 1 dzień (6. dzień życia) – mniej niż 2 kolejne dni', () => {
    const w = pule({ dzieci: [{ tydzienCiazy: 39, masaG: 3300, szpital: [{ od: '2026-12-06', do: '2026-12-06' }] }] });
    expect(w.uzupelniajacyTyg).toBe(0);
  });

  it('A1-f: 39. tydzień, szpital od 30. dnia życia – pierwszy dzień po 28. dniu', () => {
    // 30. dzień = 2026-12-30
    const w = pule({ dzieci: [{ tydzienCiazy: 39, masaG: 3300, szpital: [{ od: '2026-12-30', do: '2027-01-10' }] }] });
    expect(w.uzupelniajacyTyg).toBe(0);
  });
});

describe('ustalPule – przypadki skrajne', () => {
  it('29 lutego: poród 2028-02-29', () => {
    // 12 miesięcy od 29.02.2028 kończy się 28.02.2029 (brak 29.02), urlop ojcowski do dnia wcześniej
    const w = pule({ data: '2028-02-29', dataAnalizy: '2028-02-01' });
    expect(w.ojcowskiDoKiedy).toBe('2029-02-27');
    expect(w.rodzicielskiDoKiedy).toBe('2034-12-31');
    expect(w.wniosek815DoKiedy).toBe('2028-03-21');
  });

  it('dzieci: [] – liczymy jak jedno dziecko i dodajemy uwagę', () => {
    const w = pule({ dzieci: [] });
    expect(w.macierzynskiTyg).toBe(20);
    expect(w.rodzicielskiTyg).toBe(41);
    expect(uwaga(w, 'LICZBA_DZIECI_NIEPODANA')).toBeDefined();
  });

  it('bliźnięta, jedno martwe – wymiar jak dla jednego dziecka, rodzicielski do potwierdzenia', () => {
    const w = pule({ dzieci: [{}, { martwe: true }] });
    expect(w.macierzynskiTyg).toBe(20);
    expect(w.rodzicielskiTyg).toBe(41);
    expect(uwaga(w, 'DO_POTWIERDZENIA_W_ZUS')).toBeDefined();
  });

  it('matka z orzeczeniem o niezdolności do samodzielnej egzystencji – obowiązkowo 8 tygodni', () => {
    const w = pule({
      osoby: [{ id: 'mama', rola: 'matka', tytuly: [], zdrowie: { orzeczenieNiezdolnosciSamodzielnejEgzystencji: true } }],
    });
    expect(w.obowiazkoweMatkiTyg).toBe(8);
  });

  it('EC-41: rodzina zastępcza niezawodowa, dziecko 2,5 roku', () => {
    const w = pule({ typ: 'rodzina_zastepcza_niezawodowa', przewidywana: false, dzieci: [{ dataUrodzenia: '2024-05-10' }] });
    expect(w.macierzynskiTyg).toBe(20);
    expect(w.macierzynskiPrzedPorodemMaxTyg).toBe(0);
    expect(w.rodzicielskiTyg).toBe(41);
    expect(w.ojcowskiTyg).toBe(0);
    expect(w.rodzicielskiDoKiedy).toBe('2030-12-31');
    expect(w.wniosek815DoKiedy).toBe('2026-12-22');
    expect(uwaga(w, 'DO_POTWIERDZENIA_W_ZUS', PRZEPIS_TERMIN_PRZYJECIE)).toBeUndefined();
  });

  it('rodzina zastępcza, dziecko 6,5 roku – termin rodzicielskiego przed końcem urlopu (pytanie 37)', () => {
    // ur. 2020-06-01: koniec roku, w którym kończy 6 lat = 2026-12-31;
    // urlop 20 + 41 tygodni od 2026-12-01 kończy się 2028-01-31 → uwaga
    const w = pule({ typ: 'rodzina_zastepcza_niezawodowa', przewidywana: false, dzieci: [{ dataUrodzenia: '2020-06-01' }] });
    expect(w.macierzynskiTyg).toBe(20);
    expect(w.rodzicielskiDoKiedy).toBe('2026-12-31');
    expect(uwaga(w, 'DO_POTWIERDZENIA_W_ZUS', PRZEPIS_TERMIN_PRZYJECIE)).toBeDefined();
  });

  it('EC-42: rodzina zastępcza zawodowa – pule zerowe', () => {
    const w = pule({ typ: 'rodzina_zastepcza_zawodowa', przewidywana: false, dzieci: [{ dataUrodzenia: '2024-05-10' }] });
    expect(w.macierzynskiTyg).toBe(0);
    expect(w.rodzicielskiTyg).toBe(0);
    expect(w.ojcowskiTyg).toBe(0);
    expect(w.wniosek815DoKiedy).toBeUndefined();
  });

  it('EC-43: rodzina zastępcza, dziecko 8 lat bez odroczenia – pule zerowe', () => {
    const w = pule({ typ: 'rodzina_zastepcza_niezawodowa', przewidywana: false, dzieci: [{ dataUrodzenia: '2018-06-01' }] });
    expect(w.macierzynskiTyg).toBe(0);
    expect(w.rodzicielskiTyg).toBe(0);
  });

  it('EC-41: rodzina zastępcza, dziecko 8 lat z odroczonym obowiązkiem szkolnym – limit 10 lat', () => {
    const dziecko: Dziecko = { dataUrodzenia: '2018-06-01', odroczonyObowiazekSzkolny: true };
    const w = pule({ typ: 'rodzina_zastepcza_niezawodowa', przewidywana: false, dzieci: [dziecko] });
    expect(w.macierzynskiTyg).toBe(20);
  });

  it('przysposobienie: rodzicielski do dnia przed 14. urodzinami dziecka, bez uwagi (KP 183 § 4¹, pytanie 37)', () => {
    // ur. 2021-06-15 → 14 lat kończy 2035-06-15, ostatni dzień 2035-06-14
    const w = pule({
      typ: 'przysposobienie',
      przewidywana: false,
      dataUprawomocnienia: '2027-02-10',
      dzieci: [{ dataUrodzenia: '2021-06-15' }],
    });
    expect(w.rodzicielskiDoKiedy).toBe('2035-06-14');
    expect(uwaga(w, 'DO_POTWIERDZENIA_W_ZUS')).toBeUndefined();
  });

  it('przysposobienie dwojga dzieci – limit wieku liczony dla najstarszego', () => {
    // starsze ur. 2013-03-01: 14 lat kończy 2027-03-01 → urlop najpóźniej 2027-02-28 (31 tyg. kończyłoby się 2027-07-05);
    // rodzicielski: dzień przed 14. urodzinami starszego dziecka = 2027-02-28 (KP 183 § 4¹)
    const w = pule({
      typ: 'przysposobienie',
      przewidywana: false,
      dataUprawomocnienia: '2027-02-10',
      dzieci: [{ dataUrodzenia: '2024-01-01' }, { dataUrodzenia: '2013-03-01' }],
    });
    expect(w.macierzynskiTyg).toBe(31);
    expect(w.macierzynskiOstatniDzien).toBe('2027-02-28');
    expect(w.rodzicielskiDoKiedy).toBe('2027-02-28');
    expect(w.ojcowskiDoKiedy).toBe('2027-02-28');
  });

  it('przysposobienie bez daty uprawomocnienia – uwaga o brakujących danych', () => {
    const w = pule({ typ: 'przysposobienie', przewidywana: false, dzieci: [{ dataUrodzenia: '2021-06-15' }] });
    expect(w.ojcowskiTyg).toBe(2);
    expect(uwaga(w, 'BRAK_DATY_UPRAWOMOCNIENIA')).toBeDefined();
  });

  it('matka porzuciła dziecko – obowiązkowo 8 tygodni (KP 180 § 13)', () => {
    const w = pule({ osoby: [{ id: 'mama', rola: 'matka', tytuly: [], zdrowie: { porzucenieDziecka: '2027-02-01' } }] });
    expect(w.obowiazkoweMatkiTyg).toBe(8);
  });

  it('zgon matki – bez minimum (KP 180 § 12, § 15)', () => {
    const w = pule({ osoby: [{ id: 'mama', rola: 'matka', tytuly: [], zdrowie: { zgon: '2026-12-20' } }] });
    expect(w.obowiazkoweMatkiTyg).toBe(0);
  });

  it('matka w szpitalu przy porodzie – nadal 14 tygodni (§ 10 ocenia walidacja)', () => {
    const w = pule({
      osoby: [{ id: 'mama', rola: 'matka', tytuly: [], zdrowie: { pobytWSzpitalu: [{ od: '2026-12-01', do: '2026-12-04' }] } }],
    });
    expect(w.obowiazkoweMatkiTyg).toBe(14);
  });

  it('bliźnięta, jedno zmarło w 10. dniu (przed upływem 8 tygodni) – wymiar dla jednego dziecka', () => {
    // po zgonie żyje 1 dziecko → 20 tyg. (do 2027-04-19); zgon 2026-12-10 + 7 = 2026-12-17 < 2027-04-19
    const w = pule({ dzieci: [{}, { zgon: '2026-12-10' }] });
    expect(w.macierzynskiTyg).toBe(20);
    expect(w.macierzynskiOstatniDzien).toBeUndefined();
    expect(uwaga(w, 'DO_POTWIERDZENIA_W_ZUS')).toBeDefined();
  });

  it('bliźnięta zmarłe w różnych terminach – po każdym zgonie wymiar według żyjących', () => {
    // start: 2 dzieci → 31 tyg. (do 2027-07-05)
    // zgon 2026-12-10: żyje 1 → 20 tyg. (do 2027-04-19), nie krócej niż zgon + 7 = 2026-12-17 → koniec 2027-04-19
    // zgon 2027-05-20: po końcu urlopu (2027-04-19) – nie zmienia urlopu macierzyńskiego
    // rodzicielski: zachowany 7 dni od ostatniego zgonu → 2027-05-27 (KP 182¹g, 180¹ § 2)
    const w = pule({ dzieci: [{ zgon: '2026-12-10' }, { zgon: '2027-05-20' }] });
    expect(w.macierzynskiTyg).toBe(20);
    expect(w.macierzynskiOstatniDzien).toBeUndefined();
    expect(w.rodzicielskiDoKiedy).toBe('2027-05-27');
    expect(uwaga(w, 'DO_POTWIERDZENIA_W_ZUS')).toBeDefined();
  });

  it('uzupełniający: martwe dziecko nie wchodzi do najniższej masy', () => {
    // żywe dziecko 33. tydzień, 1500 g → okno 8 tygodni (56 dni) mimo martwego bliźniaka 800 g;
    // pobyt 2026-12-01 … 2027-02-28 (90 dni) → 56 dni w oknie → 8 tygodni (z oknem 15 tygodni byłoby 13)
    const w = pule({
      dzieci: [
        { tydzienCiazy: 33, masaG: 1500, szpital: [{ od: '2026-12-01', do: '2027-02-28' }] },
        { tydzienCiazy: 33, masaG: 800, martwe: true },
      ],
    });
    expect(w.uzupelniajacyTyg).toBe(8);
  });

  it('uzupełniający: wliczenie dnia porodu zmienia wynik – uwaga (pytanie 24)', () => {
    // 32. tydzień, pobyt 2026-12-01 … 2026-12-08 = 8 dni → 2 tygodnie; bez dnia porodu 7 dni → 1 tydzień
    const w = pule({ dzieci: [{ tydzienCiazy: 32, masaG: 1800, szpital: [{ od: '2026-12-01', do: '2026-12-08' }] }] });
    expect(w.uzupelniajacyTyg).toBe(2);
    expect(uwaga(w, 'DO_POTWIERDZENIA_W_ZUS', 'KP art. 180² § 1')).toBeDefined();
  });

  it('uzupełniający, donoszone: pobyt zaczyna się 28. dnia i trwa 2 dni – liczy się', () => {
    // 28. dzień = 2026-12-28; pobyt 2026-12-28 … 2026-12-29 = 2 dni → 1 tydzień
    const w = pule({ dzieci: [{ tydzienCiazy: 38, masaG: 3100, szpital: [{ od: '2026-12-28', do: '2026-12-29' }] }] });
    expect(w.uzupelniajacyTyg).toBe(1);
  });

  it('uzupełniający, 28.–37. tydzień: dwa pobyty się sumuje (KP 180² § 3)', () => {
    // 5 dni + 4 dni = 9 dni → 2 tygodnie
    const w = pule({
      dzieci: [
        {
          tydzienCiazy: 32,
          masaG: 1800,
          szpital: [
            { od: '2026-12-01', do: '2026-12-05' },
            { od: '2026-12-20', do: '2026-12-23' },
          ],
        },
      ],
    });
    expect(w.uzupelniajacyTyg).toBe(2);
  });

  it('EC-45: uzupełniający przy przyjęciu – liczy się tylko pobyt po przyjęciu', () => {
    // dziecko ur. 2026-11-01 (32. tydzień, 1200 g), szpital do 2026-12-10, przyjęcie 2026-12-01:
    // liczą się 2026-12-01 … 2026-12-10 = 10 dni (w oknie 8 tygodni od urodzenia) → 2 tygodnie
    const w = pule({
      typ: 'przysposobienie',
      przewidywana: false,
      dzieci: [{ dataUrodzenia: '2026-11-01', tydzienCiazy: 32, masaG: 1200, szpital: [{ od: '2026-11-01', do: '2026-12-10' }] }],
    });
    expect(w.uzupelniajacyTyg).toBe(2);
  });

  it('bliźnięta, jedno zmarło w 19. tygodniu – urlop nie krócej niż 7 dni od zgonu', () => {
    // wymiar dla 1 żyjącego: 20 tyg. → 2027-04-19; zgon 2027-04-15 + 7 = 2027-04-22 (≤ 31 tyg.)
    const w = pule({ dzieci: [{}, { zgon: '2027-04-15' }] });
    expect(w.macierzynskiTyg).toBe(20);
    expect(w.macierzynskiOstatniDzien).toBe('2027-04-22');
  });
});
