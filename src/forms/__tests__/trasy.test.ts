/** Trasy REST toru D: POST /api/forms/{kod} i POST /api/forms/odczyt. */
import { describe, expect, it, vi } from 'vitest';
import { POST as postWniosek } from '@/app/api/forms/[kod]/route';
import { POST as postOdczyt } from '@/app/api/forms/odczyt/route';
import type { OdpowiedzOdczytuWniosku } from '../../engine/types';
import { wypelnijZAM } from '../zam';
import { para, wzorzec } from './dane';

vi.setConfig({ testTimeout: 30_000 });

function zapytanieWniosku(kod: string, cialo: unknown) {
  const request = new Request(`http://localhost/api/forms/${kod}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof cialo === 'string' ? cialo : JSON.stringify(cialo),
  });
  return postWniosek(request, { params: Promise.resolve({ kod }) });
}

function zapytanieOdczytu(plik?: { bajty: Uint8Array; nazwa: string; typ: string }) {
  const fd = new FormData();
  if (plik) fd.append('plik', new Blob([new Uint8Array(plik.bajty)], { type: plik.typ }), plik.nazwa);
  return postOdczyt(new Request('http://localhost/api/forms/odczyt', { method: 'POST', body: fd }));
}

describe('POST /api/forms/{kod}', () => {
  it('ZAM: PDF i lista braków w nagłówku x-do-uzupelnienia', async () => {
    const odp = await zapytanieWniosku('ZAM', wzorzec());
    expect(odp.status).toBe(200);
    expect(odp.headers.get('Content-Type')).toBe('application/pdf');
    const braki = JSON.parse(decodeURIComponent(odp.headers.get('x-do-uzupelnienia')!)) as string[];
    expect(braki.join('\n')).toMatch(/PESEL/);
    const bajty = new Uint8Array(await odp.arrayBuffer());
    expect(new TextDecoder().decode(bajty.subarray(0, 5))).toBe('%PDF-');
  });

  it('wniosek do pracodawcy (rodzicielski): PDF', async () => {
    const odp = await zapytanieWniosku('wniosek_rodzicielski', para('mama', 'r1'));
    expect(odp.status).toBe(200);
    expect(odp.headers.get('Content-Type')).toBe('application/pdf');
    expect(odp.headers.get('x-do-uzupelnienia')).not.toBeNull();
  });

  it('wniosek o urlop na warunkach macierzyńskiego (przysposobienie): PDF', async () => {
    const z = wzorzec();
    z.rodzina.osoby[0].rola = 'przyjmujacy';
    z.rodzina.zdarzenie = { typ: 'przysposobienie', data: '2026-10-05', przewidywana: false, dzieci: [{ dataUrodzenia: '2022-06-01' }] };
    z.plan.odcinki = [{ id: 'w1', osobaId: 'mama', typ: 'na_warunkach_macierzynskiego', od: '2026-10-05', do: '2026-12-06' }];
    const odp = await zapytanieWniosku('wniosek_na_warunkach_macierzynskiego', z);
    expect(odp.status).toBe(200);
    expect(odp.headers.get('Content-Type')).toBe('application/pdf');
    const braki = JSON.parse(decodeURIComponent(odp.headers.get('x-do-uzupelnienia')!)) as string[];
    expect(braki.join('\n')).toMatch(/[Ii]mię i nazwisko dziecka/);
  });

  it('wniosek o urlop na warunkach macierzyńskiego przy porodzie: 400', async () => {
    const odp = await zapytanieWniosku('wniosek_na_warunkach_macierzynskiego', wzorzec());
    expect(odp.status).toBe(400);
    expect((await odp.json()).blad).toBeTruthy();
  });

  it('dokument, którego nie generujemy (Z-3 wypełnia płatnik): 404', async () => {
    const odp = await zapytanieWniosku('Z-3', wzorzec());
    expect(odp.status).toBe(404);
    expect((await odp.json()).blad).toBeTruthy();
  });

  it('złe dane: niepoprawny JSON, brak pola, nieznana osoba – 400 z komunikatem', async () => {
    expect((await zapytanieWniosku('ZAM', '{nie json')).status).toBe(400);
    const { osobaId: _bez, ...bezOsoby } = wzorzec();
    void _bez;
    const odp = await zapytanieWniosku('ZAM', bezOsoby);
    expect(odp.status).toBe(400);
    expect((await odp.json()).blad).toMatch(/osobaId/);
    const nieznana = await zapytanieWniosku('ZAM', { ...wzorzec(), osobaId: 'ktos' });
    expect(nieznana.status).toBe(400);
  });
});

describe('POST /api/forms/odczyt', () => {
  it('wypełniony ZAM: odczytane dane', async () => {
    const { pdf } = await wypelnijZAM(para('mama'));
    const odp = await zapytanieOdczytu({ bajty: pdf, nazwa: 'ZAM.pdf', typ: 'application/pdf' });
    expect(odp.status).toBe(200);
    const w = (await odp.json()) as OdpowiedzOdczytuWniosku;
    expect(w.rozpoznano).toBe(true);
    expect(w.osoba?.dane?.pesel).toBe('94051212345');
  });

  it('brak pliku: 400', async () => {
    const odp = await zapytanieOdczytu();
    expect(odp.status).toBe(400);
    expect((await odp.json()).blad).toBeTruthy();
  });

  it('plik, który nie jest PDF-em: 400', async () => {
    const odp = await zapytanieOdczytu({ bajty: new TextEncoder().encode('zwykły tekst'), nazwa: 'a.txt', typ: 'text/plain' });
    expect(odp.status).toBe(400);
    expect((await odp.json()).blad).toMatch(/PDF/);
  });

  it('uszkodzony PDF: 400 z komunikatem', async () => {
    const bajty = new TextEncoder().encode('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF');
    const odp = await zapytanieOdczytu({ bajty, nazwa: 'zly.pdf', typ: 'application/pdf' });
    expect(odp.status).toBe(400);
    expect((await odp.json()).blad).toMatch(/uszkodzony/);
  });

  it('za duży plik (ponad 10 MB): 413', async () => {
    const bajty = new Uint8Array(10 * 1024 * 1024 + 1);
    bajty.set(new TextEncoder().encode('%PDF-1.7\n'));
    const odp = await zapytanieOdczytu({ bajty, nazwa: 'duzy.pdf', typ: 'application/pdf' });
    expect(odp.status).toBe(413);
  });

  it('zapytanie bez multipart/form-data: 400', async () => {
    const odp = await postOdczyt(new Request('http://localhost/api/forms/odczyt', { method: 'POST', body: '{}' }));
    expect(odp.status).toBe(400);
  });
});
