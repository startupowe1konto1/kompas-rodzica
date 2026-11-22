'use client';

/**
 * Lista okresów urlopów (T2.6) pod osią: tu robi się wszystkie zmiany. Grupa na osobę, pozycja z nazwą, okresem,
 * długością i oznaczeniem błędu (słowem i ikoną). Przycisk „Zmień” ROZWIJA pod okresem `PanelAkcji`
 * (wybierzOdcinek), a ten sam przycisk jako „Zwiń” go zwija; rozwinięty jest co najwyżej jeden okres.
 * Wiersz ma `data-okres` (nie `data-odcinek`, bo ten atrybut ma pigułka na osi). Decyzje są tylko w `KartyDecyzji`.
 */
import { useMemo } from 'react';
import { IconAlertTriangle, IconChevronUp, IconPencil } from '@tabler/icons-react';
import { listaOdcinkow } from '../os-czasu/uklad';
import type { Planer } from '../plan/usePlaner';
import { PanelAkcji } from '../plan/PanelAkcji';
import { Karta, Przycisk, polacz } from '../ui';

export function ListaOdcinkow({ planer }: { planer: Planer }) {
  const { rodzina, plan, walidacja, wybranyOdcinekId, wybierzOdcinek } = planer;
  const grupy = useMemo(() => (rodzina && plan ? listaOdcinkow(rodzina, plan, walidacja ?? undefined) : []), [rodzina, plan, walidacja]);
  if (!rodzina || !plan) return null;
  return (
    <div className="flex flex-col gap-4">
      <Karta jako="section" aria-labelledby="lista-naglowek" className="flex flex-col gap-5">
        <h2 id="lista-naglowek" tabIndex={-1} className="text-lg font-black text-granat">
          Okresy urlopów
        </h2>
        {grupy.map((g) => (
          <div key={g.osobaId} data-osoba-grupa={g.osobaId} className="flex flex-col gap-2">
            <h3 className="text-base font-bold text-granat lg:text-lg">{g.etykieta}</h3>
            {g.odcinki.length === 0 ? (
              <p className="text-tekst-drugi">Nie ma tu jeszcze żadnych odcinków.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {g.odcinki.map((o) => {
                  const wybrany = o.id === wybranyOdcinekId;
                  const odcinek = plan.odcinki.find((x) => x.id === o.id);
                  return (
                    <li
                      key={o.id}
                      data-okres={o.id}
                      data-typ={o.typ}
                      data-wybrany={wybrany ? 'true' : undefined}
                      className={polacz(
                        'flex flex-wrap items-center justify-between gap-3 rounded-odcinek border p-3',
                        o.maBlad ? 'border-2 border-blad' : wybrany ? 'border-2 border-granat' : 'border-szary-linia',
                        wybrany && 'bg-szary-kafel',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">
                          {o.nazwa}
                          {o.czescNr ? <span className="font-normal text-tekst-drugi"> (część {o.czescNr})</span> : null}
                        </p>
                        <p className="text-sm text-tekst-drugi">
                          {o.okres}, {o.dlugosc}
                          {o.wymiarPracy ? `, z pracą ${Math.round(o.wymiarPracy * 100)}% etatu` : ''}
                        </p>
                        {o.maBlad && (
                          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-blad">
                            <IconAlertTriangle size={18} stroke={2} aria-hidden />
                            Błąd w planie
                          </p>
                        )}
                        {!o.maBlad && o.maOstrzezenie && <p className="mt-1 text-sm font-bold text-granat">Uwaga: ten odcinek wymaga sprawdzenia</p>}
                      </div>
                      <Przycisk
                        wariant="drugi"
                        onClick={() => wybierzOdcinek(wybrany ? null : o.id)}
                        aria-label={`${wybrany ? 'Zwiń' : 'Zmień'}: ${o.nazwa}, ${o.okres}`}
                        aria-expanded={wybrany}
                        aria-controls={wybrany ? `okres-${o.id}-panel` : undefined}
                        ikona={wybrany ? <IconChevronUp size={20} aria-hidden /> : <IconPencil size={20} aria-hidden />}
                        className="shrink-0"
                      >
                        {wybrany ? 'Zwiń' : 'Zmień'}
                      </Przycisk>
                      {wybrany && odcinek && <PanelAkcji planer={planer} odcinek={odcinek} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </Karta>
    </div>
  );
}
