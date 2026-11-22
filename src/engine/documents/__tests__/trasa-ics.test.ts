/** POST /api/documents/ics – plik kalendarza z terminami planu. */
import { describe, expect, it } from 'vitest';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { POST } from '../../../../app/api/documents/ics/route';
import { POST as POST_DOKUMENTY } from '../../../../app/api/documents/route';

const zapytanie = (cialo: string) => new Request('http://localhost/api/documents/ics', { method: 'POST', body: cialo, headers: { 'content-type': 'application/json' } });

describe('POST /api/documents/ics', () => {
  it('zwraca text/calendar jako plik do pobrania', async () => {
    const res = await POST(zapytanie(JSON.stringify({ rodzina: PRZYKLAD_RODZINA, plan: PRZYKLAD_PLAN })));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/calendar; charset=utf-8');
    expect(res.headers.get('content-disposition')).toContain('attachment;');
    const tekst = await res.text();
    expect(tekst.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(tekst).toContain('DTSTART;VALUE=DATE:20270330');
    expect(tekst).toContain('DTSTAMP:20261121T000000Z'); // „dziś” z rodzina.dataAnalizy, nie z zegara
  });

  it('zły JSON, brak pola albo zła data → 400 z { blad }', async () => {
    for (const cialo of ['{nie json', JSON.stringify({ rodzina: PRZYKLAD_RODZINA }), JSON.stringify({ rodzina: { ...PRZYKLAD_RODZINA, dataAnalizy: '21.11.2026' }, plan: PRZYKLAD_PLAN })]) {
      const res = await POST(zapytanie(cialo));
      expect(res.status, cialo).toBe(400);
      expect(typeof (await res.json()).blad).toBe('string');
    }
  });
});

describe('POST /api/documents', () => {
  it('zła data w odcinku → 400 zamiast błędu serwera', async () => {
    const plan = { ...PRZYKLAD_PLAN, odcinki: [{ ...PRZYKLAD_PLAN.odcinki[0], od: '2026-13-01' }] };
    const res = await POST_DOKUMENTY(zapytanie(JSON.stringify({ rodzina: PRZYKLAD_RODZINA, plan })));
    expect(res.status).toBe(400);
  });

  it('poprawne dane → wynik z kto wypłaca, dokumentami i terminami', async () => {
    const res = await POST_DOKUMENTY(zapytanie(JSON.stringify({ rodzina: PRZYKLAD_RODZINA, plan: PRZYKLAD_PLAN })));
    expect(res.status).toBe(200);
    const w = await res.json();
    expect(w.ktoWyplaca[0].kto).toBe('platnik');
    expect(w.dokumenty.length).toBeGreaterThan(0);
    expect(w.terminy.length).toBeGreaterThan(0);
  });
});
