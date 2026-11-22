/**
 * Walidacja planu – tor A, zadanie A5. Testy sprawdzają kody i liczby, nie treść komunikatów.
 * Uprawnienia budujemy ręcznie (kopia PRZYKLAD_UPRAWNIENIA), bez wołania `ustalUprawnienia`.
 */
import { describe, expect, it } from 'vitest';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA, PRZYKLAD_UPRAWNIENIA, PRZYKLAD_WALIDACJA } from '../../../mocks/przyklad';
import { koniecOdcinka } from '../../daty';
import type { Komunikat, Odcinek, Plan, Pule, Uprawnienie, WynikUprawnien, WynikWalidacji } from '../../types';
import { etat, kopia, mama, odcinek, P, plan, rodzina, tata, zlecenie } from '../../__tests__/rodziny';
import { walidujPlanZ } from '../walidacja';
import { dataPowrotu, wydluzenieOdcinka, zuzycieOdcinka } from '../walidacjaWspolne';

// ───────── budowniczy ─────────

function upr(dodatkowe: Uprawnienie[] = [], pule: Partial<Pule> = {}, bez: (u: Uprawnienie) => boolean = () => false): WynikUprawnien {
  const u = kopia(PRZYKLAD_UPRAWNIENIA);
  return { ...u, uprawnienia: [...u.uprawnienia.filter((x) => !bez(x)), ...dodatkowe], pule: { ...u.pule, ...pule } };
}

function wpis(osobaId: string, swiadczenie: Uprawnienie['swiadczenie'], przysluguje: Uprawnienie['przysluguje'], kod = 'TEST'): Uprawnienie {
  return { kod, osobaId, swiadczenie, przysluguje, powod: 'test', przepis: 'test' };
}

/** Uprawnienia taty na etacie (D3): macierzyński tylko przejęcie (warunkowo), rodzicielski i ojcowski. */
const UPR_TATY: Uprawnienie[] = [
  wpis('tata', 'macierzynski', 'warunkowo', 'MAC_TYLKO_PRZEJECIE'),
  wpis('tata', 'rodzicielski', true),
  wpis('tata', 'ojcowski', true),
  wpis('tata', 'uzupelniajacy', true),
];

const R1 = rodzina(); // EC-01: mama na etacie, poród 2026-12-01
const R2 = rodzina({ osoby: [mama(), tata()] });
const U1 = upr();
const U2 = upr(UPR_TATY);

const mac = (od = '2026-12-01', do_ = '2027-04-19', osobaId = 'mama', id?: string): Odcinek =>
  odcinek({ id, osobaId, typ: 'macierzynski', od, do: do_ });
const rodz = (osobaId: string, od: string, do_: string, id?: string, wymiarPracy?: number): Odcinek =>
  odcinek({ id, osobaId, typ: 'rodzicielski', od, do: do_, ...(wymiarPracy !== undefined ? { wymiarPracy } : {}) });
const ojc = (od: string, do_: string, id?: string): Odcinek => odcinek({ id, osobaId: 'tata', typ: 'ojcowski', od, do: do_ });

function wszystkie(w: WynikWalidacji): Komunikat[] {
  return [...w.bledy, ...w.ostrzezenia, ...w.konsekwencje];
}
const bledy = (w: WynikWalidacji) => w.bledy.map((k) => k.kod);
const ostrzezenia = (w: WynikWalidacji) => w.ostrzezenia.map((k) => k.kod);
const konsekwencje = (w: WynikWalidacji) => w.konsekwencje.map((k) => k.kod);

const W = (r = R1, pl: Plan, u = U1) => walidujPlanZ(r, pl, u, P());

// Plany z tabeli A4 w planie toru A (poród 2026-12-01).
const PLAN_MAMA_CALY = plan([mac(), rodz('mama', '2027-04-20', '2027-11-29')], { id: 'mama-caly-urlop' });
const PLAN_PO_ROWNO = plan(
  [mac(), rodz('mama', '2027-04-20', '2027-07-05'), rodz('tata', '2027-07-06', '2028-01-31'), ojc('2026-12-01', '2026-12-14')],
  { id: 'po-rowno' },
);
const PLAN_TATA_PO_14 = plan(
  [mac('2026-12-01', '2027-03-08'), mac('2027-03-09', '2027-04-19', 'tata'), rodz('tata', '2027-04-20', '2027-11-29'), ojc('2026-12-01', '2026-12-14')],
  { id: 'tata-po-14-tyg' },
);
const PLAN_TATA_9 = plan(
  [mac(), rodz('mama', '2027-04-20', '2027-11-29'), rodz('tata', '2027-11-30', '2028-01-31'), ojc('2026-12-01', '2026-12-14')],
  { id: 'tata-swoje-9-tyg' },
);
const PLAN_POL_ETATU = plan([mac(), rodz('mama', '2027-04-20', '2028-07-10', undefined, 0.5)], { id: 'mama-pol-etatu' });

// ───────── testy ─────────

describe('przykład wzorcowy i scenariusze A4', () => {
  it('PRZYKLAD_PLAN + PRZYKLAD_RODZINA + PRZYKLAD_UPRAWNIENIA: poprawny, ostrzeżenie RODZ_9_TYG_DRUGIEGO_RODZICA (EC-59)', () => {
    const w = walidujPlanZ(PRZYKLAD_RODZINA, PRZYKLAD_PLAN, PRZYKLAD_UPRAWNIENIA, P());
    expect(w.poprawny).toBe(true);
    expect(w.bledy).toEqual([]);
    expect(ostrzezenia(w)).toContain('RODZ_9_TYG_DRUGIEGO_RODZICA');
    expect(w.wykorzystanie).toEqual(PRZYKLAD_WALIDACJA.wykorzystanie);
  });

  it.each([
    ['mama-caly-urlop', R1, PLAN_MAMA_CALY, U1],
    ['po-rowno', R2, PLAN_PO_ROWNO, U2],
    ['tata-po-14-tyg', R2, PLAN_TATA_PO_14, U2],
    ['tata-swoje-9-tyg', R2, PLAN_TATA_9, U2],
    ['mama-pol-etatu', R1, PLAN_POL_ETATU, U1],
  ] as const)('plan %s jest poprawny', (_n, r, pl, u) => {
    const w = W(r, pl, u);
    expect(bledy(w)).toEqual([]);
    expect(w.poprawny).toBe(true);
  });

  it('tata-po-14-tyg: ostrzeżenie, że 9 tygodni mamy przepadnie (D15)', () => {
    const w = W(R2, PLAN_TATA_PO_14, U2);
    expect(w.ostrzezenia.find((k) => k.kod === 'RODZ_9_TYG_DRUGIEGO_RODZICA')?.osobaId).toBe('mama');
  });

  it('po-rowno i tata-swoje-9-tyg: nikt nie traci 9 tygodni – brak RODZ_9_TYG_DRUGIEGO_RODZICA', () => {
    expect(ostrzezenia(W(R2, PLAN_PO_ROWNO, U2))).not.toContain('RODZ_9_TYG_DRUGIEGO_RODZICA');
    expect(ostrzezenia(W(R2, PLAN_TATA_9, U2))).not.toContain('RODZ_9_TYG_DRUGIEGO_RODZICA');
  });

  it('nie zmienia planu, rodziny ani uprawnień', () => {
    const [r, pl, u] = [kopia(R2), kopia(PLAN_TATA_PO_14), kopia(U2)];
    W(r, pl, u);
    expect([r, pl, u]).toEqual([R2, PLAN_TATA_PO_14, U2]);
  });
});

describe('macierzyński', () => {
  it('MAC_MIN_14_TYG (EC-51): mama kończy macierzyński 2027-02-08 (10 tygodni)', () => {
    const w = W(R2, plan([mac('2026-12-01', '2027-02-08', 'mama', 'm1'), mac('2027-02-09', '2027-04-19', 'tata')]), U2);
    expect(bledy(w)).toContain('MAC_MIN_14_TYG');
    const k = w.bledy.find((x) => x.kod === 'MAC_MIN_14_TYG')!;
    expect(k.osobaId).toBe('mama');
    expect(k.odcinekId).toBe('m1');
    expect(w.poprawny).toBe(false);
  });

  it('MAC_MIN_14_TYG: przerwa w macierzyńskim mamy w pierwszych 14 tygodniach', () => {
    const w = W(R1, plan([mac('2026-12-01', '2027-01-10', 'mama', 'a'), mac('2027-01-20', '2027-04-19', 'mama', 'b')]));
    expect(bledy(w)).toContain('MAC_MIN_14_TYG');
  });

  it('MAC_MIN_14_TYG (EC-55): mama z orzeczeniem o niezdolności – wystarczy 8 tygodni, 7 nie wystarczy', () => {
    const r = rodzina({ osoby: [mama(undefined, { zdrowie: { orzeczenieNiezdolnosciSamodzielnejEgzystencji: true } }), tata()] });
    const ok = W(r, plan([mac('2026-12-01', '2027-01-25'), mac('2027-01-26', '2027-04-19', 'tata')]), U2);
    expect(bledy(ok)).not.toContain('MAC_MIN_14_TYG');
    const zle = W(r, plan([mac('2026-12-01', '2027-01-18'), mac('2027-01-19', '2027-04-19', 'tata')]), U2);
    expect(bledy(zle)).toContain('MAC_MIN_14_TYG');
  });

  it('MAC_MIN_14_TYG (EC-52): mama w szpitalu w okresie po porodzie – sytuacja szczególna, 8 tygodni', () => {
    const r = rodzina({ osoby: [mama(undefined, { zdrowie: { pobytWSzpitalu: [{ od: '2027-01-26', do: '2027-02-20' }] } }), tata()] });
    const w = W(r, plan([mac('2026-12-01', '2027-01-25'), mac('2027-01-26', '2027-02-20', 'tata'), mac('2027-02-21', '2027-04-19', 'mama', 'm2')]), U2);
    expect(bledy(w)).toEqual([]);
  });

  it('MAC_MIN_14_TYG: pobyt w szpitalu przy porodzie (1–3.12) nie skraca minimum – mama kończy po 8 tygodniach', () => {
    const r = rodzina({ osoby: [mama(undefined, { zdrowie: { pobytWSzpitalu: [{ od: '2026-12-01', do: '2026-12-03' }] } }), tata()] });
    const w = W(r, plan([mac('2026-12-01', '2027-01-25'), mac('2027-01-26', '2027-04-19', 'tata')]), U2);
    expect(bledy(w)).toContain('MAC_MIN_14_TYG');
  });

  it('MAC_MIN_14_TYG: tata przejmuje dłużej, niż mama jest w szpitalu po 8. tygodniu', () => {
    const r = rodzina({ osoby: [mama(undefined, { zdrowie: { pobytWSzpitalu: [{ od: '2027-01-26', do: '2027-02-10' }] } }), tata()] });
    const w = W(r, plan([mac('2026-12-01', '2027-01-25'), mac('2027-01-26', '2027-02-20', 'tata'), mac('2027-02-21', '2027-04-19')]), U2);
    expect(bledy(w)).toContain('MAC_MIN_14_TYG');
  });

  it('MAC_MIN_14_TYG (EC-53): zgon mamy w 12. tygodniu – mama musi mieć urlop do dnia zgonu', () => {
    const r = rodzina({ osoby: [mama(undefined, { zdrowie: { zgon: '2027-02-20' } }), tata()] });
    const zle = W(r, plan([mac('2026-12-01', '2027-01-25'), mac('2027-01-26', '2027-04-19', 'tata')]), U2);
    expect(bledy(zle)).toContain('MAC_MIN_14_TYG');
    const ok = W(r, plan([mac('2026-12-01', '2027-02-20'), mac('2027-02-21', '2027-04-19', 'tata')]), U2);
    expect(bledy(ok)).not.toContain('MAC_MIN_14_TYG');
  });

  it('MAC_MIN_14_TYG (EC-54): porzucenie dziecka – do dnia porzucenia, ale nie krócej niż 8 tygodni', () => {
    const wczesne = rodzina({ osoby: [mama(undefined, { zdrowie: { porzucenieDziecka: '2027-01-10' } }), tata()] });
    expect(bledy(W(wczesne, plan([mac('2026-12-01', '2027-01-25'), mac('2027-01-26', '2027-04-19', 'tata')]), U2))).not.toContain('MAC_MIN_14_TYG');
    expect(bledy(W(wczesne, plan([mac('2026-12-01', '2027-01-18'), mac('2027-01-19', '2027-04-19', 'tata')]), U2))).toContain('MAC_MIN_14_TYG');
    const pozne = rodzina({ osoby: [mama(undefined, { zdrowie: { porzucenieDziecka: '2027-02-15' } }), tata()] });
    expect(bledy(W(pozne, plan([mac('2026-12-01', '2027-01-25'), mac('2027-01-26', '2027-04-19', 'tata')]), U2))).toContain('MAC_MIN_14_TYG');
    expect(bledy(W(pozne, plan([mac('2026-12-01', '2027-02-15'), mac('2027-02-16', '2027-04-19', 'tata')]), U2))).not.toContain('MAC_MIN_14_TYG');
  });

  it('MAC_MIN_14_TYG: pusty plan, a mama ma prawo do macierzyńskiego – plan niepoprawny', () => {
    const w = W(R1, plan([]));
    expect(bledy(w)).toContain('MAC_MIN_14_TYG');
    expect(w.poprawny).toBe(false);
  });

  it('MAC_MIN_14_TYG: mama z prawem do macierzyńskiego, w planie tylko rodzicielski taty', () => {
    expect(bledy(W(R2, plan([rodz('tata', '2027-04-20', '2027-06-21')]), U2))).toContain('MAC_MIN_14_TYG');
  });

  it('MAC_RESZTA_PRZEPADNIE: mama kończy po 14 tygodniach, a nikt nie przejmuje reszty', () => {
    const w = W(R2, plan([mac('2026-12-01', '2027-03-08', 'mama', 'm1')]), U2);
    expect(w.ostrzezenia.find((k) => k.kod === 'MAC_RESZTA_PRZEPADNIE')?.odcinekId).toBe('m1');
    expect(ostrzezenia(W(R2, PLAN_TATA_PO_14, U2))).not.toContain('MAC_RESZTA_PRZEPADNIE');
    expect(ostrzezenia(W(R1, PLAN_MAMA_CALY))).not.toContain('MAC_RESZTA_PRZEPADNIE');
  });

  it('MAC_PRZEKROCZONY_WYMIAR: mama 141 dni macierzyńskiego', () => {
    expect(bledy(W(R1, plan([mac('2026-12-01', '2027-04-20')])))).toContain('MAC_PRZEKROCZONY_WYMIAR');
  });

  it('MAC_PRZEKROCZONY_WYMIAR (KP 180 § 14): mama 14 tygodni + tata do 2027-04-20 to razem więcej niż 20 tygodni', () => {
    const w = W(R2, plan([mac('2026-12-01', '2027-03-08'), mac('2027-03-09', '2027-04-20', 'tata')]), U2);
    expect(bledy(w)).toContain('MAC_PRZEKROCZONY_WYMIAR');
  });

  it('MAC_PRZEKROCZONY_WYMIAR: urlop po dniu z pule.macierzynskiOstatniDzien (zgon dziecka)', () => {
    const u = upr([], { macierzynskiTyg: 8, macierzynskiOstatniDzien: '2027-01-25', rodzicielskiTyg: 0, ojcowskiTyg: 0 });
    expect(bledy(W(R1, plan([mac('2026-12-01', '2027-01-26')]), u))).toContain('MAC_PRZEKROCZONY_WYMIAR');
    expect(W(R1, plan([mac('2026-12-01', '2027-01-25')]), u).bledy).toEqual([]);
  });

  it('MAC_PRZED_PORODEM_MAX_6 (EC-33): początek 6 tygodni i 1 dzień przed porodem', () => {
    expect(bledy(W(R1, plan([mac('2026-10-19', '2027-03-07')])))).toContain('MAC_PRZED_PORODEM_MAX_6');
    expect(bledy(W(R1, plan([mac('2026-10-20', '2027-03-08')])))).not.toContain('MAC_PRZED_PORODEM_MAX_6');
  });

  it('urlop przed porodem zużywa pulę: 2 tygodnie przed + 18 po porodzie jest poprawne (KP 180 § 3)', () => {
    const w = W(R1, plan([mac('2026-11-17', '2027-04-05'), rodz('mama', '2027-04-06', '2027-11-15')]));
    expect(bledy(w)).toEqual([]);
  });

  it('MAC_PRZEJECIE_BEZ_CIAGLOSCI (EC-50): tata zaczyna 2 dni po końcu urlopu mamy', () => {
    const w = W(R2, plan([mac('2026-12-01', '2027-03-08'), mac('2027-03-10', '2027-04-19', 'tata', 't1')]), U2);
    expect(bledy(w)).toContain('MAC_PRZEJECIE_BEZ_CIAGLOSCI');
    expect(w.bledy.find((k) => k.kod === 'MAC_PRZEJECIE_BEZ_CIAGLOSCI')?.odcinekId).toBe('t1');
  });

  it('MAC_PRZEJECIE_BEZ_CIAGLOSCI: tata ma macierzyński w tym samym czasie co mama', () => {
    const w = W(R2, plan([mac('2026-12-01', '2027-03-08'), mac('2027-02-01', '2027-02-28', 'tata')]), U2);
    expect(bledy(w)).toContain('MAC_PRZEJECIE_BEZ_CIAGLOSCI');
  });

  it('OJCIEC_MUSI_PRZEJAC (EC-50): mama rezygnuje po 14 tygodniach, tata przejmuje od następnego dnia', () => {
    const w = W(R2, PLAN_TATA_PO_14, U2);
    const k = w.konsekwencje.find((x) => x.kod === 'OJCIEC_MUSI_PRZEJAC');
    expect(k?.osobaId).toBe('tata');
  });
});

describe('uzupełniający', () => {
  const pule = { uzupelniajacyTyg: 8 };
  const u = upr([...UPR_TATY, wpis('mama', 'uzupelniajacy', true)], pule, (x) => x.osobaId === 'mama' && x.swiadczenie === 'uzupelniajacy');
  const uzup = (osobaId: string, od: string, do_: string): Odcinek => odcinek({ osobaId, typ: 'uzupelniajacy', od, do: do_ });

  it('uzupełniający mamy dzień po macierzyńskim jest poprawny', () => {
    const w = W(R2, plan([mac(), uzup('mama', '2027-04-20', '2027-05-03'), rodz('mama', '2027-05-04', '2027-12-13')]), u);
    expect(bledy(w)).toEqual([]);
  });

  it('UZUP_DLA_OBOJGA (EC-68): uzupełniający u mamy i u taty', () => {
    const w = W(R2, plan([mac(), uzup('mama', '2027-04-20', '2027-04-26'), uzup('tata', '2027-04-27', '2027-05-03')]), u);
    expect(bledy(w)).toContain('UZUP_DLA_OBOJGA');
  });

  it('UZUP_NIE_PO_MAC: uzupełniający zaczyna się 2 dni po macierzyńskim', () => {
    const w = W(R2, plan([mac(), uzup('mama', '2027-04-21', '2027-05-04')]), u);
    expect(bledy(w)).toContain('UZUP_NIE_PO_MAC');
  });

  it('UZUP_PRZEKROCZONY_WYMIAR: 9 tygodni uzupełniającego przy puli 8', () => {
    const w = W(R2, plan([mac(), uzup('mama', '2027-04-20', koniecOdcinka('2027-04-20', 63))]), u);
    expect(bledy(w)).toContain('UZUP_PRZEKROCZONY_WYMIAR');
  });
});

describe('rodzicielski', () => {
  it('EC-58: oboje jednocześnie, razem tyle, ile pula – poprawne', () => {
    const w = W(R2, plan([mac(), rodz('mama', '2027-04-20', '2027-11-29'), rodz('tata', '2027-04-20', '2027-06-21')]), U2);
    expect(bledy(w)).toEqual([]);
  });

  it('RODZ_PRZEKROCZONA_PULA (EC-58): mama 32 tygodnie + tata 10 tygodni jednocześnie', () => {
    const w = W(R2, plan([mac(), rodz('mama', '2027-04-20', '2027-11-29'), rodz('tata', '2027-04-20', '2027-06-28')]), U2);
    expect(bledy(w)).toContain('RODZ_PRZEKROCZONA_PULA');
  });

  it('RODZ_NIEPRZENOSZALNE (EC-59): mama bierze całe 41 tygodni', () => {
    const pl = plan([mac(), rodz('mama', '2027-04-20', koniecOdcinka('2027-04-20', 41 * 7))]);
    expect(bledy(W(R1, pl))).toContain('RODZ_NIEPRZENOSZALNE');
    expect(bledy(W(R2, pl, U2))).toContain('RODZ_NIEPRZENOSZALNE');
  });

  describe('EC-56: mama nieubezpieczona (odpowiedź ZUS na stoisku 21.11, pytania nr 6 i 14)', () => {
    const r = rodzina({ osoby: [mama([]), tata()] });
    const u = upr(
      [
        wpis('mama', 'macierzynski', false),
        wpis('mama', 'rodzicielski', false),
        wpis('tata', 'rodzicielski', 'warunkowo', 'MATKA_NIEUBEZPIECZONA'),
        wpis('tata', 'ojcowski', true),
      ],
      {},
      (x) => x.osobaId === 'mama',
    );

    it('tata bierze całą pulę (41 tygodni) – błąd RODZ_NIEPRZENOSZALNE, bez „do potwierdzenia”', () => {
      const w = W(r, plan([ojc('2026-12-01', '2026-12-14'), rodz('tata', '2027-04-20', koniecOdcinka('2027-04-20', 41 * 7))]), u);
      expect(bledy(w)).toContain('RODZ_NIEPRZENOSZALNE');
      expect(ostrzezenia(w)).not.toContain('DO_POTWIERDZENIA_W_ZUS');
    });

    it('tata bierze pulę − 9 tygodni – poprawne; 9 tygodni mamy przepada (przepadnieDni 63)', () => {
      const w = W(r, plan([ojc('2026-12-01', '2026-12-14'), rodz('tata', '2027-04-20', koniecOdcinka('2027-04-20', 32 * 7))]), u);
      expect(bledy(w)).toEqual([]);
      expect(w.ostrzezenia.find((k) => k.kod === 'RODZ_9_TYG_DRUGIEGO_RODZICA')?.osobaId).toBe('mama');
      expect(w.wykorzystanie.find((x) => x.pula === 'rodzicielski')?.przepadnieDni).toBe(63);
      expect(w.wykorzystanie.find((x) => x.pula === 'rodzicielski_nieprzenoszalne' && x.osobaId === 'mama')).toMatchObject({
        wykorzystaneDni: 0,
        dostepneDni: 63,
        przepadnieDni: 63,
      });
    });
  });

  it('RODZ_9_TYG_DRUGIEGO_RODZICA (EC-59): tata jest w rodzinie, ale nie ma rodzicielskiego w planie', () => {
    const w = W(R2, PLAN_MAMA_CALY, U2);
    expect(w.poprawny).toBe(true);
    expect(w.ostrzezenia.find((k) => k.kod === 'RODZ_9_TYG_DRUGIEGO_RODZICA')?.osobaId).toBe('tata');
  });

  it('RODZ_ZA_DUZO_CZESCI (EC-63): rodzicielski mamy w 6 częściach; 5 części jest dozwolone', () => {
    const czesci = ['2027-04-20', '2027-05-04', '2027-05-18', '2027-06-01', '2027-06-15', '2027-06-29'].map((od, i) =>
      rodz('mama', od, koniecOdcinka(od, 7), `r${i}`),
    );
    expect(bledy(W(R1, plan([mac(), ...czesci])))).toContain('RODZ_ZA_DUZO_CZESCI');
    expect(bledy(W(R1, plan([mac(), ...czesci.slice(0, 5)])))).not.toContain('RODZ_ZA_DUZO_CZESCI');
  });

  it('RODZ_PO_TERMINIE (EC-64): rodzicielski po końcu roku, w którym dziecko kończy 6 lat', () => {
    expect(bledy(W(R1, plan([mac(), rodz('mama', '2032-12-25', '2033-01-07')])))).toContain('RODZ_PO_TERMINIE');
    expect(bledy(W(R1, plan([mac(), rodz('mama', '2032-12-18', '2032-12-31')])))).not.toContain('RODZ_PO_TERMINIE');
  });

  it('pytanie 16 (odpowiedź ZUS 21.11): tata może zacząć rodzicielski, zanim mama skończy macierzyński', () => {
    const w = W(R2, plan([mac('2026-12-01', '2027-04-19'), rodz('tata', '2027-01-04', koniecOdcinka('2027-01-04', 9 * 7))]), U2);
    expect(bledy(w)).toEqual([]);
    expect(w.poprawny).toBe(true);
  });

  it('RODZ_PRZED_KONCEM_MAC: rodzicielski taty przed końcem jego własnego (przejętego) macierzyńskiego', () => {
    const pl = plan([
      mac('2026-12-01', '2027-03-08'),
      rodz('tata', '2026-12-15', koniecOdcinka('2026-12-15', 14), 't-r'),
      mac('2027-03-09', '2027-04-19', 'tata'),
    ]);
    const w = W(R2, pl, U2);
    expect(w.bledy.find((k) => k.kod === 'RODZ_PRZED_KONCEM_MAC')?.odcinekId).toBe('t-r');
  });

  it('RODZ_PRZED_KONCEM_MAC: rodzicielski nie może zacząć się przed dniem porodu', () => {
    const przed = W(R2, plan([mac(), rodz('tata', '2026-11-24', koniecOdcinka('2026-11-24', 14))]), U2);
    expect(bledy(przed)).toContain('RODZ_PRZED_KONCEM_MAC');
    const odPorodu = W(R2, plan([mac(), rodz('tata', '2026-12-01', koniecOdcinka('2026-12-01', 14))]), U2);
    expect(bledy(odPorodu)).not.toContain('RODZ_PRZED_KONCEM_MAC');
  });

  it('RODZ_NIEPELNY_TYDZIEN (odpowiedź ZUS 21.11, pytanie 15): część 13 dni to błąd', () => {
    const w = W(R1, plan([mac(), rodz('mama', '2027-04-20', '2027-05-02')]));
    expect(bledy(w)).toContain('RODZ_NIEPELNY_TYDZIEN');
    expect(ostrzezenia(w)).not.toContain('RODZ_NIEPELNY_TYDZIEN');
    expect(w.poprawny).toBe(false);
  });

  it('RODZ_NIEPELNY_TYDZIEN: część z pracą liczy zużycie puli – 298 dni na 0,25 etatu zużywa 224 dni, bez błędu', () => {
    const pelne = W(R1, plan([mac(), rodz('mama', '2027-04-20', koniecOdcinka('2027-04-20', 298), 'r1', 0.25)]));
    expect(bledy(pelne)).not.toContain('RODZ_NIEPELNY_TYDZIEN');
    const niepelne = W(R1, plan([mac(), rodz('mama', '2027-04-20', koniecOdcinka('2027-04-20', 105), 'r1', 0.5)]));
    expect(bledy(niepelne)).toContain('RODZ_NIEPELNY_TYDZIEN');
  });

  it('PRACA_WYMIAR_ZA_DUZY (EC-81): praca na 0,6 etatu', () => {
    const w = W(R1, plan([mac(), rodz('mama', '2027-04-20', '2027-09-06', undefined, 0.6)]));
    expect(bledy(w)).toContain('PRACA_WYMIAR_ZA_DUZY');
  });

  it('LACZENIE_WYDLUZA_URLOP (EC-80): pół etatu przez 20 tygodni (140 dni) – wydłużenie 70 dni', () => {
    const r1 = rodz('mama', '2027-04-20', koniecOdcinka('2027-04-20', 140), 'r1', 0.5);
    const w = W(R1, plan([mac(), r1]));
    expect(w.poprawny).toBe(true);
    const k = w.konsekwencje.find((x) => x.kod === 'LACZENIE_WYDLUZA_URLOP');
    expect(k?.odcinekId).toBe('r1');
    expect(zuzycieOdcinka(R1, r1, P())).toBe(70);
    expect(wydluzenieOdcinka(R1, r1, P())).toBe(70);
  });

  it('zużycie puli przy łączeniu liczy dni w górę – odwrotność długości z akcji A6 (D10 po zmianie)', () => {
    const z = (dni: number, w: number) => zuzycieOdcinka(R1, rodz('mama', '2027-04-20', koniecOdcinka('2027-04-20', dni), 'r', w), P());
    expect(z(448, 0.5)).toBe(224);
    expect(z(298, 0.25)).toBe(224);
    expect(z(90, 0.3)).toBe(63);
    expect(z(100, 0.3)).toBe(70);
    expect(z(105, 0.5)).toBe(53);
  });

  it('LACZENIE_TYLKO_PRACOWNIK: umowa o pracę skończyła się przed początkiem odcinka – bez zmniejszenia zużycia', () => {
    const r = rodzina({ osoby: [mama([etat({ do: '2027-03-31' })])] });
    const r1 = rodz('mama', '2027-04-20', koniecOdcinka('2027-04-20', 140), 'r1', 0.5);
    const w = W(r, plan([mac(), r1]));
    expect(ostrzezenia(w)).toContain('LACZENIE_TYLKO_PRACOWNIK');
    expect(zuzycieOdcinka(r, r1, P())).toBe(140);
  });

  it('łączenie: tytuł odcinka to zlecenie, choć osoba ma też etat – bez zmniejszenia zużycia', () => {
    const r = rodzina({ osoby: [mama([etat(), zlecenie()])] });
    const r1 = { ...rodz('mama', '2027-04-20', koniecOdcinka('2027-04-20', 140), 'r1', 0.5), tytulId: 'zlecenie-1' };
    expect(ostrzezenia(W(r, plan([mac(), r1])))).toContain('LACZENIE_TYLKO_PRACOWNIK');
    expect(zuzycieOdcinka(r, r1, P())).toBe(140);
  });

  it('LACZENIE_PRZYCIETE_DO_LIMITU (EC-82): wydłużenie dochodzi dokładnie do 82 tygodni', () => {
    const odcinkiMamy = [mac(), rodz('mama', '2027-04-20', '2028-07-10', undefined, 0.5)];
    const w = W(R2, plan([...odcinkiMamy, rodz('tata', '2028-07-11', koniecOdcinka('2028-07-11', 126), undefined, 0.5)]), U2);
    expect(ostrzezenia(w)).toContain('LACZENIE_PRZYCIETE_DO_LIMITU');
    expect(w.poprawny).toBe(true);
  });

  it('RODZ_PRZEKROCZONY_LIMIT_Z_PRACA (EC-82): urlop z pracą dłuższy niż 82 tygodnie', () => {
    const odcinkiMamy = [mac(), rodz('mama', '2027-04-20', '2028-07-10', undefined, 0.5)];
    const w = W(R2, plan([...odcinkiMamy, rodz('tata', '2028-07-11', koniecOdcinka('2028-07-11', 127), undefined, 0.5)]), U2);
    expect(bledy(w)).toContain('RODZ_PRZEKROCZONY_LIMIT_Z_PRACA');
  });

  it('wymiar pracy ponad pół etatu: błąd, a pula liczy się jak przy pół etatu', () => {
    const r1 = rodz('mama', '2027-04-20', koniecOdcinka('2027-04-20', 140), 'r1', 0.6);
    expect(zuzycieOdcinka(R1, r1, P())).toBe(70);
  });

  it('RODZ_ZA_DUZO_CZESCI (odpowiedź ZUS 21.11, pytanie 39): limit 5 części dla obojga razem – 3 + 3 to błąd, 3 + 2 nie', () => {
    const odcinki = ['2027-04-20', '2027-05-04', '2027-05-18', '2027-06-01', '2027-06-15', '2027-06-29'].map((od, i) =>
      rodz(i < 3 ? 'mama' : 'tata', od, koniecOdcinka(od, 7), `r${i}`),
    );
    const szesc = W(R2, plan([mac(), ...odcinki]), U2);
    expect(bledy(szesc)).toContain('RODZ_ZA_DUZO_CZESCI');
    expect(ostrzezenia(szesc)).not.toContain('RODZ_ZA_DUZO_CZESCI_RODZINA');
    const piec = W(R2, plan([mac(), ...odcinki.slice(0, 5)]), U2);
    expect(bledy(piec)).toEqual([]);
  });

  it('RODZ_PRZED_KONCEM_MAC: bez macierzyńskiego w planie granicą jest dzień porodu (pytanie 16)', () => {
    const r = rodzina({ osoby: [mama([]), tata()] });
    const u = upr([wpis('mama', 'rodzicielski', false), wpis('tata', 'rodzicielski', true)], {}, (x) => x.osobaId === 'mama');
    expect(bledy(W(r, plan([rodz('tata', '2026-11-30', koniecOdcinka('2026-11-30', 63))]), u))).toContain('RODZ_PRZED_KONCEM_MAC');
    expect(bledy(W(r, plan([rodz('tata', '2026-12-01', koniecOdcinka('2026-12-01', 63))]), u))).not.toContain('RODZ_PRZED_KONCEM_MAC');
  });

  it('pytanie 14 (odpowiedź ZUS 21.11): tata w rodzinie bez prawa do rodzicielskiego, mama bierze 41 tygodni – błąd RODZ_NIEPRZENOSZALNE', () => {
    const u = upr([wpis('tata', 'rodzicielski', false)]);
    const w = W(R2, plan([mac(), rodz('mama', '2027-04-20', koniecOdcinka('2027-04-20', 41 * 7))]), u);
    expect(bledy(w)).toContain('RODZ_NIEPRZENOSZALNE');
    expect(ostrzezenia(w)).not.toContain('DO_POTWIERDZENIA_W_ZUS');
  });

  it('pytanie 14 (odpowiedź ZUS 21.11): tata bez prawa – jego 9 tygodni przepada (przepadnieDni 63)', () => {
    const u = upr([wpis('tata', 'rodzicielski', false)]);
    const w = W(R2, PLAN_MAMA_CALY, u);
    expect(bledy(w)).toEqual([]);
    expect(w.ostrzezenia.find((k) => k.kod === 'RODZ_9_TYG_DRUGIEGO_RODZICA')?.osobaId).toBe('tata');
    expect(w.wykorzystanie.find((x) => x.pula === 'rodzicielski')?.przepadnieDni).toBe(63);
  });

  it('LACZENIE_TYLKO_PRACOWNIK (EC-85, pytanie 10): łączenie u mamy na zleceniu – ostrzeżenie, bez wydłużenia', () => {
    const r = rodzina({ osoby: [mama([zlecenie()])] });
    const r1 = rodz('mama', '2027-04-20', koniecOdcinka('2027-04-20', 140), 'r1', 0.5);
    const w = W(r, plan([mac(), r1]));
    expect(ostrzezenia(w)).toContain('LACZENIE_TYLKO_PRACOWNIK');
    expect(konsekwencje(w)).not.toContain('LACZENIE_WYDLUZA_URLOP');
    expect(zuzycieOdcinka(r, r1, P())).toBe(140);
  });
});

describe('ojcowski', () => {
  it('ojcowski 7 + 7 dni w dwóch częściach jest poprawny', () => {
    const w = W(R2, plan([mac(), ojc('2026-12-01', '2026-12-07', 'o1'), ojc('2027-01-04', '2027-01-10', 'o2')]), U2);
    expect(bledy(w)).toEqual([]);
  });

  it('OJC_ZLE_CZESCI (EC-66): ojcowski 5 + 9 dni', () => {
    const w = W(R2, plan([mac(), ojc('2026-12-01', '2026-12-05', 'o1'), ojc('2027-01-04', '2027-01-12', 'o2')]), U2);
    expect(bledy(w)).toContain('OJC_ZLE_CZESCI');
    expect(bledy(w)).not.toContain('OJC_ZA_DUZO');
  });

  it('OJC_ZLE_CZESCI (EC-66): ojcowski w 3 częściach', () => {
    const w = W(R2, plan([mac(), ojc('2026-12-01', '2026-12-07', 'o1'), ojc('2027-01-04', '2027-01-10', 'o2'), ojc('2027-02-01', '2027-02-07', 'o3')]), U2);
    expect(bledy(w)).toContain('OJC_ZLE_CZESCI');
  });

  it('OJC_ZA_DUZO: ojcowski 15 dni', () => {
    expect(bledy(W(R2, plan([mac(), ojc('2026-12-01', '2026-12-15')]), U2))).toContain('OJC_ZA_DUZO');
  });

  it('OJC_PO_TERMINIE (EC-65): ojcowski kończy się po pierwszych urodzinach dziecka', () => {
    expect(bledy(W(R2, plan([mac(), ojc('2027-11-24', '2027-12-07')]), U2))).toContain('OJC_PO_TERMINIE');
    expect(bledy(W(R2, plan([mac(), ojc('2027-11-17', '2027-11-30')]), U2))).not.toContain('OJC_PO_TERMINIE');
  });
});

describe('wspólne', () => {
  it('BRAK_UPRAWNIENIA: ojcowski taty bez wpisu w uprawnieniach', () => {
    const w = W(R2, plan([mac(), ojc('2026-12-01', '2026-12-14', 'o1')]), U1);
    const k = w.bledy.find((x) => x.kod === 'BRAK_UPRAWNIENIA');
    expect(k?.osobaId).toBe('tata');
    expect(k?.odcinekId).toBe('o1');
  });

  it('BRAK_UPRAWNIENIA: uzupełniający mamy, gdy wpis ma przysluguje: false', () => {
    const w = W(R1, plan([mac(), odcinek({ osobaId: 'mama', typ: 'uzupelniajacy', od: '2027-04-20', do: '2027-04-26' })]), upr([], { uzupelniajacyTyg: 1 }));
    expect(bledy(w)).toContain('BRAK_UPRAWNIENIA');
  });

  it("przysluguje: 'warunkowo' nie jest błędem (macierzyński taty przy przejęciu)", () => {
    expect(bledy(W(R2, PLAN_TATA_PO_14, U2))).not.toContain('BRAK_UPRAWNIENIA');
  });

  it('ODCINKI_NACHODZA: macierzyński i rodzicielski mamy mają wspólny dzień', () => {
    const w = W(R1, plan([mac(), rodz('mama', '2027-04-19', '2027-11-28')]));
    expect(bledy(w)).toContain('ODCINKI_NACHODZA');
  });

  it('praca w czasie rodzicielskiego z wymiarem pracy to nie ODCINKI_NACHODZA', () => {
    const w = W(R1, plan([...PLAN_POL_ETATU.odcinki, odcinek({ osobaId: 'mama', typ: 'praca', od: '2027-04-20', do: '2028-07-10' })]));
    expect(bledy(w)).not.toContain('ODCINKI_NACHODZA');
  });

  it('POWROT_DO_PRACY: jedna konsekwencja na osobę, dzień po ostatnim odcinku', () => {
    const w = W(R2, PLAN_PO_ROWNO, U2);
    const powroty = w.konsekwencje.filter((k) => k.kod === 'POWROT_DO_PRACY');
    expect(powroty.map((k) => k.osobaId).sort()).toEqual(['mama', 'tata']);
    expect(dataPowrotu(PLAN_PO_ROWNO, 'mama')).toBe('2027-07-06');
    expect(dataPowrotu(PLAN_PO_ROWNO, 'tata')).toBe('2028-02-01');
    expect(dataPowrotu(PRZYKLAD_PLAN, 'mama')).toBe('2027-11-30');
  });

  it('KONIEC_ZASILKU zamiast POWROT_DO_PRACY: mama na zleceniu albo z umową o pracę zakończoną przed powrotem', () => {
    for (const r of [rodzina({ osoby: [mama([zlecenie()])] }), rodzina({ osoby: [mama([etat({ do: '2027-06-30' })])] })]) {
      const w = W(r, PLAN_MAMA_CALY);
      expect(w.konsekwencje.find((k) => k.kod === 'KONIEC_ZASILKU')?.osobaId).toBe('mama');
      expect(konsekwencje(w)).not.toContain('POWROT_DO_PRACY');
    }
  });

  it('D5: walidacja nie zwraca kodów WNIOSEK_*', () => {
    for (const [r, pl, u] of [[R1, PLAN_MAMA_CALY, U1], [R2, PLAN_TATA_PO_14, U2], [R1, PLAN_POL_ETATU, U1]] as const) {
      expect(wszystkie(W(r, pl, u)).filter((k) => k.kod.startsWith('WNIOSEK_'))).toEqual([]);
    }
  });

  it('ODCINEK_ZLE_DATY: koniec przed początkiem', () => {
    expect(bledy(W(R1, plan([mac('2027-04-19', '2026-12-01')])))).toContain('ODCINEK_ZLE_DATY');
  });
});

describe('wariant 81,5%', () => {
  it('WARIANT_815_PO_TERMINIE (EC-62): wniosek 23 grudnia, termin 22 grudnia (D18)', () => {
    expect(bledy(W(R1, { ...PLAN_MAMA_CALY, wariant815: true, wniosek815Data: '2026-12-23' }))).toContain('WARIANT_815_PO_TERMINIE');
    expect(bledy(W(R1, { ...PLAN_MAMA_CALY, wariant815: true, wniosek815Data: '2026-12-22' }))).toEqual([]);
  });

  describe('WARIANT_815_WNIOSEK_PRZED_PORODEM (odpowiedź ZUS 21.11, pytanie 23)', () => {
    const przedPorodem = plan([mac('2026-11-17', '2027-04-05'), rodz('mama', '2027-04-06', '2027-11-15')]);
    const war = (pl: Plan, wniosek815Data: string) => W(R1, { ...pl, wariant815: true, wniosek815Data });

    it('macierzyński od 2026-11-17, wniosek 2026-11-20 – bez ostrzeżenia', () => {
      const w = war(przedPorodem, '2026-11-20');
      expect(ostrzezenia(w)).not.toContain('WARIANT_815_WNIOSEK_PRZED_PORODEM');
      expect(bledy(w)).toEqual([]);
    });

    it('wniosek w pierwszym dniu macierzyńskiego przed porodem – bez ostrzeżenia', () => {
      expect(ostrzezenia(war(przedPorodem, '2026-11-17'))).not.toContain('WARIANT_815_WNIOSEK_PRZED_PORODEM');
    });

    it('wniosek przed początkiem macierzyńskiego – ostrzeżenie, nie błąd', () => {
      const w = war(przedPorodem, '2026-11-10');
      expect(ostrzezenia(w)).toContain('WARIANT_815_WNIOSEK_PRZED_PORODEM');
      expect(w.poprawny).toBe(true);
    });

    it('macierzyński od dnia porodu, wniosek przed porodem – ostrzeżenie', () => {
      const w = war(PLAN_MAMA_CALY, '2026-11-25');
      expect(ostrzezenia(w)).toContain('WARIANT_815_WNIOSEK_PRZED_PORODEM');
      expect(w.poprawny).toBe(true);
    });

    it('wniosek w dniu porodu i po nim – bez ostrzeżenia', () => {
      expect(ostrzezenia(war(PLAN_MAMA_CALY, '2026-12-01'))).not.toContain('WARIANT_815_WNIOSEK_PRZED_PORODEM');
      expect(ostrzezenia(war(PLAN_MAMA_CALY, '2026-12-10'))).not.toContain('WARIANT_815_WNIOSEK_PRZED_PORODEM');
    });

    it('bez daty wniosku – bez ostrzeżenia (rodzic złoży go w terminie)', () => {
      expect(ostrzezenia(W(R1, { ...PLAN_MAMA_CALY, wariant815: true }))).not.toContain('WARIANT_815_WNIOSEK_PRZED_PORODEM');
    });

    it('wniosek po terminie dalej jest błędem WARIANT_815_PO_TERMINIE', () => {
      expect(bledy(war(przedPorodem, '2026-12-23'))).toContain('WARIANT_815_PO_TERMINIE');
    });
  });

  it('WARIANT_815_PO_TERMINIE: brak daty wniosku, a dziś jest już po terminie', () => {
    const r = rodzina({ dataAnalizy: '2026-12-28', przewidywana: false });
    expect(bledy(W(r, { ...PLAN_MAMA_CALY, wariant815: true }))).toContain('WARIANT_815_PO_TERMINIE');
  });

  it('STAWKA_70_DLA_9_TYG (EC-60): wariant 81,5% i tata bierze swoje 9 tygodni', () => {
    const w = W(R2, { ...PLAN_TATA_9, wariant815: true, wniosek815Data: '2026-12-10' }, U2);
    expect(w.konsekwencje.find((k) => k.kod === 'STAWKA_70_DLA_9_TYG')?.osobaId).toBe('tata');
    expect(konsekwencje(W(R2, PLAN_TATA_9, U2))).not.toContain('STAWKA_70_DLA_9_TYG');
  });

  it('stawki w treści pochodzą z parametrów, nie z kodu', () => {
    const p = { ...P(), stawkiProc: { ...P().stawkiProc, wariant815: 80.5, rodzicielski: 65 } };
    const w = walidujPlanZ(R2, { ...PLAN_TATA_9, wariant815: true, wniosek815Data: '2026-12-23' }, U2, p);
    expect(w.bledy.find((k) => k.kod === 'WARIANT_815_PO_TERMINIE')?.tresc).toContain('80,5%');
    expect(w.konsekwencje.find((k) => k.kod === 'STAWKA_70_DLA_9_TYG')?.tresc).toContain('65%');
  });

  it('WYROWNANIE_DO_100 (EC-61): wariant 81,5% i w 1. roku życia ani dnia rodzicielskiego', () => {
    const w = W(R1, plan([mac(), rodz('mama', '2027-12-01', '2028-07-11')], { wariant815: true, wniosek815Data: '2026-12-10' }));
    expect(konsekwencje(w)).toContain('WYROWNANIE_DO_100');
    expect(konsekwencje(W(R1, { ...PLAN_MAMA_CALY, wariant815: true, wniosek815Data: '2026-12-10' }))).not.toContain('WYROWNANIE_DO_100');
  });
});

describe('kształt komunikatów', () => {
  const przypadki: [Plan, WynikUprawnien][] = [
    [plan([mac('2026-10-01', '2027-02-08'), mac('2027-02-10', '2027-05-01', 'tata'), rodz('tata', '2027-04-01', '2033-01-01', undefined, 0.6)]), U2],
    [plan([mac(), ojc('2026-12-01', '2026-12-05'), ojc('2027-12-01', '2027-12-20'), odcinek({ osobaId: 'tata', typ: 'uzupelniajacy', od: '2027-05-01', do: '2027-05-07' })], { wariant815: true, wniosek815Data: '2027-01-30' }), U1],
    [PLAN_TATA_PO_14, U2],
  ];

  it.each(przypadki)('każdy komunikat ma kod, poziom zgodny z listą, treść i przepis', (pl, u) => {
    const w = W(R2, pl, u);
    expect(wszystkie(w).length).toBeGreaterThan(0);
    for (const [lista, poziom] of [[w.bledy, 'blad'], [w.ostrzezenia, 'ostrzezenie']] as const) {
      for (const k of lista) expect(k.poziom).toBe(poziom);
    }
    for (const k of w.konsekwencje) expect(['konsekwencja', 'info']).toContain(k.poziom);
    for (const k of wszystkie(w)) {
      expect(k.kod).toMatch(/^[A-Z0-9_]+$/);
      expect(k.tresc.length).toBeGreaterThan(10);
      expect(k.przepis?.length).toBeGreaterThan(3);
    }
    expect(w.poprawny).toBe(w.bledy.length === 0);
  });
});
