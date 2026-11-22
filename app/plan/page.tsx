import type { Metadata } from "next";
import { EkranPlanu } from "../../src/components/plan/EkranPlanu";

export const metadata: Metadata = {
  title: "Plan urlopów",
};

export default function PlanPage() {
  return <EkranPlanu />;
}
