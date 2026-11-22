/** Stawki procentowe zasiłków za poszczególne typy odcinków. Wartości wyłącznie z `Parametry`. */
import type { Odcinek, Parametry, Plan } from '../types';

export interface Stawka {
  proc: number;
  przepis: string;
  /** Np. 'urlop macierzyński' – do opisu kroku. */
  nazwa: string;
}

export interface OpcjeStawki {
  /**
   * Dzień urlopu rodzicielskiego mieści się w części przysługującej drugiemu rodzicowi (KP art. 182¹a § 4).
   * Ustala to kalkulator (`kwoty.ts`); ma znaczenie tylko przy wariancie 81,5%.
   */
  czescDrugiegoRodzica?: boolean;
}

/**
 * Stawka procentowa odcinka albo null, gdy za odcinek nie ma zasiłku (praca, przerwa, wychowawczy).
 * Przejęcie części urlopu macierzyńskiego przez ojca (EC-70) ma stawkę z planu, jak u matki.
 */
export function stawkaOdcinka(odcinek: Odcinek, plan: Plan, p: Parametry, opcje: OpcjeStawki = {}): Stawka | null {
  const s = p.stawkiProc;
  switch (odcinek.typ) {
    case 'macierzynski':
    case 'na_warunkach_macierzynskiego':
      return plan.wariant815
        ? { proc: s.wariant815, przepis: 'UZ art. 31 ust. 3', nazwa: 'urlop macierzyński (wariant równej wypłaty)' }
        : { proc: s.macierzynski, przepis: 'UZ art. 31 ust. 1', nazwa: 'urlop macierzyński' };
    case 'rodzicielski':
      // UZ art. 31 ust. 3f: przy wariancie 81,5% część drugiego rodzica zawsze 70% (Poradnik ZUS 2026, s. 34)
      if (plan.wariant815 && opcje.czescDrugiegoRodzica) {
        return { proc: s.rodzicielski, przepis: 'UZ art. 31 ust. 3f', nazwa: 'urlop rodzicielski w części drugiego rodzica' };
      }
      return plan.wariant815
        ? { proc: s.wariant815, przepis: 'UZ art. 31 ust. 3', nazwa: 'urlop rodzicielski (wariant równej wypłaty)' }
        : { proc: s.rodzicielski, przepis: 'UZ art. 31 ust. 2', nazwa: 'urlop rodzicielski' };
    case 'uzupelniajacy':
      return { proc: s.uzupelniajacy, przepis: 'UZ art. 31 ust. 1', nazwa: 'urlop uzupełniający' };
    case 'ojcowski':
      return { proc: s.ojcowski, przepis: 'UZ art. 31 ust. 1', nazwa: 'urlop ojcowski' };
    case 'chorobowy_ciaza':
      return { proc: s.chorobowyCiaza, przepis: 'UZ art. 11 ust. 2 pkt 1', nazwa: 'zwolnienie w ciąży' };
    case 'w_wys_macierzynskiego':
      return { proc: s.macierzynski, przepis: 'UZ art. 30 ust. 3', nazwa: 'zasiłek w wysokości macierzyńskiego' };
    case 'praca':
    case 'przerwa':
    case 'wychowawczy':
      return null;
  }
}
