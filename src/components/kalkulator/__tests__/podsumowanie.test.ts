import { describe, expect, it } from 'vitest';
import type { Plan, Rodzina, WynikKwot } from '../../../engine/types';
import { formatujStawke, formatujTygodnie, kwotaMiesiecznaNaStart, wierszeRodzicow } from '../podsumowanie';

const rodzina: Rodzina = {
  osoby: [
    { id: 'osoba-1', rola: 'matka', tytuly: [] },
    { id: 'osoba-2', rola: 'ojciec', tytuly: [] },
  ],
  zdarzenie: { typ: 'porod', data: '2027-01-01', przewidywana: true, dzieci: [{}] },
  dataAnalizy: '2026-11-21',
};

const plan: Plan = {
  id: 'p',
  nazwa: 'p',
  wariant815: false,
  odcinki: [
    { id: 'o3', osobaId: 'osoba-2', typ: 'ojcowski', od: '2027-06-01', do: '2027-06-14' },
    { id: 'o2', osobaId: 'osoba-1', typ: 'rodzicielski', od: '2027-05-21', do: '2027-08-20' },
    { id: 'o1', osobaId: 'osoba-1', typ: 'macierzynski', od: '2027-01-01', do: '2027-05-20' },
    { id: 'o4', osobaId: 'osoba-1', typ: 'praca', od: '2027-09-01', do: '2027-09-30' },
  ],
};

const kwoty = {
  podstawy: [],
  odcinki: [
    { odcinekId: 'o1', osobaId: 'osoba-1', podstawa: 8000, stawkaProc: 100, dziennie: 266, dni: 140, razem: 37333, miesiecznie: 8000 },
    { odcinekId: 'o2', osobaId: 'osoba-1', podstawa: 8000, stawkaProc: 70, dziennie: 186, dni: 92, razem: 17133, miesiecznie: 5600 },
    { odcinekId: 'o3', osobaId: 'osoba-2', podstawa: 6000, stawkaProc: 100, dziennie: 200, dni: 14, razem: 2800, miesiecznie: 6000 },
  ],
  sumaOsoby: { 'osoba-1': 54466, 'osoba-2': 2800 },
  sumaRazem: 57266,
  uwagi: [],
} as unknown as WynikKwot;

describe('wierszeRodzicow', () => {
  const w = wierszeRodzicow(rodzina, plan, kwoty);

  it('każdy rodzic ma okresy po datach, bez pracy i przerw', () => {
    expect(w.map((x) => x.osobaId)).toEqual(['osoba-1', 'osoba-2']);
    expect(w[0].okresy.map((o) => o.odcinek.typ)).toEqual(['macierzynski', 'rodzicielski']);
  });

  it('tygodnie i kwoty pochodzą z silnika', () => {
    expect(w[0].okresy[0]).toMatchObject({ tygodnie: 20, stawkaProc: 100, razem: 37333 });
    expect(w[0].razem).toBe(54466);
    expect(w[1].okresy[0].tygodnie).toBe(2);
  });

  it('osoba bez kwot nie ma wiersza', () => {
    const bezTaty = { ...kwoty, odcinki: kwoty.odcinki.filter((k) => k.osobaId === 'osoba-1') } as WynikKwot;
    expect(wierszeRodzicow(rodzina, plan, bezTaty).map((x) => x.osobaId)).toEqual(['osoba-1']);
  });
});

describe('kwotaMiesiecznaNaStart', () => {
  it('bierze pierwszy okres mamy', () => {
    const w = wierszeRodzicow(rodzina, plan, kwoty);
    expect(kwotaMiesiecznaNaStart(w)?.okres.miesiecznie).toBe(8000);
  });

  it('bez mamy bierze pierwszego rodzica z kwotą', () => {
    const bezMamy = { ...kwoty, odcinki: kwoty.odcinki.filter((k) => k.osobaId === 'osoba-2') } as WynikKwot;
    const w = wierszeRodzicow(rodzina, plan, bezMamy);
    expect(kwotaMiesiecznaNaStart(w)?.wiersz.rola).toBe('ojciec');
  });

  it('brak wierszy daje null', () => expect(kwotaMiesiecznaNaStart([])).toBeNull());
});

describe('formatowanie', () => {
  it('tygodnie', () => {
    expect(formatujTygodnie(20)).toBe('20');
    expect(formatujTygodnie(14.5)).toBe('14,5');
  });
  it('stawka', () => {
    expect(formatujStawke(100)).toBe('100%');
    expect(formatujStawke(81.5)).toBe('81,5%');
  });
});
