import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { komunikatPoZapisie } from '@/app/admin/apiAdmina';
import { GET, PUT } from '@/app/api/admin/params/route';
import { PARAMETRY_2026, WERSJE_DOMYSLNE } from '../../engine/params';
import type { Parametry } from '../../engine/types';
import { przywrocDomyslne } from '../magazynParametrow';

describe('komunikat panelu po zapisie', () => {
  it('zapis trwały: potwierdzenie, że kalkulator używa nowych wartości', () => {
    expect(komunikatPoZapisie('zapis', true)).toEqual({ rodzaj: 'ok', tekst: 'Zapisano zmiany. Kalkulator używa już nowych wartości.' });
    expect(komunikatPoZapisie('przywrocenie', true).rodzaj).toBe('ok');
  });
  it('zapis tylko w pamięci serwera: ostrzeżenie bez obietnicy, że zmiana działa wszędzie', () => {
    for (const akcja of ['zapis', 'przywrocenie'] as const) {
      const k = komunikatPoZapisie(akcja, false);
      expect(k.rodzaj).toBe('ostrzezenie');
      expect(k.tekst).toContain('w pamięci tego serwera');
      expect(k.tekst).toContain('kilkoma instancjami');
      expect(k.tekst).not.toContain('Kalkulator używa już');
    }
  });
});

const ZMIENNE = ['ADMIN_HASLO', 'MAGAZYN_PARAMETROW', 'MAGAZYN_PARAMETROW_PLIK'] as const;
const HASLO = 'haslo-testowe-123';

function kopia(): Parametry {
  return structuredClone(PARAMETRY_2026);
}

function put(cialo: unknown, haslo?: string): Request {
  const naglowki: Record<string, string> = { 'content-type': 'application/json' };
  if (haslo !== undefined) naglowki['x-admin-haslo'] = haslo;
  return new Request('http://localhost/api/admin/params', {
    method: 'PUT',
    headers: naglowki,
    body: JSON.stringify(cialo),
  });
}

async function odczyt(): Promise<Parametry[]> {
  return (await (await GET()).json()) as Parametry[];
}

describe('/api/admin/params', () => {
  let katalog: string;
  const stare: Record<string, string | undefined> = {};

  beforeEach(async () => {
    for (const z of ZMIENNE) stare[z] = process.env[z];
    katalog = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-params-'));
    delete process.env.MAGAZYN_PARAMETROW;
    process.env.MAGAZYN_PARAMETROW_PLIK = path.join(katalog, 'parametry.json');
    process.env.ADMIN_HASLO = HASLO;
    await przywrocDomyslne();
  });

  afterEach(async () => {
    await przywrocDomyslne();
    for (const z of ZMIENNE) {
      if (stare[z] === undefined) delete process.env[z];
      else process.env[z] = stare[z];
    }
    await fs.rm(katalog, { recursive: true, force: true });
  });

  it('GET zwraca 200 i tablice wersji', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('PUT bez naglowka, ze zlym haslem lub bez ADMIN_HASLO daje 401', async () => {
    const cialo = { wersje: [kopia()] };
    for (const res of [await PUT(put(cialo)), await PUT(put(cialo, 'zle'))]) {
      expect(res.status).toBe(401);
      expect(typeof ((await res.json()) as { blad: string }).blad).toBe('string');
    }
    delete process.env.ADMIN_HASLO;
    expect((await PUT(put(cialo, HASLO))).status).toBe(401);
    expect((await PUT(put(cialo, ''))).status).toBe(401);
  });

  it('PUT z dobrym haslem zapisuje, a GET zwraca zapis', async () => {
    const w = kopia();
    w.stawkiProc.rodzicielski = 75;
    const res = await PUT(put({ wersje: [w] }, HASLO));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { wersje: Parametry[]; trwale: boolean };
    expect(body.trwale).toBe(true);
    expect(body.wersje[0]?.stawkiProc.rodzicielski).toBe(75);
    expect((await odczyt())[0]?.stawkiProc.rodzicielski).toBe(75);
  });

  it('PUT ze stawka 150 daje 400 i nie zmienia magazynu', async () => {
    const w = kopia();
    w.stawkiProc.rodzicielski = 150;
    const res = await PUT(put({ wersje: [w] }, HASLO));
    expect(res.status).toBe(400);
    expect(typeof ((await res.json()) as { blad: string }).blad).toBe('string');
    expect(await odczyt()).toEqual(WERSJE_DOMYSLNE);
  });

  it('PUT z zerem dni w miesiacu do stawki dziennej daje 400 i nie zmienia magazynu', async () => {
    const w = kopia();
    w.kwoty.dniWMiesiacuDoStawkiDziennej = 0;
    const res = await PUT(put({ wersje: [w] }, HASLO));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { blad: string }).blad).toContain('kwoty.dniWMiesiacuDoStawkiDziennej');
    expect(await odczyt()).toEqual(WERSJE_DOMYSLNE);
  });

  it('PUT z ulamkiem tygodni daje 400', async () => {
    const w = kopia();
    w.wymiaryTyg.ojcowski = 2.5;
    expect((await PUT(put({ wersje: [w] }, HASLO))).status).toBe(400);
  });

  it('PUT z trescia bez wersji i bez przywrocDomyslne daje 400', async () => {
    expect((await PUT(put({}, HASLO))).status).toBe(400);
  });

  it('PUT z niepoprawnym JSON-em daje 400', async () => {
    const res = await PUT(
      new Request('http://localhost/api/admin/params', {
        method: 'PUT',
        headers: { 'x-admin-haslo': HASLO },
        body: '{zle',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('PUT { przywrocDomyslne: true } przywraca wartosci domyslne', async () => {
    const w = kopia();
    w.stawkiProc.rodzicielski = 75;
    await PUT(put({ wersje: [w] }, HASLO));
    const res = await PUT(put({ przywrocDomyslne: true }, HASLO));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { wersje: Parametry[]; trwale: boolean };
    expect(body.wersje).toEqual(WERSJE_DOMYSLNE);
    expect(await odczyt()).toEqual(WERSJE_DOMYSLNE);
  });
});
