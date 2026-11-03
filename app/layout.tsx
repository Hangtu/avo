import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { ShellI18nProvider } from "./_components/shell-i18n-provider";
import { ServiceWorkerRegister } from "./_components/service-worker-register";
import { defaultLocale, messages } from "@/lib/i18n/config";
import { themeBootScript } from "@/lib/domain/theme-boot";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Avo",
  title: "Avo",
  description: messages[defaultLocale].meta.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Avo",
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
