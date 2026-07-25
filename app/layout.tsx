import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AudioProvider from "@/components/AudioProvider";
import { ALL_DEMO_TOKENS } from "@/lib/seed-data";

export const metadata: Metadata = {
  title: "Inside English — Учите английский через состояние",
  description:
    "Премиальное приложение для изучения английского через состояние расслабления и осознанности. Аудиоуроки, теневой анализ произношения, словарь.",
  applicationName: "Inside English",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Inside English",
  },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0D0D14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const SW_SCRIPT = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <script
          // Registers the service worker client-side.
          dangerouslySetInnerHTML={{ __html: SW_SCRIPT }}
        />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="bg-[#0D0D14] text-white antialiased">
        {/* Ambient blurred background blobs */}
        <div className="ambient-blob ambient-1" />
        <div className="ambient-blob ambient-2" />
        <div className="ambient-blob ambient-3" />

        <AudioProvider tokens={ALL_DEMO_TOKENS}>{children}</AudioProvider>
      </body>
    </html>
  );
}
