/**
 * Treści dla rodzica (tor D, zadanie D6): linki, inne wsparcie, trudne sytuacje, organizacje.
 * Testy sprawdzają strukturę i kody, nie brzmienie tekstów.
 */
import { describe, expect, it } from 'vitest';
import { inneWsparcieDla, INNE_WSPARCIE } from '../inneWsparcie';
import {
  FORMULARZE_ZASILKOWE,
  LINKI,
  LINKI_STOPKA,
  LINKI_WYMAGANE_W_ZADANIU,
  SPRAWDZONO,
  wszystkieAdresy,
  ZAPYTAJ_ZUS,
} from '../linki';
import { organizacjeDla, ORGANIZACJE } from '../organizacje';
import { KOD_DO_POTWIERDZENIA, KODY_SYTUACJI, trudnaSytuacja, TRUDNE_SYTUACJE } from '../trudneSytuacje';

const DATA = /^\d{4}-\d{2}-\d{2}$/;

const adresyTresci = (): string[] => [
  ...wszystkieAdresy(),
  ...INNE_WSPARCIE.flatMap((s) => [s.link, ...s.kwoty.map((k) => k.zrodlo), ...(s.termin ? [s.termin.zrodlo] : [])]),
  ...TRUDNE_SYTUACJE.flatMap((t) => t.coPrzysluguje.flatMap((u) => (u.zrodlo ? [u.zrodlo] : []))),
  ...ORGANIZACJE.flatMap((o) => [o.url, o.potwierdzenie.odpisKrs, o.potwierdzenie.stronaZNumeremKrs]),
];

describe('linki', () => {
  it('każdy adres w treściach zaczyna się od https://', () => {
    const adresy = adresyTresci();
    expect(adresy.length).toBeGreaterThan(50);
    for (const url of adresy) expect(url, url).toMatch(/^https:\/\/[^\s]+$/);
  });

  it('są wszystkie adresy wymagane w opisie zadania ZUS (pkt 3)', () => {
    const urle = LINKI_WYMAGANE_W_ZADANIU.map((k) => LINKI[k].url);
    expect(urle).toEqual(
      expect.arrayContaining([
        'https://www.zus.pl/',
        'https://www.gov.pl/web/rodzina/urlop-rodzicielski',
        'https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo',
        'https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego',
      ]),
    );
  });

  it('stopka ma trzy przekierowania z zadania', () => {
    expect(LINKI_STOPKA.map((k) => LINKI[k].url)).toEqual([
      'https://www.zus.pl/',
      'https://www.gov.pl/web/rodzina/urlop-rodzicielski',
      'https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo',
    ]);
  });

  it('każdy link ma nazwę, opis i datę sprawdzenia', () => {
    for (const [klucz, l] of Object.entries(LINKI)) {
      expect(l.nazwa, klucz).not.toBe('');
      expect(l.opis, klucz).not.toBe('');
      expect(l.sprawdzono, klucz).toMatch(DATA);
    }
  });

  it('formularze zasiłkowe prowadzą do zus.pl, a Z-3 i Z-3a wypełnia płatnik', () => {
    const symbole = FORMULARZE_ZASILKOWE.map((f) => f.symbol);
    expect(symbole).toEqual(expect.arrayContaining(['ZAM', 'Z-3', 'Z-3a', 'ZAS-53']));
    for (const f of FORMULARZE_ZASILKOWE) {
      expect(f.url, f.symbol).toMatch(/^https:\/\/www\.zus\.pl\/wzory-formularzy\//);
      expect(f.aktualizacja, f.symbol).toMatch(DATA);
    }
    for (const s of ['Z-3', 'Z-3a'] as const) {
      expect(FORMULARZE_ZASILKOWE.find((f) => f.symbol === s)?.ktoWypelnia).toBe('platnik');
    }
    expect(FORMULARZE_ZASILKOWE.find((f) => f.symbol === 'ZAM')?.ktoWypelnia).toBe('ubezpieczony');
  });
});

describe('Zapytaj ZUS', () => {
  it('kontakt ma źródło na zus.pl i datę sprawdzenia', () => {
    expect(ZAPYTAJ_ZUS.zrodlo).toMatch(/^https:\/\/www\.zus\.pl\//);
    expect(ZAPYTAJ_ZUS.sprawdzono).toBe(SPRAWDZONO);
    for (const k of ZAPYTAJ_ZUS.kanaly) {
      expect(k.zrodlo, k.nazwa).toMatch(/^https:\/\/www\.zus\.pl\//);
      expect(k.sprawdzono, k.nazwa).toBe('2026-11-21');
      expect(k.href, k.nazwa).toMatch(/^(mailto:|tel:\+48|https:\/\/)/);
    }
  });

  it('jest skrzynka dla rodziców i infolinia z godzinami', () => {
    const rodzaje = ZAPYTAJ_ZUS.kanaly.map((k) => k.rodzaj);
    expect(rodzaje).toContain('email');
    const telefon = ZAPYTAJ_ZUS.kanaly.find((k) => k.rodzaj === 'telefon');
    expect(telefon?.godziny).toBeTruthy();
    expect(ZAPYTAJ_ZUS.kanaly.some((k) => k.href === 'mailto:mama@zus.pl')).toBe(true);
  });
});

describe('inne wsparcie', () => {
  it('są 800+, becikowe, świadczenie rodzicielskie i Aktywny Rodzic', () => {
    expect(INNE_WSPARCIE.map((s) => s.id)).toEqual(
      expect.arrayContaining(['swiadczenie_800_plus', 'becikowe', 'swiadczenie_rodzicielskie', 'aktywny_rodzic']),
    );
  });

  it('każda kwota ma źródło na stronie oficjalnej (zus.pl albo gov.pl)', () => {
    for (const s of INNE_WSPARCIE) {
      expect(s.kwoty.length, s.id).toBeGreaterThan(0);
      for (const k of s.kwoty) expect(k.zrodlo, s.id).toMatch(/^https:\/\/www\.(zus|gov)\.pl\//);
      expect(s.sprawdzono, s.id).toMatch(DATA);
    }
  });

  it('każde świadczenie mówi, kto wypłaca', () => {
    for (const s of INNE_WSPARCIE) expect(['ZUS', 'gmina'], s.id).toContain(s.ktoWyplaca);
  });

  it('świadczenie „Za życiem” pokazujemy tylko przy tej sytuacji', () => {
    expect(inneWsparcieDla().map((s) => s.id)).not.toContain('swiadczenie_za_zyciem');
    expect(inneWsparcieDla(['za_zyciem']).map((s) => s.id)).toContain('swiadczenie_za_zyciem');
  });
});

describe('trudne sytuacje', () => {
  it('jest każda sytuacja z briefu (4.8)', () => {
    expect(TRUDNE_SYTUACJE.map((t) => t.id).sort()).toEqual([...KODY_SYTUACJI].sort());
    for (const kod of KODY_SYTUACJI) expect(trudnaSytuacja(kod)?.id).toBe(kod);
  });

  it('każda sytuacja ma przepis albo oznaczenie „do potwierdzenia w ZUS”', () => {
    for (const t of TRUDNE_SYTUACJE) {
      const przepisy = t.coPrzysluguje.flatMap((u) => u.przepisy);
      expect(przepisy.length > 0 || t.doPotwierdzeniaWZus.length > 0, t.id).toBe(true);
    }
  });

  it('każde uprawnienie ma przepis albo źródło', () => {
    for (const t of TRUDNE_SYTUACJE) {
      for (const u of t.coPrzysluguje) expect(u.przepisy.length > 0 || Boolean(u.zrodlo), t.id).toBe(true);
    }
  });

  it('kody sytuacji są znane, a pierwszy to id', () => {
    for (const t of TRUDNE_SYTUACJE) {
      expect(t.kodySytuacji[0], t.id).toBe(t.id);
      for (const k of t.kodySytuacji) expect(KODY_SYTUACJI, t.id).toContain(k);
    }
  });

  it('każda sytuacja mówi, co zrobić najpierw i jakie dokumenty przygotować', () => {
    for (const t of TRUDNE_SYTUACJE) {
      expect(t.coZrobicNajpierw.length, t.id).toBeGreaterThan(0);
      expect(t.dokumenty.length, t.id).toBeGreaterThan(0);
      for (const l of t.linki) expect(LINKI[l], `${t.id}: ${l}`).toBeDefined();
    }
  });

  it('niejasne kwestie mają kod DO_POTWIERDZENIA_W_ZUS i przepis', () => {
    const pytania = TRUDNE_SYTUACJE.flatMap((t) => t.doPotwierdzeniaWZus);
    expect(pytania.length).toBeGreaterThan(0);
    for (const p of pytania) {
      expect(p.kod).toBe(KOD_DO_POTWIERDZENIA);
      expect(p.przepisy.length).toBeGreaterThan(0);
    }
  });

  it('martwe urodzenie oznacza EC-24 (rodzicielski i ojcowski) jako do potwierdzenia – pytanie 8', () => {
    expect(trudnaSytuacja('martwe')?.doPotwierdzeniaWZus.map((p) => p.numerPytania)).toContain(8);
  });
});

describe('organizacje', () => {
  it('jest 5–10 organizacji, każda z potwierdzeniem w KRS i datą sprawdzenia', () => {
    expect(ORGANIZACJE.length).toBeGreaterThanOrEqual(5);
    expect(ORGANIZACJE.length).toBeLessThanOrEqual(10);
    for (const o of ORGANIZACJE) {
      expect(o.potwierdzenie.krs, o.id).toMatch(/^\d{10}$/);
      expect(o.potwierdzenie.odpisKrs, o.id).toBe(
        `https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/${o.potwierdzenie.krs}?rejestr=S&format=json`,
      );
      expect(o.potwierdzenie.stronaZNumeremKrs, o.id).toMatch(/^https:\/\//);
      expect(o.sprawdzono, o.id).toBe('2026-11-21');
    }
  });

  it('to wyłącznie fundacje albo stowarzyszenia, bez powtórzeń', () => {
    for (const o of ORGANIZACJE) expect(['fundacja', 'stowarzyszenie'], o.id).toContain(o.forma);
    expect(new Set(ORGANIZACJE.map((o) => o.potwierdzenie.krs)).size).toBe(ORGANIZACJE.length);
    expect(new Set(ORGANIZACJE.map((o) => o.id)).size).toBe(ORGANIZACJE.length);
  });

  it('każda ma zakres pomocy i znane kody sytuacji', () => {
    for (const o of ORGANIZACJE) {
      expect(o.zakresPomocy.length, o.id).toBeGreaterThan(0);
      expect(o.sytuacje.length, o.id).toBeGreaterThan(0);
      for (const k of o.sytuacje) expect(KODY_SYTUACJI, o.id).toContain(k);
    }
  });

  it('sytuacje z opisu zadania (pkt 3 i) mają co najmniej jedną organizację', () => {
    for (const kod of ['zgon_dziecka', 'wczesniak', 'poronienie', 'za_zyciem'] as const) {
      expect(organizacjeDla(kod).length, kod).toBeGreaterThan(0);
    }
  });
});
