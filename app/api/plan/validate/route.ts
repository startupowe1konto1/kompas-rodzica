// POST /api/plan/validate – błędy, ostrzeżenia i konsekwencje planu. Właściciel: tor A.
import { walidujPlan } from '@/src/engine';
import type { ZapytaniePlan } from '@/src/engine/types';
import { obsluz, wymagaj } from '@/src/server/http';
import { pobierzWersje } from '@/src/server/magazynParametrow';

export async function POST(request: Request) {
  return obsluz(request, async (cialo) => {
    const { rodzina, plan } = wymagaj<ZapytaniePlan>(cialo, ['rodzina', 'plan']);
    return walidujPlan(rodzina, plan, await pobierzWersje());
  });
}
