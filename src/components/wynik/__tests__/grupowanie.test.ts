import { describe, expect, it } from 'vitest';
import type { Rodzina, Uprawnienie } from '../../../engine/types';
import { PRZYKLAD_RODZINA, PRZYKLAD_UPRAWNIENIA } from '../../../mocks/przyklad';
import { grupujPoOsobach, statusUprawnienia, wymagaPotwierdzenia } from '../grupowanie';

const u = (z: Partial<Uprawnienie>): Uprawnienie => ({ kod: 'X', osobaId: 'mama', swiadczenie: 'macierzynski', przysluguje: true, powod: '', przepis: '', ...z });

describe('statusUprawnienia', () => {
  it('true / false / warunkowo', () => {
    expect(statusUprawnienia(u({ przysluguje: true }))).toBe('przysluguje');
    expect(statusUprawnienia(u({ przysluguje: false }))).toBe('nie_przysluguje');
    expect(statusUprawnienia(u({ przysluguje: 'warunkowo' }))).toBe('do_potwierdzenia');
  });
  it('kod DO_POTWIERDZENIA_W_ZUS wygrywa nad true', () => {
    expect(statusUprawnienia(u({ kod: 'DO_POTWIERDZENIA_W_ZUS' }))).toBe('do_potwierdzenia');
  });
});

describe('grupujPoOsobach', () => {
  const rodzina: Rodzina = { ...PRZYKLAD_RODZINA, osoby: [{ id: 'tata', rola: 'ojciec', tytuly: [] }, ...PRZYKLAD_RODZINA.osoby] };
  const lista = [
    u({ osobaId: 'tata', swiadczenie: 'ojcowski' }),
    u({ kod: 'A', przysluguje: false, swiadczenie: 'uzupelniajacy' }),
    u({ kod: 'B', przysluguje: 'warunkowo', swiadczenie: 'rodzicielski' }),
    u({ kod: 'C' }),
  ];
  const g = grupujPoOsobach(rodzina, lista);
  it('mama przed tatą, etykiety z imieniem albo rolą', () => {
    expect(g.map((x) => x.osobaId)).toEqual(['mama', 'tata']);
    expect(g.map((x) => x.etykieta)).toEqual(['Anna (Mama)', 'Tata']);
  });
  it('w grupie: przysługuje, do potwierdzenia, nie przysługuje', () => {
    expect(g[0].uprawnienia.map((x) => x.kod)).toEqual(['C', 'B', 'A']);
    expect(g[0].uprawnienia.map((x) => x.status)).toEqual(['przysluguje', 'do_potwierdzenia', 'nie_przysluguje']);
  });
  it('osoba bez uprawnień ma pustą grupę', () => {
    expect(grupujPoOsobach(rodzina, [lista[1]]).find((x) => x.osobaId === 'tata')?.uprawnienia).toEqual([]);
  });
  it('przykład wzorcowy: jedna grupa mamy', () => {
    expect(grupujPoOsobach(PRZYKLAD_RODZINA, PRZYKLAD_UPRAWNIENIA.uprawnienia).map((x) => x.osobaId)).toEqual(['mama']);
  });
  it('osoba spoza rodziny trafia na koniec', () => {
    const w = grupujPoOsobach(rodzina, [...lista, u({ osobaId: 'obca' })]);
    expect(w.map((x) => x.osobaId)).toEqual(['mama', 'tata', 'obca']);
  });
  it('kolejność ról: przyjmujący po ojcu niezależnie od kolejności w rodzinie', () => {
    const r: Rodzina = { ...rodzina, osoby: [{ id: 'p', rola: 'przyjmujacy', tytuly: [] }, ...rodzina.osoby] };
    expect(grupujPoOsobach(r, []).map((x) => x.osobaId)).toEqual(['mama', 'tata', 'p']);
  });
  it('wymagaPotwierdzenia', () => {
    expect(wymagaPotwierdzenia(g)).toBe(true);
    expect(wymagaPotwierdzenia(grupujPoOsobach(PRZYKLAD_RODZINA, [u({})]))).toBe(false);
  });
});
