/** Generator .ics (RFC 5545): VCALENDAR, jedno VEVENT na termin, polskie znaki, CRLF, zawijanie linii. */
import { describe, expect, it } from 'vitest';
import { PRZYKLAD_DOKUMENTY } from '../../../mocks/przyklad';
import { naICS } from '../ics';
import type { Termin } from '../../types';

const CRLF = '\r\n';
/** Odwinięcie zawiniętych linii (RFC 5545 § 3.1): CRLF + spacja znika. */
const odwin = (ics: string) => ics.split(`${CRLF} `).join('');
const bajty = (s: string) => new TextEncoder().encode(s).length;

describe('naICS', () => {
  const ics = naICS(PRZYKLAD_DOKUMENTY.terminy, { dataUtworzenia: '2026-11-21' });

  it('poprawny szkielet kalendarza', () => {
    expect(ics.startsWith(`BEGIN:VCALENDAR${CRLF}VERSION:2.0${CRLF}PRODID:`)).toBe(true);
    expect(ics.endsWith(`END:VCALENDAR${CRLF}`)).toBe(true);
  });

  it('jedno VEVENT na termin', () => {
    const n = PRZYKLAD_DOKUMENTY.terminy.length;
    expect(ics.split('BEGIN:VEVENT').length - 1).toBe(n);
    expect(ics.split('END:VEVENT').length - 1).toBe(n);
    expect(ics.split('DTSTAMP:20261121T000000Z').length - 1).toBe(n);
  });

  it('każda linia kończy się CRLF i ma najwyżej 75 bajtów', () => {
    expect(ics.split(CRLF).join('').includes('\n')).toBe(false);
    expect(ics.split(CRLF).join('').includes('\r')).toBe(false);
    for (const linia of ics.split(CRLF)) expect(bajty(linia)).toBeLessThanOrEqual(75);
  });

  it('wydarzenia całodniowe: DTEND to dzień po terminie', () => {
    expect(ics).toContain(`DTSTART;VALUE=DATE:20270330${CRLF}DTEND;VALUE=DATE:20270331`);
    expect(ics).toContain(`DTSTART;VALUE=DATE:20261222${CRLF}DTEND;VALUE=DATE:20261223`);
    // Koniec roku i rok przestępny.
    expect(naICS([{ data: '2026-12-31', tytul: 'a', opis: '', rodzaj: 'koniec' }])).toContain(`DTEND;VALUE=DATE:20270101`);
    expect(naICS([{ data: '2028-02-28', tytul: 'a', opis: '', rodzaj: 'koniec' }])).toContain(`DTEND;VALUE=DATE:20280229`);
  });

  it('polskie znaki zostają, a przecinek, średnik i nowa linia są zakodowane', () => {
    const t: Termin = { data: '2027-01-08', tytul: 'Zażółć gęślą jaźń, ŻÓŁW; ćma', opis: 'Linia 1\nLinia 2', rodzaj: 'wniosek' };
    const tekst = odwin(naICS([t], { dataUtworzenia: '2026-11-21' }));
    expect(tekst).toContain('SUMMARY:Zażółć gęślą jaźń\\, ŻÓŁW\\; ćma');
    expect(tekst).toContain('Linia 1\\nLinia 2');
  });

  it('długi opis z polskimi znakami jest zawinięty i po odwinięciu wraca w całości', () => {
    const opis = 'Wniosek o urlop rodzicielski złóż u pracodawcy najpóźniej 21 dni przed początkiem urlopu – ąćęłńóśźż '.repeat(3);
    const t: Termin = { data: '2027-03-30', tytul: 'Wniosek', opis, rodzaj: 'wniosek' };
    const wynik = naICS([t], { dataUtworzenia: '2026-11-21' });
    for (const linia of wynik.split(CRLF)) expect(bajty(linia)).toBeLessThanOrEqual(75);
    expect(odwin(wynik)).toContain(opis.trim());
  });

  it('pusta lista daje pusty, ale poprawny kalendarz; wynik jest powtarzalny', () => {
    const pusty = naICS([]);
    expect(pusty.startsWith(`BEGIN:VCALENDAR${CRLF}`)).toBe(true);
    expect(pusty).not.toContain('BEGIN:VEVENT');
    expect(naICS(PRZYKLAD_DOKUMENTY.terminy)).toBe(naICS(PRZYKLAD_DOKUMENTY.terminy));
  });

  it('identyfikatory UID są unikalne', () => {
    const uid = ics.split(CRLF).filter((l) => l.startsWith('UID:'));
    expect(new Set(uid).size).toBe(PRZYKLAD_DOKUMENTY.terminy.length);
  });

  it('UID zawiera kod terminu i nie zależy od kolejności na liście', () => {
    const lista: Termin[] = [
      { kod: 'WNIOSEK_RODZICIELSKI', data: '2027-03-30', tytul: 'Wniosek', opis: '', rodzaj: 'wniosek', osobaId: 'mama', odcinekId: 'r1' },
      { kod: 'TERMIN_815', data: '2026-12-22', tytul: 'Ostatni dzień', opis: '', rodzaj: 'graniczny', osobaId: 'mama' },
    ];
    const uid = (t: Termin[]) => odwin(naICS(t)).split(CRLF).filter((l) => l.startsWith('UID:')).sort();
    expect(uid(lista)).toEqual(uid([...lista].reverse()));
    expect(uid(lista).some((l) => l.includes('WNIOSEK_RODZICIELSKI'))).toBe(true);
    expect(uid(lista).some((l) => l.includes('TERMIN_815'))).toBe(true);
  });

  it('dwa terminy o tym samym kodzie i dniu (np. ZAM z dwóch tytułów) mają różne UID', () => {
    const t: Termin = { kod: 'WNIOSEK_ZAM', data: '2027-01-10', tytul: 'ZAM', opis: '', rodzaj: 'wniosek', osobaId: 'mama', odcinekId: 'm1' };
    const uid = naICS([t, { ...t }]).split(CRLF).filter((l) => l.startsWith('UID:'));
    expect(new Set(uid).size).toBe(2);
  });
});
