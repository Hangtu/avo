import type { Metadata } from "next";

import { DataDeletionContent } from "@/components/data-deletion-content";

export const metadata: Metadata = {
  title: "Eliminación de datos",
  description: "Borra tus datos locales o solicita la eliminación de tu cuenta y tus datos de Avo.",
  alternates: { canonical: "/data-deletion" },
  openGraph: {
    type: "article",
    url: "/data-deletion",
    title: "Eliminación de datos | Avo",
    description: "Borra tus datos locales o solicita la eliminación de tu cuenta y tus datos de Avo.",
  },
};

export default function DataDeletionPage() {
  return <DataDeletionContent />;
}
