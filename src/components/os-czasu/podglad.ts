/**
 * Podgląd „po zmianie”: czym plan alternatywny (odpowiedź `POST /api/plan/action` bez zastosowania)
 * różni się od planu – osobno dla każdej osoby. Kontrakt `Mozliwosc.konsekwencje` nie mówi, kogo dotyczy
 * skutek, więc skutek dla drugiego rodzica bierzemy z różnicy planów (i stawek z `POST /api/calculate`).
 * Czysta logika: bez Reacta i bez zegara.
 */
import type { DataISO, Odcinek, Plan } from '../../engine/types';
import { dniMiedzy, dodajDni } from './daty';
import { NAZWY_TYPOW, opisDlugosci, opisOkresu } from './teksty';

export interface ZmianaOdcinka {
  przed: Odcinek;
  po: Odcinek;
}

export interface ZmianaStawki {
  odcinek: Odcinek;
  przed: number;
  po: number;
}

export interface ZmianyOsoby {
  osobaId: string;
  /** Odcinki, których przed zmianą nie było (inne id i inne daty). */
  nowe: Odcinek[];
  /** Ten sam odcinek (to samo id) z innymi datami, typem albo wymiarem pracy. */
  zmienione: ZmianaOdcinka[];
  /** Odcinki, które po zmianie znikają. */
  usuniete: Odcinek[];
  /** Te same daty, inna stawka (np. wariant 81,5%). */
  stawki: ZmianaStawki[];
  /** Odcinki planu po zmianie do narysowania w wierszu „po zmianie” (nowe, zmienione i ze zmienioną stawką). */
  doPodgladu: Odcinek[];
  /** Pierwszy dzień, od którego u tej osoby coś się zmienia; null = bez zmian. */
  pierwszaZmiana: DataISO | null;
}

/** Stawki odcinków (`KwotaOdcinka.stawkaProc`) po id odcinka. */
export type Stawki = Record<string, number>;

function tresc(o: Odcinek): string {
  return `${o.osobaId}|${o.typ}|${o.od}|${o.do}|${o.wymiarPracy ?? ''}`;
}

function poDacie(a: Odcinek, b: Odcinek): number {
  if (a.od !== b.od) return a.od < b.od ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function wczesniej(a: DataISO | null, b: DataISO): DataISO {
  return a === null || b < a ? b : a;
}

/**
 * Różnice planów dla każdej osoby z `osoby` (także bez zmian – wtedy puste listy i `pierwszaZmiana: null`).
 * Odcinek o tej samej treści (osoba, typ, daty, wymiar pracy) uznajemy za niezmieniony, nawet gdy silnik nadał mu nowe id.
 */
export function zmianyPodgladu(
  baza: Plan,
  po: Plan,
  osoby: string[],
  stawki?: { przed?: Stawki | null; po?: Stawki | null },
): ZmianyOsoby[] {
  const trescBazy = new Set(baza.odcinki.map(tresc));
  const trescPo = new Set(po.odcinki.map(tresc));
  const bazaPoId = new Map(baza.odcinki.map((o) => [o.id, o]));

  return osoby.map((osobaId) => {
    const nowe: Odcinek[] = [];
    const zmienione: ZmianaOdcinka[] = [];
    const zmienioneStawki: ZmianaStawki[] = [];
    let pierwszaZmiana: DataISO | null = null;

    for (const p of po.odcinki.filter((o) => o.osobaId === osobaId).sort(poDacie)) {
      if (trescBazy.has(tresc(p))) {
        const sPrzed = stawki?.przed?.[baza.odcinki.find((b) => tresc(b) === tresc(p))?.id ?? p.id];
        const sPo = stawki?.po?.[p.id];
        if (sPrzed !== undefined && sPo !== undefined && Math.abs(sPrzed - sPo) > 1e-9) {
          zmienioneStawki.push({ odcinek: p, przed: sPrzed, po: sPo });
          pierwszaZmiana = wczesniej(pierwszaZmiana, p.od);
        }
        continue;
      }
      const przed = bazaPoId.get(p.id);
      if (przed && przed.osobaId === osobaId) {
        zmienione.push({ przed, po: p });
        // Zmiana końca: skutek zaczyna się tam, gdzie daty się rozjeżdżają.
        const od =
          przed.od !== p.od ? (przed.od < p.od ? przed.od : p.od) : przed.do !== p.do ? dodajDni(przed.do < p.do ? przed.do : p.do, 1) : p.od;
        pierwszaZmiana = wczesniej(pierwszaZmiana, od);
      } else {
        nowe.push(p);
        pierwszaZmiana = wczesniej(pierwszaZmiana, p.od);
      }
    }

    const usuniete = baza.odcinki
      .filter((b) => b.osobaId === osobaId && !trescPo.has(tresc(b)) && !po.odcinki.some((p) => p.id === b.id && p.osobaId === osobaId))
      .sort(poDacie);
    for (const u of usuniete) pierwszaZmiana = wczesniej(pierwszaZmiana, u.od);

    const doPodgladu = [...nowe, ...zmienione.map((z) => z.po), ...zmienioneStawki.map((s) => s.odcinek)].sort(poDacie);
    return { osobaId, nowe, zmienione, usuniete, stawki: zmienioneStawki, doPodgladu, pierwszaZmiana };
  });
}

/** Czy u osoby coś się zmienia. */
export function maZmiany(z: ZmianyOsoby): boolean {
  return z.pierwszaZmiana !== null;
}

/** Gdzie na osi kończy się linia skutku: osoba, dzień i czy w wierszu „po zmianie” (pigułka podglądu), czy w wierszu planu (odcinek znika). */
export interface CelSkutku {
  osobaId: string;
  data: DataISO;
  wiersz: 'podglad' | 'plan';
  odcinekId: string;
}

/**
 * Skutek dla drugiej osoby: pierwszy zmieniony odcinek u osoby innej niż ta, która decyduje.
 * Pierwszeństwo ma pigułka w wierszu „po zmianie”; gdy odcinek tylko znika – jego miejsce w planie.
 */
export function celSkutku(zmiany: ZmianyOsoby[], ktoDecyduje: string | undefined): CelSkutku | null {
  let najlepszy: CelSkutku | null = null;
  for (const z of zmiany) {
    if (z.osobaId === ktoDecyduje || !maZmiany(z)) continue;
    const pierwszy = z.doPodgladu[0];
    const kandydat: CelSkutku | null = pierwszy
      ? { osobaId: z.osobaId, data: pierwszy.od, wiersz: 'podglad', odcinekId: pierwszy.id }
      : z.usuniete[0]
        ? { osobaId: z.osobaId, data: z.usuniete[0].od, wiersz: 'plan', odcinekId: z.usuniete[0].id }
        : null;
    if (kandydat && (!najlepszy || kandydat.data < najlepszy.data)) najlepszy = kandydat;
  }
  return najlepszy;
}

/** „81,5%” – stawka z API, przecinek dziesiętny. */
export function opisStawki(p: number): string {
  return `${String(Math.round(p * 10) / 10).replace('.', ',')}%`;
}

function opisOdcinka(o: Odcinek): string {
  return `${NAZWY_TYPOW[o.typ]}: ${opisOkresu(o.od, o.do)} (${opisDlugosci(dniMiedzy(o.od, o.do) + 1)})`;
}

/** Zdania o zmianach u osoby, do karty decyzji (i czytnika ekranu). Pusta lista = bez zmian. */
export function opisZmian(z: ZmianyOsoby): string[] {
  const zdania: string[] = [];
  for (const { przed, po } of z.zmienione) {
    zdania.push(`${NAZWY_TYPOW[po.typ]}: ${opisOkresu(po.od, po.do)} (${opisDlugosci(dniMiedzy(po.od, po.do) + 1)}) zamiast ${opisOkresu(przed.od, przed.do)}`);
  }
  for (const o of z.nowe) zdania.push(`Nowy odcinek – ${opisOdcinka(o)}`);
  for (const o of z.usuniete) zdania.push(`Bez odcinka – ${opisOdcinka(o)}`);
  for (const s of z.stawki) zdania.push(`${NAZWY_TYPOW[s.odcinek.typ]}: stawka ${opisStawki(s.po)} zamiast ${opisStawki(s.przed)}`);
  return zdania;
}
