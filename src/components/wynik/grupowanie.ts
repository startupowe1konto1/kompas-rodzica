/**
 * Grupowanie uprawnień po osobach i status uprawnienia do pokazania w wyniku.
 * Czyste funkcje, bez Reacta i bez importów z silnika (tylko typy).
 */
import type { Rodzina, Rola, Uprawnienie } from '../../engine/types';
import { NAZWY_ROL } from '../os-czasu/teksty';

export type StatusUprawnienia = 'przysluguje' | 'nie_przysluguje' | 'do_potwierdzenia';

export interface GrupaOsoby {
  osobaId: string;
  rola?: Rola;
  etykieta: string;
  uprawnienia: (Uprawnienie & { status: StatusUprawnienia })[];
}

const KOD_DO_POTWIERDZENIA = 'DO_POTWIERDZENIA_W_ZUS';

const KOLEJNOSC_ROL: Rola[] = ['matka', 'ojciec', 'przyjmujacy', 'inny_czlonek_rodziny'];

const KOLEJNOSC_STATUSOW: Record<StatusUprawnienia, number> = {
  przysluguje: 0,
  do_potwierdzenia: 1,
  nie_przysluguje: 2,
};

export function statusUprawnienia(u: Uprawnienie): StatusUprawnienia {
  if (u.kod === KOD_DO_POTWIERDZENIA || u.przysluguje === 'warunkowo') return 'do_potwierdzenia';
  return u.przysluguje ? 'przysluguje' : 'nie_przysluguje';
}

function grupa(osobaId: string, rola: Rola | undefined, imie: string | undefined, u: Uprawnienie[]): GrupaOsoby {
  const nazwaRoli = rola ? NAZWY_ROL[rola] : undefined;
  const etykieta = nazwaRoli ? (imie ? `${imie} (${nazwaRoli})` : nazwaRoli) : (imie ?? osobaId);
  const uprawnienia = u
    .filter((x) => x.osobaId === osobaId)
    .map((x) => ({ ...x, status: statusUprawnienia(x) }))
    // sort stabilny: w obrębie statusu zostaje kolejność z API
    .sort((a, b) => KOLEJNOSC_STATUSOW[a.status] - KOLEJNOSC_STATUSOW[b.status]);
  return { osobaId, rola, etykieta, uprawnienia };
}

/** Każda osoba rodziny ma grupę (także pustą); osoby spoza rodziny, które mają uprawnienia, na końcu. */
export function grupujPoOsobach(rodzina: Rodzina, u: Uprawnienie[]): GrupaOsoby[] {
  const rodzinne = rodzina.osoby
    .map((o, i) => ({ o, i }))
    .sort((a, b) => KOLEJNOSC_ROL.indexOf(a.o.rola) - KOLEJNOSC_ROL.indexOf(b.o.rola) || a.i - b.i)
    .map(({ o }) => grupa(o.id, o.rola, o.dane?.imie, u));
  const znane = new Set(rodzina.osoby.map((o) => o.id));
  const obce: string[] = [];
  for (const x of u) {
    if (!znane.has(x.osobaId) && !obce.includes(x.osobaId)) obce.push(x.osobaId);
  }
  return [...rodzinne, ...obce.map((id) => grupa(id, undefined, undefined, u))];
}

export function wymagaPotwierdzenia(g: GrupaOsoby[]): boolean {
  return g.some((x) => x.uprawnienia.some((u) => u.status === 'do_potwierdzenia'));
}
