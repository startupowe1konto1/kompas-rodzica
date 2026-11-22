/** Etykiety osób i nazwy możliwości dla sekcji wyniku. Czyste funkcje, tylko typy z silnika. */
import type { Mozliwosc, Rodzina } from '../../engine/types';
import { NAZWY_ROL } from '../os-czasu/teksty';

export const NAZWY_MOZLIWOSCI: Record<Mozliwosc['kod'], string> = {
  urlop_przed_porodem: 'Urlop macierzyński przed porodem',
  rezygnacja_matki_i_przejecie: 'Mama rezygnuje, a tata przejmuje urlop',
  wariant_815: 'Zasiłek 81,5% za cały okres',
  podzial_rodzicielskiego: 'Podział urlopu rodzicielskiego na części',
  rodzicielski_jednoczesnie: 'Urlop rodzicielski obojga rodziców naraz',
  laczenie_z_praca: 'Łączenie urlopu rodzicielskiego z pracą',
  ojcowski_w_czesciach: 'Urlop ojcowski w częściach',
  uzupelniajacy: 'Urlop uzupełniający',
  przejecie_sytuacja_szczegolna: 'Przejęcie urlopu w sytuacji szczególnej',
};

export function nazwaMozliwosci(kod: string): string {
  return (NAZWY_MOZLIWOSCI as Record<string, string>)[kod] ?? kod;
}

/** „Anna (Mama)”; osoba spoza rodziny: samo id. */
export function etykietaOsoby(rodzina: Rodzina, osobaId: string): string {
  const o = rodzina.osoby.find((x) => x.id === osobaId);
  if (!o) return osobaId;
  const rola = NAZWY_ROL[o.rola];
  return o.dane?.imie ? `${o.dane.imie} (${rola})` : rola;
}

/** Kto składa dokument: osoba albo „płatnik” (Z-3 i Z-3a wypełnia płatnik). */
export function etykietaKtoSklada(rodzina: Rodzina, ktoSklada: string): string {
  return ktoSklada === 'platnik' ? 'płatnik' : etykietaOsoby(rodzina, ktoSklada);
}
