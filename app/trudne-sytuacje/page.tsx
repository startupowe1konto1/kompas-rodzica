import type { Metadata } from "next";
import { OdpisAktu } from "../../src/components/wsparcie/OdpisAktu";
import { KartaSytuacji } from "../../src/components/wsparcie/KartaSytuacji";
import { LinkZewnetrzny } from "../../src/components/wsparcie/LinkZewnetrzny";
import { LINKI, LINKI_STOPKA } from "../../src/content/linki";
import { TRUDNE_SYTUACJE } from "../../src/content/trudneSytuacje";

export const metadata: Metadata = {
  title: "Trudne sytuacje",
};

export default function TrudneSytuacjePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-granat lg:text-3xl">Trudne sytuacje</h1>
        <p className="max-w-prose text-lg leading-normal">
          Jeśli to, co się stało, jest dla Pani/Pana trudne, nie trzeba czytać wszystkiego naraz. Proszę wybrać swoją sytuację. Znajdzie w niej
          Pani/Pan to, co przysługuje, i pierwsze kroki, bez pośpiechu.
        </p>
        <p className="max-w-prose leading-normal text-tekst-drugi">To symulacja. Wynik nie jest decyzją ZUS.</p>
      </div>

      <section aria-labelledby="oficjalne-tytul" className="flex flex-col gap-1 rounded-karta bg-white p-4 lg:p-6">
        <h2 id="oficjalne-tytul" className="text-lg font-bold leading-snug text-granat lg:text-xl">
          Oficjalne informacje
        </h2>
        <ul className="flex flex-col">
          {LINKI_STOPKA.map((k) => (
            <li key={k}>
              <LinkZewnetrzny href={LINKI[k].url}>{LINKI[k].nazwa}</LinkZewnetrzny>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sytuacje-tytul" className="flex flex-col gap-3">
        <h2 id="sytuacje-tytul" className="text-lg font-bold leading-snug text-granat lg:text-xl">
          Sytuacje do wyboru
        </h2>
        {TRUDNE_SYTUACJE.map((s) => (
          <KartaSytuacji key={s.id} sytuacja={s} />
        ))}
      </section>

      <OdpisAktu />
    </main>
  );
}
