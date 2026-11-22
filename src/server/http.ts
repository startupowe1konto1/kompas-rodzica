/** Wspólna obsługa zapytań REST: parsowanie JSON, błędy w jednym formacie { blad }. Właściciel: integrator. */

import { czyPoprawna } from '../engine/daty';

/** Rzuć, gdy zapytanie ma złe albo niepełne dane – klient dostanie status 400. */
export class BladDanych extends Error {}

const jestObiektem = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const jestData = (x: unknown): boolean => typeof x === 'string' && czyPoprawna(x);

/**
 * Minimalny kształt `Rodzina`, bez którego silnik nie policzy wyniku. Sprawdzamy go przed wywołaniem
 * silnika, żeby niepełne dane od klienta dawały 400 z opisem, a nie 500.
 */
function sprawdzRodzine(r: unknown): void {
  if (!jestObiektem(r)) throw new BladDanych('Pole "rodzina" musi być obiektem.');
  if (!Array.isArray(r.osoby)) throw new BladDanych('Pole "rodzina.osoby" musi być listą.');
  r.osoby.forEach((o, i) => {
    if (!jestObiektem(o) || typeof o.id !== 'string' || typeof o.rola !== 'string' || !Array.isArray(o.tytuly)) {
      throw new BladDanych(`Osoba nr ${i + 1} musi mieć "id", "rola" i listę "tytuly".`);
    }
  });
  const z = r.zdarzenie;
  if (!jestObiektem(z)) throw new BladDanych('Brakuje pola "rodzina.zdarzenie".');
  if (typeof z.typ !== 'string') throw new BladDanych('Brakuje pola "rodzina.zdarzenie.typ".');
  if (!jestData(z.data)) throw new BladDanych('Pole "rodzina.zdarzenie.data" musi być datą RRRR-MM-DD.');
  if (!Array.isArray(z.dzieci)) throw new BladDanych('Pole "rodzina.zdarzenie.dzieci" musi być listą.');
  if (!jestData(r.dataAnalizy)) throw new BladDanych('Pole "rodzina.dataAnalizy" musi być datą RRRR-MM-DD.');
}

export function wymagaj<T extends object>(cialo: unknown, pola: (keyof T & string)[]): T {
  if (typeof cialo !== 'object' || cialo === null) throw new BladDanych('Treść zapytania musi być obiektem JSON.');
  for (const pole of pola) {
    if (!(pole in cialo)) throw new BladDanych(`Brakuje pola "${pole}".`);
  }
  if (pola.includes('rodzina' as keyof T & string)) sprawdzRodzine((cialo as Record<string, unknown>).rodzina);
  return cialo as T;
}

export async function obsluz<T>(request: Request, fn: (cialo: unknown) => T | Promise<T>): Promise<Response> {
  let cialo: unknown;
  try {
    cialo = await request.json();
  } catch {
    return Response.json({ blad: 'Treść zapytania nie jest poprawnym JSON-em.' }, { status: 400 });
  }
  try {
    return Response.json(await fn(cialo));
  } catch (e) {
    if (e instanceof BladDanych) return Response.json({ blad: e.message }, { status: 400 });
    console.error(e);
    return Response.json({ blad: 'Błąd serwera przy liczeniu wyniku.' }, { status: 500 });
  }
}

export function nieZaimplementowano(co: string): Response {
  return Response.json({ blad: `Jeszcze niegotowe: ${co}.` }, { status: 501 });
}
