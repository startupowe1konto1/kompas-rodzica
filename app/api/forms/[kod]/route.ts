// POST /api/forms/{kod} – wypełniony wniosek jako PDF (ZAM, wnioski do pracodawcy). Właściciel: tor D.
// Odpowiedź: plik PDF; lista braków (po ludzku) w nagłówku `x-do-uzupelnienia` jako JSON zakodowany
// przez encodeURIComponent. Błędy: { blad } ze statusem 400 (złe dane) albo 404 (dokumentu nie generujemy).
import type { ZapytanieWniosek } from '@/src/engine/types';
import { czyWniosekDoPracodawcy, wniosekDoPracodawcy } from '@/src/forms/pracodawca';
import { BladWniosku } from '@/src/forms/wspolne';
import { wypelnijZAM } from '@/src/forms/zam';
import { pobierzWersje } from '@/src/server/magazynParametrow';
import { BladDanych, wymagaj } from '@/src/server/http';

function blad(tresc: string, status: number): Response {
  return Response.json({ blad: tresc }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ kod: string }> }) {
  const { kod } = await params;
  if (kod !== 'ZAM' && !czyWniosekDoPracodawcy(kod)) {
    return blad(`Nie generujemy dokumentu „${kod}”. Z-3 i Z-3a wypełnia płatnik, nie rodzic.`, 404);
  }

  let cialo: unknown;
  try {
    cialo = await request.json();
  } catch {
    return blad('Treść zapytania nie jest poprawnym JSON-em.', 400);
  }

  try {
    const zapytanie = wymagaj<ZapytanieWniosek>(cialo, ['rodzina', 'plan', 'osobaId']);
    const wynik =
      kod === 'ZAM' ? await wypelnijZAM(zapytanie, await pobierzWersje()) : await wniosekDoPracodawcy(kod, zapytanie);
    return new Response(new Uint8Array(wynik.pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${kod}.pdf"`,
        'Cache-Control': 'no-store',
        'x-do-uzupelnienia': encodeURIComponent(JSON.stringify(wynik.doUzupelnienia)),
      },
    });
  } catch (e) {
    if (e instanceof BladDanych || e instanceof BladWniosku) return blad(e.message, 400);
    console.error(e);
    return blad('Błąd serwera przy tworzeniu wniosku.', 500);
  }
}
