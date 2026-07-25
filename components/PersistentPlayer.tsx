"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Play,
  Pause,
  X,
  Maximize2,
  Minimize2,
  ChevronUp,
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayerStore, findActiveTokenIndex } from "@/stores/usePlayerStore";
import { springs, reducedMotionTransition } from "@/lib/animations";
import { cn, formatTime } from "@/lib/utils";
import { TelegramSDK } from "@/lib/telegram";
import type { TrackToken } from "@/lib/types";

type Props = {
  tokens: TrackToken[];
};

export default function PersistentPlayer({ tokens }: Props) {
  const {
    trackId,
    title,
    artist,
    coverGradient,
    audioUrl,
    duration,
    currentTime,
    isPlaying,
    isFullscreen,
    language,
    setAudio,
    play,
    pause,
    seek,
    setCurrentTime,
    setDuration,
    setLoading,
    setFullscreen,
    setLanguage,
    togglePlay,
  } = usePlayerStore();

  const reduced = useReducedMotion();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);

  // Mount a single audio element and register it with the store.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (audioRef.current) return;
    const a = new Audio();
    a.preload = "metadata";
    a.crossOrigin = "anonymous";
    audioRef.current = a;
    setAudio(a);

    const onTime = () => setCurrentTime(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onLoad = () => setLoading(false);
    const onCanPlay = () => setLoading(false);
    const onWaiting = () => setLoading(true);
    const onEnded = () => {
      pause();
      const id = usePlayerStore.getState().trackId;
      if (id) {
        void fetch(`/api/tracks/${id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positionSec: 0, completed: true }),
        }).catch(() => undefined);
      }
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("loadstart", onLoad);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("loadstart", onLoad);
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("ended", onEnded);
    };
  }, [setAudio, setCurrentTime, setDuration, setLoading, pause]);

  // React to source changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audioUrl) return;
    if (a.src !== audioUrl) {
      a.src = audioUrl;
      a.load();
    }
  }, [audioUrl]);

  // Apply volume / mute
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const activeIndex = useMemo(
    () => findActiveTokenIndex(tokens, currentTime),
    [tokens, currentTime],
  );

  if (!trackId) return null;

  const miniSpring = reduced ? reducedMotionTransition : springs.gentle;

  return (
    <>
      {/* MINI BAR */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            key="mini"
            initial={reduced ? { opacity: 0 } : { y: 100, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 100, opacity: 0 }}
            transition={miniSpring}
            className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-none"
          >
            <button
              onClick={() => {
                setFullscreen(true);
                TelegramSDK.triggerHaptic("light");
              }}
              className="pointer-events-auto mx-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(26,26,46,0.85)] p-3 backdrop-blur-xl shadow-glow-purple"
            >
              <div
                className={cn(
                  "relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br shadow-glow-purple",
                  coverGradient,
                )}
              >
                {isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center gap-[2px]">
                    <span className="h-3 w-[2px] animate-pulse bg-white" />
                    <span className="h-5 w-[2px] animate-pulse bg-white" style={{ animationDelay: "120ms" }} />
                    <span className="h-2 w-[2px] animate-pulse bg-white" style={{ animationDelay: "240ms" }} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm font-semibold text-white">{title}</div>
                <div className="truncate text-xs text-white/60">{artist}</div>
                <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] transition-[width] duration-150 ease-linear"
                    style={{ width: `${(duration ? currentTime / duration : 0) * 100}%` }}
                  />
                </div>
              </div>

              <motion.button
                whileTap={reduced ? undefined : { scale: 0.92 }}
                transition={springs.snappy}
                onClick={(e) => {
                  e.stopPropagation();
                  TelegramSDK.triggerHaptic("light");
                  void togglePlay();
                }}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#0D0D14]"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
              </motion.button>

              <ChevronUp size={18} className="shrink-0 text-white/60" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            key="full"
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={reduced ? reducedMotionTransition : springs.slow}
            className="fixed inset-0 z-50 overflow-y-auto bg-[#0D0D14]"
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40", coverGradient)} />
            <div className="absolute inset-0 bg-[#0D0D14]/70 backdrop-blur-3xl" />

            <div className="relative z-10 flex min-h-full flex-col px-5 pt-6 pb-10 sm:mx-auto sm:max-w-xl">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFullscreen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white"
                  aria-label="Minimize"
                >
                  <Minimize2 size={18} />
                </button>
                <div className="text-center">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                    Now playing
                  </div>
                  <div className="text-sm font-medium text-white/80">{artist}</div>
                </div>
                <button
                  onClick={() => usePlayerStore.getState().stop()}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <motion.div
                layout
                className={cn(
                  "mx-auto mt-10 h-64 w-64 shrink-0 rounded-[2rem] bg-gradient-to-br shadow-glow-purple",
                  coverGradient,
                )}
                animate={
                  reduced
                    ? {}
                    : isPlaying
                      ? { scale: [1, 1.02, 1] }
                      : { scale: 1 }
                }
                transition={reduced ? reducedMotionTransition : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="grid h-full place-items-center">
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-white/10 backdrop-blur-md">
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-white/20">
                      <Play size={28} className="text-white" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="mt-8 text-center">
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                <p className="mt-1 text-sm text-white/60">{artist}</p>
              </div>

              {/* LYRICS */}
              <div className="mt-8 max-h-[260px] flex-1 overflow-y-auto pr-1">
                {tokens.map((t, i) => {
                  const isPast = currentTime > t.end;
                  const isActive = i === activeIndex;
                  const opacity = isActive ? 1 : isPast ? 0.4 : 0.1;
                  return (
                    <motion.p
                      key={t.id}
                      animate={
                        reduced
                          ? { opacity, color: isActive ? "#FFFFFF" : "#A0A0B0" }
                          : {
                              opacity,
                              scale: isActive ? 1.02 : 1,
                              color: isActive ? "#FFFFFF" : "#A0A0B0",
                            }
                      }
                      transition={reduced ? reducedMotionTransition : springs.gentle}
                      className={cn(
                        "mb-3 text-lg leading-relaxed",
                        isActive && "text-glow-purple font-semibold",
                      )}
                    >
                      {renderToken(t, language)}
                    </motion.p>
                  );
                })}
              </div>

              {/* PROGRESS */}
              <div className="mt-6">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="audio-progress"
                />
                <div className="mt-1 flex justify-between text-xs text-white/50">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* TRANSPORT */}
              <div className="mt-4 flex items-center justify-between">
                <motion.button
                  whileTap={reduced ? undefined : { scale: 0.9 }}
                  transition={springs.snappy}
                  onClick={() => setMuted((m) => !m)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/80"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </motion.button>
                <div className="flex items-center gap-4">
                  <motion.button
                    whileTap={reduced ? undefined : { scale: 0.9 }}
                    transition={springs.snappy}
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/80"
                    aria-label="Shuffle"
                  >
                    <Shuffle size={16} />
                  </motion.button>
                  <motion.button
                    whileTap={reduced ? undefined : { scale: 0.9 }}
                    transition={springs.snappy}
                    onClick={() => seek(currentTime - 10)}
                    className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white"
                    aria-label="Back 10s"
                  >
                    <span className="text-xs font-bold">−10</span>
                  </motion.button>
                  <motion.button
                    whileTap={reduced ? undefined : { scale: 0.92 }}
                    transition={springs.bouncy}
                    onClick={() => {
                      TelegramSDK.triggerHaptic("medium");
                      void togglePlay();
                    }}
                    className="grid h-16 w-16 place-items-center rounded-full bg-white text-[#0D0D14] shadow-glow-purple"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-1" />}
                  </motion.button>
                  <motion.button
                    whileTap={reduced ? undefined : { scale: 0.9 }}
                    transition={springs.snappy}
                    onClick={() => seek(currentTime + 10)}
                    className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white"
                    aria-label="Forward 10s"
                  >
                    <span className="text-xs font-bold">+10</span>
                  </motion.button>
                  <motion.button
                    whileTap={reduced ? undefined : { scale: 0.9 }}
                    transition={springs.snappy}
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/80"
                    aria-label="Repeat"
                  >
                    <Repeat size={16} />
                  </motion.button>
                </div>
                <div className="w-10" />
              </div>

              {/* LANGUAGE SWITCHER */}
              <div className="mt-6">
                <LanguageSwitcher value={language} onChange={setLanguage} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function renderToken(token: TrackToken, mode: "russian" | "mixed" | "english") {
  if (mode === "russian") return token.russian;
  if (mode === "english") return token.english;
  // mixed: contains inline <span class="text-[#7B61FF] font-medium">…</span>
  return (
    <span
      // The mixed string is authored HTML we control server-side; safe by design.
      dangerouslySetInnerHTML={{ __html: token.mixed }}
    />
  );
}

function LanguageSwitcher({
  value,
  onChange,
}: {
  value: "russian" | "mixed" | "english";
  onChange: (v: "russian" | "mixed" | "english") => void;
}) {
  const reduced = useReducedMotion();
  const opts: { id: "russian" | "mixed" | "english"; label: string }[] = [
    { id: "russian", label: "RU" },
    { id: "mixed", label: "RU · EN" },
    { id: "english", label: "EN" },
  ];
  return (
    <div className="relative grid grid-cols-3 rounded-2xl border border-white/10 bg-white/5 p-1 text-sm">
      {opts.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => {
              TelegramSDK.triggerHaptic("light");
              onChange(o.id);
            }}
            className={cn(
              "relative z-10 rounded-xl px-3 py-2 font-medium transition-colors",
              active ? "text-white" : "text-white/60",
            )}
          >
            {active && (
              <motion.span
                layoutId="lang-active"
                className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-[#6C3CE1] to-[#E94057] shadow-glow-purple"
                transition={reduced ? reducedMotionTransition : springs.gentle}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
