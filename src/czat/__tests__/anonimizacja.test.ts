import { describe, expect, it } from 'vitest';
import { PRZYKLAD_RODZINA } from '../../mocks/przyklad';
import type { Rodzina } from '../../engine/types';
import { rodzinaDlaModelu, wyczyscPytanie } from '../anonimizacja';

/** Fikcyjna rodzina z kompletem danych osobowych – żadna z tych wartości nie może trafić do modelu. */
const Z_DANYMI: Rodzina = {
  ...PRZYKLAD_RODZINA,
  osoby: PRZYKLAD_RODZINA.osoby.map((o) => ({
    ...o,
    dane: {
      imie: 'Zofia',
      nazwisko: 'Testowska',
      pesel: '90010112345',
      dataUrodzenia: '1990-01-01',
      adres: { ulica: 'Wymyślona', nrDomu: '7', kod: '00-950', miejscowosc: 'Przykładowo' },
      dokumentTozsamosci: 'paszport ZZ1234567',
      telefon: '600 700 800',
      email: 'zofia@example.com',
      rachunekBankowy: '61 1090 1014 0000 0712 1981 2874',
    },
    oswiadczenia: { ojcowskiZInnegoTytulu: false },
    tytuly: o.tytuly.map((t) => ({ ...t, nazwaPlatnika: 'Firma Fikcyjna sp. z o.o.', nipPlatnika: '5260250274', regonPlatnika: '012345678' })),
  })),
  zdarzenie: {
    ...PRZYKLAD_RODZINA.zdarzenie,
    dzieci: PRZYKLAD_RODZINA.zdarzenie.dzieci.map((d) => ({
      ...d,
      dane: { imie: 'Ignacy', nazwisko: 'Testowski', pesel: '26120112345', miejsceUrodzenia: 'Przykładowo' },
    })),
  },
};

const ZAKAZANE = [
  'Zofia',
  'Testowska',
  '90010112345',
  'Wymyślona',
  '00-950',
  'Przykładowo',
  'ZZ1234567',
  '600 700 800',
  'zofia@example.com',
  '1090 1014',
  'Firma Fikcyjna',
  '5260250274',
  '012345678',
  'Ignacy',
  'Testowski',
  '26120112345',
];

describe('rodzinaDlaModelu', () => {
  it('usuwa dane osobowe osób, dzieci i płatnika', () => {
    const json = JSON.stringify(rodzinaDlaModelu(Z_DANYMI));
    for (const z of ZAKAZANE) expect(json, z).not.toContain(z);
  });

  it('zostawia to, czego silnik potrzebuje do wyniku', () => {
    const r = rodzinaDlaModelu(Z_DANYMI);
    expect(r.dataAnalizy).toBe(PRZYKLAD_RODZINA.dataAnalizy);
    expect(r.zdarzenie.data).toBe(PRZYKLAD_RODZINA.zdarzenie.data);
    expect(r.zdarzenie.dzieci).toHaveLength(PRZYKLAD_RODZINA.zdarzenie.dzieci.length);
    expect(r.osoby.map((o) => [o.id, o.rola])).toEqual(PRZYKLAD_RODZINA.osoby.map((o) => [o.id, o.rola]));
    expect(r.osoby[0].tytuly[0].rodzaj).toBe(PRZYKLAD_RODZINA.osoby[0].tytuly[0].rodzaj);
    expect(r.osoby[0].tytuly[0].wynagrodzenieMiesieczne).toBe(PRZYKLAD_RODZINA.osoby[0].tytuly[0].wynagrodzenieMiesieczne);
  });

  it('nie zmienia danych wejściowych', () => {
    const przed = JSON.stringify(Z_DANYMI);
    rodzinaDlaModelu(Z_DANYMI);
    expect(JSON.stringify(Z_DANYMI)).toBe(przed);
  });
});

describe('wyczyscPytanie', () => {
  it('usuwa PESEL, numer konta, e-mail i telefon', () => {
    const t = wyczyscPytanie(
      'Mój PESEL 90010112345, konto PL61 1090 1014 0000 0712 1981 2874, mail a.b@example.com, tel. +48 600 700 800',
      PRZYKLAD_RODZINA,
    );
    for (const z of ['90010112345', '1090', 'a.b@example.com', '600 700 800']) expect(t, z).not.toContain(z);
    expect(t).toContain('[usunięto]');
  });

  it('usuwa imiona, nazwiska i adres znane z profilu, bez względu na wielkość liter', () => {
    const t = wyczyscPytanie('Jestem zofia TESTOWSKA z miejscowości Przykładowo, syn Ignacy', Z_DANYMI);
    for (const z of ['zofia', 'TESTOWSKA', 'Przykładowo', 'Ignacy']) expect(t, z).not.toContain(z);
  });

  it('zostawia daty, kwoty i tygodnie', () => {
    const t = wyczyscPytanie('Co jeśli od 2027-04-20 tata weźmie 9 tygodni? Zarabiam 8000 zł, czyli 8 000 zł.', PRZYKLAD_RODZINA);
    expect(t).toBe('Co jeśli od 2027-04-20 tata weźmie 9 tygodni? Zarabiam 8000 zł, czyli 8 000 zł.');
  });
});
