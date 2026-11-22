/**
 * Harmonogram wypłat: z wyniku kwot (`WynikKwot`, z REST) i planu buduje wiersze „miesiąc → osoba → świadczenie”.
 * Czysta funkcja, tylko typy z silnika (UI nie woła funkcji silnika).
 *
 * - Kwota brutto miesiąca to `rozbicieMiesieczne` odcinka (silnik liczy ją z dni w miesiącu).
 * - Podwyższenie do kwoty świadczenia rodzicielskiego i szacunek netto silnik podaje za cały odcinek, więc
 *   rozkładamy je na miesiące proporcjonalnie do kwoty brutto miesiąca (metodą największych reszt, w groszach),
 *   żeby suma wierszy była równa kwotom odcinka co do grosza.
 * - Części tego samego świadczenia tej samej osoby z tą samą stawką w jednym miesiącu łączymy w jeden wiersz.
 * - Pomijamy pracę, przerwę, odcinki, których nie ma już w planie, i wiersze z kwotą 0 (np. urlop wychowawczy).
 */
import type { KtoWyplaca, MiesiacISO, Odcinek, Plan, TypOdcinka, WynikKwot } from '../../engine/types';

export interface WierszHarmonogramu {
  miesiac: MiesiacISO;
  osobaId: string;
  typ: TypOdcinka;
  /** 100, 70, 81.5 … (stawka z wyniku kwot). */
  stawkaProc: number;
  /** Część etatu, na której osoba pracuje (łączenie urlopu rodzicielskiego z pracą). */
  wymiarPracy?: number;
  /** Dni zasiłku w tym miesiącu. */
  dni: number;
  /** Brutto za miesiąc, z podwyższeniem (jeśli przysługuje). */
  brutto: number;
  /** Szacunek netto; brak, gdy silnik go nie policzył. */
  netto?: number;
  /** Kto wypłaca; brak, gdy nie wiadomo. */
  ktoWyplaca?: KtoWyplaca['kto'];
  tytulId?: string;
  odcinekIds: string[];
}

export interface MiesiacHarmonogramu {
  miesiac: MiesiacISO;
  wiersze: WierszHarmonogramu[];
  brutto: number;
  netto?: number;
}

export interface Harmonogram {
  wiersze: WierszHarmonogramu[];
  miesiace: MiesiacHarmonogramu[];
  osoby: { osobaId: string; brutto: number; netto?: number }[];
  sumaBrutto: number;
  sumaNetto?: number;
  /** Czy któraś kwota zawiera podwyższenie do kwoty świadczenia rodzicielskiego. */
  maPodwyzszenie: boolean;
}

export interface OpcjeHarmonogramu {
  /** Kolejność osób w tabeli (np. `rodzina.osoby`); domyślnie kolejność pierwszego odcinka w planie. */
  kolejnoscOsob?: string[];
  /** Z `WynikDokumentow.ktoWyplaca` (REST /api/documents). */
  ktoWyplaca?: KtoWyplaca[];
}

const BEZ_ZASILKU: ReadonlySet<TypOdcinka> = new Set(['praca', 'przerwa']);

const naGrosze = (zl: number) => Math.round((zl + Number.EPSILON) * 100);
const naZlote = (gr: number) => gr / 100;

/** Dzieli `calosc` groszy na części proporcjonalne do wag; suma części = `calosc`. */
function rozdziel(calosc: number, wagi: number[]): number[] {
  if (wagi.length === 0) return [];
  const sumaWag = wagi.reduce((s, w) => s + w, 0);
  const w = sumaWag > 0 ? wagi : wagi.map(() => 1);
  const suma = sumaWag > 0 ? sumaWag : wagi.length;
  const dokladne = w.map((x) => (calosc * x) / suma);
  const czesci = dokladne.map((x) => Math.floor(x));
  let reszta = calosc - czesci.reduce((s, x) => s + x, 0);
  const kolejnosc = dokladne.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of kolejnosc) {
    if (reszta <= 0) break;
    czesci[i] += 1;
    reszta -= 1;
  }
  return czesci;
}

function ktoDla(odcinek: Odcinek, lista: KtoWyplaca[]): KtoWyplaca | undefined {
  const osoby = lista.filter((k) => k.osobaId === odcinek.osobaId);
  if (odcinek.tytulId) {
    const k = osoby.find((x) => x.tytulId === odcinek.tytulId);
    if (k) return k;
  }
  return new Set(osoby.map((k) => k.kto)).size === 1 ? osoby[0] : undefined;
}

interface Robocze {
  w: Omit<WierszHarmonogramu, 'brutto' | 'netto'>;
  brutto: number; // grosze
  netto: number | null; // grosze; null = brak szacunku
  od: string;
}

export function zbudujHarmonogram(wynik: WynikKwot, plan: Plan, opcje: OpcjeHarmonogramu = {}): Harmonogram {
  const odcinki = new Map(plan.odcinki.map((o) => [o.id, o]));
  const kolejnosc = opcje.kolejnoscOsob ?? [...new Set(plan.odcinki.map((o) => o.osobaId))];
  const nrOsoby = (id: string) => {
    const i = kolejnosc.indexOf(id);
    return i === -1 ? kolejnosc.length : i;
  };

  const robocze = new Map<string, Robocze>();
  let maPodwyzszenie = false;

  for (const k of wynik.odcinki) {
    const odc = odcinki.get(k.odcinekId);
    if (!odc || BEZ_ZASILKU.has(odc.typ)) continue;
    const miesiace = k.rozbicieMiesieczne;
    const wagi = miesiace.map((m) => naGrosze(m.kwota));
    const podwyzszenie = rozdziel(naGrosze(k.podwyzszenie ?? 0), wagi);
    const netto = k.naReke === undefined ? null : rozdziel(naGrosze(k.naReke), wagi);
    if ((k.podwyzszenie ?? 0) > 0) maPodwyzszenie = true;
    const kto = ktoDla(odc, opcje.ktoWyplaca ?? []);

    miesiace.forEach((m, i) => {
      const brutto = wagi[i] + podwyzszenie[i];
      if (brutto === 0) return;
      const klucz = [m.miesiac, odc.osobaId, odc.typ, k.stawkaProc, odc.wymiarPracy ?? '', kto?.kto ?? '', kto?.tytulId ?? ''].join('|');
      const dotad = robocze.get(klucz);
      const nettoM = netto === null ? null : netto[i];
      if (dotad) {
        dotad.brutto += brutto;
        dotad.netto = dotad.netto === null || nettoM === null ? null : dotad.netto + nettoM;
        dotad.w.dni += m.dni;
        dotad.w.odcinekIds.push(odc.id);
        if (odc.od < dotad.od) dotad.od = odc.od;
      } else {
        robocze.set(klucz, {
          w: {
            miesiac: m.miesiac,
            osobaId: odc.osobaId,
            typ: odc.typ,
            stawkaProc: k.stawkaProc,
            ...(odc.wymiarPracy !== undefined ? { wymiarPracy: odc.wymiarPracy } : {}),
            dni: m.dni,
            ...(kto ? { ktoWyplaca: kto.kto, tytulId: kto.tytulId } : {}),
            odcinekIds: [odc.id],
          },
          brutto,
          netto: nettoM,
          od: odc.od,
        });
      }
    });
  }

  const posortowane = [...robocze.values()].sort(
    (a, b) => a.w.miesiac.localeCompare(b.w.miesiac) || nrOsoby(a.w.osobaId) - nrOsoby(b.w.osobaId) || a.od.localeCompare(b.od),
  );

  const sumaNetto = (lista: Robocze[]) => (lista.length > 0 && lista.every((r) => r.netto !== null) ? naZlote(lista.reduce((s, r) => s + (r.netto as number), 0)) : undefined);
  const sumaBrutto = (lista: Robocze[]) => naZlote(lista.reduce((s, r) => s + r.brutto, 0));
  const doWiersza = (r: Robocze): WierszHarmonogramu => ({ ...r.w, brutto: naZlote(r.brutto), netto: r.netto === null ? undefined : naZlote(r.netto) });

  const poMiesiacach = new Map<MiesiacISO, Robocze[]>();
  for (const r of posortowane) poMiesiacach.set(r.w.miesiac, [...(poMiesiacach.get(r.w.miesiac) ?? []), r]);

  const osobyIds = [...new Set(posortowane.map((r) => r.w.osobaId))].sort((a, b) => nrOsoby(a) - nrOsoby(b));

  return {
    wiersze: posortowane.map(doWiersza),
    miesiace: [...poMiesiacach].map(([miesiac, lista]) => ({ miesiac, wiersze: lista.map(doWiersza), brutto: sumaBrutto(lista), netto: sumaNetto(lista) })),
    osoby: osobyIds.map((osobaId) => {
      const lista = posortowane.filter((r) => r.w.osobaId === osobaId);
      return { osobaId, brutto: sumaBrutto(lista), netto: sumaNetto(lista) };
    }),
    sumaBrutto: sumaBrutto(posortowane),
    sumaNetto: sumaNetto(posortowane),
    maPodwyzszenie,
  };
}
