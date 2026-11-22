/** „Dziecko się urodziło”: podmiana przewidywanej daty na faktyczną i walidacja pola daty. */
import type { DataISO, Rodzina } from '../../engine/types';
import { dniMiedzy, parsujDate } from '../os-czasu/daty';
import { DNI_CIAZY } from '../os-czasu/zakres';

export type KodBleduPorodu = 'WYMAGANE' | 'ZLA_DATA' | 'DATA_W_PRZYSZLOSCI' | 'DATA_ZA_WCZESNIE';

/** Nowa rodzina z faktyczną datą porodu (bez mutacji) i poprzednia data do `api.przesunPlan`. */
export function dzieckoSieUrodzilo(rodzina: Rodzina, data: DataISO): { rodzina: Rodzina; poprzedniaData: DataISO } {
  return {
    poprzedniaData: rodzina.zdarzenie.data,
    rodzina: { ...rodzina, zdarzenie: { ...rodzina.zdarzenie, data, przewidywana: false } },
  };
}

/** Kod błędu daty porodu albo null. Za wcześnie = przed przewidywaną datą minus długość ciąży. */
export function bladDatyPorodu(data: string, rodzina: Rodzina): KodBleduPorodu | null {
  if (!data) return 'WYMAGANE';
  try {
    parsujDate(data);
  } catch {
    return 'ZLA_DATA';
  }
  if (data > rodzina.dataAnalizy) return 'DATA_W_PRZYSZLOSCI';
  if (dniMiedzy(data, rodzina.zdarzenie.data) > DNI_CIAZY) return 'DATA_ZA_WCZESNIE';
  return null;
}
