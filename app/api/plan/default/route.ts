// POST /api/plan/default – plan domyślny i gotowe scenariusze. Właściciel: tor A.
import { planyDomyslne } from '@/src/engine';
import type { OdpowiedzPlanDomyslny, ZapytanieRodzina } from '@/src/engine/types';
import { obsluz, wymagaj } from '@/src/server/http';
import { pobierzWersje } from '@/src/server/magazynParametrow';

export async function POST(request: Request) {
  return obsluz(request, async (cialo): Promise<OdpowiedzPlanDomyslny> => {
    const { rodzina } = wymagaj<ZapytanieRodzina>(cialo, ['rodzina']);
    return { plany: planyDomyslne(rodzina, await pobierzWersje()) };
  });
}
