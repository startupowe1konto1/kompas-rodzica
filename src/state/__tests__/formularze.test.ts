import { afterEach, describe, expect, it, vi } from 'vitest';
import { BladApi } from '../../lib/api';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../mocks/przyklad';
import { odczytajWniosek, pobierzIcs, pobierzWniosek } from '../formularze';

afterEach(() => vi.unstubAllGlobals());
function zFetch(odp: Response) {
  const f = vi.fn().mockResolvedValue(odp);
  vi.stubGlobal('fetch', f);
  return f;
}
const Z = { rodzina: PRZYKLAD_RODZINA, plan: PRZYKLAD_PLAN, osobaId: 'mama' };

describe('formularze – adapter do czasu funkcji w api.ts', () => {
  it('pobierzWniosek: PDF i lista braków z nagłówka', async () => {
    const f = zFetch(new Response(new Uint8Array([37, 80, 68, 70]), {
      headers: { 'Content-Type': 'application/pdf', 'x-do-uzupelnienia': encodeURIComponent(JSON.stringify(['Numer rachunku'])) },
    }));
    const w = await pobierzWniosek('ZAM', Z);
    expect(f).toHaveBeenCalledWith('/api/forms/ZAM', expect.objectContaining({ method: 'POST' }));
    expect(w.doUzupelnienia).toEqual(['Numer rachunku']);
    expect(w.pdf.size).toBe(4);
  });
  it('brak nagłówka braków → pusta lista', async () => {
    zFetch(new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'application/pdf' } }));
    expect((await pobierzWniosek('ZAM', Z)).doUzupelnienia).toEqual([]);
  });
  it('501 → BladApi ze statusem 501', async () => {
    zFetch(Response.json({ blad: 'Jeszcze niegotowe' }, { status: 501 }));
    await expect(pobierzWniosek('ZAM', Z)).rejects.toMatchObject({ status: 501 });
  });
  it('404 bez JSON-a (strona 404 Next.js) → BladApi 404 z domyślnym komunikatem', async () => {
    zFetch(new Response('<html>nie ma</html>', { status: 404 }));
    await expect(pobierzWniosek('Z-3', Z)).rejects.toMatchObject({ status: 404, message: 'Błąd 404' });
  });
  it('odczytajWniosek: multipart z polem „plik”', async () => {
    const f = zFetch(Response.json({ rozpoznano: false, pochodzenie: [], nieodczytane: [], komunikat: 'skan' }));
    const w = await odczytajWniosek(new File([new Uint8Array([1])], 'zam.pdf', { type: 'application/pdf' }));
    expect((f.mock.calls[0][1].body as FormData).get('plik')).toBeInstanceOf(File);
    expect(f.mock.calls[0][0]).toBe('/api/forms/odczyt');
    expect(w.rozpoznano).toBe(false);
  });
  it('pobierzIcs: 200 → Blob; wysyła rodzinę i plan', async () => {
    const f = zFetch(new Response('BEGIN:VCALENDAR', { headers: { 'Content-Type': 'text/calendar' } }));
    const b = await pobierzIcs(PRZYKLAD_RODZINA, PRZYKLAD_PLAN);
    expect(b.size).toBeGreaterThan(0);
    expect(f.mock.calls[0][0]).toBe('/api/documents/ics');
    expect(JSON.parse(f.mock.calls[0][1].body as string)).toHaveProperty('plan');
  });
  it('pobierzIcs: 404 (trasy jeszcze nie ma) → BladApi 404', async () => {
    zFetch(new Response('nie ma', { status: 404 }));
    await expect(pobierzIcs(PRZYKLAD_RODZINA, PRZYKLAD_PLAN)).rejects.toBeInstanceOf(BladApi);
  });
});
