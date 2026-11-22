/**
 * GENERATOR .ICS – TOR D (Mikołaj). Napisany od zera, bez bibliotek, według RFC 5545 (iCalendar):
 *  - linie kończą się CRLF (§ 3.1);
 *  - linia ma najwyżej 75 bajtów; dłuższą zawijamy: CRLF + spacja (§ 3.1), nie rozcinając znaku UTF-8;
 *  - tekst ma zakodowane \ ; , i nową linię (§ 3.3.11);
 *  - wydarzenie całodniowe: DTSTART;VALUE=DATE i DTEND dzień później (DTEND nie wlicza się do wydarzenia, § 3.6.1);
 *  - DTSTAMP i UID są wymagane w VEVENT (§ 3.6.1). Silnik nie czyta zegara, więc DTSTAMP to „dziś” przekazane z zewnątrz
 *    (`rodzina.dataAnalizy`), a UID powstaje z daty, kodu (`Termin.kod`) i treści terminu – ten sam plan daje ten sam plik.
 */
import { dodajDni } from '../daty';
import type { DataISO, Termin } from '../types';

export interface OpcjeICS {
  /** „Dziś” do pola DTSTAMP. Bez niego: najwcześniejszy termin z listy. */
  dataUtworzenia?: DataISO;
  nazwaKalendarza?: string;
}

const CRLF = '\r\n';
/** RFC 5545 § 3.1: najwyżej 75 bajtów w linii, bez znaku końca linii. */
const MAKS_BAJTOW = 75;
const UWAGA = 'To symulacja. Wynik nie jest decyzją ZUS.';

const KATEGORIE: Record<Termin['rodzaj'], string> = {
  wniosek: 'Wniosek',
  graniczny: 'Termin graniczny',
  poczatek: 'Początek',
  koniec: 'Koniec',
};

/** RFC 5545 § 3.3.11: tekst z zakodowanymi znakami specjalnymi. */
function tekst(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function bajtyZnaku(znak: string): number {
  const kod = znak.codePointAt(0) ?? 0;
  if (kod < 0x80) return 1;
  if (kod < 0x800) return 2;
  if (kod < 0x10000) return 3;
  return 4;
}

/** RFC 5545 § 3.1: zawijanie linii dłuższych niż 75 bajtów. Spacja na początku kolejnej linii też się liczy. */
function zawin(linia: string): string {
  const czesci: string[] = [];
  let biezaca = '';
  let bajty = 0;
  for (const znak of linia) {
    const b = bajtyZnaku(znak);
    if (bajty + b > MAKS_BAJTOW) {
      czesci.push(biezaca);
      biezaca = ' ';
      bajty = 1;
    }
    biezaca += znak;
    bajty += b;
  }
  czesci.push(biezaca);
  return czesci.join(CRLF);
}

function dataICS(d: DataISO): string {
  return d.split('-').join('');
}

/** Krótki, stały skrót tekstu (FNV-1a, 32 bity) do UID. */
function skrot(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Plik .ics z terminami: jedno wydarzenie całodniowe (VEVENT) na każdy termin. */
export function naICS(terminy: Termin[], opcje: OpcjeICS = {}): string {
  const najwczesniejszy = terminy.map((t) => t.data).sort()[0];
  const stamp = `${dataICS(opcje.dataUtworzenia ?? najwczesniejszy ?? '1970-01-01')}T000000Z`;
  const linie = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zasilkowy Przewodnik Przyszlego Rodzica//Terminy//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${tekst(opcje.nazwaKalendarza ?? 'Terminy – urlopy i zasiłki dla rodziców')}`,
  ];
  // UID: data, kod terminu i skrót treści – nie zależy od miejsca na liście, więc ponowny import tego samego planu
  // aktualizuje wydarzenia zamiast je dublować. Powtórzenia (np. dwa ZAM z dwóch tytułów) dostają numer.
  const uzyte = new Map<string, number>();
  terminy.forEach((t) => {
    const opis = [t.opis, t.przepis ? `Podstawa: ${t.przepis}` : '', UWAGA].filter((x) => x !== '').join('\n');
    const kod = (t.kod ?? t.rodzaj).replace(/[^A-Za-z0-9_-]/g, '_');
    const baza = `${dataICS(t.data)}-${kod}-${skrot([t.rodzaj, t.tytul, t.osobaId ?? '', t.odcinekId ?? ''].join('|'))}`;
    const n = (uzyte.get(baza) ?? 0) + 1;
    uzyte.set(baza, n);
    const uid = `${baza}${n > 1 ? `-${n}` : ''}@zasilkowy-przewodnik`;
    linie.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dataICS(t.data)}`,
      `DTEND;VALUE=DATE:${dataICS(dodajDni(t.data, 1))}`,
      `SUMMARY:${tekst(t.tytul)}`,
      `DESCRIPTION:${tekst(opis)}`,
      `CATEGORIES:${tekst(KATEGORIE[t.rodzaj])}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  });
  linie.push('END:VCALENDAR');
  return linie.map(zawin).join(CRLF) + CRLF;
}
