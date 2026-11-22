/**
 * Dokumenty, które symulowana usługa (eZUS) zwraca razem z danymi (`OdpowiedzZrodla.dokumenty`): opis do pokazania
 * na ekranie pobierania danych. Opis zadania ZUS, pkt 3: „wyświetlenie danych o stanie zadłużenia z tytułu składek
 * na dzień powstania prawa do świadczenia (…) należy wyłącznie zasymulować wystawienie zaświadczenia i wysokość
 * zadłużenia”. Skutki zaległości (UZ art. 2a) liczy silnik i pokazuje wynik – tu tylko fakty z usługi.
 */
import type { DokumentZrodla, Rodzina, StatusDokumentuZrodla } from '@/src/engine/types';
import { formatujDate, formatujKwote, formatujOkres } from '../format';

export interface OpisDokumentu {
  kod: DokumentZrodla['kod'];
  nazwa: string;
  status: StatusDokumentuZrodla;
  szczegoly: string[];
}

/** Saldo zaległości z tytułu wskazanego ścieżką `osoby[i].tytuly[j].zadluzenieSkladkowe`. */
export function saldoZaleglosci(sciezka: string, rodzina: Rodzina): { kwota: number; naDzien?: string } | undefined {
  const m = /^osoby\[(\d+)\]\.tytuly\[(\d+)\]\.zadluzenieSkladkowe$/.exec(sciezka);
  if (!m) return undefined;
  const tytul = rodzina.osoby[Number(m[1])]?.tytuly[Number(m[2])];
  if (tytul?.zadluzenieSkladkowe === undefined) return undefined;
  return { kwota: tytul.zadluzenieSkladkowe, naDzien: tytul.zadluzenieSkladkoweNaDzien };
}

/**
 * Zwolnienia e-ZLA osób, których dotyczą ścieżki dokumentu (`osoby[i].zdrowie.eZLA…`), od najnowszego. Opis zadania,
 * pkt 3: „symulacja podglądu danych o zaświadczeniach lekarskich e-ZLA”. Kod „B” = niezdolność do pracy w ciąży
 * (zasiłek chorobowy 100% – UZ art. 11 ust. 2 pkt 1); czy płaci pracodawca, czy ZUS, liczy silnik, nie ten opis.
 */
function zwolnieniaEzla(sciezki: string[], rodzina: Rodzina): string[] {
  const osoby = [...new Set(sciezki.map((s) => /^osoby\[(\d+)\]\.zdrowie\.eZLA/.exec(s)?.[1]).filter((x) => x !== undefined))].map(Number);
  const para = rodzina.osoby.length > 1;
  return osoby.flatMap((i) => {
    const o = rodzina.osoby[i];
    const imie = para ? `${o?.dane?.imie ?? `Osoba ${i + 1}`}: ` : '';
    return [...(o?.zdrowie?.eZLA ?? [])]
      .sort((a, b) => (a.od < b.od ? 1 : -1))
      .map((z) => `${imie}${formatujOkres(z.od, z.do)} – ${z.kodB ? 'kod B (niezdolność do pracy w ciąży)' : 'bez kodu B'}`);
  });
}

function statusDokumentu(d: DokumentZrodla, coPodaje: string): string {
  if (d.status === 'wystawione') return `Wystawione – ${coPodaje} na dzień ${formatujDate(d.naDzien)}.`;
  return d.wystawienieOd
    ? `ZUS wystawi je od ${formatujDate(d.wystawienieOd)} – ${coPodaje} na dzień ${formatujDate(d.naDzien)}.`
    : `ZUS wystawi je później – ${coPodaje} na dzień ${formatujDate(d.naDzien)}.`;
}

function opis(d: DokumentZrodla, rodzina: Rodzina): OpisDokumentu {
  const szczegoly: string[] = [];
  if (d.kod === 'zaswiadczenie_o_zadluzeniu') {
    const saldo = d.sciezki.map((s) => saldoZaleglosci(s, rodzina)).find((x) => x !== undefined);
    if (saldo) {
      const naDzien = saldo.naDzien ? ` (stan na ${formatujDate(saldo.naDzien)})` : '';
      szczegoly.push(
        saldo.kwota > 0
          ? `Zaległość w składkach według eZUS${naDzien}: ${formatujKwote(saldo.kwota)}.`
          : `Według eZUS${naDzien} nie ma zaległości w składkach.`,
      );
    }
    szczegoly.push(
      statusDokumentu(d, 'potwierdzi stan składek') +
        ' Liczy się stan w dniu powstania prawa do zasiłku (tu: dzień porodu albo przyjęcia dziecka).',
    );
    if (saldo && saldo.kwota > 0) szczegoly.push('Co zaległość oznacza dla zasiłku, pokazuje wynik.');
  } else if (d.kod === 'e_zla') {
    szczegoly.push(...zwolnieniaEzla(d.sciezki, rodzina));
    szczegoly.push(statusDokumentu(d, 'podaje dane'));
  } else {
    szczegoly.push(statusDokumentu(d, 'podaje dane'));
  }
  return { kod: d.kod, nazwa: d.nazwa, status: d.status, szczegoly };
}

const KOLEJNOSC: DokumentZrodla['kod'][] = ['zaswiadczenie_o_zadluzeniu', 'potwierdzenie_danych_z_zus', 'e_zla', 'odpis_aktu_urodzenia'];

export function opisyDokumentow(dokumenty: DokumentZrodla[], rodzina: Rodzina): OpisDokumentu[] {
  return [...dokumenty]
    .sort((a, b) => KOLEJNOSC.indexOf(a.kod) - KOLEJNOSC.indexOf(b.kod))
    .map((d) => opis(d, rodzina));
}
