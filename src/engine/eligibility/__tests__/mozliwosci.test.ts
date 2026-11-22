/**
 * Testy A3: ustalMozliwosci (ZADANIA.md „A3. Możliwości i ryzyka”, plan toru A: tabela brakujących możliwości).
 * Pule liczy A1 (`ustalPule`). Testy sprawdzają kody, daty i liczby, nie treść (wyjątek: daty w konsekwencjach
 * i znacznik „wymaga potwierdzenia w ZUS”, które są liczbami albo stałym kodem tekstu).
 */
import { describe, expect, it } from 'vitest';
import { dzialalnosc, etat, mama, P, rodzina, tata, zlecenie } from '../../__tests__/rodziny';
import type { Mozliwosc, Osoba, Rodzina } from '../../types';
import { ustalMozliwosci } from '../mozliwosci';
import { ustalPule } from '../pule';
import { proc, wniosek815PrzedPorodem } from '../mozliwosciTeksty';
import { dataSlownie, PRZYKLAD_CZLONKA_RODZINY } from '../uprawnieniaTeksty';

const p = P();

const KODY: Mozliwosc['kod'][] = [
  'urlop_przed_porodem',
  'rezygnacja_matki_i_przejecie',
  'wariant_815',
  'podzial_rodzicielskiego',
  'rodzicielski_jednoczesnie',
  'laczenie_z_praca',
  'ojcowski_w_czesciach',
  'uzupelniajacy',
  'przejecie_sytuacja_szczegolna',
];

function mozliwosci(r: Rodzina): Mozliwosc[] {
  return ustalMozliwosci(r, ustalPule(r, p), p);
}

function m(r: Rodzina, kod: Mozliwosc['kod']): Mozliwosc {
  const w = mozliwosci(r).filter((x) => x.kod === kod);
  expect(w, kod).toHaveLength(1);
  return w[0];
}

const para = (o: Partial<Parameters<typeof rodzina>[0]> = {}) => rodzina({ osoby: [mama(), tata()], ...o });
const zOrzeczeniem = (): Osoba => mama([etat()], { zdrowie: { orzeczenieNiezdolnosciSamodzielnejEgzystencji: true } });

describe('A3: zawsze 9 możliwości', () => {
  it('EC-01: dokładnie 9 wpisów, po jednym na kod, w stałej kolejności', () => {
    const l = mozliwosci(rodzina());
    expect(l.map((x) => x.kod)).toEqual(KODY);
    for (const x of l) {
      expect(x.przepis, x.kod).not.toBe('');
      expect(x.opis, x.kod).not.toBe('');
      expect(Array.isArray(x.konsekwencje)).toBe(true);
    }
  });

  it('para, przyjęcie dziecka i rodzina bez ubezpieczenia też mają 9 wpisów', () => {
    for (const r of [
      para(),
      rodzina({ osoby: [{ id: 'p1', rola: 'przyjmujacy', tytuly: [etat()] }], typ: 'przysposobienie', dzieci: [{ dataUrodzenia: '2024-05-01' }] }),
      rodzina({ osoby: [mama([zlecenie({ chorobowe: 'brak' })])] }),
      rodzina({ osoby: [mama()], dzieci: [] }),
    ]) {
      expect(mozliwosci(r).map((x) => x.kod)).toEqual(KODY);
    }
  });
});

describe('A3: tabela z ZADANIA.md', () => {
  it('mama sama, EC-01: wariant 81,5% dostępny do 2026-12-22', () => {
    expect(m(rodzina(), 'wariant_815')).toMatchObject({ dostepna: true, odKiedy: '2026-12-01', doKiedy: '2026-12-22', ktoDecyduje: 'mama' });
  });

  it('mama sama, EC-01: rezygnacja matki niedostępna (brak drugiej osoby), od 2027-03-09', () => {
    expect(m(rodzina(), 'rezygnacja_matki_i_przejecie')).toMatchObject({ dostepna: false, odKiedy: '2027-03-09' });
  });

  it('mama + tata: rezygnacja dostępna od 2027-03-09; wnioski 7 i 14 dni przed, tata od dnia po mamie', () => {
    const x = m(para(), 'rezygnacja_matki_i_przejecie');
    expect(x).toMatchObject({ dostepna: true, odKiedy: '2027-03-09', doKiedy: '2027-04-19', ktoDecyduje: 'mama' });
    const tekst = x.konsekwencje.join(' ');
    expect(tekst).toContain(dataSlownie('2027-03-02')); // wniosek mamy: 7 dni przed powrotem
    expect(tekst).toContain(dataSlownie('2027-02-23')); // wniosek taty: 14 dni przed przejęciem
    expect(tekst).toContain(dataSlownie('2027-03-09')); // tata zaczyna dzień po ostatnim dniu mamy
  });

  it('mama z orzeczeniem o niezdolności do samodzielnej egzystencji: przejęcie po 8 tygodniach', () => {
    const x = m(rodzina({ osoby: [zOrzeczeniem(), tata()] }), 'przejecie_sytuacja_szczegolna');
    expect(x).toMatchObject({ dostepna: true, odKiedy: '2027-01-26', doKiedy: '2027-04-19', ktoDecyduje: 'mama' });
  });

  it('poród 30 dni temu: wariant 81,5% niedostępny, opis mówi, że termin minął', () => {
    const x = m(rodzina({ data: '2026-10-22', przewidywana: false }), 'wariant_815');
    expect(x).toMatchObject({ dostepna: false, doKiedy: '2026-11-12' });
    expect(x.opis).toMatch(/minął/);
  });

  it('zlecenie: łączenie z pracą niedostępne (przepis dotyczy pracownika, pytanie 10)', () => {
    const x = m(rodzina({ osoby: [mama([zlecenie()])] }), 'laczenie_z_praca');
    expect(x.dostepna).toBe(false);
    expect(x.opis).toContain('potwierdzenia w ZUS');
  });

  it('działalność: łączenie z pracą niedostępne', () => {
    expect(m(rodzina({ osoby: [mama([dzialalnosc()])] }), 'laczenie_z_praca').dostepna).toBe(false);
  });

  it('etat: łączenie z pracą dostępne od początku rodzicielskiego', () => {
    expect(m(rodzina(), 'laczenie_z_praca')).toMatchObject({ dostepna: true, odKiedy: '2027-04-20', doKiedy: '2032-12-31', ktoDecyduje: 'mama' });
  });
});

describe('A3: brakujące możliwości z planu', () => {
  it('urlop przed porodem: do 6 tygodni przed przewidywaną datą, do dnia przed porodem', () => {
    expect(m(rodzina(), 'urlop_przed_porodem')).toMatchObject({ dostepna: true, odKiedy: '2026-10-20', doKiedy: '2026-11-30', ktoDecyduje: 'mama' });
  });

  it('urlop przed porodem: niedostępny, gdy poród już był', () => {
    expect(m(rodzina({ data: '2026-11-15', przewidywana: false }), 'urlop_przed_porodem').dostepna).toBe(false);
  });

  it('urlop przed porodem: niedostępny bez prawa do zasiłku macierzyńskiego (EC-03)', () => {
    expect(m(rodzina({ osoby: [mama([zlecenie({ chorobowe: 'brak' })])] }), 'urlop_przed_porodem').dostepna).toBe(false);
  });

  it('urlop przed porodem: niedostępny przy przyjęciu dziecka', () => {
    const r = rodzina({ osoby: [{ id: 'p1', rola: 'przyjmujacy', tytuly: [etat()] }], typ: 'przysposobienie', dzieci: [{ dataUrodzenia: '2024-05-01' }] });
    expect(m(r, 'urlop_przed_porodem').dostepna).toBe(false);
  });

  it('podział rodzicielskiego: od dnia po macierzyńskim do końca roku 6. urodzin', () => {
    expect(m(rodzina(), 'podzial_rodzicielskiego')).toMatchObject({ dostepna: true, odKiedy: '2027-04-20', doKiedy: '2032-12-31' });
  });

  it('podział rodzicielskiego: niedostępny przy martwym urodzeniu (pula 0)', () => {
    expect(m(rodzina({ dzieci: [{ martwe: true }], przewidywana: false }), 'podzial_rodzicielskiego').dostepna).toBe(false);
  });

  it('EC-56: mama nieubezpieczona, tata na etacie – rodzicielski taty od dnia porodu, 81,5% niedostępne', () => {
    const r = rodzina({ osoby: [mama([zlecenie({ chorobowe: 'brak' })]), tata()] });
    expect(m(r, 'podzial_rodzicielskiego')).toMatchObject({ dostepna: true, odKiedy: '2026-12-01', ktoDecyduje: 'tata' });
    expect(m(r, 'wariant_815').dostepna).toBe(false);
    expect(m(r, 'rezygnacja_matki_i_przejecie').dostepna).toBe(false);
  });

  it('EC-56 (pytania 6 i 14, odpowiedź ZUS): tata ma pulę bez 9 tygodni mamy; 81,5% bez „do potwierdzenia”, wniosek składa mama', () => {
    const r = rodzina({ osoby: [mama([zlecenie({ chorobowe: 'brak' })]), tata()] });
    const w = m(r, 'wariant_815');
    expect(w.dostepna).toBe(false);
    expect(w.opis).not.toContain('potwierdzenia w ZUS');
    expect(w.opis).toContain(proc(p.stawkiProc.rodzicielski));
    expect(m(r, 'podzial_rodzicielskiego').opis).toContain(`(${p.wymiaryTyg.rodzicielski1 - p.wymiaryTyg.rodzicielskiNieprzenoszalne} tygod`);
  });

  it('EC-56 z mamą bez tytułu: to samo (wariant 81,5% niedostępny, bez „do potwierdzenia”)', () => {
    const w = m(rodzina({ osoby: [mama([]), tata()] }), 'wariant_815');
    expect(w.dostepna).toBe(false);
    expect(w.opis).not.toContain('potwierdzenia w ZUS');
  });

  it('rodzicielski jednocześnie: niedostępny dla jednej osoby', () => {
    expect(m(rodzina(), 'rodzicielski_jednoczesnie').dostepna).toBe(false);
  });

  it('rodzicielski jednocześnie: dostępny dla pary; nakładanie się z macierzyńskim do potwierdzenia (pytanie 16)', () => {
    const x = m(para(), 'rodzicielski_jednoczesnie');
    expect(x).toMatchObject({ dostepna: true, odKiedy: '2027-04-20', doKiedy: '2032-12-31' });
    expect(x.konsekwencje.join(' ')).toContain('potwierdzenia w ZUS');
  });

  it('ojcowski w częściach: niedostępny bez taty', () => {
    expect(m(rodzina(), 'ojcowski_w_czesciach').dostepna).toBe(false);
  });

  it('ojcowski w częściach: tata, od dnia porodu do dnia przed 1. urodzinami', () => {
    expect(m(para(), 'ojcowski_w_czesciach')).toMatchObject({ dostepna: true, odKiedy: '2026-12-01', doKiedy: '2027-11-30', ktoDecyduje: 'tata' });
  });

  it('ojcowski w częściach: niedostępny po terminie', () => {
    expect(m(para({ przewidywana: false, dataAnalizy: '2027-12-05' }), 'ojcowski_w_czesciach').dostepna).toBe(false);
  });

  it('uzupełniający: niedostępny bez pobytu dziecka w szpitalu (EC-01)', () => {
    expect(m(rodzina(), 'uzupelniajacy').dostepna).toBe(false);
  });

  it('uzupełniający: wcześniak 30. tydzień, 1500 g, 20 dni w szpitalu → 3 tygodnie po macierzyńskim', () => {
    const r = rodzina({
      przewidywana: false,
      dataAnalizy: '2026-12-21',
      dzieci: [{ tydzienCiazy: 30, masaG: 1500, szpital: [{ od: '2026-12-01', do: '2026-12-20' }] }],
    });
    expect(ustalPule(r, p).uzupelniajacyTyg).toBe(3);
    expect(m(r, 'uzupelniajacy')).toMatchObject({ dostepna: true, odKiedy: '2027-04-20', doKiedy: '2027-05-10', ktoDecyduje: 'mama' });
  });
});

describe('A3: przejęcie w sytuacji szczególnej', () => {
  it('bez sytuacji szczególnej: niedostępne, informacyjnie od 8. tygodnia', () => {
    expect(m(para(), 'przejecie_sytuacja_szczegolna')).toMatchObject({ dostepna: false, odKiedy: '2027-01-26' });
  });

  it('orzeczenie, ale nie ma drugiej osoby: niedostępne', () => {
    expect(m(rodzina({ osoby: [zOrzeczeniem()] }), 'przejecie_sytuacja_szczegolna').dostepna).toBe(false);
  });

  it('zgon matki: przejęcie od dnia po zgonie', () => {
    const r = rodzina({ osoby: [mama([etat()], { zdrowie: { zgon: '2027-01-10' } }), tata()], przewidywana: false, dataAnalizy: '2027-01-12' });
    expect(m(r, 'przejecie_sytuacja_szczegolna')).toMatchObject({ dostepna: true, odKiedy: '2027-01-11', ktoDecyduje: 'tata' });
  });

  it('matka w szpitalu po porodzie: przejęcie nie wcześniej niż po 8 tygodniach, do końca pobytu', () => {
    const r = rodzina({ osoby: [mama([etat()], { zdrowie: { pobytWSzpitalu: [{ od: '2027-01-05', do: '2027-02-10' }] } }), tata()] });
    expect(m(r, 'przejecie_sytuacja_szczegolna')).toMatchObject({ dostepna: true, odKiedy: '2027-01-26', doKiedy: '2027-02-10' });
  });

  it('porzucenie dziecka 2026-12-10: od 8. tygodnia (późniejsza z dat)', () => {
    const r = rodzina({ osoby: [mama([etat()], { zdrowie: { porzucenieDziecka: '2026-12-10' } }), tata()], przewidywana: false, dataAnalizy: '2026-12-15' });
    expect(m(r, 'przejecie_sytuacja_szczegolna')).toMatchObject({ dostepna: true, odKiedy: '2027-01-26' });
  });

  it('inny członek rodziny: dostępne z dopiskiem „wymaga potwierdzenia w ZUS” (pytanie 21)', () => {
    const babcia: Osoba = { id: 'babcia', rola: 'inny_czlonek_rodziny', tytuly: [etat({ id: 'etat-babci' })] };
    const x = m(rodzina({ osoby: [zOrzeczeniem(), babcia] }), 'przejecie_sytuacja_szczegolna');
    expect(x.dostepna).toBe(true);
    expect(x.konsekwencje.join(' ')).toContain('potwierdzenia w ZUS');
    // Odpowiedź ZUS na stoisku 21.11, pytanie nr 21: przykład – dziadkowie albo rodzeństwo mamy.
    expect(x.konsekwencje.join(' ')).toContain(PRZYKLAD_CZLONKA_RODZINY);
  });
});

describe('A3: przypadki skrajne możliwości', () => {
  it('rodzina bez osób: 9 wpisów, wszystkie niedostępne', () => {
    const l = mozliwosci(rodzina({ osoby: [] }));
    expect(l.map((x) => x.kod)).toEqual(KODY);
    expect(l.every((x) => !x.dostepna)).toBe(true);
  });

  it('poród 29 lutego 2028 (rok przestępny): terminy liczone po dniach kalendarzowych', () => {
    const r = rodzina({ data: '2028-02-29', dataAnalizy: '2028-01-10' });
    expect(m(r, 'urlop_przed_porodem')).toMatchObject({ odKiedy: '2028-01-18', doKiedy: '2028-02-28' });
    expect(m(r, 'wariant_815')).toMatchObject({ dostepna: true, doKiedy: '2028-03-21' });
    const para2028 = rodzina({ osoby: [mama(), tata()], data: '2028-02-29', dataAnalizy: '2028-01-10' });
    expect(m(para2028, 'rezygnacja_matki_i_przejecie').odKiedy).toBe('2028-06-06');
  });

  it('rezygnacja matki po końcu urlopu macierzyńskiego: niedostępna', () => {
    expect(m(para({ przewidywana: false, dataAnalizy: '2027-04-20' }), 'rezygnacja_matki_i_przejecie').dostepna).toBe(false);
  });

  it('martwe urodzenie: rezygnacja niedostępna (urlop krótszy niż 14 tygodni)', () => {
    const r = rodzina({ osoby: [mama(), tata()], dzieci: [{ martwe: true }], przewidywana: false });
    expect(m(r, 'rezygnacja_matki_i_przejecie').dostepna).toBe(false);
  });

  it('bliźnięta: przejęcie od 15. tygodnia do końca 31 tygodni macierzyńskiego', () => {
    expect(m(para({ dzieci: [{}, {}] }), 'rezygnacja_matki_i_przejecie')).toMatchObject({ dostepna: true, odKiedy: '2027-03-09', doKiedy: '2027-07-05' });
  });

  it('tata z działalnością: rezygnacja dostępna, bez terminu wniosku do pracodawcy', () => {
    const x = m(rodzina({ osoby: [mama(), tata([dzialalnosc({ id: 'dz-taty' })])] }), 'rezygnacja_matki_i_przejecie');
    expect(x.dostepna).toBe(true);
    expect(x.konsekwencje.join(' ')).not.toContain(dataSlownie('2027-02-23'));
  });

  it('mama na zleceniu: rezygnacja bez terminu 7 dni do pracodawcy (treść o ZAM)', () => {
    const x = m(rodzina({ osoby: [mama([zlecenie()]), tata()] }), 'rezygnacja_matki_i_przejecie');
    expect(x.dostepna).toBe(true);
    expect(x.konsekwencje.join(' ')).not.toContain(dataSlownie('2027-03-02'));
    expect(x.konsekwencje.join(' ')).toContain('ZAM');
  });
});

describe('A3: konsekwencje z tabeli planu (liczby z parametrów)', () => {
  it('podział rodzicielskiego: najwyżej 5 części, wniosek 21 dni przed każdą', () => {
    const x = m(rodzina(), 'podzial_rodzicielskiego');
    expect(x.opis).toContain(`najwyżej ${p.limity.rodzicielskiMaxCzesci} części`);
    expect(x.konsekwencje.join(' ')).toContain(`${p.terminyDni.wniosekRodzicielskiPrzed} dni przed jej początkiem`);
  });

  it('podział rodzicielskiego (pytanie 39, odpowiedź ZUS): limit części łącznie dla obojga, bez „do potwierdzenia”', () => {
    const x = m(para(), 'podzial_rodzicielskiego');
    expect(x.konsekwencje.join(' ')).toContain(`najwyżej ${p.limity.rodzicielskiMaxCzesci} części łącznie dla obojga rodziców`);
    expect(x.konsekwencje.join(' ')).not.toContain('potwierdzenia w ZUS');
  });

  it('rezygnacja matki (pytanie 5, odpowiedź ZUS): tata przejmuje stawkę 81,5%; warunek 1 dnia rodzicielskiego, bez „do potwierdzenia”', () => {
    const x = m(para(), 'rezygnacja_matki_i_przejecie');
    const t = x.konsekwencje.join(' ');
    expect(t).not.toContain('potwierdzenia w ZUS');
    expect(t).toContain(proc(p.stawkiProc.wariant815));
    expect(t).toContain(proc(p.stawkiProc.rodzicielski));
  });

  it('wariant 81,5% przed porodem (pytanie 23): wniosek tylko razem z urlopem przed porodem, inaczej do terminu – do potwierdzenia', () => {
    const x = m(rodzina(), 'wariant_815');
    expect(x.konsekwencje).toContain(wniosek815PrzedPorodem(p, '2026-12-22'));
    expect(wniosek815PrzedPorodem(p, '2026-12-22')).toContain(dataSlownie('2026-12-22'));
    expect(wniosek815PrzedPorodem(p, '2026-12-22')).toContain('potwierdzenia w ZUS');
  });

  it('wariant 81,5% po porodzie: bez zdania o wniosku przed porodem', () => {
    const x = m(rodzina({ przewidywana: false, dataAnalizy: '2026-12-05' }), 'wariant_815');
    expect(x.konsekwencje).not.toContain(wniosek815PrzedPorodem(p, '2026-12-22'));
  });

  it('ojcowski: 2 części, każda co najmniej 7 dni', () => {
    const x = m(para(), 'ojcowski_w_czesciach');
    expect(x.opis).toContain(`w ${p.limity.ojcowskiMaxCzesci} częściach`);
    expect(x.opis).toContain(`co najmniej ${p.limity.ojcowskiMinDniCzesci} dni`);
  });

  it('uzupełniający: wniosek 21 dni przed końcem macierzyńskiego (do 29 marca 2027)', () => {
    const r = rodzina({
      przewidywana: false,
      dataAnalizy: '2026-12-21',
      dzieci: [{ tydzienCiazy: 30, masaG: 1500, szpital: [{ od: '2026-12-01', do: '2026-12-20' }] }],
    });
    expect(m(r, 'uzupelniajacy').konsekwencje.join(' ')).toContain(dataSlownie('2027-03-29'));
  });
});

describe('A3: zgon albo porzucenie dziecka przez mamę', () => {
  const poZgonie = () =>
    rodzina({ osoby: [mama([etat()], { zdrowie: { zgon: '2026-12-05' } }), tata()], przewidywana: false, dataAnalizy: '2026-12-08' });
  const poPorzuceniu = () =>
    rodzina({ osoby: [mama([etat()], { zdrowie: { porzucenieDziecka: '2026-12-05' } }), tata()], przewidywana: false, dataAnalizy: '2026-12-08' });

  for (const [nazwaPrzypadku, r] of [
    ['zgon', poZgonie],
    ['porzucenie', poPorzuceniu],
  ] as const) {
    it(`${nazwaPrzypadku}: bez rezygnacji mamy; 81,5% decyduje tata, z dopiskiem „wymaga potwierdzenia w ZUS”`, () => {
      expect(m(r(), 'rezygnacja_matki_i_przejecie').dostepna).toBe(false);
      const w = m(r(), 'wariant_815');
      expect(w).toMatchObject({ dostepna: true, ktoDecyduje: 'tata', doKiedy: '2026-12-22' });
      expect(w.opis).toContain('potwierdzenia w ZUS');
    });

    it(`${nazwaPrzypadku}: mama nie decyduje o urlopie rodzicielskim`, () => {
      expect(m(r(), 'podzial_rodzicielskiego').ktoDecyduje).toBe('tata');
      expect(m(r(), 'rodzicielski_jednoczesnie').dostepna).toBe(false);
    });
  }
});

describe('A3: przysposobienie', () => {
  const przyjecie = () =>
    rodzina({
      osoby: [
        { id: 'p1', rola: 'przyjmujacy', tytuly: [etat()] },
        { id: 'p2', rola: 'przyjmujacy', tytuly: [etat({ id: 'etat-p2' })] },
      ],
      typ: 'przysposobienie',
      dataUprawomocnienia: '2027-02-10',
      dzieci: [{ dataUrodzenia: '2024-05-01' }],
    });

  it('rezygnacja po 14 tygodniach: do potwierdzenia w ZUS (pytanie 45), daty z parametru', () => {
    const x = m(przyjecie(), 'rezygnacja_matki_i_przejecie');
    expect(x).toMatchObject({ dostepna: false, odKiedy: '2027-03-09' });
    expect(x.opis).toContain('potwierdzenia w ZUS');
    expect(x.opis).toContain(`${p.wymiaryTyg.obowiazkoweMatki} tygodniach`);
  });

  it('wariant 81,5% i ojcowski mówią o urlopie na warunkach urlopu macierzyńskiego i osobie przyjmującej', () => {
    expect(m(przyjecie(), 'wariant_815').opis).toContain('na warunkach urlopu macierzyńskiego');
    expect(m(przyjecie(), 'ojcowski_w_czesciach').opis).toMatch(/^Osoba przyjmująca/);
  });
});

describe('A3: drobne przypadki tekstów', () => {
  it('w dniu przewidywanego porodu urlop przed porodem niedostępny, bez „już minęła”', () => {
    const x = m(rodzina({ dataAnalizy: '2026-12-01' }), 'urlop_przed_porodem');
    expect(x.dostepna).toBe(false);
    expect(x.opis).not.toMatch(/minęła/);
  });

  it('szpital mamy: opis „na czas pobytu”', () => {
    const r = rodzina({ osoby: [mama([etat()], { zdrowie: { pobytWSzpitalu: [{ od: '2027-01-05', do: '2027-02-10' }] } }), tata()] });
    expect(m(r, 'przejecie_sytuacja_szczegolna').opis).toMatch(/na czas/i);
  });
});
