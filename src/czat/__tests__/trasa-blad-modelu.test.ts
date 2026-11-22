import { describe, expect, it, vi } from 'vitest';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../mocks/przyklad';

// Model niedostępny (limit, zły klucz, przeciążenie): trasa ma zwrócić 503 z czytelnym komunikatem, nie 500.
vi.mock('../model', () => ({
  czatDostepny: () => true,
  czyBladModelu: () => true,
  klientModelu: () => async () => {
    throw new Error('rate_limit');
  },
}));

const { POST } = await import('@/app/api/chat/route');

describe('POST /api/chat, gdy model nie odpowiada', () => {
  it('zwraca 503 z polem „blad”', async () => {
    const odp = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ rodzina: PRZYKLAD_RODZINA, plan: PRZYKLAD_PLAN, pytanie: 'Ile dostanę?' }),
      }),
    );
    expect(odp.status).toBe(503);
    expect((await odp.json()).blad).toMatch(/niedostępny/);
  });
});
