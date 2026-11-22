// POST /api/documents/ics – terminy planu jako plik kalendarza (.ics). Właściciel: tor D.
// POST, a nie GET: dane rodziny nie mogą trafić do adresu URL (logi, historia przeglądarki).
import { dokumentyITerminy, naICS } from '@/src/engine';
import { bladDanychDokumentow } from '@/src/engine/documents';
import type { ZapytaniePlan } from '@/src/engine/types';
import { BladDanych, wymagaj } from '@/src/server/http';
import { pobierzWersje } from '@/src/server/magazynParametrow';

export async function POST(request: Request) {
  let cialo: unknown;
  try {
    cialo = await request.json();
  } catch {
    return Response.json({ blad: 'Treść zapytania nie jest poprawnym JSON-em.' }, { status: 400 });
  }
  try {
    const { rodzina, plan } = wymagaj<ZapytaniePlan>(cialo, ['rodzina', 'plan']);
    const blad = bladDanychDokumentow(rodzina, plan);
    if (blad) throw new BladDanych(blad);
    const { terminy } = dokumentyITerminy(rodzina, plan, await pobierzWersje());
    return new Response(naICS(terminy, { dataUtworzenia: rodzina.dataAnalizy }), {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="terminy-urlopy-zasilki.ics"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    if (e instanceof BladDanych) return Response.json({ blad: e.message }, { status: 400 });
    console.error(e);
    return Response.json({ blad: 'Błąd serwera przy tworzeniu pliku kalendarza.' }, { status: 500 });
  }
}
