/**
 * Połączenie ZuSika z Claude API (SDK Anthropic). Klucz tylko w zmiennej środowiskowej ANTHROPIC_API_KEY
 * (.env.local lokalnie, ustawienia projektu na hostingu). Bez klucza czat jest wyłączony, reszta aplikacji działa.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { WyslijDoModelu } from './rozmowa';

/** Czat działa tylko z kluczem w ANTHROPIC_API_KEY. */
export function czatDostepny(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let klient: Anthropic | undefined;

/** Funkcja wysyłająca zapytanie do modelu albo null, gdy nie ma klucza. */
export function klientModelu(): WyslijDoModelu | null {
  if (!czatDostepny()) return null;
  klient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 25_000, maxRetries: 1 });
  const k = klient;
  return (p) => k.beta.messages.create(p);
}

/** Błąd po stronie Claude API (limit, brak sieci, przeciążenie) – nie błąd danych rodzica. */
export function czyBladModelu(e: unknown): boolean {
  return e instanceof Anthropic.APIError;
}
