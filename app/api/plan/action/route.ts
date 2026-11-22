// POST /api/plan/action – zmiana na osi czasu (przesuń, skróć, podziel, przenieś…) + ocena nowego planu. Właściciel: tor A.
import { zastosujAkcje } from '@/src/engine';
import type { ZapytanieAkcja } from '@/src/engine/types';
import { obsluz, wymagaj } from '@/src/server/http';
import { pobierzWersje } from '@/src/server/magazynParametrow';

export async function POST(request: Request) {
  return obsluz(request, async (cialo) => {
    const { rodzina, plan, akcja } = wymagaj<ZapytanieAkcja>(cialo, ['rodzina', 'plan', 'akcja']);
    return zastosujAkcje(rodzina, plan, akcja, await pobierzWersje());
  });
}
