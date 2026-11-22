import { IconExternalLink } from '@tabler/icons-react';
import type { Rodzina, WynikUprawnien } from '../../engine/types';
import { Karta, Rozwijane, ZnacznikUprawnienia } from '../ui';
import { grupujPoOsobach, type GrupaOsoby } from './grupowanie';
import { LINK_ZAPYTAJ_ZUS } from './linki';
import { SekcjaOpakowanie, type SekcjaProps } from './Sekcja';
import { NAZWY_SWIADCZEN } from './teksty';

type Pozycja = GrupaOsoby['uprawnienia'][number];

/** Jedno świadczenie: status, powód, przepis, alternatywa i link „Zapytaj ZUS” przy wyniku do potwierdzenia. */
function PozycjaUprawnienia({ u }: { u: Pozycja }) {
  return (
    <li
      data-kod={u.kod}
      data-status={u.status}
      data-swiadczenie={u.swiadczenie}
      className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">{NAZWY_SWIADCZEN[u.swiadczenie]}</span>
        <ZnacznikUprawnienia przysluguje={u.przysluguje} />
      </div>
      <p className="max-w-prose leading-normal">{u.powod}</p>
      <p className="text-sm text-tekst-drugi">Podstawa: {u.przepis}</p>
      {u.status === 'nie_przysluguje' && u.alternatywa ? (
        <p className="max-w-prose rounded-przycisk bg-szary-kafel p-3 leading-normal">
          <span className="font-bold">Zamiast tego: </span>
          {u.alternatywa}
        </p>
      ) : null}
      {u.status === 'do_potwierdzenia' ? (
        <a
          href={LINK_ZAPYTAJ_ZUS.adres}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 self-start font-bold text-zielen underline underline-offset-2 hover:text-zielen-ciemna"
        >
          {LINK_ZAPYTAJ_ZUS.tekst}
          <IconExternalLink size={20} aria-hidden />
          <span className="sr-only">(otwiera się w nowej karcie)</span>
        </a>
      ) : null}
    </li>
  );
}

function ListaPozycji({ pozycje }: { pozycje: Pozycja[] }) {
  return (
    <ul className="flex flex-col divide-y divide-szary-linia">
      {pozycje.map((u) => (
        <PozycjaUprawnienia key={`${u.swiadczenie}-${u.kod}-${u.tytulId ?? ''}`} u={u} />
      ))}
    </ul>
  );
}

/** Uprawnienia po osobach: status, powód, przepis, alternatywa i link „Zapytaj ZUS” przy wynikach do potwierdzenia. */
export function SekcjaUprawnien({ dane, laduje, blad, odswiez, rodzina }: SekcjaProps<WynikUprawnien>) {
  return (
    <SekcjaOpakowanie
      tytul="Co przysługuje"
      dane={dane}
      laduje={laduje}
      blad={blad}
      odswiez={odswiez}
      dzieci={(w) => (
        <div className="flex flex-col gap-3">
          {grupujPoOsobach(rodzina, w.uprawnienia).map((g) => (
            <Karta key={g.osobaId} data-osoba-grupa={g.osobaId} className="flex flex-col gap-3">
              <h3 className="text-lg font-bold text-granat">{g.etykieta}</h3>
              {g.uprawnienia.length === 0 ? <p className="text-tekst-drugi">Brak świadczeń do pokazania.</p> : <ListaPozycji pozycje={g.uprawnienia} />}
            </Karta>
          ))}
        </div>
      )}
    />
  );
}

/**
 * Treść nakładki „Co przysługuje”: dla każdej osoby dwie rozwijane listy.
 * „Mają zastosowanie” (przysługuje albo do potwierdzenia w ZUS) – otwarta; „nie mają zastosowania” – zwinięta.
 */
export function TrescUprawnien({ dane, rodzina }: { dane: WynikUprawnien; rodzina: Rodzina }) {
  return (
    <div className="flex flex-col gap-4">
      {grupujPoOsobach(rodzina, dane.uprawnienia).map((g) => {
        const dotycza = g.uprawnienia.filter((u) => u.status !== 'nie_przysluguje');
        const niedotycza = g.uprawnienia.filter((u) => u.status === 'nie_przysluguje');
        return (
          <div key={g.osobaId} data-osoba-grupa={g.osobaId} className="flex flex-col gap-3">
            <h3 className="text-lg font-bold text-granat">{g.etykieta}</h3>
            {g.uprawnienia.length === 0 && <p className="text-tekst-drugi">Brak świadczeń do pokazania.</p>}
            {dotycza.length > 0 && (
              <div data-lista="dotycza">
                <Rozwijane tytul={`Świadczenia, które mają zastosowanie (${dotycza.length})`} domyslnieOtwarte>
                  <ListaPozycji pozycje={dotycza} />
                </Rozwijane>
              </div>
            )}
            {niedotycza.length > 0 && (
              <div data-lista="niedotycza">
                <Rozwijane tytul={`Świadczenia, które nie mają zastosowania (${niedotycza.length})`}>
                  <ListaPozycji pozycje={niedotycza} />
                </Rozwijane>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
