import { Karta } from '../ui';
import type { Swiadczenie } from '../../content/inneWsparcie';
import { LinkZewnetrzny } from './LinkZewnetrzny';

const H3 = 'text-base font-bold text-granat lg:text-lg';

/** Jedno świadczenie spoza ubezpieczenia chorobowego, z linkiem do strony oficjalnej. */
export function KartaSwiadczenia({ swiadczenie: s }: { swiadczenie: Swiadczenie }) {
  return (
    <Karta jako="article" data-wsparcie={s.id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold leading-snug text-granat lg:text-xl">{s.nazwa}</h2>
        <p className="max-w-prose leading-normal">{s.krotko}</p>
      </div>

      <section className="flex flex-col gap-1">
        <h3 className={H3}>Ile</h3>
        <ul className="flex max-w-prose list-disc flex-col gap-1 pl-5 leading-normal">
          {s.kwoty.map((k) => (
            <li key={k.opis}>{k.opis}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className={H3}>Komu przysługuje</h3>
        <ul className="flex max-w-prose list-disc flex-col gap-1 pl-5 leading-normal">
          {s.dlaKogo.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className={H3}>Gdzie złożyć wniosek</h3>
        <p className="max-w-prose leading-normal">
          Wypłaca: {s.ktoWyplaca === 'ZUS' ? 'ZUS' : 'gmina'}. {s.gdzieZlozyc}
        </p>
      </section>

      {(s.termin || s.uwaga) && (
        <div className="flex max-w-prose flex-col gap-2 rounded-komunikat bg-szary-kafel p-4 leading-normal">
          {s.termin && <p>{s.termin.opis}</p>}
          {s.uwaga && <p>{s.uwaga}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <LinkZewnetrzny href={s.link}>Strona oficjalna: {s.nazwa}</LinkZewnetrzny>
        <p className="text-sm text-tekst-drugi">Kwoty i terminy sprawdziliśmy {s.sprawdzono}. Mogą się zmienić, więc warto je sprawdzić na stronie.</p>
      </div>
    </Karta>
  );
}
