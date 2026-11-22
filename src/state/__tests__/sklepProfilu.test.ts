import { describe, expect, it, vi } from 'vitest';
import type { Plan } from '../../engine/types';
import { KLUCZ_MAGAZYNU, PUSTY_PROFIL, serializuj, zAktualizowanymPlanem } from '../magazyn';
import { utworzSklepProfilu, type Schowek } from '../sklepProfilu';

class SchowekWPamieci implements Schowek {
  dane = new Map<string, string>();
  getItem(k: string) {
    return this.dane.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.dane.set(k, v);
  }
  removeItem(k: string) {
    this.dane.delete(k);
  }
}

const plan = (id: string): Plan => ({ id, nazwa: id, odcinki: [], wariant815: false });

describe('utworzSklepProfilu', () => {
  it('bez zapisu zwraca pusty profil', () => {
    const sklep = utworzSklepProfilu(() => new SchowekWPamieci());
    expect(sklep.pobierz()).toEqual(PUSTY_PROFIL);
  });

  it('wczytuje zapisany profil', () => {
    const schowek = new SchowekWPamieci();
    const zapisany = { ...PUSTY_PROFIL, plany: [plan('a')], wybranyPlanId: 'a' };
    schowek.setItem(KLUCZ_MAGAZYNU, serializuj(zapisany));
    expect(utworzSklepProfilu(() => schowek).pobierz()).toEqual(zapisany);
  });

  it('uszkodzony zapis traktuje jak brak profilu', () => {
    const schowek = new SchowekWPamieci();
    schowek.setItem(KLUCZ_MAGAZYNU, '{zepsute');
    expect(utworzSklepProfilu(() => schowek).pobierz()).toEqual(PUSTY_PROFIL);
  });

  it('nie czyta schowka przy tworzeniu, tylko przy pierwszym pobierz()', () => {
    const fabryka = vi.fn(() => new SchowekWPamieci());
    const sklep = utworzSklepProfilu(fabryka);
    expect(fabryka).not.toHaveBeenCalled();
    sklep.pobierz();
    expect(fabryka).toHaveBeenCalled();
  });

  it('pobierz() zwraca ten sam obiekt, dopóki nic się nie zmieni', () => {
    const sklep = utworzSklepProfilu(() => new SchowekWPamieci());
    expect(sklep.pobierz()).toBe(sklep.pobierz());
  });

  it('zmien() zapisuje do schowka i powiadamia subskrybentów', () => {
    const schowek = new SchowekWPamieci();
    const sklep = utworzSklepProfilu(() => schowek);
    const sluchacz = vi.fn();
    sklep.subskrybuj(sluchacz);
    sklep.zmien((s) => zAktualizowanymPlanem(s, plan('x')));
    expect(sklep.pobierz().wybranyPlanId).toBe('x');
    expect(sluchacz).toHaveBeenCalledTimes(1);
    expect(utworzSklepProfilu(() => schowek).pobierz().plany.map((p) => p.id)).toEqual(['x']);
  });

  it('zmien() bez faktycznej zmiany nie zapisuje i nie powiadamia', () => {
    const schowek = new SchowekWPamieci();
    const zapis = vi.spyOn(schowek, 'setItem');
    const sklep = utworzSklepProfilu(() => schowek);
    const sluchacz = vi.fn();
    sklep.subskrybuj(sluchacz);
    sklep.zmien((s) => s);
    expect(sluchacz).not.toHaveBeenCalled();
    expect(zapis).not.toHaveBeenCalled();
  });

  it('odsubskrybowanie działa', () => {
    const sklep = utworzSklepProfilu(() => new SchowekWPamieci());
    const sluchacz = vi.fn();
    const wypisz = sklep.subskrybuj(sluchacz);
    wypisz();
    sklep.zmien((s) => zAktualizowanymPlanem(s, plan('x')));
    expect(sluchacz).not.toHaveBeenCalled();
  });

  it('wyczysc() usuwa zapis i wraca do pustego profilu', () => {
    const schowek = new SchowekWPamieci();
    const sklep = utworzSklepProfilu(() => schowek);
    sklep.zmien((s) => zAktualizowanymPlanem(s, plan('x')));
    sklep.wyczysc();
    expect(sklep.pobierz()).toEqual(PUSTY_PROFIL);
    expect(schowek.getItem(KLUCZ_MAGAZYNU)).toBeNull();
  });

  it('działa w pamięci, gdy schowka nie ma (np. tryb prywatny)', () => {
    const sklep = utworzSklepProfilu(() => null);
    sklep.zmien((s) => zAktualizowanymPlanem(s, plan('x')));
    expect(sklep.pobierz().wybranyPlanId).toBe('x');
  });

  it('nie wywraca się, gdy schowek rzuca wyjątki', () => {
    const zly: Schowek = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    const sklep = utworzSklepProfilu(() => zly);
    expect(sklep.pobierz()).toEqual(PUSTY_PROFIL);
    sklep.zmien((s) => zAktualizowanymPlanem(s, plan('x')));
    expect(sklep.pobierz().wybranyPlanId).toBe('x');
    expect(() => sklep.wyczysc()).not.toThrow();
  });

  it('nie wywraca się, gdy sama fabryka schowka rzuca wyjątek', () => {
    const sklep = utworzSklepProfilu(() => {
      throw new Error('localStorage zablokowany');
    });
    expect(sklep.pobierz()).toEqual(PUSTY_PROFIL);
  });

  it('wczytajPonownie() bierze zapis zmieniony w innej karcie', () => {
    const schowek = new SchowekWPamieci();
    const sklep = utworzSklepProfilu(() => schowek);
    sklep.pobierz();
    const sluchacz = vi.fn();
    sklep.subskrybuj(sluchacz);
    schowek.setItem(KLUCZ_MAGAZYNU, serializuj({ ...PUSTY_PROFIL, plany: [plan('z')], wybranyPlanId: 'z' }));
    sklep.wczytajPonownie();
    expect(sklep.pobierz().wybranyPlanId).toBe('z');
    expect(sluchacz).toHaveBeenCalledTimes(1);
  });
});
