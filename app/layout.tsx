import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { ShellI18nProvider } from "@/components/shell-i18n-provider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { defaultLocale, messages } from "@/lib/i18n/config";
import { themeBootScript } from "@/lib/domain/theme-boot";
import { siteName, siteUrl } from "@/lib/config/site";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

const description = messages[defaultLocale].meta.description;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: { default: siteName, template: `%s | ${siteName}` },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName,
    url: "/",
    title: siteName,
    description,
    locale: "es_MX",
  },
  twitter: { card: "summary", title: siteName, description },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteName,
  },
  formatDetection: {
    telephone: false,
  },
};

const themeScript = themeBootScript();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#EFF6F5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      data-ui="liquid"
      className={`${lexend.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ShellI18nProvider>
          <ServiceWorkerRegister />
          {children}
        </ShellI18nProvider>
      </body>
    </html>
  );
}
