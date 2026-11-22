/**
 * Jednolinijkowe skróty na kafelkach sekcji wyniku („3 świadczenia przysługują”, „2 terminy”).
 * Czyste funkcje, bez Reacta; liczby bierzemy z danych, nie z przepisów.
 */
import type { Plan, WykorzystaniePuli, WynikDokumentow, WynikKwot, WynikUprawnien } from '../../engine/types';
import { formatujDate } from '../format';
import { naTygodnie } from '../pule/liczniki';
import { grupujDokumenty } from './dokumenty';
import { statusUprawnienia } from './grupowanie';

/** Polska odmiana liczebnika: 1 → jeden, 2–4 (poza 12–14) → dwaCztery, reszta → piec. */
export function odmien(n: number, jeden: string, dwaCztery: string, piec: string): string {
  if (n === 1) return jeden;
  const r10 = n % 10;
  const r100 = n % 100;
  return r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14) ? dwaCztery : piec;
}

/** „2 okresy”, „5 okresów”. */
const z = (n: number, jeden: string, dwaCztery: string, piec: string) => `${n} ${odmien(n, jeden, dwaCztery, piec)}`;

/** „1 możliwość jest teraz niedostępna”, „2 możliwości są teraz niedostępne”, „5 możliwości jest teraz niedostępnych”. */
export function zdanieNiedostepnych(n: number): string {
  if (n === 1) return '1 możliwość jest teraz niedostępna';
  const r10 = n % 10;
  const r100 = n % 100;
  const dwaCztery = r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14);
  return dwaCztery ? `${n} możliwości są teraz niedostępne` : `${n} możliwości jest teraz niedostępnych`;
}

export function skrotKwot(wynik: WynikKwot | null, plan: Plan | null): string {
  if (!wynik || !plan) return '';
  const n = plan.odcinki.filter((o) => wynik.odcinki.some((k) => k.odcinekId === o.id)).length;
  return n === 0 ? 'Brak okresów z kwotami' : `${z(n, 'okres', 'okresy', 'okresów')} z kwotami`;
}

export function skrotUprawnien(w: WynikUprawnien | null): string {
  if (!w) return '';
  const n = w.uprawnienia.filter((u) => statusUprawnienia(u) === 'przysluguje').length;
  if (n === 0) return 'Nic jeszcze nie przysługuje';
  return `${n} ${odmien(n, 'świadczenie przysługuje', 'świadczenia przysługują', 'świadczeń przysługuje')}`;
}

const SKROTY_PUL: Record<WykorzystaniePuli['pula'], string> = {
  macierzynski: 'macierzyński',
  uzupelniajacy: 'uzupełniający',
  rodzicielski: 'rodzicielski',
  rodzicielski_nieprzenoszalne: 'rodzicielski',
  ojcowski: 'ojcowski',
};

/** „macierzyński 20 · rodzicielski 41 tyg.”: każdy rodzaj urlopu raz (bez powtórzeń dla drugiego rodzica). */
export function skrotPul(wykorzystanie: WykorzystaniePuli[] | null): string {
  if (!wykorzystanie || wykorzystanie.length === 0) return '';
  const wpisy: string[] = [];
  const widziane = new Set<string>();
  for (const w of wykorzystanie) {
    if (w.pula === 'rodzicielski_nieprzenoszalne') continue;
    const wpis = `${SKROTY_PUL[w.pula]} ${naTygodnie(w.dostepneDni).toLocaleString('pl-PL', { maximumFractionDigits: 1 })}`;
    if (!widziane.has(wpis)) {
      widziane.add(wpis);
      wpisy.push(wpis);
    }
  }
  return wpisy.length === 0 ? '' : `${wpisy.join(' · ')} tyg.`;
}

export function skrotKtoWyplaca(w: WynikDokumentow | null): string {
  if (!w) return '';
  const zus = w.ktoWyplaca.some((k) => k.kto === 'ZUS');
  const platnik = w.ktoWyplaca.some((k) => k.kto !== 'ZUS');
  if (zus && platnik) return 'Pracodawca (płatnik) i ZUS';
  if (zus) return 'Zasiłek wypłaci ZUS';
  if (platnik) return 'Zasiłek wypłaci pracodawca';
  return 'Na razie bez informacji';
}

export function skrotWyborow(w: WynikUprawnien | null): string {
  if (!w) return '';
  const n = w.mozliwosci.filter((m) => m.dostepna).length;
  return n === 0 ? 'Na razie nic do wyboru' : `${n} ${odmien(n, 'wybór do podjęcia', 'wybory do podjęcia', 'wyborów do podjęcia')}`;
}

export function skrotRyzyk(w: WynikUprawnien | null): string {
  if (!w) return '';
  const n = w.ryzyka.length;
  if (n === 0) return 'Nic nie wymaga uwagi';
  const terminy = w.ryzyka.map((r) => r.termin).filter((t): t is string => !!t).sort();
  const sam = z(n, 'rzecz', 'rzeczy', 'rzeczy');
  return terminy.length > 0 ? `${sam}, najbliższy termin ${formatujDate(terminy[0])}` : sam;
}

export function skrotDokumentow(w: WynikDokumentow | null): string {
  if (!w) return '';
  const g = grupujDokumenty(w.dokumenty);
  const doZlozenia = g.teraz.length + g.pozniej.length;
  if (doZlozenia === 0 && g.poTerminie.length === 0) return 'Nic do złożenia';
  const sam = z(doZlozenia, 'dokument do złożenia', 'dokumenty do złożenia', 'dokumentów do złożenia');
  return g.teraz.length > 0 ? `${sam}, w tym ${g.teraz.length} teraz` : sam;
}
