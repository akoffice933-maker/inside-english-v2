"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Play, Lock, Clock, Headphones } from "lucide-react";
import { springs, reducedMotionTransition } from "@/lib/animations";
import { TelegramSDK } from "@/lib/telegram";
import { cn, formatTime } from "@/lib/utils";
import { usePlayerStore } from "@/stores/usePlayerStore";
import type { Track } from "@/lib/types";

type Props = {
  track: Track;
  isPro?: boolean;
};

export default function TrackCard({ track, isPro = false }: Props) {
  const reduced = useReducedMotion();
  const loadTrack = usePlayerStore((s) => s.loadTrack);
  const play = usePlayerStore((s) => s.play);
  const setFullscreen = usePlayerStore((s) => s.setFullscreen);
  const currentTrackId = usePlayerStore((s) => s.trackId);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isActive = currentTrackId === track.id;

  const locked = track.isPremium && !isPro;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (locked) {
      TelegramSDK.triggerHaptic("soft");
      window.location.href = "/#pricing";
      return;
    }
    TelegramSDK.triggerHaptic("medium");
    loadTrack({
      id: track.id,
      title: track.title,
      artist: track.artist,
      coverGradient: track.coverGradient,
      audioUrl: track.audioUrl,
      duration: track.durationSec,
      tokens: track.tokens || [],
    });
    setFullscreen(true);
    // Defer play until after the player mounts
    setTimeout(() => void play(), 60);
  };

  return (
    <motion.button
      whileHover={reduced ? undefined : { y: -2 }}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      transition={springs.gentle}
      onClick={handlePlay}
      className={cn(
        "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-3 text-left transition-colors",
        isActive
          ? "border-[#7B61FF]/60 bg-[#7B61FF]/10"
          : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]",
      )}
    >
      <div
        className={cn(
          "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br shadow-glow-purple",
          track.coverGradient,
        )}
      >
        <div className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/30">
          {locked ? (
            <Lock size={18} className="text-white" />
          ) : isActive && isPlaying ? (
            <Headphones size={18} className="text-white" />
          ) : (
            <Play size={18} className="ml-0.5 text-white" fill="currentColor" />
          )}
        </div>
        {isActive && (
          <div className="absolute inset-0 bg-[#7B61FF]/30 mix-blend-overlay" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-semibold text-white">{track.title}</h4>
          {track.isPremium && (
            <span className="rounded-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              PRO
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-white/50">{track.artist}</div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/40">
          <Clock size={11} />
          {formatTime(track.durationSec)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {locked ? (
          <div className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-medium text-white/60">
            PRO
          </div>
        ) : (
          <motion.div
            whileTap={reduced ? undefined : { scale: 0.9 }}
            transition={springs.snappy}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white"
            aria-hidden
          >
            <Play size={14} fill="currentColor" className="ml-0.5" />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}
