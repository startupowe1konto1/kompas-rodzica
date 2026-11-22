import { describe, expect, it } from 'vitest';
import { tekstyWysylki } from '../wysylka';

describe('tekstyWysylki – przycisk i potwierdzenie zależnie od adresata wniosku', () => {
  it('wniosek do pracodawcy: wysyłka do pracodawcy, nie do eZUS', () => {
    const t = tekstyWysylki('pracodawca');
    expect(t.przycisk).toBe('Wyślij do pracodawcy (symulacja)');
    expect(t.naglowek).toContain('pracodawcy');
    expect(t.przycisk).not.toContain('eZUS');
  });

  it('wniosek do ZUS: złożenie w eZUS', () => {
    expect(tekstyWysylki('ZUS').przycisk).toBe('Złóż w eZUS (symulacja)');
  });

  it('wniosek do płatnika (np. zleceniodawcy): wysyłka do płatnika', () => {
    const t = tekstyWysylki('platnik');
    expect(t.przycisk).toBe('Wyślij do płatnika (symulacja)');
    expect(t.naglowek).toContain('płatnika');
  });

  it('w każdym przypadku jasno: to tylko pokaz, nic nie zostało wysłane', () => {
    for (const g of ['pracodawca', 'ZUS', 'platnik'] as const) {
      expect(tekstyWysylki(g).opis).toContain('Nic nie zostało wysłane');
    }
  });
});
