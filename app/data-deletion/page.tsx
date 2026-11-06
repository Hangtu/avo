import type { Metadata } from "next";

import { DataDeletionContent } from "@/components/data-deletion-content";
import { socialImage } from "@/lib/config/social-image";

export const metadata: Metadata = {
  title: "Eliminación de datos",
  description: "Borra tus datos locales o solicita la eliminación de tu cuenta y tus datos de Avo.",
  alternates: { canonical: "/data-deletion" },
  openGraph: {
    type: "article",
    siteName: "Avo",
    locale: "es_MX",
    url: "/data-deletion",
    title: "Eliminación de datos | Avo",
    description: "Borra tus datos locales o solicita la eliminación de tu cuenta y tus datos de Avo.",
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eliminación de datos | Avo",
    description: "Borra tus datos locales o solicita la eliminación de tu cuenta y tus datos de Avo.",
    images: [socialImage],
  },
};

export default function DataDeletionPage() {
  return <DataDeletionContent />;
}
