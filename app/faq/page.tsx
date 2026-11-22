import type { Metadata } from "next";
import { ListaFaq } from "../../src/components/faq/ListaFaq";

export const metadata: Metadata = {
  title: "Najczęstsze pytania",
};

export default function FaqPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-granat lg:text-3xl">Najczęstsze pytania</h1>
        <p className="max-w-prose leading-normal text-tekst-drugi">
          Krótkie odpowiedzi o zasiłku macierzyńskim, urlopach i wnioskach. To symulacja. Wynik nie jest decyzją ZUS.
        </p>
      </div>
      <ListaFaq />
    </main>
  );
}
