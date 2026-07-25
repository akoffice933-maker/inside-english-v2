/**
 * Static seed data for tracks, words, and recommendations.
 * Used as a client-side fallback when the Supabase-backed API is unreachable
 * or returns no results for a given state (see /api/recommendations).
 */

import type { Track, TrackToken } from "@/lib/types";

export type StudyWord = {
  id: number;
  english: string;
  russian: string;
  transcription?: string;
  example?: string;
  exampleTranslation?: string;
  category: string;
  x: number;
  y: number;
  z: number;
};

function mixed(russian: string, englishPart: string, english: string): string {
  // Wrap englishPart in a purple span to match the [mixed] rendering rule.
  return `${russian} <span class="text-[#7B61FF] font-medium">${englishPart}</span> ${english.replace(englishPart, "").trim()}`;
}

const TRACK_CALM_TOKENS: TrackToken[] = [
  { id: 1, start: 0, end: 3.5, russian: "Доброе утро.", english: "Good morning.", mixed: mixed("Доброе утро.", "Good morning", ".") },
  { id: 2, start: 3.5, end: 7.5, russian: "Я дышу глубоко и спокойно.", english: "I breathe deeply and calmly.", mixed: mixed("Я дышу глубоко и спокойно.", "breathe deeply", " and calmly.") },
  { id: 3, start: 7.5, end: 11.5, russian: "Этот момент — мой.", english: "This moment is mine.", mixed: mixed("Этот момент — мой.", "This moment", " is mine.") },
  { id: 4, start: 11.5, end: 16, russian: "Я чувствую покой внутри.", english: "I feel peace inside.", mixed: mixed("Я чувствую покой внутри.", "feel peace", " inside.") },
  { id: 5, start: 16, end: 20, russian: "Каждое слово — шаг вперёд.", english: "Every word is a step forward.", mixed: mixed("Каждое слово — шаг вперёд.", "step forward", ".") },
  { id: 6, start: 20, end: 24, russian: "Я учусь с радостью.", english: "I learn with joy.", mixed: mixed("Я учусь с радостью.", "learn with joy", ".") },
  { id: 7, start: 24, end: 28.5, russian: "Мой разум ясен и открыт.", english: "My mind is clear and open.", mixed: mixed("Мой разум ясен и открыт.", "mind is clear", " and open.") },
  { id: 8, start: 28.5, end: 33, russian: "Я благодарен за этот путь.", english: "I am grateful for this path.", mixed: mixed("Я благодарен за этот путь.", "grateful for", " this path.") },
];

const TRACK_FOCUS_TOKENS: TrackToken[] = [
  { id: 1, start: 0, end: 3, russian: "Сосредоточься.", english: "Focus.", mixed: mixed("Сосредоточься.", "Focus", ".") },
  { id: 2, start: 3, end: 7, russian: "Твоя цель ясна.", english: "Your goal is clear.", mixed: mixed("Твоя цель ясна.", "goal is clear", ".") },
  { id: 3, start: 7, end: 11.5, russian: "Каждое усилие имеет значение.", english: "Every effort matters.", mixed: mixed("Каждое усилие имеет значение.", "Every effort", " matters.") },
  { id: 4, start: 11.5, end: 15, russian: "Ты в потоке.", english: "You are in the flow.", mixed: mixed("Ты в потоке.", "in the flow", ".") },
  { id: 5, start: 15, end: 19, russian: "Продолжай двигаться вперёд.", english: "Keep moving forward.", mixed: mixed("Продолжай двигаться вперёд.", "Keep moving forward", ".") },
];

const TRACK_ENERGY_TOKENS: TrackToken[] = [
  { id: 1, start: 0, end: 3, russian: "Проснись и сияй!", english: "Wake up and shine!", mixed: mixed("Проснись и сияй!", "Wake up and shine", "!") },
  { id: 2, start: 3, end: 7, russian: "Сегодня — твой день.", english: "Today is your day.", mixed: mixed("Сегодня — твой день.", "your day", ".") },
  { id: 3, start: 7, end: 11, russian: "Действуй сейчас.", english: "Take action now.", mixed: mixed("Действуй сейчас.", "Take action", " now.") },
];

const TRACK_SLEEP_TOKENS: TrackToken[] = [
  { id: 1, start: 0, end: 4, russian: "Расслабь плечи.", english: "Relax your shoulders.", mixed: mixed("Расслабь плечи.", "Relax your", " shoulders.") },
  { id: 2, start: 4, end: 8, russian: "Дыхание замедляется.", english: "Your breath slows down.", mixed: mixed("Дыхание замедляется.", "breath slows down", ".") },
  { id: 3, start: 8, end: 12, russian: "Отпусти мысли.", english: "Let thoughts go.", mixed: mixed("Отпусти мысли.", "Let thoughts go", ".") },
  { id: 4, start: 12, end: 18, russian: "Ты в безопасности.", english: "You are safe.", mixed: mixed("Ты в безопасности.", "are safe", ".") },
];

export const DEMO_TRACKS: Track[] = [
  {
    id: "demo-1",
    slug: "morning-calm",
    title: "Morning Calm",
    artist: "Inside English",
    description: "Утренняя практика осознанности на английском",
    category: "calm",
    coverGradient: "from-[#6C3CE1] to-[#7B61FF]",
    durationSec: 33,
    audioUrl: "https://cdn.pixabay.com/audio/2022/03/15/audio_115b9c40b7.mp3",
    tokens: TRACK_CALM_TOKENS,
    isPremium: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    slug: "deep-focus",
    title: "Deep Focus",
    artist: "Inside English",
    description: "Тренировка концентрации на английском",
    category: "focus",
    coverGradient: "from-[#5B5BFF] to-[#7B61FF]",
    durationSec: 19,
    audioUrl: "https://cdn.pixabay.com/audio/2022/03/10/audio_270f49b83a.mp3",
    tokens: TRACK_FOCUS_TOKENS,
    isPremium: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-3",
    slug: "energy-boost",
    title: "Energy Boost",
    artist: "Inside English",
    description: "Заряжающий мини-урок",
    category: "energy",
    coverGradient: "from-[#E94057] to-[#FF7A5B]",
    durationSec: 11,
    audioUrl: "https://cdn.pixabay.com/audio/2022/03/22/audio_a83b6a2d4f.mp3",
    tokens: TRACK_ENERGY_TOKENS,
    isPremium: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-4",
    slug: "sleep-stories",
    title: "Sleep Stories",
    artist: "Inside English",
    description: "Колыбельная на английском",
    category: "sleep",
    coverGradient: "from-[#3A1F7A] to-[#6C3CE1]",
    durationSec: 18,
    audioUrl: "https://cdn.pixabay.com/audio/2022/05/27/audio_18557fd6b1.mp3",
    tokens: TRACK_SLEEP_TOKENS,
    isPremium: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-5",
    slug: "morning-flow",
    title: "Morning Flow",
    artist: "Inside English",
    description: "Плавный вход в день",
    category: "calm",
    coverGradient: "from-[#6C3CE1] to-[#E94057]",
    durationSec: 25,
    audioUrl: "https://cdn.pixabay.com/audio/2022/03/15/audio_115b9c40b7.mp3",
    tokens: TRACK_CALM_TOKENS,
    isPremium: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-6",
    slug: "focus-deep-work",
    title: "Focus · Deep Work",
    artist: "Inside English",
    description: "Для глубокой работы",
    category: "focus",
    coverGradient: "from-[#5B5BFF] to-[#E94057]",
    durationSec: 19,
    audioUrl: "https://cdn.pixabay.com/audio/2022/03/10/audio_270f49b83a.mp3",
    tokens: TRACK_FOCUS_TOKENS,
    isPremium: false,
    createdAt: new Date().toISOString(),
  },
];

export const DEMO_WORDS: StudyWord[] = [
  { id: 1, english: "breathe", russian: "дышать", transcription: "/briːð/", example: "Breathe deeply.", exampleTranslation: "Дышите глубоко.", category: "calm", x: -1, y: 0, z: 0 },
  { id: 2, english: "focus", russian: "фокус", transcription: "/ˈfəʊkəs/", example: "Stay focused.", exampleTranslation: "Оставайся сосредоточенным.", category: "focus", x: 1, y: 0, z: 0 },
  { id: 3, english: "energy", russian: "энергия", transcription: "/ˈɛnədʒi/", example: "Feel the energy.", exampleTranslation: "Почувствуй энергию.", category: "energy", x: 0, y: 1, z: 0 },
  { id: 4, english: "calm", russian: "спокойствие", transcription: "/kɑːm/", example: "Stay calm.", exampleTranslation: "Сохраняй спокойствие.", category: "calm", x: -1, y: 1, z: 0 },
  { id: 5, english: "flow", russian: "поток", transcription: "/fləʊ/", example: "Find your flow.", exampleTranslation: "Найди свой поток.", category: "focus", x: 1, y: 1, z: 0 },
  { id: 6, english: "mindful", russian: "осознанный", transcription: "/ˈmaɪndfʊl/", example: "Be mindful.", exampleTranslation: "Будь осознанным.", category: "calm", x: 0, y: -1, z: 0 },
  { id: 7, english: "grateful", russian: "благодарный", transcription: "/ˈɡreɪtfʊl/", example: "I am grateful.", exampleTranslation: "Я благодарен.", category: "calm", x: -1, y: -1, z: 0 },
  { id: 8, english: "confident", russian: "уверенный", transcription: "/ˈkɒnfɪdənt/", example: "Speak confidently.", exampleTranslation: "Говори уверенно.", category: "energy", x: 1, y: -1, z: 0 },
  { id: 9, english: "awareness", russian: "осознанность", transcription: "/əˈweənəs/", example: "Build awareness.", exampleTranslation: "Развивай осознанность.", category: "calm", x: 0, y: 0, z: 1 },
  { id: 10, english: "balance", russian: "баланс", transcription: "/ˈbæləns/", example: "Keep balance.", exampleTranslation: "Сохраняй баланс.", category: "focus", x: 0, y: 0, z: -1 },
];

/** Combined tokens across demo tracks for the persistent player to render lyrics. */
export const ALL_DEMO_TOKENS: TrackToken[] = DEMO_TRACKS.flatMap((t) => t.tokens);
