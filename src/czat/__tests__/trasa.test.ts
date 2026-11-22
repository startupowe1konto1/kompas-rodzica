import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/chat/route';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../mocks/przyklad';
import { czatDostepny } from '../model';

const post = (cialo: unknown) =>
  POST(new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify(cialo), headers: { 'Content-Type': 'application/json' } }));

describe('/api/chat bez klucza API', () => {
  let klucz: string | undefined;
  beforeEach(() => {
    klucz = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => {
    if (klucz === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = klucz;
  });

  it('GET mówi, że czat jest niedostępny', async () => {
    expect(czatDostepny()).toBe(false);
    const odp = await GET();
    expect(odp.status).toBe(200);
    expect(await odp.json()).toEqual({ dostepny: false });
  });

  it('POST zwraca 503 z polem „blad” i nie łączy się z siecią', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const odp = await post({ rodzina: PRZYKLAD_RODZINA, plan: PRZYKLAD_PLAN, pytanie: 'Ile dostanę?' });
    expect(odp.status).toBe(503);
    expect(typeof (await odp.json()).blad).toBe('string');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('/api/chat z kluczem API', () => {
  let klucz: string | undefined;
  beforeEach(() => {
    klucz = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'klucz-testowy';
  });
  afterEach(() => {
    if (klucz === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = klucz;
  });

  it('GET mówi, że czat działa', async () => {
    expect(await (await GET()).json()).toEqual({ dostepny: true });
  });

  it('złe dane → 400 przed wołaniem modelu', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const bezPytania = await post({ rodzina: PRZYKLAD_RODZINA, plan: PRZYKLAD_PLAN });
    expect(bezPytania.status).toBe(400);
    const pustePytanie = await post({ rodzina: PRZYKLAD_RODZINA, plan: PRZYKLAD_PLAN, pytanie: ' ' });
    expect(pustePytanie.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
