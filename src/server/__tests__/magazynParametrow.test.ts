import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { obliczKwoty } from '../../engine';
import { PARAMETRY_2026, WERSJE_DOMYSLNE } from '../../engine/params';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../mocks/przyklad';
import type { Parametry } from '../../engine/types';
import { BladDanych } from '../http';
import { pobierzWersje, przywrocDomyslne, walidujWersje, zapiszWersje } from '../magazynParametrow';

const ZMIENNE = ['MAGAZYN_PARAMETROW', 'MAGAZYN_PARAMETROW_PLIK'] as const;

function kopia(): Parametry {
  return structuredClone(PARAMETRY_2026);
}

describe('magazyn parametrow', () => {
  let katalog: string;
  let plik: string;
  const stare: Record<string, string | undefined> = {};

  beforeEach(async () => {
    for (const z of ZMIENNE) stare[z] = process.env[z];
    katalog = await fs.mkdtemp(path.join(os.tmpdir(), 'magazyn-parametrow-'));
    plik = path.join(katalog, 'parametry.json');
    delete process.env.MAGAZYN_PARAMETROW;
    process.env.MAGAZYN_PARAMETROW_PLIK = plik;
    await przywrocDomyslne();
  });

  afterEach(async () => {
    await przywrocDomyslne();
    for (const z of ZMIENNE) {
      if (stare[z] === undefined) delete process.env[z];
      else process.env[z] = stare[z];
    }
    await fs.rm(katalog, { recursive: true, force: true });
  });

  it('bez zapisu zwraca wersje domyslne', async () => {
    expect(await pobierzWersje()).toEqual(WERSJE_DOMYSLNE);
  });

  it('mutacja wyniku sciezki domyslnej nie psuje wartosci domyslnych', async () => {
    const wzorzec = structuredClone(WERSJE_DOMYSLNE);
    const pierwszy = await pobierzWersje();
    pierwszy[0]!.stawkiProc.rodzicielski = 1;
    pierwszy[0]!.wymiaryTyg.macierzynski.push(99);
    expect(WERSJE_DOMYSLNE).toEqual(wzorzec);
    expect(await pobierzWersje()).toEqual(wzorzec);
  });

  it('mutacja wyniku sciezki pamieciowej i danych wejsciowych nie zmienia magazynu', async () => {
    process.env.MAGAZYN_PARAMETROW = 'pamiec';
    const wejscie = kopia();
    wejscie.stawkiProc.rodzicielski = 75;
    await zapiszWersje([wejscie]);
    wejscie.stawkiProc.rodzicielski = 2;
    const odczyt = await pobierzWersje();
    odczyt[0]!.stawkiProc.rodzicielski = 3;
    expect((await pobierzWersje())[0]?.stawkiProc.rodzicielski).toBe(75);
  });

  it('zapis do pliku zmienia odczyt i jest trwaly', async () => {
    const w = kopia();
    w.stawkiProc.rodzicielski = 75;
    expect(await zapiszWersje([w])).toEqual({ trwale: true });
    expect((await pobierzWersje())[0]?.stawkiProc.rodzicielski).toBe(75);
    await expect(fs.access(plik)).resolves.toBeUndefined();
  });

  it('wynik kalkulatora sie zmienia po zapisie nowych parametrow', async () => {
    const dlaR1 = async () => {
      const wynik = obliczKwoty(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, await pobierzWersje());
      const r1 = wynik.odcinki.find((o) => o.odcinekId === 'r1');
      expect(r1).toBeDefined();
      return r1!;
    };
    const przed = await dlaR1();
    expect(przed.stawkaProc).toBe(70);
    expect(przed.dziennie).toBe(161.07);

    const wersje = (await pobierzWersje()).map((w) => ({ ...w, stawkiProc: { ...w.stawkiProc, rodzicielski: 75 } }));
    expect(await zapiszWersje(wersje)).toEqual({ trwale: true });

    const po = await dlaR1();
    expect(po.stawkaProc).toBe(75);
    expect(po.dziennie).toBe(172.58);
  });

  it('tryb pamiec: zapis nietrwaly, plik nie powstaje, odczyt zwraca zapisane', async () => {
    process.env.MAGAZYN_PARAMETROW = 'pamiec';
    const w = kopia();
    w.stawkiProc.rodzicielski = 75;
    expect(await zapiszWersje([w])).toEqual({ trwale: false });
    await expect(fs.access(plik)).rejects.toThrow();
    expect((await pobierzWersje())[0]?.stawkiProc.rodzicielski).toBe(75);
  });

  it('gdy plik nie moze powstac, zapis jest w pamieci i nietrwaly', async () => {
    const blokada = path.join(katalog, 'plik-zamiast-katalogu');
    await fs.writeFile(blokada, 'x');
    process.env.MAGAZYN_PARAMETROW_PLIK = path.join(blokada, 'podkatalog', 'parametry.json');
    const w = kopia();
    w.stawkiProc.rodzicielski = 75;
    expect(await zapiszWersje([w])).toEqual({ trwale: false });
    expect((await pobierzWersje())[0]?.stawkiProc.rodzicielski).toBe(75);
  });

  it('uszkodzony plik JSON: wracaja domyslne', async () => {
    await fs.writeFile(plik, '{ to nie jest json');
    expect(await pobierzWersje()).toEqual(WERSJE_DOMYSLNE);
  });

  it('przywrocDomyslne po zapisie przywraca domyslne i usuwa plik', async () => {
    const w = kopia();
    w.stawkiProc.rodzicielski = 75;
    await zapiszWersje([w]);
    await przywrocDomyslne();
    expect(await pobierzWersje()).toEqual(WERSJE_DOMYSLNE);
    await expect(fs.access(plik)).rejects.toThrow();
  });

  it('sortuje wersje rosnaco po obowiazujeOd', async () => {
    const a = kopia();
    const b = kopia();
    b.obowiazujeOd = '2027-01-01';
    a.obowiazujeOd = '2026-01-01';
    await zapiszWersje([b, a]);
    expect((await pobierzWersje()).map((x) => x.obowiazujeOd)).toEqual(['2026-01-01', '2027-01-01']);
  });

  it('nieudana walidacja rzuca BladDanych, a stan zostaje jak byl', async () => {
    const dobra = kopia();
    dobra.stawkiProc.rodzicielski = 75;
    await zapiszWersje([dobra]);
    const zla = kopia();
    zla.stawkiProc.rodzicielski = 150;
    await expect(zapiszWersje([zla])).rejects.toBeInstanceOf(BladDanych);
    expect((await pobierzWersje())[0]?.stawkiProc.rodzicielski).toBe(75);
  });

  it('po udanym zapisie w katalogu nie zostaja pliki tymczasowe', async () => {
    const w = kopia();
    w.stawkiProc.rodzicielski = 75;
    expect(await zapiszWersje([w])).toEqual({ trwale: true });
    expect(await fs.readdir(katalog)).toEqual(['parametry.json']);
  });

  it('zapis idzie przez plik tymczasowy: nieudane podmienienie zostawia poprzedni plik nietkniety i bez smieci', async () => {
    const stara = kopia();
    stara.stawkiProc.rodzicielski = 75;
    expect(await zapiszWersje([stara])).toEqual({ trwale: true });
    const nowa = kopia();
    nowa.stawkiProc.rodzicielski = 80;
    const spy = vi.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('EPERM'));
    try {
      expect(await zapiszWersje([nowa])).toEqual({ trwale: false });
    } finally {
      spy.mockRestore();
    }
    // Na dysku został poprawny zapis sprzed próby (nie ucięty), bez plików tymczasowych; odczyt widzi nowszą wersję z pamięci.
    const naDysku = JSON.parse(await fs.readFile(plik, 'utf-8')) as Parametry[];
    expect(naDysku[0]?.stawkiProc.rodzicielski).toBe(75);
    expect(await fs.readdir(katalog)).toEqual(['parametry.json']);
    expect((await pobierzWersje())[0]?.stawkiProc.rodzicielski).toBe(80);
  });

  it('przywrocDomyslne: gdy plik nie da sie usunac, domyslne dzialaja w pamieci, a wynik jest nietrwaly', async () => {
    const w = kopia();
    w.stawkiProc.rodzicielski = 75;
    await zapiszWersje([w]);
    const spy = vi.spyOn(fs, 'rm').mockRejectedValueOnce(new Error('EACCES'));
    try {
      expect(await przywrocDomyslne()).toEqual({ trwale: false });
    } finally {
      spy.mockRestore();
    }
    // Plik z poprzednim zapisem został, ale po resecie nie może wrócić do odczytu.
    expect(await pobierzWersje()).toEqual(WERSJE_DOMYSLNE);
  });
});

describe('walidujWersje', () => {
  it('domyslne sa poprawne', () => {
    expect(walidujWersje(WERSJE_DOMYSLNE)).toEqual([]);
  });

  it('pusta lista to blad', () => {
    expect(walidujWersje([]).length).toBeGreaterThan(0);
    expect(walidujWersje('nie tablica').length).toBeGreaterThan(0);
  });

  it('stawka powyzej 100 to blad', () => {
    const w = kopia();
    w.stawkiProc.rodzicielski = 150;
    expect(walidujWersje([w]).length).toBeGreaterThan(0);
  });

  it('ujemne tygodnie to blad (takze w tablicy i zagniezdzone)', () => {
    const a = kopia();
    a.wymiaryTyg.rodzicielski1 = -1;
    expect(walidujWersje([a]).length).toBeGreaterThan(0);
    const b = kopia();
    b.wymiaryTyg.macierzynski = [20, -1];
    expect(walidujWersje([b]).length).toBeGreaterThan(0);
    const c = kopia();
    c.wymiaryTyg.rodzicielskiMaxZPraca.jedno = -5;
    expect(walidujWersje([c]).length).toBeGreaterThan(0);
  });

  it('niepoprawna data to blad', () => {
    const w = kopia();
    w.obowiazujeOd = '2027-13-01';
    expect(walidujWersje([w]).length).toBeGreaterThan(0);
  });

  it('dwie wersje z ta sama data to blad', () => {
    expect(walidujWersje([kopia(), kopia()]).length).toBeGreaterThan(0);
  });

  it('brak grupy podatek to blad', () => {
    const w: Record<string, unknown> = { ...kopia() };
    delete w.podatek;
    expect(walidujWersje([w]).length).toBeGreaterThan(0);
  });

  it('brakujacy lub nadmiarowy klucz w grupie to blad', () => {
    const w: Record<string, unknown> = kopia() as unknown as Record<string, unknown>;
    delete (w.limity as Record<string, unknown>).rodzicielskiMaxCzesci;
    expect(walidujWersje([w]).length).toBeGreaterThan(0);
  });

  it('NaN i napis zamiast liczby to blad', () => {
    const a = kopia();
    a.kwoty.placaMinimalna = Number.NaN;
    expect(walidujWersje([a]).length).toBeGreaterThan(0);
    const b = kopia() as unknown as { kwoty: Record<string, unknown> };
    b.kwoty.placaMinimalna = '5000';
    expect(walidujWersje([b]).length).toBeGreaterThan(0);
  });

  it('procenty skladki i podatku poza 0-100 to blad', () => {
    const a = kopia();
    a.kwoty.skladkiPracownikaProc = 101;
    expect(walidujWersje([a]).length).toBeGreaterThan(0);
    const b = kopia();
    b.podatek.zaliczkaProc = -1;
    expect(walidujWersje([b]).length).toBeGreaterThan(0);
  });

  it('opis i zrodlo musza byc napisami', () => {
    const w = kopia() as unknown as Record<string, unknown>;
    w.opis = 5;
    expect(walidujWersje([w]).length).toBeGreaterThan(0);
  });

  it('dni w miesiacu do stawki dziennej musza byc wieksze od zera (dzielnik stawki dziennej)', () => {
    const zero = kopia();
    zero.kwoty.dniWMiesiacuDoStawkiDziennej = 0;
    expect(walidujWersje([zero])).toEqual([expect.stringContaining('kwoty.dniWMiesiacuDoStawkiDziennej')]);
    const ulamek = kopia();
    ulamek.kwoty.dniWMiesiacuDoStawkiDziennej = 30.5;
    expect(walidujWersje([ulamek])).toEqual([]);
  });

  it('tygodnie, terminy i limity w dniach, miesiacach, latach albo sztukach musza byc liczbami calkowitymi', () => {
    const zmiany: ((w: Parametry) => void)[] = [
      (w) => { w.wymiaryTyg.ojcowski = 2.5; },
      (w) => { w.wymiaryTyg.macierzynski = [20, 31.5, 33, 35, 37]; },
      (w) => { w.wymiaryTyg.rodzicielskiMaxZPraca.jedno = 82.1; },
      (w) => { w.terminyDni.wniosekOjcowskiPrzed = 7.5; },
      (w) => { w.limity.ojcowskiMinDniCzesci = 6.5; },
      (w) => { w.limity.rodzicielskiMaxCzesci = 4.5; },
      (w) => { w.limity.wiekPrzysposobienieLat = 13.9; },
      (w) => { w.limity.uzupelniajacy.donoszoneOdDniaZycia = 4.2; },
    ];
    for (const zmien of zmiany) {
      const w = kopia();
      zmien(w);
      expect(walidujWersje([w])).toHaveLength(1);
    }
  });

  it('ulamki dozwolone w limitach, ktore nie sa dniami ani liczba sztuk (wymiar pracy, procenty, masa)', () => {
    const w = kopia();
    w.limity.maxWymiarPracyPrzyLaczeniu = 0.75;
    w.limity.progZaleglosciProcPlacyMinimalnej = 1.5;
    w.limity.ryzykoPodwyzkaProc = 12.5;
    w.limity.uzupelniajacy.masaGWczesniak = 999.5;
    w.kwoty.placaMinimalna = 4806.5;
    expect(walidujWersje([w])).toEqual([]);
  });
});
