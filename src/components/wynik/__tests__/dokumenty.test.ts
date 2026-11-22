import { describe, expect, it } from 'vitest';
import type { Dokument } from '../../../engine/types';
import { PRZYKLAD_DOKUMENTY } from '../../../mocks/przyklad';
import { grupujDokumenty } from '../dokumenty';

const d = (kod: Dokument['kod'], status: Dokument['status'], termin?: string): Dokument =>
  ({ kod, nazwa: kod, ktoSklada: 'mama', gdzie: 'ZUS', status, termin, zalaczniki: [], moznaWygenerowac: false });

describe('grupujDokumenty', () => {
  it('trzy grupy; w grupie po terminie, bez terminu na końcu', () => {
    const g = grupujDokumenty([d('ZAM', 'pozniej', '2027-03-30'), d('wniosek_815', 'po_terminie', '2026-12-22'), d('wniosek_ojcowski', 'pozniej', '2027-01-08'), d('Z-3', 'teraz'), d('wniosek_rodzicielski', 'pozniej')]);
    expect(g.teraz.map((x) => x.kod)).toEqual(['Z-3']);
    expect(g.pozniej.map((x) => x.kod)).toEqual(['wniosek_ojcowski', 'ZAM', 'wniosek_rodzicielski']);
    expect(g.poTerminie.map((x) => x.kod)).toEqual(['wniosek_815']);
  });
  it('przykład: wniosek o rodzicielski jest w „później”', () => {
    expect(grupujDokumenty(PRZYKLAD_DOKUMENTY.dokumenty).pozniej.map((x) => x.kod)).toContain('wniosek_rodzicielski');
  });
  it('nie mutuje wejścia', () => {
    const wej = [d('ZAM', 'pozniej', '2027-03-30'), d('Z-3', 'pozniej', '2027-01-01')];
    grupujDokumenty(wej);
    expect(wej.map((x) => x.kod)).toEqual(['ZAM', 'Z-3']);
  });
});
