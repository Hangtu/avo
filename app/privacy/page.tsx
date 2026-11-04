import type { Metadata } from "next";

import { PrivacyContent } from "@/components/privacy-content";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: "Cómo Avo usa y protege tus datos, y cómo solicitar su eliminación.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "article",
    url: "/privacy",
    title: "Aviso de privacidad | Avo",
    description: "Cómo Avo usa y protege tus datos, y cómo solicitar su eliminación.",
  },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
