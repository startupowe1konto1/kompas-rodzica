import type { OdpowiedzPlanDomyslny, Plan } from '../../engine/types';
import type { WynikZapytania } from '../../state/useZapytanie';

/**
 * Silnik nie ułożył żadnego planu (np. sprzeczne daty, brak umowy): ekrany zależne od planu nie mogą wtedy czekać
 * w nieskończoność na „Liczymy…” (uwaga z testów z użytkownikiem 22.11), tylko pokazują panel „Popraw te odpowiedzi” (PanelDoPoprawy).
 */
export function czyBrakPlanu(wybranyPlan: Plan | null, planyDomyslne: Pick<WynikZapytania<OdpowiedzPlanDomyslny>, 'dane' | 'laduje' | 'blad'>): boolean {
  return wybranyPlan === null && !planyDomyslne.laduje && planyDomyslne.blad === null && planyDomyslne.dane?.plany.length === 0;
}
