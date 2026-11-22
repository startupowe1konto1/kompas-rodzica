/**
 * GET /api/mock/{zrodlo}/{persona}: odpowiedź symulowanej usługi albo { blad } z kodem 400 / 404. Tor D.
 */
import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/mock/[zrodlo]/[persona]/route';
import type { OdpowiedzZrodla } from '../../engine/types';

function zapytaj(zrodlo: string, persona: string, query = '') {
  const request = new Request(`http://localhost/api/mock/${zrodlo}/${persona}${query}`);
  return GET(request, { params: Promise.resolve({ zrodlo, persona }) });
}

describe('GET /api/mock/{zrodlo}/{persona}', () => {
  it('zwraca OdpowiedzZrodla dla znanej usługi i persony', async () => {
    const odp = await zapytaj('ezus', 'anna-etat');
    expect(odp.status).toBe(200);
    const json = (await odp.json()) as OdpowiedzZrodla;
    expect(json).toMatchObject({ zrodlo: 'ezus', symulacja: true });
    expect(json.dane.tytuly?.[0].rodzaj).toBe('umowa_o_prace');
    expect(Array.isArray(json.pochodzenie)).toBe(true);
    expect(Array.isArray(json.brakuje)).toBe(true);
  });

  it('dokleja dokumenty usługi ze statusem (zaświadczenie o zadłużeniu oczekuje do dnia po porodzie)', async () => {
    const json = (await (await zapytaj('ezus', 'ola-firma')).json()) as OdpowiedzZrodla;
    const zadluzenie = json.dokumenty?.find((d) => d.kod === 'zaswiadczenie_o_zadluzeniu');
    expect(zadluzenie).toMatchObject({ status: 'oczekuje', wystawienieOd: '2026-12-08' });
    expect(json.dokumenty?.some((d) => d.kod === 'potwierdzenie_danych_z_zus' && d.status === 'wystawione')).toBe(true);
  });

  it('mObywatel: dane małżonka w `osoby`', async () => {
    const json = (await (await zapytaj('mobywatel', 'marta-i-piotr')).json()) as OdpowiedzZrodla;
    expect(json.osoby?.[0]).toMatchObject({ id: 'tata', dane: { imie: 'Piotr' } });
    expect(json.dokumenty).toBeUndefined();
  });

  it('?osoba= wybiera drugą osobę w personie (druga osoba loguje się sama)', async () => {
    const json = (await (await zapytaj('ezus', 'marta-i-piotr', '?osoba=tata')).json()) as OdpowiedzZrodla;
    expect(json.dane.id).toBe('tata');
  });

  it('nieznana persona → 404 z polem blad', async () => {
    const odp = await zapytaj('ezus', 'nie-ma-takiej');
    expect(odp.status).toBe(404);
    expect(typeof (await odp.json()).blad).toBe('string');
  });

  it('nieznana osoba w personie → 404 z polem blad', async () => {
    const odp = await zapytaj('ezus', 'anna-etat', '?osoba=tata');
    expect(odp.status).toBe(404);
    expect(typeof (await odp.json()).blad).toBe('string');
  });

  it('nieznane źródło → 400 z polem blad', async () => {
    const odp = await zapytaj('pue-zus', 'anna-etat');
    expect(odp.status).toBe(400);
    expect(typeof (await odp.json()).blad).toBe('string');
  });

  it('źródło, które nie jest e-usługą (np. pracodawca) → 400', async () => {
    const odp = await zapytaj('pracodawca', 'anna-etat');
    expect(odp.status).toBe(400);
  });
});
