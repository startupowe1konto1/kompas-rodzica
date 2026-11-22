// GET /api/admin/params – wszystkie wersje parametrów. PUT – zapis wersji albo reset (hasło ADMIN_HASLO). Właściciel: tor B.
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Parametry } from '@/src/engine/types';
import { BladDanych, obsluz } from '@/src/server/http';
import { pobierzWersje, przywrocDomyslne, zapiszWersje } from '@/src/server/magazynParametrow';

function haslaZgodne(podane: string, oczekiwane: string): boolean {
  // Skróty mają równą długość, więc porównanie nie zdradza długości hasła.
  const a = createHash('sha256').update(podane).digest();
  const b = createHash('sha256').update(oczekiwane).digest();
  return timingSafeEqual(a, b);
}

export async function GET() {
  return Response.json(await pobierzWersje());
}

export async function PUT(request: Request) {
  const oczekiwane = process.env.ADMIN_HASLO;
  const podane = request.headers.get('x-admin-haslo');
  if (!oczekiwane || podane === null || !haslaZgodne(podane, oczekiwane)) {
    return Response.json({ blad: 'Brak uprawnień: proszę podać poprawne hasło administratora.' }, { status: 401 });
  }
  return obsluz(request, async (cialo) => {
    if (typeof cialo !== 'object' || cialo === null) throw new BladDanych('Treść zapytania musi być obiektem JSON.');
    const tresc = cialo as { wersje?: unknown; przywrocDomyslne?: unknown };
    let trwale: boolean;
    if (tresc.przywrocDomyslne === true) {
      ({ trwale } = await przywrocDomyslne());
    } else if (tresc.wersje !== undefined) {
      ({ trwale } = await zapiszWersje(tresc.wersje as Parametry[]));
    } else {
      throw new BladDanych('Proszę podać "wersje" do zapisu albo "przywrocDomyslne": true.');
    }
    return { wersje: await pobierzWersje(), trwale };
  });
}
