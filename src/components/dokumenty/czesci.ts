/**
 * Części jednego urlopu: gdy plan dzieli urlop rodzicielski (albo ojcowski) na kilka odcinków, każdy z nich wymaga
 * osobnego wniosku (KP art. 182¹d § 1 – wniosek najpóźniej 21 dni przed rozpoczęciem urlopu). Czyste funkcje, bez Reacta.
 */
import type { Dokument, KodDokumentu, Odcinek } from '../../engine/types';

export interface OpisCzesci {
  /** Numer części, od 1, po dacie początku odcinka. */
  nr: number;
  razem: number;
  od: string;
  do: string;
}

/** Wnioski, które powstają osobno dla każdej części urlopu, i nazwa urlopu do tytułu karty. */
export const NAZWA_URLOPU: Partial<Record<KodDokumentu, string>> = {
  wniosek_rodzicielski: 'Urlop rodzicielski',
  wniosek_ojcowski: 'Urlop ojcowski',
  wniosek_laczenie_z_praca: 'Łączenie urlopu rodzicielskiego z pracą',
};

export const kluczDokumentu = (d: Pick<Dokument, 'kod' | 'ktoSklada' | 'odcinekId'>): string =>
  `${d.kod}|${d.ktoSklada}|${d.odcinekId ?? ''}`;

/** Dla wniosków o ten sam urlop tej samej osoby (≥ 2 odcinki) zwraca numer części i daty odcinka. Klucz: `kluczDokumentu`. */
export function opisyCzesci(dokumenty: Dokument[], odcinki: Odcinek[]): Map<string, OpisCzesci> {
  const wynik = new Map<string, OpisCzesci>();
  const grupy = new Map<string, { dokument: Dokument; odcinek: Odcinek }[]>();
  for (const d of dokumenty) {
    if (!(d.kod in NAZWA_URLOPU) || !d.odcinekId) continue;
    const odcinek = odcinki.find((o) => o.id === d.odcinekId);
    if (!odcinek) continue;
    const klucz = `${d.kod}|${d.ktoSklada}`;
    grupy.set(klucz, [...(grupy.get(klucz) ?? []), { dokument: d, odcinek }]);
  }
  for (const grupa of grupy.values()) {
    if (grupa.length < 2) continue;
    grupa
      .sort((a, b) => (a.odcinek.od < b.odcinek.od ? -1 : a.odcinek.od > b.odcinek.od ? 1 : 0))
      .forEach(({ dokument, odcinek }, i) =>
        wynik.set(kluczDokumentu(dokument), {
          nr: i + 1,
          razem: grupa.length,
          od: odcinek.od,
          do: odcinek.do,
        }),
      );
  }
  return wynik;
}
