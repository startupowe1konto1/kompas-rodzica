import type { Metadata } from "next";
import { KartaSwiadczenia } from "../../src/components/wsparcie/KartaSwiadczenia";
import { LinkZewnetrzny } from "../../src/components/wsparcie/LinkZewnetrzny";
import { LINKI } from "../../src/content/linki";
import { inneWsparcieDla } from "../../src/content/inneWsparcie";

export const metadata: Metadata = {
  title: "Inne wsparcie",
};

export default function InneWsparciePage() {
  // Świadczenie „Za życiem” pojawia się tylko, gdy rodzic sam to zaznaczy, więc tu bez sytuacji.
  const swiadczenia = inneWsparcieDla([]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-granat lg:text-3xl">Inne wsparcie</h1>
        <p className="max-w-prose text-lg leading-normal">
          Poza zasiłkami z ubezpieczenia chorobowego można dostać też inne pieniądze na dziecko. Poniżej są najważniejsze, z linkami do
          oficjalnych stron.
        </p>
        <p className="max-w-prose leading-normal text-tekst-drugi">To informacja, nie decyzja. O przyznaniu świadczenia decyduje ten, kto je wypłaca.</p>
      </div>

      <ul className="flex flex-col gap-4">
        {swiadczenia.map((s) => (
          <li key={s.id}>
            <KartaSwiadczenia swiadczenie={s} />
          </li>
        ))}
      </ul>

      <p className="max-w-prose leading-normal">
        Więcej na oficjalnej stronie: <LinkZewnetrzny href={LINKI.zus.url}>{LINKI.zus.nazwa}</LinkZewnetrzny>
      </p>
    </main>
  );
}
