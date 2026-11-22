import { Rozwijane } from '../ui';
import { KOD_DO_POTWIERDZENIA, type TrudnaSytuacja } from '../../content/trudneSytuacje';
import { LINKI } from '../../content/linki';
import { organizacjeDla } from '../../content/organizacje';
import { LinkZewnetrzny } from './LinkZewnetrzny';

const H3 = 'text-base font-bold text-granat lg:text-lg';

function Przepisy({ przepisy }: { przepisy: string[] }) {
  if (przepisy.length === 0) return null;
  return <span className="text-sm text-tekst-drugi"> ({przepisy.join('; ')})</span>;
}

/** Jedna trudna sytuacja jako sekcja rozwijana: co to znaczy, co przysługuje, co zrobić, gdzie szukać pomocy. */
export function KartaSytuacji({ sytuacja: s }: { sytuacja: TrudnaSytuacja }) {
  const organizacje = organizacjeDla(s.id);
  return (
    <div data-sytuacja={s.id}>
      <Rozwijane tytul={s.tytul}>
        <div className="flex flex-col gap-6">
          <p className="max-w-prose text-lg leading-normal">{s.wstep}</p>

          <section className="flex flex-col gap-2">
            <h3 className={H3}>Co przysługuje</h3>
            <ul className="flex max-w-prose list-disc flex-col gap-2 pl-5 leading-normal">
              {s.coPrzysluguje.map((u) => (
                <li key={u.tekst}>
                  {u.tekst}
                  <Przepisy przepisy={u.przepisy} />
                  {u.zrodlo && (
                    <>
                      {' '}
                      <LinkZewnetrzny href={u.zrodlo} className="font-normal">
                        Strona oficjalna
                      </LinkZewnetrzny>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className={H3}>Co można zrobić</h3>
            <ol className="flex max-w-prose list-decimal flex-col gap-2 pl-5 leading-normal">
              {s.coZrobicNajpierw.map((krok) => (
                <li key={krok}>{krok}</li>
              ))}
            </ol>
          </section>

          {s.dokumenty.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className={H3}>Dokumenty, które mogą się przydać</h3>
              <ul className="flex max-w-prose list-disc flex-col gap-2 pl-5 leading-normal">
                {s.dokumenty.map((d) => (
                  <li key={d.nazwa}>
                    {d.nazwa}
                    {d.kiedy && <span className="text-tekst-drugi">. {d.kiedy}</span>}
                    {d.doPotwierdzenia && <span className="text-tekst-drugi"> (warto zapytać płatnika albo ZUS, czy jest potrzebny)</span>}
                    {d.przepis && <span className="text-sm text-tekst-drugi"> ({d.przepis})</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {s.doPotwierdzeniaWZus.length > 0 && (
            <section className="flex flex-col gap-2 rounded-komunikat bg-szary-kafel p-4">
              <h3 className={H3}>Warto potwierdzić w ZUS</h3>
              <p className="max-w-prose leading-normal">
                Przepisy nie rozstrzygają tego wprost, więc nie podajemy odpowiedzi na wyczucie. Proszę zapytać ZUS o:
              </p>
              <ul className="flex max-w-prose list-disc flex-col gap-2 pl-5 leading-normal" data-kod={KOD_DO_POTWIERDZENIA}>
                {s.doPotwierdzeniaWZus.map((p) => (
                  <li key={p.pytanie}>{p.pytanie}</li>
                ))}
              </ul>
              <div>
                <LinkZewnetrzny href={LINKI.zusDlaRodzicow.url}>ZUS dla rodziców: kontakt i pytania</LinkZewnetrzny>
              </div>
            </section>
          )}

          {organizacje.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className={H3}>Gdzie szukać wsparcia</h3>
              <p className="max-w-prose leading-normal text-tekst-drugi">
                To fundacje, które pomagają rodzicom. Można do nich napisać w dowolnej chwili.
              </p>
              <ul className="flex flex-col gap-3">
                {organizacje.map((o) => (
                  <li key={o.id} data-organizacja={o.id} className="flex flex-col gap-2 rounded-komunikat bg-szary-kafel p-4">
                    <p className="font-bold">{o.nazwa}</p>
                    <p className="text-sm text-tekst-drugi">
                      {o.siedziba}, {o.zasieg}
                      {o.potwierdzenie.opp ? ', organizacja pożytku publicznego' : ''}
                    </p>
                    <ul className="flex max-w-prose list-disc flex-col gap-1 pl-5 leading-normal">
                      {o.zakresPomocy.map((z) => (
                        <li key={z}>{z}</li>
                      ))}
                    </ul>
                    {o.uwaga && <p className="max-w-prose text-sm leading-normal">{o.uwaga}</p>}
                    <div>
                      <LinkZewnetrzny href={o.url}>Strona organizacji</LinkZewnetrzny>
                    </div>
                    <p className="text-sm text-tekst-drugi">
                      KRS {o.potwierdzenie.krs}, sprawdzono {o.sprawdzono}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {s.linki.length > 0 && (
            <section className="flex flex-col gap-1">
              <h3 className={H3}>Oficjalne strony</h3>
              <ul className="flex flex-col">
                {s.linki.map((k) => (
                  <li key={k}>
                    <LinkZewnetrzny href={LINKI[k].url}>{LINKI[k].nazwa}</LinkZewnetrzny>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Rozwijane>
    </div>
  );
}
