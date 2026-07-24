import React from 'react';
import './globals.css';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import PersistentPlayer from '@/components/PersistentPlayer';

export const metadata = {
  title: 'Inside English v2.0',
  description: 'Премиальное языковое погружение и осознанность',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
};

/**
 * Root Layout for Inside English v2.0
 * Injects Telegram WebApp SDK, handles HTML body wrappers, and mounts PWA banners.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        {/* Telegram WebApp JavaScript SDK script */}
        <script src="https://telegram.org/js/telegram-web-app.js" defer></script>
      </head>
      <body className="bg-[#0D0D14] text-white min-h-screen relative overflow-x-hidden select-none">
        
        {/* Global Ambient Background Blur Elements */}
        <div className="fixed top-[-100px] left-[-100px] w-[350px] h-[350px] rounded-full blur-[140px] bg-[#6C3CE1]/15 pointer-events-none animate-ambient-1 z-0" />
        <div className="fixed bottom-[-100px] right-[-100px] w-[350px] h-[350px] rounded-full blur-[140px] bg-[#E94057]/10 pointer-events-none animate-ambient-2 z-0" />

        {/* Responsive layout container - displays beautiful mobile framing on desktop, full-width on mobile devices */}
        <main className="relative z-10 w-full max-w-md mx-auto min-h-screen flex flex-col bg-[#0D0D14]/80 shadow-2xl border-x border-white/5">
          
          {/* Main content viewport */}
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          
          {/* Persistent global audio player (floating mini player and expanded full-screen player) */}
          <PersistentPlayer />
          
          {/* Automatic PWA prompt mounted globally */}
          <PWAInstallPrompt />
        </main>
      </body>
    </html>
  );
}
