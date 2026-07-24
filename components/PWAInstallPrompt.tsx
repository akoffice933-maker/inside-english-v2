'use client';

import React, { useState, useEffect } from 'react';

/**
 * PWAInstallPrompt Component for Inside English v2.0
 * 
 * Features:
 * 1. Handles modern Chromium browsers (Android, Chrome, Edge) using the 'beforeinstallprompt' hook.
 * 2. Provides elegant contextual instructions for iOS Safari users (Share -> Add to Home Screen),
 *    since iOS does not support automated installation triggers.
 * 3. Designed using the premium Inside dark theme and linear gradient styling.
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Detect if the device is iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // 2. Listen for 'beforeinstallprompt' (Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser pop-up banner
      e.preventDefault();
      // Store the event so it can be triggered manually later
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Check if already installed (standalone mode active)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native browser installation prompt
    deferredPrompt.prompt();

    // Wait for the user's decision
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Installation outcome: ${outcome}`);

    // Clear the stored prompt so it can't be used again
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (isDismissed) return null;

  // Render nothing if it's already installed or not supportable
  if (!isInstallable && !isIOS) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 bg-gradient-to-br from-[#1A1A2E] to-[#0D0D14] border border-[#7B61FF]/30 p-5 rounded-3xl shadow-2xl z-50 flex flex-col space-y-4">
      
      {/* Header and Close Button */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6C3CE1] to-[#E94057] flex items-center justify-center text-xl shadow-lg">
            🧘
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight text-white">Установите Inside English</h4>
            <p className="text-[11px] text-[#A0A0B0] font-light mt-0.5">Практикуйте язык оффлайн и засыпайте под гипно-треки.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsDismissed(true)}
          className="text-xs text-[#A0A0B0] hover:text-white bg-white/5 w-6 h-6 rounded-full flex items-center justify-center transition"
        >
          ✕
        </button>
      </div>

      {/* Action Buttons based on Platform */}
      {isIOS ? (
        // iOS Safari Instructions (No dynamic trigger possible)
        <div className="bg-white/5 border border-white/5 p-3 rounded-2xl space-y-2 text-xs text-[#A0A0B0] font-light">
          <p className="font-semibold text-white">Чтобы установить приложение на iPhone:</p>
          <ol className="list-decimal list-inside space-y-1 text-[11px]">
            <li>Нажмите на иконку <span className="text-[#7B61FF] font-semibold">«Поделиться»</span> (квадрат со стрелкой вверх) внизу экрана Safari.</li>
            <li>Прокрутите меню и выберите <span className="text-[#7B61FF] font-semibold">«На экран „Домой“»</span>.</li>
            <li>Нажмите <span className="text-white font-semibold">«Добавить»</span> в верхнем правом углу.</li>
          </ol>
        </div>
      ) : (
        // Android / Desktop Chrome Trigger
        <button
          onClick={handleInstallClick}
          className="w-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] hover:brightness-110 active:scale-[0.98] py-3 rounded-2xl text-xs font-semibold tracking-wider uppercase transition shadow-lg shadow-[#6C3CE1]/20 text-white"
        >
          Установить на устройство
        </button>
      )}
    </div>
  );
}
