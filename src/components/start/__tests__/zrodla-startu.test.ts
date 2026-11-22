import { describe, expect, it } from 'vitest';
import type { OdpowiedzOdczytuWniosku, PersonaTestowa } from '../../../engine/types';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { profilZPersony, pustaRodzina, scalOdczytWniosku } from '../zrodla-startu';

const DZIS = '2026-11-21';
const persona: PersonaTestowa = {
  id: 'anna-etat', nazwa: 'Anna', opis: 'x',
  rodzina: { ...PRZYKLAD_RODZINA, dataAnalizy: '2026-01-01' },
  pochodzenie: [{ sciezka: 'osoby[0].tytuly[0]', zrodlo: 'ezus' }],
};
const odczyt: OdpowiedzOdczytuWniosku = {
  rozpoznano: true, formularz: 'ZAM',
  osoba: { dane: { imie: 'Ewa', pesel: '90010100000' } },
  zdarzenie: { data: '2027-01-01', przewidywana: false },
  pochodzenie: [{ sciezka: 'osoby[0].dane.pesel', zrodlo: 'formularz_pdf' }, { sciezka: 'zdarzenie.data', zrodlo: 'formularz_pdf' }],
  nieodczytane: [], komunikat: 'ok',
};

describe('profilZPersony', () => {
  it('dataAnalizy = dziś, pochodzenie z persony, nic do potwierdzenia', () => {
    const w = profilZPersony(persona, DZIS);
    expect(w.rodzina.dataAnalizy).toBe(DZIS);
    expect(w.rodzina.osoby).toEqual(PRZYKLAD_RODZINA.osoby);
    expect(w.pochodzenie).toEqual(persona.pochodzenie);
    expect(w.doPotwierdzenia).toEqual([]);
    expect(persona.rodzina.dataAnalizy).toBe('2026-01-01');
  });
});

describe('pustaRodzina', () => {
  it('jedna osoba bez tytułów, poród bez daty, rola i etap do potwierdzenia', () => {
    const w = pustaRodzina(DZIS);
    expect(w.rodzina.osoby).toEqual([{ id: 'osoba-1', rola: 'matka', tytuly: [] }]);
    expect(w.rodzina.zdarzenie).toEqual({ typ: 'porod', data: '', przewidywana: true, dzieci: [{}] });
    expect(w.rodzina.dataAnalizy).toBe(DZIS);
    expect(w.doPotwierdzenia).toEqual(['osoby[0].rola', 'zdarzenie']);
  });
});

describe('scalOdczytWniosku', () => {
  it('bez profilu: nowa rodzina z danymi z wniosku, rola do potwierdzenia', () => {
    const w = scalOdczytWniosku(null, odczyt, DZIS)!;
    expect(w.rodzina.osoby[0].dane).toEqual({ imie: 'Ewa', pesel: '90010100000' });
    expect(w.rodzina.zdarzenie).toMatchObject({ typ: 'porod', data: '2027-01-01', przewidywana: false, dzieci: [{}] });
    expect(w.rodzina.dataAnalizy).toBe(DZIS);
    expect(w.pochodzenie).toEqual(odczyt.pochodzenie);
    expect(w.doPotwierdzenia).toContain('osoby[0].rola');
  });
  it('z profilem: uzupełnia, nie kasuje pól spoza wniosku', () => {
    const w = scalOdczytWniosku(PRZYKLAD_RODZINA, odczyt, DZIS)!;
    const mama = w.rodzina.osoby[0];
    expect(mama.rola).toBe('matka');
    expect(mama.dane?.imie).toBe('Ewa');
    expect(mama.dane?.nazwisko).toBe('Przykładowa');
    expect(mama.tytuly).toHaveLength(1);
    expect(w.rodzina.dataAnalizy).toBe(PRZYKLAD_RODZINA.dataAnalizy);
    expect(w.doPotwierdzenia).toEqual([]);
  });
  it('tytuły z wniosku dopisane bez dubli po id', () => {
    const z = { ...odczyt, osoba: { tytuly: [PRZYKLAD_RODZINA.osoby[0].tytuly[0], { id: 'zlecenie-1', rodzaj: 'zlecenie' as const, chorobowe: 'dobrowolne' as const, od: '2025-01-01' }] } };
    expect(scalOdczytWniosku(PRZYKLAD_RODZINA, z, DZIS)!.rodzina.osoby[0].tytuly.map((t) => t.id)).toEqual(['etat-1', 'zlecenie-1']);
  });
  it('rola z wniosku nie wymaga potwierdzenia', () => {
    expect(scalOdczytWniosku(null, { ...odczyt, osoba: { rola: 'ojciec' } }, DZIS)!.doPotwierdzenia).not.toContain('osoby[0].rola');
  });
  it('skan (rozpoznano: false) → null', () => {
    expect(scalOdczytWniosku(null, { ...odczyt, rozpoznano: false }, DZIS)).toBeNull();
  });
  it('wniosek bez osoby i zdarzenia (pusty ZAM z prawdziwej trasy): rola i zdarzenie do potwierdzenia', () => {
    const w = scalOdczytWniosku(null, { rozpoznano: true, formularz: 'ZAM', pochodzenie: [], nieodczytane: [], komunikat: 'pusty' }, DZIS)!;
    expect(w.rodzina.osoby).toEqual([{ id: 'osoba-1', rola: 'matka', tytuly: [] }]);
    expect(w.doPotwierdzenia).toEqual(['osoby[0].rola', 'zdarzenie']);
  });
});
