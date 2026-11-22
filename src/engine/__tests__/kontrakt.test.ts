/**
 * Test kontraktu: przykład wzorcowy jest wewnętrznie spójny i silnik odpowiada w uzgodnionym kształcie.
 * Gdy tor zastąpi atrapę implementacją, te testy mają dalej przechodzić.
 */
import { describe, expect, it } from 'vitest';
import {
  dokumentyITerminy,
  obliczKwoty,
  parametryNaDzien,
  planyDomyslne,
  przesunPlan,
  suma,
  ustalUprawnienia,
  walidujPlan,
  WERSJE_DOMYSLNE,
} from '..';
import { liczbaDni } from '../daty';
import { PRZYKLAD_KWOTY, PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../mocks/przyklad';

describe('przykład wzorcowy EC-01 (mama na etacie, 1 dziecko, poród 1.12.2026)', () => {
  it('odcinki planu mają długości z Kodeksu pracy: 20 tygodni i 32 tygodnie', () => {
    const [m1, r1] = PRZYKLAD_PLAN.odcinki;
    expect(liczbaDni(m1.od, m1.do)).toBe(20 * 7);
    expect(liczbaDni(r1.od, r1.do)).toBe((41 - 9) * 7);
  });

  it('kwoty odcinków zgadzają się z rozbiciem na miesiące i z sumą', () => {
    for (const o of PRZYKLAD_KWOTY.odcinki) {
      expect(suma(o.rozbicieMiesieczne.map((m) => m.kwota))).toBe(o.razem);
      expect(o.rozbicieMiesieczne.reduce((s, m) => s + m.dni, 0)).toBe(o.dni);
    }
    expect(suma(PRZYKLAD_KWOTY.odcinki.map((o) => o.razem))).toBe(PRZYKLAD_KWOTY.sumaRazem);
  });
});

describe('kształt odpowiedzi silnika', () => {
  const wersje = WERSJE_DOMYSLNE;

  it('uprawnienia mają pule, możliwości wyboru i ryzyka', () => {
    const w = ustalUprawnienia(PRZYKLAD_RODZINA, wersje);
    expect(w.uprawnienia.length).toBeGreaterThan(0);
    expect(w.pule.macierzynskiTyg).toBe(20);
    expect(Array.isArray(w.mozliwosci)).toBe(true);
    expect(Array.isArray(w.ryzyka)).toBe(true);
  });

  it('plan domyślny przechodzi walidację, da się go wycenić i ma dokumenty', () => {
    const [plan] = planyDomyslne(PRZYKLAD_RODZINA, wersje);
    expect(walidujPlan(PRZYKLAD_RODZINA, plan, wersje).poprawny).toBe(true);
    expect(obliczKwoty(PRZYKLAD_RODZINA, plan, wersje).sumaRazem).toBeGreaterThan(0);
    expect(dokumentyITerminy(PRZYKLAD_RODZINA, plan, wersje).ktoWyplaca.length).toBeGreaterThan(0);
  });

  it('„dziecko się urodziło” 5 dni wcześniej: cały plan przesuwa się o 5 dni, długości zostają', () => {
    const rodzina = { ...PRZYKLAD_RODZINA, zdarzenie: { ...PRZYKLAD_RODZINA.zdarzenie, data: '2026-11-26', przewidywana: false } };
    const { plan } = przesunPlan(rodzina, PRZYKLAD_PLAN, '2026-12-01', wersje);
    expect(plan.odcinki[0].od).toBe('2026-11-26');
    expect(plan.odcinki[0].do).toBe('2027-04-14');
    expect(liczbaDni(plan.odcinki[1].od, plan.odcinki[1].do)).toBe(32 * 7);
    expect(PRZYKLAD_PLAN.odcinki[0].od).toBe('2026-12-01');
  });

  it('parametry wybiera się po dacie obowiązywania', () => {
    expect(parametryNaDzien('2026-12-01', wersje).obowiazujeOd).toBe('2026-01-01');
    const z2027 = { ...wersje[0], obowiazujeOd: '2027-01-01', opis: 'test' };
    expect(parametryNaDzien('2026-12-31', [...wersje, z2027]).obowiazujeOd).toBe('2026-01-01');
    expect(parametryNaDzien('2027-01-01', [...wersje, z2027]).obowiazujeOd).toBe('2027-01-01');
  });
});
