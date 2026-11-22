import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AKTY, aktyWPrzepisie, statusAktow, wyczyscPamiecEli } from '../eli';

function odpowiedz(cialo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cialo), { status, headers: { 'content-type': 'application/json' } });
}

function skroty(przepis: string): string[] {
  return aktyWPrzepisie(przepis).map((a) => a.skrot);
}

beforeEach(() => {
  wyczyscPamiecEli();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('aktyWPrzepisie', () => {
  it('rozpoznaje KP i UZ w jednym napisie', () => {
    expect(skroty('KP art. 180 § 1; UZ art. 29 ust. 3')).toEqual(['KP', 'UZ']);
  });

  it('nie rozpoznaje aktu w założeniu zespołu', () => {
    expect(aktyWPrzepisie('założenie zespołu')).toEqual([]);
    expect(aktyWPrzepisie('do potwierdzenia')).toEqual([]);
  });

  it('rozpoznaje ustawę o PIT (tekst jednolity w nawiasie nie dubluje aktu)', () => {
    expect(skroty('ustawa o PIT art. 34 ust. 3 (Dz.U. 2026 poz. 592)')).toEqual(['ustawa o PIT']);
  });

  it('rozpoznaje ustawę o świadczeniach rodzinnych', () => {
    expect(skroty('ustawa o świadczeniach rodzinnych art. 6')).toEqual(['ustawa o świadczeniach rodzinnych']);
  });

  it('rozpoznaje akty z samego adresu publikacyjnego', () => {
    expect(skroty('rozporządzenie RM z 14.09.2026, Dz.U. 2026 poz. 1213; stosowane w UZ art. 45 ust. 1')).toEqual([
      'UZ',
      'Dz.U. 2026 poz. 1213',
    ]);
    expect(skroty('komunikat Prezesa ZUS z 5.11.2026, M.P. 2026 poz. 1120')).toEqual(['M.P. 2026 poz. 1120']);
  });

  it('każdy akt ma identyfikator ELI i adres ISAP', () => {
    for (const akt of AKTY) {
      expect(akt.eli).toMatch(/^(DU|MP)\/\d{4}\/\d+$/);
      expect(akt.adres).toMatch(/^https:\/\/isap\.sejm\.gov\.pl\//);
    }
  });
});

describe('statusAktow', () => {
  it('IN_FORCE daje obowiazuje: true i tytuł', async () => {
    const f = vi.fn<typeof fetch>(async () => odpowiedz({ inForce: 'IN_FORCE', title: 'X' }));
    const wynik = await statusAktow(f as unknown as typeof fetch);
    expect(wynik).toHaveLength(AKTY.length);
    expect(wynik[0]).toMatchObject({ obowiazuje: true, tytul: 'X' });
    expect(typeof wynik[0].sprawdzono).toBe('string');
    expect(f).toHaveBeenCalledTimes(AKTY.length);
    expect(String(f.mock.calls[0][0])).toMatch(/^https:\/\/api\.sejm\.gov\.pl\/eli\/acts\/(DU|MP)\/\d+\/\d+$/);
  });

  it('inna wartość inForce daje false', async () => {
    const f = async () => odpowiedz({ inForce: 'NOT_IN_FORCE', title: 'Y' });
    const wynik = await statusAktow(f as unknown as typeof fetch);
    expect(wynik.every((s) => s.obowiazuje === false)).toBe(true);
  });

  it('błąd HTTP, wyjątek i niepoprawna treść dają null', async () => {
    const f500 = async () => odpowiedz({ blad: 1 }, 500);
    expect((await statusAktow(f500 as unknown as typeof fetch)).every((s) => s.obowiazuje === null)).toBe(true);
    wyczyscPamiecEli();
    const frzuca = async () => {
      throw new Error('brak sieci');
    };
    expect((await statusAktow(frzuca as unknown as typeof fetch)).every((s) => s.obowiazuje === null)).toBe(true);
    wyczyscPamiecEli();
    const fsmieci = async () => new Response('to nie json', { status: 200 });
    expect((await statusAktow(fsmieci as unknown as typeof fetch)).every((s) => s.obowiazuje === null)).toBe(true);
  });

  it('brak odpowiedzi w limicie czasu daje null', async () => {
    vi.useFakeTimers();
    const wisi = () => new Promise<Response>(() => {});
    const obietnica = statusAktow(wisi as unknown as typeof fetch);
    await vi.advanceTimersByTimeAsync(3100);
    const wynik = await obietnica;
    expect(wynik.every((s) => s.obowiazuje === null)).toBe(true);
  });

  it('drugie wywołanie w czasie ważności pamięci nie woła fetcha', async () => {
    const f = vi.fn(async () => odpowiedz({ inForce: 'IN_FORCE', title: 'X' }));
    await statusAktow(f as unknown as typeof fetch);
    const razem = f.mock.calls.length;
    const drugi = await statusAktow(f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(razem);
    expect(drugi.every((s) => s.obowiazuje === true)).toBe(true);
  });

  it('po upływie ważności pamięci pyta ponownie', async () => {
    vi.useFakeTimers();
    const f = vi.fn(async () => odpowiedz({ inForce: 'IN_FORCE', title: 'X' }));
    await statusAktow(f as unknown as typeof fetch);
    const razem = f.mock.calls.length;
    vi.setSystemTime(Date.now() + 7 * 60 * 60 * 1000);
    await statusAktow(f as unknown as typeof fetch);
    expect(f.mock.calls.length).toBe(razem * 2);
  });

  it('niepowodzenie nie jest pamiętane długo: po minucie pyta ponownie', async () => {
    vi.useFakeTimers();
    const f = vi.fn(async () => odpowiedz({}, 503));
    await statusAktow(f as unknown as typeof fetch);
    const razem = f.mock.calls.length;
    vi.setSystemTime(Date.now() + 61 * 1000);
    await statusAktow(f as unknown as typeof fetch);
    expect(f.mock.calls.length).toBe(razem * 2);
  });
});
