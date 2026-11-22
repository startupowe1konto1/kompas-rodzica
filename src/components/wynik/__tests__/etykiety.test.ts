import { describe, expect, it } from 'vitest';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { etykietaKtoSklada, etykietaOsoby, nazwaMozliwosci } from '../etykiety';

describe('etykietaOsoby', () => {
  it('imię i rola', () => expect(etykietaOsoby(PRZYKLAD_RODZINA, 'mama')).toBe('Anna (Mama)'));
  it('nieznana osoba: samo id', () => expect(etykietaOsoby(PRZYKLAD_RODZINA, 'x')).toBe('x'));
});

describe('etykietaKtoSklada', () => {
  it('płatnik', () => expect(etykietaKtoSklada(PRZYKLAD_RODZINA, 'platnik')).toBe('płatnik'));
  it('osoba', () => expect(etykietaKtoSklada(PRZYKLAD_RODZINA, 'mama')).toBe('Anna (Mama)'));
});

describe('nazwaMozliwosci', () => {
  it('znany kod ma polską nazwę', () => expect(nazwaMozliwosci('wariant_815')).toMatch(/81,5/));
});
