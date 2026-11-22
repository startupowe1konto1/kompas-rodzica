// POST /api/documents – kto wypłaca, lista dokumentów i terminy. Właściciel: tor D.
import { dokumentyITerminy } from '@/src/engine';
import { bladDanychDokumentow } from '@/src/engine/documents';
import type { ZapytaniePlan } from '@/src/engine/types';
import { BladDanych, obsluz, wymagaj } from '@/src/server/http';
import { pobierzWersje } from '@/src/server/magazynParametrow';

export async function POST(request: Request) {
  return obsluz(request, async (cialo) => {
    const { rodzina, plan } = wymagaj<ZapytaniePlan>(cialo, ['rodzina', 'plan']);
    const blad = bladDanychDokumentow(rodzina, plan);
    if (blad) throw new BladDanych(blad);
    return dokumentyITerminy(rodzina, plan, await pobierzWersje());
  });
}
