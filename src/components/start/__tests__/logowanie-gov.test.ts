import { describe, expect, it } from 'vitest';
import type { PochodzenieDanej } from '../../../engine/types';
import {
  BANKI_SYMULACJA,
  czasBezKlikania,
  KOMUNIKATY_FAZ,
  kodWeryfikacyjny,
  METODY_LOGOWANIA,
  metodaPoId,
  przebiegSymulacji,
  uslugiDoZgody,
  zdanieUslug,
} from '../logowanie-gov';

describe('METODY_LOGOWANIA', () => {
  it('ma cztery metody węzła login.gov.pl, każdą podpisaną „(symulacja)”', () => {
    expect(METODY_LOGOWANIA.map((m) => m.id)).toEqual(['profil-zaufany', 'mobywatel', 'e-dowod', 'bank']);
    for (const m of METODY_LOGOWANIA) expect(m.nazwa).toMatch(/\(symulacja\)$/);
  });

  it('metodaPoId zwraca metodę albo undefined', () => {
    expect(metodaPoId('e-dowod')?.id).toBe('e-dowod');
    expect(metodaPoId('nie-ma')).toBeUndefined();
  });
});

describe('uslugiDoZgody', () => {
  it('zawsze pyta o mObywatel i eZUS (te usługi aplikacja odpytuje), w tej kolejności', () => {
    expect(uslugiDoZgody([]).map((u) => u.zrodlo)).toEqual(['mobywatel', 'ezus']);
  });

  it('dopisuje inne e-usługi, z których persona ma dane, bez powtórzeń', () => {
    const pochodzenie: PochodzenieDanej[] = [
      { sciezka: 'osoby[0].tytuly[0].nipPlatnika', zrodlo: 'eurzad_skarbowy' },
      { sciezka: 'osoby[0].tytuly[0].od', zrodlo: 'ceidg' },
      { sciezka: 'osoby[0].tytuly[0].zawieszenia', zrodlo: 'ceidg' },
      { sciezka: 'osoby[0].zdrowie.eZLA', zrodlo: 'ikp' },
    ];
    expect(uslugiDoZgody(pochodzenie).map((u) => u.zrodlo)).toEqual(['mobywatel', 'ezus', 'eurzad_skarbowy', 'ceidg', 'ikp']);
  });

  it('pomija źródła, które nie są e-usługą (sąd, wpisane przez rodzica, wgrany wniosek)', () => {
    const pochodzenie: PochodzenieDanej[] = [
      { sciezka: 'zdarzenie.dzieci[0].dataUrodzenia', zrodlo: 'sad' },
      { sciezka: 'osoby[0].rola', zrodlo: 'uzytkownik' },
      { sciezka: 'osoby[0].dane.pesel', zrodlo: 'formularz_pdf' },
    ];
    expect(uslugiDoZgody(pochodzenie).map((u) => u.zrodlo)).toEqual(['mobywatel', 'ezus']);
  });

  it('każda usługa ma nazwę z „(symulacja)” i niepustą listę pobieranych danych', () => {
    for (const u of uslugiDoZgody([{ sciezka: 'x', zrodlo: 'eurzad_skarbowy' }])) {
      expect(u.nazwa).toMatch(/\(symulacja\)$/);
      expect(u.dane.length).toBeGreaterThan(0);
    }
  });
});

describe('zdanieUslug', () => {
  it('łączy nazwy przecinkami i „i” przed ostatnią', () => {
    expect(zdanieUslug(uslugiDoZgody([]))).toBe('mObywatela i eZUS');
    expect(zdanieUslug(uslugiDoZgody([{ sciezka: 'x', zrodlo: 'ceidg' }]))).toBe('mObywatela, eZUS i CEIDG');
  });
});

describe('symulacja logowania', () => {
  it('każda metoda ma przebieg kończący się stanem „zalogowano”', () => {
    for (const m of METODY_LOGOWANIA) {
      const fazy = przebiegSymulacji(m.id);
      expect(fazy.length).toBeGreaterThanOrEqual(2);
      expect(fazy.at(-1)?.faza).toBe('zalogowano');
    }
  });

  it('część bez klikania trwa 2–4 s, a „zalogowano” 0,6–0,8 s', () => {
    for (const m of METODY_LOGOWANIA) {
      const czas = czasBezKlikania(m.id);
      expect(czas, m.id).toBeGreaterThanOrEqual(2000);
      expect(czas, m.id).toBeLessThanOrEqual(4000);
      const koniec = przebiegSymulacji(m.id).at(-1)!;
      expect(koniec.czas).toBeGreaterThanOrEqual(600);
      expect(koniec.czas).toBeLessThanOrEqual(800);
    }
  });

  it('na klik czekają tylko formularz profilu zaufanego i wybór banku', () => {
    const czekajace = METODY_LOGOWANIA.flatMap((m) => przebiegSymulacji(m.id).filter((f) => f.czas === null).map((f) => f.faza));
    expect(czekajace).toEqual(['formularz', 'wybor-banku']);
  });

  it('każda faza ma komunikat stanu dla czytnika ekranu', () => {
    for (const m of METODY_LOGOWANIA) for (const f of przebiegSymulacji(m.id)) expect(KOMUNIKATY_FAZ[f.faza]).not.toBe('');
  });

  it('banki mają ogólne nazwy z dopiskiem „(symulacja)” i są różne', () => {
    expect(BANKI_SYMULACJA.length).toBeGreaterThanOrEqual(4);
    for (const b of BANKI_SYMULACJA) expect(b.nazwa).toMatch(/^Bank [A-Z] \(symulacja\)$/);
    expect(new Set(BANKI_SYMULACJA.map((b) => b.id)).size).toBe(BANKI_SYMULACJA.length);
  });

  it('kod weryfikacyjny ma 4 cyfry', () => {
    expect(kodWeryfikacyjny(() => 0)).toBe('1000');
    expect(kodWeryfikacyjny(() => 0.999999)).toMatch(/^\d{4}$/);
  });
});
