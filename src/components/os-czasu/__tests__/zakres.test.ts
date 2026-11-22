import { describe, expect, it } from 'vitest';
import { MIN_OKNO_DNI, oddal, przesunOkno, przybliz, wysrodkujOkno, zakresOsi, dlugoscOkna } from '../zakres';
import { plan, rodzina } from './dane';

describe('zakresOsi', () => {
  it('przewidywany poród: od początku ciąży (poród − 40 tygodni) do końca roku, w którym dziecko kończy 6 lat', () => {
    const z = zakresOsi(rodzina());
    expect(z.od).toBe('2026-02-24');
    expect(z.do).toBe('2032-12-31');
  });

  it('domyślne okno to pierwsze 2 lata osi', () => {
    const z = zakresOsi(rodzina());
    expect(z.oknoDomyslne).toEqual({ od: '2026-02-24', do: '2028-02-23' });
  });

  it('poród 29 lutego 2028 (rok przestępny)', () => {
    const z = zakresOsi(rodzina({ zdarzenie: { typ: 'porod', data: '2028-02-29', przewidywana: true, dzieci: [{}] } }));
    expect(z.od).toBe('2027-05-25');
    expect(z.do).toBe('2034-12-31');
    expect(z.oknoDomyslne).toEqual({ od: '2027-05-25', do: '2029-05-24' });
  });

  it('faktyczny poród z tygodniem ciąży: początek ciąży = poród − tydzień ciąży', () => {
    const z = zakresOsi(
      rodzina({ zdarzenie: { typ: 'porod', data: '2026-12-01', przewidywana: false, dzieci: [{ tydzienCiazy: 34 }] } }),
    );
    expect(z.od).toBe('2026-04-07'); // 2026-12-01 − 238 dni
  });

  it('przysposobienie: oś zaczyna się w dniu przyjęcia, koniec liczony od daty urodzenia dziecka', () => {
    const z = zakresOsi(
      rodzina({
        zdarzenie: { typ: 'przysposobienie', data: '2027-06-01', przewidywana: false, dzieci: [{ dataUrodzenia: '2025-03-10' }] },
      }),
    );
    expect(z.od).toBe('2027-06-01');
    expect(z.do).toBe('2031-12-31');
  });

  it('oś obejmuje odcinki planu, które wychodzą poza wyliczony zakres', () => {
    const z = zakresOsi(
      rodzina(),
      plan([
        { id: 'c', osobaId: 'mama', typ: 'chorobowy_ciaza', od: '2026-01-10', do: '2026-03-01' },
        { id: 'w', osobaId: 'mama', typ: 'wychowawczy', od: '2032-06-01', do: '2033-05-31' },
      ]),
    );
    expect(z.od).toBe('2026-01-10');
    expect(z.do).toBe('2033-05-31');
  });
});

describe('przybliżanie, oddalanie, przesuwanie', () => {
  const z = zakresOsi(rodzina()); // 2026-02-24 – 2032-12-31

  it('przybliż zmniejsza okno o połowę wokół środka', () => {
    const o = przybliz({ od: '2027-01-01', do: '2027-12-31' }, z);
    expect(dlugoscOkna(o)).toBe(183);
    expect(o.od).toBe('2027-04-02');
  });

  it('przybliż wokół kotwicy zostawia kotwicę w tym samym miejscu okna', () => {
    const o = przybliz({ od: '2027-01-01', do: '2027-12-31' }, z, '2027-01-01');
    expect(o.od).toBe('2027-01-01');
  });

  it('przybliżanie zatrzymuje się na minimalnej długości okna', () => {
    let o = z.oknoDomyslne;
    for (let i = 0; i < 20; i++) o = przybliz(o, z);
    expect(dlugoscOkna(o)).toBe(MIN_OKNO_DNI);
  });

  it('oddalanie zatrzymuje się na pełnym zakresie osi', () => {
    let o = z.oknoDomyslne;
    for (let i = 0; i < 10; i++) o = oddal(o, z);
    expect(o).toEqual({ od: z.od, do: z.do });
  });

  it('oddal przy krawędzi nie wychodzi przed początek osi', () => {
    const o = oddal({ od: '2026-03-01', do: '2026-05-31' }, z);
    expect(o.od).toBe(z.od);
    expect(dlugoscOkna(o)).toBe(184);
  });

  it('przesuń okno w prawo i w lewo z zatrzymaniem na krawędziach', () => {
    const start = { od: '2027-01-01', do: '2027-12-31' };
    expect(przesunOkno(start, z, 31)).toEqual({ od: '2027-02-01', do: '2028-01-31' });
    const daleko = przesunOkno(start, z, 100_000);
    expect(daleko.do).toBe(z.do);
    expect(dlugoscOkna(daleko)).toBe(365);
    const wstecz = przesunOkno(start, z, -100_000);
    expect(wstecz.od).toBe(z.od);
    expect(dlugoscOkna(wstecz)).toBe(365);
  });

  it('wyśrodkuj okno na dacie (np. „dziś”) z zatrzymaniem na krawędziach', () => {
    const o = wysrodkujOkno({ od: '2028-01-01', do: '2028-12-31' }, z, '2026-11-21');
    expect(dlugoscOkna(o)).toBe(366);
    expect(o.od).toBe('2026-05-22');
    const brzeg = wysrodkujOkno({ od: '2028-01-01', do: '2028-12-31' }, z, '2026-03-01');
    expect(brzeg.od).toBe(z.od);
  });
});
