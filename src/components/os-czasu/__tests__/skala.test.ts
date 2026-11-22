import { describe, expect, it } from 'vitest';
import { skala } from '../skala';

describe('skala okna', () => {
  // luty 2028 ma 29 dni
  const s = skala({ od: '2028-02-01', do: '2028-02-29' });

  it('liczba dni okna i pozycja daty (początek dnia)', () => {
    expect(s.dni).toBe(29);
    expect(s.ulamek('2028-02-01')).toBe(0);
    expect(s.ulamek('2028-03-01')).toBe(1);
    expect(s.ulamek('2028-02-29')).toBeCloseTo(28 / 29);
    expect(s.ulamek('2028-01-01')).toBeLessThan(0); // poza oknem – bez przycinania
  });

  it('z ułamka z powrotem na datę (z ograniczeniem do okna)', () => {
    expect(s.data(0)).toBe('2028-02-01');
    expect(s.data(0.5)).toBe('2028-02-15');
    expect(s.data(1)).toBe('2028-02-29');
    expect(s.data(-3)).toBe('2028-02-01');
  });

  it('odcinek jednodniowy 29 lutego', () => {
    const p = s.przytnij('2028-02-29', '2028-02-29');
    expect(p).not.toBeNull();
    expect(p!.start).toBeCloseTo(28 / 29);
    expect(p!.szerokosc).toBeCloseTo(1 / 29);
    expect(p!.przyciety).toEqual({ lewy: false, prawy: false });
  });

  it('przycina odcinek zaczynający się przed oknem', () => {
    const p = s.przytnij('2028-01-20', '2028-02-10');
    expect(p!.start).toBe(0);
    expect(p!.szerokosc).toBeCloseTo(10 / 29);
    expect(p!.przyciety).toEqual({ lewy: true, prawy: false });
  });

  it('przycina odcinek kończący się po oknie', () => {
    const p = s.przytnij('2028-02-20', '2028-03-15');
    expect(p!.start).toBeCloseTo(19 / 29);
    expect(p!.szerokosc).toBeCloseTo(10 / 29);
    expect(p!.przyciety).toEqual({ lewy: false, prawy: true });
  });

  it('odcinek dłuższy niż okno z obu stron', () => {
    const p = s.przytnij('2027-12-01', '2028-06-30');
    expect(p).toEqual({ start: 0, szerokosc: 1, przyciety: { lewy: true, prawy: true } });
  });

  it('odcinek całkiem poza oknem → null', () => {
    expect(s.przytnij('2028-01-01', '2028-01-31')).toBeNull();
    expect(s.przytnij('2028-03-01', '2028-03-31')).toBeNull();
  });
});
