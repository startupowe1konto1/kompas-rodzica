import type { Metadata } from "next";
import { Porownanie } from "../../../src/components/porownanie/Porownanie";

export const metadata: Metadata = {
  title: "Porównaj warianty",
};

export default function PorownaniePage() {
  return <Porownanie />;
}
