/** Klient REST (src/lib/api.ts) z podstawionym `fetch`: adresy, metody i odczyt odpowiedzi. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../mocks/przyklad';
import { api, BladApi, odczytajDoUzupelnienia } from '../api';

function podstawFetch(odpowiedz: Response) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => odpowiedz);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api.zrodlo', () => {
  it('bez osoby – adres bez parametru', async () => {
    const f = podstawFetch(Response.json({ zrodlo: 'ezus' }));
    await api.zrodlo('ezus', 'anna');
    expect(f.mock.calls[0][0]).toBe('/api/mock/ezus/anna');
  });

  it('z osobą – parametr ?osoba=, zakodowany', async () => {
    const f = podstawFetch(Response.json({ zrodlo: 'mobywatel' }));
    await api.zrodlo('mobywatel', 'para', 'tata 2');
    expect(f.mock.calls[0][0]).toBe('/api/mock/mobywatel/para?osoba=tata%202');
  });
});

describe('api.wniosek', () => {
  const zapytanie = { rodzina: PRZYKLAD_RODZINA, plan: PRZYKLAD_PLAN, osobaId: PRZYKLAD_RODZINA.osoby[0].id };

  it('POST JSON na /api/forms/{kod}; zwraca PDF i braki z nagłówka x-do-uzupelnienia', async () => {
    const braki = ['PESEL dziecka', 'Numer rachunku'];
    const f = podstawFetch(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        headers: { 'Content-Type': 'application/pdf', 'x-do-uzupelnienia': encodeURIComponent(JSON.stringify(braki)) },
      }),
    );
    const wynik = await api.wniosek('ZAM', zapytanie);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('/api/forms/ZAM');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(zapytanie);
    expect(wynik.doUzupelnienia).toEqual(braki);
    expect(wynik.pdf.size).toBe(4);
  });

  it('błąd trasy → BladApi z treścią i statusem', async () => {
    podstawFetch(Response.json({ blad: 'Nie generujemy dokumentu „Z-3”.' }, { status: 404 }));
    const blad = await api.wniosek('Z-3', zapytanie).catch((e: unknown) => e);
    expect(blad).toBeInstanceOf(BladApi);
    expect(blad).toMatchObject({ status: 404, message: 'Nie generujemy dokumentu „Z-3”.' });
  });

  it('nagłówek braków: brak albo nieczytelny → pusta lista', () => {
    expect(odczytajDoUzupelnienia(null)).toEqual([]);
    expect(odczytajDoUzupelnienia('%E0%A4%A')).toEqual([]);
    expect(odczytajDoUzupelnienia(encodeURIComponent('{"a":1}'))).toEqual([]);
  });
});

describe('api.odczytajWniosek', () => {
  it('POST multipart na /api/forms/odczyt z plikiem w polu „plik”, bez ręcznego Content-Type', async () => {
    const f = podstawFetch(Response.json({ rozpoznano: false, pochodzenie: [], nieodczytane: [], komunikat: 'x' }));
    const plik = new File([new Uint8Array([1, 2, 3])], 'zam.pdf', { type: 'application/pdf' });
    const wynik = await api.odczytajWniosek(plik);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('/api/forms/odczyt');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toBeUndefined();
    const cialo = init?.body as FormData;
    expect(cialo).toBeInstanceOf(FormData);
    expect((cialo.get('plik') as File).name).toBe('zam.pdf');
    expect(wynik.rozpoznano).toBe(false);
  });
});
