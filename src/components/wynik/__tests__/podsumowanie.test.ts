import { describe, expect, it } from 'vitest';
import type { Dokument, Uprawnienie, WykorzystaniePuli, WynikDokumentow, WynikUprawnien } from '../../../engine/types';
import { odmien, skrotDokumentow, skrotKtoWyplaca, skrotPul, skrotRyzyk, skrotUprawnien, skrotWyborow, zdanieNiedostepnych } from '../podsumowanie';

const upr = (kod: string, przysluguje: Uprawnienie['przysluguje']): Uprawnienie => ({ kod, przysluguje, osobaId: 'mama', swiadczenie: 'macierzynski', powod: '', przepis: '' }) as Uprawnienie;
const wynikUpr = (p: Partial<WynikUprawnien>): WynikUprawnien => ({ uprawnienia: [], pule: {} as WynikUprawnien['pule'], mozliwosci: [], ryzyka: [], ...p });

describe('odmien', () => {
  it('wybiera formę liczebnika', () => {
    expect(['1', '2', '4', '5', '12', '22', '25'].map((n) => odmien(Number(n), 'a', 'b', 'c'))).toEqual(['a', 'b', 'b', 'c', 'c', 'b', 'c']);
  });
});

describe('zdanieNiedostepnych', () => {
  it('odmienia', () => {
    expect(zdanieNiedostepnych(1)).toBe('1 możliwość jest teraz niedostępna');
    expect(zdanieNiedostepnych(3)).toBe('3 możliwości są teraz niedostępne');
    expect(zdanieNiedostepnych(5)).toBe('5 możliwości jest teraz niedostępnych');
  });
});

describe('skróty kafli', () => {
  it('uprawnienia: liczy tylko te, które przysługują', () => {
    const w = wynikUpr({ uprawnienia: [upr('A', true), upr('B', true), upr('C', true), upr('D', false), upr('E', 'warunkowo')] });
    expect(skrotUprawnien(w)).toBe('3 świadczenia przysługują');
    expect(skrotUprawnien(wynikUpr({ uprawnienia: [upr('A', true)] }))).toBe('1 świadczenie przysługuje');
    expect(skrotUprawnien(null)).toBe('');
  });

  it('pule: każdy rodzaj urlopu raz, bez części nieprzenoszalnej', () => {
    const w: WykorzystaniePuli[] = [
      { pula: 'macierzynski', wykorzystaneDni: 0, dostepneDni: 140 },
      { pula: 'rodzicielski', wykorzystaneDni: 0, dostepneDni: 287 },
      { pula: 'rodzicielski_nieprzenoszalne', osobaId: 'mama', wykorzystaneDni: 0, dostepneDni: 63 },
    ];
    expect(skrotPul(w)).toBe('macierzyński 20 · rodzicielski 41 tyg.');
    expect(skrotPul(null)).toBe('');
  });

  it('wybory: tylko dostępne', () => {
    const m = (dostepna: boolean) => ({ kod: 'wariant_815', dostepna }) as WynikUprawnien['mozliwosci'][number];
    expect(skrotWyborow(wynikUpr({ mozliwosci: [m(true), m(false), m(true)] }))).toBe('2 wybory do podjęcia');
    expect(skrotWyborow(wynikUpr({ mozliwosci: [m(false)] }))).toBe('Na razie nic do wyboru');
  });

  it('ryzyka: liczba i najbliższy termin', () => {
    const r = (termin?: string) => ({ kod: 'X', termin }) as WynikUprawnien['ryzyka'][number];
    expect(skrotRyzyk(wynikUpr({ ryzyka: [] }))).toBe('Nic nie wymaga uwagi');
    expect(skrotRyzyk(wynikUpr({ ryzyka: [r('2026-12-10'), r('2026-11-30')] }))).toBe('2 rzeczy, najbliższy termin 30 listopada 2026');
  });

  it('kto wypłaca i dokumenty', () => {
    const k = (kto: 'ZUS' | 'platnik') => ({ kto }) as WynikDokumentow['ktoWyplaca'][number];
    const d = (status: Dokument['status']) => ({ status }) as Dokument;
    const wd = (p: Partial<WynikDokumentow>): WynikDokumentow => ({ ktoWyplaca: [], dokumenty: [], terminy: [], ...p });
    expect(skrotKtoWyplaca(wd({ ktoWyplaca: [k('platnik')] }))).toBe('Zasiłek wypłaci pracodawca');
    expect(skrotKtoWyplaca(wd({ ktoWyplaca: [k('platnik'), k('ZUS')] }))).toBe('Pracodawca (płatnik) i ZUS');
    expect(skrotDokumentow(wd({ dokumenty: [d('teraz'), d('pozniej'), d('pozniej')] }))).toBe('3 dokumenty do złożenia, w tym 1 teraz');
    expect(skrotDokumentow(wd({}))).toBe('Nic do złożenia');
  });
});
