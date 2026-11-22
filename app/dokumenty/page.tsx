import type { Metadata } from "next";
import { EkranDokumentow } from "../../src/components/dokumenty/EkranDokumentow";

export const metadata: Metadata = {
  title: "Dokumenty",
};

export default function DokumentyPage() {
  return <EkranDokumentow />;
}
