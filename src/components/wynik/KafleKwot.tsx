import type { ReactNode } from 'react';
import type { KrokWyliczenia, Plan, Rodzina, WynikKwot } from '../../engine/types';
import { formatujKwote, formatujOkres } from '../format';
import { podsumowanieOsoby } from '../kwoty/podsumowanie';
import { NAZWY_TYPOW } from '../os-czasu/teksty';
import { KafelLiczby, Karta, Kwota, PrzelacznikTakNie, Rozwijane, polacz } from '../ui';
import { etykietaOsoby } from './etykiety';

function Kroki({ tytul, kroki }: { tytul: string; kroki: KrokWyliczenia[] }) {
  if (kroki.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-bold text-tekst">{tytul}</h4>
      <ol className="flex flex-col gap-3">
        {kroki.map((k, i) => (
          <li key={i} className="flex flex-col gap-0.5">
            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span>{k.opis}</span>
              {k.wartosc !== undefined && <Kwota wartosc={k.wartosc} className="font-bold" />}
            </span>
            {k.wzor && <span className="text-sm tabular-nums text-tekst-drugi">{k.wzor}</span>}
            {k.przepis && <span className="text-sm text-tekst-drugi">{k.przepis}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Ton kafla kwoty w wyniku. Kolory z tokenów `app/globals.css` (jedno miejsce, planer używa tych samych):
 * - 'glowny' – `bg-zielen-noc`, biały tekst (jedyny kafel w pełnym kolorze),
 * - 'niebieski' – `bg-niebieski-jasny` (#e6f0fa), tekst `text-granat` (#00416e): kontrast 9,2:1
 *   (luminancja granatu 0,049, tła 0,860: (0,860+0,05)/(0,049+0,05)),
 * - 'bialy' – `bg-white`, tekst `text-tekst`.
 */
export type TonKafla = 'glowny' | 'niebieski' | 'bialy';

const TONY: Record<TonKafla, { tlo: string; tekst: string }> = {
  glowny: { tlo: 'bg-zielen-noc', tekst: 'text-white' },
  niebieski: { tlo: 'bg-niebieski-jasny', tekst: 'text-granat' },
  bialy: { tlo: 'bg-white', tekst: 'text-tekst' },
};

function KafelKwoty({ ton, etykieta, wartosc, podpis }: { ton: TonKafla; etykieta: string; wartosc: ReactNode; podpis?: ReactNode }) {
  const t = TONY[ton];
  return (
    <div data-kafel-kwoty={ton} className={polacz('flex flex-col gap-1 rounded-karta p-4 lg:p-6', t.tlo, t.tekst)}>
      <p className="text-sm leading-snug">{etykieta}</p>
      <p className="text-[1.75rem] font-black leading-tight tabular-nums lg:text-[2rem]">{wartosc}</p>
      {podpis && <p className="text-sm leading-snug">{podpis}</p>}
    </div>
  );
}

interface PropsSum {
  wynik: WynikKwot;
  plan: Plan;
  rodzina: Rodzina;
  /** Zapisuje „PIT-2 złożony” dla osoby (zmienia profil, kwoty liczą się ponownie). */
  ustawPit2: (osobaId: string, wartosc: boolean) => void;
}

const wgDaty = (plan: Plan) => [...plan.odcinki].sort((a, b) => (a.od < b.od ? -1 : a.od > b.od ? 1 : 0));

/** Góra ekranu wyniku: kafle z kwotami dla rodziny, kwoty osób i przełącznik PIT-2. */
export function KafleSum({ wynik, plan, rodzina, ustawPit2 }: PropsSum) {
  const kwotaOdcinka = (id: string) => wynik.odcinki.find((k) => k.odcinekId === id);
  const pierwszyOdcinek = wgDaty(plan).find((o) => kwotaOdcinka(o.id));
  const pierwszaKwota = pierwszyOdcinek ? kwotaOdcinka(pierwszyOdcinek.id) : wynik.odcinki[0];
  const osobyZKwota = rodzina.osoby.filter((o) => wynik.odcinki.some((k) => k.osobaId === o.id));
  const wieleOsob = osobyZKwota.length > 1;

  return (
    <div className="flex flex-col gap-3">
      {/* Dwa kafle (uwaga zespołu 21.11: trzy kafle z liczbami to za dużo, niebieski odrzucony):
          w pełnym kolorze tylko suma brutto, „netto” jako druga linia w tym samym kaflu. */}
      <div className="grid gap-3 lg:grid-cols-2">
        <KafelKwoty
          ton="glowny"
          etykieta="Razem dla rodziny (brutto)"
          wartosc={<span data-suma-razem>{formatujKwote(wynik.sumaRazem)}</span>}
          podpis={
            wynik.naRekeRazem !== undefined ? (
              <>
                Netto ok. <span data-na-reke-razem className="font-bold">{formatujKwote(wynik.naRekeRazem)}</span> (po zaliczce na podatek)
              </>
            ) : (
              'Suma ze wszystkich okresów'
            )
          }
        />
        <KafelKwoty
          ton="bialy"
          etykieta="Miesięcznie na początku urlopu"
          wartosc={<span data-kwota-miesiecznie>{pierwszaKwota ? formatujKwote(pierwszaKwota.miesiecznie) : '—'}</span>}
          podpis={
            pierwszyOdcinek
              ? `Brutto, ${NAZWY_TYPOW[pierwszyOdcinek.typ].toLowerCase()}, ${formatujOkres(pierwszyOdcinek.od, pierwszyOdcinek.do, { krotko: true })}`
              : 'Brutto, za pełny miesiąc'
          }
        />
      </div>

      {wieleOsob && (
        <div className="grid gap-3 sm:grid-cols-2">
          {osobyZKwota.map((o) => {
            const p = podsumowanieOsoby(wynik, o.id);
            return (
              <div key={o.id} data-suma-osoby={o.id} className="flex flex-col">
                <KafelLiczby
                  etykieta={`Razem: ${etykietaOsoby(rodzina, o.id)}`}
                  wartosc={formatujKwote(p.brutto)}
                  podpis={p.naReke === undefined ? 'Brutto' : `Brutto. Szacunkowo netto: ${formatujKwote(p.naReke)}`}
                  className="flex-1"
                />
              </div>
            );
          })}
        </div>
      )}

      <Karta className="flex flex-col gap-4" obramowanie>
        {osobyZKwota.map((o) => (
          <PrzelacznikTakNie
            key={o.id}
            name={`pit2-${o.id}`}
            pytanie={`PIT-2 złożony u wypłacającego zasiłek${wieleOsob ? `: ${etykietaOsoby(rodzina, o.id)}` : ''}`}
            podpowiedz="Zmienia tylko szacunek kwoty netto, nie kwotę brutto."
            wartosc={o.pit2 === true}
            onZmiana={(w) => ustawPit2(o.id, w)}
          />
        ))}
      </Karta>
    </div>
  );
}

const WIERSZ = 'grid grid-cols-2 gap-x-3 border-t border-szary-linia py-2 first:border-t-0 first:pt-0 last:pb-0';

/** Treść nakładki „Kwoty w danym okresie”: okresy z kwotami rozdzielonymi cienkimi liniami i ścieżką wyliczenia. */
export function OkresyKwot({ wynik, plan, rodzina }: { wynik: WynikKwot; plan: Plan; rodzina: Rodzina }) {
  const kwotaOdcinka = (id: string) => wynik.odcinki.find((k) => k.odcinekId === id);
  const wieleOsob = new Set(wynik.odcinki.map((k) => k.osobaId)).size > 1;

  return (
    <ul className="flex flex-col gap-3">
      {wgDaty(plan).map((o) => {
        const k = kwotaOdcinka(o.id);
        if (!k) return null;
        const podstawa = wynik.podstawy.find((p) => p.osobaId === k.osobaId && (o.tytulId === undefined || p.tytulId === o.tytulId));
        return (
          <Karta key={o.id} jako="li" obramowanie className="flex flex-col gap-3" data-odcinek={o.id} data-typ={o.typ}>
            <div className="flex flex-col gap-0.5">
              <p className="font-bold text-tekst">
                {NAZWY_TYPOW[o.typ]}
                {wieleOsob ? ` (${etykietaOsoby(rodzina, o.osobaId)})` : ''}
              </p>
              <p className="text-tekst-drugi">{formatujOkres(o.od, o.do)}</p>
            </div>
            <dl className="flex flex-col tabular-nums">
              <div className={WIERSZ}>
                <dt className="text-tekst-drugi">Miesięcznie (brutto)</dt>
                <dd className="text-right font-bold">{formatujKwote(k.miesiecznie)}</dd>
              </div>
              <div className={WIERSZ}>
                <dt className="text-tekst-drugi">Za cały okres</dt>
                <dd className="text-right font-bold">{formatujKwote(k.razem)}</dd>
              </div>
            </dl>
            <Rozwijane tytul="Jak to policzyliśmy">
              <div className="flex flex-col gap-4">
                {podstawa && <Kroki tytul="Podstawa wymiaru" kroki={podstawa.sciezka} />}
                <Kroki tytul="Kwota za ten okres" kroki={k.sciezka} />
              </div>
            </Rozwijane>
          </Karta>
        );
      })}
    </ul>
  );
}
