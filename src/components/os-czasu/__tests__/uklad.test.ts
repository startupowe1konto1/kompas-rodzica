import { describe, expect, it } from 'vitest';
import type { WynikWalidacji } from '../../../engine/types';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { listaOdcinkow, ukladOsi } from '../uklad';
import { zakresOsi } from '../zakres';
import { MAMA, TATA, plan, rodzina } from './dane';

const ROK_2027 = { od: '2027-01-01', do: '2027-12-31' };

function walidacja(zmiany: Partial<WynikWalidacji>): WynikWalidacji {
  return { poprawny: true, bledy: [], ostrzezenia: [], konsekwencje: [], wykorzystanie: [], ...zmiany };
}

describe('ukladOsi – ścieżki i odcinki', () => {
  const okno = zakresOsi(PRZYKLAD_RODZINA).oknoDomyslne;
  const u = ukladOsi(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, okno);

  it('plan przykładowy: jedna ścieżka mamy z dwoma odcinkami', () => {
    expect(u.sciezki).toHaveLength(1);
    expect(u.sciezki[0].osobaId).toBe('mama');
    expect(u.sciezki[0].etykieta).toBe('Mama');
    expect(u.sciezki[0].odcinki.map((o) => o.id)).toEqual(['m1', 'r1']);
  });

  it('etykieta dla czytnika ekranu', () => {
    const [m1, r1] = u.sciezki[0].odcinki;
    expect(m1.etykietaDostepna).toBe('Urlop macierzyński, 1 grudnia 2026 – 19 kwietnia 2027, 20 tygodni');
    expect(r1.etykietaDostepna).toBe('Urlop rodzicielski, część 1, 20 kwietnia 2027 – 29 listopada 2027, 32 tygodnie');
  });

  it('pozycje odcinków są ułamkami okna i nie są przycięte, gdy mieszczą się w oknie', () => {
    const [m1, r1] = u.sciezki[0].odcinki;
    expect(m1.start).toBeGreaterThan(0);
    expect(m1.start + m1.szerokosc).toBeCloseTo(r1.start); // r1 zaczyna się dzień po końcu m1
    expect(r1.start + r1.szerokosc).toBeLessThan(1);
    expect(m1.przyciety).toEqual({ lewy: false, prawy: false });
    expect(m1.dni).toBe(140);
    expect(m1.wiersz).toBe(0);
  });

  it('pusty plan: ścieżka każdej osoby z rodziny, bez odcinków', () => {
    const p = ukladOsi(rodzina({ osoby: [MAMA, TATA] }), plan([]), ROK_2027);
    expect(p.sciezki.map((s) => s.osobaId)).toEqual(['mama', 'tata']);
    expect(p.sciezki.every((s) => s.odcinki.length === 0 && s.liczbaWierszy === 1)).toBe(true);
  });

  it('dwie osoby: kolejność mama, tata niezależnie od kolejności w danych', () => {
    const p = ukladOsi(
      rodzina({ osoby: [TATA, MAMA] }),
      plan([
        { id: 'o1', osobaId: 'tata', typ: 'ojcowski', od: '2027-01-04', do: '2027-01-17', czescNr: 1 },
        { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-04-19' },
      ]),
      ROK_2027,
    );
    expect(p.sciezki.map((s) => [s.osobaId, s.etykieta])).toEqual([
      ['mama', 'Mama'],
      ['tata', 'Tata'],
    ]);
    expect(p.sciezki[1].odcinki[0].etykietaDostepna).toBe('Urlop ojcowski, część 1, 4 stycznia 2027 – 17 stycznia 2027, 2 tygodnie');
  });

  it('osoba z planu, której nie ma w rodzinie, dostaje ścieżkę na końcu', () => {
    const p = ukladOsi(
      rodzina(),
      plan([{ id: 'x', osobaId: 'babcia', typ: 'przerwa', od: '2027-02-01', do: '2027-02-10' }]),
      ROK_2027,
    );
    expect(p.sciezki.map((s) => s.osobaId)).toEqual(['mama', 'babcia']);
  });

  it('odcinek częściowo poza oknem jest przycięty', () => {
    const p = ukladOsi(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, ROK_2027);
    const m1 = p.sciezki[0].odcinki[0];
    expect(m1.start).toBe(0);
    expect(m1.przyciety).toEqual({ lewy: true, prawy: false });
    expect(m1.od).toBe('2026-12-01'); // daty odcinka bez zmian
  });

  it('odcinek całkiem poza oknem nie trafia do układu', () => {
    const p = ukladOsi(
      PRZYKLAD_RODZINA,
      plan([...PRZYKLAD_PLAN.odcinki, { id: 'w', osobaId: 'mama', typ: 'wychowawczy', od: '2029-01-01', do: '2029-12-31' }]),
      ROK_2027,
    );
    expect(p.sciezki[0].odcinki.map((o) => o.id)).toEqual(['m1', 'r1']);
  });

  it('nachodzące na siebie odcinki jednej osoby idą do osobnych wierszy', () => {
    const p = ukladOsi(
      rodzina(),
      plan([
        { id: 'b', osobaId: 'mama', typ: 'rodzicielski', od: '2027-03-01', do: '2027-05-31' },
        { id: 'a', osobaId: 'mama', typ: 'macierzynski', od: '2027-01-01', do: '2027-03-31' },
        { id: 'c', osobaId: 'mama', typ: 'praca', od: '2027-04-01', do: '2027-04-30' },
      ]),
      ROK_2027,
    );
    const s = p.sciezki[0];
    expect(s.liczbaWierszy).toBe(2);
    expect(Object.fromEntries(s.odcinki.map((o) => [o.id, o.wiersz]))).toEqual({ a: 0, b: 1, c: 0 });
  });

  it('wiersze nie zmieniają się przy przesuwaniu okna', () => {
    const odcinki = plan([
      { id: 'a', osobaId: 'mama', typ: 'macierzynski', od: '2027-01-01', do: '2027-03-31' },
      { id: 'b', osobaId: 'mama', typ: 'rodzicielski', od: '2027-03-01', do: '2027-05-31' },
    ]);
    const p = ukladOsi(rodzina(), odcinki, { od: '2027-04-01', do: '2027-06-30' });
    expect(p.sciezki[0].liczbaWierszy).toBe(2);
    expect(p.sciezki[0].odcinki).toHaveLength(1);
    expect(p.sciezki[0].odcinki[0].wiersz).toBe(1);
  });

  it('odcinek z błędem walidacji jest oznaczony', () => {
    const p = ukladOsi(
      PRZYKLAD_RODZINA,
      PRZYKLAD_PLAN,
      okno,
      walidacja({
        poprawny: false,
        bledy: [{ kod: 'MAC_MIN_14_TYG', poziom: 'blad', tresc: '…', odcinekId: 'm1' }],
        ostrzezenia: [{ kod: 'COS', poziom: 'ostrzezenie', tresc: '…', odcinekId: 'r1' }],
      }),
    );
    const [m1, r1] = p.sciezki[0].odcinki;
    expect(m1.maBlad).toBe(true);
    expect(m1.kodyBledow).toEqual(['MAC_MIN_14_TYG']);
    expect(m1.maOstrzezenie).toBe(false);
    expect(r1.maBlad).toBe(false);
    expect(r1.maOstrzezenie).toBe(true);
    expect(m1.etykietaDostepna).toContain('błąd');
  });

  it('poród 29 lutego 2028', () => {
    const r = rodzina({ dataAnalizy: '2027-11-01', zdarzenie: { typ: 'porod', data: '2028-02-29', przewidywana: true, dzieci: [{}] } });
    const p = ukladOsi(
      r,
      plan([{ id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2028-02-29', do: '2028-07-17' }]),
      zakresOsi(r).oknoDomyslne,
    );
    expect(p.sciezki[0].odcinki[0].etykietaDostepna).toBe('Urlop macierzyński, 29 lutego 2028 – 17 lipca 2028, 20 tygodni');
    const porod = p.znaczniki.find((z) => z.rodzaj === 'porod')!;
    expect(porod.data).toBe('2028-02-29');
    expect(porod.etykieta).toBe('Przewidywany poród');
  });
});

describe('ukladOsi – znaczniki porodu i dziś', () => {
  it('w domyślnym oknie widać poród i dziś', () => {
    const okno = zakresOsi(PRZYKLAD_RODZINA).oknoDomyslne;
    const u = ukladOsi(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, okno);
    expect(u.znaczniki.map((z) => z.rodzaj).sort()).toEqual(['dzis', 'porod']);
    const dzis = u.znaczniki.find((z) => z.rodzaj === 'dzis')!;
    expect(dzis.data).toBe('2026-11-21');
    expect(dzis.etykieta).toBe('Dziś');
    expect(dzis.pozycja).toBeGreaterThan(0);
    expect(dzis.pozycja).toBeLessThan(1);
    expect(u.znacznikiPozaOknem).toEqual([]);
  });

  it('dziś poza oknem → nie ma go wśród widocznych znaczników', () => {
    const u = ukladOsi(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, ROK_2027);
    expect(u.znaczniki).toEqual([]);
    expect(u.znacznikiPozaOknem).toEqual([
      { rodzaj: 'porod', data: '2026-12-01', etykieta: 'Przewidywany poród', strona: 'lewo' },
      { rodzaj: 'dzis', data: '2026-11-21', etykieta: 'Dziś', strona: 'lewo' },
    ]);
  });

  it('faktyczny poród i przyjęcie dziecka mają inne etykiety', () => {
    const porod = ukladOsi(
      rodzina({ zdarzenie: { typ: 'porod', data: '2026-12-01', przewidywana: false, dzieci: [{}] } }),
      plan([]),
      { od: '2026-11-01', do: '2026-12-31' },
    );
    expect(porod.znaczniki.find((z) => z.rodzaj === 'porod')!.etykieta).toBe('Poród');
    const przyjecie = ukladOsi(
      rodzina({ zdarzenie: { typ: 'przysposobienie', data: '2026-12-01', przewidywana: false, dzieci: [{}] } }),
      plan([]),
      { od: '2026-11-01', do: '2026-12-31' },
    );
    expect(przyjecie.znaczniki.find((z) => z.rodzaj === 'porod')!.etykieta).toBe('Przyjęcie dziecka');
  });
});

describe('ukladOsi – podziałka', () => {
  it('okno 2 lata → kreski miesięczne, styczeń oznaczony jako początek roku', () => {
    const u = ukladOsi(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, { od: '2027-01-01', do: '2028-12-31' });
    expect(u.podzialka.rodzaj).toBe('miesiac');
    expect(u.podzialka.kreski).toHaveLength(24);
    const [pierwsza, druga] = u.podzialka.kreski;
    expect(pierwsza).toMatchObject({ data: '2027-01-01', pozycja: 0, etykieta: 'sty', etykietaPelna: 'styczeń 2027', poczatekRoku: true, rok: 2027 });
    expect(druga).toMatchObject({ data: '2027-02-01', etykieta: 'lut', poczatekRoku: false });
  });

  it('okno krótsze niż miesiąc między kreskami pokazuje tylko początki miesięcy w oknie', () => {
    const u = ukladOsi(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, { od: '2027-01-15', do: '2027-03-10' });
    expect(u.podzialka.kreski.map((k) => k.data)).toEqual(['2027-02-01', '2027-03-01']);
  });

  it('cała oś (ponad 3 lata) → kreski roczne', () => {
    const z = zakresOsi(PRZYKLAD_RODZINA);
    const u = ukladOsi(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, { od: z.od, do: z.do });
    expect(u.podzialka.rodzaj).toBe('rok');
    expect(u.podzialka.kreski.map((k) => k.etykieta)).toEqual(['2027', '2028', '2029', '2030', '2031', '2032']);
    expect(u.podzialka.kreski.every((k) => k.poczatekRoku)).toBe(true);
  });
});

describe('listaOdcinkow', () => {
  it('ten sam stan jako lista: grupy osób w stałej kolejności, odcinki posortowane po dacie', () => {
    const l = listaOdcinkow(
      rodzina({ osoby: [TATA, MAMA] }),
      plan([
        { id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-11-29', czescNr: 1 },
        { id: 'o1', osobaId: 'tata', typ: 'ojcowski', od: '2027-01-04', do: '2027-01-17', czescNr: 1 },
        { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-04-19' },
      ]),
    );
    expect(l.map((g) => g.osobaId)).toEqual(['mama', 'tata']);
    expect(l[0].etykieta).toBe('Mama');
    expect(l[0].odcinki.map((o) => o.id)).toEqual(['m1', 'r1']);
    expect(l[0].odcinki[0]).toMatchObject({
      typ: 'macierzynski',
      nazwa: 'Urlop macierzyński',
      od: '2026-12-01',
      do: '2027-04-19',
      dni: 140,
      okres: '1 grudnia 2026 – 19 kwietnia 2027',
      dlugosc: '20 tygodni',
      etykietaDostepna: 'Urlop macierzyński, 1 grudnia 2026 – 19 kwietnia 2027, 20 tygodni',
      maBlad: false,
    });
  });

  it('pusty plan: grupy osób bez odcinków', () => {
    const l = listaOdcinkow(rodzina({ osoby: [MAMA, TATA] }), plan([]));
    expect(l.map((g) => [g.osobaId, g.odcinki.length])).toEqual([
      ['mama', 0],
      ['tata', 0],
    ]);
  });

  it('błędy walidacji widać też na liście', () => {
    const l = listaOdcinkow(
      PRZYKLAD_RODZINA,
      PRZYKLAD_PLAN,
      walidacja({ poprawny: false, bledy: [{ kod: 'X', poziom: 'blad', tresc: '…', odcinekId: 'r1' }] }),
    );
    expect(l[0].odcinki.map((o) => o.maBlad)).toEqual([false, true]);
  });

  it('łączenie z pracą jest w opisie', () => {
    const l = listaOdcinkow(
      rodzina(),
      plan([{ id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-05-03', czescNr: 2, wymiarPracy: 0.5 }]),
    );
    expect(l[0].odcinki[0].etykietaDostepna).toBe(
      'Urlop rodzicielski, część 2, łączony z pracą na 1/2 etatu, 20 kwietnia 2027 – 3 maja 2027, 2 tygodnie',
    );
  });
});
