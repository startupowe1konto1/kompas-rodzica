/**
 * Adapter tras formularzy (tor D). Tymczasowo, do czasu `api.odczytajWniosek/wniosek/ics`
 * od integratora; potem tylko re-eksport. Każdy błąd HTTP to `BladApi` (status 501/404 = „w przygotowaniu”,
 * patrz `funkcjaNiegotowa`). Pliki rodzica idą wyłącznie do naszego API.
 */
import { BladApi } from '../lib/api';
import type { KodDokumentu, OdpowiedzOdczytuWniosku, Plan, Rodzina, ZapytanieWniosek } from '../engine/types';

async function bladZOdpowiedzi(odp: Response): Promise<BladApi> {
  const json = await odp.json().catch(() => null);
  return new BladApi(json?.blad ?? `Błąd ${odp.status}`, odp.status);
}

const JSON_NAGLOWEK = { 'Content-Type': 'application/json' };

export async function odczytajWniosek(plik: File): Promise<OdpowiedzOdczytuWniosku> {
  const dane = new FormData();
  dane.append('plik', plik);
  const odp = await fetch('/api/forms/odczyt', { method: 'POST', body: dane });
  if (!odp.ok) throw await bladZOdpowiedzi(odp);
  return (await odp.json()) as OdpowiedzOdczytuWniosku;
}

export async function pobierzWniosek(
  kod: KodDokumentu,
  z: ZapytanieWniosek,
): Promise<{ pdf: Blob; doUzupelnienia: string[] }> {
  const odp = await fetch(`/api/forms/${kod}`, { method: 'POST', headers: JSON_NAGLOWEK, body: JSON.stringify(z) });
  if (!odp.ok) throw await bladZOdpowiedzi(odp);
  let doUzupelnienia: string[] = [];
  const naglowek = odp.headers.get('x-do-uzupelnienia');
  if (naglowek) {
    try {
      const lista: unknown = JSON.parse(decodeURIComponent(naglowek));
      if (Array.isArray(lista)) doUzupelnienia = lista.filter((x): x is string => typeof x === 'string');
    } catch {
      // Nieczytelny nagłówek: pokazujemy PDF bez listy braków.
    }
  }
  return { pdf: await odp.blob(), doUzupelnienia };
}

export async function pobierzIcs(rodzina: Rodzina, plan: Plan): Promise<Blob> {
  const odp = await fetch('/api/documents/ics', {
    method: 'POST',
    headers: JSON_NAGLOWEK,
    body: JSON.stringify({ rodzina, plan }),
  });
  if (!odp.ok) throw await bladZOdpowiedzi(odp);
  return odp.blob();
}
