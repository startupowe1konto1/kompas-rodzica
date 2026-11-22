// POST /api/eligibility – uprawnienia, pule, możliwości wyboru i ryzyka. Właściciel: tor A.
import { ustalUprawnienia } from '@/src/engine';
import type { ZapytanieRodzina } from '@/src/engine/types';
import { obsluz, wymagaj } from '@/src/server/http';
import { pobierzWersje } from '@/src/server/magazynParametrow';

export async function POST(request: Request) {
  return obsluz(request, async (cialo) => {
    const { rodzina } = wymagaj<ZapytanieRodzina>(cialo, ['rodzina']);
    return ustalUprawnienia(rodzina, await pobierzWersje());
  });
}
