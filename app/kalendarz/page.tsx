import type { Metadata } from "next";
import { ListaTerminow } from "../../src/components/kalendarz/ListaTerminow";

export const metadata: Metadata = {
  title: "Kalendarz terminów",
};

export default function KalendarzPage() {
  return <ListaTerminow />;
}
