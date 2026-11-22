/**
 * Co z profilu rodzica może trafić do modelu AI (ZuSik). Zasada: biała lista pól.
 * Do modelu idzie tylko to, czego silnik potrzebuje do wyniku: role, tytuły ubezpieczenia, kwoty, daty, zdrowie.
 * Nie idą: dane do wniosków (`Osoba.dane`, `Dziecko.dane`), oświadczenia i dane płatnika (nazwa, NIP, REGON).
 */
import type { Dziecko, Osoba, Rodzina, TytulUbezpieczenia } from '../engine/types';

const USUNIETO = '[usunięto]';

function tytulDlaModelu(t: TytulUbezpieczenia): TytulUbezpieczenia {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { nazwaPlatnika, nipPlatnika, regonPlatnika, ...reszta } = t;
  return reszta;
}

function osobaDlaModelu(o: Osoba): Osoba {
  const wynik: Osoba = { id: o.id, rola: o.rola, tytuly: o.tytuly.map(tytulDlaModelu) };
  if (o.urlopWychowawczy) wynik.urlopWychowawczy = o.urlopWychowawczy;
  if (o.zdrowie) wynik.zdrowie = o.zdrowie;
  if (o.pit2 !== undefined) wynik.pit2 = o.pit2;
  if (o.pobraneZasilki) wynik.pobraneZasilki = o.pobraneZasilki;
  return wynik;
}

function dzieckoDlaModelu(d: Dziecko): Dziecko {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dane, ...reszta } = d;
  return reszta;
}

/** Kopia rodziny bez danych osobowych. Wejście zostaje bez zmian. */
export function rodzinaDlaModelu(rodzina: Rodzina): Rodzina {
  return {
    dataAnalizy: rodzina.dataAnalizy,
    osoby: rodzina.osoby.map(osobaDlaModelu),
    zdarzenie: { ...rodzina.zdarzenie, dzieci: rodzina.zdarzenie.dzieci.map(dzieckoDlaModelu) },
  };
}

/** Wzorce danych, które rodzic może wpisać w pytaniu. Kolejność ma znaczenie: najpierw dłuższe numery. */
const WZORCE: RegExp[] = [
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, // e-mail
  /(?:PL\s?)?(?<!\d)\d{2}(?:\s?\d{4}){6}(?!\d)/g, // numer rachunku (NRB / IBAN PL)
  /(?<!\d)\d{11}(?!\d)/g, // PESEL
  /(?:\+48[\s-]?)?(?<!\d)\d{3}[\s-]?\d{3}[\s-]?\d{3}(?!\d)/g, // telefon
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Napisy z profilu, które identyfikują osobę – usuwamy je z pytania, gdy rodzic je wpisze. */
function znaneDaneOsobowe(rodzina: Rodzina): string[] {
  const napisy: (string | undefined)[] = [];
  // Profil z niedokończonej ankiety może mieć braki – sprawdzamy kształt, zamiast mu ufać.
  const lista = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
  for (const o of lista<Rodzina['osoby'][number]>(rodzina.osoby)) {
    const d = o?.dane;
    if (d) napisy.push(d.imie, d.nazwisko, d.pesel, d.adres?.ulica, d.adres?.miejscowosc, d.dokumentTozsamosci, d.email, d.telefon, d.rachunekBankowy);
    for (const t of lista<Rodzina['osoby'][number]['tytuly'][number]>(o?.tytuly)) napisy.push(t?.nazwaPlatnika, t?.nipPlatnika, t?.regonPlatnika);
  }
  for (const dz of lista<Rodzina['zdarzenie']['dzieci'][number]>(rodzina.zdarzenie?.dzieci)) {
    const d = dz?.dane;
    if (d) napisy.push(d.imie, d.nazwisko, d.pesel, d.miejsceUrodzenia);
  }
  return napisy.filter((s): s is string => typeof s === 'string' && s.trim().length >= 2).map((s) => s.trim());
}

/** Pytanie rodzica bez PESEL, numeru konta, e-maila, telefonu i danych znanych z profilu. */
export function wyczyscPytanie(tekst: string, rodzina: Rodzina | null): string {
  let wynik = tekst;
  for (const napis of rodzina ? znaneDaneOsobowe(rodzina) : []) {
    wynik = wynik.replace(new RegExp(`(?<![\\p{L}\\d])${escapeRegExp(napis)}(?![\\p{L}\\d])`, 'giu'), USUNIETO);
  }
  for (const wzorzec of WZORCE) wynik = wynik.replace(wzorzec, USUNIETO);
  return wynik;
}
