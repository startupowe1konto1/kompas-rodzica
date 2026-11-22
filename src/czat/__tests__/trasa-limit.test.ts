import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { zresetujLimitCzatu } from '../limit';

vi.mock('../model', () => ({
  czatDostepny: () => true,
  czyBladModelu: () => false,
  klientModelu: () => async () => ({
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content: [{ type: 'text', text: 'Ok.' }],
    stop_reason: 'end_turn',
    stop_details: null,
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  }),
}));

const { POST } = await import('@/app/api/chat/route');

const post = (pytanie: string, ip = '203.0.113.7') =>
  POST(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ rodzina: null, plan: null, pytanie }),
    }),
  );

const poprzedni = process.env.ZUSIK_LIMIT_NA_GODZINE;

beforeEach(() => {
  process.env.ZUSIK_LIMIT_NA_GODZINE = '2';
  zresetujLimitCzatu();
});
afterAll(() => {
  if (poprzedni === undefined) delete process.env.ZUSIK_LIMIT_NA_GODZINE;
  else process.env.ZUSIK_LIMIT_NA_GODZINE = poprzedni;
  zresetujLimitCzatu();
});

describe('POST /api/chat – limit pytań', () => {
  it('po przekroczeniu limitu: 429, Retry-After i komunikat w polu „blad”', async () => {
    expect((await post('Pytanie 1')).status).toBe(200);
    expect((await post('Pytanie 2')).status).toBe(200);
    const odp = await post('Pytanie 3');
    expect(odp.status).toBe(429);
    expect(Number(odp.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(typeof (await odp.json()).blad).toBe('string');
  });

  it('inny adres IP nie jest zablokowany', async () => {
    await post('1');
    await post('2');
    expect((await post('3', '198.51.100.2')).status).toBe(200);
  });

  it('błędne zapytanie (puste pytanie) nie zużywa limitu', async () => {
    expect((await post(' ')).status).toBe(400);
    expect((await post(' ')).status).toBe(400);
    expect((await post('Pytanie')).status).toBe(200);
  });
});
