import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "./_components/service-worker-register";
import {
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  NIGHT_END_HOUR,
  NIGHT_START_HOUR,
  THEME_STORAGE_KEY,
} from "@/lib/domain/theme";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Runo",
  title: "Runo",
  description: "Recordar, empezar y volver a tu vida, un paso a la vez.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Runo",
  },
  formatDetection: {
    telephone: false,
  },
};

const themeScript = `(function(){try{var mode=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(mode!=="light"&&mode!=="dark"&&mode!=="auto"){mode="auto";}var hour=new Date().getHours();var dark=mode==="dark"||(mode==="auto"&&(hour>=${NIGHT_START_HOUR}||hour<${NIGHT_END_HOUR}));var theme=dark?"dark":"light";document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;var meta=document.querySelector('meta[name="theme-color"]');if(meta){meta.setAttribute("content",dark?${JSON.stringify(DARK_THEME_COLOR)}:${JSON.stringify(LIGHT_THEME_COLOR)});}}catch(e){}})();`;

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
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
