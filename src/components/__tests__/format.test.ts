import { describe, expect, it } from 'vitest';
import { formatujDate, formatujDateKrotko, formatujKwote, formatujOkres } from '../format';

/** Twarda spacja (U+00A0): separator tysięcy i odstęp przed „zł”, żeby kwota nie łamała się na dwie linie. */
const S = ' ';

describe('formatujKwote', () => {
  it('formatuje kwotę z separatorem tysięcy i przecinkiem', () => {
    expect(formatujKwote(1234.56)).toBe(`1${S}234,56${S}zł`);
  });

  it('używa twardej spacji (U+00A0), nie zwykłej', () => {
    const wynik = formatujKwote(1234.56);
    expect(wynik).not.toContain(' ');
    expect(wynik.split(S)).toHaveLength(3);
  });

  it('zero', () => {
    expect(formatujKwote(0)).toBe(`0,00${S}zł`);
  });

  it('zawsze dwa miejsca po przecinku', () => {
    expect(formatujKwote(5)).toBe(`5,00${S}zł`);
    expect(formatujKwote(5.5)).toBe(`5,50${S}zł`);
    expect(formatujKwote(0.07)).toBe(`0,07${S}zł`);
  });

  it('grupuje także czterocyfrowe kwoty (inaczej niż Intl dla pl-PL)', () => {
    expect(formatujKwote(1000)).toBe(`1${S}000,00${S}zł`);
    expect(formatujKwote(999.99)).toBe(`999,99${S}zł`);
  });

  it('duże kwoty', () => {
    expect(formatujKwote(1234567.891)).toBe(`1${S}234${S}567,89${S}zł`);
    expect(formatujKwote(1000000000)).toBe(`1${S}000${S}000${S}000,00${S}zł`);
  });

  it('kwoty ujemne ze znakiem minus na początku', () => {
    expect(formatujKwote(-1234.56)).toBe(`-1${S}234,56${S}zł`);
    expect(formatujKwote(-0.5)).toBe(`-0,50${S}zł`);
  });

  it('zaokrągla do grosza (połówki w górę, także 1,005)', () => {
    expect(formatujKwote(1.005)).toBe(`1,01${S}zł`);
    expect(formatujKwote(2.675)).toBe(`2,68${S}zł`);
    expect(formatujKwote(0.004)).toBe(`0,00${S}zł`);
    expect(formatujKwote(999.995)).toBe(`1${S}000,00${S}zł`);
    expect(formatujKwote(-1.005)).toBe(`-1,01${S}zł`);
  });

  it('nie pokazuje „-0,00 zł” dla bardzo małych ujemnych kwot', () => {
    expect(formatujKwote(-0.001)).toBe(`0,00${S}zł`);
    expect(formatujKwote(-0)).toBe(`0,00${S}zł`);
  });

  it('dla NaN i nieskończoności zwraca myślnik zamiast „NaN zł”', () => {
    expect(formatujKwote(Number.NaN)).toBe('—');
    expect(formatujKwote(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatujDate', () => {
  it('dzień bez zera, miesiąc w dopełniaczu, rok', () => {
    expect(formatujDate('2026-12-01')).toBe('1 grudnia 2026');
  });

  it('wszystkie miesiące w dopełniaczu', () => {
    const miesiace = [
      'stycznia',
      'lutego',
      'marca',
      'kwietnia',
      'maja',
      'czerwca',
      'lipca',
      'sierpnia',
      'września',
      'października',
      'listopada',
      'grudnia',
    ];
    miesiace.forEach((nazwa, i) => {
      const mm = String(i + 1).padStart(2, '0');
      expect(formatujDate(`2027-${mm}-15`)).toBe(`15 ${nazwa} 2027`);
    });
  });

  it('29 lutego w roku przestępnym', () => {
    expect(formatujDate('2028-02-29')).toBe('29 lutego 2028');
  });

  it('nie przesuwa dnia przez strefę czasową (pierwszy i ostatni dzień roku)', () => {
    expect(formatujDate('2027-01-01')).toBe('1 stycznia 2027');
    expect(formatujDate('2026-12-31')).toBe('31 grudnia 2026');
  });

  it('zwraca napis bez zmian, gdy to nie jest poprawna data RRRR-MM-DD', () => {
    expect(formatujDate('2026-02-30')).toBe('2026-02-30');
    expect(formatujDate('2027-02-29')).toBe('2027-02-29');
    expect(formatujDate('1.12.2026')).toBe('1.12.2026');
    expect(formatujDate('')).toBe('');
    expect(formatujDate('2026-12-01T00:00:00Z')).toBe('2026-12-01T00:00:00Z');
  });
});

describe('formatujDateKrotko', () => {
  it('dzień bez zera, miesiąc z zerem: D.MM.RRRR', () => {
    expect(formatujDateKrotko('2026-12-01')).toBe('1.12.2026');
    expect(formatujDateKrotko('2027-03-05')).toBe('5.03.2027');
    expect(formatujDateKrotko('2027-10-31')).toBe('31.10.2027');
  });

  it('zwraca napis bez zmian, gdy data jest niepoprawna', () => {
    expect(formatujDateKrotko('2026-13-01')).toBe('2026-13-01');
  });
});

describe('formatujOkres', () => {
  it('ten sam dzień = jedna data', () => {
    expect(formatujOkres('2026-12-01', '2026-12-01')).toBe('1 grudnia 2026');
  });

  it('ten sam miesiąc: „1–14 grudnia 2026”', () => {
    expect(formatujOkres('2026-12-01', '2026-12-14')).toBe('1–14 grudnia 2026');
  });

  it('ten sam rok, różne miesiące', () => {
    expect(formatujOkres('2027-03-15', '2027-06-20')).toBe('15 marca – 20 czerwca 2027');
  });

  it('różne lata', () => {
    expect(formatujOkres('2026-12-01', '2027-01-31')).toBe('1 grudnia 2026 – 31 stycznia 2027');
  });

  it('wersja krótka', () => {
    expect(formatujOkres('2026-12-01', '2027-01-31', { krotko: true })).toBe('1.12.2026 – 31.01.2027');
    expect(formatujOkres('2026-12-01', '2026-12-01', { krotko: true })).toBe('1.12.2026');
  });

  it('niepoprawna data: obie strony bez zmian', () => {
    expect(formatujOkres('2026-12-01', 'jutro')).toBe('1 grudnia 2026 – jutro');
  });
});
