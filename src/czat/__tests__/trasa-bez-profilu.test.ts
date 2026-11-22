import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../mocks/przyklad';

// Atrapa połączenia z modelem: trasa nie może łączyć się z siecią w testach. Zapisujemy, co dostał model.
const wyslane = vi.hoisted(() => [] as { messages: { content: unknown }[] }[]);

vi.mock('../model', () => ({
  czatDostepny: () => true,
  czyBladModelu: () => false,
  klientModelu: () => async (p: { messages: { content: unknown }[] }) => {
    wyslane.push(structuredClone(p));
    return {
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-opus-5-5',
      content: [{ type: 'text', text: 'Dokończ ankietę „Moja sytuacja”.' }],
      stop_reason: 'end_turn',
      stop_details: null,
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    };
  },
}));

const { POST } = await import('@/app/api/chat/route');

const post = (cialo: unknown) =>
  POST(new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify(cialo), headers: { 'Content-Type': 'application/json' } }));

const doModelu = () => String(wyslane.at(-1)?.messages[0].content ?? '');

beforeEach(() => {
  wyslane.length = 0;
});

describe('POST /api/chat bez profilu albo z niepełną ankietą', () => {
  it('rodzina i plan null → odpowiedź 200', async () => {
    const odp = await post({ rodzina: null, plan: null, pytanie: 'Jak zacząć?' });
    expect(odp.status).toBe(200);
    expect((await odp.json()).kod).toBe('ODPOWIEDZ');
    expect(doModelu()).toContain('"profil":"brak"');
  });

  it('niepełna ankieta (bez daty porodu) → 200 jak bez profilu, nie błąd', async () => {
    const rodzina = { ...PRZYKLAD_RODZINA, zdarzenie: { ...PRZYKLAD_RODZINA.zdarzenie, data: '' } };
    const odp = await post({ rodzina, plan: PRZYKLAD_PLAN, pytanie: 'Jak możesz mi pomóc?' });
    expect(odp.status).toBe(200);
    expect(doModelu()).toContain('"profil":"brak"');
  });

  it('rodzina w złym kształcie albo plan bez odcinków → 200 jak bez profilu', async () => {
    expect((await post({ rodzina: { osoby: 'x' }, plan: null, pytanie: 'Jak zacząć?' })).status).toBe(200);
    expect((await post({ rodzina: PRZYKLAD_RODZINA, plan: { id: 'p' }, pytanie: 'Jak zacząć?' })).status).toBe(200);
    expect(doModelu()).toContain('"profil":"brak"');
  });

  it('niepełna ankieta nie wysyła do modelu danych osobowych', async () => {
    const rodzina = {
      ...PRZYKLAD_RODZINA,
      osoby: [{ ...PRZYKLAD_RODZINA.osoby[0], dane: { imie: 'Zofia', pesel: '90010112345' } }],
      zdarzenie: { ...PRZYKLAD_RODZINA.zdarzenie, data: '' },
    };
    await post({ rodzina, plan: null, pytanie: 'Jestem Zofia, PESEL 90010112345' });
    expect(JSON.stringify(wyslane)).not.toContain('Zofia');
    expect(JSON.stringify(wyslane)).not.toContain('90010112345');
  });

  it('pełny profil → model dostaje wynik silnika', async () => {
    await post({ rodzina: PRZYKLAD_RODZINA, plan: PRZYKLAD_PLAN, pytanie: 'Ile dostanę?' });
    expect(doModelu()).toContain('"uprawnienia"');
  });

  it('puste pytanie dalej daje 400', async () => {
    expect((await post({ rodzina: null, plan: null, pytanie: ' ' })).status).toBe(400);
    expect(wyslane).toHaveLength(0);
  });
});
