import { describe, expect, it } from 'vitest';
import type { Odcinek, Parametry, Rodzina } from '../../../engine/types';
import { PRZYKLAD_RODZINA, PRZYKLAD_UPRAWNIENIA } from '../../../mocks/przyklad';
import { drugaOsoba, mamaWracaPoObowiazkowych, maksWymiarPracy, opcjeWymiaruPracy, podzielWPolowie, przesunOTydzien, skrocOTydzien, wydluzOTydzien } from '../akcje';

const r1: Odcinek = { id: 'r1', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-11-29', czescNr: 1 };
const RODZINA_2: Rodzina = { ...PRZYKLAD_RODZINA, osoby: [...PRZYKLAD_RODZINA.osoby, { id: 'tata', rola: 'ojciec', tytuly: [] }] };

describe('akcje z przycisków', () => {
  it('skróć i wydłuż o tydzień', () => {
    expect(skrocOTydzien(r1)).toEqual({ typ: 'zmien_koniec', odcinekId: 'r1', nowyDo: '2027-11-22' });
    expect(wydluzOTydzien(r1)).toEqual({ typ: 'zmien_koniec', odcinekId: 'r1', nowyDo: '2027-12-06' });
    expect(skrocOTydzien({ ...r1, do: '2027-04-26' })).toBeNull();
  });
  it('przesuń o tydzień w obie strony', () => {
    expect(przesunOTydzien(r1, 1)).toEqual({ typ: 'przesun', odcinekId: 'r1', nowyOd: '2027-04-27' });
    expect(przesunOTydzien(r1, -1)).toEqual({ typ: 'przesun', odcinekId: 'r1', nowyOd: '2027-04-13' });
  });
  it('podziel w połowie: 224 dni → druga część od 113. dnia', () => {
    expect(podzielWPolowie(r1)).toEqual({ typ: 'podziel', odcinekId: 'r1', pierwszyDzienDrugiejCzesci: '2027-08-10' });
    expect(podzielWPolowie({ ...r1, do: r1.od })).toBeNull();
  });
  it('mama wraca po obowiązkowych tygodniach z puli; przejmuje tata', () => {
    expect(mamaWracaPoObowiazkowych(RODZINA_2, PRZYKLAD_UPRAWNIENIA.pule)).toEqual({
      typ: 'rezygnacja_matki', poTygodniach: PRZYKLAD_UPRAWNIENIA.pule.obowiazkoweMatkiTyg, przejmujeOsobaId: 'tata',
    });
    expect(mamaWracaPoObowiazkowych(PRZYKLAD_RODZINA, PRZYKLAD_UPRAWNIENIA.pule)).toBeNull();
  });
  it('drugaOsoba', () => {
    expect(drugaOsoba(RODZINA_2, 'mama')?.id).toBe('tata');
    expect(drugaOsoba(PRZYKLAD_RODZINA, 'mama')).toBeUndefined();
  });
  it('maksWymiarPracy z wersji obowiązującej w dniu; opcje co 1/8 etatu', () => {
    const w = (od: string, max: number) => ({ obowiazujeOd: od, limity: { maxWymiarPracyPrzyLaczeniu: max } }) as unknown as Parametry;
    const wersje = [w('2026-01-01', 0.5), w('2027-06-01', 0.625)];
    expect(maksWymiarPracy(wersje, '2027-01-01')).toBe(0.5);
    expect(maksWymiarPracy(wersje, '2027-06-01')).toBe(0.625);
    expect(maksWymiarPracy([], '2027-01-01')).toBeNull();
    expect(opcjeWymiaruPracy(0.5)).toEqual([0.125, 0.25, 0.375, 0.5]);
  });
});
