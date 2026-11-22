/**
 * Testy A3: ustalRyzyka (ZADANIA.md „A3. Możliwości i ryzyka”, tabela kodów; plan toru A, decyzje D4, D6, D7).
 * Pule liczy A1 (`ustalPule`). Testy sprawdzają kody, osoby, terminy i flagę `pilne`, nie treść.
 */
import { describe, expect, it } from 'vitest';
import { dzialalnosc, etat, mama, P, rodzina, tata, zlecenie } from '../../__tests__/rodziny';
import type { Rodzina, Ryzyko } from '../../types';
import { wniosek815PrzedPorodem } from '../mozliwosciTeksty';
import { ustalPule } from '../pule';
import { ustalRyzyka } from '../ryzyka';

const p = P();

function ryzyka(r: Rodzina): Ryzyko[] {
  return ustalRyzyka(r, ustalPule(r, p), p);
}

function kody(r: Rodzina): string[] {
  return ryzyka(r).map((x) => x.kod);
}

function jedno(r: Rodzina, kod: string, osobaId?: string): Ryzyko {
  const w = ryzyka(r).filter((x) => x.kod === kod && (osobaId === undefined || x.osobaId === osobaId));
  expect(w, `${kod}/${osobaId ?? ''}`).toHaveLength(1);
  return w[0];
}

const samaMama = (o: Parameters<typeof mama>[0], r: Parameters<typeof rodzina>[0] = {}) => rodzina({ osoby: [mama(o)], ...r });

describe('A3: każda karta ma treść', () => {
  it('wszystkie karty mają tytuł, co może się stać, dlaczego i co zrobić', () => {
    const r = rodzina({
      osoby: [
        mama([etat({ od: '2026-05-01' }), zlecenie({ do: '2026-10-31' }), dzialalnosc({ chorobowoOd: '2026-11-01', zadluzenieSkladkowe: 500 })], {
          zdrowie: { eZLA: [{ od: '2026-09-01', do: '2026-09-30', kodB: true }] },
        }),
        tata([dzialalnosc({ id: 'dz-taty' })]),
      ],
    });
    const l = ryzyka(r);
    expect(l.length).toBeGreaterThan(5);
    for (const x of l) {
      for (const pole of [x.tytul, x.coMozeSieStac, x.dlaczego, x.coZrobic]) expect(pole, x.kod).toBeTruthy();
      expect(x.przepis, x.kod).toBeTruthy();
    }
  });
});

describe('A3: ryzyka terminowe (D6)', () => {
  it('EC-01: TERMIN_815 z terminem 2026-12-22, przy analizie 2026-11-21 niepilne', () => {
    expect(jedno(rodzina(), 'TERMIN_815')).toMatchObject({ osobaId: 'mama', termin: '2026-12-22', pilne: false });
  });

  it('TERMIN_815 przy analizie 2026-12-10 → pilne', () => {
    expect(jedno(rodzina({ dataAnalizy: '2026-12-10' }), 'TERMIN_815')).toMatchObject({ termin: '2026-12-22', pilne: true });
  });

  it('TERMIN_815 w ostatnim dniu terminu jest jeszcze pokazane i pilne', () => {
    expect(jedno(rodzina({ przewidywana: false, dataAnalizy: '2026-12-22' }), 'TERMIN_815').pilne).toBe(true);
  });

  it('TERMIN_815 po terminie znika', () => {
    expect(kody(rodzina({ przewidywana: false, dataAnalizy: '2026-12-23' }))).not.toContain('TERMIN_815');
  });

  it('TERMIN_815 nie pojawia się, gdy nikt nie ma prawa do zasiłku macierzyńskiego', () => {
    expect(kody(samaMama([zlecenie({ chorobowe: 'brak' })]))).not.toContain('TERMIN_815');
  });

  it('TERMIN_OJCOWSKI: tata, termin 2027-11-30, niepilne', () => {
    expect(jedno(rodzina({ osoby: [mama(), tata()] }), 'TERMIN_OJCOWSKI', 'tata')).toMatchObject({ termin: '2027-11-30', pilne: false });
  });

  it('TERMIN_OJCOWSKI: 15 dni przed terminem → pilne; po terminie znika', () => {
    const r = (d: string) => rodzina({ osoby: [mama(), tata()], przewidywana: false, dataAnalizy: d });
    expect(jedno(r('2027-11-15'), 'TERMIN_OJCOWSKI').pilne).toBe(true);
    expect(kody(r('2027-12-01'))).not.toContain('TERMIN_OJCOWSKI');
  });

  it('TERMIN_OJCOWSKI: brak taty → brak karty', () => {
    expect(kody(rodzina())).not.toContain('TERMIN_OJCOWSKI');
  });

  it('RODZ_9_TYG_PRZEPADNIE (D4): termin = koniec roku 6. urodzin, jedna karta na osobę z prawem', () => {
    expect(jedno(rodzina(), 'RODZ_9_TYG_PRZEPADNIE', 'mama')).toMatchObject({ termin: '2032-12-31', pilne: false });
    const para = ryzyka(rodzina({ osoby: [mama(), tata()] })).filter((x) => x.kod === 'RODZ_9_TYG_PRZEPADNIE');
    expect(para.map((x) => x.osobaId).sort()).toEqual(['mama', 'tata']);
  });

  it('RODZ_9_TYG_PRZEPADNIE: brak przy martwym urodzeniu (pula rodzicielskiego 0)', () => {
    expect(kody(rodzina({ dzieci: [{ martwe: true }], przewidywana: false }))).not.toContain('RODZ_9_TYG_PRZEPADNIE');
  });

  it('EC-01: tylko ryzyka terminowe, bez kart o umowie, podwyżce i ubezpieczeniu', () => {
    expect(kody(rodzina()).sort()).toEqual(['RODZ_9_TYG_PRZEPADNIE', 'TERMIN_815']);
  });
});

describe('A3: ubezpieczenie w dniu porodu', () => {
  it('zlecenie kończy się przed porodem → ZLECENIE_KONCZY_SIE_PRZED_PORODEM i BRAK_UBEZP_W_DNIU_PORODU', () => {
    const k = kody(samaMama([zlecenie({ do: '2026-10-31' })]));
    expect(k).toContain('ZLECENIE_KONCZY_SIE_PRZED_PORODEM');
    expect(k).toContain('BRAK_UBEZP_W_DNIU_PORODU');
    expect(jedno(samaMama([zlecenie({ do: '2026-10-31' })]), 'BRAK_UBEZP_W_DNIU_PORODU').osobaId).toBe('mama');
  });

  it('zlecenie kończy się przed porodem, ale etat trwa → tylko karta o zleceniu', () => {
    const k = kody(samaMama([etat(), zlecenie({ do: '2026-10-31' })]));
    expect(k).toContain('ZLECENIE_KONCZY_SIE_PRZED_PORODEM');
    expect(k).not.toContain('BRAK_UBEZP_W_DNIU_PORODU');
  });

  it('zlecenie zakończone przed ciążą → bez karty o zleceniu', () => {
    expect(kody(samaMama([etat(), zlecenie({ do: '2025-06-30' })]))).not.toContain('ZLECENIE_KONCZY_SIE_PRZED_PORODEM');
  });

  it('EC-03: zlecenie bez chorobowego → BRAK_UBEZP_W_DNIU_PORODU, bez karty o końcu zlecenia', () => {
    const k = kody(samaMama([zlecenie({ chorobowe: 'brak' })]));
    expect(k).toContain('BRAK_UBEZP_W_DNIU_PORODU');
    expect(k).not.toContain('ZLECENIE_KONCZY_SIE_PRZED_PORODEM');
  });

  it('EC-05: etat na czas określony przedłużony do porodu → bez BRAK_UBEZP_W_DNIU_PORODU', () => {
    expect(kody(samaMama([etat({ naCzasOkreslony: true, do: '2026-10-31' })]))).not.toContain('BRAK_UBEZP_W_DNIU_PORODU');
  });

  it('EC-14: poród w czasie urlopu wychowawczego → bez BRAK_UBEZP_W_DNIU_PORODU', () => {
    const r = rodzina({ osoby: [mama([etat()], { urlopWychowawczy: { od: '2026-01-01', do: '2027-06-30' } })] });
    expect(kody(r)).not.toContain('BRAK_UBEZP_W_DNIU_PORODU');
  });

  it('ojciec ze zleceniem kończącym się przed porodem → bez kart o ubezpieczeniu w dniu porodu', () => {
    const k = kody(rodzina({ osoby: [mama(), tata([zlecenie({ id: 'zl-taty', do: '2026-10-31' })])] }));
    expect(k).not.toContain('ZLECENIE_KONCZY_SIE_PRZED_PORODEM');
    expect(k).not.toContain('BRAK_UBEZP_W_DNIU_PORODU');
  });
});

describe('A3: późne zgłoszenie do ubezpieczenia (D7, próg 90 dni, pytanie 28)', () => {
  it('działalność z chorobowym od 2026-11-01 → karta z listą dokumentów, bez powołania na UZ art. 4', () => {
    const x = jedno(samaMama([dzialalnosc({ chorobowoOd: '2026-11-01' })]), 'POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA');
    expect(x.osobaId).toBe('mama');
    expect(x.coPrzygotowac?.length).toBeGreaterThan(0);
    expect(x.przepis).not.toMatch(/UZ art\. 4\b/);
  });

  it('granica: 89 dni przed porodem → karta; 90 i 91 dni → brak', () => {
    expect(kody(samaMama([dzialalnosc({ chorobowoOd: '2026-09-03' })]))).toContain('POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA');
    expect(kody(samaMama([dzialalnosc({ chorobowoOd: '2026-09-02' })]))).not.toContain('POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA');
    expect(kody(samaMama([dzialalnosc({ chorobowoOd: '2026-09-01' })]))).not.toContain('POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA');
  });

  it('działalność z chorobowym od lat (EC-09) → brak karty', () => {
    expect(kody(samaMama([dzialalnosc()]))).not.toContain('POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA');
  });

  it('chorobowe zgłoszone dopiero po porodzie → brak karty (w dniu porodu i tak nie ma ubezpieczenia)', () => {
    expect(kody(samaMama([dzialalnosc({ chorobowoOd: '2026-12-05' })]))).not.toContain('POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA');
  });

  it('nowe zlecenie z chorobowym tuż przed porodem → karta o umowie, bez dublowania kartą o zgłoszeniu', () => {
    const k = kody(samaMama([zlecenie({ od: '2026-11-01' })]));
    expect(k).toContain('UMOWA_DLA_POZORU');
    expect(k).not.toContain('POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA');
  });

  it('stare zlecenie, dobrowolne chorobowe dopiero od 2026-11-01 → karta o późnym zgłoszeniu', () => {
    expect(kody(samaMama([zlecenie({ chorobowoOd: '2026-11-01' })]))).toContain('POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA');
  });
});

describe('A3: umowa zawarta w ciąży lub krótko przed nią (D7, 3 miesiące, pytanie 26)', () => {
  // Początek ciąży: 2026-12-01 − 280 dni = 2026-02-24; 3 miesiące wcześniej: 2025-11-24.
  it('etat od 2026-05-01 (w ciąży) → UMOWA_DLA_POZORU z listą dokumentów', () => {
    const x = jedno(samaMama([etat({ od: '2026-05-01' })]), 'UMOWA_DLA_POZORU');
    expect(x.osobaId).toBe('mama');
    expect(x.coPrzygotowac?.length).toBeGreaterThan(0);
  });

  it('granica: etat od 2025-11-24 → karta; od 2025-11-23 → brak', () => {
    expect(kody(samaMama([etat({ od: '2025-11-24' })]))).toContain('UMOWA_DLA_POZORU');
    expect(kody(samaMama([etat({ od: '2025-11-23' })]))).not.toContain('UMOWA_DLA_POZORU');
  });

  it('zlecenie od 2026-06-01 → karta', () => {
    expect(kody(samaMama([zlecenie({ od: '2026-06-01' })]))).toContain('UMOWA_DLA_POZORU');
  });

  it('zlecenie bez chorobowego → brak karty (nie daje zasiłku)', () => {
    expect(kody(samaMama([zlecenie({ od: '2026-06-01', chorobowe: 'brak' })]))).not.toContain('UMOWA_DLA_POZORU');
  });

  it('umowa zaczęta po porodzie → brak karty', () => {
    expect(kody(samaMama([etat(), zlecenie({ od: '2027-02-01' })]))).not.toContain('UMOWA_DLA_POZORU');
  });

  it('tata z nową umową → brak karty (dotyczy ciąży)', () => {
    expect(kody(rodzina({ osoby: [mama(), tata([etat({ id: 'et', od: '2026-06-01' })])] }))).not.toContain('UMOWA_DLA_POZORU');
  });
});

describe('A3: podwyższenie podstawy w ciąży (D7, 20%, pytanie 27)', () => {
  const miesiace = (od: string[], kwota: number) => od.map((miesiac) => ({ miesiac, kwota }));
  const PRZED = ['2025-11', '2025-12', '2026-01'];
  const W_CIAZY = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

  it('etat: średnia w ciąży 8000 wobec 6000 przed (+33%) → karta z listą dokumentów', () => {
    const x = jedno(samaMama([etat({ podstawaSkladek: [...miesiace(PRZED, 6000), ...miesiace(W_CIAZY, 8000)] })]), 'PODWYZSZENIE_PODSTAWY_W_CIAZY');
    expect(x.osobaId).toBe('mama');
    expect(x.coPrzygotowac?.length).toBeGreaterThan(0);
  });

  it('etat: +20% równo → karta; +16,7% → brak', () => {
    expect(kody(samaMama([etat({ podstawaSkladek: [...miesiace(PRZED, 5000), ...miesiace(W_CIAZY, 6000)] })]))).toContain('PODWYZSZENIE_PODSTAWY_W_CIAZY');
    expect(kody(samaMama([etat({ podstawaSkladek: [...miesiace(PRZED, 6000), ...miesiace(W_CIAZY, 7000)] })]))).not.toContain('PODWYZSZENIE_PODSTAWY_W_CIAZY');
  });

  it('miesiąc początku ciąży (luty 2026) nie liczy się ani do „przed”, ani do „w ciąży”', () => {
    const r = samaMama([etat({ podstawaSkladek: [...miesiace(PRZED, 6000), { miesiac: '2026-02', kwota: 60000 }, ...miesiace(W_CIAZY, 6000)] })]);
    expect(kody(r)).not.toContain('PODWYZSZENIE_PODSTAWY_W_CIAZY');
  });

  it('brak miesięcy sprzed ciąży → brak karty (nie ma z czym porównać)', () => {
    expect(kody(samaMama([etat({ podstawaSkladek: miesiace(W_CIAZY, 9000) })]))).not.toContain('PODWYZSZENIE_PODSTAWY_W_CIAZY');
  });

  it('działalność z chorobowym od niedawna i wysoką zadeklarowaną podstawą → karta', () => {
    const k = kody(samaMama([dzialalnosc({ chorobowoOd: '2026-04-01', zadeklarowanaPodstawa: 10000 })]));
    expect(k).toContain('PODWYZSZENIE_PODSTAWY_W_CIAZY');
  });

  it('działalność z chorobowym od lat i wysoką podstawą → brak karty', () => {
    expect(kody(samaMama([dzialalnosc({ zadeklarowanaPodstawa: 10000 })]))).not.toContain('PODWYZSZENIE_PODSTAWY_W_CIAZY');
  });

  it('działalność z chorobowym od niedawna i najniższą podstawą → brak karty', () => {
    expect(kody(samaMama([dzialalnosc({ chorobowoOd: '2026-04-01', zadeklarowanaPodstawa: p.kwoty.najnizszaPodstawaDzialalnosc })]))).not.toContain(
      'PODWYZSZENIE_PODSTAWY_W_CIAZY',
    );
  });
});

describe('A3: pozostałe ryzyka', () => {
  it('EC-12: zaległość powyżej 1% płacy minimalnej → ZADLUZENIE_SKLADKOWE z listą dokumentów', () => {
    const x = jedno(samaMama([dzialalnosc({ zadluzenieSkladkowe: 100 })]), 'ZADLUZENIE_SKLADKOWE');
    expect(x.coPrzygotowac?.length).toBeGreaterThan(0);
    expect(x.przepis).toContain('art. 2a');
  });

  it('zaległość równa progowi albo niższa → brak karty', () => {
    const prog = (p.kwoty.placaMinimalna * p.limity.progZaleglosciProcPlacyMinimalnej) / 100;
    expect(kody(samaMama([dzialalnosc({ zadluzenieSkladkowe: prog })]))).not.toContain('ZADLUZENIE_SKLADKOWE');
    expect(kody(samaMama([dzialalnosc({ zadluzenieSkladkowe: 40 })]))).not.toContain('ZADLUZENIE_SKLADKOWE');
  });

  it('PRACA_NA_ZWOLNIENIU: e-ZLA i dwa tytuły (etat + zlecenie); przed 2027 bez UZ art. 17 ust. 1d', () => {
    const r = samaMama([etat(), zlecenie()], {});
    r.osoby[0].zdrowie = { eZLA: [{ od: '2026-09-01', do: '2026-09-30', kodB: true }] };
    const x = jedno(r, 'PRACA_NA_ZWOLNIENIU', 'mama');
    expect(x.przepis).toContain('art. 17');
    expect(x.przepis).not.toContain('1d');
  });

  it('PRACA_NA_ZWOLNIENIU od 1.01.2027 (dataAnalizy): treść według UZ art. 17 ust. 1d–1e', () => {
    const r = rodzina({
      osoby: [mama([etat(), zlecenie()], { zdrowie: { eZLA: [{ od: '2026-09-01', do: '2026-09-30', kodB: true }] } })],
      przewidywana: false,
      dataAnalizy: '2027-01-15',
    });
    expect(jedno(r, 'PRACA_NA_ZWOLNIENIU').przepis).toContain('1d');
  });

  it('PRACA_NA_ZWOLNIENIU: jeden tytuł albo brak e-ZLA → brak karty', () => {
    expect(kody(rodzina({ osoby: [mama([etat()], { zdrowie: { eZLA: [{ od: '2026-09-01', do: '2026-09-30', kodB: true }] } })] }))).not.toContain(
      'PRACA_NA_ZWOLNIENIU',
    );
    expect(kody(samaMama([etat(), zlecenie()]))).not.toContain('PRACA_NA_ZWOLNIENIU');
  });

  it('PRACA_NA_ZWOLNIENIU: drugi tytuł skończył się przed zwolnieniem → brak karty', () => {
    const r = rodzina({ osoby: [mama([etat(), zlecenie({ do: '2026-03-31' })], { zdrowie: { eZLA: [{ od: '2026-09-01', do: '2026-09-30', kodB: true }] } })] });
    expect(kody(r)).not.toContain('PRACA_NA_ZWOLNIENIU');
  });

  it('PONOWNE_ZGLOSZENIE_PO_ZASILKU (D4): mama na zleceniu z dobrowolnym chorobowym', () => {
    expect(jedno(samaMama([zlecenie()]), 'PONOWNE_ZGLOSZENIE_PO_ZASILKU').osobaId).toBe('mama');
  });

  it('PONOWNE_ZGLOSZENIE_PO_ZASILKU: tata z działalnością (ojcowski), mama na etacie → tylko tata', () => {
    const l = ryzyka(rodzina({ osoby: [mama(), tata([dzialalnosc({ id: 'dz-taty' })])] })).filter((x) => x.kod === 'PONOWNE_ZGLOSZENIE_PO_ZASILKU');
    expect(l.map((x) => x.osobaId)).toEqual(['tata']);
  });

  it('PONOWNE_ZGLOSZENIE_PO_ZASILKU: bez chorobowego albo bez prawa do świadczenia → brak', () => {
    expect(kody(samaMama([zlecenie({ chorobowe: 'brak' })]))).not.toContain('PONOWNE_ZGLOSZENIE_PO_ZASILKU');
    expect(kody(rodzina())).not.toContain('PONOWNE_ZGLOSZENIE_PO_ZASILKU');
  });

  it('BRAK_OCHRONY_PRZED_ZWOLNIENIEM: zlecenie albo działalność matki; etat → brak', () => {
    expect(jedno(samaMama([zlecenie()]), 'BRAK_OCHRONY_PRZED_ZWOLNIENIEM').osobaId).toBe('mama');
    expect(kody(samaMama([dzialalnosc()]))).toContain('BRAK_OCHRONY_PRZED_ZWOLNIENIEM');
    expect(kody(rodzina())).not.toContain('BRAK_OCHRONY_PRZED_ZWOLNIENIEM');
  });

  it('progi bez przepisu (D7): w „dlaczego” zastrzeżenie, że to założenie aplikacji', () => {
    const r = rodzina({
      osoby: [
        mama([etat({ od: '2026-05-01', podstawaSkladek: [{ miesiac: '2025-12', kwota: 5000 }, { miesiac: '2026-05', kwota: 9000 }] }), dzialalnosc({ chorobowoOd: '2026-11-01' })]),
      ],
    });
    for (const kod of ['UMOWA_DLA_POZORU', 'PODWYZSZENIE_PODSTAWY_W_CIAZY', 'POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA']) {
      const w = ryzyka(r).filter((x) => x.kod === kod);
      expect(w.length, kod).toBeGreaterThan(0);
      for (const x of w) expect(x.dlaczego, kod).toMatch(/założenie/);
    }
  });
});

describe('A3: przypadki skrajne ryzyk', () => {
  it('rodzina bez osób: brak kart', () => {
    expect(ryzyka(rodzina({ osoby: [] }))).toEqual([]);
  });

  it('EC-56 (pytania 6 i 14, odpowiedź ZUS): karta 9 tygodni taty bez „do potwierdzenia”', () => {
    const r = rodzina({ osoby: [mama([zlecenie({ chorobowe: 'brak' })]), tata()] });
    expect(jedno(r, 'RODZ_9_TYG_PRZEPADNIE', 'tata').coMozeSieStac).not.toContain('potwierdzenia w ZUS');
    expect(kody(r)).not.toContain('TERMIN_815');
  });

  it('zgon nieubezpieczonej mamy: karta 9 tygodni taty bez „do potwierdzenia” (pytanie 6 – pula bez 9 tygodni mamy)', () => {
    const r = rodzina({ osoby: [mama([], { zdrowie: { zgon: '2026-12-05' } }), tata()], przewidywana: false, dataAnalizy: '2026-12-08' });
    expect(jedno(r, 'RODZ_9_TYG_PRZEPADNIE', 'tata').coMozeSieStac).not.toContain('potwierdzenia w ZUS');
  });

  it('TERMIN_815 przed porodem (pytanie 23): co zrobić – wniosek razem z urlopem przed porodem albo po porodzie do terminu', () => {
    const x = jedno(rodzina(), 'TERMIN_815');
    expect(x.coZrobic).toContain(wniosek815PrzedPorodem(p, x.termin!));
    expect(jedno(rodzina({ przewidywana: false, dataAnalizy: '2026-12-05' }), 'TERMIN_815').coZrobic).not.toContain(wniosek815PrzedPorodem(p, x.termin!));
  });

  it('przysposobienie (pytanie 37): karta 9 tygodni z terminem przed 14. urodzinami dziecka', () => {
    const r = rodzina({
      osoby: [{ id: 'p1', rola: 'przyjmujacy', tytuly: [etat()] }],
      typ: 'przysposobienie',
      dataUprawomocnienia: '2027-02-10',
      dzieci: [{ dataUrodzenia: '2024-05-01' }],
    });
    const x = jedno(r, 'RODZ_9_TYG_PRZEPADNIE', 'p1');
    expect(x.termin).toBe('2038-04-30');
    expect(x.dlaczego).toContain(`${p.limity.wiekPrzysposobienieLat} lat`);
  });

  it('przysposobienie: bez kart o ciąży, termin ojcowskiego z puli (od uprawomocnienia)', () => {
    const r = rodzina({
      osoby: [{ id: 'p1', rola: 'przyjmujacy', tytuly: [etat({ od: '2026-10-01' })] }],
      typ: 'przysposobienie',
      dataUprawomocnienia: '2027-02-10',
      dzieci: [{ dataUrodzenia: '2024-05-01' }],
    });
    const k = kody(r);
    expect(k).not.toContain('UMOWA_DLA_POZORU');
    expect(k).not.toContain('BRAK_UBEZP_W_DNIU_PORODU');
    expect(jedno(r, 'TERMIN_OJCOWSKI').termin).toBe(ustalPule(r, p).ojcowskiDoKiedy);
  });

  it('poród 29 lutego 2028: TERMIN_815 = 21 marca 2028', () => {
    expect(jedno(rodzina({ data: '2028-02-29', dataAnalizy: '2028-02-01' }), 'TERMIN_815').termin).toBe('2028-03-21');
  });

  it('granica „pilne”: dokładnie 30 dni do terminu → pilne; 31 dni → nie', () => {
    expect(p.limity.ryzykoTerminPilneDni).toBe(30);
    expect(jedno(rodzina({ dataAnalizy: '2026-11-22' }), 'TERMIN_815').pilne).toBe(true);
    expect(jedno(rodzina({ dataAnalizy: '2026-11-21' }), 'TERMIN_815').pilne).toBe(false);
  });
});

describe('A3: poprawki po przeglądzie', () => {
  it('zgon mamy: bez TERMIN_815 i RODZ_9_TYG_PRZEPADNIE dla mamy; karta taty z dopiskiem do potwierdzenia', () => {
    const r = rodzina({ osoby: [mama([etat()], { zdrowie: { zgon: '2026-12-05' } }), tata()], przewidywana: false, dataAnalizy: '2026-12-08' });
    const l = ryzyka(r);
    expect(l.filter((x) => x.osobaId === 'mama')).toEqual([]);
    expect(l.map((x) => x.kod)).not.toContain('TERMIN_815');
    expect(jedno(r, 'RODZ_9_TYG_PRZEPADNIE', 'tata').coMozeSieStac).toContain('potwierdzenia w ZUS');
  });

  it('porzucenie dziecka przez mamę: bez kart mamy', () => {
    const r = rodzina({ osoby: [mama([etat()], { zdrowie: { porzucenieDziecka: '2026-12-05' } }), tata()], przewidywana: false, dataAnalizy: '2026-12-08' });
    expect(ryzyka(r).filter((x) => x.osobaId === 'mama')).toEqual([]);
  });

  it('karty z prośbą o wyjaśnienia: przepis UZ art. 61a ust. 2 i ustawa systemowa art. 83 ust. 1; nigdzie słowa „kontrola”', () => {
    const r = rodzina({
      osoby: [
        mama([
          etat({ od: '2026-05-01', podstawaSkladek: [{ miesiac: '2025-12', kwota: 5000 }, { miesiac: '2026-05', kwota: 9000 }] }),
          dzialalnosc({ chorobowoOd: '2026-11-01', zadluzenieSkladkowe: 500 }),
        ]),
      ],
    });
    const l = ryzyka(r);
    for (const kod of ['UMOWA_DLA_POZORU', 'PODWYZSZENIE_PODSTAWY_W_CIAZY', 'POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA']) {
      for (const x of l.filter((y) => y.kod === kod)) {
        expect(x.przepis, kod).toContain('UZ art. 61a ust. 2');
        expect(x.przepis, kod).toContain('ustawa systemowa art. 83 ust. 1');
      }
    }
    expect(jedno(r, 'UMOWA_DLA_POZORU').przepis).toContain('KC art. 83 § 1');
    expect(JSON.stringify(l)).not.toMatch(/kontrol/i);
  });

  it('zaległość przy działalności i etacie: „z działalności” i dopisek do potwierdzenia (pytanie 41)', () => {
    const x = jedno(samaMama([etat(), dzialalnosc({ zadluzenieSkladkowe: 500 })]), 'ZADLUZENIE_SKLADKOWE');
    expect(x.coMozeSieStac).toContain('z działalności');
    expect(x.coMozeSieStac).toContain('potwierdzenia w ZUS');
  });

  it('BRAK_OCHRONY: brak karty, gdy umowa o pracę trwa w dniu porodu (etat + zlecenie)', () => {
    expect(kody(samaMama([etat(), zlecenie()]))).not.toContain('BRAK_OCHRONY_PRZED_ZWOLNIENIEM');
  });
});
