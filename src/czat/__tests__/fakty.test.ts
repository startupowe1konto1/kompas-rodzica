import { describe, expect, it } from 'vitest';
import { dokumentyITerminy, obliczKwoty, ustalUprawnienia, walidujPlan, WERSJE_DOMYSLNE } from '../../engine';
import type { Plan } from '../../engine/types';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../mocks/przyklad';
import { rodzinaDlaModelu } from '../anonimizacja';
import { zbierzFakty } from '../fakty';

describe('zbierzFakty', () => {
  it('bierze wyniki z silnika – tych samych funkcji co trasy REST', () => {
    const r = rodzinaDlaModelu(PRZYKLAD_RODZINA);
    const f = zbierzFakty(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, WERSJE_DOMYSLNE);
    expect(f.uprawnienia).toEqual(ustalUprawnienia(r, WERSJE_DOMYSLNE));
    expect(f.walidacja).toEqual(walidujPlan(r, PRZYKLAD_PLAN, WERSJE_DOMYSLNE));
    expect(f.kwoty).toEqual(obliczKwoty(r, PRZYKLAD_PLAN, WERSJE_DOMYSLNE));
    expect(f.dokumenty).toEqual(dokumentyITerminy(r, PRZYKLAD_PLAN, WERSJE_DOMYSLNE));
    expect(f.plan).toEqual(PRZYKLAD_PLAN);
  });

  it('liczy na rodzinie bez danych osobowych', () => {
    const f = zbierzFakty(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, WERSJE_DOMYSLNE);
    const json = JSON.stringify(f);
    expect(json).not.toContain('Anna');
    expect(json).not.toContain('Przykładowa Firma');
  });

  it('gdy silnik nie policzy wyniku (brak parametrów), części są null, a funkcja nie rzuca', () => {
    const f = zbierzFakty(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, []);
    expect(f.uprawnienia).toBeNull();
    expect(f.kwoty).toBeNull();
    expect(f.plan).toEqual(PRZYKLAD_PLAN);
  });

  it('plan z błędnymi danymi nie wywraca zbierania faktów', () => {
    const zepsuty = { ...PRZYKLAD_PLAN, odcinki: 'zepsute' } as unknown as Plan;
    expect(() => zbierzFakty(PRZYKLAD_RODZINA, zepsuty, WERSJE_DOMYSLNE)).not.toThrow();
  });
});
