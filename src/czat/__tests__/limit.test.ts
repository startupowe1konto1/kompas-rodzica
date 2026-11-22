import { describe, expect, it } from 'vitest';
import { LimitZapytan, adresKlienta, limityZeZmiennych } from '../limit';

const GODZINA = 3_600_000;
const DOBA = 24 * GODZINA;

function limit(naKlucz = 3, globalnie = 5) {
  let teraz = 0;
  const l = new LimitZapytan({ naKlucz, oknoKluczaMs: GODZINA, globalnie, oknoGlobalneMs: DOBA }, () => teraz);
  return { l, przesun: (ms: number) => (teraz += ms) };
}

describe('LimitZapytan', () => {
  it('przepuszcza do limitu na adres, potem odmawia z czasem do ponowienia', () => {
    const { l } = limit(3);
    expect([1, 2, 3].map(() => l.sprawdz('a').ok)).toEqual([true, true, true]);
    const czwarte = l.sprawdz('a');
    expect(czwarte.ok).toBe(false);
    if (!czwarte.ok) expect(czwarte.sprobujZaS).toBe(3600);
  });

  it('inny adres ma osobny licznik', () => {
    const { l } = limit(1);
    expect(l.sprawdz('a').ok).toBe(true);
    expect(l.sprawdz('a').ok).toBe(false);
    expect(l.sprawdz('b').ok).toBe(true);
  });

  it('okno przesuwa się: po godzinie od pierwszego pytania wolno znowu', () => {
    const { l, przesun } = limit(2);
    l.sprawdz('a');
    przesun(10 * 60_000);
    l.sprawdz('a');
    expect(l.sprawdz('a').ok).toBe(false);
    przesun(GODZINA - 10 * 60_000);
    expect(l.sprawdz('a').ok).toBe(true);
    expect(l.sprawdz('a').ok).toBe(false);
  });

  it('limit łączny na dobę obejmuje wszystkie adresy', () => {
    const { l, przesun } = limit(100, 3);
    expect(['a', 'b', 'c'].map((k) => l.sprawdz(k).ok)).toEqual([true, true, true]);
    const r = l.sprawdz('d');
    expect(r.ok).toBe(false);
    przesun(DOBA);
    expect(l.sprawdz('d').ok).toBe(true);
  });

  it('odmowa nie zużywa limitu', () => {
    const { l, przesun } = limit(1);
    l.sprawdz('a');
    l.sprawdz('a');
    l.sprawdz('a');
    przesun(GODZINA);
    expect(l.sprawdz('a').ok).toBe(true);
  });
});

describe('adresKlienta', () => {
  const zNaglowkami = (h: Record<string, string>) => new Request('http://localhost/api/chat', { headers: h });

  it('bierze pierwszy adres z x-forwarded-for (Vercel), potem x-real-ip', () => {
    expect(adresKlienta(zNaglowkami({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(adresKlienta(zNaglowkami({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(adresKlienta(zNaglowkami({}))).toBe('nieznany');
  });
});

describe('limityZeZmiennych', () => {
  it('domyślnie 60 na godzinę z adresu i 500 na dobę', () => {
    expect(limityZeZmiennych({})).toMatchObject({ naKlucz: 60, globalnie: 500 });
  });

  it('czyta ZUSIK_LIMIT_NA_GODZINE i ZUSIK_LIMIT_NA_DOBE, złe wartości ignoruje', () => {
    expect(limityZeZmiennych({ ZUSIK_LIMIT_NA_GODZINE: '10', ZUSIK_LIMIT_NA_DOBE: '200' })).toMatchObject({ naKlucz: 10, globalnie: 200 });
    expect(limityZeZmiennych({ ZUSIK_LIMIT_NA_GODZINE: 'abc', ZUSIK_LIMIT_NA_DOBE: '-5' })).toMatchObject({ naKlucz: 60, globalnie: 500 });
  });
});
