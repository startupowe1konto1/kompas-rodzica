// /api/chat – ZuSik, czat „Zapytaj o swój plan” (funkcja z AI). Właściciel: Oskar.
// GET  → { dostepny } – czy jest klucz API (bez niego UI nie pokazuje przycisku).
// POST → { kod, odpowiedz, zrodla, propozycja?, zapytajZus } dla { rodzina, plan, pytanie, historia? }.
import type { DostepnoscCzatu, ZapytanieCzatu } from '@/src/engine/types';
import { czatDostepny, czyBladModelu, klientModelu } from '@/src/czat/model';
import { adresKlienta, limitCzatu } from '@/src/czat/limit';
import { rozmawiaj, sprawdzZapytanie } from '@/src/czat/rozmowa';
import { BladDanych, wymagaj } from '@/src/server/http';
import { pobierzWersje } from '@/src/server/magazynParametrow';

// Odpowiedź modelu z narzędziami trwa zwykle kilka–kilkanaście sekund.
export const maxDuration = 60;

/** Rodzina i plan w kształcie, którego potrzebuje silnik (ta sama kontrola co w innych trasach). */
function czyPelnyProfil(z: ZapytanieCzatu): boolean {
  if (z.rodzina == null || z.plan == null || !Array.isArray((z.plan as { odcinki?: unknown }).odcinki)) return false;
  try {
    wymagaj<ZapytanieCzatu>(z, ['rodzina', 'plan']);
    return true;
  } catch (e) {
    if (e instanceof BladDanych) return false;
    throw e;
  }
}

const NIEDOSTEPNY = 'ZuSik jest teraz niedostępny. Reszta aplikacji działa normalnie.';

export async function GET(): Promise<Response> {
  return Response.json({ dostepny: czatDostepny() } satisfies DostepnoscCzatu);
}

export async function POST(request: Request): Promise<Response> {
  const wyslij = klientModelu();
  if (!wyslij) return Response.json({ blad: NIEDOSTEPNY }, { status: 503 });

  let cialo: unknown;
  try {
    cialo = await request.json();
  } catch {
    return Response.json({ blad: 'Treść zapytania nie jest poprawnym JSON-em.' }, { status: 400 });
  }
  try {
    const z = wymagaj<ZapytanieCzatu>(cialo, ['pytanie']);
    // ZuSik działa niezależnie od ankiety: gdy profil jest pusty albo niepełny (np. bez daty porodu),
    // nie liczymy wyniku (plan = null), a ZuSik podpowiada dokończenie ankiety. Rodzinę zostawiamy
    // tylko do usunięcia z pytania danych osobowych, które rodzic już wpisał.
    if (!czyPelnyProfil(z)) {
      z.plan = null;
      if (typeof z.rodzina !== 'object' || Array.isArray(z.rodzina)) z.rodzina = null;
    }
    // Limit liczymy dopiero dla poprawnego pytania – błędne zapytanie go nie zużywa.
    sprawdzZapytanie(z);
    const limit = limitCzatu().sprawdz(adresKlienta(request));
    if (!limit.ok) {
      const minuty = Math.max(1, Math.ceil(limit.sprobujZaS / 60));
      return Response.json(
        { blad: `ZuSik dostał teraz bardzo dużo pytań. Proszę spróbować ponownie za ${minuty} min. Reszta aplikacji działa normalnie.` },
        { status: 429, headers: { 'Retry-After': String(limit.sprobujZaS) } },
      );
    }
    const dziennik = process.env.NODE_ENV === 'development' ? (w: Record<string, unknown>) => console.info('[zusik]', JSON.stringify(w)) : undefined;
    return Response.json(await rozmawiaj(z, await pobierzWersje(), wyslij, { dziennik }));
  } catch (e) {
    if (e instanceof BladDanych) return Response.json({ blad: e.message }, { status: 400 });
    console.error(e);
    if (czyBladModelu(e)) return Response.json({ blad: NIEDOSTEPNY }, { status: 503 });
    return Response.json({ blad: 'Błąd serwera przy odpowiedzi czatu.' }, { status: 500 });
  }
}
