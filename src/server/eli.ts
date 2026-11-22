// Status aktów prawnych z API ELI Sejmu (https://api.sejm.gov.pl/eli). Warstwa serwera, nie silnik.
// Wywołania z limitem czasu; wynik trzymany w pamięci procesu. Gdy API nie odpowiada, status to null.

export interface AktEli {
  /** Skrót używany w mapie przepisy, np. 'KP', 'UZ', 'ustawa o PIT'. */
  skrot: string;
  /** Identyfikator ELI, np. 'DU/1999/636'. */
  eli: string;
  /** Adres do otwarcia przez człowieka (strona aktu w ISAP). */
  adres: string;
}

interface Rozpoznawany extends AktEli {
  wzorzec: RegExp;
}

const ISAP = 'https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=';

/**
 * Identyfikatory sprawdzone w API ELI 21.11.2026 (pole `address` = identyfikator w ISAP).
 * Ustawy: akt podstawowy (tekst jednolity ma osobną pozycję, ale metadane aktu podstawowego mówią o obowiązywaniu).
 */
const ROZPOZNAWANE: Rozpoznawany[] = [
  { skrot: 'KP', eli: 'DU/1974/141', adres: `${ISAP}WDU19740240141`, wzorzec: /\bKP\b/ },
  { skrot: 'UZ', eli: 'DU/1999/636', adres: `${ISAP}WDU19990600636`, wzorzec: /\bUZ\b/ },
  { skrot: 'ustawa o PIT', eli: 'DU/1991/350', adres: `${ISAP}WDU19910800350`, wzorzec: /ustaw\p{L}* o PIT/u },
  {
    skrot: 'ustawa o świadczeniach rodzinnych',
    eli: 'DU/2003/2255',
    adres: `${ISAP}WDU20032282255`,
    wzorzec: /ustaw\p{L}* o świadczeniach rodzinnych/u,
  },
  { skrot: 'Dz.U. 2025 poz. 1242', eli: 'DU/2025/1242', adres: `${ISAP}WDU20250001242`, wzorzec: /Dz\.U\. 2025 poz\. 1242\b/ },
  { skrot: 'Dz.U. 2026 poz. 26', eli: 'DU/2026/26', adres: `${ISAP}WDU20260000026`, wzorzec: /Dz\.U\. 2026 poz\. 26\b/ },
  { skrot: 'Dz.U. 2026 poz. 62', eli: 'DU/2026/62', adres: `${ISAP}WDU20260000062`, wzorzec: /Dz\.U\. 2026 poz\. 62\b/ },
  { skrot: 'Dz.U. 2026 poz. 1213', eli: 'DU/2026/1213', adres: `${ISAP}WDU20260001213`, wzorzec: /Dz\.U\. 2026 poz\. 1213\b/ },
  { skrot: 'M.P. 2025 poz. 1216', eli: 'MP/2025/1216', adres: `${ISAP}WMP20250001216`, wzorzec: /M\.P\. 2025 poz\. 1216\b/ },
  { skrot: 'M.P. 2026 poz. 1098', eli: 'MP/2026/1098', adres: `${ISAP}WMP20260001098`, wzorzec: /M\.P\. 2026 poz\. 1098\b/ },
  { skrot: 'M.P. 2026 poz. 1120', eli: 'MP/2026/1120', adres: `${ISAP}WMP20260001120`, wzorzec: /M\.P\. 2026 poz\. 1120\b/ },
];

/** Akty, które rozpoznajemy w napisach z mapy przepisy. */
export const AKTY: AktEli[] = ROZPOZNAWANE.map(({ skrot, eli, adres }) => ({ skrot, eli, adres }));

/** Które akty z AKTY występują w napisie przepisu (np. 'KP art. 180 § 1; UZ art. 29 ust. 3' → KP i UZ). */
export function aktyWPrzepisie(przepis: string): AktEli[] {
  return ROZPOZNAWANE.filter((a) => a.wzorzec.test(przepis)).map(({ skrot, eli, adres }) => ({ skrot, eli, adres }));
}

export interface StatusAktu extends AktEli {
  /** true = obowiązuje, false = nie obowiązuje, null = nie udało się sprawdzić (API nie odpowiada). */
  obowiazuje: boolean | null;
  /** Tytuł z metadanych ELI, gdy dostępny. */
  tytul?: string;
  /** Kiedy sprawdzono (ISO, z zegara serwera). */
  sprawdzono?: string;
}

const ADRES_API = 'https://api.sejm.gov.pl/eli/acts/';
const LIMIT_MS = 3000;
const WAZNOSC_OK_MS = 6 * 60 * 60 * 1000;
const WAZNOSC_BLAD_MS = 60 * 1000;

const pamiec = new Map<string, { status: StatusAktu; wazneDo: number }>();

/** Czyści pamięć podręczną (testy). */
export function wyczyscPamiecEli(): void {
  pamiec.clear();
}

async function sprawdz(akt: AktEli, fetchImpl: typeof fetch, limitMs: number): Promise<StatusAktu> {
  const kontroler = new AbortController();
  let zegar: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<null>((resolve) => {
    zegar = setTimeout(() => {
      kontroler.abort();
      resolve(null);
    }, limitMs);
  });
  const zapytanie = (async (): Promise<Pick<StatusAktu, 'obowiazuje' | 'tytul'> | null> => {
    try {
      const odp = await fetchImpl(`${ADRES_API}${akt.eli}`, {
        signal: kontroler.signal,
        headers: { accept: 'application/json' },
      });
      if (!odp.ok) return null;
      const dane: unknown = await odp.json();
      if (typeof dane !== 'object' || dane === null || !('inForce' in dane) || typeof dane.inForce !== 'string') {
        return null;
      }
      const tytul = 'title' in dane && typeof dane.title === 'string' ? dane.title : undefined;
      return { obowiazuje: dane.inForce === 'IN_FORCE', tytul };
    } catch {
      return null;
    }
  })();
  try {
    const wynik = await Promise.race([zapytanie, limit]);
    const sprawdzono = new Date().toISOString();
    return wynik ? { ...akt, ...wynik, sprawdzono } : { ...akt, obowiazuje: null, sprawdzono };
  } finally {
    clearTimeout(zegar);
  }
}

/** Status wszystkich AKTY; zapytania równolegle, każde z limitem czasu. Udane wyniki pamiętane 6 godzin, nieudane minutę. */
export async function statusAktow(fetchImpl: typeof fetch = fetch, limitMs: number = LIMIT_MS): Promise<StatusAktu[]> {
  return Promise.all(
    AKTY.map(async (akt) => {
      const teraz = Date.now();
      const zapamietany = pamiec.get(akt.eli);
      if (zapamietany && zapamietany.wazneDo > teraz) return zapamietany.status;
      const status = await sprawdz(akt, fetchImpl, limitMs);
      const waznosc = status.obowiazuje === null ? WAZNOSC_BLAD_MS : WAZNOSC_OK_MS;
      pamiec.set(akt.eli, { status, wazneDo: Date.now() + waznosc });
      return status;
    }),
  );
}
