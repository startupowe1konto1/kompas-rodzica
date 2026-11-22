/**
 * Klient REST dla interfejsu (tor C). UI nie importuje silnika – rozmawia z nim tylko przez te funkcje.
 * Właściciel: integrator. Nowa trasa = nowa funkcja tutaj.
 */
import type {
  AkcjaPlanu,
  DostepnoscCzatu,
  KodDokumentu,
  OdpowiedzAkcja,
  OdpowiedzCzatu,
  OdpowiedzOdczytuWniosku,
  OdpowiedzPlanDomyslny,
  OdpowiedzZrodla,
  Parametry,
  PersonaTestowa,
  Plan,
  Rodzina,
  WynikDokumentow,
  WynikKwot,
  WynikUprawnien,
  WynikWalidacji,
  ZapytanieCzatu,
  ZapytanieWniosek,
  ZrodloId,
} from '../engine/types';

export class BladApi extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function zapytaj<T>(sciezka: string, init?: RequestInit): Promise<T> {
  const odp = await fetch(sciezka, init);
  const json = await odp.json().catch(() => ({ blad: 'Serwer zwrócił nieczytelną odpowiedź.' }));
  if (!odp.ok) throw new BladApi(json?.blad ?? `Błąd ${odp.status}`, odp.status);
  return json as T;
}

function post<T>(sciezka: string, cialo: unknown): Promise<T> {
  return zapytaj<T>(sciezka, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cialo),
  });
}

/** Wygenerowany wniosek: plik PDF i lista pól, które rodzic musi jeszcze uzupełnić ręcznie. */
export interface WygenerowanyWniosek {
  pdf: Blob;
  doUzupelnienia: string[];
}

/** Nagłówek `x-do-uzupelnienia`: JSON (lista napisów) zakodowany przez encodeURIComponent. */
export function odczytajDoUzupelnienia(naglowek: string | null): string[] {
  if (!naglowek) return [];
  try {
    const lista: unknown = JSON.parse(decodeURIComponent(naglowek));
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function bladZOdpowiedzi(odp: Response): Promise<BladApi> {
  const json = await odp.json().catch(() => undefined);
  return new BladApi(json?.blad ?? `Błąd ${odp.status}`, odp.status);
}

/** POST /api/forms/{kod} – odpowiedzią jest PDF, braki w nagłówku `x-do-uzupelnienia`. */
async function wniosek(kod: KodDokumentu, zapytanie: ZapytanieWniosek): Promise<WygenerowanyWniosek> {
  const odp = await fetch(`/api/forms/${encodeURIComponent(kod)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(zapytanie),
  });
  if (!odp.ok) throw await bladZOdpowiedzi(odp);
  return { pdf: await odp.blob(), doUzupelnienia: odczytajDoUzupelnienia(odp.headers.get('x-do-uzupelnienia')) };
}

/** POST /api/forms/odczyt – wgrany wniosek PDF (multipart, pole „plik”). Content-Type ustawia przeglądarka. */
function odczytajWniosek(plik: Blob): Promise<OdpowiedzOdczytuWniosku> {
  const dane = new FormData();
  dane.append('plik', plik);
  return zapytaj<OdpowiedzOdczytuWniosku>('/api/forms/odczyt', { method: 'POST', body: dane });
}

export const api = {
  uprawnienia: (rodzina: Rodzina) => post<WynikUprawnien>('/api/eligibility', { rodzina }),
  planyDomyslne: (rodzina: Rodzina) => post<OdpowiedzPlanDomyslny>('/api/plan/default', { rodzina }),
  walidujPlan: (rodzina: Rodzina, plan: Plan) => post<WynikWalidacji>('/api/plan/validate', { rodzina, plan }),
  akcja: (rodzina: Rodzina, plan: Plan, akcja: AkcjaPlanu) => post<OdpowiedzAkcja>('/api/plan/action', { rodzina, plan, akcja }),
  /** „Dziecko się urodziło”: `rodzina` ma już nową datę zdarzenia, `poprzedniaData` to data sprzed zmiany. */
  przesunPlan: (rodzina: Rodzina, plan: Plan, poprzedniaData: string) =>
    post<OdpowiedzAkcja>('/api/plan/shift', { rodzina, plan, poprzedniaData }),
  kwoty: (rodzina: Rodzina, plan: Plan) => post<WynikKwot>('/api/calculate', { rodzina, plan }),
  dokumenty: (rodzina: Rodzina, plan: Plan) => post<WynikDokumentow>('/api/documents', { rodzina, plan }),
  persony: () => zapytaj<PersonaTestowa[]>('/api/mock/persony'),
  /** `osobaId` – gdy dane pobiera druga osoba w personie (np. tata w parze); domyślnie pierwsza osoba. */
  zrodlo: (zrodlo: ZrodloId, personaId: string, osobaId?: string) =>
    zapytaj<OdpowiedzZrodla>(
      `/api/mock/${zrodlo}/${personaId}${osobaId === undefined ? '' : `?osoba=${encodeURIComponent(osobaId)}`}`,
    ),
  parametry: () => zapytaj<Parametry[]>('/api/admin/params'),
  /** Wypełniony wniosek (ZAM, wnioski do pracodawcy) jako PDF z listą braków. */
  wniosek,
  /** Dane z wgranego wniosku PDF (edytowalny ZAM) do profilu. Przyjmuje `File` z pola wyboru pliku. */
  odczytajWniosek,
  /** ZuSik: czy czat działa (jest klucz API po stronie serwera). */
  czatDostepny: () => zapytaj<DostepnoscCzatu>('/api/chat'),
  /** ZuSik: odpowiedź na pytanie o wynik i plan. Plan się nie zmienia – „co jeśli” wraca jako `propozycja`. */
  czat: (zapytanie: ZapytanieCzatu) => post<OdpowiedzCzatu>('/api/chat', zapytanie),
};
