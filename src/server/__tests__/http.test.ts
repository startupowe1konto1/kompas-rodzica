import { describe, expect, it } from 'vitest';
import { PRZYKLAD_RODZINA } from '../../mocks/przyklad';
import { BladDanych, obsluz, wymagaj } from '../http';

const zapytanie = (cialo: unknown) =>
  new Request('http://x/api', { method: 'POST', body: JSON.stringify(cialo), headers: { 'content-type': 'application/json' } });

describe('wymagaj – rodzina', () => {
  it('przepuszcza poprawną rodzinę', () => {
    expect(() => wymagaj({ rodzina: PRZYKLAD_RODZINA }, ['rodzina'])).not.toThrow();
  });

  it.each([
    ['bez zdarzenia', { ...PRZYKLAD_RODZINA, zdarzenie: undefined }],
    ['zła data zdarzenia', { ...PRZYKLAD_RODZINA, zdarzenie: { ...PRZYKLAD_RODZINA.zdarzenie, data: '2026-13-40' } }],
    ['bez listy dzieci', { ...PRZYKLAD_RODZINA, zdarzenie: { ...PRZYKLAD_RODZINA.zdarzenie, dzieci: undefined } }],
    ['osoby nie są listą', { ...PRZYKLAD_RODZINA, osoby: {} }],
    ['osoba bez tytułów', { ...PRZYKLAD_RODZINA, osoby: [{ id: 'mama', rola: 'matka' }] }],
    ['zła data analizy', { ...PRZYKLAD_RODZINA, dataAnalizy: 'dziś' }],
  ])('rzuca BladDanych: %s', (_, rodzina) => {
    expect(() => wymagaj({ rodzina }, ['rodzina'])).toThrow(BladDanych);
  });
});

describe('obsluz', () => {
  it('rodzina bez zdarzenia → 400 z { blad }, a nie 500', async () => {
    const r = await obsluz(zapytanie({ rodzina: { ...PRZYKLAD_RODZINA, zdarzenie: undefined } }), (c) =>
      wymagaj<{ rodzina: unknown }>(c, ['rodzina']),
    );
    expect(r.status).toBe(400);
    expect(await r.json()).toHaveProperty('blad');
  });
});
