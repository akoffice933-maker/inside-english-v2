"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, X, Share, Plus } from "lucide-react";
import { springs, reducedMotionTransition } from "@/lib/animations";

type Platform = "ios" | "android" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Mac|Windows|Linux/.test(ua)) return "desktop";
  return "unknown";
}

type Props = {
  /** Hide the prompt if the user dismisses it; default: until dismissed */
  storageKey?: string;
};

export default function PWAInstallPrompt({ storageKey = "ie_pwa_dismissed_v1" }: Props) {
  const reduced = useReducedMotion();
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [deferredPrompt, setDeferredPrompt] = useState<unknown>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey) === "1") return;

    const p = detectPlatform();
    setPlatform(p);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari has no event — show a manual hint if accessed on iOS
    if (p === "ios" && !window.matchMedia("(display-mode: standalone)").matches) {
      const t = window.setTimeout(() => setVisible(true), 6000);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    // Desktop: prompt after a short delay if installable
    if (p === "desktop") {
      const t = window.setTimeout(() => {
        if ((window as unknown as { __deferredPrompt?: unknown }).__deferredPrompt) {
          setVisible(true);
        }
      }, 8000);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, [storageKey]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    const prompt = deferredPrompt as { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null;
    if (!prompt) {
      setShowIosHelp(true);
      return;
    }
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa"
          initial={reduced ? { opacity: 0 } : { y: 80, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: 80, opacity: 0 }}
          transition={reduced ? reducedMotionTransition : springs.gentle}
          className="fixed inset-x-3 bottom-24 z-30 sm:bottom-28"
        >
          <div className="glass-panel-strong mx-auto flex max-w-md items-center gap-3 p-4 shadow-glow-purple">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#6C3CE1] to-[#E94057]">
              {platform === "ios" ? <Share size={18} className="text-white" /> : <Download size={18} className="text-white" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">
                Установите Inside English
              </div>
              <div className="mt-0.5 text-xs text-white/60">
                {platform === "ios"
                  ? "Нажмите «Поделиться» → «На экран Домой»"
                  : "Слушайте уроки оффлайн, без рекламы"}
              </div>
            </div>
            <button
              onClick={install}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0D0D14]"
            >
              Установить
            </button>
            <button
              onClick={dismiss}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/60"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {showIosHelp && (
            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={reduced ? reducedMotionTransition : springs.gentle}
              className="glass-panel mx-auto mt-2 max-w-md p-4 text-sm text-white/80"
            >
              <div className="flex items-start gap-2">
                <Plus size={16} className="mt-0.5 shrink-0 text-[#7B61FF]" />
                <p>
                  Откройте <strong>«Поделиться»</strong> внизу экрана Safari и выберите{" "}
                  <strong>«На экран Домой»</strong>.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
