"use client";

import { useEffect, type ReactNode } from "react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import PersistentPlayer from "@/components/PersistentPlayer";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { TelegramSDK } from "@/lib/telegram";
import type { TrackToken } from "@/lib/types";

type Props = {
  tokens: TrackToken[];
  children: ReactNode;
};

/**
 * Mounts the global audio element, initializes the Telegram SDK on the client,
 * and renders the persistent player + PWA install prompt above the page content.
 */
export default function AudioProvider({ tokens, children }: Props) {
  // Initialize Telegram SDK once on the client.
  useEffect(() => {
    TelegramSDK.ready();
  }, []);

  return (
    <>
      {children}
      <PersistentPlayer tokens={tokens} />
      <PWAInstallPrompt />
    </>
  );
}

/** Helper hook used by track cards. */
export function useLoadTrack() {
  const loadTrack = usePlayerStore((s) => s.loadTrack);
  return loadTrack;
}
