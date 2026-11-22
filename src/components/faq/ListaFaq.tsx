import { IconChevronDown } from '@tabler/icons-react';
import { StanPusty } from '../ui';
import { PYTANIA_FAQ, type PytanieFaq } from './pytania';

/** Pytania jako rozwijane karty: na wierzchu tylko pytanie, odpowiedź po kliknięciu (działa bez JavaScriptu). */
export function ListaFaq({ pytania = PYTANIA_FAQ }: { pytania?: PytanieFaq[] }) {
  if (pytania.length === 0) {
    return (
      <div data-stan="faq-w-przygotowaniu">
        <StanPusty tytul="Pytania w przygotowaniu" opis="Wkrótce pojawią się tu odpowiedzi na pytania, które rodzice zadają najczęściej." />
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {pytania.map((p) => (
        <li key={p.id} id={p.id} data-faq-pytanie={p.id} className="scroll-mt-4">
          <details className="group rounded-karta bg-white">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-karta px-4 py-3 text-lg font-bold text-granat hover:bg-szary-kafel lg:px-6 [&::-webkit-details-marker]:hidden">
              <span>{p.pytanie}</span>
              <IconChevronDown
                size={24}
                stroke={2}
                aria-hidden
                className="shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div data-faq-odpowiedz className="flex flex-col gap-2 border-t border-szary-linia px-4 py-4 lg:px-6">
              {p.odpowiedz.map((a) => (
                <p key={a} className="max-w-prose leading-normal">
                  {a}
                </p>
              ))}
              {p.przepis && <p className="text-sm text-tekst-drugi">Podstawa: {p.przepis}</p>}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
