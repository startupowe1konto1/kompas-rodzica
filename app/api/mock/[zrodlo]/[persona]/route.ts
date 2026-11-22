// GET /api/mock/{zrodlo}/{persona} – symulowana odpowiedź usługi (mobywatel, ezus, …). Właściciel: tor D.
// Usługa zwraca tylko to, co naprawdę ma według docs/zrodla-danych.json (src/mocks/zrodla.ts).
// Opcjonalnie ?osoba=<id osoby w personie> – gdy loguje się druga osoba (np. tata w parze); domyślnie pierwsza.
// Odpowiedź ma też `dokumenty` (zaświadczenie o zadłużeniu, potwierdzenie z danymi z ZUS, odpis aktu) ze statusem
// „oczekuje” albo „wystawione” na dzień analizy, a mObywatel u małżeństwa – dane małżonka w `osoby`.
// Błędy: { blad } z kodem 400 (nieznane źródło albo źródło, które nie jest e-usługą) lub 404 (persona, osoba).
import type { ZrodloId } from '@/src/engine/types';
import { BladSymulacji, odpowiedzZrodla } from '@/src/mocks/zrodla';

export async function GET(request: Request, { params }: { params: Promise<{ zrodlo: string; persona: string }> }) {
  const { zrodlo, persona } = await params;
  const osoba = new URL(request.url).searchParams.get('osoba') ?? undefined;
  try {
    return Response.json(odpowiedzZrodla(zrodlo as ZrodloId, persona, osoba));
  } catch (e) {
    if (e instanceof BladSymulacji) return Response.json({ blad: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ blad: 'Błąd serwera przy symulacji źródła danych.' }, { status: 500 });
  }
}
