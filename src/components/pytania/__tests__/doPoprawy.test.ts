import { describe, expect, it } from 'vitest';
import { dodajDni } from '../../../engine/daty';
import type { Rodzina } from '../../../engine/types';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { odpowiedziDoPoprawy } from '../doPoprawy';

// Uwaga z testów z użytkownikiem (22.11): przy sprzecznych odpowiedziach wynik się „sypał”, a rodzic nie wiedział,
// co poprawić. Lista ma wskazać konkretne pytania (klucz = link do ankiety) i powód.

const kopia = (): Rodzina => structuredClone(PRZYKLAD_RODZINA);

describe('odpowiedziDoPoprawy', () => {
  it('poprawne dane przykładowej rodziny: pusta lista', () => {
    expect(odpowiedziDoPoprawy(kopia())).toEqual([]);
  });

  it('umowa kończy się przed początkiem: wskazuje pytanie o datę zakończenia', () => {
    const r = kopia();
    const t = r.osoby[0].tytuly[0];
    t.naCzasOkreslony = true;
    t.do = '2020-01-01';
    const lista = odpowiedziDoPoprawy(r);
    expect(lista.find((x) => x.pytanieId === 'etat_do')?.klucz).toBe('etat_do@o0.t0');
  });

  it('umowa zaczyna się po dacie porodu: wskazuje pytanie o początek umowy', () => {
    const r = kopia();
    r.osoby[0].tytuly[0].od = dodajDni(r.zdarzenie!.data, 30);
    const lista = odpowiedziDoPoprawy(r);
    const x = lista.find((e) => e.pytanieId === 'tytul_od');
    expect(x?.kod).toBe('UMOWA_PO_ZDARZENIU');
    expect(x?.klucz).toBe('tytul_od@o0.t0');
  });

  it('brak umów i firm: wskazuje pytanie o źródła ubezpieczenia', () => {
    const r = kopia();
    r.osoby[0].tytuly = [];
    const x = odpowiedziDoPoprawy(r).find((e) => e.pytanieId === 'tytuly_rodzaje');
    expect(x?.kod).toBe('BRAK_TYTULOW');
  });

  it('nierealna kwota wynagrodzenia (literówka, np. dodatkowe zera) trafia na listę', () => {
    const r = kopia();
    const t = r.osoby[0].tytuly[0];
    t.wynagrodzenieMiesieczne = 1_000_000_000;
    t.podstawaSkladek = t.podstawaSkladek?.map((m) => ({ ...m, kwota: 1_000_000_000 }));
    expect(odpowiedziDoPoprawy(r).length).toBeGreaterThan(0);
  });

  it('każde pytanie najwyżej raz, z treścią pytania i powodem', () => {
    const r = kopia();
    r.osoby[0].tytuly[0].naCzasOkreslony = true;
    r.osoby[0].tytuly[0].do = '2020-01-01';
    const lista = odpowiedziDoPoprawy(r);
    expect(new Set(lista.map((x) => x.klucz)).size).toBe(lista.length);
    for (const x of lista) {
      expect(x.pytanie.length).toBeGreaterThan(0);
      expect(x.powod.length).toBeGreaterThan(0);
    }
  });
});
