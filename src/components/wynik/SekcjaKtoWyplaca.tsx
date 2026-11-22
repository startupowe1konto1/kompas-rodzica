import type { Rodzina, WynikDokumentow } from '../../engine/types';
import { Karta } from '../ui';

/** Kto wypłaca zasiłek: płatnik (pracodawca) albo ZUS, z powodem i przepisem. */
export function TrescKtoWyplaca({ dane, rodzina }: { dane: WynikDokumentow; rodzina: Rodzina }) {
  const wiele = rodzina.osoby.length > 1;
  if (dane.ktoWyplaca.length === 0) return <p className="text-tekst-drugi">Na razie nie mamy tej informacji.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {dane.ktoWyplaca.map((k) => {
        const imie = rodzina.osoby.find((o) => o.id === k.osobaId)?.dane?.imie;
        const zus = k.kto === 'ZUS';
        return (
          <Karta key={`${k.osobaId}-${k.tytulId}`} jako="li" obramowanie data-kto={k.kto} data-osoba={k.osobaId}>
            {wiele && imie ? <p className="text-sm font-bold text-tekst-drugi">{imie}</p> : null}
            <p className="text-lg font-bold text-granat">{zus ? 'Zasiłek wypłaci ZUS' : 'Zasiłek wypłaci pracodawca (płatnik)'}</p>
            <p className="mt-1 max-w-prose leading-normal">{k.powod}</p>
            <p className="mt-2 text-sm text-tekst-drugi">Podstawa: {k.przepis}</p>
          </Karta>
        );
      })}
    </ul>
  );
}
