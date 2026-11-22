/**
 * Dane testowe dla zadania D2 (kto wypłaca, dokumenty, terminy). Wszystkie dane są fikcyjne.
 * Budujemy warianty przykładu wzorcowego, żeby każdy test zmieniał tylko to, co sprawdza.
 */
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import type {
  Dokument,
  KodDokumentu,
  Odcinek,
  Osoba,
  Plan,
  Rodzina,
  Termin,
  TytulUbezpieczenia,
  WynikDokumentow,
  ZdarzenieDziecka,
} from '../../types';

/** Etat mamy z wzorca: pracodawca zgłasza ponad 20 osób. */
export const ETAT: TytulUbezpieczenia = PRZYKLAD_RODZINA.osoby[0].tytuly[0];

export const ZLECENIE: TytulUbezpieczenia = {
  id: 'zl-1',
  rodzaj: 'zlecenie',
  chorobowe: 'dobrowolne',
  od: '2024-01-01',
  wynagrodzenieMiesieczne: 6000,
  platnikPowyzej20: false,
  nazwaPlatnika: 'Zleceniodawca Przykładowy',
};

export const DZIALALNOSC: TytulUbezpieczenia = {
  id: 'dg-1',
  rodzaj: 'dzialalnosc',
  chorobowe: 'dobrowolne',
  od: '2022-05-01',
  zadeklarowanaPodstawa: 5652,
};

export function mamaZ(tytuly: TytulUbezpieczenia[], zmiany: Partial<Osoba> = {}): Osoba {
  return { ...PRZYKLAD_RODZINA.osoby[0], tytuly, ...zmiany };
}

export function tataNaEtacie(zmiany: Partial<TytulUbezpieczenia> = {}, osoba: Partial<Osoba> = {}): Osoba {
  return {
    id: 'tata',
    rola: 'ojciec',
    dane: { imie: 'Piotr', nazwisko: 'Przykładowy' },
    tytuly: [
      {
        id: 'etat-t',
        rodzaj: 'umowa_o_prace',
        chorobowe: 'obowiazkowe',
        od: '2020-01-01',
        wymiarEtatu: 1,
        wynagrodzenieMiesieczne: 9000,
        platnikPowyzej20: true,
        ...zmiany,
      },
    ],
    ...osoba,
  };
}

export function rodzina(osoby: Osoba[], zdarzenie: Partial<ZdarzenieDziecka> = {}, zmiany: Partial<Rodzina> = {}): Rodzina {
  return { ...PRZYKLAD_RODZINA, ...zmiany, osoby, zdarzenie: { ...PRZYKLAD_RODZINA.zdarzenie, ...zdarzenie } };
}

export function plan(odcinki: Odcinek[], zmiany: Partial<Plan> = {}): Plan {
  return { id: 'plan-test', nazwa: 'Plan testowy', wariant815: false, odcinki, ...zmiany };
}

/** Odcinki wzorca (m1, r1) przypisane do innego tytułu albo bez tytułu (silnik ma go znaleźć sam). */
export function odcinkiWzorca(tytulId?: string): Odcinek[] {
  return PRZYKLAD_PLAN.odcinki.map((o) => ({ ...o, tytulId }));
}

export function dokumenty(w: WynikDokumentow, kod: KodDokumentu, ktoSklada?: string): Dokument[] {
  return w.dokumenty.filter((d) => d.kod === kod && (ktoSklada === undefined || d.ktoSklada === ktoSklada));
}

export function dokument(w: WynikDokumentow, kod: KodDokumentu, ktoSklada?: string): Dokument | undefined {
  return dokumenty(w, kod, ktoSklada)[0];
}

/**
 * Terminy pasujące do wzoru. Pole ustawione we wzorze na `undefined` oznacza „pola nie ma albo jest puste”
 * (`expect.objectContaining` wymaga, żeby klucz istniał, a w JSON-ie puste pola znikają).
 */
export function terminy(lista: Termin[], wzor: Partial<Termin>): Termin[] {
  return lista.filter((t) => (Object.keys(wzor) as (keyof Termin)[]).every((k) => t[k] === wzor[k]));
}
