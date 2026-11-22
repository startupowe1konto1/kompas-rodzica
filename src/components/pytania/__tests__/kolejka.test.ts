import { describe, expect, it } from 'vitest';
import { PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { KROKI_ANKIETY, PYTANIA } from '../definicje';
import { ekranWstecz, kolejkaEkranow, miejsceDlaPytania, miejsceEkranu, numeryPytan, sekcjeKolejki, znajdzEkran } from '../kolejka';
import { widocznePytania } from '../silnik-ankiety';

describe('kolejkaEkranow', () => {
  const widoczne = widocznePytania(PYTANIA, PRZYKLAD_RODZINA);
  const kroki = new Set(widoczne.map((p) => p.def.krok));
  it('telefon: od razu pierwsze pytanie (bez ekranu otwierającego), jedno pytanie na ekran, koniec na końcu', () => {
    const k = kolejkaEkranow(PYTANIA, PRZYKLAD_RODZINA, 'telefon');
    expect(k[0].rodzaj === 'pytania' && k[0].krok).toBe('kim_jestes');
    expect(k.at(-1)).toEqual({ rodzaj: 'koniec' });
    const pytania = k.filter((e) => e.rodzaj === 'pytania');
    expect(pytania).toHaveLength(k.length - 1); // wszystko poza końcem to ekrany pytań
    expect(pytania.every((e) => e.pytania.length === 1)).toBe(true);
    expect(pytania).toHaveLength(widoczne.length);
  });
  it('komputer: jeden ekran pytań na krok i koniec', () => {
    const k = kolejkaEkranow(PYTANIA, PRZYKLAD_RODZINA, 'komputer');
    expect(k.filter((e) => e.rodzaj === 'pytania')).toHaveLength(kroki.size);
    expect(k).toHaveLength(kroki.size + 1);
  });
  it('pytania jednego kroku idą jednym ciągiem, w kolejności kroków', () => {
    const k = kolejkaEkranow(PYTANIA, PRZYKLAD_RODZINA, 'telefon');
    const s = sekcjeKolejki(k);
    expect(s).toEqual([...kroki].sort((a, b) => KROKI_ANKIETY.findIndex((x) => x.id === a) - KROKI_ANKIETY.findIndex((x) => x.id === b)));
    const krokiEkranow = k.flatMap((e) => (e.rodzaj === 'pytania' ? [e.krok] : []));
    const zmiany = krokiEkranow.filter((krok, i) => i === 0 || krokiEkranow[i - 1] !== krok);
    expect(zmiany).toEqual(s); // żaden krok nie wraca po przerwie
  });
  it('zmiana odpowiedzi zmienia kolejkę, a miejsce wraca po kluczu pytania', () => {
    const przed = kolejkaEkranow(PYTANIA, PRZYKLAD_RODZINA, 'telefon');
    const idx = przed.findIndex((e) => e.rodzaj === 'pytania' && e.pytania[0].def.id === 'etap');
    const miejsce = miejsceEkranu(przed[idx], idx);
    const urodzone = { ...PRZYKLAD_RODZINA, zdarzenie: { ...PRZYKLAD_RODZINA.zdarzenie, przewidywana: false } };
    const po = kolejkaEkranow(PYTANIA, urodzone, 'telefon');
    expect(po.length).toBeGreaterThan(przed.length); // po porodzie są dodatkowe pytania
    const e = po[znajdzEkran(po, miejsce)];
    expect(e.rodzaj === 'pytania' && e.pytania[0].def.id).toBe('etap');
  });
});

// Uwaga z testów na stoisku (22.11): „Wstecz” przeskakiwało do innej części ankiety („przechodzi na inną
// zakładkę”). Wstecz ma cofać dokładnie o jeden ekran.
describe('ekranWstecz', () => {
  for (const tryb of ['telefon', 'komputer'] as const) {
    it(`${tryb}: cofa dokładnie o jeden ekran, symetrycznie do „Dalej”`, () => {
      const k = kolejkaEkranow(PYTANIA, PRZYKLAD_RODZINA, tryb);
      for (let i = 1; i < k.length; i++) expect(ekranWstecz(k, i)).toBe(i - 1);
    });
  }
  it('z pierwszego ekranu pytań kroku wraca do ostatniego ekranu poprzedniego kroku', () => {
    const k = kolejkaEkranow(PYTANIA, PRZYKLAD_RODZINA, 'telefon');
    const i = k.findIndex((e) => e.rodzaj === 'pytania' && e.krok === 'ubezpieczenie');
    const poprzedni = k[ekranWstecz(k, i)];
    expect(poprzedni.rodzaj === 'pytania' && poprzedni.krok).toBe('dziecko');
    expect(k[ekranWstecz(k, i) + 1]).toBe(k[i]);
  });
  it('na pierwszym ekranie zostaje na miejscu', () => {
    const k = kolejkaEkranow(PYTANIA, PRZYKLAD_RODZINA, 'komputer');
    expect(ekranWstecz(k, 0)).toBe(0);
  });
});

describe('znajdzEkran', () => {
  const k = kolejkaEkranow(PYTANIA, PRZYKLAD_RODZINA, 'komputer');
  it('pytania po kluczu, sam krok bez klucza na pierwszy ekran kroku, koniec na końcu', () => {
    expect(znajdzEkran(k, { rodzaj: 'pytania', krok: 'dziecko', indeks: 0 })).toBe(k.findIndex((e) => e.rodzaj === 'pytania' && e.krok === 'dziecko'));
    expect(znajdzEkran(k, { rodzaj: 'koniec', indeks: 0 })).toBe(k.length - 1);
    const klucz = widocznePytania(PYTANIA, PRZYKLAD_RODZINA).find((p) => p.def.krok === 'zarobki')!.klucz;
    const e = k[znajdzEkran(k, { rodzaj: 'pytania', krok: 'zarobki', klucz, indeks: 0 })];
    expect(e.rodzaj === 'pytania' && e.krok).toBe('zarobki');
  });
  it('zniknięte pytanie: zostaje na tym samym kroku albo przy ostatnim indeksie', () => {
    const e = k[znajdzEkran(k, { rodzaj: 'pytania', krok: 'zarobki', klucz: 'nie_ma_takiego', indeks: 3 })];
    expect(e.rodzaj === 'pytania' && e.krok).toBe('zarobki');
    expect(znajdzEkran(k, { rodzaj: 'pytania', krok: 'nie_ma', klucz: 'nie_ma', indeks: 999 })).toBe(k.length - 1);
  });
});

describe('numeryPytan', () => {
  it('telefon: numeruje pytania po kolei, koniec dostaje numer ostatniego', () => {
    const k = kolejkaEkranow(PYTANIA, PRZYKLAD_RODZINA, 'telefon');
    const n = numeryPytan(k);
    expect(n.lacznie).toBe(widocznePytania(PYTANIA, PRZYKLAD_RODZINA).length);
    expect(n.numerEkranu(0)).toBe(1);
    expect(n.numerEkranu(1)).toBe(2);
    expect(n.numerEkranu(2)).toBe(3);
    expect(n.numerEkranu(k.length - 1)).toBe(n.lacznie);
  });
  it('komputer: ekran kroku dostaje numer swojego pierwszego pytania', () => {
    const k = kolejkaEkranow(PYTANIA, PRZYKLAD_RODZINA, 'komputer');
    const n = numeryPytan(k);
    const pierwszy = k[0].rodzaj === 'pytania' ? k[0].pytania.length : 0;
    expect(n.numerEkranu(0)).toBe(1);
    expect(n.numerEkranu(1)).toBe(pierwszy + 1);
  });
});

// Link „Popraw odpowiedź” z listy do poprawy (`/sytuacja?pytanie=<klucz>`) otwiera ankietę od razu na tym pytaniu.
describe('miejsceDlaPytania', () => {
  for (const tryb of ['telefon', 'komputer'] as const) {
    it(`${tryb}: wskazuje ekran z pytaniem o podany klucz`, () => {
      const k = kolejkaEkranow(PYTANIA, PRZYKLAD_RODZINA, tryb);
      const m = miejsceDlaPytania(k, 'tytul_od@o0.t0');
      expect(m).not.toBeNull();
      const e = k[znajdzEkran(k, m!)];
      expect(e.rodzaj === 'pytania' && e.pytania.some((p) => p.klucz === 'tytul_od@o0.t0')).toBe(true);
    });
  }
  it('nieznany klucz: null (ankieta zaczyna od początku)', () => {
    const k = kolejkaEkranow(PYTANIA, PRZYKLAD_RODZINA, 'komputer');
    expect(miejsceDlaPytania(k, 'nie_ma@o9')).toBeNull();
  });
});
