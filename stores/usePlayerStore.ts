"use client";

/**
 * Global player state with Zustand.
 * The native `HTMLAudioElement` instance is created lazily on the client
 * and is shared across all components that subscribe to this store.
 *
 * Sync rule: POST /api/tracks/[id]/progress
 *  - every 10s of continuous playback
 *  - on pause()
 *  - on ended
 *
 * NOTE: `trackId` is a string (Supabase `tracks.id` is a UUID), and the
 * progress sync payload matches the existing Supabase-backed route's
 * contract: { currentTime, duration } — NOT { positionSec, completed }.
 */

import { create } from "zustand";
import type { TrackToken } from "@/lib/types";

export type LanguageMode = "russian" | "mixed" | "english";

export type MiniPlayerState = {
  trackId: string | null;
  title: string;
  artist: string;
  coverGradient: string;
  audioUrl: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isLoading: boolean;
  isFullscreen: boolean;
  language: LanguageMode;
  lastSyncedAt: number;
  tokens: TrackToken[]; // Added tokens directly to the player state to prevent lyric collisions (Vulnerability Fix)
};

type PlayerStore = MiniPlayerState & {
  audio: HTMLAudioElement | null;
  syncTimer: ReturnType<typeof setInterval> | null;
  setAudio: (audio: HTMLAudioElement) => void;
  loadTrack: (track: {
    id: string;
    title: string;
    artist: string;
    coverGradient: string;
    audioUrl: string;
    duration: number;
    tokens: TrackToken[];
  }) => void;
  togglePlay: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setLoading: (b: boolean) => void;
  setFullscreen: (b: boolean) => void;
  setLanguage: (l: LanguageMode) => void;
  stop: () => void;
  reset: () => void;
};

const initialState: MiniPlayerState = {
  trackId: null,
  title: "",
  artist: "",
  coverGradient: "from-[#6C3CE1] to-[#E94057]",
  audioUrl: "",
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  isLoading: false,
  isFullscreen: false,
  language: "mixed",
  lastSyncedAt: 0,
  tokens: [],
};

const SYNC_INTERVAL_MS = 10_000;

/**
 * Matches the existing Supabase-backed route's contract exactly:
 * POST /api/tracks/[id]/progress  body: { currentTime, duration }
 */
async function postProgress(trackId: string, currentTime: number, duration: number): Promise<void> {
  if (!duration || duration <= 0) return;
  try {
    await fetch(`/api/tracks/${trackId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentTime, duration }),
      keepalive: true,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[player] progress sync failed", err);
    }
  }
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  ...initialState,
  audio: null,
  syncTimer: null,

  setAudio: (audio) => set({ audio }),

  loadTrack: (track) => {
    const { audio } = get();
    if (!audio) return;
    if (get().trackId === track.id && get().audioUrl === track.audioUrl) {
      return;
    }
    audio.pause();
    audio.src = track.audioUrl;
    audio.load();
    set({
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      coverGradient: track.coverGradient,
      audioUrl: track.audioUrl,
      duration: track.duration,
      currentTime: 0,
      isPlaying: false,
      isLoading: true,
      tokens: track.tokens || [], // Store the active track's tokens
    });
  },

  play: async () => {
    const { audio, syncTimer } = get();
    if (!audio) return;
    try {
      await audio.play();
      set({ isPlaying: true });
      if (!syncTimer && get().trackId) {
        const id = get().trackId;
        const t = setInterval(() => {
          const { audio: a, isPlaying: p, duration: d } = get();
          if (!a || !p || !id) return;
          void postProgress(id, Math.floor(a.currentTime), d);
        }, SYNC_INTERVAL_MS);
        set({ syncTimer: t });
      }
    } catch (err) {
      console.warn("[player] play() rejected", err);
      set({ isPlaying: false });
    }
  },

  pause: () => {
    const { audio, syncTimer, trackId, currentTime, duration } = get();
    if (!audio) return;
    audio.pause();
    set({ isPlaying: false });
    if (trackId) void postProgress(trackId, Math.floor(currentTime), duration);
    if (syncTimer) {
      clearInterval(syncTimer);
      set({ syncTimer: null });
    }
  },

  togglePlay: async () => {
    if (get().isPlaying) get().pause();
    else await get().play();
  },

  seek: (time) => {
    const { audio, duration } = get();
    if (!audio) return;
    const clamped = Math.max(0, Math.min(time, duration || audio.duration || 0));
    audio.currentTime = clamped;
    set({ currentTime: clamped });
  },

  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setLoading: (b) => set({ isLoading: b }),
  setFullscreen: (b) => set({ isFullscreen: b }),
  setLanguage: (l) => set({ language: l }),

  stop: () => {
    const { audio, syncTimer, trackId, currentTime, duration } = get();
    if (audio) {
      if (trackId) void postProgress(trackId, Math.floor(currentTime), duration);
      audio.pause();
      audio.currentTime = 0;
    }
    if (syncTimer) clearInterval(syncTimer);
    set({ ...initialState, syncTimer: null });
  },

  reset: () => {
    const { syncTimer } = get();
    if (syncTimer) clearInterval(syncTimer);
    set({ ...initialState, audio: get().audio, syncTimer: null });
  },
}));

/** Returns the current token to highlight given the audio time and tokens array. */
export function findActiveTokenIndex<T extends { start: number; end: number }>(
  tokens: T[],
  time: number,
): number {
  for (let i = 0; i < tokens.length; i++) {
    if (time >= tokens[i].start && time <= tokens[i].end) return i;
  }
  return -1;
}
