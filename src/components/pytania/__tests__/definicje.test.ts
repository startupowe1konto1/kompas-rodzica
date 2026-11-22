import { describe, expect, it } from 'vitest';
import mapa from '../../../../docs/zrodla-danych.json';
import { KROKI_ANKIETY, PYTANIA } from '../definicje';
import { opcjeDoWyboru } from '../listy';
import { walidujOdpowiedz } from '../silnik-ankiety';
import type { Warunek } from '../typy';

const idDanych = new Set((mapa as { id: string }[]).map((d) => d.id));

function sciezkiWarunku(w: Warunek): string[] {
  if ('wszystkie' in w) return w.wszystkie.flatMap(sciezkiWarunku);
  if ('ktorykolwiek' in w) return w.ktorykolwiek.flatMap(sciezkiWarunku);
  if ('nie' in w) return sciezkiWarunku(w.nie);
  return [w.sciezka];
}

const ZNACZNIKI_ZAKRESU: Record<string, string[]> = {
  rodzina: [],
  osoba: ['$osoba'],
  tytul: ['$osoba', '$tytul'],
  dziecko: ['$dziecko'],
};

describe('lista robocza pytań', () => {
  it('identyfikatory są unikalne', () => {
    const ids = PYTANIA.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('każde pytanie wskazuje daną z docs/zrodla-danych.json (albo null z uzasadnieniem w raporcie)', () => {
    for (const p of PYTANIA) {
      if (p.daneId !== null) expect(idDanych.has(p.daneId), `${p.id}: ${p.daneId}`).toBe(true);
    }
  });

  it('każde pytanie należy do znanego kroku', () => {
    const kroki = new Set(KROKI_ANKIETY.map((k) => k.id));
    for (const p of PYTANIA) expect(kroki.has(p.krok), p.id).toBe(true);
  });

  it('pytania wyboru mają opcje', () => {
    for (const p of PYTANIA.filter((x) => x.typ === 'wybor' || x.typ === 'wiele')) {
      expect(p.opcje?.length ?? 0, p.id).toBeGreaterThan(1);
    }
  });

  it('ścieżki i warunki używają tylko znaczników ze swojego zakresu', () => {
    for (const p of PYTANIA) {
      const dozwolone = ZNACZNIKI_ZAKRESU[p.zakres];
      const sciezki = [p.sciezka, ...(p.warunek ? sciezkiWarunku(p.warunek) : []), ...(p.nieWczesniejNiz ? [p.nieWczesniejNiz] : [])];
      for (const s of sciezki) {
        for (const z of s.match(/\$[a-z]+/g) ?? []) expect(dozwolone, `${p.id}: ${s}`).toContain(z);
      }
    }
  });

  it('pytanie o wielkość pracodawcy wyjaśnia, po co pytamy', () => {
    const p = PYTANIA.find((x) => x.id === 'platnik_powyzej_20')!;
    expect(p.etykieta).toBe('Czy Pani/Pana pracodawca albo zleceniodawca zatrudnia ponad 20 osób?');
    expect(p.pomoc).toMatch(/wypła/);
  });

  it('warstwa A obejmuje wszystkie tematy z briefu 4.2', () => {
    const ids = new Set(PYTANIA.map((p) => p.id));
    for (const id of ['rola', 'etap', 'tytuly_rodzaje', 'tryb_podstawy', 'wynagrodzenie_miesieczne', 'podstawa_miesiace', 'zwolnienia_w_ciazy', 'liczba_dzieci', 'platnik_powyzej_20', 'pit2']) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it('pomoc nie zaczyna się od „Od tego zależy…” (uwaga z testu na stoisku)', () => {
    for (const p of PYTANIA) {
      const teksty = [p.pomoc, ...Object.values(p.wgEtapu ?? {}).map((w) => w?.pomoc), ...Object.values(p.wgRodzaju ?? {}).map((w) => w?.pomoc)];
      for (const t of teksty) if (t) expect(t.startsWith('Od tego zależy'), p.id).toBe(false);
    }
  });

  it('wspolpraca nie jest proponowana w wyborze, ale stary profil z nią przechodzi walidację', () => {
    const p = PYTANIA.find((x) => x.id === 'tytuly_rodzaje')!;
    expect(opcjeDoWyboru(p.opcje ?? [], []).map((o) => o.wartosc)).not.toContain('wspolpraca');
    expect(walidujOdpowiedz(p, ['wspolpraca'], { dataAnalizy: '2026-11-22' })).toEqual([]);
  });

  it('pytania o koniec umowy mają wspólną etykietę, a działalność własny wariant', () => {
    for (const id of ['tytul_do', 'etat_do']) expect(PYTANIA.find((x) => x.id === id)!.etykieta).toBe('Data zakończenia umowy');
    expect(PYTANIA.find((x) => x.id === 'tytul_do')!.wgRodzaju?.dzialalnosc?.etykieta).toBeTruthy();
  });

  it('pojęcia ZUS przy kluczowych pytaniach mają wyjaśnienie', () => {
    for (const id of ['rola', 'tytuly_rodzaje', 'chorobowe_dobrowolne', 'platnik_powyzej_20', 'tryb_podstawy', 'dzialalnosc_podstawa']) {
      expect(PYTANIA.find((x) => x.id === id)!.wyjasnienie, id).toBeDefined();
    }
  });
});
