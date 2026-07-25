/**
 * Frontend-only Track/TrackToken types.
 *
 * These mirror the shape returned by our Supabase-backed API routes
 * (see /api/recommendations, /api/tracks). `id` is a string because
 * Supabase `tracks.id` is a UUID — NOT a Drizzle serial integer.
 */

export type TrackToken = {
  id: number;
  start: number;
  end: number;
  russian: string;
  english: string;
  mixed: string; // may contain inline <span class="text-[#7B61FF]"> tags
};

export type Track = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  description?: string | null;
  category: "calm" | "focus" | "energy" | "sleep";
  coverGradient: string;
  durationSec: number;
  audioUrl: string;
  tokens: TrackToken[];
  isPremium: boolean;
  createdAt?: string;
};
