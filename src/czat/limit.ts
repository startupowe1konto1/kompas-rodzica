/**
 * Limit pytań do ZuSika: chroni przed zasypaniem czatu pytaniami (koszt Claude API).
 * Okno przesuwne w pamięci serwera: osobno na adres IP i łącznie na instancję.
 *
 * To limit miękki: na hostingu bezserwerowym każda instancja liczy osobno, a po restarcie licznik się zeruje.
 * Twardą granicą kosztów jest limit wydatków ustawiony w konsoli Anthropic.
 * Adresów IP nie zapisujemy ani nie logujemy – żyją tylko w tej mapie, do końca okna.
 */

export interface UstawieniaLimitu {
  /** Ile pytań z jednego adresu w oknie `oknoKluczaMs`. */
  naKlucz: number;
  oknoKluczaMs: number;
  /** Ile pytań łącznie w oknie `oknoGlobalneMs`. */
  globalnie: number;
  oknoGlobalneMs: number;
}

export type WynikLimitu = { ok: true } | { ok: false; sprobujZaS: number };

/** Górna granica liczby pamiętanych adresów (ochrona pamięci serwera). */
const MAKS_ADRESOW = 10_000;

export class LimitZapytan {
  private readonly adresy = new Map<string, number[]>();
  private globalne: number[] = [];

  constructor(
    private readonly u: UstawieniaLimitu,
    private readonly zegar: () => number = Date.now,
  ) {}

  /** Sprawdza i – gdy wolno – zapisuje pytanie. Odmowa nie zużywa limitu. */
  sprawdz(klucz: string): WynikLimitu {
    const teraz = this.zegar();
    this.globalne = this.globalne.filter((t) => teraz - t < this.u.oknoGlobalneMs);
    const zAdresu = (this.adresy.get(klucz) ?? []).filter((t) => teraz - t < this.u.oknoKluczaMs);

    if (this.globalne.length >= this.u.globalnie) {
      return { ok: false, sprobujZaS: Math.ceil((this.globalne[0] + this.u.oknoGlobalneMs - teraz) / 1000) };
    }
    if (zAdresu.length >= this.u.naKlucz) {
      this.adresy.set(klucz, zAdresu);
      return { ok: false, sprobujZaS: Math.ceil((zAdresu[0] + this.u.oknoKluczaMs - teraz) / 1000) };
    }

    if (!this.adresy.has(klucz) && this.adresy.size >= MAKS_ADRESOW) this.sprzatnij(teraz);
    zAdresu.push(teraz);
    this.adresy.set(klucz, zAdresu);
    this.globalne.push(teraz);
    return { ok: true };
  }

  private sprzatnij(teraz: number): void {
    for (const [k, czasy] of this.adresy) {
      if (czasy.every((t) => teraz - t >= this.u.oknoKluczaMs)) this.adresy.delete(k);
    }
    // Nadal pełno: usuwamy najstarsze wpisy (Map trzyma kolejność dodania).
    for (const k of this.adresy.keys()) {
      if (this.adresy.size < MAKS_ADRESOW) break;
      this.adresy.delete(k);
    }
  }
}

/** Adres klienta: na Vercelu pierwszy z `x-forwarded-for`. */
export function adresKlienta(request: Request): string {
  const przekazany = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return przekazany || request.headers.get('x-real-ip')?.trim() || 'nieznany';
}

const GODZINA = 3_600_000;
const liczbaDodatnia = (x: string | undefined, domyslna: number): number => {
  const n = Number(x);
  return Number.isInteger(n) && n > 0 ? n : domyslna;
};

/**
 * Domyślnie 60 pytań na godzinę z adresu (na hackathonie jury i zespół mają często wspólny adres sieci)
 * i 500 na dobę łącznie. Zmiana: ZUSIK_LIMIT_NA_GODZINE, ZUSIK_LIMIT_NA_DOBE.
 */
export function limityZeZmiennych(env: Record<string, string | undefined>): UstawieniaLimitu {
  return {
    naKlucz: liczbaDodatnia(env.ZUSIK_LIMIT_NA_GODZINE, 60),
    oknoKluczaMs: GODZINA,
    globalnie: liczbaDodatnia(env.ZUSIK_LIMIT_NA_DOBE, 500),
    oknoGlobalneMs: 24 * GODZINA,
  };
}

let limit: LimitZapytan | undefined;

/** Wspólny limit dla trasy /api/chat (jeden na instancję serwera). */
export function limitCzatu(): LimitZapytan {
  limit ??= new LimitZapytan(limityZeZmiennych(process.env));
  return limit;
}

/** Dla testów i po zmianie zmiennych środowiskowych. */
export function zresetujLimitCzatu(): void {
  limit = undefined;
}
