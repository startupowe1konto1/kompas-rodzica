import { describe, expect, it } from 'vitest';
import { dodajDni } from '../../../engine/daty';
import type { Osoba, Rodzina, TytulUbezpieczenia, Uprawnienie, WynikUprawnien } from '../../../engine/types';
import { utrataPracyPrzedZdarzeniem } from '../utrataPracy';

const DZIEN_PORODU = '2027-03-01';

const tytul = (p: Partial<TytulUbezpieczenia> = {}): TytulUbezpieczenia => ({
  id: 't1',
  rodzaj: 'umowa_o_prace',
  chorobowe: 'obowiazkowe',
  od: '2024-01-01',
  ...p,
});

const rodzina = (osoby: Osoba[], p: Partial<Rodzina['zdarzenie']> = {}): Rodzina => ({
  dataAnalizy: '2026-11-22',
  osoby,
  zdarzenie: { typ: 'porod', data: DZIEN_PORODU, przewidywana: true, dzieci: [{}], ...p },
});

const mama = (tytuly: TytulUbezpieczenia[]): Osoba => ({ id: 'mama', rola: 'matka', tytuly });

const upr = (p: Partial<Uprawnienie>): Uprawnienie => ({
  kod: 'X',
  osobaId: 'mama',
  swiadczenie: 'macierzynski',
  przysluguje: false,
  powod: '',
  przepis: '',
  ...p,
});

const wynik = (uprawnienia: Uprawnienie[]): WynikUprawnien => ({ uprawnienia, pule: {} as WynikUprawnien['pule'], mozliwosci: [], ryzyka: [] });

const BRAK = wynik([upr({ kod: 'BRAK_UBEZP_W_DNIU_PORODU', alternatywa: 'Świadczenie rodzicielskie z gminy.' })]);

describe('utrataPracyPrzedZdarzeniem – kiedy pokazać kartę', () => {
  it('etat ustał przed porodem, zasiłku nie ma: karta ze wszystkimi punktami dla etatu', () => {
    const r = rodzina([mama([tytul({ ustanie: { data: dodajDni(DZIEN_PORODU, -1), przyczyna: 'koniec_umowy' } })])]);
    const [x, ...reszta] = utrataPracyPrzedZdarzeniem(r, BRAK);
    expect(reszta).toEqual([]);
    expect(x.osobaId).toBe('mama');
    expect(x.porod).toBe(true);
    expect(x.tytuly).toEqual([{ indeks: 0, rodzaj: 'umowa_o_prace', data: '2027-02-28', przyczyna: 'koniec_umowy' }]);
    expect(x.alternatywa).toBe('Świadczenie rodzicielskie z gminy.');
    expect(x.punkty).toEqual(['zakaz_wypowiedzenia', 'chorobowy_po_ustaniu', 'upadlosc_likwidacja', 'swiadczenie_rodzicielskie', 'urzad_pracy']);
  });

  it('ostatni dzień ubezpieczenia = dzień porodu: brak karty (w dniu porodu ubezpieczenie jeszcze trwa)', () => {
    const r = rodzina([mama([tytul({ ustanie: { data: DZIEN_PORODU } })])]);
    expect(utrataPracyPrzedZdarzeniem(r, BRAK)).toEqual([]);
  });

  it('bez ustania albo z nieczytelną datą: brak karty', () => {
    expect(utrataPracyPrzedZdarzeniem(rodzina([mama([tytul()])]), BRAK)).toEqual([]);
    expect(utrataPracyPrzedZdarzeniem(rodzina([mama([tytul({ ustanie: { data: '' } })])]), BRAK)).toEqual([]);
    expect(utrataPracyPrzedZdarzeniem(rodzina([mama([tytul({ ustanie: { data: '2027-02-28' } })])], { data: 'zła' }), BRAK)).toEqual([]);
  });

  it('silnik przyznał zasiłek macierzyński (np. druga umowa trwa albo upadłość): brak karty', () => {
    const r = rodzina([mama([tytul({ ustanie: { data: '2027-01-15', przyczyna: 'upadlosc' } })])]);
    expect(utrataPracyPrzedZdarzeniem(r, wynik([upr({ przysluguje: true })]))).toEqual([]);
  });

  it('„warunkowo” to nie przyznanie: karta jest', () => {
    const r = rodzina([mama([tytul({ rodzaj: 'zlecenie', chorobowe: 'dobrowolne', ustanie: { data: '2027-01-15', przyczyna: 'likwidacja' } })])]);
    const [x] = utrataPracyPrzedZdarzeniem(r, wynik([upr({ przysluguje: 'warunkowo' })]));
    // Zlecenie: bez punktu o zakazie wypowiedzenia (KP dotyczy pracowników), bez alternatywy z silnika.
    expect(x.punkty).toEqual(['chorobowy_po_ustaniu', 'upadlosc_likwidacja', 'urzad_pracy']);
  });

  it('bez wyniku silnika (ładuje się): brak karty', () => {
    const r = rodzina([mama([tytul({ ustanie: { data: '2027-01-15' } })])]);
    expect(utrataPracyPrzedZdarzeniem(r, null)).toEqual([]);
    expect(utrataPracyPrzedZdarzeniem(null, BRAK)).toEqual([]);
  });

  it('działalność: punkt o zawieszeniu, bez punktów o pracodawcy', () => {
    const r = rodzina([mama([tytul({ rodzaj: 'dzialalnosc', chorobowe: 'dobrowolne', ustanie: { data: '2027-01-15', przyczyna: 'zakonczenie_dzialalnosci' } })])]);
    const [x] = utrataPracyPrzedZdarzeniem(r, BRAK);
    expect(x.punkty).toEqual(['chorobowy_po_ustaniu', 'swiadczenie_rodzicielskie', 'urzad_pracy', 'zawieszenie_dzialalnosci']);
  });

  it('przyjęcie dziecka: osoba przyjmująca i zasiłek na warunkach macierzyńskiego; bez punktu z UZ art. 30', () => {
    const osoba: Osoba = { id: 'p', rola: 'przyjmujacy', tytuly: [tytul({ ustanie: { data: '2027-01-15' } })] };
    const r = rodzina([osoba], { typ: 'przysposobienie' });
    const [x] = utrataPracyPrzedZdarzeniem(r, wynik([upr({ osobaId: 'p', swiadczenie: 'na_warunkach_macierzynskiego' })]));
    expect(x.porod).toBe(false);
    expect(x.punkty).toEqual(['zakaz_wypowiedzenia', 'chorobowy_po_ustaniu', 'urzad_pracy']);
    expect(utrataPracyPrzedZdarzeniem(r, wynik([upr({ osobaId: 'p', swiadczenie: 'na_warunkach_macierzynskiego', przysluguje: true })]))).toEqual([]);
  });

  it('tata z umową zakończoną przed porodem: karty nie ma (dotyczy mamy i osoby przyjmującej)', () => {
    const tata: Osoba = { id: 'tata', rola: 'ojciec', tytuly: [tytul({ ustanie: { data: '2027-01-15' } })] };
    const r = rodzina([mama([tytul()]), tata]);
    expect(utrataPracyPrzedZdarzeniem(r, wynik([upr({ przysluguje: true }), upr({ osobaId: 'tata', przysluguje: false })]))).toEqual([]);
  });

  it('zasiłek z innej, trwającej umowy liczy się jak przyznany', () => {
    const r = rodzina([mama([tytul({ ustanie: { data: '2027-01-15' } }), tytul({ id: 't2', rodzaj: 'zlecenie', chorobowe: 'dobrowolne' })])]);
    expect(utrataPracyPrzedZdarzeniem(r, wynik([upr({ przysluguje: false, tytulId: 't1' }), upr({ przysluguje: true, tytulId: 't2' })]))).toEqual([]);
  });
});
