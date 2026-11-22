/**
 * Tabela „Przypadki” z ZADANIA.md, tor D, zadanie D2 – jeden `it` na wiersz (D2-01 … D2-14).
 * Sprawdzamy kody, daty i liczby, nie treść komunikatów.
 */
import { describe, expect, it } from 'vitest';
import { WERSJE_DOMYSLNE } from '../../params';
import { PRZYKLAD_DOKUMENTY, PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../../mocks/przyklad';
import { dokumentyITerminy } from '..';
import { ZALACZNIKI } from '../dokumenty';
import { DZIALALNOSC, ETAT, ZLECENIE, dokument, mamaZ, odcinkiWzorca, plan, rodzina, tataNaEtacie, terminy } from './dane';
import type { Odcinek } from '../../types';

const W = WERSJE_DOMYSLNE;
const [M1, R1] = PRZYKLAD_PLAN.odcinki;

describe('D2: kto wypłaca, dokumenty i terminy (tabela z ZADANIA.md)', () => {
  it('D2-01 wzorzec: płatnik ponad 20 osób (UZ art. 61), wniosek o rodzicielski do 2027-03-30, 81,5% do 2026-12-22', () => {
    const w = dokumentyITerminy(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, W);
    expect(w.ktoWyplaca).toEqual([
      expect.objectContaining({ osobaId: 'mama', tytulId: 'etat-1', kto: 'platnik', przepis: 'UZ art. 61 ust. 1 pkt 1' }),
    ]);
    expect(dokument(w, 'wniosek_rodzicielski', 'mama')).toMatchObject({
      gdzie: 'pracodawca',
      termin: '2027-03-30',
      odcinekId: 'r1',
      moznaWygenerowac: true,
      przepis: 'KP art. 182¹d § 1',
    });
    expect(terminy(w.terminy, { kod: 'TERMIN_815', osobaId: 'mama', przepis: 'UZ art. 30a ust. 1' }).map((t) => t.data)).toEqual(['2026-12-22']);
    expect(terminy(w.terminy, { kod: 'WNIOSEK_RODZICIELSKI', osobaId: 'mama', odcinekId: 'r1' }).map((t) => t.data)).toEqual(['2027-03-30']);
  });

  // NIEJASNE (pytanie nr 11): czy pracownik małego płatnika składa ZAM. Wynik bezpieczny: ZAM jest na liście.
  it('D2-02 mały płatnik (⚠ pytanie 11): wypłaca ZUS, Z-3 składa płatnik, ZAM przygotowany na wszelki wypadek', () => {
    const r = rodzina([mamaZ([{ ...ETAT, platnikPowyzej20: false }])]);
    const w = dokumentyITerminy(r, PRZYKLAD_PLAN, W);
    expect(w.ktoWyplaca).toEqual([expect.objectContaining({ osobaId: 'mama', kto: 'ZUS', przepis: 'UZ art. 61 ust. 1 pkt 2 lit. a' })]);
    expect(dokument(w, 'Z-3')).toMatchObject({ ktoSklada: 'platnik', gdzie: 'ZUS', moznaWygenerowac: false });
    expect(dokument(w, 'ZAM')).toMatchObject({ ktoSklada: 'mama', gdzie: 'ZUS', moznaWygenerowac: true });
    expect(dokument(w, 'ZAM')?.uwagi?.map((u) => u.kod)).toEqual(['DO_POTWIERDZENIA_W_ZUS']);
    // Wniosek o urlop do pracodawcy jest potrzebny niezależnie od tego, kto wypłaca (KP art. 182¹d § 1).
    expect(dokument(w, 'wniosek_rodzicielski', 'mama')).toMatchObject({ gdzie: 'pracodawca', termin: '2027-03-30' });
  });

  it('D2-03 duży płatnik: bez ZAM i bez Z-3, wystarczy wniosek o urlop do pracodawcy', () => {
    const w = dokumentyITerminy(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, W);
    expect(dokument(w, 'ZAM')).toBeUndefined();
    expect(dokument(w, 'Z-3')).toBeUndefined();
    expect(dokument(w, 'wniosek_rodzicielski', 'mama')).toMatchObject({ gdzie: 'pracodawca', moznaWygenerowac: true });
  });

  it('D2-04 status wniosku o rodzicielski: 2026-11-21 → pozniej, 2027-03-15 → teraz, 2027-04-01 → po_terminie', () => {
    const status = (dataAnalizy: string) =>
      dokument(dokumentyITerminy({ ...PRZYKLAD_RODZINA, dataAnalizy }, PRZYKLAD_PLAN, W), 'wniosek_rodzicielski', 'mama')?.status;
    expect(status('2026-11-21')).toBe('pozniej');
    expect(status('2027-03-15')).toBe('teraz');
    expect(status('2027-04-01')).toBe('po_terminie');
  });

  it('D2-05 ponowne zgłoszenie: zlecenie i działalność z dobrowolnym chorobowym → termin dzień po końcu zasiłku, etat → brak', () => {
    const poZasilku = '2027-11-30'; // r1 kończy się 2027-11-29
    for (const tytul of [ZLECENIE, DZIALALNOSC]) {
      const w = dokumentyITerminy(rodzina([mamaZ([tytul])]), plan(odcinkiWzorca(tytul.id)), W);
      expect(terminy(w.terminy, { kod: 'PONOWNE_ZGLOSZENIE_PO_ZASILKU', osobaId: 'mama' }).map((t) => t.data), tytul.rodzaj).toEqual([poZasilku]);
    }
    const etat = dokumentyITerminy(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, W);
    expect(terminy(etat.terminy, { kod: 'PONOWNE_ZGLOSZENIE_PO_ZASILKU' })).toEqual([]);
  });

  it('D2-06 zlecenie: ZAM składa rodzic, Z-3a płatnik; kto wypłaca – według liczby ubezpieczonych', () => {
    const maly = dokumentyITerminy(rodzina([mamaZ([ZLECENIE])]), plan(odcinkiWzorca('zl-1')), W);
    expect(maly.ktoWyplaca).toEqual([expect.objectContaining({ tytulId: 'zl-1', kto: 'ZUS', przepis: 'UZ art. 61 ust. 1 pkt 2 lit. a' })]);
    expect(dokument(maly, 'ZAM')).toMatchObject({ ktoSklada: 'mama', gdzie: 'ZUS', moznaWygenerowac: true });
    expect(dokument(maly, 'Z-3a')).toMatchObject({ ktoSklada: 'platnik', gdzie: 'ZUS' });
    expect(dokument(maly, 'Z-3')).toBeUndefined();
    expect(dokument(maly, 'wniosek_rodzicielski')).toBeUndefined(); // zleceniobiorca nie składa wniosków z Kodeksu pracy

    const duzy = dokumentyITerminy(rodzina([mamaZ([{ ...ZLECENIE, platnikPowyzej20: true }])]), plan(odcinkiWzorca('zl-1')), W);
    expect(duzy.ktoWyplaca).toEqual([expect.objectContaining({ tytulId: 'zl-1', kto: 'platnik', przepis: 'UZ art. 61 ust. 1 pkt 1' })]);
    expect(dokument(duzy, 'ZAM')).toMatchObject({ ktoSklada: 'mama', gdzie: 'platnik' });
    expect(dokument(duzy, 'Z-3a')).toBeUndefined(); // UZ art. 61 ust. 3: zaświadczenie tylko, gdy płaci ZUS
  });

  it('D2-07 działalność: zawsze ZUS, ZAM do ZUS, bez Z-3 i Z-3a', () => {
    for (const tytul of [DZIALALNOSC, { ...DZIALALNOSC, platnikPowyzej20: true }]) {
      const w = dokumentyITerminy(rodzina([mamaZ([tytul])]), plan(odcinkiWzorca('dg-1')), W);
      expect(w.ktoWyplaca).toEqual([expect.objectContaining({ tytulId: 'dg-1', kto: 'ZUS', przepis: 'UZ art. 61 ust. 1 pkt 2 lit. b' })]);
      expect(dokument(w, 'ZAM')).toMatchObject({ ktoSklada: 'mama', gdzie: 'ZUS' });
      expect(dokument(w, 'Z-3')).toBeUndefined();
      expect(dokument(w, 'Z-3a')).toBeUndefined();
    }
  });

  it('D2-08 po ustaniu ubezpieczenia (EC-05, EC-07): wypłaca ZUS', () => {
    // EC-05: umowa na czas określony skończyła się w ciąży (przedłużona do dnia porodu, KP art. 177 § 3).
    const ec05 = rodzina([mamaZ([{ ...ETAT, od: '2025-10-01', do: '2026-09-30', naCzasOkreslony: true }])]);
    const w05 = dokumentyITerminy(ec05, plan(odcinkiWzorca()), W);
    expect(w05.ktoWyplaca).toEqual([expect.objectContaining({ tytulId: 'etat-1', kto: 'ZUS', przepis: 'UZ art. 61 ust. 1 pkt 2 lit. d' })]);
    expect(dokument(w05, 'ZAM')).toMatchObject({ ktoSklada: 'mama', gdzie: 'ZUS' });

    // EC-07: likwidacja pracodawcy w ciąży, zasiłek w wysokości macierzyńskiego do porodu, potem macierzyński.
    const ec07 = rodzina([mamaZ([{ ...ETAT, ustanie: { data: '2026-10-15', przyczyna: 'likwidacja' } }])]);
    const wWys: Odcinek = { id: 'w1', osobaId: 'mama', typ: 'w_wys_macierzynskiego', od: '2026-10-16', do: '2026-11-30' };
    const w07 = dokumentyITerminy(ec07, plan([wWys, ...odcinkiWzorca()]), W);
    expect(w07.ktoWyplaca.map((k) => [k.kto, k.przepis])).toEqual([['ZUS', 'UZ art. 61 ust. 1 pkt 2 lit. d']]);
    expect(dokument(w07, 'ZAM')).toMatchObject({ gdzie: 'ZUS', odKiedy: '2026-10-16' });
    expect(dokument(w07, 'wniosek_rodzicielski')).toBeUndefined(); // po ustaniu nie ma już pracodawcy
  });

  it('D2-08b umowa u dużego pracodawcy kończy się w trakcie urlopu: ZAM do ZUS od dnia po ustaniu (pytanie 47)', () => {
    // Wzorzec: macierzyński 2026-12-01–2027-04-19, rodzicielski 2027-04-20–2027-11-29; umowa do 2027-06-30.
    const r = rodzina([mamaZ([{ ...ETAT, do: '2027-06-30' }])]);
    const w = dokumentyITerminy(r, plan(odcinkiWzorca()), W);
    // UZ art. 61 ust. 1 pkt 2 lit. d (po ustaniu płaci ZUS), art. 61b ust. 1 pkt 2 (wniosek do ZUS).
    expect(dokument(w, 'ZAM', 'mama')).toMatchObject({ gdzie: 'ZUS', odKiedy: '2027-07-01', odcinekId: 'r1' });
    // Na początku urlopu płaci jeszcze pracodawca – wniosek o rodzicielski idzie do niego.
    expect(dokument(w, 'wniosek_rodzicielski', 'mama')).toMatchObject({ gdzie: 'pracodawca' });
  });

  it('D2-09 ojcowski od 2027-01-15: wniosek do 2027-01-08 (7 dni przed)', () => {
    const o1: Odcinek = { id: 'o1', osobaId: 'tata', typ: 'ojcowski', od: '2027-01-15', do: '2027-01-28', czescNr: 1 };
    const w = dokumentyITerminy(rodzina([PRZYKLAD_RODZINA.osoby[0], tataNaEtacie()]), plan([M1, R1, o1]), W);
    expect(dokument(w, 'wniosek_ojcowski', 'tata')).toMatchObject({
      gdzie: 'pracodawca',
      termin: '2027-01-08',
      odcinekId: 'o1',
      moznaWygenerowac: true,
      przepis: 'KP art. 182³ § 2',
    });
    expect(terminy(w.terminy, { kod: 'WNIOSEK_OJCOWSKI', osobaId: 'tata', odcinekId: 'o1' }).map((t) => t.data)).toEqual(['2027-01-08']);
  });

  // Tabela podaje 2027-03-01 dla rezygnacji. Przepis (KP art. 180 § 8) liczy od dnia przystąpienia do pracy
  // (2027-03-09), a tę samą metodę „dzień − X” tabela stosuje w pozostałych wierszach (np. wniosek taty
  // 2027-03-09 − 14 = 2027-02-23) i we wzorcu – więc 2027-03-09 − 7 = 2027-03-02. Rozbieżność opisana w raporcie D2.
  it('D2-10 przejęcie: rezygnacja mamy do 2027-03-02 (7 dni przed powrotem 2027-03-09), wniosek taty do 2027-02-23 (14 dni przed)', () => {
    const m1: Odcinek = { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-03-08' };
    const t1: Odcinek = { id: 't1', osobaId: 'tata', typ: 'macierzynski', od: '2027-03-09', do: '2027-04-19' };
    const w = dokumentyITerminy(rodzina([PRZYKLAD_RODZINA.osoby[0], tataNaEtacie()]), plan([m1, t1]), W);
    expect(dokument(w, 'wniosek_rezygnacja_matki', 'mama')).toMatchObject({
      gdzie: 'pracodawca',
      termin: '2027-03-02',
      odcinekId: 'm1',
      przepis: 'KP art. 180 § 8',
    });
    expect(dokument(w, 'wniosek_przejecie_macierzynskiego', 'tata')).toMatchObject({
      gdzie: 'pracodawca',
      termin: '2027-02-23',
      odcinekId: 't1',
      przepis: 'KP art. 180 § 9',
    });
    expect(terminy(w.terminy, { kod: 'REZYGNACJA_MATKI', osobaId: 'mama' }).map((t) => t.data)).toEqual(['2027-03-02']);
    expect(terminy(w.terminy, { kod: 'PRZEJECIE_OJCA', osobaId: 'tata' }).map((t) => t.data)).toEqual(['2027-02-23']);
  });

  it('D2-11 uzupełniający po macierzyńskim do 2027-04-19: wniosek do 2027-03-29 (21 dni przed końcem macierzyńskiego)', () => {
    const r = rodzina([PRZYKLAD_RODZINA.osoby[0]], { dzieci: [{ tydzienCiazy: 30, masaG: 1400, szpital: [{ od: '2026-12-01', do: '2027-01-10' }] }] });
    const u1: Odcinek = { id: 'u1', osobaId: 'mama', typ: 'uzupelniajacy', od: '2027-04-20', do: '2027-05-31' };
    const w = dokumentyITerminy(r, plan([M1, u1]), W);
    expect(dokument(w, 'wniosek_uzupelniajacy', 'mama')).toMatchObject({
      gdzie: 'pracodawca',
      termin: '2027-03-29',
      odcinekId: 'u1',
      przepis: 'KP art. 180² § 4',
    });
    expect(terminy(w.terminy, { kod: 'WNIOSEK_UZUPELNIAJACY', osobaId: 'mama' }).map((t) => t.data)).toEqual(['2027-03-29']);
  });

  it('D2-12 łączenie z pracą: wniosek 21 dni przed podjęciem pracy', () => {
    const r1: Odcinek = { ...R1, do: '2027-06-29' };
    const r2: Odcinek = { id: 'r2', osobaId: 'mama', typ: 'rodzicielski', od: '2027-06-30', do: '2027-12-28', wymiarPracy: 0.5, czescNr: 2 };
    const w = dokumentyITerminy(PRZYKLAD_RODZINA, plan([M1, r1, r2]), W);
    expect(dokument(w, 'wniosek_laczenie_z_praca', 'mama')).toMatchObject({
      gdzie: 'pracodawca',
      termin: '2027-06-09',
      odcinekId: 'r2',
      moznaWygenerowac: true,
      przepis: 'KP art. 182¹e § 2',
    });
    expect(terminy(w.terminy, { kod: 'WNIOSEK_LACZENIE', odcinekId: 'r2' }).map((t) => t.data)).toEqual(['2027-06-09']);
  });

  it('D2-13 załączniki: martwe urodzenie, „Za życiem”, wcześniak, przysposobienie', () => {
    const wszystkie = (w: ReturnType<typeof dokumentyITerminy>) => w.dokumenty.flatMap((d) => d.zalaczniki);

    // Martwe urodzenie: 8 tygodni urlopu macierzyńskiego (KP art. 180¹ § 1), płaci pracodawca.
    const martwe = rodzina([PRZYKLAD_RODZINA.osoby[0]], { dzieci: [{ martwe: true }], przewidywana: false });
    const m8: Odcinek = { id: 'm1', osobaId: 'mama', typ: 'macierzynski', od: '2026-12-01', do: '2027-01-25' };
    expect(wszystkie(dokumentyITerminy(martwe, plan([m8]), W))).toContain(ZALACZNIKI.zaswiadczenieMartweUrodzenie);

    // „Za życiem”: kopia zaświadczenia do wniosku o urlop rodzicielski.
    const zaZyciem = rodzina([PRZYKLAD_RODZINA.osoby[0]], { dzieci: [{ zaZyciem: true }] });
    expect(dokument(dokumentyITerminy(zaZyciem, PRZYKLAD_PLAN, W), 'wniosek_rodzicielski')?.zalaczniki).toContain(ZALACZNIKI.kopiaZaZyciem);

    // Wcześniak z uzupełniającym urlopem: zaświadczenie ze szpitala.
    const wczesniak = rodzina([PRZYKLAD_RODZINA.osoby[0]], { dzieci: [{ tydzienCiazy: 30, masaG: 1400, szpital: [{ od: '2026-12-01', do: '2027-01-10' }] }] });
    const u1: Odcinek = { id: 'u1', osobaId: 'mama', typ: 'uzupelniajacy', od: '2027-04-20', do: '2027-05-31' };
    expect(dokument(dokumentyITerminy(wczesniak, plan([M1, u1]), W), 'wniosek_uzupelniajacy')?.zalaczniki).toContain(ZALACZNIKI.zaswiadczenieZeSzpitala);

    // Przysposobienie: postanowienie sądu (ojcowski) i dokumenty z sądu opiekuńczego (rodzicielski).
    const adopcja = rodzina([PRZYKLAD_RODZINA.osoby[0], tataNaEtacie()], {
      typ: 'przysposobienie',
      data: '2026-12-01',
      przewidywana: false,
      dataUprawomocnienia: '2027-02-01',
      dzieci: [{ dataUrodzenia: '2022-11-15' }],
    });
    const n1: Odcinek = { id: 'n1', osobaId: 'mama', typ: 'na_warunkach_macierzynskiego', od: '2026-12-01', do: '2027-04-19' };
    const o1: Odcinek = { id: 'o1', osobaId: 'tata', typ: 'ojcowski', od: '2027-02-15', do: '2027-02-28' };
    const wa = dokumentyITerminy(adopcja, plan([n1, R1, o1]), W);
    expect(dokument(wa, 'wniosek_ojcowski', 'tata')?.zalaczniki).toContain(ZALACZNIKI.postanowienieOPrzysposobieniu);
    expect(dokument(wa, 'wniosek_rodzicielski', 'mama')?.zalaczniki).toContain(ZALACZNIKI.dokumentySaduPrzysposobienie);
  });

  it('D2-14 część macierzyńskiego przed porodem: załącznik – zaświadczenie lekarskie o przewidywanej dacie porodu', () => {
    const m0: Odcinek = { id: 'm0', osobaId: 'mama', typ: 'macierzynski', od: '2026-11-17', do: '2027-04-05' };
    const r1: Odcinek = { ...R1, od: '2027-04-06', do: '2027-11-15' };

    const duzy = dokumentyITerminy(PRZYKLAD_RODZINA, plan([m0, r1]), W);
    const przedPorodem = dokument(duzy, 'wniosek_macierzynski_przed_porodem', 'mama');
    expect(przedPorodem).toMatchObject({ gdzie: 'pracodawca', odcinekId: 'm0', moznaWygenerowac: true });
    expect(przedPorodem?.zalaczniki).toContain(ZALACZNIKI.zaswiadczenieLekarskiePrzewidywanaData);

    const maly = dokumentyITerminy(rodzina([mamaZ([{ ...ETAT, platnikPowyzej20: false }])]), plan([m0, r1]), W);
    expect(dokument(maly, 'ZAM', 'mama')?.zalaczniki).toContain(ZALACZNIKI.zaswiadczenieLekarskiePrzewidywanaData);
  });
});

describe('D2: wzorzec zgadza się z przykładem wzorcowym (src/mocks/przyklad.ts)', () => {
  it('kto wypłaca, wniosek o rodzicielski i terminy z PRZYKLAD_DOKUMENTY wychodzą z silnika', () => {
    const w = dokumentyITerminy(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, W);
    expect(w.ktoWyplaca.map(({ osobaId, tytulId, kto, przepis }) => ({ osobaId, tytulId, kto, przepis }))).toEqual(
      PRZYKLAD_DOKUMENTY.ktoWyplaca.map(({ osobaId, tytulId, kto, przepis }) => ({ osobaId, tytulId, kto, przepis })),
    );
    const wzor = PRZYKLAD_DOKUMENTY.dokumenty[0];
    const { nazwa: _n, zalaczniki: _z, ...rdzen } = wzor;
    void _n;
    void _z;
    expect(dokument(w, 'wniosek_rodzicielski', 'mama')).toMatchObject(rdzen);
    expect(dokument(w, 'wniosek_rodzicielski', 'mama')?.zalaczniki).toContain(ZALACZNIKI.odpisAktuUrodzenia);
    // PRZYKLAD_DOKUMENTY (plik integratora) nie ma jeszcze pól `kod` – porównujemy po dacie, rodzaju, osobie i odcinku.
    for (const t of PRZYKLAD_DOKUMENTY.terminy) {
      expect(terminy(w.terminy, { data: t.data, rodzaj: t.rodzaj, osobaId: t.osobaId, odcinekId: t.odcinekId }), t.tytul).toHaveLength(1);
    }
    // Wzorzec nie ma uwag: ani przy dokumentach, ani do całej listy.
    expect(w.uwagi).toBeUndefined();
    expect(w.dokumenty.every((d) => d.uwagi === undefined)).toBe(true);
  });

  it('każdy termin ma kod; kody wzorca w kolejności dat', () => {
    const w = dokumentyITerminy(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, W);
    expect(w.terminy.every((t) => typeof t.kod === 'string' && t.kod.length > 0)).toBe(true);
    expect(w.terminy.map((t) => [t.kod, t.data])).toEqual([
      ['POROD', '2026-12-01'],
      ['TERMIN_815', '2026-12-22'],
      ['WNIOSEK_RODZICIELSKI', '2027-03-30'],
      ['POCZATEK_RODZICIELSKI', '2027-04-20'],
      ['KONIEC_RODZICIELSKI', '2027-11-29'],
    ]);
  });
});
