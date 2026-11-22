import { describe, expect, it } from 'vitest';
import { sprawdzOdpowiedz } from '../straznik';

const FAKTY = {
  kwoty: { odcinki: [{ dziennie: 230.11, podstawa: 6903.2, razem: 32445.51 }] },
  rodzina: { osoby: [{ tytuly: [{ wynagrodzenieMiesieczne: 8000 }] }] },
  uprawnienia: [{ przepis: 'UZ art. 29 ust. 1' }, { przepis: 'KP art. 180 § 1' }],
  ryzyka: [{ opis: 'Świadczenie rodzicielskie z gminy to 1000 zł miesięcznie.' }],
};

describe('sprawdzOdpowiedz', () => {
  it('przepuszcza kwoty i artykuły, które są w danych z silnika', () => {
    const w = sprawdzOdpowiedz(
      'Podstawa to 6 903,20 zł, dziennie dostaniesz 230,11 zł, łącznie 32 445,51 zł. Zarabiasz 8000 zł. Gmina płaci 1000 zł. Podstawa: UZ art. 29 ust. 1 i KP art. 180 § 1.',
      [FAKTY],
    );
    expect(w).toEqual({ ok: true, nieznane: [] });
  });

  it('przepuszcza odpowiedź bez kwot i artykułów', () => {
    expect(sprawdzOdpowiedz('Tak, możesz podzielić urlop rodzicielski na części.', [FAKTY]).ok).toBe(true);
  });

  it('odrzuca kwotę, której silnik nie policzył', () => {
    const w = sprawdzOdpowiedz('Dostaniesz 9 999,99 zł.', [FAKTY]);
    expect(w.ok).toBe(false);
    expect(w.nieznane).toEqual(['9 999,99 zł']);
  });

  it('rozpoznaje kwoty zapisane jako „złotych” i „PLN”', () => {
    expect(sprawdzOdpowiedz('To 1234 złotych.', [FAKTY]).ok).toBe(false);
    expect(sprawdzOdpowiedz('To 1234 PLN.', [FAKTY]).ok).toBe(false);
    expect(sprawdzOdpowiedz('To 1000 złotych.', [FAKTY]).ok).toBe(true);
  });

  it('odrzuca artykuł, którego nie ma w przepisach z silnika', () => {
    const w = sprawdzOdpowiedz('Wynika to z art. 999 ustawy.', [FAKTY]);
    expect(w.ok).toBe(false);
    expect(w.nieznane).toEqual(['art. 999']);
  });

  it('nie myli art. 18 z art. 180', () => {
    expect(sprawdzOdpowiedz('Zobacz KP art. 18.', [FAKTY]).ok).toBe(false);
  });

  it('kwota zapisana w tysiącach („4 tys. zł”, „4 tysięcy złotych”) też musi być w danych', () => {
    expect(sprawdzOdpowiedz('Dostaniesz około 4 tys. zł.', [FAKTY]).ok).toBe(false);
    expect(sprawdzOdpowiedz('To prawie 4 tysiące złotych.', [FAKTY]).ok).toBe(false);
    expect(sprawdzOdpowiedz('Zarabiasz 8 tys. zł.', [FAKTY]).ok).toBe(true);
  });

  it('procent musi być w danych (np. stawka zasiłku)', () => {
    const zeStawka = { ...FAKTY, kwoty: { odcinki: [{ stawkaProc: 70 }] } };
    expect(sprawdzOdpowiedz('To 70% podstawy.', [zeStawka]).ok).toBe(true);
    expect(sprawdzOdpowiedz('Możesz wybrać 81,5% za cały okres.', [zeStawka]).ok).toBe(false);
    expect(sprawdzOdpowiedz('Możesz wybrać 81,5 % za cały okres.', [{ stawki: [81.5] }]).ok).toBe(true);
  });

  it('sprawdza kilka źródeł naraz (fakty i wynik „co jeśli”)', () => {
    expect(sprawdzOdpowiedz('Po zmianie: 4321,00 zł.', [FAKTY, { kwoty: { razem: 4321 } }]).ok).toBe(true);
  });
});
