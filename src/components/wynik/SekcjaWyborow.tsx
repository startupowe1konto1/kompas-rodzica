import Link from 'next/link';
import type { Rodzina, WynikUprawnien } from '../../engine/types';
import { formatujOkres } from '../format';
import { Data, Karta, ZnacznikStatusu } from '../ui';
import { etykietaOsoby, nazwaMozliwosci } from './etykiety';
import { zdanieNiedostepnych } from './podsumowanie';

/**
 * Wybory rodzica: od kiedy do kiedy, co się wtedy stanie (także dla drugiej osoby), kto decyduje.
 * Wybory niedostępne nie są na liście, zostaje jedna linia z ich liczbą.
 */
export function TrescWyborow({ dane, rodzina }: { dane: WynikUprawnien; rodzina: Rodzina }) {
  const dostepne = dane.mozliwosci.filter((m) => m.dostepna);
  const liczbaNiedostepnych = dane.mozliwosci.length - dostepne.length;
  if (dostepne.length === 0) {
    return (
      <p className="text-tekst-drugi">
        {dane.mozliwosci.length === 0 ? 'W tej sytuacji nie ma dodatkowych wyborów.' : `Na razie nie ma wyborów do podjęcia. ${zdanieNiedostepnych(liczbaNiedostepnych)}.`}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {dostepne.map((m) => (
          <Karta key={m.kod} jako="li" obramowanie data-kod={m.kod} data-dostepna="true" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-granat lg:text-xl">{nazwaMozliwosci(m.kod)}</h3>
              <ZnacznikStatusu ton="zielen" etykieta="Dostępne" />
            </div>
            {m.odKiedy && (
              <p className="text-sm font-bold">
                {m.doKiedy ? (
                  formatujOkres(m.odKiedy, m.doKiedy)
                ) : (
                  <>
                    od <Data iso={m.odKiedy} />
                  </>
                )}
              </p>
            )}
            <p className="max-w-prose leading-normal text-tekst-drugi">{m.opis}</p>
            {m.konsekwencje.length > 0 && (
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wide text-granat">Co się wtedy stanie</h4>
                <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 marker:text-granat">
                  {m.konsekwencje.map((k) => (
                    <li key={k} className="max-w-prose leading-normal">
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              {m.ktoDecyduje && <p className="text-sm text-tekst-drugi">Decyduje: {etykietaOsoby(rodzina, m.ktoDecyduje)}</p>}
              <Link
                href={`/plan#wybor-${m.kod}`}
                className="inline-flex min-h-11 items-center font-bold text-zielen underline underline-offset-2 hover:text-zielen-ciemna"
              >
                Zobacz na osi czasu
              </Link>
            </div>
          </Karta>
        ))}
      </ul>
      {liczbaNiedostepnych > 0 && (
        <p data-niedostepne={liczbaNiedostepnych} className="text-sm text-tekst-drugi">
          {zdanieNiedostepnych(liczbaNiedostepnych)}.
        </p>
      )}
    </div>
  );
}
