/**
 * Nowe pola kontraktu w D2: uwagi do dokumentów (pytanie 11, brak danych o płatniku), wniosek o urlop na warunkach
 * urlopu macierzyńskiego (KP art. 183 § 6) oraz przedłużenie umowy do porodu i urlop wychowawczy (helpery toru A).
 * Sprawdzamy kody, daty i liczby, nie treść komunikatów.
 */
import { describe, expect, it } from 'vitest';
import { PARAMETRY_2026, WERSJE_DOMYSLNE } from '../../params';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { dokumentyITerminy } from '..';
import { ZALACZNIKI } from '../dokumenty';
import { DZIALALNOSC, ETAT, ZLECENIE, dokument, mamaZ, odcinkiWzorca, plan, rodzina, tataNaEtacie, terminy } from './dane';
import type { Odcinek, Parametry, TypZdarzenia } from '../../types';

const W = WERSJE_DOMYSLNE;

describe('uwagi do dokumentów', () => {
  it('pracownik małego płatnika: ZAM z uwagą DO_POTWIERDZENIA_W_ZUS (pytanie 11), bez ZAPYTAJ_W_KADRACH', () => {
    const w = dokumentyITerminy(rodzina([mamaZ([{ ...ETAT, platnikPowyzej20: false }])]), PRZYKLAD_PLAN, W);
    expect(dokument(w, 'ZAM')?.uwagi).toEqual([expect.objectContaining({ kod: 'DO_POTWIERDZENIA_W_ZUS', osobaId: 'mama' })]);
    expect(w.uwagi).toBeUndefined();
  });

  it('nie wiemy, ilu ubezpieczonych ma pracodawca: ZAPYTAJ_W_KADRACH dla całej listy i DO_POTWIERDZENIA_W_ZUS przy ZAM', () => {
    const { platnikPowyzej20: _, ...bezLiczby } = ETAT;
    void _;
    const w = dokumentyITerminy(rodzina([mamaZ([bezLiczby])]), PRZYKLAD_PLAN, W);
    expect(w.uwagi).toEqual([expect.objectContaining({ kod: 'ZAPYTAJ_W_KADRACH', osobaId: 'mama' })]);
    expect(dokument(w, 'ZAM')?.uwagi?.map((u) => u.kod)).toEqual(['DO_POTWIERDZENIA_W_ZUS']);
  });

  it('zlecenie bez liczby ubezpieczonych: ZAPYTAJ_W_KADRACH, ale bez pytania 11 (ono dotyczy pracownika)', () => {
    const { platnikPowyzej20: _, ...bezLiczby } = ZLECENIE;
    void _;
    const w = dokumentyITerminy(rodzina([mamaZ([bezLiczby])]), plan(odcinkiWzorca('zl-1')), W);
    expect(w.uwagi?.map((u) => u.kod)).toEqual(['ZAPYTAJ_W_KADRACH']);
    expect(dokument(w, 'ZAM')?.uwagi).toBeUndefined();
  });

  it('działalność i duży płatnik: bez uwag', () => {
    const dg = dokumentyITerminy(rodzina([mamaZ([DZIALALNOSC])]), plan(odcinkiWzorca('dg-1')), W);
    expect(dg.uwagi).toBeUndefined();
    expect(dg.dokumenty.every((d) => d.uwagi === undefined)).toBe(true);
    const duzy = dokumentyITerminy(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, W);
    expect(duzy.uwagi).toBeUndefined();
  });

  it('jedna uwaga ZAPYTAJ_W_KADRACH na tytuł, nawet gdy zasiłek ma kilka odcinków', () => {
    const { platnikPowyzej20: _, ...bezLiczby } = ETAT;
    void _;
    const w = dokumentyITerminy(rodzina([mamaZ([bezLiczby])]), PRZYKLAD_PLAN, W);
    expect(w.uwagi?.filter((u) => u.kod === 'ZAPYTAJ_W_KADRACH')).toHaveLength(1);
  });
});

describe('urlop na warunkach urlopu macierzyńskiego – wniosek w 7 dni od przyjęcia dziecka (KP art. 183 § 6)', () => {
  const przyjecie = (typ: TypZdarzenia, zmiany: Partial<Parameters<typeof rodzina>[1]> = {}) =>
    rodzina([PRZYKLAD_RODZINA.osoby[0], tataNaEtacie()], {
      typ,
      data: '2026-12-10',
      przewidywana: false,
      dzieci: [{ dataUrodzenia: '2023-01-01' }],
      ...zmiany,
    });
  const n1: Odcinek = { id: 'n1', osobaId: 'mama', typ: 'na_warunkach_macierzynskiego', od: '2026-12-10', do: '2027-04-28' };

  it('przysposobienie: wniosek do pracodawcy do 2026-12-17, załącznik – dokumenty z sądu, można wygenerować', () => {
    const w = dokumentyITerminy(przyjecie('przysposobienie'), plan([n1]), W);
    const d = dokument(w, 'wniosek_na_warunkach_macierzynskiego', 'mama');
    expect(d).toMatchObject({
      gdzie: 'pracodawca',
      termin: '2026-12-17',
      odKiedy: '2026-12-10',
      odcinekId: 'n1',
      moznaWygenerowac: true,
      przepis: 'KP art. 183 § 6',
    });
    expect(d?.zalaczniki).toEqual([ZALACZNIKI.dokumentySaduPrzysposobienie]);
    expect(terminy(w.terminy, { kod: 'WNIOSEK_NA_WARUNKACH_MACIERZYNSKIEGO', osobaId: 'mama', odcinekId: 'n1' }).map((t) => t.data)).toEqual(['2026-12-17']);
  });

  it('rodzina zastępcza niezawodowa: dokumenty o umieszczeniu dziecka i decyzja o odroczeniu obowiązku szkolnego', () => {
    const r = przyjecie('rodzina_zastepcza_niezawodowa', { dzieci: [{ dataUrodzenia: '2019-03-01', odroczonyObowiazekSzkolny: true }] });
    const d = dokument(dokumentyITerminy(r, plan([n1]), W), 'wniosek_na_warunkach_macierzynskiego', 'mama');
    expect(d).toMatchObject({ termin: '2026-12-17', przepis: 'KP art. 183 § 6' });
    expect(d?.zalaczniki).toEqual([ZALACZNIKI.dokumentyRodzinaZastepcza, ZALACZNIKI.decyzjaOdroczenie]);
  });

  it('rodzina zastępcza zawodowa nie ma prawa do tego urlopu (KP art. 183 § 1) – bez wniosku', () => {
    const w = dokumentyITerminy(przyjecie('rodzina_zastepcza_zawodowa'), plan([n1]), W);
    expect(dokument(w, 'wniosek_na_warunkach_macierzynskiego')).toBeUndefined();
  });

  it('termin liczy się od przyjęcia dziecka w przód, z parametru', () => {
    const inne: Parametry = { ...PARAMETRY_2026, terminyDni: { ...PARAMETRY_2026.terminyDni, wniosekNaWarunkachMacierzynskiegoPo: 14 } };
    const w = dokumentyITerminy(przyjecie('przysposobienie'), plan([n1]), [inne]);
    expect(dokument(w, 'wniosek_na_warunkach_macierzynskiego')?.termin).toBe('2026-12-24');
  });

  it('status: przed przyjęciem – pozniej, w terminie – teraz, po 7 dniach – po_terminie', () => {
    const status = (dataAnalizy: string) =>
      dokument(dokumentyITerminy({ ...przyjecie('przysposobienie'), dataAnalizy }, plan([n1]), W), 'wniosek_na_warunkach_macierzynskiego')?.status;
    expect(status('2026-12-01')).toBe('pozniej');
    expect(status('2026-12-17')).toBe('teraz');
    expect(status('2026-12-18')).toBe('po_terminie');
  });

  it('wniosek składa tylko pracownik i tylko osoba, która zaczyna urlop po przyjęciu dziecka', () => {
    const zlecenie = rodzina([mamaZ([ZLECENIE])], { typ: 'przysposobienie', data: '2026-12-10', przewidywana: false, dzieci: [{ dataUrodzenia: '2023-01-01' }] });
    expect(dokument(dokumentyITerminy(zlecenie, plan([{ ...n1, tytulId: 'zl-1' }]), W), 'wniosek_na_warunkach_macierzynskiego')).toBeUndefined();

    // Tata bierze dalszą część urlopu – to nie jest wniosek z art. 183 § 6 (przejęcie: art. 183 § 2 w zw. z art. 180).
    const n0: Odcinek = { ...n1, do: '2027-02-28' };
    const n2: Odcinek = { id: 'n2', osobaId: 'tata', typ: 'na_warunkach_macierzynskiego', od: '2027-03-01', do: '2027-04-28' };
    const w = dokumentyITerminy(przyjecie('przysposobienie'), plan([n0, n2]), W);
    expect(dokument(w, 'wniosek_na_warunkach_macierzynskiego', 'mama')).toBeDefined();
    expect(dokument(w, 'wniosek_na_warunkach_macierzynskiego', 'tata')).toBeUndefined();
  });
});

describe('ubezpieczenie w dniu – helpery toru A', () => {
  it('umowa przedłużona do porodu (KP art. 177 § 3): część urlopu przed porodem u pracodawcy, od porodu ZUS (UZ art. 30 ust. 4)', () => {
    const r = rodzina([mamaZ([{ ...ETAT, od: '2025-10-01', do: '2026-11-10', naCzasOkreslony: true }])]);
    const m0: Odcinek = { id: 'm0', osobaId: 'mama', typ: 'macierzynski', od: '2026-11-17', do: '2027-04-05' };
    const w = dokumentyITerminy(r, plan([m0]), W);
    expect(w.ktoWyplaca.map((k) => [k.kto, k.przepis])).toEqual([
      ['platnik', 'UZ art. 61 ust. 1 pkt 1'],
      ['ZUS', 'UZ art. 61 ust. 1 pkt 2 lit. d'],
    ]);
    expect(dokument(w, 'wniosek_macierzynski_przed_porodem', 'mama')).toMatchObject({ gdzie: 'pracodawca', odcinekId: 'm0' });
  });

  it('umowa na zastępstwo nie przedłuża się (KP art. 177 § 3¹): bez wniosku do pracodawcy, wypłaca ZUS', () => {
    const r = rodzina([mamaZ([{ ...ETAT, od: '2025-10-01', do: '2026-11-10', naCzasOkreslony: true, naZastepstwo: true }])]);
    const m0: Odcinek = { id: 'm0', osobaId: 'mama', typ: 'macierzynski', od: '2026-11-17', do: '2027-04-05' };
    const w = dokumentyITerminy(r, plan([m0]), W);
    expect(w.ktoWyplaca.map((k) => k.kto)).toEqual(['ZUS']);
    expect(dokument(w, 'wniosek_macierzynski_przed_porodem')).toBeUndefined();
  });

  it('poród w czasie urlopu wychowawczego: zasiłek z umowy o pracę (UZ art. 29 ust. 1), płaci pracodawca, bez ZAM', () => {
    const r = rodzina([mamaZ([ETAT], { urlopWychowawczy: { od: '2026-06-01', do: '2027-05-31' } })]);
    const w = dokumentyITerminy(r, PRZYKLAD_PLAN, W);
    expect(w.ktoWyplaca.map((k) => [k.tytulId, k.kto])).toEqual([['etat-1', 'platnik']]);
    expect(dokument(w, 'ZAM')).toBeUndefined();
  });
});
