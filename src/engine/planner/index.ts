/**
 * PLANER WARIANTÓW – TOR A (Oskar). Publiczne funkcje składają moduły:
 * scenariusze (A4), walidacja i wykorzystanie (A5), akcje (A6). Plan: docs/superpowers/plans/2026-11-21-tor-a.md.
 */
import { ustalUprawnienia } from '../eligibility';
import { parametryNaDzien } from '../params';
import type { AkcjaPlanu, DataISO, Komunikat, OdpowiedzAkcja, Parametry, Plan, Rodzina, WynikWalidacji } from '../types';
import { przesunNaNowaDate, zastosujAkcjeNaPlanie } from './akcje';
import { zbudujScenariusze } from './scenariusze';
import { walidujPlanZ } from './walidacja';

export { czesciOsoby, nowyIdOdcinka, przeliczCzesci } from './odcinki';
export { policzWykorzystanie } from './wykorzystanie';

/** Plan domyślny (pierwszy na liście) i gotowe scenariusze do wyboru jednym kliknięciem. */
export function planyDomyslne(rodzina: Rodzina, wersje: Parametry[]): Plan[] {
  const p = parametryNaDzien(rodzina.zdarzenie.data, wersje);
  return zbudujScenariusze(rodzina, ustalUprawnienia(rodzina, wersje), p);
}

/** Ocena planu: błędy (nie wolno), ostrzeżenia (wolno, ale…) i konsekwencje (co z tego wynika). */
export function walidujPlan(rodzina: Rodzina, plan: Plan, wersje: Parametry[]): WynikWalidacji {
  const p = parametryNaDzien(rodzina.zdarzenie.data, wersje);
  return walidujPlanZ(rodzina, plan, ustalUprawnienia(rodzina, wersje), p);
}

function czyKomunikat(x: Plan | Komunikat): x is Komunikat {
  return 'poziom' in x && 'kod' in x;
}

/** Stosuje zmianę z osi czasu i od razu ocenia nowy plan. Nie modyfikuje planu wejściowego. */
export function zastosujAkcje(rodzina: Rodzina, plan: Plan, akcja: AkcjaPlanu, wersje: Parametry[]): OdpowiedzAkcja {
  const p = parametryNaDzien(rodzina.zdarzenie.data, wersje);
  const wynik = zastosujAkcjeNaPlanie(rodzina, plan, akcja, p);
  if (czyKomunikat(wynik)) {
    const walidacja = walidujPlan(rodzina, plan, wersje);
    return { plan, walidacja: { ...walidacja, poprawny: false, bledy: [wynik, ...walidacja.bledy] } };
  }
  return { plan: wynik, walidacja: walidujPlan(rodzina, wynik, wersje) };
}

/**
 * „Dziecko się urodziło”: przelicza plan na nową datę zdarzenia i ocenia go na nowo.
 * `rodzina.zdarzenie.data` ma już nową datę. Nie modyfikuje planu wejściowego.
 */
export function przesunPlan(rodzina: Rodzina, plan: Plan, poprzedniaData: DataISO, wersje: Parametry[]): OdpowiedzAkcja {
  const p = parametryNaDzien(rodzina.zdarzenie.data, wersje);
  const nowy = przesunNaNowaDate(rodzina, plan, poprzedniaData, p);
  return { plan: nowy, walidacja: walidujPlan(rodzina, nowy, wersje) };
}
