"use client";

import { useState, useMemo, useEffect } from "react";
import AppShell from "@/components/AppShell";
import SectionHeader from "@/components/SectionHeader";
import TrackCard from "@/components/TrackCard";
import ShadowingRecorder from "@/components/ShadowingRecorder";
import { motion } from "framer-motion";
import { springs, reducedMotionTransition } from "@/lib/animations";
import { useReducedMotion } from "framer-motion";
import { DEMO_TRACKS } from "@/lib/seed-data";
import { TelegramSDK } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import type { Track } from "@/lib/types";

const CATEGORIES = [
  { id: "all", label: "Все" },
  { id: "calm", label: "Calm" },
  { id: "focus", label: "Focus" },
  { id: "energy", label: "Energy" },
  { id: "sleep", label: "Sleep" },
];

export default function LibraryPage() {
  const reduced = useReducedMotion();
  const [cat, setCat] = useState<string>("all");
  const [shadowTrack, setShadowTrack] = useState<Track | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [telegramId, setTelegramId] = useState<string | null>(null);

  // 1. Identify user (Telegram or Web)
  useEffect(() => {
    const u = TelegramSDK.getUser();
    if (u) {
      setTelegramId(String(u.id));
    }
  }, []);

  // 2. Poll Premium Status (Fix #4: links Premium status correctly to dynamic TrackCard components)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const r = await fetch(`/api/billing/me${telegramId ? `?telegramId=${telegramId}` : ""}`);
        const j = await r.json();
        if (typeof j.isPremium === "boolean") setIsPro(j.isPremium);
      } catch {
        /* ignore */
      }
    };
    void fetchStatus();
  }, [telegramId]);

  // 3. Fetch Real Tracks from Supabase Recommendations API (Fix #4b: pulls live database tracks instead of static mocks)
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        // Query the API based on the currently selected category tab
        const queryState = cat === "all" ? "calm" : cat;
        const r = await fetch(`/api/recommendations?state=${queryState}${telegramId ? `&telegramId=${telegramId}` : ""}`);
        const j = await r.json();
        if (active && Array.isArray(j.tracks)) {
          setTracks(j.tracks as Track[]);
        } else if (active) {
          setTracks(DEMO_TRACKS);
        }
      } catch {
        if (active) setTracks(DEMO_TRACKS);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [cat, telegramId]);

  // Fallback filtering if we are operating in offline-mock mode
  const filteredTracks = useMemo(() => {
    if (tracks.length > 0 && cat !== "all") {
      return tracks.filter((t) => t.category === cat);
    }
    if (tracks.length > 0) return tracks;
    
    // Offline local fallbacks
    if (cat === "all") return DEMO_TRACKS;
    return DEMO_TRACKS.filter((t) => t.category === cat);
  }, [tracks, cat]);

  return (
    <AppShell>
      <SectionHeader title="Библиотека треков" subtitle="Все уроки в одном месте" />

      {/* Categories Horizontal Tabs */}
      <div className="scrollbar-hide -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {CATEGORIES.map((c) => {
          const active = c.id === cat;
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-white/30 bg-white text-[#0D0D14]"
                  : "border-white/10 bg-white/5 text-white/70",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={cat}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={reduced ? reducedMotionTransition : springs.gentle}
        className="grid grid-cols-1 gap-3"
      >
        {filteredTracks.map((t) => (
          <div key={t.id} className="flex flex-col gap-2">
            <TrackCard track={t} isPro={isPro} />
            <button
              onClick={() => setShadowTrack(t)}
              className="self-end text-[11px] font-medium text-white/50 hover:text-white/80"
            >
              🎙️ Потренировать произношение
            </button>
          </div>
        ))}
      </motion.div>

      {shadowTrack && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={reduced ? reducedMotionTransition : springs.gentle}
          className="mt-6"
        >
          <SectionHeader title="Shadowing" subtitle="Повторите фразу вслух" />
          <ShadowingRecorder
            reference={shadowTrack.tokens.map((t) => t.english).join(" ")}
          />
        </motion.div>
      )}
    </AppShell>
  );
}
