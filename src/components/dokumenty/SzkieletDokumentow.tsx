import { ObszarLadowania, Szkielet } from '../ui/Szkielet';

/** Szkielet listy dokumentów w kształcie gotowych kart: nagłówek grupy i dwie karty z tytułem, terminem i przyciskiem. */
export function SzkieletDokumentow() {
  return (
    <ObszarLadowania etykieta="Wczytujemy dokumenty…" className="flex flex-col gap-3">
      <Szkielet className="h-7 w-48" />
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-karta border border-szary-linia bg-white p-4 lg:p-6">
          <Szkielet className="h-6 w-3/4" />
          <Szkielet className="h-4 w-1/3" />
          <Szkielet className="h-12 w-full sm:w-72" />
          <Szkielet className="h-5 w-24" />
        </div>
      ))}
    </ObszarLadowania>
  );
}
