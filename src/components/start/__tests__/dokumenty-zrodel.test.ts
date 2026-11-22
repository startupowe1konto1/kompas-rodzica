import { describe, expect, it } from 'vitest';
import type { DokumentZrodla, Rodzina } from '../../../engine/types';
import { PERSONY } from '../../../mocks/persony';
import { dokumentyZrodla } from '../../../mocks/zrodla';
import { formatujKwote, formatujOkres } from '../../format';
import { opisyDokumentow, saldoZaleglosci } from '../dokumenty-zrodel';

const monika = PERSONY.find((p) => p.id === 'monika-firma-zaleglosc')!.rodzina;
const anna = PERSONY.find((p) => p.id === 'anna-etat')!.rodzina;
const marta = PERSONY.find((p) => p.id === 'marta-i-piotr')!.rodzina;

describe('saldoZaleglosci', () => {
  it('czyta saldo zaległości z tytułu wskazanego ścieżką', () => {
    expect(saldoZaleglosci('osoby[0].tytuly[0].zadluzenieSkladkowe', monika)).toEqual({ kwota: 1840.37, naDzien: '2026-11-21' });
  });

  it('bez takiego pola: brak salda', () => {
    expect(saldoZaleglosci('osoby[0].tytuly[0].zadluzenieSkladkowe', anna)).toBeUndefined();
    expect(saldoZaleglosci('zdarzenie.data', monika)).toBeUndefined();
  });
});

describe('opisyDokumentow', () => {
  it('zaświadczenie o zadłużeniu: saldo z eZUS i kiedy ZUS wystawi zaświadczenie na dzień powstania prawa', () => {
    const [zasw] = opisyDokumentow(
      dokumentyZrodla('ezus', monika, 0).filter((d) => d.kod === 'zaswiadczenie_o_zadluzeniu'),
      monika,
    );
    expect(zasw.kod).toBe('zaswiadczenie_o_zadluzeniu');
    expect(zasw.status).toBe('oczekuje');
    expect(zasw.szczegoly.join(' ')).toContain(formatujKwote(1840.37));
    expect(zasw.szczegoly.join(' ')).toContain('21 listopada 2026');
    expect(zasw.szczegoly.join(' ')).toContain('12 stycznia 2027');
    expect(zasw.szczegoly.join(' ')).toContain('13 stycznia 2027');
  });

  it('dokument wystawiony: data, na którą podaje dane', () => {
    const dok: DokumentZrodla = {
      kod: 'potwierdzenie_danych_z_zus',
      nazwa: 'Potwierdzenie z danymi z ZUS',
      zrodlo: 'ezus',
      naDzien: '2026-11-21',
      status: 'wystawione',
      sciezki: [],
    };
    const [opis] = opisyDokumentow([dok], anna as Rodzina);
    expect(opis.status).toBe('wystawione');
    expect(opis.szczegoly.join(' ')).toContain('21 listopada 2026');
  });

  it('kolejność: najpierw zaświadczenie o zadłużeniu', () => {
    const kody = opisyDokumentow(dokumentyZrodla('ezus', monika, 0), monika).map((d) => d.kod);
    expect(kody[0]).toBe('zaswiadczenie_o_zadluzeniu');
    expect(kody).toContain('potwierdzenie_danych_z_zus');
  });

  it('e-ZLA: podgląd każdego zwolnienia z okresem i informacją o kodzie B (ciąża)', () => {
    const ezla = opisyDokumentow(dokumentyZrodla('ezus', marta, 0), marta).find((d) => d.kod === 'e_zla');
    expect(ezla).toBeDefined();
    const tekst = ezla!.szczegoly.join(' | ');
    expect(tekst).toContain(formatujOkres('2026-11-02', '2026-11-08'));
    expect(tekst).toContain(formatujOkres('2025-03-03', '2025-04-04'));
    // Zwolnienie w ciąży ma kod B, pozostałe nie.
    const wCiazy = ezla!.szczegoly.find((t) => t.includes(formatujOkres('2026-11-02', '2026-11-08')))!;
    expect(wCiazy).toContain('kod B');
    const zwykle = ezla!.szczegoly.find((t) => t.includes(formatujOkres('2025-03-03', '2025-04-04')))!;
    expect(zwykle).toContain('bez kodu B');
    // Najnowsze zwolnienie na górze.
    expect(ezla!.szczegoly.findIndex((t) => t === wCiazy)).toBeLessThan(ezla!.szczegoly.findIndex((t) => t === zwykle));
  });
});
