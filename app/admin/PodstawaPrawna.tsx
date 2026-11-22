'use client';

// Podstawa prawna parametru: zapisany przepis, a pod nim linki do rozpoznanych aktów ze znacznikiem „obowiązuje”.
// Znacznik pokazujemy tylko, gdy API ELI Sejmu odpowiedziało; inaczej zostaje sam link.
import { aktyWPrzepisie } from '@/src/server/eli';
import type { StatusAktu } from '@/src/server/eli';

const FOKUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-300';

function Znacznik({ obowiazuje }: { obowiazuje: boolean }) {
  return obowiazuje ? (
    <span className="rounded border border-green-700 bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-950 dark:border-green-500 dark:bg-green-950 dark:text-green-50">
      obowiązuje
    </span>
  ) : (
    <span className="rounded border border-red-700 bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-950 dark:border-red-400 dark:bg-red-950 dark:text-red-50">
      nie obowiązuje
    </span>
  );
}

export default function PodstawaPrawna(props: { przepis: string | undefined; statusy: StatusAktu[] | null }) {
  const { przepis, statusy } = props;
  const akty = przepis ? aktyWPrzepisie(przepis) : [];
  return (
    <>
      <p className="mt-1">Podstawa prawna: {przepis ?? 'brak wpisu'}</p>
      {akty.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1" aria-label="Akty prawne">
          {akty.map((akt) => {
            const status = statusy?.find((s) => s.eli === akt.eli);
            return (
              <li key={akt.eli} className="flex items-center gap-2">
                <a
                  href={akt.adres}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={status?.tytul}
                  className={`underline underline-offset-2 ${FOKUS}`}
                >
                  {akt.skrot} (otwiera się w nowej karcie)
                </a>
                {typeof status?.obowiazuje === 'boolean' && <Znacznik obowiazuje={status.obowiazuje} />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
