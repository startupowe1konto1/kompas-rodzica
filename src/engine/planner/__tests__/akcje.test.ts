/**
 * A6: akcje na osi czasu. Tabela A6 z docs/superpowers/plans/2026-11-21-tor-a.md – każdy wiersz to jeden `it`.
 * Sprawdzamy kody i daty, nie treść komunikatów.
 */
import { describe, expect, it } from 'vitest';
import { PRZYKLAD_PLAN } from '../../../mocks/przyklad';
import { liczbaDni } from '../../daty';
import { WERSJE_DOMYSLNE } from '../../params';
import type { AkcjaPlanu, Komunikat, Odcinek, Plan, Rodzina } from '../../types';
import { etat, kopia, mama, odcinek, P, plan, rodzina, tata, zlecenie } from '../../__tests__/rodziny';
import { zastosujAkcjeNaPlanie } from '../akcje';
import { dlugoscPrzyLaczeniu, dniBazoweLaczenia } from '../akcjeLaczenie';
import { zastosujAkcje } from '..';

const RODZINA_Z_TATA = rodzina({ osoby: [mama(), tata()] });

function jestKomunikat(x: Plan | Komunikat): x is Komunikat {
  return 'kod' in x && 'poziom' in x;
}

/** Stosuje akcję, sprawdza, że wejście się nie zmieniło, i zwraca plan (test pada, gdy przyszedł komunikat). */
function wykonaj(akcja: AkcjaPlanu, wejscie: Plan = PRZYKLAD_PLAN, r: Rodzina = RODZINA_Z_TATA): Plan {
  const przed = kopia(wejscie);
  const wynik = zastosujAkcjeNaPlanie(r, wejscie, akcja, P());
  expect(wejscie).toEqual(przed);
  if (jestKomunikat(wynik)) throw new Error(`Oczekiwano planu, przyszedł komunikat ${wynik.kod}: ${wynik.tresc}`);
  return wynik;
}

/** Stosuje akcję, która ma się nie udać: wejście bez zmian, komunikat AKCJA_NIEMOZLIWA na poziomie błędu. */
function odrzuc(akcja: AkcjaPlanu, wejscie: Plan = PRZYKLAD_PLAN, r: Rodzina = RODZINA_Z_TATA): Komunikat {
  const przed = kopia(wejscie);
  const wynik = zastosujAkcjeNaPlanie(r, wejscie, akcja, P());
  expect(wejscie).toEqual(przed);
  if (!jestKomunikat(wynik)) throw new Error('Oczekiwano komunikatu AKCJA_NIEMOZLIWA, przyszedł plan');
  expect(wynik.kod).toBe('AKCJA_NIEMOZLIWA');
  expect(wynik.poziom).toBe('blad');
  expect(wynik.tresc.length).toBeGreaterThan(0);
  return wynik;
}

function odc(p: Plan, id: string): Odcinek {
  const o = p.odcinki.find((x) => x.id === id);
  if (!o) throw new Error(`Brak odcinka ${id}`);
  return o;
}

describe('rezygnacja_matki (KP art. 180 § 4–5)', () => {
  it('po 14 tygodniach: mama do 2027-03-08, tata przejmuje 2027-03-09–2027-04-19, r1 bez zmian', () => {
    const w = wykonaj({ typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: 'tata' });
    expect(odc(w, 'm1')).toMatchObject({ osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-03-08' });
    expect(odc(w, 'tata-macierzynski-1')).toMatchObject({
      osobaId: 'tata',
      typ: 'macierzynski',
      od: '2027-03-09',
      do: '2027-04-19',
      tytulId: 'etat-taty',
    });
    expect(odc(w, 'r1')).toEqual(PRZYKLAD_PLAN.odcinki[1]);
    expect(w.odcinki).toHaveLength(3);
  });

  it('nie sprawdza 14 tygodni – to robi walidacja (po 10 tygodniach akcja się wykonuje)', () => {
    const w = wykonaj({ typ: 'rezygnacja_matki', poTygodniach: 10, przejmujeOsobaId: 'tata' });
    expect(odc(w, 'm1').do).toBe('2027-02-08');
    expect(odc(w, 'tata-macierzynski-1').od).toBe('2027-02-09');
  });

  it('urlop przed porodem: tygodnie liczy od dnia porodu, nie od początku urlopu', () => {
    const wej = plan([odcinek({ id: 'm', osobaId: 'mama', typ: 'macierzynski', od: '2026-11-17', do: '2027-04-05' })]);
    const w = wykonaj({ typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: 'tata' }, wej);
    expect(odc(w, 'm').do).toBe('2027-03-08');
    expect(odc(w, 'tata-macierzynski-1')).toMatchObject({ od: '2027-03-09', do: '2027-04-05' });
  });

  it('AKCJA_NIEMOZLIWA: mama nie ma odcinka macierzyńskiego', () => {
    odrzuc({ typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: 'tata' }, plan([PRZYKLAD_PLAN.odcinki[1]]));
  });

  it('AKCJA_NIEMOZLIWA: osoba przejmująca nie istnieje albo jest samą matką', () => {
    odrzuc({ typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: 'babcia' });
    odrzuc({ typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: 'mama' });
  });

  it('AKCJA_NIEMOZLIWA: poTygodniach ≥ długość macierzyńskiego (nie ma czego przejąć)', () => {
    odrzuc({ typ: 'rezygnacja_matki', poTygodniach: 20, przejmujeOsobaId: 'tata' });
    odrzuc({ typ: 'rezygnacja_matki', poTygodniach: 25, przejmujeOsobaId: 'tata' });
  });

  describe('kilka odcinków macierzyńskich mamy', () => {
    const wej = plan([
      odcinek({ id: 'ma', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-02-28', tytulId: 'etat-1' }),
      odcinek({ id: 'mb', osobaId: 'mama', typ: 'macierzynski', od: '2027-03-15', do: '2027-04-19', tytulId: 'etat-1' }),
    ]);

    it('dzień rezygnacji w przerwie: późniejszy odcinek przechodzi w całości na tatę', () => {
      const w = wykonaj({ typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: 'tata' }, wej);
      expect(odc(w, 'ma')).toEqual(wej.odcinki[0]);
      expect(odc(w, 'mb')).toMatchObject({ osobaId: 'tata', od: '2027-03-15', do: '2027-04-19', tytulId: 'etat-taty' });
      expect(w.odcinki).toHaveLength(2);
    });

    it('dzień rezygnacji w pierwszym odcinku: reszta pierwszego i cały drugi przechodzą na tatę', () => {
      const w = wykonaj({ typ: 'rezygnacja_matki', poTygodniach: 10, przejmujeOsobaId: 'tata' }, wej);
      expect(odc(w, 'ma')).toMatchObject({ osobaId: 'mama', do: '2027-02-08' });
      expect(odc(w, 'tata-macierzynski-1')).toMatchObject({ osobaId: 'tata', od: '2027-02-09', do: '2027-02-28', tytulId: 'etat-taty' });
      expect(odc(w, 'mb')).toMatchObject({ osobaId: 'tata', tytulId: 'etat-taty' });
      expect(w.odcinki.map((o) => o.id)).toEqual(['ma', 'tata-macierzynski-1', 'mb']);
    });

    it('AKCJA_NIEMOZLIWA: po dniu rezygnacji nie zostaje nic do przejęcia', () => {
      odrzuc({ typ: 'rezygnacja_matki', poTygodniach: 25, przejmujeOsobaId: 'tata' }, wej);
    });
  });

  it('AKCJA_NIEMOZLIWA: niepoprawna data porodu w rodzinie', () => {
    const r = rodzina({ osoby: [mama(), tata()], data: '2026-02-30' });
    odrzuc({ typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: 'tata' }, PRZYKLAD_PLAN, r);
  });

  it('AKCJA_NIEMOZLIWA: liczba tygodni nie jest dodatnią liczbą całkowitą', () => {
    odrzuc({ typ: 'rezygnacja_matki', poTygodniach: 0, przejmujeOsobaId: 'tata' });
    odrzuc({ typ: 'rezygnacja_matki', poTygodniach: 14.5, przejmujeOsobaId: 'tata' });
  });
});

describe('przesun', () => {
  it('r1 na 2027-05-04: 2027-05-04–2027-12-13, długość 224 dni', () => {
    const w = wykonaj({ typ: 'przesun', odcinekId: 'r1', nowyOd: '2027-05-04' });
    expect(odc(w, 'r1')).toMatchObject({ od: '2027-05-04', do: '2027-12-13', czescNr: 1 });
    expect(liczbaDni(odc(w, 'r1').od, odc(w, 'r1').do)).toBe(224);
    expect(odc(w, 'm1')).toEqual(PRZYKLAD_PLAN.odcinki[0]);
  });

  it('przez 29 lutego 2028: długość zostaje (15 dni)', () => {
    const wej = plan([odcinek({ id: 'r', osobaId: 'mama', typ: 'rodzicielski', od: '2028-02-20', do: '2028-03-05' })]);
    const w = wykonaj({ typ: 'przesun', odcinekId: 'r', nowyOd: '2028-02-25' }, wej);
    expect(odc(w, 'r')).toMatchObject({ od: '2028-02-25', do: '2028-03-10' });
  });

  it('AKCJA_NIEMOZLIWA: niepoprawna data', () => {
    odrzuc({ typ: 'przesun', odcinekId: 'r1', nowyOd: '2027-02-30' });
  });
});

describe('zmien_koniec', () => {
  it('r1 do 2027-10-31', () => {
    const w = wykonaj({ typ: 'zmien_koniec', odcinekId: 'r1', nowyDo: '2027-10-31' });
    expect(odc(w, 'r1')).toMatchObject({ od: '2027-04-20', do: '2027-10-31' });
  });

  it('koniec w dniu początku to odcinek jednodniowy', () => {
    const w = wykonaj({ typ: 'zmien_koniec', odcinekId: 'r1', nowyDo: '2027-04-20' });
    expect(odc(w, 'r1')).toMatchObject({ od: '2027-04-20', do: '2027-04-20' });
  });

  it('skrócenie pierwszego z dwóch stykających się odcinków rozdziela je na dwie części (D9)', () => {
    const wej = plan([
      odcinek({ id: 'a', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-05-31', czescNr: 1 }),
      odcinek({ id: 'b', osobaId: 'mama', typ: 'rodzicielski', od: '2027-06-01', do: '2027-06-30', czescNr: 1 }),
    ]);
    const w = wykonaj({ typ: 'zmien_koniec', odcinekId: 'a', nowyDo: '2027-05-24' }, wej);
    expect(odc(w, 'a').czescNr).toBe(1);
    expect(odc(w, 'b').czescNr).toBe(2);
  });

  it('AKCJA_NIEMOZLIWA: nowy koniec przed początkiem', () => {
    const k = odrzuc({ typ: 'zmien_koniec', odcinekId: 'r1', nowyDo: '2027-04-19' });
    expect(k.odcinekId).toBe('r1');
  });
});

describe('podziel', () => {
  it('r1 od 2027-08-03: r1 do 2027-08-02, mama-rodzicielski-1 2027-08-03–2027-11-29, styczne = jedna część', () => {
    const w = wykonaj({ typ: 'podziel', odcinekId: 'r1', pierwszyDzienDrugiejCzesci: '2027-08-03' });
    expect(odc(w, 'r1')).toMatchObject({ od: '2027-04-20', do: '2027-08-02', czescNr: 1, tytulId: 'etat-1' });
    expect(odc(w, 'mama-rodzicielski-1')).toMatchObject({
      osobaId: 'mama',
      typ: 'rodzicielski',
      od: '2027-08-03',
      do: '2027-11-29',
      czescNr: 1,
      tytulId: 'etat-1',
    });
    expect(w.odcinki.map((o) => o.id)).toEqual(['m1', 'r1', 'mama-rodzicielski-1']);
  });

  it('po rozsunięciu podzielonych odcinków są dwie części (D9)', () => {
    const podzielony = wykonaj({ typ: 'podziel', odcinekId: 'r1', pierwszyDzienDrugiejCzesci: '2027-08-03' });
    const w = wykonaj({ typ: 'przesun', odcinekId: 'mama-rodzicielski-1', nowyOd: '2027-09-07' }, podzielony);
    expect(odc(w, 'r1').czescNr).toBe(1);
    expect(odc(w, 'mama-rodzicielski-1').czescNr).toBe(2);
  });

  it('podział w ostatnim dniu daje jednodniową drugą część', () => {
    const w = wykonaj({ typ: 'podziel', odcinekId: 'r1', pierwszyDzienDrugiejCzesci: '2027-11-29' });
    expect(odc(w, 'mama-rodzicielski-1')).toMatchObject({ od: '2027-11-29', do: '2027-11-29' });
  });

  it('AKCJA_NIEMOZLIWA: podział w pierwszym dniu odcinka albo poza nim', () => {
    odrzuc({ typ: 'podziel', odcinekId: 'r1', pierwszyDzienDrugiejCzesci: '2027-04-20' });
    odrzuc({ typ: 'podziel', odcinekId: 'r1', pierwszyDzienDrugiejCzesci: '2027-11-30' });
  });
});

describe('polacz_z_praca (KP art. 182¹e, 182¹f; D10, D16)', () => {
  it('r1 na 0,5: wymiarPracy 0,5, koniec 2028-07-10 (448 dni)', () => {
    const w = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0.5 });
    expect(odc(w, 'r1')).toMatchObject({ od: '2027-04-20', do: '2028-07-10', wymiarPracy: 0.5 });
  });

  it('AKCJA_NIEMOZLIWA: 0,6 to więcej niż połowa etatu', () => {
    odrzuc({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0.6 });
  });

  it('AKCJA_NIEMOZLIWA: wymiar ujemny albo nie-liczba', () => {
    odrzuc({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: -0.1 });
    odrzuc({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: Number.NaN });
  });

  it('AKCJA_NIEMOZLIWA: tylko urlop rodzicielski można łączyć z pracą', () => {
    odrzuc({ typ: 'polacz_z_praca', odcinekId: 'm1', wymiarPracy: 0.5 });
  });

  it('dwa razy z rzędu (0,5, potem 0,25): długość liczona od dni bazowych, 298 dni', () => {
    const pol = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0.5 });
    const w = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0.25 }, pol);
    expect(odc(w, 'r1')).toMatchObject({ od: '2027-04-20', do: '2028-02-11', wymiarPracy: 0.25 });
    expect(liczbaDni(odc(w, 'r1').od, odc(w, 'r1').do)).toBe(Math.floor(224 / 0.75));
  });

  it('0 cofa łączenie: wraca do dni bazowych i usuwa wymiarPracy', () => {
    const pol = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0.5 });
    const w = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0 }, pol);
    expect(odc(w, 'r1')).toEqual(PRZYKLAD_PLAN.odcinki[1]);
    expect('wymiarPracy' in odc(w, 'r1')).toBe(false);
  });

  describe('tylko pracownik na etacie w dniu początku odcinka (KP art. 182¹e § 1, pytanie 10)', () => {
    const wej = plan([odcinek({ id: 'r', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-11-29' })]);

    it('AKCJA_NIEMOZLIWA: osoba ma tylko zlecenie', () => {
      const k = odrzuc({ typ: 'polacz_z_praca', odcinekId: 'r', wymiarPracy: 0.5 }, wej, rodzina({ osoby: [mama([zlecenie()])] }));
      expect(k.odcinekId).toBe('r');
    });

    it('AKCJA_NIEMOZLIWA: umowa o pracę skończyła się przed początkiem odcinka', () => {
      const r = rodzina({ osoby: [mama([etat({ do: '2027-01-31' })])] });
      odrzuc({ typ: 'polacz_z_praca', odcinekId: 'r', wymiarPracy: 0.5 }, wej, r);
    });

    it('AKCJA_NIEMOZLIWA: odcinek płynie z tytułu zlecenia, choć osoba ma też etat', () => {
      const r = rodzina({ osoby: [mama([etat(), zlecenie()])] });
      const zZlecenia = plan([{ ...wej.odcinki[0], tytulId: 'zlecenie-1' }]);
      odrzuc({ typ: 'polacz_z_praca', odcinekId: 'r', wymiarPracy: 0.5 }, zZlecenia, r);
    });

    it('bez tytulId na odcinku: tytuł z ubezpieczenieWDniu (etat) – łączenie się udaje', () => {
      const w = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r', wymiarPracy: 0.5 }, wej, rodzina({ osoby: [mama()] }));
      expect(odc(w, 'r').do).toBe('2028-07-10');
    });

    it('cofnięcie łączenia (0) jest możliwe także bez etatu', () => {
      const r = rodzina({ osoby: [mama([zlecenie()])] });
      const zWymiarem = plan([{ ...wej.odcinki[0], wymiarPracy: 0.5 }]);
      const w = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r', wymiarPracy: 0 }, zWymiarem, r);
      expect('wymiarPracy' in odc(w, 'r')).toBe(false);
    });
  });

  describe('odwracalność (D10 po zmianie: bazowe w górę, długość w dół)', () => {
    it('dniBazoweLaczenia i dlugoscPrzyLaczeniu: 90 dni przy 0,3 → 63 bazowe; 33 bazowe przy 0,45 → 60 dni', () => {
      expect(dniBazoweLaczenia(90, 0.3)).toBe(63);
      expect(dlugoscPrzyLaczeniu(33, 0.45)).toBe(60);
      expect(dniBazoweLaczenia(60, 0.45)).toBe(33);
      expect(dniBazoweLaczenia(224, 0)).toBe(224);
      expect(dlugoscPrzyLaczeniu(224, 0)).toBe(224);
    });

    it('dniBazoweLaczenia(dlugoscPrzyLaczeniu(b, w), w) === b dla wielu b i w', () => {
      for (const w of [0.1, 0.2, 0.25, 0.3, 0.375, 0.4, 0.45, 0.5]) {
        for (let b = 1; b <= 300; b++) expect(dniBazoweLaczenia(dlugoscPrzyLaczeniu(b, w), w)).toBe(b);
      }
    });

    it('224 dni → 0,25 → 0 daje znowu 224 dni (PRZYKLAD r1)', () => {
      const cwierc = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0.25 });
      expect(liczbaDni(odc(cwierc, 'r1').od, odc(cwierc, 'r1').do)).toBe(298);
      const w = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0 }, cwierc);
      expect(odc(w, 'r1')).toEqual(PRZYKLAD_PLAN.odcinki[1]);
    });

    it('0,25 dwa razy z rzędu daje to samo', () => {
      const raz = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0.25 });
      expect(wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0.25 }, raz)).toEqual(raz);
    });

    it('0,4 i 0,375 na zmianę, wielokrotnie: na koniec 0 wraca do 224 dni', () => {
      let p = PRZYKLAD_PLAN;
      for (let i = 0; i < 5; i++) {
        p = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0.4 }, p);
        expect(liczbaDni(odc(p, 'r1').od, odc(p, 'r1').do)).toBe(373);
        p = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0.375 }, p);
        expect(liczbaDni(odc(p, 'r1').od, odc(p, 'r1').do)).toBe(358);
      }
      p = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r1', wymiarPracy: 0 }, p);
      expect(odc(p, 'r1')).toEqual(PRZYKLAD_PLAN.odcinki[1]);
    });
  });

  it('jednodniowy odcinek z wymiarem 0,5 albo błędnym wymiarem 1: odcinek nigdy nie kończy się przed początkiem', () => {
    const wej = plan([odcinek({ id: 'r', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-04-20', wymiarPracy: 0.5 })]);
    expect(odc(wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r', wymiarPracy: 0.25 }, wej), 'r').do).toBe('2027-04-20');
    const zly = plan([odcinek({ id: 'r', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-04-26', wymiarPracy: 1 })]);
    expect(odc(wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r', wymiarPracy: 0.5 }, zly), 'r').do).toBe('2027-05-03');
  });

  describe('przycinanie do rodzicielskiMaxZPraca (KP art. 182¹f § 1, § 1¹)', () => {
    // mama 287 dni (41 tygodni) + tata 63 dni rodzicielskiego
    const wej = plan([
      odcinek({ id: 'r', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2028-01-31' }),
      odcinek({ id: 't', osobaId: 'tata', typ: 'rodzicielski', od: '2027-04-20', do: '2027-06-21' }),
    ]);

    it('jedno dziecko: 82 tygodnie = 574 dni łącznie, mama dostaje 574 − 63 = 511 dni', () => {
      const w = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r', wymiarPracy: 0.5 }, wej);
      expect(odc(w, 'r')).toMatchObject({ do: '2028-09-11', wymiarPracy: 0.5 });
      expect(liczbaDni(odc(w, 'r').od, odc(w, 'r').do)).toBe(511);
    });

    it('bliźnięta: 86 tygodni = 602 dni, mama dostaje 539 dni', () => {
      const r = rodzina({ osoby: [mama(), tata()], dzieci: [{}, {}] });
      const w = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r', wymiarPracy: 0.5 }, wej, r);
      expect(odc(w, 'r').do).toBe('2028-10-09');
    });

    it('„Za życiem”: 130 tygodni, przycięcie nie jest potrzebne (574 dni)', () => {
      const r = rodzina({ osoby: [mama(), tata()], dzieci: [{ zaZyciem: true }] });
      const w = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r', wymiarPracy: 0.5 }, wej, r);
      expect(odc(w, 'r').do).toBe('2028-11-13');
    });

    it('przycięcie nigdy nie skraca odcinka poniżej dni bazowych', () => {
      const duzo = plan([
        ...wej.odcinki,
        odcinek({ id: 't2', osobaId: 'tata', typ: 'rodzicielski', od: '2028-03-01', do: '2029-06-30' }),
      ]);
      const w = wykonaj({ typ: 'polacz_z_praca', odcinekId: 'r', wymiarPracy: 0.5 }, duzo);
      expect(odc(w, 'r').do).toBe('2028-01-31');
      expect(odc(w, 'r').wymiarPracy).toBe(0.5);
    });
  });
});

describe('przenies_na_osobe', () => {
  it('r1 na tatę: osobaId i tytulId taty z dnia początku odcinka', () => {
    const w = wykonaj({ typ: 'przenies_na_osobe', odcinekId: 'r1', osobaId: 'tata' });
    expect(odc(w, 'r1')).toMatchObject({ osobaId: 'tata', tytulId: 'etat-taty', od: '2027-04-20', do: '2027-11-29', czescNr: 1 });
  });

  it('osoba bez ubezpieczenia w dniu początku: odcinek bez tytulId', () => {
    const r = rodzina({ osoby: [mama(), tata([zlecenie({ chorobowe: 'brak' })])] });
    const w = wykonaj({ typ: 'przenies_na_osobe', odcinekId: 'r1', osobaId: 'tata' }, PRZYKLAD_PLAN, r);
    expect(odc(w, 'r1').osobaId).toBe('tata');
    expect('tytulId' in odc(w, 'r1')).toBe(false);
  });

  it('AKCJA_NIEMOZLIWA: osoba nie istnieje', () => {
    odrzuc({ typ: 'przenies_na_osobe', odcinekId: 'r1', osobaId: 'babcia' });
  });
});

describe('usun', () => {
  it('plan bez r1', () => {
    const w = wykonaj({ typ: 'usun', odcinekId: 'r1' });
    expect(w.odcinki.map((o) => o.id)).toEqual(['m1']);
  });

  it('po usunięciu pierwszej części kolejne dostają nowe numery (D9)', () => {
    const wej = plan([
      odcinek({ id: 'a', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-05-31', czescNr: 1 }),
      odcinek({ id: 'b', osobaId: 'mama', typ: 'rodzicielski', od: '2027-07-01', do: '2027-07-31', czescNr: 2 }),
      odcinek({ id: 'c', osobaId: 'mama', typ: 'rodzicielski', od: '2027-09-01', do: '2027-09-30', czescNr: 3 }),
    ]);
    const w = wykonaj({ typ: 'usun', odcinekId: 'a' }, wej);
    expect(w.odcinki.map((o) => [o.id, o.czescNr])).toEqual([
      ['b', 1],
      ['c', 2],
    ]);
  });
});

describe('dodaj', () => {
  it('ojcowski taty 2026-12-01–2026-12-14: id tata-ojcowski-1, czescNr 1, tytuł taty', () => {
    const w = wykonaj({ typ: 'dodaj', odcinek: { osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14' } });
    expect(odc(w, 'tata-ojcowski-1')).toMatchObject({ osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14', czescNr: 1, tytulId: 'etat-taty' });
    expect(w.odcinki).toHaveLength(3);
  });

  it('drugi ojcowski dostaje kolejny numer i część 2', () => {
    const jeden = wykonaj({ typ: 'dodaj', odcinek: { osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-07' } });
    const w = wykonaj({ typ: 'dodaj', odcinek: { osobaId: 'tata', typ: 'ojcowski', od: '2027-02-01', do: '2027-02-07' } }, jeden);
    expect(odc(w, 'tata-ojcowski-2').czescNr).toBe(2);
  });

  it('podany tytulId zostaje, czescNr z wejścia jest przeliczony', () => {
    const w = wykonaj({
      typ: 'dodaj',
      odcinek: { osobaId: 'mama', typ: 'rodzicielski', od: '2027-11-30', do: '2027-12-06', tytulId: 'inny' },
    });
    expect(odc(w, 'mama-rodzicielski-1')).toMatchObject({ tytulId: 'inny', czescNr: 1 });
  });

  it('odcinek bez zasiłku (praca) nie dostaje tytulId', () => {
    const w = wykonaj({ typ: 'dodaj', odcinek: { osobaId: 'mama', typ: 'praca', od: '2027-11-30', do: '2027-12-31' } });
    expect(odc(w, 'mama-praca-1')).toMatchObject({ typ: 'praca', od: '2027-11-30', do: '2027-12-31' });
    expect('tytulId' in odc(w, 'mama-praca-1')).toBe(false);
    expect('czescNr' in odc(w, 'mama-praca-1')).toBe(false);
  });

  it('AKCJA_NIEMOZLIWA: osoba nie istnieje, koniec przed początkiem, zła data', () => {
    odrzuc({ typ: 'dodaj', odcinek: { osobaId: 'babcia', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14' } });
    odrzuc({ typ: 'dodaj', odcinek: { osobaId: 'tata', typ: 'ojcowski', od: '2026-12-14', do: '2026-12-01' } });
    odrzuc({ typ: 'dodaj', odcinek: { osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-13-01' } });
  });
});

describe('ustaw_wariant_815 (UZ art. 30a, D18)', () => {
  it('true przy dataAnalizy 2026-11-21: wniosek815Data = dzień porodu 2026-12-01', () => {
    const w = wykonaj({ typ: 'ustaw_wariant_815', wartosc: true });
    expect(w.wariant815).toBe(true);
    expect(w.wniosek815Data).toBe('2026-12-01');
  });

  it('true po porodzie: wniosek815Data = dataAnalizy', () => {
    const r = rodzina({ osoby: [mama()], dataAnalizy: '2026-12-05' });
    const w = wykonaj({ typ: 'ustaw_wariant_815', wartosc: true }, PRZYKLAD_PLAN, r);
    expect(w.wniosek815Data).toBe('2026-12-05');
  });

  it('true zostawia datę, którą plan już miał', () => {
    const w = wykonaj({ typ: 'ustaw_wariant_815', wartosc: true }, { ...PRZYKLAD_PLAN, wniosek815Data: '2026-12-10' });
    expect(w.wniosek815Data).toBe('2026-12-10');
  });

  it('AKCJA_NIEMOZLIWA: niepoprawna data porodu', () => {
    const r = rodzina({ osoby: [mama()], data: '2026-12-32' });
    odrzuc({ typ: 'ustaw_wariant_815', wartosc: true }, PRZYKLAD_PLAN, r);
  });

  it('false usuwa wniosek815Data', () => {
    const w = wykonaj({ typ: 'ustaw_wariant_815', wartosc: false }, { ...PRZYKLAD_PLAN, wariant815: true, wniosek815Data: '2026-12-10' });
    expect(w.wariant815).toBe(false);
    expect('wniosek815Data' in w).toBe(false);
  });
});

describe('nieistniejący odcinekId', () => {
  const akcje: AkcjaPlanu[] = [
    { typ: 'przesun', odcinekId: 'x', nowyOd: '2027-05-04' },
    { typ: 'zmien_koniec', odcinekId: 'x', nowyDo: '2027-10-31' },
    { typ: 'podziel', odcinekId: 'x', pierwszyDzienDrugiejCzesci: '2027-08-03' },
    { typ: 'usun', odcinekId: 'x' },
    { typ: 'przenies_na_osobe', odcinekId: 'x', osobaId: 'tata' },
    { typ: 'polacz_z_praca', odcinekId: 'x', wymiarPracy: 0.5 },
  ];
  for (const a of akcje) {
    it(`${a.typ}: AKCJA_NIEMOZLIWA z odcinekId, plan bez zmian`, () => {
      expect(odrzuc(a).odcinekId).toBe('x');
    });
  }

  it('odcinek w planie ma niepoprawną datę (np. z REST): AKCJA_NIEMOZLIWA zamiast wyjątku', () => {
    const zly = plan([odcinek({ id: 'r', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-31', do: '2027-05-10' })]);
    expect(odrzuc({ typ: 'przesun', odcinekId: 'r', nowyOd: '2027-05-04' }, zly).odcinekId).toBe('r');
  });

  it('inny odcinek planu ma złą datę (łączenie liczy sumę rodzicielskiego, dodaj przelicza części): AKCJA_NIEMOZLIWA', () => {
    const zly = plan([
      odcinek({ id: 'r', osobaId: 'mama', typ: 'rodzicielski', od: '2027-04-20', do: '2027-11-29' }),
      odcinek({ id: 't', osobaId: 'tata', typ: 'rodzicielski', od: '2027-12-01', do: '2027-1-31' }),
    ]);
    expect(odrzuc({ typ: 'polacz_z_praca', odcinekId: 'r', wymiarPracy: 0.5 }, zly).odcinekId).toBe('t');
    odrzuc({ typ: 'dodaj', odcinek: { osobaId: 'tata', typ: 'ojcowski', od: '2026-12-01', do: '2026-12-14' } }, zly);
    odrzuc({ typ: 'rezygnacja_matki', poTygodniach: 14, przejmujeOsobaId: 'tata' }, zly);
  });

  it('nieznany typ akcji (np. z REST): AKCJA_NIEMOZLIWA', () => {
    odrzuc({ typ: 'teleportuj' } as unknown as AkcjaPlanu);
  });
});

describe('zastosujAkcje (publiczne, z walidacją)', () => {
  it('niewykonalna akcja: plan wejściowy w odpowiedzi i AKCJA_NIEMOZLIWA w błędach', () => {
    const odp = zastosujAkcje(RODZINA_Z_TATA, PRZYKLAD_PLAN, { typ: 'usun', odcinekId: 'x' }, WERSJE_DOMYSLNE);
    expect(odp.plan).toEqual(PRZYKLAD_PLAN);
    expect(odp.walidacja.poprawny).toBe(false);
    expect(odp.walidacja.bledy.map((b) => b.kod)).toContain('AKCJA_NIEMOZLIWA');
  });
});
