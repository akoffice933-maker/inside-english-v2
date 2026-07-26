"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sparkles, ArrowRight, BookOpen, BrainCircuit } from "lucide-react";
import AppShell from "@/components/AppShell";
import StateSelector, { type AppState } from "@/components/StateSelector";
import SectionHeader from "@/components/SectionHeader";
import RecommendationRail from "@/components/RecommendationRail";
import PremiumBadge, { PremiumCard } from "@/components/PremiumBadge";
import InteractiveStudyDemo from "@/components/InteractiveStudyDemo";
import { TelegramSDK } from "@/lib/telegram";
import { springs, reducedMotionTransition } from "@/lib/animations";
import { useReducedMotion } from "framer-motion";
import { DEMO_TRACKS, DEMO_WORDS } from "@/lib/seed-data";
import { usePlayerStore } from "@/stores/usePlayerStore";
import type { Track } from "@/lib/types";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function DashboardPage() {
  const reduced = useReducedMotion();
  const [state, setState] = useState<AppState>("calm");
  const [isPro, setIsPro] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [streak] = useState(7);

  // AI Coach check-in states (Fixes TMA AI integration Sprint 1)
  const [moodInput, setMoodInput] = useState('');
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [coachIntro, setCoachIntro] = useState<string | null>(null);

  const loadTrack = usePlayerStore((s) => s.loadTrack);
  const play = usePlayerStore((s) => s.play);
  const setFullscreen = usePlayerStore((s) => s.setFullscreen);

  // Identify the user (Telegram or web).
  useEffect(() => {
    const u = TelegramSDK.getUser();
    if (u) {
      setTelegramId(String(u.id));
      const platform = TelegramSDK.getPlatform();
      if (platform === "ios" || platform === "android" || platform === "macos") {
        document.body.classList.add("tma");
      }
    } else {
      setTelegramId(null);
    }
  }, []);

  // Poll premium status.
  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      try {
        const r = await fetch(`/api/billing/me${telegramId ? `?telegramId=${telegramId}` : ""}`);
        const j = await r.json();
        if (active && typeof j.isPremium === "boolean") setIsPro(j.isPremium);
      } catch {
        /* ignore */
      }
    };
    void fetchStatus();
    const id = window.setInterval(fetchStatus, 15_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [telegramId]);

  // Fetch recommendations per state.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/recommendations?state=${state}${telegramId ? `&telegramId=${telegramId}` : ""}`);
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
  }, [state, telegramId]);

  const tracksByState = useMemo(() => {
    const map: Record<AppState, Track[]> = {
      calm: [],
      focus: [],
      energy: [],
      sleep: [],
    };
    for (const t of tracks) {
      const cat = (t.category as AppState) ?? "calm";
      if (map[cat]) map[cat].push(t);
    }
    for (const k of Object.keys(map) as AppState[]) {
      if (map[k].length === 0) {
        map[k] = DEMO_TRACKS.filter((t) => t.category === k);
      }
    }
    return map;
  }, [tracks]);

  // Handles real ИИ-Коуч check-in (Fixes TMA AI integration Sprint 1)
  const handleCoachCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodInput.trim() || isCoachLoading) return;

    setIsCoachLoading(true);
    setCoachIntro(null);
    TelegramSDK.triggerHaptic('medium');

    try {
      const response = await fetch('/api/ai/coach/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state,
          moodInput,
          telegramId: telegramId || undefined
        }),
      });

      if (!response.ok) {
        throw new Error('API failed');
      }

      const { data } = await response.json();
      
      // Flash the soothing intro message from the Coach
      setCoachIntro(data.introText);
      TelegramSDK.triggerHaptic('success');

      // Construct a dynamic Track object matching usePlayerStore layout
      const aiGeneratedTrack: any = {
        id: 'ai-generated-session',
        slug: 'ai-custom-affirmation',
        title: 'Персональная сонастройка',
        artist: 'ИИ-Коуч Inside',
        description: 'Ваша уникальная аффирмация под текущее настроение.',
        category: state,
        coverGradient: state === 'sleep' ? 'from-[#3A1F7A] to-[#1A1A2E]' : 'from-[#6C3CE1] to-[#E94057]',
        duration: 15,
        audioUrl: `${BASE_PATH}/audio/morning_calm.mp3`, // beautiful relaxing static sound
        tokens: data.affirmationTokens,
        isPremium: false,
        createdAt: new Date().toISOString()
      };

      // Load and autoplay the customized lesson!
      setTimeout(() => {
        loadTrack(aiGeneratedTrack);
        setFullscreen(true);
        setTimeout(() => void play(), 80);
        setIsCoachLoading(false);
        setMoodInput('');
      }, 3500); // Allow 3.5s for the user to read the Coach's intro

    } catch (err) {
      console.error('AI Coach check-in failed:', err);
      alert('Нейросеть временно перегружена. Пожалуйста, повторите через минуту 🧘.');
      setIsCoachLoading(false);
    }
  };

  const welcomeHeaderSpring = reduced ? { opacity: 1 } : { opacity: 1, y: 0 };
  const welcomeHeaderInitial = reduced ? { opacity: 0 } : { opacity: 0, y: 12 };

  return (
    <AppShell>
      {/* HERO */}
      <motion.section
        initial={welcomeHeaderInitial}
        animate={welcomeHeaderSpring}
        transition={reduced ? reducedMotionTransition : springs.gentle}
        className="glass-panel relative mb-6 overflow-hidden p-5 sm:p-7"
      >
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#6C3CE1] opacity-30 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-[#E94057] opacity-25 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/50">
              Добро пожаловать
            </div>
            <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">
              Учите английский в состоянии <span className="text-gradient-primary">потока</span>
            </h1>
            <p className="mt-1.5 max-w-sm text-sm text-white/60">
              Аудиоуроки, теневой анализ произношения и 3D-словарь.
            </p>
          </div>
          <PremiumBadge isPro={isPro} onUpgrade={() => {
            TelegramSDK.triggerHaptic("medium");
            window.location.href = "/premium";
          }} />
        </div>

        <div className="relative mt-5 flex items-center gap-2 text-xs text-white/60">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#FF7A5B] to-[#E94057]">
            <Flame size={14} className="text-white" />
          </span>
          <span>
            <strong className="text-white">{streak}</strong> дней подряд
          </span>
        </div>
      </motion.section>

      {/* STATE SELECTOR */}
      <section className="mb-7">
        <SectionHeader title="Выберите состояние" subtitle="Что вы сейчас чувствуете?" />
        <StateSelector selected={state} onSelect={setState} />
      </section>

      {/* ==========================================
          5. NEW FEATURE: AI MOOD COACH CHECK-IN (Sprint 1)
          ========================================== */}
      <section className="mb-7">
        <SectionHeader title="✨ ИИ-Коуч Состояния" subtitle="Получите персональный урок под ваше настроение" />
        
        <form onSubmit={handleCoachCheckIn} className="glass-panel p-5 rounded-3xl space-y-4 border border-[#7B61FF]/30 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-16 h-16 bg-[#7B61FF]/10 rounded-full blur-xl" />
          
          <div className="space-y-1">
            <label className="text-[11px] text-[#A0A0B0] font-light uppercase tracking-wider block">Как вы себя чувствуете прямо сейчас?</label>
            <textarea
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
              placeholder={state === 'sleep' ? "Устал на работе, гудит голова от звонков, хочу расслабиться перед сном..." : "Много задач на день, нужен фокус и заряд бодрости на английском!"}
              className="w-full bg-black/30 border border-white/5 focus:border-[#7B61FF]/50 rounded-2xl p-3.5 text-xs text-white/90 placeholder-white/30 focus:outline-none resize-none h-20 transition"
              disabled={isCoachLoading}
              maxLength={200}
            />
          </div>

          <button
            type="submit"
            disabled={!moodInput.trim() || isCoachLoading}
            className={`w-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed py-3.5 rounded-2xl text-xs font-bold tracking-wider uppercase transition shadow-lg shadow-[#6C3CE1]/20 text-white flex items-center justify-center space-x-2`}
          >
            {isCoachLoading ? (
              <span className="w-5.5 h-5.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <BrainCircuit size={15} />
                <span>Создать ИИ-Урок состояния</span>
              </>
            )}
          </button>

          {/* Smooth Fade-in Intro overlay from the Coach */}
          <AnimatePresence>
            {coachIntro && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-[#1E123A]/95 border border-[#7B61FF]/40 rounded-2xl p-4 text-xs space-y-1.5 leading-relaxed"
              >
                <span className="text-[9px] font-bold text-[#7B61FF] uppercase tracking-wider block">ИИ-Коуч Inside:</span>
                <p className="text-white/90 font-serif italic">"{coachIntro}"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </section>

      {/* RECOMMENDATIONS FOR STATE */}
      <section className="mb-7">
        <SectionHeader
          title={stateTitle(state)}
          subtitle="Подобрано под ваше состояние"
          action={
            <button
              onClick={() => TelegramSDK.triggerHaptic("light")}
              className="flex items-center gap-1 text-xs font-medium text-white/60"
            >
              Все <ArrowRight size={12} />
            </button>
          }
        />
        <RecommendationRail tracks={tracksByState[state]} isPro={isPro} />
      </section>

      {/* INTERACTIVE DEMO */}
      <section className="mb-7">
        <SectionHeader
          title="Живая демо-карта слов"
          subtitle="Потапайте по сферам и пройдите мини-квиз"
        />
        <InteractiveStudyDemo words={DEMO_WORDS} />
      </section>

      {/* PREMIUM UPSELL */}
      {!isPro && (
        <section className="mb-7">
          <PremiumCard onUpgrade={() => {
            TelegramSDK.triggerHaptic("medium");
            window.location.href = "/premium";
          }} />
        </section>
      )}

      {/* INSIGHT CARDS */}
      <section className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InsightCard
          icon={<BookOpen size={16} className="text-white" />}
          title="Изучено слов"
          value="128"
          hint="за последние 30 дней"
          gradient="from-[#6C3CE1] to-[#7B61FF]"
        />
        <InsightCard
          icon={<Sparkles size={16} className="text-white" />}
          title="Shadowing score"
          value="86%"
          hint="средний балл"
          gradient="from-[#E94057] to-[#FF7A5B]"
        />
      </section>
    </AppShell>
  );
}

function stateTitle(state: AppState) {
  switch (state) {
    case "calm":
      return "Calm · Спокойствие";
    case "focus":
      return "Focus · Концентрация";
    case "energy":
      return "Energy · Энергия";
    case "sleep":
      return "Sleep · Сон";
  }
}

function InsightCard({
  icon,
  title,
  value,
  hint,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint: string;
  gradient: string;
}) {
  return (
    <div className="glass-panel relative overflow-hidden p-4">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-30 blur-2xl ${gradient}`} />
      <div className="relative flex items-center gap-2.5">
        <div className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${gradient}`}>
          {icon}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">{title}</div>
          <div className="text-xl font-bold text-white">{value}</div>
        </div>
      </div>
      <div className="relative mt-2 text-xs text-white/50">{hint}</div>
    </div>
  );
}
