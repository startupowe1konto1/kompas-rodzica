/** POST /api/calculate – złe kształty danych dają 400 z { blad }, nie 500. */
import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/calculate/route';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../mocks/przyklad';

const zapytanie = (cialo: unknown) =>
  new Request('http://localhost/api/calculate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cialo) });

const mama = PRZYKLAD_RODZINA.osoby[0];
const zTytulem = (tytul: Record<string, unknown>) => ({ ...PRZYKLAD_RODZINA, osoby: [{ ...mama, tytuly: [tytul] }] });

describe('POST /api/calculate', () => {
  it('poprawne dane: 200 i kwoty wzorca', async () => {
    const res = await POST(zapytanie({ rodzina: PRZYKLAD_RODZINA, plan: PRZYKLAD_PLAN }));
    expect(res.status).toBe(200);
    expect((await res.json()).sumaRazem).toBe(68295.08);
  });

  it('odcinek z błędną datą to nie błąd kształtu: 200 z uwagą ODCINEK_BLEDNA_DATA', async () => {
    const plan = { ...PRZYKLAD_PLAN, odcinki: [{ ...PRZYKLAD_PLAN.odcinki[0], od: '2026-13-01' }] };
    const res = await POST(zapytanie({ rodzina: PRZYKLAD_RODZINA, plan }));
    expect(res.status).toBe(200);
    expect((await res.json()).uwagi.map((u: { kod: string }) => u.kod)).toContain('ODCINEK_BLEDNA_DATA');
  });

  const zle: [string, unknown][] = [
    ['osoba bez tytuly', { rodzina: { ...PRZYKLAD_RODZINA, osoby: [{ id: 'mama', rola: 'matka' }] }, plan: PRZYKLAD_PLAN }],
    ['osoby to nie lista', { rodzina: { ...PRZYKLAD_RODZINA, osoby: 'mama' }, plan: PRZYKLAD_PLAN }],
    ['plan bez odcinki', { rodzina: PRZYKLAD_RODZINA, plan: { id: 'p', nazwa: 'x', wariant815: false } }],
    ['odcinek to nie obiekt', { rodzina: PRZYKLAD_RODZINA, plan: { ...PRZYKLAD_PLAN, odcinki: [null] } }],
    ['tytuł bez od', { rodzina: zTytulem({ ...mama.tytuly[0], od: undefined }), plan: PRZYKLAD_PLAN }],
    ['tytuł z od, które nie jest datą', { rodzina: zTytulem({ ...mama.tytuly[0], od: 'wczoraj' }), plan: PRZYKLAD_PLAN }],
    ['tytuł z chorobowoOd, które nie jest datą', { rodzina: zTytulem({ ...mama.tytuly[0], chorobowoOd: '2026-02-30' }), plan: PRZYKLAD_PLAN }],
    ['lista miesięcy z pustym wpisem', { rodzina: zTytulem({ ...mama.tytuly[0], podstawaSkladek: [null] }), plan: PRZYKLAD_PLAN }],
    ['eZLA to nie lista', { rodzina: { ...PRZYKLAD_RODZINA, osoby: [{ ...mama, zdrowie: { eZLA: 'brak' } }] }, plan: PRZYKLAD_PLAN }],
  ];
  for (const [opis, cialo] of zle) {
    it(`${opis}: 400 z { blad }`, async () => {
      const res = await POST(zapytanie(cialo));
      expect(res.status).toBe(400);
      expect(typeof (await res.json()).blad).toBe('string');
    });
  }
});
