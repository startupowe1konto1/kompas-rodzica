// POST /api/plan/shift – „dziecko się urodziło”: plan przesunięty na faktyczną datę + ocena. Właściciel: tor A.
import { przesunPlan } from '@/src/engine';
import type { ZapytaniePrzesuniecie } from '@/src/engine/types';
import { obsluz, wymagaj } from '@/src/server/http';
import { pobierzWersje } from '@/src/server/magazynParametrow';

export async function POST(request: Request) {
  return obsluz(request, async (cialo) => {
    const { rodzina, plan, poprzedniaData } = wymagaj<ZapytaniePrzesuniecie>(cialo, ['rodzina', 'plan', 'poprzedniaData']);
    return przesunPlan(rodzina, plan, poprzedniaData, await pobierzWersje());
  });
}
