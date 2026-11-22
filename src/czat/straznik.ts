/**
 * Strażnik odpowiedzi ZuSika. Model ma tylko tłumaczyć wynik silnika, więc każda kwota w złotych i każdy artykuł
 * w odpowiedzi musi występować w danych z silnika (fakty, wynik „co jeśli”). Jeśli nie – odpowiedzi nie pokazujemy,
 * a rodzic dostaje kontakt do ZUS.
 */

export interface WynikStraznika {
  ok: boolean;
  /** Fragmenty odpowiedzi, których nie ma w danych z silnika, np. '9 999,99 zł' albo 'art. 999'. */
  nieznane: string[];
}

/** Kwota: 8000, 8 000, 6 903,20, 6903.20 (spacje także niełamliwe) + zł / złotych / PLN. */
const KWOTA = /(?<![\d,.])(\d{1,3}(?:[   ]\d{3})+|\d+)(?:[,.](\d{1,2}))?[   ]?(?:zł|złotych|złote|złoty|PLN)(?![\p{L}])/giu;
const ARTYKUL = /art\.[  ]?(\d+[a-z]?)(?![\d])/giu;

/** „4 tys. zł”, „4 tysiące złotych”, „4,5 tys.” – kwota w tysiącach. */
const TYSIACE = /(?<![\d,.])(\d+)(?:[,.](\d{1,3}))?[   ]?(?:tys\.|tysiąc[a-zęy]*|tysięcy)(?![\p{L}])/giu;
/** „70%”, „81,5 %”. */
const PROCENT = /(?<![\d,.])(\d+)(?:[,.](\d{1,2}))?[   ]?%/gu;
const bezTwardychSpacji = (s: string) => s.replace(/[  ]/g, ' ').trim();

function naGrosze(calosc: string, ulamek: string | undefined): number {
  const zl = Number(calosc.replace(/[   ]/g, ''));
  const gr = ulamek === undefined ? 0 : Number(ulamek.padEnd(2, '0'));
  return zl * 100 + gr;
}

function napisyILiczby(x: unknown, napisy: string[], liczby: Set<number>): void {
  if (typeof x === 'number' && Number.isFinite(x)) liczby.add(Math.round(x * 100));
  else if (typeof x === 'string') napisy.push(x);
  else if (Array.isArray(x)) x.forEach((e) => napisyILiczby(e, napisy, liczby));
  else if (typeof x === 'object' && x !== null) Object.values(x).forEach((e) => napisyILiczby(e, napisy, liczby));
}

export function sprawdzOdpowiedz(tekst: string, zrodla: unknown[]): WynikStraznika {
  const napisy: string[] = [];
  const kwoty = new Set<number>();
  napisyILiczby(zrodla, napisy, kwoty);
  // Kwoty zapisane w tekstach silnika (np. „1000 zł” w opisie ryzyka) też są faktami.
  for (const n of napisy) for (const m of n.matchAll(KWOTA)) kwoty.add(naGrosze(m[1], m[2]));
  const artykuly = new Set<string>();
  for (const n of napisy) for (const m of n.matchAll(ARTYKUL)) artykuly.add(m[1].toLowerCase());

  const nieznane: string[] = [];
  for (const m of tekst.matchAll(TYSIACE)) {
    const grosze = Math.round(Number(`${m[1]}.${m[2] ?? '0'}`) * 1000 * 100);
    if (!kwoty.has(grosze)) nieznane.push(bezTwardychSpacji(m[0]));
  }
  for (const m of tekst.matchAll(PROCENT)) {
    // Procent jest w danych jako liczba (70, 81,5) albo jako ułamek (0,7).
    const p = Number(`${m[1]}.${m[2] ?? '0'}`);
    if (!kwoty.has(Math.round(p * 100)) && !kwoty.has(Math.round(p))) nieznane.push(bezTwardychSpacji(m[0]));
  }
  for (const m of tekst.matchAll(KWOTA)) {
    if (!kwoty.has(naGrosze(m[1], m[2]))) nieznane.push(m[0].replace(/[  ]/g, ' ').trim());
  }
  for (const m of tekst.matchAll(ARTYKUL)) {
    if (!artykuly.has(m[1].toLowerCase())) nieznane.push(`art. ${m[1]}`);
  }
  return { ok: nieznane.length === 0, nieznane };
}
