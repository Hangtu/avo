import type { Metadata } from "next";

import { PrivacyContent } from "@/components/privacy-content";
import { socialImage } from "@/lib/config/social-image";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: "Cómo Avo usa y protege tus datos, y cómo solicitar su eliminación.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "article",
    siteName: "Avo",
    locale: "es_MX",
    url: "/privacy",
    title: "Aviso de privacidad | Avo",
    description: "Cómo Avo usa y protege tus datos, y cómo solicitar su eliminación.",
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aviso de privacidad | Avo",
    description: "Cómo Avo usa y protege tus datos, y cómo solicitar su eliminación.",
    images: [socialImage],
  },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
